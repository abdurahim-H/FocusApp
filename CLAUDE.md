# CLAUDE.md

Orientation for Claude Code (and any other AI agent) working on this repo. Read this before touching anything. Humans working here should read it too — it captures every invariant that isn't obvious from the code.

---

## Documentation contract

This repo keeps eight top-level documents. Every contributor (human or AI) must keep them in sync when their changes affect what's described:

| File               | Purpose                                                                 | When to update                                                                 |
|--------------------|-------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| **README.md**      | Product intro + quickstart for someone seeing the repo for the first time. | When features, commands, stack, or directory tree change materially.        |
| **CLAUDE.md** (this file) | Hard rules, gotchas, and conventions that aren't obvious from code.  | When you discover a new invariant, a new "never do X" rule, or a new failure mode future-you would hit. |
| **ARCHITECTURE.md**| Human-facing technical deep-dive (render loop, state model, CSS layout). | When the *shape* of the system changes — new subsystem, reworked render order, new state store. |
| **DEPLOYMENT.md**  | Infrastructure runbook — Cloudflare, R2, DNS, CSP, rollback procedures. | When deploy flow, env vars, DNS, CSP, or any piece of prod infra changes.      |
| **SECURITY.md**    | Reporting process, scope, defenses in place, data handling.             | When security posture changes — new CSP directive, new data stored, new third-party. |
| **CHANGELOG.md**   | Versioned user-visible history.                                         | Every user-visible change. Group under `[Unreleased]` until a release tag goes out. |
| **MONETIZATION.md**| Pricing, paywall scope, and the implementation plan.                    | When the gated features list, pricing, or Stripe wiring changes.      |
| **ROADMAP.md**     | Long-form feature backlog with effort sizing and dependencies.          | When a roadmap item ships, gets cancelled, or a new theme/wave is added.       |

**Rule:** if a PR changes behaviour, either (a) update the relevant `.md` file in the same PR, or (b) state in the PR why no doc update is needed.

Do **not** create additional `*.md` files without explicit human approval. We deliberately keep the doc surface small so it stays current.

## What this project is

Cosmic Focus — a single-page Pomodoro app rendered on top of a real-time Babylon.js black-hole scene. Pure vanilla ES modules. Babylon is loaded from CDN in `index.html` (pinned to `/v9.4.1/` with a SHA-384 SRI). Other npm deps (Supabase, signals-core, motion) are bundled from `node_modules` and served from our origin. Sound files live in a Cloudflare R2 bucket at `cdn.universefocuses.com`. Deploys via `@cloudflare/vite-plugin` + `wrangler` to a Cloudflare Worker serving `dist/` as static assets.

Productivity state (tasks / settings / stats / mixes) lives in `localStorage` / `sessionStorage`. Optional Supabase accounts add identity (display name, unique handle, email-verified sign-in) but do not yet mirror productivity data — cloud sync is the next planned phase.

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

Prefer `npm start` when debugging things that behave differently under a bundler. Use Docker (Node 22.16.0, linux/amd64) when touching `package-lock.json` to match Cloudflare's Linux build env exactly — see the "Lock file drift" section below.

## Directory map (the parts that matter)

```
js/
  core/          app.js (bootstrap), state.js (signals), motion.js (reduced-motion + speed wrapper),
                 auth-config.js (Supabase URL + anon key — public, RLS-protected)
  engine/        Babylon engine init (WebGL2 / WebGPU selection, hardware scaling)
  graphics/
    scene/       scene-manager.js — the render loop, cameras, lights, FPS watchdog wiring
    blackhole/   blackhole.js — GLSL shader for the disk, lensing, photon ring
    environment/ nebula, cosmic-skybox, starfield, star-glows, cosmic-motes, shooting-stars, ethereal-petals
    postprocessing/ pipeline.js (DefaultRenderingPipeline + film grain), god-rays, anamorphic-streak
  features/      timer, tasks, sounds, sound-mixer, statistics, sessions, analytics, keyboard,
                 auth.js (sole Supabase importer), password-policy.js (HIBP + blocklist)
  ui/
    settings/    schema.js (declarative), renderer.js, store.js, apply.js, data-io.js, onboarding.js, schedules.js, cheatsheet.js, search.js, profiles.js
    notification-banner.js, wellness-reminders.js (toast renderers — DOM-side reminder loops),
    task-dock.js (bottom-anchored task surface — slim/expanded states for the Focus tab),
    task-detail.js (per-task drawer), date-picker.js (custom calendar popover), notepad.js,
    music-services.js (bottom-left dock for Spotify / YT Music / Apple Music / YT / SoundCloud connects — Pro gate),
    home-mini-timer.js, home-period-tiles.js, help-center.js, help-content.js, navigation.js,
    button-feel.js, ui-effects.js, focus-trap.js, profile.js, stream-themes.js, timer-particles.js,
    account.js (signed-in/-out satellite + auth modal), ambient-ui.js, cosmos-a11y.js
  utils/         performance-profile.js (device tiers + FPS watchdog), notifications.js, cleanup.js, gentle-toast.js (shared toast queue)

css/
  base/          style, themes, responsive
  components/
    components.css                — thin @import aggregator
    apple-liquid-glass.css        — liquid-glass button system
    modules/                      — 31 focused CSS modules (home, mini-timer, settings panel, stats, tasks, tour, help, ambient deck, account, profile, period tiles, task detail, notepad, stream themes, celebrate toast, date picker, task dock, sakura/aurora/celestial-garden/silent-autumn/ocean theme overrides, upgrade modal, music services dock). Numbering has gaps (17, 18, 20) where past modules were folded back in — preserved so existing import order isn't churned.

public/           verbatim-copied to dist/: index assets (icon.svg, site.webmanifest), legal (privacy.html, terms.html), 404.html, robots.txt, sitemap.xml, _headers, theme-init.js (FOUC bootstrap), auth/callback.html + callback.js (OAuth/magic-link landing)
db/migrations/    SQL applied manually in Supabase dashboard (idempotent)
supabase/functions/  Deno Edge Functions: create-checkout-session, create-portal-session, stripe-webhook (deployed via `supabase functions deploy`)
tests/            Playwright smoke suite (smoke.spec.js)
index.html        entry point; loads pinned+SRI Babylon, then /js/core/app.js
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

`package-lock.json` must work on **both** macOS (local dev) and Linux x64 (Cloudflare's build env). macOS npm and Linux npm resolve optional platform deps differently. If you change dependencies, regenerate the lock file inside the exact build environment, not on your Mac:

```bash
rm -rf node_modules package-lock.json
docker run --rm -v "$(pwd)":/app -w /app --platform=linux/amd64 node:22.16.0 \
  bash -c "npm install --include=optional --no-audit --no-fund"
# Then on your Mac:
rm -rf node_modules && npm ci
```

Committing a Mac-only lock causes the auto-deploy to fail with `Missing @emnapi/... from lock file`.

### CSP is strict — and it's in `public/_headers`

Every new runtime origin (CDN, font host, API, WebSocket, image host) must be allowlisted in the relevant CSP directive before it'll load in production. Dev works without it because Vite serves the HTML with no `_headers`. Forgetting this is the #1 reason a feature "works locally, fails in prod." See the "CSP blocked something on production" section in `DEPLOYMENT.md`.

`script-src` deliberately **does not** include `'unsafe-inline'`. Every script is either `'self'`-origin or comes from a pinned external URL (Babylon CDN, Cloudflare Insights). If you need a synchronous-before-paint script, externalise it under `public/` (see `theme-init.js`) — don't paste an inline `<script>` block.

### Babylon is pinned + SRI'd — recompute the hash on upgrade

`index.html` loads `https://cdn.babylonjs.com/v9.4.1/babylon.js` with a `sha384-…` `integrity` attribute and `crossorigin="anonymous"`. The browser refuses to execute it if the bytes don't match. When upgrading Babylon, update both the URL version path and the integrity hash:

```bash
curl -s https://cdn.babylonjs.com/v<NEW>/babylon.js \
    | openssl dgst -sha384 -binary | openssl base64 -A
```

Only versioned `/v<X.Y.Z>/babylon.js` URLs are immutable on the BabylonJS CDN — never use the bare `/babylon.js` (it's latest-wins and breaks SRI).

### Supabase migrations live in `db/migrations/`

Schema changes for the optional accounts feature go in `db/migrations/NNNN_*.sql`. They are applied manually in the Supabase SQL editor (paste-and-run) — there's no automatic migration runner. Migrations should be idempotent (`create table if not exists`, `drop policy if exists … create policy …`) so they're safe to re-run. Current migrations: `0001_usernames.sql`, `0002_sessions.sql`, `0003_billing.sql` (Pro tier table + `get_my_tier()` RPC).

### Stripe paywall — see MONETIZATION.md

The Pro tier is wired through three Supabase Edge Functions in `supabase/functions/`: `create-checkout-session`, `create-portal-session`, and `stripe-webhook`. The webhook is the ONLY thing that mutates `public.billing` — it runs with the service-role key and bypasses RLS. The client never reads `billing` directly; it calls the `get_my_tier()` RPC which returns just the tier string. UI gates go through `js/features/billing.js → isPro()`. Required env vars on the Supabase functions: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `APP_BASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. The full list of gated features and the user-facing flow is in `MONETIZATION.md`.

### Production console is silent

`vite.config.js` sets `esbuild.pure: ['console.log', 'console.debug', 'console.info']` so those calls are dead-code-eliminated from the production bundle. Use `console.warn` / `console.error` for anything a user or error tracker should actually see. `vite dev` keeps every call for debugging.

### Public files vs hashed assets

Anything in `public/` is copied verbatim to `dist/` root with its filename preserved. Anything referenced from `index.html` (or imported from JS/CSS) gets a content hash. **If a `public/*.html` file references a file whose name is content-hashed, that reference will 404 after every build.** Hence `icon.svg` lives in `public/` (stable path) and is referenced by both `index.html` and `site.webmanifest` as `/icon.svg`. Preserve this pattern.

### XSS safety contract

- Every user-typed string (task name, profile name, greeting text, help-center search query, schedule labels, account name + username + email + avatar) flows through `escapeHtml()` / `escapeAttr()` before landing in `innerHTML`. Avatar URLs are additionally protocol-validated (https/http only).
- Shared-mix import (`?mix=` URL param in `js/ui/ambient-ui.js`) sanitises every payload field at the boundary: `name` is length-capped + control-chars stripped, `icon` must be ≤4 codepoints with no markup characters (otherwise falls back to '🎵'), `active` is filtered to strings + capped to 32 entries.
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
- Don't create new `*.md` files beyond the eight documented above unless the user asks.
- Don't run `git push --force`, `git reset --hard`, `rm -rf`, or `localStorage.clear()` during a debug session without confirming.
- **Don't import `@supabase/supabase-js` from anywhere except `js/features/auth.js`.** That file is the single point of contact with the auth provider. Everything else calls the thin API it exposes (`signInWithMagicLink`, `signInWithOAuth`, `signOut`, `onChange`, `getUser`, `isConfigured`, `isUsernameAvailable`, `claimUsername`, `callRpc`, `invokeFunction`). One file changes if we ever swap providers.
- **Don't read `tier.value` directly to gate features.** The Pro paywall has exactly one client-side helper: `isPro()` from `js/features/billing.js`. Every gate (Notes, Profile sections, future audio integrations) calls `isPro()`. Reading the signal directly leaks the abstraction; a future provider swap (Stripe → LemonSqueezy / Paddle) would have to chase down every call site instead of editing one file.
- **Don't trust the client tier flag for anything that costs money to serve.** `isPro()` is UI-friction only — a user with devtools can flip it. For features with a real per-user infrastructure cost (cloud sync, OAuth-backed music integrations when they ship), enforce `tier='pro'` server-side in the relevant Supabase Edge Function or RLS policy. Truth lives in `public.billing.tier`, written ONLY by the Stripe webhook running with the service-role key.
- **Don't bypass the password policy.** `js/features/auth.js → signUpWithPassword` runs `validatePassword` + `isPasswordBreached` (HIBP) before calling Supabase. New auth flows must call this same function — don't reach for `c.auth.signUp` directly.
- **Don't paste an inline `<script>` block.** Externalise it under `public/` so CSP can keep `script-src` free of `'unsafe-inline'`. Same applies to `on*=` event-handler attributes in HTML.
- **Don't put `position: fixed` chrome inside `.container`.** `.container` has `contain: layout style paint` which makes it the containing block for fixed descendants AND clips paint and pointer hits to its box. Settings panel, cosmos toolbar, library drawer, save-mix popover, sleep popover, account satellite, account dropdown, and auth modal all live as direct children of `<body>` for this reason. Adding a new floating overlay? It goes outside `.container`.

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
