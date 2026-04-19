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
    renderLibrary(); // static-ish: render once

    // Reactive renders
    effect(() => { renderMixesRail(); });
    effect(() => { renderTracks(); });
    effect(() => { syncMasterUI(); });
    effect(() => { syncSleepUI(); });

    // Error surfacing for failed loads (R2 down, etc.)
    onAmbientEvent((type, payload) => {
        if (type === 'load-error') {
            toast(`Couldn't load "${labelFor(payload.id)}". Try again or pick another sound.`);
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// Master volume
// ═══════════════════════════════════════════════════════════════════════════

function wireMasterVolume() {
    const slider = document.getElementById('deckMasterVolume');
    if (!slider) return;
    slider.addEventListener('input', async () => {
        await ensureAudio();
        setMasterVolume(Number(slider.value) / 100, { fadeMs: 60 });
    });
}

function syncMasterUI() {
    const slider = document.getElementById('deckMasterVolume');
    const label = document.getElementById('deckMasterValue');
    const v = Math.round((ambientMaster.value?.volume ?? 0.5) * 100);
    if (slider && Number(slider.value) !== v) slider.value = String(v);
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

    rail.innerHTML = mixes
        .map((m) => `
            <button class="mix-card ${m.builtin ? 'mix-card--builtin' : 'mix-card--user'}"
                    data-mix-id="${escapeAttr(m.id)}"
                    aria-label="Activate ${escapeAttr(m.name)} mix">
                <span class="mix-card__icon" aria-hidden="true">${m.icon || '♪'}</span>
                <span class="mix-card__name">${escapeHtml(m.name)}</span>
                <span class="mix-card__count">${m.active?.length || 0}</span>
                ${m.builtin ? '' : `
                    <button class="mix-card__menu" data-mix-menu="${escapeAttr(m.id)}"
                            aria-label="Mix options" title="Rename or delete">⋯</button>
                `}
            </button>
        `)
        .join('');

    rail.querySelectorAll('[data-mix-id]').forEach((el) => {
        el.addEventListener('click', async (e) => {
            // Ignore clicks on the overflow menu
            if (e.target.closest('[data-mix-menu]')) return;
            await ensureAudio();
            await activateMix(el.dataset.mixId);
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
    // Simple inline menu — rename / delete.
    const next = prompt(`Rename "${mix.name}" — leave blank to delete`, mix.name);
    if (next === null) return;            // cancelled
    const trimmed = next.trim();
    if (!trimmed) {
        if (confirm(`Delete mix "${mix.name}"?`)) deleteMix(mixId);
    } else if (trimmed !== mix.name) {
        renameMix(mixId, trimmed);
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
        <header class="track-card__head">
            <span class="track-card__icon" aria-hidden="true">${def.icon}</span>
            <div class="track-card__titles">
                <h4 class="track-card__name">${escapeHtml(def.name)}</h4>
                <span class="track-card__category">${escapeHtml(def.category)}</span>
            </div>
            <div class="track-card__actions">
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
        </header>

        <div class="track-card__volume">
            <input type="range" class="track-slider track-slider--volume"
                   min="0" max="100" step="1" value="70"
                   aria-label="${escapeAttr(def.name)} volume"
                   data-control="volume">
            <span class="track-card__volume-pct" data-readout="volume">70%</span>
        </div>

        <div class="track-card__eq" role="group" aria-label="${escapeAttr(def.name)} EQ">
            ${['low', 'mid', 'high'].map((band) => `
                <label class="eq-band">
                    <span class="eq-band__label">${bandLabel(band)}</span>
                    <input type="range" class="eq-band__slider"
                           min="-12" max="12" step="1" value="0"
                           aria-label="${escapeAttr(def.name)} ${bandLabel(band)} EQ"
                           data-control="eq" data-band="${band}">
                    <span class="eq-band__value" data-readout="eq-${band}">0 dB</span>
                </label>
            `).join('')}
        </div>

        <div class="track-card__pan">
            <span class="pan-label pan-label--left" aria-hidden="true">L</span>
            <input type="range" class="track-slider track-slider--pan"
                   min="-100" max="100" step="1" value="0"
                   aria-label="${escapeAttr(def.name)} pan"
                   data-control="pan">
            <span class="pan-label pan-label--right" aria-hidden="true">R</span>
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
    card.querySelectorAll('[data-control]').forEach((el) => {
        el.addEventListener('input', () => {
            const kind = el.dataset.control;
            if (kind === 'volume') setSoundVolume(id, Number(el.value) / 100);
            else if (kind === 'eq') setSoundEQ(id, el.dataset.band, Number(el.value));
            else if (kind === 'pan') setSoundPan(id, Number(el.value) / 100);
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
    if (volSlider && document.activeElement !== volSlider) {
        volSlider.value = String(Math.round(st.volume * 100));
    }
    if (volReadout) volReadout.textContent = `${Math.round(st.volume * 100)}%`;

    for (const band of ['low', 'mid', 'high']) {
        const sl = card.querySelector(`[data-control="eq"][data-band="${band}"]`);
        const rd = card.querySelector(`[data-readout="eq-${band}"]`);
        if (sl && document.activeElement !== sl) sl.value = String(st.eq[band]);
        if (rd) rd.textContent = `${st.eq[band] > 0 ? '+' : ''}${st.eq[band]} dB`;
    }

    const panSlider = card.querySelector('[data-control="pan"]');
    if (panSlider && document.activeElement !== panSlider) {
        panSlider.value = String(Math.round(st.pan * 100));
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
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    drawerTrap?.deactivate();
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
    pop.classList.remove('is-open');
    pop.setAttribute('aria-hidden', 'true');
    savePopoverTrap?.deactivate();
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
    pop.classList.remove('is-open');
    pop.setAttribute('aria-hidden', 'true');
    sleepPopoverTrap?.deactivate();
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
function bandLabel(b) { return b === 'low' ? 'Low' : b === 'mid' ? 'Mid' : 'High'; }

function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = String(s ?? '');
    return div.innerHTML;
}
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
