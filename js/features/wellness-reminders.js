// wellness-reminders.js — Wave 18.3 / 18.4 / 18.5
//
// Three opt-in reminder loops that fire only while a focus session is
// actively running. The 20-20-20 eye rest is fixed by definition (every
// 20 min); posture and hydration each have a configurable interval.
//
// All three surface as calm, in-app toasts — never OS notifications.
// They reuse `.celebrate-toast` chrome (top-right gentle slide, gold
// glow) since the visual register is the same: positive, non-blocking,
// auto-fades. Each reminder gets a distinct DOM id so they don't
// clobber each other if two are due at once.

import { appState as state } from '../core/state.js';
import { get as settingsGet, subscribe as settingsSub } from '../ui/settings/store.js';

const EYE_REST_MS = 20 * 60 * 1000; // fixed per the 20-20-20 rule
let timers = {
    eye: null,
    hydration: null,
    posture: null,
};

function isFocusRunning() {
    return state.timer.isRunning && !state.timer.isBreak;
}

function startTimers() {
    stopTimers(); // belt-and-braces — handles auto-start where end isn't fired before next start

    if (settingsGet('wellness.eyeRestEnabled') === true) {
        // setInterval rather than setTimeout-chain so the cadence stays
        // honest even if the user pauses and resumes mid-cycle. Pause
        // clears the interval entirely; the next start re-arms.
        timers.eye = setInterval(() => {
            if (!isFocusRunning()) return;
            showWellnessToast({
                id: 'wellnessEyeToast',
                icon: '👁',
                title: 'Eye rest',
                detail: 'Look 20 ft away for 20 seconds',
            });
        }, EYE_REST_MS);
    }

    if (settingsGet('wellness.hydrationEnabled') === true) {
        const min = clampMinutes(settingsGet('wellness.hydrationInterval'), 60);
        timers.hydration = setInterval(() => {
            if (!isFocusRunning()) return;
            showWellnessToast({
                id: 'wellnessHydrationToast',
                icon: '💧',
                title: 'Hydration check',
                detail: 'Take a sip of water',
            });
        }, min * 60 * 1000);
    }

    if (settingsGet('wellness.postureEnabled') === true) {
        const min = clampMinutes(settingsGet('wellness.postureInterval'), 45);
        timers.posture = setInterval(() => {
            if (!isFocusRunning()) return;
            showWellnessToast({
                id: 'wellnessPostureToast',
                icon: '🧘',
                title: 'Posture check',
                detail: 'Roll the shoulders, lengthen the spine',
            });
        }, min * 60 * 1000);
    }
}

function stopTimers() {
    for (const k of Object.keys(timers)) {
        if (timers[k]) {
            clearInterval(timers[k]);
            timers[k] = null;
        }
    }
}

function clampMinutes(raw, fallback) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) return fallback;
    return Math.min(240, Math.max(1, Math.round(n)));
}

const toastTimeouts = {};
function showWellnessToast({ id, icon, title, detail }) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement('div');
        el.id = id;
        el.className = 'celebrate-toast';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        document.body.appendChild(el);
    }
    el.innerHTML = `
        <span class="celebrate-toast__icon" aria-hidden="true">${icon}</span>
        <span class="celebrate-toast__body">
            <span class="celebrate-toast__title">${title}</span>
            <span class="celebrate-toast__detail">${detail}</span>
        </span>
    `;
    el.classList.remove('is-visible');
    void el.offsetWidth;
    el.classList.add('is-visible');
    clearTimeout(toastTimeouts[id]);
    toastTimeouts[id] = setTimeout(() => el.classList.remove('is-visible'), 6000);
}

export function initWellnessReminders() {
    document.addEventListener('focus-timer:start', (e) => {
        const isBreak = e.detail?.isBreak;
        if (isBreak) {
            stopTimers();
            return;
        }
        startTimers();
    });

    document.addEventListener('focus-timer:end', stopTimers);
    document.addEventListener('focus-timer:pause', stopTimers);
    document.addEventListener('focus-timer:reset', stopTimers);

    // Re-arm whenever the user toggles a reminder or moves an interval
    // slider mid-session. Without this, setInterval snapshots the
    // duration at session start and ignores live changes — turning
    // hydration off at minute 30 would still fire it at minute 60.
    const reactiveKeys = [
        'wellness.eyeRestEnabled',
        'wellness.hydrationEnabled',
        'wellness.hydrationInterval',
        'wellness.postureEnabled',
        'wellness.postureInterval',
    ];
    for (const k of reactiveKeys) {
        settingsSub(k, () => {
            if (isFocusRunning()) startTimers();
            else stopTimers();
        });
    }
}
