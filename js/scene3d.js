// 3D Scene Setup and Management - Enhanced Cosmic Animations with Babylon.js
import { createStarField, createGalaxyCore, createPlanets, createNebula, createComets, createSpaceObjects } from './galaxy.js';
import { updateBlackHoleEffects, createEnhancedBlackHole } from './blackhole.js';
import { initCameraEffects, updateCameraEffects } from './camera-effects.js';
import { trackRequestAnimationFrame } from './cleanup.js';

let engine, scene, camera;
export let stars = [];
export let focusOrbs = [];
export let galaxyCore = {};
export let planets = [];
export let comets = [];
export let spaceObjects = [];
let ambientLight, pointLights = [];
let cameraAlpha = 0;
let cameraRadius = 50;
let time = 0;

// Post processing pipeline
let pipeline, glowLayer, lensEffect;

export { scene, engine };

// Check WebGL availability
function checkWebGLSupport() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!gl;
    } catch (e) {
        return false;
    }
}

// Initialize 3D Scene
export function init3D() {
    if (!window.BABYLON) {
        console.error('Babylon.js not loaded');
        return false;
    }

    if (!checkWebGLSupport()) {
        console.error('WebGL not supported');
        return false;
    }

    const canvas = document.getElementById('renderCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return false;
    }

    try {
        // Create Babylon.js engine with enhanced settings
        engine = new BABYLON.Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            antialias: true,
            powerPreference: "high-performance",
            audioEngine: true
        });

        // Enable advanced features
        engine.enableOfflineSupport = false;
        engine.doNotHandleContextLost = false;

        // Create scene with physics
        scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
        
        // Enable fog for depth
        scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        scene.fogColor = new BABYLON.Color3(0, 0.02, 0.04);
        scene.fogDensity = 0.0008;

        // Create camera with smooth animations
        camera = new BABYLON.ArcRotateCamera(
            "camera",
            Math.PI / 4, // alpha
            Math.PI / 3, // beta
            cameraRadius, // radius
            BABYLON.Vector3.Zero(),
            scene
        );
        
        // Camera settings
        camera.minZ = 0.1;
        camera.maxZ = 2000;
        camera.wheelPrecision = 50;
        camera.lowerRadiusLimit = 30;
        camera.upperRadiusLimit = 100;
        camera.lowerBetaLimit = 0.1;
        camera.upperBetaLimit = Math.PI / 2.2;
        
        // Attach camera but disable controls (we'll animate it)
        camera.attachControl(canvas, false);
        camera.inputs.clear();

        // Advanced lighting setup
        setupLighting();

        // Initialize post-processing effects
        setupPostProcessing();

        // Create galaxy elements
        createStarField(scene);
        createNebula(scene);
        createEnhancedBlackHole(scene);
        createPlanets(scene);
        createComets(scene);
        createSpaceObjects(scene);

        // Initialize camera effects
        initCameraEffects(camera, scene);

        // Optimize scene
        scene.autoClear = false;
        scene.autoClearDepthAndStencil = false;
        scene.blockMaterialDirtyMechanism = true;

        // Start render loop
        engine.runRenderLoop(() => {
            animate();
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            engine.resize();
        });

        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                engine.stopRenderLoop();
            } else {
                engine.runRenderLoop(() => {
                    animate();
                });
            }
        });

        return true;
    } catch (error) {
        console.error('Failed to initialize 3D scene:', error);
        if (canvas) {
            canvas.style.display = 'none';
        }
        return false;
    }
}

// Setup enhanced lighting
function setupLighting() {
    // Ambient lighting with HDR
    ambientLight = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.3;
    ambientLight.diffuse = new BABYLON.Color3(0.25, 0.25, 0.4);
    ambientLight.specular = new BABYLON.Color3(0, 0, 0);
    ambientLight.groundColor = new BABYLON.Color3(0.1, 0.1, 0.2);

    // Multiple colored point lights for cosmic effect
    const lightColors = [
        { color: new BABYLON.Color3(0.39, 0.4, 0.95), intensity: 0.8 }, // Purple-blue
        { color: new BABYLON.Color3(0.55, 0.36, 0.96), intensity: 0.8 }, // Purple
        { color: new BABYLON.Color3(0.02, 0.84, 0.63), intensity: 0.8 }  // Cyan
    ];

    lightColors.forEach((lightData, index) => {
        const angle = (index * Math.PI * 2) / 3;
        const light = new BABYLON.PointLight(
            `pointLight${index}`,
            new BABYLON.Vector3(
                Math.cos(angle) * 30,
                10 + index * 5,
                Math.sin(angle) * 30
            ),
            scene
        );
        light.diffuse = lightData.color;
        light.specular = lightData.color;
        light.intensity = lightData.intensity;
        light.range = 150;
        
        // Add light animation
        light.metadata = {
            angle: angle,
            baseY: 10 + index * 5,
            radius: 30
        };
        
        pointLights.push(light);
    });

    // Directional light for shadows
    const shadowLight = new BABYLON.DirectionalLight(
        "shadowLight",
        new BABYLON.Vector3(-1, -2, -1),
        scene
    );
    shadowLight.intensity = 0.3;
    shadowLight.shadowEnabled = true;
    
    // Shadow generator
    const shadowGenerator = new BABYLON.ShadowGenerator(2048, shadowLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurScale = 2;
    shadowGenerator.setDarkness(0.7);
    
    // Store for later use
    scene.shadowGenerator = shadowGenerator;
}

// Setup post-processing effects
function setupPostProcessing() {
    // Default rendering pipeline with HDR
    pipeline = new BABYLON.DefaultRenderingPipeline(
        "defaultPipeline",
        true,
        scene,
        [camera]
    );

    // HDR settings
    pipeline.samples = 4;
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.8;
    pipeline.bloomWeight = 0.6;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = 0.5;

    // Enhanced DOF for cosmic depth
    pipeline.depthOfFieldEnabled = true;
    pipeline.depthOfFieldBlurLevel = BABYLON.DepthOfFieldEffectBlurLevel.Medium;
    pipeline.depthOfField.focalLength = 50;
    pipeline.depthOfField.fStop = 1.4;
    pipeline.depthOfField.focusDistance = 50;

    // Chromatic aberration for cosmic distortion
    pipeline.chromaticAberrationEnabled = true;
    pipeline.chromaticAberration.aberrationAmount = 30;
    pipeline.chromaticAberration.radialIntensity = 0.5;

    // FXAA antialiasing
    pipeline.fxaaEnabled = true;

    // Glow layer for emissive objects
    glowLayer = new BABYLON.GlowLayer("glow", scene, {
        mainTextureFixedSize: 1024,
        blurKernelSize: 64
    });
    glowLayer.intensity = 1.5;

    // Custom lens effects
    const lensRenderingPipeline = new BABYLON.LensRenderingPipeline(
        "lens",
        {
            edge_blur: 1.0,
            chromatic_aberration: 1.0,
            distortion: 0.5,
            dof_focus_distance: 50,
            dof_aperture: 0.5,
            grain_amount: 0.5,
            dof_pentagon: true,
            dof_threshold: 0.5,
            dof_gain: 1.0,
            dof_darken: 0.5
        },
        scene,
        1.0,
        [camera]
    );

    // Store effects for dynamic updates
    scene.postProcessing = { pipeline, glowLayer, lensRenderingPipeline };
}

// Enhanced animation loop
export function animate() {
    if (!scene || !engine) return;
    
    trackRequestAnimationFrame(animate);
    
    const deltaTime = engine.getDeltaTime() / 1000;
    time += deltaTime;

    // Update enhanced black hole effects
    updateBlackHoleEffects(scene, time);

    // Update camera effects
    updateCameraEffects(scene, time);

    // Smooth camera orbit with dynamic movement
    cameraAlpha += 0.001;
    const cameraHeight = 20 + Math.sin(time * 0.1) * 5;
    const dynamicRadius = cameraRadius + Math.sin(time * 0.05) * 5;
    
    camera.alpha = cameraAlpha;
    camera.beta = Math.PI / 3 + Math.sin(time * 0.08) * 0.1;
    camera.radius = dynamicRadius;

    // Animate point lights
    pointLights.forEach((light, index) => {
        const meta = light.metadata;
        const lightTime = time + index * 0.5;
        light.position.x = Math.cos(meta.angle + lightTime * 0.1) * meta.radius;
        light.position.z = Math.sin(meta.angle + lightTime * 0.1) * meta.radius;
        light.position.y = meta.baseY + Math.sin(lightTime * 0.3) * 3;
        light.intensity = 0.8 + Math.sin(lightTime * 0.5) * 0.2;
    });

    // Enhanced planet animations
    planets.forEach((planetData, index) => {
        const planet = planetData.mesh;
        const orbitSpeed = planet.metadata.speed * 0.7;
        
        planet.metadata.angle += orbitSpeed * deltaTime;
        const orbitRadius = planet.metadata.distance + Math.sin(time + index) * 2;
        
        // Elliptical orbit with tilt
        const tilt = planet.metadata.orbitTilt || 0;
        planet.position.x = Math.cos(planet.metadata.angle) * orbitRadius;
        planet.position.z = Math.sin(planet.metadata.angle) * orbitRadius * Math.cos(tilt);
        planet.position.y = Math.sin(planet.metadata.angle) * orbitRadius * Math.sin(tilt);
        
        // Planet rotation
        planet.rotation.y += planet.metadata.rotationSpeed * deltaTime;
        planet.rotation.x = Math.sin(time * 0.5 + index) * 0.1;
        
        // Update shader uniforms if using custom shaders
        if (planet.material && planet.material.metadata && planet.material.metadata.shader) {
            planet.material.metadata.shader.setFloat("time", time);
        }
        
        // Animate moons
        planet.getChildren().forEach((moon, moonIndex) => {
            if (moon.metadata && moon.metadata.angle !== undefined) {
                moon.metadata.angle += moon.metadata.speed * deltaTime;
                moon.position.x = Math.cos(moon.metadata.angle) * moon.metadata.distance;
                moon.position.z = Math.sin(moon.metadata.angle) * moon.metadata.distance;
                moon.position.y = Math.sin(moon.metadata.angle * 3) * 0.5;
                moon.rotation.y += 0.02;
            }
        });
    });

    // Enhanced star field animations
    stars.forEach((starField, index) => {
        starField.isVisible = true;
        
        // Update shader time for twinkling
        if (starField.material && starField.material.metadata && starField.material.metadata.shader) {
            starField.material.metadata.shader.setFloat("time", time);
        }
        
        // Rotation for dynamic feel
        if (starField.metadata && starField.metadata.rotationSpeed) {
            starField.rotation.y += starField.metadata.rotationSpeed * 0.5 * deltaTime;
            starField.rotation.x += starField.metadata.rotationSpeed * 0.3 * deltaTime;
        }
        
        // Nebula drift
        if (starField.metadata && starField.metadata.isNebula) {
            starField.position.x = Math.sin(time * 0.05) * 2;
            starField.position.y = Math.cos(time * 0.07) * 2;
        }
    });

    // Enhanced comet animations
    comets.forEach((comet, index) => {
        if (!comet.metadata) return;
        
        // Curved comet paths
        const curve = Math.sin(time * 0.5 + index) * 0.02;
        comet.metadata.velocity.y += curve;
        
        comet.position.addInPlace(comet.metadata.velocity);
        comet.metadata.life -= deltaTime * 60;
        
        // Smooth opacity fade
        const lifeRatio = Math.max(0, comet.metadata.life / comet.metadata.maxLife);
        const opacity = Math.pow(lifeRatio, 2);
        
        if (comet.material) {
            comet.material.alpha = opacity;
            if (comet.material.emissiveColor) {
                comet.material.emissiveColor = comet.material.emissiveColor.scale(opacity);
            }
        }
        
        // Update tail
        const tail = comet.getChildren()[0];
        if (tail) {
            const direction = comet.metadata.velocity.normalize();
            tail.lookAt(comet.position.subtract(direction.scale(10)));
        }
        
        if (comet.metadata.life <= 0 || comet.position.length() > 200) {
            resetComet(comet, index);
        }
    });

    // Enhanced space object animations
    spaceObjects.forEach((spaceObject, index) => {
        if (!spaceObject.metadata) return;
        
        const floatSpeed = 0.3;
        const driftRadius = 2;
        
        // Smooth floating motion
        const floatX = Math.sin(time * floatSpeed + index * 0.5) * driftRadius;
        const floatY = Math.sin(time * floatSpeed * 0.7 + index * 0.3) * driftRadius;
        const floatZ = Math.cos(time * floatSpeed * 0.5 + index * 0.7) * driftRadius;
        
        spaceObject.position.x += floatX * 0.01;
        spaceObject.position.y += floatY * 0.01;
        spaceObject.position.z += floatZ * 0.01;
        
        // Object-specific rotations
        switch (spaceObject.metadata.type) {
            case 'satellite':
                spaceObject.rotation.y += 0.01;
                spaceObject.rotation.x = Math.sin(time) * 0.2;
                if (spaceObject.metadata.solarPanels) {
                    spaceObject.metadata.solarPanels.rotation.y = Math.sin(time * 0.5) * 0.3;
                }
                break;
            case 'spaceStation':
                spaceObject.rotation.y += 0.003;
                spaceObject.rotation.z = Math.sin(time * 0.5) * 0.05;
                // Animate rotating sections
                if (spaceObject.metadata.rotatingSection) {
                    spaceObject.metadata.rotatingSection.rotation.x += 0.02;
                }
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
            spaceObject.position.scaleInPlace(0.99);
        }
    });

    // Update post-processing based on mode
    updatePostProcessingEffects();

    // Render scene
    scene.render();
}

// Update post-processing effects dynamically
function updatePostProcessingEffects() {
    if (!scene.postProcessing) return;
    
    const { pipeline, glowLayer } = scene.postProcessing;
    
    // Dynamic bloom based on scene activity
    const bloomIntensity = 0.6 + Math.sin(time * 0.1) * 0.1;
    pipeline.bloomWeight = bloomIntensity;
    
    // Adjust DOF based on camera distance
    pipeline.depthOfField.focusDistance = camera.radius;
    
    // Pulsing glow effect
    glowLayer.intensity = 1.5 + Math.sin(time * 0.5) * 0.3;
}

// Reset comet with smooth transition
function resetComet(comet, index) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 150 + Math.random() * 50;
    
    comet.position = new BABYLON.Vector3(
        Math.cos(angle) * distance,
        (Math.random() - 0.5) * 100,
        Math.sin(angle) * distance
    );
    
    // Velocity towards center with variation
    const targetPoint = new BABYLON.Vector3(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30
    );
    
    comet.metadata.velocity = targetPoint.subtract(comet.position).normalize().scale(0.3 + Math.random() * 0.2);
    comet.metadata.life = 500 + Math.random() * 500;
    comet.metadata.maxLife = comet.metadata.life;
}

// Cleanup function
export function dispose3DScene() {
    if (scene) {
        scene.dispose();
    }
    if (engine) {
        engine.dispose();
    }
}