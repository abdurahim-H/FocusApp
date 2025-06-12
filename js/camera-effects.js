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