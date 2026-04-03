// blackhole.js - Interstellar black hole — Y-axis gravitational lensing
// Lensing compresses vertical coordinate toward disk plane (y=0)
// This creates: wide horizontal disk + tall dome above + tight ring below

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

    #define PI 3.14159265
    #define SHADOW_R 0.085
    #define PHOTON_R 0.128
    #define DISK_INNER 0.10
    #define DISK_OUTER 0.44
    #define TILT 0.20

    float hash2(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(hash2(i), hash2(i + vec2(1,0)), f.x),
            mix(hash2(i + vec2(0,1)), hash2(i + vec2(1,1)), f.x),
            f.y
        );
    }

    float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        mat2 rot = mat2(0.87, 0.48, -0.48, 0.87);
        for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p = rot * p * 2.1 + vec2(100.0);
            a *= 0.5;
        }
        return v;
    }

    // tempColor removed — smooth gradient is now inline in sampleDisk

    // Sample disk — continuous smooth flowing plasma, NO concentric rings
    // Uses cos/sin of angle for noise coords to avoid atan discontinuity
    vec3 sampleDisk(float diskR, float diskAngle) {
        float rNorm = clamp((diskR - DISK_INNER) / (DISK_OUTER - DISK_INNER), 0.0, 1.0);

        // Keplerian spin — inner faster
        float kepler = pow(DISK_INNER / max(diskR, DISK_INNER), 0.65);
        float spin = diskAngle + time * 0.35 * kepler;

        // Use cos/sin of spin angle as noise coordinates
        // This is CONTINUOUS everywhere — no atan ±PI discontinuity
        float cx = cos(spin * 3.0);
        float cy = sin(spin * 3.0);
        float rad = rNorm * 8.0;

        float s1 = fbm(vec2(cx * 4.0 + cy * 2.0 + time * 0.1, rad + cx));
        float s2 = fbm(vec2(cy * 3.0 - cx * 1.5 - time * 0.07, rad + 30.0 + cy));
        float streaks = s1 * 0.6 + s2 * 0.4;

        // Smooth continuous brightness — no ring modulation
        float brightness = 0.3 + streaks * 0.7;
        // Doppler using cos (continuous, no atan discontinuity)
        brightness *= 1.0 + 0.3 * cos(diskAngle + 0.7);

        // Smooth radial temperature gradient
        // Inner = hot bright, outer = deep blood red
        float temp = 1.0 - rNorm;
        temp = temp * temp * (3.0 - 2.0 * temp);

        // Darker palette: deep blood red outer → bright orange-red inner
        vec3 hot       = vec3(1.0, 0.85, 0.55);       // Hot gold-white core
        vec3 brightOrg = vec3(0.85, 0.35, 0.02);       // Bright orange-red (#CC3300 ≈)
        vec3 medRed    = vec3(0.65, 0.18, 0.01);       // Medium red
        vec3 bloodRed  = vec3(0.545, 0.0, 0.0);        // Deep blood red (#8B0000)
        vec3 darkEdge  = vec3(0.25, 0.0, 0.0);         // Near-black red

        vec3 col = mix(darkEdge, bloodRed, smoothstep(0.0, 0.2, temp));
        col = mix(col, medRed, smoothstep(0.15, 0.4, temp));
        col = mix(col, brightOrg, smoothstep(0.35, 0.65, temp));
        col = mix(col, hot, smoothstep(0.75, 1.0, temp));

        // Streaks modulate brightness, not color banding
        return col * brightness;
    }

    void main() {
        vec2 uv = vUV - 0.5;

        // Tilt the entire black hole + accretion disk
        float tiltAngle = 0.12; // ~7 degrees counter-clockwise
        mat2 tiltRot = mat2(cos(tiltAngle), -sin(tiltAngle), sin(tiltAngle), cos(tiltAngle));
        uv = tiltRot * uv;

        float dist = length(uv);
        if (dist > 0.5) discard;

        vec3 color = vec3(0.0);
        float alpha = 0.0;

        // ==========================================
        // Y-AXIS GRAVITATIONAL LENSING
        // Compress Y toward 0 (disk plane), strength based on distance to BH
        // This naturally creates the wide disk + dome + lower ring
        // ==========================================

        // Lensing strength — based on distance from BH center
        float lensR = length(uv);
        float lensStrength = (SHADOW_R * SHADOW_R) / max(lensR * lensR - SHADOW_R * SHADOW_R * 0.8, 0.0001);
        lensStrength = min(lensStrength, 6.0);

        // ==========================================
        // ACCUMULATE MULTIPLE WARP LEVELS smoothly
        // Instead of 3 discrete jumps, sample 8 warp levels
        // with decreasing weight — eliminates the hard boundary
        // ==========================================
        float warpLevels[8];
        warpLevels[0] = 1.2;
        warpLevels[1] = 2.0;
        warpLevels[2] = 3.0;
        warpLevels[3] = 4.5;
        warpLevels[4] = 6.5;
        warpLevels[5] = 9.0;
        warpLevels[6] = 13.0;
        warpLevels[7] = 18.0;

        float warpWeights[8];
        warpWeights[0] = 1.0;
        warpWeights[1] = 0.7;
        warpWeights[2] = 0.45;
        warpWeights[3] = 0.3;
        warpWeights[4] = 0.2;
        warpWeights[5] = 0.13;
        warpWeights[6] = 0.08;
        warpWeights[7] = 0.05;

        for (int i = 0; i < 8; i++) {
            float warpMult = warpLevels[i];
            float weight = warpWeights[i];

            float wy = uv.y / (1.0 + lensStrength * warpMult);
            vec2 dc = vec2(uv.x, wy / TILT);
            float dr = length(dc);
            float da = atan(dc.y, dc.x);

            if (dr > DISK_INNER && dr < DISK_OUTER) {
                vec3 dCol = sampleDisk(dr, da);

                float innerF = smoothstep(DISK_INNER, DISK_INNER + 0.02, dr);
                float outerF = smoothstep(DISK_OUTER, DISK_OUTER - 0.08, dr);
                float mask = innerF * outerF * weight;

                color += dCol * mask * 1.3;
                alpha = max(alpha, length(dCol) * mask * 1.3);
            }
        }

        // ==========================================
        // PHOTON RING
        // ==========================================
        float photonDist = abs(dist - PHOTON_R);
        float photonRing = exp(-photonDist * photonDist * 25000.0) * 0.35;
        photonRing *= 0.65 + 0.35 * sin(atan(uv.y, uv.x) * 2.0 + time * 0.4);
        color += vec3(1.0, 0.6, 0.2) * photonRing;
        alpha = max(alpha, photonRing);

        // ==========================================
        // EVENT HORIZON
        // ==========================================
        float shadowMask = smoothstep(SHADOW_R, SHADOW_R - 0.004, dist);

        float innerGlow = smoothstep(SHADOW_R + 0.018, SHADOW_R + 0.001, dist) * (1.0 - shadowMask);
        color += vec3(0.6, 0.2, 0.03) * innerGlow * 0.1;

        color *= (1.0 - shadowMask);
        alpha = mix(alpha, 0.97, shadowMask);

        float edge = smoothstep(SHADOW_R + 0.002, SHADOW_R, dist)
                   * smoothstep(SHADOW_R - 0.002, SHADOW_R, dist);
        color += vec3(1.0, 0.5, 0.1) * edge * 0.12 * (1.0 - shadowMask);

        // ==========================================
        // OUTER FADE
        // ==========================================
        float outerFade = smoothstep(0.5, 0.38, dist);
        color *= outerFade;
        alpha *= outerFade;

        alpha = clamp(alpha, 0.0, 1.0);
        if (alpha < 0.002 && shadowMask < 0.01) discard;

        gl_FragColor = vec4(color, alpha);
    }
`;

export function createBlackHole(sceneRef, camera) {
    console.log('🕳️ Creating black hole with accretion disk...');

    BABYLON.Effect.ShadersStore['blackholeVertexShader'] = VERTEX;
    BABYLON.Effect.ShadersStore['blackholeFragmentShader'] = FRAGMENT;

    mesh = BABYLON.MeshBuilder.CreatePlane('blackhole', {
        width: 2, height: 2
    }, sceneRef);

    mesh.position = new BABYLON.Vector3(0, -0.5, 0);
    mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    mesh.scaling = new BABYLON.Vector3(28, 28, 28);
    mesh.renderingGroupId = 1;
    mesh.isPickable = false;

    material = new BABYLON.ShaderMaterial('blackholeMat', sceneRef, {
        vertex: 'blackhole', fragment: 'blackhole'
    }, {
        attributes: ['position', 'uv'],
        uniforms: ['worldViewProjection', 'time'],
        needAlphaBlending: true
    });

    material.setFloat('time', 0);
    material.backFaceCulling = false;
    material.alphaMode = BABYLON.Engine.ALPHA_COMBINE;
    material.forceDepthWrite = false;
    mesh.material = material;

    console.log('   ✓ Black hole created');
    return mesh;
}

export function updateBlackHole(elapsed) {
    if (material) material.setFloat('time', elapsed);
}

export function disposeBlackHole() {
    if (mesh) { mesh.dispose(); mesh = null; }
    if (material) { material.dispose(); material = null; }
}
