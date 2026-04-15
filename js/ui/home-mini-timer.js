// home-mini-timer.js
//
// Compact focus timer widget on the Home tab.
// Reads from the shared timer state and renders a live countdown with
// progress arc. Click navigates to the Focus tab. Shows/hides based on
// whether a session is active (running or paused).

import { state } from '../core/state.js';
import { switchMode } from './navigation.js';
import { get as settingsGet } from './settings/store.js';
import { startTimer, pauseTimer, resetTimer, skipBreak, skipFocus } from '../features/timer.js';

// ============================================================================
// DOM references
// ============================================================================
let container = null;
let timeEl = null;
let labelEl = null;
let sessionEl = null;
let minHand = null;
let secHand = null;
let progressArc = null;
let tickInterval = null;
let visible = false;
let hideBlockedUntil = 0; // Timestamp — tick won't hide before this

// Clock geometry
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * 23; // r=23 in SVG viewBox

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
    container   = document.getElementById('homeMiniTimer');
    timeEl      = document.getElementById('hmtTime');
    labelEl     = document.getElementById('hmtLabel');
    sessionEl   = document.getElementById('hmtSession');
    minHand     = document.getElementById('hmtMinHand');
    secHand     = document.getElementById('hmtSecHand');
    progressArc = document.getElementById('hmtProgress');

    if (!container) return;

    // Restore timer state from sessionStorage (survives normal refresh)
    restoreTimerState();

    // Click on body area (not buttons) → navigate to Focus tab
    const bodyArea = container.querySelector('.hmt-body');
    const ringArea = container.querySelector('.hmt-ring');
    [bodyArea, ringArea].forEach(el => {
        if (el) el.addEventListener('click', (e) => {
            if (isDragging) return;
            e.stopPropagation();
            switchMode('focus');
        });
    });

    // Stop container-level click from doing anything
    container.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Start/Pause button
    const playPauseBtn = document.getElementById('hmtPlayPauseBtn');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (state.timer.isRunning) pauseTimer();
            else startTimer();
        });
    }

    // Skip button — skips current focus or break session
    const skipBtn = document.getElementById('hmtSkipBtn');
    if (skipBtn) {
        skipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (state.timer.isBreak) skipBreak();
            else skipFocus();
        });
    }

    // Reset button
    const resetBtn = document.getElementById('hmtResetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetTimer();
            sessionStorage.removeItem(TIMER_STATE_KEY);
            // Keep the mini-timer visible by setting state to 'paused'
            // so tick() treats it as active and doesn't hide the widget
            state.timerState = 'paused';
            if (labelEl) labelEl.textContent = 'RESET';
        });
    }

    // ── Drag support (only from non-interactive areas) ──
    container.addEventListener('pointerdown', (e) => {
        // Don't drag from buttons
        if (e.target.closest('.hmt-btn') || e.target.closest('.hmt-resize')) return;
        onDragStart(e);
    }, { passive: false });
    document.addEventListener('pointermove', onDragMove, { passive: false });
    document.addEventListener('pointerup', onDragEnd);

    // ── Corner resize handle ──
    const resizeHandle = container.querySelector('.hmt-resize');
    if (resizeHandle) {
        resizeHandle.addEventListener('pointerdown', onResizeStart, { passive: false });
    }

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
    // Don't setPointerCapture — it steals events from child buttons
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
    const timerState = state.timerState;
    const isActive = isRunning || timerState === 'paused';

    // Check which tab the user is actually on via DOM (state.mode gets
    // overwritten by startTimer to 'timer', which is unreliable here)
    const homePanel = document.getElementById('home');
    const ambientPanel = document.getElementById('ambient');
    const onVisibleTab = homePanel?.classList.contains('active') ||
                         ambientPanel?.classList.contains('active');

    // Show/hide
    const now = Date.now();
    if (isActive && onVisibleTab && !visible) {
        show();
    } else if (!onVisibleTab && visible && now >= hideBlockedUntil) {
        hide();
    } else if (!isActive && visible && now >= hideBlockedUntil) {
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

    // Update clock hands + progress arc
    const totalSeconds = isBreak
        ? (state.timer.isLongBreak ? settings.longBreakDuration : settings.shortBreakDuration) * 60
        : settings.focusDuration * 60;
    const remaining = minutes * 60 + seconds;
    const elapsed = totalSeconds - remaining;
    const progress = totalSeconds > 0 ? elapsed / totalSeconds : 0;

    // Minute hand — full rotation maps to full session duration
    if (minHand) {
        const minAngle = progress * 360;
        minHand.style.transform = `rotate(${minAngle.toFixed(1)}deg)`;
    }
    // Second hand — one full rotation per 60 seconds
    if (secHand) {
        const secAngle = (seconds / 60) * 360;
        secHand.style.transform = `rotate(${secAngle.toFixed(1)}deg)`;
    }
    // Progress arc
    if (progressArc) {
        const offset = PROGRESS_CIRCUMFERENCE * (1 - progress);
        progressArc.style.strokeDashoffset = offset.toFixed(2);
    }

    // Update play/pause icon
    const ppBtn = document.getElementById('hmtPlayPauseBtn');
    if (ppBtn) {
        const icon = isRunning
            ? '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><rect x="3" y="2" width="3.5" height="12" rx="1"/><rect x="9.5" y="2" width="3.5" height="12" rx="1"/></svg>'
            : '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M4 2.5a.5.5 0 0 1 .77-.42l8.5 5.5a.5.5 0 0 1 0 .84l-8.5 5.5A.5.5 0 0 1 4 13.5v-11z"/></svg>';
        if (ppBtn.dataset.state !== (isRunning ? 'running' : 'paused')) {
            ppBtn.innerHTML = icon;
            ppBtn.dataset.state = isRunning ? 'running' : 'paused';
            ppBtn.setAttribute('aria-label', isRunning ? 'Pause timer' : 'Resume timer');
        }
    }

    // State classes
    container.classList.toggle('is-running', isRunning);
    container.classList.toggle('is-paused', timerState === 'paused');
    container.classList.toggle('is-break', isBreak);
    container.classList.toggle('is-long-break', isBreak && state.timer.isLongBreak);
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

// ============================================================================
// Corner resize — drag corner handle to scale between min and max
// ============================================================================
const MIN_SCALE = 1;
const MAX_SCALE = 1.8;
let currentScale = 1;
let resizing = false;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartScale = 1;

function onResizeStart(e) {
    e.preventDefault();
    e.stopPropagation();
    resizing = true;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    resizeStartScale = currentScale;
    container.classList.add('is-resizing');

    document.addEventListener('pointermove', onResizeMove);
    document.addEventListener('pointerup', onResizeEnd);
}

function onResizeMove(e) {
    if (!resizing) return;
    // Diagonal distance from start — moving down-right grows, up-left shrinks
    const dx = e.clientX - resizeStartX;
    const dy = e.clientY - resizeStartY;
    const delta = (dx + dy) / 200; // Sensitivity
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, resizeStartScale + delta));
    currentScale = newScale;
    container.style.transform = `scale(${newScale.toFixed(3)})`;
}

function onResizeEnd() {
    resizing = false;
    container.classList.remove('is-resizing');
    document.removeEventListener('pointermove', onResizeMove);
    document.removeEventListener('pointerup', onResizeEnd);
}
