// music-services.js
//
// Bottom-left dock of music-streaming connect buttons: Spotify,
// YouTube Music, Apple Music, YouTube, SoundCloud. The dock chrome
// follows the active scene theme via per-theme CSS overrides — every
// theme module retunes the glass card + halo. Brand icons stay
// monochrome and inherit `currentColor` from the theme by default;
// they shift to full brand colour on hover or when connected.
//
// Pro gate: the connect flow is a Pro feature per MONETIZATION.md.
// Free users land in the upgrade modal; signed-in Pro users see a
// "wiring in progress" toast until the OAuth backend is registered
// (each provider requires a developer-account setup that lives
// outside this file — see MONETIZATION.md for the checklist).
//
// XSS: every label / svg-path string used here is an author-controlled
// constant. No user input flows into innerHTML.

import { isPro } from '../features/billing.js';
import { getUser } from '../features/auth.js';
import { showGentleToast } from '../utils/gentle-toast.js';

// ────────────────────────────────────────────────────────────────────────────
// Service catalog
// ────────────────────────────────────────────────────────────────────────────
//
// Each service entry:
//   id          — internal id, doubles as the upgrade-modal feature key
//                 (must match an entry in upgrade.js → FEATURES) and as
//                 the localStorage key suffix for connection state.
//   label       — short brand-correct display name (used for aria-label
//                 and the toast / modal copy).
//   brand       — exact brand colour used in :hover and connected state.
//                 Trademarked; we use them as service identifiers in
//                 a UI control, which falls under fair use for every
//                 provider's brand guidelines as of 2026.
//   path        — single-path SVG, viewBox 0 0 24 24, fill="currentColor".
//                 Recognisable but minimal — the smallest shape that
//                 still reads as the brand at 22px.

const SERVICES = [
    {
        id: 'spotify',
        label: 'Spotify',
        brand: '#1db954',
        // Three sound-wave bars curving inside a circle (the Spotify
        // mark, simplified).
        path: 'M12 2a10 10 0 100 20 10 10 0 000-20zm4.6 14.4a.78.78 0 01-1.07.26c-2.93-1.79-6.62-2.2-10.97-1.21a.78.78 0 11-.34-1.52c4.76-1.07 8.85-.6 12.13 1.4.36.22.47.7.25 1.07zm1.23-2.74a.97.97 0 01-1.34.32c-3.36-2.06-8.48-2.66-12.45-1.45a.97.97 0 11-.56-1.86c4.55-1.38 10.2-.71 14.04 1.65a.97.97 0 01.31 1.34zm.1-2.86c-4.03-2.39-10.67-2.61-14.51-1.45a1.17 1.17 0 11-.68-2.24c4.42-1.34 11.74-1.08 16.36 1.66a1.17 1.17 0 11-1.18 2.03z',
    },
    {
        id: 'youtube-music',
        label: 'YouTube Music',
        brand: '#ff0033',
        // Circle outline with a small triangle inside — distinct
        // from the YouTube square so the two rows don't read as
        // duplicates.
        path: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 1.6a8.4 8.4 0 110 16.8 8.4 8.4 0 010-16.8zm-1.7 4.7v7.4l6.4-3.7-6.4-3.7z',
    },
    {
        id: 'apple-music',
        label: 'Apple Music',
        brand: '#fa2d48',
        // Rounded square with a music note (eighth-note) — the
        // Apple Music brand mark, simplified to currentColor.
        path: 'M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm10 4l-6 1.2v6.5a2.4 2.4 0 11-1.5-2.22V8.5l6-1.2v5a2.4 2.4 0 11-1.5-2.22V7z',
    },
    {
        id: 'youtube',
        label: 'YouTube',
        brand: '#ff0000',
        // The classic rounded-rectangle play button.
        path: 'M22.54 6.42a2.78 2.78 0 00-1.96-1.96C18.88 4 12 4 12 4s-6.88 0-8.58.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.96 1.96C5.12 20 12 20 12 20s6.88 0 8.58-.46a2.78 2.78 0 001.96-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58zM10 15.5v-7l6 3.5-6 3.5z',
    },
    {
        id: 'soundcloud',
        label: 'SoundCloud',
        brand: '#ff5500',
        // Cloud with a stack of vertical bars to the left — the
        // SoundCloud mark, condensed.
        path: 'M2 14.4v3.6h.8v-3.6H2zm1.6-1v4.6h.8v-4.6h-.8zm1.6-.6v5.2h.8v-5.2h-.8zm1.6-.4v5.6h.8v-5.6h-.8zm1.6-.2v5.8h.8v-5.8h-.8zm1.6-.4v6.2h.8v-6.2h-.8zm1.6-.8v7h.8v-7h-.8zm1.6-1v8h.8v-8h-.8zm6.86 5.2c-.21-3.18-2.74-5.7-5.86-5.7-.96 0-1.86.23-2.66.64v8.86h8.16c1.41 0 2.54-1.16 2.54-2.6 0-1.36-1-2.46-2.18-2.6z',
    },
];

const LS_KEY_PREFIX = 'fu_music_connected_';
const DOCK_ID = 'music-services-dock';

// ────────────────────────────────────────────────────────────────────────────
// Connection state (placeholder until OAuth lands)
// ────────────────────────────────────────────────────────────────────────────

function isConnected(serviceId) {
    try {
        return localStorage.getItem(LS_KEY_PREFIX + serviceId) === '1';
    } catch (_) {
        return false;
    }
}

// Reserved for the future OAuth callback path. Marking as exported so
// the auth callback handler can flip the bit when it lands without
// reaching into localStorage directly from elsewhere.
export function setConnected(serviceId, value) {
    try {
        if (value) {
            localStorage.setItem(LS_KEY_PREFIX + serviceId, '1');
        } else {
            localStorage.removeItem(LS_KEY_PREFIX + serviceId);
        }
    } catch (_) { /* tolerate */ }
    refreshButtonState(serviceId);
}

// ────────────────────────────────────────────────────────────────────────────
// DOM
// ────────────────────────────────────────────────────────────────────────────

let dockEl = null;

function buildDock() {
    if (dockEl) return dockEl;
    dockEl = document.createElement('div');
    dockEl.id = DOCK_ID;
    dockEl.className = 'music-services';
    dockEl.setAttribute('aria-label', 'Connect a music service');
    dockEl.setAttribute('role', 'group');

    for (const svc of SERVICES) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `music-service-btn music-service-btn--${svc.id}`;
        btn.dataset.serviceId = svc.id;
        btn.style.setProperty('--brand', svc.brand);
        btn.setAttribute('aria-label', `Connect ${svc.label}`);
        btn.setAttribute('title', svc.label);
        btn.innerHTML = `
            <svg class="music-service-btn__icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="${svc.path}"/>
            </svg>
            <span class="music-service-btn__dot" aria-hidden="true"></span>
        `;
        btn.addEventListener('click', () => onClick(svc));
        dockEl.appendChild(btn);
    }

    document.body.appendChild(dockEl);

    // Reflect any cached connection state from a prior session.
    for (const svc of SERVICES) refreshButtonState(svc.id);

    return dockEl;
}

function refreshButtonState(serviceId) {
    if (!dockEl) return;
    const btn = dockEl.querySelector(`[data-service-id="${serviceId}"]`);
    if (!btn) return;
    btn.classList.toggle('is-connected', isConnected(serviceId));
}

// ────────────────────────────────────────────────────────────────────────────
// Click handler
// ────────────────────────────────────────────────────────────────────────────

function onClick(svc) {
    // Free user → upgrade modal (the music feature keys are already
    // declared in upgrade.js → FEATURES). Use the closest match for
    // YouTube (no dedicated entry) — it shares Spotify's copy.
    if (!isPro()) {
        const featureKey =
            svc.id === 'spotify' ? 'spotify'
            : svc.id === 'youtube-music' ? 'youtube'
            : svc.id === 'apple-music' ? 'apple'
            : svc.id === 'youtube' ? 'youtube'
            : 'generic';
        import('./upgrade.js').then((m) => m.showUpgradeModal({ feature: featureKey }));
        return;
    }

    // Pro user but signed out → can't connect anyway, hint them.
    if (!getUser()) {
        showGentleToast({
            icon: '♪',
            title: `Sign in first`,
            detail: `Connecting ${svc.label} needs a signed-in account so the auth tokens have somewhere to live.`,
        });
        return;
    }

    // Pro + signed in → real connect flow lives here once OAuth is
    // registered. For now surface a clear "in progress" notice so we
    // don't fake a connection that won't actually play music.
    showGentleToast({
        icon: '♪',
        title: `${svc.label} — wiring in progress`,
        detail: `Connect flow ships once the OAuth client is registered. Your Pro subscription already covers it; check back soon.`,
        ttl: 6000,
    });
}

// ────────────────────────────────────────────────────────────────────────────
// Public bootstrap
// ────────────────────────────────────────────────────────────────────────────

export function mountMusicServices() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(DOCK_ID)) return;
    buildDock();
}

export function unmountMusicServices() {
    if (dockEl?.parentNode) dockEl.parentNode.removeChild(dockEl);
    dockEl = null;
}
