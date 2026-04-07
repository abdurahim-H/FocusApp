// state.js
//
// Phase 1 foundation: reactive state via @preact/signals-core (vanilla, no build step).
// - tasks, mode, activeSounds, universe stats are signals (reactive).
// - The legacy `state` object is preserved with getters/setters that proxy to signals,
//   so existing code keeps working without modification.
// - localStorage persistence is wired automatically via effect().

import { signal, effect, computed } from 'https://esm.sh/@preact/signals-core@1.8.0';

// ============================================================================
// Reactive signals
// ============================================================================

export const tasks = signal([]);
export const mode = signal('home');
export const activeSounds = signal([]);
export const universeStars = signal(0);
export const universeFocusMinutes = signal(0);
export const universeTasksCompleted = signal(0);

// Re-export so other modules can subscribe without importing from CDN directly
export { signal, effect, computed };

// ============================================================================
// Legacy state object (backed by signals where applicable)
// ============================================================================
// This shape is preserved for backward compatibility. Reads of `state.tasks`,
// `state.mode`, `state.sounds.active`, etc. proxy to the underlying signals.

const universeShim = {
    level: 1,
    get stars() { return universeStars.value; },
    set stars(v) { universeStars.value = v; },
    get focusMinutes() { return universeFocusMinutes.value; },
    set focusMinutes(v) { universeFocusMinutes.value = v; },
    get tasksCompleted() { return universeTasksCompleted.value; },
    set tasksCompleted(v) { universeTasksCompleted.value = v; },
};

const soundsShim = {
    audio: null,
    sources: {},
    buffers: {},
    get active() { return activeSounds.value; },
    set active(v) { activeSounds.value = v; },
};

export const state = {
    get mode() { return mode.value; },
    set mode(v) { mode.value = v; },

    get tasks() { return tasks.value; },
    set tasks(v) { tasks.value = v; },

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
            longBreakDuration: 15
        }
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
        if (typeof data.mode === 'string') mode.value = data.mode;
        if (Array.isArray(data.activeSounds)) activeSounds.value = data.activeSounds;
        if (typeof data.universeStars === 'number') universeStars.value = data.universeStars;
        if (typeof data.universeFocusMinutes === 'number') universeFocusMinutes.value = data.universeFocusMinutes;
        if (typeof data.universeTasksCompleted === 'number') universeTasksCompleted.value = data.universeTasksCompleted;
    } catch (e) {
        console.warn('[state] failed to load persisted state:', e);
    }
}

loadPersisted();

// Auto-persist whenever any tracked signal changes.
// The first run subscribes; subsequent runs write to storage.
let persistInitialized = false;
effect(() => {
    // Touch every persisted signal so the effect tracks them all
    const snapshot = {
        tasks: tasks.value,
        mode: mode.value,
        activeSounds: activeSounds.value,
        universeStars: universeStars.value,
        universeFocusMinutes: universeFocusMinutes.value,
        universeTasksCompleted: universeTasksCompleted.value,
    };
    if (!persistInitialized) {
        persistInitialized = true;
        return;
    }
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) {
        console.warn('[state] failed to persist:', e);
    }
});
