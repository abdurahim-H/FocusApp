// state.js

export const state = {
    mode: 'home',
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
    universe: {
        stars: 0,
        level: 1,
        focusMinutes: 0,
        tasksCompleted: 0
    },
    tasks: [],
    sounds: {
        active: [], // Array to track multiple active sounds
        audio: null,
        sources: {}, // Store audio sources for each sound type
        buffers: {} // Pre-loaded audio buffers
    }
};

export const appState = state;
