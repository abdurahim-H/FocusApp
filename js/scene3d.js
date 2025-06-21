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

function createEnhancedCosmicStarField() {
    try {
        if (!scene) {
            console.warn('Scene not available for star field creation');
            return;
        }

        console.log('✨ Creating NASA-quality cosmic starfield...');
        
        // Create multiple star layers for that spectacular NASA look
        createMainCosmicStars();
        createBrightBeaconStars();
        createColorfulDistantStars();
        createStarDustField();
        createShootingStars();
        
        console.log('🌌 NASA-quality cosmic starfield complete!');
        
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
    
    mainStars.start();
    mainStars.manualEmitCount = starCount;
    
    // Position stars closer and more visible
    setTimeout(() => {
        const particles = mainStars.particles;
        
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            if (!particle) continue;
            
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
                brightness: 0.8 + Math.random() * 0.4 // Consistent brightness
            };
        }
    }, 100);
    
    mainStars.userData = {
        layerType: 'main',
        rotationSpeed: 0.00002,
        driftSpeed: 0.00001
    };
    
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
    
    beaconStars.start();
    beaconStars.manualEmitCount = starCount;
    
    setTimeout(() => {
        const particles = beaconStars.particles;
        
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            if (!particle) continue;
            
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
                pulseIntensity: 0.3 + Math.random() * 0.4
            };
        }
    }, 200);
    
    beaconStars.userData = {
        layerType: 'beacon',
        rotationSpeed: 0.00001,
        breathingSpeed: 0.005
    };
    
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
    
    colorStars.start();
    colorStars.manualEmitCount = starCount;
    
    setTimeout(() => {
        const particles = colorStars.particles;
        
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            if (!particle) continue;
            
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
                originalPosition: particle.position.clone()
            };
        }
    }, 300);
    
    colorStars.userData = {
        layerType: 'colorful',
        rotationSpeed: 0.000005,
        driftSpeed: 0.000002
    };
    
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
    
    starDust.start();
    starDust.manualEmitCount = dustCount;
    
    setTimeout(() => {
        const particles = starDust.particles;
        
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            if (!particle) continue;
            
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
                originalPosition: particle.position.clone()
            };
        }
    }, 400);
    
    starDust.userData = {
        layerType: 'dust',
        rotationSpeed: 0.000002
    };
    
    stars.push(starDust);
}

// Dynamic Celestial Objects System
// Main function to create the celestial objects system
function createDynamicCelestialObjects() {
    console.log('🌌 Initializing dynamic celestial objects system...');
    
    // Start the celestial object spawning system
    startCelestialObjectSpawner();
    
    // Create some initial objects
    setTimeout(() => {
        spawnSpectacularComet();
    }, 5000);
    
    setTimeout(() => {
        spawnDistantGalaxy();
    }, 15000);
    
    setTimeout(() => {
        spawnNebulaPatch();
    }, 25000);
    
    console.log('✨ Dynamic celestial objects system active!');
}

// Spawning system for random celestial objects
function startCelestialObjectSpawner() {
    const spawnNewObject = () => {
        // Don't spawn too many at once
        if (activeCelestialObjects.length >= 4) {
            setTimeout(spawnNewObject, 10000 + Math.random() * 20000);
            return;
        }
        
        const objectTypes = [
            () => spawnSpectacularComet(),
            () => spawnDistantGalaxy(),
            () => spawnNebulaPatch(),
            () => spawnAsteroidCluster(),
            () => spawnPulsarBeam(),
            () => spawnCometTail()
        ];
        
        // Random celestial object
        const randomType = objectTypes[Math.floor(Math.random() * objectTypes.length)];
        randomType();
        
        // Schedule next spawn (30 seconds to 2 minutes)
        setTimeout(spawnNewObject, 30000 + Math.random() * 90000);
    };
    
    // Start spawning after initial delay
    setTimeout(spawnNewObject, 20000);
}

// 1. Spectacular Comets with Dynamic Tails
function spawnSpectacularComet() {
    console.log('☄️ Spawning spectacular comet...');
    
    const cometGroup = new BABYLON.TransformNode("spectacularComet", scene);
    
    // Random spawn position at edge of view
    const spawnSide = Math.floor(Math.random() * 4);
    const distance = 400;
    let startPos, endPos, direction;
    
    switch(spawnSide) {
        case 0: // From top-left to bottom-right
            startPos = new BABYLON.Vector3(-distance, distance, (Math.random() - 0.5) * distance);
            endPos = new BABYLON.Vector3(distance, -distance, (Math.random() - 0.5) * distance);
            break;
        case 1: // From top-right to bottom-left
            startPos = new BABYLON.Vector3(distance, distance, (Math.random() - 0.5) * distance);
            endPos = new BABYLON.Vector3(-distance, -distance, (Math.random() - 0.5) * distance);
            break;
        case 2: // From left to right
            startPos = new BABYLON.Vector3(-distance, (Math.random() - 0.5) * distance, (Math.random() - 0.5) * distance);
            endPos = new BABYLON.Vector3(distance, (Math.random() - 0.5) * distance, (Math.random() - 0.5) * distance);
            break;
        case 3: // From far to near
            startPos = new BABYLON.Vector3((Math.random() - 0.5) * distance, (Math.random() - 0.5) * distance, distance);
            endPos = new BABYLON.Vector3((Math.random() - 0.5) * distance, (Math.random() - 0.5) * distance, -distance);
            break;
    }
    
    cometGroup.position = startPos;
    direction = endPos.subtract(startPos).normalize();
    
    // Create comet nucleus
    const nucleus = BABYLON.MeshBuilder.CreateSphere("cometNucleus", {diameter: 2}, scene);
    const nucleusMat = new BABYLON.StandardMaterial("nucleusMat", scene);
    nucleusMat.emissiveColor = new BABYLON.Color3(0.9, 0.7, 0.4);
    nucleusMat.diffuseColor = new BABYLON.Color3(0.7, 0.5, 0.3);
    nucleus.material = nucleusMat;
    nucleus.parent = cometGroup;
    nucleus.renderingGroupId = 1;
    
    // Create spectacular tail
    const cometTail = new BABYLON.ParticleSystem("cometTail", 800, scene);
    cometTail.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
            <defs>
                <radialGradient id="tailGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:white;stop-opacity:0.9" />
                    <stop offset="40%" style="stop-color:cyan;stop-opacity:0.7" />
                    <stop offset="80%" style="stop-color:blue;stop-opacity:0.4" />
                    <stop offset="100%" style="stop-color:purple;stop-opacity:0" />
                </radialGradient>
            </defs>
            <circle cx="16" cy="16" r="16" fill="url(#tailGrad)" />
        </svg>
    `), scene);
    
    cometTail.emitter = nucleus;
    cometTail.color1 = new BABYLON.Color4(1, 0.8, 0.4, 0.9);
    cometTail.color2 = new BABYLON.Color4(0.4, 0.7, 1, 0.7);
    cometTail.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    cometTail.minSize = 1;
    cometTail.maxSize = 4;
    cometTail.minLifeTime = 3;
    cometTail.maxLifeTime = 6;
    cometTail.emitRate = 200;
    cometTail.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    cometTail.renderingGroupId = 1;
    
    // Tail direction opposite to movement
    cometTail.direction1 = direction.scale(-5);
    cometTail.direction2 = direction.scale(-8);
    cometTail.minEmitPower = 3;
    cometTail.maxEmitPower = 6;
    
    cometTail.start();
    
    // Animation data
    const cometData = {
        group: cometGroup,
        startPos: startPos,
        endPos: endPos,
        direction: direction,
        speed: 0.8 + Math.random() * 0.4, // Variable speed
        startTime: Date.now(),
        duration: 15000 + Math.random() * 10000, // 15-25 seconds
        tail: cometTail,
        nucleus: nucleus,
        type: 'comet'
    };
    
    activeCelestialObjects.push(cometData);
}

// 2. Distant Galaxies Drifting By
function spawnDistantGalaxy() {
    console.log('🌌 Spawning distant galaxy...');
    
    const galaxyGroup = new BABYLON.TransformNode("distantGalaxy", scene);
    
    // Position at edge of view
    const angle = Math.random() * Math.PI * 2;
    const distance = 500 + Math.random() * 200;
    const startPos = new BABYLON.Vector3(
        Math.cos(angle) * distance,
        (Math.random() - 0.5) * 200,
        Math.sin(angle) * distance
    );
    
    galaxyGroup.position = startPos;
    
    // Create galaxy core
    const galaxyCore = BABYLON.MeshBuilder.CreateSphere("galaxyCore", {diameter: 15}, scene);
    const coreMat = new BABYLON.StandardMaterial("galaxyCoreMat", scene);
    coreMat.emissiveColor = new BABYLON.Color3(0.8, 0.6, 1);
    coreMat.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.6);
    coreMat.alpha = 0.8;
    galaxyCore.material = coreMat;
    galaxyCore.parent = galaxyGroup;
    galaxyCore.renderingGroupId = 1;
    
    // Create galaxy spiral arms with particles
    const spiralArms = new BABYLON.ParticleSystem("galaxySpiral", 1000, scene);
    spiralArms.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
            <defs>
                <radialGradient id="armGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:white;stop-opacity:0.8" />
                    <stop offset="60%" style="stop-color:purple;stop-opacity:0.5" />
                    <stop offset="100%" style="stop-color:transparent" />
                </radialGradient>
            </defs>
            <circle cx="8" cy="8" r="8" fill="url(#armGrad)" />
        </svg>
    `), scene);
    
    spiralArms.emitter = galaxyCore;
    spiralArms.createSphereEmitter(25, 0);
    spiralArms.color1 = new BABYLON.Color4(0.7, 0.5, 1, 0.7);
    spiralArms.color2 = new BABYLON.Color4(0.5, 0.7, 1, 0.5);
    spiralArms.minSize = 0.8;
    spiralArms.maxSize = 2.5;
    spiralArms.minLifeTime = Number.MAX_VALUE;
    spiralArms.maxLifeTime = Number.MAX_VALUE;
    spiralArms.emitRate = 0;
    spiralArms.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    spiralArms.renderingGroupId = 1;
    spiralArms.start();
    spiralArms.manualEmitCount = 1000;
    
    // Create movement direction (slow drift)
    const driftDirection = new BABYLON.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.2
    );
    
    const galaxyData = {
        group: galaxyGroup,
        core: galaxyCore,
        spiralArms: spiralArms,
        driftDirection: driftDirection,
        rotationSpeed: 0.005 + Math.random() * 0.01,
        startTime: Date.now(),
        duration: 60000 + Math.random() * 30000, // 1-1.5 minutes
        type: 'galaxy'
    };
    
    activeCelestialObjects.push(galaxyData);
}

// 3. Colorful Nebula Patches
function spawnNebulaPatch() {
    console.log('🌈 Spawning nebula patch...');
    
    const nebulaGroup = new BABYLON.TransformNode("nebulaPatch", scene);
    
    // Random position
    const distance = 300 + Math.random() * 300;
    const angle = Math.random() * Math.PI * 2;
    const height = (Math.random() - 0.5) * 200;
    
    nebulaGroup.position = new BABYLON.Vector3(
        Math.cos(angle) * distance,
        height,
        Math.sin(angle) * distance
    );
    
    // Create nebula particle system
    const nebula = new BABYLON.ParticleSystem("nebulaGas", 1500, scene);
    nebula.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
            <defs>
                <radialGradient id="nebulaGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:white;stop-opacity:0.6" />
                    <stop offset="40%" style="stop-color:cyan;stop-opacity:0.4" />
                    <stop offset="80%" style="stop-color:purple;stop-opacity:0.2" />
                    <stop offset="100%" style="stop-color:transparent" />
                </radialGradient>
            </defs>
            <circle cx="32" cy="32" r="32" fill="url(#nebulaGrad)" />
        </svg>
    `), scene);
    
    nebula.emitter = nebulaGroup;
    nebula.createSphereEmitter(40, 0);
    
    // Random nebula colors
    const nebulaTypes = [
        [new BABYLON.Color4(1, 0.4, 0.6, 0.6), new BABYLON.Color4(0.8, 0.2, 0.4, 0.4)], // Red emission
        [new BABYLON.Color4(0.4, 0.6, 1, 0.6), new BABYLON.Color4(0.2, 0.4, 0.8, 0.4)], // Blue reflection
        [new BABYLON.Color4(0.6, 1, 0.4, 0.6), new BABYLON.Color4(0.4, 0.8, 0.2, 0.4)], // Green planetary
        [new BABYLON.Color4(1, 0.8, 0.4, 0.6), new BABYLON.Color4(0.8, 0.6, 0.2, 0.4)], // Orange
        [new BABYLON.Color4(0.8, 0.4, 1, 0.6), new BABYLON.Color4(0.6, 0.2, 0.8, 0.4)]  // Purple
    ];
    
    const colorPair = nebulaTypes[Math.floor(Math.random() * nebulaTypes.length)];
    nebula.color1 = colorPair[0];
    nebula.color2 = colorPair[1];
    nebula.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    
    nebula.minSize = 3;
    nebula.maxSize = 8;
    nebula.minLifeTime = Number.MAX_VALUE;
    nebula.maxLifeTime = Number.MAX_VALUE;
    nebula.emitRate = 0;
    nebula.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    nebula.renderingGroupId = 1;
    nebula.start();
    nebula.manualEmitCount = 1500;
    
    const nebulaData = {
        group: nebulaGroup,
        nebula: nebula,
        breathingSpeed: 0.002 + Math.random() * 0.003,
        driftSpeed: 0.1 + Math.random() * 0.2,
        startTime: Date.now(),
        duration: 45000 + Math.random() * 30000, // 45-75 seconds
        type: 'nebula'
    };
    
    activeCelestialObjects.push(nebulaData);
}

// 4. Asteroid Clusters
function spawnAsteroidCluster() {
    console.log('🪨 Spawning asteroid cluster...');
    
    const clusterGroup = new BABYLON.TransformNode("asteroidCluster", scene);
    
    // Spawn from edge, move across view
    const side = Math.floor(Math.random() * 4);
    const distance = 400;
    let startPos, endPos;
    
    switch(side) {
        case 0: // Left to right
            startPos = new BABYLON.Vector3(-distance, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
            endPos = new BABYLON.Vector3(distance, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
            break;
        case 1: // Right to left
            startPos = new BABYLON.Vector3(distance, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
            endPos = new BABYLON.Vector3(-distance, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
            break;
        case 2: // Top to bottom
            startPos = new BABYLON.Vector3((Math.random() - 0.5) * 200, distance, (Math.random() - 0.5) * 200);
            endPos = new BABYLON.Vector3((Math.random() - 0.5) * 200, -distance, (Math.random() - 0.5) * 200);
            break;
        case 3: // Far to near
            startPos = new BABYLON.Vector3((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, distance);
            endPos = new BABYLON.Vector3((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, -distance);
            break;
    }
    
    clusterGroup.position = startPos;
    
    // Create multiple asteroids
    const asteroids = [];
    const asteroidCount = 8 + Math.floor(Math.random() * 12);
    
    for (let i = 0; i < asteroidCount; i++) {
        const asteroid = BABYLON.MeshBuilder.CreateSphere(`asteroid_${i}`, {
            diameter: 0.5 + Math.random() * 2,
            segments: 6 + Math.floor(Math.random() * 6)
        }, scene);
        
        // Deform for irregular shape
        const positions = asteroid.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        for (let j = 0; j < positions.length; j += 3) {
            positions[j] += (Math.random() - 0.5) * 0.4;
            positions[j + 1] += (Math.random() - 0.5) * 0.4;
            positions[j + 2] += (Math.random() - 0.5) * 0.4;
        }
        asteroid.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
        asteroid.createNormals(false);
        
        // Material
        const asteroidMat = new BABYLON.StandardMaterial(`asteroidMat_${i}`, scene);
        asteroidMat.diffuseColor = new BABYLON.Color3(0.6, 0.5, 0.4);
        asteroidMat.emissiveColor = new BABYLON.Color3(0.1, 0.08, 0.06);
        asteroid.material = asteroidMat;
        asteroid.parent = clusterGroup;
        asteroid.renderingGroupId = 1;
        
        // Position within cluster
        asteroid.position = new BABYLON.Vector3(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20
        );
        
        asteroids.push({
            mesh: asteroid,
            rotationSpeed: new BABYLON.Vector3(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02
            )
        });
    }
    
    const clusterData = {
        group: clusterGroup,
        asteroids: asteroids,
        startPos: startPos,
        endPos: endPos,
        direction: endPos.subtract(startPos).normalize(),
        speed: 0.3 + Math.random() * 0.3,
        startTime: Date.now(),
        duration: 20000 + Math.random() * 15000, // 20-35 seconds
        type: 'asteroids'
    };
    
    activeCelestialObjects.push(clusterData);
}

// 5. Pulsar Beam Effects
function spawnPulsarBeam() {
    console.log('💫 Spawning pulsar beam...');
    
    const pulsarGroup = new BABYLON.TransformNode("pulsar", scene);
    
    // Position randomly in space
    const distance = 250 + Math.random() * 200;
    const angle = Math.random() * Math.PI * 2;
    const height = (Math.random() - 0.5) * 150;
    
    pulsarGroup.position = new BABYLON.Vector3(
        Math.cos(angle) * distance,
        height,
        Math.sin(angle) * distance
    );
    
    // Create pulsar core
    const pulsarCore = BABYLON.MeshBuilder.CreateSphere("pulsarCore", {diameter: 3}, scene);
    const coreMat = new BABYLON.StandardMaterial("pulsarCoreMat", scene);
    coreMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    pulsarCore.material = coreMat;
    pulsarCore.parent = pulsarGroup;
    pulsarCore.renderingGroupId = 1;
    
    // Create rotating beam
    const beam = BABYLON.MeshBuilder.CreateCylinder("pulsarBeam", {
        height: 500,
        diameterTop: 0.5,
        diameterBottom: 8,
        tessellation: 8
    }, scene);
    
    const beamMat = new BABYLON.StandardMaterial("beamMat", scene);
    beamMat.emissiveColor = new BABYLON.Color3(0.8, 0.9, 1);
    beamMat.alpha = 0.3;
    beamMat.backFaceCulling = false;
    beam.material = beamMat;
    beam.parent = pulsarGroup;
    beam.renderingGroupId = 1;
    beam.position.y = 250;
    
    const pulsarData = {
        group: pulsarGroup,
        core: pulsarCore,
        beam: beam,
        rotationSpeed: 0.05 + Math.random() * 0.1,
        pulseSpeed: 2 + Math.random() * 3,
        startTime: Date.now(),
        duration: 30000 + Math.random() * 20000, // 30-50 seconds
        type: 'pulsar'
    };
    
    activeCelestialObjects.push(pulsarData);
}

// 6. Beautiful Comet Tails (just trails)
function spawnCometTail() {
    console.log('✨ Spawning comet tail...');
    
    // Create a beautiful particle trail moving across the sky
    const cometTrail = new BABYLON.ParticleSystem("cometTrail", 600, scene);
    
    cometTrail.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <defs>
                <radialGradient id="trailGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:white;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:cyan;stop-opacity:0.8" />
                    <stop offset="100%" style="stop-color:blue;stop-opacity:0" />
                </radialGradient>
            </defs>
            <circle cx="12" cy="12" r="12" fill="url(#trailGrad)" />
        </svg>
    `), scene);
    
    // Moving emitter
    const emitter = BABYLON.MeshBuilder.CreateBox("trailEmitter", {size: 0.1}, scene);
    emitter.isVisible = false;
    
    // Random path
    const distance = 400;
    const startPos = new BABYLON.Vector3(
        (Math.random() - 0.5) * distance,
        (Math.random() - 0.5) * distance,
        distance
    );
    const endPos = new BABYLON.Vector3(
        (Math.random() - 0.5) * distance,
        (Math.random() - 0.5) * distance,
        -distance
    );
    
    emitter.position = startPos;
    cometTrail.emitter = emitter;
    
    const trailColors = [
        [new BABYLON.Color4(1, 0.8, 0.4, 0.9), new BABYLON.Color4(1, 0.4, 0.2, 0.7)], // Orange
        [new BABYLON.Color4(0.4, 0.8, 1, 0.9), new BABYLON.Color4(0.2, 0.6, 1, 0.7)], // Blue
        [new BABYLON.Color4(0.8, 0.4, 1, 0.9), new BABYLON.Color4(0.6, 0.2, 1, 0.7)], // Purple
        [new BABYLON.Color4(0.4, 1, 0.6, 0.9), new BABYLON.Color4(0.2, 0.8, 0.4, 0.7)]  // Green
    ];
    
    const colorPair = trailColors[Math.floor(Math.random() * trailColors.length)];
    cometTrail.color1 = colorPair[0];
    cometTrail.color2 = colorPair[1];
    cometTrail.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    
    cometTrail.minSize = 1;
    cometTrail.maxSize = 3;
    cometTrail.minLifeTime = 4;
    cometTrail.maxLifeTime = 8;
    cometTrail.emitRate = 150;
    cometTrail.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    cometTrail.renderingGroupId = 1;
    cometTrail.start();
    
    const trailData = {
        emitter: emitter,
        trail: cometTrail,
        startPos: startPos,
        endPos: endPos,
        direction: endPos.subtract(startPos).normalize(),
        speed: 1.2 + Math.random() * 0.8,
        startTime: Date.now(),
        duration: 12000 + Math.random() * 8000, // 12-20 seconds
        type: 'trail'
    };
    
    activeCelestialObjects.push(trailData);
}

// Update function for all celestial objects
function updateCelestialObjects() {
    const currentTime = Date.now();
    
    // Update each celestial object
    for (let i = activeCelestialObjects.length - 1; i >= 0; i--) {
        const obj = activeCelestialObjects[i];
        const elapsed = currentTime - obj.startTime;
        const progress = elapsed / obj.duration;
        
        // Remove expired objects
        if (progress >= 1) {
            disposeCelestialObject(obj);
            activeCelestialObjects.splice(i, 1);
            continue;
        }
        
        // Update based on type
        switch (obj.type) {
            case 'comet':
                updateComet(obj, progress);
                break;
            case 'galaxy':
                updateGalaxy(obj, progress);
                break;
            case 'nebula':
                updateNebula(obj, progress);
                break;
            case 'asteroids':
                updateAsteroids(obj, progress);
                break;
            case 'pulsar':
                updatePulsar(obj, progress);
                break;
            case 'trail':
                updateTrail(obj, progress);
                break;
        }
    }
}

// Update functions for each object type
function updateComet(obj, progress) {
    // Move comet
    const currentPos = BABYLON.Vector3.Lerp(obj.startPos, obj.endPos, progress);
    obj.group.position = currentPos;
    
    // Rotate nucleus
    obj.nucleus.rotation.x += 0.02;
    obj.nucleus.rotation.y += 0.015;
    
    // Fade out near end
    if (progress > 0.8) {
        const fadeProgress = (progress - 0.8) / 0.2;
        obj.tail.color1.a = (1 - fadeProgress) * 0.9;
        obj.tail.color2.a = (1 - fadeProgress) * 0.7;
    }
}

function updateGalaxy(obj, progress) {
    // Slow rotation
    obj.group.rotation.y += obj.rotationSpeed;
    obj.group.rotation.z += obj.rotationSpeed * 0.3;
    
    // Gentle drift
    obj.group.position = obj.group.position.add(obj.driftDirection);
    
    // Breathing effect
    const breathe = Math.sin(Date.now() * 0.001) * 0.1 + 1;
    obj.core.scaling.setAll(breathe);
}

function updateNebula(obj, progress) {
    // Breathing effect
    const breathe = Math.sin(Date.now() * obj.breathingSpeed) * 0.2 + 1;
    obj.group.scaling.setAll(breathe);
    
    // Slow drift
    obj.group.position.y += Math.sin(Date.now() * 0.001) * obj.driftSpeed;
    obj.group.rotation.y += 0.001;
}

function updateAsteroids(obj, progress) {
    // Move cluster
    const currentPos = BABYLON.Vector3.Lerp(obj.startPos, obj.endPos, progress);
    obj.group.position = currentPos;
    
    // Rotate individual asteroids
    obj.asteroids.forEach(asteroid => {
        asteroid.mesh.rotation.x += asteroid.rotationSpeed.x;
        asteroid.mesh.rotation.y += asteroid.rotationSpeed.y;
        asteroid.mesh.rotation.z += asteroid.rotationSpeed.z;
    });
    
    // Gentle cluster rotation
    obj.group.rotation.y += 0.005;
}

function updatePulsar(obj, progress) {
    // Rotate beam
    obj.beam.rotation.y += obj.rotationSpeed;
    
    // Pulsing core
    const pulse = Math.sin(Date.now() * 0.001 * obj.pulseSpeed) * 0.3 + 1;
    obj.core.scaling.setAll(pulse);
    
    // Beam intensity pulsing
    const beamPulse = Math.sin(Date.now() * 0.001 * obj.pulseSpeed * 2) * 0.2 + 0.3;
    obj.beam.material.alpha = beamPulse;
}

function updateTrail(obj, progress) {
    // Move emitter
    const currentPos = BABYLON.Vector3.Lerp(obj.startPos, obj.endPos, progress);
    obj.emitter.position = currentPos;
    
    // Fade out near end
    if (progress > 0.7) {
        const fadeProgress = (progress - 0.7) / 0.3;
        obj.trail.color1.a = (1 - fadeProgress) * 0.9;
        obj.trail.color2.a = (1 - fadeProgress) * 0.7;
    }
}

// Cleanup function for celestial objects
function disposeCelestialObject(obj) {
    try {
        switch (obj.type) {
            case 'comet':
                if (obj.tail) obj.tail.dispose();
                if (obj.group) obj.group.dispose();
                break;
            case 'galaxy':
                if (obj.spiralArms) obj.spiralArms.dispose();
                if (obj.group) obj.group.dispose();
                break;
            case 'nebula':
                if (obj.nebula) obj.nebula.dispose();
                if (obj.group) obj.group.dispose();
                break;
            case 'asteroids':
                if (obj.group) obj.group.dispose();
                break;
            case 'pulsar':
                if (obj.group) obj.group.dispose();
                break;
            case 'trail':
                if (obj.trail) obj.trail.dispose();
                if (obj.emitter) obj.emitter.dispose();
                break;
        }
    } catch (error) {
        console.warn('Error disposing celestial object:', error);
    }
}

// Enhanced star animation for better visibility
function updateEnhancedStarAnimations() {
    if (stars.length === 0) return;
    
    const currentTime = performance.now() * 0.001;
    
    stars.forEach((starField, index) => {
        if (!starField || typeof starField !== 'object') return;
        if (starField.isDisposed && starField.isDisposed()) return;
        
        try {
            if (starField instanceof BABYLON.ParticleSystem) {
                const userData = starField.userData;
                const particles = starField.particles;
                
                if (!userData || !particles) return;
                
                // Different animation behaviors per layer type
                switch (userData.layerType) {
                    case 'main':
                        animateMainStars(particles, currentTime, userData);
                        break;
                    case 'beacon':
                        animateBeaconStars(particles, currentTime, userData);
                        break;
                    case 'colorful':
                        animateColorfulStars(particles, currentTime, userData);
                        break;
                    case 'dust':
                        animateDustStars(particles, currentTime, userData);
                        break;
                }
                
                // Gentle rotation
                if (starField.emitter && userData.rotationSpeed) {
                    starField.emitter.rotation.y += userData.rotationSpeed;
                }
            }
        } catch (animationError) {
            console.warn('Enhanced star animation error:', animationError);
        }
    });
}

// Main stars animation - visible and steady
function animateMainStars(particles, currentTime, userData) {
    particles.forEach((particle, particleIndex) => {
        if (!particle || !particle.userData) return;
        
        const data = particle.userData;
        
        // Gentle, visible twinkling
        const twinkle = Math.sin(currentTime * data.twinkleSpeed + data.twinklePhase) * 0.2 + 0.9;
        particle.size = data.baseSize * twinkle;
        particle.color.a = Math.max(data.baseAlpha * twinkle, data.baseAlpha * 0.7); // Never too dim
    });
}

// Beacon stars animation - bright and pulsing
function animateBeaconStars(particles, currentTime, userData) {
    particles.forEach((particle, particleIndex) => {
        if (!particle || !particle.userData) return;
        
        const data = particle.userData;
        
        // Strong pulsing for beacon stars
        const pulse = Math.sin(currentTime * data.twinkleSpeed + data.twinklePhase) * data.pulseIntensity + 0.8;
        const breathe = Math.sin(currentTime * userData.breathingSpeed) * 0.1 + 1;
        
        particle.size = data.baseSize * pulse * breathe;
        particle.color.a = Math.max(data.baseAlpha * pulse, 0.8); // Always bright
    });
}

// Colorful stars animation - gentle color shifting
function animateColorfulStars(particles, currentTime, userData) {
    particles.forEach((particle, particleIndex) => {
        if (!particle || !particle.userData) return;
        
        const data = particle.userData;
        
        // Subtle twinkling
        const twinkle = Math.sin(currentTime * data.twinkleSpeed + data.twinklePhase) * 0.15 + 0.85;
        particle.size = data.baseSize * twinkle;
        particle.color.a = Math.max(data.baseAlpha * twinkle, data.baseAlpha * 0.6);
    });
}

// Dust stars animation - very subtle
function animateDustStars(particles, currentTime, userData) {
    particles.forEach((particle, particleIndex) => {
        if (!particle || !particle.userData) return;
        
        const data = particle.userData;
        
        // Very gentle twinkling
        const twinkle = Math.sin(currentTime * data.twinkleSpeed + data.twinklePhase) * 0.1 + 0.9;
        particle.size = data.baseSize * twinkle;
        particle.color.a = Math.max(data.baseAlpha * twinkle, data.baseAlpha * 0.8);
    });
}



// Layer 5: Shooting stars
function createShootingStars() {
    const meteorCount = 3;
    
    for (let m = 0; m < meteorCount; m++) {
        setTimeout(() => {
            createSingleShootingStar();
        }, Math.random() * 10000); // Random initial delay
    }
    
    // Create new shooting stars periodically
    setInterval(() => {
        if (Math.random() < 0.3) { // 30% chance every interval
            createSingleShootingStar();
        }
    }, 15000); // Every 15 seconds
}

function createSingleShootingStar() {
    const shootingStar = new BABYLON.ParticleSystem("shootingStar", 100, scene);
    
    shootingStar.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="8" viewBox="0 0 32 8">
            <defs>
                <linearGradient id="meteorTrail" x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" style="stop-color:transparent" />
                    <stop offset="30%" style="stop-color:white;stop-opacity:0.3" />
                    <stop offset="70%" style="stop-color:white;stop-opacity:0.8" />
                    <stop offset="100%" style="stop-color:white;stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect x="0" y="2" width="32" height="4" fill="url(#meteorTrail)" />
            <circle cx="30" cy="4" r="3" fill="white" />
        </svg>
    `), scene);
    
    // Random start position at edge of view
    const side = Math.floor(Math.random() * 4);
    let startPos, endPos;
    const distance = 800;
    
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
        case 3: // Left
            startPos = new BABYLON.Vector3(-distance/2, (Math.random() - 0.5) * distance, (Math.random() - 0.5) * distance);
            endPos = new BABYLON.Vector3(distance/2, (Math.random() - 0.5) * distance, (Math.random() - 0.5) * distance);
            break;
    }
    
    const emitter = BABYLON.MeshBuilder.CreateBox("meteorEmitter", {size: 0.1}, scene);
    emitter.position = startPos;
    emitter.isVisible = false;
    shootingStar.emitter = emitter;
    
    shootingStar.color1 = new BABYLON.Color4(1, 1, 1, 1);
    shootingStar.color2 = new BABYLON.Color4(0.8, 0.9, 1, 0.8);
    shootingStar.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    
    shootingStar.minSize = 1;
    shootingStar.maxSize = 3;
    shootingStar.minLifeTime = 3;
    shootingStar.maxLifeTime = 5;
    shootingStar.emitRate = 50;
    shootingStar.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    shootingStar.renderingGroupId = 1;
    
    const direction = endPos.subtract(startPos).normalize();
    shootingStar.direction1 = direction.scale(8);
    shootingStar.direction2 = direction.scale(12);
    shootingStar.minEmitPower = 5;
    shootingStar.maxEmitPower = 10;
    
    shootingStar.start();
    
    // Animate the emitter position
    const duration = 4000 + Math.random() * 2000; // 4-6 seconds
    const startTime = Date.now();
    
    const animatemeteor = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
            shootingStar.stop();
            setTimeout(() => {
                shootingStar.dispose();
                emitter.dispose();
            }, 2000);
            return;
        }
        
        // Smooth movement from start to end
        const currentPos = BABYLON.Vector3.Lerp(startPos, endPos, progress);
        emitter.position = currentPos;
        
        // Fade out near the end
        if (progress > 0.7) {
            const fadeProgress = (progress - 0.7) / 0.3;
            shootingStar.color1.a = 1 - fadeProgress;
            shootingStar.color2.a = 0.8 - fadeProgress * 0.8;
        }
        
        requestAnimationFrame(animatemeteor);
    };
    
    animatemeteor();
}


// Clean up any residual objects from previous loads
function cleanupResidualObjects() {
    try {
        // Remove any lingering planetary objects by name patterns
        const objectsToRemove = [];
        
        scene.meshes.forEach(mesh => {
            if (mesh.name && (
                mesh.name.includes('planet') ||
                mesh.name.includes('Planet') ||
                mesh.name.includes('moon') ||
                mesh.name.includes('Moon') ||
                mesh.name.includes('asteroid') ||
                mesh.name.includes('Asteroid') ||
                mesh.name.includes('satellite') ||
                mesh.name.includes('Satellite') ||
                mesh.name.includes('centralStar') ||
                mesh.name.includes('secondaryStar') ||
                mesh.name.includes('distantGalaxy') ||
                mesh.name.includes('nebula') ||
                mesh.name.includes('Nebula')
            )) {
                objectsToRemove.push(mesh);
            }
        });
        
        // Remove identified objects
        objectsToRemove.forEach(obj => {
            if (obj && !obj.isDisposed()) {
                obj.dispose();
                console.log('Removed residual object:', obj.name);
            }
        });
        
        // Also clean up transform nodes
        const nodesToRemove = [];
        scene.transformNodes.forEach(node => {
            if (node.name && (
                node.name.includes('orbit') ||
                node.name.includes('Orbit') ||
                node.name.includes('solarSystem') ||
                node.name.includes('asteroidBelts')
            )) {
                nodesToRemove.push(node);
            }
        });
        
        nodesToRemove.forEach(node => {
            if (node && !node.isDisposed()) {
                node.dispose();
                console.log('Removed residual node:', node.name);
            }
        });
        
        console.log('✨ Residual object cleanup completed');
        
    } catch (error) {
        console.warn('Error during residual object cleanup:', error);
    }
}

// Fallback tiny star creation
function createFallbackTinyStars() {
    try {
        // Create simple sphere-based tiny stars
        for (let i = 0; i < 30; i++) {
            const star = BABYLON.MeshBuilder.CreateSphere(`tinyStar${i}`, {diameter: 0.5}, scene);
            
            // Random distant position
            const radius = 200 + Math.random() * 300;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            star.position = new BABYLON.Vector3(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.sin(phi) * Math.sin(theta),
                radius * Math.cos(phi)
            );
            
            // Simple material
            const starMat = new BABYLON.StandardMaterial(`tinyStarMat${i}`, scene);
            starMat.emissiveColor = new BABYLON.Color3(0.8, 0.9, 1);
            starMat.disableLighting = true;
            star.material = starMat;
            
            // Set rendering group for background
            star.renderingGroupId = 0;
            
            stars.push(star);
        }
        
        console.log('Fallback tiny stars created');
    } catch (error) {
        console.error('Failed to create fallback tiny stars:', error);
    }
}

// Animation loop
export function animate() {
    if (!animationRunning) {
        animationRunning = true;
        console.log('Animation loop starting...');
        
        // Start the render loop (only once!)
        engine.runRenderLoop(() => {
            if (!engine || engine.isDisposed) return;
            if (scene && scene.activeCamera) {
                scene.render();
            }
        });
        console.log('Engine render loop started');
        
        // Register before render animations
        scene.registerBeforeRender(() => {
            if (!engine || engine.isDisposed) return;
            
            time += 0.016; // ~60fps timing

            // Debug logging every 60 frames (once per second at 60fps)
            if (Math.floor(time * 60) % 60 === 0) {
                console.log('📊 Scene is rendering, Active meshes:', scene.meshes.length);
            }

            // Update enhanced black hole effects
            updateBlackHoleEffects();

            // Update camera effects (without FOV changes)
            updateCameraEffects();

            // Enhanced camera orbital motion with dynamic patterns
            cameraRotation += 0.001;
            
            const cameraRadius = 50 + Math.sin(time * 0.05) * 8; // Dynamic radius
            const cameraHeight = 20 + Math.sin(time * 0.1) * 5 + Math.cos(time * 0.03) * 3; // Multi-layered height
            const heightVariation = Math.sin(time * 0.07) * 2; // Additional height complexity
            
            // Create figure-8 like motion with orbital decay/expansion
            const orbitExpansion = 1 + Math.sin(time * 0.02) * 0.15;
            const figure8Factor = Math.sin(time * 0.08) * 0.3;
            
            const targetPosition = new BABYLON.Vector3(
                Math.sin(cameraRotation) * cameraRadius * orbitExpansion + Math.cos(cameraRotation * 2) * figure8Factor,
                cameraHeight + heightVariation,
                Math.cos(cameraRotation) * cameraRadius * orbitExpansion + Math.sin(cameraRotation * 2) * figure8Factor
            );
            
            // Enhanced smooth camera positioning with inertia
            camera.position = BABYLON.Vector3.Lerp(camera.position, targetPosition, 0.015);
            
            // Dynamic camera target with subtle drift
            const targetDrift = new BABYLON.Vector3(
                Math.sin(time * 0.03) * 2,
                Math.cos(time * 0.05) * 1,
                Math.sin(time * 0.04) * 1.5
            );
            const dynamicTarget = cameraTarget.add(targetDrift);
            camera.setTarget(dynamicTarget);

            // Update enhanced star animations
            updateEnhancedStarAnimations();
            
            // Update dynamic celestial objects
            updateCelestialObjects();
            
            // Update dynamic celestial objects
            updateCelestialObjects();
        });
    }
}

// Handle window resize
export function onWindowResize() {
    if (engine) {
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
window.updateCelestialObjects = updateCelestialObjects;

// Manual spawn functions (you can call these from console for testing)
window.spawnComet = spawnSpectacularComet;
window.spawnGalaxy = spawnDistantGalaxy;
window.spawnNebula = spawnNebulaPatch;
window.spawnAsteroids = spawnAsteroidCluster;
window.spawnPulsar = spawnPulsarBeam;
window.spawnTrail = spawnCometTail;

console.log('🌌 Celestial objects system ready! Available manual spawn functions:');
console.log('   spawnComet() - Spawn a spectacular comet');
console.log('   spawnGalaxy() - Spawn a distant galaxy');
console.log('   spawnNebula() - Spawn a colorful nebula patch');
console.log('   spawnAsteroids() - Spawn an asteroid cluster');
console.log('   spawnPulsar() - Spawn a pulsar with rotating beam');
console.log('   spawnTrail() - Spawn a beautiful comet trail');