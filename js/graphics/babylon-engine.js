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
    powerPreference: 'high-performance'
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

    console.log('🚀 Initializing Babylon.js Engine...');

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

    console.log(`📐 Canvas created: ${canvas.width}x${canvas.height}`);

    // Try WebGPU first
    if (await checkWebGPUSupport()) {
        try {
            console.log('⚡ WebGPU supported, initializing WebGPU engine...');
            engine = new BABYLON.WebGPUEngine(canvas, {
                antialias: CONFIG.antialias,
                stencil: CONFIG.stencil,
                adaptToDeviceRatio: CONFIG.adaptToDeviceRatio,
                powerPreference: CONFIG.powerPreference
            });

            await engine.initAsync();
            isWebGPU = true;
            console.log('✅ WebGPU Engine initialized successfully!');
        } catch (error) {
            console.warn('⚠️ WebGPU initialization failed, falling back to WebGL2:', error);
            engine = null;
        }
    }

    // Fall back to WebGL2 if WebGPU failed or unavailable
    if (!engine) {
        console.log('🔄 Initializing WebGL2 engine...');

        // Ensure canvas has valid dimensions
        if (canvas.width === 0 || canvas.height === 0) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            console.log(`📐 Resized canvas to: ${canvas.width}x${canvas.height}`);
        }

        try {
            engine = new BABYLON.Engine(canvas, CONFIG.antialias, {
                preserveDrawingBuffer: CONFIG.preserveDrawingBuffer,
                stencil: CONFIG.stencil,
                adaptToDeviceRatio: CONFIG.adaptToDeviceRatio,
                powerPreference: CONFIG.powerPreference,
                failIfMajorPerformanceCaveat: false,
                doNotHandleContextLost: false
            });
            isWebGPU = false;
            console.log('✅ WebGL2 Engine initialized successfully!');
        } catch (webglError) {
            console.error('❌ WebGL2 failed, trying WebGL1...', webglError);

            // Try WebGL1 as last resort
            try {
                engine = new BABYLON.Engine(canvas, CONFIG.antialias, {
                    preserveDrawingBuffer: CONFIG.preserveDrawingBuffer,
                    stencil: CONFIG.stencil,
                    disableWebGL2Support: true,
                    failIfMajorPerformanceCaveat: false
                });
                isWebGPU = false;
                console.log('✅ WebGL1 Engine initialized successfully!');
            } catch (webgl1Error) {
                console.error('❌ All WebGL initialization failed:', webgl1Error);
                throw new Error('WebGL initialization failed. Please enable hardware acceleration in your browser settings.');
            }
        }
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        if (engine) {
            engine.resize();
        }
    });

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
        console.log('ℹ️ Babylon.js WebGPU module not available');
        return false;
    }

    // Check navigator.gpu
    if (!navigator.gpu) {
        console.log('ℹ️ WebGPU not supported by browser');
        return false;
    }

    try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            console.log('ℹ️ No WebGPU adapter found');
            return false;
        }
        return true;
    } catch (error) {
        console.log('ℹ️ WebGPU check failed:', error);
        return false;
    }
}

/**
 * Log engine capabilities for debugging
 */
function logEngineCapabilities() {
    if (!engine) return;

    console.log('📊 Engine Capabilities:');
    console.log(`   - Renderer: ${isWebGPU ? 'WebGPU' : 'WebGL2'}`);
    console.log(`   - Hardware Scaling: ${engine.getHardwareScalingLevel()}`);

    if (!isWebGPU && engine.getCaps) {
        const caps = engine.getCaps();
        console.log(`   - Max Texture Size: ${caps.maxTextureSize}`);
        console.log(`   - Max Vertex Attribs: ${caps.maxVertexAttribs}`);
        console.log(`   - Float Textures: ${caps.textureFloatLinearFiltering}`);
    }
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
    console.log('🧹 Engine disposed');
}

// Export for external access
export { engine, canvas, isWebGPU };
