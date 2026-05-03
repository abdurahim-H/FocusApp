# Deployment Runbook

How Cosmic Focus is deployed, and what to do when something breaks.

## Stack at a glance

```
  GitHub (abdurahim-H/FocusApp, master branch)
          ↓ webhook on push (Cloudflare Workers git integration)
  Cloudflare runs:  npm ci → npm run build → npx wrangler deploy
          ↓
  Cloudflare Workers + Static Assets (project: "focusapp")
          ↓ serves at
  universefocuses.com  +  www.universefocuses.com
          ↓ browser also fetches audio + theme videos from
  Cloudflare R2 (bucket: "focusapp-sounds") via cdn.universefocuses.com
```

- **Domain registrar:** Squarespace (domain renews 2026-12-23).
- **DNS:** Cloudflare (nameservers `merlin.ns.cloudflare.com`, `ollie.ns.cloudflare.com`).
- **TLS:** Cloudflare universal SSL, auto-renewed.
- **Auth + Postgres:** Supabase (live for the optional accounts feature; cloud sync of productivity data is the next planned phase).

## Normal deploy flow

Push to `master` and the production app redeploys automatically. There is no GitHub Actions workflow involved — Cloudflare's own Workers git integration is what's wired up.

1. Commit + push to `master` on `github.com/abdurahim-H/FocusApp`.
2. Cloudflare Workers picks up the push, clones the commit, and runs the build remotely: `npm ci` → `npm run build` → `npx wrangler deploy`.
3. `wrangler.toml` + the `dist/wrangler.json` written by the `@cloudflare/vite-plugin` tell the Worker to serve `dist/` as static assets. `not_found_handling = "404-page"` routes unknown paths to `dist/404.html`.
4. New deployment shows up in Cloudflare → Workers & Pages → focusapp → Deployments. Typical end-to-end time: **~30 seconds** from `git push` to the version going live.

You can also run `npx wrangler deploy` locally if you want an immediate ship without waiting for the auto-build (useful when you want to confirm an asset like a new theme video reads correctly on the live URL within seconds). The auto-deploy will fire too — both end up at the same Worker; whichever finishes first wins. There's no harm in a redundant manual deploy.

> **CLI labelling note.** `wrangler deployments list` shows `Source: Unknown (deployment)` for both git-triggered and CLI-triggered deploys. Don't read that as "manual only" — it just means the CLI doesn't surface the trigger source cleanly. The Cloudflare dashboard (Workers & Pages → focusapp → Deployments) labels them properly.

## Required Cloudflare settings

### Workers & Pages → `focusapp`
- Git integration: `abdurahim-H/FocusApp`, production branch `master`.
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: *(blank)*
- Environment variables: *(none — the Supabase URL and anon key are checked into `js/core/auth-config.js` because they are public by design; row-level security on Supabase is what protects user data, never the anon key)*

### DNS records (Websites → universefocuses.com → DNS)
| Type   | Name               | Content                              | Proxy   |
|--------|--------------------|--------------------------------------|---------|
| Worker | `universefocuses.com` | `focusapp`                       | Proxied |
| CNAME  | `www`              | `focusapp.abul-hudul.workers.dev`    | Proxied |
| R2     | `cdn`              | `focusapp-sounds`                    | Proxied |
| MX     | `@`                | `smtp.google.com`                    | DNS only |
| TXT    | `@`                | `v=spf1 include:_spf.google.com ~all` | DNS only |
| TXT    | `google._domainkey` | DKIM public key                     | DNS only |

Do **not** proxy the `MX` record or the email `TXT` records — proxying breaks mail.

### R2 → `focusapp-sounds`
- **Sound objects** at the bucket root: `rain_00.wav`, `ocean_04.wav`, `forest_00.wav`, `crowd_0.wav`, plus the rest of the ambient library.
- **Theme video objects** under prefixes — one folder per scene theme:
  - `sakura/sakura-loop.mp4`
  - `aurora/aurora-loop-v2.mp4`
  - `celestial-garden/celestial-garden-loop.mp4`
  - `silent-autumn/silent-autumn-loop.mp4`
- **Custom domain:** `cdn.universefocuses.com`, status **Active**, Minimum TLS `1.0`, Access **Enabled**.
- Adding more sounds: drag-drop into the bucket for a handful, or `rclone copy ./sounds r2:focusapp-sounds --transfers=10 --progress` for bulk.
- Adding a theme video: `npx wrangler r2 object put focusapp-sounds/<theme>/<theme>-loop.mp4 --file <local.mp4> --content-type video/mp4 --remote`. Source file stays local (gitignored); the bucket is the source of truth for production.

## Incident runbook

### "The build is failing in CI"

| Symptom | Cause | Fix |
|---|---|---|
| `npm ci` says "package.json and package-lock.json not in sync, Missing <dep>" | Lock file drifted — usually cross-platform (macOS vs Linux transitive deps; Cloudflare's build env is Linux) | Regenerate the lock file **inside a Linux container** matching the canonical env (Node 22.16.0, npm 10.9.2): `rm -rf node_modules package-lock.json && docker run --rm -v "$(pwd)":/app -w /app --platform=linux/amd64 node:22.16.0 bash -c "npm install --include=optional --no-audit --no-fund"`. Commit the regenerated `package-lock.json`. |
| `wrangler deploy` says `Asset too large — 25 MiB limit` | Some media file slipped into `dist/` (theme video, audio, source PNG) that should live on R2 instead | Move the file to R2 via `npx wrangler r2 object put focusapp-sounds/<path> --file <local> --remote`, reference it in the code via `https://cdn.universefocuses.com/<path>`, and re-run `npm run build` to confirm `dist/` no longer contains the oversized asset. The build script does `rm -rf dist && vite build` so a clean run succeeds once the file is gone. |
| `Cannot modify Vite config: could not find a valid plugins array` | `wrangler deploy` ran its auto-configure step and couldn't find the Cloudflare plugin | Ensure `vite.config.js` has `plugins: [cloudflare()]` and `@cloudflare/vite-plugin` is in `devDependencies`. |
| `Cannot find native binding` for Rolldown | Local `node_modules/` was installed for the wrong platform | `rm -rf node_modules && npm ci`. |

### "The site loads but audio is broken"

Check `cdn.universefocuses.com`:
1. Cloudflare → R2 → `focusapp-sounds` → Settings → Custom Domains. Status should be **Active**. If Pending or Errored, delete and re-add the custom domain.
2. DNS → confirm the `cdn` R2 record is still present.
3. Test directly: `curl -I https://cdn.universefocuses.com/rain_00.wav` should return `200`.
4. If SSL warnings, Cloudflare's cert issuance may still be pending — wait 10-15 minutes.

### "CSP blocked something on production"

`public/_headers` defines the CSP. If a new dependency or CDN is introduced, its origin must be added to the relevant directive:
- Script from a CDN → `script-src`
- CSS from a CDN → `style-src`
- Fonts → `font-src`
- Fetch / XHR / `import()` / source maps → `connect-src`
- Images → `img-src`
- Audio / video → `media-src`

After editing `_headers`, commit and push. Cloudflare redeploys.

### "How do I roll back?"

Workers & Pages → focusapp → Deployments → find the last known-good deployment → three-dot menu → **Rollback**. Live in seconds.

## Supabase configuration

The Supabase project is wired in for the optional accounts feature.

- **Project URL + anon key** live in `js/core/auth-config.js` and are checked into git. Both are public by design — Supabase's Row-Level Security on the database is what protects user data, not the anon key.
- **Service-role key** → **never** in the frontend. Only used from inside Edge Functions or the SQL editor.
- **Future AI API keys** (Anthropic, OpenAI) → **never** in the frontend. Only inside Supabase Edge Functions.

Cloudflare Worker env vars (none required today): set via Dashboard → focusapp → Settings → Variables and secrets, or via `wrangler secret put <NAME>`.

### Auth providers enabled

| Provider | Status | Notes |
|----------|--------|-------|
| Email + password | Live | HIBP-checked policy enforced client-side; Supabase enforces email format + length |
| Google OAuth | Live | Configured in Supabase Auth → Providers; redirect URL is `https://universefocuses.com/auth/callback.html` |
| Magic link | Live | Default rate limits (per-IP / per-recipient) untouched |
| Apple OAuth | Disabled | Removed from the UI; Supabase config can stay enabled but the button is gone |

### Email templates

The default Supabase templates work fine. If you want to customise the "magic link / sign-in" email (the one sent when an existing user attempts a duplicate sign-up), that's Authentication → Email Templates → Magic Link in the Supabase dashboard.

## Database migrations

Schema changes for the accounts feature live in `db/migrations/NNNN_*.sql`. There is **no automatic migration runner** — they are applied manually:

1. Open Supabase Dashboard → SQL editor → New query.
2. Paste the contents of the migration file.
3. Click Run. The output should be `Success. No rows returned.`
4. Migrations are idempotent (`create table if not exists`, `drop policy if exists … create policy …`) so re-running them is safe.

Currently applied:
- `db/migrations/0001_usernames.sql` — creates `public.usernames` (PRIMARY KEY on the handle, RLS-restricted, unique index per user) plus the `is_username_taken(text)` `SECURITY DEFINER` function used for live availability probes.
- `db/migrations/0002_sessions.sql` — focus-session log table reserved for the cloud-sync phase.
- `db/migrations/0003_billing.sql` — `public.billing` Pro tier table + `get_my_tier()` RPC. Mutated **only** by the Stripe webhook running with the service-role key (bypasses RLS); the client reads the tier through `get_my_tier()` which returns just the tier string.

When adding a new migration:
- Number it sequentially (`0002_*.sql`, `0003_*.sql`).
- Make it idempotent.
- Document any post-deploy step (e.g., backfill, RLS policy change) inline.

## Local development

```bash
npm install            # install deps (darwin-arm64 native bindings etc.)
npm run dev            # Vite dev server at http://localhost:5173
npm run build          # production build to dist/
npm run preview        # serve dist/ locally to smoke-test the build
npm test               # run Playwright smoke suite
```

When R2 DNS hasn't propagated to your network yet, ambient sounds will fail to load locally — that's expected and doesn't indicate a bug in the app.
