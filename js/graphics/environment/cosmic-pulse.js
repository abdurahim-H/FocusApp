// cosmic-pulse.js - Subtle radial brightness ripple
// A gentle "heartbeat of the cosmos" — barely perceptible brightness wave
// emanating from center every 10-15 seconds

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

    void main() {
        vec2 uv = vUV - 0.5;
        float dist = length(uv);

        // Pulse timing — one pulse every ~12 seconds
        float cycleTime = mod(time, 12.0);

        // Pulse wave — expands outward from center
        // Active only during first ~4 seconds of each cycle
        float pulsePhase = cycleTime / 4.0;  // 0 to 1 over 4 seconds
        float isActive = step(0.0, pulsePhase) * step(pulsePhase, 1.0);

        // Ring shape — expanding outward
        float ringRadius = pulsePhase * 0.55;
        float ringWidth = 0.08 + pulsePhase * 0.12; // Widens as it expands
        float ring = exp(-pow(dist - ringRadius, 2.0) / (ringWidth * ringWidth * 0.5));

        // Fade out as ring expands
        float fadeOut = 1.0 - pulsePhase;
        fadeOut = fadeOut * fadeOut; // Quadratic — faster fade

        // Very subtle — barely perceptible warmth
        float intensity = ring * fadeOut * isActive * 0.06;

        // Warm golden-white tint
        vec3 color = vec3(1.0, 0.92, 0.75) * intensity;

        // Second pulse — offset by half cycle, even subtler
        float cycleTime2 = mod(time + 6.0, 12.0);
        float pulsePhase2 = cycleTime2 / 5.0;
        float isActive2 = step(0.0, pulsePhase2) * step(pulsePhase2, 1.0);
        float ringRadius2 = pulsePhase2 * 0.5;
        float ringWidth2 = 0.1 + pulsePhase2 * 0.15;
        float ring2 = exp(-pow(dist - ringRadius2, 2.0) / (ringWidth2 * ringWidth2 * 0.5));
        float fadeOut2 = (1.0 - pulsePhase2);
        fadeOut2 = fadeOut2 * fadeOut2;
        float intensity2 = ring2 * fadeOut2 * isActive2 * 0.03;

        // Cool blue tint for the second pulse — variety
        color += vec3(0.7, 0.8, 1.0) * intensity2;

        float alpha = clamp(length(color) * 8.0, 0.0, 1.0);
        if (alpha < 0.002) discard;

        gl_FragColor = vec4(color, alpha);
    }
`;

/**
 * Create the cosmic pulse overlay
 */
export function createCosmicPulse(sceneRef, camera) {

    BABYLON.Effect.ShadersStore['cosmicPulseVertexShader'] = VERTEX;
    BABYLON.Effect.ShadersStore['cosmicPulseFragmentShader'] = FRAGMENT;

    // Large billboard plane — fills the view
    mesh = BABYLON.MeshBuilder.CreatePlane('cosmicPulse', {
        width: 2, height: 2
    }, sceneRef);

    mesh.position = BABYLON.Vector3.Zero();
    mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    mesh.scaling = new BABYLON.Vector3(140, 140, 140);
    mesh.renderingGroupId = 2; // Render on top of everything except UI
    mesh.isPickable = false;

    material = new BABYLON.ShaderMaterial('cosmicPulseMat', sceneRef, {
        vertex: 'cosmicPulse', fragment: 'cosmicPulse'
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

}

/**
 * Update pulse animation
 */
export function updateCosmicPulse(elapsed) {
    if (material) material.setFloat('time', elapsed);
}

/**
 * Dispose pulse resources
 */
export function disposeCosmicPulse() {
    if (mesh) { mesh.dispose(); mesh = null; }
    if (material) { material.dispose(); material = null; }
}
