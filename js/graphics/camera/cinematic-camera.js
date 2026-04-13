// cinematic-camera.js - Film-Quality Camera System
// Deliberate, weighty camera motion that makes any frame look like a movie still

import { isReducedMotion } from '../../core/motion.js';

let camera = null;
let scene = null;
let canvas = null;

// Camera state
const cameraState = {
    // Orbital motion
    baseAlpha: 0,           // Base horizontal angle
    baseBeta: Math.PI / 3,  // Base vertical angle (60 degrees)
    baseRadius: 45,         // Base distance
    
    // Animation time
    time: 0,
    
    // Drift parameters
    driftPhase: 0,
    driftSpeed: 0.02,       // Very slow drift
    
    // Micro shake (handheld feel)
    shakeIntensity: 0.0008, // Extremely subtle
    shakeSpeed: 2.5,
    
    // Reframing
    reframeTimer: 0,
    reframeDuration: 15,    // Seconds between reframes
    reframeProgress: 0,
    isReframing: false,
    reframeTarget: { alpha: 0, beta: 0, radius: 0 },
    reframeStart: { alpha: 0, beta: 0, radius: 0 },
    
    // Breathing (subtle zoom in/out)
    breatheSpeed: 0.08,
    breatheAmount: 3,
    
    // Vertical drift
    verticalDriftSpeed: 0.03,
    verticalDriftAmount: 0.05
};

/**
 * Initialize the cinematic camera system
 */
export function initCinematicCamera(sceneRef, cameraRef, canvasRef) {
    scene = sceneRef;
    camera = cameraRef;
    canvas = canvasRef;
    
    if (!camera) {
        console.error('❌ Camera not provided to cinematic system');
        return;
    }
    
    // Store initial camera state
    cameraState.baseAlpha = camera.alpha;
    cameraState.baseBeta = camera.beta;
    cameraState.baseRadius = camera.radius;
    
    console.log('🎥 Cinematic camera system initialized');
}

/**
 * Update camera with cinematic motion
 * Call this every frame
 */
export function updateCinematicCamera(deltaTime) {
    if (!camera || isReducedMotion()) return;
    
    cameraState.time += deltaTime;
    
    // 1. Slow orbital drift
    const orbitalDrift = updateOrbitalDrift(deltaTime);
    
    // 2. Breathing (subtle zoom)
    const breathing = updateBreathing();
    
    // 3. Micro shake (handheld feel)
    const shake = updateMicroShake();
    
    // 4. Occasional reframing
    const reframe = updateReframing(deltaTime);
    
    // 5. Vertical drift
    const verticalDrift = updateVerticalDrift();
    
    // Apply all camera motions
    camera.alpha = cameraState.baseAlpha + orbitalDrift.alpha + shake.alpha + reframe.alpha;
    camera.beta = cameraState.baseBeta + verticalDrift + shake.beta + reframe.beta;
    camera.radius = cameraState.baseRadius + breathing + shake.radius + reframe.radius;
    
    // Clamp beta to valid range
    camera.beta = Math.max(0.1, Math.min(Math.PI - 0.1, camera.beta));
    
    // Slowly update base alpha for continuous orbit
    cameraState.baseAlpha += 0.0003 * deltaTime * 60; // ~0.018 rad/sec at 60fps
}

/**
 * Slow orbital drift - the main continuous motion
 */
function updateOrbitalDrift(deltaTime) {
    cameraState.driftPhase += cameraState.driftSpeed * deltaTime;
    
    // Perlin-like smooth variation using multiple sine waves
    const alpha = Math.sin(cameraState.driftPhase * 0.7) * 0.02 +
                  Math.sin(cameraState.driftPhase * 1.3) * 0.01;
    
    return { alpha };
}

/**
 * Breathing effect - subtle zoom in/out
 */
function updateBreathing() {
    const breath = Math.sin(cameraState.time * cameraState.breatheSpeed) * cameraState.breatheAmount;
    const breath2 = Math.sin(cameraState.time * cameraState.breatheSpeed * 0.7) * cameraState.breatheAmount * 0.5;
    return breath + breath2;
}

/**
 * Micro shake - extremely subtle handheld camera feel
 */
function updateMicroShake() {
    const t = cameraState.time * cameraState.shakeSpeed;
    const intensity = cameraState.shakeIntensity;
    
    // Multiple frequencies for organic feel
    const alpha = (Math.sin(t * 12.3) * 0.5 + Math.sin(t * 7.1) * 0.3 + Math.sin(t * 19.7) * 0.2) * intensity;
    const beta = (Math.sin(t * 11.1) * 0.5 + Math.sin(t * 8.3) * 0.3 + Math.sin(t * 17.9) * 0.2) * intensity;
    const radius = (Math.sin(t * 9.7) * 0.5 + Math.sin(t * 13.3) * 0.3) * intensity * 20;
    
    return { alpha, beta, radius };
}

/**
 * Occasional reframing - subtle shift every 15-20 seconds
 */
function updateReframing(deltaTime) {
    cameraState.reframeTimer += deltaTime;
    
    // Start new reframe
    if (!cameraState.isReframing && cameraState.reframeTimer > cameraState.reframeDuration) {
        startReframe();
    }
    
    // Process active reframe
    if (cameraState.isReframing) {
        cameraState.reframeProgress += deltaTime / 4; // 4 second transition
        
        if (cameraState.reframeProgress >= 1) {
            // Reframe complete
            cameraState.isReframing = false;
            cameraState.baseAlpha += cameraState.reframeTarget.alpha;
            cameraState.baseBeta += cameraState.reframeTarget.beta;
            cameraState.baseRadius += cameraState.reframeTarget.radius;
            return { alpha: 0, beta: 0, radius: 0 };
        }
        
        // Smooth easing
        const t = easeInOutCubic(cameraState.reframeProgress);
        
        return {
            alpha: cameraState.reframeTarget.alpha * t,
            beta: cameraState.reframeTarget.beta * t,
            radius: cameraState.reframeTarget.radius * t
        };
    }
    
    return { alpha: 0, beta: 0, radius: 0 };
}

/**
 * Start a new reframe
 */
function startReframe() {
    cameraState.isReframing = true;
    cameraState.reframeProgress = 0;
    cameraState.reframeTimer = 0;
    
    // Random subtle target adjustments
    cameraState.reframeTarget = {
        alpha: (Math.random() - 0.5) * 0.15,  // ±0.075 radians
        beta: (Math.random() - 0.5) * 0.08,   // ±0.04 radians
        radius: (Math.random() - 0.5) * 6     // ±3 units
    };
    
    // Randomize next reframe timing
    cameraState.reframeDuration = 12 + Math.random() * 8; // 12-20 seconds
    
    console.log('🎬 Camera reframing...');
}

/**
 * Vertical drift - slow up/down motion
 */
function updateVerticalDrift() {
    return Math.sin(cameraState.time * cameraState.verticalDriftSpeed) * cameraState.verticalDriftAmount;
}

/**
 * Smooth easing function
 */
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Trigger a dramatic zoom for special moments
 */
export function triggerDramaticZoom(targetRadius = 30, duration = 3) {
    if (isReducedMotion()) return;
    const startRadius = camera.radius;
    const startTime = cameraState.time;
    
    const animate = () => {
        const elapsed = cameraState.time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeInOutCubic(progress);
        
        camera.radius = startRadius + (targetRadius - startRadius) * eased;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            cameraState.baseRadius = targetRadius;
        }
    };
    
    animate();
}

/**
 * Get current camera state for debugging
 */
export function getCameraState() {
    return {
        alpha: camera?.alpha,
        beta: camera?.beta,
        radius: camera?.radius,
        time: cameraState.time,
        isReframing: cameraState.isReframing
    };
}

export { cameraState };
