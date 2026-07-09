/*
 * Premium micro-motion for the shell — magnetic pointer-follow and staggered
 * reveal. Both no-op under prefers-reduced-motion.
 */
import { isReducedMotion } from '../core/motion.js';

/** Magnetic pointer-follow: the element eases toward the cursor within its box. */
export function magnetic(el, strength = 0.3) {
    if (isReducedMotion()) return () => {};
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;

    const tick = () => {
        raf = 0;
        cx += (tx - cx) * 0.18;
        cy += (ty - cy) * 0.18;
        el.style.transform = `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px)`;
        if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) schedule();
    };
    const schedule = () => {
        if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e) => {
        const r = el.getBoundingClientRect();
        tx = (e.clientX - r.left - r.width / 2) * strength;
        ty = (e.clientY - r.top - r.height / 2) * strength;
        schedule();
    };
    const onLeave = () => {
        tx = 0;
        ty = 0;
        schedule();
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerleave', onLeave);
        cancelAnimationFrame(raf);
    };
}

/** Restart the staggered reveal on a container (or its first .cf-reveal child). */
export function replayReveal(scope) {
    const r = scope?.classList?.contains('cf-reveal')
        ? scope
        : scope?.querySelector?.('.cf-reveal');
    if (!r) return;
    r.classList.remove('is-revealed');
    void r.offsetWidth; // force reflow so the transition restarts
    r.classList.add('is-revealed');
}
