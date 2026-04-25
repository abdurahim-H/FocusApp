// notification-banner.js
//
// Phase 5E: Inline notification permission banner in Focus mode.
// Replaces the crude confirm() dialog with a non-blocking, themed banner.
// Shows only when Notification.permission === 'default' (not yet asked)
// and user hasn't dismissed it this session.

import { effect, mode } from '../core/state.js';
import { requestNotificationPermission } from '../utils/notifications.js';

let dismissed = false;

function getBanner() {
    return document.getElementById('notificationBanner');
}

function show() {
    const banner = getBanner();
    if (!banner) return;
    banner.classList.remove('hidden');
}

function hide() {
    const banner = getBanner();
    if (!banner) return;
    banner.classList.add('hidden');
}

function shouldShow() {
    if (dismissed) return false;
    if (!('Notification' in window)) return false;
    if (Notification.permission !== 'default') return false;
    if (sessionStorage.getItem('fu_notif_dismissed')) return false;
    return true;
}

export function initNotificationBanner() {
    const enableBtn = document.getElementById('bannerEnableBtn');
    const dismissBtn = document.getElementById('bannerDismissBtn');

    if (!enableBtn || !dismissBtn) return;

    enableBtn.addEventListener('click', async () => {
        const granted = await requestNotificationPermission();
        dismissed = true;
        hide();
    });

    dismissBtn.addEventListener('click', () => {
        dismissed = true;
        sessionStorage.setItem('fu_notif_dismissed', '1');
        hide();
    });

    // Reactively show/hide when switching to/from Focus mode
    effect(() => {
        const currentMode = mode.value;
        if (currentMode === 'focus' && shouldShow()) {
            show();
        } else {
            hide();
        }
    });
}
