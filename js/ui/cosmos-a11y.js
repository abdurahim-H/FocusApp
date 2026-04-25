// cosmos-a11y.js — flat parallel surface for keyboard-only and screen
// reader users. Shows every active sound body as an accessible list row
// with a volume slider + pan slider + mute toggle + remove button +
// "Open EQ" button. Toggled via Alt+L (Linux/Win) / Cmd+L (mac), or via
// the '?' help affordance.
//
// Design intent:
//   • Direct manipulation of celestial bodies is the primary interaction
//     for sighted mouse users. This panel is the parallel surface — full
//     parity, but in a flat, focusable list.
//   • The panel is offscreen at rest (sr-only) so it never clutters the
//     visual surface, but screen readers always see it. Keyboard users
//     toggle it visible with the hotkey.

import { activeSounds, ambientTracks, effect } from '../core/state.js';
import {
    getTrackState,
    SOUND_LIBRARY,
    setSoundMuted,
    setSoundPan,
    setSoundVolume,
    stopSound,
} from '../features/sounds.js';

const TOGGLE_KEY = 'l';
const TOGGLE_KEY_HELP = '?';

let host = null;
let listEl = null;
let visible = false;
let initialised = false;

export function initCosmosA11y() {
    if (initialised) return;
    initialised = true;
    buildOverlay();
    document.addEventListener('keydown', onKey);
    // Keep the list synced with the active set + per-track state.
    effect(() => {
        // Touch the signals so the effect re-runs when they change.
        activeSounds.value;
        ambientTracks.value;
        renderList();
    });
}

function buildOverlay() {
    host = document.createElement('div');
    host.id = 'cosmosA11y';
    host.className = 'cosmos-a11y is-hidden';
    host.setAttribute('role', 'region');
    host.setAttribute('aria-label', 'Active sounds — keyboard accessible mixer');
    host.innerHTML = `
        <div class="cosmos-a11y__header">
            <h2 class="cosmos-a11y__title">Active sounds</h2>
            <button class="cosmos-a11y__close" type="button" aria-label="Close mixer">×</button>
        </div>
        <div class="cosmos-a11y__hint">
            Use Tab to move between sliders. Esc closes. <kbd>Alt</kbd>+<kbd>L</kbd> reopens.
        </div>
        <ul class="cosmos-a11y__list" role="list"></ul>
        <p class="cosmos-a11y__empty" hidden>No sounds playing. Open the sound library from the cosmos toolbar.</p>
    `;
    document.body.appendChild(host);
    listEl = host.querySelector('.cosmos-a11y__list');
    host.querySelector('.cosmos-a11y__close').addEventListener('click', hide);
}

function onKey(e) {
    // Toggle via Alt/Meta + L (avoid conflicting with native Cmd/Ctrl-L).
    if ((e.altKey || e.metaKey) && e.key.toLowerCase() === TOGGLE_KEY) {
        e.preventDefault();
        toggle();
        return;
    }
    if (e.key === 'Escape' && visible) {
        e.preventDefault();
        hide();
    }
}

function toggle() {
    visible ? hide() : show();
}

function show() {
    visible = true;
    host.classList.remove('is-hidden');
    host.classList.add('is-visible');
    // Move focus to the first slider for keyboard-driven users.
    const firstSlider = host.querySelector('input[type="range"]');
    (firstSlider || host.querySelector('button')).focus();
}

function hide() {
    visible = false;
    host.classList.remove('is-visible');
    host.classList.add('is-hidden');
}

function renderList() {
    if (!listEl) return;
    const ids = activeSounds.value;
    const empty = host.querySelector('.cosmos-a11y__empty');
    if (ids.length === 0) {
        listEl.innerHTML = '';
        if (empty) empty.hidden = false;
        return;
    }
    if (empty) empty.hidden = true;

    listEl.innerHTML = ids
        .map((id) => {
            const def = SOUND_LIBRARY[id];
            const st = getTrackState(id);
            const name = def?.name || id;
            const vol = Math.round((st.volume ?? 0.7) * 100);
            const pan = Math.round((st.pan ?? 0) * 100);
            return `
            <li class="cosmos-a11y__row" data-sound="${escAttr(id)}">
                <div class="cosmos-a11y__name">${escHtml(name)}</div>
                <label class="cosmos-a11y__field">
                    <span>Volume</span>
                    <input type="range" min="0" max="100" step="1"
                           value="${vol}" data-control="volume"
                           aria-label="${escAttr(name)} volume">
                    <span class="cosmos-a11y__value" data-readout="volume">${vol}%</span>
                </label>
                <label class="cosmos-a11y__field">
                    <span>Pan</span>
                    <input type="range" min="-100" max="100" step="1"
                           value="${pan}" data-control="pan"
                           aria-label="${escAttr(name)} pan">
                    <span class="cosmos-a11y__value" data-readout="pan">${panLabel(pan)}</span>
                </label>
                <div class="cosmos-a11y__actions">
                    <button type="button" data-action="mute"
                            aria-pressed="${st.muted ? 'true' : 'false'}">
                        ${st.muted ? 'Unmute' : 'Mute'}
                    </button>
                    <button type="button" data-action="remove">Remove</button>
                </div>
            </li>
        `;
        })
        .join('');

    // Wire each row.
    listEl.querySelectorAll('.cosmos-a11y__row').forEach((row) => {
        const id = row.dataset.sound;
        row.querySelector('[data-control="volume"]').addEventListener('input', (e) => {
            const v = Number(e.target.value);
            setSoundVolume(id, v / 100);
            row.querySelector('[data-readout="volume"]').textContent = `${v}%`;
        });
        row.querySelector('[data-control="pan"]').addEventListener('input', (e) => {
            const v = Number(e.target.value);
            setSoundPan(id, v / 100);
            row.querySelector('[data-readout="pan"]').textContent = panLabel(v);
        });
        row.querySelector('[data-action="mute"]').addEventListener('click', (e) => {
            const cur = getTrackState(id);
            setSoundMuted(id, !cur.muted);
        });
        row.querySelector('[data-action="remove"]').addEventListener('click', () => {
            stopSound(id);
        });
    });
}

function panLabel(v) {
    const n = Number(v);
    if (Math.abs(n) < 3) return 'centre';
    return n < 0 ? `${Math.abs(n)}% left` : `${n}% right`;
}

function escHtml(s) {
    const div = document.createElement('div');
    div.textContent = String(s ?? '');
    return div.innerHTML;
}
function escAttr(s) {
    return escHtml(s).replace(/"/g, '&quot;');
}
