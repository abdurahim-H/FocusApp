// timer.js — Pomodoro state machine.
//
// Owns the focus / short-break / long-break loop, the visible timer
// digits, the session-complete UI hook, and the notification dispatch.
// Per-session analytics live in features/sessions.js, which we open at
// start and seal at end.
import { tasks, state } from '../core/state.js';
import { abandonCurrentSession, beginSession, endSession } from '../features/sessions.js';
import { recordSessionComplete } from '../features/statistics.js';
import { get as settingsGet } from '../ui/settings/store.js';
import { emitTimerParticles } from '../ui/timer-particles.js';
import { triggerFocusIntensity, triggerSessionCompleteUI } from '../ui/ui-effects.js';
import { trackSetInterval } from '../utils/cleanup.js';
import {
    areNotificationsEnabled,
    checkNotificationPermission,
    notifyBreakComplete,
    notifyFocusComplete,
    notifyPomodoroComplete,
    requestNotificationPermission,
} from '../utils/notifications.js';

export function updateTimerDisplay() {
    const minutes = String(state.timer.minutes).padStart(2, '0');
    const seconds = String(state.timer.seconds).padStart(2, '0');
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent = `${minutes}:${seconds}`;
    }
}

export function updateSessionDisplay() {
    const pomodoroCountElement = document.getElementById('pomodoroCount');
    const pomodoroTotalElement = document.getElementById('pomodoroTotal');
    const goal = settingsGet('timer.pomodoroGoal') ?? 4;

    if (pomodoroCountElement) {
        let currentSession = state.timer.isBreak
            ? state.timer.pomodoroCount
            : state.timer.pomodoroCount + 1;

        currentSession = Math.min(currentSession, goal);
        pomodoroCountElement.textContent = currentSession;
    }

    if (pomodoroTotalElement) {
        pomodoroTotalElement.textContent = String(goal);
    }
}

export function startTimer() {
    if (state.timer.isRunning || state.timer.transitioning) {
        return;
    }

    // Check notification permission status when starting timer
    checkNotificationPermission();

    if (state.timer.interval) {
        clearInterval(state.timer.interval);
        state.timer.interval = null;
    }

    const wasPaused = state.timer.minutes < state.timer.settings.focusDuration
        || state.timer.seconds > 0;

    state.timer.isRunning = true;
    state.timer.transitioning = false;
    state.timerState = 'running';
    state.currentMode = state.timer.isBreak ? 'break' : 'focus';
    state.mode = 'timer';

    // Open a session record on a fresh focus block. We deliberately
    // skip when this is a resume after pause (timer < target on entry)
    // — that session is already open and counting against the same
    // start time. Break blocks aren't recorded today; the column
    // exists in Postgres for when we add them later.
    if (!state.timer.isBreak && !wasPaused) {
        beginSession({
            kind: 'focus',
            targetDurationSeconds: state.timer.settings.focusDuration * 60,
        });
    }

    // Broadcast so ambient / other features can react (auto-start a mix, etc.)
    document.dispatchEvent(
        new CustomEvent('focus-timer:start', {
            detail: { isBreak: state.timer.isBreak, isLongBreak: !!state.timer.isLongBreak },
        })
    );

    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    if (startBtn) startBtn.classList.add('hidden');
    if (pauseBtn) pauseBtn.classList.remove('hidden');

    if (!state.timer.isBreak) {
        triggerFocusIntensity();
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

    updateSessionDisplay();
    updateTimerDisplay();

    // Tick once per second. The interval is created NOW, so the first
    // callback fires after exactly 1000ms — which is correct: the user just
    // started at 25:00, the first decrement should land at the 1-second mark.
    // Combined with the 150ms auto-start delay, the perceived gap after a
    // skip is ~1.15s instead of the old 2.2s.
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
        emitTimerParticles();
    }, 1000);
}

export function pauseTimer() {
    state.timer.isRunning = false;
    state.timer.transitioning = false;
    state.timerState = 'paused';
    clearInterval(state.timer.interval);
    state.timer.interval = null;

    if (state.timer.autoStartTimeout) {
        clearTimeout(state.timer.autoStartTimeout);
        state.timer.autoStartTimeout = null;
    }

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
    clearInterval(state.timer.interval);
    state.timer.interval = null;

    if (state.timer.autoStartTimeout) {
        clearTimeout(state.timer.autoStartTimeout);
        state.timer.autoStartTimeout = null;
    }

    // Drop the in-flight session record. We don't know the user's
    // intended end time, so synthesizing one would be dishonest data.
    abandonCurrentSession();

    clearAchievementQueue();

    if (state.timer.isBreak) {
        if (state.timer.isLongBreak) {
            state.timer.minutes = state.timer.settings.longBreakDuration;
        } else {
            state.timer.minutes = state.timer.settings.shortBreakDuration;
        }
    } else {
        state.timer.minutes = state.timer.settings.focusDuration;
    }

    state.timer.seconds = 0;
    updateTimerDisplay();
    updateSessionDisplay();

    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const skipBreakBtn = document.getElementById('skipBreakBtn');
    const skipFocusBtn = document.getElementById('skipFocusBtn');

    if (startBtn) {
        startBtn.classList.remove('hidden');
        if (state.timer.isBreak) {
            if (state.timer.isLongBreak) {
                startBtn.textContent = 'Start Long Break';
            } else {
                startBtn.textContent = 'Start Break';
            }
        } else {
            startBtn.textContent = 'Start Focus';
        }
    }
    if (pauseBtn) pauseBtn.classList.add('hidden');
    if (skipBreakBtn) skipBreakBtn.classList.add('hidden');
    if (skipFocusBtn) skipFocusBtn.classList.add('hidden');
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

// Enhanced session completion with better notification handling
export function completeSession() {
    if (!state.timer.isRunning || state.timer.transitioning) {
        return;
    }

    clearInterval(state.timer.interval);
    state.timer.interval = null;
    state.timer.isRunning = false;
    state.timer.transitioning = true;
    state.timerState = 'completed';

    // Broadcast so ambient / other features can react.
    document.dispatchEvent(
        new CustomEvent('focus-timer:end', {
            detail: { isBreak: state.timer.isBreak, isLongBreak: !!state.timer.isLongBreak },
        })
    );

    if (state.timer.isBreak) {
        // Break completed, start new focus session
        state.timer.isBreak = false;
        state.timer.isLongBreak = false;
        state.timer.minutes = state.timer.settings.focusDuration;
        state.timer.seconds = 0;
        state.currentMode = 'focus';
        const sessionType = document.getElementById('sessionType');
        if (sessionType) {
            sessionType.textContent = 'Focus Time';
        }

        if (state.timer.pomodoroCount >= 4) {
            state.timer.pomodoroCount = 0;
            showAchievement('New Cycle Started!', 'Beginning fresh pomodoro cycle');
        } else {
            showAchievement('Break Complete!', 'Ready for another focus session');
        }

        // Send break complete notification (if enabled)
        if (settingsGet('notifications.breakComplete') !== false) {
            sendNotificationSafely(() => notifyBreakComplete(state.timer.settings.focusDuration));
        }
    } else {
        // Focus session completed
        state.timer.pomodoroCount++;

        // Calculate ACTUAL elapsed seconds (not configured duration).
        // If user skipped at 24:45, remaining = 24*60+45 = 1485s,
        // configured = 25*60 = 1500s, elapsed = 15s.
        const configuredSeconds = state.timer.settings.focusDuration * 60;
        const remainingSeconds = state.timer.minutes * 60 + state.timer.seconds;
        const elapsedSeconds = configuredSeconds - remainingSeconds;

        state.universe.focusMinutes += Math.round(elapsedSeconds / 60);
        state.universe.stars += 1;

        // Aggregate counters (legacy stats UI).
        recordSessionComplete(elapsedSeconds);

        // Per-session record (analytics + cinematic + cloud sync).
        const taskList = tasks.value || [];
        endSession({
            elapsedSeconds,
            completed: elapsedSeconds >= configuredSeconds,
            taskCount: taskList.length,
            tasksCompleted: taskList.filter((t) => t.completed).length,
        });

        triggerSessionCompleteUI();

        const longBreakInterval = settingsGet('timer.longBreakInterval') ?? 4;
        if (state.timer.pomodoroCount % longBreakInterval === 0) {
            // Long break after N pomodoros
            state.timer.minutes = state.timer.settings.longBreakDuration;
            state.timer.isLongBreak = true;
            showAchievement(
                'Pomodoro Cycle Complete!',
                `Take a ${state.timer.settings.longBreakDuration}-minute long break`
            );

            // Send pomodoro cycle complete notification (if enabled)
            if (settingsGet('notifications.cycleComplete') !== false) {
                sendNotificationSafely(() =>
                    notifyPomodoroComplete(state.timer.settings.longBreakDuration)
                );
            }
        } else {
            // Short break
            state.timer.minutes = state.timer.settings.shortBreakDuration;
            state.timer.isLongBreak = false;
            showAchievement(
                'Focus Complete!',
                `Time for a ${state.timer.settings.shortBreakDuration}-minute break`
            );

            // Send focus complete notification (if enabled)
            if (settingsGet('notifications.focusComplete') !== false) {
                sendNotificationSafely(() =>
                    notifyFocusComplete(state.timer.settings.shortBreakDuration, false)
                );
            }
        }

        state.timer.isBreak = true;
        state.timer.seconds = 0;
        state.currentMode = 'break';
        const sessionType = document.getElementById('sessionType');
        if (sessionType) {
            sessionType.textContent = 'Break Time';
        }
    }

    updateTimerDisplay();
    updateSessionDisplay();
    updateUniverseStats();

    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const skipBreakBtn = document.getElementById('skipBreakBtn');
    const skipFocusBtn = document.getElementById('skipFocusBtn');

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

    // Auto-start next session — user-configurable via Settings > Timer > Flow.
    // If disabled, we just clear the transitioning flag and wait for a manual
    // click on Start.
    const autoStart = settingsGet('timer.autoStart') !== false;
    const delay = settingsGet('timer.autoStartDelay') ?? 150;
    if (autoStart) {
        state.timer.autoStartTimeout = setTimeout(() => {
            state.timer.transitioning = false;
            startTimer();
        }, delay);
    } else {
        state.timer.transitioning = false;
        const startBtn = document.getElementById('startBtn');
        if (startBtn) startBtn.classList.remove('hidden');
    }
}

/** Fire-and-forget notification dispatcher. Requests permission lazily
 *  the first time we need to ping the user, then calls the typed
 *  notify* helper. All failures (denied, blocked by browser, etc.) are
 *  silent — the in-app banner is the user-visible signal of session
 *  completion; OS notifications are a best-effort bonus. */
function sendNotificationSafely(notificationFunction) {
    try {
        if (!areNotificationsEnabled()) {
            requestNotificationPermission()
                .then((granted) => {
                    if (granted) notificationFunction();
                })
                .catch((error) => {
                    console.error('Failed to request notification permission:', error);
                });
            return;
        }
        notificationFunction();
    } catch (error) {
        console.error('Failed to send notification:', error);
    }
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

// Achievement notification queue system
let achievementQueue = [];
let currentAchievementTimeout = null;
let isShowingAchievement = false;

export function showAchievement(title, desc) {
    achievementQueue.push({ title, desc });

    if (!isShowingAchievement) {
        processAchievementQueue();
    }
}

function processAchievementQueue() {
    if (achievementQueue.length === 0) {
        isShowingAchievement = false;
        return;
    }

    isShowingAchievement = true;
    const achievement = document.getElementById('achievement');
    const titleEl = document.getElementById('achievementTitle');
    const descEl = document.getElementById('achievementDesc');
    const { title, desc } = achievementQueue.shift();

    // Achievement UI was removed from index.html — null-guard so the missing
    // DOM doesn't throw and abort the caller (which used to freeze the timer
    // mid-completeSession when Skip Focus was pressed).
    if (!achievement || !titleEl || !descEl) {
        isShowingAchievement = false;
        return;
    }

    titleEl.textContent = title;
    descEl.textContent = desc;

    if (currentAchievementTimeout) {
        clearTimeout(currentAchievementTimeout);
    }

    achievement.classList.add('show');

    currentAchievementTimeout = setTimeout(() => {
        achievement.classList.remove('show');

        setTimeout(() => {
            processAchievementQueue();
        }, 500);
    }, 3000);
}

export function clearAchievementQueue() {
    achievementQueue = [];
    if (currentAchievementTimeout) {
        clearTimeout(currentAchievementTimeout);
        currentAchievementTimeout = null;
    }
    isShowingAchievement = false;

    const achievement = document.getElementById('achievement');
    if (achievement) {
        achievement.classList.remove('show');
    }
}

// Date and Time
export async function updateDateTime() {
    const now = new Date();
    // Read time format preference from settings store (defaults to '12h').
    let hour12 = true;
    try {
        const { get } = await import('../ui/settings/store.js');
        hour12 = get('timer.timeFormat') !== '24h';
    } catch {
        /* store not ready yet — use default */
    }
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12,
    };
    const dateTimeElement = document.getElementById('dateTime');
    if (dateTimeElement) {
        dateTimeElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

// Complete reset of Pomodoro cycle
export function resetSession() {
    state.timer.isRunning = false;
    state.timer.transitioning = false;
    state.timerState = 'stopped';

    if (state.timer.interval) {
        clearInterval(state.timer.interval);
        state.timer.interval = null;
    }

    if (state.timer.autoStartTimeout) {
        clearTimeout(state.timer.autoStartTimeout);
        state.timer.autoStartTimeout = null;
    }

    clearAchievementQueue();

    state.timer.pomodoroCount = 0;
    state.timer.isBreak = false;
    state.timer.isLongBreak = false;
    state.timer.minutes = state.timer.settings.focusDuration;
    state.timer.seconds = 0;
    state.currentMode = 'focus';

    updateTimerDisplay();
    updateSessionDisplay();

    const sessionType = document.getElementById('sessionType');
    if (sessionType) {
        sessionType.textContent = 'Focus Time';
    }

    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const skipBreakBtn = document.getElementById('skipBreakBtn');
    const skipFocusBtn = document.getElementById('skipFocusBtn');

    if (startBtn) {
        startBtn.classList.remove('hidden');
        startBtn.textContent = 'Start Focus';
    }
    if (pauseBtn) pauseBtn.classList.add('hidden');
    if (skipBreakBtn) skipBreakBtn.classList.add('hidden');
    if (skipFocusBtn) skipFocusBtn.classList.add('hidden');

    showAchievement('Session Reset!', 'Starting fresh with a new Pomodoro cycle');
}

