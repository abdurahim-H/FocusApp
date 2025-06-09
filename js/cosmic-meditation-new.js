// Cosmic Meditation System - Revolutionary Ambient Mode
// Creates an interactive meditation journey with personal galaxy garden
// Fully reimplemented with Babylon.js

import { scene } from './scene3d.js';
import { appState } from './state.js';
import { trackRequestAnimationFrame, trackSetInterval } from './cleanup.js';
import { trackBabylonMesh, trackBabylonMaterial, trackBabylonTexture, trackBabylonParticleSystem } from './cleanup.js';

export class CosmicMeditationSystem {
    constructor() {
        this.meditationSpace = null; // Will be created as Babylon TransformNode
        this.userGalaxy = [];
        this.breathingParticles = null;
        this.soundVisualizers = new Map();
        this.journeyPath = null;
        this.calmnessMeter = 0;
        this.meditationTime = 0;
        this.breathPhase = 0;
        this.breathingPattern = '4-7-8';
        this.isActive = false;
        this.currentJourney = null;
        this.environmentMaterial = null;
        this.auroras = [];
        this.cosmicRays = [];
        this.startTime = null;
        this.breathInterval = null;

        this.meditationScene = null;
        this.meditationEngine = null;
        this.meditationCanvas = null;
        this.breathingOrb = null;
        this.energyField = [];
        this.meditationCamera = null;
        this.cosmicParticles = [];
        this.journeyPaths = {};
        this.reachedMilestones = [];
    }

    initialize() {
        // Create personal meditation space with Babylon.js
        if (scene) {
            this.meditationSpace = new BABYLON.TransformNode("meditationSpace", scene);
            this.createMeditationEnvironment();
            this.initializeBreathingSystem();
            this.setupSoundVisualizers();
            this.createJourneyPaths();
            this.createAuroraEffects();
            this.createCosmicRays();
            
            // Initially hide meditation space
            this.meditationSpace.setEnabled(false);
        }

        const ambientMode = document.getElementById('ambient');
        if (!ambientMode || !window.BABYLON) return;
    
        // Create or get canvas for meditation
        this.meditationCanvas = document.getElementById('meditationCanvas');
        if (!this.meditationCanvas) {
            this.meditationCanvas = document.createElement('canvas');
            this.meditationCanvas.id = 'meditationCanvas';
            this.meditationCanvas.style.position = 'absolute';
            this.meditationCanvas.style.top = '50%';
            this.meditationCanvas.style.left = '50%';
            this.meditationCanvas.style.transform = 'translate(-50%, -50%)';
            this.meditationCanvas.style.width = '400px';
            this.meditationCanvas.style.height = '400px';
            this.meditationCanvas.style.borderRadius = '50%';
            this.meditationCanvas.style.zIndex = '5';
            ambientMode.querySelector('.ambient-content').appendChild(this.meditationCanvas);
        }
    
        // Initialize Babylon.js engine
        this.meditationEngine = new BABYLON.Engine(this.meditationCanvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            antialias: true
        });
    
        this.meditationScene = new BABYLON.Scene(this.meditationEngine);
        this.meditationScene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    
        // Create camera
        this.meditationCamera = new BABYLON.ArcRotateCamera(
            "meditationCamera",
            0,
            Math.PI / 2,
            10,
            BABYLON.Vector3.Zero(),
            this.meditationScene
        );
        this.meditationCamera.setTarget(BABYLON.Vector3.Zero());
    
        // Create lighting
        const ambientLight = new BABYLON.HemisphericLight(
            "ambientLight",
            new BABYLON.Vector3(0, 1, 0),
            this.meditationScene
        );
        ambientLight.intensity = 0.7;
        ambientLight.diffuse = new BABYLON.Color3(0.5, 0.5, 0.8);
    
        // Create breathing orb
        this.createBreathingOrb();
    
        // Create energy field
        this.createEnergyField();
    
        // Create cosmic particles
        this.createCosmicParticles();
    
        // Start render loop
        this.meditationEngine.runRenderLoop(() => {
            if (this.meditationScene) {
                this.updateMeditation();
                this.meditationScene.render();
            }
        });
    
        // Handle resize
        window.addEventListener('resize', () => {
            this.meditationEngine.resize();
        });
    }

    createMeditationEnvironment() {
        if (!scene) return;
        
        // Create a serene cosmic environment sphere
        const environment = BABYLON.MeshBuilder.CreateSphere("meditationEnvironment", {
            diameter: 200,
            segments: 64
        }, scene);
        
        // Create custom shader for environment
        BABYLON.Effect.ShadersStore["meditationEnvironmentVertexShader"] = `
            precision highp float;
            
            attribute vec3 position;
            attribute vec3 normal;
            attribute vec2 uv;
            
            uniform mat4 worldViewProjection;
            uniform float time;
            
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec2 vUV;
            
            void main() {
                vPosition = position;
                vNormal = normal;
                vUV = uv;
                gl_Position = worldViewProjection * vec4(position, 1.0);
            }
        `;
        
        BABYLON.Effect.ShadersStore["meditationEnvironmentFragmentShader"] = `
            precision highp float;
            
            uniform float time;
            uniform float calmness;
            uniform vec3 innerColor;
            uniform vec3 outerColor;
            uniform float journeyType;
            
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec2 vUV;
            
            void main() {
                // Create ethereal gradient based on calmness
                float depth = length(vPosition) / 100.0;
                vec3 color = mix(innerColor, outerColor, depth);
                
                // Add subtle aurora effect
                float aurora = sin(vPosition.y * 0.1 + time * 0.5) * 0.5 + 0.5;
                aurora *= calmness;
                
                // Journey-specific colors
                vec3 journeyColor = vec3(0.1, 0.3, 0.5);
                if (journeyType > 0.5 && journeyType < 1.5) {
                    // Tranquility - soft blues and greens
                    journeyColor = vec3(0.1, 0.4, 0.6);
                } else if (journeyType > 1.5 && journeyType < 2.5) {
                    // Focus - deep purples
                    journeyColor = vec3(0.3, 0.1, 0.5);
                } else if (journeyType > 2.5) {
                    // Energy - vibrant oranges
                    journeyColor = vec3(0.6, 0.3, 0.1);
                }
                
                color += journeyColor * aurora * 0.3;
                
                // Breathing glow
                float breathGlow = sin(time * 0.3) * 0.5 + 0.5;
                color += vec3(0.05, 0.1, 0.2) * breathGlow * calmness;
                
                // Add star field effect
                float stars = smoothstep(0.97, 0.98, sin(vUV.x * 200.0) * sin(vUV.y * 200.0));
                color += vec3(1.0) * stars * 0.5;
                
                gl_FragColor = vec4(color, 0.95);
            }
        `;
        
        this.environmentMaterial = new BABYLON.ShaderMaterial("meditationEnvironmentMaterial", scene, {
            vertex: "meditationEnvironment",
            fragment: "meditationEnvironment",
        }, {
            attributes: ["position", "normal", "uv"],
            uniforms: ["worldViewProjection", "time", "calmness", "innerColor", "outerColor", "journeyType"],
            needAlphaBlending: true
        });
        
        this.environmentMaterial.setFloat("time", 0);
        this.environmentMaterial.setFloat("calmness", 0);
        this.environmentMaterial.setFloat("journeyType", 0);
        this.environmentMaterial.setColor3("innerColor", new BABYLON.Color3(0.04, 0.04, 0.18));
        this.environmentMaterial.setColor3("outerColor", new BABYLON.Color3(0.0, 0.02, 0.05));
        this.environmentMaterial.backFaceCulling = false;
        
        environment.material = this.environmentMaterial;
        environment.parent = this.meditationSpace;
        
        trackBabylonMesh(environment);
        trackBabylonMaterial(this.environmentMaterial);
    }

    initializeBreathingSystem() {
        if (!scene) return;
        
        // Create particle system that responds to breathing
        this.breathingParticles = new BABYLON.ParticleSystem("breathingParticles", 5000, scene);
        this.breathingParticles.particleTexture = new BABYLON.Texture("https://raw.githubusercontent.com/BabylonJS/Babylon.js/master/assets/textures/flare.png", scene);
        
        // Create emitter
        const emitter = BABYLON.MeshBuilder.CreateBox("breathingEmitter", { size: 0.1 }, scene);
        emitter.isVisible = false;
        emitter.parent = this.meditationSpace;
        this.breathingParticles.emitter = emitter;
        
        // Emit from sphere around user
        this.breathingParticles.createSphereEmitter(20, 1);
        
        // Colors
        this.breathingParticles.color1 = new BABYLON.Color4(0.3, 0.6, 1.0, 1);
        this.breathingParticles.color2 = new BABYLON.Color4(1.0, 0.4, 0.3, 1);
        this.breathingParticles.colorDead = new BABYLON.Color4(0.3, 0.6, 1.0, 0);
        
        // Size
        this.breathingParticles.minSize = 0.5;
        this.breathingParticles.maxSize = 2;
        
        // Life time
        this.breathingParticles.minLifeTime = 2;
        this.breathingParticles.maxLifeTime = 4;
        
        // Emission
        this.breathingParticles.emitRate = 50;
        
        // Speed
        this.breathingParticles.minEmitPower = 0.1;
        this.breathingParticles.maxEmitPower = 0.3;
        this.breathingParticles.updateSpeed = 0.02;
        
        // Blending
        this.breathingParticles.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        // Custom update function for breathing effect
        this.breathingParticles.updateFunction = (particles) => {
            const time = Date.now() * 0.001;
            for (let index = 0; index < particles.length; index++) {
                const particle = particles[index];
                if (particle.age >= 0) {
                    // Breathing movement
                    const breathScale = 1.0 + Math.sin(this.breathPhase) * 0.3;
                    particle.size = particle._initialSize * breathScale;
                    
                    // Orbital movement
                    const angle = time * 0.1 + particle.age * 6.28;
                    particle.position.x += Math.cos(angle) * 0.02;
                    particle.position.z += Math.sin(angle) * 0.02;
                    
                    // Vertical float
                    particle.position.y += Math.sin(time + particle.age * 10) * 0.02;
                }
            }
        };
        
        this.breathingParticles.start();
        
        trackBabylonParticleSystem(this.breathingParticles);
    }

    createAuroraEffects() {
        if (!scene) return;
        
        // Create multiple aurora ribbons
        for (let i = 0; i < 3; i++) {
            const aurora = BABYLON.MeshBuilder.CreateGround(`aurora${i}`, {
                width: 80,
                height: 20,
                subdivisions: 40
            }, scene);
            
            // Create custom shader for aurora
            BABYLON.Effect.ShadersStore[`aurora${i}VertexShader`] = `
                precision highp float;
                
                attribute vec3 position;
                attribute vec2 uv;
                
                uniform mat4 worldViewProjection;
                uniform float time;
                uniform float offset;
                
                varying vec2 vUV;
                varying float vY;
                
                void main() {
                    vUV = uv;
                    vec3 pos = position;
                    
                    // Wave motion
                    float wave = sin(pos.x * 0.1 + time * 0.5 + offset) * 5.0;
                    wave += sin(pos.x * 0.05 + time * 0.3) * 3.0;
                    pos.y += wave;
                    
                    vY = pos.y;
                    
                    gl_Position = worldViewProjection * vec4(pos, 1.0);
                }
            `;
            
            BABYLON.Effect.ShadersStore[`aurora${i}FragmentShader`] = `
                precision highp float;
                
                uniform float time;
                uniform float calmness;
                uniform vec3 color1;
                uniform vec3 color2;
                
                varying vec2 vUV;
                varying float vY;
                
                void main() {
                    // Gradient based on height
                    vec3 color = mix(color1, color2, sin(vY * 0.1 + time) * 0.5 + 0.5);
                    
                    // Edge fade
                    float alpha = 1.0 - abs(vUV.x - 0.5) * 2.0;
                    alpha *= 1.0 - abs(vUV.y - 0.5) * 2.0;
                    alpha *= calmness * 0.4;
                    
                    // Shimmer
                    float shimmer = sin(vUV.x * 50.0 + time * 3.0) * sin(vUV.y * 30.0 - time * 2.0);
                    alpha += shimmer * 0.05;
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `;
            
            const auroraMaterial = new BABYLON.ShaderMaterial(`auroraMaterial${i}`, scene, {
                vertex: `aurora${i}`,
                fragment: `aurora${i}`,
            }, {
                attributes: ["position", "uv"],
                uniforms: ["worldViewProjection", "time", "offset", "calmness", "color1", "color2"],
                needAlphaBlending: true
            });
            
            auroraMaterial.setFloat("time", 0);
            auroraMaterial.setFloat("offset", i * 2.1);
            auroraMaterial.setFloat("calmness", 0);
            auroraMaterial.setColor3("color1", new BABYLON.Color3(0, 1, 0.53));
            auroraMaterial.setColor3("color2", new BABYLON.Color3(0, 0.53, 1));
            auroraMaterial.backFaceCulling = false;
            
            aurora.material = auroraMaterial;
            aurora.position.y = 40 + i * 10;
            aurora.rotation.x = -Math.PI / 4;
            aurora.parent = this.meditationSpace;
            
            this.auroras.push({ mesh: aurora, material: auroraMaterial });
            
            trackBabylonMesh(aurora);
            trackBabylonMaterial(auroraMaterial);
        }
    }

    createCosmicRays() {
        if (!scene) return;
        
        // Create light rays emanating from center
        const rayCount = 20;
        for (let i = 0; i < rayCount; i++) {
            const ray = BABYLON.MeshBuilder.CreateCylinder(`cosmicRay${i}`, {
                diameterTop: 0.1,
                diameterBottom: 2,
                height: 50,
                tessellation: 8
            }, scene);
            
            const rayMaterial = new BABYLON.StandardMaterial(`cosmicRayMat${i}`, scene);
            rayMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.8, 1);
            rayMaterial.alpha = 0.3;
            rayMaterial.backFaceCulling = false;
            
            ray.material = rayMaterial;
            const angle = (i / rayCount) * Math.PI * 2;
            ray.position.set(Math.cos(angle) * 10, 0, Math.sin(angle) * 10);
            ray.rotation.z = Math.PI / 6 * (Math.random() - 0.5);
            ray.rotation.x = angle;
            ray.parent = this.meditationSpace;
            
            this.cosmicRays.push({ mesh: ray, material: rayMaterial });
            
            trackBabylonMesh(ray);
            trackBabylonMaterial(rayMaterial);
        }
    }

    createBreathingOrb() {
        // Create main orb
        this.breathingOrb = BABYLON.MeshBuilder.CreateSphere("breathingOrb", {
            diameter: 3,
            segments: 64
        }, this.meditationScene);
        
        // Create custom shader for the orb
        BABYLON.Effect.ShadersStore["breathingOrbVertexShader"] = `
            precision highp float;
            
            attribute vec3 position;
            attribute vec3 normal;
            attribute vec2 uv;
            
            uniform mat4 worldViewProjection;
            uniform float time;
            uniform float breathPhase;
            
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec2 vUV;
            varying float vBreathIntensity;
            
            void main() {
                vPosition = position;
                vNormal = normal;
                vUV = uv;
                
                // Calculate breathing scale
                float breathScale = 1.0 + sin(breathPhase) * 0.2;
                vec3 scaledPosition = position * breathScale;
                
                // Add wave distortion
                float wave = sin(position.y * 3.0 + time) * 0.05;
                scaledPosition += normal * wave;
                
                vBreathIntensity = breathScale;
                
                gl_Position = worldViewProjection * vec4(scaledPosition, 1.0);
            }
        `;
        
        BABYLON.Effect.ShadersStore["breathingOrbFragmentShader"] = `
            precision highp float;
            
            uniform float time;
            uniform vec3 calmColor;
            uniform vec3 energyColor;
            uniform float meditationLevel;
            uniform vec3 cameraPosition;
            
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec2 vUV;
            varying float vBreathIntensity;
            
            void main() {
                // Create energy flow pattern
                float flow = sin(vUV.x * 10.0 + time * 2.0) * sin(vUV.y * 10.0 - time * 1.5);
                flow = smoothstep(0.0, 1.0, flow + 0.5);
                
                // Mix colors based on meditation level
                vec3 color = mix(calmColor, energyColor, meditationLevel);
                color += flow * 0.2;
                
                // Add breathing glow
                float glow = pow(vBreathIntensity, 2.0);
                color *= glow;
                
                // Fresnel effect for edge glow
                vec3 viewDirection = normalize(cameraPosition - vPosition);
                float fresnel = 1.0 - abs(dot(viewDirection, normalize(vNormal)));
                color += pow(fresnel, 2.0) * energyColor * 0.5;
                
                gl_FragColor = vec4(color, 0.8);
            }
        `;
        
        const orbMaterial = new BABYLON.ShaderMaterial("breathingOrbMaterial", this.meditationScene, {
            vertex: "breathingOrb",
            fragment: "breathingOrb",
        }, {
            attributes: ["position", "normal", "uv"],
            uniforms: ["worldViewProjection", "time", "breathPhase", "cameraPosition", "calmColor", "energyColor", "meditationLevel"],
            needAlphaBlending: true
        });
        
        orbMaterial.setFloat("time", 0);
        orbMaterial.setFloat("breathPhase", 0);
        orbMaterial.setFloat("meditationLevel", 0);
        orbMaterial.setColor3("calmColor", new BABYLON.Color3(0.4, 0.6, 1.0));
        orbMaterial.setColor3("energyColor", new BABYLON.Color3(1.0, 0.5, 0.8));
        orbMaterial.backFaceCulling = false;
        
        this.breathingOrb.material = orbMaterial;
        this.breathingOrb.metadata = { material: orbMaterial };
        
        trackBabylonMesh(this.breathingOrb);
        trackBabylonMaterial(orbMaterial);
    }

    createEnergyField() {
        // Create multiple energy rings around the orb
        const ringCount = 5;
    
        for (let i = 0; i < ringCount; i++) {
            const ring = BABYLON.MeshBuilder.CreateTorus(`energyRing${i}`, {
                diameter: 4 + i * 0.8,
                thickness: 0.1,
                tessellation: 64
            }, this.meditationScene);
            
            const ringMaterial = new BABYLON.StandardMaterial(`energyRingMat${i}`, this.meditationScene);
            ringMaterial.emissiveColor = new BABYLON.Color3(0.6, 0.8, 1.0);
            ringMaterial.alpha = 0.3 - i * 0.05;
            ringMaterial.backFaceCulling = false;
            
            ring.material = ringMaterial;
            ring.rotation.x = Math.random() * Math.PI;
            ring.rotation.z = Math.random() * Math.PI;
            
            ring.metadata = {
                rotationSpeed: {
                    x: (Math.random() - 0.5) * 0.02,
                    y: (Math.random() - 0.5) * 0.02,
                    z: (Math.random() - 0.5) * 0.02
                },
                phase: i * Math.PI / ringCount
            };
            
            this.energyField.push(ring);
            trackBabylonMesh(ring);
            trackBabylonMaterial(ringMaterial);
        }
    }

    createCosmicParticles() {
        // Create multiple particle systems for different effects
        
        // Inner calm particles
        const calmParticles = new BABYLON.ParticleSystem("calmParticles", 200, this.meditationScene);
        calmParticles.particleTexture = new BABYLON.Texture("https://raw.githubusercontent.com/BabylonJS/Babylon.js/master/assets/textures/flare.png", this.meditationScene);
        
        calmParticles.emitter = this.breathingOrb;
        calmParticles.minEmitBox = new BABYLON.Vector3(-2, -2, -2);
        calmParticles.maxEmitBox = new BABYLON.Vector3(2, 2, 2);
        
        calmParticles.color1 = new BABYLON.Color4(0.4, 0.6, 1.0, 1);
        calmParticles.color2 = new BABYLON.Color4(0.6, 0.8, 1.0, 1);
        calmParticles.colorDead = new BABYLON.Color4(0.4, 0.6, 1.0, 0);
        
        calmParticles.minSize = 0.05;
        calmParticles.maxSize = 0.15;
        
        calmParticles.minLifeTime = 2;
        calmParticles.maxLifeTime = 4;
        
        calmParticles.emitRate = 50;
        
        calmParticles.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        calmParticles.gravity = new BABYLON.Vector3(0, 0, 0);
        
        calmParticles.minEmitPower = 0.1;
        calmParticles.maxEmitPower = 0.3;
        
        calmParticles.start();
        this.cosmicParticles.push(calmParticles);
        trackBabylonParticleSystem(calmParticles);
        
        // Outer energy particles with spiral motion
        const energyParticles = new BABYLON.ParticleSystem("energyParticles", 100, this.meditationScene);
        energyParticles.particleTexture = new BABYLON.Texture("https://raw.githubusercontent.com/BabylonJS/Babylon.js/master/assets/textures/flare.png", this.meditationScene);
        
        energyParticles.emitter = this.breathingOrb;
        energyParticles.minEmitBox = new BABYLON.Vector3(-4, -4, -4);
        energyParticles.maxEmitBox = new BABYLON.Vector3(4, 4, 4);
        
        energyParticles.color1 = new BABYLON.Color4(1.0, 0.5, 0.8, 0.5);
        energyParticles.color2 = new BABYLON.Color4(0.8, 0.4, 1.0, 0.5);
        energyParticles.colorDead = new BABYLON.Color4(1.0, 0.5, 0.8, 0);
        
        energyParticles.minSize = 0.1;
        energyParticles.maxSize = 0.3;
        
        energyParticles.minLifeTime = 3;
        energyParticles.maxLifeTime = 5;
        
        energyParticles.emitRate = 20;
        
        energyParticles.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        energyParticles.start();
        this.cosmicParticles.push(energyParticles);
        trackBabylonParticleSystem(energyParticles);
    }

    setupSoundVisualizers() {
        if (!scene) return;
        
        // Create visualizers for each sound type
        const soundTypes = ['rain', 'ocean', 'forest', 'cafe'];
        
        soundTypes.forEach((type, index) => {
            const visualizer = BABYLON.MeshBuilder.CreateTorus(`soundVisualizer_${type}`, {
                diameter: 30 + index * 5,
                thickness: 1,
                tessellation: 64
            }, scene);
            
            const material = new BABYLON.StandardMaterial(`soundVisualizerMat_${type}`, scene);
            
            // Set color based on sound type
            switch (type) {
                case 'rain':
                    material.emissiveColor = new BABYLON.Color3(0.3, 0.5, 0.8);
                    break;
                case 'ocean':
                    material.emissiveColor = new BABYLON.Color3(0.2, 0.6, 0.8);
                    break;
                case 'forest':
                    material.emissiveColor = new BABYLON.Color3(0.3, 0.7, 0.3);
                    break;
                case 'cafe':
                    material.emissiveColor = new BABYLON.Color3(0.6, 0.3, 0.8);
                    break;
            }
            
            material.alpha = 0.5;
            material.backFaceCulling = false;
            
            visualizer.material = material;
            visualizer.rotation.x = -Math.PI / 2;
            visualizer.position.y = -10;
            visualizer.isVisible = false;
            visualizer.parent = this.meditationSpace;
            
            this.soundVisualizers.set(type, visualizer);
            
            trackBabylonMesh(visualizer);
            trackBabylonMaterial(material);
        });
    }

    createJourneyPaths() {
        this.journeyPaths = {
            tranquility: this.createTranquilityPath(),
            focus: this.createFocusPath(),
            energy: this.createEnergyPath()
        };
    }

    createTranquilityPath() {
        if (!scene) return null;
        
        const path = new BABYLON.TransformNode("tranquilityPath", scene);
        
        // Floating lotus petals
        for (let i = 0; i < 8; i++) {
            const petal = BABYLON.MeshBuilder.CreateSphere(`petal${i}`, {
                diameter: 4,
                segments: 16
            }, scene);
            petal.scaling = new BABYLON.Vector3(1, 0.3, 0.6);
            
            const petalMaterial = new BABYLON.StandardMaterial(`petalMat${i}`, scene);
            petalMaterial.diffuseColor = new BABYLON.Color3(0.53, 0.8, 1);
            petalMaterial.emissiveColor = new BABYLON.Color3(0.27, 0.4, 0.67);
            petalMaterial.alpha = 0.7;
            
            petal.material = petalMaterial;
            const angle = (i / 8) * Math.PI * 2;
            petal.position.set(Math.cos(angle) * 5, 0, Math.sin(angle) * 5);
            petal.rotation.z = angle;
            petal.parent = path;
            
            trackBabylonMesh(petal);
            trackBabylonMaterial(petalMaterial);
        }
        
        path.parent = this.meditationSpace;
        return path;
    }

    createFocusPath() {
        if (!scene) return null;
        
        const path = new BABYLON.TransformNode("focusPath", scene);
        
        // Concentric rings
        for (let i = 0; i < 5; i++) {
            const ring = BABYLON.MeshBuilder.CreateTorus(`focusRing${i}`, {
                diameter: (5 + i * 3) * 2,
                thickness: 0.4,
                tessellation: 32
            }, scene);
            
            const ringMaterial = new BABYLON.StandardMaterial(`focusRingMat${i}`, scene);
            ringMaterial.diffuseColor = new BABYLON.Color3(0.53, 0.27, 1);
            ringMaterial.emissiveColor = new BABYLON.Color3(0.27, 0.13, 0.67);
            ringMaterial.alpha = 0.7 - i * 0.1;
            
            ring.material = ringMaterial;
            ring.rotation.x = Math.PI / 2;
            ring.parent = path;
            
            trackBabylonMesh(ring);
            trackBabylonMaterial(ringMaterial);
        }
        
        path.parent = this.meditationSpace;
        return path;
    }

    createEnergyPath() {
        if (!scene) return null;
        
        const path = new BABYLON.TransformNode("energyPath", scene);
        
        // Energy spirals using multiple meshes
        for (let s = 0; s < 2; s++) {
            const spiralPoints = [];
            
            for (let i = 0; i < 50; i++) {
                const t = i / 50 * Math.PI * 4;
                const radius = 2 + t * 0.5;
                spiralPoints.push(new BABYLON.Vector3(
                    Math.cos(t + s * Math.PI) * radius,
                    t * 0.5,
                    Math.sin(t + s * Math.PI) * radius
                ));
            }
            
            const spiral = BABYLON.MeshBuilder.CreateLines(`energySpiral${s}`, {
                points: spiralPoints
            }, scene);
            
            const spiralMaterial = new BABYLON.StandardMaterial(`energySpiralMat${s}`, scene);
            spiralMaterial.emissiveColor = new BABYLON.Color3(1, 0.53, 0.27);
            spiral.color = new BABYLON.Color3(1, 0.53, 0.27);
            spiral.parent = path;
            
            trackBabylonMesh(spiral);
        }
        
        path.parent = this.meditationSpace;
        return path;
    }

    // Public methods for controlling the meditation system
    startJourney(journeyType) {
        this.currentJourney = journeyType;
        
        // Hide all journey paths
        Object.values(this.journeyPaths).forEach(path => {
            if (path) path.setEnabled(false);
        });
        
        // Show selected journey path
        if (this.journeyPaths[journeyType]) {
            this.journeyPaths[journeyType].setEnabled(true);
        }
        
        // Update environment for journey
        if (this.environmentMaterial) {
            const journeyValue = journeyType === 'tranquility' ? 1 : 
                               journeyType === 'focus' ? 2 : 3;
            this.environmentMaterial.setFloat("journeyType", journeyValue);
        }
    }

    updateBreathing(phase) {
        this.breathPhase = phase;
    }

    updateCalmness(level) {
        this.calmnessMeter = level;
        
        // Update environment material
        if (this.environmentMaterial) {
            this.environmentMaterial.setFloat("calmness", level);
        }
        
        // Update aurora materials
        this.auroras.forEach(aurora => {
            aurora.material.setFloat("calmness", level);
        });
    }

    updateSoundVisualizer(type, level) {
        const visualizer = this.soundVisualizers.get(type);
        if (visualizer) {
            visualizer.isVisible = level > 0;
            if (visualizer.material) {
                visualizer.material.alpha = level * 0.5;
            }
        }
    }

    activate() {
        this.isActive = true;
        if (this.meditationSpace) {
            this.meditationSpace.setEnabled(true);
        }
        this.startTime = Date.now();
        this.startBreathingGuide();
    }

    deactivate() {
        this.isActive = false;
        if (this.meditationSpace) {
            this.meditationSpace.setEnabled(false);
        }
        
        if (this.breathInterval) {
            clearInterval(this.breathInterval);
            this.breathInterval = null;
        }
    }

    startBreathingGuide() {
        // Simple breathing guide implementation
        let phase = 'inhale';
        
        this.breathInterval = trackSetInterval(() => {
            this.updateBreathingUI(phase);
            // Cycle through phases based on 4-7-8 pattern
            // This is a simplified implementation
        }, 1000);
    }

    updateBreathingUI(phase) {
        const breathText = document.getElementById('breathText');
        if (breathText) {
            switch(phase) {
                case 'inhale':
                    breathText.textContent = 'Breathe In';
                    break;
                case 'hold':
                    breathText.textContent = 'Hold';
                    break;
                case 'exhale':
                    breathText.textContent = 'Breathe Out';
                    break;
            }
        }
    }

    updateMeditation() {
        if (!this.isActive) return;
        
        this.meditationTime += this.meditationEngine.getDeltaTime() / 1000;
    
        // Update breathing phase (4-7-8 breathing pattern)
        const breathCycle = 19; // 4 in + 7 hold + 8 out
        const cyclePosition = (this.meditationTime % breathCycle);
        
        if (cyclePosition < 4) {
            // Inhale
            this.breathPhase = (cyclePosition / 4) * Math.PI / 2;
        } else if (cyclePosition < 11) {
            // Hold
            this.breathPhase = Math.PI / 2;
        } else {
            // Exhale
            this.breathPhase = Math.PI / 2 + ((cyclePosition - 11) / 8) * Math.PI / 2;
        }
    
        // Update orb material
        if (this.breathingOrb && this.breathingOrb.metadata.material) {
            this.breathingOrb.metadata.material.setFloat("time", this.meditationTime);
            this.breathingOrb.metadata.material.setFloat("breathPhase", this.breathPhase);
            this.breathingOrb.metadata.material.setVector3("cameraPosition", this.meditationCamera.position);
            
            // Update meditation level based on duration
            const meditationLevel = Math.min(1, this.meditationTime / 300); // Max level after 5 minutes
            this.breathingOrb.metadata.material.setFloat("meditationLevel", meditationLevel);
        }
        
        // Update environment material
        if (this.environmentMaterial) {
            this.environmentMaterial.setFloat("time", this.meditationTime);
        }
        
        // Update aurora materials
        this.auroras.forEach(aurora => {
            aurora.material.setFloat("time", this.meditationTime);
        });
        
        // Rotate energy field
        this.energyField.forEach((ring, index) => {
            if (ring.metadata) {
                ring.rotation.x += ring.metadata.rotationSpeed.x;
                ring.rotation.y += ring.metadata.rotationSpeed.y;
                ring.rotation.z += ring.metadata.rotationSpeed.z;
                
                // Pulse effect
                const pulseScale = 1 + Math.sin(this.meditationTime * 0.5 + ring.metadata.phase) * 0.1;
                ring.scaling = new BABYLON.Vector3(pulseScale, pulseScale, pulseScale);
            }
        });
        
        // Slowly rotate camera for dynamic view
        this.meditationCamera.alpha += 0.001;
        
        // Update meditation stats
        this.updateMeditationStats();
        this.checkMilestones();
    }

    updateMeditationStats() {
        // Update UI stats
        const timeElement = document.getElementById('meditationTime');
        if (timeElement) {
            const minutes = Math.floor(this.meditationTime / 60);
            const seconds = Math.floor(this.meditationTime % 60);
            timeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        const calmnessElement = document.getElementById('calmnessLevel');
        if (calmnessElement) {
            calmnessElement.textContent = `${Math.floor(this.calmnessMeter * 100)}%`;
        }
        
        const stonesElement = document.getElementById('galaxyStones');
        if (stonesElement) {
            stonesElement.textContent = this.userGalaxy.length;
        }
    }

    checkMilestones() {
        const milestones = [60, 180, 300, 600, 900]; // 1, 3, 5, 10, 15 minutes
        const currentMilestone = Math.floor(this.meditationTime / 60) * 60;
        
        if (milestones.includes(currentMilestone) && !this.reachedMilestones.includes(currentMilestone)) {
            this.reachedMilestones.push(currentMilestone);
            
            // Show achievement
            if (window.showAchievement) {
                window.showAchievement('Meditation Milestone!', `${currentMilestone / 60} minutes of peace achieved`);
            }
        }
    }

    disposeMeditationScene() {
        if (this.meditationScene) {
            this.meditationScene.dispose();
        }
        if (this.meditationEngine) {
            this.meditationEngine.dispose();
        }
    }

    update(deltaTime) {
        // This method can be called from the main animation loop if needed
        if (!this.isActive) return;
        
        // Auto-adjust calmness based on consistency
        const breathingConsistency = Math.sin(this.breathPhase) * 0.5 + 0.5;
        const targetCalmness = Math.min(breathingConsistency * (this.meditationTime / 300), 1); // 5 minutes to max
        this.updateCalmness(this.calmnessMeter + (targetCalmness - this.calmnessMeter) * 0.01);
        
        // Update sound visualizers rotation
        this.soundVisualizers.forEach((visualizer, type) => {
            if (visualizer.isVisible) {
                visualizer.rotation.z += 0.002;
            }
        });
        
        // Update journey path animations
        if (this.currentJourney && this.journeyPaths[this.currentJourney]) {
            const path = this.journeyPaths[this.currentJourney];
            path.rotation.y += 0.001;
            
            // Journey-specific animations
            if (this.currentJourney === 'tranquility') {
                path.getChildren().forEach((petal, i) => {
                    petal.position.y = Math.sin(this.meditationTime * 0.5 + i * 0.5) * 2;
                });
            } else if (this.currentJourney === 'focus') {
                path.getChildren().forEach((ring, i) => {
                    const scale = 1 + Math.sin(this.meditationTime + i * 0.5) * 0.1;
                    ring.scaling = new BABYLON.Vector3(scale, scale, scale);
                });
            }
        }
    }
}

// Export for use in other modules
export const cosmicMeditation = new CosmicMeditationSystem();
