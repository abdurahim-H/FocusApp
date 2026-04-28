// home-period-tiles.js
//
// Two summary tiles on the Home tab — "this week" and "this month".
// Both repaint on every change to the session list (signal-driven) and
// stay hidden until the user has at least one finished focus session,
// so a brand-new account doesn't see an empty zero-state on landing.
//
// Tap → opens the Profile panel scrolled to the relevant section
// (Focus for the week tile, Time for the month tile). The tiles are
// stat-bar-adjacent in feel: live data, calm copy, no fluff.

import { getAllSessions, onSessionsChange } from '../features/sessions.js';
import { dailyTotals } from '../features/analytics.js';
import { openProfile } from './profile.js';

let initialised = false;
let root = null;

export function initHomePeriodTiles() {
    if (initialised) return;
    initialised = true;

    root = document.getElementById('homePeriodTiles');
    if (!root) return;

    // Click-through to Profile. Tile is a real <button>; the click
    // bubbles to here. We don't switch tabs first because Profile is
    // its own overlay panel — opens directly from Home.
    root.querySelectorAll('[data-period]').forEach((tile) => {
        tile.addEventListener('click', () => {
            const period = tile.dataset.period;
            openProfile(period === 'week' ? 'focus' : 'time');
        });
    });

    paint();
    onSessionsChange(paint);
}

// ───────────────────────────────────────────────────────────────────────
// Paint
// ───────────────────────────────────────────────────────────────────────

function paint() {
    if (!root) return;
    const sessions = getAllSessions().filter((s) => s.kind === 'focus');
    if (sessions.length === 0) {
        root.classList.add('hidden');
        return;
    }
    root.classList.remove('hidden');

    paintWeek(sessions);
    paintMonth(sessions);
}

function paintWeek(sessions) {
    // Trailing 14 daily totals lets us compare current week (last 7)
    // with the prior week (the 7 before that). Both windows aligned
    // to "today" rather than to calendar weeks so the comparison is
    // a same-length-window read, not a weekday-edge effect.
    const last14 = dailyTotals(sessions, 14);
    const thisWeek = last14.slice(-7);
    const prevWeek = last14.slice(0, 7);
    const thisSum = sum(thisWeek);
    const prevSum = sum(prevWeek);

    const valueEl = root.querySelector('[data-week-value]');
    const unitEl = root.querySelector('[data-week-unit]');
    const deltaEl = root.querySelector('[data-week-delta]');
    const barsEl = root.querySelector('[data-week-bars]');
    const subEl = root.querySelector('[data-week-sub]');

    const { value, unit } = formatMinutes(thisSum);
    if (valueEl) valueEl.textContent = value;
    if (unitEl) unitEl.textContent = unit;
    if (deltaEl) renderDelta(deltaEl, thisSum, prevSum);

    if (barsEl) barsEl.innerHTML = renderMiniBars(thisWeek);

    // Sub-line: always says something useful even with zero history
    // before this week (no NaN / Infinity from divide-by-zero deltas).
    if (subEl) {
        const peakIdx = thisWeek.indexOf(Math.max(...thisWeek));
        const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        // dailyTotals is anchored to today as the last entry, so the
        // weekday for index i is "today minus (6 - i) days".
        const today = new Date();
        const peakDate = new Date(today);
        peakDate.setDate(today.getDate() - (6 - peakIdx));
        const peakDayLabel = dayLabels[(peakDate.getDay() + 6) % 7]; // Mon-first
        if (thisSum === 0) {
            subEl.textContent = 'no focus sessions yet this week';
        } else {
            const peakMin = Math.round(thisWeek[peakIdx]);
            subEl.textContent = `peak ${peakDayLabel} · ${peakMin} min`;
        }
    }
}

function paintMonth(sessions) {
    // Compare last 30 days vs the 30 before. Like the week tile, this
    // is a trailing-window read, not a calendar-month read — calendar
    // months vary 28..31 days and the comparison gets noisy at month
    // boundaries.
    const last60 = dailyTotals(sessions, 60);
    const thisMonth = last60.slice(-30);
    const prevMonth = last60.slice(0, 30);
    const thisSum = sum(thisMonth);
    const prevSum = sum(prevMonth);

    const sessionsThisMonth = sessions.filter(
        (s) => s.startedAt >= Date.now() - 30 * 86_400_000
    ).length;
    const activeDays = thisMonth.filter((v) => v > 0).length;
    const bestDay = Math.max(...thisMonth, 0);

    const valueEl = root.querySelector('[data-month-value]');
    const unitEl = root.querySelector('[data-month-unit]');
    const deltaEl = root.querySelector('[data-month-delta]');
    const sessionsEl = root.querySelector('[data-month-sessions]');
    const activeDaysEl = root.querySelector('[data-month-active-days]');
    const bestEl = root.querySelector('[data-month-best]');
    const subEl = root.querySelector('[data-month-sub]');

    const { value, unit } = formatMinutes(thisSum);
    if (valueEl) valueEl.textContent = value;
    if (unitEl) unitEl.textContent = unit;
    if (deltaEl) renderDelta(deltaEl, thisSum, prevSum);
    if (sessionsEl) sessionsEl.textContent = String(sessionsThisMonth);
    if (activeDaysEl) activeDaysEl.textContent = String(activeDays);
    if (bestEl) bestEl.textContent = `${Math.round(bestDay)} min`;

    if (subEl) {
        if (thisSum === 0) {
            subEl.textContent = 'no focus sessions yet this month';
        } else {
            const ratePerDay = thisSum / Math.max(1, activeDays);
            subEl.textContent = `${Math.round(ratePerDay)} min on the days you focused`;
        }
    }
}

// ───────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────

function sum(arr) {
    let total = 0;
    for (const v of arr) total += v;
    return total;
}

function formatMinutes(min) {
    // Show hours once we cross 60 — keeps the headline readable. Round
    // to one decimal at "X.Y hrs" for the in-between hours; integer
    // minutes below 60.
    if (min >= 60) {
        const hrs = min / 60;
        return { value: hrs.toFixed(1), unit: 'hrs' };
    }
    return { value: String(Math.round(min)), unit: 'min' };
}

function renderDelta(el, current, previous) {
    // Three honest cases: no prior data → say "no comparison yet";
    // exact match (rare) → "no change"; otherwise the percentage
    // change with an up / down arrow + tone class.
    if (previous === 0 && current === 0) {
        el.textContent = '';
        el.className = 'home-period-tile__delta';
        return;
    }
    if (previous === 0) {
        el.textContent = 'new';
        el.className = 'home-period-tile__delta is-up';
        return;
    }
    const pct = Math.round(((current - previous) / previous) * 100);
    if (pct === 0) {
        el.textContent = 'no change';
        el.className = 'home-period-tile__delta';
        return;
    }
    el.textContent = `${pct > 0 ? '↑' : '↓'} ${Math.abs(pct)}%`;
    el.className = `home-period-tile__delta ${pct > 0 ? 'is-up' : 'is-down'}`;
}

function renderMiniBars(week) {
    const peak = Math.max(...week, 1);
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // dailyTotals is anchored to today; rotate the array so Monday is
    // at index 0 regardless of which weekday today is, matching the
    // visible labels.
    const today = new Date();
    const todayIdx = (today.getDay() + 6) % 7; // 0..6, Mon..Sun
    // last7[6] is today, last7[5] is yesterday, etc. We want a Mon..Sun
    // array. Walk back from today and place each value at the right
    // index. Days that haven't happened this week stay zero.
    const monSun = new Array(7).fill(0);
    for (let i = 0; i < 7; i++) {
        const realIdx = todayIdx - (6 - i);
        if (realIdx >= 0 && realIdx < 7) monSun[realIdx] = week[i];
    }
    return monSun
        .map((v, i) => {
            const intensity = peak === 0 ? 0 : v / peak;
            const heightPct = Math.max(6, intensity * 100);
            const isToday = i === todayIdx;
            return `<span class="home-period-tile__bar ${isToday ? 'is-today' : ''}"
                          style="--h:${heightPct.toFixed(1)}%"
                          title="${labels[i]} · ${Math.round(v)} min"></span>`;
        })
        .join('');
}
