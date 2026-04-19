# Deployment Runbook

How Cosmic Focus is deployed, and what to do when something breaks.

## Stack at a glance

```
  GitHub (abdurahim-H/FocusApp, master branch)
          ↓ webhook on push
  Cloudflare Workers + Static Assets (project: "focusapp")
          ↓ serves at
  universefocuses.com  +  www.universefocuses.com
          ↓ browser also fetches audio from
  Cloudflare R2 (bucket: "focusapp-sounds") via cdn.universefocuses.com
```

- **Domain registrar:** Squarespace (domain renews 2026-12-23).
- **DNS:** Cloudflare (nameservers `merlin.ns.cloudflare.com`, `ollie.ns.cloudflare.com`).
- **TLS:** Cloudflare universal SSL, auto-renewed.
- **Backend (planned Phase 2):** Supabase (auth + Postgres + edge functions).

## Normal deploy flow

1. Commit + push to `master` on `github.com/abdurahim-H/FocusApp`.
2. Cloudflare receives the GitHub webhook, clones the commit.
3. Cache-restore → `npm ci` → `npm run build` → `npx wrangler deploy`.
4. `wrangler.toml` + `@cloudflare/vite-plugin` tell the Worker to serve `dist/` as static assets. `not_found_handling = "404-page"` routes unknown paths to `dist/404.html`.
5. New deployment shows up in Cloudflare → Workers & Pages → focusapp → Deployments.

Typical end-to-end time: **~90 seconds**.

## Required Cloudflare settings

### Workers & Pages → `focusapp`
- Git integration: `abdurahim-H/FocusApp`, production branch `master`.
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: *(blank)*
- Environment variables: *(none currently — Phase 2 will add Supabase keys)*

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
- **Objects:** `rain_00.wav`, `ocean_04.wav`, `forest_00.wav`, `crowd_0.wav` at the bucket root.
- **Custom domain:** `cdn.universefocuses.com`, status **Active**, Minimum TLS `1.0`, Access **Enabled**.
- Adding more sounds: drag-drop into the bucket for a handful, or `rclone copy ./sounds r2:focusapp-sounds --transfers=10 --progress` for bulk.

## Incident runbook

### "The build is failing in CI"

| Symptom | Cause | Fix |
|---|---|---|
| `npm ci` says "package.json and package-lock.json not in sync, Missing <dep>" | Lock file drifted — usually cross-platform (macOS vs Linux transitive deps) | Regenerate the lock file **inside a Linux container** matching CI (Node 22.16.0, npm 10.9.2): `rm -rf node_modules package-lock.json && docker run --rm -v "$(pwd)":/app -w /app --platform=linux/amd64 node:22.16.0 bash -c "npm install --include=optional --no-audit --no-fund"`. Commit the regenerated `package-lock.json`. |
| `wrangler deploy` says `Asset too large — 25 MiB limit` | Cloudflare's build cache restored stale `dist/sounds/*.wav` from before the R2 migration | Clear the build cache: Cloudflare → focusapp → Settings → Build → Clear cache. Build script already does `rm -rf dist && vite build` so a clean run succeeds. |
| `Cannot modify Vite config: could not find a valid plugins array` | `wrangler deploy` ran its auto-configure step and couldn't find the Cloudflare plugin | Ensure `vite.config.js` has `plugins: [cloudflare()]` and `@cloudflare/vite-plugin` is in `devDependencies`. |
| `Cannot find native binding` for Rolldown | Local `node_modules/` was installed for the wrong platform | On the local machine run `rm -rf node_modules && npm ci`. |

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

## Secrets (future)

When Supabase goes live:
- Supabase anon key → safe to expose client-side (RLS enforces security); keep in `vite.config.js`'s `define` or a public env var.
- Supabase service-role key → **never** in the frontend. Only used inside Edge Functions.
- AI API keys (Anthropic, OpenAI) → **never** in the frontend. Only inside Supabase Edge Functions.

Cloudflare Worker env vars: set via Dashboard → focusapp → Settings → Variables and secrets, or via `wrangler secret put <NAME>`.

## Local development

```bash
npm install            # install deps (darwin-arm64 native bindings etc.)
npm run dev            # Vite dev server at http://localhost:5173
npm run build          # production build to dist/
npm run preview        # serve dist/ locally to smoke-test the build
npm test               # run Playwright smoke suite
```

When R2 DNS hasn't propagated to your network yet, ambient sounds will fail to load locally — that's expected and doesn't indicate a bug in the app.
