// observatory.js — the cinematic profile-tied analytics surface.
//
// Replaces the old `patterns-view.js`. Six structural beats:
//
//   1. Now           — today's focus state, hero numeral, today's
//                      session arcs as a small radial diagram
//   2. Rhythm        — last 7 days. Showcase: best-hour polar curve
//                      glowing brightest at the user's peak hour
//   3. Constellation — last 30 days as a Vogel-spiral starfield;
//                      each day a star, brightness = focus minutes
//   4. Friction      — context-switch cost rendered as lost light:
//                      every tab-away pulled toward an event-horizon
//                      symbol with the cost surfaced in minutes
//   5. Companions    — strongest sound correlations narrated as
//                      typed lines, threshold-gated for honesty
//
// Discrete vantages, not a scroll. Each is its own cinematic frame;
// you switch between them via the top rail, the arrow keys, or the
// in-frame ⟶ chevron. Numbers count up on reveal; visualisations
// re-animate. Cosmic-native — no card grids, no chart axes, no
// benchmarks vs. strangers. Profile-tied via the account dropdown,
// also reachable from the momentum trail and the `i` shortcut.
//
// Everything is built on the existing per-session substrate
// (features/sessions.js); no schema changes needed for v1.

import { isReducedMotion } from '../core/motion.js';
import { getAllSessions, onSessionsChange } from '../features/sessions.js';
import { createFocusTrap } from './focus-trap.js';

// ───────────────────────────────────────────────────────────────────────
// Structure
// ───────────────────────────────────────────────────────────────────────

const VANTAGES = [
    { id: 'now',           label: 'Now',           order: 0 },
    { id: 'rhythm',        label: 'Rhythm',        order: 1 },
    { id: 'constellation', label: 'Constellation', order: 2 },
    { id: 'friction',      label: 'Friction',      order: 3 },
    { id: 'companions',    label: 'Companions',    order: 4 },
];

let initialised = false;
let panel = null;
let trap = null;
let isOpen = false;
let activeVantage = 'now';
let unsubscribeSessions = null;

// ───────────────────────────────────────────────────────────────────────
// Public
// ───────────────────────────────────────────────────────────────────────

export function initObservatory() {
    if (initialised) return;
    initialised = true;

    // Momentum-trail entry — clicking the dots opens the Observatory.
    // (Old patterns-view used the same entry; we hijack it here.)
    const trail = document.getElementById('momentumTrail');
    if (trail) {
        const chip = trail.closest('.stat-chip');
        if (chip) {
            chip.setAttribute('role', 'button');
            chip.setAttribute('tabindex', '0');
            chip.setAttribute('aria-label', 'Open the Observatory');
            chip.style.cursor = 'pointer';
            chip.addEventListener('click', open);
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
            else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
                e.preventDefault();
                stepVantage(1);
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                e.preventDefault();
                stepVantage(-1);
            } else if (e.key >= '1' && e.key <= '5') {
                const idx = parseInt(e.key, 10) - 1;
                if (idx < VANTAGES.length) {
                    e.preventDefault();
                    setVantage(VANTAGES[idx].id);
                }
            }
            return;
        }
        // 'i' opens the Observatory (insights). Skip when an input has
        // focus, or when another modal is open.
        if (e.key === 'i') {
            const a = document.activeElement;
            if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
            if (document.querySelector('.auth-modal.is-open, .help-center-overlay.is-open, #settingsPanel.is-open')) return;
            e.preventDefault();
            open();
        }
    });
}

/** Public entry — used by the account dropdown's "Open the Observatory"
 *  button as well as the momentum-trail click. */
export function openObservatory() {
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
    // Live re-render when a session lands while the Observatory is open.
    if (!unsubscribeSessions) unsubscribeSessions = onSessionsChange(() => {
        if (isOpen) render();
    });
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

function setVantage(id) {
    if (!VANTAGES.some((v) => v.id === id)) return;
    if (activeVantage === id) return;
    activeVantage = id;
    render();
}

function stepVantage(delta) {
    const idx = VANTAGES.findIndex((v) => v.id === activeVantage);
    const next = (idx + delta + VANTAGES.length) % VANTAGES.length;
    setVantage(VANTAGES[next].id);
}

// ───────────────────────────────────────────────────────────────────────
// Build / render
// ───────────────────────────────────────────────────────────────────────

function buildPanel() {
    panel = document.createElement('div');
    panel.className = 'observatory';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Observatory — your patterns');
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = `
        <div class="observatory__scrim" data-observatory-close></div>
        <div class="observatory__sheet">
            <header class="observatory__header">
                <button class="observatory__close" type="button"
                        aria-label="Close the Observatory" data-observatory-close>×</button>
                <span class="observatory__eyebrow">OBSERVATORY</span>
                <nav class="observatory__rail" id="observatoryRail" role="tablist"
                     aria-label="Vantage points"></nav>
            </header>
            <div class="observatory__body" id="observatoryBody"></div>
            <footer class="observatory__footer">
                <button class="observatory__step observatory__step--prev"
                        type="button" data-step="-1" aria-label="Previous vantage">
                    <span aria-hidden="true">‹</span> prev
                </button>
                <span class="observatory__counter" id="observatoryCounter"></span>
                <button class="observatory__step observatory__step--next"
                        type="button" data-step="1" aria-label="Next vantage">
                    next <span aria-hidden="true">›</span>
                </button>
            </footer>
        </div>
    `;
    document.body.appendChild(panel);
    panel.querySelectorAll('[data-observatory-close]').forEach((el) =>
        el.addEventListener('click', close)
    );
    panel.querySelectorAll('[data-step]').forEach((el) =>
        el.addEventListener('click', () => stepVantage(parseInt(el.dataset.step, 10)))
    );
}

function render() {
    renderRail();
    renderBody();
    renderCounter();
}

function renderRail() {
    const rail = panel.querySelector('#observatoryRail');
    if (!rail) return;
    rail.innerHTML = VANTAGES.map((v, i) => `
        <button class="observatory__rail-btn ${v.id === activeVantage ? 'is-active' : ''}"
                type="button" role="tab"
                aria-selected="${v.id === activeVantage}"
                data-vantage="${v.id}"
                title="${v.label} (press ${i + 1})">
            <span class="observatory__rail-dot" aria-hidden="true"></span>
            <span class="observatory__rail-label">${v.label}</span>
        </button>
    `).join('');
    rail.querySelectorAll('[data-vantage]').forEach((btn) =>
        btn.addEventListener('click', () => setVantage(btn.dataset.vantage))
    );
}

function renderCounter() {
    const counter = panel.querySelector('#observatoryCounter');
    if (!counter) return;
    const idx = VANTAGES.findIndex((v) => v.id === activeVantage);
    counter.textContent = `${idx + 1} / ${VANTAGES.length}`;
}

function renderBody() {
    const body = panel.querySelector('#observatoryBody');
    if (!body) return;
    const sessions = getAllSessions().filter((s) => s.kind === 'focus');
    let html = '';
    switch (activeVantage) {
        case 'now':           html = renderNow(sessions); break;
        case 'rhythm':        html = renderRhythm(sessions); break;
        case 'constellation': html = renderConstellation(sessions); break;
        case 'friction':      html = renderFriction(sessions); break;
        case 'companions':    html = renderCompanions(sessions); break;
    }
    // Build with a fresh element each switch so the entrance animation
    // (and the count-up) restart cleanly.
    body.innerHTML = `<section class="vantage vantage--${activeVantage}">${html}</section>`;
    requestAnimationFrame(() => {
        const v = body.querySelector('.vantage');
        if (v) v.classList.add('is-revealed');
        animateCountUps(body);
    });
}

// ───────────────────────────────────────────────────────────────────────
// Vantage 1 — Now
// ───────────────────────────────────────────────────────────────────────

function renderNow(allSessions) {
    const today = sessionsOnDate(allSessions, new Date());
    const totalSec = today.reduce((a, s) => a + (s.durationSeconds || 0), 0);
    const minutes = Math.round(totalSec / 60);
    const taskTotal = today.reduce((a, s) => a + (s.tasksCompleted || 0), 0);
    const longestSec = today.reduce((a, s) => Math.max(a, s.durationSeconds || 0), 0);

    if (today.length === 0) {
        return emptyState(
            'today is unwritten',
            'start a focus block — your first star lands here.'
        );
    }

    return `
        ${eyebrow('TODAY')}
        ${heroNumeral(minutes, 'minutes focused')}
        <div class="vantage__meta">
            <span><span class="meta-num" data-count="${today.length}">0</span>${today.length === 1 ? ' session' : ' sessions'}</span>
            ${taskTotal > 0 ? `<span class="meta-divider">·</span><span><span class="meta-num" data-count="${taskTotal}">0</span> ${taskTotal === 1 ? 'task done' : 'tasks done'}</span>` : ''}
            ${longestSec > 60 ? `<span class="meta-divider">·</span><span>longest: ${formatDuration(longestSec)}</span>` : ''}
        </div>
        <div class="vantage__viz">${renderTodaySpark(today)}</div>
    `;
}

function renderTodaySpark(today) {
    if (today.length === 0) return '';
    // Simple horizontal arc of session-arcs — each session a glowing
    // segment, length proportional to its duration.
    const W = 480;
    const H = 60;
    const PAD = 20;
    const innerW = W - PAD * 2;
    const totalSec = today.reduce((a, s) => a + (s.durationSeconds || 0), 0) || 1;
    let cursor = PAD;
    const segs = today.map((s) => {
        const len = (s.durationSeconds / totalSec) * innerW;
        const intensity = Math.min(1, (s.focusQuality || 60) / 100 + 0.2);
        const seg = `<rect x="${cursor.toFixed(2)}" y="${(H / 2) - 1.5}" width="${Math.max(2, len - 4).toFixed(2)}" height="3" rx="1.5" fill="rgba(255, 220, 160, ${intensity.toFixed(2)})" />`;
        cursor += len;
        return seg;
    }).join('');
    return `
        <svg class="now-spark" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" aria-hidden="true">
            <defs>
                <filter id="nowSparkGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.6" />
                </filter>
            </defs>
            <g filter="url(#nowSparkGlow)">${segs}</g>
            ${segs}
        </svg>
    `;
}

// ───────────────────────────────────────────────────────────────────────
// Vantage 2 — Rhythm (best-hour curve)
// ───────────────────────────────────────────────────────────────────────

function renderRhythm(allSessions) {
    const week = lastNDays(allSessions, 7);
    const totalMin = Math.round(week.reduce((a, s) => a + s.durationSeconds, 0) / 60);

    if (week.length < 3) {
        return emptyState(
            'your week is yet to take shape',
            week.length === 0 ? 'no focus blocks this week.' : `${week.length} session${week.length === 1 ? '' : 's'} so far — a few more and your rhythm appears.`
        );
    }

    const buckets = bestHourBuckets(week);
    const peakHour = buckets.indexOf(Math.max(...buckets));
    const peakMin = Math.round(buckets[peakHour] / 60);

    return `
        ${eyebrow('YOUR WEEKLY RHYTHM')}
        ${heroNumeral(totalMin, 'minutes across 7 days')}
        <div class="vantage__viz">${renderHourCurve(buckets, peakHour)}</div>
        <p class="vantage__caption">
            you focus deepest around
            <strong>${formatHourPair(peakHour)}</strong>
            — ${peakMin} ${peakMin === 1 ? 'minute' : 'minutes'} on average through that hour.
        </p>
    `;
}

function renderHourCurve(buckets, peakHour) {
    // 24 wedges around a circle, intensity = focus seconds in that hour.
    // Midnight at the top (12 o'clock); rotates clockwise. The visual is
    // a glowing ring with each hour's segment proportionally bright.
    const SIZE = 320;
    const CX = SIZE / 2;
    const CY = SIZE / 2;
    const RING_OUTER = 138;
    const RING_INNER = 98;
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
    // Tick marks at 6/12/18 — only labels for sense of orientation
    const ticks = [
        { hour: 0,  label: '12a' },
        { hour: 6,  label: '6a'  },
        { hour: 12, label: '12p' },
        { hour: 18, label: '6p'  },
    ].map(({ hour, label }) => {
        const ang = (hour * 15 - 90) * Math.PI / 180;
        const r = RING_OUTER + 14;
        const x = CX + Math.cos(ang) * r;
        const y = CY + Math.sin(ang) * r + 4;
        return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle"
                       class="hour-curve__tick">${label}</text>`;
    }).join('');
    // Peak-hour marker — a brighter inner pulse at the peak segment
    const peakAng = (peakHour * 15 + 7.5 - 90) * Math.PI / 180;
    const peakX = CX + Math.cos(peakAng) * (RING_OUTER + 4);
    const peakY = CY + Math.sin(peakAng) * (RING_OUTER + 4);
    return `
        <svg class="hour-curve" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" aria-hidden="true">
            <defs>
                <radialGradient id="hourCurveCore" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="rgba(255, 220, 160, 0.18)" />
                    <stop offset="100%" stop-color="rgba(255, 220, 160, 0)" />
                </radialGradient>
                <filter id="hourCurveGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.4" />
                </filter>
            </defs>
            <circle cx="${CX}" cy="${CY}" r="${RING_INNER - 12}" fill="url(#hourCurveCore)" />
            <circle cx="${CX}" cy="${CY}" r="${RING_OUTER}"
                    fill="none" stroke="rgba(255, 220, 160, 0.07)" stroke-width="0.8" />
            <circle cx="${CX}" cy="${CY}" r="${RING_INNER}"
                    fill="none" stroke="rgba(255, 220, 160, 0.07)" stroke-width="0.8" />
            <g filter="url(#hourCurveGlow)">${segs}</g>
            ${segs}
            ${ticks}
            <circle cx="${peakX.toFixed(2)}" cy="${peakY.toFixed(2)}" r="3.4"
                    fill="#faf3e3"
                    style="filter: drop-shadow(0 0 6px rgba(255, 215, 130, 0.95));" />
        </svg>
    `;
}

function bestHourBuckets(sessions) {
    const out = new Array(24).fill(0);
    for (const s of sessions) {
        const h = new Date(s.startedAt).getHours();
        out[h] += s.durationSeconds || 0;
    }
    return out;
}

// ───────────────────────────────────────────────────────────────────────
// Vantage 3 — Constellation (30-day Vogel-spiral starfield)
// ───────────────────────────────────────────────────────────────────────

function renderConstellation(allSessions) {
    const days = 30;
    const counts = dailyMinuteTotals(allSessions, days);
    const totalMin = Math.round(counts.reduce((a, x) => a + x, 0));
    const activeDays = counts.filter((c) => c > 0).length;

    if (totalMin === 0) {
        return emptyState(
            'no constellation yet',
            '30 days of focus paint a galaxy here. start with one block.'
        );
    }
    return `
        ${eyebrow('LAST 30 DAYS')}
        ${heroNumeral(Math.round(totalMin / 60), totalMin >= 60 ? 'hours' : 'minutes', { unit: 'hours' })}
        <div class="vantage__meta">
            <span><span class="meta-num" data-count="${activeDays}">0</span> active ${activeDays === 1 ? 'day' : 'days'} of ${days}</span>
            <span class="meta-divider">·</span>
            <span>${formatPercent(activeDays / days)} consistency</span>
        </div>
        <div class="vantage__viz">${renderSpiralStarfield(counts)}</div>
        <p class="vantage__caption">
            ${describeConstellation(counts)}
        </p>
    `;
}

function renderSpiralStarfield(counts) {
    // Vogel spiral — phyllotactic arrangement — for n=30 dots.
    // Each dot is one day; the most recent on the outer edge, the
    // oldest near the centre. Brightness scales with focus minutes.
    const SIZE = 320;
    const CX = SIZE / 2;
    const CY = SIZE / 2;
    const SCALE = 11;
    const GOLDEN = Math.PI * (3 - Math.sqrt(5)); // ~137.508°
    const peak = Math.max(...counts, 1);
    const dots = counts.map((m, i) => {
        // Reverse so today is the outermost dot.
        const reversedIdx = counts.length - 1 - i;
        const r = Math.sqrt(reversedIdx + 1) * SCALE;
        const a = reversedIdx * GOLDEN;
        const x = CX + Math.cos(a) * r;
        const y = CY + Math.sin(a) * r;
        const intensity = m / peak;
        const radius = 2.4 + intensity * 4.2;
        const isToday = i === counts.length - 1;
        const fill = `rgba(255, 220, 160, ${(0.18 + intensity * 0.78).toFixed(3)})`;
        const haloR = isToday ? radius + 3 : radius + intensity * 4;
        const haloAlpha = isToday ? 0.45 : intensity * 0.32;
        return `
            <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${haloR.toFixed(2)}"
                    fill="rgba(255, 205, 115, ${haloAlpha.toFixed(3)})"
                    style="filter: blur(${(intensity * 1.4 + (isToday ? 0.6 : 0)).toFixed(2)}px);" />
            <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius.toFixed(2)}"
                    fill="${fill}"
                    ${isToday ? 'class="constellation-today"' : ''} />
        `;
    }).join('');
    return `
        <svg class="constellation" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" aria-hidden="true">
            <defs>
                <radialGradient id="constellationCore" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="rgba(255, 220, 160, 0.08)" />
                    <stop offset="100%" stop-color="rgba(255, 220, 160, 0)" />
                </radialGradient>
            </defs>
            <circle cx="${CX}" cy="${CY}" r="80" fill="url(#constellationCore)" />
            ${dots}
        </svg>
    `;
}

function describeConstellation(counts) {
    const peakDay = counts.indexOf(Math.max(...counts));
    const peakAgo = counts.length - 1 - peakDay;
    if (peakAgo === 0) return 'today is your brightest day this month.';
    if (peakAgo === 1) return 'yesterday was your brightest day this month.';
    return `your brightest day this month was ${peakAgo} ${peakAgo === 1 ? 'day' : 'days'} ago.`;
}

// ───────────────────────────────────────────────────────────────────────
// Vantage 4 — Friction (context-switch cost as lost light)
// ───────────────────────────────────────────────────────────────────────

function renderFriction(allSessions) {
    const week = lastNDays(allSessions, 7);
    const switches = week.reduce((a, s) => a + (s.distractionCount || 0), 0);
    const awaySec = week.reduce((a, s) => a + (s.distractionSeconds || 0), 0);
    // Conservative blended figure (the literature ranges 9.5 → 23 min;
    // the lower bound is the more honest one given many tab-aways are
    // brief).
    const RECOVERY_PER_SWITCH = 9.5;
    const lostMin = switches * RECOVERY_PER_SWITCH + awaySec / 60;

    if (week.length === 0) {
        return emptyState(
            'no friction to render',
            'your week is yet to be measured.'
        );
    }
    if (switches < 3) {
        return emptyState(
            'almost no friction this week',
            switches === 0
                ? 'no tab-aways during your focus blocks. clean.'
                : `${switches} tab-aways in 7 days — barely any reorientation cost.`
        );
    }

    return `
        ${eyebrow('CONTEXT-SWITCH COST · 7 DAYS')}
        <div class="friction__lead">
            <span class="friction__lead-num"><span class="meta-num" data-count="${switches}">0</span></span>
            <span class="friction__lead-label">tab-aways during focus</span>
        </div>
        <div class="vantage__viz">${renderEventHorizonLoss(switches)}</div>
        ${heroNumeral(Math.round(lostMin), 'minutes lost reorienting', { variant: 'mid' })}
        <p class="vantage__caption">
            at the conservative ~9.5-minute recovery per switch
            (the literature ranges higher — your real cost is likely greater).
        </p>
    `;
}

function renderEventHorizonLoss(switchCount) {
    // A horizontal arrangement: a stream of small particles drifting
    // from left toward an event-horizon disc on the right. Each
    // particle represents one switch; the more switches, the denser
    // the stream. Visually evokes "your focus pulled into the dark."
    const W = 520;
    const H = 100;
    const HORIZON_X = W - 60;
    const HORIZON_Y = H / 2;
    const HORIZON_R = 26;
    const particleN = Math.min(48, Math.max(8, switchCount));
    let particles = '';
    for (let i = 0; i < particleN; i++) {
        const t = i / (particleN - 1 || 1);
        const x = 24 + t * (HORIZON_X - 50);
        const y = H / 2 + (Math.sin(i * 1.7) * 14) + (Math.sin(i * 3.1) * 6);
        const r = 1 + Math.random() * 1.6;
        const alpha = 0.18 + (1 - t) * 0.45;
        particles += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="rgba(255, 220, 160, ${alpha.toFixed(2)})" />`;
    }
    return `
        <svg class="horizon-loss" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" aria-hidden="true">
            <defs>
                <radialGradient id="horizonGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="rgba(0, 0, 0, 1)" />
                    <stop offset="55%" stop-color="rgba(0, 0, 0, 0.92)" />
                    <stop offset="100%" stop-color="rgba(0, 0, 0, 0)" />
                </radialGradient>
                <radialGradient id="horizonRim" cx="50%" cy="50%" r="50%">
                    <stop offset="78%" stop-color="rgba(255, 205, 115, 0)" />
                    <stop offset="92%" stop-color="rgba(255, 205, 115, 0.55)" />
                    <stop offset="100%" stop-color="rgba(255, 205, 115, 0)" />
                </radialGradient>
                <filter id="horizonGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="1.2" />
                </filter>
            </defs>
            <g filter="url(#horizonGlow)">${particles}</g>
            ${particles}
            <circle cx="${HORIZON_X}" cy="${HORIZON_Y}" r="${HORIZON_R + 14}" fill="url(#horizonRim)" />
            <circle cx="${HORIZON_X}" cy="${HORIZON_Y}" r="${HORIZON_R}" fill="url(#horizonGrad)" />
            <circle cx="${HORIZON_X}" cy="${HORIZON_Y}" r="${HORIZON_R}" fill="#000" />
        </svg>
    `;
}

// ───────────────────────────────────────────────────────────────────────
// Vantage 5 — Companions (sound correlations)
// ───────────────────────────────────────────────────────────────────────

function renderCompanions(allSessions) {
    const month = lastNDays(allSessions, 30);
    if (month.length < 6) {
        return emptyState(
            'your sound rituals will appear here',
            'each ambient track\'s effect on your sessions surfaces once enough sessions have been recorded with and without it.'
        );
    }
    const correlations = soundCorrelations(month);
    if (correlations.length === 0) {
        return emptyState(
            'no clear sound signal yet',
            'try a few sessions with the same ambient mix — patterns appear when contrast does.'
        );
    }

    const top = correlations[0];
    const dir = top.delta > 0 ? 'longer' : 'shorter';
    const pct = Math.abs(Math.round(top.delta * 100));

    return `
        ${eyebrow('SOUND COMPANIONS · 30 DAYS')}
        <div class="companions__hero">
            <p class="companions__lead">sessions with</p>
            <p class="companions__name">${escapeHtml(top.sound)}</p>
            <p class="companions__delta">
                run <strong>${pct}%</strong> ${dir}
                <span class="companions__avg">${Math.round(top.withAvg / 60)} min vs ${Math.round(top.withoutAvg / 60)} min</span>
            </p>
        </div>
        ${correlations.length > 1 ? `
            <div class="companions__list">
                ${correlations.slice(1, 3).map((c) => {
                    const cDir = c.delta > 0 ? 'longer' : 'shorter';
                    const cPct = Math.abs(Math.round(c.delta * 100));
                    return `
                        <div class="companions__row">
                            <span class="companions__row-name">${escapeHtml(c.sound)}</span>
                            <span class="companions__row-delta">${cPct}% ${cDir}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        ` : ''}
    `;
}

function soundCorrelations(sessions) {
    const grouped = new Map();
    for (const s of sessions) {
        const sounds = Array.isArray(s.activeSounds) ? s.activeSounds : [];
        for (const sound of sounds) {
            if (!grouped.has(sound)) grouped.set(sound, []);
            grouped.get(sound).push(s);
        }
    }
    const out = [];
    for (const [sound, withSessions] of grouped.entries()) {
        if (withSessions.length < 4) continue;
        const without = sessions.filter(
            (s) => !(s.activeSounds || []).includes(sound)
        );
        if (without.length < 4) continue;
        const withAvg = withSessions.reduce((a, x) => a + x.durationSeconds, 0) / withSessions.length;
        const withoutAvg = without.reduce((a, x) => a + x.durationSeconds, 0) / without.length;
        if (withoutAvg <= 0) continue;
        const delta = (withAvg - withoutAvg) / withoutAvg;
        if (Math.abs(delta) < 0.1) continue;
        out.push({ sound, withAvg, withoutAvg, delta, samples: withSessions.length });
    }
    out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    return out;
}

// ───────────────────────────────────────────────────────────────────────
// Shared building blocks
// ───────────────────────────────────────────────────────────────────────

function eyebrow(text) {
    return `<p class="vantage__eyebrow">${text}</p>`;
}

function heroNumeral(value, caption, { variant = 'big' } = {}) {
    const klass = variant === 'mid' ? 'vantage__hero vantage__hero--mid' : 'vantage__hero';
    return `
        <div class="${klass}">
            <span class="vantage__hero-num" data-count="${value}">0</span>
            ${caption ? `<span class="vantage__hero-caption">${escapeHtml(caption)}</span>` : ''}
        </div>
    `;
}

function emptyState(headline, sub) {
    return `
        <div class="vantage__empty">
            <p class="vantage__empty-headline">${escapeHtml(headline)}</p>
            <p class="vantage__empty-sub">${escapeHtml(sub)}</p>
        </div>
    `;
}

// ───────────────────────────────────────────────────────────────────────
// Count-up animation (Apple-Health-style)
// ───────────────────────────────────────────────────────────────────────

function animateCountUps(root) {
    const reduced = isReducedMotion();
    const targets = root.querySelectorAll('[data-count]');
    targets.forEach((el) => {
        const target = parseInt(el.dataset.count, 10);
        if (!Number.isFinite(target)) return;
        if (reduced || target <= 0) {
            el.textContent = String(target);
            return;
        }
        const start = performance.now();
        const duration = 600 + Math.min(400, Math.log2(target + 1) * 80);
        function tick(now) {
            const t = Math.min(1, (now - start) / duration);
            // ease-out quint — settles smoothly
            const eased = 1 - (1 - t) ** 5;
            el.textContent = Math.round(target * eased).toString();
            if (t < 1) requestAnimationFrame(tick);
            else el.textContent = String(target);
        }
        requestAnimationFrame(tick);
    });
}

// ───────────────────────────────────────────────────────────────────────
// SVG geometry — annular wedge
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

// ───────────────────────────────────────────────────────────────────────
// Data helpers
// ───────────────────────────────────────────────────────────────────────

function sessionsOnDate(sessions, dateObj) {
    const dayStart = new Date(dateObj);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = dayStart.getTime() + 86400_000;
    return sessions.filter((s) => s.startedAt >= dayStart.getTime() && s.startedAt < dayEnd);
}

function lastNDays(sessions, n) {
    const cutoff = Date.now() - n * 86400_000;
    return sessions.filter((s) => s.startedAt >= cutoff);
}

function dailyMinuteTotals(sessions, days = 30) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();
    const out = new Array(days).fill(0);
    for (const s of sessions) {
        if (s.kind !== 'focus') continue;
        const sd = new Date(s.startedAt);
        sd.setHours(0, 0, 0, 0);
        const ago = Math.floor((todayMs - sd.getTime()) / 86400_000);
        if (ago < 0 || ago >= days) continue;
        out[days - 1 - ago] += (s.durationSeconds || 0) / 60;
    }
    return out;
}

function formatHourPair(h) {
    const next = (h + 1) % 24;
    return `${formatHour(h)}–${formatHour(next)}`;
}
function formatHour(h) {
    const ampm = h >= 12 ? 'pm' : 'am';
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh}${ampm}`;
}
function formatDuration(seconds) {
    const m = Math.round(seconds / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return mm === 0 ? `${h}h` : `${h}h ${mm}m`;
}
function formatPercent(p) {
    return `${Math.round(p * 100)}%`;
}
function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = String(s ?? '');
    return div.innerHTML;
}
