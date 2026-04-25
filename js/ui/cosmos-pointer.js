// cosmos-pointer.js — pointer + keyboard layer for the cosmos sound system.
//
// What it does:
//   • Listens to play/stop ambient events; spawns/dismisses celestial bodies.
//   • Owns pointer drag state on the Babylon canvas.
//       — drag a body  → adjust volume (vertical) + pan (horizontal)
//       — drag into the black hole → consume + remove
//       — click without drag → select body (opens EQ ring; see cosmos-eq-ring)
//       — click empty space → deselect
//   • Stays out of the way when the user is interacting with normal DOM —
//     pointer events that start on a UI element bubble through untouched.
//
// What it doesn't do (deferred to dedicated modules):
//   • Render the EQ control ring overlay (cosmos-eq-ring.js)
//   • Render the library drawer with cosmic previews (ambient-ui replacement)
//   • Save/load constellations (sound-mixer.js extension)

import { activeSounds, ambientTracks, effect } from '../core/state.js';
import {
    getActiveSounds,
    getMasterVolume,
    isSoundActive,
    onAmbientEvent,
    setMasterVolume,
    setSoundPan,
    setSoundVolume,
    stopSound,
} from '../features/sounds.js';
import {
    dismissBody,
    dragBody,
    isInsideEventHorizon,
    listBodies,
    pickBody,
    setBodySelected,
    setBodyTheta,
    setBodyVolume,
    setDragging,
    summonBody,
} from '../graphics/blackhole/sound-bodies.js';
import { getScene } from '../graphics/scene/scene-manager.js';

let initialised = false;
let canvas = null;
let selectedId = null;
let onSelectionChangeCb = null;

// Drag state — one pointer at a time (mouse or single-touch). We track
// the screen-pixel anchor at pointerdown plus the body (or 'master' if
// the user grabbed the black hole) so later pointermove deltas can be
// applied even if the cursor strays off the target.
const drag = {
    active: false,
    pointerId: null,
    bodyId: null,
    target: null, // 'body' | 'master'
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    moved: false,
    masterStartVolume: 0,
};

const CLICK_PIXEL_TOLERANCE = 6; // <6px movement = click, not drag

// ═══════════════════════════════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════════════════════════════

export function initCosmosPointer({ onSelectionChange } = {}) {
    if (initialised) return;
    initialised = true;
    onSelectionChangeCb = typeof onSelectionChange === 'function' ? onSelectionChange : null;

    canvas = document.querySelector('canvas');
    if (!canvas) {
        // Babylon canvas not yet mounted — try once more on next frame.
        requestAnimationFrame(() => {
            initialised = false;
            initCosmosPointer({ onSelectionChange });
        });
        return;
    }

    // Body lifecycle wiring: spawn on play, dismiss on stop. The ambient
    // engine emits these events from sounds.js; we just listen. Fired
    // AFTER the audio fade starts so the visual entrance is timed with
    // the sound coming up.
    onAmbientEvent((evt, payload) => {
        if (evt === 'play') {
            const id = payload?.id;
            if (!id) return;
            summonBody(id);
        }
        if (evt === 'stop') {
            const id = payload?.id;
            if (!id) return;
            // If the user dragged this body into the black hole we already
            // started the consumption animation; otherwise do a gentle fade.
            const body = listBodies().find((b) => b.id === id);
            if (!body) return;
            const consume = isInsideEventHorizon(id);
            dismissBody(id, { consume });
            if (selectedId === id) setSelected(null);
        }
    });

    // Defensive sync — track the activeSounds signal so the effect
    // re-runs on any mutation, but only summon bodies for sounds that
    // are ACTUALLY playing right now (cross-check with the audio engine).
    // On a fresh reload, activeSounds may carry stale ids from
    // localStorage while the audio context is suspended — we don't want
    // to summon ghost bodies that have no FFT data behind them.
    effect(() => {
        // Touch the signal so future mutations re-fire the effect.
        activeSounds.value;
        const playingIds = getActiveSounds();
        for (const id of playingIds) {
            if (!listBodies().some((b) => b.id === id)) summonBody(id);
        }
        // Conversely, dispose of any body whose track is no longer active.
        for (const b of listBodies()) {
            if (!playingIds.includes(b.id)) dismissBody(b.id);
        }
    });

    // Pointer wiring on the Babylon canvas. We can't use pointer events on
    // window because they'd fire on top of every DOM widget. Canvas-only
    // means the timer / tasks / drawer all stay clickable.
    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
}

// ═══════════════════════════════════════════════════════════════════════════
// Pointer handlers
// ═══════════════════════════════════════════════════════════════════════════

function onPointerDown(e) {
    if (e.target !== canvas) return;
    const hit = pickBody(e.clientX, e.clientY);
    if (hit) {
        drag.active = true;
        drag.pointerId = e.pointerId;
        drag.bodyId = hit.id;
        drag.target = 'body';
        drag.startX = e.clientX;
        drag.startY = e.clientY;
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
        drag.moved = false;
        setDragging(hit.id, true);
        try {
            canvas.setPointerCapture(e.pointerId);
        } catch (_) {}
        e.preventDefault();
        return;
    }

    // No body hit. Check whether the user grabbed the black hole itself —
    // vertical drag on it adjusts the master volume. We do this with a
    // fresh scene.pick() that filters for the black-hole metadata so it
    // wins over any nearby body that didn't quite catch the pointer.
    if (pickBlackHole(e.clientX, e.clientY)) {
        drag.active = true;
        drag.pointerId = e.pointerId;
        drag.target = 'master';
        drag.bodyId = null;
        drag.startX = e.clientX;
        drag.startY = e.clientY;
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
        drag.moved = false;
        drag.masterStartVolume = getMasterVolume();
        try {
            canvas.setPointerCapture(e.pointerId);
        } catch (_) {}
        e.preventDefault();
        return;
    }

    // Empty-space click on the canvas → clear selection if any.
    if (selectedId) setSelected(null);
}

// Cheap re-pick filtered to the black hole. Reuses the same scene pick
// pipeline as pickBody but with a different mesh predicate.
function pickBlackHole(x, y) {
    const scene = getScene();
    if (!scene) return false;
    const pickInfo = scene.pick(x, y, (m) => m?.metadata?.isBlackHole);
    return !!pickInfo?.hit;
}

function onPointerMove(e) {
    if (!drag.active || e.pointerId !== drag.pointerId) return;
    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;

    const totalDX = e.clientX - drag.startX;
    const totalDY = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(totalDX, totalDY) > CLICK_PIXEL_TOLERANCE) {
        drag.moved = true;
        if (drag.target === 'body' && selectedId && selectedId !== drag.bodyId) {
            setSelected(null);
        }
    }

    if (!drag.moved) return;

    if (drag.target === 'body') {
        const out = dragBody(drag.bodyId, dx, dy, window.innerWidth, window.innerHeight);
        if (!out) return;
        setSoundVolume(drag.bodyId, out.volume);
        setSoundPan(drag.bodyId, out.pan);
        return;
    }

    if (drag.target === 'master') {
        // Master volume drag: vertical only. Up = louder, down = quieter.
        // Scale so a full-viewport drag covers the 0..1 range.
        const totalDeltaY = drag.startY - e.clientY;
        const delta = (totalDeltaY / Math.max(200, window.innerHeight)) * 1.4;
        const target = Math.max(0, Math.min(1, drag.masterStartVolume + delta));
        setMasterVolume(target, { fadeMs: 30 });
    }
}

function onPointerUp(e) {
    if (!drag.active || e.pointerId !== drag.pointerId) return;
    const id = drag.bodyId;
    const target = drag.target;
    const wasMoved = drag.moved;
    drag.active = false;
    drag.pointerId = null;
    drag.bodyId = null;
    drag.target = null;
    if (id) setDragging(id, false);
    try {
        canvas.releasePointerCapture?.(e.pointerId);
    } catch (_) {}

    if (target === 'body') {
        if (!wasMoved) {
            // Click without drag → toggle selection.
            if (selectedId === id) setSelected(null);
            else setSelected(id);
            return;
        }
        // Drag ended on a body — check whether the body landed inside
        // the event horizon. If so, consume + remove.
        if (isInsideEventHorizon(id) && isSoundActive(id)) {
            stopSound(id, { fadeMs: 700 });
        }
    }
    // Master drags don't need cleanup beyond clearing the drag state.
}

// ═══════════════════════════════════════════════════════════════════════════
// Selection
// ═══════════════════════════════════════════════════════════════════════════

function setSelected(id) {
    if (selectedId === id) return;
    if (selectedId) setBodySelected(selectedId, false);
    selectedId = id;
    if (id) setBodySelected(id, true);
    if (onSelectionChangeCb) onSelectionChangeCb(id);
}

export function getSelectedBodyId() {
    return selectedId;
}
export function clearSelection() {
    setSelected(null);
}
