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

        // ── Snow palette ───────────────────────────────────
        // Night-snow under aurora reads as a deep blue surface, NOT
        // white. The previous build's bright palette competed with
        // the aurora curtain. These values are tuned for the bloom +
        // ACES tone-map pipeline — they look right *after* tone-map.
        vec3 snowShadow = vec3(0.008, 0.014, 0.030);     // valley / steep slope
        vec3 snowMid    = vec3(0.020, 0.038, 0.068);     // typical surface
        vec3 snowLit    = vec3(0.045, 0.075, 0.118);     // crests catching aurora

        vec3 snow = mix(snowShadow, snowMid, smoothstep(0.4, 0.85, upDot));
        snow = mix(snow, snowLit, smoothstep(0.85, 0.99, upDot));

        // ── Aurora reflection ──────────────────────────────
        // Only the actual dune CRESTS catch detectable aurora light,
        // and only within ~80 units of the eye — past that, distance
        // fog has already blended the ground toward the horizon
        // colour, so reflection adds nothing but bloom artefacts.
        float crestNoise = fbm(vWorld.xz * 0.13);
        float crestMask = smoothstep(0.66, 0.86, crestNoise) * pow(upDot, 3.5);
        // Distance gate: reflect strongly only nearby; falls to zero
        // by 90 units (where mountains start to dominate the view).
        float nearGate = 1.0 - smoothstep(20.0, 90.0, vDistFromEye);
        vec3 reflect = auroraColor * crestMask * nearGate * 0.16;

        // ── Sparkle ────────────────────────────────────────
        // Rare bright glints on actual crests, near-eye only.
        vec2 sparklePos = vWorld.xz * 9.0 + vec2(time * 0.04, 0.0);
        float sparkle = step(0.996, hash(floor(sparklePos)));
        sparkle *= crestMask * nearGate * (0.9 + 0.4 * sin(time * 3.0 + hash(floor(sparklePos)) * 6.28));

        // ── Distance fog ───────────────────────────────────
        // Soft haze that pulls the far plain toward the deep-navy
        // horizon line. Fog colour deliberately VERY dark — bloom
        // amplifies bright pixels, so a teal fog colour would bleed
        // cyan across the whole lower half of the screen. A near-
        // black horizon makes the aurora curtain visually dominant.
        float fog = 1.0 - exp(-vDistFromEye * 0.0058);
        fog = clamp(fog, 0.0, 0.92);

        // Compose
        vec3 col = snow + reflect;
        col += vec3(sparkle * 0.5, sparkle * 0.65, sparkle * 0.85);

        // Fog blends to deep navy — same colour the sky shader uses
        // at the horizon line, so no visible seam.
        vec3 fogColor = vec3(0.006, 0.014, 0.028);
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
