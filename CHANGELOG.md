# Changelog

All notable changes to Cosmic Focus are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html):
- **MAJOR** — breaking changes (unlikely; this is a browser-only app)
- **MINOR** — new features or substantial UX additions
- **PATCH** — bug fixes, perf, infra, docs

## [Unreleased]

- Planned: Supabase accounts + cross-device cloud sync.
- Planned: first AI-powered feature (task breakdown via Claude).
- Planned: Cloudflare Web Analytics + Sentry error tracking wired in.

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
- Strict CSP locking scripts to `'self' + cdn.babylonjs.com + esm.sh + static.cloudflareinsights.com`, styles to `'self' + fonts.googleapis.com`, media to R2 only, and similarly narrow `connect-src` / `img-src` / `font-src`.
- Heavy unused assets removed: favicon SVG trimmed; 2.2 MB black-hole preview PNG replaced with an 88 KB JPG.
- `_quarantine/` directory (37 MB of archived code) deleted from git.
- `components.css` (3,370 lines) split into 14 focused modules aggregated via `@import`.

[Unreleased]: https://github.com/abdurahim-H/FocusApp/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/abdurahim-H/FocusApp/releases/tag/v1.0.0
