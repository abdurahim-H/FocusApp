# CLAUDE.md

Orientation for Claude Code sessions working on this repo. Read this before touching anything.

---

## What this project is

Cosmic Focus — a single-page Pomodoro app rendered on top of a real-time Babylon.js black-hole scene. Pure vanilla ES modules. Babylon is loaded from CDN in `index.html`. There is **no build step in production**; Vite exists only for local dev convenience. All user state lives in `localStorage` / `sessionStorage`. No backend, no account.

## Run it

```
npm run dev           # Vite dev server (fast reload)
npm start             # python3 -m http.server 8000 — closer to prod (plain file serving)
npm run build / preview
```

Prefer `npm start` when debugging things that behave differently under a bundler.

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
  features/      timer, tasks, sounds, sound-mixer, statistics, keyboard, meditation, notification-banner
  ui/
    settings/    schema.js (declarative), renderer.js, store.js, apply.js, data-io.js, onboarding.js
    home-mini-timer.js, help-center.js, help-content.js, navigation.js, button-feel.js, ui-effects.js
  utils/         performance-profile.js (device tiers + FPS watchdog)

css/components/components.css  — one big stylesheet; search before adding rules
index.html                     — entry point, loads Babylon from CDN then modules
```

The `README.md` is **out of date** — its file list references things that now live under `_quarantine/` or have been renamed. Trust the tree above and the filesystem, not the README.

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

Group 0 = background (skybox, starfield, motes, petals, shooting stars, star-glows, meditation). Group 1 = mid-depth transparent billboards (nebula, blackhole). Depth/stencil is only auto-cleared for group 0; groups 1–2 rely on back-to-front sorting.

## Collaboration rules the user cares about

1. **Investigate before acting.** Read the actual code. If a theory would take effect by changing three places, verify all three before editing. The user has explicitly pushed back on guessing.
2. **Root cause, not symptom.** No try/catch to silence errors, no commenting out broken code, no `// TODO fix later`. If you can't find the root cause, say so instead of shipping a patch.
3. **Premium quality default.** Animations should stay smooth indefinitely. Don't trade visible quality for "it's faster."
4. **Surgical edits.** No unrequested refactors, no new abstractions, no new utility modules, no renaming. Match the style of surrounding code.
5. **Concise output.** No trailing summaries of what was done when the diff already tells the story. Short, direct status lines only.
6. **Comments are for non-obvious WHY.** Never narrate WHAT. Never reference the current task, ticket, or caller in code comments.
7. **Confirm before destructive actions.** Deleting branches, force-pushing, `git reset --hard`, dropping localStorage state, disposing Babylon resources in production paths — ask first unless the user already greenlit it for this scope.
8. **Never create `*.md` / `README` files** unless the user asks (this file is the exception; the user asked for it).
9. **Never skip hooks** (`--no-verify`, `--no-gpg-sign`) unless the user explicitly asks.

## What NOT to do

- Don't pass raw `elapsed` to a shader `time` uniform.
- Don't introduce a single unbounded accumulator (like the old `grainTime += 0.016`) — wrap it.
- Don't add `position: …` to `.tour-highlight` targets without a specificity override for elements that were `fixed`.
- Don't latch the FPS watchdog irreversibly.
- Don't hand-roll settings UI — extend the schema instead.
- Don't add new `.md` files, planning docs, or summaries unless requested.
- Don't trust `README.md` for the architecture — it's stale. Trust the filesystem.
- Don't run `git push --force`, `git reset --hard`, `rm -rf`, or `localStorage.clear()` during a debug session without confirming.

## Where to look first when debugging common symptoms

| Symptom | Look at |
|---|---|
| Blackhole looks blurred / washed after a long session | Nebula + skybox + starfield time wrapping; then film grain `grainTime`; then blackhole `flowT` |
| Blackhole disk stops spinning | `blackhole.js` — `spinCS` precompute, FPS watchdog state |
| Settings icon in wrong place mid-tour | `.tour-highlight` in `css/components/components.css` |
| Settings don't persist | `js/ui/settings/store.js` + `apply.js` |
| Tasks / stats missing after reload | `localStorage` keys (`fu_*`) |
| Timer jumps after refresh | `home-mini-timer.js → restoreTimerState()` and `timer.js` |

## Auto-memory

The user has a persistent file-based memory system at `~/.claude/projects/-Users-abdurahimhudulov-Desktop-FocusApp/memory/`. Check `MEMORY.md` there at the start of a session for recent context, user preferences, and project state captured from prior conversations. Keep it up to date when you learn something durable.

## Git defaults

- PRs target `master`.
- Work branches vary — check `git status`.
- Never force-push `master`. Never skip hooks.
