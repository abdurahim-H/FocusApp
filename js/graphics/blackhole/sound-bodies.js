// sound-bodies.js — celestial bodies that ARE the ambient sound mixer.
//
// Each active ambient track lives in the scene as a small luminous
// celestial body in a wide orbit around the black hole. Composition is
// direct manipulation:
//
//   • Drag a body up/down  → volume     (closer to the black hole = louder)
//   • Drag a body left/right → pan      (left/right of centre)
//   • Click a body          → opens an EQ control ring around it
//   • Drag a body into the event horizon → black hole consumes it (remove)
//
// Visual design philosophy: restraint. Each body is a tiny bright core
// with a soft radial halo, single tint per sound, gentle breathing on
// audio energy. No fbm, no per-band distortion, no streaks — the post
// pipeline's bloom does the visual heavy-lifting. Premium = quiet.
//
// Public surface:
//   initSoundBodies(scene, camera, blackholeMesh)
//   summonBody(id, opts)            — spawn a body for a track id
//   dismissBody(id, opts)           — remove (with optional consumption)
//   disposeAllBodies()              — force teardown, no animation
//   updateSoundBodies(elapsed)      — per-frame update (from render loop)
//   pickBody(pointerX, pointerY)    — hit-test at screen coords
//   listBodies() / getBody(id)
//   setDragging / setBodyVolume / setBodyTheta / setBodySelected
//   isInsideEventHorizon / projectBody / dragBody

import { ambientTracks } from '../../core/state.js';
import { getTrackEnergy } from '../../features/sounds.js';

const TAU = Math.PI * 2;
const FLOW_WRAP = 4 * 60 * 60;       // shader time wrap, see CLAUDE.md
const PHASE_WRAP = TAU * 1024;       // pre-computed orbital phase wrap

// ── Orbital geometry ─────────────────────────────────────────────────────
// Bodies sit OUTSIDE the visual extent of the black hole (~14 world units
// at the current camera distance) and the centred timer/clock UI. Volume
// pulls them inward but never close enough to overlap the disk. Quiet
// tracks drift out to the edge of the visible field.
const RADIUS_MIN = 18;               // max volume
const RADIUS_MAX = 32;                // silent
const EVENT_HORIZON_R = 14;           // drag inside this radius = consume
const ORBIT_TILT = 0.06;
const BODY_SCALE = 2.6;               // tuned so the bloom-extended halo
                                       // reads at ~80px on a 1440-wide viewport

// Gentle auto-orbital drift so the constellation feels alive but doesn't
// move fast enough to disorient while reading the timer.
const ORBIT_DRIFT = 0.014;

// ── Per-sound tint ───────────────────────────────────────────────────────
// Single colour per sound. The shader is unified — only the tint changes.
// Hue picks deliberately echo each sound's natural palette so the user can
// recognise them at a glance:
//   rain   → cool blue
//   forest → emerald green
//   ocean  → cyan
//   cafe   → amber/gold
const TINTS = {
    rain:   [0.62, 0.82, 1.00],
    forest: [0.45, 0.88, 0.55],
    ocean:  [0.40, 0.85, 1.00],
    cafe:   [1.00, 0.78, 0.42],
};
const DEFAULT_TINT = [0.95, 0.92, 0.78];

// Resting orbital lanes for the four known sounds. Diagonal corners so
// they don't crowd the centre. Unknown sounds get an offset slot.
const LANES = {
    rain:   Math.PI * 0.30,            // upper-right
    forest: Math.PI * 0.70,            // upper-left
    ocean:  Math.PI * 1.30,            // lower-left
    cafe:   Math.PI * 1.70,            // lower-right
};
const FALLBACK_LANE_ORDER = [
    Math.PI * 0.10, Math.PI * 0.50, Math.PI * 0.90,
    Math.PI * 1.10, Math.PI * 1.50, Math.PI * 1.90,
];

// ───────────────────────────────────────────────────────────────────────
// Shader — single clean radial glow. The body is a small bright disc
// with a soft outer halo; the post-pipeline bloom expands it into a
// luminous bloom. Audio modulation is intentionally subtle — overall
// brightness only — so the body reads as a CELESTIAL OBJECT, not as a
// blob with an EQ analyser strapped to it.
// ───────────────────────────────────────────────────────────────────────
const VERTEX = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    varying vec2 vUV;
    void main() {
        vUV = uv;
        gl_Position = worldViewProjection * vec4(position, 1.0);
    }
`;

const FRAGMENT = `
    precision highp float;
    varying vec2 vUV;

    uniform float flowT;     // wrapped 4h shader time (gentle pulse only)
    uniform float energy;    // 0..1 overall track energy
    uniform float volume;    // 0..1 smoothed visual volume
    uniform float selected;  // 0..1 selection blend
    uniform float consume;   // 0..1 consumption fade
    uniform float entrance;  // 0..1 fade-in (0 = invisible, 1 = fully here)
    uniform vec3  tint;      // per-sound colour

    void main() {
        // Centre UV at origin; the body's footprint is unit-radius.
        vec2 p = vUV * 2.0 - 1.0;

        // Consumption: stretch toward the singularity, then fade.
        p.y /= max(0.06, 1.0 - consume * 0.85);
        p.x *= mix(1.0, 0.94, consume);

        float r = length(p);

        // ── Hot core: tiny, very bright. Bloom turns it into a gem.
        float core = pow(max(0.0, 1.0 - r * 6.0), 2.4);
        // ── Mid bloom: soft falloff out to ~0.5
        float bloom = smoothstep(0.55, 0.0, r);
        // ── Outer halo: wide, very low intensity, falls off by 1.0
        float halo = smoothstep(1.0, 0.35, r) * 0.35;

        // Subtle breathing — overall intensity oscillates with track
        // energy and a slow phase. No texture, no distortion.
        float breath = 1.0 + energy * 0.22 + sin(flowT * 0.9) * 0.04;

        // Tint blend: hot core washes toward white, bloom is the tint.
        vec3 col = tint * (bloom * 0.85 + halo);
        col += mix(tint, vec3(1.0), 0.6) * core * 1.4;
        col *= breath;

        // Volume scales overall intensity with a generous floor so a
        // quiet body still reads.
        float volScale = 0.55 + volume * 0.95;

        float alpha = (bloom * 0.55 + halo + core * 0.7) * volScale;
        alpha *= entrance;
        alpha *= 1.0 - consume;

        // Selected — a thin bright rim at the body's outer edge.
        if (selected > 0.0) {
            float ring = smoothstep(0.96, 1.0, r) - smoothstep(1.0, 1.04, r);
            col   += mix(tint, vec3(1.0), 0.5) * ring * selected * 1.6;
            alpha = max(alpha, ring * selected * 0.85);
        }

        if (alpha < 0.001) discard;
        gl_FragColor = vec4(col * volScale, clamp(alpha, 0.0, 1.0));
    }
`;

// ═══════════════════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════════════════

let sceneRef = null;
let cameraRef = null;
let blackholeRef = null;
let initialised = false;
let nextLaneIdx = 0;

// id → body record
const bodies = new Map();

// ═══════════════════════════════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════════════════════════════

export function initSoundBodies(scene, camera, blackholeMesh) {
    if (initialised) return;
    sceneRef = scene;
    cameraRef = camera;
    blackholeRef = blackholeMesh;

    BABYLON.Effect.ShadersStore['soundBodyVertexShader'] = VERTEX;
    BABYLON.Effect.ShadersStore['soundBodyFragmentShader'] = FRAGMENT;

    initialised = true;
}

// ═══════════════════════════════════════════════════════════════════════════
// Public — body lifecycle
// ═══════════════════════════════════════════════════════════════════════════

export function summonBody(id, { initialVolume } = {}) {
    if (!initialised || !sceneRef) return null;
    if (bodies.has(id)) return bodies.get(id);

    const tint = TINTS[id] || DEFAULT_TINT;
    const lane = LANES[id] != null
        ? LANES[id]
        : FALLBACK_LANE_ORDER[nextLaneIdx++ % FALLBACK_LANE_ORDER.length];

    const mesh = BABYLON.MeshBuilder.CreatePlane(
        `soundBody_${id}`,
        { width: 2, height: 2 },
        sceneRef
    );
    mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    mesh.scaling = new BABYLON.Vector3(BODY_SCALE, BODY_SCALE, BODY_SCALE);
    mesh.renderingGroupId = 1;
    mesh.isPickable = true;
    mesh.metadata = { soundBodyId: id };

    const material = new BABYLON.ShaderMaterial(
        `soundBodyMat_${id}`,
        sceneRef,
        { vertex: 'soundBody', fragment: 'soundBody' },
        {
            attributes: ['position', 'uv'],
            uniforms: ['worldViewProjection',
                'flowT', 'energy', 'volume', 'selected', 'consume',
                'entrance', 'tint'],
            needAlphaBlending: true,
        }
    );
    material.setFloat('flowT', 0);
    material.setFloat('energy', 0);
    material.setFloat('volume', 0);
    material.setFloat('selected', 0);
    material.setFloat('consume', 0);
    material.setFloat('entrance', 0);
    material.setColor3('tint', new BABYLON.Color3(...tint));
    material.alphaMode = BABYLON.Engine.ALPHA_COMBINE;
    material.backFaceCulling = false;
    material.forceDepthWrite = false;
    mesh.material = material;

    const trackState = ambientTracks.value[id] || {};
    const v = typeof initialVolume === 'number'
        ? initialVolume
        : (typeof trackState.volume === 'number' ? trackState.volume : 0.7);
    const radius = volumeToRadius(v);

    const body = {
        id,
        mesh,
        material,
        tint,
        theta: lane,
        targetTheta: lane,
        radius,
        targetRadius: radius,
        volumeSmooth: v,
        energySmooth: 0,
        selected: 0,
        consume: 0,
        entrance: 0,
        dragging: false,
        removing: false,
        spawnT: performance.now(),
    };
    bodies.set(id, body);
    placeBody(body);
    return body;
}

/** Animated removal. If `consume` is true, the body stretches toward the
 *  singularity then fades; otherwise it gently fades out in place. */
export function dismissBody(id, { consume = false, durationMs = 700 } = {}) {
    const body = bodies.get(id);
    if (!body || body.removing) return;
    body.removing = true;
    const start = performance.now();
    const initialRadius = body.radius;

    const tick = () => {
        const t = Math.min(1, (performance.now() - start) / durationMs);
        const ease = t * t * (3 - 2 * t);
        if (consume) {
            body.consume = ease;
            body.targetRadius = initialRadius * (1 - 0.85 * ease);
            body.radius = body.targetRadius;
        } else {
            body.entrance = 1 - ease;
        }
        if (t < 1) {
            requestAnimationFrame(tick);
        } else {
            forceDispose(id);
        }
    };
    requestAnimationFrame(tick);

    // Hard fallback — if rAF stalls (tab backgrounded, frame drops), still
    // dispose after ~2× the animation duration. Prevents stuck bodies.
    setTimeout(() => forceDispose(id), durationMs * 2 + 200);
}

/** Force-dispose every body immediately, no animation. Used by
 *  Clear-sky / stopAllAmbientSounds to guarantee cleanup. */
export function disposeAllBodies() {
    for (const id of Array.from(bodies.keys())) forceDispose(id);
}

/** Internal: synchronously remove a body. Idempotent. */
function forceDispose(id) {
    const body = bodies.get(id);
    if (!body) return;
    bodies.delete(id);
    try { body.mesh.dispose(); } catch (_) {}
    try { body.material.dispose(); } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════════════════
// Public — per-frame update
// ═══════════════════════════════════════════════════════════════════════════

let _lastUpdate = 0;
export function updateSoundBodies(elapsed) {
    if (!initialised || bodies.size === 0) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - _lastUpdate) / 1000 || 0.016);
    _lastUpdate = now;

    for (const body of bodies.values()) {
        // Audio energy — single scalar, no per-band split. Smoothed.
        const eRaw = body.dragging || body.removing ? 0 : getTrackEnergy(body.id);
        body.energySmooth += (eRaw - body.energySmooth) * Math.min(1, dt * 8);

        // Orbital drift only when not being dragged or removing.
        if (!body.dragging && !body.removing) {
            body.theta += ORBIT_DRIFT * dt;
            if (body.theta > PHASE_WRAP) body.theta -= PHASE_WRAP;
        }
        body.radius += (body.targetRadius - body.radius) * Math.min(1, dt * 6);

        // Entrance fade-in — completes over ~700ms after spawn. Gives a
        // quiet luminous fade-up rather than a popping scale animation.
        if (!body.removing) {
            const ageS = (now - body.spawnT) / 700;
            const target = ageS >= 1 ? 1 : (ageS * ageS * (3 - 2 * ageS));
            body.entrance = target;
        }

        const m = body.material;
        m.setFloat('flowT', elapsed % FLOW_WRAP);
        m.setFloat('energy', body.energySmooth);
        m.setFloat('volume', body.volumeSmooth);
        m.setFloat('selected', body.selected);
        m.setFloat('consume', body.consume);
        m.setFloat('entrance', body.entrance);

        placeBody(body);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Public — interaction surface
// ═══════════════════════════════════════════════════════════════════════════

export function pickBody(pointerX, pointerY) {
    if (!sceneRef) return null;
    const pickInfo = sceneRef.pick(pointerX, pointerY,
        (mesh) => mesh.metadata?.soundBodyId);
    if (!pickInfo?.hit || !pickInfo.pickedMesh) return null;
    const id = pickInfo.pickedMesh.metadata?.soundBodyId;
    const body = bodies.get(id);
    return body ? { id, body, pickInfo } : null;
}

export function setDragging(id, dragging) {
    const body = bodies.get(id);
    if (!body) return;
    body.dragging = !!dragging;
}

export function setBodyVolume(id, volume01) {
    const body = bodies.get(id);
    if (!body) return;
    body.volumeSmooth = clamp01(volume01);
    body.targetRadius = volumeToRadius(volume01);
    if (body.dragging) body.radius = body.targetRadius;
}

export function setBodyTheta(id, theta) {
    const body = bodies.get(id);
    if (!body) return;
    body.targetTheta = theta;
    if (body.dragging) body.theta = theta;
}

export function setBodySelected(id, selected) {
    const body = bodies.get(id);
    if (!body) return;
    const target = selected ? 1 : 0;
    const tick = () => {
        body.selected += (target - body.selected) * 0.18;
        if (Math.abs(body.selected - target) > 0.01) requestAnimationFrame(tick);
        else body.selected = target;
    };
    requestAnimationFrame(tick);
}

export function isInsideEventHorizon(id) {
    const body = bodies.get(id);
    if (!body) return false;
    return body.radius <= EVENT_HORIZON_R;
}

export function projectBody(id) {
    const body = bodies.get(id);
    if (!body || !cameraRef || !sceneRef) return null;
    const engine = sceneRef.getEngine();
    const viewport = cameraRef.viewport.toGlobal(engine.getRenderWidth(),
                                                  engine.getRenderHeight());
    const v = BABYLON.Vector3.Project(
        body.mesh.position,
        BABYLON.Matrix.Identity(),
        sceneRef.getTransformMatrix(),
        viewport,
    );
    return { x: v.x, y: v.y };
}

export function dragBody(id, screenDX, screenDY, screenWidth, screenHeight) {
    const body = bodies.get(id);
    if (!body) return null;
    const dPan = screenDX / Math.max(200, screenWidth) * 2;
    const dVol = -screenDY / Math.max(200, screenHeight) * 1.6;
    const newVol = clamp01(body.volumeSmooth + dVol);
    body.volumeSmooth = newVol;
    body.radius = body.targetRadius = volumeToRadius(newVol);
    body.theta = body.targetTheta = body.theta + dPan * 0.7;
    return { volume: newVol, pan: thetaToPan(body.theta) };
}

export function listBodies() {
    return Array.from(bodies.values()).map((b) => ({
        id: b.id,
        theta: b.theta,
        radius: b.radius,
        volume: b.volumeSmooth,
        tint: b.tint,
    }));
}

export function getBody(id) { return bodies.get(id) || null; }

// ═══════════════════════════════════════════════════════════════════════════
// Internals
// ═══════════════════════════════════════════════════════════════════════════

function placeBody(body) {
    const r = body.radius;
    const x = Math.cos(body.theta) * r;
    const y = Math.sin(body.theta) * r * (1 - ORBIT_TILT);
    const z = Math.sin(body.theta) * r * 0.12;
    body.mesh.position.set(x, y, z);
    const s = BODY_SCALE;
    body.mesh.scaling.set(s, s, s);
}

function volumeToRadius(v) {
    const t = clamp01(v);
    // Louder = closer (but never inside the event horizon). Non-linear
    // curve so the last 10% of volume doesn't crash the body into the disk.
    return RADIUS_MIN + (RADIUS_MAX - RADIUS_MIN) * (1 - Math.pow(t, 0.6));
}

function thetaToPan(theta) {
    return Math.max(-1, Math.min(1, Math.cos(theta)));
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
