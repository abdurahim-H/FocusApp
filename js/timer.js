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

export function startTimer() {
    state.timer.isRunning = true;
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

    const skipBtn = document.getElementById('skipBtn');
    if (skipBtn) {
        if (state.timer.isBreak) {
            skipBtn.classList.remove('hidden');
        } else {
            skipBtn.classList.add('hidden');
        }
    }

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
    state.timerState = 'paused'; // Update for black hole effects
    clearInterval(state.timer.interval);

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
    state.timerState = 'stopped';
    // Fix: Don't force mode change here - let navigation handle it
    clearInterval(state.timer.interval);

    if (state.timer.isBreak) {
        state.timer.minutes = state.timer.settings.shortBreak;
    } else {
        state.timer.minutes = state.timer.settings.focusDuration;
    }

    state.timer.seconds = 0;
    updateTimerDisplay();

    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const skipBtn = document.getElementById('skipBtn');

    if (startBtn) {
        startBtn.classList.remove('hidden');
        startBtn.textContent = 'Start Focus';
    }
    if (pauseBtn) {
        pauseBtn.classList.add('hidden');
    }
    if (skipBtn) {
        skipBtn.classList.add('hidden');
    }
}

export function skipBreak() {
    if (state.timer.isBreak) {
        completeSession();
    }
}

// --- MODIFIED FUNCTION FOR AUTO-SESSION SWITCHING & PROPER MODE ---
export function completeSession() {
    clearInterval(state.timer.interval);
    state.timer.isRunning = false;
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
        showAchievement('Break Complete!', 'Ready for another focus session');
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
            showAchievement('Pomodoro Cycle Complete!', 'Take a long break');
        } else {
            // Short break
            state.timer.minutes = state.timer.settings.shortBreak;
            showAchievement('Focus Complete!', 'Time for a short break');
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
    updateUniverseStats();

    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const skipBtn = document.getElementById('skipBtn');

    // Hide start button during auto transition
    if (startBtn) {
        startBtn.classList.add('hidden');
        startBtn.textContent = state.timer.isBreak ? 'Start Break' : 'Start Focus';
    }
    if (pauseBtn) {
        pauseBtn.classList.remove('hidden');
    }
    if (skipBtn) {
        if (state.timer.isBreak) {
            skipBtn.classList.remove('hidden');
        } else {
            skipBtn.classList.add('hidden');
        }
    }

    // --- AUTO-START NEXT SESSION ---
    setTimeout(() => {
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