// spotify-search.js — Spotify Web API search + play-by-URI helpers,
// used by the Music drawer's Streaming tab.
//
// Both functions go through getAccessToken() so token refresh is
// handled the same way as the rest of the Spotify integration.

import { getAccessToken } from './spotify-auth.js';
import { getDeviceId } from './spotify-player.js';

/**
 * GET /v1/search?type=track
 *
 * Track-only search — covers the "find a song and play it"
 * use case the streaming tab is built around. Album / artist /
 * playlist search can be re-introduced later as separate filters
 * if there's demand.
 *
 * Returns parsed body or null on failure. The widget treats null as
 * "no results" (same as an empty-array response).
 */
export async function searchSpotify(query, limit = 20) {
    const token = await getAccessToken();
    if (!token) return null;
    const q = String(query || '').trim();
    if (!q) return null;
    // Spotify rejects /search with `Invalid limit` for some values
    // under their tightened dev-mode quota — even the previously
    // documented `limit=12`. 20 is the API default and consistently
    // accepted; clamp to [1, 50] in case a caller ever needs a smaller
    // page (we'll trim client-side if so).
    const params = new URLSearchParams({
        q,
        type: 'track',
        limit: String(Math.max(1, Math.min(50, limit))),
    });
    const url = `https://api.spotify.com/v1/search?${params.toString()}`;
    let res;
    try {
        res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
        console.warn('[spotify-search] network error:', e);
        return null;
    }
    if (!res.ok) {
        // Surface Spotify's own error body so 400 / 403 actually tell
        // us what's wrong instead of just the status code.
        let bodyText = '';
        try { bodyText = await res.text(); } catch { /* tolerate */ }
        console.warn(`[spotify-search] /search → ${res.status}`, bodyText.slice(0, 240));
        return null;
    }
    try { return await res.json(); } catch { return null; }
}

/**
 * Play a single track URI (`spotify:track:...`). When our SDK has a
 * registered device, target it explicitly so the browser becomes the
 * active speaker; Spotify auto-activates on a targeted play call.
 *
 * Returns { ok, error? } — same shape as the player control methods,
 * so the Streaming-tab UI can show the same kind of toast on failure.
 */
export async function playTrackUri(uri) {
    const token = await getAccessToken();
    if (!token) return { ok: false, error: 'No Spotify session. Try reconnecting.' };

    const ourDevice = getDeviceId();
    const path = ourDevice
        ? `/me/player/play?device_id=${encodeURIComponent(ourDevice)}`
        : '/me/player/play';

    let res;
    try {
        res = await fetch(`https://api.spotify.com/v1${path}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uris: [uri] }),
        });
    } catch (e) {
        return { ok: false, error: 'Network error reaching Spotify.' };
    }
    if (res.ok || res.status === 204) return { ok: true };

    let body = null;
    try { body = await res.json(); } catch { /* tolerate */ }
    const reason = body?.error?.reason;
    if (reason === 'NO_ACTIVE_DEVICE') {
        return {
            ok: false,
            reason,
            error: 'No active Spotify device. Open Spotify on your phone or desktop and start a track once — Cosmic Focus can take over from there.',
        };
    }
    if (reason === 'PREMIUM_REQUIRED' || res.status === 403) {
        return {
            ok: false,
            reason: 'PREMIUM_REQUIRED',
            error: 'Spotify Premium is required to play tracks from search.',
        };
    }
    return { ok: false, error: body?.error?.message || `Spotify API error (${res.status}).` };
}
