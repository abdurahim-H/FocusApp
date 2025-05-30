// Application State Management
export const state = {
    mode: 'home',
    currentMode: 'home', // Added for blackhole.js compatibility
    timerState: 'stopped', // Added for blackhole.js compatibility
    timer: {
        minutes: 25,
        seconds: 0,
        isRunning: false,
        interval: null,
        isBreak: false,
        pomodoroCount: 0,
        settings: {
            focusDuration: 25,
            shortBreak: 5,
            longBreak: 15
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
        active: null,
        audio: null
    }
};

// Export as appState alias for blackhole.js compatibility
export const appState = state;
