# Security Policy

## Reporting a vulnerability

If you believe you've found a security issue in Cosmic Focus (universefocuses.com), please report it privately to **abduh@universefocuses.com**.

Please include:
- A short description of the issue and its impact.
- A minimal reproduction (steps, screenshots, HTTP requests, or a proof-of-concept URL).
- Your contact details if you'd like a follow-up.

I'll acknowledge receipt within **3 business days** and aim to ship a fix or mitigation within **14 days** for high-severity issues. You'll be credited in the CHANGELOG once the fix is public, unless you'd rather stay anonymous.

Please do **not** open a public GitHub issue for security vulnerabilities.

## Supported versions

Only the latest deployed version at `universefocuses.com` is supported. The app is a static single-page build without long-lived server-side state, so the "current deployment" is always the one running fixes.

| Environment              | Supported? |
|--------------------------|------------|
| `universefocuses.com`    | ✅ yes      |
| Prior GitHub Pages build | ❌ decommissioned — do not report issues against it |

## Scope

In scope:
- The production app at `universefocuses.com` and `www.universefocuses.com`.
- The R2 CDN `cdn.universefocuses.com` (audio delivery).
- The Supabase project backing the optional accounts feature (auth flows, RLS policies, public RPCs).
- The public static pages: `/privacy.html`, `/terms.html`, `/404.html`, `/auth/callback.html`.
- JavaScript/HTML/CSS delivered to the browser by the above.

Out of scope:
- Third-party dependencies beyond configuration I control (Cloudflare, Babylon CDN, Google Fonts, Supabase platform itself). Report those to their respective maintainers.
- Denial-of-service attacks using obvious methods (traffic floods, expensive shader permutations). Cloudflare handles network-layer abuse.
- Missing security headers on third-party assets loaded via CDN.
- Self-XSS that requires the victim to paste attacker-controlled code into devtools.

## What's defended

### Transport + headers

- **HSTS** — `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
- **Clickjacking** — `X-Frame-Options: SAMEORIGIN` and `frame-ancestors 'self'` in CSP.
- **MIME sniffing** — `X-Content-Type-Options: nosniff`.
- **Referrer** — `Referrer-Policy: strict-origin-when-cross-origin`.
- **Permissions** — `Permissions-Policy` disables camera, microphone, geolocation, payment, and sensor APIs (this app doesn't use them).

### Content Security Policy

`public/_headers` keeps a tight CSP on every response:

- `script-src 'self'` plus pinned `cdn.babylonjs.com` and Cloudflare Insights — **no `'unsafe-inline'`**. The theme bootstrap and auth-callback handler are external `.js` files for this reason.
- `object-src 'none'` — explicit denial of `<object>` / `<embed>` / `<applet>`.
- `style-src 'self' 'unsafe-inline' fonts.googleapis.com` — inline styles still required because Vite emits `<style>` blocks in the build output.
- Narrow per-directive allowlists for `font-src`, `img-src`, `media-src`, `connect-src`, `worker-src`. The `connect-src` allow list includes `api.pwnedpasswords.com` for the HIBP password breach check (k-anonymity, only the first 5 hex chars of SHA-1 leave the browser).

### Supply chain

- **Babylon.js is pinned** to `https://cdn.babylonjs.com/v9.4.1/babylon.js` with a SHA-384 `integrity` attribute and `crossorigin="anonymous"`. The browser refuses to execute it if the bytes don't match. The unversioned `/babylon.js` URL (latest-wins) is deliberately not used. Hash-recompute procedure is documented in `index.html`.
- **Supabase JS SDK, `@preact/signals-core`, and Motion One** are bundled from `node_modules` so they ship from our own origin under `script-src 'self'`. There is no third-party CDN in the auth path.
- **No `eval`, no `new Function`, no string-form `setTimeout`/`setInterval`, no service worker, no `postMessage` listeners.**

### XSS

- Every user-provided string (task names, profile names, greeting text, search queries, schedule labels, account name, username, email, avatar URL) runs through `escapeHtml()` / `escapeAttr()` before being inserted into `innerHTML`. Avatar URLs are additionally protocol-validated (https/http only — `javascript:` / `data:` / `file:` are rejected).
- Shared-mix imports (`?mix=` URL parameter) sanitise every payload field at the boundary: `name` is length-capped + control chars stripped, `icon` must be ≤4 codepoints with no markup characters (otherwise falls back to '🎵'), `active` is filtered to strings + capped to 32 entries.
- The two places that render pre-authored HTML (the help-center answer body and the onboarding tour step body) have in-code comments warning future contributors not to route user input through them.

### Auth + accounts

- **Single import seam.** Only `js/features/auth.js` imports `@supabase/supabase-js`; everything else calls the typed API it exposes. Errors from Supabase are normalised through `normaliseError` so internal messages never reach the user verbatim.
- **Password policy.** `js/features/password-policy.js` enforces length 8–128, no whitespace at edges, no single-character repeats, and a 50-entry common-password blocklist (covers the worst SecLists / NCSC top-100 entries). Sign-up additionally runs an HIBP k-anonymity breach check via `api.pwnedpasswords.com` — only the first 5 hex chars of SHA-1 leave the browser. Network failure resolves to "no signal" (don't gate sign-up on a flaky API); the structural + blocklist checks still apply.
- **Anti-enumeration.** Sign-up gives the same UI response whether the email is fresh or already on file. When Supabase returns `already_registered`, the client silently fires a magic link to the same address so the existing user gets a usable email regardless of which provider they originally signed up with.
- **Username uniqueness.** A separate `public.usernames` table enforces uniqueness via Postgres `PRIMARY KEY` on the handle. Row-Level Security restricts the table to the owner; public availability probes go through `is_username_taken(text)`, a `SECURITY DEFINER` function that returns just a boolean — `user_id` never leaves the database.
- **Throttling.** Magic-link and password-reset emails have a 4 s client-side cooldown to prevent accidental double-fires; Supabase enforces server-side rate limits as the actual security gate.
- **Submit guards.** All auth actions set an in-flight flag synchronously before any `await`, so a double-click can't fire the same call twice.
- **Sign-out is idempotent.** Even if the server call fails (token already invalid, network down), the local cached session is cleared. The intent is "leave"; we honour it locally regardless of server outcome.
- **Modal ARIA.** Auth modal sets `inert` on the rest of the app while open so screen-reader navigation can't tab into the cosmos behind it.

## Data handling

- Without an account, all productivity data (tasks, settings, stats, mixes) lives in `localStorage` / `sessionStorage` on the user's own device. It never leaves the browser.
- With an account, the only data Supabase stores today is what's needed for identity:
  - Email + (hashed) password or OAuth identity in `auth.users` (Supabase-managed).
  - Display name and chosen username in `auth.users.raw_user_meta_data`.
  - The username string in `public.usernames` (with `user_id` foreign key, RLS-protected).
  - Productivity data is **not** mirrored to Supabase yet — that's the next planned phase.
- We do not use tracking cookies. Cloudflare Web Analytics is cookieless and aggregate-only.
- See [privacy.html](public/privacy.html) for the full Privacy Policy.
