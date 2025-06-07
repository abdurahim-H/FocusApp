// Application Cleanup and Resource Management
// Handles proper cleanup of animations, event listeners, and 3D resources

let activeAnimationFrames = new Set();
let activeIntervals = new Set();
let activeTimeouts = new Set();
let eventListeners = new Map();
let cleanupInitialized = false;

// Store original functions
let originalRequestAnimationFrame, originalCancelAnimationFrame;
let originalSetInterval, originalClearInterval;
let originalSetTimeout, originalClearTimeout;
let originalAddEventListener;

// Initialize cleanup system
export function initCleanupSystem() {
    if (cleanupInitialized) return;
    cleanupInitialized = true;
    
    // Store original functions
    originalRequestAnimationFrame = window.requestAnimationFrame;
    originalCancelAnimationFrame = window.cancelAnimationFrame;
    originalSetInterval = window.setInterval;
    originalClearInterval = window.clearInterval;
    originalSetTimeout = window.setTimeout;
    originalClearTimeout = window.clearTimeout;
    originalAddEventListener = EventTarget.prototype.addEventListener;
    
    // Don't override global functions immediately - wait for app to initialize first
    // We'll use wrapper functions instead
    
    // Setup automatic cleanup on page unload
    window.addEventListener('beforeunload', () => {
        cleanupApplication();
    });
    
    // Setup tab visibility handling for animation pause/resume
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            pauseAnimations();
        } else {
            resumeAnimations();
        }
    });
}

// Enable aggressive tracking (optional - call after app is loaded)
export function enableAggressiveTracking() {
    if (!cleanupInitialized) {
        return;
    }
    
    setupTrackingWrappers();
}

// Setup tracking wrappers for global functions
function setupTrackingWrappers() {
    // Wrap requestAnimationFrame to track active animation frames
    window.requestAnimationFrame = function(callback) {
        const id = originalRequestAnimationFrame(callback);
        activeAnimationFrames.add(id);
        return id;
    };

    // Wrap cancelAnimationFrame to track cancellations
    window.cancelAnimationFrame = function(id) {
        activeAnimationFrames.delete(id);
        return originalCancelAnimationFrame(id);
    };

    // Wrap setInterval to track active intervals
    window.setInterval = function(callback, delay) {
        const id = originalSetInterval(callback, delay);
        activeIntervals.add(id);
        return id;
    };

    // Wrap clearInterval to track cancellations
    window.clearInterval = function(id) {
        activeIntervals.delete(id);
        return originalClearInterval(id);
    };

    window.setTimeout = function(callback, delay) {
        const id = originalSetTimeout(callback, delay);
        activeTimeouts.add(id);
        return id;
    };

    // Wrap clearTimeout to track cancellations
    window.clearTimeout = function(id) {
        activeTimeouts.delete(id);
        return originalClearTimeout(id);
    };

    // Enhanced addEventListener tracking
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        const key = `${this.constructor.name}_${type}_${listener.toString().substring(0, 50)}`;
        if (!eventListeners.has(this)) {
            eventListeners.set(this, new Map());
        }
        eventListeners.get(this).set(key, { type, listener, options });
        return originalAddEventListener.call(this, type, listener, options);
    };
}

// Global cleanup function
export function cleanupApplication() {
    // Cancel all active animation frames
    let frameCount = 0;
    for (const frameId of activeAnimationFrames) {
        originalCancelAnimationFrame(frameId);
        frameCount++;
    }
    activeAnimationFrames.clear();
    
    // Clear all active intervals
    let intervalCount = 0;
    for (const intervalId of activeIntervals) {
        originalClearInterval(intervalId);
        intervalCount++;
    }
    activeIntervals.clear();
    
    // Clear all active timeouts
    let timeoutCount = 0;
    for (const timeoutId of activeTimeouts) {
        originalClearTimeout(timeoutId);
        timeoutCount++;
    }
    activeTimeouts.clear();
    
    // Cleanup Three.js resources
    cleanup3DResources();
    
    // Cleanup UI effects
    cleanupUIEffects();
}

// Three.js resource cleanup
function cleanup3DResources() {
    if (typeof THREE === 'undefined') return;
    
    let geometryCount = 0;
    let materialCount = 0;
    let textureCount = 0;
    
    // Find and dispose of all Three.js resources in the scene
    if (window.scene) {
        window.scene.traverse((object) => {
            if (object.geometry) {
                object.geometry.dispose();
                geometryCount++;
            }
            
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => {
                        disposeMaterial(material);
                        materialCount++;
                    });
                } else {
                    disposeMaterial(object.material);
                    materialCount++;
                }
            }
        });
    }
    
    // Cleanup renderer
    if (window.renderer) {
        window.renderer.dispose();
        window.renderer.forceContextLoss();
    }
    
    function disposeMaterial(material) {
        if (material.map) {
            material.map.dispose();
            textureCount++;
        }
        if (material.normalMap) material.normalMap.dispose();
        if (material.roughnessMap) material.roughnessMap.dispose();
        if (material.metalnessMap) material.metalnessMap.dispose();
        material.dispose();
    }
}

// UI effects cleanup
function cleanupUIEffects() {
    const body = document.body;
    const container = document.querySelector('.container');
    const allElements = document.querySelectorAll('*');
    
    // Remove all effect classes
    const effectClasses = [
        'productivity-glow', 'task-celebration', 'focus-intense',
        'session-complete', 'gravitational-pull', 'cosmic-flow',
        'btn-particle', 'cosmic-entrance-active', 'cosmic-exit-active'
    ];
    
    allElements.forEach(el => {
        effectClasses.forEach(className => {
            el.classList.remove(className);
        });
    });
    
    // Remove CSS custom properties
    body.style.removeProperty('--time-scale');
    body.style.removeProperty('--redshift-intensity');
    document.documentElement.style.removeProperty('--time-scale');
    document.documentElement.style.removeProperty('--redshift-intensity');
}

// Export tracking functions for use by other modules
export function trackRequestAnimationFrame(callback) {
    const id = originalRequestAnimationFrame(callback);
    activeAnimationFrames.add(id);
    return id;
}

export function trackSetInterval(callback, delay) {
    const id = originalSetInterval(callback, delay);
    activeIntervals.add(id);
    return id;
}

export function trackSetTimeout(callback, delay) {
    const id = originalSetTimeout(callback, delay);
    activeTimeouts.add(id);
    return id;
}

export function trackEventListener(element, type, listener, options) {
    return element.addEventListener(type, listener, options);
}

window.cleanupApplication = cleanupApplication;

export { activeAnimationFrames, activeIntervals, activeTimeouts, eventListeners };
