// spotify-mini-player.js — small "Now playing" card at bottom-right.
//
// Lifecycle:
//   • mountSpotifyMiniPlayer() — called once at app boot. It does not
//     paint anything until Spotify is connected; it just subscribes to
//     onConnectionChange. When the user connects, the widget springs
//     into existence and starts the SDK + poll loop. When they
//     disconnect, it tears everything down.
//   • Auto-init at mount time: if the user is already connected from
//     a prior session, the widget brings itself up immediately.
//
// State sources:
//   • Web Playback SDK player_state_changed events (instant updates
//     when our browser is the active device)
//   • A 10-second poll against /me/player/currently-playing (covers
//     the case where the user is playing on another device)
//   • Both feed updateUI(state) — last writer wins, which is fine
//     because both yield the same shape.
//
// Premium gating: /v1/me/player/* control endpoints all require
// Premium. Free users see the widget read-only — track info renders,
// but the controls are disabled with a "Premium required" tooltip.

import { onConnectionChange, isSpotifyConnected } from '../features/spotify-auth.js';
import {
    ensurePlayerReady,
    disposePlayer,
    getCurrentlyPlaying,
    togglePlay,
    next as nextTrack,
    prev as prevTrack,
    onPlayerStateChange,
    isPremium,
} from '../features/spotify-player.js';

const WIDGET_ID = 'spotify-mini-player';
const POLL_INTERVAL_MS = 10_000;

let widgetEl = null;
let pollTimer = null;
let unsubscribePlayer = null;

// ────────────────────────────────────────────────────────────────────────────
// DOM
// ────────────────────────────────────────────────────────────────────────────

function buildWidget() {
    if (widgetEl) return widgetEl;
    widgetEl = document.createElement('div');
    widgetEl.id = WIDGET_ID;
    widgetEl.className = 'spotify-mini-player is-empty';
    widgetEl.setAttribute('aria-label', 'Spotify mini player');
    widgetEl.setAttribute('role', 'group');
    widgetEl.innerHTML = `
        <div class="spotify-mini-player__art" aria-hidden="true">
            <svg viewBox="0 0 24 24" class="spotify-mini-player__art-fallback"
                 fill="none" stroke="currentColor" stroke-width="1.6"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9.5"/>
                <path d="M7 9.5c3.4-0.9 7.6-0.6 10.4 1"/>
                <path d="M7.5 12.6c2.8-0.7 6.6-0.4 9.2 1"/>
                <path d="M8 15.5c2.2-0.5 5-0.4 7.2 0.6"/>
            </svg>
        </div>
        <div class="spotify-mini-player__meta">
            <span class="spotify-mini-player__title">—</span>
            <span class="spotify-mini-player__artist">Nothing playing</span>
        </div>
        <div class="spotify-mini-player__controls">
            <button type="button" class="spotify-mini-player__btn" data-action="prev"
                    aria-label="Previous track">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="5" y="5" width="2" height="14" rx="1"/>
                    <path d="M19 5L9 12l10 7V5z"/>
                </svg>
            </button>
            <button type="button" class="spotify-mini-player__btn spotify-mini-player__btn--primary"
                    data-action="toggle" aria-label="Play / pause">
                <svg class="spotify-mini-player__play" viewBox="0 0 24 24"
                     fill="currentColor" aria-hidden="true">
                    <path d="M7 4.5v15l13-7.5z"/>
                </svg>
                <svg class="spotify-mini-player__pause" viewBox="0 0 24 24"
                     fill="currentColor" aria-hidden="true">
                    <rect x="6.5" y="5" width="3.5" height="14" rx="1"/>
                    <rect x="14" y="5" width="3.5" height="14" rx="1"/>
                </svg>
            </button>
            <button type="button" class="spotify-mini-player__btn" data-action="next"
                    aria-label="Next track">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="17" y="5" width="2" height="14" rx="1"/>
                    <path d="M5 5l10 7-10 7V5z"/>
                </svg>
            </button>
        </div>
    `;
    document.body.appendChild(widgetEl);

    // Premium-only controls — disabled for free users with a tooltip.
    if (!isPremium()) {
        for (const btn of widgetEl.querySelectorAll('button[data-action]')) {
            btn.disabled = true;
            btn.title = 'Spotify Premium required for in-browser playback';
        }
    } else {
        widgetEl.querySelector('[data-action="prev"]')
            .addEventListener('click', () => prevTrack().then(scheduleRefresh));
        widgetEl.querySelector('[data-action="toggle"]')
            .addEventListener('click', () => togglePlay().then(scheduleRefresh));
        widgetEl.querySelector('[data-action="next"]')
            .addEventListener('click', () => nextTrack().then(scheduleRefresh));
    }

    return widgetEl;
}

function destroyWidget() {
    if (widgetEl?.parentNode) widgetEl.parentNode.removeChild(widgetEl);
    widgetEl = null;
}

// ────────────────────────────────────────────────────────────────────────────
// State → UI
// ────────────────────────────────────────────────────────────────────────────

function setText(selector, value) {
    if (!widgetEl) return;
    const el = widgetEl.querySelector(selector);
    if (el) el.textContent = value;
}

function setArt(url) {
    if (!widgetEl) return;
    const wrap = widgetEl.querySelector('.spotify-mini-player__art');
    if (!wrap) return;
    let img = wrap.querySelector('img');
    if (url) {
        if (!img) {
            img = document.createElement('img');
            img.alt = '';
            img.loading = 'lazy';
            img.decoding = 'async';
            wrap.insertBefore(img, wrap.firstChild);
        }
        if (img.src !== url) img.src = url;
        wrap.classList.add('has-art');
    } else if (img) {
        img.remove();
        wrap.classList.remove('has-art');
    }
}

function updateUI(state) {
    if (!widgetEl) return;
    if (!state || !state.item) {
        widgetEl.classList.add('is-empty');
        widgetEl.classList.remove('is-playing', 'is-paused');
        setText('.spotify-mini-player__title', '—');
        setText('.spotify-mini-player__artist', 'Nothing playing');
        setArt(null);
        return;
    }
    const item = state.item;
    const title = item.name || '—';
    // Tracks have an `artists` array; episodes have a `show.name`.
    const artistLine = Array.isArray(item.artists) && item.artists.length
        ? item.artists.map((a) => a.name).filter(Boolean).join(', ')
        : (item.show?.name || '');
    const art =
        item.album?.images?.[0]?.url
        || item.images?.[0]?.url
        || null;

    widgetEl.classList.remove('is-empty');
    widgetEl.classList.toggle('is-playing', !!state.is_playing);
    widgetEl.classList.toggle('is-paused', !state.is_playing);
    setText('.spotify-mini-player__title', title);
    setText('.spotify-mini-player__artist', artistLine || ' ');
    setArt(art);
}

// ────────────────────────────────────────────────────────────────────────────
// Polling + SDK events
// ────────────────────────────────────────────────────────────────────────────

let refreshInflight = false;
async function refresh() {
    if (refreshInflight) return;
    refreshInflight = true;
    try {
        const state = await getCurrentlyPlaying();
        updateUI(state);
    } finally {
        refreshInflight = false;
    }
}

function scheduleRefresh() {
    // After a control action, give Spotify a moment to update its state
    // before we re-poll — calling immediately tends to hit the old state.
    setTimeout(refresh, 300);
    setTimeout(refresh, 1200);
}

function startPolling() {
    stopPolling();
    refresh();
    pollTimer = setInterval(refresh, POLL_INTERVAL_MS);
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Bring-up + tear-down
// ────────────────────────────────────────────────────────────────────────────

async function bringUp() {
    buildWidget();
    startPolling();

    // Best-effort — if SDK fails (Premium-required network errors,
    // ad-blocker rejecting the script, etc.) we still have the poll
    // path showing currently-playing.
    const player = await ensurePlayerReady();
    if (player) {
        unsubscribePlayer = onPlayerStateChange((state) => {
            if (!state) return;
            // SDK state shape differs slightly from Web API; normalise
            // to what updateUI expects.
            updateUI({
                is_playing: !state.paused,
                progress_ms: state.position,
                item: state.track_window?.current_track || null,
            });
        });
    }
}

async function tearDown() {
    stopPolling();
    if (unsubscribePlayer) {
        unsubscribePlayer();
        unsubscribePlayer = null;
    }
    await disposePlayer();
    destroyWidget();
}

export function mountSpotifyMiniPlayer() {
    if (typeof document === 'undefined') return;

    onConnectionChange((connected) => {
        if (connected) bringUp();
        else tearDown();
    });

    // Auto-init from a prior session.
    if (isSpotifyConnected()) bringUp();
}
