// scene-manager.js - Cinematic Scene Orchestrator for Babylon.js
// Coordinates all graphics modules: starfield, camera, post-processing

import { initEngine, getEngine, disposeEngine, isUsingWebGPU } from '../../engine/babylon-engine.js';
import { createCosmicSkybox, updateCosmicSkybox, disposeCosmicSkybox } from '../environment/cosmic-skybox.js';
import { createStarField, updateStarField, disposeStarField } from '../environment/starfield.js';
import { createNebula, updateNebula, disposeNebula } from '../environment/nebula.js';
import { createShootingStars, updateShootingStars, disposeShootingStars } from '../environment/shooting-stars.js';
import { setupPostProcessing, disposePostProcessing, setExposure } from '../postprocessing/pipeline.js';
import { detectDeviceProfile, createFPSWatchdog } from '../../utils/performance-profile.js';


// Scene globals
let scene = null;
let camera = null;
let engine = null;
let canvas = null;

// Mouse parallax state (desktop only)
const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
let parallaxEnabled = false;
let deviceProfile = null;
let fpsWatchdog = null;

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
    console.log('🎬 Initializing Scene...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        // Initialize engine (handles WebGPU/WebGL2)
        const engineResult = await initEngine();
        engine = engineResult.engine;
        canvas = engineResult.canvas;

        const rendererType = engineResult.isWebGPU ? '⚡ WebGPU' : '🔷 WebGL2';
        console.log(`${rendererType} renderer initialized`);

        // Detect device capability
        deviceProfile = detectDeviceProfile();

        // Create scene with HDR support
        scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0.003, 0.002, 0.008, 1.0); // Near black

        // Enable rendering groups for proper layering
        scene.setRenderingAutoClearDepthStencil(0, true, true, true);  // Background (stars)
        scene.setRenderingAutoClearDepthStencil(1, false, false, false); // Event horizon
        scene.setRenderingAutoClearDepthStencil(2, false, false, false); // Disk, rings

        // Setup cinematic camera first
        setupCinematicCamera();

        // Create scene elements (pass camera reference)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        createCosmicSkybox(scene);
        createStarField(scene, camera, deviceProfile.starMultiplier);
        createNebula(scene, camera, deviceProfile.shaderOctaves);
        createShootingStars(scene);

        // Setup ambient lighting
        setupLighting();

        // Setup post-processing pipeline (pass camera)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        setupPostProcessing(scene, camera);

        // Setup FPS watchdog for adaptive quality
        fpsWatchdog = createFPSWatchdog(stats, () => {
            // Reduce bloom quality on sustained low FPS
            const pipeline = scene?.postProcessRenderPipelineManager?.supportedPipelines;
            if (engine) {
                engine.setHardwareScalingLevel(1.5); // Render at lower resolution
            }
        });

        // Start render loop
        engine.runRenderLoop(renderLoop);

        // Handle window resize
        window.addEventListener('resize', handleResize);

        // Mouse parallax (desktop only)
        if (!('ontouchstart' in window)) {
            parallaxEnabled = true;
            window.addEventListener('mousemove', (e) => {
                mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
                mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
            });
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎬 Cinematic scene ready!');
        console.log(`   Total stars: ~100,000`);
        console.log(`   Effects: Nebula, HDR, Bloom, Film grain`);

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
    updateCosmicSkybox(elapsed);
    updateStarField(elapsed);
    updateNebula(elapsed);
    updateShootingStars(elapsed);

    // Update exposure based on camera position (auto-exposure simulation)
    updateAutoExposure(elapsed);

    // Render the scene
    scene.render();

    // Update performance stats
    updateStats();

    // Check FPS watchdog
    if (fpsWatchdog) fpsWatchdog();
}

/**
 * Update camera for cinematic orbital motion
 * Layered sine waves for organic Perlin-like drift
 * @param {number} elapsed - Elapsed time in seconds
 */
function updateCinematicCamera(elapsed) {
    // --- Orbital rotation: 3 layered sine waves for organic drift ---
    const baseAlpha = Math.PI * 0.25;
    const orbitDrift = elapsed * 0.015
        + Math.sin(elapsed * 0.023) * 0.04
        + Math.sin(elapsed * 0.011) * 0.025
        + Math.sin(elapsed * 0.037) * 0.015;
    camera.alpha = baseAlpha + orbitDrift;

    // --- Vertical drift: layered for smooth organic motion ---
    const baseBeta = Math.PI * 0.4;
    const verticalDrift = Math.sin(elapsed * 0.013) * 0.06
        + Math.sin(elapsed * 0.029) * 0.03
        + Math.sin(elapsed * 0.007) * 0.02;
    camera.beta = Math.max(0.3, Math.min(Math.PI - 0.3, baseBeta + verticalDrift));

    // --- Asymmetric breathing: cube creates longer hold at extremes ---
    const baseRadius = 65;
    const breathSin = Math.sin(elapsed * 0.02);
    const breathing = Math.pow(Math.abs(breathSin), 0.6) * Math.sign(breathSin) * 10;
    camera.radius = baseRadius + breathing;

    // --- Micro-motion: subtle film shake ---
    let targetX = Math.sin(elapsed * 2.3) * 0.003
        + Math.sin(elapsed * 5.7) * 0.001;
    let targetY = Math.sin(elapsed * 1.7) * 0.002
        + Math.sin(elapsed * 4.1) * 0.001;

    // --- Mouse parallax (desktop only) ---
    if (parallaxEnabled) {
        // Smooth lerp toward mouse position
        mouse.x += (mouse.targetX - mouse.x) * 0.02;
        mouse.y += (mouse.targetY - mouse.y) * 0.02;
        targetX += mouse.x * 1.5;
        targetY += -mouse.y * 1.0;
    }

    camera.target.x = targetX;
    camera.target.y = targetY;
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
    disposeShootingStars();
    disposeNebula();
    disposeStarField();
    disposeCosmicSkybox();

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
