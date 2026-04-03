// cosmic-skybox.js - Rich cosmic background sphere
// Replaces flat black with a gorgeous gradient sky full of color and depth

let skyMesh = null;
let skyMaterial = null;

const VERTEX = `
    precision highp float;
    attribute vec3 position;
    attribute vec3 normal;
    uniform mat4 worldViewProjection;
    varying vec3 vPosition;
    void main() {
        vPosition = normalize(position);
        gl_Position = worldViewProjection * vec4(position, 1.0);
    }
`;

const FRAGMENT = `
    precision highp float;
    varying vec3 vPosition;
    uniform float time;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(hash(i), hash(i + vec2(1,0)), f.x),
            mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
            f.y
        );
    }

    float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        mat2 rot = mat2(0.87, 0.48, -0.48, 0.87);
        for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p = rot * p * 2.0 + vec2(100.0);
            a *= 0.5;
        }
        return v;
    }

    void main() {
        vec3 dir = normalize(vPosition);
        float t = time * 0.015;

        // Spherical UV
        float phi = atan(dir.z, dir.x);
        float theta = acos(dir.y);
        vec2 uv = vec2(phi / 6.2831 + 0.5, theta / 3.1415);

        // === BASE GRADIENT — deep black with subtle warmth ===
        float horizon = 1.0 - abs(dir.y);
        horizon = pow(horizon, 4.0);

        // Deep dark blue-teal — like the reference starfield
        vec3 zenith = vec3(0.008, 0.01, 0.02);      // Deep navy
        vec3 mid = vec3(0.012, 0.015, 0.028);        // Dark blue-teal
        vec3 horizonCol = vec3(0.02, 0.022, 0.04);   // Slightly lighter at horizon

        vec3 sky = mix(zenith, mid, smoothstep(0.0, 0.5, horizon));
        sky = mix(sky, horizonCol, smoothstep(0.5, 1.0, horizon));

        // Subtle cloud variation — breaks up flat sky
        float cloudNoise = fbm(vec2(phi * 2.0 + t, theta * 1.5) * 1.5);
        sky += vec3(0.01, 0.012, 0.025) * smoothstep(0.3, 0.7, cloudNoise) * 0.5;

        // Bright blue-white region — upper area, contrasts with gold
        float brightRegion = exp(-pow(dir.x - 0.1, 2.0) * 3.0 - pow(dir.y - 0.6, 2.0) * 5.0);
        sky += vec3(0.04, 0.06, 0.1) * brightRegion * 0.6;

        // === EMBEDDED BACKGROUND STARS — thousands of static pinpoints ===
        // Zero geometry cost — pure shader. These are the dense "wallpaper" of tiny stars
        // that fill the sky behind the 3D SPS stars.

        // Hash function for star placement
        float starHash(vec2 p) {
            vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
            p3 += dot(p3, p3.yzx + 33.33);
            return fract((p3.x + p3.y) * p3.z);
        }

        // Layer 0 — ultra-dense dust of stars, barely visible (~12000)
        vec2 grid0 = floor(uv * 800.0);
        float s0 = starHash(grid0 + vec2(73.1, 419.3));
        float star0 = step(0.981, s0);
        float bright0 = (s0 - 0.981) / 0.019;
        sky += vec3(0.35, 0.38, 0.48) * star0 * bright0 * 0.2;

        // Layer 1 — dense faint pinpoints (~8000)
        vec2 grid1 = floor(uv * 550.0);
        float s1 = starHash(grid1);
        float star1 = step(0.984, s1);
        float bright1 = (s1 - 0.984) / 0.016;
        sky += vec3(0.5, 0.55, 0.65) * star1 * bright1 * 0.35;

        // Layer 2 — medium density, brighter (~3000)
        vec2 grid2 = floor(uv * 350.0);
        float s2 = starHash(grid2 + vec2(127.1, 311.7));
        float star2 = step(0.990, s2);
        float bright2 = (s2 - 0.990) / 0.010;
        sky += vec3(0.7, 0.75, 0.85) * star2 * bright2 * 0.55;

        // Layer 3 — sparse, brightest background stars (~800)
        vec2 grid3 = floor(uv * 180.0);
        float s3 = starHash(grid3 + vec2(269.5, 183.3));
        float star3 = step(0.994, s3);
        float bright3 = (s3 - 0.994) / 0.006;
        vec3 starCol3 = mix(vec3(0.8, 0.85, 1.0), vec3(1.0, 0.9, 0.75), starHash(grid3 + vec2(50.0)));
        sky += starCol3 * star3 * bright3 * 0.75;

        gl_FragColor = vec4(sky, 1.0);
    }
`;

export function createCosmicSkybox(scene) {
    console.log('🌌 Creating cosmic skybox...');

    BABYLON.Effect.ShadersStore['cosmicSkyVertexShader'] = VERTEX;
    BABYLON.Effect.ShadersStore['cosmicSkyFragmentShader'] = FRAGMENT;

    // Large inverted sphere
    skyMesh = BABYLON.MeshBuilder.CreateSphere('cosmicSky', {
        diameter: 1800,
        segments: 32,
        sideOrientation: BABYLON.Mesh.BACKSIDE // Render inside faces
    }, scene);

    skyMesh.renderingGroupId = 0;
    skyMesh.infiniteDistance = true; // Stays at camera position
    skyMesh.isPickable = false;

    skyMaterial = new BABYLON.ShaderMaterial('cosmicSkyMat', scene, {
        vertex: 'cosmicSky',
        fragment: 'cosmicSky'
    }, {
        attributes: ['position', 'normal'],
        uniforms: ['worldViewProjection', 'time']
    });

    skyMaterial.setFloat('time', 0);
    skyMaterial.backFaceCulling = false;
    skyMaterial.disableDepthWrite = true;

    skyMesh.material = skyMaterial;

    console.log('   ✓ Cosmic skybox created');
    return skyMesh;
}

export function updateCosmicSkybox(elapsed) {
    if (skyMaterial) skyMaterial.setFloat('time', elapsed);
}

export function disposeCosmicSkybox() {
    if (skyMesh) { skyMesh.dispose(); skyMesh = null; }
    if (skyMaterial) { skyMaterial.dispose(); skyMaterial = null; }
}
