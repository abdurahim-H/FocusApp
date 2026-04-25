// sound-bodies.js — celestial bodies that ARE the ambient sound mixer.
//
// Each active ambient track (rain, forest, ocean, cafe, …) lives in the
// scene as a glowing celestial body orbiting the black hole. The user
// composes their mix by arranging this constellation:
//
//   • Drag a body up/down  → volume     (closer to the black hole = louder)
//   • Drag a body left/right → pan      (left/right of centre)
//   • Click a body          → opens an EQ control ring around it
//   • Drag a body into the event horizon → black hole consumes it (remove)
//
// Each body's shader reacts to its own per-track FFT data — the rain
// droplet shimmers on its highs, the ocean ring swells on its bass.
// Visuals are not decoration; they ARE the audio, and the audio is what
// the user manipulates by manipulating them.
//
// Public surface:
//   initSoundBodies(scene, camera) — wires the manager, stores refs
//   summonBody(id, opts)            — spawn a body for a track id
//   dismissBody(id, opts)           — remove (with optional consumption)
//   updateSoundBodies(elapsed)      — per-frame update (from render loop)
//   pickBody(pointerX, pointerY)    — hit-test at screen coords
//   listBodies()                    — current id → state map
//
// The manager uses Babylon's BillboardMode_All so bodies always face the
// camera regardless of the camera's slow drift, and renderingGroupId = 1
// so they composite cleanly with the blackhole + nebula in the same
// transparent mid-depth group.

import { ambientTracks } from '../../core/state.js';
import { getTrackBandEnergy, getTrackEnergy } from '../../features/sounds.js';

const TAU = Math.PI * 2;
const FLOW_WRAP = 4 * 60 * 60; // shader time wrap, see CLAUDE.md
const PHASE_WRAP = TAU * 1024; // pre-computed orbital phase wrap

// Visual orbital ring. Bodies sit on a slightly tilted plane so the
// constellation reads as 3D-ish around the central black hole. Radius
// is volume-driven: closer to the singularity = louder.
const RADIUS_MIN = 9; // max volume — body sits just outside the disk
const RADIUS_MAX = 22; // silent — body drifts far out
const ORBIT_TILT = 0.08; // shallow tilt so bodies aren't all on the equator
const BODY_SCALE = 4.4; // billboard plane scale; tuned so a body reads
// at ~120px on a 1440x900 viewport at radius 14

// Gentle auto-orbital drift. Each body has an angular velocity in radians
// per second; small enough that the constellation feels alive but not so
// fast it disorients while reading the timer.
const ORBIT_DRIFT = 0.018;

// ───────────────────────────────────────────────────────────────────────
// Per-sound visual recipe — shader bodyType + base tint + orbital lane.
// Lane is the resting angular position around the ring (0 = right, π/2 =
// top, π = left, 3π/2 = bottom). When multiple bodies are active, the
// gentle orbital drift keeps them from clumping; the lane is just the
// initial seed.
// ───────────────────────────────────────────────────────────────────────
const BODY_RECIPES = {
    rain: {
        bodyType: 0,
        // Cool teal-cyan droplet. High frequencies make it shimmer.
        tint: [0.55, 0.78, 0.95],
        accent: [0.85, 0.95, 1.0],
        lane: Math.PI * 0.25, // upper-right
    },
    forest: {
        bodyType: 1,
        // Rich emerald moss-canopy moon, slow rotating organic noise.
        tint: [0.3, 0.72, 0.42],
        accent: [0.55, 0.95, 0.55],
        lane: Math.PI * 0.75, // upper-left
    },
    ocean: {
        bodyType: 2,
        // Deep cyan gas giant with concentric wave rings, swells on bass.
        tint: [0.2, 0.55, 0.78],
        accent: [0.45, 0.85, 1.0],
        lane: Math.PI * 1.25, // lower-left
    },
    cafe: {
        bodyType: 3,
        // Warm hearth-star — golden flares pulse on high frequencies.
        tint: [0.98, 0.74, 0.38],
        accent: [1.0, 0.92, 0.65],
        lane: Math.PI * 1.75, // lower-right
    },
};

// Default recipe for any sound id we don't have a custom shader for yet —
// neutral cream glow, bottom of the ring.
const DEFAULT_RECIPE = {
    bodyType: 4,
    tint: [0.92, 0.85, 0.65],
    accent: [1.0, 0.97, 0.85],
    lane: Math.PI * 0.5,
};

// ───────────────────────────────────────────────────────────────────────
// Shader — single source, switches per-body via uniform `bodyType`. Each
// type is a self-contained block so adding a new sound is a matter of
// writing one more `else if (bodyType == N)` branch.
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

    uniform float flowT;     // wrapped 4h shader time
    uniform float energy;    // 0..1 overall track energy
    uniform float bandLow;   // 0..1
    uniform float bandMid;   // 0..1
    uniform float bandHigh;  // 0..1
    uniform float volume;    // 0..1 smoothed visual volume
    uniform float selected;  // 0..1 selection blend
    uniform float consume;   // 0..1 consumption (lensing into black hole)
    uniform vec3  tint;      // base body colour
    uniform vec3  accent;    // highlight colour
    uniform int   bodyType;  // 0 rain, 1 forest, 2 ocean, 3 cafe, 4 generic

    #define PI 3.14159265

    // ── noise primitives ─────────────────────────────────────────────
    float hash2(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
    }
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(hash2(i), hash2(i + vec2(1,0)), f.x),
            mix(hash2(i + vec2(0,1)), hash2(i + vec2(1,1)), f.x),
            f.y);
    }
    float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p *= 2.02;
            a *= 0.5;
        }
        return v;
    }

    // Soft circular falloff — the canvas of every body.
    float disc(vec2 uv, float r) {
        float d = length(uv);
        return smoothstep(r, r * 0.55, d);
    }

    void main() {
        // Centre UV at origin; the body's footprint is unit-radius.
        vec2 p = vUV * 2.0 - 1.0;

        // Consumption: the body stretches toward the black hole as it's
        // pulled in. Compress UV vertically by (1-consume) so the body
        // squashes into a sliver before fading.
        p.y /= max(0.06, 1.0 - consume * 0.92);
        p.x *= mix(1.0, 0.92, consume);

        float r = length(p);
        float ang = atan(p.y, p.x);
        float t = flowT;

        // Each body type computes (col, alpha) independently.
        vec3 col = vec3(0.0);
        float alpha = 0.0;

        if (bodyType == 0) {
            // ── RAIN ─ translucent droplet-nebula. Vertical streaks
            //          carrying a soft mist; high-freq energy makes the
            //          mist shimmer; mid-freq drives the falling streaks.
            float streak = fbm(vec2(p.x * 3.5, p.y * 1.6 - t * 0.6 - bandMid * 1.2));
            float mist   = fbm(p * 1.8 + vec2(0.0, t * 0.18));
            float spark  = pow(noise(vec2(p.x * 18.0, p.y * 18.0 + t * 9.0)), 6.0);
            float core   = disc(p, 0.95);

            col  = mix(tint, accent, streak * 0.6 + bandHigh * 0.4);
            col += accent * spark * (0.4 + bandHigh * 1.2);
            alpha = core * (0.45 + mist * 0.4 + bandMid * 0.3);
        }
        else if (bodyType == 1) {
            // ── FOREST ─ moss-canopy moon. Organic clumps of noise that
            //             twist slowly. Mid-freq energy adds canopy
            //             rustle. Low-freq energy adds a deep breathing
            //             swell that puffs the moon outward.
            float twist = ang + t * 0.05 + fbm(p * 1.2 + vec2(t * 0.12)) * 0.6;
            vec2  pp = vec2(cos(twist), sin(twist)) * r;
            float moss = fbm(pp * 2.4);
            float deep = fbm(pp * 0.7 + vec2(t * 0.05));
            float core = disc(p, 0.92 + bandLow * 0.06);

            col  = mix(tint * 0.6, tint, moss);
            col += accent * pow(deep, 3.0) * (0.4 + bandMid * 0.6);
            alpha = core * (0.65 + moss * 0.25);
        }
        else if (bodyType == 2) {
            // ── OCEAN ─ wave-ringed gas giant. Concentric ring distortion
            //            that grows with bass, tide-line pattern crawling
            //            around the disc.
            float bands = sin(r * 14.0 - t * 0.6 + bandLow * 4.0) * 0.5 + 0.5;
            float swirl = fbm(vec2(ang * 1.6, r * 3.8 - t * 0.25));
            float core  = disc(p, 0.93 + bandLow * 0.05);

            col  = mix(tint * 0.55, tint, bands);
            col += accent * pow(swirl, 2.0) * (0.45 + bandLow * 0.7);
            alpha = core * (0.7 + bands * 0.18);
        }
        else if (bodyType == 3) {
            // ── CAFE ─ warm hearth-star. Golden flares radiating out,
            //           tip-jiggle on highs (clinking glasses, voices).
            float flare = pow(noise(vec2(ang * 6.0, r * 8.0 + t * 1.4)), 3.5);
            float halo  = fbm(p * 2.2 + vec2(t * 0.18));
            float core  = disc(p, 0.85 + bandHigh * 0.08);

            col  = mix(tint, accent, halo * 0.55);
            col += accent * flare * (0.55 + bandHigh * 1.4);
            alpha = core * (0.7 + halo * 0.25);
        }
        else {
            // Generic glow — clean radial bloom for any not-yet-bespoke sound.
            float halo = fbm(p * 2.0 + vec2(t * 0.15));
            float core = disc(p, 0.88);
            col   = mix(tint, accent, halo * 0.6);
            alpha = core * 0.7;
        }

        // ── volume modulates overall intensity ────────────────────
        col   *= 0.65 + volume * 0.85;
        alpha *= 0.35 + volume * 0.85;

        // ── selection — adds a thin bright rim around the body ────
        if (selected > 0.0) {
            float ring = smoothstep(0.97, 1.0, r) - smoothstep(1.0, 1.05, r);
            col  += accent * ring * selected * 1.4;
            alpha = max(alpha, ring * selected);
        }

        // ── consumption fade ──────────────────────────────────────
        alpha *= 1.0 - consume;

        gl_FragColor = vec4(col, alpha);
    }
`;

// ═══════════════════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════════════════

let sceneRef = null;
let cameraRef = null;
let blackholeRef = null; // for hit-test "is the body inside the event horizon?"
let initialised = false;
let nextLaneIdx = 0;

// id → { mesh, material, recipe, theta, radius, targetRadius, targetTheta,
//         volumeSmooth, energySmooth, selected, consume, dragging, removing }
const bodies = new Map();

const FALLBACK_LANE_ORDER = [
    0,
    Math.PI * 0.5,
    Math.PI,
    Math.PI * 1.5,
    Math.PI * 0.25,
    Math.PI * 0.75,
    Math.PI * 1.25,
    Math.PI * 1.75,
];

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

/** Spawn a celestial body for a track id. Idempotent. */
export function summonBody(id, { initialVolume } = {}) {
    if (!initialised || !sceneRef) return null;
    if (bodies.has(id)) return bodies.get(id);

    const recipe = BODY_RECIPES[id] || {
        ...DEFAULT_RECIPE,
        lane: FALLBACK_LANE_ORDER[nextLaneIdx++ % FALLBACK_LANE_ORDER.length],
    };

    const mesh = BABYLON.MeshBuilder.CreatePlane(
        `soundBody_${id}`,
        { width: 2, height: 2 },
        sceneRef
    );
    mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    mesh.scaling = new BABYLON.Vector3(BODY_SCALE, BODY_SCALE, BODY_SCALE);
    mesh.renderingGroupId = 1;
    mesh.isPickable = true;
    // Tag for the pointer hit-test layer to find — Babylon sets this on
    // the mesh's metadata so we don't have to walk the mesh dictionary.
    mesh.metadata = { soundBodyId: id };

    const material = new BABYLON.ShaderMaterial(
        `soundBodyMat_${id}`,
        sceneRef,
        { vertex: 'soundBody', fragment: 'soundBody' },
        {
            attributes: ['position', 'uv'],
            uniforms: [
                'worldViewProjection',
                'flowT',
                'energy',
                'bandLow',
                'bandMid',
                'bandHigh',
                'volume',
                'selected',
                'consume',
                'tint',
                'accent',
                'bodyType',
            ],
            needAlphaBlending: true,
        }
    );
    material.setFloat('flowT', 0);
    material.setFloat('energy', 0);
    material.setFloat('bandLow', 0);
    material.setFloat('bandMid', 0);
    material.setFloat('bandHigh', 0);
    material.setFloat('volume', 0);
    material.setFloat('selected', 0);
    material.setFloat('consume', 0);
    material.setColor3('tint', new BABYLON.Color3(...recipe.tint));
    material.setColor3('accent', new BABYLON.Color3(...recipe.accent));
    material.setInt('bodyType', recipe.bodyType);
    material.alphaMode = BABYLON.Engine.ALPHA_COMBINE;
    material.backFaceCulling = false;
    material.forceDepthWrite = false;
    mesh.material = material;

    // Initial radius derived from saved volume (or supplied initialVolume).
    const trackState = ambientTracks.value[id] || {};
    const v =
        typeof initialVolume === 'number'
            ? initialVolume
            : typeof trackState.volume === 'number'
              ? trackState.volume
              : 0.7;
    const radius = volumeToRadius(v);

    const body = {
        id,
        mesh,
        material,
        recipe,
        theta: recipe.lane,
        targetTheta: recipe.lane,
        radius,
        targetRadius: radius,
        // Smoothed visual values — keep changes from snapping
        volumeSmooth: v,
        energySmooth: 0,
        bandSmooth: { low: 0, mid: 0, high: 0 },
        selected: 0,
        consume: 0,
        dragging: false,
        removing: false,
        // Birth animation: bodies start far away then fly inward
        spawnT: performance.now(),
    };
    bodies.set(id, body);

    placeBody(body);
    return body;
}

/** Remove a body. If `consume` is true, animate it being consumed by the
 *  black hole (gravitational stretch + fade); otherwise gentle fade out. */
export function dismissBody(id, { consume = false, durationMs = 700 } = {}) {
    const body = bodies.get(id);
    if (!body || body.removing) return;
    body.removing = true;
    const start = performance.now();
    const initialRadius = body.radius;

    const tick = () => {
        const t = Math.min(1, (performance.now() - start) / durationMs);
        const ease = t * t * (3 - 2 * t); // smoothstep
        if (consume) {
            // Stretch radially inward toward the black hole core.
            body.consume = ease;
            body.targetRadius = initialRadius * (1 - 0.85 * ease);
            body.radius = body.targetRadius;
        } else {
            body.material.setFloat('volume', body.volumeSmooth * (1 - ease));
        }
        if (t < 1) {
            requestAnimationFrame(tick);
        } else {
            // Remove from the active map FIRST so the render loop can't
            // touch a disposed material/mesh on the same frame.
            bodies.delete(id);
            try {
                body.mesh.dispose();
            } catch (_) {}
            try {
                body.material.dispose();
            } catch (_) {}
        }
    };
    requestAnimationFrame(tick);
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
        // ── audio: pull per-track FFT, smooth it ─────────────────
        const eRaw = body.dragging || body.removing ? 0 : getTrackEnergy(body.id);
        body.energySmooth += (eRaw - body.energySmooth) * Math.min(1, dt * 9);

        const bands =
            body.dragging || body.removing
                ? { low: 0, mid: 0, high: 0 }
                : getTrackBandEnergy(body.id);
        body.bandSmooth.low += (bands.low - body.bandSmooth.low) * Math.min(1, dt * 8);
        body.bandSmooth.mid += (bands.mid - body.bandSmooth.mid) * Math.min(1, dt * 8);
        body.bandSmooth.high += (bands.high - body.bandSmooth.high) * Math.min(1, dt * 8);

        // ── orbital drift when not being dragged ─────────────────
        if (!body.dragging && !body.removing) {
            body.theta += ORBIT_DRIFT * dt;
            if (body.theta > PHASE_WRAP) body.theta -= PHASE_WRAP;
        }
        // Smooth radius toward target so volume changes feel weighted.
        body.radius += (body.targetRadius - body.radius) * Math.min(1, dt * 6);

        // ── shader uniforms ──────────────────────────────────────
        const m = body.material;
        m.setFloat('flowT', elapsed % FLOW_WRAP);
        m.setFloat('energy', body.energySmooth);
        m.setFloat('bandLow', body.bandSmooth.low);
        m.setFloat('bandMid', body.bandSmooth.mid);
        m.setFloat('bandHigh', body.bandSmooth.high);
        m.setFloat('volume', body.volumeSmooth);
        m.setFloat('selected', body.selected);
        m.setFloat('consume', body.consume);

        placeBody(body);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Public — interaction surface
// ═══════════════════════════════════════════════════════════════════════════

/** Hit-test at scene-pointer coords. Babylon's pickWithRay handles the
 *  billboard correctly. Returns { id, body } or null. */
export function pickBody(pointerX, pointerY) {
    if (!sceneRef || !cameraRef) return null;
    const pickInfo = sceneRef.pick(pointerX, pointerY, (mesh) => mesh.metadata?.soundBodyId);
    if (!pickInfo?.hit || !pickInfo.pickedMesh) return null;
    const id = pickInfo.pickedMesh.metadata?.soundBodyId;
    const body = bodies.get(id);
    return body ? { id, body, pickInfo } : null;
}

/** Mark a body as being dragged. While dragging, orbital drift pauses
 *  and audio reactivity is silenced so the user has total control. */
export function setDragging(id, dragging) {
    const body = bodies.get(id);
    if (!body) return;
    body.dragging = !!dragging;
}

/** Set a body's volume from the interaction layer. Smoothed for visuals,
 *  applied immediately to the audio engine via the caller (which holds
 *  the setSoundVolume reference). */
export function setBodyVolume(id, volume01) {
    const body = bodies.get(id);
    if (!body) return;
    body.volumeSmooth = clamp01(volume01);
    body.targetRadius = volumeToRadius(volume01);
    if (body.dragging) body.radius = body.targetRadius; // snap during drag
}

/** Set the angular position around the orbital ring (radians). */
export function setBodyTheta(id, theta) {
    const body = bodies.get(id);
    if (!body) return;
    body.targetTheta = theta;
    if (body.dragging) body.theta = theta;
}

/** Highlight a body as "selected" for the EQ control ring overlay. */
export function setBodySelected(id, selected) {
    const body = bodies.get(id);
    if (!body) return;
    // Smooth the selection blend so the rim glow eases in.
    const target = selected ? 1 : 0;
    const tick = () => {
        body.selected += (target - body.selected) * 0.18;
        if (Math.abs(body.selected - target) > 0.01) {
            requestAnimationFrame(tick);
        } else {
            body.selected = target;
        }
    };
    requestAnimationFrame(tick);
}

/** True if dragging this body has carried it into the black hole's
 *  event horizon. The interaction layer uses this to trigger
 *  consumption / removal. */
export function isInsideEventHorizon(id) {
    const body = bodies.get(id);
    if (!body) return false;
    return body.radius <= 5.5;
}

/** Project a body's current world position into screen-space pixels.
 *  Used by the EQ control ring overlay to anchor itself on the body. */
export function projectBody(id) {
    const body = bodies.get(id);
    if (!body || !cameraRef || !sceneRef) return null;
    const engine = sceneRef.getEngine();
    const viewport = cameraRef.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    const v = BABYLON.Vector3.Project(
        body.mesh.position,
        BABYLON.Matrix.Identity(),
        sceneRef.getTransformMatrix(),
        viewport
    );
    return { x: v.x, y: v.y };
}

/** Map an arbitrary screen-space drag delta into volume + theta updates.
 *  Used by the interaction layer in ambient-ui-cosmos.js. */
export function dragBody(id, screenDX, screenDY, screenWidth, screenHeight) {
    const body = bodies.get(id);
    if (!body) return null;
    // Scale the deltas so a full-viewport drag = full range.
    const dPan = (screenDX / Math.max(200, screenWidth)) * 2; // ±1 pan
    const dVol = (-screenDY / Math.max(200, screenHeight)) * 1.6; // up = louder
    const newVol = clamp01(body.volumeSmooth + dVol);
    body.volumeSmooth = newVol;
    body.radius = body.targetRadius = volumeToRadius(newVol);
    // Rotate around the ring with horizontal drag.
    body.theta = body.targetTheta = body.theta + dPan * 0.7;
    return { volume: newVol, pan: thetaToPan(body.theta) };
}

/** Snapshot of every body for external code (constellation save/load,
 *  a11y overlay). Returns a plain array — not a live reference. */
export function listBodies() {
    return Array.from(bodies.values()).map((b) => ({
        id: b.id,
        theta: b.theta,
        radius: b.radius,
        volume: b.volumeSmooth,
        recipe: b.recipe,
    }));
}

export function getBody(id) {
    return bodies.get(id) || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Internals
// ═══════════════════════════════════════════════════════════════════════════

function placeBody(body) {
    // Position on a slightly tilted ring around (0,0,0). The black hole
    // sits at (0,-0.5,0) so a ring centred on origin reads as orbiting it.
    const r = body.radius;
    const x = Math.cos(body.theta) * r;
    const y = Math.sin(body.theta) * r * (1 - ORBIT_TILT) + ORBIT_TILT * 0.5;
    const z = Math.sin(body.theta) * r * 0.18; // gentle parallax depth
    body.mesh.position.set(x, y, z);

    // Birth animation: scale up from 0 over 600ms.
    const age = (performance.now() - body.spawnT) / 600;
    const grow = age >= 1 ? 1 : age * age * (3 - 2 * age);
    const s = BODY_SCALE * grow;
    body.mesh.scaling.set(s, s, s);
}

function volumeToRadius(v) {
    const t = clamp01(v);
    // Louder = closer to the black hole, with a non-linear curve so the
    // last 10% of volume doesn't collapse the body into the singularity.
    return RADIUS_MIN + (RADIUS_MAX - RADIUS_MIN) * (1 - t ** 0.6);
}

function thetaToPan(theta) {
    // Project the body's angular position onto the X-axis: cos(θ) is
    // already in [-1, 1] which maps directly to stereo pan.
    return Math.max(-1, Math.min(1, Math.cos(theta)));
}

function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
}
