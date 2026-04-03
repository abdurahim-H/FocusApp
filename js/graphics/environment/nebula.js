// nebula.js - Vibrant central nebula — the visual anchor
// Rich, flowing, colorful cosmic cloud that dominates the center

let mesh = null;
let material = null;

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
            mix(hash(i), hash(i + vec2(1,0)), f.x),
            mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
            f.y
        );
    }

    float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        mat2 rot = mat2(0.87, 0.48, -0.48, 0.87);
        for (int i = 0; i < 6; i++) {
            v += a * noise(p);
            p = rot * p * 2.0 + vec2(100.0);
            a *= 0.5;
        }
        return v;
    }

    void main() {
        vec2 uv = vUV - 0.5;
        float dist = length(uv);
        float t = time * 0.05;

        // Smooth radial mask
        float mask = 1.0 - smoothstep(0.0, 0.48, dist);
        mask = pow(mask, 1.5);
        if (mask < 0.001) discard;

        // === DOMAIN WARPING for organic flow ===
        vec2 q = vec2(
            fbm(uv * 3.0 + vec2(t * 0.4, t * 0.3)),
            fbm(uv * 3.0 + vec2(t * 0.3, -t * 0.2))
        );
        vec2 r = vec2(
            fbm(uv * 3.0 + q * 2.0 + vec2(1.7, 9.2) + t * 0.2),
            fbm(uv * 3.0 + q * 2.0 + vec2(8.3, 2.8) + t * 0.15)
        );
        float f = fbm(uv * 3.0 + r * 2.0);

        // === VIBRANT COLOR MIXING ===
        // Rich violet/purple
        vec3 violet = vec3(0.35, 0.08, 0.55);
        // Electric blue
        vec3 blue = vec3(0.08, 0.20, 0.65);
        // Hot magenta/pink
        vec3 magenta = vec3(0.55, 0.05, 0.35);
        // Cyan accent
        vec3 cyan = vec3(0.05, 0.45, 0.55);
        // Warm gold for hot spots
        vec3 gold = vec3(0.70, 0.45, 0.10);
        // Deep core
        vec3 deep = vec3(0.05, 0.02, 0.12);

        // Build color from noise layers
        vec3 color = deep;
        color = mix(color, violet, smoothstep(0.2, 0.6, f) * 0.8);
        color = mix(color, blue, smoothstep(0.3, 0.7, q.x) * 0.6);
        color = mix(color, magenta, smoothstep(0.5, 0.8, r.y) * 0.5);
        color = mix(color, cyan, smoothstep(0.4, 0.75, r.x * q.y) * 0.4);

        // Hot spots — bright concentrated areas
        float hotspot = pow(f, 3.0) * smoothstep(0.6, 0.9, r.x);
        color = mix(color, gold, hotspot * 0.3);

        // Bright core emission
        float coreLight = exp(-dist * dist * 12.0);
        color += vec3(0.15, 0.08, 0.25) * coreLight;

        // Internal bright filaments — smooth, no grid
        float filament = pow(smoothstep(0.4, 0.6, fbm(uv * 8.0 + r * 3.0 + t * 0.3)), 3.0);
        color += vec3(0.25, 0.15, 0.4) * filament * mask * 0.25;

        // Apply mask and intensity
        color *= mask;

        // Boost for vibrancy — this should GLOW through bloom
        color *= 2.0;

        float alpha = mask * smoothstep(0.01, 0.15, length(color));

        gl_FragColor = vec4(color, alpha);
    }
`;

export function createNebula(sceneRef, camera, octaves = 5) {
    console.log('🌌 Creating vibrant nebula...');

    BABYLON.Effect.ShadersStore['nebulaVertexShader'] = VERTEX;
    BABYLON.Effect.ShadersStore['nebulaFragmentShader'] = FRAGMENT;

    mesh = BABYLON.MeshBuilder.CreatePlane('nebula', {
        width: 2,
        height: 2
    }, sceneRef);

    mesh.position = BABYLON.Vector3.Zero();
    mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    mesh.scaling = new BABYLON.Vector3(70, 70, 70);
    mesh.renderingGroupId = 1;

    material = new BABYLON.ShaderMaterial('nebulaMat', sceneRef, {
        vertex: 'nebula',
        fragment: 'nebula'
    }, {
        attributes: ['position', 'uv'],
        uniforms: ['worldViewProjection', 'time'],
        needAlphaBlending: true
    });

    material.setFloat('time', 0);
    material.backFaceCulling = false;
    material.alphaMode = BABYLON.Engine.ALPHA_ADD;
    material.forceDepthWrite = false;

    mesh.material = material;

    console.log('   ✓ Vibrant nebula created');
    return mesh;
}

export function updateNebula(elapsed) {
    if (material) material.setFloat('time', elapsed);
}

export function disposeNebula() {
    if (mesh) { mesh.dispose(); mesh = null; }
    if (material) { material.dispose(); material = null; }
}
