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

        // === VERY SUBTLE dark cloud variation — breaks up flat black ===
        float cloudNoise = fbm(vec2(phi * 2.0 + t, theta * 1.5) * 1.5);
        sky += vec3(0.008, 0.005, 0.015) * smoothstep(0.3, 0.7, cloudNoise) * 0.5;

        // No embedded stars — the 3D SPS stars handle all star rendering
        // This keeps the skybox clean and smooth

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
