# Architecture

A deeper technical tour of Cosmic Focus. Complements:
- **[README.md](README.md)** — what the product is and how to run it
- **[CLAUDE.md](CLAUDE.md)** — non-obvious invariants every contributor must follow
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — how it's hosted

## Goals & constraints

1. **Static and server-free for the productivity surface.** The product itself is HTML + ES modules + CSS. Deploying means uploading files to a CDN. No database queries happen on page load, no cold starts, no server to patch.
2. **Local-first.** `localStorage` is the source of truth for tasks / settings / stats / mixes. This keeps the app instantly responsive and usable offline. The optional Supabase account adds identity (display name + unique handle today; cross-device sync later) without making it the primary store.
3. **Premium visual quality by default.** A real WebGL/Babylon.js scene — not a stock background video. Fails gracefully on weak GPUs via an adaptive FPS watchdog.
4. **Declarative UI where possible.** The entire Settings panel is a single schema array; the renderer walks it and produces the DOM. Add a setting = add a row. Same pattern for the Help Center and onboarding tour.

## Runtime topology

```
┌─────────────────────────────────────────────────────────────┐
│ index.html                                                  │
│   • preloads: Inter font, Babylon CDN                       │
│   • loads: css/base + css/components (via @import tree)     │
│   • /theme-init.js — sets data-theme before paint (no FOUC) │
│   • Babylon (pinned /v9.4.1/, SHA-384 SRI, crossorigin)     │
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
          ├──▶ js/features/timer.js          (Pomodoro state machine)
          ├──▶ js/features/tasks.js          (reactive list + animations)
          ├──▶ js/features/sounds.js         (HTMLAudioElement mixer)
          ├──▶ js/features/statistics.js     (streak, totals)
          ├──▶ js/features/auth.js           (Supabase wrapper, lazy-loaded)
          ├──▶ js/features/password-policy.js (HIBP + common-password block)
          ├──▶ js/ui/navigation.js           (tab switching)
          ├──▶ js/ui/account.js              (signed-in/-out satellite + auth modal)
          ├──▶ js/ui/settings/apply.js       (schema → live store)
          └──▶ js/ui/settings/renderer.js    (schema → DOM)
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

`js/core/state.js` builds tiny reactive signals on top of `@preact/signals-core` (bundled from `node_modules` — Vite chunks it as part of the state module so it ships from our origin under `script-src 'self'`, no third-party CDN). Each piece of user-visible state (current mode, timer state, task list, settings values) lives as a signal. DOM updates are driven by `effect()` blocks that resubscribe automatically.

### Settings store

`js/ui/settings/store.js` holds every user setting keyed by a dotted path (e.g., `timer.focusDuration`, `scene.bloomWeight`). It persists per-key to `localStorage` under `fu_*` keys. `apply.js` maps each schema key to an `apply()` callback that propagates the value to the running app (e.g., updating bloom intensity on the post-process pipeline). The renderer reads from and writes to the store; apply hooks make the change visible.

### Schema-driven UI

`js/ui/settings/schema.js` is one large declarative array. Each entry is a row: `{ section, type, key, label, ... }`. The renderer (`renderer.js`) walks the schema and produces DOM based on `type`: `slider`, `toggle`, `stepper`, `segmented`, `select`, `theme-cards`, `text`, `button`, `button-row`, `shortcut-list`, `notif-permission`, `profile-list`, `schedule-list`, `readonly`. Adding a new setting = one schema entry + (if needed) one apply hook. The Help Center and onboarding tour follow the same pattern with `help-content.js` and the `STEPS` array in `onboarding.js`.

## Auth subsystem

Optional sign-in lives behind a single seam: **`js/features/auth.js` is the only file allowed to import `@supabase/supabase-js`.** Everything else calls the small typed API it exports (`signInWithPassword`, `signInWithMagicLink`, `signInWithOAuth`, `signUpWithPassword`, `sendPasswordReset`, `signOut`, `onChange`, `getUser`, `isConfigured`, `isUsernameAvailable`, `claimUsername`). One file changes if we ever swap providers.

The Supabase SDK is bundled (npm) and lazy-imported on first use, so the initial page weight isn't paid by users who never sign in. Vite chunk-splits the dynamic import; everything stays on our origin under `script-src 'self'`.

**Sign-up policy.** `js/features/password-policy.js` enforces:
- length 8–128, no whitespace at edges, no single-character repeats
- a 50-entry common-password blocklist (covers the worst SecLists / NCSC top-100 entries)
- HIBP k-anonymity breach check via `api.pwnedpasswords.com` — only the first 5 hex chars of SHA-1 leave the browser; the API is whitelisted in CSP `connect-src`. Network failure resolves to `false` so a flaky API can't gate sign-up; the structural + blocklist checks still apply.

**Email enumeration.** Sign-up gives the same UI response whether the email is fresh or already on file — "Check your email." When Supabase returns `already_registered`, the client silently fires a magic-link to the same address so the existing user receives a usable email regardless of whether they originally signed up with password or Google. From an attacker's side the response is identical; they can't iterate addresses to learn which are registered.

**Username uniqueness.** A separate `public.usernames` table in Supabase enforces uniqueness via `PRIMARY KEY` on the handle. Row-Level Security restricts the table to "users see / insert / delete their own row." Public availability probes go through `is_username_taken(text)`, a `SECURITY DEFINER` function that returns just a boolean — `user_id` never leaves the database. The migration SQL lives in `db/migrations/0001_usernames.sql` and is applied manually in the Supabase dashboard. If a user signs up with email confirmation enabled, the claim is deferred to first sign-in via `onAuthStateChange`. Two further migrations live alongside: `0002_sessions.sql` (focus-session log table, reserved for the cloud-sync phase) and `0003_billing.sql` (`public.billing` Pro tier table + `get_my_tier()` RPC, written only by the Stripe webhook running with the service-role key).

**Auth callback.** `public/auth/callback.html` (+ external `callback.js`) receives the Supabase redirect. It surfaces error params (`error`, `error_description`) inline with a friendly message and a Back link; on success it redirects to `/` while preserving the URL fragment so the SDK's `detectSessionInUrl` can finish the handshake.

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

`css/components/components.css` is a thin aggregator. The real CSS files live in `css/components/modules/`:

| Module                                | Scope                                       |
|---------------------------------------|---------------------------------------------|
| `01-home-base.css`                    | Home layout, greeting                       |
| `02-home-mini-timer.css`              | Draggable mini-timer widget                 |
| `03-preset-cards.css`                 | Scene quality cards                         |
| `04-settings-star.css`                | ✦ trigger button                            |
| `05-settings-panel.css`               | Settings modal, rail, every row             |
| `06-notification-banner.css`          | In-app notification banner                  |
| `07-statistics-bar.css`               | Sessions / streak chips                     |
| `08-clear-all-button.css`             | Clear-All control                           |
| `09-focus-tab.css`                    | Focus-mode hero treatment                   |
| `10-task-section.css`                 | Task list and checkbox                      |
| `11-settings-toast.css`               | Ephemeral settings toast                    |
| `12-onboarding-tour.css`              | Welcome tour overlay                        |
| `13-help-center.css`                  | Search + Q&A overlay                        |
| `14-focus-rings.css`                  | a11y `:focus-visible` styling               |
| `15-ambient-deck.css`                 | Ambient mixer deck + mix rail               |
| `16-account.css`                      | Account satellite, dropdown, auth modal     |
| `19-profile.css`                      | Profile drawer (Overview / Focus / Time / …) |
| `21-home-period-tiles.css`            | Today / week / month / 365 tiles on Home    |
| `22-task-detail.css`                  | Per-task drawer (subtasks, repeat, due)     |
| `23-notepad.css`                      | Multi-note workspace (Pro)                  |
| `24-stream-themes.css`                | YouTube / SoundCloud iframe backdrops       |
| `25-celebrate-toast.css`              | Goal-complete celebration ring + toast      |
| `26-date-picker.css`                  | Custom calendar popover                     |
| `27-task-dock.css`                    | Bottom-anchored Focus-tab task surface      |
| `28-sakura-theme.css`                 | Sakura per-theme chrome retune              |
| `29-upgrade-modal.css`                | Stripe upgrade sheet                        |
| `30-aurora-theme.css`                 | Aurora per-theme chrome retune              |
| `31-celestial-garden-theme.css`       | Celestial Garden per-theme chrome retune    |
| `32-silent-autumn-theme.css`          | Silent Autumn per-theme chrome retune       |
| `33-ocean-theme.css`                  | Ocean per-theme chrome retune               |
| `34-music-services.css`               | Bottom-left music-service connect dock      |
| `35-spotify-mini-player.css`          | Bottom-right Spotify "Now playing" card     |

Numbering has gaps at 17, 18, 20 where past modules were folded back into earlier files — preserved so existing import order isn't churned. Import order = cascade order; later rules win on equal specificity. `apple-liquid-glass.css` lives alongside as a cohesive third-party-style module for the liquid-glass button system.

## Security posture

- **CSP** — see `public/_headers`. `script-src` is `'self'` plus pinned Babylon CDN and Cloudflare Insights — **no `'unsafe-inline'`** (the theme bootstrap and auth callback are external files for this reason). `object-src 'none'`, narrow allowlists for fonts / images / media / fetches.
- **Supply chain** — Babylon is pinned to `/v9.4.1/babylon.js` with a SHA-384 `integrity` attribute; the browser refuses to execute it if the bytes don't match. Supabase, signals-core, and motion are bundled from npm so they ship from our origin (no third-party CDN in the auth path).
- **XSS** — every user-typed string escaped before innerHTML insertion. Two author-HTML sites (help-center answers, onboarding tour bodies) are flagged with in-code comments. Shared-mix import is sanitised at the boundary (icon validated, name length-capped, control chars stripped).
- **Auth** — single import seam for Supabase (`js/features/auth.js`), HIBP-checked password policy, anti-enumeration sign-up, unique handles enforced by Postgres `PRIMARY KEY` + `SECURITY DEFINER` RPC.
- **Privacy** — no tracking cookies. No third-party analytics beyond Cloudflare (cookieless). Local-first data model.

See **[SECURITY.md](SECURITY.md)** for the full posture and the vulnerability-reporting process.

## Testing

`tests/smoke.spec.js` (Playwright) covers the real user journeys end-to-end: tab switching, timer start/pause, task add/complete/delete, stats bar, settings modal, help center, ambient sound browser, no unexpected console errors, legal pages serve 200. Tests run serially against the Vite dev server. External R2 failures are explicitly allow-listed because local DNS may not yet resolve the CDN.

## Roadmap

### Phase 2a — Accounts (shipped)

- Supabase project wired in. Email/password + Google OAuth + magic-link.
- HIBP-checked password policy, anti-enumeration sign-up, unique-handle table with Postgres RLS + `SECURITY DEFINER` availability RPC.
- Anonymous mode remains the default — sign-in is strictly optional.

### Phase 2a.1 — Pro paywall (shipped)

- Stripe Checkout + Customer Portal wired through three Supabase Edge Functions (`create-checkout-session`, `create-portal-session`, `stripe-webhook`).
- `public.billing` Pro tier table mutated only by the webhook running with the service-role key; client reads tier through the `get_my_tier()` RPC.
- Single client-side gate: `js/features/billing.js → isPro()`. Gated surfaces: the Notepad app + four Profile sections (Overview / Tasks / Sounds / Insights). See `MONETIZATION.md`.

### Phase 2b — Cloud sync (planned)

- Postgres schema for `profiles`, `settings`, `tasks`, `stats`, `sessions` with Row-Level Security.
- Mirror local writes through the Supabase client when authenticated; reconcile on sign-in.
- Productivity Dashboard view: daily/weekly focus charts, streak calendar, task completion history, export.

### Phase 3 — AI features (planned)

- Supabase Edge Function proxies requests to Anthropic (keeps API keys off the client).
- First feature: task breakdown ("paste a big task, get 3-5 pomodoro-sized subtasks").
- Then: session reflection prompts, focus coach, smart scheduling.

### Phase 4 — Social / collaborative (speculative)

- Shared focus rooms, live co-working presence, leaderboards — only if there's real demand.
