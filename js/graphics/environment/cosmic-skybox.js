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

        // === BASE GRADIENT — deep rich space ===
        // Vertical: dark at top/bottom, slightly brighter at horizon
        float horizon = 1.0 - abs(dir.y);
        horizon = pow(horizon, 3.0);

        // Base deep colors
        vec3 zenith = vec3(0.01, 0.005, 0.03);    // Nearly black with purple hint
        vec3 mid = vec3(0.015, 0.01, 0.05);        // Deep indigo
        vec3 horizonCol = vec3(0.03, 0.02, 0.07);  // Subtle purple glow at horizon

        vec3 sky = mix(zenith, mid, smoothstep(0.0, 0.5, horizon));
        sky = mix(sky, horizonCol, smoothstep(0.5, 1.0, horizon));

        // === MILKY WAY BAND ===
        // Create a band of light across the sky
        float milkyAngle = phi * 0.5 + theta * 0.8;
        float milkyBand = exp(-pow(dir.y - 0.1, 2.0) * 8.0); // Horizontal-ish band
        float milkyNoise = fbm(vec2(phi * 3.0 + t, theta * 2.0) * 2.0);
        float milkyDetail = fbm(vec2(phi * 8.0 - t * 0.5, theta * 5.0) * 1.5);

        vec3 milkyColor1 = vec3(0.06, 0.03, 0.12);  // Deep purple
        vec3 milkyColor2 = vec3(0.03, 0.05, 0.12);   // Deep blue
        vec3 milkyColor3 = vec3(0.08, 0.02, 0.06);   // Dark magenta

        vec3 milky = mix(milkyColor1, milkyColor2, milkyNoise);
        milky = mix(milky, milkyColor3, milkyDetail * 0.5);
        sky += milky * milkyBand * (0.6 + milkyNoise * 0.5);

        // === NEBULA WISPS — scattered colored clouds ===
        // Wisp 1: Purple/violet region
        vec2 warpUV1 = uv * 3.0 + vec2(t * 0.2, -t * 0.1);
        float wisp1 = fbm(warpUV1);
        wisp1 = smoothstep(0.45, 0.75, wisp1);
        float wisp1Mask = smoothstep(0.3, 0.0, abs(dir.y - 0.2)) * smoothstep(0.0, 0.3, abs(dir.x + 0.3));
        sky += vec3(0.08, 0.02, 0.14) * wisp1 * wisp1Mask;

        // Wisp 2: Teal/cyan subtle region
        vec2 warpUV2 = uv * 2.5 + vec2(-t * 0.15, t * 0.25);
        float wisp2 = fbm(warpUV2 + 50.0);
        wisp2 = smoothstep(0.5, 0.78, wisp2);
        float wisp2Mask = smoothstep(0.3, 0.0, abs(dir.y + 0.1)) * smoothstep(0.0, 0.4, abs(dir.z - 0.2));
        sky += vec3(0.02, 0.06, 0.10) * wisp2 * wisp2Mask;

        // Wisp 3: Warm rose hint
        vec2 warpUV3 = uv * 2.0 + vec2(t * 0.1, t * 0.15);
        float wisp3 = fbm(warpUV3 + 200.0);
        wisp3 = smoothstep(0.55, 0.8, wisp3);
        float wisp3Mask = smoothstep(0.3, 0.0, abs(dir.y + 0.3)) * smoothstep(0.0, 0.3, abs(dir.x - 0.5));
        sky += vec3(0.06, 0.01, 0.04) * wisp3 * wisp3Mask;

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
