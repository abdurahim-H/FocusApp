// nebula.js - Elegant golden ribbon streams
// Thin, sparse, flowing golden curves across deep black space

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
        for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p = rot * p * 2.0 + vec2(100.0);
            a *= 0.5;
        }
        return v;
    }

    // Gold palette
    vec3 gold(float t) {
        vec3 bright = vec3(1.0, 0.88, 0.5);
        vec3 mid    = vec3(0.8, 0.55, 0.12);
        vec3 deep   = vec3(0.4, 0.22, 0.04);
        t = clamp(t, 0.0, 1.0);
        if (t > 0.6) return mix(mid, bright, (t - 0.6) / 0.4);
        return mix(deep, mid, t / 0.6);
    }

    // Single smooth ribbon curve
    float ribbon(vec2 uv, float offset, float freq, float amp, float phase) {
        float t = time * 0.025 + phase;
        float curve = amp * sin(uv.x * freq + t + offset)
                    + amp * 0.4 * sin(uv.x * freq * 1.8 + t * 1.4 + offset * 2.5);
        return abs(uv.y - curve);
    }

    void main() {
        vec2 uv = vUV - 0.5;
        float dist = length(uv);

        // Radial mask — tighter to keep edges dark
        float fade = 1.0 - smoothstep(0.05, 0.42, dist);
        if (fade < 0.001) discard;

        // Rotate for diagonal sweep
        float angle = 0.45;
        mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        vec2 ruv = rot * uv;

        // Subtle warp for organic feel
        float warp = fbm(ruv * 2.0 + time * 0.015) * 0.04;
        ruv.y += warp;

        vec3 color = vec3(0.0);

        // === THREE elegant ribbons — thin, spaced apart ===

        // Main ribbon
        float d1 = ribbon(ruv, 0.0, 3.5, 0.08, 0.0);
        float core1  = smoothstep(0.008, 0.0, d1);   // Very thin bright core
        float glow1  = smoothstep(0.035, 0.0, d1);   // Soft glow
        float haze1  = smoothstep(0.08, 0.0, d1);    // Wide faint haze

        // Second ribbon — offset, slightly thinner
        float d2 = ribbon(ruv, 1.8, 3.8, 0.065, 0.7);
        float core2  = smoothstep(0.006, 0.0, d2);
        float glow2  = smoothstep(0.025, 0.0, d2);
        float haze2  = smoothstep(0.06, 0.0, d2);

        // Third — thinnest accent
        float d3 = ribbon(ruv, -1.2, 4.2, 0.05, 1.5);
        float core3  = smoothstep(0.004, 0.0, d3);
        float glow3  = smoothstep(0.018, 0.0, d3);

        // === Layer colors — dark to bright ===
        // Wide haze — barely visible warmth
        color += gold(0.15) * haze1 * 0.08;
        color += gold(0.12) * haze2 * 0.06;

        // Glow — rich gold
        color += gold(0.5) * glow1 * 0.35;
        color += gold(0.45) * glow2 * 0.25;
        color += gold(0.4) * glow3 * 0.18;

        // Bright cores — hot gold-white
        color += gold(0.95) * core1 * 1.2;
        color += gold(0.9) * core2 * 0.9;
        color += gold(0.85) * core3 * 0.6;

        // Apply fade
        color *= fade;

        float alpha = fade * clamp(length(color) * 3.0, 0.0, 1.0);

        gl_FragColor = vec4(color, alpha);
    }
`;

export function createNebula(sceneRef, camera, octaves = 5) {
    console.log('✨ Creating golden ribbon streams...');

    BABYLON.Effect.ShadersStore['nebulaVertexShader'] = VERTEX;
    BABYLON.Effect.ShadersStore['nebulaFragmentShader'] = FRAGMENT;

    mesh = BABYLON.MeshBuilder.CreatePlane('nebula', {
        width: 2, height: 2
    }, sceneRef);

    mesh.position = BABYLON.Vector3.Zero();
    mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    mesh.scaling = new BABYLON.Vector3(65, 65, 65);
    mesh.renderingGroupId = 1;

    material = new BABYLON.ShaderMaterial('nebulaMat', sceneRef, {
        vertex: 'nebula', fragment: 'nebula'
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

    console.log('   ✓ Golden ribbons created');
    return mesh;
}

export function updateNebula(elapsed) {
    if (material) material.setFloat('time', elapsed);
}

export function disposeNebula() {
    if (mesh) { mesh.dispose(); mesh = null; }
    if (material) { material.dispose(); material = null; }
}
