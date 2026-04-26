# Architecture

A deeper technical tour of Cosmic Focus. Complements:
- **[README.md](README.md)** — what the product is and how to run it
- **[CLAUDE.md](CLAUDE.md)** — non-obvious invariants every contributor must follow
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — how it's hosted

## Goals & constraints

1. **Static and server-free.** The whole product is HTML + ES modules + CSS. Deploying means uploading files to a CDN. No database queries happen on page load, no cold starts, no server to patch.
2. **All state in the browser.** `localStorage` is the source of truth. This keeps the app instantly responsive and usable offline. Phase 2 adds Supabase as an optional cloud mirror.
3. **Premium visual quality by default.** A real WebGL/Babylon.js scene — not a stock background video. Fails gracefully on weak GPUs via an adaptive FPS watchdog.
4. **Declarative UI where possible.** The entire Settings panel is a single schema array; the renderer walks it and produces the DOM. Add a setting = add a row. Same pattern for the Help Center and onboarding tour.

## Runtime topology

```
┌─────────────────────────────────────────────────────────────┐
│ index.html                                                  │
│   • preloads: Inter font, Babylon CDN                       │
│   • loads: css/base + css/components (via @import tree)     │
│   • inline: theme bootstrap script (sets data-theme ASAP)   │
│   • <script type="module" src="/js/core/app.js">            │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ js/core/app.js  (bootstrap)                                 │
│   • dynamic-imports every feature module in parallel        │
│   • wires DOM listeners + initial UI                        │
│   • kicks off the 3D scene                                  │
└─────────────────────────────────────────────────────────────┘
          │
          ├──▶ js/engine/babylon-engine.js (Babylon init, WebGL/WebGPU)
          ├──▶ js/graphics/scene/scene-manager.js (render loop)
          ├──▶ js/features/timer.js   (Pomodoro state machine)
          ├──▶ js/features/tasks.js   (reactive list + animations)
          ├──▶ js/features/sounds.js  (HTMLAudioElement mixer)
          ├──▶ js/features/statistics.js (streak, totals)
          ├──▶ js/ui/navigation.js    (tab switching)
          ├──▶ js/ui/settings/apply.js (schema → live store)
          └──▶ js/ui/settings/renderer.js (schema → DOM)
```

## Rendering pipeline

`scene-manager.js` owns the Babylon render loop. Each frame it reads `elapsed = clock.getElapsedTime()` and pushes it into every animated module:

```
updateCosmicSkybox(elapsed)
updateStarField(elapsed)
updateNebula(elapsed)
updateShootingStars(elapsed)
updateBlackHole(elapsed)
updateStarGlows(elapsed)
updateCosmicMotes(elapsed)
updateEtherealPetals(elapsed, camera)
updateGodRays(scene, camera)
updateAutoExposure(elapsed)
scene.render()
```

### Layering (rendering groups)

- **Group 0** — background (skybox, starfield, shooting stars, cosmic motes, star-glows, ethereal petals). Depth/stencil auto-cleared each frame.
- **Group 1** — mid-depth transparent billboards (nebula, blackhole). Depth/stencil **not** cleared; relies on back-to-front sorting.
- **Group 2** — reserved (not used yet).

Both the black hole and the nebula are in group 1, sit near the origin, use `BILLBOARDMODE_ALL`, and blend with different modes (`ALPHA_COMBINE` vs `ALPHA_ADD`). Anything added to group 1 will alpha-composite over the black hole, so upstream changes to the nebula can visually affect the black hole — this is the root cause of a long debugging saga (see `CLAUDE.md`).

### Shader time-wrapping contract

Every module that passes `elapsed` to a GLSL `time` uniform wraps it at **4 hours**:

```js
const TIME_WRAP = 4 * 60 * 60;
material.setFloat('time', elapsed % TIME_WRAP);
```

Why: at `elapsed > ~10⁵` seconds, GLSL `fract()` loses sub-pixel precision inside noise hashes, fbm collapses, and the scene visibly degrades. Rotation/photon angles are JS-precomputed as `(cos, sin)` pairs on 2π-wrapped inputs so they remain seamless indefinitely. **Never** send raw `elapsed` to a shader.

### FPS watchdog

`js/utils/performance-profile.js` exports `createFPSWatchdog(stats, onDegrade, onRecover)`. It watches `stats.fps` over a 10-second window and toggles `engine.setHardwareScalingLevel()` **in both directions** — a transient hitch that drops FPS won't permanently halve resolution because a recovery window restores it. The callbacks are wired in `scene-manager.js`.

## State model

### Signals

`js/core/state.js` builds tiny reactive signals on top of `@preact/signals-core` (loaded from `esm.sh`). Each piece of user-visible state (current mode, timer state, task list, settings values) lives as a signal. DOM updates are driven by `effect()` blocks that resubscribe automatically.

### Settings store

`js/ui/settings/store.js` holds every user setting keyed by a dotted path (e.g., `timer.focusDuration`, `scene.bloomWeight`). It persists per-key to `localStorage` under `fu_*` keys. `apply.js` maps each schema key to an `apply()` callback that propagates the value to the running app (e.g., updating bloom intensity on the post-process pipeline). The renderer reads from and writes to the store; apply hooks make the change visible.

### Schema-driven UI

`js/ui/settings/schema.js` is one large declarative array. Each entry is a row: `{ section, type, key, label, ... }`. The renderer (`renderer.js`) walks the schema and produces DOM based on `type`: `slider`, `toggle`, `stepper`, `segmented`, `select`, `theme-cards`, `text`, `button`, `button-row`, `shortcut-list`, `notif-permission`, `profile-list`, `schedule-list`, `readonly`. Adding a new setting = one schema entry + (if needed) one apply hook. The Help Center and onboarding tour follow the same pattern with `help-content.js` and the `STEPS` array in `onboarding.js`.

## Build pipeline

### Development

`npm run dev` runs Vite with the `@cloudflare/vite-plugin`. No bundling — ES modules are served directly; CSS `@import`s are resolved on the fly. Hot reload works for JS, CSS, and HTML.

### Production

`npm run build`:
1. `rm -rf dist` — defeats any stale file from prior builds or CI caches.
2. `vite build` — transforms `index.html`:
   - Inlines `@import` CSS into one bundle (`dist/assets/index-*.css`).
   - Code-splits JS into ~20 hashed chunks with manifest (`dist/assets/*.js`).
   - Copies `public/` verbatim to `dist/` (preserves paths for `icon.svg`, `404.html`, legal pages, `_headers`, `robots.txt`, `sitemap.xml`, `site.webmanifest`).
   - Strips `console.log` / `info` / `debug` via `esbuild.pure` in `vite.config.js`.
3. The Cloudflare plugin writes `dist/wrangler.json` so `npx wrangler deploy` knows what to ship.

Cache policy (in `public/_headers`):
- `/assets/*` — immutable, 1-year cache (filenames are content-hashed).
- HTML files — `max-age=0, must-revalidate` so new deploys appear instantly.
- `/sounds/*` rule was removed once audio moved to R2 — R2 sets its own `Cache-Control`.

## CSS organisation

`css/components/components.css` is a thin aggregator. The 14 real CSS files live in `css/components/modules/`:

| Module                           | Scope                              |
|----------------------------------|------------------------------------|
| `01-home-base.css`               | Home layout, greeting              |
| `02-home-mini-timer.css`         | Draggable mini-timer widget        |
| `03-preset-cards.css`            | Scene quality cards                |
| `04-settings-star.css`           | ✦ trigger button                   |
| `05-settings-panel.css`          | Settings modal, rail, every row    |
| `06-notification-banner.css`     | In-app notification banner         |
| `07-statistics-bar.css`          | Sessions / streak chips            |
| `08-clear-all-button.css`        | Clear-All control                  |
| `09-focus-tab.css`               | Focus-mode hero treatment          |
| `10-task-section.css`            | Task list and checkbox             |
| `11-settings-toast.css`          | Ephemeral settings toast           |
| `12-onboarding-tour.css`         | Welcome tour overlay               |
| `13-help-center.css`             | Search + Q&A overlay               |
| `14-focus-rings.css`             | a11y `:focus-visible` styling      |

Import order = cascade order; later rules win on equal specificity. `apple-liquid-glass.css` lives alongside as a cohesive third-party-style module for the liquid-glass button system.

## Security posture

- **CSP** — see `public/_headers`. Tight allowlists for scripts, styles, fonts, fetches, images, media. Reviewed every time a new dependency is added.
- **XSS** — every user-typed string escaped before innerHTML insertion. Two author-HTML sites (help-center answers, onboarding tour bodies) are flagged with in-code comments.
- **Privacy** — no tracking cookies. No third-party analytics beyond Cloudflare (cookieless). Local-first data model.

See **[SECURITY.md](SECURITY.md)** for the full posture and the vulnerability-reporting process.

## Testing

`tests/smoke.spec.js` (Playwright) covers the real user journeys end-to-end: tab switching, timer start/pause, task add/complete/delete, stats bar, settings modal, help center, ambient sound browser, no unexpected console errors, legal pages serve 200. Tests run serially against the Vite dev server. External R2 failures are explicitly allow-listed because local DNS may not yet resolve the CDN.

## Roadmap

### Phase 2 — Accounts + cloud sync (planned)

- Supabase project + Postgres schema for `profiles`, `settings`, `tasks`, `stats`, `sessions`.
- Row-Level Security on every table.
- Auth methods: email/password, Google, magic-link, Apple, GitHub.
- Anonymous mode remains — sign-in is strictly optional.
- New **Productivity Dashboard** view: daily/weekly focus charts, streak calendar, task completion history, export.

### Phase 3 — AI features (planned)

- Supabase Edge Function proxies requests to Anthropic (keeps API keys off the client).
- First feature: task breakdown ("paste a big task, get 3-5 pomodoro-sized subtasks").
- Then: session reflection prompts, focus coach, smart scheduling.

### Phase 4 — Social / collaborative (speculative)

- Shared focus rooms, live co-working presence, leaderboards — only if there's real demand.
