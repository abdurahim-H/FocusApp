// scene3d.js
// 3D Scene Setup and Management - Complete Enhanced Babylon.js Implementation with Beautiful Cosmic Stars
import { createStarField, createGalaxyCore, createPlanets, createNebula, createComets, createSpaceObjects } from './galaxy.js';
import { updateBlackHoleEffects, createEnhancedBlackHole } from './blackhole.js';
import { initCameraEffects, updateCameraEffects } from './camera-effects.js';
import { trackRequestAnimationFrame } from './cleanup.js';

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

// Enhanced Cosmic Starfield - Beautiful multi-layered stars
function createEnhancedCosmicStarField() {
    try {
        if (!scene) {
            console.warn('Scene not available for star field creation');
            return;
        }

        console.log('✨ Creating enhanced cosmic starfield...');
        
        // Create multiple star layers for depth and beauty
        createPrimaryStarLayer();
        createDistantStarLayer();
        createBrightStarLayer();
        createNebulaStarClusters();
        createShootingStars();
        
        console.log('🌌 Enhanced cosmic starfield complete with multiple layers');
        
    } catch (error) {
        console.error('Failed to create enhanced starfield:', error);
        createFallbackTinyStars();
    }
}

// Layer 1: Primary cosmic stars with dynamic colors and sizes
function createPrimaryStarLayer() {
    const starCount = 4000;
    const primaryStars = new BABYLON.ParticleSystem("primaryCosmicStars", starCount, scene);
    
    // Create enhanced star texture with multiple glow layers
    primaryStars.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
            <defs>
                <radialGradient id="starCore" cx="50%" cy="50%" r="20%">
                    <stop offset="0%" style="stop-color:white;stop-opacity:1" />
                    <stop offset="60%" style="stop-color:white;stop-opacity:0.9" />
                    <stop offset="100%" style="stop-color:white;stop-opacity:0.7" />
                </radialGradient>
                <radialGradient id="starHalo" cx="50%" cy="50%" r="45%">
                    <stop offset="0%" style="stop-color:white;stop-opacity:0.6" />
                    <stop offset="30%" style="stop-color:cyan;stop-opacity:0.4" />
                    <stop offset="60%" style="stop-color:blue;stop-opacity:0.2" />
                    <stop offset="100%" style="stop-color:purple;stop-opacity:0" />
                </radialGradient>
                <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:white;stop-opacity:0.3" />
                    <stop offset="40%" style="stop-color:cyan;stop-opacity:0.2" />
                    <stop offset="80%" style="stop-color:blue;stop-opacity:0.1" />
                    <stop offset="100%" style="stop-color:transparent;stop-opacity:0" />
                </radialGradient>
            </defs>
            <circle cx="32" cy="32" r="32" fill="url(#starGlow)" />
            <circle cx="32" cy="32" r="24" fill="url(#starHalo)" />
            <circle cx="32" cy="32" r="8" fill="url(#starCore)" />
            <circle cx="32" cy="32" r="3" fill="white" opacity="0.95" />
        </svg>
    `), scene);
    
    const emitter = BABYLON.MeshBuilder.CreateBox("primaryEmitter", {size: 0.01}, scene);
    emitter.isVisible = false;
    primaryStars.emitter = emitter;
    
    primaryStars.minSize = 0.8;
    primaryStars.maxSize = 3.5;
    primaryStars.minLifeTime = Number.MAX_VALUE;
    primaryStars.maxLifeTime = Number.MAX_VALUE;
    primaryStars.emitRate = 0;
    primaryStars.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    primaryStars.renderingGroupId = 0;
    
    primaryStars.color1 = new BABYLON.Color4(1, 1, 1, 0.9);
    primaryStars.color2 = new BABYLON.Color4(0.8, 0.9, 1, 0.7);
    primaryStars.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    
    primaryStars.start();
    primaryStars.manualEmitCount = starCount;
    
    // Position and configure primary stars
    setTimeout(() => {
        const particles = primaryStars.particles;
        
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            if (!particle) continue;
            
            // Create realistic galactic distribution
            const distributionType = Math.random();
            let radius, theta, phi;
            
            if (distributionType < 0.6) {
                // Galactic disk (main star population)
                radius = 200 + Math.pow(Math.random(), 0.4) * 600;
                theta = Math.random() * Math.PI * 2;
                phi = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
            } else if (distributionType < 0.85) {
                // Galactic halo
                radius = 400 + Math.random() * 400;
                theta = Math.random() * Math.PI * 2;
                phi = Math.acos(2 * Math.random() - 1);
            } else {
                // Dense core region
                radius = 150 + Math.random() * 200;
                theta = Math.random() * Math.PI * 2;
                phi = Math.acos(2 * Math.random() - 1);
            }
            
            particle.position.x = radius * Math.sin(phi) * Math.cos(theta);
            particle.position.y = radius * Math.sin(phi) * Math.sin(theta);
            particle.position.z = radius * Math.cos(phi);
            
            // Stellar classification with realistic HR diagram distribution
            const stellarClass = Math.random();
            let starConfig;
            
            if (stellarClass < 0.1) {
                // O-type stars (blue supergiants)
                starConfig = {
                    color: new BABYLON.Color4(0.6, 0.7, 1, 0.95),
                    size: 2.5 + Math.random() * 2,
                    twinkleSpeed: 0.02 + Math.random() * 0.04,
                    type: 'supergiant'
                };
            } else if (stellarClass < 0.25) {
                // B-type stars (blue-white)
                starConfig = {
                    color: new BABYLON.Color4(0.8, 0.85, 1, 0.9),
                    size: 1.8 + Math.random() * 1.5,
                    twinkleSpeed: 0.015 + Math.random() * 0.03,
                    type: 'giant'
                };
            } else if (stellarClass < 0.45) {
                // A-type stars (white)
                starConfig = {
                    color: new BABYLON.Color4(1, 1, 1, 0.85),
                    size: 1.2 + Math.random() * 1,
                    twinkleSpeed: 0.01 + Math.random() * 0.025,
                    type: 'main'
                };
            } else if (stellarClass < 0.65) {
                // G-type stars (yellow - like our Sun)
                starConfig = {
                    color: new BABYLON.Color4(1, 0.95, 0.8, 0.8),
                    size: 0.9 + Math.random() * 0.8,
                    twinkleSpeed: 0.008 + Math.random() * 0.02,
                    type: 'main'
                };
            } else if (stellarClass < 0.85) {
                // K-type stars (orange)
                starConfig = {
                    color: new BABYLON.Color4(1, 0.8, 0.6, 0.75),
                    size: 0.7 + Math.random() * 0.6,
                    twinkleSpeed: 0.006 + Math.random() * 0.015,
                    type: 'main'
                };
            } else {
                // M-type stars (red dwarfs)
                starConfig = {
                    color: new BABYLON.Color4(1, 0.6, 0.4, 0.7),
                    size: 0.4 + Math.random() * 0.5,
                    twinkleSpeed: 0.004 + Math.random() * 0.01,
                    type: 'dwarf'
                };
            }
            
            particle.color = starConfig.color;
            particle.size = starConfig.size;
            
            // Enhanced stellar properties
            particle.userData = {
                baseSize: starConfig.size,
                baseAlpha: starConfig.color.a,
                twinkleSpeed: starConfig.twinkleSpeed,
                twinklePhase: Math.random() * Math.PI * 2,
                stellarType: starConfig.type,
                pulsePhase: Math.random() * Math.PI * 2,
                originalPosition: particle.position.clone(),
                colorShift: Math.random() * 0.1 - 0.05 // Color variation over time
            };
        }
    }, 100);
    
    primaryStars.userData = {
        layerType: 'primary',
        rotationSpeed: 0.00001,
        driftSpeed: 0.000005,
        breathingSpeed: 0.002
    };
    
    stars.push(primaryStars);
}

// Layer 2: Distant background stars
function createDistantStarLayer() {
    const starCount = 6000;
    const distantStars = new BABYLON.ParticleSystem("distantCosmicStars", starCount, scene);
    
    // Simpler texture for distant stars
    distantStars.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
            <defs>
                <radialGradient id="distantStar" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:white;stop-opacity:0.8" />
                    <stop offset="40%" style="stop-color:cyan;stop-opacity:0.4" />
                    <stop offset="80%" style="stop-color:blue;stop-opacity:0.2" />
                    <stop offset="100%" style="stop-color:transparent;stop-opacity:0" />
                </radialGradient>
            </defs>
            <circle cx="16" cy="16" r="16" fill="url(#distantStar)" />
            <circle cx="16" cy="16" r="4" fill="white" opacity="0.7" />
        </svg>
    `), scene);
    
    const emitter = BABYLON.MeshBuilder.CreateBox("distantEmitter", {size: 0.01}, scene);
    emitter.isVisible = false;
    distantStars.emitter = emitter;
    
    distantStars.minSize = 0.3;
    distantStars.maxSize = 1.2;
    distantStars.minLifeTime = Number.MAX_VALUE;
    distantStars.maxLifeTime = Number.MAX_VALUE;
    distantStars.emitRate = 0;
    distantStars.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    distantStars.renderingGroupId = 0;
    
    distantStars.color1 = new BABYLON.Color4(1, 1, 1, 0.5);
    distantStars.color2 = new BABYLON.Color4(0.7, 0.8, 1, 0.3);
    
    distantStars.start();
    distantStars.manualEmitCount = starCount;
    
    setTimeout(() => {
        const particles = distantStars.particles;
        
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            if (!particle) continue;
            
            // Very distant uniform distribution
            const radius = 800 + Math.random() * 600;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            particle.position.x = radius * Math.sin(phi) * Math.cos(theta);
            particle.position.y = radius * Math.sin(phi) * Math.sin(theta);
            particle.position.z = radius * Math.cos(phi);
            
            particle.size = 0.3 + Math.random() * 0.9;
            particle.color = new BABYLON.Color4(
                0.8 + Math.random() * 0.2,
                0.8 + Math.random() * 0.2,
                0.9 + Math.random() * 0.1,
                0.3 + Math.random() * 0.3
            );
            
            particle.userData = {
                baseSize: particle.size,
                baseAlpha: particle.color.a,
                twinkleSpeed: 0.003 + Math.random() * 0.008,
                twinklePhase: Math.random() * Math.PI * 2,
                stellarType: 'distant',
                originalPosition: particle.position.clone()
            };
        }
    }, 200);
    
    distantStars.userData = {
        layerType: 'distant',
        rotationSpeed: 0.000005,
        driftSpeed: 0.000002
    };
    
    stars.push(distantStars);
}

// Layer 3: Bright prominent stars
function createBrightStarLayer() {
    const starCount = 150;
    const brightStars = new BABYLON.ParticleSystem("brightCosmicStars", starCount, scene);
    
    // Enhanced bright star texture with cross pattern
    brightStars.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
            <defs>
                <radialGradient id="brightCore" cx="50%" cy="50%" r="25%">
                    <stop offset="0%" style="stop-color:white;stop-opacity:1" />
                    <stop offset="70%" style="stop-color:white;stop-opacity:0.95" />
                    <stop offset="100%" style="stop-color:white;stop-opacity:0.8" />
                </radialGradient>
                <radialGradient id="brightHalo" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:white;stop-opacity:0.7" />
                    <stop offset="30%" style="stop-color:cyan;stop-opacity:0.5" />
                    <stop offset="60%" style="stop-color:blue;stop-opacity:0.3" />
                    <stop offset="100%" style="stop-color:purple;stop-opacity:0" />
                </radialGradient>
                <linearGradient id="spike1" x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" style="stop-color:transparent" />
                    <stop offset="40%" style="stop-color:white;stop-opacity:0.6" />
                    <stop offset="50%" style="stop-color:white;stop-opacity:0.8" />
                    <stop offset="60%" style="stop-color:white;stop-opacity:0.6" />
                    <stop offset="100%" style="stop-color:transparent" />
                </linearGradient>
                <linearGradient id="spike2" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" style="stop-color:transparent" />
                    <stop offset="40%" style="stop-color:white;stop-opacity:0.6" />
                    <stop offset="50%" style="stop-color:white;stop-opacity:0.8" />
                    <stop offset="60%" style="stop-color:white;stop-opacity:0.6" />
                    <stop offset="100%" style="stop-color:transparent" />
                </linearGradient>
            </defs>
            <circle cx="48" cy="48" r="48" fill="url(#brightHalo)" />
            <rect x="0" y="46" width="96" height="4" fill="url(#spike1)" />
            <rect x="46" y="0" width="4" height="96" fill="url(#spike2)" />
            <circle cx="48" cy="48" r="12" fill="url(#brightCore)" />
            <circle cx="48" cy="48" r="4" fill="white" />
        </svg>
    `), scene);
    
    const emitter = BABYLON.MeshBuilder.CreateBox("brightEmitter", {size: 0.01}, scene);
    emitter.isVisible = false;
    brightStars.emitter = emitter;
    
    brightStars.minSize = 2.5;
    brightStars.maxSize = 6;
    brightStars.minLifeTime = Number.MAX_VALUE;
    brightStars.maxLifeTime = Number.MAX_VALUE;
    brightStars.emitRate = 0;
    brightStars.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    brightStars.renderingGroupId = 0;
    
    brightStars.color1 = new BABYLON.Color4(1, 1, 1, 1);
    brightStars.color2 = new BABYLON.Color4(0.9, 0.95, 1, 0.9);
    
    brightStars.start();
    brightStars.manualEmitCount = starCount;
    
    setTimeout(() => {
        const particles = brightStars.particles;
        
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            if (!particle) continue;
            
            // Strategic placement for bright stars
            const radius = 300 + Math.random() * 500;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.PI / 2 + (Math.random() - 0.5) * 0.8;
            
            particle.position.x = radius * Math.sin(phi) * Math.cos(theta);
            particle.position.y = radius * Math.sin(phi) * Math.sin(theta);
            particle.position.z = radius * Math.cos(phi);
            
            // Bright star types
            const brightType = Math.random();
            let starConfig;
            
            if (brightType < 0.3) {
                // Blue giants
                starConfig = {
                    color: new BABYLON.Color4(0.7, 0.8, 1, 1),
                    size: 4 + Math.random() * 2,
                    pulse: 0.02
                };
            } else if (brightType < 0.6) {
                // White supergiants
                starConfig = {
                    color: new BABYLON.Color4(1, 1, 1, 0.95),
                    size: 3.5 + Math.random() * 2.5,
                    pulse: 0.015
                };
            } else {
                // Variable stars
                starConfig = {
                    color: new BABYLON.Color4(1, 0.9, 0.7, 0.9),
                    size: 3 + Math.random() * 2,
                    pulse: 0.025
                };
            }
            
            particle.color = starConfig.color;
            particle.size = starConfig.size;
            
            particle.userData = {
                baseSize: starConfig.size,
                baseAlpha: starConfig.color.a,
                twinkleSpeed: 0.01 + Math.random() * 0.02,
                twinklePhase: Math.random() * Math.PI * 2,
                pulseSpeed: starConfig.pulse,
                stellarType: 'bright',
                originalPosition: particle.position.clone()
            };
        }
    }, 300);
    
    brightStars.userData = {
        layerType: 'bright',
        rotationSpeed: 0.000008,
        driftSpeed: 0.000003
    };
    
    stars.push(brightStars);
}

// Layer 4: Nebula star clusters
function createNebulaStarClusters() {
    const clusterCount = 8;
    
    for (let c = 0; c < clusterCount; c++) {
        const clusterStars = new BABYLON.ParticleSystem(`nebulaCluster_${c}`, 200, scene);
        
        clusterStars.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
                <defs>
                    <radialGradient id="clusterCore" cx="50%" cy="50%" r="40%">
                        <stop offset="0%" style="stop-color:white;stop-opacity:0.9" />
                        <stop offset="60%" style="stop-color:cyan;stop-opacity:0.6" />
                        <stop offset="100%" style="stop-color:blue;stop-opacity:0.3" />
                    </radialGradient>
                    <radialGradient id="clusterGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" style="stop-color:cyan;stop-opacity:0.4" />
                        <stop offset="70%" style="stop-color:purple;stop-opacity:0.2" />
                        <stop offset="100%" style="stop-color:transparent" />
                    </radialGradient>
                </defs>
                <circle cx="24" cy="24" r="24" fill="url(#clusterGlow)" />
                <circle cx="24" cy="24" r="12" fill="url(#clusterCore)" />
                <circle cx="24" cy="24" r="3" fill="white" opacity="0.8" />
            </svg>
        `), scene);
        
        const emitter = BABYLON.MeshBuilder.CreateBox(`clusterEmitter_${c}`, {size: 0.01}, scene);
        emitter.isVisible = false;
        
        // Position cluster center
        const clusterRadius = 400 + Math.random() * 400;
        const clusterTheta = Math.random() * Math.PI * 2;
        const clusterPhi = Math.acos(2 * Math.random() - 1);
        
        emitter.position = new BABYLON.Vector3(
            clusterRadius * Math.sin(clusterPhi) * Math.cos(clusterTheta),
            clusterRadius * Math.sin(clusterPhi) * Math.sin(clusterTheta),
            clusterRadius * Math.cos(clusterPhi)
        );
        
        clusterStars.emitter = emitter;
        clusterStars.createSphereEmitter(30, 0);
        
        // Cluster colors based on nebula type
        const nebulaTypes = [
            [new BABYLON.Color4(1, 0.3, 0.5, 0.8), new BABYLON.Color4(0.8, 0.2, 0.4, 0.6)], // Emission
            [new BABYLON.Color4(0.3, 0.6, 1, 0.8), new BABYLON.Color4(0.2, 0.5, 0.9, 0.6)], // Reflection
            [new BABYLON.Color4(0.5, 1, 0.7, 0.8), new BABYLON.Color4(0.4, 0.9, 0.6, 0.6)], // Planetary
            [new BABYLON.Color4(0.8, 0.5, 1, 0.8), new BABYLON.Color4(0.7, 0.4, 0.9, 0.6)]  // Dark
        ];
        
        const colorPair = nebulaTypes[c % nebulaTypes.length];
        clusterStars.color1 = colorPair[0];
        clusterStars.color2 = colorPair[1];
        
        clusterStars.minSize = 0.8;
        clusterStars.maxSize = 2.5;
        clusterStars.minLifeTime = Number.MAX_VALUE;
        clusterStars.maxLifeTime = Number.MAX_VALUE;
        clusterStars.emitRate = 0;
        clusterStars.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        clusterStars.renderingGroupId = 0;
        
        clusterStars.start();
        clusterStars.manualEmitCount = 200;
        
        setTimeout(() => {
            const particles = clusterStars.particles;
            for (let i = 0; i < particles.length; i++) {
                const particle = particles[i];
                if (!particle) continue;
                
                particle.userData = {
                    baseSize: particle.size,
                    baseAlpha: particle.color.a,
                    twinkleSpeed: 0.005 + Math.random() * 0.015,
                    twinklePhase: Math.random() * Math.PI * 2,
                    stellarType: 'cluster',
                    clusterId: c,
                    originalPosition: particle.position.clone()
                };
            }
        }, 400 + c * 100);
        
        clusterStars.userData = {
            layerType: 'cluster',
            clusterId: c,
            rotationSpeed: 0.00001,
            breathingSpeed: 0.003
        };
        
        stars.push(clusterStars);
    }
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

// Enhanced star animation update function
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
                    case 'primary':
                        animatePrimaryStars(particles, currentTime, userData);
                        break;
                    case 'distant':
                        animateDistantStars(particles, currentTime, userData);
                        break;
                    case 'bright':
                        animateBrightStars(particles, currentTime, userData);
                        break;
                    case 'cluster':
                        animateClusterStars(particles, currentTime, userData);
                        break;
                }
                
                // Apply gentle rotation to star field
                if (starField.emitter && userData.rotationSpeed) {
                    starField.emitter.rotation.y += userData.rotationSpeed;
                }
            }
        } catch (animationError) {
            console.warn('Enhanced star animation error:', animationError);
        }
    });
}

// Primary stars animation - main starfield with stellar evolution
function animatePrimaryStars(particles, currentTime, userData) {
    particles.forEach((particle, particleIndex) => {
        if (!particle || !particle.userData) return;
        
        const data = particle.userData;
        
        // Advanced twinkling based on stellar type
        let twinkleIntensity;
        switch (data.stellarType) {
            case 'supergiant':
                twinkleIntensity = Math.sin(currentTime * data.twinkleSpeed + data.twinklePhase) * 0.4 + 0.8;
                break;
            case 'giant':
                twinkleIntensity = Math.sin(currentTime * data.twinkleSpeed + data.twinklePhase) * 0.3 + 0.8;
                break;
            case 'main':
                twinkleIntensity = Math.sin(currentTime * data.twinkleSpeed + data.twinklePhase) * 0.2 + 0.85;
                break;
            case 'dwarf':
                twinkleIntensity = Math.sin(currentTime * data.twinkleSpeed + data.twinklePhase) * 0.15 + 0.9;
                break;
            default:
                twinkleIntensity = Math.sin(currentTime * data.twinkleSpeed + data.twinklePhase) * 0.2 + 0.8;
        }
        
        // Apply atmospheric scintillation (twinkling)
        particle.size = data.baseSize * twinkleIntensity;
        particle.color.a = Math.max(data.baseAlpha * twinkleIntensity, data.baseAlpha * 0.4);
        
        // Subtle color shifting for stellar evolution
        if (data.colorShift && particleIndex % 50 === 0) {
            const colorEvolution = Math.sin(currentTime * 0.001 + data.pulsePhase) * data.colorShift;
            particle.color.r = Math.min(1, particle.color.r + colorEvolution);
            particle.color.b = Math.max(0, particle.color.b - colorEvolution * 0.5);
        }
        
        // Minimal parallax movement
        if (particleIndex % 100 === 0) {
            const parallax = userData.driftSpeed * 0.5;
            const driftX = Math.sin(currentTime * 0.05 + particleIndex) * parallax;
            const driftZ = Math.cos(currentTime * 0.05 + particleIndex) * parallax;
            
            particle.position.x = data.originalPosition.x + driftX;
            particle.position.z = data.originalPosition.z + driftZ;
        }
    });
}

// Distant stars animation - subtle background movement
function animateDistantStars(particles, currentTime, userData) {
    particles.forEach((particle, particleIndex) => {
        if (!particle || !particle.userData) return;
        
        const data = particle.userData;
        
        // Gentle twinkling for atmospheric effect
        const twinkle = Math.sin(currentTime * data.twinkleSpeed + data.twinklePhase) * 0.25 + 0.75;
        particle.size = data.baseSize * twinkle;
        particle.color.a = Math.max(data.baseAlpha * twinkle, data.baseAlpha * 0.5);
        
        // Very subtle movement
        if (particleIndex % 200 === 0) {
            const microDrift = userData.driftSpeed * 0.2;
            particle.position.x = data.originalPosition.x + Math.sin(currentTime * 0.02 + particleIndex) * microDrift;
        }
    });
}

// Bright stars animation - prominent stellar objects
function animateBrightStars(particles, currentTime, userData) {
    particles.forEach((particle, particleIndex) => {
        if (!particle || !particle.userData) return;
        
        const data = particle.userData;
        
        // Enhanced twinkling for bright stars
        const primaryTwinkle = Math.sin(currentTime * data.twinkleSpeed + data.twinklePhase) * 0.3 + 0.7;
        const secondaryTwinkle = Math.sin(currentTime * data.pulseSpeed + data.twinklePhase * 1.5) * 0.2 + 0.8;
        const combinedTwinkle = primaryTwinkle * secondaryTwinkle;
        
        particle.size = data.baseSize * combinedTwinkle;
        particle.color.a = Math.max(data.baseAlpha * combinedTwinkle, data.baseAlpha * 0.6);
        
        // Subtle pulsing for variable stars
        if (data.stellarType === 'bright' && particleIndex % 30 === 0) {
            const variablePulse = Math.sin(currentTime * 0.1 + data.pulsePhase) * 0.1 + 1;
            particle.size *= variablePulse;
        }
    });
}

// Cluster stars animation - nebula regions
function animateClusterStars(particles, currentTime, userData) {
    particles.forEach((particle, particleIndex) => {
        if (!particle || !particle.userData) return;
        
        const data = particle.userData;
        
        // Synchronized cluster breathing
        const clusterBreathing = Math.sin(currentTime * userData.breathingSpeed + data.clusterId) * 0.15 + 0.85;
        const individualTwinkle = Math.sin(currentTime * data.twinkleSpeed + data.twinklePhase) * 0.2 + 0.8;
        
        particle.size = data.baseSize * clusterBreathing * individualTwinkle;
        particle.color.a = Math.max(data.baseAlpha * clusterBreathing * individualTwinkle, data.baseAlpha * 0.3);
        
        // Gentle swirling motion within cluster
        if (particleIndex % 20 === 0) {
            const swirl = userData.rotationSpeed * 10;
            const angle = currentTime * swirl + particleIndex;
            const radius = 2;
            
            particle.position.x = data.originalPosition.x + Math.cos(angle) * radius;
            particle.position.z = data.originalPosition.z + Math.sin(angle) * radius;
        }
    });
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