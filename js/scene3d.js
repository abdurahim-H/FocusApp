// scene3d.js
// 3D Scene Setup and Management - Complete Fixed Babylon.js Implementation
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
        // Create minimalist galaxy elements
        createMinimalistStarField();
        console.log('Minimalist star field creation completed');
        
        // createNebula(); // DISABLED - This creates cosmic dust particles that spill out of black hole
        // console.log('Nebula creation completed');
        
        createEnhancedBlackHole();
        console.log('Black hole creation completed');
        
        // createPlanets(); // DISABLED - Planets removed for cleaner space environment
        // console.log('Planets creation completed');
        
        // createComets(); // DISABLED - Comets create trailing particle effects
        // console.log('Comets creation completed');
        
        // createSpaceObjects(); // DISABLED - Space objects removed for minimalist stellar field
        // console.log('Space objects creation completed');
        
    } catch (error) {
        console.error('Error creating minimalist galaxy elements:', error);
        
        // Create minimal fallback scene - just a few tiny stars
        createFallbackTinyStars();
        console.log('Minimal fallback scene created');
    }
}

// Create minimalist star field with only tiny background stars
function createMinimalistStarField() {
    try {
        if (!scene) {
            console.warn('Scene not available for star field creation');
            return;
        }

        // Create enhanced star particle system
        const starCount = 8000; // Reduced for better performance, focused on tiny stars
        
        // Create a custom star particle system
        const starParticleSystem = new BABYLON.ParticleSystem("minimalistStars", starCount, scene);
        
        // Create a dummy emitter (we'll position particles manually)
        const emitter = BABYLON.MeshBuilder.CreateBox("emitter", {size: 0.01}, scene);
        emitter.isVisible = false;
        starParticleSystem.emitter = emitter;
        
        // Enhanced star texture - simplified for tiny point-like stars
        starParticleSystem.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                <defs>
                    <radialGradient id="starPoint" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" style="stop-color:white;stop-opacity:1" />
                        <stop offset="40%" style="stop-color:white;stop-opacity:0.8" />
                        <stop offset="100%" style="stop-color:white;stop-opacity:0" />
                    </radialGradient>
                </defs>
                <circle cx="16" cy="16" r="16" fill="url(#starPoint)" />
            </svg>
        `), scene);
        
        // Enhanced particle properties with tiny, subtle sizing
        starParticleSystem.minSize = 0.1;
        starParticleSystem.maxSize = 1.0; // Much smaller stars
        starParticleSystem.minLifeTime = Number.MAX_VALUE;
        starParticleSystem.maxLifeTime = Number.MAX_VALUE;
        starParticleSystem.emitRate = 0;
        
        // Enhanced blending for subtle cosmic glow
        starParticleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        // Set rendering group for background positioning
        starParticleSystem.renderingGroupId = 0; // Background layer - renders first
        
        // Subtle color variations for distant stars
        starParticleSystem.color1 = new BABYLON.Color4(1, 1, 1, 0.6);
        starParticleSystem.color2 = new BABYLON.Color4(0.8, 0.9, 1, 0.4);
        starParticleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        
        // Start the particle system and emit all particles at once
        starParticleSystem.start();
        starParticleSystem.manualEmitCount = starCount;
        
        // Position star particles manually with distant distribution
        setTimeout(() => {
            const particles = starParticleSystem.particles;
            
            for (let i = 0; i < particles.length; i++) {
                const particle = particles[i];
                if (!particle) continue;
                
                // Create realistic distant stellar distribution
                const distributionType = Math.random();
                let radius, theta, phi;
                
                // All stars are distant background objects
                radius = 150 + Math.pow(Math.random(), 0.2) * 400; // Much farther away
                theta = Math.random() * Math.PI * 2;
                phi = Math.acos(2 * Math.random() - 1); // Uniform sphere distribution
                
                particle.position.x = radius * Math.sin(phi) * Math.cos(theta);
                particle.position.y = radius * Math.sin(phi) * Math.sin(theta);
                particle.position.z = radius * Math.cos(phi);
                
                // Only tiny, point-like stars
                particle.size = 0.1 + Math.random() * 0.4; // Very small
                
                // Subtle star colors - white, blue-white, slightly yellow
                const starType = Math.random();
                if (starType < 0.6) {
                    // White stars
                    particle.color = new BABYLON.Color4(
                        0.9 + Math.random() * 0.1,
                        0.9 + Math.random() * 0.1,
                        1,
                        0.4 + Math.random() * 0.3
                    );
                } else if (starType < 0.85) {
                    // Blue-white stars
                    particle.color = new BABYLON.Color4(
                        0.7 + Math.random() * 0.2,
                        0.8 + Math.random() * 0.2,
                        1,
                        0.3 + Math.random() * 0.2
                    );
                } else {
                    // Slightly warm white stars
                    particle.color = new BABYLON.Color4(
                        1,
                        0.9 + Math.random() * 0.1,
                        0.8 + Math.random() * 0.2,
                        0.3 + Math.random() * 0.2
                    );
                }
                
                // Store stellar properties for subtle animation
                particle.userData = {
                    baseSize: particle.size,
                    twinkleSpeed: 0.01 + Math.random() * 0.03, // Slower, subtler twinkling
                    twinklePhase: Math.random() * Math.PI * 2,
                    stellarType: 'distant'
                };
            }
        }, 100);
        
        // Store particle system with minimal animation data
        starParticleSystem.userData = {
            rotationSpeed: 0.000005, // Very slow rotation
            driftSpeed: 0.000002, // Minimal drift
            isMainStarField: true,
            lastUpdateTime: 0
        };
        
        stars.push(starParticleSystem);
        
        console.log('✨ Minimalist star field created with', starCount, 'tiny background stars');
        
    } catch (error) {
        console.error('Failed to create minimalist star field:', error);
        // Create a simple fallback
        createFallbackTinyStars();
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

            // Update animations
            // updatePlanetAnimations(); // DISABLED - No planets in minimalist mode
            updateStarAnimations();
            // updateCometAnimations(); // DISABLED - No comets in minimalist mode
            // updateSpaceObjectAnimations(); // DISABLED - No space objects in minimalist mode
            
            // Nebula animation disabled for minimalist space environment
            // const nebulaBackground = scene.getMeshByName("nebulaBackground");
            // ... nebula animation code removed for cleaner space
        });
    }
}

// Enhanced planet animations with realistic orbital mechanics
function updatePlanetAnimations() {
    planets.forEach((planetData, index) => {
        if (!planetData || !planetData.mesh) return;
        
        const planet = planetData.mesh;
        const config = planetData.config;
        const time = performance.now() * 0.001;
        
        if (planet.userData) {
            // Enhanced orbital mechanics with smooth motion
            planet.userData.angle += planet.userData.speed * 0.8;  // Slightly faster motion
            
            // Smooth elliptical orbit calculations
            const eccentricity = planet.userData.eccentricity;
            const baseDistance = planet.userData.distance;
            const meanAnomaly = planet.userData.angle;
            
            // Enhanced eccentric anomaly calculation for smoother orbits
            const eccentricAnomaly = meanAnomaly + eccentricity * Math.sin(meanAnomaly) * (1 + eccentricity * Math.cos(meanAnomaly));
            const trueAnomaly = 2 * Math.atan(Math.sqrt((1 + eccentricity) / (1 - eccentricity)) * Math.tan(eccentricAnomaly / 2));
            
            // Smooth orbital radius with gentle variations
            const orbitRadius = baseDistance * (1 - eccentricity * eccentricity) / (1 + eccentricity * Math.cos(trueAnomaly));
            const radiusVariation = 1 + Math.sin(time * 0.3 + index) * 0.02;  // Subtle breathing effect
            
            // Apply orbital inclination with smooth curves
            const inclinedY = Math.sin(planet.userData.inclination) * orbitRadius * 0.4;
            
            // Beautiful orbital positioning with enhanced smoothness
            const targetX = Math.cos(trueAnomaly) * orbitRadius * radiusVariation;
            const targetZ = Math.sin(trueAnomaly) * orbitRadius * radiusVariation;
            const targetY = inclinedY + Math.sin(time * 0.15 + index) * 0.8; // Larger, slower vertical oscillation
            
            // Ultra-smooth interpolation for fluid motion
            const lerpFactor = 0.05;  // Increased smoothness
            planet.position.x = BABYLON.Scalar.Lerp(planet.position.x, targetX, lerpFactor);
            planet.position.z = BABYLON.Scalar.Lerp(planet.position.z, targetZ, lerpFactor);
            planet.position.y = BABYLON.Scalar.Lerp(planet.position.y, targetY, lerpFactor * 0.5);
            
            // Enhanced planetary rotation with beautiful axial tilt and wobble
            planet.rotation.y += planet.userData.rotationSpeed * 1.2;  // Slightly faster rotation
            planet.rotation.x = planet.userData.axialTilt + Math.sin(time * 0.4 + index) * 0.08;  // More dramatic axial wobble
            planet.rotation.z = Math.sin(time * 0.25 + index * 0.7) * 0.05;  // Enhanced Z-axis variation
            
            // Beautiful size pulsing for gas giants with enhanced effects
            if (config.size > 3) {
                const pulseFactor = 1 + Math.sin(time * 0.6 + planet.userData.pulsePhase) * 0.04;  // More pronounced pulsing
                const secondaryPulse = 1 + Math.sin(time * 1.2 + planet.userData.pulsePhase * 1.5) * 0.02;
                planet.scaling.setAll(pulseFactor * secondaryPulse);
                
                // Dynamic emission intensity for gas giants
                if (planet.material && planet.material.emissiveColor) {
                    const emissionPulse = 1 + Math.sin(time * 0.8 + planet.userData.pulsePhase) * 0.3;
                    const baseEmission = config.emissive.clone();
                    planet.material.emissiveColor.copyFrom(baseEmission.scale(emissionPulse));
                }
            } else {
                // Rocky planets get subtle glow variations
                if (planet.material && planet.material.emissiveColor) {
                    const rockPulse = 1 + Math.sin(time * 0.3 + planet.userData.pulsePhase) * 0.15;
                    const baseEmission = config.emissive.clone();
                    planet.material.emissiveColor.copyFrom(baseEmission.scale(rockPulse));
                }
            }
            
            // Animate atmospheric effects
            if (planet.getChildren) {
                planet.getChildren().forEach((child, childIndex) => {
                    if (child.userData && child.userData.isAtmosphere) {
                        // Atmospheric swaying
                        const atmosphereSpeed = child.userData.swaySpeed;
                        child.rotation.y += atmosphereSpeed;
                        child.rotation.z = Math.sin(time * atmosphereSpeed * 10) * 0.05;
                        
                        // Dynamic atmosphere opacity based on lighting
                        if (child.material && child.material.alpha !== undefined) {
                            const baseAlpha = 0.15;
                            const variation = Math.sin(time * 0.5 + childIndex) * 0.05;
                            child.material.alpha = baseAlpha + variation;
                        }
                    }
                });
            }
            
            // Enhanced moon animations with orbital resonance
            if (planet.getChildren) {
                planet.getChildren().forEach((moon, moonIndex) => {
                    if (moon.userData && moon.userData.angle !== undefined) {
                        // Calculate moon orbital speed with tidal effects
                        const moonSpeed = moon.userData.speed * (1 + Math.sin(planet.userData.angle * 0.5) * 0.1);
                        moon.userData.angle += moonSpeed;
                        
                        // 3D moon orbits with inclination
                        const moonDistance = moon.userData.distance;
                        const moonInclination = moon.userData.inclination;
                        
                        moon.position.x = Math.cos(moon.userData.angle) * moonDistance;
                        moon.position.z = Math.sin(moon.userData.angle) * moonDistance;
                        moon.position.y = Math.sin(moon.userData.angle * 3 + moonInclination) * moonDistance * 0.2;
                        
                        // Moon rotation and libration
                        moon.rotation.y += moon.userData.rotationSpeed;
                        moon.rotation.x = Math.sin(moon.userData.angle + moon.userData.phase) * 0.1;
                        
                        // Tidal effects - slight elongation toward planet
                        const tidalFactor = 1 + Math.cos(moon.userData.angle) * 0.05;
                        moon.scaling.x = tidalFactor;
                        moon.scaling.z = 2 - tidalFactor; // Conservation of volume
                    }
                });
            }
            
            // Animate planetary rings
            const ringGroup = planet.getChildren().find(child => child.name && child.name.includes('ringGroup'));
            if (ringGroup) {
                ringGroup.getChildren().forEach((ring, ringIndex) => {
                    if (ring.userData && ring.userData.rotationSpeed) {
                        // Differential ring rotation (inner rings faster)
                        const ringSpeed = ring.userData.rotationSpeed * (1 + (3 - ringIndex) * 0.2);
                        ring.rotation.z += ringSpeed;
                        
                        // Ring particle dynamics
                        const swayAmplitude = ring.userData.swayAmplitude;
                        ring.rotation.x = ring.userData.originalRotation.x + Math.sin(time * 0.5 + ringIndex) * swayAmplitude;
                        
                        // Ring opacity variations
                        if (ring.material && ring.material.alpha !== undefined) {
                            const baseAlpha = 0.8 - ringIndex * 0.15;
                            const variation = Math.sin(time * 0.8 + ringIndex * 0.5) * 0.1;
                            ring.material.alpha = Math.max(0.1, baseAlpha + variation);
                        }
                    }
                });
            }
        }
    });
}

// Enhanced star animations with dynamic twinkling and parallax effects
function updateStarAnimations() {
    if (stars.length === 0) return;
    
    stars.forEach((starField, index) => {
        if (!starField || typeof starField !== 'object') return;
        if (starField.isDisposed && starField.isDisposed()) return;
        
        try {
            // Handle ParticleSystem objects
            if (starField instanceof BABYLON.ParticleSystem) {
                const userData = starField.userData;
                
                if (userData && userData.isMainStarField) {
                    // Enhanced star field animations with parallax layers
                    const particles = starField.particles;
                    const currentTime = performance.now() * 0.001;
                    
                    particles.forEach((particle, particleIndex) => {
                        if (!particle || !particle.userData) return;
                        
                        const data = particle.userData;
                        
                        // Dynamic twinkling based on stellar type
                        if (data.stellarType === 'variable') {
                            const variableBrightness = 0.5 + Math.sin(currentTime * data.pulseSpeed + data.twinklePhase) * 0.3;
                            particle.color.a = data.baseSize * variableBrightness * 0.3;
                        } else {
                            // Normal star twinkling
                            const twinkle = Math.sin(currentTime * data.twinkleSpeed + data.twinklePhase) * 0.2 + 0.8;
                            particle.size = data.baseSize * twinkle;
                        }
                        
                        // Subtle parallax drift for depth
                        if (particleIndex % 10 === 0) { // Only update subset for performance
                            const distance = particle.position.length();
                            const parallaxFactor = 1 - Math.min(distance / 500, 1);
                            const drift = userData.driftSpeed * parallaxFactor;
                            
                            particle.position.x += Math.sin(currentTime * 0.1 + particleIndex) * drift;
                            particle.position.z += Math.cos(currentTime * 0.1 + particleIndex) * drift;
                        }
                    });
                    
                    // Galactic rotation
                    if (starField.emitter) {
                        starField.emitter.rotation.y += userData.rotationSpeed;
                    }
                }
                
                // Nebula animations disabled for minimalist space environment
                // if (userData && userData.isNebula) {
                //     ... nebula animation code removed for cleaner space
                // }
                
                // Handle sparkling stars from blackhole.js
                if (starField.name && (starField.name.includes('SparklingStars') || starField.name.includes('microStars'))) {
                    const particles = starField.particles;
                    particles.forEach((particle, particleIndex) => {
                        if (!particle || !particle.userData) return;
                        
                        const data = particle.userData;
                        const currentTime = performance.now() * 0.001;
                        
                        // Enhanced twinkling for sparkling stars
                        const twinkle = Math.sin(currentTime * data.twinkleSpeed + data.twinklePhase) * 0.5 + 0.5;
                        const sparkle = Math.sin(currentTime * (data.twinkleSpeed * 1.5) + data.twinklePhase * 0.7) * 0.3 + 0.7;
                        
                        // Update particle size for twinkling
                        particle.size = data.baseSize * twinkle * sparkle;
                        
                        // Update alpha for sparkle effect
                        if (particle.color && data.baseAlpha) {
                            particle.color.a = data.baseAlpha * twinkle * sparkle;
                        }
                        
                        // Occasional bright flares for main sparkling stars
                        if (starField.name.includes('mainSparklingStars')) {
                            const flareChance = Math.random();
                            if (flareChance < 0.0008) { // Very rare bright flares
                                particle.size = data.baseSize * 4;
                                if (particle.color) {
                                    particle.color.a = Math.min(1, data.baseAlpha * 3);
                                }
                            }
                        }
                    });
                }
            } else {
                // Handle mesh-based stars (fallback)
                if (!starField.position) return;
                
                starField.isVisible = true;
                
                if (starField.material && starField.material.setFloat) {
                    starField.material.setFloat("time", time);
                }
                
                if (starField.userData && starField.userData.rotationSpeed && starField.rotation) {
                    starField.rotation.y += starField.userData.rotationSpeed * 0.5;
                    starField.rotation.x += starField.userData.rotationSpeed * 0.3;
                    
                    // Add subtle twinkling to mesh stars
                    const twinkle = 0.8 + Math.sin(time * 3 + index) * 0.2;
                    if (starField.material && starField.material.emissiveColor) {
                        starField.material.emissiveColor = starField.material.emissiveColor.scale(twinkle);
                    }
                }
            }
        } catch (animationError) {
            console.warn('Star animation error for index', index, ':', animationError);
        }
    });
}

// Enhanced comet animations with spectacular trails and physics
function updateCometAnimations() {
    comets.forEach((comet, index) => {
        if (!comet || typeof comet !== 'object') return;
        if (comet.isDisposed && comet.isDisposed()) return;
        
        // Handle both userData and metadata properties
        const data = comet.userData || comet.metadata;
        if (!data || !comet.position) return;
        
        try {
            // Enhanced curved trajectory with gravitational influence
            const distanceToCenter = comet.position.length();
            const gravitationalPull = Math.max(0, 120 - distanceToCenter) * 0.00015;
            const curve = Math.sin(time * 0.3 + index * 0.7) * 0.03;
            
            if (data.velocity && data.velocity.y !== undefined) {
                // Apply gravitational acceleration toward center (black hole effect)
                const centerDirection = comet.position.normalize().scale(-1);
                data.velocity = data.velocity.add(centerDirection.scale(gravitationalPull));
                
                // Add beautiful orbital curves and wobbles
                data.velocity.y += curve;
                data.velocity.x += Math.sin(time * 0.2 + index) * 0.01;
                data.velocity.z += Math.cos(time * 0.25 + index) * 0.01;
                
                // Enhanced velocity dampening for realistic physics
                data.velocity = data.velocity.scale(0.9985);
            }
            
            // Smooth position updates with acceleration
            if (data.velocity) {
                comet.position = comet.position.add(data.velocity);
            }
            data.life--;
            
            // Enhanced opacity fade with smooth transitions
            const lifeFactor = data.life / data.maxLife;
            const opacity = Math.pow(lifeFactor, 1.2);
            
            // Update comet core with enhanced pulsing effects
            const cometCore = comet.getChildren().find(child => child.name && child.name.includes('cometCore'));
            if (cometCore && cometCore.material && data.type) {
                const pulsePeriod = data.pulsePeriod || 3;
                const baseIntensity = 0.6;
                const pulseIntensity = baseIntensity + Math.sin(time * (2 / pulsePeriod) + index) * 0.4;
                
                // Dynamic emission based on comet type and velocity
                const speed = data.velocity ? data.velocity.length() : 0;
                const heatBoost = 1 + Math.min(speed * 3, 0.5);
                
                cometCore.material.emissiveColor = data.type.emission.scale(pulseIntensity * opacity * heatBoost);
                
                // Size pulsing for dramatic effect
                const sizePulse = 1 + Math.sin(time * (3 / pulsePeriod) + index * 1.5) * 0.1;
                cometCore.scaling.setAll(sizePulse);
            }
            
            // Enhanced coma (atmosphere) effects
            const coma = data.coma;
            if (coma && coma.material) {
                const comaIntensity = 0.3 + Math.sin(time * 0.4 + index) * 0.1;
                coma.material.alpha = comaIntensity * opacity;
                
                // Coma breathing effect
                const breathe = 1 + Math.sin(time * 0.6 + index) * 0.15;
                coma.scaling.setAll(breathe);
            }
            
            // Enhanced tail particle effects with multiple layers
            if (data.tailSystem) {
                const speed = data.velocity ? data.velocity.length() : 0;
                data.tailSystem.emitRate = Math.max(80, 300 * opacity * (1 + speed * 2));
                
                // Dynamic tail direction based on velocity
                if (data.velocity) {
                    const normalizedVel = data.velocity.normalize();
                    data.tailSystem.direction1 = normalizedVel.scale(-4);
                    data.tailSystem.direction2 = normalizedVel.scale(-7);
                    
                    // Enhanced tail particle speed based on comet velocity
                    data.tailSystem.minEmitPower = Math.max(2, speed * 4);
                    data.tailSystem.maxEmitPower = Math.max(6, speed * 8);
                }
                
                // Spectacular color variations based on speed, heat, and distance
                const heatFactor = Math.min(speed * 8, 1);
                const distanceFactor = Math.max(0, (150 - distanceToCenter) / 150);
                
                data.tailSystem.color1 = new BABYLON.Color4(
                    0.4 + heatFactor * 0.6,
                    0.7 + distanceFactor * 0.3,
                    1 - heatFactor * 0.2,
                    opacity * (0.8 + distanceFactor * 0.2)
                );
                data.tailSystem.color2 = new BABYLON.Color4(
                    1,
                    0.9 - heatFactor * 0.1,
                    0.8 - heatFactor * 0.3,
                    opacity * 0.9
                );
            }
            
            // Enhanced dust tail effects
            if (data.dustTail) {
                const dustOpacity = opacity * 0.7;
                data.dustTail.emitRate = Math.max(40, 120 * dustOpacity);
                data.dustTail.color1.a = dustOpacity;
                data.dustTail.color2.a = dustOpacity * 0.6;
            }
            
            // Enhanced comet rotation based on velocity and internal dynamics
            if (data.velocity && data.rotationSpeed) {
                const rotationBoost = data.velocity.length() * 0.2;
                comet.rotation.x += (data.rotationSpeed + rotationBoost) * 1.5;
                comet.rotation.y += (data.rotationSpeed + rotationBoost) * 1.2;
                comet.rotation.z += (data.rotationSpeed + rotationBoost) * 0.8;
            }
            
            // Reset comet when needed with enhanced spawn logic
            if (data.life <= 0 || comet.position.length() > 280) {
                resetComet(comet, index);
            }
        } catch (animationError) {
            console.warn('Comet animation error for index', index, ':', animationError);
        }
    });
}

// Space object animations
function updateSpaceObjectAnimations() {
    spaceObjects.forEach((spaceObject, index) => {
        if (!spaceObject || typeof spaceObject !== 'object') return;
        if (spaceObject.isDisposed && spaceObject.isDisposed()) return;
        
        // Handle both userData and metadata properties
        const data = spaceObject.userData || spaceObject.metadata;
        if (!data || !spaceObject.position) return;
        
        try {
            const floatSpeed = 0.3;
            const driftRadius = 2;
            
            // Enhanced floating motion
            const floatX = Math.sin(time * floatSpeed + index * 0.5) * driftRadius;
            const floatY = Math.sin(time * floatSpeed * 0.7 + index * 0.3) * driftRadius;
            const floatZ = Math.cos(time * floatSpeed * 0.5 + index * 0.7) * driftRadius;
            
            spaceObject.position.x += floatX * 0.01;
            spaceObject.position.y += floatY * 0.01;
            spaceObject.position.z += floatZ * 0.01;
            
            // Enhanced rotation patterns by object type
            switch (data.type) {
                case 'satellite':
                    spaceObject.rotation.y += 0.01;
                    spaceObject.rotation.x = Math.sin(time) * 0.2;
                    break;
                case 'spaceStation':
                    spaceObject.rotation.y += 0.003;
                    spaceObject.rotation.z = Math.sin(time * 0.5) * 0.05;
                    break;
                case 'asteroid':
                    spaceObject.rotation.x += 0.008;
                    spaceObject.rotation.y += 0.006;
                    spaceObject.rotation.z += 0.004;
                    break;
                case 'debris':
                    spaceObject.rotation.x += 0.015 * Math.sin(time + index);
                    spaceObject.rotation.y += 0.012;
                    spaceObject.rotation.z += 0.010;
                    break;
            }
            
            // Keep objects within bounds
            if (spaceObject.position.length() > 250) {
                spaceObject.position = spaceObject.position.scale(0.99);
            }
        } catch (animationError) {
            console.warn('Space object animation error for index', index, ':', animationError);
        }
    });
}

// Enhanced comet reset with spectacular spawn patterns
function resetComet(comet, index) {
    // Create more dynamic spawn patterns
    const spawnPattern = Math.random();
    let spawnPosition, targetPoint;
    
    if (spawnPattern < 0.4) {
        // Distant outer rim spawn
        const angle = Math.random() * Math.PI * 2;
        const distance = 200 + Math.random() * 100;
        spawnPosition = new BABYLON.Vector3(
            Math.cos(angle) * distance,
            (Math.random() - 0.5) * 150,
            Math.sin(angle) * distance
        );
        
        // Target inner system
        targetPoint = new BABYLON.Vector3(
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 50
        );
    } else if (spawnPattern < 0.7) {
        // High angle approach
        const distance = 150 + Math.random() * 50;
        spawnPosition = new BABYLON.Vector3(
            (Math.random() - 0.5) * distance,
            100 + Math.random() * 100,
            (Math.random() - 0.5) * distance
        );
        
        // Target lower region
        targetPoint = new BABYLON.Vector3(
            (Math.random() - 0.5) * 40,
            -50 + Math.random() * 30,
            (Math.random() - 0.5) * 40
        );
    } else {
        // Hyperbolic trajectory spawn
        const angle = Math.random() * Math.PI * 2;
        const distance = 180 + Math.random() * 80;
        spawnPosition = new BABYLON.Vector3(
            Math.cos(angle) * distance,
            (Math.random() - 0.5) * 80,
            Math.sin(angle) * distance
        );
        
        // Fast flyby target
        const flybyAngle = angle + Math.PI + (Math.random() - 0.5) * 0.5;
        targetPoint = new BABYLON.Vector3(
            Math.cos(flybyAngle) * 100,
            (Math.random() - 0.5) * 60,
            Math.sin(flybyAngle) * 100
        );
    }
    
    comet.position = spawnPosition;
    
    const data = comet.userData || comet.metadata;
    
    // Calculate enhanced velocity with realistic orbital mechanics
    const direction = targetPoint.subtract(spawnPosition).normalize();
    const baseSpeed = 0.3 + Math.random() * 0.5;
    const velocityVariation = new BABYLON.Vector3(
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15
    );
    
    data.velocity = direction.scale(baseSpeed).add(velocityVariation);
    
    // Enhanced life span based on trajectory and comet type
    const trajectoryLength = spawnPosition.subtract(targetPoint).length();
    data.life = Math.max(500, trajectoryLength * 2.5 + Math.random() * 400);
    data.maxLife = data.life;
    
    // Reset enhanced tail system properties
    if (data.tailSystem) {
        data.tailSystem.emitRate = 150;
        if (data.type) {
            data.tailSystem.color1 = new BABYLON.Color4(
                data.type.emission.r, 
                data.type.emission.g, 
                data.type.emission.b, 
                1
            );
        } else {
            data.tailSystem.color1 = new BABYLON.Color4(0.5, 0.8, 1, 1);
        }
        data.tailSystem.color2 = new BABYLON.Color4(1, 1, 1, 0.8);
    }
    
    // Reset dust tail
    if (data.dustTail) {
        data.dustTail.emitRate = 80;
        data.dustTail.color1.a = 0.6;
        data.dustTail.color2.a = 0.3;
    }
    
    // Reset coma properties
    if (data.coma && data.coma.material) {
        data.coma.material.alpha = 0.4;
        data.coma.scaling.setAll(1);
    }
    
    // Add spectacular spawn effects for comet core
    const cometCore = comet.getChildren().find(child => child.name && child.name.includes('cometCore'));
    if (cometCore && cometCore.material && data.type) {
        cometCore.material.emissiveColor = data.type.emission.clone();
        cometCore.scaling.setAll(1);
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