// Camera Effects and Cinematic Animations
// Adds "Whoa!" factor camera movements and visual effects

import { scene } from './scene3d.js';
import { appState } from './state.js';
import { trackRequestAnimationFrame, trackSetTimeout } from './cleanup.js';

let camera, originalCameraPosition, originalCameraRotation;
let cameraEffectActive = false;
let shakeMagnitude = 0;
let zoomTarget = 1;
let currentZoom = 1;

export function initCameraEffects(cameraRef) {
    camera = cameraRef;
    originalCameraPosition = camera.position.clone();
    originalCameraRotation = camera.rotation.clone();
}

// Cinematic zoom into black hole when focus starts
export function triggerFocusZoom() {
    if (cameraEffectActive) return;
    
    cameraEffectActive = true;
    const startTime = Date.now();
    const duration = 2000; // 2 seconds
    const targetDistance = 25; // Closer to black hole
    
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth easing function
        const eased = 1 - Math.pow(1 - progress, 3);
        
        // Zoom towards black hole
        const currentDistance = 50 + (targetDistance - 50) * eased;
        camera.position.setLength(currentDistance);
        
        // Add slight rotation for dramatic effect
        camera.rotation.z = Math.sin(progress * Math.PI) * 0.1;
        
        if (progress < 1) {
            trackRequestAnimationFrame(animate);
        } else {
            // Reset rotation but keep closer distance during focus
            camera.rotation.z = 0;
            cameraEffectActive = false;
        }
    };
    
    animate();
}

// Dramatic camera shake when tasks are completed
export function triggerTaskCompletionShake() {
    shakeMagnitude = 2.0;
    
    // Gradually reduce shake over 1 second
    const reduceShake = () => {
        shakeMagnitude *= 0.95;
        if (shakeMagnitude > 0.01) {
            trackRequestAnimationFrame(reduceShake);
        } else {
            shakeMagnitude = 0;
        }
    };
    reduceShake();
}

// Slow-motion zoom out effect when session completes
export function triggerSessionCompleteZoom() {
    if (cameraEffectActive) return;
    
    cameraEffectActive = true;
    const startTime = Date.now();
    const duration = 3000; // 3 seconds
    const targetDistance = 80; // Pull back for overview
    
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Slow easing for cinematic effect
        const eased = progress * progress * (3 - 2 * progress);
        
        // Zoom out to show full galaxy
        const currentDistance = camera.position.length();
        const newDistance = currentDistance + (targetDistance - currentDistance) * eased;
        camera.position.setLength(newDistance);
        
        // Gentle rotation for dramatic reveal
        camera.rotation.y += 0.002;
        
        if (progress < 1) {
            trackRequestAnimationFrame(animate);
        } else {
            // Return to normal orbit
            trackSetTimeout(() => {
                returnToNormalOrbit();
            }, 1000);
            cameraEffectActive = false;
        }
    };
    
    animate();
}

// Smooth return to normal camera orbit
function returnToNormalOrbit() {
    const startTime = Date.now();
    const duration = 2000;
    const startDistance = camera.position.length();
    const targetDistance = 50;
    
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = progress * progress * (3 - 2 * progress);
        
        const currentDistance = startDistance + (targetDistance - startDistance) * eased;
        camera.position.setLength(currentDistance);
        
        if (progress < 1) {
            trackRequestAnimationFrame(animate);
        }
    };
    
    animate();
}

// Apply camera shake effect
export function updateCameraEffects() {
    // LAYOUT STABILITY FIX: Disable all camera shake effects to prevent visual disruption
    // This prevents the shaking that occurs when tasks are completed
    
    /* DISABLED: Camera shake application that causes viewport disruption
    if (shakeMagnitude > 0) {
        const shakeX = (Math.random() - 0.5) * shakeMagnitude;
        const shakeY = (Math.random() - 0.5) * shakeMagnitude;
        const shakeZ = (Math.random() - 0.5) * shakeMagnitude * 0.5;
        
        camera.position.x += shakeX;
        camera.position.y += shakeY;
        camera.position.z += shakeZ;
    }
    */
    
    // LAYOUT STABILITY FIX: Disable dynamic FOV changes that cause zoom effects
    // This was causing the "zoom out" effect when toggling checkboxes
    
    // Keep FOV constant to prevent layout disruption
    const baseFOV = 75;
    if (Math.abs(camera.fov - baseFOV) > 0.1) {
        camera.fov = baseFOV;
        camera.updateProjectionMatrix();
    }
    
    /* ORIGINAL DYNAMIC FOV CODE - DISABLED FOR LAYOUT STABILITY
    const completedTasks = appState.tasks.filter(task => task.completed).length;
    const totalTasks = appState.tasks.length;
    const productivity = totalTasks > 0 ? completedTasks / totalTasks : 0;
    
    const baseFOV = 75;
    const fovBonus = productivity * 5;
    camera.fov = baseFOV + fovBonus;
    camera.updateProjectionMatrix();
    */
}

// Orbit camera around specific target (like a completed task celebration)
export function orbitAroundPoint(targetPoint, duration = 5000) {
    if (cameraEffectActive) return;
    
    cameraEffectActive = true;
    const startTime = Date.now();
    const radius = 30;
    const initialAngle = Math.atan2(camera.position.z - targetPoint.z, camera.position.x - targetPoint.x);
    
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Full 360-degree orbit
        const angle = initialAngle + (Math.PI * 2 * progress);
        
        camera.position.x = targetPoint.x + Math.cos(angle) * radius;
        camera.position.z = targetPoint.z + Math.sin(angle) * radius;
        camera.position.y = targetPoint.y + Math.sin(progress * Math.PI * 4) * 5; // Gentle up/down motion
        
        camera.lookAt(targetPoint);
        
        if (progress < 1) {
            trackRequestAnimationFrame(animate);
        } else {
            cameraEffectActive = false;
            // Return to normal orbit
            returnToNormalOrbit();
        }
    };
    
    animate();
}

// Time dilation effect - slow motion camera movement
export function triggerTimeDilationEffect(duration = 3000) {
    const originalTimeScale = 1;
    const slowTimeScale = 0.3;
    const startTime = Date.now();
    
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Create slow-motion effect by adjusting animation speeds
        let timeScale;
        if (progress < 0.5) {
            // Slow down
            timeScale = originalTimeScale + (slowTimeScale - originalTimeScale) * (progress * 2);
        } else {
            // Speed back up
            timeScale = slowTimeScale + (originalTimeScale - slowTimeScale) * ((progress - 0.5) * 2);
        }
        
        // Apply time scale to camera rotation (this would need to be coordinated with scene3d.js)
        document.documentElement.style.setProperty('--time-scale', timeScale.toString());
        
        if (progress < 1) {
            trackRequestAnimationFrame(animate);
        } else {
            document.documentElement.style.removeProperty('--time-scale');
        }
    };
    
    animate();
}

// Cinematic black hole approach (for break time)
export function approachBlackHole() {
    if (cameraEffectActive) return;
    
    cameraEffectActive = true;
    const startTime = Date.now();
    const duration = 4000; // 4 seconds
    const targetDistance = 15; // Very close to event horizon
    
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Accelerating approach (like falling into gravity well)
        const eased = progress * progress;
        
        const currentDistance = 50 + (targetDistance - 50) * eased;
        camera.position.setLength(currentDistance);
        
        // Add gravitational time dilation visual effect
        const distortionFactor = 1 - (progress * 0.3);
        camera.aspect = (window.innerWidth / window.innerHeight) * distortionFactor;
        camera.updateProjectionMatrix();
        
        // Reddish tint as we approach (redshift effect)
        const intensity = progress * 0.3;
        document.documentElement.style.setProperty('--redshift-intensity', intensity.toString());
        
        if (progress < 1) {
            trackRequestAnimationFrame(animate);
        } else {
            // Hold at close distance, then pull back
            trackSetTimeout(() => {
                escapeBlackHole();
            }, 2000);
        }
    };
    
    animate();
}

// Dramatic escape from black hole (end of break)
function escapeBlackHole() {
    const startTime = Date.now();
    const duration = 2000;
    const startDistance = camera.position.length();
    const targetDistance = 50;
    
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Rapid escape
        const eased = 1 - Math.pow(1 - progress, 4);
        
        const currentDistance = startDistance + (targetDistance - startDistance) * eased;
        camera.position.setLength(currentDistance);
        
        // Remove visual distortions
        const distortionFactor = 0.7 + (0.3 * progress);
        camera.aspect = (window.innerWidth / window.innerHeight) * distortionFactor;
        camera.updateProjectionMatrix();
        
        const redshiftIntensity = 0.3 * (1 - progress);
        document.documentElement.style.setProperty('--redshift-intensity', redshiftIntensity.toString());
        
        if (progress < 1) {
            trackRequestAnimationFrame(animate);
        } else {
            cameraEffectActive = false;
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            document.documentElement.style.removeProperty('--redshift-intensity');
        }
    };
    
    animate();
}
