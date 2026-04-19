// sound-mixer.js — mix activation + user-savable mixes
//
// A "mix" is a named snapshot of the deck: which tracks are active, each
// track's volume/EQ/pan/mute. Users can save the current deck as a mix,
// reload it later, and the engine crossfades smoothly between mixes instead
// of the old silent-pause-then-play behaviour.

import {
    playSound,
    stopSound,
    setSoundVolume,
    setSoundEQ,
    setSoundPan,
    setSoundMuted,
    getActiveSounds,
    getTrackState,
    ensureAudio,
} from './sounds.js';
import { ambientTracks, ambientMixes, activeSounds } from '../core/state.js';

// ═══════════════════════════════════════════════════════════════════════════
// Starter mixes — shipped built-ins so the deck isn't empty on first visit.
// Users still save their own on top.
// ═══════════════════════════════════════════════════════════════════════════

export const BUILTIN_MIXES = [
    {
        id: 'builtin:rainy-library',
        name: 'Rainy Library',
        icon: '📚',
        builtin: true,
        active: ['rain', 'cafe'],
        tracks: {
            rain: { volume: 0.65, eq: { low: 0, mid: 0, high: -2 }, pan: 0, muted: false },
            cafe: { volume: 0.35, eq: { low: -2, mid: 0, high: 0 }, pan: 0, muted: false },
        },
    },
    {
        id: 'builtin:forest-walk',
        name: 'Forest Walk',
        icon: '🌿',
        builtin: true,
        active: ['forest', 'rain'],
        tracks: {
            forest: { volume: 0.6, eq: { low: 0, mid: 0, high: 0 }, pan: 0, muted: false },
            rain:   { volume: 0.3, eq: { low: 0, mid: 0, high: -1 }, pan: 0, muted: false },
        },
    },
    {
        id: 'builtin:ocean-breath',
        name: 'Ocean Breath',
        icon: '🌊',
        builtin: true,
        active: ['ocean'],
        tracks: {
            ocean: { volume: 0.75, eq: { low: 2, mid: 0, high: -2 }, pan: 0, muted: false },
        },
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// Mix CRUD
// ═══════════════════════════════════════════════════════════════════════════

export function getAllMixes() {
    return [...BUILTIN_MIXES, ...ambientMixes.value];
}

export function getMix(id) {
    return getAllMixes().find((m) => m.id === id) || null;
}

/** Snapshot the deck as it stands right now and persist as a user mix. */
export function saveCurrentMix(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Mix name is required');

    const active = [...activeSounds.value];
    if (active.length === 0) throw new Error('Add at least one sound before saving a mix');

    const tracks = {};
    for (const id of active) tracks[id] = cloneTrackState(getTrackState(id));

    const mix = {
        id: `user:${Date.now().toString(36)}`,
        name: trimmed,
        builtin: false,
        createdAt: Date.now(),
        active,
        tracks,
    };
    ambientMixes.value = [...ambientMixes.value, mix];
    return mix;
}

export function renameMix(id, name) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Mix name is required');
    ambientMixes.value = ambientMixes.value.map((m) =>
        m.id === id ? { ...m, name: trimmed } : m
    );
}

export function deleteMix(id) {
    ambientMixes.value = ambientMixes.value.filter((m) => m.id !== id);
}

/** Overwrite an existing user mix with the current deck state. */
export function updateMix(id) {
    const existing = ambientMixes.value.find((m) => m.id === id);
    if (!existing) return;
    const active = [...activeSounds.value];
    const tracks = {};
    for (const soundId of active) tracks[soundId] = cloneTrackState(getTrackState(soundId));
    ambientMixes.value = ambientMixes.value.map((m) =>
        m.id === id ? { ...m, active, tracks, updatedAt: Date.now() } : m
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Activation — crossfade current deck to a target mix
// ═══════════════════════════════════════════════════════════════════════════

const CROSSFADE_MS = 1200;

export async function activateMix(mixOrId) {
    const mix = typeof mixOrId === 'string' ? getMix(mixOrId) : mixOrId;
    if (!mix) return false;

    await ensureAudio();

    const currentActive = new Set(getActiveSounds());
    const targetActive = new Set(mix.active || []);

    // 1. Apply target track state BEFORE toggling so crossfades land at the
    //    correct volume / EQ / pan.
    const trackPatch = {};
    for (const [id, st] of Object.entries(mix.tracks || {})) {
        trackPatch[id] = cloneTrackState(st);
    }
    ambientTracks.value = { ...ambientTracks.value, ...trackPatch };

    // 2. Stop tracks that aren't in the target (fade out).
    for (const id of currentActive) {
        if (!targetActive.has(id)) stopSound(id, { fadeMs: CROSSFADE_MS });
    }

    // 3. Start (or re-apply) tracks that are in the target (fade in).
    for (const id of targetActive) {
        await playSound(id, { fadeMs: CROSSFADE_MS });
        // Already-playing tracks need explicit updates since playSound only
        // kicks off a new source when there wasn't one.
        if (currentActive.has(id)) {
            const st = mix.tracks?.[id];
            if (st) {
                setSoundVolume(id, st.volume);
                setSoundEQ(id, 'low', st.eq.low);
                setSoundEQ(id, 'mid', st.eq.mid);
                setSoundEQ(id, 'high', st.eq.high);
                setSoundPan(id, st.pan);
                setSoundMuted(id, st.muted);
            }
        }
    }

    return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// Compat shim — called from core/app.js during module init.
// UI wiring lives in ambient-ui.js (Phase B).
// ═══════════════════════════════════════════════════════════════════════════

export function initSoundMixer() { /* no-op */ }

// ═══════════════════════════════════════════════════════════════════════════
// Utils
// ═══════════════════════════════════════════════════════════════════════════

function cloneTrackState(st) {
    return {
        volume: st?.volume ?? 0.7,
        eq: {
            low:  st?.eq?.low  ?? 0,
            mid:  st?.eq?.mid  ?? 0,
            high: st?.eq?.high ?? 0,
        },
        pan: st?.pan ?? 0,
        muted: !!st?.muted,
    };
}
