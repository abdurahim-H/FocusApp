// gravitational-lensing.js - Schwarzschild Metric Spacetime Distortion
// Post-process effect that bends light around the black hole

import { SCHWARZSCHILD_RADIUS } from './constants.js';

let lensingPostProcess = null;
let time = 0;

// Track if shader is registered
let shaderRegistered = false;

/**
 * Register the gravitational lensing shader with Babylon.js
 */
function registerShader() {
    if (shaderRegistered) return;

    BABYLON.Effect.ShadersStore["gravitationalLensingFragmentShader"] = `
        precision highp float;

        // Samplers
        varying vec2 vUV;
        uniform sampler2D textureSampler;

        // Uniforms
        uniform vec2 screenSize;
        uniform vec2 blackHoleScreenPos;
        uniform float schwarzschildRadius;
        uniform float lensingStrength;
        uniform float time;

        void main() {
            vec2 uv = vUV;

            // Calculate direction and distance from black hole center
            vec2 toCenter = blackHoleScreenPos - uv;
            float dist = length(toCenter);
            vec2 dir = normalize(toCenter);

            // Avoid division by zero
            if (dist < 0.001) {
                gl_FragColor = texture2D(textureSampler, uv);
                return;
            }

            // Schwarzschild-like lensing formula
            // Deflection angle increases as we get closer to the event horizon
            float rs = schwarzschildRadius; // Schwarzschild radius in screen space

            // Einstein ring radius (where deflection is maximum)
            float einsteinRadius = rs * 2.5;

            // Calculate deflection based on impact parameter
            float impactParam = dist;
            float deflection = 0.0;

            if (impactParam > rs * 0.5) {
                // Approximate deflection angle: 4GM/c²b simplified
                deflection = lensingStrength * rs / impactParam;

                // Enhanced bending near photon sphere
                float photonSphere = rs * 1.5;
                if (impactParam < photonSphere * 2.0) {
                    float proximity = 1.0 - (impactParam - rs * 0.5) / (photonSphere * 1.5);
                    proximity = clamp(proximity, 0.0, 1.0);
                    deflection *= (1.0 + proximity * 3.0);
                }
            }

            // Apply the deflection - bend light toward the black hole
            vec2 deflectedUV = uv + dir * deflection;

            // Add subtle chromatic aberration near the edge
            float chromatic = deflection * 0.3;
            vec2 redUV = uv + dir * (deflection + chromatic);
            vec2 blueUV = uv + dir * (deflection - chromatic);

            // Sample with chromatic aberration
            float r = texture2D(textureSampler, redUV).r;
            float g = texture2D(textureSampler, deflectedUV).g;
            float b = texture2D(textureSampler, blueUV).b;

            vec3 color = vec3(r, g, b);

            // Darken inside event horizon
            if (dist < rs * 0.8) {
                float darkness = smoothstep(rs * 0.3, rs * 0.8, dist);
                color *= darkness;
            }

            // Add subtle Einstein ring glow at the right distance
            float ringDist = abs(dist - einsteinRadius);
            float ringGlow = exp(-ringDist * ringDist * 500.0) * 0.15;
            color += vec3(0.8, 0.75, 0.6) * ringGlow;

            gl_FragColor = vec4(color, 1.0);
        }
    `;

    shaderRegistered = true;
}

/**
 * Create gravitational lensing post-process effect
 * Distorts the background based on Schwarzschild metric
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 * @param {BABYLON.Camera} camera - The main camera
 * @param {BABYLON.TransformNode} blackHoleGroup - The black hole transform node
 * @returns {BABYLON.PostProcess} The lensing post-process
 */
export function createGravitationalLensing(scene, camera, blackHoleGroup) {
    console.log('🌀 Creating gravitational lensing effect...');

    // Register shader
    registerShader();

    // Create the post-process
    lensingPostProcess = new BABYLON.PostProcess(
        'gravitationalLensing',
        'gravitationalLensing',
        ['screenSize', 'blackHoleScreenPos', 'schwarzschildRadius', 'lensingStrength', 'time'],
        null,
        1.0,
        camera,
        BABYLON.Texture.BILINEAR_SAMPLINGMODE,
        scene.getEngine()
    );

    lensingPostProcess.onApply = function (effect) {
        const engine = scene.getEngine();
        effect.setFloat2('screenSize', engine.getRenderWidth(), engine.getRenderHeight());

        // Project black hole position to screen space
        if (blackHoleGroup) {
            const worldPos = blackHoleGroup.getAbsolutePosition();
            const screenPos = BABYLON.Vector3.Project(
                worldPos,
                BABYLON.Matrix.Identity(),
                scene.getTransformMatrix(),
                camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
            );

            // Normalize to 0-1 range
            const normalizedX = screenPos.x / engine.getRenderWidth();
            const normalizedY = 1.0 - (screenPos.y / engine.getRenderHeight()); // Flip Y

            effect.setFloat2('blackHoleScreenPos', normalizedX, normalizedY);
        } else {
            effect.setFloat2('blackHoleScreenPos', 0.5, 0.5);
        }

        // Schwarzschild radius in screen space (approximate)
        effect.setFloat('schwarzschildRadius', 0.08);
        effect.setFloat('lensingStrength', 0.15);
        effect.setFloat('time', time);
    };

    console.log('   ✓ Gravitational lensing post-process created');
    return lensingPostProcess;
}

/**
 * Update lensing effect time
 * @param {number} elapsed - Elapsed time in seconds
 */
export function updateGravitationalLensing(elapsed) {
    time = elapsed;
}

/**
 * Get the lensing post-process
 * @returns {BABYLON.PostProcess|null}
 */
export function getLensingPostProcess() {
    return lensingPostProcess;
}

/**
 * Set lensing strength
 * @param {number} strength - Lensing strength (0-1)
 */
export function setLensingStrength(strength) {
    // This will be applied on next frame through onApply
    // Could be enhanced to store and apply the value
}

/**
 * Dispose lensing resources
 */
export function disposeGravitationalLensing() {
    if (lensingPostProcess) {
        lensingPostProcess.dispose();
        lensingPostProcess = null;
    }
}
