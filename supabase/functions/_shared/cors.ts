// Shared CORS headers for browser-invoked edge functions. The webhook
// doesn't use these — it's called by Stripe's server, never the browser.

export const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
};

/** Reply OK to a preflight OPTIONS request. */
export function preflight() {
    return new Response('ok', { headers: CORS_HEADERS });
}

/** Wrap a JSON response with CORS headers. */
export function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
        },
    });
}
