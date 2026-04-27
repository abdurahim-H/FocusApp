// ambient-ui.js — wires the Ambient mode "mixing deck" to the audio engine.
//
// Reactive: subscribes to signals in state.js and updates DOM whenever any
// of ambient state changes. Also handles all user input (clicks, sliders,
// drawer open/close, sleep timer, save-mix popover, randomiser, immersive).

import {
    activeSounds,
    ambientMaster,
    ambientMixes,
    ambientSleepTimer,
    ambientTracks,
    effect,
} from '../core/state.js';
import {
    activateMix,
    BUILTIN_MIXES,
    deleteMix,
    getAllMixes,
    renameMix,
    saveCurrentMix,
} from '../features/sound-mixer.js';
import {
    ensureAudio,
    fadeOutAll,
    getMasterEnergy,
    getTrackState,
    onAmbientEvent,
    playSound,
    SOUND_LIBRARY,
    setMasterVolume,
    setSoundEQ,
    setSoundMuted,
    setSoundPan,
    setSoundVolume,
    stopAllAmbientSounds,
    stopSound,
    toggleAmbientSound,
} from '../features/sounds.js';
import { createFocusTrap } from './focus-trap.js';
import { switchMode } from './navigation.js';
import {
    get as settingsGet,
    set as settingsSet,
    subscribe as settingsSub,
} from './settings/store.js';

// Planned sounds we've teased but not shipped — shown as "coming soon"
// cards in the library so users know the catalog is growing.
const COMING_SOON = [
    { id: 'thunder', name: 'Thunder', icon: '⚡', category: 'Nature' },
    { id: 'wind', name: 'Wind', icon: '💨', category: 'Nature' },
    { id: 'stream', name: 'Stream', icon: '💧', category: 'Nature' },
    { id: 'birds', name: 'Birds', icon: '🐦', category: 'Nature' },
    { id: 'fire', name: 'Fireplace', icon: '🔥', category: 'Indoor' },
    { id: 'library', name: 'Library', icon: '📚', category: 'Indoor' },
    { id: 'fan', name: 'Fan', icon: '🌀', category: 'Indoor' },
    { id: 'whitenoise', name: 'White', icon: '📻', category: 'Noise' },
    { id: 'pinknoise', name: 'Pink', icon: '🎙️', category: 'Noise' },
    { id: 'brownnoise', name: 'Brown', icon: '🎚️', category: 'Noise' },
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

    // Cosmos restructure: master volume (now drag-on-blackhole), the deck
    // tracks rail, the mixes rail, and the home-mini-ambient widget were
    // removed in favour of the cosmos sound bodies. Only the meta-actions
    // (library drawer, save-mix popover, sleep timer, immersive, surprise,
    // stop all) remain wired here.
    wireDeckControls();
    wireDrawer();
    wireSavePopover();
    wireSleepPopover();
    wireImmersive();
    wireTimerIntegration();
    renderLibrary(); // static-ish: render once

    // Reactive renders — only the ones whose hosts still exist.
    effect(() => {
        syncSleepUI();
    });
    effect(() => {
        syncDeckButtons();
    });
    // Re-render the library when a mix is added/removed (constellations
    // surface inside the drawer now that the standalone rail is gone).
    effect(() => {
        ambientMixes.value;
        renderLibrary();
    });
    settingsSub('sounds.focusStartMixId', () => renderLibrary());

    // Error surfacing for failed loads (R2 down, CORS misconfigured, etc.)
    let corsWarningShown = false;
    onAmbientEvent((type, payload) => {
        if (type !== 'load-error') return;
        if (payload.kind === 'cors' && !corsWarningShown) {
            corsWarningShown = true;
            toast(
                'Audio blocked by browser (CORS). The site owner needs to allow CORS on the sound CDN.'
            );
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

// Stop-all and Save-mix only make sense when there are active tracks. Disable
// them otherwise so the UI honestly reflects what's actionable. Driven by the
// `activeSounds` signal so any add/remove flips the state instantly.
function syncDeckButtons() {
    const hasActive = activeSounds.value.length > 0;
    const stopBtn = document.getElementById('deckStopAllBtn');
    const saveBtn = document.getElementById('deckSaveMixBtn');
    if (stopBtn) {
        stopBtn.disabled = !hasActive;
        stopBtn.setAttribute('aria-disabled', String(!hasActive));
    }
    if (saveBtn) {
        saveBtn.disabled = !hasActive;
        saveBtn.setAttribute('aria-disabled', String(!hasActive));
    }
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
            low: Math.round((Math.random() - 0.5) * 6),
            mid: Math.round((Math.random() - 0.5) * 4),
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

    // Mix card is rendered as a <div role="button"> rather than <button>
    // because it contains the pin and menu buttons — nested buttons are
    // invalid HTML and browsers will silently relocate the inner buttons
    // out of the outer at parse time, breaking the layout. The div keeps
    // full keyboard activation (Enter / Space) via the keydown handler
    // below so a11y is preserved.
    rail.innerHTML = mixes
        .map((m) => {
            const isPinned = pinnedId === m.id;
            return `
                <div class="mix-card ${m.builtin ? 'mix-card--builtin' : 'mix-card--user'} ${isPinned ? 'is-pinned' : ''}"
                        role="button" tabindex="0"
                        data-mix-id="${escapeAttr(m.id)}"
                        aria-label="Activate ${escapeAttr(m.name)} mix${isPinned ? ' (auto-starts with focus)' : ''}">
                    <span class="mix-card__icon" aria-hidden="true">${escapeHtml(m.icon || '♪')}</span>
                    <span class="mix-card__name">${escapeHtml(m.name)}</span>
                    <span class="mix-card__count">${m.active?.length || 0}</span>
                    <button class="mix-card__pin ${isPinned ? 'is-on' : ''}"
                            type="button"
                            data-mix-pin="${escapeAttr(m.id)}"
                            aria-label="${isPinned ? 'Unpin from focus start' : 'Pin as focus-start mix'}"
                            title="${isPinned ? 'Pinned as focus-start mix' : 'Pin as focus-start mix'}">
                        ${isPinned ? '★' : '☆'}
                    </button>
                    <button class="mix-card__menu" type="button" data-mix-menu="${escapeAttr(m.id)}"
                            aria-label="Mix options" title="${m.builtin ? 'Share' : 'Rename, share, or delete'}">
                        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
                            <circle cx="3" cy="8" r="1.4"/><circle cx="8" cy="8" r="1.4"/><circle cx="13" cy="8" r="1.4"/>
                        </svg>
                    </button>
                </div>
            `;
        })
        .join('');

    rail.querySelectorAll('[data-mix-id]').forEach((el) => {
        const activate = async (e) => {
            // Ignore clicks on embedded controls.
            if (e.target.closest('[data-mix-menu]') || e.target.closest('[data-mix-pin]')) return;
            await ensureAudio();
            await activateMix(el.dataset.mixId);
        };
        el.addEventListener('click', activate);
        el.addEventListener('keydown', (e) => {
            // Match native button semantics — Enter or Space activates.
            if (e.key === 'Enter' || e.key === ' ') {
                if (e.target.closest('[data-mix-menu]') || e.target.closest('[data-mix-pin]'))
                    return;
                e.preventDefault();
                activate(e);
            }
        });
    });

    rail.querySelectorAll('[data-mix-pin]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.mixPin;
            const current = settingsGet('sounds.focusStartMixId');
            if (current === id) {
                settingsSet('sounds.focusStartMixId', null);
            } else {
                settingsSet('sounds.focusStartMixId', id);
                settingsSet('sounds.autoStartOnFocus', true);
            }
            // No toast — the star state change is its own confirmation.
        });
    });

    rail.querySelectorAll('[data-mix-menu]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openMixMenu(btn, btn.dataset.mixMenu);
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// Mix menu popover — anchored popover with Rename / Share / Delete actions.
// Replaces the old native prompt() / confirm() dialogs with a proper in-app
// surface that matches the deck's visual language. Built-in mixes get only
// Share + Pin (renaming and deleting a built-in doesn't make sense).
// ═══════════════════════════════════════════════════════════════════════════

let activeMixMenu = null;

function closeMixMenu() {
    if (!activeMixMenu) return;
    const el = activeMixMenu.el;
    activeMixMenu = null;
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 180);
    document.removeEventListener('click', onMixMenuOutsideClick, true);
    document.removeEventListener('keydown', onMixMenuKeydown);
    window.removeEventListener('resize', closeMixMenu);
    window.removeEventListener('scroll', closeMixMenu, true);
}

function onMixMenuOutsideClick(e) {
    if (!activeMixMenu) return;
    if (activeMixMenu.el.contains(e.target)) return;
    if (activeMixMenu.anchor.contains(e.target)) return;
    closeMixMenu();
}

function onMixMenuKeydown(e) {
    if (e.key === 'Escape' && activeMixMenu) {
        e.stopPropagation();
        closeMixMenu();
    }
}

function openMixMenu(anchor, mixId) {
    // Toggle if re-clicking the same anchor
    if (activeMixMenu && activeMixMenu.mixId === mixId) {
        closeMixMenu();
        return;
    }
    if (activeMixMenu) closeMixMenu();

    const mix =
        ambientMixes.value.find((m) => m.id === mixId) || getAllMixes().find((m) => m.id === mixId);
    if (!mix) return;

    const el = document.createElement('div');
    el.className = 'mix-menu';
    el.setAttribute('role', 'menu');
    el.innerHTML = mixMenuViewActions(mix);
    document.body.appendChild(el);

    positionMixMenu(el, anchor);
    activeMixMenu = { el, anchor, mixId, mix };
    requestAnimationFrame(() => el.classList.add('is-open'));

    bindMixMenuActions(el, mix);

    document.addEventListener('click', onMixMenuOutsideClick, true);
    document.addEventListener('keydown', onMixMenuKeydown);
    window.addEventListener('resize', closeMixMenu);
    window.addEventListener('scroll', closeMixMenu, true);
}

function positionMixMenu(el, anchor) {
    const rect = anchor.getBoundingClientRect();
    // First render: measure
    el.style.visibility = 'hidden';
    el.style.left = '0px';
    el.style.top = '0px';
    const menuRect = el.getBoundingClientRect();
    // Place below the anchor, right-aligned to it — flip up if it would
    // overflow the viewport bottom.
    const gap = 6;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = rect.right - menuRect.width;
    let top = rect.bottom + gap;
    if (top + menuRect.height > vh - 8) {
        top = rect.top - menuRect.height - gap; // flip above
    }
    left = Math.max(8, Math.min(left, vw - menuRect.width - 8));
    top = Math.max(8, top);
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.visibility = '';
}

function mixMenuViewActions(mix) {
    const rename = mix.builtin
        ? ''
        : `
        <button class="mix-menu__item" data-mix-action="rename" type="button">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l2 2-8 8H4v-2l8-8z"/></svg>
            <span>Rename</span>
        </button>
    `;
    const del = mix.builtin
        ? ''
        : `
        <button class="mix-menu__item mix-menu__item--danger" data-mix-action="delete" type="button">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h10M6 4V2.5h4V4M4.5 4l.7 9a1 1 0 0 0 1 .9h3.6a1 1 0 0 0 1-.9L11.5 4"/></svg>
            <span>Delete</span>
        </button>
    `;
    return `
        ${rename}
        <button class="mix-menu__item" data-mix-action="share" type="button">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 8.5l3-3M9.5 5.5a2 2 0 1 1 2.8 2.8L10 10.6M6.5 5.5L4.2 7.8a2 2 0 1 0 2.8 2.8L9.3 8.3"/></svg>
            <span>Copy share link</span>
        </button>
        ${del}
    `;
}

function mixMenuViewRename(mix) {
    return `
        <form class="mix-menu__form" data-mix-action-form="rename">
            <input class="mix-menu__input" type="text"
                   value="${escapeAttr(mix.name)}"
                   maxlength="40"
                   aria-label="New mix name"
                   placeholder="Mix name">
            <div class="mix-menu__row">
                <button type="button" class="mix-menu__btn mix-menu__btn--ghost" data-mix-action="cancel">Cancel</button>
                <button type="submit" class="mix-menu__btn mix-menu__btn--primary">Save</button>
            </div>
        </form>
    `;
}

function mixMenuViewDelete(mix) {
    return `
        <div class="mix-menu__confirm">
            <p class="mix-menu__confirm-text">Delete <strong>${escapeHtml(mix.name)}</strong>?<br><span class="mix-menu__confirm-sub">This can't be undone.</span></p>
            <div class="mix-menu__row">
                <button type="button" class="mix-menu__btn mix-menu__btn--ghost" data-mix-action="cancel">Cancel</button>
                <button type="button" class="mix-menu__btn mix-menu__btn--danger" data-mix-action="confirm-delete">Delete</button>
            </div>
        </div>
    `;
}

function bindMixMenuActions(el, mix) {
    el.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-mix-action]');
        if (!btn) return;
        e.stopPropagation();
        const action = btn.dataset.mixAction;

        if (action === 'rename') {
            el.innerHTML = mixMenuViewRename(mix);
            positionMixMenu(el, activeMixMenu.anchor);
            const input = el.querySelector('.mix-menu__input');
            if (input) {
                input.focus();
                input.select();
            }
            el.querySelector('[data-mix-action-form="rename"]').addEventListener('submit', (ev) => {
                ev.preventDefault();
                const next = (input.value || '').trim();
                if (next && next !== mix.name) renameMix(mix.id, next);
                closeMixMenu();
            });
            el.querySelector('[data-mix-action="cancel"]').addEventListener('click', closeMixMenu);
            return;
        }

        if (action === 'delete') {
            el.innerHTML = mixMenuViewDelete(mix);
            positionMixMenu(el, activeMixMenu.anchor);
            el.querySelector('[data-mix-action="cancel"]').addEventListener('click', closeMixMenu);
            el.querySelector('[data-mix-action="confirm-delete"]').addEventListener('click', () => {
                if (settingsGet('sounds.focusStartMixId') === mix.id) {
                    settingsSet('sounds.focusStartMixId', null);
                }
                deleteMix(mix.id);
                closeMixMenu();
                // No toast — the constellation tile vanishes from the
                // library; that's the confirmation.
            });
            return;
        }

        if (action === 'share') {
            const url = buildShareUrl(mix);
            if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(
                    () => toast('Share link copied to clipboard.'),
                    () => {
                        // Clipboard denied — show the URL so the user can copy manually.
                        el.innerHTML = `
                            <div class="mix-menu__confirm">
                                <p class="mix-menu__confirm-sub" style="margin:0 0 8px">Copy this link:</p>
                                <input class="mix-menu__input" value="${escapeAttr(url)}" readonly>
                                <div class="mix-menu__row">
                                    <button type="button" class="mix-menu__btn mix-menu__btn--primary" data-mix-action="cancel">Done</button>
                                </div>
                            </div>
                        `;
                        positionMixMenu(el, activeMixMenu.anchor);
                        const inp = el.querySelector('.mix-menu__input');
                        if (inp) {
                            inp.focus();
                            inp.select();
                        }
                        el.querySelector('[data-mix-action="cancel"]').addEventListener(
                            'click',
                            closeMixMenu
                        );
                    }
                );
                closeMixMenu();
            } else {
                // Older browsers without Clipboard API
                closeMixMenu();
                window.prompt('Copy this link:', url);
            }
            return;
        }

        if (action === 'cancel') closeMixMenu();
    });
}

function buildShareUrl(mix) {
    const payload = {
        n: mix.name,
        a: mix.active || [],
        t: mix.tracks || {},
        i: mix.icon,
    };
    const b64 = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));
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
            // Cap the name; an attacker could otherwise put a multi-MB
            // string in the dialog. Strip control chars defensively.
            name: sanitiseSharedString(payload.n, 60) || 'Shared mix',
            // Icon is rendered next to the name. We escape at render
            // time, but defence-in-depth: enforce a tight grapheme
            // budget here too — anything with HTML chars or longer
            // than 4 codepoints gets the default note glyph.
            icon: sanitiseSharedIcon(payload.i),
            builtin: false,
            shared: true,
            // Active is an array of sound IDs; downstream code looks
            // them up against SOUND_LIBRARY so unknown IDs are dropped
            // safely. Cap to 32 entries to bound work.
            active: payload.a.filter((id) => typeof id === 'string').slice(0, 32),
            // Track state is a plain object keyed by sound ID; loading
            // code reads only known fields (volume, eq, pan, muted).
            tracks: payload.t && typeof payload.t === 'object' ? payload.t : {},
        };
    } catch (_) {
        return null;
    }
}

/** Constrain a string from a shared URL to a length cap, drop control
 *  chars (incl. NUL / VT-style smuggle attempts). Returns '' for any
 *  non-string. */
function sanitiseSharedString(raw, maxLen) {
    if (typeof raw !== 'string') return '';
    // Strip C0 controls + DEL. Anything else (printable, emoji, RTL
    // marks) survives — escapeHtml handles angle brackets / ampersands
    // at render time.
    const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, '');
    return cleaned.slice(0, maxLen);
}

/** Icons are tiny visual glyphs (a single emoji in practice). Reject
 *  anything that contains markup characters or runs longer than four
 *  codepoints — the default '🎵' covers the rejection case. */
function sanitiseSharedIcon(raw) {
    if (typeof raw !== 'string' || raw.length === 0) return '🎵';
    if (/[<>&"'`]/.test(raw)) return '🎵';
    const codepoints = Array.from(raw);
    if (codepoints.length > 4) return '🎵';
    return codepoints.join('');
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
    const existing = new Map(Array.from(host.children).map((el) => [el.dataset.sound, el]));
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
        <div class="track-card__media" aria-hidden="true">
            <span class="track-card__media-glow"></span>
            <span class="track-card__icon">${def.icon}</span>
        </div>
        <div class="track-card__content">
            <header class="track-card__header">
                <div class="track-card__titles">
                    <h4 class="track-card__name">${escapeHtml(def.name)}</h4>
                    <span class="track-card__category">${escapeHtml(def.category)}</span>
                </div>
                <div class="track-card__actions">
                    <button class="track-iconbtn" data-action="tune" aria-expanded="false" aria-controls="tune-${escapeAttr(id)}" aria-label="Tune ${escapeAttr(def.name)}" type="button">
                        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
                            <line x1="3" y1="4" x2="13" y2="4"/><circle cx="6" cy="4" r="1.6" fill="currentColor" stroke="none"/>
                            <line x1="3" y1="8" x2="13" y2="8"/><circle cx="10" cy="8" r="1.6" fill="currentColor" stroke="none"/>
                            <line x1="3" y1="12" x2="13" y2="12"/><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/>
                        </svg>
                    </button>
                    <button class="track-iconbtn" data-action="mute" aria-pressed="false" aria-label="Mute ${escapeAttr(def.name)}" type="button">
                        <svg class="track-iconbtn__icon track-iconbtn__icon--unmuted" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
                            <path d="M6 3L3 5H1v6h2l3 2V3zm4.5 1.5a4.5 4.5 0 010 7 .5.5 0 01-.5-.87 3.5 3.5 0 000-5.26.5.5 0 01.5-.87zm-1.5 2a2.5 2.5 0 010 3 .5.5 0 01-.5-.87 1.5 1.5 0 000-1.26.5.5 0 01.5-.87z"/>
                        </svg>
                    </button>
                    <button class="track-iconbtn track-iconbtn--danger" data-action="remove" aria-label="Remove ${escapeAttr(def.name)}" type="button">
                        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
                            <path d="M4 4l8 8M12 4l-8 8"/>
                        </svg>
                    </button>
                </div>
            </header>
            <div class="track-card__fader" title="Track volume — blend this sound against the others in your mix">
                <input type="range" class="track-slider track-slider--volume"
                       min="0" max="100" step="1" value="70"
                       aria-label="${escapeAttr(def.name)} volume"
                       data-control="volume">
                <span class="track-card__volume-pct" data-readout="volume">70%</span>
            </div>
        </div>

        <div class="track-card__tune" id="tune-${escapeAttr(id)}" hidden>
            <div class="track-card__tune-inner">
                <div class="track-card__eq" role="group" aria-label="${escapeAttr(def.name)} tone">
                    ${['low', 'mid', 'high']
                        .map(
                            (band) => `
                        <label class="eq-band" title="${bandTooltip(band)}">
                            <span class="eq-band__label">${bandLabel(band)}</span>
                            <input type="range" class="eq-band__slider"
                                   min="-12" max="12" step="1" value="0"
                                   aria-label="${escapeAttr(def.name)} ${bandLabel(band)}"
                                   data-control="eq" data-band="${band}">
                            <span class="eq-band__value" data-readout="eq-${band}">0</span>
                        </label>
                    `
                        )
                        .join('')}
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
        if (rd)
            rd.textContent =
                st.eq[band] === 0 ? '0' : `${st.eq[band] > 0 ? '+' : ''}${st.eq[band]}`;
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

    // ── Constellations (saved + built-in mixes) above the raw sounds ───
    // These activate a whole arrangement of bodies at once.
    const mixes = getAllMixes();
    if (mixes.length) {
        html += `<section class="libcat libcat--constellations">
            <h3 class="libcat__title">Constellations</h3>
            <div class="libcat__grid">
                ${mixes
                    .map(
                        (m) => `
                    <button class="libcard libcard--constellation" data-mix="${escapeAttr(m.id)}"
                            aria-label="Activate ${escapeAttr(m.name)} constellation"
                            data-sound-name="${escapeAttr(m.name)}"
                            data-sound-category="constellation ${m.builtin ? 'built-in' : 'saved'}">
                        <span class="libcard__art" aria-hidden="true">${constellationPreviewSVG(m)}</span>
                        <span class="libcard__name">${escapeHtml(m.name)}</span>
                        <span class="libcard__sub">${m.active?.length || 0} sound${(m.active?.length || 0) === 1 ? '' : 's'}</span>
                    </button>
                `
                    )
                    .join('')}
            </div>
        </section>`;
    }

    for (const [cat, items] of groups) {
        html += `<section class="libcat">
            <h3 class="libcat__title">${escapeHtml(cat)}</h3>
            <div class="libcat__grid">
                ${items
                    .map(
                        (s) => `
                    <button class="libcard" data-sound="${escapeAttr(s.id)}"
                            aria-label="Toggle ${escapeAttr(s.name)}"
                            data-sound-name="${escapeAttr(s.name)}"
                            data-sound-category="${escapeAttr(s.category)}">
                        <span class="libcard__art" aria-hidden="true">${cosmicPreviewSVG(s.id)}</span>
                        <span class="libcard__name">${escapeHtml(s.name)}</span>
                    </button>
                `
                    )
                    .join('')}
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

    body.querySelectorAll('.libcard[data-mix]').forEach((el) => {
        el.addEventListener('click', async () => {
            await ensureAudio();
            await activateMix(el.dataset.mix);
        });
    });

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
                const hay =
                    `${card.dataset.soundName || ''} ${card.dataset.soundCategory || ''}`.toLowerCase();
                card.style.display = !q || hay.includes(q) ? '' : 'none';
            });
        });
    }
}

function comingSoonCard(s) {
    return `
        <div class="libcard libcard--soon" aria-disabled="true" title="Coming soon">
            <span class="libcard__art" aria-hidden="true">${cosmicPreviewSVG(s.id, { dim: true })}</span>
            <span class="libcard__name">${escapeHtml(s.name)}</span>
            <span class="libcard__soon">Soon</span>
        </div>
    `;
}

// Cosmic preview — a small SVG portrait of a sound's celestial body.
// Uses the same tints / motifs that the body's shader uses so the drawer
// preview is recognisably the same object the user will see in the scene
// once they pick it. Generic for unknown sounds: a clean gold orb.
function cosmicPreviewSVG(id, { dim = false } = {}) {
    const recipe = COSMIC_PREVIEWS[id] || COSMIC_PREVIEWS.__default;
    const opacity = dim ? 0.45 : 1;
    const motif = recipe.motif();
    return `
        <svg viewBox="0 0 56 56" width="56" height="56" style="opacity:${opacity}">
            <defs>
                <radialGradient id="g_${id}" cx="34%" cy="32%" r="65%">
                    <stop offset="0%"  stop-color="${recipe.accent}" stop-opacity="0.95"/>
                    <stop offset="35%" stop-color="${recipe.tint}"   stop-opacity="0.85"/>
                    <stop offset="100%" stop-color="${recipe.tint}"  stop-opacity="0"/>
                </radialGradient>
                <filter id="bloom_${id}" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="1.2"/>
                </filter>
            </defs>
            <circle cx="28" cy="28" r="22" fill="url(#g_${id})" filter="url(#bloom_${id})"/>
            ${motif}
        </svg>
    `;
}

// Per-sound recipe. tint / accent are CSS color strings; motif is a
// function returning extra SVG markup overlaid on the gradient orb.
const COSMIC_PREVIEWS = {
    rain: {
        tint: '#8FB8E8',
        accent: '#D6E8F8',
        motif: () => `
            <g stroke="rgba(220,235,250,0.85)" stroke-width="1.4" stroke-linecap="round">
                <line x1="20" y1="22" x2="20" y2="32"/>
                <line x1="28" y1="18" x2="28" y2="28"/>
                <line x1="36" y1="22" x2="36" y2="32"/>
                <line x1="24" y1="32" x2="24" y2="40"/>
                <line x1="32" y1="32" x2="32" y2="40"/>
            </g>`,
    },
    forest: {
        tint: '#4FA86C',
        accent: '#9FE69F',
        motif: () => `
            <g fill="rgba(180,235,180,0.7)">
                <ellipse cx="22" cy="22" rx="6" ry="9" transform="rotate(-22 22 22)"/>
                <ellipse cx="34" cy="20" rx="5" ry="8" transform="rotate(20 34 20)"/>
                <ellipse cx="28" cy="34" rx="6" ry="9"/>
            </g>`,
    },
    ocean: {
        tint: '#3389C8',
        accent: '#7CD8FF',
        motif: () => `
            <g stroke="rgba(180,225,250,0.75)" stroke-width="1.5" fill="none" stroke-linecap="round">
                <path d="M10 26 q 4 -3, 9 0 t 9 0 t 9 0 t 9 0"/>
                <path d="M10 32 q 4 -3, 9 0 t 9 0 t 9 0 t 9 0"/>
                <path d="M10 38 q 4 -3, 9 0 t 9 0 t 9 0 t 9 0"/>
            </g>`,
    },
    cafe: {
        tint: '#FBBC61',
        accent: '#FFE9A6',
        motif: () => `
            <g fill="rgba(255,238,180,0.9)">
                <circle cx="28" cy="28" r="4"/>
            </g>
            <g stroke="rgba(255,225,150,0.7)" stroke-width="1.6" stroke-linecap="round">
                <line x1="28" y1="14" x2="28" y2="20"/>
                <line x1="28" y1="36" x2="28" y2="42"/>
                <line x1="14" y1="28" x2="20" y2="28"/>
                <line x1="36" y1="28" x2="42" y2="28"/>
                <line x1="18" y1="18" x2="22" y2="22"/>
                <line x1="34" y1="34" x2="38" y2="38"/>
                <line x1="38" y1="18" x2="34" y2="22"/>
                <line x1="22" y1="34" x2="18" y2="38"/>
            </g>`,
    },
    __default: {
        tint: '#EAD79B',
        accent: '#FFF1CD',
        motif: () => '',
    },
};

// Constellation preview — small dot-cluster of the body recipes that the
// mix activates. Reads as a literal "constellation": the dots are placed
// at each body's resting orbital lane around an implied centre.
function constellationPreviewSVG(mix) {
    const ids = (mix.active || []).slice(0, 6);
    if (ids.length === 0) {
        return `<svg viewBox="0 0 56 56" width="56" height="56">
            <circle cx="28" cy="28" r="2.5" fill="rgba(255,230,165,0.5)"/></svg>`;
    }
    // Resting lane angles match BODY_RECIPES in sound-bodies.js.
    const LANES = {
        rain: Math.PI * 0.25,
        forest: Math.PI * 0.75,
        ocean: Math.PI * 1.25,
        cafe: Math.PI * 1.75,
    };
    const radius = 16;
    const cx = 28,
        cy = 28;
    let dots = '';
    for (const id of ids) {
        const ang = LANES[id] ?? Math.random() * Math.PI * 2;
        const x = cx + Math.cos(ang) * radius;
        const y = cy + Math.sin(ang) * radius;
        const recipe = COSMIC_PREVIEWS[id] || COSMIC_PREVIEWS.__default;
        dots += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.2" fill="${recipe.accent}" opacity="0.92"/>`;
        dots += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="6"   fill="${recipe.tint}"   opacity="0.18"/>`;
    }
    // Central singularity dot — anchors the composition.
    dots += `<circle cx="${cx}" cy="${cy}" r="2"   fill="rgba(0,0,0,1)"/>`;
    dots += `<circle cx="${cx}" cy="${cy}" r="3.5" fill="none" stroke="rgba(255,200,110,0.55)" stroke-width="0.7"/>`;

    // Thin connecting lines from each body to the singularity — gives
    // the composition the feel of orbital tethers.
    let lines = '';
    for (const id of ids) {
        const ang = LANES[id] ?? 0;
        const x = cx + Math.cos(ang) * radius;
        const y = cy + Math.sin(ang) * radius;
        lines += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" stroke="rgba(255,215,130,0.18)" stroke-width="0.8"/>`;
    }
    return `<svg viewBox="0 0 56 56" width="56" height="56">${lines}${dots}</svg>`;
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
            // No success toast — the constellation appears in the library
            // and that's the confirmation.
        } catch (err) {
            toast(err.message || "Couldn't save mix.");
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
    setTimeout(() => {
        input.focus();
        input.select();
    }, 120);
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
    // No toast — the cosmos toolbar's sleep button gets `is-active` glow,
    // visible at all times until the timer fires.
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
        if (!t) {
            cancelSleepTimer();
            return;
        }
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

// Circumference of the countdown arc circle in cosmos-tool__arc — must
// match the SVG's r=20 (2 * PI * 20). Used to convert progress 0..1
// into an SVG stroke-dashoffset value.
const SLEEP_ARC_CIRC = 125.66;

function syncSleepUI() {
    const btn = document.getElementById('deckSleepBtn');
    const t = ambientSleepTimer.value;
    if (!btn) return;
    // Native title is killed in both branches — only the custom
    // data-tooltip is used now, so the user never sees two labels.
    btn.removeAttribute('title');
    if (!t) {
        btn.classList.remove('is-active', 'is-fading');
        btn.style.removeProperty('--arc-offset');
        btn.setAttribute('data-tooltip', 'Sleep timer');
        return;
    }
    const remainingMs = Math.max(0, t.endAt - Date.now());
    const mm = Math.floor(remainingMs / 60000);
    const ss = Math.floor((remainingMs % 60000) / 1000);
    const compact = remainingMs >= 60_000 ? `${mm}m` : `${ss}s`;

    btn.classList.add('is-active');
    // Final-fade window (last 30 s) — same trigger the audio engine uses
    // to start its master-bus fade-out. The arc pulses in sync.
    btn.classList.toggle('is-fading', remainingMs <= 30_000);
    btn.setAttribute('data-tooltip', `Sleep timer · ${compact}`);

    // Arc depletion: progress = elapsed / duration → 0 (just armed) … 1 (done).
    // dashoffset = circumference * progress: 0 = full ring, circumference = empty.
    const duration = t.duration || 1;
    const progress = Math.max(0, Math.min(1, 1 - remainingMs / duration));
    btn.style.setProperty('--arc-offset', (SLEEP_ARC_CIRC * progress).toFixed(2));
}
// Keep the sleep button updating once a second even while the user is idle.
setInterval(() => {
    if (ambientSleepTimer.value) syncSleepUI();
}, 1000);

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
function enterImmersive() {
    document.body.classList.add('is-immersive');
}
function exitImmersive() {
    document.body.classList.remove('is-immersive');
}

// ═══════════════════════════════════════════════════════════════════════════
// Home mini-player (C.3)
// A compact floating widget on the Home tab that surfaces whenever at least
// one track is playing. Mirrors the mini-timer on the opposite corner.
// ═══════════════════════════════════════════════════════════════════════════

let hmaPaused = false; // true when the user pauses from the mini-player
let hmaPrevMaster = 0.5; // volume to restore on resume
let hmaEqRafId = 0; // rAF for equalizer animation
// Smoothed bar values so the EQ moves like an analog meter, not a discrete
// histogram. Each bar lerps toward its phase-shifted target every frame.
const hmaBarSmoothed = [0.4, 0.7, 0.3, 0.6, 0.25];

function wireHomeMiniPlayer() {
    const playBtn = document.getElementById('hmaPlayPauseBtn');
    const vol = document.getElementById('hmaVolume');
    const art = document.getElementById('hmaArt');

    playBtn?.addEventListener('click', async (e) => {
        e.stopPropagation();
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
        const v = Number(vol.value);
        setMasterVolume(v / 100, { fadeMs: 60 });
        // Live-update the rail fill — the CSS pulls --hma-vol off the input.
        vol.style.setProperty('--hma-vol', `${v}%`);
    });

    // Tile doubles as a "go to the deck" affordance — a single click jumps
    // to the Ambient tab so the user can fine-tune from the home widget.
    art?.addEventListener('click', (e) => {
        e.stopPropagation();
        switchMode('ambient');
    });

    startHmaEqualizer();
}

// Drive the equalizer bars from the master analyser. Per-bar phase offsets
// + per-bar smoothing make the cluster look organic rather than a raw FFT
// histogram. Cheap: one getByteFrequencyData call per frame, five property
// writes. Pauses when the widget is hidden so it doesn't burn cycles when
// the user isn't on the home tab.
function startHmaEqualizer() {
    if (hmaEqRafId) return;
    const widget = document.getElementById('homeMiniAmbient');
    const tick = () => {
        hmaEqRafId = requestAnimationFrame(tick);
        if (!widget || widget.classList.contains('hidden')) return;
        const energy = hmaPaused ? 0 : Math.max(0, Math.min(1, getMasterEnergy() * 2.4));
        const t = performance.now() * 0.001;
        // Five bars with offset sine modulation around the energy reading.
        // Mapped into [0.25..1.0] so even quiet audio shows perceptible motion.
        const targets = [
            0.4 + energy * (0.55 + 0.25 * Math.sin(t * 4.1)),
            0.4 + energy * (0.6 + 0.3 * Math.sin(t * 4.7 + 1.3)),
            0.4 + energy * (0.55 + 0.25 * Math.sin(t * 5.1 + 2.6)),
            0.4 + energy * (0.6 + 0.3 * Math.sin(t * 4.4 + 3.9)),
            0.4 + energy * (0.55 + 0.25 * Math.sin(t * 4.9 + 5.2)),
        ];
        let avg = 0;
        for (let i = 0; i < 5; i++) {
            const target = Math.max(0.2, Math.min(1, targets[i]));
            // Asymmetric smoothing: rises fast (snap to peaks), falls slow
            // (decay tails), matches how a hardware VU meter behaves.
            const prev = hmaBarSmoothed[i];
            const k = target > prev ? 0.55 : 0.18;
            hmaBarSmoothed[i] = prev + (target - prev) * k;
            widget.style.setProperty(`--hma-bar${i + 1}`, hmaBarSmoothed[i].toFixed(3));
            avg += hmaBarSmoothed[i];
        }
        // Outer-halo strength tracks average bar height — gives the pill a
        // breathing aura linked to actual audio without an extra analyser.
        const glow = Math.max(0, (avg / 5 - 0.35) * 1.4);
        widget.style.setProperty('--hma-glow', glow.toFixed(3));
    };
    hmaEqRafId = requestAnimationFrame(tick);
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
        widget.addEventListener('animationend', () => widget.classList.remove('is-entering'), {
            once: true,
        });
    } else if (!shouldShow && !widget.classList.contains('hidden')) {
        widget.classList.add('is-leaving');
        widget.addEventListener(
            'animationend',
            () => {
                widget.classList.remove('is-leaving');
                widget.classList.add('hidden');
            },
            { once: true }
        );
    }
    if (!shouldShow) return;

    // Name + subtitle: lead with the most informative piece. Single-track
    // mixes show the sound name and "Ambient" beneath; multi-track mixes
    // show "Custom mix" and a sound count.
    const nameEl = document.getElementById('hmaName');
    const subEl = document.getElementById('hmaSub');
    const ids = activeSounds.value;
    if (nameEl && subEl) {
        if (ids.length === 1) {
            nameEl.textContent = labelFor(ids[0]);
            subEl.textContent = 'Ambient';
        } else {
            nameEl.textContent = 'Custom mix';
            subEl.textContent = `${ids.length} sounds`;
        }
    }

    // Volume rail + paused state.
    const volSlider = document.getElementById('hmaVolume');
    const v = Math.round((ambientMaster.value?.volume ?? 0.5) * 100);
    if (volSlider && document.activeElement !== volSlider) {
        volSlider.value = String(v);
        volSlider.style.setProperty('--hma-vol', `${v}%`);
    }

    widget.classList.toggle('is-paused', hmaPaused);

    const btn = document.getElementById('hmaPlayPauseBtn');
    if (btn) {
        btn.innerHTML = hmaPaused
            ? '<svg class="hma-play__icon" viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M4 2.5a.5.5 0 0 1 .77-.42l8.5 5.5a.5.5 0 0 1 0 .84l-8.5 5.5A.5.5 0 0 1 4 13.5v-11z"/></svg>'
            : '<svg class="hma-play__icon" viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" rx="1"/><rect x="9.5" y="2" width="3.5" height="12" rx="1"/></svg>';
        btn.setAttribute('aria-label', hmaPaused ? 'Resume ambient mix' : 'Pause ambient mix');
    }
}

// (home-mini-ambient widget removed; no polling needed.)

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
function labelFor(id) {
    return SOUND_LIBRARY[id]?.name || id;
}
function bandLabel(b) {
    return b === 'low' ? 'Bass' : b === 'mid' ? 'Mid' : 'Treble';
}
function bandTooltip(b) {
    return b === 'low'
        ? 'Bass — low end, rumble and depth'
        : b === 'mid'
          ? 'Mid — body and warmth'
          : 'Treble — sparkle and air';
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
function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
}
