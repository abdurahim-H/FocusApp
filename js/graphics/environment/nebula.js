// nebula.js - Wide flowing golden shawl
// A broad river of golden silk with internal flowing structure and dusty dissolving edges

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

    // Saturated vibrant gold — warm amber, not pale/white
    vec3 gold(float t) {
        vec3 hot    = vec3(1.0, 0.85, 0.45);     // Hottest — warm gold, NOT white
        vec3 bright = vec3(1.0, 0.70, 0.18);      // Bright saturated gold
        vec3 rich   = vec3(0.95, 0.48, 0.04);     // Rich deep amber
        vec3 deep   = vec3(0.65, 0.28, 0.02);     // Deep warm amber
        vec3 dark   = vec3(0.35, 0.14, 0.01);     // Dark bronze
        t = clamp(t, 0.0, 1.0);
        if (t > 0.85) return mix(bright, hot, (t - 0.85) / 0.15);
        if (t > 0.55) return mix(rich, bright, (t - 0.55) / 0.3);
        if (t > 0.25) return mix(deep, rich, (t - 0.25) / 0.3);
        return mix(dark, deep, t / 0.25);
    }

    // Dramatic S-curve path — MORE CURVED: higher amplitude, more harmonics
    float curvePath(float x, float timeOff, float amp) {
        float t = time * 0.018 + timeOff;
        return amp * sin(x * 1.8 + t)
             + amp * 0.6 * sin(x * 3.2 + t * 1.3 + 1.8)
             + amp * 0.3 * sin(x * 5.5 + t * 0.7 + 3.5)
             + amp * 0.15 * sin(x * 8.0 + t * 0.5 + 5.0);
    }

    // Get distance to the wide band path
    float bandDist(vec2 p, float yOff, float timeOff, float amp) {
        return p.y - yOff - curvePath(p.x, timeOff, amp);
    }

    void main() {
        vec2 uv = vUV - 0.5;

        // Soft edge fade at plane boundaries
        float edgeFade = smoothstep(0.5, 0.35, max(abs(uv.x), abs(uv.y)));
        if (edgeFade < 0.001) discard;

        // No center clearance — blackhole will be handled separately

        // Diagonal rotation — sweeps from lower-left to upper-right
        float angle = 0.4;
        mat2 rotM = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        vec2 ruv = rotM * uv;

        vec3 color = vec3(0.0);
        float flow = time * 0.025;

        // ============================================
        // MAIN GOLDEN SHAWL — wide flowing band
        // SMALLER: bandWidth 0.07 -> 0.05, amp 0.13 -> 0.17 (more curved)
        // ============================================
        float mainD = bandDist(ruv, 0.0, 0.0, 0.17);

        // Wide band shape — variable width via noise (SMALLER)
        float widthNoise = fbm(vec2(ruv.x * 3.0 - flow * 1.5, 0.5)) * 0.02;
        float bandWidth = 0.05 + widthNoise;

        // Normalized position within band: 0 = center, 1 = edge
        float bandPos = abs(mainD) / bandWidth;

        // Smooth core mask
        float bandMask = smoothstep(1.0, 0.6, bandPos);

        // Dissolving dusty edges — noise breaks up the smooth falloff
        float edgeNoise = fbm(vec2(ruv.x * 12.0 - flow * 3.0, ruv.y * 12.0 + flow));
        float dustEdge = smoothstep(1.3, 0.4, bandPos - edgeNoise * 0.5);
        bandMask = max(bandMask, dustEdge * 0.4);

        // Extra dust dissolution beyond band edge
        float farDust = smoothstep(1.8, 0.8, bandPos) * pow(edgeNoise, 2.0);
        bandMask = max(bandMask, farDust * 0.15);

        if (bandMask > 0.001) {
            // Internal flowing structure — bright filaments within the band
            float flowCoord = ruv.x * 8.0 - flow * 4.0;
            float filamentNoise = fbm(vec2(flowCoord, ruv.y * 30.0 + mainD * 15.0));

            // Create bright lanes within the shawl
            float filaments = smoothstep(0.3, 0.7, filamentNoise);
            filaments = pow(filaments, 1.5);

            // Bright center core
            float coreIntensity = smoothstep(0.4, 0.0, bandPos);

            // Build color — MORE TRANSPARENT: reduced multipliers
            float brightness = filaments * bandMask * 0.55 + coreIntensity * 0.4;

            // Hotter where brighter
            color += gold(brightness * 1.2 + 0.15) * brightness * 1.3;

            // Extra bright core filaments
            float hotFilament = pow(filamentNoise, 4.0) * coreIntensity;
            color += gold(0.95) * hotFilament * 0.8;
        }

        // ============================================
        // SECOND SHAWL — smaller, different path
        // SMALLER: width 0.045 -> 0.035, amp 0.10 -> 0.14 (more curved)
        // ============================================
        float secD = bandDist(ruv, -0.18, 0.8, 0.14);
        float secWidth = 0.035 + fbm(vec2(ruv.x * 3.5 - flow * 1.2, 1.5)) * 0.015;
        float secPos = abs(secD) / secWidth;
        float secMask = smoothstep(1.0, 0.5, secPos);

        // Dusty edges for second band
        float secEdge = fbm(vec2(ruv.x * 14.0 - flow * 2.5, ruv.y * 14.0));
        float secDust = smoothstep(1.4, 0.5, secPos - secEdge * 0.4);
        secMask = max(secMask, secDust * 0.3);

        if (secMask > 0.001) {
            float secFlow = ruv.x * 9.0 - flow * 3.5;
            float secFilaments = fbm(vec2(secFlow, ruv.y * 25.0 + secD * 12.0));
            secFilaments = pow(smoothstep(0.3, 0.7, secFilaments), 1.5);

            float secCore = smoothstep(0.4, 0.0, secPos);
            // MORE TRANSPARENT: reduced multipliers
            float secBright = secFilaments * secMask * 0.45 + secCore * 0.3;

            color += gold(secBright * 1.1 + 0.1) * secBright * 1.0;
        }

        // ============================================
        // THIN ACCENT STRAND — delicate single line (more curved)
        // ============================================
        float accD = abs(bandDist(ruv, 0.2, 1.5, 0.12));
        float accLine = smoothstep(0.004, 0.0, accD);
        float accGlow = smoothstep(0.015, 0.0, accD);
        color += gold(0.9) * accLine * 0.7;
        color += gold(0.5) * accGlow * 0.12;

        // ============================================
        // SCATTERED AMBIENT GOLDEN DUST in dark areas
        // ============================================
        float ambDust = fbm(uv * 5.0 + vec2(-flow * 0.8, flow * 0.4));
        ambDust = pow(ambDust, 5.5);
        color += gold(0.35) * ambDust * 0.08;

        // ============================================
        // BLUE-WHITE SKY GLOW — contrast with gold
        // ============================================
        float blueGlow = exp(-pow(uv.x + 0.05, 2.0) * 6.0 - pow(uv.y - 0.18, 2.0) * 10.0);
        color += vec3(0.06, 0.09, 0.16) * blueGlow * 0.35;

        // Apply edge fade + transparency
        color *= edgeFade * 0.6;
        float alpha = edgeFade * clamp(length(color) * 3.0, 0.0, 1.0);

        gl_FragColor = vec4(color, alpha);
    }
`;

export function createNebula(sceneRef, camera, octaves = 5) {

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

    return mesh;
}

export function updateNebula(elapsed) {
    if (material) material.setFloat('time', elapsed);
}

export function disposeNebula() {
    if (mesh) { mesh.dispose(); mesh = null; }
    if (material) { material.dispose(); material = null; }
}
