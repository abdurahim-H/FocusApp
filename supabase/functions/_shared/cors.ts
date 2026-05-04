// Shared CORS helpers for browser-invoked edge functions.
//
// Origin allow-list approach: we echo the request's `Origin` header
// back IF it matches one of the trusted origins, otherwise we omit
// the header entirely (browsers then block the response). The Stripe
// webhook does not use these — it is called server-to-server by
// Stripe and the webhook signature is the auth, not CORS.
//
// Wildcard `*` was the previous setting. The Supabase JWT is a real
// auth boundary, so wildcard wasn't directly catastrophic, but
// tightening it is appropriate defense-in-depth for billing endpoints.

const ALLOWED_ORIGINS = new Set([
    'https://universefocuses.com',
    'https://www.universefocuses.com',
    'http://localhost:5173', // npm run dev
    'http://localhost:8000', // npm start (python -m http.server)
]);

function pickOrigin(req: Request): string {
    const origin = req.headers.get('Origin') ?? '';
    return ALLOWED_ORIGINS.has(origin) ? origin : '';
}

export function corsHeaders(req: Request): Record<string, string> {
    const allowed = pickOrigin(req);
    const base: Record<string, string> = {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
        'Vary': 'Origin',
    };
    if (allowed) {
        base['Access-Control-Allow-Origin'] = allowed;
        base['Access-Control-Allow-Credentials'] = 'true';
    }
    return base;
}

/** Reply OK to a preflight OPTIONS request — only with CORS headers
 *  if the Origin is in the allow-list. */
export function preflight(req: Request) {
    return new Response('ok', { headers: corsHeaders(req) });
}

/** Wrap a JSON response with CORS headers scoped to the request's
 *  Origin (when allowed). */
export function jsonResponse(req: Request, body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders(req),
            'Content-Type': 'application/json',
        },
    });
}

// Backwards-compat re-exports — keep CORS_HEADERS for any caller that
// still imports it. Returns wildcard-equivalent (no Origin header set,
// browsers block) when called without context. New code should use
// corsHeaders(req) / preflight(req) / jsonResponse(req, …).
export const CORS_HEADERS = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
};
