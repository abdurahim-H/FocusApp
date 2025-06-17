/**
 * Browser Notifications System
 * Handles desktop notifications for session completion even when tab is inactive
 */

let notificationPermission = 'default';

/**
 * Initialize notification system and request permission
 */
export function initNotifications() {
    if ('Notification' in window) {
        notificationPermission = Notification.permission;
        
        if (notificationPermission === 'default') {
            // Request permission on first interaction
            requestNotificationPermission();
        }
        
        console.log('🔔 Notification system initialized, permission:', notificationPermission);
    } else {
        console.warn('⚠️ Browser notifications not supported');
    }
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('⚠️ This browser does not support notifications');
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        notificationPermission = permission;
        
        if (permission === 'granted') {
            console.log('✅ Notification permission granted');
            // Show a test notification to confirm it works
            showTestNotification();
            return true;
        } else {
            console.log('❌ Notification permission denied');
            return false;
        }
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
    }
}

/**
 * Show a test notification to verify notifications are working
 */
function showTestNotification() {
    if (notificationPermission === 'granted') {
        new Notification('Productivity Spaceship', {
            body: 'Notifications are now enabled! You\'ll be notified when sessions complete.',
            icon: '/favicon.ico', // Adjust path as needed
            badge: '/favicon.ico',
            tag: 'test-notification',
            silent: false,
            requireInteraction: false
        });
    }
}

/**
 * Show notification when focus session completes
 */
export function notifyFocusComplete(breakDuration, isLongBreak = false) {
    if (notificationPermission !== 'granted') return;

    const title = isLongBreak ? 'Focus Session Complete! 🎯' : 'Focus Session Complete! 🎯';
    const body = isLongBreak 
        ? `Great work! Time for a ${breakDuration}-minute long break. You've earned it!`
        : `Well done! Take a ${breakDuration}-minute break to recharge.`;
    
    const notification = new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'focus-complete',
        silent: false,
        requireInteraction: true, // Keep notification until user interacts
        actions: [
            {
                action: 'start-break',
                title: 'Start Break'
            },
            {
                action: 'skip-break',
                title: 'Skip Break'
            }
        ]
    });

    // Handle notification clicks
    notification.onclick = function() {
        window.focus(); // Bring the app window to front
        this.close();
    };

    // Auto-close after 10 seconds if user doesn't interact
    setTimeout(() => {
        notification.close();
    }, 10000);
}

/**
 * Show notification when break completes
 */
export function notifyBreakComplete(focusDuration) {
    if (notificationPermission !== 'granted') return;

    const title = 'Break Complete! ⚡';
    const body = `Break time is over. Ready to start a ${focusDuration}-minute focus session?`;
    
    const notification = new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'break-complete',
        silent: false,
        requireInteraction: true,
        actions: [
            {
                action: 'start-focus',
                title: 'Start Focus'
            },
            {
                action: 'extend-break',
                title: 'Extend Break'
            }
        ]
    });

    // Handle notification clicks
    notification.onclick = function() {
        window.focus(); // Bring the app window to front
        this.close();
    };

    // Auto-close after 10 seconds if user doesn't interact
    setTimeout(() => {
        notification.close();
    }, 10000);
}

/**
 * Show notification when pomodoro cycle completes (4 sessions done)
 */
export function notifyPomodoroComplete(longBreakDuration) {
    if (notificationPermission !== 'granted') return;

    const title = 'Pomodoro Cycle Complete! 🏆';
    const body = `Amazing! You've completed 4 focus sessions. Take a well-deserved ${longBreakDuration}-minute long break.`;
    
    const notification = new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'pomodoro-complete',
        silent: false,
        requireInteraction: true,
        vibrate: [200, 100, 200], // Vibration pattern for mobile devices
        actions: [
            {
                action: 'start-long-break',
                title: 'Start Long Break'
            },
            {
                action: 'new-cycle',
                title: 'Start New Cycle'
            }
        ]
    });

    // Handle notification clicks
    notification.onclick = function() {
        window.focus();
        this.close();
    };

    // Keep this notification longer since it's a major milestone
    setTimeout(() => {
        notification.close();
    }, 15000);
}

/**
 * Show notification for meditation session milestones
 */
export function notifyMeditationMilestone(minutes) {
    if (notificationPermission !== 'granted') return;

    const title = 'Meditation Milestone! 🧘';
    const body = `You've been meditating for ${minutes} minutes. Keep going!`;
    
    const notification = new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'meditation-milestone',
        silent: true, // Silent for meditation
        requireInteraction: false
    });

    // Auto-close quickly for meditation
    setTimeout(() => {
        notification.close();
    }, 3000);
}

/**
 * Check if notifications are supported and permission granted
 */
export function areNotificationsEnabled() {
    return 'Notification' in window && notificationPermission === 'granted';
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission() {
    return notificationPermission;
}

/**
 * Show a prompt to enable notifications if not already enabled
 */
export function showNotificationPrompt() {
    if (!('Notification' in window)) {
        console.warn('⚠️ Browser notifications not supported');
        return;
    }

    if (notificationPermission === 'default') {
        // Could show a custom UI here asking user to enable notifications
        const shouldAsk = confirm(
            'Enable desktop notifications to get alerts when your focus sessions and breaks complete, even when this tab is not active?'
        );
        
        if (shouldAsk) {
            requestNotificationPermission();
        }
    }
}
