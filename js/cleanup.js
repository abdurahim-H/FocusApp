// Application Cleanup and Resource Management for Babylon.js
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

// Animation pause/resume state
let animationsPaused = false;
let pausedAnimationFrames = new Set();

// Babylon.js specific tracking
let activeBabylonResources = {
    meshes: new Set(),
    materials: new Set(),
    textures: new Set(),
    shaders: new Set(),
    particleSystems: new Set(),
    postProcesses: new Set(),
    sounds: new Set()
};

// Initialize cleanup system
export function initCleanupSystem() {
    if (cleanupInitialized) return;
    cleanupInitialized = true;
    
    console.log('🧹 Babylon.js Cleanup system initializing...');
    
    // Store original functions
    originalRequestAnimationFrame = window.requestAnimationFrame;
    originalCancelAnimationFrame = window.cancelAnimationFrame;
    originalSetInterval = window.setInterval;
    originalClearInterval = window.clearInterval;
    originalSetTimeout = window.setTimeout;
    originalClearTimeout = window.clearTimeout;
    originalAddEventListener = EventTarget.prototype.addEventListener;
    
    // Setup automatic cleanup on page unload
    window.addEventListener('beforeunload', () => {
        cleanupApplication();
    });
    
    // Setup tab visibility handling for animation pause/resume
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('🔄 Tab hidden - pausing animations');
            pauseAnimations();
        } else {
            console.log('🔄 Tab visible - resuming animations');
            resumeAnimations();
        }
    });
    
    // Babylon.js specific error handling
    if (window.BABYLON) {
        BABYLON.Engine.audioEngine?.useCustomUnlockedButton = true;
        
        // Handle WebGL context loss
        window.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            console.error('🚨 WebGL context lost - attempting recovery...');
            handleWebGLContextLoss();
        });
        
        window.addEventListener('webglcontextrestored', () => {
            console.log('✅ WebGL context restored');
            handleWebGLContextRestored();
        });
    }
    
    console.log('🧹 Cleanup system initialized - tracking functions ready');
}

// Handle WebGL context loss
function handleWebGLContextLoss() {
    // Stop render loop if engine exists
    if (window.engine) {
        window.engine.stopRenderLoop();
    }
    
    // Mark all resources for recreation
    activeBabylonResources.meshes.forEach(mesh => mesh._needsRecreation = true);
    activeBabylonResources.materials.forEach(material => material._needsRecreation = true);
    activeBabylonResources.textures.forEach(texture => texture._needsRecreation = true);
}

// Handle WebGL context restoration
function handleWebGLContextRestored() {
    // Restart engine if it exists
    if (window.engine && window.scene && window.animate) {
        window.engine.runRenderLoop(() => {
            window.animate();
        });
    }
    
    // Recreate lost resources
    recreateLostResources();
}

// Recreate resources after context loss
function recreateLostResources() {
    console.log('🔧 Recreating lost WebGL resources...');
    
    // Textures need to be reloaded
    activeBabylonResources.textures.forEach(texture => {
        if (texture._needsRecreation && texture.url) {
            texture.releaseInternalTexture();
            texture.updateURL(texture.url);
        }
    });
    
    // Materials may need shader recompilation
    activeBabylonResources.materials.forEach(material => {
        if (material._needsRecreation) {
            material.markDirty();
        }
    });
}

// Pause all animations when tab is hidden
function pauseAnimations() {
    animationsPaused = true;
    
    // Pause Babylon.js engine
    if (window.engine) {
        window.engine.stopRenderLoop();
        
        // Pause audio engine
        if (BABYLON.Engine.audioEngine) {
            BABYLON.Engine.audioEngine.suspend();
        }
    }
    
    // Store currently active animation frames
    pausedAnimationFrames = new Set(activeAnimationFrames);
    // Cancel all active animation frames
    pausedAnimationFrames.forEach(frameId => {
        originalCancelAnimationFrame(frameId);
    });
}

// Resume animations when tab becomes visible
function resumeAnimations() {
    animationsPaused = false;
    
    // Resume Babylon.js engine
    if (window.engine && window.scene && window.animate) {
        window.engine.runRenderLoop(() => {
            window.animate();
        });
        
        // Resume audio engine
        if (BABYLON.Engine.audioEngine) {
            BABYLON.Engine.audioEngine.resume();
        }
    }
    
    // Restart meditation animation if ambient mode is active
    if (window.restartMeditationAnimation) {
        window.restartMeditationAnimation();
    }
    
    // Restart cosmic settings animations if modal is open
    if (window.restartCosmicSettingsAnimations) {
        window.restartCosmicSettingsAnimations();
    }
}

// Enable aggressive tracking (optional - call after app is loaded)
export function enableAggressiveTracking() {
    if (!cleanupInitialized) {
        console.warn('🧹 Cleanup system not initialized, cannot enable aggressive tracking');
        return;
    }
    
    console.log('🧹 Enabling aggressive tracking...');
    setupTrackingWrappers();
    setupBabylonResourceTracking();
}

// Setup Babylon.js resource tracking
function setupBabylonResourceTracking() {
    if (!window.BABYLON) return;
    
    // Track mesh creation
    const originalCreateMesh = BABYLON.Mesh.prototype.constructor;
    BABYLON.Mesh.prototype.constructor = function(...args) {
        originalCreateMesh.apply(this, args);
        activeBabylonResources.meshes.add(this);
    };
    
    // Track material creation
    const originalCreateMaterial = BABYLON.Material.prototype.constructor;
    BABYLON.Material.prototype.constructor = function(...args) {
        originalCreateMaterial.apply(this, args);
        activeBabylonResources.materials.add(this);
    };
    
    // Track texture creation
    const originalCreateTexture = BABYLON.Texture.prototype.constructor;
    BABYLON.Texture.prototype.constructor = function(...args) {
        originalCreateTexture.apply(this, args);
        activeBabylonResources.textures.add(this);
    };
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
    console.log('🧹 Starting Babylon.js application cleanup...');
    
    // Cancel all active animation frames
    let frameCount = 0;
    for (const frameId of activeAnimationFrames) {
        originalCancelAnimationFrame(frameId);
        frameCount++;
    }
    activeAnimationFrames.clear();
    console.log(`🧹 Cancelled ${frameCount} animation frames`);
    
    // Clear all active intervals
    let intervalCount = 0;
    for (const intervalId of activeIntervals) {
        originalClearInterval(intervalId);
        intervalCount++;
    }
    activeIntervals.clear();
    console.log(`🧹 Cleared ${intervalCount} intervals`);
    
    // Clear all active timeouts
    let timeoutCount = 0;
    for (const timeoutId of activeTimeouts) {
        originalClearTimeout(timeoutId);
        timeoutCount++;
    }
    activeTimeouts.clear();
    console.log(`🧹 Cleared ${timeoutCount} timeouts`);
    
    // Cleanup Babylon.js resources
    cleanup3DResources();
    
    // Cleanup UI effects
    cleanupUIEffects();
    
    console.log('🧹 Application cleanup complete');
}

// Babylon.js resource cleanup
function cleanup3DResources() {
    if (typeof BABYLON === 'undefined') return;
    
    let meshCount = 0;
    let materialCount = 0;
    let textureCount = 0;
    let particleCount = 0;
    let postProcessCount = 0;
    
    // Dispose scene if it exists
    if (window.scene) {
        // Stop all animations
        window.scene.stopAllAnimations();
        
        // Dispose all particle systems
        window.scene.particleSystems?.forEach(ps => {
            ps.dispose();
            particleCount++;
        });
        
        // Dispose all meshes
        window.scene.meshes?.forEach(mesh => {
            if (mesh && !mesh.isDisposed()) {
                mesh.dispose(false, true); // Don't dispose materials yet
                meshCount++;
            }
        });
        
        // Dispose all materials
        window.scene.materials?.forEach(material => {
            if (material && !material.isDisposed()) {
                material.dispose(true, true); // Force dispose textures
                materialCount++;
            }
        });
        
        // Dispose all textures
        window.scene.textures?.forEach(texture => {
            if (texture && !texture.isDisposed()) {
                texture.dispose();
                textureCount++;
            }
        });
        
        // Dispose post-processes
        window.scene.postProcesses?.forEach(pp => {
            pp.dispose();
            postProcessCount++;
        });
        
        // Dispose render targets
        window.scene.customRenderTargets?.forEach(rt => {
            rt.dispose();
        });
        
        // Clear the scene
        window.scene.dispose();
    }
    
    // Dispose engine
    if (window.engine) {
        window.engine.stopRenderLoop();
        window.engine.dispose();
    }
    
    // Clear tracked resources
    activeBabylonResources.meshes.clear();
    activeBabylonResources.materials.clear();
    activeBabylonResources.textures.clear();
    activeBabylonResources.shaders.clear();
    activeBabylonResources.particleSystems.clear();
    activeBabylonResources.postProcesses.clear();
    activeBabylonResources.sounds.clear();
    
    console.log(`🧹 Disposed ${meshCount} meshes, ${materialCount} materials, ${textureCount} textures, ${particleCount} particle systems, ${postProcessCount} post-processes`);
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
    
    console.log('🧹 Cleaned up UI effects');
}

// Export tracking functions for use by other modules
export function trackRequestAnimationFrame(callback) {
    if (animationsPaused) {
        // Don't completely block - return a dummy ID but don't schedule
        // The animation will be restarted when tab becomes visible
        return -1;
    }
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

// Babylon.js resource tracking helpers
export function trackBabylonMesh(mesh) {
    activeBabylonResources.meshes.add(mesh);
}

export function trackBabylonMaterial(material) {
    activeBabylonResources.materials.add(material);
}

export function trackBabylonTexture(texture) {
    activeBabylonResources.textures.add(texture);
}

export function trackBabylonParticleSystem(particleSystem) {
    activeBabylonResources.particleSystems.add(particleSystem);
}

// Memory monitoring (development only)
export function reportMemoryUsage() {
    const report = {
        activeFrames: activeAnimationFrames.size,
        activeIntervals: activeIntervals.size,
        activeTimeouts: activeTimeouts.size
    };
    
    if (performance.memory) {
        const memory = performance.memory;
        report.memory = {
            used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
            total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
            limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
        };
    }
    
    if (window.BABYLON && window.scene) {
        report.babylon = {
            meshes: window.scene.meshes?.length || 0,
            materials: window.scene.materials?.length || 0,
            textures: window.scene.textures?.length || 0,
            particleSystems: window.scene.particleSystems?.length || 0,
            activeMeshes: window.scene.getActiveMeshes()?.length || 0,
            totalVertices: window.scene.getTotalVertices() || 0,
            drawCalls: window.engine?.drawCalls || 0,
            fps: window.engine?.getFps()?.toFixed(2) || 0
        };
    }
    
    console.log('📊 Memory & Performance Report:', report);
    return report;
}

// Babylon.js specific cleanup helpers
export function disposeUnusedTextures() {
    if (!window.scene) return;
    
    let disposed = 0;
    window.scene.textures?.forEach(texture => {
        if (texture.references === 0 && !texture.isDisposed()) {
            texture.dispose();
            disposed++;
        }
    });
    
    console.log(`🧹 Disposed ${disposed} unused textures`);
}

export function optimizeMeshes() {
    if (!window.scene) return;
    
    // Merge meshes with same material
    const meshesByMaterial = new Map();
    window.scene.meshes.forEach(mesh => {
        if (mesh.material && mesh.isVisible && !mesh.skeleton) {
            const key = mesh.material.uniqueId;
            if (!meshesByMaterial.has(key)) {
                meshesByMaterial.set(key, []);
            }
            meshesByMaterial.get(key).push(mesh);
        }
    });
    
    let mergedCount = 0;
    meshesByMaterial.forEach((meshes, materialId) => {
        if (meshes.length > 1) {
            const merged = BABYLON.Mesh.MergeMeshes(meshes, true, true);
            if (merged) mergedCount++;
        }
    });
    
    console.log(`🧹 Merged ${mergedCount} mesh groups`);
}

// Check if animations are paused
export function areAnimationsPaused() {
    return animationsPaused;
}

// Expose for debugging
window.cleanupApplication = cleanupApplication;
window.reportMemoryUsage = reportMemoryUsage;
window.disposeUnusedTextures = disposeUnusedTextures;
window.optimizeMeshes = optimizeMeshes;

export { activeAnimationFrames, activeIntervals, activeTimeouts, eventListeners, activeBabylonResources };