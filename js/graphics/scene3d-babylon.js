// scene3d-babylon.js - Cinematic Scene Orchestrator for Babylon.js
// Coordinates all graphics modules: black hole, starfield, post-processing

import { initEngine, getEngine, disposeEngine, isUsingWebGPU } from './babylon-engine.js';
import { createStarField, updateStarField, disposeStarField } from './starfield-babylon.js';
import { createBlackHole, updateBlackHole, disposeBlackHole, getLensingPostProcess } from './blackhole-babylon.js';
import { setupPostProcessing, disposePostProcessing, setExposure } from './postprocessing-babylon.js';

// Scene globals
let scene = null;
let camera = null;
let engine = null;
let canvas = null;

// Animation timing
const clock = {
    startTime: performance.now(),
    lastTime: performance.now(),
    getElapsedTime() {
        return (performance.now() - this.startTime) / 1000;
    },
    getDeltaTime() {
        const now = performance.now();
        const delta = (now - this.lastTime) / 1000;
        this.lastTime = now;
        return delta;
    }
};

// Performance stats
const stats = {
    fps: 0,
    frameTime: 0,
    lastTime: performance.now(),
    frameCount: 0
};

/**
 * Initialize the 3D scene
 * Main entry point called by app.js
 * @returns {Promise<boolean>} Success status
 */
export async function init3D() {
    console.log('🎬 Initializing Cinematic Black Hole Scene...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        // Initialize engine (handles WebGPU/WebGL2)
        const engineResult = await initEngine();
        engine = engineResult.engine;
        canvas = engineResult.canvas;

        const rendererType = engineResult.isWebGPU ? '⚡ WebGPU' : '🔷 WebGL2';
        console.log(`${rendererType} renderer initialized`);

        // Create scene with HDR support
        scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0.0, 0.0, 0.02, 1.0); // Deep space blue-black

        // Enable rendering groups for proper layering
        scene.setRenderingAutoClearDepthStencil(0, true, true, true);  // Background (stars)
        scene.setRenderingAutoClearDepthStencil(1, false, false, false); // Event horizon
        scene.setRenderingAutoClearDepthStencil(2, false, false, false); // Disk, rings

        // Setup cinematic camera first
        setupCinematicCamera();

        // Create scene elements (pass camera reference)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        createStarField(scene, camera);
        createBlackHole(scene, camera);

        // Setup ambient lighting
        setupLighting();

        // Setup post-processing pipeline (pass camera)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        setupPostProcessing(scene, camera);

        // Start render loop
        engine.runRenderLoop(renderLoop);

        // Handle window resize
        window.addEventListener('resize', handleResize);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎬 Cinematic scene ready!');
        console.log(`   Total stars: ~100,000`);
        console.log(`   Effects: Gravitational lensing, HDR, Bloom, Film grain`);

        return true;

    } catch (error) {
        console.error('❌ Failed to initialize scene:', error);
        return false;
    }
}

/**
 * Setup the cinematic camera with slow orbital motion
 */
function setupCinematicCamera() {
    console.log('📷 Setting up cinematic camera...');

    // ArcRotateCamera for smooth orbital movement
    camera = new BABYLON.ArcRotateCamera(
        'cinematicCamera',
        Math.PI * 0.25,     // Alpha (horizontal angle)
        Math.PI * 0.4,      // Beta (vertical angle) - slightly above horizon
        65,                 // Radius (distance from center)
        BABYLON.Vector3.Zero(),
        scene
    );

    // Camera constraints
    camera.lowerRadiusLimit = 30;
    camera.upperRadiusLimit = 200;
    camera.lowerBetaLimit = 0.1;
    camera.upperBetaLimit = Math.PI - 0.1;

    // Smooth camera movement
    camera.inertia = 0.9;

    // Disable user input for cinematic mode
    camera.inputs.clear();

    // Set FOV for cinematic feel (wider than default)
    camera.fov = 0.9; // ~52 degrees

    // Near/far planes for proper depth
    camera.minZ = 0.1;
    camera.maxZ = 2000;

    console.log('   ✓ Cinematic camera configured');
}

/**
 * Setup subtle ambient lighting
 */
function setupLighting() {
    console.log('💡 Setting up lighting...');

    // Very dim ambient - space is dark
    const ambient = new BABYLON.HemisphericLight(
        'ambient',
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    ambient.intensity = 0.05;
    ambient.diffuse = new BABYLON.Color3(0.05, 0.05, 0.1);
    ambient.groundColor = new BABYLON.Color3(0.02, 0.02, 0.05);

    // Subtle blue key light (from above-left)
    const keyLight = new BABYLON.PointLight(
        'keyLight',
        new BABYLON.Vector3(-50, 40, 50),
        scene
    );
    keyLight.diffuse = new BABYLON.Color3(0.2, 0.25, 0.4);
    keyLight.intensity = 0.3;
    keyLight.range = 300;

    // Warm fill light (from below-right)
    const fillLight = new BABYLON.PointLight(
        'fillLight',
        new BABYLON.Vector3(40, -20, -40),
        scene
    );
    fillLight.diffuse = new BABYLON.Color3(0.4, 0.2, 0.1);
    fillLight.intensity = 0.15;
    fillLight.range = 200;

    console.log('   ✓ Lighting configured');
}

/**
 * Main render loop
 */
function renderLoop() {
    const elapsed = clock.getElapsedTime();
    const delta = clock.getDeltaTime();

    // Update all systems
    updateCinematicCamera(elapsed);
    updateStarField(elapsed);
    updateBlackHole(elapsed, delta);

    // Update exposure based on camera position (auto-exposure simulation)
    updateAutoExposure(elapsed);

    // Render the scene
    scene.render();

    // Update performance stats
    updateStats();
}

/**
 * Update camera for cinematic orbital motion
 * @param {number} elapsed - Elapsed time in seconds
 */
function updateCinematicCamera(elapsed) {
    // Slow orbital rotation
    const baseAlpha = Math.PI * 0.25;
    const orbitSpeed = 0.02; // Very slow
    camera.alpha = baseAlpha + elapsed * orbitSpeed;

    // Subtle vertical oscillation
    const baseBeta = Math.PI * 0.4;
    const verticalOscillation = Math.sin(elapsed * 0.015) * 0.08;
    camera.beta = baseBeta + verticalOscillation;

    // Gentle distance breathing
    const baseRadius = 65;
    const breathingAmplitude = 8;
    const breathingSpeed = 0.03;
    camera.radius = baseRadius + Math.sin(elapsed * breathingSpeed) * breathingAmplitude;

    // Micro-motion (subtle camera shake for film feel)
    const microShakeX = Math.sin(elapsed * 2.3) * 0.003;
    const microShakeY = Math.sin(elapsed * 1.7) * 0.002;
    camera.target.x = microShakeX;
    camera.target.y = microShakeY;
}

/**
 * Simulate auto-exposure based on scene brightness
 * @param {number} elapsed
 */
function updateAutoExposure(elapsed) {
    // Subtle exposure variation to simulate camera response
    const baseExposure = 1.0;
    const variation = Math.sin(elapsed * 0.1) * 0.05;
    setExposure(baseExposure + variation);
}

/**
 * Update performance statistics
 */
function updateStats() {
    const now = performance.now();
    stats.frameTime = now - stats.lastTime;
    stats.lastTime = now;
    stats.frameCount++;

    // Calculate FPS every 30 frames
    if (stats.frameCount % 30 === 0) {
        stats.fps = Math.round(1000 / stats.frameTime);
    }
}

/**
 * Handle window resize
 */
function handleResize() {
    if (engine) {
        engine.resize();
    }
}

/**
 * Get current FPS
 * @returns {number}
 */
export function getFPS() {
    return stats.fps;
}

/**
 * Get scene reference
 * @returns {BABYLON.Scene}
 */
export function getScene() {
    return scene;
}

/**
 * Get camera reference
 * @returns {BABYLON.Camera}
 */
export function getCamera() {
    return camera;
}

/**
 * Dispose all resources and clean up
 */
export function dispose() {
    console.log('🧹 Disposing scene resources...');

    window.removeEventListener('resize', handleResize);

    disposePostProcessing();
    disposeBlackHole();
    disposeStarField();

    if (scene) {
        scene.dispose();
        scene = null;
    }

    disposeEngine();

    camera = null;
    engine = null;
    canvas = null;

    console.log('✓ Scene disposed');
}

// Export for external access
export { scene, camera, stats };
