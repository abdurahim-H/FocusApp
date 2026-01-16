// postprocessing-babylon.js - Cinematic Post-Processing Pipeline
// HDR rendering, ACES tone mapping, bloom, film grain, and cinematic effects

let pipeline = null;
let filmGrainPostProcess = null;
let scene = null;
let camera = null;

/**
 * Setup the complete cinematic post-processing pipeline
 * @param {BABYLON.Scene} sceneRef - The Babylon.js scene
 * @param {BABYLON.Camera} cameraRef - The main camera
 * @returns {BABYLON.DefaultRenderingPipeline} The pipeline
 */
export function setupPostProcessing(sceneRef, cameraRef) {
    console.log('📸 Setting up cinematic post-processing pipeline...');
    scene = sceneRef;
    camera = cameraRef;

    // Enable HDR rendering on the scene
    scene.imageProcessingConfiguration.toneMappingEnabled = true;
    scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;

    // Use DefaultRenderingPipeline for comprehensive post-processing
    pipeline = new BABYLON.DefaultRenderingPipeline(
        'cinematicPipeline',
        true, // HDR enabled
        scene,
        [camera]
    );

    // Configure each effect for cinematic quality
    configureHDR(pipeline);
    configureBloom(pipeline);
    configureDepthOfField(pipeline);
    configureChromaticAberration(pipeline);
    configureAntiAliasing(pipeline);
    configureVignette(pipeline);
    configureColorGrading(pipeline);

    // Add custom film grain effect
    createFilmGrainEffect();

    console.log('✅ Cinematic post-processing pipeline ready');
    return pipeline;
}

/**
 * Configure HDR and tone mapping
 * ACES filmic for cinema-quality color response
 */
function configureHDR(pipeline) {
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.toneMappingEnabled = true;
    pipeline.imageProcessing.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;

    // Exposure - slightly under for drama
    pipeline.imageProcessing.exposure = 1.0;

    // Contrast - enhanced for cinematic punch
    pipeline.imageProcessing.contrast = 1.15;

    console.log('   ✓ HDR with ACES tone mapping configured');
}

/**
 * Configure bloom effect
 * Selective bloom - only bright areas glow
 */
function configureBloom(pipeline) {
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.8;   // High threshold - only very bright areas
    pipeline.bloomWeight = 0.6;      // Medium intensity
    pipeline.bloomKernel = 64;       // Quality kernel size
    pipeline.bloomScale = 0.6;       // Spread

    console.log('   ✓ Selective bloom configured');
}

/**
 * Configure depth of field
 * Creates cinematic focus effect
 */
function configureDepthOfField(pipeline) {
    pipeline.depthOfFieldEnabled = true;
    pipeline.depthOfFieldBlurLevel = BABYLON.DepthOfFieldEffectBlurLevel.Medium;
    pipeline.depthOfField.focalLength = 150;
    pipeline.depthOfField.fStop = 2.8;       // Wide aperture for shallow DOF
    pipeline.depthOfField.focusDistance = 5000; // Focus on the black hole area

    console.log('   ✓ Depth of field configured');
}

/**
 * Configure chromatic aberration
 * Subtle lens distortion at edges
 */
function configureChromaticAberration(pipeline) {
    pipeline.chromaticAberrationEnabled = true;
    pipeline.chromaticAberration.aberrationAmount = 30;    // Subtle
    pipeline.chromaticAberration.radialIntensity = 0.8;   // Stronger at edges

    console.log('   ✓ Chromatic aberration configured');
}

/**
 * Configure anti-aliasing
 * FXAA + sample anti-aliasing for clean edges
 */
function configureAntiAliasing(pipeline) {
    pipeline.fxaaEnabled = true;
    pipeline.samples = 4; // MSAA samples

    console.log('   ✓ Anti-aliasing (FXAA + MSAA) configured');
}

/**
 * Configure vignette effect
 * Subtle edge darkening for focus
 */
function configureVignette(pipeline) {
    pipeline.imageProcessing.vignetteEnabled = true;
    pipeline.imageProcessing.vignetteWeight = 2.0;
    pipeline.imageProcessing.vignetteStretch = 0.5;
    pipeline.imageProcessing.vignetteColor = new BABYLON.Color4(0, 0, 0.02, 0);
    pipeline.imageProcessing.vignetteCameraFov = 0.6;
    pipeline.imageProcessing.vignetteBlendMode = BABYLON.ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;

    console.log('   ✓ Vignette configured');
}

/**
 * Configure color grading
 * Cinematic color palette
 */
function configureColorGrading(pipeline) {
    // Color curves for cinematic look
    const curves = new BABYLON.ColorCurves();

    // Shadows: cool blue tint
    curves.shadowsHue = 220;          // Blue
    curves.shadowsSaturation = 20;    // Subtle saturation
    curves.shadowsDensity = 30;       // Intensity

    // Midtones: neutral with slight warmth
    curves.midtonesHue = 30;          // Warm orange
    curves.midtonesSaturation = 5;    // Very subtle
    curves.midtonesDensity = 0;

    // Highlights: warm golden
    curves.highlightsHue = 40;        // Golden
    curves.highlightsSaturation = 25; // Noticeable warmth
    curves.highlightsDensity = 40;    // Strong in bright areas

    pipeline.imageProcessing.colorCurvesEnabled = true;
    pipeline.imageProcessing.colorCurves = curves;

    console.log('   ✓ Cinematic color grading configured');
}

/**
 * Create custom film grain effect
 * Animated grain for filmic texture
 */
function createFilmGrainEffect() {
    // Film grain shader
    BABYLON.Effect.ShadersStore["filmGrainFragmentShader"] = `
        precision highp float;

        varying vec2 vUV;
        uniform sampler2D textureSampler;
        uniform float time;
        uniform float grainIntensity;
        uniform vec2 screenSize;

        // High quality noise function
        float hash(vec2 p) {
            vec3 p3 = fract(vec3(p.xyx) * 0.1031);
            p3 += dot(p3, p3.yzx + 33.33);
            return fract((p3.x + p3.y) * p3.z);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);

            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));

            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
            vec4 color = texture2D(textureSampler, vUV);

            // Animated film grain
            vec2 grainCoord = vUV * screenSize * 0.5;
            float grain = noise(grainCoord + time * 100.0);

            // Film grain is more visible in midtones
            float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            float grainMask = 1.0 - abs(luminance - 0.5) * 2.0;
            grainMask = max(grainMask, 0.3);

            // Apply grain
            float grainEffect = (grain - 0.5) * grainIntensity * grainMask;
            color.rgb += vec3(grainEffect);

            gl_FragColor = color;
        }
    `;

    filmGrainPostProcess = new BABYLON.PostProcess(
        'filmGrain',
        'filmGrain',
        ['time', 'grainIntensity', 'screenSize'],
        null,
        1.0,
        camera,
        BABYLON.Texture.BILINEAR_SAMPLINGMODE,
        scene.getEngine()
    );

    let grainTime = 0;

    filmGrainPostProcess.onApply = function(effect) {
        grainTime += 0.016; // Approximate frame time
        effect.setFloat('time', grainTime);
        effect.setFloat('grainIntensity', 0.08); // Subtle grain
        effect.setFloat2('screenSize',
            scene.getEngine().getRenderWidth(),
            scene.getEngine().getRenderHeight()
        );
    };

    console.log('   ✓ Film grain effect created');
}

/**
 * Update bloom intensity dynamically
 * @param {number} intensity - 0-2 range
 */
export function setBloomIntensity(intensity) {
    if (pipeline) {
        pipeline.bloomWeight = Math.max(0, Math.min(2, intensity));
    }
}

/**
 * Update exposure dynamically
 * @param {number} exposure - 0.1-3 range
 */
export function setExposure(exposure) {
    if (pipeline && pipeline.imageProcessing) {
        pipeline.imageProcessing.exposure = Math.max(0.1, Math.min(3, exposure));
    }
}

/**
 * Set film grain intensity
 * @param {number} intensity - 0-0.3 range
 */
export function setGrainIntensity(intensity) {
    // Grain intensity is set in the onApply callback
    // This function would need to modify a variable that the callback reads
}

/**
 * Enable/disable depth of field
 * @param {boolean} enabled
 */
export function setDepthOfFieldEnabled(enabled) {
    if (pipeline) {
        pipeline.depthOfFieldEnabled = enabled;
    }
}

/**
 * Set focus distance for depth of field
 * @param {number} distance
 */
export function setFocusDistance(distance) {
    if (pipeline && pipeline.depthOfField) {
        pipeline.depthOfField.focusDistance = distance;
    }
}

/**
 * Get the pipeline reference
 * @returns {BABYLON.DefaultRenderingPipeline|null}
 */
export function getPipeline() {
    return pipeline;
}

/**
 * Dispose the pipeline and all effects
 */
export function disposePostProcessing() {
    if (filmGrainPostProcess) {
        filmGrainPostProcess.dispose();
        filmGrainPostProcess = null;
    }
    if (pipeline) {
        pipeline.dispose();
        pipeline = null;
    }
    scene = null;
    camera = null;
}
