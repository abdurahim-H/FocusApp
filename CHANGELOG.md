# Changelog

All notable changes to Cosmic Focus are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html):
- **MAJOR** — breaking changes (unlikely; this is a browser-only app)
- **MINOR** — new features or substantial UX additions
- **PATCH** — bug fixes, perf, infra, docs

## [Unreleased]

### Added
- **Ocean** scene theme — underwater kelp-forest video (sun-rays piercing through deep blue water, kelp silhouettes, fish, rocky seabed). Per-theme chrome retunes every UI surface to a cyan↔kelp-green palette against deep ocean glass.
- **Silent Autumn** scene theme — sumi-e ink-painting video backdrop (red maple + gold ginkgo leaves drifting across a parchment sky, ink-brush trunk, mist mountains). Per-theme chrome module retunes settings, profile drawer, account satellite, focus rings, task dock, notepad, help center, modals, and popovers to a crimson↔gold palette so the foreground UI sits as a focal accent rather than fighting the painting.

### Fixed
- **Silent Autumn stat-bar labels readable.** "SESSIONS / FOCUSED / TASKS DONE / DAY STREAK / MOMENTUM" labels were `rgba(paper, 0.55)` against the bright parchment video — almost no contrast. Switched values to deep crimson and labels to ink with a paper text-shadow halo, so they stay readable against both the bright parchment and the dark ink-trunk patches in the video.
- **Optional accounts** via Supabase. Email + password, Google OAuth, and magic-link sign-in. The auth surface is gated behind a satellite trigger that hangs off the right side of the nav pill, with a glass-orb dropdown when signed in.
- **Password policy** enforced at sign-up: length 8–128, no whitespace at edges, no single-character repeats, 50-entry common-password blocklist, plus a Have-I-Been-Pwned k-anonymity breach check (only the first 5 hex chars of SHA-1 leave the browser). Live 4-bar strength meter on the form.
- **Show / hide password toggle** and **Caps Lock hint** on the auth modal.
- **Unique-handle reservations** backed by a Postgres `public.usernames` table with `PRIMARY KEY` enforcement. Live availability probe via a `SECURITY DEFINER` RPC; user_id never leaves the database.
- **Cross-provider hint** on sign-in: when invalid credentials are returned, the error suggests trying "Continue with Google" since the most common silent footgun is a Google-OAuth user typing a guessed password.

### Hardened
- **CSP**: dropped `'unsafe-inline'` from `script-src` (theme bootstrap and auth-callback handler externalised to `public/theme-init.js` and `public/auth/callback.js`). Added explicit `object-src 'none'`. Removed `https://esm.sh` from both `script-src` and `connect-src` after bundling Supabase, signals-core, and Motion One via npm. Added `https://api.pwnedpasswords.com` to `connect-src` for the HIBP breach check.
- **Babylon.js pinned** to `/v9.4.1/babylon.js` with a SHA-384 `integrity` attribute and `crossorigin="anonymous"`. The browser refuses to execute it if the bytes don't match.
- **Anti-enumeration sign-up**: identical UI response for fresh vs. already-registered emails. When Supabase returns `already_registered`, the client silently fires a magic link to the same address so the existing user receives a usable email regardless of provider.
- **Defence-in-depth XSS fix**: shared-mix import (`?mix=` URL param) sanitises payload fields at the boundary — name is length-capped + control chars stripped, icon must be ≤4 codepoints with no markup characters, active list is filtered to strings and capped at 32 entries. The mix-card icon is also escaped at render time.
- **Free-text settings cap**: greeting now limited to 80 chars; default cap of 200 on any other text setting. Prevents paste-an-essay DoS via localStorage bloat or render stall.
- Stripped dev-only debug surface: `window.testNotification`, `window.quickTimerTest`, `window.debugNotifications`, `window.reportMemoryUsage`, `window.cleanupApplication`, `window.__applyQualityLevel`, the `DEBUG_NOTIFICATIONS` flag, and ~50 emoji-prefixed `console.log` calls narrating internal flow.

### Planned
- Cross-device cloud sync (mirror productivity data through Supabase).
- First AI-powered feature (task breakdown via Claude).
- Cloudflare Web Analytics + Sentry error tracking wired in.

## [1.0.0] — 2026-04-19

First production release. Live at [universefocuses.com](https://universefocuses.com).

### Added
- **Infrastructure**
  - Cloudflare Workers deploy via `@cloudflare/vite-plugin` + `wrangler`.
  - Cloudflare R2 bucket `focusapp-sounds` served at `cdn.universefocuses.com` for audio files.
  - Custom domain `universefocuses.com` with automatic SSL, HSTS, and a strict Content-Security-Policy.
  - Themed `404.html`, `privacy.html`, `terms.html`, `robots.txt`, `sitemap.xml`, and PWA `site.webmanifest`.
- **Features**
  - Pomodoro timer with configurable focus / short-break / long-break durations, auto-start, cycle goal, and schedules.
  - Tasks with spring animations, checkbox toggles, Clear-All, and localStorage persistence.
  - Ambient sound mixer with 20+ sounds, presets (Rainy Library, Forest Morning, Deep Focus), and master volume.
  - 3D black-hole scene: gravitational lensing, photon ring, flowing nebula, parallax starfield, god rays, anamorphic streak, film grain.
  - Statistics bar: sessions today, total focus time, tasks done, streak.
  - Home-tab mini-timer widget — draggable, clock-faced, per-session persistent.
  - Declarative settings schema covering scene quality, timer flow, shortcuts, notifications, profiles, motion, data import/export/reset, legal links, and About.
  - Welcome tour on first visit + replayable from Settings.
  - Searchable Help Center (`?` shortcut) with 30+ Q&A entries.
- **Engineering**
  - Biome for lint + format.
  - Playwright smoke suite with 10 tests covering core user journeys.
  - `@ts-check`-ready JS; `// @cloudflare/vite-plugin` integration; deterministic cross-platform `package-lock.json`.

### Hardened during development
- Shader time uniforms wrapped at 4-hour period to prevent float32 precision collapse on long sessions (was making the black hole look washed-out after hours).
- FPS watchdog made reversible so a transient hitch can't permanently halve render resolution.
- `console.log` / `info` / `debug` stripped from production bundles via `esbuild.pure`.
- Strict CSP locking scripts to `'self' + cdn.babylonjs.com + esm.sh + static.cloudflareinsights.com`, styles to `'self' + fonts.googleapis.com`, media to R2 only, and similarly narrow `connect-src` / `img-src` / `font-src`. (CSP further tightened in [Unreleased].)
- Heavy unused assets removed: favicon SVG trimmed; 2.2 MB black-hole preview PNG replaced with an 88 KB JPG.
- `_quarantine/` directory (37 MB of archived code) deleted from git.
- `components.css` (3,370 lines) split into 14 focused modules aggregated via `@import`.

[Unreleased]: https://github.com/abdurahim-H/FocusApp/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/abdurahim-H/FocusApp/releases/tag/v1.0.0
