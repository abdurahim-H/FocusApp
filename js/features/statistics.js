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
import { showGentleToast } from '../utils/gentle-toast.js';
import { getAllSessions, getDailySessionCounts, onSessionsChange } from './sessions.js';

// ============================================================================
// Signals
// ============================================================================
export const sessionsToday = signal(0);
export const totalFocusSeconds = signal(0);
export const tasksCompletedToday = signal(0);
export const currentStreak = signal(0);
export const lastFocusDate = signal('');
// Wave 24.9 — best day on record. Surfaces a celebratory toast when a
// session pushes today past the previous champion. Persisted alongside
// the rest of the stats so it survives reloads.
export const bestDayFocusSeconds = signal(0);
export const bestDayFocusDate = signal('');
// Wave 24.8 — streak insurance: ISO date of the day that was forgiven
// by the most recent freeze. Used to enforce the once-per-week limit.
export const lastFreezeUsedDate = signal('');

// ============================================================================
// Persistence
// ============================================================================
const STATS_KEY = 'fu_stats_v1';

/** Return today's date as YYYY-MM-DD in the user's LOCAL timezone.
 *  Earlier versions used `new Date().toISOString().slice(0, 10)` which
 *  returns UTC — for a user in CEST (UTC+2) that meant a focus session
 *  finished at 1 am local was bucketed under the previous day. The
 *  period-lower-bound functions further down already use local
 *  midnight; the *ISO helpers are now consistent. */
function localISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayISO() {
    return localISO(new Date());
}

function yesterdayISO() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return localISO(d);
}

function dayBeforeYesterdayISO() {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return localISO(d);
}

// Monday-anchored week start for the streak-insurance "once per week" check.
// Uses local time so the user's day boundary matches their wall clock.
function startOfWeekISO() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const dow = (d.getDay() + 6) % 7; // Mon=0..Sun=6
    d.setDate(d.getDate() - dow);
    return localISO(d);
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

        // Streak — preserved if today or yesterday saw a session. With
        // streak insurance enabled and unused this week, allow a single
        // gap day so the streak survives a missed yesterday too.
        if (typeof data.currentStreak === 'number') {
            const insuranceOn = settingsGet('gamification.streakInsurance') === true;
            const freezeUsedThisWeek =
                typeof data.lastFreezeUsedDate === 'string' &&
                data.lastFreezeUsedDate >= startOfWeekISO();
            if (data.lastFocusDate === today || data.lastFocusDate === yesterdayISO()) {
                currentStreak.value = data.currentStreak;
            } else if (
                insuranceOn &&
                !freezeUsedThisWeek &&
                data.lastFocusDate === dayBeforeYesterdayISO()
            ) {
                // Held the streak via insurance — actual consumption of
                // the freeze (writing lastFreezeUsedDate = yesterday)
                // happens in recordSessionComplete when the next session
                // lands. Keeping it lazy means a user who never returns
                // doesn't burn an unused freeze.
                currentStreak.value = data.currentStreak;
            } else {
                currentStreak.value = 0;
            }
        }

        // Wave 24.9 — best-day record
        if (typeof data.bestDayFocusSeconds === 'number') {
            bestDayFocusSeconds.value = data.bestDayFocusSeconds;
        }
        if (typeof data.bestDayFocusDate === 'string') {
            bestDayFocusDate.value = data.bestDayFocusDate;
        }

        // Wave 24.8 — streak insurance bookkeeping
        if (typeof data.lastFreezeUsedDate === 'string') {
            lastFreezeUsedDate.value = data.lastFreezeUsedDate;
        }
    } catch (e) {
        console.warn('[stats] failed to load:', e);
    }
}

let persistInitialized = false;
let persistScheduled = false;
function setupPersistence() {
    // recordSessionComplete and resetAllStats both touch 4-8 signals
    // back-to-back. The naive effect would fire one localStorage write
    // per signal mutation. Coalescing within a frame keeps that cost
    // to a single write per event burst without losing any updates —
    // we always re-snapshot the latest values at flush time.
    effect(() => {
        // Touch every persisted signal so the effect re-runs whenever
        // any of them change.
        sessionsToday.value;
        totalFocusSeconds.value;
        tasksCompletedToday.value;
        currentStreak.value;
        lastFocusDate.value;
        bestDayFocusSeconds.value;
        bestDayFocusDate.value;
        lastFreezeUsedDate.value;

        if (!persistInitialized) {
            persistInitialized = true;
            return;
        }
        if (persistScheduled) return;
        persistScheduled = true;
        requestAnimationFrame(() => {
            persistScheduled = false;
            const snapshot = {
                sessionsToday: sessionsToday.value,
                totalFocusSeconds: totalFocusSeconds.value,
                tasksCompletedToday: tasksCompletedToday.value,
                currentStreak: currentStreak.value,
                lastFocusDate: lastFocusDate.value,
                bestDayFocusSeconds: bestDayFocusSeconds.value,
                bestDayFocusDate: bestDayFocusDate.value,
                lastFreezeUsedDate: lastFreezeUsedDate.value,
            };
            try {
                localStorage.setItem(STATS_KEY, JSON.stringify(snapshot));
            } catch (e) {
                console.warn('[stats] failed to persist:', e);
            }
        });
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

    // Streak logic — extended with optional once-per-week insurance.
    if (prevDate === today) {
        // Already focused today — streak unchanged
    } else if (prevDate === yesterdayISO()) {
        currentStreak.value = currentStreak.value + 1;
    } else if (
        settingsGet('gamification.streakInsurance') === true &&
        prevDate === dayBeforeYesterdayISO() &&
        (!lastFreezeUsedDate.value || lastFreezeUsedDate.value < startOfWeekISO())
    ) {
        // Wave 24.8 — burn the freeze. Yesterday is treated as continuous
        // and today extends the streak. Only one freeze per ISO week.
        currentStreak.value = currentStreak.value + 1;
        lastFreezeUsedDate.value = yesterdayISO();
    } else {
        currentStreak.value = 1;
    }

    lastFocusDate.value = today;

    // Wave 24.9 — personal-best detection. The session record itself is
    // pushed into `sessions.js` *after* this function returns, so we sum
    // prior-today sessions and add this session's elapsed time directly.
    maybeFlagPersonalBest(elapsedSeconds);
}

function maybeFlagPersonalBest(justFinishedSeconds) {
    const today = todayISO();
    const oldBest = bestDayFocusSeconds.value;
    const oldBestDate = bestDayFocusDate.value;
    const todayTotal = sumSecondsForDate(today) + justFinishedSeconds;

    if (oldBestDate === today) {
        // Already the record-holder for the day — keep the cache fresh
        // but don't re-fire the celebration on every subsequent session.
        if (todayTotal > oldBest) bestDayFocusSeconds.value = todayTotal;
        return;
    }

    if (todayTotal > oldBest && oldBest > 0) {
        bestDayFocusSeconds.value = todayTotal;
        bestDayFocusDate.value = today;
        if (settingsGet('gamification.personalBestAlerts') === true) {
            celebratePersonalBest(todayTotal);
        }
    } else if (todayTotal > oldBest) {
        // First record set — adopt without alerting.
        bestDayFocusSeconds.value = todayTotal;
        bestDayFocusDate.value = today;
    }
}

/** Sum focus seconds across all sessions on the given ISO date. Pulls
 *  from the canonical sessions list; statistics' lifetime accumulator
 *  (`totalFocusSeconds`) isn't day-bucketed so it can't answer this.
 *
 *  Both the iso input and the parsed window are now LOCAL — matches
 *  todayISO() / yesterdayISO() etc. and the period-lower-bound
 *  functions, which all use local midnight. Previously the iso was
 *  UTC-formatted but parsed as UTC midnight, so a user in CEST who
 *  did focus from 22:00–23:30 local on Mar 4 (= 20:00–21:30 UTC) got
 *  it correctly bucketed; but a session at 00:30 local Mar 5 (=
 *  22:30 UTC Mar 4) was bucketed under "Mar 4" by ISO formatting yet
 *  the period-bound used local midnight (Mar 5), so the same session
 *  showed under different days in different code paths. */
function sumSecondsForDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const startMs = new Date(y, m - 1, d).getTime(); // local midnight
    const endMs = startMs + 86_400_000;
    return getAllSessions()
        .filter((s) => s.kind === 'focus' && s.startedAt >= startMs && s.startedAt < endMs)
        .reduce((a, s) => a + (s.durationSeconds || 0), 0);
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
// ============================================================================
// Period toggle — chips can show today / this week / this month / all time.
// State stored in localStorage so the user's choice persists across reloads.
// ============================================================================
const PERIOD_KEY = 'fu_stats_period';
const PERIODS = ['today', 'week', 'month', 'all'];
const PERIOD_LABELS = {
    today: 'TODAY',
    week: 'WEEK',
    month: 'MONTH',
    all: 'ALL-TIME',
};
const PERIOD_SUFFIX = {
    today: '',
    week: 'this week',
    month: 'this month',
    all: 'all-time',
};

function loadPeriod() {
    const v = localStorage.getItem(PERIOD_KEY);
    return PERIODS.includes(v) ? v : 'today';
}
function savePeriod(p) {
    try { localStorage.setItem(PERIOD_KEY, p); } catch (_) {}
}

let currentPeriod = loadPeriod();
const periodChangeSubscribers = new Set();

function setPeriod(p) {
    if (!PERIODS.includes(p) || p === currentPeriod) return;
    currentPeriod = p;
    savePeriod(p);
    for (const fn of periodChangeSubscribers) fn();
}

/** Compute the lower bound (epoch ms) for a period — sessions whose
 *  startedAt is >= this lower bound count toward the period. Returns
 *  null for 'all' (no lower bound). */
function periodLowerBound(p) {
    if (p === 'all') return null;
    if (p === 'today') {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }
    if (p === 'week') {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        // Mon-first ISO week: shift back to most-recent Monday.
        const dow = (d.getDay() + 6) % 7; // 0..6, Mon..Sun
        d.setDate(d.getDate() - dow);
        return d.getTime();
    }
    if (p === 'month') {
        const d = new Date();
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }
    return null;
}

/** Read the focus sessions that fall inside the active period. */
function sessionsInActivePeriod() {
    const lo = periodLowerBound(currentPeriod);
    const all = getAllSessions().filter((s) => s.kind === 'focus');
    return lo == null ? all : all.filter((s) => s.startedAt >= lo);
}

function renderStatsBar() {
    const bar = document.getElementById('statsBar');
    if (!bar) return;

    // Period toggle button — single click cycles through today / week /
    // month / all. Same button gets aria-pressed pseudo-state via the
    // data-period attribute so screen readers announce the new period.
    const toggle = document.getElementById('statPeriodToggle');
    if (toggle) {
        toggle.dataset.period = currentPeriod;
        toggle.addEventListener('click', () => {
            const i = PERIODS.indexOf(currentPeriod);
            setPeriod(PERIODS[(i + 1) % PERIODS.length]);
        });
        // Keyboard parity — Enter / Space already activate <button>; nothing else needed.
    }

    const paint = () => {
        const el = (id) => document.getElementById(id);
        const sessionsEl = el('statSessionsToday');
        const totalEl = el('statTotalMinutes');
        const tasksEl = el('statTasksToday');
        const streakEl = el('statStreak');

        const periodLabelEl = document.querySelector('[data-period-label]');
        if (periodLabelEl) periodLabelEl.textContent = PERIOD_LABELS[currentPeriod];
        if (toggle) toggle.dataset.period = currentPeriod;

        // Update each chip's "this week / this month / all-time" suffix
        // so the label is honest about which window the value reflects.
        document.querySelectorAll('[data-period-suffix]').forEach((node) => {
            const base = node.dataset.periodSuffix;
            const suffix = PERIOD_SUFFIX[currentPeriod];
            node.textContent = suffix ? `${base} ${suffix}` : base;
        });

        if (currentPeriod === 'today') {
            if (sessionsEl) sessionsEl.textContent = sessionsToday.value;
            // totalFocusSeconds is the LIFETIME accumulator — using it
            // here would render lifetime focus time as "Today's focus".
            // Re-derive today from the sessions list for accuracy.
            if (totalEl) totalEl.textContent = formatDuration(sumSecondsForDate(todayISO()));
            if (tasksEl) tasksEl.textContent = tasksCompletedToday.value;
        } else {
            const periodSessions = sessionsInActivePeriod();
            const sec = periodSessions.reduce((a, s) => a + (s.durationSeconds || 0), 0);
            const tasks = periodSessions.reduce((a, s) => a + (s.tasksCompleted || 0), 0);
            if (sessionsEl) sessionsEl.textContent = periodSessions.length;
            if (totalEl) totalEl.textContent = formatDuration(sec);
            if (tasksEl) tasksEl.textContent = tasks;
        }

        if (streakEl) streakEl.textContent = currentStreak.value;

        // Streak target chip (Wave 10.2). Renders once the user reaches
        // their configured streak goal. Hidden if no goal set or not
        // yet reached. We deliberately only show the affirmation —
        // not "N to go" — so the streak chip stays calm-coded.
        const streakTargetEl = el('statStreakTarget');
        if (streakTargetEl) {
            const goal = Number(settingsGet('timer.streakGoal')) || 0;
            const streak = currentStreak.value;
            if (goal > 0 && streak >= goal) {
                streakTargetEl.textContent = `🎯 ${goal}-day target hit`;
                streakTargetEl.classList.remove('hidden');
            } else {
                streakTargetEl.classList.add('hidden');
                streakTargetEl.textContent = '';
            }
        }

        // Daily goal ring — only paints when the user has an active
        // target. The progress fill is on a 100-pathLength circle so
        // we set stroke-dashoffset = 100 - completion percent.
        renderGoalRing();
    };

    effect(() => {
        // Touch every signal that should retrigger the paint when it
        // changes. Keeps the deps explicit instead of relying on which
        // ones get read inside paint() under each branch.
        sessionsToday.value;
        totalFocusSeconds.value;
        tasksCompletedToday.value;
        currentStreak.value;
        paint();
    });

    // Period change → repaint. Session list change → repaint (matters
    // when the period is week / month / all).
    periodChangeSubscribers.add(paint);
    onSessionsChange(paint);

    settingsSub('timer.dailyGoalMinutes', renderGoalRing);
    // Streak goal lives in the same effect as the rest of the chips —
    // when the user moves the goal slider, repaint to refresh the
    // "target hit" indicator without waiting for the next signal tick.
    settingsSub('timer.streakGoal', paint);

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
    // Daily progress must read TODAY, not lifetime. Same reason as
    // the stats-bar fix above — `totalFocusSeconds` is a lifetime
    // accumulator and would mark the goal complete after the user
    // has done enough focus across all time, not just today.
    const todayMin = sumSecondsForDate(todayISO()) / 60;
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
    bestDayFocusSeconds.value = 0;
    bestDayFocusDate.value = '';
    lastFreezeUsedDate.value = '';
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

// ============================================================================
// Wave 24.9 — celebratory toast for a new personal-best day. Routed
// through the shared gentle-toast queue so it can't overlap with a
// wellness reminder firing in the same tick.
// ============================================================================
function celebratePersonalBest(seconds) {
    showGentleToast({
        icon: '🌟',
        title: 'New personal best',
        detail: `${formatDuration(seconds)} focused today`,
    });
}
