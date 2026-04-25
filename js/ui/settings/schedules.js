// settings/schedules.js
//
// Minimal cron-lite scheduler for entering modes automatically.
// A schedule is:
//   { id, enabled, time: 'HH:MM', days: [0..6], action: 'focus.start'|'focus.switch'|'ambient.switch'|'home.switch' }
// days uses JS Date.getDay() → 0 = Sunday … 6 = Saturday.
//
// Runs a minute-granularity interval. Fires at most once per minute per
// schedule; a `lastFired` marker keeps it from re-triggering if the minute
// overlaps the 5-second sweep.

import * as nav from '../navigation.js';
import { get as getSetting, subscribe as subscribeStore } from './store.js';

const STORE_KEY = 'timer.schedules';
const SWEEP_MS = 5000;

const lastFired = new Map(); // id → 'YYYY-MM-DD HH:MM'
let interval = null;

function nowKey(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function fire(action) {
    try {
        // navigation is statically imported above; timer is still lazy so
        // it only loads when a schedule actually fires.
        const timer = await import('../../features/timer.js');
        switch (action) {
            case 'focus.start':
                nav?.switchMode?.('focus');
                timer?.startTimer?.();
                break;
            case 'focus.switch':
                nav?.switchMode?.('focus');
                break;
            case 'ambient.switch':
                // Ambient is no longer a top-level tab; legacy schedules
                // route to the focus tab where the cosmos toolbar lives.
                nav?.switchMode?.('focus');
                break;
            case 'home.switch':
                nav?.switchMode?.('home');
                break;
        }
    } catch (e) {
        console.warn('[schedules] action failed:', action, e);
    }
}

function sweep() {
    const schedules = getSetting(STORE_KEY) || [];
    if (!Array.isArray(schedules) || schedules.length === 0) return;

    const now = new Date();
    const key = nowKey(now);
    const hhmm = key.slice(11); // 'HH:MM'
    const day = now.getDay();

    for (const s of schedules) {
        if (!s || !s.enabled) continue;
        if (s.time !== hhmm) continue;
        if (Array.isArray(s.days) && s.days.length > 0 && !s.days.includes(day)) continue;
        if (lastFired.get(s.id) === key) continue;
        lastFired.set(s.id, key);
        fire(s.action);
    }
}

export function initSchedules() {
    if (interval) return;
    sweep();
    interval = setInterval(sweep, SWEEP_MS);
    // Re-sweep immediately when the list changes — newly-enabled schedules
    // for the current minute still fire.
    subscribeStore(STORE_KEY, () => sweep());
}

export function stopSchedules() {
    if (interval) {
        clearInterval(interval);
        interval = null;
    }
}
