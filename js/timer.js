import { state } from './state.js';
import { triggerFocusIntensification } from './blackhole.js';
import { triggerFocusZoom, triggerSessionCompleteZoom, approachBlackHole } from './camera-effects.js';
import { triggerFocusIntensity, triggerSessionCompleteUI, triggerBlackHoleApproachUI } from './ui-effects.js';
import { trackSetInterval } from './cleanup.js';

export function updateTimerDisplay() {
    const minutes = String(state.timer.minutes).padStart(2, '0');
    const seconds = String(state.timer.seconds).padStart(2, '0');
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent = `${minutes}:${seconds}`;
    }
}

// Update session counter display
export function updateSessionDisplay() {
    const pomodoroCountElement = document.getElementById('pomodoroCount');
    const pomodoroTotalElement = document.getElementById('pomodoroTotal');
    
    if (pomodoroCountElement) {
        // Show current session number (1-based)
        let currentSession = state.timer.isBreak 
            ? state.timer.pomodoroCount  // If on break, we've completed this many sessions
            : state.timer.pomodoroCount + 1;  // If focusing, we're working on the next session
        
        // Ensure we never display more than 4 sessions
        currentSession = Math.min(currentSession, 4);
        
        pomodoroCountElement.textContent = currentSession;
    }
    
    if (pomodoroTotalElement) {
        pomodoroTotalElement.textContent = '4';  // Standard pomodoro cycle is 4 sessions
    }
}

export function startTimer() {
    // Prevent starting if already running or in transition
    if (state.timer.isRunning || state.timer.transitioning) {
        return;
    }
    
    // Clear any existing interval first
    if (state.timer.interval) {
        clearInterval(state.timer.interval);
        state.timer.interval = null;
    }
    
    state.timer.isRunning = true;
    state.timer.transitioning = false;
    state.timerState = 'running';
    // Fix: Keep both state properties in sync
    state.currentMode = state.timer.isBreak ? 'break' : 'focus';
    state.mode = 'timer'; // Ensure navigation knows we're in timer mode

    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    if (startBtn) startBtn.classList.add('hidden');
    if (pauseBtn) pauseBtn.classList.remove('hidden');

    if (!state.timer.isBreak) {
        triggerFocusIntensification();
        triggerFocusZoom();
        triggerFocusIntensity();
    } else {
        approachBlackHole();
        triggerBlackHoleApproachUI();
    }

    const skipBreakBtn = document.getElementById('skipBreakBtn');
    const skipFocusBtn = document.getElementById('skipFocusBtn');
    if (skipBreakBtn && skipFocusBtn) {
        if (state.timer.isBreak) {
            skipBreakBtn.classList.remove('hidden');
            skipFocusBtn.classList.add('hidden');
        } else {
            skipBreakBtn.classList.add('hidden');
            skipFocusBtn.classList.remove('hidden');
        }
    }

    // Update session display when starting timer
    updateSessionDisplay();

    state.timer.interval = trackSetInterval(() => {
        if (state.timer.seconds === 0) {
            if (state.timer.minutes === 0) {
                completeSession();
                return;
            }
            state.timer.minutes--;
            state.timer.seconds = 59;
        } else {
            state.timer.seconds--;
        }
        updateTimerDisplay();
    }, 1000);
}

export function pauseTimer() {
    state.timer.isRunning = false;
    state.timer.transitioning = false;
    state.timerState = 'paused'; // Update for black hole effects
    clearInterval(state.timer.interval);
    state.timer.interval = null;

    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    if (startBtn) {
        startBtn.classList.remove('hidden');
        startBtn.textContent = 'Resume';
    }
    if (pauseBtn) {
        pauseBtn.classList.add('hidden');
    }
}

export function resetTimer() {
    state.timer.isRunning = false;
    state.timer.transitioning = false;
    state.timerState = 'stopped';
    // Fix: Don't force mode change here - let navigation handle it
    clearInterval(state.timer.interval);
    state.timer.interval = null;

    if (state.timer.isBreak) {
        state.timer.minutes = state.timer.settings.shortBreak;
    } else {
        state.timer.minutes = state.timer.settings.focusDuration;
    }

    state.timer.seconds = 0;
    updateTimerDisplay();
    updateSessionDisplay(); // Update session counter on reset

    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const skipBreakBtn = document.getElementById('skipBreakBtn');
    const skipFocusBtn = document.getElementById('skipFocusBtn');

    if (startBtn) {
        startBtn.classList.remove('hidden');
        startBtn.textContent = 'Start Focus';
    }
    if (pauseBtn) {
        pauseBtn.classList.add('hidden');
    }
    if (skipBreakBtn) {
        skipBreakBtn.classList.add('hidden');
    }
    if (skipFocusBtn) {
        skipFocusBtn.classList.add('hidden');
    }
}

export function skipBreak() {
    if (state.timer.isBreak && state.timer.isRunning) {
        completeSession();
    }
}

export function skipFocus() {
    if (!state.timer.isBreak && state.timer.isRunning) {
        completeSession();
    }
}

// --- MODIFIED FUNCTION FOR AUTO-SESSION SWITCHING & PROPER MODE ---
export function completeSession() {
    // Prevent multiple simultaneous calls
    if (!state.timer.isRunning || state.timer.transitioning) {
        return;
    }
    
    clearInterval(state.timer.interval);
    state.timer.interval = null;
    state.timer.isRunning = false;
    state.timer.transitioning = true;
    state.timerState = 'completed'; // Update state

    if (state.timer.isBreak) {
        // Break completed, start new focus session
        state.timer.isBreak = false;
        state.timer.minutes = state.timer.settings.focusDuration;
        state.timer.seconds = 0;
        state.currentMode = 'focus'; // Corrected: set to focus mode
        const sessionType = document.getElementById('sessionType');
        if (sessionType) {
            sessionType.textContent = 'Focus Time';
        }
        
        // Check if we just completed a long break (after 4th session)
        if (state.timer.pomodoroCount >= 4) {
            // Reset the cycle after completing long break
            state.timer.pomodoroCount = 0;
            showAchievement('New Cycle Started!', 'Beginning fresh pomodoro cycle');
        } else {
            showAchievement('Break Complete!', 'Ready for another focus session');
        }
    } else {
        // Focus session completed
        state.timer.pomodoroCount++;
        state.universe.focusMinutes += state.timer.settings.focusDuration;
        state.universe.stars += 1;

        // Trigger spectacular session completion effects
        triggerSessionCompleteZoom();
        triggerSessionCompleteUI();

        if (state.timer.pomodoroCount % 4 === 0) {
            // Long break after 4 pomodoros
            state.timer.minutes = state.timer.settings.longBreak;
            showAchievement('Pomodoro Cycle Complete!', `Take a ${state.timer.settings.longBreak}-minute long break`);
        } else {
            // Short break
            state.timer.minutes = state.timer.settings.shortBreak;
            showAchievement('Focus Complete!', `Time for a ${state.timer.settings.shortBreak}-minute break`);
        }

        state.timer.isBreak = true;
        state.timer.seconds = 0;
        state.currentMode = 'break'; // Corrected: set to break/ambient mode
        const sessionType = document.getElementById('sessionType');
        if (sessionType) {
            sessionType.textContent = 'Break Time';
        }
    }

    updateTimerDisplay();
    updateSessionDisplay(); // Update session counter
    updateUniverseStats();

    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const skipBreakBtn = document.getElementById('skipBreakBtn');
    const skipFocusBtn = document.getElementById('skipFocusBtn');

    // Hide start button during auto transition
    if (startBtn) {
        startBtn.classList.add('hidden');
        startBtn.textContent = state.timer.isBreak ? 'Start Break' : 'Start Focus';
    }
    if (pauseBtn) {
        pauseBtn.classList.remove('hidden');
    }
    if (skipBreakBtn && skipFocusBtn) {
        if (state.timer.isBreak) {
            skipBreakBtn.classList.remove('hidden');
            skipFocusBtn.classList.add('hidden');
        } else {
            skipBreakBtn.classList.add('hidden');
            skipFocusBtn.classList.remove('hidden');
        }
    }

    // --- AUTO-START NEXT SESSION ---
    setTimeout(() => {
        state.timer.transitioning = false;
        startTimer();
    }, 1200); // 1.2 seconds for achievement to show, adjust as needed
}

// Update universe stats
export function updateUniverseStats() {
    const starsCount = document.getElementById('starsCount');
    const galaxyLevel = document.getElementById('galaxyLevel');
    const focusTime = document.getElementById('focusTime');
    const tasksComplete = document.getElementById('tasksComplete');

    if (starsCount) starsCount.textContent = state.universe.stars;
    if (galaxyLevel) galaxyLevel.textContent = state.universe.level;
    if (focusTime) focusTime.textContent = state.universe.focusMinutes;
    if (tasksComplete) tasksComplete.textContent = state.universe.tasksCompleted;
}

// Show achievement
export function showAchievement(title, desc) {
    const achievement = document.getElementById('achievement');
    document.getElementById('achievementTitle').textContent = title;
    document.getElementById('achievementDesc').textContent = desc;
    achievement.classList.add('show');
    setTimeout(() => {
        achievement.classList.remove('show');
    }, 3000);
}

// Date and Time
export function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    document.getElementById('dateTime').textContent = now.toLocaleDateString('en-US', options);
}

// Breathing animation
export function startBreathing() {
    const guide = document.getElementById('breathingGuide');
    let breathIn = true;

    setInterval(() => {
        if (breathIn) {
            guide.textContent = 'Breathe In...';
            guide.style.transform = 'scale(1.2)';
        } else {
            guide.textContent = 'Breathe Out...';
            guide.style.transform = 'scale(1)';
        }
        breathIn = !breathIn;
    }, 4000);
}