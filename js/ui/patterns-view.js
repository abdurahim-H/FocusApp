// patterns-view.js — the personal observatory.
//
// Tapping the momentum trail (or pressing 'i') opens a full-viewport
// panel of insights derived from the per-session table. Not a
// dashboard — no cards, no chart grid. Each insight is its own
// magazine-style block: small uppercase label, large mono numeral,
// supporting caption. Scrollable; the cosmos remains visible behind
// at low opacity.
//
// Insights surface only when the data supports them. A two-day-old
// account doesn't see "Rain on Tuesday afternoons → 32% longer";
// it sees an honest "more data needed" placeholder. The threshold
// for each insight is documented inline.
//
// Open / close lifecycle:
//   • opens on click of #momentumTrail or 'i' key
//   • Esc closes; clicking the scrim closes
//   • background gets `inert` while open so screen readers don't
//     navigate into the cosmos behind.

import { getAllSessions } from '../features/sessions.js';
import { createFocusTrap } from './focus-trap.js';

let initialised = false;
let panel = null;
let scrim = null;
let trap = null;
let isOpen = false;

// Window options the user can toggle through (header chip).
const WINDOWS = [
    { key: '7d', label: 'past 7 days', days: 7 },
    { key: '30d', label: 'past 30 days', days: 30 },
    { key: 'all', label: 'all time', days: null },
];
let activeWindow = WINDOWS[1]; // default 30d

// ───────────────────────────────────────────────────────────────────────
// Init / open / close
// ───────────────────────────────────────────────────────────────────────

export function initPatternsView() {
    if (initialised) return;
    initialised = true;

    const trail = document.getElementById('momentumTrail');
    if (trail) {
        // The trail is already an aria-hidden visual — so we wrap it in
        // an interactive role on the parent chip rather than the dot
        // row. Clicking the chip opens the panel.
        const chip = trail.closest('.stat-chip');
        if (chip) {
            chip.setAttribute('role', 'button');
            chip.setAttribute('tabindex', '0');
            chip.setAttribute('aria-label', 'Open your patterns');
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
        if (e.key === 'Escape' && isOpen) close();
        // Open with `i` (insights) — only when no other modal/text input
        // is active.
        if (e.key === 'i' && !isOpen) {
            const a = document.activeElement;
            if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
            // Don't grab the key if a modal is open.
            if (document.querySelector('.auth-modal.is-open, .help-center-overlay.is-open, #settingsPanel.is-open')) return;
            e.preventDefault();
            open();
        }
    });
}

function open() {
    if (isOpen) return;
    isOpen = true;
    if (!panel) buildPanel();
    render();
    panel.classList.add('is-open');
    setBackgroundInert(true);
    if (!trap) trap = createFocusTrap(panel);
    trap.activate(document.getElementById('momentumTrail')?.closest('.stat-chip') || document.body);
}

function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove('is-open');
    setBackgroundInert(false);
    trap?.deactivate();
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

// ───────────────────────────────────────────────────────────────────────
// DOM
// ───────────────────────────────────────────────────────────────────────

function buildPanel() {
    panel = document.createElement('div');
    panel.className = 'patterns-view';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Your patterns');
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = `
        <div class="patterns-view__scrim" data-patterns-close></div>
        <div class="patterns-view__sheet" id="patternsSheet">
            <header class="patterns-view__header">
                <button class="patterns-view__close" type="button"
                        aria-label="Close" data-patterns-close>×</button>
                <h2 class="patterns-view__eyebrow">YOUR PATTERNS</h2>
                <div class="patterns-view__window" id="patternsWindow"></div>
            </header>
            <div class="patterns-view__body" id="patternsBody"></div>
            <footer class="patterns-view__footer">
                Patterns honest only when the data supports them.
                More precise insights as more sessions accumulate.
            </footer>
        </div>
    `;
    document.body.appendChild(panel);
    panel.querySelectorAll('[data-patterns-close]').forEach((el) =>
        el.addEventListener('click', close)
    );
}

function render() {
    renderWindowToggle();
    renderBody();
}

function renderWindowToggle() {
    const host = panel.querySelector('#patternsWindow');
    if (!host) return;
    host.innerHTML = WINDOWS.map(
        (w) => `<button class="patterns-view__win ${
            w.key === activeWindow.key ? 'is-active' : ''
        }" data-window="${w.key}">${w.label}</button>`
    ).join('');
    host.querySelectorAll('[data-window]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const next = WINDOWS.find((w) => w.key === btn.dataset.window);
            if (!next) return;
            activeWindow = next;
            render();
        });
    });
}

function renderBody() {
    const body = panel.querySelector('#patternsBody');
    if (!body) return;
    const sessions = sessionsInWindow(activeWindow);
    if (sessions.length === 0) {
        body.innerHTML = `
            <div class="patterns-view__empty">
                <p class="patterns-view__empty-headline">your patterns will appear here</p>
                <p class="patterns-view__empty-sub">finish a focus session — even one — and the trail begins.</p>
            </div>
        `;
        return;
    }

    const blocks = [];
    blocks.push(insightHeadline(sessions));
    blocks.push(insightBestHour(sessions));
    blocks.push(insightBestDay(sessions));
    blocks.push(insightSoundCorrelation(sessions));
    blocks.push(insightDistractionCost(sessions));
    blocks.push(insightFocusQuality(sessions));
    body.innerHTML = blocks.filter(Boolean).join('');
}

// ───────────────────────────────────────────────────────────────────────
// Insights
// ───────────────────────────────────────────────────────────────────────

function insightHeadline(sessions) {
    const totalSec = sessions.reduce((s, x) => s + (x.durationSeconds || 0), 0);
    const hours = totalSec / 3600;
    const count = sessions.length;
    const display = hours >= 1 ? hours.toFixed(1) : (totalSec / 60).toFixed(0);
    const unit = hours >= 1 ? 'hours focused' : 'minutes focused';
    return `
        <section class="insight insight--headline">
            <p class="insight__num">${display}</p>
            <p class="insight__caption">${unit}</p>
            <p class="insight__sub">${count} session${count === 1 ? '' : 's'}</p>
        </section>
    `;
}

function insightBestHour(sessions) {
    if (sessions.length < 5) return null;
    const buckets = new Array(24).fill(0);
    for (const s of sessions) {
        const h = new Date(s.startedAt).getHours();
        buckets[h] += s.durationSeconds || 0;
    }
    const peakHour = buckets.indexOf(Math.max(...buckets));
    if (buckets[peakHour] === 0) return null;
    const next = (peakHour + 1) % 24;
    return `
        <section class="insight">
            <p class="insight__lead">you focus deepest around</p>
            <p class="insight__num insight__num--mid">${formatHourPair(peakHour, next)}</p>
            <p class="insight__sub">${describeHourBand(buckets, peakHour)}</p>
        </section>
    `;
}

function insightBestDay(sessions) {
    if (sessions.length < 7) return null;
    const days = new Array(7).fill(0); // 0=Sun..6=Sat
    for (const s of sessions) {
        const d = new Date(s.startedAt).getDay();
        days[d] += s.durationSeconds || 0;
    }
    const max = Math.max(...days);
    if (max === 0) return null;
    const peakDay = days.indexOf(max);
    const dayName = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'][peakDay];
    return `
        <section class="insight">
            <p class="insight__lead">your strongest day is</p>
            <p class="insight__num insight__num--word">${dayName}</p>
            <p class="insight__sub">across ${sessions.length} session${sessions.length === 1 ? '' : 's'} in this window</p>
        </section>
    `;
}

function insightSoundCorrelation(sessions) {
    // Need a meaningful sample on both sides of the comparison.
    if (sessions.length < 10) return null;
    const soundStats = new Map();
    for (const s of sessions) {
        const sounds = Array.isArray(s.activeSounds) ? s.activeSounds : [];
        for (const sound of sounds) {
            if (!soundStats.has(sound)) {
                soundStats.set(sound, { withSeconds: 0, withCount: 0 });
            }
            const stat = soundStats.get(sound);
            stat.withSeconds += s.durationSeconds || 0;
            stat.withCount += 1;
        }
    }
    if (soundStats.size === 0) return null;
    let bestSound = null;
    let bestDelta = 0;
    let bestWithAvg = 0;
    let bestWithoutAvg = 0;
    for (const [sound, stat] of soundStats.entries()) {
        if (stat.withCount < 4) continue; // tiny samples lie
        const withoutSessions = sessions.filter(
            (s) => !(s.activeSounds || []).includes(sound)
        );
        if (withoutSessions.length < 4) continue;
        const withoutAvg = withoutSessions.reduce((a, x) => a + (x.durationSeconds || 0), 0) / withoutSessions.length;
        const withAvg = stat.withSeconds / stat.withCount;
        if (withoutAvg <= 0) continue;
        const delta = (withAvg - withoutAvg) / withoutAvg;
        if (Math.abs(delta) > Math.abs(bestDelta)) {
            bestSound = sound;
            bestDelta = delta;
            bestWithAvg = withAvg;
            bestWithoutAvg = withoutAvg;
        }
    }
    if (!bestSound || Math.abs(bestDelta) < 0.1) return null;
    const direction = bestDelta > 0 ? 'longer' : 'shorter';
    const pct = Math.abs(Math.round(bestDelta * 100));
    return `
        <section class="insight">
            <p class="insight__lead">sessions with</p>
            <p class="insight__num insight__num--word">${escapeHtml(bestSound)}</p>
            <p class="insight__caption">run <strong>${pct}%</strong> ${direction}</p>
            <p class="insight__sub">${formatMinutes(bestWithAvg)} vs ${formatMinutes(bestWithoutAvg)}</p>
        </section>
    `;
}

function insightDistractionCost(sessions) {
    if (sessions.length < 3) return null;
    const switches = sessions.reduce((a, s) => a + (s.distractionCount || 0), 0);
    if (switches < 5) return null;
    // Asana / APA-cited 23-minute recovery figure is widely quoted; we
    // use 9.5 min as a more conservative blended figure (per the same
    // Time Doctor / RescueTime context-switching literature).
    const lostMinutes = switches * 9.5;
    const lostHours = lostMinutes / 60;
    const display = lostHours >= 1 ? `${lostHours.toFixed(1)} hours` : `${lostMinutes.toFixed(0)} minutes`;
    return `
        <section class="insight">
            <p class="insight__lead">you switched away</p>
            <p class="insight__num">${switches}</p>
            <p class="insight__caption">times — at ~9.5 min recovery each, that's roughly</p>
            <p class="insight__num insight__num--mid">${display}</p>
            <p class="insight__sub">of attention re-orienting</p>
        </section>
    `;
}

function insightFocusQuality(sessions) {
    const scored = sessions.filter((s) => Number.isFinite(s.focusQuality));
    if (scored.length < 3) return null;
    const avg = scored.reduce((a, s) => a + s.focusQuality, 0) / scored.length;
    const deepCount = scored.filter((s) => s.focusQuality >= 80).length;
    const deepPct = Math.round((deepCount / scored.length) * 100);
    return `
        <section class="insight">
            <p class="insight__lead">average focus quality</p>
            <p class="insight__num">${Math.round(avg)}</p>
            <p class="insight__caption">${deepPct}% of sessions reached deep focus (80+)</p>
        </section>
    `;
}

// ───────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────

function sessionsInWindow(win) {
    const all = getAllSessions().filter((s) => s.kind === 'focus');
    if (win.days == null) return all;
    const cutoff = Date.now() - win.days * 86400_000;
    return all.filter((s) => s.startedAt >= cutoff);
}

function formatHourPair(a, b) {
    return `${formatHour(a)}–${formatHour(b)}`;
}
function formatHour(h) {
    const ampm = h >= 12 ? 'pm' : 'am';
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh}${ampm}`;
}
function describeHourBand(buckets, peak) {
    const morning = buckets.slice(5, 12).reduce((a, x) => a + x, 0);
    const afternoon = buckets.slice(12, 18).reduce((a, x) => a + x, 0);
    const evening = buckets.slice(18, 24).reduce((a, x) => a + x, 0);
    const max = Math.max(morning, afternoon, evening);
    if (max === 0) return '';
    if (max === morning) return 'a morning person, on this evidence';
    if (max === afternoon) return 'an afternoon person, on this evidence';
    return 'an evening person, on this evidence';
}
function formatMinutes(seconds) {
    return `${Math.round(seconds / 60)} min avg`;
}
function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = String(s ?? '');
    return div.innerHTML;
}
