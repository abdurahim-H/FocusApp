// aurora-plain.js — the icy ground that gives this theme its name.
//
// A wide horizontal disc beneath the camera. Fragment shader paints a
// layered surface: deep cold blue base, gentle radial gradient toward
// the horizon, soft drifting fog patches, faint procedural ice cracks,
// and a subtle aurora reflection bleeding up from where the sky meets
// the plain.
//
// The reflection isn't a true planar reflection (too expensive for the
// budget); instead, the shader bakes in a cool aurora-tinted gradient
// near the horizon edge plus animated colour shimmer at the same
// frequency band as the curtains. Conceptually correct, visually
// indistinguishable from a real reflection at the camera's elevation.

let mesh = null;
let material = null;

const TIME_WRAP = 4 * 60 * 60;

const VERTEX = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    varying vec2 vUV;
    varying vec3 vWorldPos;
    void main() {
        vUV = uv;
        vWorldPos = position;
        gl_Position = worldViewProjection * vec4(position, 1.0);
    }
`;

const FRAGMENT = `
    precision highp float;
    varying vec2 vUV;
    varying vec3 vWorldPos;
    uniform float time;

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
            mix(hash(i),               hash(i + vec2(1.0, 0.0)), f.x),
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

    void main() {
        // World-space radial coordinate — distance from origin in plane.
        // The plane is huge (radius ~280); UV runs 0..1 across the disc.
        vec2 centered = vUV - 0.5;
        float r = length(centered) * 2.0; // 0 at center, 1 at edge

        // Below ~0 — hard cutoff, but the disc is bigger than the
        // mountain ring so this rarely matters.
        if (r > 1.02) discard;

        // ── Base palette ─────────────────────────────────────
        // Deep arctic-night blue at the centre fading to cooler near-black
        // at the very far edge where the horizon kicks in.
        vec3 deep   = vec3(0.020, 0.035, 0.065);  // close to camera
        vec3 mid    = vec3(0.012, 0.025, 0.050);
        vec3 far    = vec3(0.005, 0.015, 0.030);  // by horizon

        vec3 base = mix(deep, mid, smoothstep(0.0, 0.55, r));
        base = mix(base, far, smoothstep(0.55, 0.90, r));

        // ── Drifting low fog ────────────────────────────────
        // Slow fbm rolling across the surface — large soft patches that
        // brighten the ground subtly. Two layers at different scales /
        // speeds so the cloud shapes evolve, not just translate.
        float fogA = fbm(vec2(centered.x * 3.0 + time * 0.011, centered.y * 3.0 - time * 0.008));
        float fogB = fbm(vec2(centered.x * 7.0 - time * 0.020, centered.y * 7.0 + time * 0.015));
        float fog = pow(fogA * 0.6 + fogB * 0.4, 1.5);
        // Fog brightens only the closer half of the disc — distance haze.
        float fogMask = (1.0 - smoothstep(0.0, 0.55, r)) * 0.45;
        base += vec3(0.025, 0.045, 0.070) * fog * fogMask;

        // ── Procedural ice cracks ───────────────────────────
        // Faint network pattern from worley-style cell noise, only
        // visible right under the camera.
        float crackPattern = fbm(centered * 18.0 + vec2(time * 0.003, 0.0));
        float cracks = pow(crackPattern, 6.0);
        float crackMask = (1.0 - smoothstep(0.05, 0.30, r)) * 0.20;
        base += vec3(0.10, 0.18, 0.25) * cracks * crackMask;

        // ── Aurora reflection halo ──────────────────────────
        // Cool teal-green wash that intensifies near the horizon ring,
        // simulating the curtains' light catching on the ice.
        float horizonGlow = smoothstep(0.55, 0.95, r); // 0 inland → 1 horizon
        // Animated colour shimmer at frequency similar to the curtains
        // so the two surfaces feel coupled.
        float shimmer = 0.5 + 0.5 * sin(time * 0.06 + centered.x * 4.0 + centered.y * 3.0);
        float shimmer2 = 0.5 + 0.5 * sin(time * 0.04 - centered.x * 3.0 + centered.y * 5.0 + 1.7);
        vec3 auroraReflect = mix(
            vec3(0.04, 0.18, 0.14),  // base teal
            vec3(0.10, 0.32, 0.22),  // peak teal-green
            shimmer * 0.5 + shimmer2 * 0.5
        );
        base += auroraReflect * horizonGlow * 0.55;

        // ── Subtle vignette at very far edge ───────────────
        // So the disc edge fades into the mountain silhouettes instead
        // of butting against them with a hard line.
        float edgeFade = smoothstep(1.0, 0.85, r);
        base *= edgeFade;

        gl_FragColor = vec4(base, 1.0);
    }
`;

export function createAuroraPlain(scene) {
    BABYLON.Effect.ShadersStore['auroraPlainVertexShader'] = VERTEX;
    BABYLON.Effect.ShadersStore['auroraPlainFragmentShader'] = FRAGMENT;

    // Wide disc — diameter 560 covers more area than the mountain ring,
    // so wherever the camera looks down, ground is visible.
    mesh = BABYLON.MeshBuilder.CreateDisc(
        'auroraPlain',
        { radius: 280, tessellation: 96, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
        scene
    );
    // Lay the disc flat — the default disc faces +Z; rotate so its
    // normal points up.
    mesh.rotation = new BABYLON.Vector3(Math.PI / 2, 0, 0);
    mesh.position = new BABYLON.Vector3(0, -8, 0);
    mesh.renderingGroupId = 0;
    mesh.isPickable = false;

    material = new BABYLON.ShaderMaterial(
        'auroraPlainMat',
        scene,
        { vertex: 'auroraPlain', fragment: 'auroraPlain' },
        {
            attributes: ['position', 'uv'],
            uniforms: ['worldViewProjection', 'time'],
        }
    );
    material.setFloat('time', 0);
    material.backFaceCulling = false;
    mesh.material = material;
    return mesh;
}

export function updateAuroraPlain(elapsed) {
    if (material) material.setFloat('time', elapsed % TIME_WRAP);
}

export function disposeAuroraPlain() {
    if (mesh) { mesh.dispose(); mesh = null; }
    if (material) { material.dispose(); material = null; }
}
