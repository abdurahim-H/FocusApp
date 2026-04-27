// session-cinematic.js — the 5-second moment a focus block earns.
//
// When a focus session completes, the cosmos acknowledges. The camera
// pulls toward the event horizon over ~1.7s, holds at the close
// vantage for ~1.5s, eases back to the orbital perch over ~1.7s.
// Underneath that motion, a tight monospace line fades in at the
// hold ("32 min · 1 task · 4-day streak"), holds, fades out as the
// camera returns. Total: ~5 seconds.
//
// Why this and not a confetti / sound / streak counter: the cosmic
// metaphor IS the reward. Travelling toward the black hole encodes
// "depth of focus" without a single explanatory word. The text is
// the one non-visual element and it stays restrained — type only,
// no chrome, no card.
//
// Respects prefers-reduced-motion: skips the camera move entirely
// and shows the text overlay statically for ~3s.

import { isReducedMotion } from '../core/motion.js';
import { setCinematicCameraOffset } from '../graphics/scene/scene-manager.js';
import { currentStreak } from '../features/statistics.js';

let active = false;

// Camera-approach timing. Sums to ~5000ms.
const APPROACH_MS = 1700;
const HOLD_MS = 1500;
const RETURN_MS = 1800;
// Text fades in once the hold begins and out as the return starts.
const TEXT_FADE_IN_MS = 480;
const TEXT_FADE_OUT_MS = 600;
// How close to the event horizon we travel (radius offset; negative =
// closer). The breathing animation in scene-manager already applies
// ±10; we want to clearly travel further than that without falling in.
const APPROACH_RADIUS_OFFSET = -28;
const ALPHA_DRIFT_PEAK = 0.09;

/** Play the session-end cinematic for a freshly-sealed focus record.
 *  Idempotent — if one is already running, calling again is a no-op
 *  (we don't queue; the user only ever sees one at a time). */
export function playSessionCinematic(record) {
    if (!record || record.kind !== 'focus' || active) return;
    active = true;

    const reduced = isReducedMotion();
    const overlay = mountOverlay(record);
    // The dim class lets CSS fade the focus-tab timer + stats bar +
    // mini-timer down to ~18% opacity for the duration so the
    // cinematic doesn't compete for the centre of the screen.
    document.documentElement.classList.add('cinematic-active');

    if (reduced) {
        // No camera move — just hold the text on screen for a beat,
        // then fade. Total ~2.5s.
        requestAnimationFrame(() => overlay.classList.add('is-visible'));
        setTimeout(() => {
            overlay.classList.remove('is-visible');
            setTimeout(() => {
                overlay.remove();
                document.documentElement.classList.remove('cinematic-active');
                active = false;
            }, TEXT_FADE_OUT_MS);
        }, 2200);
        return;
    }

    runCameraMove();
    // Text rides on top of the camera animation. Fades in ~mid-approach,
    // fades out as the return begins.
    setTimeout(() => overlay.classList.add('is-visible'), APPROACH_MS - 200);
    setTimeout(() => overlay.classList.remove('is-visible'), APPROACH_MS + HOLD_MS);
    setTimeout(() => {
        overlay.remove();
        document.documentElement.classList.remove('cinematic-active');
        active = false;
    }, APPROACH_MS + HOLD_MS + RETURN_MS + TEXT_FADE_OUT_MS);
}

// ───────────────────────────────────────────────────────────────────────
// Camera animation
// ───────────────────────────────────────────────────────────────────────

function runCameraMove() {
    const startTime = performance.now();
    const total = APPROACH_MS + HOLD_MS + RETURN_MS;

    function tick() {
        const t = performance.now() - startTime;
        const phase = phaseAt(t);
        let radiusOffset = 0;
        if (phase.name === 'approach') {
            // Ease-out cubic going inward: starts fast, settles in.
            const eased = 1 - (1 - phase.p) ** 3;
            radiusOffset = APPROACH_RADIUS_OFFSET * eased;
        } else if (phase.name === 'hold') {
            radiusOffset = APPROACH_RADIUS_OFFSET;
        } else if (phase.name === 'return') {
            // Ease-in-out for the return so we settle smoothly into
            // the breathing camera again.
            const eased = phase.p < 0.5
                ? 2 * phase.p * phase.p
                : 1 - (-2 * phase.p + 2) ** 2 / 2;
            radiusOffset = APPROACH_RADIUS_OFFSET * (1 - eased);
        }
        // Subtle alpha drift across the whole arc — half a sine so the
        // camera leans into the approach and unwinds on return.
        const arcT = Math.min(1, t / total);
        const alphaBoost = Math.sin(arcT * Math.PI) * ALPHA_DRIFT_PEAK;
        setCinematicCameraOffset({ radiusOffset, alphaBoost });

        if (t < total) {
            requestAnimationFrame(tick);
        } else {
            setCinematicCameraOffset({ radiusOffset: 0, alphaBoost: 0 });
        }
    }
    requestAnimationFrame(tick);
}

function phaseAt(elapsedMs) {
    if (elapsedMs < APPROACH_MS) {
        return { name: 'approach', p: elapsedMs / APPROACH_MS };
    }
    if (elapsedMs < APPROACH_MS + HOLD_MS) {
        return { name: 'hold', p: (elapsedMs - APPROACH_MS) / HOLD_MS };
    }
    return {
        name: 'return',
        p: Math.min(1, (elapsedMs - APPROACH_MS - HOLD_MS) / RETURN_MS),
    };
}

// ───────────────────────────────────────────────────────────────────────
// Text overlay
// ───────────────────────────────────────────────────────────────────────

function mountOverlay(record) {
    const wrap = document.createElement('div');
    wrap.className = 'session-cinematic';
    wrap.setAttribute('aria-live', 'polite');
    wrap.setAttribute('role', 'status');
    wrap.style.setProperty('--cinematic-fade-in', `${TEXT_FADE_IN_MS}ms`);
    wrap.style.setProperty('--cinematic-fade-out', `${TEXT_FADE_OUT_MS}ms`);

    const minutes = Math.max(1, Math.round(record.durationSeconds / 60));
    const tasks = record.tasksCompleted | 0;
    const streak = currentStreak.value | 0;
    const quality = record.focusQuality | 0;

    const segments = [];
    segments.push(`<span class="session-cinematic__primary-num">${minutes}</span><span class="session-cinematic__primary-unit">min</span>`);

    const meta = [];
    if (tasks > 0) {
        meta.push(`${tasks} task${tasks === 1 ? '' : 's'} done`);
    }
    if (streak >= 2) {
        meta.push(`${streak}-day streak`);
    } else if (streak === 1) {
        meta.push('streak begins');
    }
    if (quality >= 80) {
        meta.push('deep focus');
    } else if (quality >= 60) {
        meta.push('clean run');
    }

    wrap.innerHTML = `
        <div class="session-cinematic__primary">${segments.join('')}</div>
        ${meta.length ? `<div class="session-cinematic__meta">${meta.join(' · ')}</div>` : ''}
    `;

    document.body.appendChild(wrap);
    return wrap;
}
