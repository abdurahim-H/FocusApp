// sounds.js — Ambient audio engine (v2)
//
// Web Audio API based. Each track is a dedicated node graph:
//
//   BufferSource → Gain → LowShelf → Peaking → HighShelf → StereoPanner ─┐
//                                                                        ↓
//                                                    MasterGain → Limiter → Analyser → destination
//
// Fades use gain.linearRampToValueAtTime so volume changes never click.
// AudioBuffers are decoded once and reused on every start (cheap loop).
//
// The AudioContext is created lazily on first user gesture — browsers block
// it otherwise. State restored from localStorage is silent until the first
// play() call unlocks the context.

import { state, ambientTracks, ambientMaster, activeSounds, effect } from '../core/state.js';

// ═══════════════════════════════════════════════════════════════════════════
// Sound library
// ═══════════════════════════════════════════════════════════════════════════

const SOUND_CDN = 'https://cdn.universefocuses.com';

// Real sounds served from R2. More "coming soon" slots are advertised in the
// library UI so users know the catalog is growing.
export const SOUND_LIBRARY = {
    rain:   { name: 'Rain',   icon: '🌧️', category: 'Nature', url: `${SOUND_CDN}/rain_00.wav` },
    ocean:  { name: 'Ocean',  icon: '🌊', category: 'Nature', url: `${SOUND_CDN}/ocean_04.wav` },
    forest: { name: 'Forest', icon: '🌲', category: 'Nature', url: `${SOUND_CDN}/forest_00.wav` },
    cafe:   { name: 'Café',   icon: '☕', category: 'Indoor', url: `${SOUND_CDN}/crowd_0.wav` },
};

// Defaults for a brand-new track entry.
const DEFAULT_TRACK = {
    volume: 0.7,
    eq: { low: 0, mid: 0, high: 0 },
    pan: 0,
    muted: false,
};

// ═══════════════════════════════════════════════════════════════════════════
// Audio context + master bus (lazy)
// ═══════════════════════════════════════════════════════════════════════════

let ctx = null;
let masterGain = null;
let masterLimiter = null;
let masterAnalyser = null;
let masterReady = false;

/** Ensure the AudioContext is created and running. Safe to call repeatedly.
 *  Must be invoked from a user gesture (click / key) to avoid autoplay block. */
export async function ensureAudio() {
    if (!ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) throw new Error('Web Audio API not available');
        ctx = new Ctx({ latencyHint: 'playback' });

        masterGain = ctx.createGain();
        masterGain.gain.value = clamp01(ambientMaster.value?.volume ?? 0.5);

        masterLimiter = ctx.createDynamicsCompressor();
        // Transparent limiter: only catches true peaks, doesn't colour the sound.
        masterLimiter.threshold.value = -1;
        masterLimiter.knee.value = 0;
        masterLimiter.ratio.value = 20;
        masterLimiter.attack.value = 0.003;
        masterLimiter.release.value = 0.12;

        masterAnalyser = ctx.createAnalyser();
        masterAnalyser.fftSize = 256;
        masterAnalyser.smoothingTimeConstant = 0.85;

        masterGain.connect(masterLimiter);
        masterLimiter.connect(masterAnalyser);
        masterAnalyser.connect(ctx.destination);

        masterReady = true;
    }
    if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch (_) { /* ignore */ }
    }
    return ctx;
}

/** 0..1 amplitude of the current master-bus output. Useful for scene reactivity. */
export function getMasterEnergy() {
    if (!masterAnalyser) return 0;
    const buf = new Uint8Array(masterAnalyser.frequencyBinCount);
    masterAnalyser.getByteFrequencyData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i];
    return sum / (buf.length * 255);
}

// ═══════════════════════════════════════════════════════════════════════════
// Buffer cache
// ═══════════════════════════════════════════════════════════════════════════

const bufferCache = new Map();       // id -> AudioBuffer
const bufferPromises = new Map();    // id -> Promise<AudioBuffer> (in-flight)

async function loadBuffer(id) {
    if (bufferCache.has(id)) return bufferCache.get(id);
    if (bufferPromises.has(id)) return bufferPromises.get(id);

    const def = SOUND_LIBRARY[id];
    if (!def) throw new Error(`Unknown sound: ${id}`);

    const p = (async () => {
        const res = await fetch(def.url, { mode: 'cors' });
        if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
        const raw = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(raw);
        bufferCache.set(id, buf);
        bufferPromises.delete(id);
        return buf;
    })();
    bufferPromises.set(id, p);
    return p;
}

// ═══════════════════════════════════════════════════════════════════════════
// Per-track node graph
// ═══════════════════════════════════════════════════════════════════════════

const tracks = new Map();  // id -> { source, gain, lowEq, midEq, highEq, pan, stopping }

function createTrackGraph(id) {
    const gain = ctx.createGain();
    gain.gain.value = 0;        // Start silent, fade in.

    const lowEq = ctx.createBiquadFilter();
    lowEq.type = 'lowshelf';
    lowEq.frequency.value = 200;
    lowEq.gain.value = 0;

    const midEq = ctx.createBiquadFilter();
    midEq.type = 'peaking';
    midEq.frequency.value = 1000;
    midEq.Q.value = 1;
    midEq.gain.value = 0;

    const highEq = ctx.createBiquadFilter();
    highEq.type = 'highshelf';
    highEq.frequency.value = 4000;
    highEq.gain.value = 0;

    const pan = ctx.createStereoPanner();
    pan.pan.value = 0;

    gain.connect(lowEq);
    lowEq.connect(midEq);
    midEq.connect(highEq);
    highEq.connect(pan);
    pan.connect(masterGain);

    return { gain, lowEq, midEq, highEq, pan, source: null, stopping: false };
}

/** Apply the saved state (volume/eq/pan/muted) to a track's nodes. */
function applyTrackState(id, node, fadeMs = 0) {
    const t = getTrackState(id);
    const now = ctx.currentTime;
    const target = t.muted ? 0 : t.volume;
    if (fadeMs > 0) {
        node.gain.gain.cancelScheduledValues(now);
        node.gain.gain.linearRampToValueAtTime(target, now + fadeMs / 1000);
    } else {
        node.gain.gain.setTargetAtTime(target, now, 0.03);
    }
    node.lowEq.gain.setTargetAtTime(t.eq.low, now, 0.05);
    node.midEq.gain.setTargetAtTime(t.eq.mid, now, 0.05);
    node.highEq.gain.setTargetAtTime(t.eq.high, now, 0.05);
    node.pan.pan.setTargetAtTime(clamp(t.pan, -1, 1), now, 0.05);
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API — playback
// ═══════════════════════════════════════════════════════════════════════════

const FADE_IN_MS = 400;
const FADE_OUT_MS = 600;

/** Start a track (or ensure it's playing). Fades in. */
export async function playSound(id, { fadeMs = FADE_IN_MS } = {}) {
    await ensureAudio();
    if (!SOUND_LIBRARY[id]) return false;

    // Already playing? just re-apply state.
    if (tracks.has(id)) {
        applyTrackState(id, tracks.get(id), fadeMs);
        _addActive(id);
        return true;
    }

    let buffer;
    try {
        buffer = await loadBuffer(id);
    } catch (err) {
        console.warn(`[sounds] failed to load ${id}:`, err);
        emit('load-error', { id, error: err });
        return false;
    }

    const node = createTrackGraph(id);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(node.gain);
    source.start(0);
    node.source = source;
    tracks.set(id, node);

    // Fade in to the saved target volume.
    const now = ctx.currentTime;
    const t = getTrackState(id);
    const target = t.muted ? 0 : t.volume;
    node.gain.gain.setValueAtTime(0, now);
    node.gain.gain.linearRampToValueAtTime(target, now + fadeMs / 1000);
    node.lowEq.gain.value = t.eq.low;
    node.midEq.gain.value = t.eq.mid;
    node.highEq.gain.value = t.eq.high;
    node.pan.pan.value = clamp(t.pan, -1, 1);

    _addActive(id);
    emit('play', { id });
    return true;
}

/** Stop a track. Fades out, then tears down the graph. */
export function stopSound(id, { fadeMs = FADE_OUT_MS } = {}) {
    const node = tracks.get(id);
    if (!node || node.stopping) {
        _removeActive(id);
        return;
    }
    node.stopping = true;
    const now = ctx.currentTime;
    const duration = fadeMs / 1000;
    node.gain.gain.cancelScheduledValues(now);
    node.gain.gain.setValueAtTime(node.gain.gain.value, now);
    node.gain.gain.linearRampToValueAtTime(0, now + duration);
    setTimeout(() => {
        try { node.source?.stop(); } catch (_) { /* already stopped */ }
        try { node.source?.disconnect(); } catch (_) {}
        try { node.gain.disconnect(); } catch (_) {}
        tracks.delete(id);
    }, fadeMs + 40);
    _removeActive(id);
    emit('stop', { id });
}

/** Toggle a track on/off. Returns the new state (true = playing). */
export async function toggleAmbientSound(id) {
    if (tracks.has(id) && !tracks.get(id).stopping) {
        stopSound(id);
        return false;
    }
    return await playSound(id);
}

/** Stop every track. */
export function stopAllAmbientSounds({ fadeMs = FADE_OUT_MS } = {}) {
    for (const id of Array.from(tracks.keys())) {
        stopSound(id, { fadeMs });
    }
}

/** Is a track currently playing (and not in the middle of fading out)? */
export function isSoundActive(id) {
    const node = tracks.get(id);
    return !!(node && !node.stopping);
}

export function getActiveSounds() {
    return Array.from(tracks.keys()).filter((id) => !tracks.get(id).stopping);
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API — per-track parameters
// ═══════════════════════════════════════════════════════════════════════════

export function setSoundVolume(id, value01) {
    const v = clamp01(value01);
    mutateTrack(id, { volume: v });
    const node = tracks.get(id);
    if (node && !node.stopping) {
        const target = getTrackState(id).muted ? 0 : v;
        node.gain.gain.setTargetAtTime(target, ctx.currentTime, 0.04);
    }
}

/** Back-compat shim: `setSoundVolume(id, percent0to100)` callers still work. */
export function setSoundVolumePercent(id, pct) {
    setSoundVolume(id, clamp(pct, 0, 100) / 100);
}

export function setSoundEQ(id, band, valueDb) {
    const v = clamp(valueDb, -12, 12);
    const current = getTrackState(id);
    const next = { ...current.eq, [band]: v };
    mutateTrack(id, { eq: next });
    const node = tracks.get(id);
    if (!node) return;
    const param = band === 'low' ? node.lowEq.gain
                : band === 'mid' ? node.midEq.gain
                :                  node.highEq.gain;
    param.setTargetAtTime(v, ctx.currentTime, 0.04);
}

export function setSoundPan(id, value) {
    const p = clamp(value, -1, 1);
    mutateTrack(id, { pan: p });
    const node = tracks.get(id);
    if (!node) return;
    node.pan.pan.setTargetAtTime(p, ctx.currentTime, 0.04);
}

export function setSoundMuted(id, muted) {
    mutateTrack(id, { muted: !!muted });
    const node = tracks.get(id);
    if (node && !node.stopping) {
        const t = getTrackState(id);
        const target = muted ? 0 : t.volume;
        node.gain.gain.setTargetAtTime(target, ctx.currentTime, 0.04);
    }
}

/** Master volume (0..1). Fades smoothly. */
export function setMasterVolume(value01, { fadeMs = 200 } = {}) {
    const v = clamp01(value01);
    ambientMaster.value = { ...ambientMaster.value, volume: v };
    if (masterGain) {
        const now = ctx.currentTime;
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.linearRampToValueAtTime(v, now + fadeMs / 1000);
    }
}

export function getMasterVolume() {
    return ambientMaster.value?.volume ?? 0.5;
}

/** Fade master to 0 over `durationMs`, then stop all tracks. */
export function fadeOutAll(durationMs = 4000) {
    if (!masterGain) return stopAllAmbientSounds({ fadeMs: 0 });
    const now = ctx.currentTime;
    const start = masterGain.gain.value;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(start, now);
    masterGain.gain.linearRampToValueAtTime(0, now + durationMs / 1000);
    setTimeout(() => {
        stopAllAmbientSounds({ fadeMs: 0 });
        // Restore master volume so the next play isn't silent.
        if (masterGain) {
            const v = getMasterVolume();
            masterGain.gain.cancelScheduledValues(ctx.currentTime);
            masterGain.gain.setValueAtTime(v, ctx.currentTime);
        }
    }, durationMs + 40);
}

// ═══════════════════════════════════════════════════════════════════════════
// State helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Read the per-track state for `id`, initialising defaults on first access. */
export function getTrackState(id) {
    const all = ambientTracks.value;
    if (all[id]) return all[id];
    // Seed defaults lazily (so untouched tracks don't bloat localStorage).
    const seed = { ...DEFAULT_TRACK, eq: { ...DEFAULT_TRACK.eq } };
    ambientTracks.value = { ...all, [id]: seed };
    return seed;
}

function mutateTrack(id, patch) {
    const all = ambientTracks.value;
    const prev = all[id] ?? { ...DEFAULT_TRACK, eq: { ...DEFAULT_TRACK.eq } };
    ambientTracks.value = { ...all, [id]: { ...prev, ...patch } };
}

function _addActive(id) {
    const a = activeSounds.value;
    if (!a.includes(id)) activeSounds.value = [...a, id];
}
function _removeActive(id) {
    const a = activeSounds.value;
    if (a.includes(id)) activeSounds.value = a.filter((x) => x !== id);
}

// ═══════════════════════════════════════════════════════════════════════════
// Event bus — UI layer subscribes
// ═══════════════════════════════════════════════════════════════════════════

const listeners = new Set();
function emit(type, payload) {
    for (const fn of listeners) {
        try { fn(type, payload); } catch (_) {}
    }
}
/** Subscribe to engine events: 'play' | 'stop' | 'load-error'. Returns unsubscribe. */
export function onAmbientEvent(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

// ═══════════════════════════════════════════════════════════════════════════
// Legacy compatibility shims
// Older call-sites expect these names. They all proxy to the new engine.
// ═══════════════════════════════════════════════════════════════════════════

export async function initAudioSystem() {
    // No-op until a user gesture. ensureAudio() does the real work.
    return true;
}
export function setupAmbientControls() {
    // UI wiring lives in ambient-ui.js (Phase B). Kept as a no-op so the
    // existing loader in core/app.js doesn't error during the transition.
}
/** Master volume via 0..100 percentage — for the settings slider. */
export function setAmbientVolume(value01) {
    setMasterVolume(clamp01(value01));
}
export function setVolume(pct) {
    setAmbientVolume(clamp(pct, 0, 100) / 100);
}

// ═══════════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════════

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function clamp01(v) { return clamp(Number.isFinite(v) ? v : 0, 0, 1); }
