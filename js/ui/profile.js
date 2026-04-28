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
    cohensD,
    dailyTotals,
    histogram,
    hourDayMatrix,
    linearRegression,
    mean,
    median,
    movingAverage,
    pearsonCorrelation,
    percentile,
    percentileRank,
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
            if (e.key === 'Escape') close();
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
    setBackgroundInert(true);
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
    setBackgroundInert(false);
    trap?.deactivate();
    if (unsubscribeSessions) {
        unsubscribeSessions();
        unsubscribeSessions = null;
    }
}

function setBackgroundInert(on) {
    const targets = [
        document.querySelector('.container'),
        document.querySelector('.nav-cluster'),
        document.querySelector('.cosmos-toolbar'),
        document.querySelector('.help-trigger'),
        document.querySelector('.settings-trigger'),
        document.getElementById('homeMiniTimer'),
        document.getElementById('hmtSliver'),
    ];
    for (const el of targets) {
        if (!el) continue;
        if (on) el.setAttribute('inert', '');
        else el.removeAttribute('inert');
    }
}

function setSection(id) {
    if (!SECTIONS.some((s) => s.id === id)) return;
    if (activeSection === id) return;
    activeSection = id;
    render();
    // Scroll content area to top on section switch.
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
    const sessions = getAllSessions().filter((s) => s.kind === 'focus');
    let html = '';
    switch (activeSection) {
        case 'overview': html = renderOverview(sessions); break;
        case 'focus':    html = renderFocus(sessions); break;
        case 'tasks':    html = renderTasks(sessions); break;
        case 'sounds':   html = renderSounds(sessions); break;
        case 'time':     html = renderTime(sessions); break;
        case 'insights': html = renderInsights(sessions); break;
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
        ${sectionHeader('Overview', currentUser ? 'your cosmic profile' : 'this device — sign in to bring your patterns across')}

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
                    <div class="psection__card-eyebrow">cosmic signature</div>
                    ${renderCosmicSignature(sessions)}
                </div>
            </div>

            ${renderOverviewQuickLinks()}
        `}
    `;
}

function renderOverviewEmpty() {
    return `
        <div class="psection__empty">
            <p class="psection__empty-headline">no sessions yet</p>
            <p class="psection__empty-sub">complete one focus block — even a single minute — and your overview takes shape.</p>
        </div>
    `;
}

function renderOverviewQuickLinks() {
    const links = SECTIONS.filter((s) => s.id !== 'overview').map((s) => `
        <button class="psection__link" type="button" data-section-jump="${s.id}">
            <span class="psection__link-label">${s.label}</span>
            <span class="psection__link-chevron" aria-hidden="true">›</span>
        </button>
    `).join('');
    // The buttons get bound after innerHTML lands via animateCountUps's
    // requestAnimationFrame hook. Wire them in renderContent's tail.
    return `
        <div class="psection__links" id="profileQuickLinks">${links}</div>
    `;
}

function renderCosmicSignature(sessions) {
    const days = dailyTotals(sessions, 60);
    const SIZE = 220;
    const CX = SIZE / 2;
    const CY = SIZE / 2;
    const SCALE = 9;
    const GOLDEN = Math.PI * (3 - Math.sqrt(5));
    const peak = Math.max(...days, 1);
    const dots = days.map((m, i) => {
        const reversed = days.length - 1 - i;
        const r = Math.sqrt(reversed + 1) * SCALE;
        const a = reversed * GOLDEN;
        const x = CX + Math.cos(a) * r;
        const y = CY + Math.sin(a) * r;
        const intensity = m / peak;
        const radius = 1.6 + intensity * 3.4;
        const isToday = i === days.length - 1;
        return `
            <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius.toFixed(2)}"
                    fill="rgba(255, 220, 160, ${(0.18 + intensity * 0.78).toFixed(3)})"
                    ${isToday ? 'class="signature-today"' : ''} />
        `;
    }).join('');
    return `
        <svg class="cosmic-signature" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" aria-hidden="true">
            <defs>
                <radialGradient id="sigCore" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="rgba(255, 220, 160, 0.08)" />
                    <stop offset="100%" stop-color="rgba(255, 220, 160, 0)" />
                </radialGradient>
            </defs>
            <circle cx="${CX}" cy="${CY}" r="60" fill="url(#sigCore)" />
            ${dots}
        </svg>
    `;
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 2 — Focus
// ═══════════════════════════════════════════════════════════════════════

function renderFocus(sessions) {
    if (sessions.length === 0) {
        return `
            ${sectionHeader('Focus', 'every focus block becomes data here')}
            ${emptyState('begin a focus block — your trends, distributions, and anomalies will appear once data arrives.')}
        `;
    }
    const durations = sessions.map((s) => s.durationSeconds / 60);
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
        ${sectionHeader('Focus', 'session timing, distributions, and trends')}

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
            ${sectionHeader('Tasks', 'completion patterns, day-of-week and hour-of-day')}
            ${emptyState('no sessions yet — task analytics derive from focus blocks where tasks were on the deck.')}
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
        ${sectionHeader('Tasks', 'when and where you actually finish things')}

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
            ${sectionHeader('Sounds', 'how ambient companions shape your focus')}
            ${emptyState('no sessions yet — sound analytics need a few sessions to surface honest signal.')}
        `;
    }

    const effects = soundEffects(month, { minSamples: 4 });
    const top = ranked.slice(0, 5);

    return `
        ${sectionHeader('Sounds', 'how ambient companions shape your focus')}

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
            ${sectionHeader('Time', 'when across the week and the day')}
            ${emptyState('once focus blocks accumulate, your time fingerprint surfaces here.')}
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
        ${sectionHeader('Time', 'when across the week and the day')}

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
            ${sectionHeader('Insights', 'patterns we notice in your own sessions — not comparisons against other people')}
            ${emptyState('the more sessions you finish, the more patterns we can pick up. a handful of focus blocks and the cards start filling in.')}
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
    const flags = anomalyFlags(last30, 1.5);
    const anomalyDays = flags.filter(Boolean).length;
    const correlation = pearsonCorrelation(
        sessions.map((s) => (s.distractionCount || 0)),
        sessions.map((s) => -(s.focusQuality || 0))
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
        insights.push({
            kind: 'trend',
            headline: `your daily focus is ${direction} — ${verb} about ${slopeStr}`,
            sub: trendConfidenceCopy(reg.r2),
            value: `${reg.slopePerWeek >= 0 ? '+' : '−'}${slopeAbs.toFixed(1)} min / week`,
        });
    }

    if (wow && wow.delta != null && Math.abs(wow.delta) > 0.05) {
        const dir = wow.delta >= 0 ? 'up' : 'down';
        insights.push({
            kind: 'wow',
            headline: `you're focusing ${(Math.abs(wow.delta) * 100).toFixed(0)}% ${dir} compared to the month before`,
            sub: `about ${wow.newer.toFixed(0)} minutes a day now · ${wow.older.toFixed(0)} minutes a day before`,
            value: `${wow.delta >= 0 ? '+' : '−'}${(Math.abs(wow.delta) * 100).toFixed(0)}%`,
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
        });
    } else if (anomalyDays > 0) {
        insights.push({
            kind: 'anomaly',
            headline: `${anomalyDays} ${anomalyDays === 1 ? 'day' : 'days'} that broke from your normal in the last month`,
            sub: 'days that stood out — much higher or much lower than your typical pace',
            value: `${anomalyDays} ${anomalyDays === 1 ? 'day' : 'days'}`,
        });
    }

    if (sessions.length >= 8 && Math.abs(correlation) > 0.2) {
        // The pearson was computed against -(focusQuality), so positive
        // r means more distractions → lower quality. Translate to plain
        // language without the sign reasoning.
        const strength = correlationStrength(correlation);
        const headline = correlation > 0
            ? `the more you switch tabs in a session, the lower your focus quality goes`
            : `tab-switches and focus quality move together — but not strongly`;
        insights.push({
            kind: 'correlation',
            headline,
            sub: `${strength.label} pattern — ${strength.aside}`,
            value: strength.label,
        });
    }

    if (switches >= 5) {
        const lostHrs = lostMin / 60;
        const valueText = lostHrs >= 1
            ? `${lostHrs.toFixed(1)} hours`
            : `${Math.round(lostMin)} min`;
        insights.push({
            kind: 'friction',
            headline: lostHrs >= 1
                ? `you've lost about ${lostHrs.toFixed(1)} hours to context-switching`
                : `you've lost about ${Math.round(lostMin)} minutes to context-switching`,
            sub: `${switches} tab-aways during your focus blocks — every switch adds ~9 minutes of getting back into it`,
            value: valueText,
        });
    }

    if (dailyAvg > 0) {
        const monthHrs = monthForecast / 60;
        const valueText = monthHrs >= 1
            ? `${monthHrs.toFixed(1)} hours`
            : `${Math.round(monthForecast)} min`;
        insights.push({
            kind: 'forecast',
            headline: monthHrs >= 1
                ? `keep this up and you'll focus about ${monthHrs.toFixed(1)} hours in the next 30 days`
                : `keep this up and you'll focus about ${Math.round(monthForecast)} minutes in the next 30 days`,
            sub: `based on the last 7 days — about ${Math.round(dailyAvg)} minutes a day`,
            value: valueText,
        });
    }

    if (sessions.length >= 5) {
        const pct = Math.round(completionRate * 100);
        const headline = completionRate >= 0.85
            ? `you finish almost every focus block you start (${pct}%)`
            : completionRate >= 0.6
                ? `you finish ${pct}% of the focus blocks you start`
                : `you finish ${pct}% of focus blocks — about ${100 - pct}% get cut short`;
        insights.push({
            kind: 'completion',
            headline,
            sub: completionRate >= 0.85
                ? 'rock-solid follow-through'
                : completionRate >= 0.6
                    ? 'solid follow-through — most blocks reach the end'
                    : 'cutting blocks short is a habit worth watching',
            value: `${pct}%`,
        });
    }

    if (insights.length === 0) {
        return `
            ${sectionHeader('Insights', 'patterns we notice in your own sessions — not comparisons against other people')}
            ${emptyState('your sessions are still settling. once a couple of weeks of focus blocks pile up, the patterns sharpen and surface here.')}
        `;
    }

    return `
        ${sectionHeader('Insights', 'patterns we notice in your own sessions — not comparisons against other people')}
        <div class="insight-grid">
            ${insights.map((ins) => `
                <article class="insight-card insight-card--${ins.kind}">
                    <span class="insight-card__kind">${insightKindLabel(ins.kind)}</span>
                    <p class="insight-card__headline">${escapeHtml(ins.headline)}</p>
                    <p class="insight-card__sub">${escapeHtml(ins.sub)}</p>
                    <p class="insight-card__value">${escapeHtml(String(ins.value))}</p>
                </article>
            `).join('')}
        </div>
    `;
}

/** Friendlier section labels than uppercased internal keys. */
function insightKindLabel(kind) {
    switch (kind) {
        case 'trend':       return 'TREND';
        case 'wow':         return 'MONTH OVER MONTH';
        case 'anomaly':     return 'STANDOUT DAY';
        case 'correlation': return 'WHAT MOVES WITH WHAT';
        case 'friction':    return 'FOCUS LEAK';
        case 'forecast':    return 'WHERE THIS LEADS';
        case 'completion':  return 'FOLLOW-THROUGH';
        default:            return kind.toUpperCase();
    }
}

/** Translate r² into plain-English confidence. We avoid using the
 *  symbol or the number — readers don't need it on the front of a
 *  card. The category captures the shape of the trend. */
function trendConfidenceCopy(r2) {
    if (r2 >= 0.5)  return 'a steady, clear pattern in the day-by-day numbers';
    if (r2 >= 0.25) return 'a real trend, though some days swing more than others';
    if (r2 >= 0.1)  return 'a soft trend — could still settle either way';
    return 'a faint signal so far — give it a couple more weeks';
}

/** Plain-English z-score rarity. Avoids the σ symbol entirely. */
function rarityCopy(z) {
    const abs = Math.abs(z);
    const dir = z > 0 ? 'this strong' : 'this quiet';
    if (abs >= 3) return `a day ${dir} happens roughly once every few months`;
    if (abs >= 2) return `a day ${dir} happens roughly once every couple of weeks`;
    return `a day ${dir} stands out from your normal pattern`;
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
    // Wire any [data-section-jump] quick-link buttons in the Overview.
    root.querySelectorAll('[data-section-jump]').forEach((btn) => {
        btn.addEventListener('click', () => setSection(btn.dataset.sectionJump));
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
