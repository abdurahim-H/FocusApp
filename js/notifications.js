/**
 * FIXED Browser Notifications System
 * Handles desktop notifications for session completion even when tab is inactive
 */

let notificationPermission = 'default';

/**
 * Initialize notification system and request permission
 */
export function initNotifications() {
    console.log('🔔 Initializing notification system...');
    
    if ('Notification' in window) {
        notificationPermission = Notification.permission;
        console.log('📱 Current notification permission:', notificationPermission);
        
        if (notificationPermission === 'default') {
            console.log('⚠️ Permission is default, will request on user interaction');
        }
        
        console.log('✅ Notification system initialized, permission:', notificationPermission);
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
        try {
            new Notification('Cosmic Focus', {
                body: 'Notifications are now enabled! You\'ll be notified when sessions complete.',
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: 'test-notification',
                silent: false,
                requireInteraction: false
            });
        } catch (error) {
            console.error('Failed to create test notification:', error);
        }
    }
}

/**
 * Show notification when focus session completes
 */
export function notifyFocusComplete(breakDuration, isLongBreak = false) {
    console.log('🔔 Attempting to show focus complete notification', { 
        breakDuration, 
        isLongBreak, 
        permission: notificationPermission 
    });
    
    if (notificationPermission !== 'granted') {
        console.warn('❌ Cannot show notification - permission not granted:', notificationPermission);
        return;
    }

    const title = 'Focus Session Complete! 🎯';
    const body = isLongBreak 
        ? `Great work! Time for a ${breakDuration}-minute long break. You've earned it!`
        : `Well done! Take a ${breakDuration}-minute break to recharge.`;
    
    console.log('✅ Creating notification:', { title, body });
    
    try {
        const notification = new Notification(title, {
            body: body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'focus-complete',
            silent: false,
            requireInteraction: true,
            timestamp: Date.now()
        });

        // Handle notification clicks
        notification.onclick = function() {
            console.log('📱 Focus complete notification clicked');
            window.focus(); // Bring the app window to front
            this.close();
        };

        // Auto-close after 15 seconds if user doesn't interact
        setTimeout(() => {
            notification.close();
        }, 15000);
        
        return notification;
    } catch (error) {
        console.error('Failed to create focus complete notification:', error);
        return null;
    }
}

/**
 * Show notification when break completes
 */
export function notifyBreakComplete(focusDuration) {
    if (notificationPermission !== 'granted') {
        console.warn('❌ Cannot show break complete notification - permission not granted');
        return;
    }

    const title = 'Break Complete! ⚡';
    const body = `Break time is over. Ready to start a ${focusDuration}-minute focus session?`;
    
    try {
        const notification = new Notification(title, {
            body: body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'break-complete',
            silent: false,
            requireInteraction: true,
            timestamp: Date.now()
        });

        // Handle notification clicks
        notification.onclick = function() {
            console.log('📱 Break complete notification clicked');
            window.focus(); // Bring the app window to front
            this.close();
        };

        // Auto-close after 15 seconds if user doesn't interact
        setTimeout(() => {
            notification.close();
        }, 15000);
        
        return notification;
    } catch (error) {
        console.error('Failed to create break complete notification:', error);
        return null;
    }
}

/**
 * Show notification when pomodoro cycle completes (4 sessions done)
 */
export function notifyPomodoroComplete(longBreakDuration) {
    if (notificationPermission !== 'granted') {
        console.warn('❌ Cannot show pomodoro complete notification - permission not granted');
        return;
    }

    const title = 'Pomodoro Cycle Complete! 🏆';
    const body = `Amazing! You've completed 4 focus sessions. Take a well-deserved ${longBreakDuration}-minute long break.`;
    
    try {
        const notification = new Notification(title, {
            body: body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'pomodoro-complete',
            silent: false,
            requireInteraction: true,
            vibrate: [200, 100, 200], // Vibration pattern for mobile devices
            timestamp: Date.now()
        });

        // Handle notification clicks
        notification.onclick = function() {
            console.log('📱 Pomodoro complete notification clicked');
            window.focus();
            this.close();
        };

        // Keep this notification longer since it's a major milestone
        setTimeout(() => {
            notification.close();
        }, 20000);
        
        return notification;
    } catch (error) {
        console.error('Failed to create pomodoro complete notification:', error);
        return null;
    }
}

/**
 * Show notification for meditation session milestones
 */
export function notifyMeditationMilestone(minutes) {
    if (notificationPermission !== 'granted') return;

    const title = 'Meditation Milestone! 🧘';
    const body = `You've been meditating for ${minutes} minutes. Keep going!`;
    
    try {
        const notification = new Notification(title, {
            body: body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'meditation-milestone',
            silent: true, // Silent for meditation
            requireInteraction: false,
            timestamp: Date.now()
        });

        // Auto-close quickly for meditation
        setTimeout(() => {
            notification.close();
        }, 3000);
        
        return notification;
    } catch (error) {
        console.error('Failed to create meditation milestone notification:', error);
        return null;
    }
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
        return false;
    }

    if (notificationPermission === 'default') {
        // Custom confirmation dialog
        const shouldAsk = confirm(
            'Enable desktop notifications to get alerts when your focus sessions and breaks complete, even when this tab is not active?'
        );
        
        if (shouldAsk) {
            return requestNotificationPermission();
        }
    }
    
    return Promise.resolve(notificationPermission === 'granted');
}

/**
 * Test notification function - can be called from browser console
 */
export function testNotification() {
    console.log('🧪 Testing notification...');
    
    if (notificationPermission === 'granted') {
        try {
            const notification = new Notification('Test Notification 🧪', {
                body: 'This is a test notification to verify the system is working!',
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: 'test',
                silent: false,
                timestamp: Date.now()
            });
            
            notification.onclick = function() {
                console.log('Test notification clicked');
                this.close();
            };
            
            setTimeout(() => notification.close(), 5000);
            console.log('✅ Test notification sent');
            return notification;
        } catch (error) {
            console.error('Failed to create test notification:', error);
            return null;
        }
    } else {
        console.warn('❌ Cannot send test notification, permission:', notificationPermission);
        console.log('💡 Try calling requestNotificationPermission() first');
        return null;
    }
}

/**
 * Enhanced notification permission checker that updates internal state
 */
export function checkNotificationPermission() {
    if ('Notification' in window) {
        notificationPermission = Notification.permission;
        console.log('🔄 Updated notification permission:', notificationPermission);
        return notificationPermission;
    }
    return 'default';
}

// Make test functions available globally for console testing
if (typeof window !== 'undefined') {
    window.testNotification = testNotification;
    window.requestNotificationPermissionTest = requestNotificationPermission;
    window.checkNotificationPermission = checkNotificationPermission;
}