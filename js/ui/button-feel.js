// button-feel.js
//
// Phase 2: coordinated press spring for every .liquid-glass-btn in the app.
// One delegated pointer listener — no per-button setup, no per-CSS file overrides.
//
// What it does:
//   pointerdown → quick spring to scale(0.94), slight downshift
//   pointerup / pointercancel → spring back to scale(1)
//
// Designed to coexist with the existing CSS :active rule (which kicks in for
// keyboard activation). The CSS rule sets a scale of 0.97; we override with JS
// for pointer events because JS gives us the spring physics.

import { anim, isReducedMotion, springAnim } from '../core/motion.js';

const PRESSED_TRANSFORM = 'scale(0.94)';
const RELEASED_TRANSFORM = 'scale(1)';

// Track buttons currently in pressed state so we can release on pointercancel
const pressed = new WeakSet();

export function initButtonFeel() {
    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('pointerup', onPointerUp, { passive: true });
    document.addEventListener('pointercancel', onPointerUp, { passive: true });
    // Release on leave so a button doesn't stay pressed if pointer drags away
    document.addEventListener('pointerleave', onPointerUp, { passive: true, capture: true });
    // Cursor-reactive specular highlight: --mx/--my drive a CSS ::after light
    // that tracks the pointer across the glass. rAF-throttled, motion-gated.
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    // Pointer-aware ambient glow that trails the cursor across the scene.
    if (!isReducedMotion()) {
        ambientEl = document.createElement('div');
        ambientEl.className = 'pointer-ambient';
        ambientEl.setAttribute('aria-hidden', 'true');
        document.body.appendChild(ambientEl);
    }
}

let cursorRaf = 0;
let lastCursorEvent = null;
let ambientEl = null;

function onPointerMove(e) {
    if (isReducedMotion()) return;
    lastCursorEvent = e;
    if (cursorRaf) return;
    cursorRaf = requestAnimationFrame(applyCursorLight);
}

function applyCursorLight() {
    cursorRaf = 0;
    const e = lastCursorEvent;
    if (!e) return;
    // Ambient glow follows the pointer everywhere (sits behind the UI).
    if (ambientEl) {
        ambientEl.style.setProperty('--px', `${e.clientX}px`);
        ambientEl.style.setProperty('--py', `${e.clientY}px`);
    }
    // Specular highlight only when over a glass button.
    const el = e.target?.closest ? e.target.closest('.liquid-glass-btn') : null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    el.style.setProperty('--mx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
}

function onPointerDown(e) {
    if (isReducedMotion()) return;
    const btn = e.target.closest('.liquid-glass-btn, .sound-card');
    if (!btn || btn.disabled) return;
    if (pressed.has(btn)) return;
    pressed.add(btn);

    springAnim(
        btn,
        {
            transform: [getCurrentTransform(btn), PRESSED_TRANSFORM],
        },
        'snappy',
        { duration: 0.18 }
    );
}

function onPointerUp(e) {
    // For pointerleave we get the element being left; for up/cancel we use target
    const btn =
        e.target && e.target.closest ? e.target.closest('.liquid-glass-btn, .sound-card') : null;
    if (!btn) {
        // Sweep any pressed buttons (handles pointerleave on parent)
        document.querySelectorAll('.liquid-glass-btn, .sound-card').forEach(release);
        return;
    }
    release(btn);
}

function release(btn) {
    if (!pressed.has(btn)) return;
    pressed.delete(btn);
    springAnim(
        btn,
        {
            transform: [PRESSED_TRANSFORM, RELEASED_TRANSFORM],
        },
        'standard',
        { duration: 0.32 }
    );
}

function getCurrentTransform(el) {
    const t = getComputedStyle(el).transform;
    return t && t !== 'none' ? t : RELEASED_TRANSFORM;
}
