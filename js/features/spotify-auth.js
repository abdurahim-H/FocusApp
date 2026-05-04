// spotify-auth.js — PKCE OAuth + token storage for Spotify integrations.
//
// Public API:
//   connectSpotify()                    → initiates the auth flow
//   disconnectSpotify()                 → clears tokens + connection bit
//   processCallbackIfPresent()          → called once on app boot; if the
//                                         current URL is a Spotify redirect,
//                                         exchange the code for tokens.
//   isSpotifyConnected()                → bool, synchronous — has tokens?
//   getSpotifyUser()                    → cached profile { display_name,
//                                         product, id, email } or null
//   getAccessToken()                    → returns a fresh access_token,
//                                         refreshing it if expired. null
//                                         if not connected.
//
// Architecture notes:
//   • PKCE-only — Spotify's Web API + Web Playback SDK both accept
//     PKCE for browser apps, no client secret involved. The
//     `code_verifier` lives in sessionStorage between the redirect to
//     Spotify and the redirect back; the access_token + refresh_token
//     land in localStorage so the connection survives a tab close.
//   • State is also stored, and on the way back we verify it matches.
//     That doubles as our discriminator between Supabase's PKCE
//     callback and ours: if state matches what we set, it's our flow,
//     otherwise leave the URL alone for the Supabase SDK to handle.
//   • Tokens are namespaced under `fu_spotify_*` localStorage keys so
//     they don't collide with the music-services connection bit
//     (which is set/cleared via setConnected('spotify', ...) — that
//     bit is the source of truth for the dock button's visual state).
//
// XSS contract: every value coming back from Spotify (display_name,
// id, email) is read-only and pushed only into textContent / as a
// string `title` attribute downstream — never innerHTML.
//
//   onConnectionChange(cb)   → subscribe to connect/disconnect events
//                              (used by the mini-player widget so it
//                              can mount/unmount itself reactively).

import { SPOTIFY_CLIENT_ID } from '../core/auth-config.js';

// ────────────────────────────────────────────────────────────────────────────
// Connection-change pub/sub
// ────────────────────────────────────────────────────────────────────────────

const connectionSubscribers = new Set();

export function onConnectionChange(cb) {
    connectionSubscribers.add(cb);
    return () => connectionSubscribers.delete(cb);
}

function notifyConnectionChange() {
    const connected = isSpotifyConnected();
    for (const cb of connectionSubscribers) {
        try { cb(connected); } catch (e) {
            console.warn('[spotify-auth] subscriber threw:', e);
        }
    }
}

// Scopes — request the union of A (identity) + B (playback) up front
// so a future mini-player widget doesn't need a re-auth dance.
const SCOPES = [
    'user-read-email',
    'user-read-private',
    'streaming',
    'user-modify-playback-state',
    'user-read-playback-state',
    'user-read-currently-playing',
].join(' ');

const VERIFIER_KEY = 'fu_spotify_pkce_verifier';
const STATE_KEY = 'fu_spotify_pkce_state';
const TOKENS_KEY = 'fu_spotify_tokens';
const USER_KEY = 'fu_spotify_user';

// ────────────────────────────────────────────────────────────────────────────
// PKCE helpers
// ────────────────────────────────────────────────────────────────────────────

function base64UrlEncode(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function generateRandomString(length = 64) {
    // Use crypto-strong randomness — PKCE verifier requires it.
    // Spotify accepts 43–128 chars from [A-Za-z0-9-._~]. Base64-url
    // matches that alphabet; we trim to the requested length.
    const arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    return base64UrlEncode(arr).slice(0, length);
}

async function pkceChallenge(verifier) {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(digest);
}

// ────────────────────────────────────────────────────────────────────────────
// Storage helpers
// ────────────────────────────────────────────────────────────────────────────

function saveTokens(tokenData, refreshFallback = null) {
    // 30-second buffer so we don't ride a token right up to its
    // expiry and lose a race with a slow /me call.
    const expiresAt = Date.now() + (tokenData.expires_in * 1000) - 30_000;
    try {
        localStorage.setItem(TOKENS_KEY, JSON.stringify({
            access_token: tokenData.access_token,
            // Spotify may or may not return a new refresh_token on
            // refresh; fall back to the prior one when omitted.
            refresh_token: tokenData.refresh_token || refreshFallback,
            expires_at: expiresAt,
        }));
    } catch (e) {
        console.warn('[spotify-auth] failed to persist tokens:', e);
    }
}

function loadTokens() {
    try {
        const raw = localStorage.getItem(TOKENS_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function saveUser(profile) {
    try {
        localStorage.setItem(USER_KEY, JSON.stringify({
            display_name: profile.display_name || profile.id || 'Spotify user',
            product: profile.product, // 'premium' | 'free' | 'open'
            id: profile.id,
            email: profile.email,
        }));
    } catch (e) {
        console.warn('[spotify-auth] failed to persist profile:', e);
    }
}

export function getSpotifyUser() {
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function isSpotifyConnected() {
    return !!loadTokens() && !!getSpotifyUser();
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

function getRedirectUri() {
    // Match whatever host the user is on (universefocuses.com or the
    // www. variant). Both URIs are registered in the Spotify dashboard
    // so either resolves correctly on the way back.
    return window.location.origin + '/auth/callback.html';
}

export async function connectSpotify() {
    const verifier = generateRandomString(64);
    const state = generateRandomString(16);
    const challenge = await pkceChallenge(verifier);

    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);

    const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: getRedirectUri(),
        code_challenge_method: 'S256',
        code_challenge: challenge,
        state,
        scope: SCOPES,
    });

    window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`);
}

async function exchangeCodeForTokens(code, verifier) {
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: getRedirectUri(),
        client_id: SPOTIFY_CLIENT_ID,
        code_verifier: verifier,
    });

    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error_description || err.error || `Token exchange failed (${res.status})`);
    }
    return res.json();
}

async function fetchProfile(accessToken) {
    const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) return res.json();
    // 403 from /me with a freshly-issued token nearly always means the
    // app is in Spotify's Development Mode and the authorising user
    // isn't on the app's User Management list. Surface that with a
    // specific message so the upstream error toast can tell the user
    // exactly what to fix instead of "Profile fetch failed (403)".
    if (res.status === 403) {
        const e = new Error(
            'Spotify rejected the profile read (403). Most likely cause: '
            + 'this Spotify account isn\'t added in your app\'s '
            + 'User Management list (the app is in Development mode, so '
            + 'only listed accounts can use it). Add yourself in the '
            + 'Spotify developer dashboard → Cosmic Focus → User '
            + 'Management → Add new user, then try again.'
        );
        e.code = 'spotify_user_not_in_dev_list';
        throw e;
    }
    throw new Error(`Profile fetch failed (${res.status})`);
}

/**
 * Inspect the current URL. If it's a Spotify auth redirect (state
 * matches what we set), exchange the code for tokens and resolve to
 * the profile. Otherwise resolve to null and leave the URL untouched
 * so the Supabase SDK can still process its own callbacks.
 */
export async function processCallbackIfPresent() {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');

    if (!code || !returnedState) return null;

    const expectedState = sessionStorage.getItem(STATE_KEY);
    if (!expectedState || returnedState !== expectedState) {
        // Not our callback — let other auth handlers see it.
        return null;
    }

    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);

    if (!verifier) {
        console.warn('[spotify-auth] state matched but verifier missing — abort');
        return null;
    }

    try {
        const tokenData = await exchangeCodeForTokens(code, verifier);
        saveTokens(tokenData);
        const profile = await fetchProfile(tokenData.access_token);
        saveUser(profile);

        // Let the music-services dock flip the visible state. Dynamic
        // import avoids a circular dependency at module load time.
        const { setConnected } = await import('../ui/music-services.js');
        setConnected('spotify', true);
        notifyConnectionChange();

        // Cleanup the URL so a refresh doesn't re-process the (now
        // expired) code.
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        history.replaceState(null, '', url.pathname + url.search + url.hash);

        return profile;
    } catch (e) {
        console.warn('[spotify-auth] callback processing failed:', e);
        // Surface a user-visible toast — silent console errors leave
        // the user staring at a non-green dock button with no clue
        // what's wrong. Also clear the URL so a refresh doesn't loop.
        try {
            url.searchParams.delete('code');
            url.searchParams.delete('state');
            history.replaceState(null, '', url.pathname + url.search + url.hash);
        } catch (_) { /* tolerate */ }
        try {
            const { showGentleToast } = await import('../utils/gentle-toast.js');
            const detail = e.code === 'spotify_user_not_in_dev_list'
                ? 'Add your Spotify account email to the app\'s User Management list in the Spotify developer dashboard, then try again.'
                : (e.message || 'Please try again.');
            const title = e.code === 'spotify_user_not_in_dev_list'
                ? 'Spotify access denied'
                : 'Spotify connect failed';
            showGentleToast({ icon: '⚠', title, detail, ttl: 9000 });
        } catch (_) { /* tolerate */ }
        return null;
    }
}

export async function getAccessToken() {
    const tokens = loadTokens();
    if (!tokens) return null;
    if (Date.now() < tokens.expires_at) return tokens.access_token;

    // Expired — try the refresh dance.
    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
        client_id: SPOTIFY_CLIENT_ID,
    });

    try {
        const res = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        });
        if (!res.ok) {
            // Refresh tokens can be revoked (user disconnected app from
            // their Spotify account, password reset, etc.). Hard-clear
            // local state so the UI reflects reality on the next paint.
            await disconnectSpotify();
            return null;
        }
        const data = await res.json();
        saveTokens(data, tokens.refresh_token);
        return data.access_token;
    } catch (e) {
        console.warn('[spotify-auth] refresh failed:', e);
        return null;
    }
}

export async function disconnectSpotify() {
    try {
        localStorage.removeItem(TOKENS_KEY);
        localStorage.removeItem(USER_KEY);
    } catch (_) { /* tolerate */ }
    try {
        const { setConnected } = await import('../ui/music-services.js');
        setConnected('spotify', false);
    } catch (_) { /* tolerate — dock not mounted */ }
    notifyConnectionChange();
}
