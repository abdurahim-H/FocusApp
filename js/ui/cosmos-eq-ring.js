// cosmos-eq-ring.js — the floating EQ control ring that anchors on a
// selected celestial body.
//
// Visually: three concentric thin rings around the body — Bass / Mid /
// Treble. Each ring has a draggable notch the user grabs to set ±12 dB
// for that band. Beneath the rings sits a single mute toggle. The whole
// overlay tracks the body's projected screen position every frame so it
// stays glued to the body even as it drifts on its orbit.
//
// Implementation note: SVG (not Canvas) because the rings need to be
// crisp at any scale and the notches need pointer events, both of which
// SVG handles natively. The SVG is fixed-position over the canvas, sized
// 320x320 around the anchored centre.

import { ambientTracks, effect } from '../core/state.js';
import { getTrackState, setSoundEQ, setSoundMuted } from '../features/sounds.js';
import { getBody, projectBody } from '../graphics/blackhole/sound-bodies.js';
import { clearSelection, getSelectedBodyId } from './cosmos-pointer.js';

let initialised = false;
let host = null; // root <div> floating over the canvas
let svg = null; // <svg> child
let ringsByBand = null; // band id → { notch, label, valueText, ring }
let muteBtn = null;
let muteIcon = null;
let muteLabel = null;
let currentBodyId = null;
let rafTrack = 0; // RAF id for tracking the body's screen position

const SIZE = 320; // SVG viewBox + DOM pixel size
const RING_RADII = {
    low: 130,
    mid: 108,
    high: 86,
};
const BAND_RANGE = 12; // ±12 dB
const BAND_ORDER = ['low', 'mid', 'high'];

// Drag state for ring notches.
const drag = {
    active: false,
    pointerId: null,
    band: null,
    centerX: 0,
    centerY: 0,
};

// ═══════════════════════════════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════════════════════════════

export function initCosmosEqRing() {
    if (initialised) return;
    initialised = true;

    buildOverlay();
    document.addEventListener('cosmos-selection', (e) => {
        const id = e.detail?.id || null;
        attachToBody(id);
    });

    // Re-render notch positions whenever the per-track state changes —
    // covers external tweaks (mix activation, settings UI, keyboard).
    effect(() => {
        if (!currentBodyId) {
            // Touch the signal so the effect re-fires when we re-attach
            // later — no-op otherwise.
            ambientTracks.value;
            return;
        }
        const st = ambientTracks.value[currentBodyId];
        if (!st) return;
        for (const band of BAND_ORDER) renderNotch(band, st.eq?.[band] ?? 0);
        renderMute(!!st.muted);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// Overlay scaffold
// ═══════════════════════════════════════════════════════════════════════════

function buildOverlay() {
    host = document.createElement('div');
    host.className = 'cosmos-eq-ring hidden';
    host.id = 'cosmosEqRing';
    host.style.cssText = `
        position: fixed;
        width: ${SIZE}px;
        height: ${SIZE}px;
        pointer-events: none;
        z-index: 1400;
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.92);
        transition: opacity 0.32s cubic-bezier(0.34, 1.56, 0.64, 1),
                    transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
    `;

    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
    svg.setAttribute('width', SIZE);
    svg.setAttribute('height', SIZE);
    svg.style.cssText = 'overflow: visible; position: absolute; inset: 0; pointer-events: none;';

    ringsByBand = {};
    for (const band of BAND_ORDER) {
        ringsByBand[band] = buildBandRing(band, RING_RADII[band]);
    }

    // Mute button — a small circle below the rings, tied into the same
    // visual language. Always pointer-events:auto.
    const muteG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    muteG.setAttribute('transform', `translate(${SIZE / 2}, ${SIZE / 2 + RING_RADII.low + 30})`);
    muteG.style.cssText = 'pointer-events: auto; cursor: pointer;';

    muteBtn = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    muteBtn.setAttribute('r', '20');
    muteBtn.setAttribute('cx', '0');
    muteBtn.setAttribute('cy', '0');
    muteBtn.setAttribute('fill', 'rgba(0, 0, 0, 0.6)');
    muteBtn.setAttribute('stroke', 'rgba(255, 215, 130, 0.5)');
    muteBtn.setAttribute('stroke-width', '1');
    muteG.appendChild(muteBtn);

    muteIcon = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    muteIcon.setAttribute('fill', 'rgba(255, 230, 180, 0.9)');
    muteIcon.setAttribute('transform', 'translate(-7, -7)');
    muteG.appendChild(muteIcon);

    muteLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    muteLabel.setAttribute('x', '0');
    muteLabel.setAttribute('y', '38');
    muteLabel.setAttribute('text-anchor', 'middle');
    muteLabel.setAttribute('fill', 'rgba(255, 230, 188, 0.55)');
    muteLabel.setAttribute('font-size', '9');
    muteLabel.setAttribute('font-family', 'system-ui, sans-serif');
    muteLabel.setAttribute('letter-spacing', '0.18em');
    muteLabel.textContent = 'MUTE';
    muteG.appendChild(muteLabel);

    muteG.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!currentBodyId) return;
        const st = getTrackState(currentBodyId);
        setSoundMuted(currentBodyId, !st.muted);
    });

    svg.appendChild(muteG);
    host.appendChild(svg);
    document.body.appendChild(host);
}

function buildBandRing(band, radius) {
    const cx = SIZE / 2;
    const cy = SIZE / 2;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${cx}, ${cy})`);

    // Background ring — full circle, low opacity. Doubles as a hit
    // target for the notch drag — clicking anywhere on the ring snaps
    // the notch to that angle.
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('r', String(radius));
    ring.setAttribute('cx', '0');
    ring.setAttribute('cy', '0');
    ring.setAttribute('fill', 'none');
    ring.setAttribute('stroke', 'rgba(255, 215, 130, 0.18)');
    ring.setAttribute('stroke-width', '1.2');
    ring.style.pointerEvents = 'auto';
    ring.style.cursor = 'pointer';
    g.appendChild(ring);

    // Notch — a small filled circle that the user drags around the ring.
    const notch = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    notch.setAttribute('r', '7');
    notch.setAttribute('fill', 'rgba(255, 230, 165, 1)');
    notch.setAttribute('stroke', 'rgba(0, 0, 0, 0.45)');
    notch.setAttribute('stroke-width', '1.5');
    notch.style.pointerEvents = 'auto';
    notch.style.cursor = 'grab';
    notch.style.filter = 'drop-shadow(0 0 8px rgba(255, 215, 130, 0.7))';
    g.appendChild(notch);

    // Band label — above the ring, far from the body so it doesn't
    // crowd the visualisation.
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', '0');
    label.setAttribute('y', String(-radius - 8));
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', 'rgba(255, 230, 188, 0.75)');
    label.setAttribute('font-size', '9');
    label.setAttribute('font-family', 'system-ui, sans-serif');
    label.setAttribute('letter-spacing', '0.22em');
    label.textContent = band === 'low' ? 'BASS' : band === 'mid' ? 'MID' : 'TREBLE';
    g.appendChild(label);

    // Value readout — below the label, tabular-nums for stability.
    const valueText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    valueText.setAttribute('x', '0');
    valueText.setAttribute('y', String(-radius + 4));
    valueText.setAttribute('text-anchor', 'middle');
    valueText.setAttribute('fill', 'rgba(255, 240, 205, 0.95)');
    valueText.setAttribute('font-size', '11');
    valueText.setAttribute('font-family', 'system-ui, sans-serif');
    valueText.setAttribute('font-variant-numeric', 'tabular-nums');
    valueText.textContent = '0';
    g.appendChild(valueText);

    // Drag wiring on the notch + ring. Clicking the ring jumps the notch
    // to that point; dragging on either continues the drag.
    const onDown = (e) => {
        e.stopPropagation();
        const rect = host.getBoundingClientRect();
        drag.active = true;
        drag.pointerId = e.pointerId;
        drag.band = band;
        drag.centerX = rect.left + cx;
        drag.centerY = rect.top + cy;
        notch.style.cursor = 'grabbing';
        try {
            e.target.setPointerCapture(e.pointerId);
        } catch (_) {}
        applyDragPoint(e.clientX, e.clientY);
    };
    notch.addEventListener('pointerdown', onDown);
    ring.addEventListener('pointerdown', onDown);

    svg.appendChild(g);
    return { notch, label, valueText, ring };
}

// ═══════════════════════════════════════════════════════════════════════════
// Drag handling — convert pointer angle around centre into a band value
// in the range [-12 dB, +12 dB].
// ═══════════════════════════════════════════════════════════════════════════

window.addEventListener('pointermove', (e) => {
    if (!drag.active || e.pointerId !== drag.pointerId) return;
    applyDragPoint(e.clientX, e.clientY);
});
window.addEventListener('pointerup', (e) => {
    if (!drag.active || e.pointerId !== drag.pointerId) return;
    drag.active = false;
    drag.pointerId = null;
    drag.band = null;
    if (ringsByBand) for (const band of BAND_ORDER) ringsByBand[band].notch.style.cursor = 'grab';
});
window.addEventListener('pointercancel', (e) => {
    if (!drag.active || e.pointerId !== drag.pointerId) return;
    drag.active = false;
});

function applyDragPoint(clientX, clientY) {
    if (!drag.band || !currentBodyId) return;
    const ang = Math.atan2(clientY - drag.centerY, clientX - drag.centerX);
    // Map angle → value: 12 o'clock (-π/2) is 0 dB, sweep clockwise toward
    // +12 dB at 6 o'clock, counter-clockwise toward -12 dB. Wrap angle to
    // (-π, π], then normalise to (-1..1) where 0 = 12 o'clock.
    let normalised = (ang + Math.PI / 2) / Math.PI; // -0.5 (left) … 0.5 (right) … 1.5 (down-left)
    // Bring counter-clockwise > 0.5 into the negative half so the dial
    // reads correctly at all four quadrants.
    if (normalised > 1) normalised -= 2;
    const v = Math.max(-1, Math.min(1, normalised)) * BAND_RANGE;
    const rounded = Math.round(v);
    setSoundEQ(currentBodyId, drag.band, rounded);
    renderNotch(drag.band, rounded);
}

// ═══════════════════════════════════════════════════════════════════════════
// Per-frame attach — keep the overlay glued to the body's screen position
// ═══════════════════════════════════════════════════════════════════════════

function attachToBody(id) {
    currentBodyId = id;
    if (rafTrack) cancelAnimationFrame(rafTrack);
    if (!id) {
        host.classList.add('hidden');
        host.style.opacity = '0';
        host.style.transform = 'translate(-50%, -50%) scale(0.92)';
        return;
    }
    const body = getBody(id);
    if (!body) return;
    host.classList.remove('hidden');
    host.style.opacity = '1';
    host.style.transform = 'translate(-50%, -50%) scale(1)';

    // Initial state pull — render notches before the first track frame.
    const st = getTrackState(id);
    for (const band of BAND_ORDER) renderNotch(band, st.eq?.[band] ?? 0);
    renderMute(!!st.muted);

    const tick = () => {
        if (currentBodyId !== id) return;
        const p = projectBody(id);
        if (p) {
            host.style.left = `${p.x}px`;
            host.style.top = `${p.y}px`;
        }
        rafTrack = requestAnimationFrame(tick);
    };
    rafTrack = requestAnimationFrame(tick);
}

// ═══════════════════════════════════════════════════════════════════════════
// Render helpers
// ═══════════════════════════════════════════════════════════════════════════

function renderNotch(band, valueDb) {
    const ring = ringsByBand?.[band];
    if (!ring) return;
    const radius = RING_RADII[band];
    // Map valueDb (-12..+12) → angle around the ring with 12 o'clock = 0 dB,
    // 3 o'clock = +12 dB, 9 o'clock = -12 dB (a half-circle dial).
    const t = valueDb / BAND_RANGE; // -1..1
    const ang = -Math.PI / 2 + t * Math.PI;
    const x = Math.cos(ang) * radius;
    const y = Math.sin(ang) * radius;
    ring.notch.setAttribute('cx', x.toFixed(2));
    ring.notch.setAttribute('cy', y.toFixed(2));
    ring.valueText.textContent = valueDb > 0 ? `+${valueDb}` : String(valueDb);
}

function renderMute(muted) {
    if (!muteBtn || !muteIcon) return;
    muteBtn.setAttribute('fill', muted ? 'rgba(255, 80, 80, 0.22)' : 'rgba(0, 0, 0, 0.6)');
    muteBtn.setAttribute('stroke', muted ? 'rgba(255, 120, 120, 0.7)' : 'rgba(255, 215, 130, 0.5)');
    // Path: speaker glyph with a slash when muted.
    muteIcon.setAttribute(
        'd',
        muted
            ? 'M3 5h2l3-2v8L5 9H3V5zm10 1l1.5-1.5L13 3l-1.5 1.5L10 3 8.5 4.5 10 6 8.5 7.5 10 9l1.5-1.5L13 9l1.5-1.5L13 6z'
            : 'M3 5h2l3-2v8L5 9H3V5zm6 0a3 3 0 010 4M11.5 4a4.5 4.5 0 010 6'
    );
    muteIcon.setAttribute('fill', muted ? 'none' : 'rgba(255, 230, 180, 0.9)');
    muteIcon.setAttribute('stroke', 'rgba(255, 230, 180, 0.9)');
    muteIcon.setAttribute('stroke-width', '1.4');
    muteIcon.setAttribute('stroke-linecap', 'round');
    muteIcon.setAttribute('stroke-linejoin', 'round');
}
