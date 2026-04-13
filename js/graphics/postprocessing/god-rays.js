// god-rays.js - Screen-space radial light beams from black hole
// Classic GPU Gems volumetric light scattering technique
// Radial march from fragment toward projected black hole center

let godRayPostProcess = null;
let lightScreenPos = { x: 0.5, y: 0.5 };

// Mutable shader params — modifiable at runtime via the settings store.
// Exposure 0 effectively disables the effect while keeping the post-process
// attached (avoids having to re-link the post chain on toggle).
let params = { density: 0.6, decay: 0.94, exposure: 0.1 };

// Reusable objects — avoids creating new Vector3/Matrix/viewport every frame (GC pressure fix)
let _bhWorldPos = null;
let _identityMatrix = null;
const _viewport = { x: 0, y: 0, width: 0, height: 0 };

const GODRAY_FRAGMENT = `
    precision highp float;
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform vec2 lightPos;
    uniform float density;
    uniform float decay;
    uniform float exposure;

    void main() {
        vec3 scene = texture2D(textureSampler, vUV).rgb;

        vec2 deltaUV = (vUV - lightPos) * density / 8.0;

        vec3 rays = vec3(0.0);
        float illuminationDecay = 1.0;
        vec2 sampleUV = vUV;

        for (int i = 0; i < 8; i++) {
            sampleUV -= deltaUV;
            // Clamp to screen bounds
            vec2 clamped = clamp(sampleUV, 0.0, 1.0);
            vec3 s = texture2D(textureSampler, clamped).rgb;
            // Only bright areas contribute
            float lum = dot(s, vec3(0.2126, 0.7152, 0.0722));
            s *= max(lum - 0.9, 0.0);
            rays += s * illuminationDecay;
            illuminationDecay *= decay;
        }

        // Warm orange tint matching accretion disk
        rays *= exposure * vec3(1.0, 0.75, 0.45);

        // Fade rays at screen edges to avoid hard cutoff
        float edgeFade = smoothstep(0.0, 0.15, min(min(vUV.x, 1.0 - vUV.x), min(vUV.y, 1.0 - vUV.y)));
        rays *= edgeFade;

        gl_FragColor = vec4(scene + rays, 1.0);
    }
`;

/**
 * Create god ray post-process
 * @param {BABYLON.Scene} scene
 * @param {BABYLON.Camera} camera
 */
export function createGodRays(scene, camera) {
    BABYLON.Effect.ShadersStore['godRaysFragmentShader'] = GODRAY_FRAGMENT;

    godRayPostProcess = new BABYLON.PostProcess(
        'godRays',
        'godRays',
        ['lightPos', 'density', 'decay', 'exposure'],
        null,
        0.5, // Half resolution
        camera,
        BABYLON.Texture.BILINEAR_SAMPLINGMODE,
        scene.getEngine()
    );

    godRayPostProcess.onApply = function (effect) {
        effect.setFloat2('lightPos', lightScreenPos.x, lightScreenPos.y);
        effect.setFloat('density', params.density);
        effect.setFloat('decay', params.decay);
        effect.setFloat('exposure', params.exposure);
    };

    return godRayPostProcess;
}

/** Live-tunable controls (read by the onApply callback each frame). */
export function setGodRayExposure(v) {
    params.exposure = Math.max(0, Math.min(0.3, v));
}
export function setGodRayDensity(v) {
    params.density = Math.max(0, Math.min(2, v));
}
export function setGodRayDecay(v) {
    params.decay = Math.max(0.5, Math.min(1, v));
}

/**
 * Update the black hole's projected screen position
 * Call each frame from the render loop
 * @param {BABYLON.Scene} scene
 * @param {BABYLON.Camera} camera
 */
export function updateGodRays(scene, camera) {
    if (!godRayPostProcess) return;

    // Lazy-init cached objects (BABYLON may not be loaded at module eval time)
    if (!_bhWorldPos) _bhWorldPos = new BABYLON.Vector3(0, -0.5, 0);
    if (!_identityMatrix) _identityMatrix = BABYLON.Matrix.Identity();

    // Project to screen space [0,1]
    const engine = scene.getEngine();
    _viewport.width = engine.getRenderWidth();
    _viewport.height = engine.getRenderHeight();
    const projected = BABYLON.Vector3.Project(
        _bhWorldPos,
        _identityMatrix,
        scene.getTransformMatrix(),
        _viewport
    );

    lightScreenPos.x = projected.x / engine.getRenderWidth();
    lightScreenPos.y = projected.y / engine.getRenderHeight();
}

export function disposeGodRays() {
    if (godRayPostProcess) {
        godRayPostProcess.dispose();
        godRayPostProcess = null;
    }
}
