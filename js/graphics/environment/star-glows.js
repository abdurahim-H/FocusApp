// star-glows.js - Premium hero star glow halos
// Billboard sprites with animated soft radial glow + subtle diffraction spikes
// This is the key "expensive" visual that makes stars feel cinematic

let glowMeshes = [];
let glowMaterial = null;
let scene = null;

const HERO_STAR_COUNT = 70;

const GLOW_VERTEX = `
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

const GLOW_FRAGMENT = `
    precision highp float;
    varying vec2 vUV;
    uniform float time;
    uniform float starSeed;
    uniform float starBrightness;
    uniform vec3 starColor;

    void main() {
        vec2 uv = vUV - 0.5;
        float dist = length(uv);

        // Circular mask — kills the square edges completely
        float circleMask = smoothstep(0.5, 0.35, dist);
        if (circleMask < 0.001) discard;

        // === BREATHING PULSE — slow, organic ===
        float seed = starSeed;
        float pulse = 0.7 + 0.3 * sin(time * (0.3 + seed * 0.4) + seed * 6.283);
        pulse *= 0.85 + 0.15 * sin(time * (0.15 + seed * 0.2) + seed * 3.14);

        // === SOFT RADIAL GLOW — the halo ===
        float glow = exp(-dist * dist * 22.0);           // Tight bright core
        float halo = exp(-dist * dist * 6.0) * 0.35;     // Soft halo
        float outerHaze = exp(-dist * dist * 2.5) * 0.08; // Faint outer

        float totalGlow = (glow + halo + outerHaze) * circleMask;

        // === DIFFRACTION SPIKES — subtle cross pattern on brightest stars ===
        float spikeAngle1 = abs(uv.x * 0.7 + uv.y * 0.7);
        float spikeAngle2 = abs(uv.x * 0.7 - uv.y * 0.7);
        float spike1 = exp(-spikeAngle1 * spikeAngle1 * 800.0) * exp(-dist * 4.0);
        float spike2 = exp(-spikeAngle2 * spikeAngle2 * 800.0) * exp(-dist * 4.0);
        float spikes = (spike1 + spike2) * 0.2 * step(0.7, starBrightness) * circleMask;

        totalGlow += spikes;

        // Apply pulse and brightness
        totalGlow *= pulse * starBrightness;

        // Color — white-hot core fading to star color in halo
        vec3 coreColor = vec3(1.0, 0.98, 0.95);
        vec3 color = mix(starColor, coreColor, glow);
        color *= totalGlow;

        float alpha = clamp(totalGlow * 1.5, 0.0, 1.0);
        if (alpha < 0.003) discard;

        gl_FragColor = vec4(color, alpha);
    }
`;

/**
 * Create hero star glow system
 * @param {BABYLON.Scene} sceneRef
 * @param {BABYLON.Camera} camera
 */
export function createStarGlows(sceneRef, camera) {
    scene = sceneRef;
    console.log('✨ Creating hero star glow halos...');

    // Register shaders
    BABYLON.Effect.ShadersStore['starGlowVertexShader'] = GLOW_VERTEX;
    BABYLON.Effect.ShadersStore['starGlowFragmentShader'] = GLOW_FRAGMENT;

    for (let i = 0; i < HERO_STAR_COUNT; i++) {
        const seed = Math.random();

        // Position — scattered across the sky sphere
        const radius = 120 + Math.random() * 400;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);

        // Size — varies by "brightness class"
        const brightnessClass = Math.random();
        let size, brightness, color;

        if (brightnessClass < 0.15) {
            // Large bright — the "wow" stars
            size = 6 + Math.random() * 5;
            brightness = 0.85 + Math.random() * 0.15;
            // Blue-white
            color = new BABYLON.Vector3(0.8, 0.88, 1.0);
        } else if (brightnessClass < 0.4) {
            // Medium bright
            size = 3.5 + Math.random() * 3;
            brightness = 0.55 + Math.random() * 0.3;
            // White
            color = new BABYLON.Vector3(1.0, 0.97, 0.92);
        } else if (brightnessClass < 0.65) {
            // Smaller warm
            size = 2 + Math.random() * 2;
            brightness = 0.35 + Math.random() * 0.25;
            // Warm white
            color = new BABYLON.Vector3(1.0, 0.90, 0.78);
        } else {
            // Subtle golden glow
            size = 1.5 + Math.random() * 2;
            brightness = 0.2 + Math.random() * 0.2;
            // Gold tint
            color = new BABYLON.Vector3(1.0, 0.82, 0.55);
        }

        // Create billboard plane
        const plane = BABYLON.MeshBuilder.CreatePlane('heroStar_' + i, {
            width: size, height: size
        }, scene);

        plane.position = new BABYLON.Vector3(x, y, z);
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        plane.renderingGroupId = 0;
        plane.isPickable = false;

        // Individual material per star (unique seed/brightness/color)
        const mat = new BABYLON.ShaderMaterial('starGlowMat_' + i, scene, {
            vertex: 'starGlow', fragment: 'starGlow'
        }, {
            attributes: ['position', 'uv'],
            uniforms: ['worldViewProjection', 'time', 'starSeed', 'starBrightness', 'starColor'],
            needAlphaBlending: true
        });

        mat.setFloat('time', 0);
        mat.setFloat('starSeed', seed);
        mat.setFloat('starBrightness', brightness);
        mat.setVector3('starColor', color);
        mat.backFaceCulling = false;
        mat.alphaMode = BABYLON.Engine.ALPHA_ADD;
        mat.forceDepthWrite = false;

        plane.material = mat;

        glowMeshes.push({ mesh: plane, material: mat });
    }

    console.log(`   ✓ ${HERO_STAR_COUNT} hero star glows created`);
}

/**
 * Update hero star glows
 * @param {number} elapsed - seconds since start
 */
export function updateStarGlows(elapsed) {
    for (let i = 0; i < glowMeshes.length; i++) {
        glowMeshes[i].material.setFloat('time', elapsed);
    }
}

/**
 * Dispose all hero star resources
 */
export function disposeStarGlows() {
    for (let i = 0; i < glowMeshes.length; i++) {
        glowMeshes[i].mesh.dispose();
        glowMeshes[i].material.dispose();
    }
    glowMeshes = [];
    glowMaterial = null;
    scene = null;
}
