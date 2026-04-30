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
        // Strip is 800 units tall — most of it sits in the visible
        // upper sky. Bright PLATEAU between v=0.20 and v=0.55 covers
        // elevations ~16°-32° (the band above the mountain ridge that
        // fills the upper third of the frame). Soft fade below
        // (v < 0.20) carries the curtain bottom into the mountain-
        // occluded region; soft fade above (v > 0.55) tapers the
        // violet/magenta tip toward zenith.
        float baseFade = smoothstep(0.0, 0.20, v);
        float topFade  = smoothstep(1.0, 0.55, v);
        float vertEnv = baseFade * topFade;

        // ── Path-end feathering ─────────────────────────
        float endFade = smoothstep(0.0, 0.08, u) * smoothstep(1.0, 0.92, u);

        // ── Curtain folds (slow, large) ─────────────────
        // Lateral undulation gives the curtain visible "knees" where
        // folds catch more light. Higher fold contrast pushes the
        // dramatic sweeping look from the reference.
        float folds = fbm(vec2(u * 4.5 + seed * 0.3, time * 0.045));
        float foldBoost = 0.45 + folds * 1.40;

        // ── Vertical rays (the signature feature) ───────
        // Aurora rays appear as thin vertical streaks descending from
        // the green band. HIGH u frequency = fine horizontal detail
        // between adjacent rays; MEDIUM v frequency = each ray
        // brightens and fades along its length so they don't read as
        // uniform vertical bars. Slow time scroll moves the rays
        // sideways so the curtain breathes across the sky over
        // minutes of viewing.
        float rayHigh = fbm(vec2(u * 130.0 + seed * 5.7 + time * 0.04, v * 3.5 + seed));
        float coreStreak = smoothstep(0.42, 0.88, rayHigh);

        float rayMid  = fbm(vec2(u * 65.0 - seed * 3.1 + time * 0.025, v * 2.8 + seed * 2.1));
        float midStreak = smoothstep(0.38, 0.82, rayMid);

        float rayLow  = fbm(vec2(u * 28.0 + seed * 1.7 + time * 0.015, v * 2.0 + seed * 0.5));
        float lowWash  = smoothstep(0.30, 0.78, rayLow);

        // ── Brightness composition ──────────────────────
        // Body is the broad glow that establishes the curtain shape;
        // streaks paint the dramatic vertical structure on top. Six
        // ribbons can overlap so per-ribbon coefficients are kept
        // modest — the bloom kernel will spread overlap into white
        // blobs otherwise.
        float body = vertEnv * (0.10 + lowWash * 0.32) * foldBoost;
        float streaks = (coreStreak * 0.70 + midStreak * 0.40) * vertEnv * foldBoost;

        // Audio kick.
        float bright = (body + streaks) * (1.0 + energy * 0.22) * endFade;

        // ── Colour ──────────────────────────────────────
        // Vertical hue gradient: green at base (557 nm O₂), teal/cyan
        // mid (N₂ blue), violet/magenta at tip (N₂-ion 427 nm + 630 nm
        // O red). The palette samples 60% of its full range so each
        // curtain reads as predominantly green with a violet tip
        // rather than a rainbow stripe. Slow hue drift cycles the
        // dominant cast over time.
        float hueShift = time * 0.010 + seed * 0.04;
        vec3 col = auroraPalette(v * 0.62 + 0.04, hueShift);

        // Bright magenta kiss on the highest-density ray pixels.
        col += vec3(0.55, 0.18, 0.75) * smoothstep(0.62, 0.95, rayHigh) * vertEnv * 0.85;

        // Cyan/teal boost in the mid-altitude rays.
        col += vec3(0.10, 0.30, 0.45) * smoothstep(0.50, 0.85, rayMid) * vertEnv * 0.55;

        // Strong green pulse at the base — drives home the 557 nm
        // dominance that real auroras have.
        col += vec3(0.20, 0.85, 0.35) * smoothstep(0.30, 0.0, v) * (0.55 + folds * 0.5);

        col *= bright;

        // Solid green base band — the dominant 557 nm O₂ emission.
        // Vivid saturation but balanced against bloom: G/B are kept
        // close so the band reads as warm green-teal rather than the
        // pure-green that overwhelms after bloom; R is suppressed.
        float greenBand = exp(-pow((v - 0.26) * 7.0, 2.0));
        col += vec3(0.05, 0.42, 0.18) * greenBand * vertEnv * (0.55 + folds * 0.45) * endFade;

        // Per-channel cap. Three ribbons can stack from a single
        // camera pose; with cap 0.32 the worst-case stacked sum is
        // 0.96 — bright but ACES tone-maps cleanly without a white
        // blowout. The aurora theme also raises the bloom threshold
        // to 0.95 so only the rare overlap peak gets bloomed.
        col = min(col, vec3(0.32));

        float alpha = clamp(bright * 1.05 + greenBand * vertEnv * 0.30 * endFade, 0.0, 0.85);

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

    // SIX tall ribbons spread across the sky. Each curtain is now a
    // full vertical sheet (halfThickness 140-200) descending from high
    // zenith almost to the horizon, so the camera frames a wall of
    // aurora rather than a thin horizontal stripe. Distances 480-820
    // place them BEYOND the far mountain ring so the silhouette reads
    // against bright aurora. Heights center around 220-300 so the
    // curtain top reaches near zenith and the bottom dips below
    // the mountain peaks (where it gets occluded — that's correct,
    // matches the reference where aurora "hides" behind the ridge).
    // Two layers per ~third of the sky — a near + far pair so two
    // ribbon depths overlap when the camera looks that direction
    // (the reference's "stacked curtain" look). Bottoms reach down to
    // y ≈ 40-60 so the curtains extend toward the mountain ridge,
    // tops to y ≈ 420-500 so they sweep up into near-zenith.
    // Ribbons positioned so the bright zone (~ v=0.18 of strip) sits
    // around 22-28° elevation — comfortably above the tallest
    // mountain peaks (~18°) so the silhouette reads cleanly against
    // bright aurora. Strip extends from ~12° (lower fade) to ~42°
    // (upper fade) elevation, filling the upper third of frame the
    // way the reference does.
    // Six tall vertical curtains, spaced at 60° azimuth intervals
    // and each spanning ~70° so adjacent ribbons share a small
    // 10° overlap (gives a soft seam, never a hard tile boundary).
    // Strip is ~800 units tall (halfThickness 400) centred ~y=480-
    // 560 so the bright zone sits above the mountain ridge and
    // extends up to near zenith.
    const baseSpan = Math.PI * 0.34; // ~61° — almost no overlap
    buildRibbon(scene, 'auroraRibbonA', {
        centerYaw: 0,
        span: baseSpan,
        segments: 130,
        distance: 760,
        height: 470,
        foldFreq: 5,
        foldAmp: 60,
        halfThickness: 400,
        seed: 3.71,
    });
    buildRibbon(scene, 'auroraRibbonB', {
        centerYaw: Math.PI * (1 / 3),
        span: baseSpan,
        segments: 116,
        distance: 880,
        height: 520,
        foldFreq: 4,
        foldAmp: 70,
        halfThickness: 440,
        seed: 11.3,
    });
    buildRibbon(scene, 'auroraRibbonC', {
        centerYaw: Math.PI * (2 / 3),
        span: baseSpan,
        segments: 120,
        distance: 950,
        height: 555,
        foldFreq: 6,
        foldAmp: 52,
        halfThickness: 460,
        seed: 27.7,
    });
    buildRibbon(scene, 'auroraRibbonD', {
        centerYaw: Math.PI,
        span: baseSpan,
        segments: 124,
        distance: 1020,
        height: 600,
        foldFreq: 5,
        foldAmp: 56,
        halfThickness: 430,
        seed: 41.2,
    });
    buildRibbon(scene, 'auroraRibbonE', {
        centerYaw: Math.PI * (4 / 3),
        span: baseSpan,
        segments: 120,
        distance: 820,
        height: 490,
        foldFreq: 4,
        foldAmp: 64,
        halfThickness: 410,
        seed: 53.9,
    });
    buildRibbon(scene, 'auroraRibbonF', {
        centerYaw: Math.PI * (5 / 3),
        span: baseSpan,
        segments: 120,
        distance: 920,
        height: 540,
        foldFreq: 5,
        foldAmp: 56,
        halfThickness: 450,
        seed: 67.4,
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
