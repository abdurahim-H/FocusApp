// babylon-engine.js - Babylon.js Engine with WebGPU Support
// Handles engine initialization with WebGPU primary and WebGL2 fallback

// Engine state
let engine = null;
let canvas = null;
let isWebGPU = false;
let isInitialized = false;

// Engine configuration
const CONFIG = {
    antialias: true,
    preserveDrawingBuffer: false,
    stencil: false,
    adaptToDeviceRatio: true,
    powerPreference: 'high-performance',
};

/**
 * Initialize the Babylon.js engine
 * Attempts WebGPU first, falls back to WebGL2
 * @returns {Promise<{engine: BABYLON.Engine, canvas: HTMLCanvasElement, isWebGPU: boolean}>}
 */
export async function initEngine() {
    if (isInitialized && engine) {
        return { engine, canvas, isWebGPU };
    }

    // Get or create canvas
    const container = document.getElementById('scene-container');
    if (!container) {
        throw new Error('Scene container not found');
    }

    // Clear container and create canvas
    container.innerHTML = '';
    canvas = document.createElement('canvas');
    canvas.id = 'babylon-canvas';

    // Set explicit pixel dimensions (critical for WebGL context creation)
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width || window.innerWidth;
    canvas.height = rect.height || window.innerHeight;

    // CSS styling
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.outline = 'none';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';

    container.appendChild(canvas);

    // NOTE: WebGPU is disabled because Babylon.js DefaultRenderingPipeline
    // has compatibility issues with WebGPU's rgba16float texture format.
    // This causes black screen when bloom/DOF are enabled.
    // WebGL2 provides reliable post-processing and is still high performance.
    // TODO: Re-enable WebGPU once Babylon.js fixes pipeline compatibility
    const useWebGPU = false; // Disabled for now

    if (useWebGPU && (await checkWebGPUSupport())) {
        try {
            engine = new BABYLON.WebGPUEngine(canvas, {
                antialias: CONFIG.antialias,
                stencil: CONFIG.stencil,
                adaptToDeviceRatio: CONFIG.adaptToDeviceRatio,
                powerPreference: CONFIG.powerPreference,
            });

            await engine.initAsync();
            isWebGPU = true;
        } catch (error) {
            console.warn('⚠️ WebGPU initialization failed, falling back to WebGL2:', error);
            engine = null;
        }
    }

    // Fall back to WebGL2 if WebGPU failed or unavailable
    if (!engine) {
        // Ensure canvas has valid dimensions
        if (canvas.width === 0 || canvas.height === 0) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        try {
            engine = new BABYLON.Engine(canvas, CONFIG.antialias, {
                preserveDrawingBuffer: CONFIG.preserveDrawingBuffer,
                stencil: CONFIG.stencil,
                adaptToDeviceRatio: CONFIG.adaptToDeviceRatio,
                powerPreference: CONFIG.powerPreference,
                failIfMajorPerformanceCaveat: false,
                doNotHandleContextLost: false,
            });
            isWebGPU = false;
        } catch (webglError) {
            console.error('❌ WebGL2 failed, trying WebGL1...', webglError);

            // Try WebGL1 as last resort
            try {
                engine = new BABYLON.Engine(canvas, CONFIG.antialias, {
                    preserveDrawingBuffer: CONFIG.preserveDrawingBuffer,
                    stencil: CONFIG.stencil,
                    disableWebGL2Support: true,
                    failIfMajorPerformanceCaveat: false,
                });
                isWebGPU = false;
            } catch (webgl1Error) {
                console.error('❌ All WebGL initialization failed:', webgl1Error);
                throw new Error(
                    'WebGL initialization failed. Please enable hardware acceleration in your browser settings.'
                );
            }
        }
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        if (engine) {
            engine.resize();
        }
    });

    // Set hardware scaling to 1.0 — render at CSS resolution, not retina
    // This is 4x fewer pixels on retina displays, huge performance gain
    if (engine) {
        engine.setHardwareScalingLevel(1.0);
    }

    isInitialized = true;

    // Log capabilities
    logEngineCapabilities();

    return { engine, canvas, isWebGPU };
}

/**
 * Check if WebGPU is supported
 * @returns {Promise<boolean>}
 */
async function checkWebGPUSupport() {
    // Check if BABYLON.WebGPUEngine exists
    if (typeof BABYLON === 'undefined' || !BABYLON.WebGPUEngine) {
        return false;
    }

    // Check navigator.gpu
    if (!navigator.gpu) {
        return false;
    }

    try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            return false;
        }
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Log engine capabilities for debugging
 */
function logEngineCapabilities() {
    // Silent in production
}

/**
 * Get the current engine instance
 * @returns {BABYLON.Engine|BABYLON.WebGPUEngine|null}
 */
export function getEngine() {
    return engine;
}

/**
 * Get the canvas element
 * @returns {HTMLCanvasElement|null}
 */
export function getCanvas() {
    return canvas;
}

/**
 * Check if using WebGPU
 * @returns {boolean}
 */
export function isUsingWebGPU() {
    return isWebGPU;
}

/**
 * Dispose the engine and clean up resources
 */
export function disposeEngine() {
    if (engine) {
        engine.dispose();
        engine = null;
    }
    if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
        canvas = null;
    }
    isInitialized = false;
    isWebGPU = false;
}

// Export for external access
export { canvas, engine, isWebGPU };
