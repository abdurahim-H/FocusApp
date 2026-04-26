# Personal Accounts — Plan

Status: **proposal — awaiting approval before implementation.**
Scope: surface-level (UI + auth flow). Data sync logic is the next phase, not this one.

---

## Why this document exists

Cosmic Focus has been a no-account, all-localStorage app from day one. We're now adding a real identity layer so users can sign in and have their state — tasks, stats, settings, constellations — follow them across devices. This file plans the **shape and placement** of that identity layer in the existing app, before any code is written. The actual cloud-sync semantics get their own plan in a later phase.

---

## Current viewport map

The site already uses every corner except one:

```
┌───────────────────────────────────────────┐
│ EMPTY                  ✦ settings-star    │  top-left empty
│                        (top: 16, right: 16) │  ← this is our slot
│                                           │
│              ─── nav (Home / Focus) ───   │
│                                           │
│                                           │
│                          mini-timer        │
│                          (bottom: 80,      │
│                           right: 60)       │
│ ? help-trigger                            │
│ (bottom: 20, left: 20)                    │
│                                           │
│              cosmos toolbar               │
│              (bottom-centre)              │
└───────────────────────────────────────────┘
```

| Surface              | Position                              | Z-index |
|----------------------|---------------------------------------|---------|
| settings-star        | top: 16px, right: 16px                | 2002    |
| help-trigger         | bottom: 20px, left: 20px              | 2002    |
| nav-buttons          | top-centre (under settings-star band) | high    |
| home-mini-timer      | bottom: 80px, right: 60px             | 1500    |
| hmt-sliver           | right edge, vertically centred        | 1500    |
| cosmos-toolbar       | bottom: 28px, left: 50% (centred)     | 2010    |
| ambient-toast        | top: 28px, left: 28px (top-left)      | 2300    |
| settings-modal       | top: 2px, right: 2px (slides in)      | high    |

**Top-left is unclaimed apart from the toast.** That's where the account control belongs.

---

## Where to put it — and why

**The account trigger goes top-left.**

It mirrors the settings star geometry exactly: a 36×36 circle, the same proximity-glow trick, the same `position: fixed` corner anchor. The mental model becomes obvious without explanation:

- **left corner = me** (account, identity, sync state)
- **right corner = the app** (settings, scene, audio, shortcuts)

### Alternatives considered and rejected

**A new "Account" section in the settings panel.** Familiar pattern (every web app does this), but the user has to *open settings* to know whether they're signed in. Identity is at-a-glance state — it should be visible without a click.

**A pill next to the nav buttons.** Adds clutter to the centred nav and competes with it for visual weight. Nav stays cleanest as just Home/Focus.

---

## What the surface looks like

### The trigger (top-left circle)

**Signed-out state**

- A 36×36 circle, hairline border in `rgba(255, 205, 115, 0.18)`, almost-transparent fill
- A simple person-outline glyph (feather-style stroke), low opacity at rest
- Brightens on mouse proximity using the same `--glow` custom property the settings star already uses
- `aria-label="Sign in"`, hover tooltip says "Sign in"

**Signed-in state**

- Same circle, but now filled with the user's avatar OR a single uppercase initial on a deep gold gradient
- Gold-rimmed border (`rgba(255, 205, 115, 0.55)`) — visually pairs with the settings star's gold sheen
- A tiny pulsing dot at the top-right of the circle while sync is in flight (gold), fades on completion
- A faint red dot if sync fails; click to retry
- `aria-label="Account — <user's name>"`

### The dropdown (opens on click)

A small floating panel anchored under the trigger, ~240px wide. Same material language as the cosmos toolbar — dark glass base, gold hairline border, soft outer glow.

**Signed-out content**

```
┌────────────────────────────┐
│ Save your sky              │
│                            │
│ Sign in to keep your       │
│ tasks, stats, and          │
│ constellations across      │
│ devices.                   │
│                            │
│  [   Sign in   ]           │
│  [ Create account ]        │
└────────────────────────────┘
```

**Signed-in content**

```
┌────────────────────────────┐
│ ◉  Abdurahim H.            │
│    abduh@…com              │
│ ───────────────────────    │
│ ⚙  Profile                 │
│ ☁  Sync · synced just now  │
│ ───────────────────────    │
│ ↩  Sign out                │
└────────────────────────────┘
```

The dropdown closes on outside-click and on Esc. Same focus-trap pattern as the other popovers.

### The auth modal

When the user picks *Sign in* or *Create account*, a centred modal slides in. Same materials as `save-mix-popover` — scrim with backdrop blur, glass card, focus-trapped, Esc to dismiss.

```
┌─────────────────────────────────────┐
│                                     │
│  Sign in       Create account       │   ← segmented toggle
│  ────────                           │
│                                     │
│  Email                              │
│  ┌─────────────────────────────┐    │
│  │ you@somewhere.com           │    │
│  └─────────────────────────────┘    │
│                                     │
│        [ Send magic link ]          │
│                                     │
│        ─────  or  ─────             │
│                                     │
│  ┌──────────────────────┐           │
│  │ G  Continue with Google │        │
│  └──────────────────────┘           │
│  ┌──────────────────────┐           │
│  │   Continue with Apple │         │
│  └──────────────────────┘           │
│                                     │
│  By continuing you agree to the     │
│  Terms and Privacy Policy.          │
└─────────────────────────────────────┘
```

After the user submits the magic-link email, the card morphs in place — no route change, no separate page — to:

```
┌─────────────────────────────────────┐
│                                     │
│            ✉  envelope animation    │
│                                     │
│      Check your inbox               │
│      We sent a sign-in link to      │
│      you@somewhere.com              │
│                                     │
│      [ Try a different email ]      │
└─────────────────────────────────────┘
```

The Google / Apple buttons trigger the OAuth redirect flow. On return, the modal closes, the trigger circle gets the user's initial, and a small "Signed in as …" toast briefly shows top-centre.

---

## Tech stack

### Provider: Supabase

Reasons it fits this project:

- **JS SDK is small** (~30 KB minified) and loads as ESM from `esm.sh` — already on the CSP allowlist.
- **Auth out of the box**: magic-link, Google OAuth, Apple OAuth, email/password if we ever want it.
- **Postgres for sync later** — when we move past surface-level, the same provider gives us the database. No second integration.
- **Realtime** for cross-device live sync if we want it (Phase 3+).
- **Free tier** comfortably covers expected traffic.

### Why not something else (briefly)

- **Auth0 / Clerk** — heavier UI dependency, more lock-in, more cost.
- **Custom JWT + Cloudflare D1** — we'd build everything ourselves: token rotation, OAuth handshakes, password resets. Months of yak-shaving for no gain.
- **Firebase Auth** — fine but pulls Google's whole stack; Postgres is more useful long-term.

### Provider abstraction

The actual `supabase-js` import lives in **one file only**: `js/features/auth.js`. Everything else in the app calls a thin API:

```js
auth.signIn({ email })          // → magic link
auth.signInWithOAuth('google')  // → OAuth redirect
auth.signOut()
auth.onChange(callback)         // → fires on sign-in / sign-out
auth.getUser()                  // → current user or null
auth.getSession()
```

If we ever swap providers, it's one file.

### CSP / `_headers` change

Append `https://*.supabase.co` to `connect-src`. That's the only change needed:

```
connect-src 'self' https://cdn.universefocuses.com https://cdn.babylonjs.com
            https://esm.sh https://cloudflareinsights.com
            https://*.supabase.co
```

OAuth redirects: Supabase handles them on its own domain, then redirects back to `universefocuses.com/auth/callback`. We add a tiny `auth/callback.html` to `public/` that closes the popup or completes the redirect, then forwards to `/`.

---

## What signed-in does NOT change yet

Per the user's "surface-level only" instruction, this phase ships the **identity** layer:

- The user can sign in / sign out
- The trigger reflects their state
- The auth modal works end to end

It does **not** ship:

- Cloud sync of tasks / stats / constellations / settings
- Cross-device replication
- Profile editing (avatar upload, display name change)
- Any database schema work

Those land in Phase 2 (Sync). They get their own plan.

---

## What signed-out remains

The app stays **fully usable signed-out**. Accounts are pure sync + identity, not a paywall. Every existing feature works in localStorage-only mode, exactly as today. Signing in adds cross-device persistence; signing out reverts to local-only.

This is non-negotiable for the project's vibe — Cosmic Focus is the kind of tool people expect to just *work* without giving an email up front.

---

## Knock-on changes to existing UI

| Surface             | Change                                                                                                                                                            |
|---------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ambient-toast       | Currently top-left (28, 28) — collides with the new account trigger. Move to top-centre, just under the nav, where it doesn't compete with either chrome corner. |
| help-trigger        | Stays bottom-left. No conflict with top-left avatar.                                                                                                              |
| settings-star       | Stays top-right.                                                                                                                                                   |
| `public/_headers`   | Add `https://*.supabase.co` to `connect-src`.                                                                                                                     |
| `index.html`        | Add account trigger button + auth modal, both as direct children of `<body>` (the `.container` `contain: layout` rule means fixed overlays MUST live outside).    |
| `js/features/auth.js` | New file — the only place Supabase is imported.                                                                                                                  |
| `js/ui/account.js`  | New file — wires the trigger, dropdown, and modal.                                                                                                                |
| Help center         | New "Account" category. Two questions for now: "Why sign in?" and "How do I sign in/out?"                                                                          |
| Settings panel      | No new section yet. Account lives in its own corner; the panel stays as it is. (We can add a tiny "Linked: <email>" readonly row in *Data & About* if useful.)    |

---

## File structure after this phase

```
js/
  features/
    auth.js                ← new — Supabase wrapper, single import point
  ui/
    account.js             ← new — top-left trigger + dropdown + auth modal wiring
css/
  components/modules/
    16-account.css         ← new — trigger + dropdown + auth modal styles
public/
  auth/
    callback.html          ← new — OAuth redirect landing page (closes / forwards)
  _headers                 ← updated — connect-src adds *.supabase.co
index.html                 ← updated — trigger + auth modal markup, toast position
```

CSS module count goes from 15 to 16. The naming convention (`NN-name.css`) holds.

---

## Implementation order

1. **Provider scaffolding.** Add `js/features/auth.js`. Wire `supabase-js` from esm.sh. Update `_headers` CSP. Add `public/auth/callback.html`. Verify `auth.getSession()` returns `null` on cold load and survives reloads.
2. **Trigger + dropdown.** Add the top-left avatar button to `index.html`, render signed-out / signed-in states, wire the dropdown. No auth flow yet — the buttons inside open the auth modal.
3. **Auth modal.** Build the modal markup + CSS. Wire the segmented sign-in / sign-up toggle, magic-link form, OAuth buttons. Hook them to `auth.signIn` / `auth.signInWithOAuth`.
4. **State sync.** `auth.onChange` updates the trigger circle. Sign-out re-renders to outline. The trigger is the single source of truth visually.
5. **Toast relocation.** Move `ambient-toast` to top-centre.
6. **Help center.** Add the "Account" category.
7. **Polish.** Reduced-motion fallback, focus-trap on the modal, Esc dismiss, mobile tap targets, the in-flight pulse dot, success/error edge cases.

Each step is independently shippable. If we have to stop after step 2, we have a working trigger that opens a placeholder modal — no broken state in production.

---

## Decisions needed before code

| # | Question                                                                                              | Default                                                  |
|---|-------------------------------------------------------------------------------------------------------|----------------------------------------------------------|
| 1 | Top-left avatar as the trigger?                                                                       | Yes                                                      |
| 2 | Auth methods: magic-link + Google + Apple? Skip email/password?                                       | Magic-link + Google + Apple, no email/password           |
| 3 | Provider: commit to Supabase, or build provider-agnostic abstraction and decide later?                | Commit to Supabase, but the abstraction stands either way |
| 4 | When a signed-in user lands on a fresh device with existing local data — replace, merge, or prompt?    | Prompt once: "Use cloud data or keep local?"             |
| 5 | Signed-out behaviour — app fully usable, no feature gating?                                           | Yes — accounts are pure sync, never a paywall           |

Greenlighting all five with "go" means I ship steps 1–7 in one pass and stop before any data-sync code.

---

## What this changes about the project doctrine

Two CLAUDE.md updates land alongside this:

- A note that `js/features/auth.js` is the **only** file allowed to `import` from `@supabase/supabase-js`. Any other file goes through the abstraction.
- A note that `position: fixed` chrome buttons (settings, help, account) live as direct children of `<body>`, not inside `.container`. Already painfully discovered for the cosmos toolbar — codify it.

`README.md` and `ARCHITECTURE.md` get small updates when this ships:

- README: add "optional sign-in for cross-device sync" to the feature bullets.
- ARCHITECTURE: a paragraph in the state-management section explaining auth state lives in its own module, not the signal store, because it's not local-only.

---

## Out of scope for this plan

- Cloud sync semantics, conflict resolution, schema design — Phase 2.
- Profile editing surface (avatar upload, name change, password reset) — Phase 2.
- Sharing constellations between accounts (vs. the current public link) — Phase 3.
- Premium / paid tier — not on the roadmap, intentionally.
- Multiplayer / live-collaborative features — far future.
