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
- The public static pages: `/privacy.html`, `/terms.html`, `/404.html`.
- JavaScript/HTML/CSS delivered to the browser by the above.

Out of scope:
- Third-party dependencies beyond configuration I control (Cloudflare, Babylon CDN, Google Fonts, esm.sh, Supabase when wired in). Report those to their respective maintainers.
- Denial-of-service attacks using obvious methods (traffic floods, expensive shader permutations). Cloudflare handles network-layer abuse.
- Missing security headers on third-party assets loaded via CDN.
- Self-XSS that requires the victim to paste attacker-controlled code into devtools.

## What's defended

- **CSP** — strict `Content-Security-Policy` on every response (see `public/_headers`). Scripts are limited to first-party plus an allowlist of `cdn.babylonjs.com`, `esm.sh`, and Cloudflare Insights. Fetches, images, fonts, and media each have their own narrow allowlist.
- **HSTS** — `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
- **Clickjacking** — `X-Frame-Options: SAMEORIGIN` and `frame-ancestors 'self'` in CSP.
- **MIME sniffing** — `X-Content-Type-Options: nosniff`.
- **Referrer** — `Referrer-Policy: strict-origin-when-cross-origin`.
- **Permissions** — `Permissions-Policy` disables camera, microphone, geolocation, payment, and sensor APIs (this app doesn't use them).
- **XSS** — every user-provided string (task names, profile names, greeting text, search queries) runs through `escapeHtml()` before being inserted into `innerHTML`. The two places that render pre-authored HTML (the help-center answer body and the onboarding tour step body) have in-code comments warning future contributors not to route user input through them.

## Data handling

- Without an account, all user data lives in `localStorage` / `sessionStorage` on the user's own device. It never leaves the browser.
- With an account (Phase 2, not yet live), a copy syncs to Supabase Postgres with Row-Level Security so users can only access their own rows.
- We do not use tracking cookies. Cloudflare Web Analytics is cookieless and aggregate-only.
- See [privacy.html](public/privacy.html) for the full Privacy Policy.
