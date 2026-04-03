// blackhole.js - Interstellar-style black hole with gravitational lensing accretion disk
// Raymarched GLSL shader: event horizon, photon ring, lensed accretion disk, Doppler beaming

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
    #define BH_RADIUS 0.12        // Event horizon radius in UV space
    #define PHOTON_RADIUS 0.155   // Photon sphere (~1.5x Schwarzschild)
    #define DISK_INNER 0.17       // Inner edge of accretion disk
    #define DISK_OUTER 0.48       // Outer edge of accretion disk
    #define DISK_TILT 0.28        // How tilted the disk plane is (0=edge-on, 1=face-on)

    // Noise for disk turbulence
    float hash(float n) { return fract(sin(n) * 43758.5453); }
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
        for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p = rot * p * 2.1 + vec2(100.0);
            a *= 0.5;
        }
        return v;
    }

    // Accretion disk color — temperature gradient from deep red (outer) to bright white-gold (inner)
    vec3 diskColor(float r, float angle) {
        // Normalize radius within disk
        float t = 1.0 - smoothstep(DISK_INNER, DISK_OUTER, r);

        // Temperature colors — inner hot to outer cool
        vec3 hotWhite = vec3(1.0, 0.95, 0.85);
        vec3 brightGold = vec3(1.0, 0.75, 0.25);
        vec3 orange = vec3(0.95, 0.45, 0.05);
        vec3 deepRed = vec3(0.6, 0.12, 0.02);
        vec3 darkRed = vec3(0.25, 0.04, 0.01);

        vec3 col;
        if (t > 0.85) col = mix(brightGold, hotWhite, (t - 0.85) / 0.15);
        else if (t > 0.6) col = mix(orange, brightGold, (t - 0.6) / 0.25);
        else if (t > 0.3) col = mix(deepRed, orange, (t - 0.3) / 0.3);
        else col = mix(darkRed, deepRed, t / 0.3);

        return col;
    }

    void main() {
        vec2 uv = vUV - 0.5;
        float dist = length(uv);

        // Circular mask — discard outside visible area
        if (dist > 0.5) discard;

        vec3 color = vec3(0.0);
        float alpha = 0.0;

        // ==========================================
        // GRAVITATIONAL LENSING
        // Bend UV coordinates based on distance from center
        // ==========================================
        float schwarzschild = BH_RADIUS;

        // Deflection angle — increases as light gets closer to BH
        // Simplified gravitational lensing model
        float deflection = schwarzschild / max(dist, 0.001);
        deflection = deflection * deflection * 0.6;

        // Lensed UV — rays bend toward center
        vec2 lensDir = normalize(uv);
        vec2 lensedUV = uv + lensDir * deflection * 0.05;
        float lensedDist = length(lensedUV);

        // ==========================================
        // EVENT HORIZON — pure black circle
        // ==========================================
        float eventHorizon = smoothstep(BH_RADIUS, BH_RADIUS - 0.008, dist);

        // ==========================================
        // ACCRETION DISK — the main visual
        // Disk is in a tilted plane; we project UV onto it
        // ==========================================

        // Simulate a tilted disk plane
        // The disk appears as an ellipse due to tilt
        // y-coordinate is compressed by the tilt angle
        vec2 diskUV = vec2(uv.x, uv.y / DISK_TILT);
        float diskDist = length(diskUV);
        float diskAngle = atan(diskUV.y, diskUV.x);

        // Disk mask — ring shape
        float diskMask = smoothstep(DISK_INNER - 0.01, DISK_INNER + 0.02, diskDist)
                       * smoothstep(DISK_OUTER + 0.02, DISK_OUTER - 0.03, diskDist);

        // Spinning animation — rotate the disk texture
        float spin = time * 0.3;
        float spinAngle = diskAngle + spin;
        // Inner parts spin faster (Keplerian rotation)
        float keplerFactor = pow(DISK_INNER / max(diskDist, DISK_INNER), 0.6);
        spinAngle = diskAngle + spin * (0.5 + keplerFactor * 1.5);

        if (diskMask > 0.001) {
            // Disk turbulence — streaky ring texture
            float turbCoord = spinAngle * 8.0 / PI; // Angular coordinate
            float radCoord = diskDist * 30.0;        // Radial coordinate

            // Multiple octaves of streaky noise
            float streak1 = fbm(vec2(turbCoord + time * 0.15, radCoord));
            float streak2 = fbm(vec2(turbCoord * 1.5 - time * 0.1, radCoord * 0.7 + 50.0));
            float streak3 = noise(vec2(turbCoord * 4.0 + time * 0.3, radCoord * 2.0));

            float turbulence = streak1 * 0.5 + streak2 * 0.3 + streak3 * 0.2;

            // Concentric ring structure
            float rings = 0.5 + 0.5 * sin(diskDist * 120.0 + turbulence * 8.0);
            rings = pow(rings, 0.8);

            // Get base disk color
            vec3 dColor = diskColor(diskDist, spinAngle);

            // Apply turbulence and ring modulation
            float brightness = (0.4 + turbulence * 0.6) * (0.5 + rings * 0.5);

            // Doppler beaming — approaching side brighter
            float doppler = 1.0 + 0.35 * sin(diskAngle + 0.5);

            // Intensity falls off at edges
            float edgeFalloff = smoothstep(DISK_OUTER, DISK_OUTER - 0.12, diskDist);
            float innerFalloff = smoothstep(DISK_INNER, DISK_INNER + 0.04, diskDist);

            brightness *= doppler * edgeFalloff * innerFalloff;

            color += dColor * brightness * diskMask * 1.5;
            alpha = max(alpha, diskMask * brightness * 1.5);
        }

        // ==========================================
        // GRAVITATIONALLY LENSED DISK — arches over the top
        // Light from the back of the disk bends over/under the BH
        // ==========================================
        // Top lensed arc
        float lensArcY = abs(uv.y) - BH_RADIUS * 0.5;
        float lensArcDist = sqrt(uv.x * uv.x + lensArcY * lensArcY / (0.15 * 0.15));

        // Create the characteristic "arch" shape
        // Map the lensed region to disk coordinates
        float archHeight = BH_RADIUS * 2.8;
        float archDist = length(vec2(uv.x, (uv.y - archHeight * 0.3)));

        // Upper gravitational lens arc
        if (uv.y > -BH_RADIUS * 0.5) {
            float yNorm = (uv.y + BH_RADIUS * 0.3) / (archHeight);
            float archShape = 1.0 - pow(abs(uv.x) / (0.42 * (1.0 + yNorm * 0.5)), 2.0);

            if (yNorm > 0.0 && yNorm < 1.0 && archShape > 0.0) {
                float archR = DISK_INNER + (DISK_OUTER - DISK_INNER) * (1.0 - yNorm);
                float archAngle = atan(uv.y, uv.x) + spin * 0.8;

                // Thin band
                float archWidth = 0.02 + yNorm * 0.04;
                float archBand = exp(-pow(archShape - 0.5, 2.0) / (archWidth * archWidth));

                // Turbulence in the arch
                float archTurb = fbm(vec2(archAngle * 6.0 + time * 0.2, yNorm * 20.0));
                float archRings = 0.5 + 0.5 * sin(yNorm * 80.0 + archTurb * 5.0);

                vec3 archColor = diskColor(archR, archAngle);
                float archBright = archBand * (0.3 + archTurb * 0.5) * (0.5 + archRings * 0.5);
                archBright *= smoothstep(0.0, 0.15, yNorm) * smoothstep(1.0, 0.7, yNorm);

                // Blend with existing — don't overwrite disk
                float archAlpha = archBright * 0.8;
                color += archColor * archBright * 0.9;
                alpha = max(alpha, archAlpha);
            }
        }

        // Lower lensed arc (smaller, fainter — the underside)
        if (uv.y < BH_RADIUS * 0.3) {
            float yNorm = (-uv.y + BH_RADIUS * 0.1) / (archHeight * 0.55);

            if (yNorm > 0.0 && yNorm < 1.0) {
                float archShape = 1.0 - pow(abs(uv.x) / (0.3 * (1.0 + yNorm * 0.3)), 2.0);

                if (archShape > 0.0) {
                    float archR = DISK_INNER + (DISK_OUTER - DISK_INNER) * (1.0 - yNorm * 0.7);
                    float archAngle = atan(-uv.y, uv.x) + spin * 0.7;

                    float archWidth = 0.015 + yNorm * 0.03;
                    float archBand = exp(-pow(archShape - 0.5, 2.0) / (archWidth * archWidth));

                    float archTurb = fbm(vec2(archAngle * 5.0 + time * 0.15, yNorm * 15.0 + 100.0));
                    float archRings = 0.5 + 0.5 * sin(yNorm * 60.0 + archTurb * 4.0);

                    vec3 archColor = diskColor(archR, archAngle);
                    float archBright = archBand * (0.2 + archTurb * 0.4) * (0.5 + archRings * 0.5);
                    archBright *= smoothstep(0.0, 0.1, yNorm) * smoothstep(1.0, 0.6, yNorm) * 0.6;

                    color += archColor * archBright * 0.6;
                    alpha = max(alpha, archBright * 0.5);
                }
            }
        }

        // ==========================================
        // PHOTON RING — thin bright ring at the edge of the event horizon
        // ==========================================
        float photonDist = abs(dist - PHOTON_RADIUS);
        float photonRing = exp(-photonDist * photonDist * 8000.0) * 0.6;
        // Asymmetric brightness
        photonRing *= 0.7 + 0.3 * sin(atan(uv.y, uv.x) * 2.0 + time * 0.5);
        vec3 photonColor = vec3(1.0, 0.7, 0.3) * photonRing;
        color += photonColor;
        alpha = max(alpha, photonRing);

        // ==========================================
        // INNER GLOW — faint warm glow just outside event horizon
        // ==========================================
        float innerGlow = smoothstep(BH_RADIUS + 0.06, BH_RADIUS + 0.005, dist);
        innerGlow *= (1.0 - eventHorizon);
        color += vec3(0.8, 0.3, 0.05) * innerGlow * 0.25;
        alpha = max(alpha, innerGlow * 0.3);

        // ==========================================
        // EVENT HORIZON — paint black over everything inside
        // ==========================================
        color *= (1.0 - eventHorizon);
        alpha = mix(alpha, 1.0, eventHorizon * 0.98); // Nearly opaque black

        // Thin bright edge at event horizon boundary
        float horizonEdge = smoothstep(BH_RADIUS + 0.005, BH_RADIUS, dist)
                          * smoothstep(BH_RADIUS - 0.005, BH_RADIUS, dist);
        color += vec3(1.0, 0.6, 0.15) * horizonEdge * 0.3;

        // ==========================================
        // GRAVITATIONAL LENSING of background — subtle distortion ring
        // ==========================================
        float lensRing = exp(-pow(dist - BH_RADIUS * 1.8, 2.0) * 200.0) * 0.08;
        color += vec3(0.6, 0.7, 0.9) * lensRing;

        // Outer fade — smooth blend into space
        float outerFade = smoothstep(0.5, 0.38, dist);
        color *= outerFade;
        alpha *= outerFade;

        alpha = clamp(alpha, 0.0, 1.0);
        if (alpha < 0.002 && eventHorizon < 0.01) discard;

        gl_FragColor = vec4(color, alpha);
    }
`;

/**
 * Create the black hole
 */
export function createBlackHole(sceneRef, camera) {
    console.log('🕳️ Creating black hole with accretion disk...');

    BABYLON.Effect.ShadersStore['blackholeVertexShader'] = VERTEX;
    BABYLON.Effect.ShadersStore['blackholeFragmentShader'] = FRAGMENT;

    // Billboard plane — sized for proportion (not too big)
    mesh = BABYLON.MeshBuilder.CreatePlane('blackhole', {
        width: 2, height: 2
    }, sceneRef);

    mesh.position = new BABYLON.Vector3(0, 0, 0);
    mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    // Size: ~20% of the camera view at distance 65
    mesh.scaling = new BABYLON.Vector3(28, 28, 28);
    mesh.renderingGroupId = 1;
    mesh.isPickable = false;

    // Slight tilt — rotate the mesh slightly
    // Billboard overrides rotation, so we offset position slightly to create tilt illusion
    // Actually, we apply tilt in the shader via DISK_TILT parameter
    // For additional visual tilt, offset Y slightly
    mesh.position.y = -1.0;

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

    console.log('   ✓ Black hole with accretion disk created');
    return mesh;
}

/**
 * Update black hole animation
 */
export function updateBlackHole(elapsed) {
    if (material) material.setFloat('time', elapsed);
}

/**
 * Dispose black hole resources
 */
export function disposeBlackHole() {
    if (mesh) { mesh.dispose(); mesh = null; }
    if (material) { material.dispose(); material = null; }
}
