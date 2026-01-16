// camera-effects-babylon.js - Camera Effects for Babylon.js
// Cinematic camera movements, shake effects, and dynamic transitions

let camera = null;
let scene = null;
let cameraEffectActive = false;
let shakeMagnitude = 0;

/**
 * Initialize camera effects with references
 * @param {BABYLON.ArcRotateCamera} cam - The main camera
 * @param {BABYLON.Scene} scn - The scene
 */
export function initCameraEffects(cam, scn) {
    camera = cam;
    scene = scn;
    console.log('📷 Camera effects initialized');
}

/**
 * Trigger camera shake on task completion
 */
export function triggerTaskCompletionShake() {
    if (!camera) return;

    shakeMagnitude = 2.0;
    const startTime = Date.now();
    const duration = 1200;

    function shakeUpdate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        shakeMagnitude = 2.0 * (1 - progress * progress);

        if (progress < 1) {
            requestAnimationFrame(shakeUpdate);
        } else {
            shakeMagnitude = 0;
        }
    }
    shakeUpdate();
}

/**
 * Trigger cinematic zoom on session completion
 */
export function triggerSessionCompleteZoom() {
    if (cameraEffectActive || !camera) return;

    cameraEffectActive = true;
    const startTime = Date.now();
    const duration = 5000;
    const startRadius = camera.radius;
    const targetRadius = 120;
    const startAlpha = camera.alpha;

    function zoomUpdate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Cinematic easing (ease-in-out quad)
        const eased = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        camera.radius = startRadius + (targetRadius - startRadius) * eased;
        camera.alpha = startAlpha + progress * 0.5;

        if (progress < 1) {
            requestAnimationFrame(zoomUpdate);
        } else {
            setTimeout(() => {
                returnToNormalOrbit();
            }, 2000);
        }
    }
    zoomUpdate();
}

/**
 * Return to normal orbital view
 */
function returnToNormalOrbit() {
    if (!camera) return;

    const startTime = Date.now();
    const duration = 4000;
    const startRadius = camera.radius;
    const targetRadius = 50;

    function returnUpdate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);

        camera.radius = startRadius + (targetRadius - startRadius) * eased;

        if (progress < 1) {
            requestAnimationFrame(returnUpdate);
        } else {
            cameraEffectActive = false;
        }
    }
    returnUpdate();
}

/**
 * Update camera effects (called from render loop)
 */
export function updateCameraEffects() {
    if (!camera) return;

    // Apply shake effect
    if (shakeMagnitude > 0) {
        const time = performance.now() * 0.001;
        const shakeX = Math.sin(time * 20) * shakeMagnitude * 0.005;
        const shakeY = Math.sin(time * 15) * shakeMagnitude * 0.004;

        // Perturb target position for shake effect
        camera.target.x += shakeX;
        camera.target.y += shakeY;

        shakeMagnitude *= 0.97;
        if (shakeMagnitude < 0.01) shakeMagnitude = 0;
    }
}

/**
 * Time dilation visual effect
 * @param {number} duration - Duration in ms
 */
export function triggerTimeDilationEffect(duration = 3000) {
    const startTime = Date.now();

    function dilationUpdate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        let timeScale;
        if (progress < 0.3) {
            timeScale = 1.0 - (progress / 0.3) * 0.7;
        } else if (progress < 0.7) {
            timeScale = 0.3;
        } else {
            timeScale = 0.3 + ((progress - 0.7) / 0.3) * 0.7;
        }

        document.documentElement.style.setProperty('--time-scale', timeScale.toString());

        if (progress < 1) {
            requestAnimationFrame(dilationUpdate);
        } else {
            document.documentElement.style.removeProperty('--time-scale');
        }
    }
    dilationUpdate();
}

export { cameraEffectActive, shakeMagnitude };
