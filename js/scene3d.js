// scene3d.js
// 3D Scene Setup and Management - Complete Enhanced Babylon.js Implementation with Beautiful Cosmic Stars

import { updateBlackHoleEffects, createEnhancedBlackHole } from './blackhole.js';
import { initCameraEffects, updateCameraEffects } from './camera-effects.js';

let engine, scene, camera, canvas;
export let stars = [];
export let focusOrbs = [];
let particleSystem;
export let galaxyCore = {};
export let planets = [];
export let comets = [];
export let spaceObjects = [];
// Dynamic Celestial Objects System
let activeCelestialObjects = [];
let celestialObjectTimers = [];
let ambientLight, pointLights = [];
let cameraTarget = new BABYLON.Vector3(0, 0, 0);
let cameraRotation = 0;
let time = 0;
let animationRunning = false;

export { scene, engine, camera };

// Check WebGL availability
function checkWebGLSupport() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
            console.error('WebGL not supported by browser');
            return false;
        }
        console.log('WebGL support confirmed');
        return true;
    } catch (e) {
        console.error('WebGL check failed:', e);
        return false;
    }
}

// Initialize Babylon.js 3D Scene
export function init3D() {
    console.log('init3D called');
    console.log('BABYLON available:', typeof BABYLON !== 'undefined');
    console.log('BABYLON version:', BABYLON ? BABYLON.Engine.Version : 'N/A');
    
    if (!window.BABYLON) {
        console.error('Babylon.js not loaded');
        return false;
    }

    if (!checkWebGLSupport()) {
        console.error('WebGL not supported');
        return false;
    }

    const container = document.getElementById('scene-container');
    if (!container) {
        console.error('Scene container not found');
        return false;
    }

    console.log('Scene container found:', container);
    console.log('Container dimensions:', container.offsetWidth, 'x', container.offsetHeight);

    try {
        // Create canvas element
        canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '1';
        container.appendChild(canvas);
        
        console.log('Canvas created and appended to container');

        // Initialize Babylon.js engine with proper settings
        console.log('Creating Babylon.js engine...');
        engine = new BABYLON.Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            antialias: true,
            alpha: false, // Important: set to false for proper rendering
            premultipliedAlpha: false,
            powerPreference: "high-performance"
        });
        
        console.log('Engine created successfully');

        // Create scene
        console.log('Creating scene...');
        scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
        
        console.log('Scene created with clear color:', scene.clearColor);
        
        // Clean up any residual objects from previous loads
        cleanupResidualObjects();
        
        // Enhanced fog for atmosphere
        scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        scene.fogColor = new BABYLON.Color3(0.02, 0.02, 0.06);
        scene.fogDensity = 0.0008;

        // Camera with better initial position
        console.log('Creating camera...');
        camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(40, 15, 40), scene);
        camera.setTarget(cameraTarget);
        
        // Set FOV properly for UniversalCamera (in radians)
        camera.fov = 1.0; // ~57 degrees
        camera.minZ = 0.1;
        camera.maxZ = 2000;
        
        // Smooth camera movements
        camera.inertia = 0.9;
        camera.angularSensibility = 2000;
        
        console.log('Camera created at position:', camera.position);

        // Lighting setup
        console.log('Setting up lighting...');
        setupLighting();

        // Post-processing
        console.log('Setting up post-processing...');
        setupPostProcessing();

        // Create galaxy elements
        console.log('Creating galaxy elements...');
        createGalaxyElements();

        // Initialize camera effects
        console.log('Initializing camera effects...');
        initCameraEffects(camera);

        // Handle window resize
        window.addEventListener('resize', onWindowResize);

        // Start animation loop
        console.log('Starting animation/render loop...');
        animate();
        
        console.log('✨ Babylon.js scene initialized successfully');
        return true;

    } catch (error) {
        console.error('Failed to initialize Babylon.js scene:', error);
        console.error('Error stack:', error.stack);
        if (container && canvas) {
            container.removeChild(canvas);
        }
        return false;
    }
}

// Enhanced lighting setup for minimalist space environment
function setupLighting() {
    // Subtle ambient light for minimal base illumination
    ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.2; // Reduced for darker space
    ambientLight.diffuse = new BABYLON.Color3(0.3, 0.3, 0.4);
    ambientLight.groundColor = new BABYLON.Color3(0.05, 0.05, 0.1);

    // Minimal point lights for subtle cosmic lighting focused on black hole
    const lightConfigs = [
        { color: new BABYLON.Color3(0.3, 0.3, 0.6), position: new BABYLON.Vector3(20, 8, 20), intensity: 0.4 },
        { color: new BABYLON.Color3(0.4, 0.3, 0.6), position: new BABYLON.Vector3(-20, 10, -20), intensity: 0.3 },
        { color: new BABYLON.Color3(0.1, 0.4, 0.3), position: new BABYLON.Vector3(0, 15, 0), intensity: 0.3 }
    ];

    lightConfigs.forEach((config, index) => {
        const light = new BABYLON.PointLight(`pointLight${index}`, config.position, scene);
        light.diffuse = config.color;
        light.specular = config.color;
        light.intensity = config.intensity;
        light.range = 150;
        
        // Subtle light animation for minimalist atmosphere
        scene.registerBeforeRender(() => {
            const time = performance.now() * 0.001;
            light.intensity = config.intensity + Math.sin(time + index) * 0.1; // Reduced variation
            
            // Very subtle light movement
            light.position.x = config.position.x + Math.sin(time * 0.3 + index) * 2;
            light.position.y = config.position.y + Math.cos(time * 0.2 + index) * 1;
        });
        
        pointLights.push(light);
    });
}

// Post-processing pipeline
function setupPostProcessing() {
    try {
        // Create default rendering pipeline
        const defaultPipeline = new BABYLON.DefaultRenderingPipeline(
            "defaultPipeline",
            true, // HDR
            scene,
            [camera]
        );

        // Enable and configure bloom
        defaultPipeline.bloomEnabled = true;
        defaultPipeline.bloomKernel = 64;
        defaultPipeline.bloomScale = 0.5;
        defaultPipeline.bloomWeight = 0.15;
        defaultPipeline.bloomThreshold = 1.0;

        // Enable FXAA
        defaultPipeline.fxaaEnabled = true;
        
        // Vignette effect
        defaultPipeline.vignetteEnabled = true;
        defaultPipeline.vignetteStretch = 0.5;
        defaultPipeline.vignetteColor = new BABYLON.Color4(0, 0, 0, 0);
        defaultPipeline.vignetteWeight = 1.5;
        
        console.log('Post-processing setup complete');
    } catch (error) {
        console.warn('Post-processing setup failed:', error);
        // Continue without post-processing
    }
}

// Create all galaxy elements
function createGalaxyElements() {
    console.log('Creating galaxy elements...');
    
    try {
        // Create enhanced cosmic starfield
        createEnhancedCosmicStarField();
        console.log('Enhanced cosmic star field creation completed');
        
        createEnhancedBlackHole();
        console.log('Black hole creation completed');
        
        // Initialize dynamic celestial objects
        createDynamicCelestialObjects();
        console.log('Dynamic celestial objects system initialized');
        
    } catch (error) {
        console.error('Error creating galaxy elements:', error);
        
        // Create minimal fallback scene - just a few tiny stars
        createFallbackTinyStars();
        console.log('Minimal fallback scene created');
    }
}

// // Enhanced Cosmic Starfield - Beautiful multi-layered stars
// function createEnhancedCosmicStarField() {
//     try {
//         if (!scene) {
//             console.warn('Scene not available for star field creation');
//             return;
//         }

//         console.log('✨ Creating enhanced cosmic starfield...');
        
//         // Create multiple star layers for depth and beauty
//         createPrimaryStarLayer();
//         createDistantStarLayer();
//         createBrightStarLayer();
//         createNebulaStarClusters();
//         createShootingStars();
        
//         console.log('🌌 Enhanced cosmic starfield complete with multiple layers');
        
//     } catch (error) {
//         console.error('Failed to create enhanced starfield:', error);
//         createFallbackTinyStars();
//     }
// }

// Enhanced Cosmic Starfield with Spiral Galaxies
function createEnhancedCosmicStarField() {
    try {
        if (!scene) {
            console.warn('Scene not available for star field creation');
            return;
        }

        console.log('✨ Creating enhanced cosmic starfield with spiral galaxies...');
        
        // Create multiple star layers for depth and beauty
        createMainCosmicStars();
        createBrightBeaconStars();
        createColorfulDistantStars();
        createStarDustField();
        
        // Create multiple spiral galaxies
        createBackgroundSpiralGalaxies();
        
        // Create meteors and comets
        createMeteorShower();
        createPassingComets();
        
        console.log('🌌 Enhanced cosmic starfield complete with spiral galaxies!');
        
    } catch (error) {
        console.error('Failed to create enhanced starfield:', error);
        createFallbackTinyStars();
    }
}

// Main cosmic stars - visible and beautiful like NASA photos
function createMainCosmicStars() {
    const starCount = 2500;
    const mainStars = new BABYLON.ParticleSystem("mainCosmicStars", starCount, scene);
    
    // Enhanced star texture with strong visibility
    mainStars.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
            <defs>
                <radialGradient id="starCore" cx="50%" cy="50%" r="30%">
                    <stop offset="0%" style="stop-color:white;stop-opacity:1" />
                    <stop offset="80%" style="stop-color:white;stop-opacity:0.9" />
                    <stop offset="100%" style="stop-color:white;stop-opacity:0.7" />
                </radialGradient>
                <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:white;stop-opacity:0.8" />
                    <stop offset="60%" style="stop-color:cyan;stop-opacity:0.4" />
                    <stop offset="100%" style="stop-color:blue;stop-opacity:0.1" />
                </radialGradient>
            </defs>
            <circle cx="24" cy="24" r="24" fill="url(#starGlow)" />
            <circle cx="24" cy="24" r="12" fill="url(#starCore)" />
            <circle cx="24" cy="24" r="4" fill="white" />
        </svg>
    `), scene);
    
    const emitter = BABYLON.MeshBuilder.CreateBox("mainEmitter", {size: 0.01}, scene);
    emitter.isVisible = false;
    mainStars.emitter = emitter;
    
    // Increased visibility settings
    mainStars.minSize = 1.5;  // Increased from 0.8
    mainStars.maxSize = 4.5;  // Increased from 3.5
    mainStars.minLifeTime = Number.MAX_VALUE;
    mainStars.maxLifeTime = Number.MAX_VALUE;
    mainStars.emitRate = 0;
    mainStars.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    mainStars.renderingGroupId = 0;
    
    // Brighter colors for better visibility
    mainStars.color1 = new BABYLON.Color4(1, 1, 1, 1);      // Full white
    mainStars.color2 = new BABYLON.Color4(0.9, 0.95, 1, 0.9); // Bright blue-white
    mainStars.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    
    // Custom update function to position particles immediately
    mainStars.updateFunction = function(particles) {
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            if (!particle) continue;
            
            // Only position particles that haven't been positioned yet
            if (!particle.userData || !particle.userData.initialized) {
                // Better distribution for visibility
                const distributionType = Math.random();
                let radius, theta, phi;
                
                if (distributionType < 0.7) {
                    // Main visible starfield (closer to camera)
                    radius = 120 + Math.random() * 300; // Much closer
                    theta = Math.random() * Math.PI * 2;
                    phi = Math.acos(2 * Math.random() - 1);
                } else {
                    // Background stars
                    radius = 400 + Math.random() * 200;
                    theta = Math.random() * Math.PI * 2;
                    phi = Math.acos(2 * Math.random() - 1);
                }
                
                particle.position.x = radius * Math.sin(phi) * Math.cos(theta);
                particle.position.y = radius * Math.sin(phi) * Math.sin(theta);
                particle.position.z = radius * Math.cos(phi);
                
                // NASA-like star classification with visible colors
                const stellarClass = Math.random();
                let starConfig;
                
                if (stellarClass < 0.15) {
                    // Blue giants (very visible)
                    starConfig = {
                        color: new BABYLON.Color4(0.7, 0.8, 1, 1),
                        size: 3 + Math.random() * 2,
                        twinkleSpeed: 0.02,
                        type: 'blue_giant'
                    };
                } else if (stellarClass < 0.35) {
                    // White stars (bright)
                    starConfig = {
                        color: new BABYLON.Color4(1, 1, 1, 0.95),
                        size: 2.5 + Math.random() * 1.5,
                        twinkleSpeed: 0.015,
                        type: 'white_star'
                    };
                } else if (stellarClass < 0.55) {
                    // Yellow stars (like our Sun)
                    starConfig = {
                        color: new BABYLON.Color4(1, 0.95, 0.7, 0.9),
                        size: 2 + Math.random() * 1.2,
                        twinkleSpeed: 0.012,
                        type: 'yellow_star'
                    };
                } else if (stellarClass < 0.75) {
                    // Orange stars
                    starConfig = {
                        color: new BABYLON.Color4(1, 0.8, 0.5, 0.85),
                        size: 1.8 + Math.random() * 1,
                        twinkleSpeed: 0.01,
                        type: 'orange_star'
                    };
                } else {
                    // Red stars (still visible)
                    starConfig = {
                        color: new BABYLON.Color4(1, 0.6, 0.4, 0.8),
                        size: 1.5 + Math.random() * 0.8,
                        twinkleSpeed: 0.008,
                        type: 'red_star'
                    };
                }
                
                particle.color = starConfig.color;
                particle.size = starConfig.size;
                
                particle.userData = {
                    baseSize: starConfig.size,
                    baseAlpha: starConfig.color.a,
                    twinkleSpeed: starConfig.twinkleSpeed,
                    twinklePhase: Math.random() * Math.PI * 2,
                    stellarType: starConfig.type,
                    originalPosition: particle.position.clone(),
                    brightness: 0.8 + Math.random() * 0.4,
                    initialized: true // Mark as initialized
                };
            }
        }
    };
    
    mainStars.userData = {
        layerType: 'main',
        rotationSpeed: 0.00002,
        driftSpeed: 0.00001
    };
    
    mainStars.start();
    mainStars.manualEmitCount = starCount;
    
    stars.push(mainStars);
}

// Bright beacon stars - the spectacular bright ones you see in NASA photos
function createBrightBeaconStars() {
    const starCount = 80;
    const beaconStars = new BABYLON.ParticleSystem("brightBeaconStars", starCount, scene);
    
    // Cross-shaped bright star texture (NASA telescope style)
    beaconStars.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
            <defs>
                <radialGradient id="beaconCore" cx="50%" cy="50%" r="20%">
                    <stop offset="0%" style="stop-color:white;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:white;stop-opacity:0.9" />
                </radialGradient>
                <linearGradient id="spike1" x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" style="stop-color:transparent" />
                    <stop offset="30%" style="stop-color:white;stop-opacity:0.7" />
                    <stop offset="50%" style="stop-color:white;stop-opacity:1" />
                    <stop offset="70%" style="stop-color:white;stop-opacity:0.7" />
                    <stop offset="100%" style="stop-color:transparent" />
                </linearGradient>
                <linearGradient id="spike2" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" style="stop-color:transparent" />
                    <stop offset="30%" style="stop-color:white;stop-opacity:0.7" />
                    <stop offset="50%" style="stop-color:white;stop-opacity:1" />
                    <stop offset="70%" style="stop-color:white;stop-opacity:0.7" />
                    <stop offset="100%" style="stop-color:transparent" />
                </linearGradient>
            </defs>
            <rect x="0" y="38" width="80" height="4" fill="url(#spike1)" />
            <rect x="38" y="0" width="4" height="80" fill="url(#spike2)" />
            <circle cx="40" cy="40" r="8" fill="url(#beaconCore)" />
            <circle cx="40" cy="40" r="3" fill="white" />
        </svg>
    `), scene);
    
    const emitter = BABYLON.MeshBuilder.CreateBox("beaconEmitter", {size: 0.01}, scene);
    emitter.isVisible = false;
    beaconStars.emitter = emitter;
    
    // Large, very visible sizes
    beaconStars.minSize = 4;
    beaconStars.maxSize = 8;
    beaconStars.minLifeTime = Number.MAX_VALUE;
    beaconStars.maxLifeTime = Number.MAX_VALUE;
    beaconStars.emitRate = 0;
    beaconStars.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    beaconStars.renderingGroupId = 0;
    
    // Maximum brightness
    beaconStars.color1 = new BABYLON.Color4(1, 1, 1, 1);
    beaconStars.color2 = new BABYLON.Color4(0.9, 0.95, 1, 1);
    
    // Custom update function for immediate positioning
    beaconStars.updateFunction = function(particles) {
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            if (!particle) continue;
            
            if (!particle.userData || !particle.userData.initialized) {
                // Strategic placement for maximum visibility
                const radius = 150 + Math.random() * 350;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                
                particle.position.x = radius * Math.sin(phi) * Math.cos(theta);
                particle.position.y = radius * Math.sin(phi) * Math.sin(theta);
                particle.position.z = radius * Math.cos(phi);
                
                // Bright star colors
                const brightColors = [
                    new BABYLON.Color4(1, 1, 1, 1),         // Pure white
                    new BABYLON.Color4(0.8, 0.9, 1, 1),     // Blue-white
                    new BABYLON.Color4(1, 0.95, 0.8, 1),    // Warm white
                    new BABYLON.Color4(0.9, 0.85, 1, 1),    // Purple-white
                    new BABYLON.Color4(1, 0.9, 0.7, 1)      // Golden white
                ];
                
                particle.color = brightColors[Math.floor(Math.random() * brightColors.length)];
                particle.size = 4 + Math.random() * 4;
                
                particle.userData = {
                    baseSize: particle.size,
                    baseAlpha: 1,
                    twinkleSpeed: 0.015 + Math.random() * 0.02,
                    twinklePhase: Math.random() * Math.PI * 2,
                    stellarType: 'beacon',
                    originalPosition: particle.position.clone(),
                    pulseIntensity: 0.3 + Math.random() * 0.4,
                    initialized: true
                };
            }
        }
    };
    
    beaconStars.userData = {
        layerType: 'beacon',
        rotationSpeed: 0.00001,
        breathingSpeed: 0.005
    };
    
    beaconStars.start();
    beaconStars.manualEmitCount = starCount;
    
    stars.push(beaconStars);
}

// Colorful distant stars - add cosmic beauty with colors
function createColorfulDistantStars() {
    const starCount = 3000;
    const colorStars = new BABYLON.ParticleSystem("colorfulStars", starCount, scene);
    
    colorStars.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <defs>
                <radialGradient id="colorStar" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:white;stop-opacity:1" />
                    <stop offset="70%" style="stop-color:white;stop-opacity:0.8" />
                    <stop offset="100%" style="stop-color:white;stop-opacity:0.3" />
                </radialGradient>
            </defs>
            <circle cx="12" cy="12" r="12" fill="url(#colorStar)" />
            <circle cx="12" cy="12" r="3" fill="white" />
        </svg>
    `), scene);
    
    const emitter = BABYLON.MeshBuilder.CreateBox("colorEmitter", {size: 0.01}, scene);
    emitter.isVisible = false;
    colorStars.emitter = emitter;
    
    colorStars.minSize = 0.8;
    colorStars.maxSize = 2.5;
    colorStars.minLifeTime = Number.MAX_VALUE;
    colorStars.maxLifeTime = Number.MAX_VALUE;
    colorStars.emitRate = 0;
    colorStars.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    colorStars.renderingGroupId = 0;
    
    colorStars.color1 = new BABYLON.Color4(1, 1, 1, 0.8);
    colorStars.color2 = new BABYLON.Color4(0.8, 0.9, 1, 0.6);
    
    // Custom update function
    colorStars.updateFunction = function(particles) {
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            if (!particle) continue;
            
            if (!particle.userData || !particle.userData.initialized) {
                // Distributed across larger area for depth
                const radius = 300 + Math.random() * 500;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                
                particle.position.x = radius * Math.sin(phi) * Math.cos(theta);
                particle.position.y = radius * Math.sin(phi) * Math.sin(theta);
                particle.position.z = radius * Math.cos(phi);
                
                // Beautiful cosmic colors
                const cosmicColors = [
                    new BABYLON.Color4(1, 0.9, 0.9, 0.8),    // Soft pink
                    new BABYLON.Color4(0.9, 0.9, 1, 0.8),    // Soft blue
                    new BABYLON.Color4(0.9, 1, 0.9, 0.8),    // Soft green
                    new BABYLON.Color4(1, 1, 0.9, 0.8),      // Soft yellow
                    new BABYLON.Color4(1, 0.95, 0.9, 0.8),   // Soft orange
                    new BABYLON.Color4(0.95, 0.9, 1, 0.8),   // Soft purple
                    new BABYLON.Color4(1, 1, 1, 0.8)         // Pure white
                ];
                
                particle.color = cosmicColors[Math.floor(Math.random() * cosmicColors.length)];
                particle.size = 0.8 + Math.random() * 1.7;
                
                particle.userData = {
                    baseSize: particle.size,
                    baseAlpha: particle.color.a,
                    twinkleSpeed: 0.005 + Math.random() * 0.01,
                    twinklePhase: Math.random() * Math.PI * 2,
                    stellarType: 'colorful',
                    originalPosition: particle.position.clone(),
                    initialized: true
                };
            }
        }
    };
    
    colorStars.userData = {
        layerType: 'colorful',
        rotationSpeed: 0.000005,
        driftSpeed: 0.000002
    };
    
    colorStars.start();
    colorStars.manualEmitCount = starCount;
    
    stars.push(colorStars);
}


// Star dust field - tiny background stars for depth
function createStarDustField() {
    const dustCount = 5000;
    const starDust = new BABYLON.ParticleSystem("starDust", dustCount, scene);
    
    starDust.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8">
            <circle cx="4" cy="4" r="4" fill="white" opacity="0.6" />
            <circle cx="4" cy="4" r="1" fill="white" />
        </svg>
    `), scene);
    
    const emitter = BABYLON.MeshBuilder.CreateBox("dustEmitter", {size: 0.01}, scene);
    emitter.isVisible = false;
    starDust.emitter = emitter;
    
    starDust.minSize = 0.3;
    starDust.maxSize = 1;
    starDust.minLifeTime = Number.MAX_VALUE;
    starDust.maxLifeTime = Number.MAX_VALUE;
    starDust.emitRate = 0;
    starDust.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    starDust.renderingGroupId = 0;
    
    starDust.color1 = new BABYLON.Color4(1, 1, 1, 0.6);
    starDust.color2 = new BABYLON.Color4(0.9, 0.9, 1, 0.4);
    
    // Custom update function
    starDust.updateFunction = function(particles) {
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            if (!particle) continue;
            
            if (!particle.userData || !particle.userData.initialized) {
                // Very distant uniform distribution
                const radius = 600 + Math.random() * 800;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                
                particle.position.x = radius * Math.sin(phi) * Math.cos(theta);
                particle.position.y = radius * Math.sin(phi) * Math.sin(theta);
                particle.position.z = radius * Math.cos(phi);
                
                particle.size = 0.3 + Math.random() * 0.7;
                particle.color = new BABYLON.Color4(
                    0.9 + Math.random() * 0.1,
                    0.9 + Math.random() * 0.1,
                    1,
                    0.4 + Math.random() * 0.3
                );
                
                particle.userData = {
                    baseSize: particle.size,
                    baseAlpha: particle.color.a,
                    twinkleSpeed: 0.002 + Math.random() * 0.005,
                    twinklePhase: Math.random() * Math.PI * 2,
                    stellarType: 'dust',
                    originalPosition: particle.position.clone(),
                    initialized: true
                };
            }
        }
    };
    
    starDust.userData = {
        layerType: 'dust',
        rotationSpeed: 0.000002
    };
    
    starDust.start();
    starDust.manualEmitCount = dustCount;
    
    stars.push(starDust);
}

// Create meteor shower
function createMeteorShower() {
    // Create meteors periodically
    const createMeteor = () => {
        const meteor = new BABYLON.ParticleSystem("meteor", 50, scene);
        
        // Meteor trail texture
        meteor.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="8" viewBox="0 0 32 8">
                <defs>
                    <linearGradient id="meteorGrad" x1="0%" y1="50%" x2="100%" y2="50%">
                        <stop offset="0%" style="stop-color:transparent" />
                        <stop offset="50%" style="stop-color:white;stop-opacity:0.5" />
                        <stop offset="80%" style="stop-color:yellow;stop-opacity:0.8" />
                        <stop offset="100%" style="stop-color:white;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect x="0" y="2" width="32" height="4" fill="url(#meteorGrad)" />
            </svg>
        `), scene);
        
        // Random start position
        const side = Math.floor(Math.random() * 4);
        let startPos, endPos;
        const distance = 600;
        
        switch(side) {
            case 0: // Top
                startPos = new BABYLON.Vector3((Math.random() - 0.5) * distance, distance/2, (Math.random() - 0.5) * distance);
                endPos = new BABYLON.Vector3((Math.random() - 0.5) * distance, -distance/2, (Math.random() - 0.5) * distance);
                break;
            case 1: // Right
                startPos = new BABYLON.Vector3(distance/2, (Math.random() - 0.5) * distance, (Math.random() - 0.5) * distance);
                endPos = new BABYLON.Vector3(-distance/2, (Math.random() - 0.5) * distance, (Math.random() - 0.5) * distance);
                break;
            case 2: // Bottom
                startPos = new BABYLON.Vector3((Math.random() - 0.5) * distance, -distance/2, (Math.random() - 0.5) * distance);
                endPos = new BABYLON.Vector3((Math.random() - 0.5) * distance, distance/2, (Math.random() - 0.5) * distance);
                break;
            case 3: // Back
                startPos = new BABYLON.Vector3((Math.random() - 0.5) * distance, (Math.random() - 0.5) * distance, distance/2);
                endPos = new BABYLON.Vector3((Math.random() - 0.5) * distance, (Math.random() - 0.5) * distance, -distance/2);
                break;
        }
        
        const emitter = BABYLON.MeshBuilder.CreateBox("meteorEmitter", {size: 0.1}, scene);
        emitter.position = startPos;
        emitter.isVisible = false;
        meteor.emitter = emitter;
        
        meteor.color1 = new BABYLON.Color4(1, 1, 0.8, 1);
        meteor.color2 = new BABYLON.Color4(1, 0.8, 0.4, 0.8);
        meteor.colorDead = new BABYLON.Color4(1, 0.5, 0, 0);
        meteor.minSize = 0.5;
        meteor.maxSize = 2;
        meteor.minLifeTime = 1;
        meteor.maxLifeTime = 2;
        meteor.emitRate = 100;
        meteor.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        meteor.renderingGroupId = 1;
        
        const direction = endPos.subtract(startPos).normalize();
        meteor.direction1 = direction.scale(20);
        meteor.direction2 = direction.scale(30);
        meteor.minEmitPower = 10;
        meteor.maxEmitPower = 15;
        
        meteor.start();
        
        // Animate meteor movement
        const duration = 2000 + Math.random() * 2000;
        const startTime = Date.now();
        
        const animateMeteor = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                meteor.stop();
                setTimeout(() => {
                    meteor.dispose();
                    emitter.dispose();
                }, 1000);
                return;
            }
            
            const currentPos = BABYLON.Vector3.Lerp(startPos, endPos, progress);
            emitter.position = currentPos;
            
            requestAnimationFrame(animateMeteor);
        };
        
        animateMeteor();
    };
    
    // Create meteors periodically
    setInterval(() => {
        if (Math.random() < 0.3) { // 30% chance
            createMeteor();
        }
    }, 3000); // Every 3 seconds
    
    // Create initial meteors
    for (let i = 0; i < 3; i++) {
        setTimeout(() => createMeteor(), Math.random() * 5000);
    }
}

// Create passing comets
function createPassingComets() {
    const createComet = () => {
        const cometGroup = new BABYLON.TransformNode("passingComet", scene);
        
        // Random trajectory
        const side = Math.floor(Math.random() * 4);
        const distance = 500;
        let startPos, endPos;
        
        // Create curved paths for more interesting movement
        switch(side) {
            case 0:
                startPos = new BABYLON.Vector3(-distance, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
                endPos = new BABYLON.Vector3(distance, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
                break;
            case 1:
                startPos = new BABYLON.Vector3((Math.random() - 0.5) * 200, distance, (Math.random() - 0.5) * 200);
                endPos = new BABYLON.Vector3((Math.random() - 0.5) * 200, -distance, (Math.random() - 0.5) * 200);
                break;
            case 2:
                startPos = new BABYLON.Vector3((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, -distance);
                endPos = new BABYLON.Vector3((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, distance);
                break;
            case 3:
                startPos = new BABYLON.Vector3(distance, distance, (Math.random() - 0.5) * 200);
                endPos = new BABYLON.Vector3(-distance, -distance, (Math.random() - 0.5) * 200);
                break;
        }
        
        cometGroup.position = startPos;
        
        // Comet head
        const head = BABYLON.MeshBuilder.CreateSphere("cometHead", {diameter: 1.5}, scene);
        const headMat = new BABYLON.StandardMaterial("cometHeadMat", scene);
        headMat.emissiveColor = new BABYLON.Color3(0.8, 0.9, 1);
        headMat.diffuseColor = new BABYLON.Color3(0.6, 0.7, 0.9);
        head.material = headMat;
        head.parent = cometGroup;
        head.renderingGroupId = 1;
        
        // Comet tail
        const tail = new BABYLON.ParticleSystem("cometTail", 500, scene);
        tail.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                <defs>
                    <radialGradient id="cometTailGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" style="stop-color:white;stop-opacity:0.8" />
                        <stop offset="40%" style="stop-color:cyan;stop-opacity:0.6" />
                        <stop offset="80%" style="stop-color:blue;stop-opacity:0.3" />
                        <stop offset="100%" style="stop-color:transparent" />
                    </radialGradient>
                </defs>
                <circle cx="16" cy="16" r="16" fill="url(#cometTailGrad)" />
            </svg>
        `), scene);
        
        tail.emitter = head;
        tail.color1 = new BABYLON.Color4(0.8, 0.9, 1, 0.8);
        tail.color2 = new BABYLON.Color4(0.4, 0.6, 1, 0.6);
        tail.colorDead = new BABYLON.Color4(0.2, 0.3, 0.6, 0);
        tail.minSize = 0.5;
        tail.maxSize = 3;
        tail.minLifeTime = 2;
        tail.maxLifeTime = 4;
        tail.emitRate = 150;
        tail.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        tail.renderingGroupId = 1;
        
        const direction = startPos.subtract(endPos).normalize();
        tail.direction1 = direction.scale(3);
        tail.direction2 = direction.scale(6);
        tail.minEmitPower = 2;
        tail.maxEmitPower = 4;
        
        tail.start();
        
        // Animate comet
        const duration = 15000 + Math.random() * 10000;
        const startTime = Date.now();
        
        const animateComet = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                tail.stop();
                setTimeout(() => {
                    tail.dispose();
                    cometGroup.dispose();
                }, 2000);
                return;
            }
            
            // Use bezier curve for smooth path
            const midPoint = BABYLON.Vector3.Lerp(startPos, endPos, 0.5);
            midPoint.y += 100; // Arc upward
            
            const p1 = BABYLON.Vector3.Lerp(startPos, midPoint, progress * 2);
            const p2 = BABYLON.Vector3.Lerp(midPoint, endPos, (progress - 0.5) * 2);
            const currentPos = progress < 0.5 ? p1 : p2;
            
            cometGroup.position = currentPos;
            
            // Rotate comet head
            head.rotation.x += 0.02;
            head.rotation.y += 0.01;
            
            requestAnimationFrame(animateComet);
        };
        
        animateComet();
    };
    
    // Create comets periodically
    setInterval(() => {
        if (Math.random() < 0.2) { // 20% chance
            createComet();
        }
    }, 10000); // Every 10 seconds
    
    // Create initial comet
    setTimeout(() => createComet(), 5000);
}

// Create background spiral galaxies
function createBackgroundSpiralGalaxies() {
    const galaxyCount = 5; // Create 5 spiral galaxies
    
    for (let g = 0; g < galaxyCount; g++) {
        createSpiralGalaxy(g);
    }
}

// Create a single spiral galaxy
function createSpiralGalaxy(index) {
    const galaxyGroup = new BABYLON.TransformNode(`spiralGalaxy_${index}`, scene);
    
    // Random position for each galaxy
    const distance = 400 + Math.random() * 600;
    const angle = (index / 5) * Math.PI * 2 + Math.random() * 0.5;
    const height = (Math.random() - 0.5) * 300;
    
    galaxyGroup.position = new BABYLON.Vector3(
        Math.cos(angle) * distance,
        height,
        Math.sin(angle) * distance
    );
    
    // Random rotation for variety
    galaxyGroup.rotation.x = Math.random() * Math.PI;
    galaxyGroup.rotation.y = Math.random() * Math.PI * 2;
    galaxyGroup.rotation.z = Math.random() * Math.PI;
    
    // Create spiral arms using particles
    const armCount = 3 + Math.floor(Math.random() * 2); // 3-4 arms
    const particlesPerArm = 800;
    
    const spiralSystem = new BABYLON.ParticleSystem(`spiral_${index}`, armCount * particlesPerArm, scene);
    
    // Star texture for galaxy
    spiralSystem.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
            <defs>
                <radialGradient id="galaxyStar" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:white;stop-opacity:1" />
                    <stop offset="60%" style="stop-color:white;stop-opacity:0.8" />
                    <stop offset="100%" style="stop-color:white;stop-opacity:0" />
                </radialGradient>
            </defs>
            <circle cx="8" cy="8" r="8" fill="url(#galaxyStar)" />
        </svg>
    `), scene);
    
    spiralSystem.emitter = galaxyGroup;
    spiralSystem.minSize = 0.5;
    spiralSystem.maxSize = 2.5;
    spiralSystem.minLifeTime = Number.MAX_VALUE;
    spiralSystem.maxLifeTime = Number.MAX_VALUE;
    spiralSystem.emitRate = 0;
    spiralSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    spiralSystem.renderingGroupId = 0;
    
    // Galaxy colors
    const galaxyColors = [
        [new BABYLON.Color4(0.8, 0.8, 1, 0.8), new BABYLON.Color4(0.6, 0.6, 1, 0.6)], // Blue-white
        [new BABYLON.Color4(1, 0.9, 0.8, 0.8), new BABYLON.Color4(1, 0.7, 0.5, 0.6)], // Yellow-orange
        [new BABYLON.Color4(0.9, 0.8, 1, 0.8), new BABYLON.Color4(0.7, 0.6, 0.9, 0.6)], // Purple-white
        [new BABYLON.Color4(1, 0.8, 0.8, 0.8), new BABYLON.Color4(0.9, 0.6, 0.6, 0.6)], // Red-white
        [new BABYLON.Color4(0.8, 1, 0.9, 0.8), new BABYLON.Color4(0.6, 0.9, 0.7, 0.6)]  // Green-white
    ];
    
    const colorPair = galaxyColors[index % galaxyColors.length];
    spiralSystem.color1 = colorPair[0];
    spiralSystem.color2 = colorPair[1];
    
    // Custom update function to position particles in spiral pattern
    spiralSystem.updateFunction = function(particles) {
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            if (!particle) continue;
            
            if (!particle.userData || !particle.userData.initialized) {
                // Calculate spiral position
                const armIndex = Math.floor(i / particlesPerArm);
                const particleInArm = i % particlesPerArm;
                const t = particleInArm / particlesPerArm; // 0 to 1 along the arm
                
                // Spiral parameters
                const baseAngle = (armIndex / armCount) * Math.PI * 2;
                const spiralTightness = 0.3; // How tight the spiral is
                const maxRadius = 80; // Maximum radius of the galaxy
                
                // Calculate spiral position
                const radius = t * maxRadius;
                const angle = baseAngle + t * Math.PI * 3 * spiralTightness; // Spiral outward
                
                // Add some randomness for natural look
                const randomRadius = radius + (Math.random() - 0.5) * 10;
                const randomAngle = angle + (Math.random() - 0.5) * 0.3;
                const height = (Math.random() - 0.5) * 5 * (1 - t); // Flatter at edges
                
                particle.position.x = Math.cos(randomAngle) * randomRadius;
                particle.position.z = Math.sin(randomAngle) * randomRadius;
                particle.position.y = height;
                
                // Size and brightness decrease with distance from center
                particle.size = (1 - t * 0.7) * (0.5 + Math.random() * 2);
                
                // Color variation
                const colorLerp = Math.random();
                particle.color = BABYLON.Color4.Lerp(colorPair[0], colorPair[1], colorLerp);
                particle.color.a *= (1 - t * 0.5); // Fade at edges
                
                particle.userData = {
                    initialized: true,
                    basePosition: particle.position.clone(),
                    rotationSpeed: 0.0001 + Math.random() * 0.0002
                };
            }
        }
    };
    
    spiralSystem.start();
    spiralSystem.manualEmitCount = armCount * particlesPerArm;
    
    // Add slow rotation to the galaxy
    scene.registerBeforeRender(() => {
        galaxyGroup.rotation.y += 0.0002;
    });
    
    // Add central bright core
    const coreSystem = new BABYLON.ParticleSystem(`galaxyCore_${index}`, 200, scene);
    coreSystem.particleTexture = spiralSystem.particleTexture;
    coreSystem.emitter = galaxyGroup;
    coreSystem.createSphereEmitter(5, 0);
    coreSystem.minSize = 1;
    coreSystem.maxSize = 3;
    coreSystem.minLifeTime = Number.MAX_VALUE;
    coreSystem.maxLifeTime = Number.MAX_VALUE;
    coreSystem.emitRate = 0;
    coreSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    coreSystem.renderingGroupId = 0;
    coreSystem.color1 = new BABYLON.Color4(1, 1, 1, 1);
    coreSystem.color2 = new BABYLON.Color4(0.9, 0.9, 1, 0.9);
    coreSystem.start();
    coreSystem.manualEmitCount = 200;
    
    stars.push(spiralSystem);
    stars.push(coreSystem);
}

// Dynamic Celestial Objects System
function createDynamicCelestialObjects() {
    console.log('Initializing dynamic celestial objects system...');
    
    // Create initial objects
    setTimeout(() => {
        if (Math.random() < 0.7) {
            // Create some initial cosmic objects
            createRandomCelestialObject();
        }
    }, 2000);
    
    // Schedule periodic spawning
    setInterval(() => {
        if (activeCelestialObjects.length < 15 && Math.random() < 0.3) {
            createRandomCelestialObject();
        }
    }, 8000);
}

function createRandomCelestialObject() {
    const objectTypes = ['comet', 'asteroid', 'nebula'];
    const type = objectTypes[Math.floor(Math.random() * objectTypes.length)];
    
    switch(type) {
        case 'comet':
            createDynamicComet();
            break;
        case 'asteroid':
            createDynamicAsteroid();
            break;
        case 'nebula':
            createDynamicNebula();
            break;
    }
}

function createDynamicComet() {
    const comet = BABYLON.MeshBuilder.CreateSphere("dynamicComet", {diameter: 0.8}, scene);
    const cometMat = new BABYLON.StandardMaterial("dynamicCometMat", scene);
    cometMat.emissiveColor = new BABYLON.Color3(0.6, 0.7, 0.9);
    comet.material = cometMat;
    
    // Random spawn position
    const angle = Math.random() * Math.PI * 2;
    const distance = 300 + Math.random() * 200;
    comet.position = new BABYLON.Vector3(
        Math.cos(angle) * distance,
        (Math.random() - 0.5) * 100,
        Math.sin(angle) * distance
    );
    
    activeCelestialObjects.push(comet);
    
    // Animate towards center
    const targetPos = new BABYLON.Vector3(0, 0, 0);
    const duration = 20000 + Math.random() * 10000;
    const startTime = Date.now();
    
    const animateComet = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
            // Remove comet
            const index = activeCelestialObjects.indexOf(comet);
            if (index > -1) activeCelestialObjects.splice(index, 1);
            comet.dispose();
            return;
        }
        
        // Move towards center with slight curve
        const currentPos = BABYLON.Vector3.Lerp(comet.position, targetPos, 0.001);
        comet.position = currentPos;
        
        requestAnimationFrame(animateComet);
    };
    
    animateComet();
}

function createDynamicAsteroid() {
    const asteroid = BABYLON.MeshBuilder.CreateSphere("dynamicAsteroid", {diameter: 0.4}, scene);
    const asteroidMat = new BABYLON.StandardMaterial("dynamicAsteroidMat", scene);
    asteroidMat.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.2);
    asteroid.material = asteroidMat;
    
    // Random orbit
    const radius = 100 + Math.random() * 150;
    const angle = Math.random() * Math.PI * 2;
    asteroid.position = new BABYLON.Vector3(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 50,
        Math.sin(angle) * radius
    );
    
    activeCelestialObjects.push(asteroid);
    
    // Remove after some time
    setTimeout(() => {
        const index = activeCelestialObjects.indexOf(asteroid);
        if (index > -1) activeCelestialObjects.splice(index, 1);
        asteroid.dispose();
    }, 30000 + Math.random() * 20000);
}

function createDynamicNebula() {
    const nebula = new BABYLON.ParticleSystem("dynamicNebula", 200, scene);
    
    const emitter = BABYLON.MeshBuilder.CreateBox("nebulaEmitter", {size: 0.1}, scene);
    emitter.isVisible = false;
    emitter.position = new BABYLON.Vector3(
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 400
    );
    
    nebula.emitter = emitter;
    nebula.createSphereEmitter(20, 0);
    
    nebula.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
            <defs>
                <radialGradient id="nebulaGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:rgba(100,150,255,0.6)" />
                    <stop offset="70%" style="stop-color:rgba(200,100,255,0.3)" />
                    <stop offset="100%" style="stop-color:transparent" />
                </radialGradient>
            </defs>
            <circle cx="16" cy="16" r="16" fill="url(#nebulaGrad)" />
        </svg>
    `), scene);
    
    nebula.color1 = new BABYLON.Color4(0.4, 0.6, 1, 0.6);
    nebula.color2 = new BABYLON.Color4(0.8, 0.4, 1, 0.4);
    nebula.minSize = 5;
    nebula.maxSize = 15;
    nebula.minLifeTime = 10;
    nebula.maxLifeTime = 20;
    nebula.emitRate = 20;
    nebula.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    
    nebula.start();
    activeCelestialObjects.push(nebula);
    
    // Remove after some time
    setTimeout(() => {
        const index = activeCelestialObjects.indexOf(nebula);
        if (index > -1) activeCelestialObjects.splice(index, 1);
        nebula.stop();
        setTimeout(() => {
            nebula.dispose();
            emitter.dispose();
        }, 5000);
    }, 15000 + Math.random() * 10000);
}

// Fallback tiny stars for minimal scenes
function createFallbackTinyStars() {
    try {
        console.log('Creating fallback tiny stars...');
        
        const starCount = 500;
        const fallbackStars = new BABYLON.ParticleSystem("fallbackStars", starCount, scene);
        
        fallbackStars.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="4" fill="white" opacity="0.8" />
            </svg>
        `), scene);
        
        const emitter = BABYLON.MeshBuilder.CreateBox("fallbackEmitter", {size: 0.01}, scene);
        emitter.isVisible = false;
        fallbackStars.emitter = emitter;
        
        fallbackStars.minSize = 0.5;
        fallbackStars.maxSize = 1.5;
        fallbackStars.minLifeTime = Number.MAX_VALUE;
        fallbackStars.maxLifeTime = Number.MAX_VALUE;
        fallbackStars.emitRate = 0;
        fallbackStars.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        fallbackStars.renderingGroupId = 0;
        
        fallbackStars.color1 = new BABYLON.Color4(1, 1, 1, 0.8);
        fallbackStars.color2 = new BABYLON.Color4(0.8, 0.9, 1, 0.6);
        
        // Simple positioning
        fallbackStars.updateFunction = function(particles) {
            for (let i = 0; i < particles.length; i++) {
                const particle = particles[i];
                if (!particle) continue;
                
                if (!particle.userData || !particle.userData.initialized) {
                    const radius = 200 + Math.random() * 300;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    
                    particle.position.x = radius * Math.sin(phi) * Math.cos(theta);
                    particle.position.y = radius * Math.sin(phi) * Math.sin(theta);
                    particle.position.z = radius * Math.cos(phi);
                    
                    particle.userData = { initialized: true };
                }
            }
        };
        
        fallbackStars.start();
        fallbackStars.manualEmitCount = starCount;
        
        stars.push(fallbackStars);
        console.log('Fallback stars created');
        
    } catch (error) {
        console.error('Fallback star creation failed:', error);
    }
}

// Clean up residual objects from previous loads
function cleanupResidualObjects() {
    if (!scene) return;
    
    try {
        // Dispose of any existing meshes
        const meshes = scene.meshes.slice();
        meshes.forEach(mesh => {
            if (mesh.name !== 'camera' && mesh.name !== 'canvas') {
                mesh.dispose();
            }
        });
        
        // Clear particle systems
        scene.particleSystems.forEach(ps => ps.dispose());
        
        // Clear arrays
        stars.length = 0;
        focusOrbs.length = 0;
        planets.length = 0;
        comets.length = 0;
        spaceObjects.length = 0;
        activeCelestialObjects.length = 0;
        pointLights.length = 0;
        
        console.log('Residual objects cleaned up');
    } catch (error) {
        console.warn('Cleanup warning:', error);
    }
}

// Animation loop
function animate() {
    if (!engine || !scene) return;
    
    try {
        animationRunning = true;
        time += 0.016;
        
        // Update camera effects
        if (typeof updateCameraEffects === 'function') {
            updateCameraEffects();
        }
        
        // Update black hole effects
        if (typeof updateBlackHoleEffects === 'function') {
            updateBlackHoleEffects();
        }
        
        // Camera orbit animation
        cameraRotation += 0.002;
        const radius = 45;
        camera.position.x = Math.cos(cameraRotation) * radius;
        camera.position.z = Math.sin(cameraRotation) * radius;
        camera.setTarget(cameraTarget);
        
        // Render the scene
        scene.render();
        
        if (animationRunning) {
            requestAnimationFrame(animate);
        }
    } catch (error) {
        console.error('Animation error:', error);
        animationRunning = false;
    }
}

// Handle window resize
function onWindowResize() {
    if (engine && canvas) {
        engine.resize();
    }
}

// Cleanup function
export function dispose() {
    if (engine) {
        engine.dispose();
    }
    animationRunning = false;
}

// Make animate function available globally for cleanup system
window.scene3dAnimate = animate;

// Export functions for use in external modules
window.createDynamicCelestialObjects = createDynamicCelestialObjects;

console.log('🌌 Scene3D module loaded with enhanced cosmic features!');