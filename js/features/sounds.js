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

import { activeSounds, ambientMaster, ambientTracks, effect, state } from '../core/state.js';

// ═══════════════════════════════════════════════════════════════════════════
// Sound library
// ═══════════════════════════════════════════════════════════════════════════

const SOUND_CDN = 'https://cdn.universefocuses.com';

// Real sounds served from R2. More "coming soon" slots are advertised in the
// library UI so users know the catalog is growing.
export const SOUND_LIBRARY = {
    rain: { name: 'Rain', icon: '🌧️', category: 'Nature', url: `${SOUND_CDN}/rain_00.ogg` },
    ocean: { name: 'Ocean', icon: '🌊', category: 'Nature', url: `${SOUND_CDN}/ocean_04.ogg` },
    forest: { name: 'Forest', icon: '🌲', category: 'Nature', url: `${SOUND_CDN}/forest_00.ogg` },
    cafe: { name: 'Café', icon: '☕', category: 'Indoor', url: `${SOUND_CDN}/crowd_0.ogg` },
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

// Wave 5.6 — stream-mode ducking. When a YouTube / SoundCloud theme
// is active and `sounds.muteOnStream` is on, the cosmos master fades
// to silence so the two sources don't fight. The user's stored
// master volume is preserved (still in `ambientMaster.value`); we
// only override the gain. Toggling the setting off — or switching
// the stream off — restores the stored volume immediately.
let streamDuckActive = false;

/** Ensure the AudioContext is created and running. Safe to call repeatedly.
 *  Must be invoked from a user gesture (click / key) to avoid autoplay block. */
export async function ensureAudio() {
    if (!ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) throw new Error('Web Audio API not available');
        ctx = new Ctx({ latencyHint: 'playback' });

        masterGain = ctx.createGain();
        // If a stream theme is already active when audio inits (page
        // reload with stream restored from settings), respect the
        // duck immediately. Otherwise the user would briefly hear
        // the cosmos at full volume before the duck syncs.
        masterGain.gain.value = streamDuckActive
            ? 0
            : clamp01(ambientMaster.value?.volume ?? 0.5);

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
        try {
            await ctx.resume();
        } catch (_) {
            /* ignore */
        }
    }
    return ctx;
}

/** 0..1 amplitude of the current master-bus output. Useful for scene reactivity.
 *  Called every render frame (60-120Hz). The scratch buffer is cached so we
 *  don't allocate a fresh Uint8Array on every frame. */
let energyScratch = null;
export function getMasterEnergy() {
    if (!masterAnalyser) return 0;
    if (!energyScratch || energyScratch.length !== masterAnalyser.frequencyBinCount) {
        energyScratch = new Uint8Array(masterAnalyser.frequencyBinCount);
    }
    masterAnalyser.getByteFrequencyData(energyScratch);
    let sum = 0;
    for (let i = 0; i < energyScratch.length; i++) sum += energyScratch[i];
    return sum / (energyScratch.length * 255);
}

// Per-track scratch buffers, keyed by track id, so each cosmic body can
// pull its own FFT every frame without per-frame allocation.
const trackEnergyScratch = new Map();

/** Average 0..1 energy for a single track. Returns 0 if the track isn't
 *  playing or its analyser is gone. */
export function getTrackEnergy(id) {
    const node = tracks.get(id);
    if (!node || !node.analyser) return 0;
    let scratch = trackEnergyScratch.get(id);
    if (!scratch || scratch.length !== node.analyser.frequencyBinCount) {
        scratch = new Uint8Array(node.analyser.frequencyBinCount);
        trackEnergyScratch.set(id, scratch);
    }
    node.analyser.getByteFrequencyData(scratch);
    let sum = 0;
    for (let i = 0; i < scratch.length; i++) sum += scratch[i];
    return sum / (scratch.length * 255);
}

/** Three-band energy for a track: { low, mid, high } each 0..1.
 *  Lets each celestial body deform per-band — the rain droplet shimmers on
 *  high frequencies, the ocean ring swells on bass, the forest moss
 *  twists on mids. Reuses the per-track analyser; same scratch buffer. */
export function getTrackBandEnergy(id) {
    const node = tracks.get(id);
    if (!node || !node.analyser) return { low: 0, mid: 0, high: 0 };
    let scratch = trackEnergyScratch.get(id);
    if (!scratch || scratch.length !== node.analyser.frequencyBinCount) {
        scratch = new Uint8Array(node.analyser.frequencyBinCount);
        trackEnergyScratch.set(id, scratch);
    }
    node.analyser.getByteFrequencyData(scratch);
    // 256-bin FFT => bin 0..127. With ctx sample rate 48kHz the Nyquist is
    // 24kHz, so each bin spans ~187Hz. Bands: low <= bin 5 (~940Hz),
    // mid 6..32 (~6kHz), high 33..127 (rest).
    const n = scratch.length;
    const lowEnd = Math.min(5, n);
    const midEnd = Math.min(32, n);
    let lo = 0,
        mi = 0,
        hi = 0;
    for (let i = 0; i < lowEnd; i++) lo += scratch[i];
    for (let i = lowEnd; i < midEnd; i++) mi += scratch[i];
    for (let i = midEnd; i < n; i++) hi += scratch[i];
    return {
        low: lo / Math.max(1, lowEnd) / 255,
        mid: mi / Math.max(1, midEnd - lowEnd) / 255,
        high: hi / Math.max(1, n - midEnd) / 255,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Buffer cache
// ═══════════════════════════════════════════════════════════════════════════

const bufferCache = new Map(); // id -> AudioBuffer
const bufferPromises = new Map(); // id -> Promise<AudioBuffer> (in-flight)

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

const tracks = new Map(); // id -> { source, gain, lowEq, midEq, highEq, pan, stopping }

function createTrackGraph(id) {
    const gain = ctx.createGain();
    gain.gain.value = 0; // Start silent, fade in.

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

    // Per-track analyser — taps the post-pan signal so the cosmos sound-body
    // bound to this track gets FFT data that reflects exactly what the user
    // hears for it (volume + EQ + mute + pan all factored in). It's a
    // dead-end branch — no downstream connection — so it doesn't double-mix
    // into the master bus, just measures.
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;

    gain.connect(lowEq);
    lowEq.connect(midEq);
    midEq.connect(highEq);
    highEq.connect(pan);
    pan.connect(masterGain);
    pan.connect(analyser);

    return { gain, lowEq, midEq, highEq, pan, analyser, source: null, stopping: false };
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

// When fetch() fails with CORS, we fall back to bare <audio> elements.
// Basic playback works without CORS; we lose EQ, pan, smooth Web-Audio
// fades, and scene reactivity. Better than silent audio.
const fallbackTracks = new Map(); // id -> HTMLAudioElement
let fallbackMode = false;

/** Start a track (or ensure it's playing). Fades in. */
export async function playSound(id, { fadeMs = FADE_IN_MS } = {}) {
    await ensureAudio();
    if (!SOUND_LIBRARY[id]) return false;

    // Already playing? just re-apply state.
    if (tracks.has(id) || fallbackTracks.has(id)) {
        if (tracks.has(id)) applyTrackState(id, tracks.get(id), fadeMs);
        if (fallbackTracks.has(id)) applyFallbackVolume(id);
        _addActive(id);
        return true;
    }

    // Use the CORS-free path immediately if we already proved it's needed.
    if (fallbackMode) return playFallback(id, { fadeMs });

    let buffer;
    try {
        buffer = await loadBuffer(id);
    } catch (err) {
        console.warn(`[sounds] failed to load ${id}:`, err);
        const msg = String(err?.message || err);
        const isCORS = /CORS|cross[- ]origin|Failed to fetch|NetworkError|access.control/i.test(
            msg
        );
        if (isCORS) {
            // Lock the engine into fallback mode for the rest of the session
            // so subsequent plays skip the failing fetch attempt.
            if (!fallbackMode) {
                fallbackMode = true;
                console.info('[sounds] CORS blocked — switching to HTMLAudioElement fallback');
                emit('load-error', { id, error: err, kind: 'cors' });
            }
            return playFallback(id, { fadeMs });
        }
        emit('load-error', { id, error: err, kind: 'network' });
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
    setupMediaSession();
    ensureSilentKeepAlive();
    emit('play', { id });
    return true;
}

// ── Fallback helpers (HTMLAudioElement path when CORS blocks fetch) ────────

function playFallback(id, { fadeMs = FADE_IN_MS } = {}) {
    if (fallbackTracks.has(id)) {
        applyFallbackVolume(id);
        _addActive(id);
        return true;
    }
    const audio = new Audio(SOUND_LIBRARY[id].url);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0; // fade in
    // Mark used by stopFallback so the teardown-triggered error event
    // (which fires when we set src='') doesn't get mistaken for a real
    // load failure.
    audio.__stopping = false;
    const onError = (e) => {
        if (audio.__stopping) return;
        // MediaError code: 1 abort, 2 network, 3 decode, 4 src not supported.
        const mediaErr = audio.error;
        if (mediaErr && mediaErr.code === 1) return; // aborted, expected
        console.warn(`[sounds] fallback error for ${id}:`, mediaErr?.message || e.type);
        emit('load-error', { id, error: mediaErr || e, kind: 'network' });
        audio.removeEventListener('error', onError);
        fallbackTracks.delete(id);
        _removeActive(id);
    };
    audio.addEventListener('error', onError);
    audio.__onError = onError;
    fallbackTracks.set(id, audio);
    const playP = audio.play();
    if (playP)
        playP.catch(() => {
            /* error event fires separately */
        });
    fadeFallback(id, 0, fallbackTargetFor(id), fadeMs);
    _addActive(id);
    ensureSilentKeepAlive();
    setupMediaSession();
    emit('play', { id });
    return true;
}

function fallbackTargetFor(id) {
    const t = getTrackState(id);
    const master = ambientMaster.value?.volume ?? 0.5;
    const duck = streamDuckActive ? 0 : 1;
    return t.muted ? 0 : master * t.volume * duck;
}

function applyFallbackVolume(id) {
    const audio = fallbackTracks.get(id);
    if (!audio) return;
    audio.volume = clamp01(fallbackTargetFor(id));
}

function fadeFallback(id, from, to, durationMs) {
    const audio = fallbackTracks.get(id);
    if (!audio) return;
    const start = performance.now();
    const step = () => {
        const a = fallbackTracks.get(id);
        if (!a) return;
        const elapsed = performance.now() - start;
        const t = Math.max(0, Math.min(1, elapsed / durationMs));
        a.volume = clamp01(from + (to - from) * t);
        if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function stopFallback(id, { fadeMs = FADE_OUT_MS } = {}) {
    const audio = fallbackTracks.get(id);
    if (!audio) return;
    const from = audio.volume;
    fadeFallback(id, from, 0, fadeMs);
    setTimeout(() => {
        // Mark + detach listener BEFORE src='' — that assignment itself fires
        // an error event we don't want to surface.
        audio.__stopping = true;
        if (audio.__onError) audio.removeEventListener('error', audio.__onError);
        try {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
        } catch (_) {}
        fallbackTracks.delete(id);
    }, fadeMs + 40);
    _removeActive(id);
}

function refreshAllFallbackVolumes() {
    for (const id of fallbackTracks.keys()) applyFallbackVolume(id);
}

/** Stop a track. Fades out, then tears down the graph. */
export function stopSound(id, { fadeMs = FADE_OUT_MS } = {}) {
    if (fallbackTracks.has(id)) return stopFallback(id, { fadeMs });
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
        // Disconnect every node in the chain. Previously only source+gain
        // were disconnected; the 3 biquad filters + stereo panner stayed
        // wired to masterGain and kept processing silence on the audio
        // thread forever, leaking cost that compounds across stop/start
        // cycles.
        try {
            node.source?.stop();
        } catch (_) {
            /* already stopped */
        }
        try {
            node.source?.disconnect();
        } catch (_) {}
        try {
            node.gain.disconnect();
        } catch (_) {}
        try {
            node.lowEq.disconnect();
        } catch (_) {}
        try {
            node.midEq.disconnect();
        } catch (_) {}
        try {
            node.highEq.disconnect();
        } catch (_) {}
        try {
            node.pan.disconnect();
        } catch (_) {}
        try {
            node.analyser?.disconnect();
        } catch (_) {}
        tracks.delete(id);
        trackEnergyScratch.delete(id);
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
    for (const id of Array.from(tracks.keys())) stopSound(id, { fadeMs });
    for (const id of Array.from(fallbackTracks.keys())) stopFallback(id, { fadeMs });
    // Release the lock-screen keep-alive after the fade clears.
    setTimeout(() => {
        if (tracks.size === 0 && fallbackTracks.size === 0) {
            teardownSilentKeepAlive();
            mediaSessionStopped();
        }
    }, fadeMs + 80);
}

/** Is a track currently playing (and not in the middle of fading out)? */
export function isSoundActive(id) {
    const node = tracks.get(id);
    if (node && !node.stopping) return true;
    return fallbackTracks.has(id);
}

export function getActiveSounds() {
    const out = [];
    for (const id of tracks.keys()) if (!tracks.get(id).stopping) out.push(id);
    for (const id of fallbackTracks.keys()) if (!out.includes(id)) out.push(id);
    return out;
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
    if (fallbackTracks.has(id)) applyFallbackVolume(id);
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
    const param =
        band === 'low' ? node.lowEq.gain : band === 'mid' ? node.midEq.gain : node.highEq.gain;
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
    if (fallbackTracks.has(id)) applyFallbackVolume(id);
}

/** Master volume (0..1). Fades smoothly. */
export function setMasterVolume(value01, { fadeMs = 200 } = {}) {
    const v = clamp01(value01);
    ambientMaster.value = { ...ambientMaster.value, volume: v };
    if (masterGain && !streamDuckActive) {
        const now = ctx.currentTime;
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.linearRampToValueAtTime(v, now + fadeMs / 1000);
    }
    refreshAllFallbackVolumes();
}

export function getMasterVolume() {
    return ambientMaster.value?.volume ?? 0.5;
}

/** Wave 5.6 — duck the cosmos master when a stream theme is active.
 *  Idempotent: repeated calls with the same value are a no-op. The
 *  stored master volume in `ambientMaster` isn't touched, so toggling
 *  off the duck restores the user's last preference. */
export function setStreamDucking(ducked) {
    const next = !!ducked;
    if (streamDuckActive === next) return;
    streamDuckActive = next;
    if (masterGain) {
        const now = ctx.currentTime;
        const target = next ? 0 : (ambientMaster.value?.volume ?? 0.5);
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.linearRampToValueAtTime(target, now + 0.4);
    }
    refreshAllFallbackVolumes();
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
        try {
            fn(type, payload);
        } catch (_) {}
    }
}
/** Subscribe to engine events: 'play' | 'stop' | 'load-error'. Returns unsubscribe. */
export function onAmbientEvent(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

// ═══════════════════════════════════════════════════════════════════════════
// Media Session API — lock-screen, headphone, CarPlay controls
// ═══════════════════════════════════════════════════════════════════════════
//
// Browsers only surface MediaSession controls when there's observable audio
// playback. The old implementation used a tiny silent WAV looped through an
// HTMLAudioElement — but the base64-encoded WAV actually had a 0-byte data
// chunk (0 seconds of audio), which made the browser cycle
// seeking/seeked/canplay/canplaythrough/timeupdate thousands of times per
// second trying to loop nothing. Captured in a trace as ~267K media events
// in 24 seconds, which cascaded into ~800K V8 async-task events and pinned
// the Renderer CPU at 2+ cores — that was the fan spin and the OOM crashes.
//
// Modern Chrome's MediaSession surfaces as long as the active AudioContext
// is producing output. Driving a silent AudioBufferSourceNode through the
// graph satisfies that without touching the HTMLAudioElement machinery and
// without any media events at all.

let silentSource = null;
let mediaSessionAttached = false;

function ensureSilentKeepAlive() {
    if (silentSource || !ctx) return;
    try {
        // 1 second of zeros at the context's native sample rate. Looping is
        // seamless because every sample is 0; there's no discontinuity at
        // the loop point, so no clicks. No media events either.
        const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        silentSource = ctx.createBufferSource();
        silentSource.buffer = buf;
        silentSource.loop = true;
        silentSource.connect(ctx.destination);
        silentSource.start(0);
    } catch (_) {
        /* ignore — keep-alive is best-effort */
    }
}

function teardownSilentKeepAlive() {
    if (!silentSource) return;
    try {
        silentSource.stop();
    } catch (_) {}
    try {
        silentSource.disconnect();
    } catch (_) {}
    silentSource = null;
}

function setupMediaSession() {
    if (mediaSessionAttached) return;
    if (!('mediaSession' in navigator)) return;
    mediaSessionAttached = true;

    try {
        navigator.mediaSession.setActionHandler('play', () => {
            ensureSilentKeepAlive();
            emit('mediasession-play');
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            // Fade master to 0 but don't discard tracks — a user "pause"
            // should be resumable.
            setMasterVolume(0, { fadeMs: 400 });
            emit('mediasession-pause');
        });
        navigator.mediaSession.setActionHandler('stop', () => {
            stopAllAmbientSounds();
            emit('mediasession-stop');
        });
    } catch (_) {
        // Some handlers aren't supported on every browser — silently ignore.
    }
}

/** Call from the UI whenever the current mix changes so the lock-screen
 *  shows the right title. */
export function setMediaSessionMix({ name, artwork } = {}) {
    if (!('mediaSession' in navigator) || !navigator.mediaSession) return;
    try {
        navigator.mediaSession.metadata = new window.MediaMetadata({
            title: name || 'Ambient mix',
            artist: 'Cosmic Focus',
            album: 'Focus ambience',
            artwork: artwork || [{ src: '/icon.svg', sizes: '128x128', type: 'image/svg+xml' }],
        });
        navigator.mediaSession.playbackState = 'playing';
    } catch (_) {}
}

function mediaSessionStopped() {
    if (!('mediaSession' in navigator) || !navigator.mediaSession) return;
    try {
        navigator.mediaSession.playbackState = 'paused';
    } catch (_) {}
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

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}
function clamp01(v) {
    return clamp(Number.isFinite(v) ? v : 0, 0, 1);
}
