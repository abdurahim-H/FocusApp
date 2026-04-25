# CLAUDE.md

Orientation for Claude Code (and any other AI agent) working on this repo. Read this before touching anything. Humans working here should read it too — it captures every invariant that isn't obvious from the code.

---

## Documentation contract

This repo keeps five top-level documents. Every contributor (human or AI) must keep them in sync when their changes affect what's described:

| File               | Purpose                                                                 | When to update                                                                 |
|--------------------|-------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| **README.md**      | Product intro + quickstart for someone seeing the repo for the first time. | When features, commands, stack, or directory tree change materially.        |
| **CLAUDE.md** (this file) | Hard rules, gotchas, and conventions that aren't obvious from code.  | When you discover a new invariant, a new "never do X" rule, or a new failure mode future-you would hit. |
| **ARCHITECTURE.md**| Human-facing technical deep-dive (render loop, state model, CSS layout). | When the *shape* of the system changes — new subsystem, reworked render order, new state store. |
| **DEPLOYMENT.md**  | Infrastructure runbook — Cloudflare, R2, DNS, CSP, rollback procedures. | When deploy flow, env vars, DNS, CSP, or any piece of prod infra changes.      |
| **SECURITY.md**    | Reporting process, scope, defenses in place, data handling.             | When security posture changes — new CSP directive, new data stored, new third-party. |
| **CHANGELOG.md**   | Versioned user-visible history.                                         | Every user-visible change. Group under `[Unreleased]` until a release tag goes out. |

**Rule:** if a PR changes behaviour, either (a) update the relevant `.md` file in the same PR, or (b) state in the PR why no doc update is needed.

Do **not** create additional `*.md` files without explicit human approval. We deliberately keep the doc surface small so it stays current.

## What this project is

Cosmic Focus — a single-page Pomodoro app rendered on top of a real-time Babylon.js black-hole scene. Pure vanilla ES modules. Babylon is loaded from CDN in `index.html`. Sound files live in a Cloudflare R2 bucket at `cdn.universefocuses.com`. Deploys via `@cloudflare/vite-plugin` + `wrangler` to a Cloudflare Worker serving `dist/` as static assets. All user state lives in `localStorage` / `sessionStorage` today; Phase 2 adds optional Supabase cloud sync.

Live at **universefocuses.com**.

## Run it

```
npm install            # install deps (uses darwin-arm64 / linux-x64 native bindings)
npm run dev            # Vite dev server at http://localhost:5173
npm start              # python3 -m http.server 8000 — plain static serving
npm run build          # production build → dist/
npm run preview        # serve dist/ locally

npm run lint           # Biome: lint + format check
npm run lint:fix       # auto-fix style issues
npm run format         # format only

npm run test:install   # one-time: fetch Chromium for Playwright (~150 MB)
npm test               # run smoke suite headless (~4 min)
npm run test:ui        # Playwright UI runner for debugging
```

Prefer `npm start` when debugging things that behave differently under a bundler. Use Docker (Node 22.16.0, linux/amd64) when touching `package-lock.json` to match CI exactly — see the "Lock file drift" section below.

## Directory map (the parts that matter)

```
js/
  core/          app bootstrap, shared signal state, reduced-motion detection
  engine/        Babylon engine init (WebGL2 / WebGPU selection, hardware scaling)
  graphics/
    scene/       scene-manager.js — the render loop, cameras, lights, FPS watchdog wiring
    blackhole/   blackhole.js — GLSL shader for the disk, lensing, photon ring
    environment/ nebula, cosmic-skybox, starfield, star-glows, cosmic-motes, shooting-stars, ethereal-petals
    postprocessing/ pipeline.js (DefaultRenderingPipeline + film grain), god-rays, anamorphic-streak
  features/      timer, tasks, sounds, sound-mixer, statistics, keyboard, notification-banner
  ui/
    settings/    schema.js (declarative), renderer.js, store.js, apply.js, data-io.js, onboarding.js, schedules.js, cheatsheet.js, search.js, profiles.js
    home-mini-timer.js, help-center.js, help-content.js, navigation.js, button-feel.js, ui-effects.js, focus-trap.js
  utils/         performance-profile.js (device tiers + FPS watchdog), notifications.js, cleanup.js

css/
  base/          style, themes, responsive
  components/
    components.css                — thin @import aggregator
    apple-liquid-glass.css        — liquid-glass button system
    modules/                      — 14 focused CSS modules (home, mini-timer, settings panel, stats, tasks, tour, help, etc.)

public/           verbatim-copied to dist/: index assets (icon.svg, site.webmanifest), legal (privacy.html, terms.html), 404.html, robots.txt, sitemap.xml, _headers
tests/            Playwright smoke suite (smoke.spec.js)
index.html        entry point; loads Babylon from CDN, then /js/core/app.js
wrangler.toml     Cloudflare Workers + Static Assets config
vite.config.js    Vite + @cloudflare/vite-plugin; strips console.log in prod
biome.json        lint + format config
playwright.config.js  tests run serially against `npm run dev`
```

Trust the filesystem over any doc. If the tree here and the actual files diverge, fix the docs in the same commit as the restructure.

## Non-obvious gotchas — read these before editing

### Shader time uniforms MUST be wrapped

Passing raw `elapsed` to any GLSL `time` uniform is a bug. After a few hours `fract()` inside noise hashes (`fract(p * 0.1031)`), `sin()` at large angles, and fbm coordinates blown up by 2×/octave all lose sub-pixel precision. fbm collapses to a near-constant, the 8-layer lensing warp rings become visible through the blackhole, the nebula turns into a uniform orange haze, and the scene looks like it's been Gaussian-blurred.

Current convention: every shader wraps at **`4 * 60 * 60` seconds** before calling `setFloat('time', …)`. See `nebula.js`, `cosmic-skybox.js`, `starfield.js`, `star-glows.js`, `cosmic-motes.js`, and the film grain's `grainTime` accumulator in `pipeline.js`. **If you add a new shader uniform driven by time, wrap it the same way.**

### The blackhole uses a two-channel time scheme

`blackhole.js` does not use a single `time` uniform. Rotations use JS-precomputed `(cos, sin)` pairs — `spinCS`, `photonCS` — built from a 2π-wrapped angle so they're seamless forever. fbm flow uses a separate `flowT` uniform that is `elapsed % FLOW_WRAP`. Don't regress this to a single unbounded `time` — it brings the visual degradation back.

### Nebula paints over the blackhole

`nebula.js` is `ALPHA_ADD` in `renderingGroupId = 1` — the same group as the blackhole, covering a much larger area. If the nebula's shader degrades, it washes the blackhole additively. When debugging "the blackhole looks blurred," suspect the nebula (and other shaders in group 1) first.

### FPS watchdog must stay reversible

`js/utils/performance-profile.js → createFPSWatchdog` toggles `engine.setHardwareScalingLevel(1.5)` on sustained low FPS and restores `1.0` on sustained recovery. **Do not** reintroduce a one-way `degraded = true` latch — a single transient GC hitch will then permanently blur the scene for the rest of the session. Keep hysteresis windows wide (~10s each side).

### Tour highlight CSS is a minefield

`.tour-highlight` sets `position: relative` and `z-index: 10001 !important`. For targets that are already `position: fixed` (e.g. `.settings-trigger`), the `relative` override drops them into document flow — the pinned button jumps from top-right to top-left mid-tour. Any new fixed-positioned tour target needs a specificity override:

```css
.<your-class>.tour-highlight { position: fixed; }
```

### Settings are declarative

Add a row to `js/ui/settings/schema.js`. The renderer builds the DOM from it. Do not hand-roll settings UI, event handlers, or persistence — the schema + `apply.js` + `store.js` already handle all of that.

### Help Center is data

`js/ui/help-content.js` is a plain array of categories and Q/A entries. Add an entry, not a new component. Icons are feather-style SVG path fragments (no wrapping `<svg>`).

### Onboarding tour is data too

`js/ui/settings/onboarding.js → STEPS`. Each step has `{ title, body, target: cssSelector | null }`. Null target = centered card with no highlight.

### Rendering groups

Group 0 = background (skybox, starfield, motes, petals, shooting stars, star-glows). Group 1 = mid-depth transparent billboards (nebula, blackhole). Depth/stencil is only auto-cleared for group 0; groups 1–2 rely on back-to-front sorting.

### Lock file drift (cross-platform npm)

`package-lock.json` must work on **both** macOS (local dev) and Linux x64 (Cloudflare CI). macOS npm and Linux npm resolve optional platform deps differently. If you change dependencies, regenerate the lock file inside the exact CI environment, not on your Mac:

```bash
rm -rf node_modules package-lock.json
docker run --rm -v "$(pwd)":/app -w /app --platform=linux/amd64 node:22.16.0 \
  bash -c "npm install --include=optional --no-audit --no-fund"
# Then on your Mac:
rm -rf node_modules && npm ci
```

Committing a Mac-only lock causes CI to fail with `Missing @emnapi/... from lock file`.

### CSP is strict — and it's in `public/_headers`

Every new runtime origin (CDN, font host, API, WebSocket, image host) must be allowlisted in the relevant CSP directive before it'll load in production. Dev works without it because Vite serves the HTML with no `_headers`. Forgetting this is the #1 reason a feature "works locally, fails in prod." See the "CSP blocked something on production" section in `DEPLOYMENT.md`.

### Production console is silent

`vite.config.js` sets `esbuild.pure: ['console.log', 'console.debug', 'console.info']` so those calls are dead-code-eliminated from the production bundle. Use `console.warn` / `console.error` for anything a user or error tracker should actually see. `vite dev` keeps every call for debugging.

### Public files vs hashed assets

Anything in `public/` is copied verbatim to `dist/` root with its filename preserved. Anything referenced from `index.html` (or imported from JS/CSS) gets a content hash. **If a `public/*.html` file references a file whose name is content-hashed, that reference will 404 after every build.** Hence `icon.svg` lives in `public/` (stable path) and is referenced by both `index.html` and `site.webmanifest` as `/icon.svg`. Preserve this pattern.

### XSS safety contract

- Every user-typed string (task name, profile name, greeting text, help-center search query, schedule labels) flows through `escapeHtml()` before landing in `innerHTML`.
- Two sites intentionally render raw HTML: `help-center.js::createEntryEl` (answer bodies) and `onboarding.js` (tour step bodies). Both have in-code comments labelling this as *author-controlled HTML only*. If you ever wire user input into either, switch them to `textContent` or escape the payload.

## Collaboration rules the user cares about

1. **Investigate before acting.** Read the actual code. If a theory would take effect by changing three places, verify all three before editing. The user has explicitly pushed back on guessing.
2. **Root cause, not symptom.** No try/catch to silence errors, no commenting out broken code, no `// TODO fix later`. If you can't find the root cause, say so instead of shipping a patch.
3. **Premium quality default.** Animations should stay smooth indefinitely. Don't trade visible quality for "it's faster."
4. **Surgical edits.** No unrequested refactors, no new abstractions, no new utility modules, no renaming. Match the style of surrounding code.
5. **Concise output.** No trailing summaries of what was done when the diff already tells the story. Short, direct status lines only.
6. **Comments are for non-obvious WHY.** Never narrate WHAT. Never reference the current task, ticket, or caller in code comments.
7. **Confirm before destructive actions.** Deleting branches, force-pushing, `git reset --hard`, dropping localStorage state, disposing Babylon resources in production paths — ask first unless the user already greenlit it for this scope.
8. **Never create `*.md` / `README` files** unless the user asks *or* the Documentation contract above requires the update.
9. **Never skip hooks** (`--no-verify`, `--no-gpg-sign`) unless the user explicitly asks.
10. **Tests must still pass.** If you change a feature covered by `tests/smoke.spec.js`, update the test. A red test is a real bug until proven otherwise — don't mute it.

## What NOT to do

- Don't pass raw `elapsed` to a shader `time` uniform.
- Don't introduce a single unbounded accumulator (like the old `grainTime += 0.016`) — wrap it.
- Don't add `position: …` to `.tour-highlight` targets without a specificity override for elements that were `fixed`.
- Don't latch the FPS watchdog irreversibly.
- Don't hand-roll settings UI — extend the schema in `js/ui/settings/schema.js` instead.
- Don't regenerate `package-lock.json` on macOS without matching on Linux (see "Lock file drift" above).
- Don't add a runtime origin without also adding it to CSP in `public/_headers`.
- Don't reintroduce `console.log` as a user-visible signal — it's stripped from prod. Use `console.warn` / `error` for anything meant to be seen.
- Don't create new `*.md` files beyond the five documented above unless the user asks.
- Don't run `git push --force`, `git reset --hard`, `rm -rf`, or `localStorage.clear()` during a debug session without confirming.

## Where to look first when debugging common symptoms

| Symptom | Look at |
|---|---|
| Blackhole looks blurred / washed after a long session | Nebula + skybox + starfield time wrapping; then film grain `grainTime`; then blackhole `flowT` |
| Blackhole disk stops spinning | `blackhole.js` — `spinCS` precompute, FPS watchdog state |
| Settings icon in wrong place mid-tour | `.tour-highlight` in `css/components/modules/12-onboarding-tour.css` |
| Settings don't persist | `js/ui/settings/store.js` + `apply.js` |
| Tasks / stats missing after reload | `localStorage` keys (`fu_*`) |
| Timer jumps after refresh | `home-mini-timer.js → restoreTimerState()` and `timer.js` |
| Sound plays locally but not in prod (or vice-versa) | R2 custom domain `cdn.universefocuses.com` — see `DEPLOYMENT.md` runbook |
| CI build fails on `npm ci` with "Missing ... from lock file" | Lock file drift between macOS and Linux — regenerate in Docker per "Lock file drift" above |
| Feature works in dev but fails in prod with console errors | CSP almost certainly; edit `public/_headers` and redeploy |
| CSS change has no visual effect | Check which module file in `css/components/modules/` actually owns those rules |

## Auto-memory

The user has a persistent file-based memory system at `~/.claude/projects/-Users-abdurahimhudulov-Desktop-FocusApp/memory/`. Check `MEMORY.md` there at the start of a session for recent context, user preferences, and project state captured from prior conversations. Keep it up to date when you learn something durable.

## Git defaults

- Default working branch is `master`. PRs target `master`.
- Commits go **only** to `master` (the user explicitly asked to stop dual-pushing to `framework_new`). Ignore the older `framework_new` branch unless the user says otherwise.
- Never force-push `master`. Never skip hooks.

## Commit message style

Write the way a senior engineer commits to a serious codebase. The reader is another engineer six months from now skimming `git log` to find the change that broke something or to understand why a piece of code looks the way it does.

**Do:**
- Lead with a short imperative subject line (≤72 chars), lowercase first word, no trailing period.
- Focus the body on the **why** and the non-obvious **how**: the problem that was found, the root cause, the constraint that forced the chosen approach, the trade-off accepted. Plain prose, terse but specific.
- Reference concrete things: file paths, function names, the exact bug symptom, the commit / issue being fixed if there is one.
- When a change has more than one piece, use bullet points in the body — short fragments, no marketing voice.

**Do not:**
- Don't write subjects like "feat: implement comprehensive cosmos sound system overhaul" — no conventional-commits prefixes unless the repo already uses them, no buzzwords ("comprehensive", "robust", "seamless", "leverage", "enhance"), no emoji, no exclamation marks.
- Don't write a body that just paraphrases the subject. If there's nothing more to say, ship a one-line commit.
- Don't list every file you touched — the diff already shows that.
- Don't narrate the implementation linearly ("first I added X, then I updated Y"). Describe the end state.
- Don't include "as requested by the user", "based on user feedback", or "per the conversation". The reader doesn't have access to that context and shouldn't need it.
- Don't include a `Co-Authored-By: Claude …` trailer or any other AI attribution. The user has explicitly asked for commits that don't read as AI-generated.
- No `--no-verify`, no `--no-gpg-sign`, no skipping hooks.

**Example of the bar:**

```
fix track-card hit testing on focus tab

`.container` has `contain: layout style paint` which makes it the containing
block for fixed descendants. The cosmos toolbar lived inside `.container`,
so its z-index competed only within that local stacking context — clicks
landed on the canvas behind it instead. Hoisted the toolbar, library
drawer, and popovers out of `.container`, same pattern the settings panel
already uses. Help button no longer overlaps because the toolbar moved to
bottom-centre.
```
