// sessions.js — per-Pomodoro session capture, scoring, and sync.
//
// Every focus block produces one record with: timing, distraction
// telemetry (Page Visibility + tab focus), the snapshot of which
// ambient sounds were active at start, task counts, and a derived
// 0..100 focus-quality score. Records persist to localStorage first
// and mirror to Supabase when authenticated. The mirror is best-effort
// — offline still works, the local cache is the source of truth for
// the analytics layer.
//
// We deliberately store raw signals (timing + distraction count + sound
// IDs + completion bool) rather than only the derived score so the
// scoring formula can evolve later without losing fidelity on past
// data. Same reason the column shape on Postgres mirrors the local one.
//
// Lifecycle:
//   beginSession({ kind, targetDurationSeconds })
//     ↓ (Page Visibility events accumulate distraction telemetry)
//   endSession({ elapsedSeconds, completed, taskCount, tasksCompleted })
//     ↓ (computes focusQuality, persists locally, mirrors to cloud)
//
// Only `kind: 'focus'` is captured today. Break sessions could be added
// later without a schema change — the column already exists.

import { activeSounds } from '../core/state.js';
import * as auth from './auth.js';

const STORAGE_KEY = 'fu_sessions_v1';
// localStorage cap so the cache can't grow unboundedly. ~5000 sessions
// is on the order of 5+ years of heavy daily use; comfortably within
// the 5 MB localStorage budget at ~200 bytes/session.
const MAX_LOCAL_SESSIONS = 5000;

let currentSession = null;
let cachedSessions = loadFromStorage();
const subscribers = new Set();

// ───────────────────────────────────────────────────────────────────────
// Lifecycle
// ───────────────────────────────────────────────────────────────────────

/** Open a session record. Captures start time and the snapshot of
 *  ambient state the session began under. Idempotent against a stuck
 *  prior session — calling begin again will discard the previous one. */
export function beginSession({ kind = 'focus', targetDurationSeconds }) {
    if (typeof targetDurationSeconds !== 'number' || targetDurationSeconds <= 0) return;
    if (currentSession) {
        // Defensive: if a previous session was never ended (e.g., the
        // user closed the tab mid-Pomodoro), drop it. We can't infer
        // its end time honestly so it's better to lose a single entry
        // than fabricate one.
        currentSession = null;
    }
    currentSession = {
        kind,
        startedAt: Date.now(),
        targetDurationSeconds,
        distractionCount: 0,
        distractionSeconds: 0,
        activeSounds: Array.from(new Set(activeSounds.value || [])),
    };
    visibilityHiddenAt = null;
}

/** Close the current session. Computes durationSeconds from the elapsed
 *  argument when given (timer.js knows the *intended* elapsed time,
 *  which is more accurate than wall-clock when the user paused) and
 *  falls back to wall-clock otherwise. Returns the persisted record. */
export function endSession({
    elapsedSeconds = null,
    completed = false,
    taskCount = 0,
    tasksCompleted = 0,
} = {}) {
    if (!currentSession) return null;
    // Fold any in-progress hidden window into the totals before sealing
    // the record. The visibilitychange listener won't fire in time if
    // the user ends the session while still on another tab.
    if (visibilityHiddenAt != null) {
        const away = Math.max(0, Date.now() - visibilityHiddenAt);
        currentSession.distractionSeconds += Math.round(away / 1000);
        visibilityHiddenAt = null;
    }
    const endedAt = Date.now();
    const wallClockSeconds = Math.max(0, Math.round((endedAt - currentSession.startedAt) / 1000));
    const duration = Number.isFinite(elapsedSeconds) && elapsedSeconds >= 0
        ? Math.round(elapsedSeconds)
        : wallClockSeconds;
    const record = {
        ...currentSession,
        // Local-only id; replaced with the Postgres uuid once the cloud
        // mirror succeeds. Lets the UI key items reliably either way.
        id: `local-${currentSession.startedAt.toString(36)}`,
        endedAt,
        durationSeconds: duration,
        completed: !!completed,
        taskCount: Math.max(0, taskCount | 0),
        tasksCompleted: Math.max(0, tasksCompleted | 0),
        focusQuality: focusQualityScore({
            duration,
            target: currentSession.targetDurationSeconds,
            distractionCount: currentSession.distractionCount,
            distractionSeconds: currentSession.distractionSeconds,
            tasksCompleted,
            completed: !!completed,
        }),
    };
    currentSession = null;
    cachedSessions = [...cachedSessions, record];
    persistLocal();
    notify();
    // Cloud mirror — fire-and-forget. If it succeeds, swap the
    // local-temp id for the server-issued uuid so the row reconciles
    // cleanly when the cache is re-hydrated from cloud later.
    if (auth.getUser()) {
        auth.recordSessionRemote(record).then((remoteId) => {
            if (!remoteId) return;
            const idx = cachedSessions.findIndex((s) => s.id === record.id);
            if (idx >= 0) {
                cachedSessions[idx] = { ...cachedSessions[idx], id: remoteId };
                persistLocal();
            }
        });
    }
    return record;
}

/** Discard the in-progress session without recording it. Used by the
 *  reset path and by sign-out / page-hide cleanups. */
export function abandonCurrentSession() {
    currentSession = null;
    visibilityHiddenAt = null;
}

// ───────────────────────────────────────────────────────────────────────
// Distraction telemetry — Page Visibility API
// ───────────────────────────────────────────────────────────────────────

let visibilityHiddenAt = null;

document.addEventListener('visibilitychange', () => {
    // Only count tab-aways during an active focus session. Breaks
    // aren't tracked, and an idle tab between sessions isn't either.
    if (!currentSession || currentSession.kind !== 'focus') return;
    if (document.hidden) {
        visibilityHiddenAt = Date.now();
        currentSession.distractionCount += 1;
    } else if (visibilityHiddenAt != null) {
        const away = Math.max(0, Date.now() - visibilityHiddenAt);
        currentSession.distractionSeconds += Math.round(away / 1000);
        visibilityHiddenAt = null;
    }
});

// Sealing on page hide is best-effort — when the tab is closed the
// page may not survive long enough to do an HTTP write, but we *can*
// flush localStorage synchronously. We treat the close as an abandon
// (incomplete) rather than fabricating an end time.
window.addEventListener('pagehide', () => {
    if (!currentSession) return;
    // Don't synthesize an end time the user didn't actually choose.
    // Just drop the record. Future improvement: sendBeacon to cloud.
    abandonCurrentSession();
});

// ───────────────────────────────────────────────────────────────────────
// Scoring
// ───────────────────────────────────────────────────────────────────────

/** Composite 0..100 focus-quality score.
 *
 * Weighted from raw signals so the formula can evolve without
 * re-recording past sessions:
 *   • duration ratio (0..50) — how much of the planned window
 *     actually got worked through
 *   • completion bonus    (+15) — full target reached
 *   • task-finish bonus   (+15) — at least one task ticked off
 *   • distraction penalty (up to −35) — count + total time away,
 *     scaled to the session length so a 2-min away on a 25-min focus
 *     block is treated proportionally
 *
 * The clamp at the end keeps the output strictly inside 0..100 even
 * if the weights shift in future tuning. */
export function focusQualityScore({
    duration,
    target,
    distractionCount = 0,
    distractionSeconds = 0,
    tasksCompleted = 0,
    completed = false,
}) {
    if (!duration || !target) return 0;
    let score = 0;
    score += Math.min(50, (duration / target) * 50);
    if (completed) score += 15;
    if (tasksCompleted > 0) score += Math.min(15, tasksCompleted * 8);
    const distractionRatio = Math.min(1, distractionSeconds / Math.max(1, target));
    const distractionPenalty = Math.min(35, distractionCount * 3 + distractionRatio * 50);
    score -= distractionPenalty;
    return Math.max(0, Math.min(100, Math.round(score)));
}

// ───────────────────────────────────────────────────────────────────────
// Read API for analytics + cinematic
// ───────────────────────────────────────────────────────────────────────

export function getAllSessions() {
    return cachedSessions.slice();
}

export function getRecentSessions(days = 7) {
    const cutoff = Date.now() - days * 86400_000;
    return cachedSessions.filter((s) => s.startedAt >= cutoff);
}

export function getLastSession() {
    return cachedSessions.length ? cachedSessions[cachedSessions.length - 1] : null;
}

/** Subscribe to changes (sessions added / hydrated). The callback fires
 *  with no arguments — readers should call getAllSessions() to pull
 *  fresh data. */
export function onSessionsChange(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
}

function notify() {
    for (const fn of subscribers) {
        try { fn(); } catch (e) { console.error('[sessions] subscriber threw:', e); }
    }
}

// ───────────────────────────────────────────────────────────────────────
// Cloud hydration
// ───────────────────────────────────────────────────────────────────────
//
// On sign-in we pull the cloud history and reconcile with the local
// cache. Strategy: cloud rows replace local rows with the same
// started_at (cloud is canonical); local-only rows (offline writes
// that never made it up) are kept in place — they'll sync as new
// rows on their next mirror attempt. For v1 we don't try to deduplicate
// across devices beyond started_at — good enough until concurrent
// editing becomes a real concern.

auth.onChange(({ user }) => {
    if (!user) return;
    hydrateFromCloud().catch(() => {
        // Non-fatal — local cache is still authoritative.
    });
});

async function hydrateFromCloud() {
    const remote = await auth.fetchRecentSessionsRemote({ limit: 1000 });
    if (!remote || remote.length === 0) return;
    // Index local by started_at (millis) for replacement.
    const localByStart = new Map(cachedSessions.map((s) => [s.startedAt, s]));
    for (const row of remote) {
        const startedAt = new Date(row.started_at).getTime();
        const endedAt = new Date(row.ended_at).getTime();
        const normalised = {
            id: row.id,
            kind: row.kind,
            startedAt,
            endedAt,
            durationSeconds: row.duration_seconds,
            targetDurationSeconds: row.target_duration_seconds,
            completed: row.completed,
            distractionCount: row.distraction_count,
            distractionSeconds: row.distraction_seconds,
            focusQuality: row.focus_quality,
            activeSounds: row.active_sounds || [],
            taskCount: row.task_count,
            tasksCompleted: row.tasks_completed,
        };
        localByStart.set(startedAt, normalised);
    }
    cachedSessions = Array.from(localByStart.values()).sort(
        (a, b) => a.startedAt - b.startedAt
    );
    persistLocal();
    notify();
}

// ───────────────────────────────────────────────────────────────────────
// Local persistence
// ───────────────────────────────────────────────────────────────────────

function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) return [];
        return data;
    } catch (_) {
        return [];
    }
}

function persistLocal() {
    if (cachedSessions.length > MAX_LOCAL_SESSIONS) {
        // Drop the oldest tail. The analytics layer doesn't need >5000
        // rows in memory, and the cloud mirror is the long-term archive.
        cachedSessions = cachedSessions.slice(-MAX_LOCAL_SESSIONS);
    }
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedSessions));
    } catch (e) {
        // Quota exceeded — drop the oldest 20% and try once more.
        cachedSessions = cachedSessions.slice(Math.floor(cachedSessions.length * 0.2));
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedSessions));
        } catch (_) {
            // Storage truly full or denied. Surface as a warn so the
            // user can decide what to clear; we don't crash.
            console.warn('[sessions] localStorage write rejected; data not persisted:', e?.message || e);
        }
    }
}
