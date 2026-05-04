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
//                 Trademarked; we use them as service identifiers in a
//                 UI control, which falls under fair use for every
//                 provider's brand guidelines as of 2026.
//   glyph       — raw inner SVG markup for the icon. Each icon mixes
//                 stroke and fill against `currentColor` so it stays
//                 monochrome by default (theme-aware) and shifts to the
//                 brand colour on :hover via the parent's color cascade.
//                 viewBox is fixed at 0 0 24 24 by the renderer.

const SERVICES = [
    {
        id: 'spotify',
        label: 'Spotify',
        brand: '#1db954',
        // Outline circle + three nested sound-wave arcs.
        glyph: `
            <circle cx="12" cy="12" r="9.5"/>
            <path d="M7 9.5c3.4-0.9 7.6-0.6 10.4 1"/>
            <path d="M7.5 12.6c2.8-0.7 6.6-0.4 9.2 1"/>
            <path d="M8 15.5c2.2-0.5 5-0.4 7.2 0.6"/>
        `,
    },
    {
        id: 'youtube-music',
        label: 'YouTube Music',
        brand: '#ff0033',
        // Outline circle with a filled play triangle — distinct from
        // YouTube's rectangle so the two icons don't read as duplicates.
        glyph: `
            <circle cx="12" cy="12" r="9.5"/>
            <path d="M10 8.5l6 3.5-6 3.5z" fill="currentColor" stroke="none"/>
        `,
    },
    {
        id: 'apple-music',
        label: 'Apple Music',
        brand: '#fa2d48',
        // Rounded square + eighth-note (stem + two filled note heads).
        // The previous single-path attempt collapsed the note via a bad
        // subpath winding — splitting heads into ellipses makes the
        // glyph rock-solid at 22 px.
        glyph: `
            <rect x="3" y="3" width="18" height="18" rx="3.5"/>
            <path d="M10 16V8.2l5.4-1.1V14"/>
            <ellipse cx="8.7" cy="16" rx="1.8" ry="1.5" fill="currentColor" stroke="none"/>
            <ellipse cx="14.1" cy="14.7" rx="1.8" ry="1.5" fill="currentColor" stroke="none"/>
        `,
    },
    {
        id: 'youtube',
        label: 'YouTube',
        brand: '#ff0000',
        // The classic rounded rectangle + filled play triangle.
        glyph: `
            <rect x="2" y="5.5" width="20" height="13" rx="3.2"/>
            <path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"/>
        `,
    },
    {
        id: 'soundcloud',
        label: 'SoundCloud',
        brand: '#ff5500',
        // Stack of vertical sound-bars rising left-to-right, with a
        // cloud bump on the right edge. Filled glyph (no stroke).
        glyph: `
            <g fill="currentColor" stroke="none">
                <rect x="2" y="13" width="1.4" height="5" rx="0.6"/>
                <rect x="4.4" y="11.5" width="1.4" height="6.5" rx="0.6"/>
                <rect x="6.8" y="9.5" width="1.4" height="8.5" rx="0.6"/>
                <rect x="9.2" y="8" width="1.4" height="10" rx="0.6"/>
                <path d="M11.5 8c1.4-2.6 5.4-2.6 6.6 0.4 0.5-0.15 1.6-0.15 2.1 0.4 1 0.4 1.8 1.4 1.8 2.6 0 1.6-1.3 2.6-2.8 2.6h-7.7V8z"/>
            </g>
        `,
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
            <svg class="music-service-btn__icon" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor"
                 stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
                 aria-hidden="true">
                ${svc.glyph}
            </svg>
            <span class="music-service-btn__dot" aria-hidden="true"></span>
        `;
        btn.addEventListener('click', () => onClick(svc));
        btn.addEventListener('contextmenu', (e) => onContextMenu(svc, e));
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
    const connected = isConnected(serviceId);
    btn.classList.toggle('is-connected', connected);

    // Spotify is the first provider with a live profile fetch — when
    // connected, surface the display_name in the tooltip so the user
    // can see at a glance which account is linked. Other providers
    // fall back to the static label.
    const svc = SERVICES.find((s) => s.id === serviceId);
    if (!svc) return;
    if (serviceId === 'spotify' && connected) {
        import('../features/spotify-auth.js').then(({ getSpotifyUser }) => {
            const user = getSpotifyUser();
            btn.title = user?.display_name
                ? `Spotify — connected as ${user.display_name} (right-click to disconnect)`
                : `Spotify — connected (right-click to disconnect)`;
        });
    } else {
        btn.title = svc.label;
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Click handler
// ────────────────────────────────────────────────────────────────────────────

async function onClick(svc) {
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

    // Spotify is the first provider with a real OAuth flow.
    if (svc.id === 'spotify') {
        const { isSpotifyConnected, connectSpotify, getSpotifyUser }
            = await import('../features/spotify-auth.js');
        if (isSpotifyConnected()) {
            const user = getSpotifyUser();
            const detail = user
                ? `Connected as ${user.display_name}. Right-click the icon to disconnect.`
                : `Right-click the icon to disconnect.`;
            showGentleToast({ icon: '♪', title: 'Spotify connected', detail });
            return;
        }
        // Will navigate the page away to accounts.spotify.com — the
        // promise won't resolve, the redirect happens.
        await connectSpotify();
        return;
    }

    // Other providers — OAuth not wired yet. Surface a clear notice
    // so we don't fake a connection that won't actually play music.
    showGentleToast({
        icon: '♪',
        title: `${svc.label} — wiring in progress`,
        detail: `Connect flow ships once the OAuth client is registered. Your Pro subscription already covers it; check back soon.`,
        ttl: 6000,
    });
}

async function onContextMenu(svc, e) {
    // Right-click the Spotify button → disconnect (with confirmation).
    // Other providers don't have a connect flow yet, so right-click is
    // a no-op there.
    if (svc.id !== 'spotify') return;
    e.preventDefault();
    const { isSpotifyConnected, disconnectSpotify, getSpotifyUser }
        = await import('../features/spotify-auth.js');
    if (!isSpotifyConnected()) return;
    const user = getSpotifyUser();
    const name = user?.display_name ? ` (${user.display_name})` : '';
    if (!confirm(`Disconnect Spotify${name}?`)) return;
    await disconnectSpotify();
    showGentleToast({
        icon: '♪',
        title: 'Spotify disconnected',
        detail: 'Reconnect anytime from the dock.',
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
