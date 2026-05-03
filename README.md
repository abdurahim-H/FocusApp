# Cosmic Focus

A cinematic Pomodoro timer set inside a real-time 3D black-hole scene.
Live at **[universefocuses.com](https://universefocuses.com)**.

[![MIT License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Built with Babylon.js](https://img.shields.io/badge/Babylon.js-9.4-blue)](https://babylonjs.com)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF)](https://vitejs.dev)

## What it is

A browser-only productivity app:

- **Focus timer** with configurable durations, cycle goals, auto-start, long-break intervals, and schedules
- **Tasks** with spring animations, subtasks, due dates, recurring, drag-reorder, carry-over, and per-task detail drawer
- **Ambient sounds** layered from Cloudflare R2 — rain, ocean, forest, café and more, mixed live
- **Five scene themes** — Black Hole (real-time WebGL with gravitational lensing, photon ring, drifting nebula, parallax starfield, god rays, film grain), plus four pre-rendered video themes: Sakura, Aurora, Celestial Garden, Silent Autumn. Every chrome surface (settings, profile, account, dock, popovers) retunes its palette per theme.
- **Statistics** — sessions today, total focus time, streak, tasks completed, all tracked locally
- **Settings** — declarative schema covering quality presets, themes, timer flow, shortcuts, notifications, profiles, motion, and data export/import/reset
- **Onboarding tour** on first visit, replayable from Settings
- **Help Center** (press `?`) — searchable Q&A across every feature
- **Optional account** (Supabase) for users who want a profile + identity — email/password or Google OAuth, with HIBP-checked passwords and unique handles. Anonymous mode is still the default and fully featured.
- **Pro tier** ($5/mo or $55/yr) via Stripe Checkout — unlocks the Notepad app and four Profile sections (Overview / Tasks / Sounds / Insights). Everything else stays free forever. See [MONETIZATION.md](MONETIZATION.md).

No server logic for the productivity surface — everything persists in `localStorage`. Sign-in is optional and adds a profile + handle today (cross-device sync is the next planned phase).

## Running locally

```bash
# Development server with hot reload
npm run dev

# Or a plain static server matching production
npm start          # python3 -m http.server 8000
```

Open http://localhost:5173 (Vite) or http://localhost:8000 (static).

## Building and deploying

```bash
npm run build      # outputs to dist/
npm run preview    # serves the built dist/ locally
```

Deploys are manual — push to `master`, then run `npx wrangler deploy` from the repo root. The `@cloudflare/vite-plugin` writes `dist/wrangler.json` during `npm run build` so the Worker knows what to ship. Sound files and theme videos are served separately from a Cloudflare R2 bucket (`cdn.universefocuses.com`) rather than from the app bundle.

## Code quality

```bash
npm run lint       # biome check — lint + format in one pass
npm run lint:fix   # auto-fix what's fixable
npm run format     # just format
```

## Tests

```bash
npm run test:install   # one-time: download Chromium for Playwright (~150 MB)
npm test               # run the smoke suite headless (~4 min)
npm run test:ui        # open Playwright's UI runner for debugging
```

The smoke suite lives in `tests/smoke.spec.js` and exercises the real app against the Vite dev server — no mocks. It covers tab switching, the timer start/pause flow, tasks, stats, settings modal, help center, ambient sound browser, and the legal pages.

## Architecture

```
js/
  core/          app bootstrap, signal state, motion wrapper, reduced-motion detection
  engine/        Babylon engine init (WebGL2 / WebGPU fallback)
  graphics/
    scene/       render loop, cameras, lights, FPS watchdog wiring
    blackhole/   GLSL shader for accretion disk + lensing
    environment/ nebula, skybox, starfield, star-glows, cosmic-motes,
                 shooting-stars, ethereal-petals
    postprocessing/ bloom/tone-mapping pipeline, god rays, anamorphic streak
  features/      timer, tasks, sounds, sound-mixer, statistics, keyboard,
                 auth.js (Supabase wrapper), password-policy.js (HIBP + blocklist)
  ui/
    settings/    schema.js (declarative) + renderer.js + store/apply/io
    home-mini-timer.js, help-center.js, help-content.js, navigation.js,
    account.js (signed-in/-out satellite + auth modal)
  utils/         perf profiles, FPS watchdog, notifications, cleanup

css/
  base/          style, themes, responsive
  components/    components.css, apple-liquid-glass.css, modules/

public/
  index.html (root), 404.html, privacy.html, terms.html, sitemap.xml,
  robots.txt, site.webmanifest, _headers (security + cache),
  theme-init.js (FOUC bootstrap),
  auth/callback.html + callback.js (OAuth/magic-link landing)

db/
  migrations/    SQL applied manually in Supabase dashboard

dist/            build output (gitignored)
```

## Documentation map

- **[CLAUDE.md](CLAUDE.md)** — invariants and gotchas every contributor (human or AI) must honour
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — deeper technical narrative: render loop, scene layers, settings schema, state model
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — infrastructure runbook: Cloudflare Workers, R2, DNS, env vars, SSL, how to recover when prod breaks
- **[SECURITY.md](SECURITY.md)** — how to report vulnerabilities, supported versions, CSP + data-handling policy
- **[MONETIZATION.md](MONETIZATION.md)** — pricing, Pro paywall scope, Stripe wiring, gated features list
- **[ROADMAP.md](ROADMAP.md)** — feature backlog with effort sizing, ordered by wave
- **[CHANGELOG.md](CHANGELOG.md)** — versioned release history

## Stack

- **Rendering:** Babylon.js 9.4 (pinned + SHA-384 SRI; WebGL2 primary, WebGPU experimental)
- **Bundler:** Vite 8 with `@cloudflare/vite-plugin`
- **Hosting:** Cloudflare Workers with Static Assets
- **File storage:** Cloudflare R2 (`cdn.universefocuses.com`) for audio
- **Auth + DB (optional accounts):** Supabase (email/password, Google OAuth, magic-link)
- **Lint/format:** Biome 2
- **Tests:** Playwright (smoke / e2e)
- **Build target:** modern evergreen browsers (Chrome 80+, Firefox 75+, Safari 14+, Edge 80+)

## License

[MIT](LICENSE) © Abdurahim Hudulov
