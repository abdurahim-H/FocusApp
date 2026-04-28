// profile.js — the comprehensive analytics + identity destination.
//
// Replaces the standalone Observatory. Full-viewport sheet with a
// left-side rail and a content panel; six sections; each section is a
// dense scrollable column of headline numbers, charts (real charts —
// hand-rolled SVG), and statistical insights derived from the
// per-session table.
//
// Sections:
//   1. Overview  — identity card + at-a-glance KPIs + cosmic signature
//   2. Focus     — focus-session deep stats: trend line, calendar
//                  heatmap, duration histogram, anomaly callouts
//   3. Tasks     — task completion analytics: per-day, per-day-of-week,
//                  per-hour, efficiency (tasks per minute)
//   4. Sounds    — companion analysis with Cohen's d effect sizes,
//                  donut of usage distribution, sample-size disclosure
//   5. Time      — hour×day heatmap, polar best-hour curve, calendar
//                  heatmap (last 365 days), constellation spiral
//   6. Insights  — data-science-derived narratives: regression trend,
//                  week-over-week delta, z-score anomalies, friction
//                  cost (context-switching as lost minutes)
//
// Open via the account dropdown ("Profile"), the momentum trail click,
// or the `i` keyboard shortcut. Background gets `inert` while open.
// Live re-renders when a session lands.

import { isReducedMotion } from '../core/motion.js';
import * as auth from '../features/auth.js';
import {
    anomalyFlags,
    bucketByDayOfWeek,
    bucketByHour,
    calendarMatrix,
    changeAcross,
    chooseBestK,
    cohensD,
    dailyTotals,
    detectChangePoint,
    histogram,
    holtWintersAdditive,
    holtWintersForecast,
    hourDayMatrix,
    linearRegression,
    mean,
    median,
    movingAverage,
    pearsonCorrelation,
    percentile,
    percentileRank,
    rankConditions,
    soundEffects,
    stdDev,
    zScore,
} from '../features/analytics.js';
import { getAllSessions, onSessionsChange } from '../features/sessions.js';
import {
    barChart,
    calendarHeatmap,
    donut,
    histogramChart,
    hourDayHeatmap,
    lineChart,
    percentileGauge,
    sparkline,
} from './charts.js';
import { createFocusTrap } from './focus-trap.js';

// ───────────────────────────────────────────────────────────────────────
// Sections
// ───────────────────────────────────────────────────────────────────────

const SECTIONS = [
    { id: 'overview', label: 'Overview' },
    { id: 'focus',    label: 'Focus' },
    { id: 'tasks',    label: 'Tasks' },
    { id: 'sounds',   label: 'Sounds' },
    { id: 'time',     label: 'Time' },
    { id: 'insights', label: 'Insights' },
];

let initialised = false;
let panel = null;
let trap = null;
let isOpen = false;
let activeSection = 'overview';
let currentUser = null;
let unsubscribeSessions = null;
let unsubscribeAuth = null;
// When the user clicks an insight card, the Insights body switches
// to a detail view for that one card. Stays null otherwise.
let activeInsightDetail = null;
// When the user clicks a day cell on any calendar heatmap (60-day,
// 90-day, 365-day), the entire content area swaps to a full
// breakdown of that one day. ISO yyyy-mm-dd or null.
let activeDayDetail = null;

// ───────────────────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────────────────

export function initProfile() {
    if (initialised) return;
    initialised = true;

    // Track current user for the header avatar / identity card.
    unsubscribeAuth = auth.onChange(({ user }) => {
        currentUser = user || null;
        if (isOpen && activeSection === 'overview') render();
    });

    // Momentum-trail entry — clicking the dots opens Profile.
    const trail = document.getElementById('momentumTrail');
    if (trail) {
        const chip = trail.closest('.stat-chip');
        if (chip) {
            chip.setAttribute('role', 'button');
            chip.setAttribute('tabindex', '0');
            chip.setAttribute('aria-label', 'Open your profile');
            chip.style.cursor = 'pointer';
            chip.addEventListener('click', () => open());
            chip.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    open();
                }
            });
        }
    }

    document.addEventListener('keydown', (e) => {
        if (isOpen) {
            if (e.key === 'Escape') {
                // Esc backs out of the active sub-view first, then
                // closes the panel — same pattern users have in
                // photo viewers and modals with drill-downs.
                if (activeDayDetail) {
                    setDayDetail(null);
                    e.preventDefault();
                    return;
                }
                if (activeInsightDetail) {
                    setInsightDetail(null);
                    e.preventDefault();
                    return;
                }
                close();
            }
            else if (e.key >= '1' && e.key <= '6') {
                const idx = parseInt(e.key, 10) - 1;
                if (idx < SECTIONS.length) {
                    e.preventDefault();
                    setSection(SECTIONS[idx].id);
                }
            }
            return;
        }
        if (e.key === 'i') {
            const a = document.activeElement;
            if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
            if (document.querySelector('.auth-modal.is-open, .help-center-overlay.is-open, #settingsPanel.is-open')) return;
            e.preventDefault();
            open();
        }
    });
}

/** Public entry — used by the account dropdown's "Profile" button. */
export function openProfile(section = null) {
    if (section) activeSection = section;
    open();
}

// ───────────────────────────────────────────────────────────────────────
// Open / close
// ───────────────────────────────────────────────────────────────────────

function open() {
    if (isOpen) return;
    isOpen = true;
    if (!panel) buildPanel();
    panel.setAttribute('aria-hidden', 'false');
    render();
    panel.classList.add('is-open');
    if (!trap) trap = createFocusTrap(panel);
    trap.activate(document.activeElement);
    if (!unsubscribeSessions) {
        unsubscribeSessions = onSessionsChange(() => {
            if (isOpen) render();
        });
    }
}

function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    // Reset drill-downs so reopening lands on the section's grid
    // rather than a stale detail view from the prior session.
    activeInsightDetail = null;
    activeDayDetail = null;
    trap?.deactivate();
    if (unsubscribeSessions) {
        unsubscribeSessions();
        unsubscribeSessions = null;
    }
}

function setSection(id) {
    if (!SECTIONS.some((s) => s.id === id)) return;
    if (activeSection === id) return;
    activeSection = id;
    // Switching sections always clears any open detail — otherwise a
    // stale detail view would surface on next return.
    activeInsightDetail = null;
    activeDayDetail = null;
    render();
    const body = panel.querySelector('#profileContent');
    if (body) body.scrollTop = 0;
}

function setInsightDetail(kind) {
    activeInsightDetail = kind;
    activeDayDetail = null;
    render();
    const body = panel.querySelector('#profileContent');
    if (body) body.scrollTop = 0;
}

function setDayDetail(iso) {
    // Accept null to clear, or a well-formed yyyy-mm-dd string.
    // Anything else (tampered DOM attr, etc.) is dropped silently.
    if (iso !== null && (typeof iso !== 'string' || !ISO_DAY_RE.test(iso))) {
        return;
    }
    activeDayDetail = iso;
    activeInsightDetail = null;
    render();
    const body = panel.querySelector('#profileContent');
    if (body) body.scrollTop = 0;
}

// ───────────────────────────────────────────────────────────────────────
// Build / render
// ───────────────────────────────────────────────────────────────────────

function buildPanel() {
    panel = document.createElement('div');
    panel.className = 'profile';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Profile — your full analytics');
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = `
        <div class="profile__scrim" data-profile-close></div>
        <div class="profile__sheet">
            <header class="profile__header">
                <button class="profile__close" type="button"
                        aria-label="Close" data-profile-close>×</button>
                <div class="profile__title">
                    <span class="profile__eyebrow">PROFILE</span>
                </div>
                <div class="profile__identity" id="profileIdentity"></div>
            </header>
            <div class="profile__layout">
                <nav class="profile__rail" id="profileRail" role="tablist"
                     aria-label="Profile sections"></nav>
                <main class="profile__content" id="profileContent"
                      role="tabpanel" aria-live="polite"></main>
            </div>
        </div>
    `;
    document.body.appendChild(panel);
    panel.querySelectorAll('[data-profile-close]').forEach((el) =>
        el.addEventListener('click', close)
    );

    // Delegated handlers — content innerHTML is rewritten on every
    // section / detail switch, so listeners go on the stable host.
    const content = panel.querySelector('#profileContent');
    if (content) {
        content.addEventListener('click', (e) => {
            if (e.target.closest('[data-insight-back]')) {
                setInsightDetail(null);
                return;
            }
            if (e.target.closest('[data-day-back]')) {
                setDayDetail(null);
                return;
            }
            const card = e.target.closest('[data-insight-open]');
            if (card) {
                setInsightDetail(card.dataset.insightOpen);
                return;
            }
            const dayCell = e.target.closest('[data-day-iso]');
            if (dayCell) {
                setDayDetail(dayCell.dataset.dayIso);
            }
        });
        content.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const card = e.target.closest('[data-insight-open]');
            if (card) {
                e.preventDefault();
                setInsightDetail(card.dataset.insightOpen);
                return;
            }
            const dayCell = e.target.closest('[data-day-iso]');
            if (dayCell) {
                e.preventDefault();
                setDayDetail(dayCell.dataset.dayIso);
            }
        });
    }
}

function render() {
    renderIdentity();
    renderRail();
    renderContent();
}

function renderIdentity() {
    const host = panel.querySelector('#profileIdentity');
    if (!host) return;
    if (currentUser) {
        const meta = currentUser.user_metadata || {};
        const name = escapeHtml(meta.name || currentUser.email || 'Account');
        const handle = meta.username ? `@${escapeHtml(meta.username)}` : '';
        host.innerHTML = `
            <span class="profile__id-name">${name}</span>
            ${handle ? `<span class="profile__id-handle">${handle}</span>` : ''}
        `;
    } else {
        host.innerHTML = `<span class="profile__id-anon">anonymous · this device only</span>`;
    }
}

function renderRail() {
    const rail = panel.querySelector('#profileRail');
    if (!rail) return;
    rail.innerHTML = SECTIONS.map((s, i) => `
        <button class="profile__rail-btn ${s.id === activeSection ? 'is-active' : ''}"
                type="button" role="tab"
                data-section="${s.id}"
                aria-selected="${s.id === activeSection}"
                title="${s.label} (press ${i + 1})">
            <span class="profile__rail-dot" aria-hidden="true"></span>
            <span class="profile__rail-label">${s.label}</span>
        </button>
    `).join('');
    rail.querySelectorAll('[data-section]').forEach((btn) =>
        btn.addEventListener('click', () => setSection(btn.dataset.section))
    );
}

function renderContent() {
    const host = panel.querySelector('#profileContent');
    if (!host) return;
    const allSessions = getAllSessions();
    const sessions = allSessions.filter((s) => s.kind === 'focus');
    let html = '';
    if (activeDayDetail) {
        // Calendar-cell click — overrides whatever section was active.
        // We pass the unfiltered list so per-day stats can still use
        // the full set if we ever need non-focus data later.
        html = renderDayDetail(activeDayDetail, sessions);
    } else {
        switch (activeSection) {
            case 'overview': html = renderOverview(sessions); break;
            case 'focus':    html = renderFocus(sessions); break;
            case 'tasks':    html = renderTasks(sessions); break;
            case 'sounds':   html = renderSounds(sessions); break;
            case 'time':     html = renderTime(sessions); break;
            case 'insights': html = renderInsights(sessions); break;
        }
    }
    host.innerHTML = `<section class="psection psection--${activeSection}">${html}</section>`;
    requestAnimationFrame(() => {
        const sec = host.querySelector('.psection');
        if (sec) sec.classList.add('is-revealed');
        animateCountUps(host);
    });
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 1 — Overview
// ═══════════════════════════════════════════════════════════════════════

function renderOverview(sessions) {
    const totalSec = sessions.reduce((a, s) => a + (s.durationSeconds || 0), 0);
    const totalHrs = totalSec / 3600;
    const sessionsCount = sessions.length;
    const avgQuality = sessions.length
        ? Math.round(mean(sessions.map((s) => s.focusQuality || 0)))
        : 0;
    const last30 = dailyTotals(sessions, 30);
    const last7 = last30.slice(-7);
    const last7Sum = last7.reduce((a, x) => a + x, 0);

    return `
        ${sectionHeader('Overview', currentUser ? 'a quick look at your account' : 'this device only — sign in to bring your data across devices')}

        ${kpiRow([
            { label: 'hours focused', value: totalHrs >= 1 ? totalHrs.toFixed(1) : (totalSec / 60).toFixed(0), unit: totalHrs >= 1 ? 'hrs' : 'min', count: false },
            { label: 'sessions', value: sessionsCount, unit: '', count: true },
            { label: 'last 7 days', value: Math.round(last7Sum), unit: 'min', count: true },
            { label: 'avg quality', value: avgQuality, unit: '/100', count: true },
        ])}

        ${sessionsCount === 0 ? renderOverviewEmpty() : `
            <div class="psection__row psection__row--split">
                <div class="psection__card">
                    <div class="psection__card-eyebrow">last 30 days</div>
                    <div class="psection__card-viz">
                        ${lineChart({
                            values: last30,
                            width: 480,
                            height: 160,
                            unit: 'm',
                            area: true,
                            dots: false,
                            trend: regressionLine(last30),
                        })}
                    </div>
                </div>
                <div class="psection__card psection__card--signature">
                    <div class="psection__card-eyebrow">your last 60 days</div>
                    <p class="psection__card-sub">each square is one day · brighter means more focused · today is the bottom-right square</p>
                    ${render60DayGrid(sessions)}
                </div>
            </div>
        `}
    `;
}

function renderOverviewEmpty() {
    return `
        <div class="psection__empty">
            <p class="psection__empty-headline">no focus sessions yet</p>
            <p class="psection__empty-sub">finish one focus session and the rest of your overview shows up here.</p>
        </div>
    `;
}

/** A 60-day calendar grid: 6 rows × 10 columns, oldest top-left,
 *  today bottom-right. Each square's brightness scales with focus
 *  minutes that day. Today's square gets a thin outline so you can
 *  spot it without reading copy. */
function render60DayGrid(sessions) {
    const days = 60;
    const counts = dailyTotals(sessions, days);
    const peak = Math.max(...counts, 1);
    const COLS = 10;
    const ROWS = 6;
    const CELL = 18;
    const GAP = 4;
    const W = COLS * (CELL + GAP) - GAP + 4;
    const H = ROWS * (CELL + GAP) - GAP + 4;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cells = [];
    for (let i = 0; i < days; i++) {
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        const x = 2 + col * (CELL + GAP);
        const y = 2 + row * (CELL + GAP);
        const minutes = counts[i] || 0;
        const intensity = peak > 0 ? minutes / peak : 0;
        const isToday = i === days - 1;
        // Faint baseline so empty days stay visible — never disappear.
        const fillOpacity = 0.05 + 0.85 * intensity;
        // dailyTotals returns the trailing window oldest-first; cell i
        // is `(days - 1 - i)` days ago.
        const dayDate = new Date(today);
        dayDate.setDate(dayDate.getDate() - (days - 1 - i));
        const iso = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
        const cls = ['day-grid__cell'];
        if (isToday) cls.push('day-grid__today');
        cells.push(`
            <rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="4"
                  class="${cls.join(' ')}"
                  data-day-iso="${iso}"
                  tabindex="0" role="button"
                  aria-label="${dayDate.toDateString()}, ${Math.round(minutes)} minutes focused"
                  fill="currentColor" fill-opacity="${fillOpacity.toFixed(3)}">
                <title>${dayDate.toDateString()} · ${Math.round(minutes)} min — click for the full day</title>
            </rect>
        `);
    }
    return `
        <svg class="day-grid" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
            ${cells.join('')}
        </svg>
    `;
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 2 — Focus
// ═══════════════════════════════════════════════════════════════════════

function renderFocus(sessions) {
    if (sessions.length === 0) {
        return `
            ${sectionHeader('Focus', 'how your focus sessions have looked over time')}
            ${emptyState('finish a focus session to start filling this in.')}
        `;
    }
    const durations = sessions.map((s) => (s.durationSeconds || 0) / 60);
    const totalSec = sessions.reduce((a, s) => a + (s.durationSeconds || 0), 0);
    const completionRate = sessions.length
        ? sessions.filter((s) => s.completed).length / sessions.length
        : 0;
    const avgDur = mean(durations);
    const medianDur = median(durations);
    const sdDur = stdDev(durations);
    const last90 = dailyTotals(sessions, 90);
    const ma7 = movingAverage(last90, 7);
    const trendData = regressionLine(last90);
    const reg = regressionStats(last90);
    const heatmap = calendarMatrix(sessions, 90);
    const bins = histogram(durations, 10);

    // Trailing 7 vs prior 7 change.
    const wow = changeAcross(last90.slice(-14), 7);

    // Anomaly: today's session(s) total minutes vs distribution.
    const todayTotal = last90[last90.length - 1] || 0;
    const z = zScore(todayTotal, last90.slice(0, -1));

    return `
        ${sectionHeader('Focus', 'how your focus sessions have looked over time')}

        ${kpiRow([
            { label: 'total time', value: totalSec >= 3600
                ? (totalSec / 3600).toFixed(1) : Math.round(totalSec / 60), unit: totalSec >= 3600 ? 'hrs' : 'min', count: false },
            { label: 'sessions', value: sessions.length, unit: '', count: true },
            { label: 'avg duration', value: Math.round(avgDur), unit: 'min', count: true },
            { label: 'completion', value: Math.round(completionRate * 100), unit: '%', count: true },
        ])}

        ${chartCard({
            eyebrow: 'last 90 days · daily focus minutes',
            sub: reg ? regressionNarrative(reg, 'minute') : '',
            chart: lineChart({
                values: last90,
                width: 720,
                height: 200,
                unit: 'm',
                area: true,
                trend: trendData,
            }),
        })}

        <div class="psection__row psection__row--split">
            ${chartCard({
                eyebrow: 'how long your sessions usually run',
                sub: `most last around ${medianDur.toFixed(0)} min · they vary by ±${sdDur.toFixed(0)} min from session to session`,
                chart: histogramChart({ bins, width: 360, height: 180, unit: 'm' }),
            })}
            ${chartCard({
                eyebrow: 'your week-to-week pace',
                sub: 'a smoothed line — the wobbles wash out, the drift shows',
                chart: lineChart({
                    values: ma7,
                    width: 360,
                    height: 180,
                    unit: 'm',
                    area: false,
                    dots: false,
                }),
            })}
        </div>

        ${chartCard({
            eyebrow: 'last 90 days · calendar',
            sub: 'each square is a day; the brighter it is, the more you focused',
            chart: calendarHeatmap({ matrix: heatmap }),
        })}

        ${insightCallouts([
            wow && wow.delta != null ? {
                label: 'THIS WEEK vs LAST WEEK',
                value: `${wow.delta >= 0 ? '+' : '−'}${Math.abs(wow.delta * 100).toFixed(0)}%`,
                tone: wow.delta >= 0 ? 'good' : 'flat',
                hint: `${Math.round(wow.newer)} minutes a day now · ${Math.round(wow.older)} minutes a day before`,
            } : null,
            Math.abs(z) >= 1.5 ? {
                label: 'TODAY',
                value: z > 0 ? 'big day' : 'quiet day',
                tone: z > 0 ? 'good' : 'flat',
                hint: z > 0 ? 'well above your normal pace' : 'well below your normal pace',
            } : null,
            sessions.length >= 5 ? (() => {
                const rankPct = Math.round(percentileRank(todayTotal, last90.slice(0, -1)) * 100);
                const ordinal = rankPct >= 90 ? 'top 10%'
                    : rankPct >= 75 ? 'top 25%'
                    : rankPct >= 50 ? 'above-average day'
                    : rankPct >= 25 ? 'below-average day'
                    : 'quietest 25%';
                return {
                    label: 'TODAY vs LAST 90',
                    value: ordinal,
                    tone: rankPct >= 50 ? 'good' : 'flat',
                    hint: `today\'s focus ranks higher than ${rankPct}% of your last 90 days`,
                };
            })() : null,
        ])}
    `;
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 3 — Tasks
// ═══════════════════════════════════════════════════════════════════════

function renderTasks(sessions) {
    if (sessions.length === 0) {
        return `
            ${sectionHeader('Tasks', 'when you actually get tasks done')}
            ${emptyState('finish a focus session with a task ticked off and the numbers start showing.')}
        `;
    }

    const totalTasks = sessions.reduce((a, s) => a + (s.tasksCompleted || 0), 0);
    const sessionsWithTasks = sessions.filter((s) => (s.tasksCompleted || 0) > 0).length;
    const avgPerSession = sessions.length ? totalTasks / sessions.length : 0;
    const totalMinutes = sessions.reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60;
    const tasksPerHour = totalMinutes ? totalTasks / (totalMinutes / 60) : 0;

    // Tasks per day across last 30 days.
    const last30Tasks = dailyTotals(sessions, 30, 'tasksCompleted');
    const tasksDoW = bucketByDayOfWeek(sessions.map((s) => ({
        startedAt: s.startedAt,
        durationSeconds: s.tasksCompleted || 0, // re-use as count
    })));
    const tasksHour = bucketByHour(sessions.map((s) => ({
        startedAt: s.startedAt,
        durationSeconds: s.tasksCompleted || 0,
    })));

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const peakDay = tasksDoW.indexOf(Math.max(...tasksDoW));
    const peakHourTasks = tasksHour.indexOf(Math.max(...tasksHour));

    return `
        ${sectionHeader('Tasks', 'when you actually get tasks done')}

        ${kpiRow([
            { label: 'tasks done', value: totalTasks, unit: '', count: true },
            { label: 'avg per session', value: avgPerSession.toFixed(1), unit: '', count: false },
            { label: 'tasks per hour', value: tasksPerHour.toFixed(1), unit: '', count: false },
            { label: 'sessions w/ tasks', value: Math.round((sessionsWithTasks / Math.max(1, sessions.length)) * 100), unit: '%', count: true },
        ])}

        ${chartCard({
            eyebrow: 'last 30 days · tasks completed per day',
            sub: '',
            chart: lineChart({
                values: last30Tasks,
                width: 720,
                height: 180,
                unit: '',
                area: true,
                dots: false,
                trend: regressionLine(last30Tasks),
            }),
        })}

        <div class="psection__row psection__row--split">
            ${chartCard({
                eyebrow: 'by day of week',
                sub: tasksDoW.some((v) => v > 0) ? `you complete most on ${dayLabels[peakDay]}s` : '',
                chart: barChart({
                    bars: dayLabels.map((lab, i) => ({ label: lab, value: tasksDoW[i] })),
                    width: 360,
                    height: 200,
                }),
            })}
            ${chartCard({
                eyebrow: 'by hour of day',
                sub: tasksHour.some((v) => v > 0) ? `peak: ${formatHour(peakHourTasks)}` : '',
                chart: barChart({
                    bars: [0, 6, 9, 12, 15, 18, 21].map((h) => ({
                        label: formatHour(h),
                        value: tasksHour[h] + (tasksHour[h+1] || 0) + (tasksHour[h+2] || 0),
                    })),
                    width: 360,
                    height: 200,
                }),
            })}
        </div>

        ${insightCallouts([
            avgPerSession > 0 ? {
                label: 'EFFICIENCY',
                value: `${tasksPerHour.toFixed(1)} per hour`,
                tone: 'flat',
                hint: 'tasks completed for every hour of focused time',
            } : null,
            sessions.filter((s) => (s.tasksCompleted || 0) >= 3).length >= 3 ? {
                label: 'PEAK SESSION',
                value: `${Math.max(...sessions.map((s) => s.tasksCompleted || 0))} tasks`,
                tone: 'good',
                hint: 'most tasks ever completed in a single session',
            } : null,
        ])}
    `;
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 4 — Sounds
// ═══════════════════════════════════════════════════════════════════════

function renderSounds(sessions) {
    const month = sessions.filter((s) => s.startedAt >= Date.now() - 30 * 86400_000);
    const all = sessions;

    const counts = new Map();
    for (const s of all) {
        for (const sound of s.activeSounds || []) {
            counts.set(sound, (counts.get(sound) || 0) + 1);
        }
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const totalSessions = all.length;
    const sessionsWithSound = all.filter((s) => (s.activeSounds || []).length > 0).length;
    const soundOnRate = totalSessions ? sessionsWithSound / totalSessions : 0;
    const uniqueSounds = counts.size;
    const avgSoundsPerSession = sessionsWithSound
        ? all.reduce((a, s) => a + (s.activeSounds || []).length, 0) / totalSessions
        : 0;

    if (totalSessions === 0) {
        return `
            ${sectionHeader('Sounds', 'which ambient sounds you use and how they affect your sessions')}
            ${emptyState('a few sessions and the sound numbers start to mean something.')}
        `;
    }

    const effects = soundEffects(month, { minSamples: 4 });
    const top = ranked.slice(0, 5);

    return `
        ${sectionHeader('Sounds', 'which ambient sounds you use and how they affect your sessions')}

        ${kpiRow([
            { label: 'unique sounds tried', value: uniqueSounds, unit: '', count: true },
            { label: 'sessions with sound on', value: Math.round(soundOnRate * 100), unit: '%', count: true },
            { label: 'avg sounds per session', value: avgSoundsPerSession.toFixed(1), unit: '', count: false },
            { label: 'your favourite', value: ranked[0]?.[0] ? capitalize(ranked[0][0]) : '—', unit: '', count: false },
        ])}

        <div class="psection__row psection__row--split">
            ${chartCard({
                eyebrow: 'what you reach for most',
                sub: `top ${top.length} of ${ranked.length} sounds you've used`,
                chart: donut({
                    slices: top.map(([label, value]) => ({ label, value })),
                    size: 200,
                }),
                aside: `
                    <ul class="sound-legend">
                        ${top.map(([label, value], i) => `
                            <li>
                                <span class="sound-legend__swatch" data-i="${i}"></span>
                                <span class="sound-legend__name">${escapeHtml(label)}</span>
                                <span class="sound-legend__count">${value}</span>
                            </li>
                        `).join('')}
                    </ul>
                `,
            })}
            ${chartCard({
                eyebrow: 'how each sound shifts your sessions',
                sub: effects.length === 0
                    ? 'a few more sessions and patterns will show up here'
                    : 'change in average session length when each sound is on',
                chart: '',
                content: effects.length > 0 ? `
                    <table class="effect-table">
                        <thead>
                            <tr>
                                <th>sound</th>
                                <th>change</th>
                                <th>strength</th>
                                <th>sessions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${effects.slice(0, 6).map((e) => {
                                const sign = e.delta >= 0 ? '+' : '';
                                const dCat = effectCategory(Math.abs(e.d));
                                return `
                                    <tr>
                                        <td class="effect-table__name">${escapeHtml(e.sound)}</td>
                                        <td class="effect-table__delta ${e.delta >= 0 ? 'is-up' : 'is-down'}">${sign}${(e.delta * 100).toFixed(0)}%</td>
                                        <td class="effect-table__d effect-table__d--${dCat.kind}">${dCat.label}</td>
                                        <td class="effect-table__n">${e.withN}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                ` : '',
            })}
        </div>

        ${effects.length > 0 ? insightCallouts([
            {
                label: 'YOUR STRONGEST COMPANION',
                value: capitalize(effects[0].sound),
                tone: effects[0].d > 0 ? 'good' : 'flat',
                hint: effects[0].d > 0
                    ? `sessions with ${effects[0].sound} on tend to run ${Math.round(effects[0].delta * 100)}% longer than sessions without it`
                    : `sessions with ${effects[0].sound} on tend to run ${Math.abs(Math.round(effects[0].delta * 100))}% shorter than sessions without it`,
            },
        ]) : ''}
    `;
}

function effectCategory(absD) {
    if (absD >= 0.8) return { label: 'large', kind: 'large' };
    if (absD >= 0.5) return { label: 'medium', kind: 'medium' };
    if (absD >= 0.2) return { label: 'small', kind: 'small' };
    return { label: 'trivial', kind: 'trivial' };
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 5 — Time
// ═══════════════════════════════════════════════════════════════════════

function renderTime(sessions) {
    if (sessions.length === 0) {
        return `
            ${sectionHeader('Time', 'when in the day and week you focus')}
            ${emptyState('a few focus sessions and your time-of-day pattern shows up here.')}
        `;
    }
    const hourBuckets = bucketByHour(sessions);
    const dayBuckets = bucketByDayOfWeek(sessions);
    const matrix = hourDayMatrix(sessions);
    const cal365 = calendarMatrix(sessions, 365);

    const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));
    const peakDay = dayBuckets.indexOf(Math.max(...dayBuckets));
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return `
        ${sectionHeader('Time', 'when in the day and week you focus')}

        ${kpiRow([
            { label: 'peak hour', value: formatHour(peakHour), unit: '', count: false },
            { label: 'peak day', value: dayLabels[peakDay], unit: '', count: false },
            { label: 'span', value: spanDays(sessions), unit: 'days', count: true },
            { label: 'time-of-day', value: timeOfDayCharacter(hourBuckets), unit: '', count: false },
        ])}

        ${chartCard({
            eyebrow: 'when you focus across the week',
            sub: 'each cell is one hour of one day; brightness scales with minutes focused',
            chart: hourDayHeatmap({ matrix }),
        })}

        <div class="psection__row psection__row--split">
            ${chartCard({
                eyebrow: 'best-hour curve',
                sub: `you focus deepest around ${formatHour(peakHour)}`,
                chart: renderPolarHourCurve(hourBuckets),
            })}
            ${chartCard({
                eyebrow: 'by day of week',
                sub: `${dayLabels[peakDay]}s are your strongest`,
                chart: barChart({
                    bars: dayLabels.map((lab, i) => ({ label: lab, value: dayBuckets[i] / 60 })),
                    width: 360,
                    height: 200,
                    unit: 'm',
                }),
            })}
        </div>

        ${chartCard({
            eyebrow: 'last 365 days',
            sub: 'your year so far',
            chart: calendarHeatmap({ matrix: cal365, cell: 11, gap: 2 }),
        })}
    `;
}

function renderPolarHourCurve(buckets) {
    const SIZE = 280;
    const CX = SIZE / 2;
    const CY = SIZE / 2;
    const RING_OUTER = 122;
    const RING_INNER = 86;
    const peak = Math.max(...buckets, 1);
    let segs = '';
    for (let h = 0; h < 24; h++) {
        const intensity = buckets[h] / peak;
        if (intensity <= 0.001) continue;
        const startAng = (h * 15 - 90) * Math.PI / 180;
        const endAng = ((h + 1) * 15 - 90) * Math.PI / 180;
        const inner = ringPath(CX, CY, RING_INNER, RING_OUTER, startAng, endAng);
        const alpha = 0.18 + 0.72 * intensity;
        segs += `<path d="${inner}" fill="rgba(255, 220, 160, ${alpha.toFixed(3)})" />`;
    }
    const ticks = [
        { hour: 0,  label: '12a' }, { hour: 6,  label: '6a'  },
        { hour: 12, label: '12p' }, { hour: 18, label: '6p'  },
    ].map(({ hour, label }) => {
        const ang = (hour * 15 - 90) * Math.PI / 180;
        const r = RING_OUTER + 14;
        const x = CX + Math.cos(ang) * r;
        const y = CY + Math.sin(ang) * r + 4;
        return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle"
                       class="hour-curve__tick">${label}</text>`;
    }).join('');
    return `
        <svg class="hour-curve" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" aria-hidden="true">
            <defs>
                <radialGradient id="hcCore" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="rgba(255, 220, 160, 0.18)" />
                    <stop offset="100%" stop-color="rgba(255, 220, 160, 0)" />
                </radialGradient>
                <filter id="hcGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.4" />
                </filter>
            </defs>
            <circle cx="${CX}" cy="${CY}" r="${RING_INNER - 12}" fill="url(#hcCore)" />
            <circle cx="${CX}" cy="${CY}" r="${RING_OUTER}" fill="none" stroke="rgba(255, 220, 160, 0.07)" stroke-width="0.8" />
            <circle cx="${CX}" cy="${CY}" r="${RING_INNER}" fill="none" stroke="rgba(255, 220, 160, 0.07)" stroke-width="0.8" />
            <g filter="url(#hcGlow)">${segs}</g>
            ${segs}
            ${ticks}
        </svg>
    `;
}

function spanDays(sessions) {
    if (!sessions.length) return 0;
    const oldest = Math.min(...sessions.map((s) => s.startedAt));
    return Math.max(1, Math.ceil((Date.now() - oldest) / 86400_000));
}
function timeOfDayCharacter(hourBuckets) {
    const morning = hourBuckets.slice(5, 12).reduce((a, x) => a + x, 0);
    const afternoon = hourBuckets.slice(12, 18).reduce((a, x) => a + x, 0);
    const evening = hourBuckets.slice(18, 24).reduce((a, x) => a + x, 0) + hourBuckets.slice(0, 5).reduce((a, x) => a + x, 0);
    const max = Math.max(morning, afternoon, evening);
    if (max === 0) return '—';
    if (max === morning) return 'morning';
    if (max === afternoon) return 'afternoon';
    return 'evening';
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 6 — Insights (data-science narratives)
// ═══════════════════════════════════════════════════════════════════════

function renderInsights(sessions) {
    if (sessions.length < 3) {
        return `
            ${sectionHeader('Insights', 'what we found in your own sessions — never compared against other people')}
            ${emptyState('a handful of focus sessions and the cards start filling in.')}
        `;
    }

    const last30 = dailyTotals(sessions, 30);
    const last60 = dailyTotals(sessions, 60);
    const reg = regressionStats(last30);
    const wow = changeAcross(last60, 30);

    const switches = sessions.reduce((a, s) => a + (s.distractionCount || 0), 0);
    const lostMin = switches * 9.5;
    const completionRate = sessions.length
        ? sessions.filter((s) => s.completed).length / sessions.length
        : 0;
    const todayTotal = last30[last30.length - 1] || 0;
    const z = zScore(todayTotal, last30.slice(0, -1));
    // Leave-one-out flagging — each day is z-scored against the *other*
    // days, so a single big outlier can't inflate the distribution it's
    // being measured against.
    const flags = anomalyFlags(last30, 1.5);
    const anomalyDays = flags.filter(Boolean).length;
    // Real Pearson r between distractions and focus-quality. A negative
    // r is the expected case ("more switches → lower quality"); a
    // positive r is the surprising one. We label both honestly below.
    const correlation = pearsonCorrelation(
        sessions.map((s) => (s.distractionCount || 0)),
        sessions.map((s) => (s.focusQuality || 0))
    );

    // Pace projection — at current 7-day rate, how far do we go in 30?
    const last7 = last30.slice(-7);
    const dailyAvg = mean(last7);
    const monthForecast = dailyAvg * 30;

    const insights = [];

    if (reg && Math.abs(reg.slopePerWeek) > 0.5) {
        const direction = reg.slope > 0 ? 'going up' : 'going down';
        const verb = reg.slope > 0 ? 'gaining' : 'losing';
        const slopeAbs = Math.abs(reg.slopePerWeek);
        const slopeStr = slopeAbs >= 1
            ? `${slopeAbs.toFixed(0)} ${slopeAbs >= 1.5 ? 'minutes' : 'minute'} a week`
            : `roughly ${Math.round(slopeAbs * 4)} minutes a month`;
        const trendVals = regressionLine(last30) || [];
        insights.push({
            kind: 'trend',
            headline: `your daily focus is ${direction} — ${verb} about ${slopeStr}`,
            sub: trendConfidenceCopy(reg.r2),
            value: `${reg.slopePerWeek >= 0 ? '+' : '−'}${slopeAbs.toFixed(1)} min / week`,
            viz: vizTrend(last30, trendVals),
            data: { reg, days: last30, trendVals },
        });
    }

    // ── ML insight: change-point detection on daily focus minutes ──────
    // CUSUM finds the day when your pattern shifted level — far more
    // informative than the wow card which just splits the window in
    // half regardless of where the actual change happened. When CUSUM
    // fires, the wow card is suppressed below to avoid double-counting.
    const cp = detectChangePoint(dailyTotals(sessions, 60));
    if (cp && Math.abs(cp.delta) >= 5) {
        const dirWord = cp.direction > 0 ? 'jumped' : 'dropped';
        const beforeMin = Math.round(cp.beforeMean);
        const afterMin = Math.round(cp.afterMean);
        const deltaMin = Math.round(Math.abs(cp.delta));
        const daysAgoLabel = cp.daysAgo === 0 ? 'today'
            : cp.daysAgo === 1 ? 'yesterday'
            : `${cp.daysAgo} days ago`;
        insights.push({
            kind: 'changepoint',
            headline: `your daily focus ${dirWord} about ${deltaMin} min/day around ${daysAgoLabel}`,
            sub: `was ${beforeMin} min/day before · ${afterMin} min/day since`,
            value: `${cp.direction > 0 ? '+' : '−'}${deltaMin} min/day`,
            viz: vizChangePoint(dailyTotals(sessions, 60), cp),
            data: { cp, last60: dailyTotals(sessions, 60) },
        });
    }

    // Suppress wow when CUSUM already explained the same shift — no
    // point showing both "you focused N% more this month" and "your
    // daily focus jumped on day X" in the same view.
    if (!cp && wow && wow.delta != null && Math.abs(wow.delta) > 0.05) {
        const dir = wow.delta >= 0 ? 'up' : 'down';
        insights.push({
            kind: 'wow',
            headline: `you're focusing ${(Math.abs(wow.delta) * 100).toFixed(0)}% ${dir} compared to the month before`,
            sub: `about ${wow.newer.toFixed(0)} minutes a day now · ${wow.older.toFixed(0)} minutes a day before`,
            value: `${wow.delta >= 0 ? '+' : '−'}${(Math.abs(wow.delta) * 100).toFixed(0)}%`,
            viz: vizWow(wow.older, wow.newer),
            data: { wow, last60 },
        });
    }

    if (Math.abs(z) >= 1.5) {
        const todayMin = Math.round(todayTotal);
        const usualMin = Math.round(mean(last30.slice(0, -1)));
        const headline = z > 0
            ? todayMin >= usualMin * 2
                ? `today is way past your usual — about ${ratioCopy(todayMin, usualMin)} a normal day`
                : `today is well above your usual focus`
            : `today is well below your usual focus`;
        insights.push({
            kind: 'anomaly',
            headline,
            sub: rarityCopy(z),
            value: z > 0 ? `${todayMin} min today` : `${todayMin} min today`,
            viz: vizAnomaly(last30.slice(0, -1), todayTotal),
            data: {
                kind: 'today',
                z, todayTotal, usualMean: usualMin,
                sd: stdDev(last30.slice(0, -1)),
                last30, flags,
            },
        });
    } else if (anomalyDays > 0) {
        insights.push({
            kind: 'anomaly',
            headline: `${anomalyDays} ${anomalyDays === 1 ? 'day' : 'days'} that broke from your normal in the last month`,
            sub: 'days that stood out — much higher or much lower than your typical pace',
            value: `${anomalyDays} ${anomalyDays === 1 ? 'day' : 'days'}`,
            viz: vizAnomalyDays(last30, flags),
            data: {
                kind: 'recent',
                last30, flags,
                mean: mean(last30),
                sd: stdDev(last30),
            },
        });
    }

    if (sessions.length >= 8 && Math.abs(correlation) > 0.2) {
        // Real Pearson r — negative is the expected case (switches
        // hurt quality), positive is the surprising one (switches
        // correlate with *higher* quality, which deserves its own
        // headline rather than being swept into the "no link" bucket).
        const strength = correlationStrength(correlation);
        const headline = correlation < 0
            ? `the more you switch tabs in a session, the lower your focus quality goes`
            : `something unusual — your tab-switches go *up* when your focus quality does`;
        const corrPoints = sessions.map((s) => [
            s.distractionCount || 0,
            s.focusQuality || 0,
        ]);
        insights.push({
            kind: 'correlation',
            headline,
            sub: `${strength.label} pattern — ${strength.aside}`,
            value: strength.label,
            viz: vizCorrelation(corrPoints),
            data: { points: corrPoints, r: correlation, strength },
        });
    }

    if (switches >= 5) {
        const lostHrs = lostMin / 60;
        const valueText = lostHrs >= 1
            ? `${lostHrs.toFixed(1)} hours`
            : `${Math.round(lostMin)} min`;
        const totalFocusedMin = sessions.reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60;
        insights.push({
            kind: 'friction',
            headline: lostHrs >= 1
                ? `you've lost about ${lostHrs.toFixed(1)} hours to context-switching`
                : `you've lost about ${Math.round(lostMin)} minutes to context-switching`,
            sub: `${switches} tab-aways during your focus sessions — every switch adds ~9 minutes of getting back into it`,
            value: valueText,
            viz: vizFriction(totalFocusedMin, lostMin),
            data: { switches, lostMin, totalFocusedMin, sessionCount: sessions.length },
        });
    }

    if (dailyAvg > 0) {
        // Forecast — Holt-Winters additive seasonal smoothing when we
        // have enough data (≥14 days = two full weekly seasons), else
        // a simple flat-line projection at the trailing-7 average. The
        // HW result now carries a residual stdev so we can draw a 1-σ
        // band around the projection — honest about uncertainty.
        const past14 = last30.slice(-14);
        const hw = holtWintersAdditive(last30, 7);
        const fc = hw ? holtWintersForecast(hw, 14) : null;
        const projected14 = fc ? fc.mean : new Array(14).fill(dailyAvg);
        const projectedLower = fc ? fc.lower : null;
        const projectedUpper = fc ? fc.upper : null;
        const forecastClamped = fc ? fc.clamped : false;
        const projectedSum = projected14.reduce((a, b) => a + b, 0);
        const monthForecastReal = hw ? projectedSum * (30 / 14) : monthForecast;
        const monthHrs = monthForecastReal / 60;
        const valueText = monthHrs >= 1
            ? `${monthHrs.toFixed(1)} hours`
            : `${Math.round(monthForecastReal)} min`;
        const subBase = hw
            ? `forecast accounts for your weekly rhythm and recent direction · shaded band shows day-to-day variation`
            : `based on your last 7 days — about ${Math.round(dailyAvg)} minutes a day`;
        insights.push({
            kind: 'forecast',
            headline: monthHrs >= 1
                ? `at this pace, you'll focus about ${monthHrs.toFixed(1)} hours over the next 30 days`
                : `at this pace, you'll focus about ${Math.round(monthForecastReal)} minutes over the next 30 days`,
            sub: subBase,
            value: valueText,
            viz: vizForecast(past14, projected14, projectedLower, projectedUpper),
            data: {
                hw, dailyAvg, past14, projected14,
                projectedLower, projectedUpper, forecastClamped,
                monthForecastReal,
            },
        });
    }

    // ── ML insight: K-means clustering of session shapes ────────────────
    // Cluster every focus session by [duration, focus quality,
    // distractions]. K selection is driven by **silhouette score**
    // (replacing the broken elbow heuristic) — and we suppress the
    // insight entirely when silhouette is low, because that's the
    // honest signal that no real cluster structure exists in the
    // data and any K we pick would invent groups that aren't there.
    if (sessions.length >= 12) {
        const durs = sessions.map((s) => (s.durationSeconds || 0) / 60);
        const dMin = Math.min(...durs);
        const dMax = Math.max(...durs);
        const xMax = Math.max(...sessions.map((s) => s.distractionCount || 0), 1);
        const norm = (v, min, max) => max > min ? (v - min) / (max - min) : 0.5;
        const features = sessions.map((s) => [
            norm((s.durationSeconds || 0) / 60, dMin, dMax),
            norm(s.focusQuality || 0, 0, 100),
            norm(s.distractionCount || 0, 0, xMax),
        ]);
        // Refuse to cluster when any feature is constant — Otherwise
        // that dimension contributes zero variance and the clustering
        // is a 2D problem masquerading as 3D, plus labels that depend
        // on the missing feature can never fire.
        const allConstant = (
            dMin === dMax ||
            xMax === 0 ||
            sessions.every((s) => (s.focusQuality || 0) === sessions[0].focusQuality)
        );
        if (!allConstant) {
            const result = chooseBestK(features, { kMin: 2, kMax: 4 });
            // Silhouette < 0.2 → no real cluster structure. Suppress.
            if (result && result.k >= 2 && (result.silhouette || 0) >= 0.2) {
                const clusters = describeClusters(result, sessions);
                const dominant = clusters.reduce(
                    (best, c) => c.count > best.count ? c : best,
                    clusters[0]
                );
                const dominantPct = Math.round((dominant.count / sessions.length) * 100);
                const sil = result.silhouette;
                const separationCopy = sil >= 0.5 ? 'these groups are well-separated'
                    : sil >= 0.35 ? 'the groups overlap a little — but the shape is real'
                    : 'soft groupings — the boundaries are fuzzy';
                insights.push({
                    kind: 'patterns',
                    headline: result.k === 2
                        ? `your focus sessions fall into 2 distinct groups`
                        : `your focus sessions fall into ${result.k} distinct groups`,
                    sub: `${dominantPct}% of yours look like "${dominant.label}" · ${separationCopy}`,
                    value: `${result.k} groups`,
                    viz: vizClusters(features, result.assignments, clusters),
                    data: {
                        k: result.k,
                        inertia: result.inertia,
                        silhouette: result.silhouette,
                        centroids: result.centroids,
                        assignments: result.assignments,
                        clusters,
                        sessions,
                        bounds: { dMin, dMax, xMax },
                    },
                });
            }
        }
    }

    // ── ML insight: which conditions help you finish blocks ────────────
    // For each named condition, compute P(complete | condition) and
    // its lift versus the overall completion rate. Surface the
    // strongest signal in plain language.
    if (sessions.length >= 10) {
        const conditions = [
            { name: 'starting before 10 AM', predicate: (s) => new Date(s.startedAt).getHours() < 10 },
            { name: 'starting in the afternoon (12–5 PM)', predicate: (s) => {
                const h = new Date(s.startedAt).getHours();
                return h >= 12 && h < 17;
            }},
            { name: 'starting in the evening (after 5 PM)', predicate: (s) => new Date(s.startedAt).getHours() >= 17 },
            { name: 'with a sound playing', predicate: (s) => (s.activeSounds || []).length > 0 },
            { name: 'with no tab switches', predicate: (s) => (s.distractionCount || 0) === 0 },
            { name: 'on a weekday', predicate: (s) => {
                const d = new Date(s.startedAt).getDay();
                return d >= 1 && d <= 5;
            }},
        ];
        const ranked = rankConditions(sessions, conditions);
        if (ranked.length > 0 && Math.abs(ranked[0].lift - 1) > 0.12) {
            const top = ranked[0];
            const matters = top.lift > 1;
            const factor = matters ? top.lift.toFixed(1) : (1 / Math.max(0.01, top.lift)).toFixed(1);
            insights.push({
                kind: 'conditions',
                headline: matters
                    ? `you're ${factor}× more likely to finish sessions ${top.name}`
                    : `you're ${factor}× less likely to finish sessions ${top.name}`,
                sub: `${Math.round(top.rate * 100)}% finish in this group · ${Math.round(top.baselineRate * 100)}% across all your sessions`,
                value: matters ? `${factor}× more` : `${factor}× less`,
                viz: vizConditions(ranked.slice(0, 4)),
                data: { ranked, baselineRate: ranked[0].baselineRate, totalSessions: sessions.length },
            });
        }
    }

    if (sessions.length >= 5) {
        const pct = Math.round(completionRate * 100);
        // Honest tone — no praise, no shame; just the percentage and
        // what it means in two short clauses.
        let headline, sub;
        if (completionRate >= 0.85) {
            headline = `you finish ${pct}% of the focus sessions you start`;
            sub = `${100 - pct}% get cut short`;
        } else if (completionRate >= 0.6) {
            headline = `you finish ${pct}% of the focus sessions you start`;
            sub = `${100 - pct}% get cut short`;
        } else {
            headline = `you finish ${pct}% of focus sessions — ${100 - pct}% get cut short`;
            sub = `cutting more sessions short than you finish`;
        }
        const completedSessions = sessions.filter((s) => s.completed);
        insights.push({
            kind: 'completion',
            headline,
            sub,
            value: `${pct}%`,
            viz: vizCompletion(completionRate, pct),
            data: {
                rate: completionRate,
                pct,
                total: sessions.length,
                completed: completedSessions.length,
                cutShort: sessions.length - completedSessions.length,
                sessions,
            },
        });
    }

    if (insights.length === 0) {
        return `
            ${sectionHeader('Insights', 'what we found in your own sessions — never compared against other people')}
            ${emptyState('a couple more focus sessions and patterns will start showing up here.')}
        `;
    }

    // If a card is open, show the detail view in place of the grid.
    if (activeInsightDetail) {
        const insight = insights.find((i) => i.kind === activeInsightDetail);
        if (insight) {
            return `
                ${sectionHeader('Insights', 'what we found in your own sessions — never compared against other people')}
                ${renderInsightDetail(insight, sessions)}
            `;
        }
        // Stale kind — fall through to grid.
        activeInsightDetail = null;
    }

    return `
        ${sectionHeader('Insights', 'what we found in your own sessions — never compared against other people')}
        <p class="insight-grid__hint">tap any card for the full breakdown</p>
        <div class="insight-grid">
            ${insights.map((ins) => `
                <article class="insight-card insight-card--${ins.kind}"
                         role="button" tabindex="0"
                         data-insight-open="${ins.kind}"
                         aria-label="${escapeHtml(insightKindLabel(ins.kind))} — open details">
                    <span class="insight-card__kind">${insightKindLabel(ins.kind)}</span>
                    <p class="insight-card__headline">${escapeHtml(ins.headline)}</p>
                    ${ins.viz ? `<div class="insight-card__viz">${ins.viz}</div>` : ''}
                    <p class="insight-card__value">${escapeHtml(String(ins.value))}</p>
                    <p class="insight-card__sub">${escapeHtml(ins.sub)}</p>
                    <span class="insight-card__chevron" aria-hidden="true">›</span>
                </article>
            `).join('')}
        </div>
    `;
}

// ───────────────────────────────────────────────────────────────────────
// Insight visualizations — each kind gets a tailored mini-chart that
// shows what the headline says. SVG rendered with `currentColor` so
// the per-kind palette (set via CSS on the card class) flows through
// without any per-call colour plumbing.
// ───────────────────────────────────────────────────────────────────────

let __vizUid = 0;
function vizUid(prefix) { return `${prefix}_${++__vizUid}`; }

/** Sparkline area + line, with the regression overlay on top. */
function vizTrend(values, trendValues) {
    if (!values || values.length < 3) return '';
    const W = 240, H = 64;
    const padX = 4;
    const max = Math.max(...values, 1);
    const x = (i) => padX + (i / (values.length - 1)) * (W - padX * 2);
    const y = (v) => H - 6 - (v / max) * (H - 12);
    const linePts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const fillPath = `M ${x(0).toFixed(1)},${(H - 6).toFixed(1)} L ${linePts.split(' ').join(' L ')} L ${x(values.length - 1).toFixed(1)},${(H - 6).toFixed(1)} Z`;
    const trendPts = trendValues && trendValues.length === values.length
        ? trendValues.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
        : '';
    const id = vizUid('vt');
    return `
        <svg class="insight-viz" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
            <defs>
                <linearGradient id="${id}_g" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="currentColor" stop-opacity="0.32" />
                    <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
                </linearGradient>
            </defs>
            <path d="${fillPath}" fill="url(#${id}_g)" />
            ${trendPts ? `<polyline points="${trendPts}" fill="none" stroke="currentColor"
                                    stroke-width="1" stroke-opacity="0.55" stroke-dasharray="3 4" />` : ''}
            <polyline points="${linePts}" fill="none" stroke="currentColor"
                      stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.92" />
        </svg>
    `;
}

/** Two side-by-side bars — last 30 days versus the 30 days before. */
function vizWow(prevMean, currentMean) {
    const W = 240, H = 80;
    const max = Math.max(prevMean, currentMean, 1);
    const barW = 56;
    const gap = 28;
    const cx = W / 2;
    const x1 = cx - barW - gap / 2;
    const x2 = cx + gap / 2;
    const baseline = H - 18;
    const h1 = (prevMean / max) * (baseline - 6);
    const h2 = (currentMean / max) * (baseline - 6);
    return `
        <svg class="insight-viz" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <line x1="${x1 - 6}" x2="${x2 + barW + 6}" y1="${baseline}" y2="${baseline}"
                  stroke="rgba(255, 220, 160, 0.12)" stroke-width="0.7" />
            <rect x="${x1}" y="${(baseline - h1).toFixed(1)}" width="${barW}" height="${h1.toFixed(1)}" rx="3"
                  fill="currentColor" fill-opacity="0.32" />
            <rect x="${x2}" y="${(baseline - h2).toFixed(1)}" width="${barW}" height="${h2.toFixed(1)}" rx="3"
                  fill="currentColor" fill-opacity="0.86" />
            <text x="${(x1 + barW / 2).toFixed(1)}" y="${(H - 4).toFixed(1)}" class="insight-viz__caption"
                  text-anchor="middle">prev 30</text>
            <text x="${(x2 + barW / 2).toFixed(1)}" y="${(H - 4).toFixed(1)}" class="insight-viz__caption"
                  text-anchor="middle">last 30</text>
        </svg>
    `;
}

/** Distribution of recent days as a histogram + a vertical marker
 *  showing where today's value falls. */
function vizAnomaly(distribution, todayValue) {
    const W = 240, H = 64;
    if (!distribution || distribution.length < 3) return '';
    const bins = histogram(distribution, 12);
    const peakCount = Math.max(...bins.map((b) => b.count), 1);
    const binW = W / bins.length;
    const valueMin = bins[0].x0;
    const valueMax = bins[bins.length - 1].x1;
    const span = Math.max(1, valueMax - valueMin);
    const todayX = ((todayValue - valueMin) / span) * W;
    const todayClamped = Math.max(2, Math.min(W - 2, todayX));
    return `
        <svg class="insight-viz" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
            ${bins.map((b, i) => {
                const h = (b.count / peakCount) * (H - 14);
                const yTop = H - 8 - h;
                const xLeft = i * binW + 0.4;
                const w = Math.max(1, binW - 0.8);
                return `<rect x="${xLeft.toFixed(2)}" y="${yTop.toFixed(2)}" width="${w.toFixed(2)}" height="${Math.max(1, h).toFixed(2)}"
                              rx="1" fill="currentColor" fill-opacity="0.28" />`;
            }).join('')}
            <line x1="${todayClamped.toFixed(2)}" x2="${todayClamped.toFixed(2)}"
                  y1="3" y2="${(H - 6).toFixed(1)}"
                  stroke="currentColor" stroke-width="2" stroke-opacity="0.95" />
            <circle cx="${todayClamped.toFixed(2)}" cy="3" r="3.4" fill="currentColor" />
        </svg>
    `;
}

/** When we don't have a single anomalous "today" but want to mark the
 *  outlier days across the last 30 — sparkline with anomaly days
 *  rendered as bright dots. */
function vizAnomalyDays(values, flags) {
    if (!values || values.length < 3) return '';
    const W = 240, H = 64;
    const padX = 4;
    const max = Math.max(...values, 1);
    const x = (i) => padX + (i / (values.length - 1)) * (W - padX * 2);
    const y = (v) => H - 6 - (v / max) * (H - 12);
    const linePts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const dots = values.map((v, i) => flags[i]
        ? `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.8"
                   fill="currentColor" stroke="rgba(0,0,0,0.4)" stroke-width="0.6" />`
        : '').join('');
    return `
        <svg class="insight-viz" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
            <polyline points="${linePts}" fill="none" stroke="currentColor"
                      stroke-width="1.2" stroke-opacity="0.4" stroke-linecap="round" stroke-linejoin="round" />
            ${dots}
        </svg>
    `;
}

/** Mini scatter — each session is a dot at (distractions, quality);
 *  overlay the regression line. */
function vizCorrelation(points) {
    if (!points || points.length < 4) return '';
    const W = 240, H = 80;
    const padX = 6, padY = 6;
    const xMax = Math.max(...points.map((p) => p[0]), 1);
    const yMax = Math.max(...points.map((p) => p[1]), 1);
    const sx = (x) => padX + (x / xMax) * (W - padX * 2);
    const sy = (y) => H - padY - (y / yMax) * (H - padY * 2);
    const reg = linearRegression(points);
    const yAt0 = sy(Math.max(0, Math.min(yMax, reg.intercept)));
    const yAtMax = sy(Math.max(0, Math.min(yMax, reg.slope * xMax + reg.intercept)));
    const x0 = sx(0);
    const xMaxScreen = sx(xMax);
    const dots = points.map(([x, y]) => `
        <circle cx="${sx(x).toFixed(2)}" cy="${sy(y).toFixed(2)}" r="2.2"
                fill="currentColor" fill-opacity="0.75" />
    `).join('');
    return `
        <svg class="insight-viz" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <line x1="${x0.toFixed(2)}" y1="${yAt0.toFixed(2)}"
                  x2="${xMaxScreen.toFixed(2)}" y2="${yAtMax.toFixed(2)}"
                  stroke="currentColor" stroke-width="1" stroke-opacity="0.45" stroke-dasharray="3 3" />
            ${dots}
        </svg>
    `;
}

/** Horizontal stacked bar — total focused time vs total lost-to-
 *  context-switching time. */
function vizFriction(focusedMin, lostMin) {
    const W = 240, H = 28;
    const total = focusedMin + lostMin;
    if (total <= 0) return '';
    const focusedW = Math.max(2, (focusedMin / total) * W);
    return `
        <svg class="insight-viz insight-viz--friction" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
            <rect x="0" y="2" width="${W}" height="${H - 4}" rx="6"
                  fill="currentColor" fill-opacity="0.16" />
            <rect x="0" y="2" width="${focusedW.toFixed(2)}" height="${H - 4}" rx="6"
                  fill="currentColor" fill-opacity="0.86" />
        </svg>
    `;
}

/** Past 14 days line + 14 days projection. Vertical "now" rule
 *  separates history from projection. When `lower`/`upper` are
 *  provided, draw a translucent confidence band so the forecast is
 *  shown with its uncertainty, not as a single confident line. */
function vizForecast(history, projected, lower, upper) {
    if (!history || !projected) return '';
    const W = 240, H = 64;
    const padX = 4;
    const all = [...history, ...projected, ...(upper || [])];
    const max = Math.max(...all, 1);
    const totalLen = history.length + projected.length;
    const x = (i) => padX + (i / (totalLen - 1)) * (W - padX * 2);
    const y = (v) => H - 6 - (v / max) * (H - 12);
    const histPts = history.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const projIdxOffset = history.length - 1;
    const projPts = projected.map((v, i) => `${x(projIdxOffset + i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const dividerX = x(history.length - 1);
    let bandPath = '';
    if (lower && upper && lower.length === projected.length && upper.length === projected.length) {
        // Stitch upper-edge polyline forward + lower-edge polyline
        // backward into a closed polygon for the shaded band.
        const upperPts = upper.map((v, i) => `${x(projIdxOffset + i).toFixed(1)},${y(v).toFixed(1)}`);
        const lowerPts = lower.map((v, i) => `${x(projIdxOffset + i).toFixed(1)},${y(v).toFixed(1)}`).reverse();
        bandPath = `<polygon points="${[...upperPts, ...lowerPts].join(' ')}"
                             fill="currentColor" fill-opacity="0.12" />`;
    }
    return `
        <svg class="insight-viz" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
            ${bandPath}
            <polyline points="${histPts}" fill="none" stroke="currentColor"
                      stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.92" />
            <polyline points="${projPts}" fill="none" stroke="currentColor"
                      stroke-width="1.2" stroke-dasharray="3 3" stroke-opacity="0.7" />
            <line x1="${dividerX.toFixed(1)}" x2="${dividerX.toFixed(1)}" y1="2" y2="${(H - 2).toFixed(1)}"
                  stroke="currentColor" stroke-opacity="0.22" stroke-width="0.7" stroke-dasharray="2 2" />
            <text x="${dividerX.toFixed(1)}" y="${(H - 2).toFixed(1)}" class="insight-viz__caption"
                  text-anchor="middle" dx="-2" dy="-1">now</text>
        </svg>
    `;
}

/** Sparkline of daily totals with a vertical rule at the change-point
 *  index. Pre-shift mean drawn as a horizontal dashed segment, same
 *  for post-shift mean — the visual eye reads them as the two regimes
 *  the CUSUM detected. */
function vizChangePoint(values, cp) {
    if (!values || values.length < 3 || !cp) return '';
    const W = 240, H = 64;
    const padX = 4;
    const max = Math.max(...values, 1);
    const x = (i) => padX + (i / (values.length - 1)) * (W - padX * 2);
    const y = (v) => H - 6 - (v / max) * (H - 12);
    const linePts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const cpX = x(cp.index);
    const beforeY = y(cp.beforeMean);
    const afterY = y(cp.afterMean);
    return `
        <svg class="insight-viz" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
            <line x1="${padX}" x2="${cpX.toFixed(1)}" y1="${beforeY.toFixed(1)}" y2="${beforeY.toFixed(1)}"
                  stroke="currentColor" stroke-opacity="0.42" stroke-width="0.9" stroke-dasharray="3 3" />
            <line x1="${cpX.toFixed(1)}" x2="${(W - padX).toFixed(1)}" y1="${afterY.toFixed(1)}" y2="${afterY.toFixed(1)}"
                  stroke="currentColor" stroke-opacity="0.85" stroke-width="1.1" />
            <polyline points="${linePts}" fill="none" stroke="currentColor"
                      stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.6" />
            <line x1="${cpX.toFixed(1)}" x2="${cpX.toFixed(1)}" y1="2" y2="${(H - 2).toFixed(1)}"
                  stroke="currentColor" stroke-opacity="0.85" stroke-width="0.9" stroke-dasharray="2 2" />
            <circle cx="${cpX.toFixed(1)}" cy="${y(values[cp.index]).toFixed(1)}" r="2.6" fill="currentColor" />
        </svg>
    `;
}

/** Radial gauge filling clockwise to the completion percentage. */
function vizCompletion(rate, percent) {
    const SIZE = 90;
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const r = SIZE * 0.4;
    const stroke = 7;
    const circ = 2 * Math.PI * r;
    const dashLen = circ * Math.max(0, Math.min(1, rate));
    return `
        <svg class="insight-viz insight-viz--gauge" viewBox="0 0 ${SIZE} ${SIZE}" aria-hidden="true">
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
                    stroke="currentColor" stroke-opacity="0.14" stroke-width="${stroke}" />
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
                    stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"
                    stroke-dasharray="${dashLen.toFixed(2)} ${(circ - dashLen).toFixed(2)}"
                    transform="rotate(-90 ${cx} ${cy})" />
            <text x="${cx}" y="${cy + 5}" class="insight-viz__gauge-num" text-anchor="middle">${percent}</text>
        </svg>
    `;
}

// ───────────────────────────────────────────────────────────────────────
// Insight detail views — clicking a card opens a full breakdown of
// what the metric is, how it was computed, and the underlying data.
// Plain English throughout; no math notation in the headlines.
// ───────────────────────────────────────────────────────────────────────

function renderInsightDetail(insight, sessions) {
    return `
        <div class="insight-detail insight-detail--${insight.kind}">
            <button class="insight-detail__back" type="button" data-insight-back>
                <span aria-hidden="true">‹</span> back to insights
            </button>
            <header class="insight-detail__head">
                <span class="insight-detail__kind">${insightKindLabel(insight.kind)}</span>
                <h3 class="insight-detail__headline">${escapeHtml(insight.headline)}</h3>
                <p class="insight-detail__sub">${escapeHtml(insight.sub)}</p>
            </header>
            ${insight.viz ? `<div class="insight-detail__viz">${insight.viz}</div>` : ''}
            <div class="insight-detail__body">
                ${renderInsightDetailBody(insight, sessions)}
            </div>
        </div>
    `;
}

function detailBlock(title, content) {
    return `
        <section class="detail-block">
            <h4 class="detail-block__title">${escapeHtml(title)}</h4>
            <div class="detail-block__content">${content}</div>
        </section>
    `;
}

function renderInsightDetailBody(insight, sessions) {
    switch (insight.kind) {
        case 'trend':       return detailTrend(insight);
        case 'changepoint': return detailChangePoint(insight);
        case 'wow':         return detailWow(insight);
        case 'anomaly':     return detailAnomaly(insight);
        case 'correlation': return detailCorrelation(insight);
        case 'friction':    return detailFriction(insight);
        case 'forecast':    return detailForecast(insight);
        case 'completion':  return detailCompletion(insight);
        case 'patterns':    return detailPatterns(insight);
        case 'conditions':  return detailConditions(insight);
        default:            return '';
    }
}

function detailTrend(ins) {
    const { reg, days } = ins.data;
    const r2 = reg.r2;
    const fitWord = r2 >= 0.5 ? 'a clear pattern'
        : r2 >= 0.25 ? 'a real trend with day-to-day noise'
        : r2 >= 0.1 ? 'a weak trend'
        : 'too noisy to call a trend yet';
    const last7 = days.slice(-7).map((v, i) => {
        const ago = 6 - i;
        const label = ago === 0 ? 'today' : ago === 1 ? 'yesterday' : `${ago} days ago`;
        return `<li><span>${label}</span><span class="num">${Math.round(v)} min</span></li>`;
    }).join('');
    return `
        ${detailBlock('What this is', `
            <p>The line above shows your daily focus minutes for the past 30 days. The dashed line through them is the trend — a single straight line that best summarizes the direction your data is heading.</p>
        `)}
        ${detailBlock('How we found it', `
            <p>We used <strong>linear regression</strong> — a method that finds the line minimizing the squared distance from every point to it. The slope of that line is how many minutes per day your focus is shifting. We multiply by 7 to get the per-week change.</p>
        `)}
        ${detailBlock('How sure are we?', `
            <p>The fit quality is <strong>${r2.toFixed(2)}</strong> on a 0–1 scale (statisticians call this R²):</p>
            <ul class="detail-list">
                <li><span>0.50 or higher</span><span class="num">a clear pattern</span></li>
                <li><span>0.25 to 0.50</span><span class="num">real but bumpy</span></li>
                <li><span>0.10 to 0.25</span><span class="num">weak signal</span></li>
                <li><span>under 0.10</span><span class="num">probably noise</span></li>
            </ul>
            <p>Yours is ${r2.toFixed(2)} — ${fitWord}.</p>
        `)}
        ${detailBlock('Your last 7 days', `<ul class="detail-list">${last7}</ul>`)}
    `;
}

function detailChangePoint(ins) {
    const { cp } = ins.data;
    const dirWord = cp.direction > 0 ? 'jumped up' : 'dropped';
    const beforeMin = Math.round(cp.beforeMean);
    const afterMin = Math.round(cp.afterMean);
    const deltaMin = Math.round(Math.abs(cp.delta));
    const pctChange = cp.beforeMean > 0
        ? Math.round((Math.abs(cp.delta) / cp.beforeMean) * 100)
        : null;
    return `
        ${detailBlock('What this is', `
            <p>The day your daily focus pattern shifted to a different level — not a gradual slope, but a step-change in how much you typically focus per day.</p>
        `)}
        ${detailBlock('How we found it', `
            <p>We use <strong>CUSUM</strong> (cumulative sum) — a classic change-point detection method. It walks forward through your daily totals, accumulating how far each day deviates from your baseline. When the running sum crosses a significance threshold, that's the day the pattern changed.</p>
            <p>This is more honest than splitting the window in half — that approach reports the same result whether your shift happened on day 3 or day 27. CUSUM finds the actual moment.</p>
        `)}
        ${detailBlock('What we found', `
            <ul class="detail-list">
                <li><span>shift detected</span><span class="num">${cp.daysAgo === 0 ? 'today' : cp.daysAgo === 1 ? 'yesterday' : `${cp.daysAgo} days ago`}</span></li>
                <li><span>before — daily average</span><span class="num">${beforeMin} min</span></li>
                <li><span>after — daily average</span><span class="num">${afterMin} min</span></li>
                <li><span>change</span><span class="num ${cp.direction > 0 ? 'is-good' : 'is-flat'}">${cp.direction > 0 ? '+' : '−'}${deltaMin} min/day${pctChange !== null ? ` (${pctChange}%)` : ''}</span></li>
                <li><span>before window</span><span class="num">${cp.beforeN} days</span></li>
                <li><span>after window</span><span class="num">${cp.afterN} days</span></li>
            </ul>
        `)}
        ${detailBlock('A note on this', `
            <p>A change-point doesn't say <em>why</em> — only <em>when</em>. Common causes: starting or finishing a project, vacation, schedule change, picking up a new tool. If the date matches something specific, the pattern is real; if not, it might be coincidence.</p>
            <p>We need at least 14 days of history to call a shift; smaller datasets are too noisy to separate signal from random variation.</p>
        `)}
    `;
}

function detailWow(ins) {
    const { wow } = ins.data;
    const newer = wow.newer || 0;
    const older = wow.older || 0;
    const totalDelta = (newer - older) * 30;
    const dirText = totalDelta >= 0 ? 'more' : 'less';
    return `
        ${detailBlock('What this is', `
            <p>The change in your average daily focus, comparing your last 30 days to the 30 days before that.</p>
        `)}
        ${detailBlock('How we found it', `
            <p>We took the mean (average) of your daily focus minutes for each 30-day stretch, then computed the percentage change from older to newer.</p>
        `)}
        ${detailBlock('Your numbers', `
            <ul class="detail-list">
                <li><span>last 30 days, mean per day</span><span class="num">${newer.toFixed(0)} min</span></li>
                <li><span>30 days before that, mean per day</span><span class="num">${older.toFixed(0)} min</span></li>
                <li><span>total over the month</span><span class="num">${Math.abs(Math.round(totalDelta))} min ${dirText}</span></li>
            </ul>
        `)}
    `;
}

function detailAnomaly(ins) {
    const d = ins.data;
    if (d.kind === 'today') {
        return `
            ${detailBlock('What this is', `
                <p>Today's focus minutes against the distribution of your last 30 days.</p>
            `)}
            ${detailBlock('How we found it', `
                <p>We compute the <strong>z-score</strong>: how far today's number is from your recent average, measured in standard deviations.</p>
                <ul class="detail-list">
                    <li><span>z above +2</span><span class="num">in the top ~2.5% of recent days</span></li>
                    <li><span>z above +1.5</span><span class="num">notably above your normal</span></li>
                    <li><span>z below −2</span><span class="num">in the bottom ~2.5% of recent days</span></li>
                </ul>
            `)}
            ${detailBlock('Your numbers', `
                <ul class="detail-list">
                    <li><span>average daily focus (last 30 days)</span><span class="num">${d.usualMean} min</span></li>
                    <li><span>day-to-day variation</span><span class="num">±${Math.round(d.sd)} min</span></li>
                    <li><span>today</span><span class="num">${Math.round(d.todayTotal)} min</span></li>
                    <li><span>z-score</span><span class="num">${d.z.toFixed(1)}</span></li>
                </ul>
            `)}
        `;
    }
    const flagged = d.last30
        .map((v, i) => ({ v, i, ago: d.last30.length - 1 - i }))
        .filter((row) => d.flags[row.i])
        .slice(-5)
        .reverse()
        .map((row) => `<li><span>${row.ago === 0 ? 'today' : `${row.ago} days ago`}</span><span class="num">${Math.round(row.v)} min</span></li>`)
        .join('');
    return `
        ${detailBlock('What this is', `
            <p>Days from the last 30 that broke from your usual pattern in either direction — much higher or much lower than your typical pace.</p>
        `)}
        ${detailBlock('How we found them', `
            <p>For each day, we compute its z-score (how many standard deviations it sits from your recent mean). Days with a z-score of 1.5 or more in either direction get flagged.</p>
        `)}
        ${detailBlock('Your numbers', `
            <ul class="detail-list">
                <li><span>30-day average</span><span class="num">${Math.round(d.mean)} min/day</span></li>
                <li><span>variation</span><span class="num">±${Math.round(d.sd)} min</span></li>
            </ul>
            <p class="detail-block__note">unusual days flagged:</p>
            <ul class="detail-list">${flagged || '<li><span>none in the recent slice shown</span></li>'}</ul>
        `)}
    `;
}

function detailCorrelation(ins) {
    const { points, r, strength } = ins.data;
    const plainDirection = r < 0
        ? 'when one goes up, the other tends to go down — the expected case for distractions vs focus quality'
        : 'when one goes up, the other goes up too — surprising for these two numbers';
    return `
        ${detailBlock('What this is', `
            <p>We checked whether two of your numbers move together: the count of tab-switches inside a session, and that session's focus quality score (0–100).</p>
        `)}
        ${detailBlock('How we found it', `
            <p>We use <strong>Pearson correlation</strong>. It returns a value between −1 and +1:</p>
            <ul class="detail-list">
                <li><span>+1.0</span><span class="num">they move up together perfectly</span></li>
                <li><span>0</span><span class="num">no relationship</span></li>
                <li><span>−1.0</span><span class="num">they move opposite perfectly</span></li>
            </ul>
            <p>Yours is r = ${r.toFixed(2)} — ${strength.label}, ${strength.aside}. In plain terms: ${plainDirection}.</p>
        `)}
        ${detailBlock('Sample size', `
            <ul class="detail-list">
                <li><span>sessions used</span><span class="num">${points.length}</span></li>
            </ul>
        `)}
        ${detailBlock('A note on this', `
            <p>Correlation isn't causation. We see the pattern, but it doesn't prove that switching tabs <em>causes</em> lower quality (or vice versa). They just move together in your data.</p>
        `)}
    `;
}

function detailFriction(ins) {
    const d = ins.data;
    const avgPerSession = d.sessionCount ? d.switches / d.sessionCount : 0;
    const cleanSessionsPct = d.sessionCount
        ? Math.round((d.sessionCount - d.switches > 0 ? 1 : 0) * 100)
        : 0;
    return `
        ${detailBlock('What this is', `
            <p>An estimate of focused time you've lost to context-switching during your sessions.</p>
        `)}
        ${detailBlock('How we found it', `
            <p>The Page Visibility API tells us when you switch away from this tab during a focus session. Each tab-away costs about <strong>9.5 minutes</strong> of getting-back-into-it time — a conservative figure from research on attention recovery (some research cites 23 minutes).</p>
            <p>Total time lost = tab-aways × 9.5 minutes.</p>
        `)}
        ${detailBlock('Your numbers', `
            <ul class="detail-list">
                <li><span>tab-aways during focus sessions</span><span class="num">${d.switches}</span></li>
                <li><span>estimated minutes lost</span><span class="num">${Math.round(d.lostMin)} min</span></li>
                <li><span>average tab-aways per session</span><span class="num">${avgPerSession.toFixed(1)}</span></li>
                <li><span>focused minutes (total)</span><span class="num">${Math.round(d.totalFocusedMin)} min</span></li>
            </ul>
        `)}
        ${detailBlock('A note on this', `
            <p>9.5 min is the conservative figure. Your real cost is likely higher. Either way, the takeaway is the same — keeping tabs out of focus sessions is high-leverage.</p>
        `)}
    `;
}

function detailForecast(ins) {
    const { hw, dailyAvg, monthForecastReal } = ins.data;
    if (!hw) {
        return `
            ${detailBlock('What this is', `
                <p>A simple forecast of how much you'll focus over the next 30 days, based on your last 7 days.</p>
            `)}
            ${detailBlock('How we found it', `
                <p>We took your trailing-7-day daily average and projected it forward. Since you have less than two weeks of data, we can't yet model your weekly rhythm — that requires the full Holt-Winters method, which kicks in once you have 14+ days of history.</p>
            `)}
            ${detailBlock('Your numbers', `
                <ul class="detail-list">
                    <li><span>last 7 days, mean per day</span><span class="num">${Math.round(dailyAvg)} min</span></li>
                    <li><span>projected over 30 days</span><span class="num">${Math.round(monthForecastReal)} min</span></li>
                </ul>
            `)}
        `;
    }
    // Compute strongest / weakest day from seasonal component
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let bestIdx = 0, worstIdx = 0;
    for (let i = 1; i < hw.season.length; i++) {
        if (hw.season[i] > hw.season[bestIdx]) bestIdx = i;
        if (hw.season[i] < hw.season[worstIdx]) worstIdx = i;
    }
    return `
        ${detailBlock('What this is', `
            <p>Your projected daily focus for the next 14 days, based on your recent pattern.</p>
        `)}
        ${detailBlock('How we found it', `
            <p>We use <strong>Holt-Winters exponential smoothing</strong> — a time-series method that tracks three things at once:</p>
            <ul class="detail-list">
                <li><span>level</span><span>where you're focusing day-to-day right now</span></li>
                <li><span>trend</span><span>whether you're gaining or losing minutes per day</span></li>
                <li><span>weekly rhythm</span><span>which days of the week tend to be higher or lower than typical</span></li>
            </ul>
            <p>The model gives more weight to recent days than old ones, so the forecast adjusts as you keep going.</p>
        `)}
        ${detailBlock('Your model', `
            <ul class="detail-list">
                <li><span>current daily level</span><span class="num">${hw.level.toFixed(0)} min/day</span></li>
                <li><span>direction</span><span class="num">${hw.trend >= 0 ? '+' : '−'}${Math.abs(hw.trend).toFixed(2)} min/day</span></li>
                <li><span>strongest day in your week</span><span class="num">${dayLabels[bestIdx]}</span></li>
                <li><span>quietest day in your week</span><span class="num">${dayLabels[worstIdx]}</span></li>
                ${hw.residualSd !== undefined ? `
                    <li><span>day-to-day variation (1σ)</span><span class="num">±${Math.round(hw.residualSd)} min</span></li>
                ` : ''}
            </ul>
        `)}
        ${detailBlock('A note on this', `
            <p>Forecasts get less reliable the further out you go. The next 7 days are more trustworthy than days 8–14. The shaded band on the chart widens with horizon to show that growing uncertainty.</p>
            ${ins.data.forecastClamped ? '<p>Some projected days hit zero — your trend extrapolates below what the model can represent (focus minutes can\'t be negative). The point forecast is still meaningful, but treat the floor as "near-zero days" rather than literal zero.</p>' : ''}
        `)}
    `;
}

function detailCompletion(ins) {
    const d = ins.data;
    // Last 8 sessions with their status
    const recent = d.sessions.slice(-8).reverse().map((s) => {
        const date = new Date(s.startedAt);
        const dayLabel = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        const min = Math.round((s.durationSeconds || 0) / 60);
        return `<li>
            <span>${dayLabel} · ${min} min</span>
            <span class="num ${s.completed ? 'is-good' : 'is-flat'}">${s.completed ? 'finished' : 'cut short'}</span>
        </li>`;
    }).join('');
    // Day-of-week breakdown
    const byDay = new Array(7).fill(0).map(() => ({ total: 0, done: 0 }));
    for (const s of d.sessions) {
        const day = new Date(s.startedAt).getDay();
        byDay[day].total++;
        if (s.completed) byDay[day].done++;
    }
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const byDayList = byDay.map((row, i) => {
        if (row.total === 0) return '';
        const pct = Math.round((row.done / row.total) * 100);
        return `<li><span>${dayLabels[i]}</span><span class="num">${pct}% (${row.done}/${row.total})</span></li>`;
    }).filter(Boolean).join('');
    return `
        ${detailBlock('What this is', `
            <p>The percentage of focus sessions you start that you actually run all the way to the target time.</p>
        `)}
        ${detailBlock('How it counts', `
            <p>"Finished" means you ran the full target duration (e.g. all 25 minutes of a 25-minute session). "Cut short" means you stopped, reset, or skipped before time was up.</p>
        `)}
        ${detailBlock('Your numbers', `
            <ul class="detail-list">
                <li><span>total sessions started</span><span class="num">${d.total}</span></li>
                <li><span>finished</span><span class="num is-good">${d.completed} (${Math.round((d.completed / d.total) * 100)}%)</span></li>
                <li><span>cut short</span><span class="num is-flat">${d.cutShort} (${Math.round((d.cutShort / d.total) * 100)}%)</span></li>
            </ul>
        `)}
        ${byDayList ? detailBlock('By day of week', `<ul class="detail-list">${byDayList}</ul>`) : ''}
        ${detailBlock('Your last 8 sessions', `<ul class="detail-list">${recent}</ul>`)}
    `;
}

function detailPatterns(ins) {
    const d = ins.data;
    const palette = ['rgba(149,226,164,1)', 'rgba(180,144,232,1)', 'rgba(120,200,240,1)', 'rgba(255,184,92,1)'];
    const clusterRows = d.clusters.map((cl, i) => {
        const members = d.sessions.filter((_, idx) => d.assignments[idx] === cl.idx);
        const avgDur = members.length ? mean(members.map((s) => (s.durationSeconds || 0) / 60)) : 0;
        const avgQual = members.length ? mean(members.map((s) => s.focusQuality || 0)) : 0;
        const avgDist = members.length ? mean(members.map((s) => s.distractionCount || 0)) : 0;
        return `
            <li class="cluster-row">
                <span class="cluster-row__dot" style="background:${palette[i % palette.length]}"></span>
                <div class="cluster-row__main">
                    <div class="cluster-row__head">
                        <span class="cluster-row__label">${escapeHtml(cl.label)}</span>
                        <span class="cluster-row__count num">${cl.count} sessions · ${Math.round((cl.count / d.sessions.length) * 100)}%</span>
                    </div>
                    ${cl.description ? `<p class="cluster-row__desc">${escapeHtml(cl.description)}</p>` : ''}
                    <ul class="cluster-row__stats">
                        <li><span>avg duration</span><span class="num">${avgDur.toFixed(0)} min</span></li>
                        <li><span>avg quality</span><span class="num">${avgQual.toFixed(0)}/100</span></li>
                        <li><span>avg tab-switches</span><span class="num">${avgDist.toFixed(1)}</span></li>
                    </ul>
                </div>
            </li>
        `;
    }).join('');
    return `
        ${detailBlock('What this is', `
            <p>We grouped every focus session you've done into "types" based on three things about each session: how long it ran, the focus quality score, and how many times you switched tabs.</p>
            <p>Sessions that look similar in those three numbers ended up in the same group.</p>
        `)}
        ${detailBlock('How we found the groups', `
            <p>We used <strong>k-means clustering</strong> — a standard machine-learning method:</p>
            <ol class="detail-steps">
                <li>Pick K starting points spread across your data (k-means++ seeding)</li>
                <li>Group every session with its closest starting point</li>
                <li>Move each starting point to the center of its group</li>
                <li>Repeat until the groups stop changing</li>
                <li>Restart 5 times — keep the run with the cleanest groups</li>
            </ol>
            <p>We tried K = 2, 3, and 4, and picked the K with the cleanest separation between groups (the "elbow" point).</p>
        `)}
        ${detailBlock('Your groups', `<ul class="cluster-list">${clusterRows}</ul>`)}
        ${detailBlock('Reading the chart', `
            <p>The chart above plots every session as a small dot, colored by which group it ended up in. The bigger circle of each color is that group's center — the typical session of that type.</p>
        `)}
    `;
}

function detailConditions(ins) {
    const { ranked, baselineRate, totalSessions } = ins.data;
    const rows = ranked.map((r) => {
        const lift = r.lift;
        const more = lift > 1;
        const factor = more ? lift.toFixed(2) : (1 / Math.max(0.01, lift)).toFixed(2);
        return `
            <li>
                <div class="condition-row">
                    <span class="condition-row__name">${escapeHtml(r.name)}</span>
                    <span class="condition-row__lift ${more ? 'is-up' : 'is-down'}">
                        ${factor}× ${more ? 'more likely' : 'less likely'}
                    </span>
                </div>
                <div class="condition-row__meta">
                    ${r.n} sessions matched · ${Math.round(r.rate * 100)}% finish in this group · ${Math.round(r.baselineRate * 100)}% across all sessions
                </div>
            </li>
        `;
    }).join('');
    return `
        ${detailBlock('What this is', `
            <p>For each tested condition (time of day, sound on, weekday, etc.), we checked whether your sessions finish at a different rate than your overall average.</p>
        `)}
        ${detailBlock('How we found it', `
            <p>For each condition:</p>
            <ol class="detail-steps">
                <li>Find every session matching the condition</li>
                <li>Compute the percentage that ran to completion</li>
                <li>Compare against your overall completion rate (${Math.round(baselineRate * 100)}% across ${totalSessions} sessions)</li>
                <li>The "lift" is the ratio between the two</li>
            </ol>
            <p>A lift of <strong>1.5×</strong> means you're 50% more likely to finish in that condition. A lift of <strong>0.7×</strong> means 30% less likely.</p>
        `)}
        ${detailBlock('All conditions, ranked', `<ul class="condition-list">${rows}</ul>`)}
        ${detailBlock('A note on this', `
            <p>This finds simple, single-condition patterns — not combinations (e.g. "morning AND with rain"). The strongest single signal is shown first. Lift on small samples (under 10 sessions in a group) is noisier.</p>
        `)}
    `;
}

// ───────────────────────────────────────────────────────────────────────
// Day detail — clicking any calendar cell drops the section content
// for a single-day breakdown of every block, every metric, and how
// the day compares to the user's overall pace.
// ───────────────────────────────────────────────────────────────────────

const ISO_DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIsoDay(iso) {
    // iso is yyyy-mm-dd in *local* time. new Date('yyyy-mm-dd') parses
    // as UTC and shifts by tz offset, which would land on the wrong
    // calendar day for users west of GMT. Build the date manually.
    if (typeof iso !== 'string') return null;
    const m = iso.match(ISO_DAY_RE);
    if (!m) return null;
    const [, ys, ms, ds] = m;
    const date = new Date(Number(ys), Number(ms) - 1, Number(ds), 0, 0, 0, 0);
    // The constructor accepts wild values like month=13 (silently rolls
    // forward); guard against that by checking the round-trip.
    if (date.getMonth() !== Number(ms) - 1 || date.getDate() !== Number(ds)) {
        return null;
    }
    return date;
}

function sameLocalDay(ts, dayStart) {
    const d = new Date(ts);
    return d.getFullYear() === dayStart.getFullYear()
        && d.getMonth() === dayStart.getMonth()
        && d.getDate() === dayStart.getDate();
}

function formatHourMin(ts) {
    const d = new Date(ts);
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh}:${m} ${ampm}`;
}

function renderDayDetail(iso, focusSessions) {
    const dayStart = parseIsoDay(iso);
    if (!dayStart || !Array.isArray(focusSessions)) {
        // Malformed iso — fall back to a graceful empty state and
        // surface the back button so the user isn't stuck.
        return `
            ${dayDetailHeader('Unknown date', '', "we couldn't read that day")}
            <div class="day-detail__empty">
                <p>That date didn't parse as a real day. Pick another cell from the calendar.</p>
            </div>
        `;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const daysAgo = Math.round((todayStart - dayStart) / 86400_000);
    const isFuture = dayStart > todayStart;

    const dayLabel = dayStart.toLocaleDateString(undefined, {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
    const dayShort = daysAgo === 0 ? 'today'
        : daysAgo === 1 ? 'yesterday'
        : daysAgo > 1 ? `${daysAgo} days ago`
        : '';

    const dayBlocks = focusSessions
        .filter((s) => sameLocalDay(s.startedAt, dayStart))
        .sort((a, b) => a.startedAt - b.startedAt);

    if (isFuture) {
        return `
            ${dayDetailHeader(dayLabel, '', 'no data — this date is in the future')}
            <div class="day-detail__empty">
                <p>You can only inspect days that have already happened.</p>
            </div>
        `;
    }

    if (dayBlocks.length === 0) {
        return `
            ${dayDetailHeader(dayLabel, dayShort, 'no focus sessions on this day')}
            <div class="day-detail__empty">
                <p>You didn't run a focus session on ${dayLabel}.</p>
                <p class="day-detail__empty-sub">An empty day isn't a failure — sometimes life just doesn't have a focus-session-shaped hole.</p>
            </div>
        `;
    }

    return `
        ${dayDetailHeader(dayLabel, dayShort, dayBlocks.length === 1
            ? '1 focus session'
            : `${dayBlocks.length} focus sessions`)}
        ${dayKpiRow(dayBlocks)}
        ${dayTimelineCard(dayBlocks, dayStart)}
        ${dayCompareCard(dayBlocks, dayStart, focusSessions)}
        ${dayBlocksCard(dayBlocks)}
        ${daySoundsCard(dayBlocks)}
    `;
}

function dayDetailHeader(dayLabel, agoLabel, sub) {
    return `
        <div class="day-detail">
            <button class="insight-detail__back" type="button" data-day-back>
                <span aria-hidden="true">‹</span> back
            </button>
            <header class="day-detail__head">
                ${agoLabel ? `<span class="day-detail__ago">${escapeHtml(agoLabel)}</span>` : ''}
                <h3 class="day-detail__title">${escapeHtml(dayLabel)}</h3>
                <p class="day-detail__sub">${escapeHtml(sub)}</p>
            </header>
        </div>
    `;
}

function dayKpiRow(blocks) {
    const totalSec = blocks.reduce((a, s) => a + (s.durationSeconds || 0), 0);
    const totalMin = totalSec / 60;
    const finished = blocks.filter((s) => s.completed).length;
    const tasks = blocks.reduce((a, s) => a + (s.tasksCompleted || 0), 0);
    const switches = blocks.reduce((a, s) => a + (s.distractionCount || 0), 0);
    const avgQ = blocks.length
        ? Math.round(mean(blocks.map((s) => s.focusQuality || 0)))
        : 0;
    return kpiRow([
        { label: 'minutes focused', value: Math.round(totalMin), unit: 'min', count: true },
        { label: 'finished', value: finished, unit: `/ ${blocks.length}`, count: true },
        { label: 'tasks done', value: tasks, unit: '', count: true },
        { label: 'tab-switches', value: switches, unit: '', count: true },
        { label: 'avg quality', value: avgQ, unit: '/100', count: true },
    ]);
}

function dayTimelineCard(blocks, dayStart) {
    const W = 720;
    const H = 64;
    const padX = 28;
    const trackY = 26;
    const trackH = 16;
    const innerW = W - padX * 2;
    const dayMs = 86400_000;
    const xFor = (ms) => padX + ((ms - dayStart.getTime()) / dayMs) * innerW;

    const bars = blocks.map((s) => {
        const start = Math.max(s.startedAt, dayStart.getTime());
        const end = Math.min(s.startedAt + (s.durationSeconds || 0) * 1000, dayStart.getTime() + dayMs);
        const x = xFor(start);
        const w = Math.max(2, xFor(end) - x);
        const finished = !!s.completed;
        const opacity = finished ? 0.85 : 0.5;
        return `
            <rect x="${x.toFixed(1)}" y="${trackY}" width="${w.toFixed(1)}" height="${trackH}" rx="3"
                  fill="currentColor" fill-opacity="${opacity}"
                  ${finished ? '' : 'stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="2 2" stroke-width="0.8"'}>
                <title>${formatHourMin(s.startedAt)} · ${Math.round((s.durationSeconds || 0) / 60)} min · ${finished ? 'finished' : 'cut short'}</title>
            </rect>
        `;
    }).join('');

    const ticks = [0, 6, 12, 18, 24].map((h) => {
        const x = padX + (h / 24) * innerW;
        const label = h === 0 ? '12a'
            : h === 6 ? '6a'
            : h === 12 ? '12p'
            : h === 18 ? '6p'
            : '12a';
        return `
            <line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${trackY - 4}" y2="${trackY + trackH + 4}"
                  stroke="rgba(255, 246, 225, 0.12)" stroke-width="0.7" />
            <text x="${x.toFixed(1)}" y="${(H - 4).toFixed(1)}" class="day-timeline__tick"
                  text-anchor="middle">${label}</text>
        `;
    }).join('');

    return `
        <section class="detail-block">
            <h4 class="detail-block__title">when you focused</h4>
            <div class="detail-block__content">
                <p>Each band shows when a focus session ran, from that session's start time to its end. Solid bands are sessions you finished; dashed bands are ones you cut short.</p>
                <svg class="day-timeline" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="timeline of the day's focus sessions">
                    <rect x="${padX}" y="${trackY}" width="${innerW}" height="${trackH}" rx="3"
                          fill="rgba(255, 220, 160, 0.05)" />
                    ${ticks}
                    ${bars}
                </svg>
            </div>
        </section>
    `;
}

function dayCompareCard(blocks, dayStart, allSessions) {
    const todayMin = blocks.reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60;
    const dayKey = dayStart.getTime();

    // Build per-day minute totals across the user's whole history,
    // keyed by local-day-start. Excluding the clicked day from the
    // means below is what makes the comparison honest — otherwise
    // we'd be comparing the day to a number that already contains it.
    const dayMap = new Map();
    const dowMap = new Map();
    const dow = dayStart.getDay();
    for (const s of allSessions) {
        const d = new Date(s.startedAt);
        d.setHours(0, 0, 0, 0);
        const k = d.getTime();
        if (k === dayKey) continue; // exclude the clicked day from itself
        const min = (s.durationSeconds || 0) / 60;
        dayMap.set(k, (dayMap.get(k) || 0) + min);
        if (d.getDay() === dow) {
            dowMap.set(k, (dowMap.get(k) || 0) + min);
        }
    }

    // Overall daily mean over the calendar span (zero days included —
    // "0 min on Tuesday" is a real datum). Span runs from the user's
    // earliest activity through today; if the clicked day is inside
    // that range we drop one day so we don't compare it to itself.
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const oldest = allSessions.length
        ? Math.min(...allSessions.map((s) => s.startedAt))
        : Date.now();
    const oldestStart = new Date(oldest);
    oldestStart.setHours(0, 0, 0, 0);
    let spanDays = Math.max(1, Math.round((todayStart - oldestStart) / 86400_000) + 1);
    if (dayKey >= oldestStart.getTime() && dayKey <= todayStart.getTime()) {
        spanDays = Math.max(1, spanDays - 1);
    }
    const totalMinExcl = [...dayMap.values()].reduce((a, x) => a + x, 0);
    const overallDailyMean = totalMinExcl / spanDays;

    // Day-of-week mean — average across all *other* same-weekday days
    // the user was active. If this is the only such day, dowMean is
    // null (we skip the row rather than show 0).
    const dowSum = [...dowMap.values()].reduce((a, x) => a + x, 0);
    const dowMean = dowMap.size > 0 ? dowSum / dowMap.size : null;

    // Z-score: clicked day's minutes against the distribution of all
    // *other* active days (days where the user focused at all).
    const distArr = [...dayMap.values()].filter((v) => v > 0);
    const distMean = distArr.length ? mean(distArr) : 0;
    const distSd = distArr.length ? stdDev(distArr) : 0;
    const z = distSd > 0 ? (todayMin - distMean) / distSd : 0;
    const rarity = distArr.length >= 5
        ? Math.abs(z) >= 2 ? 'a standout day'
            : Math.abs(z) >= 1.5 ? 'a notable day'
            : Math.abs(z) >= 1 ? 'a bit above/below average'
            : 'an ordinary day'
        : '';
    const dirCmp = todayMin >= overallDailyMean ? '+' : '−';
    const cmpAmount = Math.abs(todayMin - overallDailyMean);
    const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return `
        <section class="detail-block">
            <h4 class="detail-block__title">how this day compares</h4>
            <div class="detail-block__content">
                <ul class="detail-list">
                    <li>
                        <span>this day</span>
                        <span class="num">${Math.round(todayMin)} min</span>
                    </li>
                    <li>
                        <span>your overall daily mean</span>
                        <span class="num">${overallDailyMean.toFixed(0)} min</span>
                    </li>
                    <li>
                        <span>vs your overall mean</span>
                        <span class="num ${todayMin >= overallDailyMean ? 'is-good' : 'is-flat'}">${dirCmp}${Math.round(cmpAmount)} min</span>
                    </li>
                    ${dowMean !== null ? `
                        <li>
                            <span>your typical ${dayLabels[dow]}</span>
                            <span class="num">${dowMean.toFixed(0)} min</span>
                        </li>
                    ` : ''}
                    ${distArr.length >= 5 ? `
                        <li>
                            <span>standout score (z)</span>
                            <span class="num">${z.toFixed(2)}</span>
                        </li>
                        <li>
                            <span>read</span>
                            <span class="num">${rarity}</span>
                        </li>
                    ` : ''}
                </ul>
                ${distArr.length < 5 ? `<p class="detail-block__note">we'd need at least 5 active days of history to compute a meaningful "how unusual" score.</p>` : ''}
            </div>
        </section>
    `;
}

function dayBlocksCard(blocks) {
    const rows = blocks.map((s) => {
        const min = Math.round((s.durationSeconds || 0) / 60);
        const startTime = formatHourMin(s.startedAt);
        const finished = !!s.completed;
        const tasks = s.tasksCompleted || 0;
        const switches = s.distractionCount || 0;
        const quality = s.focusQuality || 0;
        const sounds = (s.activeSounds || []).slice(0, 3);
        return `
            <li class="day-block">
                <div class="day-block__head">
                    <span class="day-block__time">${escapeHtml(startTime)}</span>
                    <span class="day-block__dur num">${min} min</span>
                    <span class="day-block__status ${finished ? 'is-good' : 'is-flat'}">
                        ${finished ? 'finished' : 'cut short'}
                    </span>
                </div>
                <ul class="day-block__stats">
                    <li><span>quality</span><span class="num">${quality}/100</span></li>
                    <li><span>tasks done</span><span class="num">${tasks}</span></li>
                    <li><span>tab-switches</span><span class="num">${switches}</span></li>
                </ul>
                ${sounds.length ? `
                    <div class="day-block__sounds">
                        ${sounds.map((snd) => `<span class="day-block__sound">${escapeHtml(snd)}</span>`).join('')}
                        ${(s.activeSounds || []).length > 3 ? `<span class="day-block__sound day-block__sound--more">+${(s.activeSounds || []).length - 3}</span>` : ''}
                    </div>
                ` : ''}
            </li>
        `;
    }).join('');
    return `
        <section class="detail-block">
            <h4 class="detail-block__title">every session, in order</h4>
            <div class="detail-block__content">
                <ul class="day-block-list">${rows}</ul>
            </div>
        </section>
    `;
}

function daySoundsCard(blocks) {
    const counts = new Map();
    for (const s of blocks) {
        for (const snd of s.activeSounds || []) {
            counts.set(snd, (counts.get(snd) || 0) + 1);
        }
    }
    if (counts.size === 0) return '';
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const total = blocks.length;
    return `
        <section class="detail-block">
            <h4 class="detail-block__title">sounds you used</h4>
            <div class="detail-block__content">
                <ul class="detail-list">
                    ${ranked.map(([sound, n]) => `
                        <li>
                            <span>${escapeHtml(capitalize(sound))}</span>
                            <span class="num">${n} of ${total} session${total === 1 ? '' : 's'}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </section>
    `;
}

/** Friendlier section labels than uppercased internal keys. */
function insightKindLabel(kind) {
    switch (kind) {
        case 'trend':       return 'TREND';
        case 'changepoint': return 'YOUR PATTERN SHIFTED';
        case 'wow':         return 'VS THE MONTH BEFORE';
        case 'anomaly':     return 'UNUSUAL DAY';
        case 'correlation': return 'PATTERN FOUND';
        case 'friction':    return 'TIME LOST';
        case 'forecast':    return 'FORECAST';
        case 'completion':  return 'FINISH RATE';
        case 'patterns':    return 'WORK PATTERNS';
        case 'conditions':  return 'WHAT HELPS YOU FINISH';
        default:            return kind.toUpperCase();
    }
}

/** Inspect each cluster's centroid and assign a plain-English label
 *  plus a one-line description. The description spells out, in
 *  ordinary words, what makes a session "long quiet" or "rough" — so
 *  the user doesn't have to guess. */
function describeClusters(result, sessions) {
    return result.centroids.map((c, i) => {
        const [duration, quality, distractions] = c;
        let label, description;
        // The thresholds work on normalised features (0..1):
        //   duration  — short < 0.4, long > 0.6
        //   quality   — low < 0.4, high > 0.6
        //   distractions — calm < 0.35, scattered > 0.55
        if (duration > 0.6 && quality > 0.55 && distractions < 0.4) {
            label = 'long, quiet sessions';
            description = 'long sessions where you barely switched tabs and stayed focused';
        } else if (duration < 0.4 && distractions < 0.4) {
            label = 'short, focused sessions';
            description = 'shorter sessions, but you stayed on task — minimal tab-switching';
        } else if (distractions > 0.55) {
            label = 'scattered, interrupted sessions';
            description = 'sessions broken up by frequent tab-switches';
        } else if (quality > 0.55) {
            label = 'solid medium-length sessions';
            description = 'mid-length sessions with a strong focus-quality score — your reliable middle ground';
        } else if (quality < 0.4) {
            label = 'rough sessions';
            description = 'sessions that scored low on focus quality — a mix of duration and distractions worked against them';
        } else {
            label = 'regular sessions';
            description = 'average sessions — nothing stood out either way';
        }
        const count = result.assignments.filter((a) => a === i).length;
        return { idx: i, label, description, count, centroid: c };
    });
}

/** Cluster scatter: sessions plotted in (duration, quality) space,
 *  coloured by their cluster assignment, with centroids drawn larger. */
function vizClusters(features, assignments, clusters) {
    const W = 240, H = 90;
    const padX = 6, padY = 6;
    const palette = [
        'rgba(149, 226, 164, 0.85)',  // green
        'rgba(180, 144, 232, 0.85)',  // violet
        'rgba(120, 200, 240, 0.85)',  // blue
        'rgba(255, 184, 92, 0.85)',   // orange
    ];
    const sx = (x) => padX + x * (W - padX * 2);
    const sy = (y) => H - padY - y * (H - padY * 2);
    const points = features.map((f, i) => {
        const x = sx(f[0]);
        const y = sy(f[1]);
        const c = palette[assignments[i] % palette.length];
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.4" fill="${c}" />`;
    }).join('');
    const centroidDots = clusters.map((cl, i) => {
        const cx = sx(cl.centroid[0]);
        const cy = sy(cl.centroid[1]);
        const fill = palette[i % palette.length];
        return `
            <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6" fill="${fill}"
                    stroke="rgba(255, 255, 255, 0.5)" stroke-width="1.6" />
        `;
    }).join('');
    return `
        <svg class="insight-viz insight-viz--clusters" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <text x="${(W - 6).toFixed(1)}" y="${(H - 4).toFixed(1)}" class="insight-viz__caption"
                  text-anchor="end">duration →</text>
            <text x="${(padX - 2).toFixed(1)}" y="${(padY + 4).toFixed(1)}" class="insight-viz__caption"
                  text-anchor="start">↑ quality</text>
            ${points}
            ${centroidDots}
        </svg>
    `;
}

/** Conditions rank — horizontal "above/below baseline" lift bars
 *  with a centerline at 1×. Bars to the right = more likely; bars
 *  to the left = less likely. */
function vizConditions(ranked) {
    if (!ranked || !ranked.length) return '';
    const W = 240, H = 88;
    const padY = 8;
    const cx = W / 2;
    const rowH = (H - padY * 2) / ranked.length;
    const maxAbs = Math.max(
        0.5,
        ...ranked.map((r) => Math.abs((r.lift || 1) - 1))
    );
    const scale = (W / 2 - 12) / maxAbs;
    const bars = ranked.map((r, i) => {
        const y = padY + i * rowH;
        const offset = ((r.lift || 1) - 1) * scale;
        const barX = cx + Math.min(0, offset);
        const barW = Math.max(2, Math.abs(offset));
        const opacity = r.lift > 1 ? 0.78 : 0.42;
        return `
            <rect x="${barX.toFixed(1)}" y="${(y + 4).toFixed(1)}"
                  width="${barW.toFixed(1)}" height="${(rowH - 8).toFixed(1)}" rx="3"
                  fill="currentColor" fill-opacity="${opacity}" />
        `;
    }).join('');
    return `
        <svg class="insight-viz insight-viz--conditions" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <line x1="${cx}" y1="${padY}" x2="${cx}" y2="${(H - padY).toFixed(1)}"
                  stroke="currentColor" stroke-opacity="0.32" stroke-width="0.7" />
            ${bars}
        </svg>
    `;
}

/** Plain-English read on how confident the trend is, without using
 *  r², σ, or any other symbol. */
function trendConfidenceCopy(r2) {
    if (r2 >= 0.5)  return 'a clear pattern day-by-day';
    if (r2 >= 0.25) return 'a real trend, but with daily ups and downs';
    if (r2 >= 0.1)  return 'a weak trend — could just be noise';
    return 'not enough signal yet — keep going';
}

/** Plain-English read on how rare a day is. */
function rarityCopy(z) {
    const abs = Math.abs(z);
    const dir = z > 0 ? 'this big' : 'this quiet';
    if (abs >= 3) return `a day ${dir} happens once every few months`;
    if (abs >= 2) return `a day ${dir} happens once every couple of weeks`;
    return `a day ${dir} stands out from your usual pattern`;
}

/** Compare two minute totals as a friendly multiplier ("about 2× of"). */
function ratioCopy(top, bottom) {
    if (bottom <= 0) return 'far above';
    const r = top / bottom;
    if (r >= 4) return `${r.toFixed(1)}×`;
    if (r >= 2) return `over ${Math.floor(r)}× of`;
    if (r >= 1.4) return `about ${r.toFixed(1)}× of`;
    return 'well above';
}

/** Translate Pearson |r| into a plain-English strength label. */
function correlationStrength(r) {
    const abs = Math.abs(r);
    if (abs >= 0.7) return { label: 'very strong', aside: 'the two move together almost step-for-step' };
    if (abs >= 0.5) return { label: 'strong',      aside: 'a clear, repeated link' };
    if (abs >= 0.3) return { label: 'moderate',    aside: 'a real link, with some noise' };
    return                 { label: 'mild',        aside: 'a hint of a link — not strong yet' };
}

// ═══════════════════════════════════════════════════════════════════════
// Shared building blocks
// ═══════════════════════════════════════════════════════════════════════

function sectionHeader(title, sub) {
    return `
        <header class="psection__head">
            <h2 class="psection__title">${escapeHtml(title)}</h2>
            ${sub ? `<p class="psection__sub">${escapeHtml(sub)}</p>` : ''}
        </header>
    `;
}

function emptyState(text) {
    return `
        <div class="psection__empty">
            <p class="psection__empty-headline">no data yet</p>
            <p class="psection__empty-sub">${escapeHtml(text)}</p>
        </div>
    `;
}

function kpiRow(items) {
    return `
        <div class="kpi-row">
            ${items.map((it) => kpi(it)).join('')}
        </div>
    `;
}

function kpi({ label, value, unit = '', count = true }) {
    const numAttr = count && Number.isFinite(Number(value)) ? `data-count="${value}"` : '';
    const display = count && Number.isFinite(Number(value)) ? '0' : escapeHtml(String(value));
    return `
        <div class="kpi">
            <span class="kpi__num" ${numAttr}>${display}</span>
            ${unit ? `<span class="kpi__unit">${escapeHtml(unit)}</span>` : ''}
            <span class="kpi__label">${escapeHtml(label)}</span>
        </div>
    `;
}

function chartCard({ eyebrow, sub = '', chart = '', content = '', aside = '' }) {
    return `
        <div class="chart-card">
            <header class="chart-card__head">
                <span class="chart-card__eyebrow">${escapeHtml(eyebrow)}</span>
                ${sub ? `<span class="chart-card__sub">${escapeHtml(sub)}</span>` : ''}
            </header>
            <div class="chart-card__body">
                ${chart || content || ''}
                ${aside ? `<aside class="chart-card__aside">${aside}</aside>` : ''}
            </div>
        </div>
    `;
}

function insightCallouts(items) {
    const real = items.filter(Boolean);
    if (!real.length) return '';
    return `
        <div class="callout-row">
            ${real.map((c) => `
                <div class="callout callout--${c.tone || 'flat'}">
                    <span class="callout__label">${escapeHtml(c.label)}</span>
                    <span class="callout__value">${escapeHtml(String(c.value))}</span>
                    <span class="callout__hint">${escapeHtml(c.hint)}</span>
                </div>
            `).join('')}
        </div>
    `;
}

// ───────────────────────────────────────────────────────────────────────
// Trend helpers — produce the y-array for a linear-regression overlay,
// plus the slope-narrative used in subtitles.
// ───────────────────────────────────────────────────────────────────────

function regressionLine(values) {
    if (!values || values.length < 3) return null;
    const points = values.map((y, x) => [x, y]);
    const { slope, intercept } = linearRegression(points);
    return values.map((_, x) => slope * x + intercept);
}

function regressionStats(values) {
    if (!values || values.length < 3) return null;
    const points = values.map((y, x) => [x, y]);
    const { slope, intercept, r2 } = linearRegression(points);
    return { slope, intercept, r2, slopePerWeek: slope * 7 };
}

/** Plain-English summary of a daily-totals regression. We avoid r² and
 *  any technical labels; readers get a direction, a magnitude, and a
 *  quick read on how reliable the trend looks. */
function regressionNarrative(reg, unitLabel) {
    if (!reg) return '';
    const slopePerWeek = reg.slopePerWeek;
    const abs = Math.abs(slopePerWeek);
    if (abs < 0.3) {
        return reg.r2 >= 0.1 ? 'fairly steady — small movement either way' : 'roughly flat';
    }
    const dir = slopePerWeek > 0 ? 'climbing' : 'easing back';
    const verb = slopePerWeek > 0 ? 'gain' : 'drop';
    const unitWord = abs >= 1.5 ? `${unitLabel}s` : unitLabel;
    const slopeStr = abs >= 1
        ? `${abs.toFixed(0)} ${unitWord} a week`
        : `${Math.round(abs * 4)} ${unitLabel}s a month`;
    const tail = reg.r2 >= 0.4 ? ' — a clear pattern'
        : reg.r2 >= 0.15 ? ' — shape is real, day-to-day still bumpy'
        : ' — soft signal so far';
    return `${dir} — about a ${slopeStr} ${verb}${tail}`;
}

// ───────────────────────────────────────────────────────────────────────
// Count-up animation
// ───────────────────────────────────────────────────────────────────────

function animateCountUps(root) {
    const reduced = isReducedMotion();
    const targets = root.querySelectorAll('[data-count]');
    targets.forEach((el) => {
        const raw = el.dataset.count;
        const target = Number(raw);
        if (!Number.isFinite(target)) return;
        if (reduced || target <= 0) {
            el.textContent = String(target);
            return;
        }
        const start = performance.now();
        const duration = 600 + Math.min(400, Math.log2(target + 1) * 80);
        function tick(now) {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - (1 - t) ** 5;
            el.textContent = Math.round(target * eased).toString();
            if (t < 1) requestAnimationFrame(tick);
            else el.textContent = String(target);
        }
        requestAnimationFrame(tick);
    });
}

// ───────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────

function ringPath(cx, cy, rInner, rOuter, a0, a1) {
    const x0 = cx + Math.cos(a0) * rOuter;
    const y0 = cy + Math.sin(a0) * rOuter;
    const x1 = cx + Math.cos(a1) * rOuter;
    const y1 = cy + Math.sin(a1) * rOuter;
    const x2 = cx + Math.cos(a1) * rInner;
    const y2 = cy + Math.sin(a1) * rInner;
    const x3 = cx + Math.cos(a0) * rInner;
    const y3 = cy + Math.sin(a0) * rInner;
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    return [
        `M ${x0} ${y0}`,
        `A ${rOuter} ${rOuter} 0 ${large} 1 ${x1} ${y1}`,
        `L ${x2} ${y2}`,
        `A ${rInner} ${rInner} 0 ${large} 0 ${x3} ${y3}`,
        'Z',
    ].join(' ');
}
function formatHour(h) {
    const ampm = h >= 12 ? 'pm' : 'am';
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh}${ampm}`;
}
function capitalize(s) {
    return s ? s[0].toUpperCase() + s.slice(1) : s;
}
function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = String(s ?? '');
    return div.innerHTML;
}
