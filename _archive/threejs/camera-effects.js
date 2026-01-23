// camera-effects.js - Advanced Camera Effects for Three.js
// Cinematic camera movements, shake effects, and dynamic transitions

import * as THREE from 'three';
import { camera } from './scene3d.js';

let cameraEffectActive = false;
let shakeMagnitude = 0;
let originalPosition = new THREE.Vector3();
let originalRotation = new THREE.Euler();

// Initialize camera effects
export function initCameraEffects() {
    if (camera) {
        originalPosition.copy(camera.position);
        originalRotation.copy(camera.rotation);
    }
    console.log('📷 Camera effects initialized');
}

// Task completion shake
export function triggerTaskCompletionShake() {
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

// Session complete cinematic zoom
export function triggerSessionCompleteZoom() {
    if (cameraEffectActive || !camera) return;
    
    cameraEffectActive = true;
    const startTime = Date.now();
    const duration = 5000;
    const startDistance = camera.position.length();
    const targetDistance = 120;
    
    const startPos = camera.position.clone();
    
    function zoomUpdate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Cinematic easing
        const eased = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        const currentDistance = startDistance + (targetDistance - startDistance) * eased;
        const direction = startPos.clone().normalize();
        camera.position.copy(direction.multiplyScalar(currentDistance));
        
        // Slow rotation
        camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), progress * 0.5);
        camera.lookAt(0, 0, 0);
        
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

// Return to normal orbit
function returnToNormalOrbit() {
    const startTime = Date.now();
    const duration = 4000;
    const startPos = camera.position.clone();
    const targetDistance = 50;
    
    function returnUpdate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const eased = 1 - Math.pow(1 - progress, 3);
        
        const currentDistance = startPos.length() + (targetDistance - startPos.length()) * eased;
        const direction = startPos.clone().normalize();
        camera.position.copy(direction.multiplyScalar(currentDistance));
        camera.lookAt(0, 0, 0);
        
        if (progress < 1) {
            requestAnimationFrame(returnUpdate);
        } else {
            cameraEffectActive = false;
        }
    }
    returnUpdate();
}

// Update camera effects (called from animation loop)
export function updateCameraEffects() {
    if (!camera) return;
    
    // Apply shake
    if (shakeMagnitude > 0) {
        const time = performance.now() * 0.001;
        const shakeX = Math.sin(time * 20) * shakeMagnitude * 0.5;
        const shakeY = Math.sin(time * 15) * shakeMagnitude * 0.4;
        const shakeZ = Math.sin(time * 18) * shakeMagnitude * 0.3;
        
        camera.position.x += shakeX;
        camera.position.y += shakeY;
        camera.position.z += shakeZ;
        
        shakeMagnitude *= 0.97;
        if (shakeMagnitude < 0.01) shakeMagnitude = 0;
    }
}

// Time dilation effect
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
