// cosmic-skybox.js - Rich cosmic background sphere
// Replaces flat black with a gorgeous gradient sky full of color and depth

let skyMesh = null;
let skyMaterial = null;

// Wrap time before handing it to the shader — unbounded growth eventually
// kills fract() precision in the cloud-noise fbm.
const TIME_WRAP = 4 * 60 * 60;

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

    float starHash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
    }

    // Circular star pinpoint — distance from jittered cell center with exp falloff
    float starLayer(vec2 uv, float gridScale, vec2 offset, float threshold, float sharpness) {
        vec2 scaledUV = uv * gridScale;
        vec2 cellId = floor(scaledUV);
        vec2 cellUV = fract(scaledUV);
        float h = starHash(cellId + offset);
        if (h < threshold) return 0.0;
        vec2 starPos = vec2(
            fract(sin(dot(cellId + offset, vec2(41.1, 73.7))) * 4758.5),
            fract(sin(dot(cellId + offset, vec2(57.3, 113.1))) * 3758.1)
        );
        starPos = clamp(starPos, 0.15, 0.85);
        float d = length(cellUV - starPos);
        return exp(-d * d * sharpness);
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

        // Near-black space
        vec3 zenith = vec3(0.002, 0.002, 0.004);
        vec3 mid = vec3(0.003, 0.004, 0.007);
        vec3 horizonCol = vec3(0.005, 0.005, 0.01);

        vec3 sky = mix(zenith, mid, smoothstep(0.0, 0.5, horizon));
        sky = mix(sky, horizonCol, smoothstep(0.5, 1.0, horizon));

        // Very subtle cloud variation
        float cloudNoise = fbm(vec2(phi * 2.0 + t, theta * 1.5) * 1.5);
        sky += vec3(0.003, 0.004, 0.008) * smoothstep(0.3, 0.7, cloudNoise) * 0.3;

        // Very faint blue-white region
        float brightRegion = exp(-pow(dir.x - 0.1, 2.0) * 3.0 - pow(dir.y - 0.6, 2.0) * 5.0);
        sky += vec3(0.01, 0.015, 0.025) * brightRegion * 0.3;

        // === BACKGROUND STARS — circular pinpoints via cell-center distance ===
        sky += vec3(0.3, 0.33, 0.42) * starLayer(uv, 2000.0, vec2(73.1, 419.3), 0.997, 800.0) * 0.3;
        sky += vec3(0.5, 0.55, 0.65) * starLayer(uv, 1400.0, vec2(0.0, 0.0), 0.9975, 500.0) * 0.45;
        sky += vec3(0.7, 0.75, 0.85) * starLayer(uv, 900.0, vec2(127.1, 311.7), 0.998, 350.0) * 0.6;

        float s3val = starLayer(uv, 500.0, vec2(269.5, 183.3), 0.9985, 200.0);
        vec2 grid3id = floor(uv * 500.0);
        vec3 starCol3 = mix(vec3(0.8, 0.85, 1.0), vec3(1.0, 0.9, 0.75), starHash(grid3id + vec2(50.0)));
        sky += starCol3 * s3val * 0.75;

        // Very subtle depth haze at horizon
        float hazeAmount = pow(horizon, 3.0) * 0.02;
        sky += vec3(0.008, 0.01, 0.02) * hazeAmount;

        gl_FragColor = vec4(sky, 1.0);
    }
`;

export function createCosmicSkybox(scene) {

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

    return skyMesh;
}

export function updateCosmicSkybox(elapsed) {
    if (skyMaterial) skyMaterial.setFloat('time', elapsed % TIME_WRAP);
}

export function disposeCosmicSkybox() {
    if (skyMesh) { skyMesh.dispose(); skyMesh = null; }
    if (skyMaterial) { skyMaterial.dispose(); skyMaterial = null; }
}
