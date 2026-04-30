// state.js
//
// Phase 1 foundation: reactive state via @preact/signals-core (vanilla, no build step).
// - tasks, mode, activeSounds, universe stats are signals (reactive).
// - The legacy `state` object is preserved with getters/setters that proxy to signals,
//   so existing code keeps working without modification.
// - localStorage persistence is wired automatically via effect().

// Bundled by Vite from node_modules so we serve from our own origin —
// CSP can drop esm.sh from script-src / connect-src.
import { computed, effect, signal } from '@preact/signals-core';

// ============================================================================
// Reactive signals
// ============================================================================

export const tasks = signal([]);
// The task the next focus session "logs to". Set via the focus-lock
// affordance on a task row; cleared on completion or by the user.
// Persisted across reloads — see loadPersisted / persistSnapshot.
export const activeTaskId = signal(null);
export const mode = signal('home');
export const activeSounds = signal([]);
export const universeStars = signal(0);
export const universeFocusMinutes = signal(0);
export const universeTasksCompleted = signal(0);

// ── Ambient v2 state ────────────────────────────────────────────────────────
// Per-track controls keyed by sound id. Each value:
//   { volume, eq: { low, mid, high }, pan, muted }
//   volume 0..1 | eq dB -12..+12 | pan -1..+1
export const ambientTracks = signal({});
export const ambientMaster = signal({ volume: 0.5 });
// User-saved mixes. Each: { id, name, createdAt, active: [soundId…], tracks: { [id]: {…} } }
export const ambientMixes = signal([]);
// Active sleep timer, or null. { endAt: epoch ms, duration: ms }
export const ambientSleepTimer = signal(null);
// Stream-theme id (Wave 5). null = 3D scene; a string id = the
// matching curated entry in STREAM_LIBRARY or a `custom:<videoId>` /
// `custom:soundcloud:<encodedUrl>` shorthand pasted by the user.
export const activeStreamId = signal(null);

// Re-export so other modules can subscribe without importing from CDN directly
export { computed, effect, signal };

// ============================================================================
// Legacy state object (backed by signals where applicable)
// ============================================================================
// This shape is preserved for backward compatibility. Reads of `state.tasks`,
// `state.mode`, `state.sounds.active`, etc. proxy to the underlying signals.

const universeShim = {
    level: 1,
    get stars() {
        return universeStars.value;
    },
    set stars(v) {
        universeStars.value = v;
    },
    get focusMinutes() {
        return universeFocusMinutes.value;
    },
    set focusMinutes(v) {
        universeFocusMinutes.value = v;
    },
    get tasksCompleted() {
        return universeTasksCompleted.value;
    },
    set tasksCompleted(v) {
        universeTasksCompleted.value = v;
    },
};

const soundsShim = {
    audio: null,
    sources: {},
    buffers: {},
    get active() {
        return activeSounds.value;
    },
    set active(v) {
        activeSounds.value = v;
    },
};

export const state = {
    get mode() {
        return mode.value;
    },
    set mode(v) {
        mode.value = v;
    },

    get tasks() {
        return tasks.value;
    },
    set tasks(v) {
        tasks.value = v;
    },

    currentMode: 'home',
    timerState: 'stopped',

    timer: {
        minutes: 25,
        seconds: 0,
        isRunning: false,
        interval: null,
        isBreak: false,
        isLongBreak: false,
        pomodoroCount: 0,
        transitioning: false,
        settings: {
            focusDuration: 25,
            shortBreakDuration: 5,
            longBreakDuration: 15,
        },
    },

    universe: universeShim,
    sounds: soundsShim,
};

export const appState = state;

// ============================================================================
// localStorage persistence
// ============================================================================

const STORAGE_KEY = 'fu_state_v1';

function loadPersisted() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (Array.isArray(data.tasks)) tasks.value = data.tasks;
        if (typeof data.activeTaskId === 'number' || data.activeTaskId === null) {
            activeTaskId.value = data.activeTaskId;
        }
        if (typeof data.mode === 'string') mode.value = data.mode;
        if (Array.isArray(data.activeSounds)) activeSounds.value = data.activeSounds;
        if (typeof data.universeStars === 'number') universeStars.value = data.universeStars;
        if (typeof data.universeFocusMinutes === 'number')
            universeFocusMinutes.value = data.universeFocusMinutes;
        if (typeof data.universeTasksCompleted === 'number')
            universeTasksCompleted.value = data.universeTasksCompleted;
        if (data.ambientTracks && typeof data.ambientTracks === 'object')
            ambientTracks.value = data.ambientTracks;
        if (data.ambientMaster && typeof data.ambientMaster === 'object')
            ambientMaster.value = data.ambientMaster;
        if (Array.isArray(data.ambientMixes)) ambientMixes.value = data.ambientMixes;
        if (typeof data.activeStreamId === 'string' || data.activeStreamId === null) {
            activeStreamId.value = data.activeStreamId;
        }
        // Sleep timer is intentionally NOT restored — ambient can't resume silently
        // on a new page load before a user gesture unlocks the AudioContext.
    } catch (e) {
        console.warn('[state] failed to load persisted state:', e);
    }
}

loadPersisted();

// Auto-persist whenever any tracked signal changes.
// Debounced: during interactions like slider drags the same signals fire
// 30-60 times/sec. The previous implementation ran JSON.stringify of the
// ENTIRE app state + a synchronous localStorage.setItem on every change,
// blocking the main thread per frame and compounding with other perf
// costs. Now the effect schedules one write per animation frame (and
// coalesces bursts), and the actual write happens in the idle time of a
// requestAnimationFrame — never inside a signal-setter call path.
let persistInitialized = false;
let persistScheduled = false;
let persistSnapshot = null;
function schedulePersist() {
    if (persistScheduled) return;
    persistScheduled = true;
    requestAnimationFrame(() => {
        persistScheduled = false;
        if (!persistSnapshot) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(persistSnapshot));
        } catch (e) {
            console.warn('[state] failed to persist:', e);
        }
    });
}
effect(() => {
    // Touch every persisted signal so the effect tracks them all.
    persistSnapshot = {
        tasks: tasks.value,
        activeTaskId: activeTaskId.value,
        mode: mode.value,
        activeSounds: activeSounds.value,
        universeStars: universeStars.value,
        universeFocusMinutes: universeFocusMinutes.value,
        universeTasksCompleted: universeTasksCompleted.value,
        ambientTracks: ambientTracks.value,
        ambientMaster: ambientMaster.value,
        ambientMixes: ambientMixes.value,
        activeStreamId: activeStreamId.value,
    };
    if (!persistInitialized) {
        persistInitialized = true;
        return;
    }
    schedulePersist();
});
// Flush on page hide so state isn't lost if the user closes the tab
// mid-interaction (pagehide is the modern, reliable choice — fires on
// back-forward cache eviction too, unlike beforeunload).
window.addEventListener('pagehide', () => {
    if (!persistSnapshot) return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(persistSnapshot));
    } catch (_) {}
});
