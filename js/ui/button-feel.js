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

import { springAnim, anim, prefersReducedMotion } from '../core/motion.js';

const PRESSED_TRANSFORM = 'scale(0.94)';
const RELEASED_TRANSFORM = 'scale(1)';

// Track buttons currently in pressed state so we can release on pointercancel
const pressed = new WeakSet();

export function initButtonFeel() {
    if (prefersReducedMotion) return;

    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('pointerup', onPointerUp, { passive: true });
    document.addEventListener('pointercancel', onPointerUp, { passive: true });
    // Release on leave so a button doesn't stay pressed if pointer drags away
    document.addEventListener('pointerleave', onPointerUp, { passive: true, capture: true });
}

function onPointerDown(e) {
    const btn = e.target.closest('.liquid-glass-btn, .sound-card');
    if (!btn || btn.disabled) return;
    if (pressed.has(btn)) return;
    pressed.add(btn);

    springAnim(btn, {
        transform: [getCurrentTransform(btn), PRESSED_TRANSFORM],
    }, 'snappy', { duration: 0.18 });
}

function onPointerUp(e) {
    // For pointerleave we get the element being left; for up/cancel we use target
    const btn = (e.target && e.target.closest) ? e.target.closest('.liquid-glass-btn, .sound-card') : null;
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
    springAnim(btn, {
        transform: [PRESSED_TRANSFORM, RELEASED_TRANSFORM],
    }, 'standard', { duration: 0.32 });
}

function getCurrentTransform(el) {
    const t = getComputedStyle(el).transform;
    return t && t !== 'none' ? t : RELEASED_TRANSFORM;
}
