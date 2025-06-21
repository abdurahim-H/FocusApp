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


