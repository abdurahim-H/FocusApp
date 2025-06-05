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

export const appState = state;
