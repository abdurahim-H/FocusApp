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
    vec3 sampleDisk(float diskR, float diskAngle) {
        float rNorm = clamp((diskR - DISK_INNER) / (DISK_OUTER - DISK_INNER), 0.0, 1.0);

        // Keplerian spin — inner faster
        float kepler = pow(DISK_INNER / max(diskR, DISK_INNER), 0.65);
        float spin = diskAngle + time * 0.35 * kepler;

        // Flowing plasma streaks — primarily ANGULAR (along orbit direction)
        // Use spin angle as primary coordinate, radius as secondary
        float ang = spin * 6.0 / PI;
        float rad = rNorm * 8.0; // LOW radial frequency — no banding

        float s1 = fbm(vec2(ang + time * 0.1, rad));
        float s2 = fbm(vec2(ang * 0.7 - time * 0.07, rad + 30.0));
        float streaks = s1 * 0.6 + s2 * 0.4;

        // Smooth continuous brightness — no ring modulation
        float brightness = 0.3 + streaks * 0.7;
        brightness *= 1.0 + 0.3 * sin(diskAngle + 0.7); // Doppler

        // Smooth radial temperature gradient (no sharp steps)
        // Inner = hot bright, outer = cool dark
        float temp = 1.0 - rNorm;
        // Smooth cubic falloff
        temp = temp * temp * (3.0 - 2.0 * temp);

        // Blend colors smoothly using temp as a continuous gradient
        vec3 hot    = vec3(1.0, 0.93, 0.8);
        vec3 bright = vec3(1.0, 0.68, 0.18);
        vec3 orange = vec3(0.95, 0.38, 0.03);
        vec3 red    = vec3(0.5, 0.1, 0.015);
        vec3 dark   = vec3(0.12, 0.02, 0.003);

        // Continuous smooth gradient using mix chain
        vec3 col = mix(dark, red, smoothstep(0.0, 0.25, temp));
        col = mix(col, orange, smoothstep(0.2, 0.5, temp));
        col = mix(col, bright, smoothstep(0.45, 0.75, temp));
        col = mix(col, hot, smoothstep(0.8, 1.0, temp));

        // Streaks modulate brightness, not color banding
        return col * brightness;
    }

    void main() {
        vec2 uv = vUV - 0.5;
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

        // Warp Y toward zero (the disk plane)
        float warpedY = uv.y / (1.0 + lensStrength * 1.8);

        // The warped position represents where the ray hits the disk
        vec2 warpedUV = vec2(uv.x, warpedY);

        // Map to tilted disk coordinates
        vec2 diskCoord = vec2(warpedUV.x, warpedUV.y / TILT);
        float diskR = length(diskCoord);
        float diskAngle = atan(diskCoord.y, diskCoord.x);

        // PRIMARY disk image
        if (diskR > DISK_INNER && diskR < DISK_OUTER) {
            vec3 dCol = sampleDisk(diskR, diskAngle);

            float innerF = smoothstep(DISK_INNER, DISK_INNER + 0.02, diskR);
            float outerF = smoothstep(DISK_OUTER, DISK_OUTER - 0.05, diskR);
            float mask = innerF * outerF;

            color += dCol * mask * 1.4;
            alpha = max(alpha, length(dCol) * mask * 1.4);
        }

        // SECONDARY image (stronger warp — light wrapping further around)
        float warpedY2 = uv.y / (1.0 + lensStrength * 5.0);
        vec2 warpedUV2 = vec2(uv.x, warpedY2);
        vec2 diskCoord2 = vec2(warpedUV2.x, warpedUV2.y / TILT);
        float diskR2 = length(diskCoord2);
        float diskAngle2 = atan(diskCoord2.y, diskCoord2.x);

        if (diskR2 > DISK_INNER && diskR2 < DISK_OUTER) {
            vec3 dCol2 = sampleDisk(diskR2, diskAngle2);

            float innerF = smoothstep(DISK_INNER, DISK_INNER + 0.015, diskR2);
            float outerF = smoothstep(DISK_OUTER, DISK_OUTER - 0.04, diskR2);
            float mask = innerF * outerF * 0.35;

            color += dCol2 * mask;
            alpha = max(alpha, length(dCol2) * mask);
        }

        // TERTIARY — even tighter winding
        float warpedY3 = uv.y / (1.0 + lensStrength * 12.0);
        vec2 warpedUV3 = vec2(uv.x, warpedY3);
        vec2 diskCoord3 = vec2(warpedUV3.x, warpedUV3.y / TILT);
        float diskR3 = length(diskCoord3);
        float diskAngle3 = atan(diskCoord3.y, diskCoord3.x);

        if (diskR3 > DISK_INNER && diskR3 < DISK_OUTER) {
            vec3 dCol3 = sampleDisk(diskR3, diskAngle3);

            float innerF = smoothstep(DISK_INNER, DISK_INNER + 0.01, diskR3);
            float outerF = smoothstep(DISK_OUTER, DISK_OUTER - 0.03, diskR3);
            float mask = innerF * outerF * 0.15;

            color += dCol3 * mask;
            alpha = max(alpha, length(dCol3) * mask);
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
