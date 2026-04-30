// aurora-terrain.js — real 3D snow plain.
//
// Replaces the flat disc that made the original Aurora Plain read as
// painted-on. This is an actual subdivided ground mesh with vertex
// displacement — the snow has REAL dunes, drifts, and surface texture
// the camera can see in three dimensions as it pans.
//
// The mesh is a 1200×1200 ground tile centered on the camera-area
// origin (the eye sits near 0,5,0 by aurora-camera.js). 384×384
// subdivisions give ~3-unit triangles right under the eye and tens-of-
// units triangles at the far edge — fine enough that displacement
// reads as continuous terrain, coarse enough to stay GPU-cheap.
//
// Vertex shader: stacked fbm carves dunes, ridges, and surface ripple.
// Fragment shader: snow colour + slope-based shadowing + aurora-tinted
// reflection on up-facing slopes + distance fog that fades to the
// horizon's teal/black palette so the ground meets the mountains
// without a hard line.

let mesh = null;
let material = null;

const TIME_WRAP = 4 * 60 * 60;

const VERTEX = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    uniform mat4 world;
    uniform float time;

    varying vec3 vWorld;
    varying vec3 vNormal;
    varying float vHeight;
    varying float vDistFromEye;

    // ── Noise ──────────────────────────────────────────────
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

    // Composite terrain height — three octave bands stacked. Returned
    // value is in world-units of vertical displacement.
    float terrainH(vec2 xz) {
        // Big rolling dunes — slow change across hundreds of units.
        float dunes = fbm(xz * 0.0085) * 14.0;
        // Medium drifts — sharper edges where wind has piled snow.
        float drifts = pow(fbm(xz * 0.045), 1.4) * 3.5;
        // Surface ripple — the small undulation of a fresh snow surface.
        float ripple = fbm(xz * 0.22) * 0.45;
        // Faint long-period swell.
        float swell = sin(xz.x * 0.012) * cos(xz.y * 0.014) * 0.6;
        return dunes + drifts + ripple + swell;
    }

    void main() {
        vec3 p = position;
        float h = terrainH(p.xz);
        p.y += h;

        // Compute normal via finite differences against the same
        // displacement function — gives real lit slopes.
        float eps = 0.6;
        float hL = terrainH(p.xz + vec2(-eps, 0.0));
        float hR = terrainH(p.xz + vec2( eps, 0.0));
        float hD = terrainH(p.xz + vec2(0.0, -eps));
        float hU = terrainH(p.xz + vec2(0.0,  eps));
        vec3 normal = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));

        vec4 wp = world * vec4(p, 1.0);
        vWorld = wp.xyz;
        vNormal = normal;
        vHeight = h;
        // Eye is held at (0,5,0) by aurora-camera; cheap proxy distance.
        vDistFromEye = length(wp.xz);

        gl_Position = worldViewProjection * vec4(p, 1.0);
    }
`;

const FRAGMENT = `
    precision highp float;
    varying vec3 vWorld;
    varying vec3 vNormal;
    varying float vHeight;
    varying float vDistFromEye;

    uniform float time;
    uniform vec3 auroraColor;     // dominant aurora hue (pulses with the curtains)

    float hash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
    }
    float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
        return mix(
            mix(hash(i),                  hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
        );
    }
    float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
        }
        return v;
    }

    void main() {
        vec3 N = normalize(vNormal);
        float upDot = clamp(N.y, 0.0, 1.0);

        // ── Ice palette ────────────────────────────────────
        // Reflective frozen surface under aurora light — slightly
        // brighter than the previous nighttime palette so the
        // aurora wash has somewhere to register. Still firmly
        // nighttime (no white anywhere) but brings the foreground
        // into the same luminance range as the upper sky.
        vec3 iceShadow = vec3(0.018, 0.030, 0.060);
        vec3 iceMid    = vec3(0.035, 0.062, 0.108);
        vec3 iceLit    = vec3(0.080, 0.128, 0.185);

        vec3 ice = mix(iceShadow, iceMid, smoothstep(0.35, 0.80, upDot));
        ice = mix(ice, iceLit, smoothstep(0.80, 0.99, upDot));

        // ── Broad aurora wash ──────────────────────────────
        // The ice picks up a clear aurora cast like reflective water
        // mirroring the sky overhead. Stronger than the previous
        // build so the foreground reads as brighter ice rather than
        // dim navy snow. Modulated by mid-frequency noise for a
        // varied "wet" surface look.
        float washNoise = 0.5 + 0.5 * fbm(vWorld.xz * 0.025);
        float washNear = 1.0 - smoothstep(0.0, 280.0, vDistFromEye);
        vec3 broadWash = auroraColor * washNear * washNoise * 0.18 * pow(upDot, 1.0);

        // ── Streak reflection ──────────────────────────────
        // Vertical-ish noise pattern mimicking the aurora's ray
        // structure being reflected onto the ice. Sampled with HIGH
        // u (cross-foreground) frequency and LOW v (depth) frequency
        // so features run away from the eye as a "mirror" shimmer.
        // A bare hint compared to the curtain itself but enough to
        // sell the reflective foreground.
        vec2 streakUV = vWorld.xz * 0.045 + vec2(0.0, time * 0.04);
        float streak = fbm(vec2(streakUV.x * 4.0, streakUV.y * 0.8));
        float streakMask = smoothstep(0.42, 0.78, streak) * pow(upDot, 1.4);
        float streakNear = 1.0 - smoothstep(0.0, 200.0, vDistFromEye);
        vec3 streakReflect = auroraColor * streakMask * streakNear * 0.18;

        // ── Crest reflection ───────────────────────────────
        // Dune ridges catch the strongest aurora light — read as
        // bright "ribs" running across the foreground.
        float crestNoise = fbm(vWorld.xz * 0.12);
        float crestMask = smoothstep(0.55, 0.85, crestNoise) * pow(upDot, 2.4);
        float crestNear = 1.0 - smoothstep(15.0, 170.0, vDistFromEye);
        vec3 crestReflect = auroraColor * crestMask * crestNear * 0.42;

        // ── Sparkle ────────────────────────────────────────
        vec2 sparklePos = vWorld.xz * 9.0 + vec2(time * 0.04, 0.0);
        float sparkle = step(0.990, hash(floor(sparklePos)));
        sparkle *= crestMask * crestNear * (0.9 + 0.4 * sin(time * 3.0 + hash(floor(sparklePos)) * 6.28));

        // ── Distance fog ───────────────────────────────────
        float fog = 1.0 - exp(-vDistFromEye * 0.0048);
        fog = clamp(fog, 0.0, 0.92);

        vec3 col = ice + broadWash + streakReflect + crestReflect;
        col += vec3(sparkle * 0.85, sparkle * 1.10, sparkle * 1.30);

        vec3 fogColor = vec3(0.012, 0.026, 0.048);
        col = mix(col, fogColor, fog);

        gl_FragColor = vec4(col, 1.0);
    }
`;

export function createAuroraTerrain(scene) {
    BABYLON.Effect.ShadersStore['auroraTerrainVertexShader'] = VERTEX;
    BABYLON.Effect.ShadersStore['auroraTerrainFragmentShader'] = FRAGMENT;

    material = new BABYLON.ShaderMaterial(
        'auroraTerrainMat',
        scene,
        { vertex: 'auroraTerrain', fragment: 'auroraTerrain' },
        {
            attributes: ['position', 'uv'],
            uniforms: ['worldViewProjection', 'world', 'time', 'auroraColor'],
        }
    );
    material.setFloat('time', 0);
    material.setColor3('auroraColor', new BABYLON.Color3(0.18, 0.78, 0.55));
    material.backFaceCulling = false;

    // Wide, finely-subdivided ground. 1200 × 1200 covers the visible
    // landscape; 384 subdivisions yields ~3-unit triangles at the eye
    // and progressively coarser ones at the far edge — comfortable on
    // mid-range GPUs, smooth at the eye.
    mesh = BABYLON.MeshBuilder.CreateGround(
        'auroraTerrain',
        { width: 1200, height: 1200, subdivisions: 384 },
        scene
    );
    mesh.position.y = 0;
    mesh.material = material;
    mesh.renderingGroupId = 0;
    mesh.isPickable = false;
    // Receive shadows aren't relevant here (no shadow caster).
    return mesh;
}

/** Update the dominant aurora colour each frame so terrain reflection
 *  pulses in sync with the curtains. Called from the registry. */
export function updateAuroraTerrain(elapsed) {
    if (!material) return;
    material.setFloat('time', elapsed % TIME_WRAP);

    // Cycle a dominant aurora hue at the same period as the curtains'
    // hue cycle. Real auroras: green → teal → cyan → violet → magenta.
    const cycle = (elapsed * 0.013) % 1;
    let r;
    let g;
    let b;
    if (cycle < 0.25) {
        const k = cycle / 0.25;
        r = 0.1 + (0.1 - 0.1) * k;
        g = 0.85 + (0.95 - 0.85) * k;
        b = 0.45 + (0.7 - 0.45) * k;
    } else if (cycle < 0.5) {
        const k = (cycle - 0.25) / 0.25;
        r = 0.1 + (0.3 - 0.1) * k;
        g = 0.95 + (0.8 - 0.95) * k;
        b = 0.7 + (1.0 - 0.7) * k;
    } else if (cycle < 0.75) {
        const k = (cycle - 0.5) / 0.25;
        r = 0.3 + (0.55 - 0.3) * k;
        g = 0.8 + (0.4 - 0.8) * k;
        b = 1.0 + (1.0 - 1.0) * k;
    } else {
        const k = (cycle - 0.75) / 0.25;
        r = 0.55 + (1.0 - 0.55) * k;
        g = 0.4 + (0.45 - 0.4) * k;
        b = 1.0 + (0.85 - 1.0) * k;
    }
    material.getEffect()?.setFloat3('auroraColor', r, g, b);
}

export function disposeAuroraTerrain() {
    if (mesh) {
        mesh.dispose();
        mesh = null;
    }
    if (material) {
        material.dispose();
        material = null;
    }
}
