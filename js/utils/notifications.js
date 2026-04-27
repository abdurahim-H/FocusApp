// notifications.js — desktop notifications for session completion.
//
// The browser-native Notification API works even when the tab is
// backgrounded, which is the whole point: a focus session is most
// useful precisely when the user has the tab hidden. We never assume
// permission — we ask lazily on first relevant event, and if it's
// denied the in-app banner / mini-timer remain the user-visible signal.

let notificationPermission = 'default';

export function initNotifications() {
    if ('Notification' in window) {
        notificationPermission = Notification.permission;
    }
}

export async function requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    try {
        const permission = await Notification.requestPermission();
        notificationPermission = permission;
        if (permission === 'granted') {
            // One-time confirmation ping so the user can see the UI.
            try {
                new Notification('Cosmic Focus', {
                    body: "Notifications enabled — you'll get a ping when sessions complete.",
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                    tag: 'notifications-enabled',
                    silent: false,
                    requireInteraction: false,
                });
            } catch (_) {
                /* ignore — confirmation only */
            }
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
    }
}

export function notifyFocusComplete(breakDuration, isLongBreak = false) {
    if (notificationPermission !== 'granted') return;
    const title = 'Focus Session Complete! 🎯';
    const body = isLongBreak
        ? `Great work! Time for a ${breakDuration}-minute long break. You've earned it!`
        : `Well done! Take a ${breakDuration}-minute break to recharge.`;
    try {
        const notification = new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'focus-complete',
            silent: false,
            requireInteraction: true,
            timestamp: Date.now(),
        });
        notification.onclick = function () {
            window.focus();
            this.close();
        };
        setTimeout(() => notification.close(), 15000);
        return notification;
    } catch (error) {
        console.error('Failed to create focus complete notification:', error);
        return null;
    }
}

export function notifyBreakComplete(focusDuration) {
    if (notificationPermission !== 'granted') return;
    const title = 'Break Complete! ⚡';
    const body = `Break time is over. Ready to start a ${focusDuration}-minute focus session?`;
    try {
        const notification = new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'break-complete',
            silent: false,
            requireInteraction: true,
            timestamp: Date.now(),
        });
        notification.onclick = function () {
            window.focus();
            this.close();
        };
        setTimeout(() => notification.close(), 15000);
        return notification;
    } catch (error) {
        console.error('Failed to create break complete notification:', error);
        return null;
    }
}

export function notifyPomodoroComplete(longBreakDuration) {
    if (notificationPermission !== 'granted') return;
    const title = 'Pomodoro Cycle Complete! 🏆';
    const body = `Amazing! You've completed 4 focus sessions. Take a well-deserved ${longBreakDuration}-minute long break.`;
    try {
        const notification = new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'pomodoro-complete',
            silent: false,
            requireInteraction: true,
            vibrate: [200, 100, 200],
            timestamp: Date.now(),
        });
        notification.onclick = function () {
            window.focus();
            this.close();
        };
        setTimeout(() => notification.close(), 20000);
        return notification;
    } catch (error) {
        console.error('Failed to create pomodoro complete notification:', error);
        return null;
    }
}

export function areNotificationsEnabled() {
    return 'Notification' in window && notificationPermission === 'granted';
}

/** Re-read the browser permission state. The user may grant or revoke
 *  notifications via browser chrome at any time without firing an
 *  event in our app, so we re-check on demand. */
export function checkNotificationPermission() {
    if ('Notification' in window) {
        notificationPermission = Notification.permission;
        return notificationPermission;
    }
    return 'default';
}
