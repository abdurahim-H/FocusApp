// src/worker.js — Workers entrypoint that canonicalises traffic and
// then hands the rest off to the Static Assets binding.
//
// Why a Worker entry instead of `_redirects`? Cloudflare's Workers
// Static Assets `_redirects` syntax is restricted to relative URLs —
// cross-host redirects (e.g. www.universefocuses.com →
// universefocuses.com) are validated out at deploy time with
// "Only relative URLs are allowed". So the canonicalisation has to
// live in a tiny Worker that fronts the assets.
//
// Behaviour:
//   • Any request with hostname `www.universefocuses.com` → 301
//     redirect to the apex form, preserving path, query, and hash.
//   • Everything else → static assets (HTML, CSS, JS, etc.) via the
//     ASSETS binding declared in wrangler.toml.
//
// This is a pure pass-through for non-www traffic, so it doesn't add
// any latency to normal page loads.

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.hostname === 'www.universefocuses.com') {
            url.hostname = 'universefocuses.com';
            return Response.redirect(url.toString(), 301);
        }
        return env.ASSETS.fetch(request);
    },
};
