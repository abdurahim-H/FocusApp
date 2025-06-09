// Camera Effects and Cinematic Animations for Babylon.js
// Adds "Whoa!" factor camera movements and visual effects

import { scene, engine } from './scene3d.js';
import { appState } from './state.js';
import { trackRequestAnimationFrame, trackSetTimeout } from './cleanup.js';

let camera, originalCameraSettings;
let cameraEffectActive = false;
let shakeMagnitude = 0;
let cinematicAnimation = null;

// Camera animation states
const CameraState = {
    NORMAL: 'normal',
    FOCUS_ZOOM: 'focusZoom',
    SESSION_COMPLETE: 'sessionComplete',
    BLACK_HOLE_APPROACH: 'blackHoleApproach',
    ORBIT_CELEBRATION: 'orbitCelebration',
    TIME_DILATION: 'timeDilation'
};

let currentCameraState = CameraState.NORMAL;

export function initCameraEffects(cameraRef, sceneRef) {
    camera = cameraRef;
    
    // Store original camera settings
    originalCameraSettings = {
        alpha: camera.alpha,
        beta: camera.beta,
        radius: camera.radius,
        fov: camera.fov,
        target: camera.target.clone()
    };
    
    // Setup camera animation system
    setupCameraAnimations(sceneRef);
}

// Setup smooth camera animations
function setupCameraAnimations(sceneRef) {
    // Create animation groups for different effects
    createFocusZoomAnimation(sceneRef);
    createSessionCompleteAnimation(sceneRef);
    createBlackHoleApproachAnimation(sceneRef);
    createOrbitCelebrationAnimation(sceneRef);
}

// Cinematic zoom into black hole when focus starts
export function triggerFocusZoom() {
    if (cameraEffectActive || currentCameraState !== CameraState.NORMAL) return;
    
    cameraEffectActive = true;
    currentCameraState = CameraState.FOCUS_ZOOM;
    
    // Stop any existing animation
    if (cinematicAnimation) cinematicAnimation.stop();
    
    // Create smooth camera animation
    const animationGroup = new BABYLON.AnimationGroup("focusZoom", scene);
    
    // Radius animation - zoom in
    const radiusAnimation = new BABYLON.Animation(
        "radiusAnimation",
        "radius",
        60,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    const radiusKeys = [
        { frame: 0, value: camera.radius },
        { frame: 60, value: 25 }
    ];
    radiusAnimation.setKeys(radiusKeys);
    
    // Beta animation - tilt down slightly
    const betaAnimation = new BABYLON.Animation(
        "betaAnimation",
        "beta",
        60,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    const betaKeys = [
        { frame: 0, value: camera.beta },
        { frame: 30, value: camera.beta - 0.2 },
        { frame: 60, value: camera.beta - 0.1 }
    ];
    betaAnimation.setKeys(betaKeys);
    
    // Add animations to group
    animationGroup.addTargetedAnimation(radiusAnimation, camera);
    animationGroup.addTargetedAnimation(betaAnimation, camera);
    
    // Add easing
    const easingFunction = new BABYLON.CircleEase();
    easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
    radiusAnimation.setEasingFunction(easingFunction);
    betaAnimation.setEasingFunction(easingFunction);
    
    // Play animation
    animationGroup.play();
    
    animationGroup.onAnimationEndObservable.addOnce(() => {
        cameraEffectActive = false;
        cinematicAnimation = null;
        
        // Add subtle camera breathing effect during focus
        addBreathingEffect();
    });
    
    cinematicAnimation = animationGroup;
    
    // Enhance visual effects
    enhanceFocusVisuals();
}

// Add breathing effect to camera during focus
function addBreathingEffect() {
    if (currentCameraState !== CameraState.FOCUS_ZOOM) return;
    
    const breathingAnimation = new BABYLON.Animation(
        "breathingAnimation",
        "radius",
        60,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    );
    
    const currentRadius = camera.radius;
    const breathingKeys = [
        { frame: 0, value: currentRadius },
        { frame: 120, value: currentRadius - 1 },
        { frame: 240, value: currentRadius }
    ];
    breathingAnimation.setKeys(breathingKeys);
    
    const sineEasing = new BABYLON.SineEase();
    sineEasing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
    breathingAnimation.setEasingFunction(sineEasing);
    
    scene.beginDirectAnimation(camera, [breathingAnimation], 0, 240, true);
}

// Enhance visual effects during focus
function enhanceFocusVisuals() {
    if (!scene.postProcessing) return;
    
    const { pipeline } = scene.postProcessing;
    
    // Animate depth of field for focus effect
    const startFocus = pipeline.depthOfField.focusDistance;
    const targetFocus = 25;
    let progress = 0;
    
    const focusInterval = setInterval(() => {
        progress += 0.02;
        if (progress >= 1) {
            clearInterval(focusInterval);
            progress = 1;
        }
        
        const eased = progress * progress * (3 - 2 * progress);
        pipeline.depthOfField.focusDistance = startFocus + (targetFocus - startFocus) * eased;
        pipeline.depthOfField.focalLength = 50 + eased * 20;
    }, 16);
}

// Dramatic camera shake when tasks are completed
export function triggerTaskCompletionShake() {
    // Create subtle camera shake using animations
    const shakeGroup = new BABYLON.AnimationGroup("cameraShake", scene);
    
    // Alpha shake
    const alphaShake = new BABYLON.Animation(
        "alphaShake",
        "alpha",
        60,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    const originalAlpha = camera.alpha;
    const alphaKeys = [];
    for (let i = 0; i <= 30; i++) {
        alphaKeys.push({
            frame: i * 2,
            value: originalAlpha + (Math.random() - 0.5) * 0.02 * Math.pow(0.9, i)
        });
    }
    alphaShake.setKeys(alphaKeys);
    
    // Beta shake
    const betaShake = new BABYLON.Animation(
        "betaShake",
        "beta",
        60,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    const originalBeta = camera.beta;
    const betaKeys = [];
    for (let i = 0; i <= 30; i++) {
        betaKeys.push({
            frame: i * 2,
            value: originalBeta + (Math.random() - 0.5) * 0.01 * Math.pow(0.9, i)
        });
    }
    betaShake.setKeys(betaKeys);
    
    shakeGroup.addTargetedAnimation(alphaShake, camera);
    shakeGroup.addTargetedAnimation(betaShake, camera);
    
    shakeGroup.play();
    
    // Add particle burst effect
    createCelebrationParticles();
}

// Create celebration particles
function createCelebrationParticles() {
    const particleSystem = new BABYLON.ParticleSystem("celebration", 500, scene);
    particleSystem.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);
    
    // Emitter at camera target
    particleSystem.emitter = camera.target;
    particleSystem.minEmitBox = new BABYLON.Vector3(-1, -1, -1);
    particleSystem.maxEmitBox = new BABYLON.Vector3(1, 1, 1);
    
    // Colors
    particleSystem.color1 = new BABYLON.Color4(0.4, 0.4, 0.95, 1);
    particleSystem.color2 = new BABYLON.Color4(0.02, 0.84, 0.63, 1);
    particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    
    // Size
    particleSystem.minSize = 0.5;
    particleSystem.maxSize = 2;
    
    // Life time
    particleSystem.minLifeTime = 0.5;
    particleSystem.maxLifeTime = 1.5;
    
    // Emission
    particleSystem.emitRate = 200;
    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    particleSystem.manualEmitCount = 100;
    
    // Speed
    particleSystem.minEmitPower = 10;
    particleSystem.maxEmitPower = 20;
    particleSystem.updateSpeed = 0.01;
    
    // Direction
    particleSystem.direction1 = new BABYLON.Vector3(-1, 8, 1);
    particleSystem.direction2 = new BABYLON.Vector3(1, 10, -1);
    
    // Gravity
    particleSystem.gravity = new BABYLON.Vector3(0, -9.81, 0);
    
    particleSystem.start();
    
    // Stop after burst
    setTimeout(() => {
        particleSystem.stop();
        setTimeout(() => particleSystem.dispose(), 2000);
    }, 100);
}

// Slow-motion zoom out effect when session completes
export function triggerSessionCompleteZoom() {
    if (cameraEffectActive || currentCameraState === CameraState.SESSION_COMPLETE) return;
    
    cameraEffectActive = true;
    currentCameraState = CameraState.SESSION_COMPLETE;
    
    // Create cinematic pullback
    const animationGroup = new BABYLON.AnimationGroup("sessionComplete", scene);
    
    // Radius animation - zoom out
    const radiusAnimation = new BABYLON.Animation(
        "radiusZoomOut",
        "radius",
        60,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    const radiusKeys = [
        { frame: 0, value: camera.radius },
        { frame: 180, value: 80 }
    ];
    radiusAnimation.setKeys(radiusKeys);
    
    // Alpha animation - slow rotation
    const alphaAnimation = new BABYLON.Animation(
        "alphaRotation",
        "alpha",
        60,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    const alphaKeys = [
        { frame: 0, value: camera.alpha },
        { frame: 180, value: camera.alpha + Math.PI / 2 }
    ];
    alphaAnimation.setKeys(alphaKeys);
    
    // Beta animation - tilt up for overview
    const betaAnimation = new BABYLON.Animation(
        "betaTilt",
        "beta",
        60,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    const betaKeys = [
        { frame: 0, value: camera.beta },
        { frame: 90, value: Math.PI / 3 },
        { frame: 180, value: Math.PI / 3.5 }
    ];
    betaAnimation.setKeys(betaKeys);
    
    // Add smooth easing
    const powerEase = new BABYLON.PowerEase();
    powerEase.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
    radiusAnimation.setEasingFunction(powerEase);
    alphaAnimation.setEasingFunction(powerEase);
    betaAnimation.setEasingFunction(powerEase);
    
    animationGroup.addTargetedAnimation(radiusAnimation, camera);
    animationGroup.addTargetedAnimation(alphaAnimation, camera);
    animationGroup.addTargetedAnimation(betaAnimation, camera);
    
    animationGroup.play();
    
    animationGroup.onAnimationEndObservable.addOnce(() => {
        cameraEffectActive = false;
        cinematicAnimation = null;
        
        // Return to normal after delay
        trackSetTimeout(() => {
            returnToNormalOrbit();
        }, 2000);
    });
    
    cinematicAnimation = animationGroup;
    
    // Add visual effects
    enhanceSessionCompleteVisuals();
}

// Enhance visuals for session complete
function enhanceSessionCompleteVisuals() {
    if (!scene.postProcessing) return;
    
    const { pipeline, glowLayer } = scene.postProcessing;
    
    // Increase bloom for celebration
    const originalBloom = pipeline.bloomWeight;
    const targetBloom = 1.2;
    let progress = 0;
    
    const bloomInterval = setInterval(() => {
        progress += 0.01;
        if (progress >= 1) {
            clearInterval(bloomInterval);
            
            // Fade back to normal
            setTimeout(() => {
                let fadeProgress = 0;
                const fadeInterval = setInterval(() => {
                    fadeProgress += 0.02;
                    if (fadeProgress >= 1) {
                        clearInterval(fadeInterval);
                        fadeProgress = 1;
                    }
                    pipeline.bloomWeight = targetBloom + (originalBloom - targetBloom) * fadeProgress;
                }, 16);
            }, 2000);
        }
        
        const eased = progress * progress * (3 - 2 * progress);
        pipeline.bloomWeight = originalBloom + (targetBloom - originalBloom) * eased;
    }, 16);
    
    // Increase glow intensity
    glowLayer.intensity = 2.5;
    setTimeout(() => {
        glowLayer.intensity = 1.5;
    }, 3000);
}

// Smooth return to normal camera orbit
function returnToNormalOrbit() {
    currentCameraState = CameraState.NORMAL;
    
    const animationGroup = new BABYLON.AnimationGroup("returnToNormal", scene);
    
    // Animate all camera properties back to original
    const properties = ['alpha', 'beta', 'radius'];
    
    properties.forEach(prop => {
        const animation = new BABYLON.Animation(
            `${prop}Return`,
            prop,
            60,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const keys = [
            { frame: 0, value: camera[prop] },
            { frame: 120, value: originalCameraSettings[prop] }
        ];
        animation.setKeys(keys);
        
        const easing = new BABYLON.QuadraticEase();
        easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
        animation.setEasingFunction(easing);
        
        animationGroup.addTargetedAnimation(animation, camera);
    });
    
    animationGroup.play();
    
    animationGroup.onAnimationEndObservable.addOnce(() => {
        // Resume normal camera orbit from scene3d.js
        cameraEffectActive = false;
    });
}

// Update camera effects each frame
export function updateCameraEffects(sceneRef, time) {
    // Update any active shader effects based on camera state
    if (currentCameraState === CameraState.BLACK_HOLE_APPROACH) {
        updateBlackHoleDistortion(time);
    }
    
    if (currentCameraState === CameraState.TIME_DILATION) {
        updateTimeDilationEffect(time);
    }
}

// Orbit camera around specific target
export function orbitAroundPoint(targetPoint, duration = 5000) {
    if (cameraEffectActive) return;
    
    cameraEffectActive = true;
    currentCameraState = CameraState.ORBIT_CELEBRATION;
    
    const animationGroup = new BABYLON.AnimationGroup("orbitCelebration", scene);
    
    // Create circular path
    const path = [];
    const radius = 30;
    const steps = 120;
    
    for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        path.push(new BABYLON.Vector3(
            targetPoint.x + Math.cos(angle) * radius,
            targetPoint.y + Math.sin(i / steps * Math.PI * 4) * 5,
            targetPoint.z + Math.sin(angle) * radius
        ));
    }
    
    // Create path3D
    const catmullRom = BABYLON.Curve3.CreateCatmullRomSpline(path, steps, true);
    
    // Animate camera along path
    let progress = 0;
    const orbitAnimation = scene.registerBeforeRender(() => {
        progress += 0.005;
        if (progress >= 1) {
            scene.unregisterBeforeRender(orbitAnimation);
            cameraEffectActive = false;
            currentCameraState = CameraState.NORMAL;
            returnToNormalOrbit();
            return;
        }
        
        const position = catmullRom.getPointAt(progress);
        camera.position = position;
        camera.setTarget(targetPoint);
    });
}

// Time dilation effect
export function triggerTimeDilationEffect(duration = 3000) {
    currentCameraState = CameraState.TIME_DILATION;
    
    // Apply time dilation to engine
    const originalTimeStep = engine.getDeltaTime();
    const startTime = Date.now();
    
    const dilationAnimation = scene.registerBeforeRender(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        let timeScale;
        if (progress < 0.5) {
            timeScale = 1 - (progress * 2) * 0.7; // Slow down to 30%
        } else {
            timeScale = 0.3 + ((progress - 0.5) * 2) * 0.7; // Speed back up
        }
        
        // Update CSS for UI animations
        document.documentElement.style.setProperty('--time-scale', timeScale.toString());
        
        if (progress >= 1) {
            scene.unregisterBeforeRender(dilationAnimation);
            currentCameraState = CameraState.NORMAL;
            document.documentElement.style.removeProperty('--time-scale');
        }
    });
}

// Cinematic black hole approach
export function approachBlackHole() {
    if (cameraEffectActive) return;
    
    cameraEffectActive = true;
    currentCameraState = CameraState.BLACK_HOLE_APPROACH;
    
    const animationGroup = new BABYLON.AnimationGroup("blackHoleApproach", scene);
    
    // Radius animation - dramatic approach
    const radiusAnimation = new BABYLON.Animation(
        "radiusApproach",
        "radius",
        60,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    const radiusKeys = [
        { frame: 0, value: camera.radius },
        { frame: 120, value: 20 },
        { frame: 240, value: 15 }
    ];
    radiusAnimation.setKeys(radiusKeys);
    
    // Beta animation - look down into the void
    const betaAnimation = new BABYLON.Animation(
        "betaLookDown",
        "beta",
        60,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    const betaKeys = [
        { frame: 0, value: camera.beta },
        { frame: 240, value: Math.PI / 2.5 }
    ];
    betaAnimation.setKeys(betaKeys);
    
    // Add exponential easing for gravity feel
    const expEase = new BABYLON.ExponentialEase();
    expEase.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEIN);
    radiusAnimation.setEasingFunction(expEase);
    
    animationGroup.addTargetedAnimation(radiusAnimation, camera);
    animationGroup.addTargetedAnimation(betaAnimation, camera);
    
    animationGroup.play();
    
    // Add gravitational effects
    addGravitationalDistortion();
    
    animationGroup.onAnimationEndObservable.addOnce(() => {
        // Hold at event horizon
        trackSetTimeout(() => {
            escapeBlackHole();
        }, 2000);
    });
    
    cinematicAnimation = animationGroup;
}

// Add gravitational distortion effects
function addGravitationalDistortion() {
    if (!scene.postProcessing) return;
    
    const { pipeline } = scene.postProcessing;
    
    // Increase chromatic aberration
    const startAberration = pipeline.chromaticAberration.aberrationAmount;
    const targetAberration = 60;
    
    // Add redshift effect
    let progress = 0;
    const distortionInterval = setInterval(() => {
        progress += 0.01;
        if (progress >= 1) {
            clearInterval(distortionInterval);
            progress = 1;
        }
        
        const eased = progress * progress;
        pipeline.chromaticAberration.aberrationAmount = startAberration + (targetAberration - startAberration) * eased;
        pipeline.chromaticAberration.radialIntensity = 0.5 + eased * 0.5;
        
        // Update redshift CSS
        document.documentElement.style.setProperty('--redshift-intensity', (eased * 0.3).toString());
    }, 16);
}

// Update black hole distortion effect
function updateBlackHoleDistortion(time) {
    if (!scene.postProcessing) return;
    
    const { pipeline } = scene.postProcessing;
    
    // Pulsing distortion
    const pulse = Math.sin(time * 2) * 0.1 + 0.9;
    pipeline.chromaticAberration.radialIntensity *= pulse;
}

// Update time dilation visual effect
function updateTimeDilationEffect(time) {
    if (!scene.postProcessing) return;
    
    const { pipeline } = scene.postProcessing;
    
    // Subtle warping effect
    const warp = Math.sin(time * 0.5) * 0.05;
    pipeline.depthOfField.focalLength = 50 + warp * 10;
}

// Dramatic escape from black hole
function escapeBlackHole() {
    const animationGroup = new BABYLON.AnimationGroup("blackHoleEscape", scene);
    
    // Rapid escape animation
    const radiusAnimation = new BABYLON.Animation(
        "radiusEscape",
        "radius",
        60,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    const radiusKeys = [
        { frame: 0, value: camera.radius },
        { frame: 120, value: 50 }
    ];
    radiusAnimation.setKeys(radiusKeys);
    
    // Beta return
    const betaAnimation = new BABYLON.Animation(
        "betaReturn",
        "beta",
        60,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    const betaKeys = [
        { frame: 0, value: camera.beta },
        { frame: 120, value: originalCameraSettings.beta }
    ];
    betaAnimation.setKeys(betaKeys);
    
    // Exponential ease out for escape velocity
    const expEaseOut = new BABYLON.ExponentialEase();
    expEaseOut.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
    radiusAnimation.setEasingFunction(expEaseOut);
    betaAnimation.setEasingFunction(expEaseOut);
    
    animationGroup.addTargetedAnimation(radiusAnimation, camera);
    animationGroup.addTargetedAnimation(betaAnimation, camera);
    
    animationGroup.play();
    
    // Remove distortion effects
    removeGravitationalDistortion();
    
    animationGroup.onAnimationEndObservable.addOnce(() => {
        cameraEffectActive = false;
        currentCameraState = CameraState.NORMAL;
        cinematicAnimation = null;
    });
}

// Remove gravitational distortion
function removeGravitationalDistortion() {
    if (!scene.postProcessing) return;
    
    const { pipeline } = scene.postProcessing;
    
    // Fade out effects
    let progress = 0;
    const fadeInterval = setInterval(() => {
        progress += 0.02;
        if (progress >= 1) {
            clearInterval(fadeInterval);
            progress = 1;
            document.documentElement.style.removeProperty('--redshift-intensity');
        }
        
        const eased = 1 - progress;
        pipeline.chromaticAberration.aberrationAmount = 30 + eased * 30;
        pipeline.chromaticAberration.radialIntensity = 0.5 + eased * 0.5;
        
        document.documentElement.style.setProperty('--redshift-intensity', (eased * 0.3).toString());
    }, 16);
}

// Create specific animations
function createFocusZoomAnimation(sceneRef) {
    // Pre-create animations for better performance
    // These can be reused instead of creating new ones each time
}

function createSessionCompleteAnimation(sceneRef) {
    // Pre-create session complete animation
}

function createBlackHoleApproachAnimation(sceneRef) {
    // Pre-create black hole approach animation
}

function createOrbitCelebrationAnimation(sceneRef) {
    // Pre-create orbit celebration animation
}

// Export camera state for other modules
export function getCameraState() {
    return currentCameraState;
}

// Reset camera to original state
export function resetCamera() {
    currentCameraState = CameraState.NORMAL;
    cameraEffectActive = false;
    
    if (cinematicAnimation) {
        cinematicAnimation.stop();
        cinematicAnimation = null;
    }
    
    camera.alpha = originalCameraSettings.alpha;
    camera.beta = originalCameraSettings.beta;
    camera.radius = originalCameraSettings.radius;
    camera.fov = originalCameraSettings.fov;
    camera.target = originalCameraSettings.target.clone();
}