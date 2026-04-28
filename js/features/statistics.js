// statistics.js
//
// Phase 5B: Focus session statistics.
//
// Tracks:
//   - sessionsToday: resets at midnight
//   - totalFocusSeconds: lifetime accumulator (seconds for precision)
//   - tasksCompletedToday: resets at midnight
//   - currentStreak: consecutive calendar days with at least 1 session
//   - lastFocusDate: ISO date string (YYYY-MM-DD) of last completed session
//
// Persisted in localStorage key `fu_stats_v1`.

import { effect, signal } from '../core/state.js';
import { get as settingsGet, subscribe as settingsSub } from '../ui/settings/store.js';
import { getDailySessionCounts, onSessionsChange } from './sessions.js';

// ============================================================================
// Signals
// ============================================================================
export const sessionsToday = signal(0);
export const totalFocusSeconds = signal(0);
export const tasksCompletedToday = signal(0);
export const currentStreak = signal(0);
export const lastFocusDate = signal('');

// ============================================================================
// Persistence
// ============================================================================
const STATS_KEY = 'fu_stats_v1';

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function yesterdayISO() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
}

function loadStats() {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        const today = todayISO();

        // Total focus — always restore. Migrate from minutes if old data.
        if (typeof data.totalFocusSeconds === 'number') {
            totalFocusSeconds.value = data.totalFocusSeconds;
        } else if (typeof data.totalFocusMinutes === 'number') {
            totalFocusSeconds.value = data.totalFocusMinutes * 60;
        }

        // Last focus date
        if (typeof data.lastFocusDate === 'string') {
            lastFocusDate.value = data.lastFocusDate;
        }

        const isToday = data.lastFocusDate === today;

        // Sessions today — reset if not today
        sessionsToday.value =
            isToday && typeof data.sessionsToday === 'number' ? data.sessionsToday : 0;

        // Tasks completed today — reset if not today
        tasksCompletedToday.value =
            isToday && typeof data.tasksCompletedToday === 'number' ? data.tasksCompletedToday : 0;

        // Streak
        if (typeof data.currentStreak === 'number') {
            if (data.lastFocusDate === today || data.lastFocusDate === yesterdayISO()) {
                currentStreak.value = data.currentStreak;
            } else {
                currentStreak.value = 0;
            }
        }
    } catch (e) {
        console.warn('[stats] failed to load:', e);
    }
}

let persistInitialized = false;
function setupPersistence() {
    effect(() => {
        const snapshot = {
            sessionsToday: sessionsToday.value,
            totalFocusSeconds: totalFocusSeconds.value,
            tasksCompletedToday: tasksCompletedToday.value,
            currentStreak: currentStreak.value,
            lastFocusDate: lastFocusDate.value,
        };
        if (!persistInitialized) {
            persistInitialized = true;
            return;
        }
        try {
            localStorage.setItem(STATS_KEY, JSON.stringify(snapshot));
        } catch (e) {
            console.warn('[stats] failed to persist:', e);
        }
    });
}

// ============================================================================
// Recording events
// ============================================================================

/** Called from timer.js when a focus session completes or is skipped.
 *  @param {number} elapsedSeconds — actual elapsed time, NOT configured duration. */
export function recordSessionComplete(elapsedSeconds) {
    const today = todayISO();
    const prevDate = lastFocusDate.value;

    // Increment sessions
    sessionsToday.value = prevDate !== today ? 1 : sessionsToday.value + 1;

    // Accumulate actual elapsed seconds
    totalFocusSeconds.value = totalFocusSeconds.value + elapsedSeconds;

    // Streak logic
    if (prevDate === today) {
        // Already focused today — streak unchanged
    } else if (prevDate === yesterdayISO()) {
        currentStreak.value = currentStreak.value + 1;
    } else {
        currentStreak.value = 1;
    }

    lastFocusDate.value = today;
}

/** Called from tasks.js when a task's completed state changes.
 *  @param {boolean} completed — true = just completed, false = just uncompleted */
export function recordTaskToggle(completed) {
    const today = todayISO();
    if (lastFocusDate.value !== today) {
        // New day — reset daily counter
        tasksCompletedToday.value = completed ? 1 : 0;
        lastFocusDate.value = today;
    } else if (completed) {
        tasksCompletedToday.value = tasksCompletedToday.value + 1;
    } else {
        // Untoggled — subtract, but never go below 0
        tasksCompletedToday.value = Math.max(0, tasksCompletedToday.value - 1);
    }
}

// ============================================================================
// Formatting
// ============================================================================

function formatDuration(totalSeconds) {
    totalSeconds = Math.round(totalSeconds);
    if (totalSeconds === 0) return '0s';

    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);
    if (secs > 0) parts.push(`${secs}s`);
    return parts.join(' ');
}

// ============================================================================
// UI rendering — reactive stats bar
// ============================================================================
function renderStatsBar() {
    const bar = document.getElementById('statsBar');
    if (!bar) return;

    effect(() => {
        const sessions = sessionsToday.value;
        const totalSec = totalFocusSeconds.value;
        const tasks = tasksCompletedToday.value;
        const streak = currentStreak.value;

        const el = (id) => document.getElementById(id);
        const todayEl = el('statSessionsToday');
        const totalEl = el('statTotalMinutes');
        const tasksEl = el('statTasksToday');
        const streakEl = el('statStreak');

        if (todayEl) todayEl.textContent = sessions;
        if (totalEl) totalEl.textContent = formatDuration(totalSec);
        if (tasksEl) tasksEl.textContent = tasks;
        if (streakEl) streakEl.textContent = streak;

        // Daily goal ring — only paints when the user has an active
        // target. The progress fill is on a 100-pathLength circle so
        // we set stroke-dashoffset = 100 - completion percent.
        renderGoalRing();
    });

    // Goal ring also reacts to setting changes (user moved the slider).
    settingsSub('timer.dailyGoalMinutes', renderGoalRing);

    renderMomentumTrail();
    onSessionsChange(renderMomentumTrail);
}

function renderGoalRing() {
    const ring = document.getElementById('statGoalRing');
    const fill = ring?.querySelector('.stat-goal-ring__fill');
    if (!ring || !fill) return;
    const goalMin = Number(settingsGet('timer.dailyGoalMinutes')) || 0;
    if (goalMin <= 0) {
        ring.classList.add('hidden');
        return;
    }
    ring.classList.remove('hidden');
    const todayMin = totalFocusSeconds.value / 60;
    // Cap at 1 — we don't paint past the full ring. Once the user
    // hits the goal, the ring stays full and lights up.
    const progress = Math.min(1, todayMin / goalMin);
    fill.style.strokeDashoffset = String(100 - progress * 100);
    ring.classList.toggle('is-complete', progress >= 1);
    ring.setAttribute(
        'aria-label',
        `${Math.round(progress * 100)}% of daily focus goal`
    );
    ring.setAttribute('aria-hidden', 'false');
}

/** Replace the old streak counter ("47d" — guilt-shaped, resets on
 *  absence) with a 7-dot trail. Each dot's brightness is the count
 *  of focus sessions that day, normalised against the user's own
 *  recent peak (with a soft floor so a single session still feels
 *  meaningful). Today is the rightmost dot; never drops to fully
 *  invisible — it just dims. The label below stays "momentum". */
function renderMomentumTrail() {
    const root = document.getElementById('momentumTrail');
    if (!root) return;
    const dots = root.querySelectorAll('.momentum-dot');
    if (!dots.length) return;
    const counts = getDailySessionCounts(dots.length);
    // Soft floor of 4 sessions — beyond that, the brightest day caps
    // at full intensity; before it, even a single session reads as
    // a clearly lit dot rather than a faint mark.
    const peak = Math.max(...counts, 4);
    dots.forEach((dot, i) => {
        const intensity = peak === 0 ? 0 : Math.min(1, counts[i] / peak);
        dot.style.setProperty('--intensity', intensity.toFixed(3));
        dot.dataset.count = String(counts[i]);
    });
}

// ============================================================================
// Reset with inline confirmation
// ============================================================================
function resetAllStats() {
    sessionsToday.value = 0;
    totalFocusSeconds.value = 0;
    tasksCompletedToday.value = 0;
    currentStreak.value = 0;
    lastFocusDate.value = '';
    localStorage.removeItem(STATS_KEY);
}

function setupResetFlow() {
    const resetBtn = document.getElementById('statResetBtn');
    const chips = document.getElementById('statsChips');
    const confirm = document.getElementById('statsConfirm');
    const confirmYes = document.getElementById('statsConfirmYes');
    const confirmNo = document.getElementById('statsConfirmNo');

    if (!resetBtn || !chips || !confirm || !confirmYes || !confirmNo) return;

    let timeout = null;

    function showConfirm() {
        chips.classList.add('hidden');
        confirm.classList.remove('hidden');
        // Auto-cancel after 4 seconds if user doesn't respond
        timeout = setTimeout(hideConfirm, 4000);
    }

    function hideConfirm() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
        confirm.classList.add('hidden');
        chips.classList.remove('hidden');
    }

    resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showConfirm();
    });

    confirmYes.addEventListener('click', (e) => {
        e.preventDefault();
        resetAllStats();
        hideConfirm();
    });

    confirmNo.addEventListener('click', (e) => {
        e.preventDefault();
        hideConfirm();
    });
}

// ============================================================================
// Init
// ============================================================================
export function initStatistics() {
    loadStats();
    setupPersistence();
    renderStatsBar();
    setupResetFlow();
}
