// spotify-player.js — Web Playback SDK + Web API control wrapper.
//
// Two layers:
//   1. SDK init — loads sdk.scdn.co/spotify-player.js once, constructs
//      a `Spotify.Player` instance named "Cosmic Focus", and connects
//      it. The browser shows up as a Spotify Connect device that the
//      user can target from any of their other Spotify clients.
//   2. Control via Web API — togglePlay / next / prev / seek / volume.
//      We use API endpoints (not the player's own methods) so controls
//      work whether the active device is the browser, the user's
//      phone, or a speaker. Every control endpoint requires Premium;
//      Free users see disabled buttons.
//
// State layer:
//   getCurrentlyPlaying() polls /v1/me/player/currently-playing for a
//   snapshot. The mini-player widget polls every ~10 s and also
//   subscribes to the SDK's player_state_changed event for instant
//   updates when our device is the active one.
//
// Public API:
//   ensurePlayerReady()        → idempotent SDK load + connect; returns
//                                the Spotify.Player instance (or null
//                                on failure)
//   getDeviceId()              → device_id once ready, else null
//   getCurrentlyPlaying()      → { is_playing, item, progress_ms } | null
//   togglePlay() / next() / prev() / seek(ms) / setVolumePct(0..100)
//   onPlayerStateChange(cb)    → subscribe to SDK state events
//   disposePlayer()            → disconnect + clean up
//
// Error handling: every API call routes through fetchSpotify() which
// auto-refreshes the access token on 401 and surfaces null on hard
// failure. The widget treats null as "no active playback" — same as
// the empty 204 the API returns when nothing is playing.

import { getAccessToken, getSpotifyUser } from './spotify-auth.js';

const SDK_SRC = 'https://sdk.scdn.co/spotify-player.js';

let player = null;
let deviceId = null;
let sdkLoadPromise = null;
const stateSubscribers = new Set();

// ────────────────────────────────────────────────────────────────────────────
// SDK loader (one-shot, idempotent)
// ────────────────────────────────────────────────────────────────────────────

function loadSDKScript() {
    if (sdkLoadPromise) return sdkLoadPromise;
    sdkLoadPromise = new Promise((resolve, reject) => {
        if (window.Spotify?.Player) { resolve(); return; }

        // Spotify's SDK fires this global when it finishes initialising.
        // Set the hook before injecting the script so we can't miss it.
        window.onSpotifyWebPlaybackSDKReady = () => resolve();

        const script = document.createElement('script');
        script.src = SDK_SRC;
        script.async = true;
        script.onerror = () => reject(new Error('Failed to load Spotify Web Playback SDK'));
        document.head.appendChild(script);

        // Safety timeout — if neither onload nor onSpotifyWebPlaybackSDKReady
        // fires within 15 s, give up. CSP blocks would land here.
        setTimeout(() => reject(new Error('Spotify SDK did not initialise in time')), 15000);
    });
    return sdkLoadPromise;
}

// ────────────────────────────────────────────────────────────────────────────
// Player init
// ────────────────────────────────────────────────────────────────────────────

export async function ensurePlayerReady() {
    if (player) return player;
    try {
        await loadSDKScript();
    } catch (e) {
        console.warn('[spotify-player] SDK load failed:', e);
        return null;
    }
    if (!window.Spotify?.Player) {
        console.warn('[spotify-player] window.Spotify.Player still missing');
        return null;
    }

    player = new window.Spotify.Player({
        name: 'Cosmic Focus',
        getOAuthToken: async (cb) => {
            const t = await getAccessToken();
            cb(t || '');
        },
        volume: 0.5,
    });

    player.addListener('ready', ({ device_id }) => {
        deviceId = device_id;
    });
    player.addListener('not_ready', () => { deviceId = null; });
    player.addListener('player_state_changed', (state) => {
        for (const cb of stateSubscribers) {
            try { cb(state); } catch (e) {
                console.warn('[spotify-player] subscriber threw:', e);
            }
        }
    });
    // Surface auth / account errors instead of silently failing — the
    // widget shows a small error pill when these fire.
    for (const evt of ['initialization_error', 'authentication_error', 'account_error', 'playback_error']) {
        player.addListener(evt, ({ message }) => {
            console.warn(`[spotify-player] ${evt}:`, message);
        });
    }

    const ok = await player.connect();
    if (!ok) {
        console.warn('[spotify-player] player.connect() returned false');
    }
    return player;
}

export function getDeviceId() {
    return deviceId;
}

export function onPlayerStateChange(cb) {
    stateSubscribers.add(cb);
    return () => stateSubscribers.delete(cb);
}

export async function disposePlayer() {
    if (player) {
        try { await player.disconnect(); } catch (_) { /* tolerate */ }
        player = null;
    }
    deviceId = null;
    stateSubscribers.clear();
}

// ────────────────────────────────────────────────────────────────────────────
// Web API helpers
// ────────────────────────────────────────────────────────────────────────────

async function fetchSpotify(path, options = {}) {
    const token = await getAccessToken();
    if (!token) return null;
    const headers = {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
    };
    let res;
    try {
        res = await fetch(`https://api.spotify.com/v1${path}`, { ...options, headers });
    } catch (e) {
        console.warn('[spotify-player] network error:', e);
        return null;
    }
    if (res.status === 204) return { _empty: true };
    if (res.status === 401) {
        // Stale token — getAccessToken would have refreshed if it
        // could. If we still got 401, the refresh likely failed; the
        // auth module would have already cleared state. Bail.
        return null;
    }
    if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.warn(`[spotify-player] ${path} → ${res.status}`, txt.slice(0, 200));
        return null;
    }
    try { return await res.json(); } catch { return null; }
}

/** Returns { is_playing, item, progress_ms } or null when nothing
 *  is active. The widget treats null + empty body identically. */
export async function getCurrentlyPlaying() {
    const data = await fetchSpotify('/me/player/currently-playing?additional_types=track,episode');
    if (!data || data._empty) return null;
    return {
        is_playing: !!data.is_playing,
        progress_ms: data.progress_ms ?? 0,
        item: data.item || null,
    };
}

/** Premium-only. Returns true if the API accepted the call. */
export async function togglePlay() {
    const state = await getCurrentlyPlaying();
    const path = state?.is_playing ? '/me/player/pause' : '/me/player/play';
    const result = await fetchSpotify(path, { method: 'PUT' });
    return result !== null;
}

export async function next() {
    return (await fetchSpotify('/me/player/next', { method: 'POST' })) !== null;
}

export async function prev() {
    return (await fetchSpotify('/me/player/previous', { method: 'POST' })) !== null;
}

export async function seek(positionMs) {
    return (await fetchSpotify(
        `/me/player/seek?position_ms=${Math.max(0, Math.floor(positionMs))}`,
        { method: 'PUT' }
    )) !== null;
}

export async function setVolumePct(pct) {
    const v = Math.max(0, Math.min(100, Math.round(pct)));
    return (await fetchSpotify(
        `/me/player/volume?volume_percent=${v}`,
        { method: 'PUT' }
    )) !== null;
}

export function isPremium() {
    const u = getSpotifyUser();
    return u?.product === 'premium';
}
