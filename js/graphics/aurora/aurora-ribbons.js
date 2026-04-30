// aurora-ribbons.js — real 3D aurora curtains.
//
// Replaces the flat billboard "curtain" planes with actual ribbon
// meshes that follow curved paths through 3D space. The ribbons are
// physically present geometry — when the camera pans, parallax reveals
// their depth, and their slow vertex-shader sway is real motion in
// world space, not painted onto a flat plane.
//
// Each ribbon:
//   • Path: an arc spanning a slice of azimuth, draped at altitude h
//     with multi-octave folding so the curtain has natural undulation.
//   • Geometry: BABYLON.CreateRibbon between top/bottom path arrays —
//     a tall vertical strip following the path through the sky.
//   • Vertex shader: world-space sway breathes the whole curtain.
//   • Fragment shader: aurora palette gradient (green base → violet
//     tip) with discrete falling rays painted via fbm flow.
//
// Three ribbons at staggered azimuths give continuous coverage as the
// camera yaws through 360° — there's always an aurora somewhere in
// frame.
//
// Audio energy from the cosmos brightens the curtains slightly — same
// quiet feedback loop the previous build used.

import { getMasterEnergy } from '../../features/sounds.js';

const meshes = [];
const materials = [];
let smoothedEnergy = 0;

const TIME_WRAP = 4 * 60 * 60;

const VERTEX = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    uniform mat4 world;
    uniform float time;
    uniform float seed;
    varying vec2 vUV;
    varying vec3 vWorldPos;

    float hash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
    }
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
        return mix(
            mix(hash(i),                  hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
        );
    }
    float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
        return v;
    }

    void main() {
        vec3 p = position;

        // Macro sway — the whole curtain breathes laterally and bobs
        // vertically. Same offset on top and bottom of the ribbon
        // (uv.x is shared), so the strip shifts as a coherent unit
        // rather than tearing.
        vec2 swayUV = vec2(uv.x * 2.2 + seed, time * 0.024);
        float swayX = (fbm(swayUV) - 0.5) * 9.0;
        float swayZ = (fbm(swayUV + vec2(17.3, 0.0)) - 0.5) * 7.0;
        float bobY  = (fbm(vec2(uv.x * 3.4 + seed, time * 0.018)) - 0.5) * 3.0;

        p.x += swayX;
        p.z += swayZ;
        p.y += bobY;

        vec4 wp = world * vec4(p, 1.0);
        vWorldPos = wp.xyz;
        vUV = uv;
        gl_Position = worldViewProjection * vec4(p, 1.0);
    }
`;

const FRAGMENT = `
    precision highp float;
    varying vec2 vUV;
    varying vec3 vWorldPos;
    uniform float time;
    uniform float energy;
    uniform float seed;

    float hash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
    }
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
        return mix(
            mix(hash(i),                  hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
        );
    }
    float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        mat2 rot = mat2(0.87, 0.48, -0.48, 0.87);
        for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p = rot * p * 2.0 + vec2(100.0);
            a *= 0.5;
        }
        return v;
    }

    // Aurora colour palette keyed to vertical position.
    // 0 = base (557 nm O₂ green), 1 = tip (N₂ ion violet/magenta).
    vec3 auroraPalette(float yFrac, float hueShift) {
        vec3 lime    = vec3(0.55, 1.00, 0.45);
        vec3 teal    = vec3(0.10, 0.95, 0.70);
        vec3 cyan    = vec3(0.30, 0.80, 1.00);
        vec3 violet  = vec3(0.55, 0.40, 1.00);
        vec3 magenta = vec3(1.00, 0.45, 0.85);

        float h = mod(yFrac + hueShift, 1.0);
        if (h < 0.25)      return mix(lime, teal,    h / 0.25);
        else if (h < 0.50) return mix(teal, cyan,   (h - 0.25) / 0.25);
        else if (h < 0.75) return mix(cyan, violet, (h - 0.50) / 0.25);
        else               return mix(violet, magenta, (h - 0.75) / 0.25);
    }

    void main() {
        float u = vUV.x;
        float v = vUV.y;

        // ── Vertical envelope ────────────────────────────
        // Tighter band than a real curtain — most of the brightness
        // sits in the lower third of the ribbon (the high-energy zone
        // where 557 nm green emits) and tapers fast above. Without
        // this taper the additive blend dominates the whole upper sky.
        float baseFade = smoothstep(0.0, 0.12, v);
        float topFade  = smoothstep(0.98, 0.40, v);
        float vertEnv = baseFade * topFade;

        // ── Path-end feathering ─────────────────────────
        float endFade = smoothstep(0.0, 0.06, u) * smoothstep(1.0, 0.94, u);

        // ── Curtain folds (slow, large) ─────────────────
        // Lateral undulation in brightness — gives the curtain visible
        // "knees" where folds catch more light. Reads as macro structure
        // when the eye scans across the aurora.
        float folds = fbm(vec2(u * 5.5 + seed * 0.3, time * 0.045));
        float foldBoost = 0.35 + folds * 1.05;

        // ── Vertical rays (the signature feature) ───────
        // Two scales of high-frequency vertical noise scrolled fast in
        // the v direction. Sharp pow falloff carves only the noise
        // peaks into visible streaks — between streaks, the curtain is
        // dim. That contrast is what makes a curtain READ as a curtain.
        float rayHigh = fbm(vec2(u * 36.0 + seed * 5.7, v * 9.0 - time * 0.55 + seed));
        float coreStreak = pow(rayHigh, 5.5);

        float rayMid = fbm(vec2(u * 18.0 - seed * 3.1, v * 6.5 - time * 0.32 + seed * 2.1));
        float midStreak = pow(rayMid, 3.0);

        // ── Brightness composition ──────────────────────
        // Body is FAINT — the curtain is mostly dark glass with bright
        // streaks running through it. Coefficients deliberately low
        // because the bloom post-process amplifies bright pixels and
        // bleeds them across the screen; if the body is too bright,
        // bloom paints the whole ground cyan.
        float body = vertEnv * 0.08 * (0.5 + folds * 0.8);
        float streaks = (coreStreak * 0.95 + midStreak * 0.32) * vertEnv * foldBoost;

        // Audio kick.
        float bright = (body + streaks) * (1.0 + energy * 0.18) * endFade;

        // ── Colour ──────────────────────────────────────
        // Vertical hue gradient: vivid lime at base (557 nm), through
        // teal/cyan to violet at the tip. Slow time drift cycles the
        // dominant hue across all ribbons in lockstep.
        float hueShift = time * 0.013 + seed * 0.04;
        vec3 col = auroraPalette(v * 0.85 + 0.04, hueShift);

        // Magenta kiss on the brightest core pixels (630 nm red O — the
        // rare high-altitude tint that gives auroras their pink tips).
        col += vec3(0.40, 0.10, 0.45) * smoothstep(0.65, 0.95, rayHigh) * vertEnv * 0.55;

        // Slight cyan boost in the mid streaks where N₂ ions emit blue.
        col += vec3(0.05, 0.15, 0.30) * smoothstep(0.55, 0.85, rayMid) * vertEnv * 0.3;

        col *= bright;

        // Cap output magnitude so bloom can't blow out the scene.
        // The aurora is meant to be the prettiest thing on screen but
        // not the only thing — bloom kernel 64 will spread bright
        // pixels into adjacent ones if we let RGB exceed ~0.9.
        col = min(col, vec3(0.85));

        // Alpha gates the additive blend so background doesn't smear.
        float alpha = clamp(bright * 1.05, 0.0, 0.72);

        gl_FragColor = vec4(col, alpha);
    }
`;

/** Build a ribbon path: top + bottom arrays of Vector3 along an arc. */
function buildPaths(opts) {
    const { centerYaw, span, segments, distance, height, foldFreq, foldAmp, halfThickness } = opts;
    const top = [];
    const bot = [];
    for (let i = 0; i <= segments; i++) {
        const s = i / segments;
        const yaw = centerYaw + (s - 0.5) * span;
        const x = Math.cos(yaw) * distance;
        const z = Math.sin(yaw) * distance;
        // Vertical undulation — multi-octave so folds at different scales.
        const fold =
            Math.sin(s * Math.PI * foldFreq) * foldAmp +
            Math.sin(s * Math.PI * foldFreq * 2.7 + 1.3) * foldAmp * 0.4 +
            Math.sin(s * Math.PI * foldFreq * 5.3 + 2.7) * foldAmp * 0.18;
        const y = height + fold;
        top.push(new BABYLON.Vector3(x, y + halfThickness, z));
        bot.push(new BABYLON.Vector3(x, y - halfThickness, z));
    }
    return { top, bot };
}

function buildRibbon(scene, name, opts) {
    const { top, bot } = buildPaths(opts);
    const ribbon = BABYLON.MeshBuilder.CreateRibbon(
        name,
        {
            pathArray: [bot, top],
            sideOrientation: BABYLON.Mesh.DOUBLESIDE,
            closeArray: false,
            closePath: false,
        },
        scene
    );

    const mat = new BABYLON.ShaderMaterial(
        `${name}Mat`,
        scene,
        { vertex: 'auroraRibbons', fragment: 'auroraRibbons' },
        {
            attributes: ['position', 'uv'],
            uniforms: ['worldViewProjection', 'world', 'time', 'seed', 'energy'],
            needAlphaBlending: true,
        }
    );
    mat.setFloat('time', 0);
    mat.setFloat('seed', opts.seed);
    mat.setFloat('energy', 0);
    mat.alphaMode = BABYLON.Engine.ALPHA_ADD;
    mat.backFaceCulling = false;
    mat.disableDepthWrite = true;
    mat.forceDepthWrite = false;

    ribbon.material = mat;
    ribbon.renderingGroupId = 1;
    ribbon.isPickable = false;

    meshes.push(ribbon);
    materials.push(mat);
}

export function createAuroraRibbons(scene) {
    BABYLON.Effect.ShadersStore['auroraRibbonsVertexShader'] = VERTEX;
    BABYLON.Effect.ShadersStore['auroraRibbonsFragmentShader'] = FRAGMENT;

    // Three ribbons spread across the sky — the camera yaws slowly
    // through 360° so it always frames at least one curtain. Heights
    // staggered (72/86/95) and distances varied (290/330/380) so they
    // don't read as a single flat band when two are visible together.
    // Thinner than the previous build so the aurora doesn't dominate
    // every pixel of upper sky.
    buildRibbon(scene, 'auroraRibbonA', {
        centerYaw: Math.PI * 0.1,
        span: Math.PI * 0.85,
        segments: 110,
        distance: 320,
        height: 105,
        foldFreq: 5,
        foldAmp: 12,
        halfThickness: 26,
        seed: 3.71,
    });
    buildRibbon(scene, 'auroraRibbonB', {
        centerYaw: Math.PI * 0.78,
        span: Math.PI * 0.78,
        segments: 96,
        distance: 360,
        height: 130,
        foldFreq: 4,
        foldAmp: 14,
        halfThickness: 22,
        seed: 11.3,
    });
    buildRibbon(scene, 'auroraRibbonC', {
        centerYaw: Math.PI * 1.42,
        span: Math.PI * 0.92,
        segments: 100,
        distance: 410,
        height: 145,
        foldFreq: 6,
        foldAmp: 9,
        halfThickness: 24,
        seed: 27.7,
    });
}

export function updateAuroraRibbons(elapsed) {
    if (!materials.length) return;
    const t = elapsed % TIME_WRAP;
    const raw = safeEnergy();
    smoothedEnergy = smoothedEnergy + (raw - smoothedEnergy) * 0.06;
    for (const m of materials) {
        m.setFloat('time', t);
        m.setFloat('energy', smoothedEnergy);
    }
}

function safeEnergy() {
    try {
        return Math.max(0, Math.min(1, getMasterEnergy()));
    } catch (_) {
        return 0;
    }
}

export function disposeAuroraRibbons() {
    for (const m of meshes) m.dispose();
    meshes.length = 0;
    for (const mat of materials) mat.dispose();
    materials.length = 0;
    smoothedEnergy = 0;
}
