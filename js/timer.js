/**
 * FIXED Timer Management System
 * Enhanced with better notification handling and debugging
 */
import { state } from './state.js';
import { triggerFocusIntensification } from './blackhole.js';
import { triggerFocusIntensity, triggerSessionCompleteUI, triggerBlackHoleApproachUI } from './ui-effects.js';
import { trackSetInterval } from './cleanup.js';
import { 
    notifyFocusComplete, 
    notifyBreakComplete, 
    notifyPomodoroComplete,
    areNotificationsEnabled,
    requestNotificationPermission,
    checkNotificationPermission
} from './notifications.js';

// Debug flag for notification testing
const DEBUG_NOTIFICATIONS = true;

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
    
    if (pomodoroCountElement) {
        let currentSession = state.timer.isBreak 
            ? state.timer.pomodoroCount
            : state.timer.pomodoroCount + 1;
        
        currentSession = Math.min(currentSession, 4);
        pomodoroCountElement.textContent = currentSession;
    }
    
    if (pomodoroTotalElement) {
        pomodoroTotalElement.textContent = '4';
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
    
    state.timer.isRunning = true;
    state.timer.transitioning = false;
    state.timerState = 'running';
    state.currentMode = state.timer.isBreak ? 'break' : 'focus';
    state.mode = 'timer';

    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    if (startBtn) startBtn.classList.add('hidden');
    if (pauseBtn) pauseBtn.classList.remove('hidden');

    if (!state.timer.isBreak) {
        triggerFocusIntensification();
        triggerFocusIntensity();
    } else {
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

    if (DEBUG_NOTIFICATIONS) {
        console.log('🔔 Session completed, checking notification status...');
        console.log('📱 Notifications enabled:', areNotificationsEnabled());
        console.log('📊 Current session type:', state.timer.isBreak ? 'break' : 'focus');
    }

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
        
        // Send break complete notification
        sendNotificationSafely(() => 
            notifyBreakComplete(state.timer.settings.focusDuration)
        );
        
    } else {
        // Focus session completed
        state.timer.pomodoroCount++;
        state.universe.focusMinutes += state.timer.settings.focusDuration;
        state.universe.stars += 1;

        triggerSessionCompleteUI();

        if (state.timer.pomodoroCount % 4 === 0) {
            // Long break after 4 pomodoros
            state.timer.minutes = state.timer.settings.longBreakDuration;
            state.timer.isLongBreak = true;
            showAchievement('Pomodoro Cycle Complete!', `Take a ${state.timer.settings.longBreakDuration}-minute long break`);
            
            // Send pomodoro cycle complete notification
            sendNotificationSafely(() => 
                notifyPomodoroComplete(state.timer.settings.longBreakDuration)
            );
            
        } else {
            // Short break
            state.timer.minutes = state.timer.settings.shortBreakDuration;
            state.timer.isLongBreak = false;
            showAchievement('Focus Complete!', `Time for a ${state.timer.settings.shortBreakDuration}-minute break`);
            
            // Send focus complete notification
            sendNotificationSafely(() => 
                notifyFocusComplete(state.timer.settings.shortBreakDuration, false)
            );
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

    // Auto-start next session
    state.timer.autoStartTimeout = setTimeout(() => {
        state.timer.transitioning = false;
        startTimer();
    }, 1200);
}

/**
 * Safely send notifications with proper error handling and debugging
 */
function sendNotificationSafely(notificationFunction) {
    try {
        // Check if notifications are enabled
        if (!areNotificationsEnabled()) {
            if (DEBUG_NOTIFICATIONS) {
                console.log('⚠️ Notifications not enabled, attempting to request permission...');
            }
            
            // Try to request permission if not already granted
            requestNotificationPermission().then(granted => {
                if (granted) {
                    if (DEBUG_NOTIFICATIONS) {
                        console.log('✅ Permission granted, sending notification...');
                    }
                    const notification = notificationFunction();
                    if (notification && DEBUG_NOTIFICATIONS) {
                        console.log('📤 Notification sent successfully');
                    }
                } else {
                    if (DEBUG_NOTIFICATIONS) {
                        console.log('❌ Permission denied, cannot send notification');
                    }
                }
            }).catch(error => {
                console.error('Failed to request notification permission:', error);
            });
            
            return;
        }
        
        // Send notification immediately if permission is already granted
        if (DEBUG_NOTIFICATIONS) {
            console.log('📤 Sending notification...');
        }
        
        const notification = notificationFunction();
        
        if (notification && DEBUG_NOTIFICATIONS) {
            console.log('✅ Notification created successfully');
            
            // Add additional debugging
            notification.onerror = function(error) {
                console.error('Notification error:', error);
            };
            
            notification.onshow = function() {
                console.log('📱 Notification displayed');
            };
            
            notification.onclose = function() {
                console.log('🔕 Notification closed');
            };
        }
        
    } catch (error) {
        console.error('Failed to send notification:', error);
        
        // Fallback: show browser alert if notifications fail completely
        if (DEBUG_NOTIFICATIONS) {
            console.log('💡 Falling back to browser alert...');
            setTimeout(() => {
                if (state.timer.isBreak) {
                    alert('Break time! Take a moment to rest.');
                } else {
                    alert('Focus session complete! Time for a break.');
                }
            }, 100);
        }
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
    const { title, desc } = achievementQueue.shift();
    
    document.getElementById('achievementTitle').textContent = title;
    document.getElementById('achievementDesc').textContent = desc;
    
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
    const dateTimeElement = document.getElementById('dateTime');
    if (dateTimeElement) {
        dateTimeElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

// Breathing animation
export function startBreathing() {
    const guide = document.getElementById('breathingGuide');
    if (!guide) return;
    
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

/**
 * Quick test function for debugging - sets timer to 5 seconds
 */
export function quickTimerTest() {
    console.log('🧪 Starting quick timer test (5 seconds)');
    
    const originalFocus = state.timer.settings.focusDuration;
    const originalBreak = state.timer.settings.shortBreakDuration;
    
    state.timer.settings.focusDuration = 1/12; // 5 seconds
    state.timer.settings.shortBreakDuration = 1/12; // 5 seconds for break too
    
    state.timer.minutes = 0;
    state.timer.seconds = 5;
    state.timer.isBreak = false;
    state.timer.isRunning = false;
    
    updateTimerDisplay();
    
    console.log('⏰ Timer set to 5 seconds. Click Start Focus to test notifications.');
    console.log('💡 Make sure to enable notifications first!');
    
    setTimeout(() => {
        state.timer.settings.focusDuration = originalFocus;
        state.timer.settings.shortBreakDuration = originalBreak;
        console.log('🔄 Timer settings restored to normal');
    }, 30000);
}

// Make test function available globally
if (typeof window !== 'undefined') {
    window.quickTimerTest = quickTimerTest;
    window.debugNotifications = () => {
        console.log('🔔 Notification Debug Info:');
        console.log('- Supported:', 'Notification' in window);
        console.log('- Permission:', Notification.permission);
        console.log('- Enabled:', areNotificationsEnabled());
        console.log('💡 Try: testNotification(), requestNotificationPermissionTest()');
    };
}