import { trackBabylonMesh, trackBabylonMaterial, trackBabylonTexture, trackBabylonParticleSystem } from './cleanup.js';

export let blackHoleSystem = {};
let shaderMaterials = [];
let energyParticles = [];
let gravitationalWaves = [];
let dustParticleSystem = null;
let lensingPlane = null;
let polarJetParticles = [];
let eventHorizonMesh = null;
let accretionDiskMesh = null;

export function createEnhancedBlackHole(sceneRef) {
    try {
        if (!sceneRef || !window.BABYLON) {
            console.error('Babylon.js scene not available');
            return;
        }

        // Create main black hole container
        const blackHoleGroup = new BABYLON.TransformNode("blackHoleGroup", sceneRef);
        
        // Create gravitational lensing effect
        createGravitationalLensingHalo(blackHoleGroup, sceneRef);
        
        // Create the event horizon with advanced shader
        createEventHorizon(blackHoleGroup, sceneRef);
        
        // Create the accretion disk with realistic physics simulation
        createAccretionDisk(blackHoleGroup, sceneRef);
        
        // Create dust particle stream
        createDustParticleStream(blackHoleGroup, sceneRef);
        
        // Create relativistic jets
        createRelativisticPolarJets(blackHoleGroup, sceneRef);
        
        // Create gravitational lensing rings
        createEnhancedGravitationalLensing(blackHoleGroup, sceneRef);
        
        // Create energy particles
        createSmoothEnergyParticles(blackHoleGroup, sceneRef);
        
        // Create energy beam
        createSymmetricEnergyBeam(blackHoleGroup, sceneRef);
        
        // Store references
        blackHoleSystem = {
            group: blackHoleGroup,
            eventHorizon: eventHorizonMesh,
            accretionDisk: accretionDiskMesh
        };
        
        // Listen for theme changes
        const observer = new MutationObserver(() => {
            updateTheme(sceneRef);
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
        
        // Initial theme update
        updateTheme(sceneRef);
        
    } catch (error) {
        console.error('Failed to create enhanced black hole:', error);
        createFallbackBlackHole(sceneRef);
    }
}

// Create the event horizon with Babylon.js
function createEventHorizon(parentNode, sceneRef) {
    // Create sphere for event horizon
    eventHorizonMesh = BABYLON.MeshBuilder.CreateSphere("eventHorizon", {
        diameter: 6,
        segments: 64
    }, sceneRef);
    
    // Create custom shader material for event horizon
    BABYLON.Effect.ShadersStore["eventHorizonVertexShader"] = `
        precision highp float;
        
        // Attributes
        attribute vec3 position;
        attribute vec3 normal;
        attribute vec2 uv;
        
        // Uniforms
        uniform mat4 worldViewProjection;
        uniform mat4 world;
        uniform float time;
        
        // Varying
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying vec2 vUV;
        
        void main() {
            vec3 pos = position;
            
            // Subtle warping effect
            float warp = sin(time * 0.3 + position.x * 0.2) * 0.05;
            warp += cos(time * 0.4 + position.y * 0.3) * 0.05;
            pos += normal * warp;
            
            vec4 worldPos = world * vec4(pos, 1.0);
            gl_Position = worldViewProjection * vec4(pos, 1.0);
            
            vPosition = position;
            vNormal = normal;
            vWorldPosition = worldPos.xyz;
            vUV = uv;
        }
    `;
    
    BABYLON.Effect.ShadersStore["eventHorizonFragmentShader"] = `
        precision highp float;
        
        // Uniforms
        uniform vec3 cameraPosition;
        uniform float time;
        uniform float intensity;
        
        // Varying
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying vec2 vUV;
        
        void main() {
            // Calculate view direction
            vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
            float fresnel = 1.0 - abs(dot(viewDirection, normalize(vNormal)));
            
            // Hawking radiation effect at the edge
            float hawkingGlow = pow(fresnel, 3.0) * intensity;
            vec3 hawkingColor = vec3(0.0, 0.1, 0.3) * hawkingGlow;
            
            // Time-based intensity variation
            float pulse = sin(time * 0.2) * 0.1 + 0.9;
            
            // Output color with alpha
            gl_FragColor = vec4(hawkingColor * pulse, 1.0 - fresnel * 0.3);
        }
    `;
    
    const eventHorizonMaterial = new BABYLON.ShaderMaterial("eventHorizonMaterial", sceneRef, {
        vertex: "eventHorizon",
        fragment: "eventHorizon",
    }, {
        attributes: ["position", "normal", "uv"],
        uniforms: ["world", "worldViewProjection", "cameraPosition", "time", "intensity"],
        needAlphaBlending: true
    });
    
    eventHorizonMaterial.setFloat("time", 0);
    eventHorizonMaterial.setFloat("intensity", 1.0);
    eventHorizonMaterial.backFaceCulling = false;
    
    eventHorizonMesh.material = eventHorizonMaterial;
    eventHorizonMesh.parent = parentNode;
    
    shaderMaterials.push(eventHorizonMaterial);
    trackBabylonMesh(eventHorizonMesh);
    trackBabylonMaterial(eventHorizonMaterial);
}

// Create the accretion disk with Babylon.js
function createAccretionDisk(parentNode, sceneRef) {
    // Create custom mesh for accretion disk
    const diskVertexData = createDiskVertexData(3.1, 8, 128, 32);
    accretionDiskMesh = new BABYLON.Mesh("accretionDisk", sceneRef);
    diskVertexData.applyToMesh(accretionDiskMesh);
    
    // Create accretion disk shader
    BABYLON.Effect.ShadersStore["accretionDiskVertexShader"] = `
        precision highp float;
        
        // Attributes
        attribute vec3 position;
        attribute vec3 normal;
        attribute vec2 uv;
        
        // Uniforms
        uniform mat4 worldViewProjection;
        uniform float time;
        
        // Varying
        varying vec2 vUV;
        varying vec3 vPosition;
        varying float vRadius;
        
        void main() {
            vUV = uv;
            vPosition = position;
            vRadius = length(position.xz);
            
            // Wave-based height variation
            float wave1 = sin(time * 1.0 + vRadius * 0.3) * 0.1;
            float wave2 = cos(time * 0.7 + vRadius * 0.5) * 0.08;
            float height = wave1 + wave2;
            
            vec3 pos = position;
            pos.y += height * smoothstep(3.1, 8.0, vRadius) * 0.5;
            
            gl_Position = worldViewProjection * vec4(pos, 1.0);
        }
    `;
    
    BABYLON.Effect.ShadersStore["accretionDiskFragmentShader"] = `
        precision highp float;
        
        // Uniforms
        uniform float time;
        uniform float focusMode;
        uniform float productivity;
        uniform float theme;
        
        // Varying
        varying vec2 vUV;
        varying vec3 vPosition;
        varying float vRadius;
        
        void main() {
            float normalizedRadius = (vRadius - 3.1) / 4.9;
            
            // Temperature gradient
            float temperature = smoothstep(1.0, 0.0, normalizedRadius);
            
            // Swirling pattern with heat shimmer
            float angle = atan(vPosition.z, vPosition.x);
            float spiral = sin(angle * 6.0 + time * 1.5 - vRadius * 0.2) * 0.5 + 0.5;
            spiral *= sin(angle * 3.0 - time * 0.8 + vRadius * 0.15) * 0.5 + 0.5;
            
            // Heat shimmer
            float shimmer = sin(vRadius * 10.0 + time * 5.0) * sin(angle * 8.0 - time * 3.0);
            shimmer *= 0.1 * temperature;
            
            // Theme-aware colors
            vec3 hotColor, mediumColor, coolColor;
            
            if (theme > 0.5) {
                // Light theme
                hotColor = vec3(1.0, 0.65, 0.0);
                mediumColor = vec3(1.0, 0.8, 0.0);
                coolColor = vec3(1.0, 0.9, 0.2);
            } else {
                // Dark theme
                hotColor = vec3(1.0, 0.3, 0.0);
                mediumColor = vec3(1.0, 0.6, 0.1);
                coolColor = vec3(0.4, 0.6, 1.0);
            }
            
            vec3 baseColor = mix(coolColor, mix(mediumColor, hotColor, temperature), temperature);
            baseColor += shimmer;
            
            // Focus mode enhancement
            if (focusMode > 0.0) {
                vec3 focusColor = theme > 0.5 ? vec3(1.0, 0.7, 0.0) : vec3(0.0, 1.0, 1.0);
                baseColor = mix(baseColor, focusColor, focusMode * 0.3 * spiral);
            }
            
            // Productivity boost
            float productivityGlow = productivity * spiral * 0.3;
            baseColor += vec3(productivityGlow * 0.2, productivityGlow * 0.4, productivityGlow * 0.1);
            
            // Opacity
            float turbulence = spiral * temperature;
            float baseOpacity = theme > 0.5 ? 0.9 : 0.8;
            float opacity = turbulence * baseOpacity + 0.2;
            opacity = clamp(max(opacity, 0.4), 0.0, 1.0);
            
            gl_FragColor = vec4(baseColor, opacity);
        }
    `;
    
    const diskMaterial = new BABYLON.ShaderMaterial("accretionDiskMaterial", sceneRef, {
        vertex: "accretionDisk",
        fragment: "accretionDisk",
    }, {
        attributes: ["position", "normal", "uv"],
        uniforms: ["worldViewProjection", "time", "focusMode", "productivity", "theme"],
        needAlphaBlending: true
    });
    
    diskMaterial.setFloat("time", 0);
    diskMaterial.setFloat("focusMode", 0);
    diskMaterial.setFloat("productivity", 0.5);
    diskMaterial.setFloat("theme", 0);
    diskMaterial.backFaceCulling = false;
    
    accretionDiskMesh.material = diskMaterial;
    accretionDiskMesh.rotation.x = Math.PI / 2;
    accretionDiskMesh.parent = parentNode;
    accretionDiskMesh.renderingGroupId = 1;
    
    shaderMaterials.push(diskMaterial);
    trackBabylonMesh(accretionDiskMesh);
    trackBabylonMaterial(diskMaterial);
    
    // Store reference for updates
    if (!blackHoleSystem.diskMaterial) {
        blackHoleSystem.diskMaterial = diskMaterial;
    }
}

// Create disk vertex data helper
function createDiskVertexData(innerRadius, outerRadius, radialSegments, tubularSegments) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    
    for (let j = 0; j <= radialSegments; j++) {
        for (let i = 0; i <= tubularSegments; i++) {
            const u = i / tubularSegments;
            const v = j / radialSegments;
            const radius = innerRadius + (outerRadius - innerRadius) * v;
            const theta = u * Math.PI * 2;
            
            const x = radius * Math.cos(theta);
            const y = 0;
            const z = radius * Math.sin(theta);
            
            positions.push(x, y, z);
            normals.push(0, 1, 0);
            uvs.push(u, v);
        }
    }
    
    for (let j = 0; j < radialSegments; j++) {
        for (let i = 0; i < tubularSegments; i++) {
            const a = (tubularSegments + 1) * j + i;
            const b = (tubularSegments + 1) * (j + 1) + i;
            const c = (tubularSegments + 1) * (j + 1) + (i + 1);
            const d = (tubularSegments + 1) * j + (i + 1);
            
            indices.push(a, b, d);
            indices.push(b, c, d);
        }
    }
    
    const vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.normals = normals;
    vertexData.uvs = uvs;
    vertexData.indices = indices;
    
    return vertexData;
}

// Create gravitational lensing halo
function createGravitationalLensingHalo(parentNode, sceneRef) {
    const lensMesh = BABYLON.MeshBuilder.CreateDisc("lensingHalo", {
        radius: 50,
        tessellation: 64
    }, sceneRef);
    
    const lensMaterial = new BABYLON.StandardMaterial("lensMaterial", sceneRef);
    lensMaterial.diffuseTexture = createRadialGradientTexture(sceneRef, 512);
    lensMaterial.opacityTexture = lensMaterial.diffuseTexture;
    lensMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.4);
    lensMaterial.alpha = 0.3;
    lensMaterial.backFaceCulling = false;
    
    lensMesh.material = lensMaterial;
    lensMesh.rotation.x = Math.PI / 2;
    lensMesh.parent = parentNode;
    lensMesh.renderingGroupId = 0;
    
    lensingPlane = lensMesh;
    trackBabylonMesh(lensMesh);
    trackBabylonMaterial(lensMaterial);
}

// Create radial gradient texture
function createRadialGradientTexture(sceneRef, size) {
    const texture = new BABYLON.DynamicTexture("radialGradient", size, sceneRef, false);
    const context = texture.getContext();
    
    const gradient = context.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.3)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    texture.update();
    
    trackBabylonTexture(texture);
    return texture;
}

// Create relativistic polar jets with Babylon.js particle systems
function createRelativisticPolarJets(parentNode, sceneRef) {
    [-1, 1].forEach(direction => {
        const jetContainer = new BABYLON.TransformNode(`jet${direction}`, sceneRef);
        jetContainer.parent = parentNode;
        jetContainer.position.y = direction * 3;
        
        // Create jet particle system
        const particleSystem = new BABYLON.ParticleSystem(`jetParticles${direction}`, 5000, sceneRef);
        particleSystem.particleTexture = new BABYLON.Texture("https://raw.githubusercontent.com/BabylonJS/Babylon.js/master/assets/textures/flare.png", sceneRef);
        
        // Emitter
        particleSystem.emitter = jetContainer;
        particleSystem.minEmitBox = new BABYLON.Vector3(-0.2, 0, -0.2);
        particleSystem.maxEmitBox = new BABYLON.Vector3(0.2, 0, 0.2);
        
        // Colors
        particleSystem.color1 = new BABYLON.Color4(1, 1, 1, 1);
        particleSystem.color2 = new BABYLON.Color4(0, 0.81, 1, 1);
        particleSystem.colorDead = new BABYLON.Color4(0.58, 0.34, 1, 0);
        
        // Size
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.5;
        
        // Life time
        particleSystem.minLifeTime = 2;
        particleSystem.maxLifeTime = 5;
        
        // Emission
        particleSystem.emitRate = 1000;
        
        // Speed
        particleSystem.minEmitPower = 10;
        particleSystem.maxEmitPower = 20;
        particleSystem.updateSpeed = 0.02;
        
        // Direction
        particleSystem.direction1 = new BABYLON.Vector3(-0.1, direction, -0.1);
        particleSystem.direction2 = new BABYLON.Vector3(0.1, direction, 0.1);
        
        // Gravity
        particleSystem.gravity = new BABYLON.Vector3(0, direction * 5, 0);
        
        // Angular speed
        particleSystem.minAngularSpeed = 0;
        particleSystem.maxAngularSpeed = Math.PI * 4;
        
        // Add turbulence
        particleSystem.noiseStrength = new BABYLON.Vector3(0.5, 0.5, 0.5);
        
        particleSystem.start();
        polarJetParticles.push(particleSystem);
        trackBabylonParticleSystem(particleSystem);
        
        // Create shock wave rings
        createShockWaveRings(jetContainer, sceneRef, direction);
    });
}

// Create shock wave rings for jets
function createShockWaveRings(parentNode, sceneRef, direction) {
    for (let i = 0; i < 3; i++) {
        const ring = BABYLON.MeshBuilder.CreateTorus(`shockWave${i}`, {
            diameter: 2 + i * 1.5,
            thickness: 0.1,
            tessellation: 32
        }, sceneRef);
        
        const ringMaterial = new BABYLON.StandardMaterial(`shockWaveMat${i}`, sceneRef);
        ringMaterial.emissiveColor = new BABYLON.Color3(0.4, 0.8, 1);
        ringMaterial.alpha = 0.3 - i * 0.08;
        
        ring.material = ringMaterial;
        ring.parent = parentNode;
        ring.position.y = direction * (5 + i * 8);
        ring.metadata = { baseY: ring.position.y, phase: i * 0.5 };
        
        trackBabylonMesh(ring);
        trackBabylonMaterial(ringMaterial);
    }
}

// Create dust particle stream
function createDustParticleStream(parentNode, sceneRef) {
    const dustSystem = new BABYLON.ParticleSystem("dustParticles", 2000, sceneRef);
    dustSystem.particleTexture = new BABYLON.Texture("https://raw.githubusercontent.com/BabylonJS/Babylon.js/master/assets/textures/flare.png", sceneRef);
    
    // Custom emitter to follow disk shape
    const dustEmitter = BABYLON.MeshBuilder.CreateBox("dustEmitter", { size: 0.1 }, sceneRef);
    dustEmitter.isVisible = false;
    dustEmitter.parent = parentNode;
    dustSystem.emitter = dustEmitter;
    
    // Create circular emission
    dustSystem.createCylinderEmitter(4, 1, 0, 0);
    
    // Colors
    dustSystem.color1 = new BABYLON.Color4(0.8, 0.6, 0.3, 0.3);
    dustSystem.color2 = new BABYLON.Color4(0.9, 0.7, 0.4, 0.2);
    dustSystem.colorDead = new BABYLON.Color4(0.8, 0.6, 0.3, 0);
    
    // Size
    dustSystem.minSize = 0.05;
    dustSystem.maxSize = 0.15;
    
    // Life
    dustSystem.minLifeTime = 5;
    dustSystem.maxLifeTime = 10;
    
    // Emission
    dustSystem.emitRate = 200;
    
    // Speed
    dustSystem.minEmitPower = 0.1;
    dustSystem.maxEmitPower = 0.3;
    
    // Custom update function for orbital motion
    dustSystem.updateFunction = function(particles) {
        for (let index = 0; index < particles.length; index++) {
            const particle = particles[index];
            particle.angle += 0.01;
            
            const radius = 4 + particle.age * 0.1;
            particle.position.x = Math.cos(particle.angle) * radius;
            particle.position.z = Math.sin(particle.angle) * radius;
        }
    };
    
    dustSystem.start();
    dustParticleSystem = dustSystem;
    trackBabylonParticleSystem(dustSystem);
}

// Create gravitational lensing rings
function createEnhancedGravitationalLensing(parentNode, sceneRef) {
    const ringConfigs = [
        { radius: 15, width: 1.5 },
        { radius: 21, width: 1.8 },
        { radius: 27, width: 2.0 },
        { radius: 34.5, width: 2.3 },
        { radius: 43.5, width: 2.5 }
    ];
    
    ringConfigs.forEach((config, i) => {
        const ring = BABYLON.MeshBuilder.CreateTorus(`gravityRing${i}`, {
            diameter: config.radius * 2,
            thickness: config.width,
            tessellation: 64
        }, sceneRef);
        
        const ringMaterial = new BABYLON.StandardMaterial(`gravityRingMat${i}`, sceneRef);
        ringMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.4, 0.8);
        ringMaterial.alpha = 0.2 - i * 0.03;
        ringMaterial.backFaceCulling = false;
        
        ring.material = ringMaterial;
        ring.parent = parentNode;
        ring.metadata = { 
            baseRadius: config.radius,
            phase: i * Math.PI * 0.4,
            pulseSpeed: 0.5 + i * 0.1
        };
        
        gravitationalWaves.push(ring);
        trackBabylonMesh(ring);
        trackBabylonMaterial(ringMaterial);
    });
}

// Create smooth energy particles
function createSmoothEnergyParticles(parentNode, sceneRef) {
    const energySystem = new BABYLON.ParticleSystem("energyParticles", 300, sceneRef);
    energySystem.particleTexture = new BABYLON.Texture("https://raw.githubusercontent.com/BabylonJS/Babylon.js/master/assets/textures/flare.png", sceneRef);
    
    energySystem.emitter = parentNode;
    energySystem.minEmitBox = new BABYLON.Vector3(-5, -5, -5);
    energySystem.maxEmitBox = new BABYLON.Vector3(5, 5, 5);
    
    // Colors
    energySystem.color1 = new BABYLON.Color4(1, 0.5, 0, 1);
    energySystem.color2 = new BABYLON.Color4(1, 1, 0, 1);
    energySystem.colorDead = new BABYLON.Color4(1, 0.5, 0, 0);
    
    // Size
    energySystem.minSize = 0.1;
    energySystem.maxSize = 0.3;
    
    // Life
    energySystem.minLifeTime = 2;
    energySystem.maxLifeTime = 4;
    
    // Emission
    energySystem.emitRate = 50;
    
    // Speed
    energySystem.minEmitPower = 0.5;
    energySystem.maxEmitPower = 1;
    
    // Blend mode
    energySystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
    
    energySystem.start();
    energyParticles.push(energySystem);
    trackBabylonParticleSystem(energySystem);
}

// Create symmetric energy beam
function createSymmetricEnergyBeam(parentNode, sceneRef) {
    const beamMesh = BABYLON.MeshBuilder.CreateCylinder("energyBeam", {
        height: 60,
        diameterTop: 2,
        diameterBottom: 2,
        tessellation: 32
    }, sceneRef);
    
    // Create volumetric beam material
    const beamMaterial = new BABYLON.StandardMaterial("beamMaterial", sceneRef);
    beamMaterial.emissiveColor = new BABYLON.Color3(0.6, 1, 1);
    beamMaterial.alpha = 0.3;
    beamMaterial.backFaceCulling = false;
    
    // Add glow effect
    const glowLayer = sceneRef.postProcessing?.glowLayer;
    if (glowLayer) {
        glowLayer.addIncludedOnlyMesh(beamMesh);
        glowLayer.customEmissiveColorSelector = function(mesh, subMesh, material, result) {
            if (mesh === beamMesh) {
                result.set(0.6, 1, 1, 1);
            } else {
                result.set(0, 0, 0, 0);
            }
        };
    }
    
    beamMesh.material = beamMaterial;
    beamMesh.parent = parentNode;
    beamMesh.renderingGroupId = 2;
    
    trackBabylonMesh(beamMesh);
    trackBabylonMaterial(beamMaterial);
}

// Update theme for all materials
function updateTheme(sceneRef) {
    const theme = document.body.getAttribute('data-theme');
    const isLightTheme = theme === 'light';
    const themeValue = isLightTheme ? 1 : 0;
    
    // Update shader materials
    shaderMaterials.forEach(material => {
        if (material.getEffect() && material.getEffect().getUniform("theme")) {
            material.setFloat("theme", themeValue);
        }
    });
}

// Update black hole effects - called from animation loop
export function updateBlackHoleEffects(sceneRef, time) {
    if (!sceneRef || !blackHoleSystem.group) return;
    
    // Update shader uniforms
    shaderMaterials.forEach(material => {
        if (material.getEffect()) {
            const effect = material.getEffect();
            if (effect.getUniform("time")) {
                material.setFloat("time", time);
            }
            if (effect.getUniform("cameraPosition") && sceneRef.activeCamera) {
                material.setVector3("cameraPosition", sceneRef.activeCamera.position);
            }
        }
    });
    
    // Rotate black hole group slowly
    blackHoleSystem.group.rotation.y += 0.001;
    
    // Update gravitational waves
    gravitationalWaves.forEach((wave, index) => {
        if (wave.metadata) {
            const scale = 1 + Math.sin(time * wave.metadata.pulseSpeed + wave.metadata.phase) * 0.1;
            wave.scaling.x = scale;
            wave.scaling.z = scale;
            wave.rotation.y += 0.002 * (index + 1);
        }
    });
    
    // Update polar jet shock waves
    if (blackHoleSystem.group.getChildren) {
        blackHoleSystem.group.getChildren().forEach(child => {
            if (child.name && child.name.includes("jet")) {
                child.getChildren().forEach(shockWave => {
                    if (shockWave.metadata && shockWave.metadata.baseY !== undefined) {
                        shockWave.position.y = shockWave.metadata.baseY + Math.sin(time + shockWave.metadata.phase) * 2;
                        shockWave.rotation.x = time * 0.5;
                    }
                });
            }
        });
    }
    
    // Update dust emitter rotation
    if (dustParticleSystem && dustParticleSystem.emitter) {
        dustParticleSystem.emitter.rotation.y += 0.02;
    }
}

// Trigger focus intensification
export function triggerFocusIntensification() {
    if (blackHoleSystem.diskMaterial) {
        blackHoleSystem.diskMaterial.setFloat("focusMode", 1.0);
    }
    
    // Enhance particle emission rates
    energyParticles.forEach(system => {
        system.emitRate = 100;
    });
    
    polarJetParticles.forEach(system => {
        system.emitRate = 2000;
    });
}

// Create fallback black hole if advanced features fail
function createFallbackBlackHole(sceneRef) {
    const blackHole = BABYLON.MeshBuilder.CreateSphere("blackHoleFallback", {
        diameter: 6,
        segments: 32
    }, sceneRef);
    
    const material = new BABYLON.StandardMaterial("blackHoleFallbackMat", sceneRef);
    material.diffuseColor = new BABYLON.Color3(0, 0, 0);
    material.specularColor = new BABYLON.Color3(0, 0, 0);
    material.emissiveColor = new BABYLON.Color3(0.1, 0, 0.2);
    
    blackHole.material = material;
    
    blackHoleSystem = {
        group: blackHole,
        eventHorizon: blackHole,
        accretionDisk: null
    };
}