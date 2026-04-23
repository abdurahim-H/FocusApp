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

// Sliver (minimized / docked form)
let sliver = null;
let sliverMM = null;
let sliverSS = null;
let docked = false;
let dockAnimating = false;

// Clock geometry
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * 23; // r=23 in SVG viewBox

// Drag state
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// Timer persistence
const TIMER_STATE_KEY = 'fu_timer_session';
const SCALE_KEY = 'fu_mini_timer_scale';
const DOCKED_KEY = 'fu_mini_timer_docked';

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

    // Sliver (docked form) references
    sliver     = document.getElementById('hmtSliver');
    sliverMM   = document.getElementById('hmtSliverMM');
    sliverSS   = document.getElementById('hmtSliverSS');

    if (!container) return;

    // Restore timer state from sessionStorage (survives normal refresh)
    restoreTimerState();
    restoreScale();
    restoreDockedState();

    // Minimize button → glide the timer to the right edge as a sliver
    const minimizeBtn = document.getElementById('hmtMinimizeBtn');
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dockToSliver();
        });
    }

    // Sliver expand chevron → unfurl back to the full mini-timer
    const sliverExpandBtn = document.getElementById('hmtSliverExpand');
    if (sliverExpandBtn) {
        sliverExpandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            undockFromSliver();
        });
    }

    // Sliver play/pause button
    const sliverPlayBtn = document.getElementById('hmtSliverPlayPauseBtn');
    if (sliverPlayBtn) {
        sliverPlayBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (state.timer.isRunning) pauseTimer();
            else startTimer();
        });
    }

    // Sliver reset button
    const sliverResetBtn = document.getElementById('hmtSliverResetBtn');
    if (sliverResetBtn) {
        sliverResetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetTimer();
            sessionStorage.removeItem(TIMER_STATE_KEY);
            state.timerState = 'paused';
        });
    }

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

    // Minute hand — full rotation over the session duration, clockwise.
    if (minHand) {
        const minAngle = progress * 360;
        minHand.style.transform = `rotate(${minAngle.toFixed(1)}deg)`;
    }
    // Second hand — clockwise sweep. The timer counts DOWN (seconds 59→0),
    // so using seconds/60 directly produced a counterclockwise motion. Flip
    // to elapsed-in-current-minute so the angle increases over time.
    if (secHand) {
        const secElapsed = (60 - seconds) % 60;
        const secAngle = (secElapsed / 60) * 360;
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

    // Keep the docked sliver's countdown / progress fill in sync too —
    // every tick, not just on show, so MM:SS updates visibly at 0.5Hz
    // polling cadence. Cheap: a few textContent writes + one height %.
    if (docked) syncSliver();
}

// ============================================================================
// Show / hide with animation
// ============================================================================

function show() {
    if (visible) return;
    visible = true;

    // If user previously docked, skip the full mini-timer and show the
    // sliver directly — their preference is preserved across sessions.
    if (docked) {
        showSliver({ animate: true });
        return;
    }

    container.classList.remove('hidden', 'is-leaving');
    container.classList.add('is-entering');
    container.addEventListener('animationend', () => {
        container.classList.remove('is-entering');
    }, { once: true });
}

function hide() {
    if (!visible) return;
    visible = false;
    container.classList.remove('is-entering', 'is-running', 'is-paused', 'is-break');

    // If we're currently showing the sliver, fade it out; otherwise the
    // full mini-timer.
    if (docked && sliver && !sliver.classList.contains('hidden')) {
        hideSliver({ animate: true });
        return;
    }

    container.classList.add('is-leaving');
    container.addEventListener('animationend', () => {
        container.classList.remove('is-leaving');
        container.classList.add('hidden');
    }, { once: true });
}

// ============================================================================
// Dock / undock — morph between the full mini-timer and the right-edge sliver
// ============================================================================

/** Glide the mini-timer to the right edge, then swap in the sliver. */
function dockToSliver() {
    if (!container || !sliver || dockAnimating) return;
    if (container.classList.contains('hidden')) return;
    dockAnimating = true;

    // Measure the vector from the mini-timer's current center to the
    // sliver's future center, so the dock animation glides along the
    // exact path (not a rough direction). The mini-timer is
    // right/bottom-anchored, the sliver is right/center-anchored —
    // without this delta the animation just fades, which reads as
    // "the widget disappeared" rather than "the widget moved there".
    const miniRect = container.getBoundingClientRect();
    const miniCx = miniRect.left + miniRect.width / 2;
    const miniCy = miniRect.top + miniRect.height / 2;
    const sliverW = parseFloat(getComputedStyle(sliver).getPropertyValue('--sliver-w')) || 44;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const sliverCx = viewportW - sliverW / 2;
    const sliverCy = viewportH / 2;
    const dx = sliverCx - miniCx;
    const dy = sliverCy - miniCy;

    container.style.setProperty('--dock-dx', `${dx.toFixed(1)}px`);
    container.style.setProperty('--dock-dy', `${dy.toFixed(1)}px`);
    container.classList.remove('is-entering', 'is-leaving');
    container.classList.add('is-docking');

    // Mid-animation, swap — hide the mini-timer and show the sliver
    // entering. Timing (~320ms in) is the moment the mini-timer has
    // compressed down enough that the two can crossfade without either
    // looking truncated.
    window.setTimeout(() => {
        container.classList.add('hidden');
        container.classList.remove('is-docking');
        showSliver({ animate: true });
    }, 320);

    // Persist the user's preference
    docked = true;
    try { localStorage.setItem(DOCKED_KEY, '1'); } catch (_) {}

    // Keep a reasonable animation completion window before allowing
    // another dock toggle.
    window.setTimeout(() => { dockAnimating = false; }, 650);
}

/** Slide the sliver away and unfurl the full mini-timer back in. */
function undockFromSliver() {
    if (!container || !sliver || dockAnimating) return;
    dockAnimating = true;

    // Compute the same dock vector so the mini-timer animates in FROM
    // the sliver's position, not from thin air.
    const miniRectFake = container.getBoundingClientRect();
    const targetCx = miniRectFake.left + miniRectFake.width / 2;
    const targetCy = miniRectFake.top + miniRectFake.height / 2;
    const sliverW = parseFloat(getComputedStyle(sliver).getPropertyValue('--sliver-w')) || 44;
    const sliverCx = window.innerWidth - sliverW / 2;
    const sliverCy = window.innerHeight / 2;
    const dx = sliverCx - targetCx;
    const dy = sliverCy - targetCy;
    container.style.setProperty('--dock-dx', `${dx.toFixed(1)}px`);
    container.style.setProperty('--dock-dy', `${dy.toFixed(1)}px`);

    hideSliver({ animate: true });

    // Short beat so the sliver's leave animation is visibly out before
    // the full mini-timer starts unfurling — otherwise the two overlap
    // muddily at the right edge.
    window.setTimeout(() => {
        container.classList.remove('hidden', 'is-entering', 'is-leaving', 'is-docking');
        container.classList.add('is-undocking');
        container.addEventListener('animationend', () => {
            container.classList.remove('is-undocking');
        }, { once: true });
    }, 120);

    docked = false;
    try { localStorage.removeItem(DOCKED_KEY); } catch (_) {}

    window.setTimeout(() => { dockAnimating = false; }, 750);
}

function showSliver({ animate = true } = {}) {
    if (!sliver) return;
    sliver.classList.remove('hidden', 'is-leaving');
    if (animate) {
        sliver.classList.add('is-entering');
        sliver.addEventListener('animationend', () => {
            sliver.classList.remove('is-entering');
        }, { once: true });
    }
    syncSliver();
}

function hideSliver({ animate = true } = {}) {
    if (!sliver) return;
    sliver.classList.remove('is-entering');
    if (animate) {
        sliver.classList.add('is-leaving');
        sliver.addEventListener('animationend', () => {
            sliver.classList.remove('is-leaving');
            sliver.classList.add('hidden');
        }, { once: true });
    } else {
        sliver.classList.add('hidden');
    }
}

/** Push timer state into the sliver: countdown text, play/pause icon, state classes. */
function syncSliver() {
    if (!sliver || sliver.classList.contains('hidden')) return;
    const { isRunning, isBreak, minutes, seconds } = state.timer;
    const timerState = state.timerState;

    if (sliverMM) sliverMM.textContent = String(minutes).padStart(2, '0');
    if (sliverSS) sliverSS.textContent = String(seconds).padStart(2, '0');

    // Swap play/pause icon to match the timer's running state.
    const pp = document.getElementById('hmtSliverPlayPauseBtn');
    if (pp) {
        const targetState = isRunning ? 'running' : 'paused';
        if (pp.dataset.state !== targetState) {
            pp.innerHTML = isRunning
                ? '<svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" rx="1"/><rect x="9.5" y="2" width="3.5" height="12" rx="1"/></svg>'
                : '<svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M4 2.5a.5.5 0 0 1 .77-.42l8.5 5.5a.5.5 0 0 1 0 .84l-8.5 5.5A.5.5 0 0 1 4 13.5v-11z"/></svg>';
            pp.dataset.state = targetState;
            pp.setAttribute('aria-label', isRunning ? 'Pause timer' : 'Resume timer');
        }
    }

    sliver.classList.toggle('is-running', isRunning);
    sliver.classList.toggle('is-paused', timerState === 'paused' && !isRunning);
    sliver.classList.toggle('is-break', isBreak);
}

function restoreDockedState() {
    try {
        docked = localStorage.getItem(DOCKED_KEY) === '1';
    } catch (_) { docked = false; }
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
    applyScale(newScale);
}

function onResizeEnd() {
    resizing = false;
    container.classList.remove('is-resizing');
    document.removeEventListener('pointermove', onResizeMove);
    document.removeEventListener('pointerup', onResizeEnd);
    // Persist so the chosen size survives reloads.
    try { localStorage.setItem(SCALE_KEY, String(currentScale)); } catch (_) {}
}

// Drive the scale through a CSS custom property so it composes with the
// enter/leave keyframes. Setting style.transform directly would be clobbered
// by `hmtEnter`'s `scale(1)` the next time the widget mounts.
function applyScale(s) {
    currentScale = s;
    if (container) container.style.setProperty('--user-scale', s.toFixed(3));
}

function restoreScale() {
    try {
        const raw = localStorage.getItem(SCALE_KEY);
        if (!raw) return;
        const s = parseFloat(raw);
        if (Number.isFinite(s) && s >= MIN_SCALE && s <= MAX_SCALE) applyScale(s);
    } catch (_) {}
}
