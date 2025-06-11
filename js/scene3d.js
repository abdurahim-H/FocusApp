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

            // Camera orbital motion
            cameraRotation += 0.001;
            
            const cameraRadius = 50;
            const cameraHeight = 20 + Math.sin(time * 0.1) * 5;
            
            const targetPosition = new BABYLON.Vector3(
                Math.sin(cameraRotation) * cameraRadius,
                cameraHeight,
                Math.cos(cameraRotation) * cameraRadius
            );
            
            // Smooth camera positioning
            camera.position = BABYLON.Vector3.Lerp(camera.position, targetPosition, 0.02);
            camera.setTarget(cameraTarget);

            // Update animations
            updatePlanetAnimations();
            updateStarAnimations();
            updateCometAnimations();
            updateSpaceObjectAnimations();
        });
    }
}

// Planet animations
function updatePlanetAnimations() {
    planets.forEach((planetData, index) => {
        if (!planetData || !planetData.mesh) return;
        
        const planet = planetData.mesh;
        const time = performance.now() * 0.001;
        
        if (planet.userData) {
            planet.userData.angle += planet.userData.speed * 0.7;
            const orbitRadius = planet.userData.distance + Math.sin(time + index) * 2;
            
            // Smooth orbital positioning
            const targetX = Math.cos(planet.userData.angle) * orbitRadius;
            const targetZ = Math.sin(planet.userData.angle) * orbitRadius;
            
            planet.position.x = BABYLON.Scalar.Lerp(planet.position.x, targetX, 0.05);
            planet.position.z = BABYLON.Scalar.Lerp(planet.position.z, targetZ, 0.05);
            
            // Enhanced rotation
            planet.rotation.y += planet.userData.rotationSpeed;
            planet.rotation.x = Math.sin(time * 0.5 + index) * 0.1;
            
            // Animate moons
            if (planet.getChildren) {
                planet.getChildren().forEach((moon, moonIndex) => {
                    if (moon.userData && moon.userData.angle !== undefined) {
                        moon.userData.angle += moon.userData.speed;
                        moon.position.x = Math.cos(moon.userData.angle) * moon.userData.distance;
                        moon.position.z = Math.sin(moon.userData.angle) * moon.userData.distance;
                        moon.position.y = Math.sin(moon.userData.angle * 3) * 0.5;
                    }
                });
            }
        }
    });
}

// Star animations
function updateStarAnimations() {
    if (stars.length === 0) return;
    
    stars.forEach((starField, index) => {
        if (!starField || typeof starField !== 'object') return;
        if (starField.isDisposed && starField.isDisposed()) return;
        
        try {
            // Handle ParticleSystem objects
            if (starField instanceof BABYLON.ParticleSystem) {
                // Update particle system properties
                if (starField.emitter && starField.emitter.position) {
                    // Subtle movement for nebula particle systems
                    if (starField.userData && starField.userData.isNebula) {
                        starField.emitter.position.x = Math.sin(time * 0.05) * 2;
                        starField.emitter.position.y = Math.cos(time * 0.07) * 2;
                    }
                }
                
                // Update particle colors for twinkling effect
                if (starField.userData && starField.userData.isMainStarField) {
                    const twinkle = Math.sin(time * 2) * 0.1 + 0.9;
                    starField.color1 = new BABYLON.Color4(twinkle, twinkle, 1, 1);
                }
            } else {
                // Handle mesh objects
                if (!starField.position) {
                    return;
                }
                
                // Ensure mesh stars are visible
                starField.isVisible = true;
                
                // Update shader uniforms for twinkling
                if (starField.material && starField.material.getEffect) {
                    starField.material.setFloat("time", time);
                }
                
                // Subtle rotation for cosmic movement
                if (starField.userData && starField.userData.rotationSpeed && starField.rotation) {
                    starField.rotation.y += starField.userData.rotationSpeed * 0.5;
                    starField.rotation.x += starField.userData.rotationSpeed * 0.3;
                }
            }
        } catch (animationError) {
            console.warn('Star animation error for index', index, ':', animationError);
        }
    });
}

// Comet animations
function updateCometAnimations() {
    comets.forEach((comet, index) => {
        if (!comet || typeof comet !== 'object') return;
        if (comet.isDisposed && comet.isDisposed()) return;
        
        // Handle both userData and metadata properties
        const data = comet.userData || comet.metadata;
        if (!data || !comet.position) return;
        
        try {
            // Enhanced curved trajectory physics
            const curve = Math.sin(time * 0.5 + index) * 0.02;
            if (data.velocity && data.velocity.y !== undefined) {
                data.velocity.y += curve;
            }
            
            // Smooth position updates
            if (data.velocity) {
                comet.position = comet.position.add(data.velocity);
            }
            data.life--;
            
            // Enhanced opacity fade with smooth transitions
            const opacity = Math.pow(data.life / data.maxLife, 2);
            if (data.tailMaterial) {
                data.tailMaterial.setFloat("opacity", opacity);
                data.tailMaterial.setFloat("time", time);
            }
            
            // Reset comet when needed
            if (data.life <= 0 || comet.position.length() > 200) {
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

// Reset comet position and velocity
function resetComet(comet, index) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 150 + Math.random() * 50;
    
    comet.position = new BABYLON.Vector3(
        Math.cos(angle) * distance,
        (Math.random() - 0.5) * 100,
        Math.sin(angle) * distance
    );
    
    const targetPoint = new BABYLON.Vector3(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30
    );
    
    const data = comet.userData || comet.metadata;
    data.velocity = targetPoint.subtract(comet.position).normalize().scale(0.3 + Math.random() * 0.2);
    data.life = 500 + Math.random() * 500;
    data.maxLife = data.life;
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