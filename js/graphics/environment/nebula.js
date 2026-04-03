// nebula.js - Flowing golden ribbon streams
// Ribbons that FLOW like rivers of gold, not just oscillate

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

    // Vibrant saturated gold
    vec3 gold(float t) {
        vec3 white  = vec3(1.0, 0.97, 0.85);    // White-hot core
        vec3 bright = vec3(1.0, 0.82, 0.35);     // Bright gold
        vec3 rich   = vec3(0.95, 0.55, 0.08);    // Rich saturated gold
        vec3 deep   = vec3(0.6, 0.28, 0.02);     // Deep amber
        vec3 dark   = vec3(0.3, 0.12, 0.01);     // Dark bronze
        t = clamp(t, 0.0, 1.0);
        if (t > 0.85) return mix(bright, white, (t - 0.85) / 0.15);
        if (t > 0.55) return mix(rich, bright, (t - 0.55) / 0.3);
        if (t > 0.25) return mix(deep, rich, (t - 0.25) / 0.3);
        return mix(dark, deep, t / 0.25);
    }

    // Flowing S-curve ribbon — wave travels ALONG the path
    float ribbon(vec2 p, float yOff, float flowSpeed, float bend, float freq) {
        // Key: (p.x - time*speed) makes the wave pattern FLOW along the ribbon
        float flow = p.x - time * flowSpeed;
        float curve = bend * sin(flow * freq)
                    + bend * 0.45 * sin(flow * freq * 1.6 + 1.5)
                    + bend * 0.2 * sin(flow * freq * 2.8 + 3.0);
        return abs(p.y - yOff - curve);
    }

    void main() {
        vec2 uv = vUV - 0.5;

        // Soft edge fade
        float edgeFade = smoothstep(0.5, 0.38, max(abs(uv.x), abs(uv.y)));

        // Diagonal rotation — sweeping curves
        float angle = 0.35;
        mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        vec2 ruv = rot * uv;

        // Organic warp — also flows
        float warp = fbm(ruv * 2.0 + vec2(-time * 0.04, time * 0.02)) * 0.035;
        ruv.y += warp;

        vec3 color = vec3(0.0);

        // === MAIN RIBBON BUNDLE — 4 parallel flowing strands ===
        float spacing = 0.013;
        for (int i = 0; i < 4; i++) {
            float off = float(i) * spacing - spacing * 1.5;
            float w = 0.003 + float(i) * 0.001;
            float d = ribbon(ruv, off + 0.04, 0.06, 0.11, 2.8);

            float core = smoothstep(w, 0.0, d);
            float glow = smoothstep(w * 6.0, 0.0, d);
            float haze = smoothstep(w * 16.0, 0.0, d);

            float intensity = 1.0 - float(i) * 0.12;
            color += gold(0.18) * haze * 0.05 * intensity;
            color += gold(0.6) * glow * 0.35 * intensity;
            color += gold(1.0) * core * 1.8 * intensity;
        }

        // === SECOND BUNDLE — flows the other direction for visual interest ===
        for (int i = 0; i < 3; i++) {
            float off = float(i) * 0.011 - 0.011;
            float w = 0.0025 + float(i) * 0.0007;
            float d = ribbon(ruv, off - 0.12, 0.045, 0.09, 3.2);

            float core = smoothstep(w, 0.0, d);
            float glow = smoothstep(w * 5.5, 0.0, d);
            float haze = smoothstep(w * 14.0, 0.0, d);

            float intensity = 0.85 - float(i) * 0.1;
            color += gold(0.15) * haze * 0.04 * intensity;
            color += gold(0.55) * glow * 0.28 * intensity;
            color += gold(0.95) * core * 1.4 * intensity;
        }

        // === THIN ACCENT RIBBONS ===
        float da = ribbon(ruv, 0.17, 0.08, 0.07, 3.5);
        color += gold(0.5) * smoothstep(0.01, 0.0, da) * 0.2;
        color += gold(0.92) * smoothstep(0.0025, 0.0, da) * 0.9;

        float db = ribbon(ruv, -0.22, 0.035, 0.08, 2.5);
        color += gold(0.45) * smoothstep(0.008, 0.0, db) * 0.15;
        color += gold(0.88) * smoothstep(0.002, 0.0, db) * 0.7;

        // === FLOWING GOLDEN DUST along ribbons ===
        float minD = 1.0;
        minD = min(minD, ribbon(ruv, 0.04, 0.06, 0.11, 2.8));
        minD = min(minD, ribbon(ruv, -0.12, 0.045, 0.09, 3.2));

        float dustZone = smoothstep(0.1, 0.0, minD);
        // Dust FLOWS with the ribbon — note the time offset in x
        float dustFlow = fbm(vec2(ruv.x * 20.0 - time * 1.2, ruv.y * 20.0));
        float dust = pow(dustFlow, 4.5) * dustZone;
        color += gold(0.75) * dust * 0.8;

        // Fine sparkle dust — also flowing
        float fineFlow = fbm(vec2(ruv.x * 40.0 - time * 2.0, ruv.y * 40.0 + time * 0.3));
        float sparkle = pow(fineFlow, 7.0) * dustZone;
        color += gold(0.95) * sparkle * 0.6;

        // === AMBIENT scattered gold — fills empty areas ===
        float ambient = fbm(uv * 6.0 + vec2(-time * 0.05, time * 0.03));
        ambient = pow(ambient, 6.0);
        color += gold(0.35) * ambient * 0.06;

        // === SUBTLE BLUE-WHITE GLOW in upper area ===
        float blueGlow = exp(-pow(uv.x + 0.05, 2.0) * 8.0 - pow(uv.y - 0.2, 2.0) * 12.0);
        color += vec3(0.08, 0.12, 0.2) * blueGlow * 0.4;

        color *= edgeFade;
        float alpha = edgeFade * clamp(length(color) * 3.0, 0.0, 1.0);

        gl_FragColor = vec4(color, alpha);
    }
`;

export function createNebula(sceneRef, camera, octaves = 5) {
    console.log('✨ Creating flowing golden streams...');

    BABYLON.Effect.ShadersStore['nebulaVertexShader'] = VERTEX;
    BABYLON.Effect.ShadersStore['nebulaFragmentShader'] = FRAGMENT;

    mesh = BABYLON.MeshBuilder.CreatePlane('nebula', {
        width: 2, height: 2
    }, sceneRef);

    mesh.position = BABYLON.Vector3.Zero();
    mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    mesh.scaling = new BABYLON.Vector3(120, 120, 120);
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

    console.log('   ✓ Flowing golden ribbons created');
    return mesh;
}

export function updateNebula(elapsed) {
    if (material) material.setFloat('time', elapsed);
}

export function disposeNebula() {
    if (mesh) { mesh.dispose(); mesh = null; }
    if (material) { material.dispose(); material = null; }
}
