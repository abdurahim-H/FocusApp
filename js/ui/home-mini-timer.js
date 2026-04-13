// home-mini-timer.js
//
// Compact focus timer widget on the Home tab.
// Reads from the shared timer state and renders a live countdown with
// progress arc. Click navigates to the Focus tab. Shows/hides based on
// whether a session is active (running or paused).

import { state } from '../core/state.js';
import { switchMode } from './navigation.js';
import { get as settingsGet } from './settings/store.js';

// ============================================================================
// DOM references
// ============================================================================
let container = null;
let timeEl = null;
let labelEl = null;
let sessionEl = null;
let ringFill = null;
let tickInterval = null;
let visible = false;

// Ring geometry
const CIRCUMFERENCE = 2 * Math.PI * 25; // r=25 in SVG viewBox

// Drag state
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// Timer persistence
const TIMER_STATE_KEY = 'fu_timer_session';

// ============================================================================
// Public API
// ============================================================================

export function initHomeMiniTimer() {
    container = document.getElementById('homeMiniTimer');
    timeEl    = document.getElementById('hmtTime');
    labelEl   = document.getElementById('hmtLabel');
    sessionEl = document.getElementById('hmtSession');
    ringFill  = document.getElementById('hmtRingFill');

    if (!container) return;

    // Restore timer state from sessionStorage (survives normal refresh)
    restoreTimerState();

    // Click → navigate to Focus tab (only if not dragging)
    container.addEventListener('click', (e) => {
        if (isDragging) return;
        e.stopPropagation();
        switchMode('focus');
    });

    // ── Drag support ──
    container.addEventListener('pointerdown', onDragStart, { passive: false });
    document.addEventListener('pointermove', onDragMove, { passive: false });
    document.addEventListener('pointerup', onDragEnd);

    // Start polling timer state (lightweight — just reads state object)
    tickInterval = setInterval(tick, 500);

    // Initial check
    tick();
}

// ============================================================================
// Drag to reposition
// ============================================================================

let dragStartX = 0, dragStartY = 0;
let dragMoved = false;

function onDragStart(e) {
    if (!container) return;
    isDragging = false;
    dragMoved = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    const rect = container.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    container.setPointerCapture(e.pointerId);
}

function onDragMove(e) {
    if (!container || dragOffsetX === 0) return;

    // Only start dragging after 5px movement (prevents accidental drags on click)
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (!dragMoved && Math.sqrt(dx * dx + dy * dy) < 5) return;
    dragMoved = true;
    isDragging = true;
    container.classList.add('is-dragging');

    const x = e.clientX - dragOffsetX;
    const y = e.clientY - dragOffsetY;

    // Clamp to viewport
    const maxX = window.innerWidth - container.offsetWidth;
    const maxY = window.innerHeight - container.offsetHeight;
    const clampedX = Math.max(0, Math.min(maxX, x));
    const clampedY = Math.max(0, Math.min(maxY, y));

    // Switch from bottom/right to top/left positioning during drag
    container.style.bottom = 'auto';
    container.style.right = 'auto';
    container.style.left = clampedX + 'px';
    container.style.top = clampedY + 'px';
}

function onDragEnd(e) {
    if (!container) return;
    container.classList.remove('is-dragging');

    if (dragMoved) {
        // Prevent the click event from firing after drag
        setTimeout(() => { isDragging = false; }, 50);
    } else {
        isDragging = false;
    }
    dragOffsetX = 0;
    dragOffsetY = 0;
    dragMoved = false;
}

// ============================================================================
// Timer state persistence (sessionStorage — survives refresh, clears on tab close)
// ============================================================================

function persistTimerState() {
    try {
        const t = state.timer;
        sessionStorage.setItem(TIMER_STATE_KEY, JSON.stringify({
            isRunning: t.isRunning,
            isBreak: t.isBreak,
            isLongBreak: t.isLongBreak,
            minutes: t.minutes,
            seconds: t.seconds,
            pomodoroCount: t.pomodoroCount,
            timerState: state.timerState,
            savedAt: Date.now(),
        }));
    } catch (_) {}
}

function restoreTimerState() {
    try {
        const raw = sessionStorage.getItem(TIMER_STATE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);

        // Only restore if saved less than 30 minutes ago
        if (Date.now() - saved.savedAt > 30 * 60 * 1000) {
            sessionStorage.removeItem(TIMER_STATE_KEY);
            return;
        }

        // Calculate elapsed seconds since save
        const elapsedSec = Math.floor((Date.now() - saved.savedAt) / 1000);

        // Restore state
        const t = state.timer;
        t.isBreak = saved.isBreak;
        t.isLongBreak = saved.isLongBreak;
        t.pomodoroCount = saved.pomodoroCount;

        if (saved.isRunning) {
            // Timer was running — subtract elapsed time
            let totalRemaining = saved.minutes * 60 + saved.seconds - elapsedSec;
            if (totalRemaining <= 0) {
                // Session would have ended — don't restore, clean up
                sessionStorage.removeItem(TIMER_STATE_KEY);
                return;
            }
            t.minutes = Math.floor(totalRemaining / 60);
            t.seconds = totalRemaining % 60;
            state.timerState = 'paused'; // Restore as paused — user can resume

            // Update the main timer display too
            const timerDisplay = document.getElementById('timerDisplay');
            if (timerDisplay) {
                timerDisplay.textContent = `${String(t.minutes).padStart(2, '0')}:${String(t.seconds).padStart(2, '0')}`;
            }
            const sessionType = document.getElementById('sessionType');
            if (sessionType) {
                sessionType.textContent = t.isBreak ? 'Break Time' : 'Focus Time';
            }
        } else if (saved.timerState === 'paused') {
            // Was paused — restore exact time
            t.minutes = saved.minutes;
            t.seconds = saved.seconds;
            state.timerState = 'paused';

            const timerDisplay = document.getElementById('timerDisplay');
            if (timerDisplay) {
                timerDisplay.textContent = `${String(t.minutes).padStart(2, '0')}:${String(t.seconds).padStart(2, '0')}`;
            }
        }
    } catch (_) {}
}

export function destroyHomeMiniTimer() {
    if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
    }
}

// ============================================================================
// Tick — sync widget with timer state
// ============================================================================

function tick() {
    if (!container) return;

    const { isRunning, isBreak, minutes, seconds, settings, pomodoroCount } = state.timer;
    const timerState = state.timerState; // 'running' | 'paused' | 'stopped' | 'completed'
    const isActive = isRunning || timerState === 'paused';

    // Only show on Home and Ambient modes — hide on Focus (redundant there)
    const currentMode = state.mode;
    const onVisibleTab = currentMode === 'home' || currentMode === 'ambient';

    // Show/hide
    if (isActive && onVisibleTab && !visible) {
        show();
    } else if ((!isActive || !onVisibleTab) && visible) {
        hide();
    }

    // Persist timer state to sessionStorage so it survives normal refresh
    if (isActive) {
        persistTimerState();
    }

    if (!visible) return;

    // Update time display
    const m = String(minutes).padStart(2, '0');
    const s = String(seconds).padStart(2, '0');
    if (timeEl) timeEl.textContent = `${m}:${s}`;

    // Update label
    if (labelEl) {
        labelEl.textContent = isBreak ? 'BREAK' : 'FOCUS';
    }

    // Update session counter
    if (sessionEl) {
        const goal = settingsGet('timer.pomodoroGoal') ?? 4;
        const current = isBreak ? pomodoroCount : pomodoroCount + 1;
        sessionEl.textContent = `${Math.min(current, goal)} / ${goal}`;
    }

    // Update progress ring
    if (ringFill) {
        const totalSeconds = isBreak
            ? (state.timer.isLongBreak ? settings.longBreakDuration : settings.shortBreakDuration) * 60
            : settings.focusDuration * 60;
        const elapsed = totalSeconds - (minutes * 60 + seconds);
        const progress = totalSeconds > 0 ? elapsed / totalSeconds : 0;
        const offset = CIRCUMFERENCE * (1 - progress);
        ringFill.style.strokeDashoffset = offset.toFixed(2);
    }

    // State classes
    container.classList.toggle('is-running', isRunning);
    container.classList.toggle('is-paused', timerState === 'paused');
    container.classList.toggle('is-break', isBreak);
}

// ============================================================================
// Show / hide with animation
// ============================================================================

function show() {
    if (visible) return;
    visible = true;
    container.classList.remove('hidden', 'is-leaving');
    container.classList.add('is-entering');
    // Remove animation class after it completes
    container.addEventListener('animationend', () => {
        container.classList.remove('is-entering');
    }, { once: true });
}

function hide() {
    if (!visible) return;
    visible = false;
    container.classList.remove('is-entering', 'is-running', 'is-paused', 'is-break');
    container.classList.add('is-leaving');
    container.addEventListener('animationend', () => {
        container.classList.remove('is-leaving');
        container.classList.add('hidden');
    }, { once: true });
}
