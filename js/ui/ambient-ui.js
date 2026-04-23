// ambient-ui.js — wires the Ambient mode "mixing deck" to the audio engine.
//
// Reactive: subscribes to signals in state.js and updates DOM whenever any
// of ambient state changes. Also handles all user input (clicks, sliders,
// drawer open/close, sleep timer, save-mix popover, randomiser, immersive).

import { effect } from '../core/state.js';
import {
    ambientTracks, ambientMaster, ambientMixes,
    ambientSleepTimer, activeSounds,
} from '../core/state.js';
import {
    SOUND_LIBRARY,
    ensureAudio,
    playSound, stopSound, toggleAmbientSound, stopAllAmbientSounds,
    setSoundVolume, setSoundEQ, setSoundPan, setSoundMuted,
    setMasterVolume, getTrackState, onAmbientEvent, fadeOutAll,
} from '../features/sounds.js';
import {
    BUILTIN_MIXES, getAllMixes,
    activateMix, saveCurrentMix, deleteMix, renameMix,
} from '../features/sound-mixer.js';
import { createFocusTrap } from './focus-trap.js';
import { get as settingsGet, set as settingsSet, subscribe as settingsSub } from './settings/store.js';

// Planned sounds we've teased but not shipped — shown as "coming soon"
// cards in the library so users know the catalog is growing.
const COMING_SOON = [
    { id: 'thunder',    name: 'Thunder',   icon: '⚡',  category: 'Nature' },
    { id: 'wind',       name: 'Wind',      icon: '💨', category: 'Nature' },
    { id: 'stream',     name: 'Stream',    icon: '💧', category: 'Nature' },
    { id: 'birds',      name: 'Birds',     icon: '🐦', category: 'Nature' },
    { id: 'fire',       name: 'Fireplace', icon: '🔥', category: 'Indoor' },
    { id: 'library',    name: 'Library',   icon: '📚', category: 'Indoor' },
    { id: 'fan',        name: 'Fan',       icon: '🌀', category: 'Indoor' },
    { id: 'whitenoise', name: 'White',     icon: '📻', category: 'Noise' },
    { id: 'pinknoise',  name: 'Pink',      icon: '🎙️', category: 'Noise' },
    { id: 'brownnoise', name: 'Brown',     icon: '🎚️', category: 'Noise' },
];

// ═══════════════════════════════════════════════════════════════════════════
// Entry point
// ═══════════════════════════════════════════════════════════════════════════

let initialised = false;
let sleepIntervalId = null;
let drawerTrap = null;
let savePopoverTrap = null;
let sleepPopoverTrap = null;

export function initAmbientUI() {
    if (initialised) return;
    initialised = true;

    wireMasterVolume();
    wireDeckControls();
    wireDrawer();
    wireSavePopover();
    wireSleepPopover();
    wireImmersive();
    wireTimerIntegration();
    wireHomeMiniPlayer();
    renderLibrary(); // static-ish: render once

    // Reactive renders
    effect(() => { renderMixesRail(); });
    effect(() => { renderTracks(); });
    effect(() => { syncMasterUI(); });
    effect(() => { syncSleepUI(); });
    effect(() => { syncHomeMiniPlayer(); });
    // Re-render mixes rail when the focus-start pin changes.
    settingsSub('sounds.focusStartMixId', () => renderMixesRail());

    // Error surfacing for failed loads (R2 down, CORS misconfigured, etc.)
    let corsWarningShown = false;
    onAmbientEvent((type, payload) => {
        if (type !== 'load-error') return;
        if (payload.kind === 'cors' && !corsWarningShown) {
            corsWarningShown = true;
            toast('Audio blocked by browser (CORS). The site owner needs to allow CORS on the sound CDN.');
            return;
        }
        toast(`Couldn't load "${labelFor(payload.id)}". Try again or pick another sound.`);
    });

    // If the page was opened via a /?mix=… share link, offer to load it.
    maybeLoadSharedMix();
}

// ═══════════════════════════════════════════════════════════════════════════
// Master volume
// ═══════════════════════════════════════════════════════════════════════════

function wireMasterVolume() {
    const slider = document.getElementById('deckMasterVolume');
    if (!slider) return;
    slider.addEventListener('input', async () => {
        slider.style.setProperty('--fill', `${slider.value}%`);
        await ensureAudio();
        setMasterVolume(Number(slider.value) / 100, { fadeMs: 60 });
    });
}

function syncMasterUI() {
    const slider = document.getElementById('deckMasterVolume');
    const label = document.getElementById('deckMasterValue');
    const v = Math.round((ambientMaster.value?.volume ?? 0.5) * 100);
    if (slider && Number(slider.value) !== v) slider.value = String(v);
    if (slider) slider.style.setProperty('--fill', `${v}%`);
    if (label) label.textContent = `${v}%`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Deck control buttons
// ═══════════════════════════════════════════════════════════════════════════

function wireDeckControls() {
    document.getElementById('deckAddSoundBtn')?.addEventListener('click', openDrawer);
    document.getElementById('deckSaveMixBtn')?.addEventListener('click', openSavePopover);
    document.getElementById('deckSleepBtn')?.addEventListener('click', openSleepPopover);
    document.getElementById('deckRandomBtn')?.addEventListener('click', surpriseMe);
    document.getElementById('deckStopAllBtn')?.addEventListener('click', async () => {
        await ensureAudio();
        stopAllAmbientSounds();
    });
}

async function surpriseMe() {
    await ensureAudio();
    const ids = Object.keys(SOUND_LIBRARY);
    // Pick 1–3 sounds, with a slight bias toward 2 (a balanced pair).
    const k = [1, 2, 2, 3][Math.floor(Math.random() * 4)];
    const picked = pickUnique(ids, Math.min(k, ids.length));

    // Stop anything not picked.
    for (const id of [...activeSounds.value]) {
        if (!picked.includes(id)) stopSound(id);
    }

    for (const id of picked) {
        // Tasteful randomised volume (40–90%) and small EQ tilt.
        const vol = 0.4 + Math.random() * 0.5;
        const eq = {
            low:  Math.round((Math.random() - 0.5) * 6),
            mid:  Math.round((Math.random() - 0.5) * 4),
            high: Math.round((Math.random() - 0.5) * 6),
        };
        const pan = Math.round((Math.random() - 0.5) * 100) / 100;
        // Apply state first so playSound reads the right values on start.
        ambientTracks.value = {
            ...ambientTracks.value,
            [id]: { volume: vol, eq, pan, muted: false },
        };
        await playSound(id);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Mixes rail
// ═══════════════════════════════════════════════════════════════════════════

function renderMixesRail() {
    const rail = document.getElementById('mixesRail');
    if (!rail) return;
    const mixes = getAllMixes();
    const pinnedId = settingsGet('sounds.focusStartMixId');

    rail.innerHTML = mixes
        .map((m) => {
            const isPinned = pinnedId === m.id;
            return `
                <button class="mix-card ${m.builtin ? 'mix-card--builtin' : 'mix-card--user'} ${isPinned ? 'is-pinned' : ''}"
                        data-mix-id="${escapeAttr(m.id)}"
                        aria-label="Activate ${escapeAttr(m.name)} mix${isPinned ? ' (auto-starts with focus)' : ''}">
                    <span class="mix-card__icon" aria-hidden="true">${m.icon || '♪'}</span>
                    <span class="mix-card__name">${escapeHtml(m.name)}</span>
                    <span class="mix-card__count">${m.active?.length || 0}</span>
                    <button class="mix-card__pin ${isPinned ? 'is-on' : ''}"
                            data-mix-pin="${escapeAttr(m.id)}"
                            aria-label="${isPinned ? 'Unpin from focus start' : 'Pin as focus-start mix'}"
                            title="${isPinned ? 'Pinned as focus-start mix' : 'Pin as focus-start mix'}">
                        ${isPinned ? '★' : '☆'}
                    </button>
                    ${m.builtin ? '' : `
                        <button class="mix-card__menu" data-mix-menu="${escapeAttr(m.id)}"
                                aria-label="Mix options" title="Rename or delete">⋯</button>
                    `}
                </button>
            `;
        })
        .join('');

    rail.querySelectorAll('[data-mix-id]').forEach((el) => {
        el.addEventListener('click', async (e) => {
            // Ignore clicks on embedded controls.
            if (e.target.closest('[data-mix-menu]') || e.target.closest('[data-mix-pin]')) return;
            await ensureAudio();
            await activateMix(el.dataset.mixId);
        });
    });

    rail.querySelectorAll('[data-mix-pin]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.mixPin;
            const current = settingsGet('sounds.focusStartMixId');
            if (current === id) {
                settingsSet('sounds.focusStartMixId', null);
                toast('Unpinned. Focus sessions won\'t auto-start a mix.');
            } else {
                settingsSet('sounds.focusStartMixId', id);
                settingsSet('sounds.autoStartOnFocus', true);
                toast(`Pinned. Focus sessions will auto-start "${getAllMixes().find((m) => m.id === id)?.name}".`);
            }
        });
    });

    rail.querySelectorAll('[data-mix-menu]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openMixMenu(btn, btn.dataset.mixMenu);
        });
    });
}

function openMixMenu(anchor, mixId) {
    const mix = ambientMixes.value.find((m) => m.id === mixId);
    if (!mix) return;
    const safeName = safeDialogText(mix.name);
    const choice = prompt(
        `Options for "${safeName}":\n\n` +
        `1 — Rename\n` +
        `2 — Share (copy link)\n` +
        `3 — Delete\n\n` +
        `Type 1, 2, or 3`,
        '1'
    );
    if (choice === null) return;
    switch (choice.trim()) {
        case '1': {
            const name = prompt('New name:', mix.name);
            if (name && name.trim() && name.trim() !== mix.name) renameMix(mixId, name.trim());
            break;
        }
        case '2': {
            const url = buildShareUrl(mix);
            navigator.clipboard?.writeText(url).then(
                () => toast('Share link copied.'),
                () => prompt('Copy this link:', url)
            );
            break;
        }
        case '3': {
            if (confirm(`Delete mix "${safeName}"?`)) {
                if (settingsGet('sounds.focusStartMixId') === mixId) {
                    settingsSet('sounds.focusStartMixId', null);
                }
                deleteMix(mixId);
            }
            break;
        }
    }
}

function buildShareUrl(mix) {
    const payload = {
        n: mix.name,
        a: mix.active || [],
        t: mix.tracks || {},
        i: mix.icon,
    };
    const b64 = encodeURIComponent(
        btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
    );
    return `${location.origin}/?mix=${b64}`;
}

/** Parse ?mix= from the URL (if present) and return a mix-shaped object, or null. */
function decodeSharedMix() {
    try {
        const params = new URLSearchParams(location.search);
        const raw = params.get('mix');
        if (!raw) return null;
        const json = decodeURIComponent(escape(atob(decodeURIComponent(raw))));
        const payload = JSON.parse(json);
        if (!payload || !Array.isArray(payload.a)) return null;
        return {
            id: `shared:${Date.now().toString(36)}`,
            name: payload.n || 'Shared mix',
            icon: payload.i || '🎵',
            builtin: false,
            shared: true,
            active: payload.a,
            tracks: payload.t || {},
        };
    } catch (_) { return null; }
}

async function maybeLoadSharedMix() {
    const mix = decodeSharedMix();
    if (!mix) return;
    // Don't auto-audio on page load (autoplay policy) — stash and surface a toast.
    // Clear ?mix= from the URL so a refresh doesn't re-import.
    try {
        const url = new URL(location.href);
        url.searchParams.delete('mix');
        history.replaceState({}, '', url);
    } catch (_) {}
    // Show a one-tap prompt to load it. Using toast + a button would need more
    // UI; prompt() is adequate for a rarely-used flow.
    if (confirm(`Load the shared mix "${safeDialogText(mix.name)}"? You can save it afterwards.`)) {
        await ensureAudio();
        await activateMix(mix);
        toast('Shared mix loaded. Click ♡ Save mix to keep it.');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Active track cards
// ═══════════════════════════════════════════════════════════════════════════

function renderTracks() {
    const host = document.getElementById('deckTracks');
    const empty = document.getElementById('deckEmpty');
    if (!host) return;

    const ids = activeSounds.value.filter((id) => SOUND_LIBRARY[id]);

    if (ids.length === 0) {
        host.innerHTML = '';
        if (empty) empty.hidden = false;
        return;
    }
    if (empty) empty.hidden = true;

    // Preserve existing cards where possible (no full wipe) so sliders stay
    // responsive mid-drag. We reconcile by id.
    const existing = new Map(
        Array.from(host.children).map((el) => [el.dataset.sound, el])
    );
    const seen = new Set();

    for (const id of ids) {
        seen.add(id);
        let card = existing.get(id);
        if (!card) {
            card = buildTrackCard(id);
            host.appendChild(card);
        }
        refreshTrackCard(card, id);
    }

    // Remove cards whose tracks are gone.
    for (const [id, el] of existing) {
        if (!seen.has(id)) el.remove();
    }
}

function buildTrackCard(id) {
    const def = SOUND_LIBRARY[id];
    const card = document.createElement('article');
    card.className = 'track-card';
    card.dataset.sound = id;
    card.innerHTML = `
        <div class="track-card__row">
            <span class="track-card__icon" aria-hidden="true">${def.icon}</span>
            <div class="track-card__titles">
                <h4 class="track-card__name">${escapeHtml(def.name)}</h4>
                <span class="track-card__category">${escapeHtml(def.category)}</span>
            </div>
            <div class="track-card__volume" title="Track volume — blend this sound against the others in your mix">
                <svg class="track-card__volume-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
                    <path d="M5 3.5L2.5 5.5H1v5h1.5L5 12.5V3.5z"/>
                    <path d="M7.8 5.2a3.2 3.2 0 010 5.6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                </svg>
                <input type="range" class="track-slider track-slider--volume"
                       min="0" max="100" step="1" value="70"
                       aria-label="${escapeAttr(def.name)} volume"
                       data-control="volume">
                <span class="track-card__volume-pct" data-readout="volume">70%</span>
            </div>
            <div class="track-card__actions">
                <button class="track-iconbtn" data-action="tune" aria-expanded="false" aria-controls="tune-${escapeAttr(id)}" aria-label="Tune ${escapeAttr(def.name)}">
                    <svg class="tune-btn__icon" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
                        <line x1="3" y1="4" x2="13" y2="4"/><circle cx="6" cy="4" r="1.6" fill="currentColor" stroke="none"/>
                        <line x1="3" y1="8" x2="13" y2="8"/><circle cx="10" cy="8" r="1.6" fill="currentColor" stroke="none"/>
                        <line x1="3" y1="12" x2="13" y2="12"/><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/>
                    </svg>
                </button>
                <button class="track-iconbtn" data-action="mute" aria-pressed="false" aria-label="Mute ${escapeAttr(def.name)}">
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
                        <path d="M6 3L3 5H1v6h2l3 2V3zm4.5 1.5a4.5 4.5 0 010 7 .5.5 0 01-.5-.87 3.5 3.5 0 000-5.26.5.5 0 01.5-.87zm-1.5 2a2.5 2.5 0 010 3 .5.5 0 01-.5-.87 1.5 1.5 0 000-1.26.5.5 0 01.5-.87z"/>
                    </svg>
                </button>
                <button class="track-iconbtn track-iconbtn--danger" data-action="remove" aria-label="Remove ${escapeAttr(def.name)}">
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
                        <path d="M4 4l8 8M12 4l-8 8"/>
                    </svg>
                </button>
            </div>
        </div>

        <div class="track-card__tune" id="tune-${escapeAttr(id)}" hidden>
            <div class="track-card__tune-inner">
                <div class="track-card__eq" role="group" aria-label="${escapeAttr(def.name)} tone">
                    ${['low', 'mid', 'high'].map((band) => `
                        <label class="eq-band" title="${bandTooltip(band)}">
                            <span class="eq-band__label">${bandLabel(band)}</span>
                            <input type="range" class="eq-band__slider"
                                   min="-12" max="12" step="1" value="0"
                                   aria-label="${escapeAttr(def.name)} ${bandLabel(band)}"
                                   data-control="eq" data-band="${band}">
                            <span class="eq-band__value" data-readout="eq-${band}">0</span>
                        </label>
                    `).join('')}
                </div>

                <div class="track-card__pan" title="Pan — stereo position from left to right">
                    <svg class="pan-icon pan-icon--left" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M5 4L3 5.5H1.5v5H3L5 12z"/><path d="M8 6.5a2.5 2.5 0 010 3"/>
                    </svg>
                    <input type="range" class="track-slider track-slider--pan"
                           min="-100" max="100" step="1" value="0"
                           aria-label="${escapeAttr(def.name)} pan"
                           data-control="pan">
                    <svg class="pan-icon pan-icon--right" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M11 4l2 1.5h1.5v5H13L11 12z"/><path d="M8 6.5a2.5 2.5 0 000 3"/>
                    </svg>
                </div>
            </div>
        </div>
    `;

    // Wire controls.
    card.querySelector('[data-action="mute"]').addEventListener('click', () => {
        const st = getTrackState(id);
        setSoundMuted(id, !st.muted);
    });
    card.querySelector('[data-action="remove"]').addEventListener('click', () => {
        stopSound(id);
    });
    const tuneBtn = card.querySelector('[data-action="tune"]');
    const tunePanel = card.querySelector('.track-card__tune');
    if (tuneBtn && tunePanel) {
        let tuneTimer = 0;
        tuneBtn.addEventListener('click', () => {
            const opening = !card.classList.contains('is-tuned');
            clearTimeout(tuneTimer);
            if (opening) {
                // Mount, lock to 0, measure natural height, then on the SAME
                // frame flip class + set target height so opacity and height
                // transitions start together and finish together.
                tunePanel.hidden = false;
                tunePanel.style.height = '0px';
                const target = tunePanel.scrollHeight;
                requestAnimationFrame(() => {
                    card.classList.add('is-tuned');
                    tunePanel.style.height = target + 'px';
                });
                tuneTimer = setTimeout(() => {
                    if (card.classList.contains('is-tuned')) {
                        // Clear the inline height so later content changes
                        // (EQ value text updates) can still reflow naturally.
                        tunePanel.style.height = '';
                    }
                }, 340);
            } else {
                // Capture current concrete height — after open the inline
                // height was cleared to '' and 'auto' can't animate FROM.
                const current = tunePanel.scrollHeight;
                tunePanel.style.height = current + 'px';
                requestAnimationFrame(() => {
                    card.classList.remove('is-tuned');
                    tunePanel.style.height = '0px';
                });
                tuneTimer = setTimeout(() => {
                    if (!card.classList.contains('is-tuned')) {
                        tunePanel.hidden = true;
                        tunePanel.style.height = '';
                    }
                }, 340);
            }
            tuneBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
        });
    }
    card.querySelectorAll('[data-control]').forEach((el) => {
        el.addEventListener('input', () => {
            const kind = el.dataset.control;
            const v = Number(el.value);
            // Paint the gold fill immediately for instant feedback — the
            // state refresh that normally does this isn't synchronous.
            if (kind === 'volume') {
                el.style.setProperty('--fill', `${v}%`);
                setSoundVolume(id, v / 100);
            } else if (kind === 'eq') {
                el.style.setProperty('--fill', `${((v + 12) / 24) * 100}%`);
                setSoundEQ(id, el.dataset.band, v);
            } else if (kind === 'pan') {
                el.style.setProperty('--fill', `${((v + 100) / 200) * 100}%`);
                setSoundPan(id, v / 100);
            }
        });
    });

    // Subtle entrance.
    requestAnimationFrame(() => card.classList.add('is-in'));
    return card;
}

function refreshTrackCard(card, id) {
    const st = getTrackState(id);

    const volSlider = card.querySelector('[data-control="volume"]');
    const volReadout = card.querySelector('[data-readout="volume"]');
    const volPct = Math.round(st.volume * 100);
    if (volSlider && document.activeElement !== volSlider) {
        volSlider.value = String(volPct);
    }
    if (volSlider) volSlider.style.setProperty('--fill', `${volPct}%`);
    if (volReadout) volReadout.textContent = `${volPct}%`;

    for (const band of ['low', 'mid', 'high']) {
        const sl = card.querySelector(`[data-control="eq"][data-band="${band}"]`);
        const rd = card.querySelector(`[data-readout="eq-${band}"]`);
        if (sl && document.activeElement !== sl) sl.value = String(st.eq[band]);
        // Band range is -12..+12. Centre the gold fill at the 50% mark so
        // boost grows rightwards and cut grows leftwards from the middle.
        if (sl) {
            const pct = ((st.eq[band] + 12) / 24) * 100;
            sl.style.setProperty('--fill', `${pct}%`);
            sl.style.setProperty('--centre', '50%');
        }
        if (rd) rd.textContent = st.eq[band] === 0
            ? '0'
            : `${st.eq[band] > 0 ? '+' : ''}${st.eq[band]}`;
    }

    const panSlider = card.querySelector('[data-control="pan"]');
    if (panSlider && document.activeElement !== panSlider) {
        panSlider.value = String(Math.round(st.pan * 100));
    }
    if (panSlider) {
        // Pan -100..+100 also centres at 50%.
        const pct = ((st.pan + 1) / 2) * 100;
        panSlider.style.setProperty('--fill', `${pct}%`);
        panSlider.style.setProperty('--centre', '50%');
    }

    const muteBtn = card.querySelector('[data-action="mute"]');
    if (muteBtn) {
        muteBtn.setAttribute('aria-pressed', st.muted ? 'true' : 'false');
        muteBtn.classList.toggle('is-muted', !!st.muted);
    }
    card.classList.toggle('is-muted', !!st.muted);
}

// ═══════════════════════════════════════════════════════════════════════════
// Library drawer
// ═══════════════════════════════════════════════════════════════════════════

function renderLibrary() {
    const body = document.getElementById('libraryDrawerBody');
    if (!body) return;

    const groups = new Map();
    for (const [id, def] of Object.entries(SOUND_LIBRARY)) {
        const cat = def.category || 'Other';
        if (!groups.has(cat)) groups.set(cat, []);
        groups.get(cat).push({ id, ...def });
    }
    const soonGroups = new Map();
    for (const s of COMING_SOON) {
        if (!soonGroups.has(s.category)) soonGroups.set(s.category, []);
        soonGroups.get(s.category).push(s);
    }

    let html = '';
    for (const [cat, items] of groups) {
        html += `<section class="libcat">
            <h3 class="libcat__title">${escapeHtml(cat)}</h3>
            <div class="libcat__grid">
                ${items.map((s) => `
                    <button class="libcard" data-sound="${escapeAttr(s.id)}"
                            aria-label="Toggle ${escapeAttr(s.name)}"
                            data-sound-name="${escapeAttr(s.name)}"
                            data-sound-category="${escapeAttr(s.category)}">
                        <span class="libcard__icon" aria-hidden="true">${s.icon}</span>
                        <span class="libcard__name">${escapeHtml(s.name)}</span>
                    </button>
                `).join('')}
                ${(soonGroups.get(cat) || []).map((s) => comingSoonCard(s)).join('')}
            </div>
        </section>`;
    }
    // Any soon-only categories that have no real sound yet.
    for (const [cat, items] of soonGroups) {
        if (groups.has(cat)) continue;
        html += `<section class="libcat">
            <h3 class="libcat__title">${escapeHtml(cat)}</h3>
            <div class="libcat__grid">
                ${items.map((s) => comingSoonCard(s)).join('')}
            </div>
        </section>`;
    }

    body.innerHTML = html;

    body.querySelectorAll('.libcard[data-sound]').forEach((el) => {
        el.addEventListener('click', async () => {
            await ensureAudio();
            await toggleAmbientSound(el.dataset.sound);
            el.classList.toggle('is-active', activeSounds.value.includes(el.dataset.sound));
        });
    });

    // Search
    const search = document.getElementById('libraryDrawerSearch');
    if (search) {
        search.addEventListener('input', () => {
            const q = search.value.trim().toLowerCase();
            body.querySelectorAll('.libcard').forEach((card) => {
                const hay = `${card.dataset.soundName || ''} ${card.dataset.soundCategory || ''}`.toLowerCase();
                card.style.display = !q || hay.includes(q) ? '' : 'none';
            });
        });
    }
}

function comingSoonCard(s) {
    return `
        <div class="libcard libcard--soon" aria-disabled="true" title="Coming soon">
            <span class="libcard__icon" aria-hidden="true">${s.icon}</span>
            <span class="libcard__name">${escapeHtml(s.name)}</span>
            <span class="libcard__soon">Soon</span>
        </div>
    `;
}

function wireDrawer() {
    const drawer = document.getElementById('libraryDrawer');
    if (!drawer) return;
    drawerTrap = createFocusTrap(drawer);
    drawer.querySelectorAll('[data-drawer-close]').forEach((el) => {
        el.addEventListener('click', closeDrawer);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
    });
    // Reflect active state on each card
    effect(() => {
        const ids = new Set(activeSounds.value);
        drawer.querySelectorAll('.libcard[data-sound]').forEach((card) => {
            card.classList.toggle('is-active', ids.has(card.dataset.sound));
        });
    });
}

async function openDrawer() {
    const drawer = document.getElementById('libraryDrawer');
    if (!drawer) return;
    await ensureAudio();
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    drawerTrap?.activate(document.getElementById('deckAddSoundBtn'));
    setTimeout(() => document.getElementById('libraryDrawerSearch')?.focus(), 260);
}

function closeDrawer() {
    const drawer = document.getElementById('libraryDrawer');
    if (!drawer) return;
    // Deactivate FIRST — moves focus off any descendant — so the following
    // aria-hidden="true" doesn't hide the focused element from AT.
    drawerTrap?.deactivate();
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
}

// ═══════════════════════════════════════════════════════════════════════════
// Save-mix popover
// ═══════════════════════════════════════════════════════════════════════════

function wireSavePopover() {
    const pop = document.getElementById('saveMixPopover');
    if (!pop) return;
    savePopoverTrap = createFocusTrap(pop);
    pop.querySelectorAll('[data-popover-close]').forEach((el) =>
        el.addEventListener('click', closeSavePopover)
    );
    document.getElementById('saveMixForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('saveMixName');
        try {
            saveCurrentMix(input.value);
            closeSavePopover();
            toast('Mix saved.');
        } catch (err) {
            toast(err.message || 'Couldn\'t save mix.');
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && pop.classList.contains('is-open')) closeSavePopover();
    });
}

function openSavePopover() {
    if (activeSounds.value.length === 0) {
        toast('Add at least one sound before saving a mix.');
        return;
    }
    const pop = document.getElementById('saveMixPopover');
    const input = document.getElementById('saveMixName');
    if (!pop) return;
    pop.classList.add('is-open');
    pop.setAttribute('aria-hidden', 'false');
    input.value = defaultMixName();
    savePopoverTrap?.activate(document.getElementById('deckSaveMixBtn'));
    setTimeout(() => { input.focus(); input.select(); }, 120);
}

function closeSavePopover() {
    const pop = document.getElementById('saveMixPopover');
    if (!pop) return;
    savePopoverTrap?.deactivate();
    pop.classList.remove('is-open');
    pop.setAttribute('aria-hidden', 'true');
}

function defaultMixName() {
    const ids = activeSounds.value;
    if (ids.length === 0) return '';
    if (ids.length === 1) return labelFor(ids[0]);
    return ids.map(labelFor).join(' + ');
}

// ═══════════════════════════════════════════════════════════════════════════
// Sleep-timer popover
// ═══════════════════════════════════════════════════════════════════════════

function wireSleepPopover() {
    const pop = document.getElementById('sleepPopover');
    if (!pop) return;
    sleepPopoverTrap = createFocusTrap(pop);
    pop.querySelectorAll('[data-popover-close]').forEach((el) =>
        el.addEventListener('click', closeSleepPopover)
    );
    pop.querySelectorAll('.sleep-chip[data-minutes]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            await ensureAudio();
            const minutes = Number(btn.dataset.minutes);
            startSleepTimer(minutes);
            closeSleepPopover();
        });
    });
    document.getElementById('sleepCancelBtn')?.addEventListener('click', () => {
        cancelSleepTimer();
        closeSleepPopover();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && pop.classList.contains('is-open')) closeSleepPopover();
    });
}

function openSleepPopover() {
    const pop = document.getElementById('sleepPopover');
    if (!pop) return;
    pop.classList.add('is-open');
    pop.setAttribute('aria-hidden', 'false');
    // Show Cancel if a timer is active
    const cancel = document.getElementById('sleepCancelBtn');
    if (cancel) cancel.hidden = !ambientSleepTimer.value;
    sleepPopoverTrap?.activate(document.getElementById('deckSleepBtn'));
}

function closeSleepPopover() {
    const pop = document.getElementById('sleepPopover');
    if (!pop) return;
    // Deactivate first so aria-hidden doesn't tag a focused descendant.
    sleepPopoverTrap?.deactivate();
    pop.classList.remove('is-open');
    pop.setAttribute('aria-hidden', 'true');
}

function startSleepTimer(minutes) {
    const duration = minutes * 60 * 1000;
    const endAt = Date.now() + duration;
    ambientSleepTimer.value = { endAt, duration };
    armSleepTick();
    toast(`Sleep timer set for ${minutes} minute${minutes === 1 ? '' : 's'}.`);
}

function cancelSleepTimer() {
    ambientSleepTimer.value = null;
    if (sleepIntervalId) {
        clearInterval(sleepIntervalId);
        sleepIntervalId = null;
    }
}

function armSleepTick() {
    if (sleepIntervalId) clearInterval(sleepIntervalId);
    sleepIntervalId = setInterval(() => {
        const t = ambientSleepTimer.value;
        if (!t) { cancelSleepTimer(); return; }
        const remaining = t.endAt - Date.now();
        if (remaining <= 0) {
            fadeOutAll(2500);
            cancelSleepTimer();
            return;
        }
        // Start a slower fade-out in the last 30s.
        if (remaining <= 30_000 && !t.fading) {
            t.fading = true;
            fadeOutAll(remaining + 100);
        }
    }, 1000);
}

function syncSleepUI() {
    const btn = document.getElementById('deckSleepBtn');
    const t = ambientSleepTimer.value;
    if (!btn) return;
    if (!t) {
        btn.classList.remove('is-active');
        btn.querySelector('.deck-btn__label').textContent = 'Sleep';
        return;
    }
    const remainingMs = Math.max(0, t.endAt - Date.now());
    const mm = Math.floor(remainingMs / 60000);
    const ss = Math.floor((remainingMs % 60000) / 1000);
    btn.classList.add('is-active');
    btn.querySelector('.deck-btn__label').textContent =
        remainingMs >= 60_000 ? `Sleep · ${mm}m` : `Sleep · ${ss}s`;
}
// Keep the sleep button updating once a second even while the user is idle.
setInterval(() => { if (ambientSleepTimer.value) syncSleepUI(); }, 1000);

// ═══════════════════════════════════════════════════════════════════════════
// Timer integration (C.2)
// Listens for `focus-timer:start` / `focus-timer:end` events dispatched by
// timer.js, and:
//   • on focus session start, auto-activates the pinned mix (if any)
//   • on any session end, fades the master to silence over 4s
// ═══════════════════════════════════════════════════════════════════════════

function wireTimerIntegration() {
    document.addEventListener('focus-timer:start', async (e) => {
        const { isBreak } = e.detail || {};
        if (isBreak) return;
        if (!settingsGet('sounds.autoStartOnFocus')) return;
        const mixId = settingsGet('sounds.focusStartMixId');
        if (!mixId) return;
        const mix = getAllMixes().find((m) => m.id === mixId);
        if (!mix) return;
        await ensureAudio();
        await activateMix(mix);
    });

    document.addEventListener('focus-timer:end', () => {
        if (!settingsGet('sounds.autoFadeOnSessionEnd')) return;
        if (activeSounds.value.length === 0) return;
        fadeOutAll(4000);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// Immersive fullscreen mode (D.1)
// ═══════════════════════════════════════════════════════════════════════════

function wireImmersive() {
    document.getElementById('deckFullscreenBtn')?.addEventListener('click', toggleImmersive);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('is-immersive')) {
            exitImmersive();
        }
    });
}
function toggleImmersive() {
    document.body.classList.contains('is-immersive') ? exitImmersive() : enterImmersive();
}
function enterImmersive() { document.body.classList.add('is-immersive'); }
function exitImmersive()  { document.body.classList.remove('is-immersive'); }

// ═══════════════════════════════════════════════════════════════════════════
// Home mini-player (C.3)
// A compact floating widget on the Home tab that surfaces whenever at least
// one track is playing. Mirrors the mini-timer on the opposite corner.
// ═══════════════════════════════════════════════════════════════════════════

let hmaPaused = false;      // true when the user pauses from the mini-player
let hmaPrevMaster = 0.5;     // volume to restore on resume

function wireHomeMiniPlayer() {
    const btn = document.getElementById('hmaPlayPauseBtn');
    const vol = document.getElementById('hmaVolume');

    btn?.addEventListener('click', async () => {
        await ensureAudio();
        if (hmaPaused) {
            // Resume by fading master back to the previous volume.
            setMasterVolume(hmaPrevMaster, { fadeMs: 400 });
            hmaPaused = false;
        } else {
            hmaPrevMaster = ambientMaster.value?.volume ?? 0.5;
            setMasterVolume(0, { fadeMs: 400 });
            hmaPaused = true;
        }
        syncHomeMiniPlayer();
    });

    vol?.addEventListener('input', async () => {
        await ensureAudio();
        hmaPaused = false;
        setMasterVolume(Number(vol.value) / 100, { fadeMs: 60 });
    });
}

function syncHomeMiniPlayer() {
    const widget = document.getElementById('homeMiniAmbient');
    if (!widget) return;

    const hasActive = activeSounds.value.length > 0;
    const onHomeTab = document.getElementById('home')?.classList.contains('active');
    const shouldShow = hasActive && onHomeTab;

    // Show / hide with entrance animation.
    if (shouldShow && widget.classList.contains('hidden')) {
        widget.classList.remove('hidden');
        widget.classList.add('is-entering');
        widget.addEventListener('animationend', () => widget.classList.remove('is-entering'), { once: true });
    } else if (!shouldShow && !widget.classList.contains('hidden')) {
        widget.classList.add('is-leaving');
        widget.addEventListener('animationend', () => {
            widget.classList.remove('is-leaving');
            widget.classList.add('hidden');
        }, { once: true });
    }
    if (!shouldShow) return;

    // Label: one track → show its name; multiple → "Custom mix".
    const nameEl = document.getElementById('hmaName');
    if (nameEl) {
        const ids = activeSounds.value;
        nameEl.textContent = ids.length === 1 ? labelFor(ids[0]) : `${ids.length} sounds`;
    }

    // Volume + play/pause icon
    const volSlider = document.getElementById('hmaVolume');
    const volPct = document.getElementById('hmaPct');
    const v = Math.round((ambientMaster.value?.volume ?? 0.5) * 100);
    if (volSlider && document.activeElement !== volSlider) volSlider.value = String(v);
    if (volPct) volPct.textContent = `${v}%`;

    const btn = document.getElementById('hmaPlayPauseBtn');
    if (btn) {
        btn.innerHTML = hmaPaused
            ? '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M4 2.5a.5.5 0 0 1 .77-.42l8.5 5.5a.5.5 0 0 1 0 .84l-8.5 5.5A.5.5 0 0 1 4 13.5v-11z"/></svg>'
            : '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" rx="1"/><rect x="9.5" y="2" width="3.5" height="12" rx="1"/></svg>';
        btn.setAttribute('aria-label', hmaPaused ? 'Resume ambient mix' : 'Pause ambient mix');
    }
}

// Keep the mini-player in sync when the user switches tabs (mode change
// isn't a signal effect-tracks automatically — the current app uses a
// class toggle on #home). Poll every 600ms while listening to avoid
// wiring into navigation internals.
setInterval(() => syncHomeMiniPlayer(), 600);

// ═══════════════════════════════════════════════════════════════════════════
// Toast
// ═══════════════════════════════════════════════════════════════════════════

let toastTimeout = null;
function toast(msg) {
    let el = document.getElementById('ambientToast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'ambientToast';
        el.className = 'ambient-toast';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => el.classList.remove('is-visible'), 3200);
}

// ═══════════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════════

function pickUnique(arr, k) {
    const copy = [...arr];
    const out = [];
    while (copy.length && out.length < k) {
        out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    }
    return out;
}
function labelFor(id) { return SOUND_LIBRARY[id]?.name || id; }
function bandLabel(b) { return b === 'low' ? 'Bass' : b === 'mid' ? 'Mid' : 'Treble'; }
function bandTooltip(b) {
    return b === 'low' ? 'Bass — low end, rumble and depth'
         : b === 'mid' ? 'Mid — body and warmth'
         :               'Treble — sparkle and air';
}

// Strip control chars (newlines, etc.) and cap length — for user-provided
// strings going into prompt()/confirm() dialogs. prompt/confirm aren't
// HTML-interpreting contexts so this isn't XSS, but a malicious mix name
// with newlines/quotes could craft a misleading dialog message.
function safeDialogText(s, max = 60) {
    let out = String(s ?? '').replace(/[\r\n\t\x00-\x1F\x7F]/g, '');
    if (out.length > max) out = out.slice(0, max - 1) + '…';
    return out;
}

function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = String(s ?? '');
    return div.innerHTML;
}
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
