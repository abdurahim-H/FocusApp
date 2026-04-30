// pipeline.js - Cinematic Post-Processing Pipeline
// HDR rendering, ACES tone mapping, bloom, film grain, and cinematic effects

let pipeline = null;
let filmGrainPostProcess = null;
let scene = null;
let camera = null;
let isWebGPU = false;

// Mutable knobs used by live settings. Read inside shader onApply callbacks
// and by scene-manager's auto-exposure loop.
let baseExposure = 1.2;
let grainIntensity = 0.03;

/**
 * Setup the complete cinematic post-processing pipeline
 * @param {BABYLON.Scene} sceneRef - The Babylon.js scene
 * @param {BABYLON.Camera} cameraRef - The main camera
 * @returns {BABYLON.DefaultRenderingPipeline} The pipeline
 */
export function setupPostProcessing(sceneRef, cameraRef) {
    scene = sceneRef;
    camera = cameraRef;

    // Detect if using WebGPU engine
    const engine = scene.getEngine();
    isWebGPU = engine.isWebGPU || (engine.name && engine.name.includes('WebGPU'));
    // Enable HDR rendering on the scene
    scene.imageProcessingConfiguration.toneMappingEnabled = true;
    scene.imageProcessingConfiguration.toneMappingType =
        BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;

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

    // NOTE: Film grain is created separately via createFilmGrain() for post-process ordering control
    // New effects (anamorphic streak, god rays) are inserted between pipeline and film grain

    return pipeline;
}

/**
 * Configure HDR and tone mapping
 * ACES filmic for cinema-quality color response
 */
function configureHDR(pipeline) {
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.toneMappingEnabled = true;
    pipeline.imageProcessing.toneMappingType =
        BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;

    // Exposure — slightly brighter for vibrancy. Mutable via setBaseExposure.
    pipeline.imageProcessing.exposure = baseExposure;

    // Contrast — punchy, vibrant colors
    pipeline.imageProcessing.contrast = 1.4;
}

/**
 * Configure bloom effect
 * Selective bloom - only bright areas glow
 */
function configureBloom(pipeline) {
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.65; // Catches hero star glows + bright nebula
    pipeline.bloomWeight = 0.55; // Visible glow on bright stars
    pipeline.bloomKernel = 64; // Quality kernel
    pipeline.bloomScale = 0.55; // Slightly wider for star halos
}

/**
 * Configure depth of field
 * Creates cinematic focus effect
 * NOTE: Disabled on WebGPU due to rgba16float texture format compatibility issues
 */
function configureDepthOfField(pipeline) {
    // WebGPU has issues with DOF's circleOfConfusion pass (rgba16float format)
    if (isWebGPU) {
        pipeline.depthOfFieldEnabled = false;
        return;
    }

    pipeline.depthOfFieldEnabled = true;
    // DOF is disabled by default - it can make the scene blurry if misconfigured
    pipeline.depthOfFieldEnabled = false;
    pipeline.depthOfFieldBlurLevel = BABYLON.DepthOfFieldEffectBlurLevel.Low;
    pipeline.depthOfField.focalLength = 50;
    pipeline.depthOfField.fStop = 4.0; // Smaller aperture = more in focus
    pipeline.depthOfField.focusDistance = 65; // Match camera distance
}

/**
 * Configure chromatic aberration
 * Very subtle lens distortion at edges only
 */
function configureChromaticAberration(pipeline) {
    pipeline.chromaticAberrationEnabled = true;
    pipeline.chromaticAberration.aberrationAmount = 2; // Barely perceptible
    pipeline.chromaticAberration.radialIntensity = 0.8; // Edges only
}

/**
 * Configure anti-aliasing
 * FXAA + sample anti-aliasing for clean edges
 */
function configureAntiAliasing(pipeline) {
    pipeline.fxaaEnabled = true;

    // Reduce MSAA samples on WebGPU to avoid texture format issues
    pipeline.samples = isWebGPU ? 1 : 4;
}

/**
 * Configure vignette effect
 * Subtle edge darkening for focus
 */
function configureVignette(pipeline) {
    pipeline.imageProcessing.vignetteEnabled = true;
    pipeline.imageProcessing.vignetteWeight = 1.5;
    pipeline.imageProcessing.vignetteStretch = 0.5;
    pipeline.imageProcessing.vignetteColor = new BABYLON.Color4(0, 0, 0.02, 0);
    pipeline.imageProcessing.vignetteCameraFov = 0.6;
    pipeline.imageProcessing.vignetteBlendMode =
        BABYLON.ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
}

/**
 * Configure color grading
 * Cinematic color palette
 */
function configureColorGrading(pipeline) {
    // Color curves for cinematic look
    const curves = new BABYLON.ColorCurves();

    // Shadows: cool deep blue-black
    curves.shadowsHue = 230;
    curves.shadowsSaturation = 12;
    curves.shadowsDensity = 15;

    // Midtones: warm golden push
    curves.midtonesHue = 35;
    curves.midtonesSaturation = 10;
    curves.midtonesDensity = 5;

    // Highlights: golden warmth
    curves.highlightsHue = 38;
    curves.highlightsSaturation = 20;
    curves.highlightsDensity = 25;

    pipeline.imageProcessing.colorCurvesEnabled = true;
    pipeline.imageProcessing.colorCurves = curves;
}

/**
 * Enable cinematic depth of field (WebGL2 only)
 * @param {number} focusDistance
 */
export function enableCinematicDOF(focusDistance = 65) {
    if (pipeline && !isWebGPU) {
        pipeline.depthOfFieldEnabled = true;
        pipeline.depthOfField.focusDistance = focusDistance;
        pipeline.depthOfField.fStop = 2.8;
        pipeline.depthOfFieldBlurLevel = BABYLON.DepthOfFieldEffectBlurLevel.Medium;
    }
}

/**
 * Get the camera reference (for attaching post-processes in correct order)
 */
export function getCamera() {
    return camera;
}

/**
 * Create custom film grain effect
 * Exported so scene-manager can control post-process ordering
 */
export function createFilmGrainEffect() {
    // Film grain shader
    BABYLON.Effect.ShadersStore['filmGrainFragmentShader'] = `
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
    // Wrap so fract() inside the grain hash keeps sub-pixel precision.
    // Without this the grain eventually blocks into large uniform cells.
    const GRAIN_TIME_WRAP = 4 * 60 * 60;

    filmGrainPostProcess.onApply = (effect) => {
        grainTime = (grainTime + 0.016) % GRAIN_TIME_WRAP; // Approximate frame time
        effect.setFloat('time', grainTime);
        effect.setFloat('grainIntensity', grainIntensity); // mutable — driven by Settings
        effect.setFloat2(
            'screenSize',
            scene.getEngine().getRenderWidth(),
            scene.getEngine().getRenderHeight()
        );
    };
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

// ── Graceful-degradation toggles used by the FPS watchdog ──────────────────

/** Turn bloom on/off entirely. The effect is cheap to rebuild so we avoid
 *  disposing it — just gate it off via the pipeline flag. */
export function setBloomEnabled(enabled) {
    if (pipeline) pipeline.bloomEnabled = !!enabled;
}

/** Shrink the bloom kernel (visual hit small, perf win meaningful). */
export function setBloomKernel(size) {
    if (pipeline) pipeline.bloomKernel = Math.max(8, Math.min(128, size | 0));
}

/** Adjust the bloom luminance threshold. The pipeline's default
 *  catches hero stars + bright nebula at 0.65; themes whose primary
 *  visual element is already a glowing additive layer (Aurora Plain)
 *  bump this up so bloom doesn't smear the curtain into white blobs. */
export function setBloomThreshold(threshold) {
    if (pipeline) pipeline.bloomThreshold = Math.max(0, Math.min(2, threshold));
}

/** Read the current bloom threshold (default 0.65). Used by themes
 *  that override + restore on activate / dispose. */
export function getBloomThreshold() {
    return pipeline?.bloomThreshold ?? 0.65;
}

/** Gate the film-grain post-process without disposing it. The onApply
 *  callback is swapped to a no-op, which keeps the pipeline intact. */
let _grainOnApplySaved = null;
export function setFilmGrainEnabled(enabled) {
    if (!filmGrainPostProcess) return;
    if (enabled) {
        if (_grainOnApplySaved) {
            filmGrainPostProcess.onApply = _grainOnApplySaved;
            _grainOnApplySaved = null;
        }
        filmGrainPostProcess.externalTextureSamplerBinding = false;
    } else if (!_grainOnApplySaved) {
        _grainOnApplySaved = filmGrainPostProcess.onApply;
        filmGrainPostProcess.onApply = function () {
            // Still bind the screenSize + grainIntensity=0 so the shader becomes
            // a pass-through (grain scaled to 0).
            const fx = arguments[0];
            if (!fx) return;
            fx.setFloat('time', 0);
            fx.setFloat('grainIntensity', 0);
            fx.setFloat2(
                'screenSize',
                scene.getEngine().getRenderWidth(),
                scene.getEngine().getRenderHeight()
            );
        };
    }
}

export function setChromaticAberrationEnabled(enabled) {
    if (pipeline) pipeline.chromaticAberrationEnabled = !!enabled;
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
 * Set film grain intensity (read on every frame by the grain onApply callback)
 * @param {number} intensity - 0-0.1 range
 */
export function setGrainIntensity(intensity) {
    grainIntensity = Math.max(0, Math.min(0.3, intensity));
}

/**
 * Set the base exposure (before auto-exposure oscillation adds its variation).
 * scene-manager.updateAutoExposure reads this via getBaseExposure.
 * @param {number} value - 0.1-3 range
 */
export function setBaseExposure(value) {
    baseExposure = Math.max(0.1, Math.min(3, value));
    if (pipeline?.imageProcessing) {
        pipeline.imageProcessing.exposure = baseExposure;
    }
}

export function getBaseExposure() {
    return baseExposure;
}

/**
 * Set vignette strength.
 * @param {number} weight - 0-3 range
 */
export function setVignetteWeight(weight) {
    if (pipeline?.imageProcessing) {
        pipeline.imageProcessing.vignetteWeight = Math.max(0, Math.min(3, weight));
    }
}

/**
 * Set chromatic aberration amount.
 * @param {number} amount - 0-10 range
 */
export function setChromaticAberrationAmount(amount) {
    if (pipeline?.chromaticAberration) {
        pipeline.chromaticAberration.aberrationAmount = Math.max(0, Math.min(10, amount));
    }
}

/**
 * Enable/disable depth of field
 * @param {boolean} enabled
 */
export function setDepthOfFieldEnabled(enabled) {
    if (pipeline && !isWebGPU) {
        pipeline.depthOfFieldEnabled = !!enabled;
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
