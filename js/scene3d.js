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

// Enhanced lighting setup
function setupLighting() {
    // Ambient light for base illumination
    ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.4;
    ambientLight.diffuse = new BABYLON.Color3(0.4, 0.4, 0.6);
    ambientLight.groundColor = new BABYLON.Color3(0.1, 0.1, 0.2);

    // Multiple point lights for dramatic cosmic lighting
    const lightConfigs = [
        { color: new BABYLON.Color3(0.4, 0.4, 1), position: new BABYLON.Vector3(30, 10, 30), intensity: 0.8 },
        { color: new BABYLON.Color3(0.6, 0.4, 1), position: new BABYLON.Vector3(-30, 15, -30), intensity: 0.7 },
        { color: new BABYLON.Color3(0.2, 0.8, 0.6), position: new BABYLON.Vector3(0, 25, 0), intensity: 0.6 }
    ];

    lightConfigs.forEach((config, index) => {
        const light = new BABYLON.PointLight(`pointLight${index}`, config.position, scene);
        light.diffuse = config.color;
        light.specular = config.color;
        light.intensity = config.intensity;
        light.range = 150;
        
        // Animate lights for dynamic atmosphere
        scene.registerBeforeRender(() => {
            const time = performance.now() * 0.001;
            light.intensity = config.intensity + Math.sin(time + index) * 0.2;
            
            // Subtle light movement
            light.position.x = config.position.x + Math.sin(time * 0.5 + index) * 5;
            light.position.y = config.position.y + Math.cos(time * 0.3 + index) * 3;
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
        // Create a simple test sphere to ensure rendering works
        const testSphere = BABYLON.MeshBuilder.CreateSphere("testSphere", {diameter: 4, segments: 32}, scene);
        testSphere.position = new BABYLON.Vector3(0, 0, 0);
        const testMaterial = new BABYLON.StandardMaterial("testMat", scene);
        testMaterial.diffuseColor = new BABYLON.Color3(1, 0.2, 0.2);
        testMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.1, 0.1);
        testMaterial.specularColor = new BABYLON.Color3(1, 0, 0);
        testSphere.material = testMaterial;
        console.log('Test sphere created');
        
        // Create galaxy elements in order
        createStarField();
        console.log('Star field creation completed');
        
        createNebula();
        console.log('Nebula creation completed');
        
        createEnhancedBlackHole();
        console.log('Black hole creation completed');
        
        createPlanets();
        console.log('Planets creation completed');
        
        createComets();
        console.log('Comets creation completed');
        
        createSpaceObjects();
        console.log('Space objects creation completed');
        
    } catch (error) {
        console.error('Error creating galaxy elements:', error);
        
        // Create minimal fallback scene
        const fallbackSphere = BABYLON.MeshBuilder.CreateSphere("fallback", {diameter: 10}, scene);
        fallbackSphere.position = new BABYLON.Vector3(0, 0, 0);
        const fallbackMaterial = new BABYLON.StandardMaterial("fallbackMat", scene);
        fallbackMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.5, 1);
        fallbackMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.5);
        fallbackSphere.material = fallbackMaterial;
        console.log('Fallback scene created');
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
            updatePlanetAnimations();
            updateStarAnimations();
            updateCometAnimations();
            updateSpaceObjectAnimations();
            
            // Animate nebula background
            const nebulaBackground = scene.getMeshByName("nebulaBackground");
            if (nebulaBackground && nebulaBackground.userData) {
                nebulaBackground.rotation.y += nebulaBackground.userData.rotationSpeed;
                
                // Dynamic nebula breathing effect
                if (nebulaBackground.material) {
                    const breathe = 0.3 + Math.sin(time * 0.5) * 0.1;
                    nebulaBackground.material.alpha = breathe;
                    
                    // Simple color variation
                    const colorVariation = Math.sin(time * 0.2) * 0.05;
                    nebulaBackground.material.emissiveColor = new BABYLON.Color3(
                        0.1 + colorVariation,
                        0.1 + colorVariation * 0.5,
                        0.2 + colorVariation * 0.3
                    );
                }
            }
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
            // Enhanced orbital mechanics with Kepler's laws
            planet.userData.angle += planet.userData.speed * 0.7;
            
            // Elliptical orbit calculations
            const eccentricity = planet.userData.eccentricity;
            const baseDistance = planet.userData.distance;
            const meanAnomaly = planet.userData.angle;
            
            // Calculate eccentric anomaly (simplified)
            const eccentricAnomaly = meanAnomaly + eccentricity * Math.sin(meanAnomaly);
            const trueAnomaly = 2 * Math.atan(Math.sqrt((1 + eccentricity) / (1 - eccentricity)) * Math.tan(eccentricAnomaly / 2));
            
            // Calculate orbital radius
            const orbitRadius = baseDistance * (1 - eccentricity * eccentricity) / (1 + eccentricity * Math.cos(trueAnomaly));
            
            // Apply orbital inclination
            const inclinedY = Math.sin(planet.userData.inclination) * orbitRadius * 0.3;
            
            // Smooth orbital positioning with realistic physics
            const targetX = Math.cos(trueAnomaly) * orbitRadius;
            const targetZ = Math.sin(trueAnomaly) * orbitRadius;
            const targetY = inclinedY + Math.sin(time * 0.2 + index) * 0.5; // Small vertical oscillation
            
            // Smooth interpolation to target position
            planet.position.x = BABYLON.Scalar.Lerp(planet.position.x, targetX, 0.03);
            planet.position.z = BABYLON.Scalar.Lerp(planet.position.z, targetZ, 0.03);
            planet.position.y = BABYLON.Scalar.Lerp(planet.position.y, targetY, 0.02);
            
            // Enhanced planetary rotation with axial tilt
            planet.rotation.y += planet.userData.rotationSpeed;
            planet.rotation.x = planet.userData.axialTilt + Math.sin(time * 0.5 + index) * 0.05;
            planet.rotation.z = Math.sin(time * 0.3 + index) * 0.02;
            
            // Subtle size pulsing for gas giants
            if (config.size > 3) {
                const pulseFactor = 1 + Math.sin(time * 0.8 + planet.userData.pulsePhase) * 0.02;
                planet.scaling.setAll(pulseFactor);
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
                
                if (userData && userData.isNebula) {
                    // Enhanced nebula breathing and swaying
                    const breathingFactor = 1 + Math.sin(time * userData.breathingSpeed) * 0.1;
                    const swayX = Math.sin(time * 0.05 + index) * 3;
                    const swayY = Math.cos(time * 0.07 + index) * 2;
                    
                    if (starField.emitter) {
                        starField.emitter.position.x += swayX * 0.01;
                        starField.emitter.position.y += swayY * 0.01;
                        starField.emitter.rotation.z += userData.rotationSpeed;
                    }
                    
                    // Dynamic nebula particle animations
                    const particles = starField.particles;
                    particles.forEach((particle, particleIndex) => {
                        if (!particle || !particle.userData) return;
                        
                        const data = particle.userData;
                        
                        // Breathing effect
                        particle.size = data.baseSize * breathingFactor;
                        
                        // Swaying motion
                        const swayOffset = Math.sin(time * data.swaySpeed + data.swayPhase + particleIndex * 0.1) * 2;
                        particle.position.x = data.originalPosition.x + swayOffset;
                        particle.position.y = data.originalPosition.y + Math.cos(time * data.swaySpeed * 0.7 + data.swayPhase) * 1;
                        
                        // Color pulsing
                        const colorPulse = 0.8 + Math.sin(time * data.pulseSpeed + particleIndex * 0.2) * 0.2;
                        particle.color.a = particle.color.a * colorPulse;
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
            const gravitationalPull = Math.max(0, 100 - distanceToCenter) * 0.0001;
            const curve = Math.sin(time * 0.5 + index) * 0.02;
            
            if (data.velocity && data.velocity.y !== undefined) {
                // Apply gravitational acceleration toward center
                const centerDirection = comet.position.normalize().scale(-1);
                data.velocity = data.velocity.add(centerDirection.scale(gravitationalPull));
                
                // Add orbital curve
                data.velocity.y += curve;
                
                // Velocity dampening for realistic physics
                data.velocity = data.velocity.scale(0.999);
            }
            
            // Smooth position updates with acceleration
            if (data.velocity) {
                comet.position = comet.position.add(data.velocity);
            }
            data.life--;
            
            // Enhanced opacity fade with smooth transitions
            const lifeFactor = data.life / data.maxLife;
            const opacity = Math.pow(lifeFactor, 1.5);
            
            // Update comet head brightness
            const cometHead = comet.getChildren().find(child => child.name && child.name.includes('cometHead'));
            if (cometHead && cometHead.material) {
                const baseIntensity = 0.5;
                const pulseIntensity = baseIntensity + Math.sin(time * 2 + index) * 0.3;
                cometHead.material.emissiveColor = new BABYLON.Color3(
                    pulseIntensity * opacity,
                    pulseIntensity * opacity,
                    0.8 * pulseIntensity * opacity
                );
            }
            
            // Enhanced tail particle effects
            if (data.tailSystem) {
                data.tailSystem.emitRate = Math.max(50, 200 * opacity);
                
                // Dynamic tail direction based on velocity
                if (data.velocity) {
                    const normalizedVel = data.velocity.normalize();
                    data.tailSystem.direction1 = normalizedVel.scale(-2);
                    data.tailSystem.direction2 = normalizedVel.scale(-4);
                    
                    // Tail particle speed based on comet velocity
                    const speed = data.velocity.length();
                    data.tailSystem.minEmitPower = Math.max(1, speed * 2);
                    data.tailSystem.maxEmitPower = Math.max(3, speed * 4);
                }
                
                // Spectacular color variations based on speed and position
                const speed = data.velocity ? data.velocity.length() : 1;
                const heatFactor = Math.min(speed * 10, 1);
                
                data.tailSystem.color1 = new BABYLON.Color4(
                    0.5 + heatFactor * 0.5,
                    0.8,
                    1 - heatFactor * 0.3,
                    opacity
                );
                data.tailSystem.color2 = new BABYLON.Color4(
                    1,
                    1 - heatFactor * 0.2,
                    1 - heatFactor * 0.5,
                    opacity * 0.8
                );
            }
            
            // Comet rotation based on velocity
            if (data.velocity) {
                const rotationSpeed = data.velocity.length() * 0.1;
                comet.rotation.x += rotationSpeed * 0.02;
                comet.rotation.y += rotationSpeed * 0.015;
                comet.rotation.z += rotationSpeed * 0.01;
            }
            
            // Reset comet when needed with enhanced spawn logic
            if (data.life <= 0 || comet.position.length() > 250) {
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
    const baseSpeed = 0.4 + Math.random() * 0.6;
    const velocityVariation = new BABYLON.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
    );
    
    data.velocity = direction.scale(baseSpeed).add(velocityVariation);
    
    // Enhanced life span based on trajectory
    const trajectoryLength = spawnPosition.subtract(targetPoint).length();
    data.life = Math.max(400, trajectoryLength * 2 + Math.random() * 300);
    data.maxLife = data.life;
    
    // Reset tail system properties
    if (data.tailSystem) {
        data.tailSystem.emitRate = 100;
        data.tailSystem.color1 = new BABYLON.Color4(0.5, 0.8, 1, 1);
        data.tailSystem.color2 = new BABYLON.Color4(1, 1, 1, 1);
    }
    
    // Add subtle spawn effects
    const cometHead = comet.getChildren().find(child => child.name && child.name.includes('cometHead'));
    if (cometHead && cometHead.material) {
        cometHead.material.emissiveColor = new BABYLON.Color3(0.8, 0.8, 1);
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