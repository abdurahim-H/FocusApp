// motion.js
//
// Phase 2 foundation: thin wrapper around Motion One (https://motion.dev/).
// All animation in the app should go through here so we have one place to:
//   - swap the underlying lib
//   - respect prefers-reduced-motion
//   - tune default spring physics consistently
//
// Loaded from esm.sh as a single static import so we never duplicate the module.

import { animate, spring, stagger, inView } from 'https://esm.sh/motion@10.18.0';

// ============================================================================
// Reduced motion detection
// ============================================================================
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
export let prefersReducedMotion = reducedMotionQuery.matches;
reducedMotionQuery.addEventListener('change', (e) => {
    prefersReducedMotion = e.matches;
});

// ============================================================================
// Default spring presets — tuned to feel like Apple's UI
// ============================================================================
export const SPRING = {
    // Snappy, used for button presses + small UI feedback
    snappy:   { stiffness: 600, damping: 28, mass: 0.6 },
    // Default for most UI motion (tasks entering, mode transitions)
    standard: { stiffness: 380, damping: 30, mass: 0.9 },
    // Slow, expressive — for big hero moments (modal open, achievement)
    expressive: { stiffness: 220, damping: 26, mass: 1.1 },
};

// ============================================================================
// Public API — wraps Motion's animate() with reduced-motion handling
// ============================================================================

/**
 * Animate one or more elements. Falls through to Motion One's animate().
 * If reduced motion is preferred, applies the end state instantly.
 */
export function anim(target, keyframes, options = {}) {
    if (prefersReducedMotion) {
        // Apply final keyframe instantly so the visual end state is correct
        const els = normalizeTargets(target);
        const finalFrame = extractFinalFrame(keyframes);
        els.forEach(el => Object.assign(el.style, finalFrame));
        return { finished: Promise.resolve(), cancel: () => {}, stop: () => {} };
    }
    return animate(target, keyframes, options);
}

/**
 * Convenience: spring-animate with one of the SPRING presets by name.
 */
export function springAnim(target, keyframes, presetName = 'standard', overrides = {}) {
    const preset = SPRING[presetName] || SPRING.standard;
    return anim(target, keyframes, {
        easing: spring(preset),
        ...overrides,
    });
}

// Re-export raw Motion primitives for advanced use
export { animate, spring, stagger, inView };

// ============================================================================
// Helpers
// ============================================================================
function normalizeTargets(target) {
    if (typeof target === 'string') return Array.from(document.querySelectorAll(target));
    if (target instanceof Element) return [target];
    if (target instanceof NodeList || Array.isArray(target)) return Array.from(target);
    return [];
}

function extractFinalFrame(keyframes) {
    // Motion accepts either { x: [0, 100] } (arrays) or { x: 100 } (final values)
    const out = {};
    for (const [key, value] of Object.entries(keyframes)) {
        out[key] = Array.isArray(value) ? value[value.length - 1] : value;
    }
    return out;
}
