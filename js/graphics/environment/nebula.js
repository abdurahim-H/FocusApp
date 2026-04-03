// nebula.js - Golden ribbon streams spanning the full viewport
// Elegant bundled golden silk threads sweeping edge-to-edge

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

    // Rich vibrant gold
    vec3 gold(float t) {
        vec3 bright = vec3(1.0, 0.9, 0.55);
        vec3 rich   = vec3(0.95, 0.65, 0.1);
        vec3 deep   = vec3(0.6, 0.32, 0.03);
        vec3 dark   = vec3(0.3, 0.14, 0.01);
        t = clamp(t, 0.0, 1.0);
        if (t > 0.7) return mix(rich, bright, (t - 0.7) / 0.3);
        if (t > 0.3) return mix(deep, rich, (t - 0.3) / 0.4);
        return mix(dark, deep, t / 0.3);
    }

    // Smooth S-curve ribbon — graceful arc spanning full UV
    float ribbon(vec2 p, float yOff, float speed, float bend) {
        float t = time * 0.02 + speed;
        float wave = bend * sin(p.x * 2.5 + t)
                   + bend * 0.5 * sin(p.x * 4.0 + t * 1.3 + 1.0)
                   + bend * 0.2 * sin(p.x * 6.5 + t * 0.8 + 2.0);
        return abs(p.y - yOff - wave);
    }

    void main() {
        // Full UV — NO radial mask, ribbons span edge to edge
        vec2 uv = vUV - 0.5;

        // Soft edge vignette — just prevents hard cutoff at plane edges
        float edgeFade = smoothstep(0.5, 0.4, max(abs(uv.x), abs(uv.y)));

        float t = time * 0.03;

        // Diagonal rotation — ribbons sweep from bottom-left to top-right
        float angle = 0.38;
        mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        vec2 ruv = rot * uv;

        // Subtle organic warp
        float warp = fbm(ruv * 1.8 + t * 0.2) * 0.03;
        ruv.y += warp;

        vec3 color = vec3(0.0);

        // === MAIN RIBBON BUNDLE — 4 parallel strands ===
        float spacing = 0.012;
        for (int i = 0; i < 4; i++) {
            float off = float(i) * spacing - spacing * 1.5;
            float width = 0.003 + float(i) * 0.001;
            float d = ribbon(ruv, off + 0.02, 0.0, 0.09);

            float core = smoothstep(width, 0.0, d);
            float glow = smoothstep(width * 5.0, 0.0, d);
            float haze = smoothstep(width * 14.0, 0.0, d);

            float intensity = 1.0 - float(i) * 0.15;
            color += gold(0.2) * haze * 0.04 * intensity;
            color += gold(0.55) * glow * 0.25 * intensity;
            color += gold(0.95) * core * 1.4 * intensity;
        }

        // === SECOND RIBBON BUNDLE — offset, thinner ===
        for (int i = 0; i < 3; i++) {
            float off = float(i) * 0.01 - 0.01;
            float width = 0.002 + float(i) * 0.0008;
            float d = ribbon(ruv, off - 0.1, 0.5, 0.07);

            float core = smoothstep(width, 0.0, d);
            float glow = smoothstep(width * 5.0, 0.0, d);
            float haze = smoothstep(width * 12.0, 0.0, d);

            float intensity = 0.85 - float(i) * 0.12;
            color += gold(0.15) * haze * 0.03 * intensity;
            color += gold(0.5) * glow * 0.2 * intensity;
            color += gold(0.9) * core * 1.1 * intensity;
        }

        // === THIRD — thin accent ribbon ===
        float d3 = ribbon(ruv, 0.14, 1.2, 0.06);
        float core3 = smoothstep(0.002, 0.0, d3);
        float glow3 = smoothstep(0.012, 0.0, d3);
        color += gold(0.45) * glow3 * 0.15;
        color += gold(0.88) * core3 * 0.7;

        // === GOLDEN DUST — smooth continuous noise along ribbons ===
        float minDist = 1.0;
        minDist = min(minDist, ribbon(ruv, 0.02, 0.0, 0.09));
        minDist = min(minDist, ribbon(ruv, -0.1, 0.5, 0.07));
        minDist = min(minDist, ribbon(ruv, 0.14, 1.2, 0.06));

        // Dust concentrated near ribbons, fading with distance
        float dustZone = smoothstep(0.12, 0.0, minDist);
        float dustNoise = fbm(ruv * 25.0 + t * 1.5);
        float dust = pow(dustNoise, 4.0) * dustZone;
        color += gold(0.7) * dust * 0.6;

        // Fine sparkle dust — very high frequency smooth noise
        float fineDust = fbm(ruv * 50.0 + t * 0.8);
        float fineSparkle = pow(fineDust, 6.0) * dustZone;
        color += gold(0.9) * fineSparkle * 0.4;

        // === SCATTERED AMBIENT GOLD DUST — fills empty areas subtly ===
        float ambientDust = fbm(uv * 8.0 + t * 0.3);
        ambientDust = pow(ambientDust, 5.0);
        color += gold(0.4) * ambientDust * 0.05;

        color *= edgeFade;
        float alpha = edgeFade * clamp(length(color) * 3.0, 0.0, 1.0);

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
    mesh.scaling = new BABYLON.Vector3(120, 120, 120); // Large — fills viewport
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
