// camera-effects.js
// Enhanced Camera Effects and Cinematic Animations - Complete Fixed for Babylon.js
// Adds spectacular camera movements without breaking FOV

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

// Enhanced cinematic zoom into black hole when focus starts
export function triggerFocusZoom() {
    if (cameraEffectActive) return;
    
    cameraEffectActive = true;
    const startTime = Date.now();
    const duration = 2000; // 2 seconds
    const targetDistance = 25; // Closer to black hole
    
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Enhanced smooth easing function
        const eased = 1 - Math.pow(1 - progress, 3);
        
        // Smooth zoom towards black hole
        const currentDistance = 50 + (targetDistance - 50) * eased;
        const currentPos = camera.position.normalize().scale(currentDistance);
        camera.position = currentPos;
        
        // Enhanced dramatic rotation
        camera.rotation.z = Math.sin(progress * Math.PI) * 0.1;
        
        if (progress < 1) {
            trackRequestAnimationFrame(animate);
        } else {
            // Smooth reset rotation
            const resetDuration = 500;
            const resetStart = Date.now();
            const resetAnimate = () => {
                const resetElapsed = Date.now() - resetStart;
                const resetProgress = Math.min(resetElapsed / resetDuration, 1);
                const resetEased = resetProgress * resetProgress * (3 - 2 * resetProgress);
                
                camera.rotation.z *= (1 - resetEased);
                
                if (resetProgress < 1) {
                    trackRequestAnimationFrame(resetAnimate);
                } else {
                    cameraEffectActive = false;
                }
            };
            resetAnimate();
        }
    };
    
    animate();
}

// Enhanced camera shake
export function triggerTaskCompletionShake() {
    shakeMagnitude = 3.0;
    
    const startTime = Date.now();
    const duration = 1500;
    
    const shakeAnimate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        shakeMagnitude = 3.0 * (1 - progress * progress);
        
        if (progress < 1) {
            trackRequestAnimationFrame(shakeAnimate);
        } else {
            shakeMagnitude = 0;
        }
    };
    shakeAnimate();
}

// Enhanced slow-motion zoom out effect when session completes
export function triggerSessionCompleteZoom() {
    if (cameraEffectActive) return;
    
    cameraEffectActive = true;
    const startTime = Date.now();
    const duration = 4000;
    const targetDistance = 100;
    
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Enhanced cinematic easing
        let eased;
        if (progress < 0.3) {
            eased = progress * progress / 0.09;
        } else if (progress < 0.7) {
            const p = (progress - 0.3) / 0.4;
            eased = 0.1 + p * p * 0.6;
        } else {
            const p = (progress - 0.7) / 0.3;
            eased = 0.7 + (1 - Math.pow(1 - p, 3)) * 0.3;
        }
        
        const currentDistance = camera.position.length();
        const newDistance = currentDistance + (targetDistance - currentDistance) * eased;
        const newPosition = camera.position.normalize().scale(newDistance);
        camera.position = newPosition;
        
        camera.rotation.y += 0.003 * (1 + Math.sin(progress * Math.PI) * 0.5);
        
        if (progress < 1) {
            trackRequestAnimationFrame(animate);
        } else {
            trackSetTimeout(() => {
                returnToNormalOrbit();
            }, 1500);
            cameraEffectActive = false;
        }
    };
    
    animate();
}

// Enhanced smooth return to normal camera orbit
function returnToNormalOrbit() {
    const startTime = Date.now();
    const duration = 3000;
    const startDistance = camera.position.length();
    const targetDistance = 50;
    const startRotation = camera.rotation.clone();
    
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const eased = progress * progress * (3 - 2 * progress);
        
        const currentDistance = startDistance + (targetDistance - startDistance) * eased;
        const newPosition = camera.position.normalize().scale(currentDistance);
        camera.position = newPosition;
        
        camera.rotation = BABYLON.Vector3.Lerp(startRotation, originalCameraRotation, eased);
        
        if (progress < 1) {
            trackRequestAnimationFrame(animate);
        }
    };
    
    animate();
}

// Fixed camera effects update - removed FOV modifications
export function updateCameraEffects() {
    // Apply shake effect if active
    if (shakeMagnitude > 0) {
        const time = performance.now() * 0.001;
        const fastShake = Math.sin(time * 20) * shakeMagnitude * 0.4;
        const mediumShake = Math.sin(time * 8) * shakeMagnitude * 0.35;
        const slowShake = Math.sin(time * 3) * shakeMagnitude * 0.25;
        
        const shakeOffset = new BABYLON.Vector3(
            fastShake + mediumShake * 0.7,
            (mediumShake + slowShake) * 0.6,
            (fastShake + slowShake) * 0.4
        );
        
        const basePosition = camera.position.clone().normalize().scale(camera.position.length());
        camera.position = basePosition.add(shakeOffset);
        
        shakeMagnitude *= 0.98;
        if (shakeMagnitude < 0.01) {
            shakeMagnitude = 0;
        }
    }
    
    // NOTE: Removed FOV breathing effect as it causes issues with Babylon.js UniversalCamera
}

// Enhanced orbit camera around specific target
export function orbitAroundPoint(targetPoint, duration = 6000) {
    if (cameraEffectActive) return;
    
    cameraEffectActive = true;
    const startTime = Date.now();
    const radius = 35;
    const startPosition = camera.position.clone();
    const initialAngle = Math.atan2(camera.position.z - targetPoint.z, camera.position.x - targetPoint.x);
    
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const eased = progress * progress * (3 - 2 * progress);
        
        const angle = initialAngle + (Math.PI * 3 * eased);
        const radiusVariation = radius + Math.sin(eased * Math.PI * 4) * 5;
        
        const figure8Y = Math.sin(eased * Math.PI * 6) * 8;
        
        const targetPos = new BABYLON.Vector3(
            targetPoint.x + Math.cos(angle) * radiusVariation,
            targetPoint.y + figure8Y + Math.sin(progress * Math.PI * 8) * 3,
            targetPoint.z + Math.sin(angle) * radiusVariation
        );
        
        camera.position = BABYLON.Vector3.Lerp(camera.position, targetPos, 0.1);
        camera.setTarget(targetPoint);
        
        camera.rotation.z = Math.sin(eased * Math.PI * 2) * 0.1;
        
        if (progress < 1) {
            trackRequestAnimationFrame(animate);
        } else {
            cameraEffectActive = false;
            returnToNormalOrbit();
        }
    };
    
    animate();
}

// Enhanced time dilation effect
export function triggerTimeDilationEffect(duration = 4000) {
    const originalTimeScale = 1;
    const slowTimeScale = 0.2;
    const startTime = Date.now();
    
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        let timeScale;
        if (progress < 0.3) {
            timeScale = originalTimeScale + (slowTimeScale - originalTimeScale) * (progress / 0.3);
        } else if (progress < 0.7) {
            timeScale = slowTimeScale;
        } else {
            const speedUpProgress = (progress - 0.7) / 0.3;
            timeScale = slowTimeScale + (originalTimeScale - slowTimeScale) * speedUpProgress;
        }
        
        document.documentElement.style.setProperty('--time-scale', timeScale.toString());
        
        if (progress < 1) {
            trackRequestAnimationFrame(animate);
        } else {
            document.documentElement.style.removeProperty('--time-scale');
        }
    };
    
    animate();
}

// Enhanced cinematic black hole approach
export function approachBlackHole() {
    if (cameraEffectActive) return;
    
    cameraEffectActive = true;
    const startTime = Date.now();
    const duration = 5000;
    const targetDistance = 12;
    
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const eased = progress * progress * progress;
        
        const wobbleIntensity = progress * 2;
        const wobbleX = Math.sin(elapsed * 0.01) * wobbleIntensity;
        const wobbleY = Math.cos(elapsed * 0.013) * wobbleIntensity * 0.7;
        const wobbleZ = Math.sin(elapsed * 0.007) * wobbleIntensity * 0.5;
        
        const currentDistance = 50 + (targetDistance - 50) * eased;
        const basePosition = camera.position.normalize().scale(currentDistance);
        
        camera.position = basePosition.add(new BABYLON.Vector3(wobbleX, wobbleY, wobbleZ));
        
        // Add visual effects
        document.documentElement.style.setProperty('--redshift-intensity', (progress * 0.4).toString());
        document.documentElement.style.setProperty('--lensing-intensity', (progress * 0.3).toString());
        
        // Add slight rotation
        camera.rotation.z += Math.sin(elapsed * 0.01) * progress * 0.02;
        
        if (progress < 1) {
            trackRequestAnimationFrame(animate);
        } else {
            trackSetTimeout(() => {
                escapeBlackHole();
            }, 2500);
        }
    };
    
    animate();
}

// Enhanced dramatic escape from black hole
function escapeBlackHole() {
    const startTime = Date.now();
    const duration = 3000;
    const startDistance = camera.position.length();
    const targetDistance = 50;
    const startRotation = camera.rotation.clone();
    
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        let eased;
        if (progress < 0.4) {
            eased = progress * progress / 0.16;
        } else if (progress < 0.8) {
            const p = (progress - 0.4) / 0.4;
            eased = 0.16 + Math.pow(p, 1.5) * 0.68;
        } else {
            const p = (progress - 0.8) / 0.2;
            eased = 0.84 + (1 - Math.pow(1 - p, 3)) * 0.16;
        }
        
        const currentDistance = startDistance + (targetDistance - startDistance) * eased;
        const basePosition = camera.position.normalize().scale(currentDistance);
        
        const vibrationIntensity = (1 - progress) * 3;
        const vibration = new BABYLON.Vector3(
            Math.sin(elapsed * 0.05) * vibrationIntensity,
            Math.cos(elapsed * 0.07) * vibrationIntensity * 0.7,
            Math.sin(elapsed * 0.03) * vibrationIntensity * 0.5
        );
        
        camera.position = basePosition.add(vibration);
        
        // Fade visual effects
        document.documentElement.style.setProperty('--redshift-intensity', (0.4 * (1 - eased)).toString());
        document.documentElement.style.setProperty('--lensing-intensity', (0.3 * (1 - eased)).toString());
        
        camera.rotation = BABYLON.Vector3.Lerp(startRotation, originalCameraRotation, eased);
        
        if (progress < 1) {
            trackRequestAnimationFrame(animate);
        } else {
            cameraEffectActive = false;
            document.documentElement.style.removeProperty('--redshift-intensity');
            document.documentElement.style.removeProperty('--lensing-intensity');
            camera.rotation = originalCameraRotation.clone();
        }
    };
    
    animate();
}