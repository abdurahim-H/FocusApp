// timer-particles.js
//
// Phase 5 experiment: gold particle burst on each timer tick.
// Tiny sparks drift outward from the digits and fade.
//
// Easy revert: remove this file + the one `emitTimerParticles()` call in timer.js
// + the module entry in app.js.

import { isReducedMotion } from '../core/motion.js';

const PARTICLE_COUNT = 8;
const PARTICLE_LIFETIME = 800;
const PARTICLE_SIZE_MIN = 1.5;
const PARTICLE_SIZE_MAX = 3;
const PARTICLE_SPEED = 35;
const GRAVITY = 18;

let canvas = null;
let ctx = null;
let particles = [];
let animating = false;
let lastTime = 0;

function ensureCanvas() {
    const timerEl = document.getElementById('timerDisplay');
    if (!timerEl) return false;

    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.style.cssText = `
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            pointer-events: none;
            z-index: 22;
        `;
        const parent = timerEl.closest('.focus-content');
        if (!parent) return false;
        parent.style.position = 'relative';
        parent.appendChild(canvas);
    }

    // Resize every time — handles mode switching from display:none → block
    const parent = canvas.parentElement;
    if (!parent) return false;
    const rect = parent.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(rect.width * dpr) ||
        canvas.height !== Math.round(rect.height * dpr)) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    if (!ctx) {
        ctx = canvas.getContext('2d');
        const dpr2 = window.devicePixelRatio || 1;
        ctx.setTransform(dpr2, 0, 0, dpr2, 0, 0);
    }

    return true;
}

function spawnParticles() {
    const timerEl = document.getElementById('timerDisplay');
    if (!timerEl || !canvas) return;

    const timerRect = timerEl.getBoundingClientRect();
    const parentRect = canvas.parentElement.getBoundingClientRect();

    const cx = timerRect.left - parentRect.left + timerRect.width / 2;
    const cy = timerRect.top - parentRect.top + timerRect.height / 2;
    const spreadX = timerRect.width * 0.35;
    const spreadY = timerRect.height * 0.2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = PARTICLE_SPEED * (0.5 + Math.random() * 0.8);

        particles.push({
            x: cx + (Math.random() - 0.5) * spreadX,
            y: cy + (Math.random() - 0.5) * spreadY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 12,
            size: PARTICLE_SIZE_MIN + Math.random() * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN),
            life: PARTICLE_LIFETIME,
            maxLife: PARTICLE_LIFETIME,
            hue: 38 + (Math.random() - 0.5) * 12,
            sat: 70 + Math.random() * 20,
            lit: 60 + Math.random() * 20,
        });
    }

    if (!animating) {
        animating = true;
        lastTime = 0;
        requestAnimationFrame(tick);
    }
}

function tick(time) {
    if (!ctx || particles.length === 0) {
        animating = false;
        if (ctx) {
            const w = canvas.width / (window.devicePixelRatio || 1);
            const h = canvas.height / (window.devicePixelRatio || 1);
            ctx.clearRect(0, 0, w, h);
        }
        return;
    }

    const dt = lastTime ? (time - lastTime) / 1000 : 0.016;
    lastTime = time;

    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt * 1000;

        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }

        p.vy += GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const progress = 1 - p.life / p.maxLife;
        const alpha = progress < 0.15
            ? progress / 0.15
            : 1 - (progress - 0.15) / 0.85;

        ctx.save();
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = `hsl(${p.hue}, ${p.sat}%, ${p.lit}%)`;
        ctx.shadowColor = `hsla(${p.hue}, ${p.sat}%, ${p.lit}%, 0.5)`;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    if (particles.length > 0) {
        requestAnimationFrame(tick);
    } else {
        animating = false;
        ctx.clearRect(0, 0, w, h);
    }
}

// ============================================================================
// Public API
// ============================================================================

export function initTimerParticles() {
    // Nothing to do eagerly — canvas is lazy-created on first emit
}

export function emitTimerParticles() {
    if (isReducedMotion()) return;
    if (!ensureCanvas()) return;
    spawnParticles();
}
