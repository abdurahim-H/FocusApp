// Cosmic Meditation System - Revolutionary Ambient Mode
// Creates an interactive meditation journey with personal galaxy garden

import { scene } from './scene3d.js';
import { appState } from './state.js';
import { trackRequestAnimationFrame, trackSetInterval } from './cleanup.js';

export class CosmicMeditationSystem {
    constructor() {
        this.meditationSpace = new THREE.Group();
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
    }

    initialize() {
        // Create personal meditation space
        this.createMeditationEnvironment();
        this.initializeBreathingSystem();
        this.setupSoundVisualizers();
        this.createJourneyPaths();
        this.createAuroraEffects();
        this.createCosmicRays();
        
        // Initially hide meditation space
        this.meditationSpace.visible = false;
        scene.add(this.meditationSpace);
    }

    createMeditationEnvironment() {
        // Create a serene cosmic environment
        const environmentGeometry = new THREE.SphereGeometry(100, 64, 64);
        const environmentMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                calmness: { value: 0 },
                innerColor: { value: new THREE.Color(0x0a0a2e) },
                outerColor: { value: new THREE.Color(0x000510) },
                journeyType: { value: 0 }
            },
            vertexShader: `
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying vec2 vUv;
                
                void main() {
                    vPosition = position;
                    vNormal = normal;
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float calmness;
                uniform vec3 innerColor;
                uniform vec3 outerColor;
                uniform float journeyType;
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying vec2 vUv;
                
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
                    float stars = smoothstep(0.97, 0.98, sin(vUv.x * 200.0) * sin(vUv.y * 200.0));
                    color += vec3(1.0) * stars * 0.5;
                    
                    gl_FragColor = vec4(color, 0.95);
                }
            `,
            side: THREE.BackSide,
            transparent: true
        });
        
        const environment = new THREE.Mesh(environmentGeometry, environmentMaterial);
        this.meditationSpace.add(environment);
        this.environmentMaterial = environmentMaterial;
    }

    initializeBreathingSystem() {
        // Create particle system that responds to breathing
        const particleCount = 5000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const lifetimes = new Float32Array(particleCount);
        const sizes = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            // Start particles in a sphere around the user
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            const radius = 20 + Math.random() * 10;
            
            positions[i3] = Math.sin(theta) * Math.cos(phi) * radius;
            positions[i3 + 1] = Math.sin(theta) * Math.sin(phi) * radius;
            positions[i3 + 2] = Math.cos(theta) * radius;
            
            velocities[i3] = (Math.random() - 0.5) * 0.1;
            velocities[i3 + 1] = (Math.random() - 0.5) * 0.1;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.1;
            
            lifetimes[i] = Math.random();
            sizes[i] = Math.random() * 2 + 1;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                breathPhase: { value: 0 },
                calmness: { value: 0 }
            },
            vertexShader: `
                attribute vec3 velocity;
                attribute float lifetime;
                attribute float size;
                varying float vLifetime;
                varying float vDistance;
                uniform float time;
                uniform float breathPhase;
                
                void main() {
                    vLifetime = lifetime;
                    vec3 pos = position;
                    
                    // Breathing movement
                    float breathScale = 1.0 + sin(breathPhase) * 0.3;
                    pos *= breathScale;
                    
                    // Orbital movement
                    float angle = time * 0.1 + lifetime * 6.28;
                    pos.x += cos(angle) * 2.0;
                    pos.z += sin(angle) * 2.0;
                    
                    // Vertical float
                    pos.y += sin(time + lifetime * 10.0) * 2.0;
                    
                    vDistance = length(pos);
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * (50.0 / vDistance) * (1.0 + sin(lifetime * 6.28 + time) * 0.5);
                }
            `,
            fragmentShader: `
                varying float vLifetime;
                varying float vDistance;
                uniform float calmness;
                uniform float time;
                
                void main() {
                    vec2 center = gl_PointCoord - 0.5;
                    float dist = length(center);
                    if (dist > 0.5) discard;
                    
                    float alpha = smoothstep(0.5, 0.0, dist);
                    
                    // Color based on calmness
                    vec3 calmColor = vec3(0.3, 0.6, 1.0);
                    vec3 activeColor = vec3(1.0, 0.4, 0.3);
                    vec3 color = mix(activeColor, calmColor, calmness);
                    
                    // Add sparkle
                    float sparkle = sin(time * 10.0 + vLifetime * 100.0) * 0.5 + 0.5;
                    color += vec3(1.0) * sparkle * 0.2;
                    
                    // Distance fade
                    alpha *= 1.0 - smoothstep(20.0, 50.0, vDistance);
                    
                    gl_FragColor = vec4(color, alpha * 0.6);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.breathingParticles = new THREE.Points(geometry, material);
        this.meditationSpace.add(this.breathingParticles);
    }

    createAuroraEffects() {
        // Create multiple aurora ribbons
        for (let i = 0; i < 3; i++) {
            const auroraGeometry = new THREE.PlaneGeometry(80, 20, 40, 10);
            const auroraMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    offset: { value: i * 2.1 },
                    calmness: { value: 0 },
                    color1: { value: new THREE.Color(0x00ff88) },
                    color2: { value: new THREE.Color(0x0088ff) }
                },
                vertexShader: `
                    varying vec2 vUv;
                    varying float vY;
                    uniform float time;
                    uniform float offset;
                    
                    void main() {
                        vUv = uv;
                        vec3 pos = position;
                        
                        // Wave motion
                        float wave = sin(pos.x * 0.1 + time * 0.5 + offset) * 5.0;
                        wave += sin(pos.x * 0.05 + time * 0.3) * 3.0;
                        pos.y += wave;
                        
                        vY = pos.y;
                        
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                fragmentShader: `
                    varying vec2 vUv;
                    varying float vY;
                    uniform float time;
                    uniform float calmness;
                    uniform vec3 color1;
                    uniform vec3 color2;
                    
                    void main() {
                        // Gradient based on height
                        vec3 color = mix(color1, color2, sin(vY * 0.1 + time) * 0.5 + 0.5);
                        
                        // Edge fade
                        float alpha = 1.0 - abs(vUv.x - 0.5) * 2.0;
                        alpha *= 1.0 - abs(vUv.y - 0.5) * 2.0;
                        alpha *= calmness * 0.4;
                        
                        // Shimmer
                        float shimmer = sin(vUv.x * 50.0 + time * 3.0) * sin(vUv.y * 30.0 - time * 2.0);
                        alpha += shimmer * 0.05;
                        
                        gl_FragColor = vec4(color, alpha);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            
            const aurora = new THREE.Mesh(auroraGeometry, auroraMaterial);
            aurora.position.y = 40 + i * 10;
            aurora.rotation.x = -Math.PI / 4;
            this.auroras.push({ mesh: aurora, material: auroraMaterial });
            this.meditationSpace.add(aurora);
        }
    }

    createCosmicRays() {
        // Create light rays emanating from center
        const rayCount = 20;
        for (let i = 0; i < rayCount; i++) {
            const rayGeometry = new THREE.CylinderGeometry(0.1, 2, 50, 8);
            const rayMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    calmness: { value: 0 },
                    rayIndex: { value: i }
                },
                vertexShader: `
                    varying float vY;
                    void main() {
                        vY = position.y;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    varying float vY;
                    uniform float time;
                    uniform float calmness;
                    uniform float rayIndex;
                    
                    void main() {
                        float fade = 1.0 - (vY + 25.0) / 50.0;
                        float pulse = sin(time * 2.0 + rayIndex * 0.5) * 0.5 + 0.5;
                        
                        vec3 color = vec3(0.5, 0.8, 1.0);
                        float alpha = fade * calmness * 0.3 * pulse;
                        
                        gl_FragColor = vec4(color, alpha);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            
            const ray = new THREE.Mesh(rayGeometry, rayMaterial);
            const angle = (i / rayCount) * Math.PI * 2;
            ray.position.set(Math.cos(angle) * 10, 0, Math.sin(angle) * 10);
            ray.rotation.z = Math.PI / 6 * (Math.random() - 0.5);
            ray.rotation.x = angle;
            
            this.cosmicRays.push({ mesh: ray, material: rayMaterial });
            this.meditationSpace.add(ray);
        }
    }

    createMeditationStone(x = 0, z = 0) {
        // Create a meditation stone that grows into a mini galaxy
        const stoneGroup = new THREE.Group();
        
        // Initial stone
        const stoneGeometry = new THREE.SphereGeometry(1, 32, 32);
        const stoneMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                growth: { value: 0 },
                userEnergy: { value: 0 }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                uniform float time;
                uniform float growth;
                
                void main() {
                    vNormal = normal;
                    vPosition = position;
                    
                    vec3 pos = position;
                    float pulse = sin(time * 2.0) * 0.05 * growth;
                    pos *= 1.0 + pulse;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                uniform float time;
                uniform float growth;
                uniform float userEnergy;
                
                void main() {
                    vec3 viewDirection = normalize(cameraPosition - vPosition);
                    float fresnel = pow(1.0 - dot(viewDirection, vNormal), 2.0);
                    
                    vec3 coreColor = vec3(0.5, 0.3, 0.8);
                    vec3 glowColor = vec3(0.3, 0.6, 1.0);
                    vec3 energyColor = vec3(1.0, 0.8, 0.3);
                    
                    vec3 color = mix(coreColor, glowColor, fresnel);
                    color = mix(color, energyColor, userEnergy * growth);
                    
                    float alpha = 0.8 + fresnel * 0.2;
                    
                    gl_FragColor = vec4(color * (1.0 + growth), alpha);
                }
            `,
            transparent: true
        });
        
        const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
        stone.position.set(x, 0, z);
        stoneGroup.add(stone);
        
        // Add orbiting particles when grown
        const orbitParticles = this.createOrbitingParticles();
        orbitParticles.visible = false;
        stoneGroup.add(orbitParticles);
        
        // Add to user galaxy
        this.userGalaxy.push({
            group: stoneGroup,
            stone: stone,
            material: stoneMaterial,
            orbitParticles: orbitParticles,
            growth: 0,
            energy: 0,
            created: Date.now()
        });
        
        this.meditationSpace.add(stoneGroup);
        return stoneGroup;
    }

    createOrbitingParticles() {
        const particleCount = 100;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = 3 + Math.random() * 2;
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
            positions[i * 3 + 2] = Math.sin(angle) * radius;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0x88ccff,
            size: 0.1,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        return new THREE.Points(geometry, material);
    }

    setupSoundVisualizers() {
        // Create visualizers for each sound type
        const soundTypes = ['rain', 'ocean', 'forest', 'cafe'];
        
        soundTypes.forEach(type => {
            const visualizer = this.createSoundVisualizer(type);
            this.soundVisualizers.set(type, visualizer);
            this.meditationSpace.add(visualizer);
        });
    }

    createSoundVisualizer(type) {
        const geometry = new THREE.RingGeometry(15, 20, 64);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                audioLevel: { value: 0 },
                soundType: { value: type === 'rain' ? 0 : type === 'ocean' ? 1 : type === 'forest' ? 2 : 3 }
            },
            vertexShader: `
                varying vec2 vUv;
                uniform float time;
                uniform float audioLevel;
                
                void main() {
                    vUv = uv;
                    vec3 pos = position;
                    
                    float wave = sin(uv.x * 10.0 + time) * audioLevel * 2.0;
                    pos.z += wave;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                uniform float audioLevel;
                uniform float soundType;
                
                void main() {
                    vec3 color;
                    
                    if (soundType < 0.5) {
                        color = vec3(0.3, 0.5, 0.8); // Rain - blue
                    } else if (soundType < 1.5) {
                        color = vec3(0.2, 0.6, 0.8); // Ocean - teal
                    } else if (soundType < 2.5) {
                        color = vec3(0.3, 0.7, 0.3); // Forest - green
                    } else {
                        color = vec3(0.6, 0.3, 0.8); // cafe - purple
                    }
                    
                    float alpha = audioLevel * 0.5 * (1.0 - vUv.y);
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        const visualizer = new THREE.Mesh(geometry, material);
        visualizer.rotation.x = -Math.PI / 2;
        visualizer.position.y = -10;
        visualizer.visible = false;
        
        return visualizer;
    }

    createJourneyPaths() {
        // Create visual paths for different meditation journeys
        this.journeyPaths = {
            tranquility: this.createTranquilityPath(),
            focus: this.createFocusPath(),
            energy: this.createEnergyPath()
        };
    }

    createTranquilityPath() {
        const path = new THREE.Group();
        
        // Floating lotus petals
        for (let i = 0; i < 8; i++) {
            const petalGeometry = new THREE.SphereGeometry(2, 16, 16);
            petalGeometry.scale(1, 0.3, 0.6);
            
            const petalMaterial = new THREE.MeshPhongMaterial({
                color: 0x88ccff,
                emissive: 0x4466aa,
                transparent: true,
                opacity: 0.7
            });
            
            const petal = new THREE.Mesh(petalGeometry, petalMaterial);
            const angle = (i / 8) * Math.PI * 2;
            petal.position.set(Math.cos(angle) * 5, 0, Math.sin(angle) * 5);
            petal.rotation.z = angle;
            
            path.add(petal);
        }
        
        return path;
    }

    createFocusPath() {
        const path = new THREE.Group();
        
        // Concentric rings
        for (let i = 0; i < 5; i++) {
            const ringGeometry = new THREE.TorusGeometry(5 + i * 3, 0.2, 8, 32);
            const ringMaterial = new THREE.MeshPhongMaterial({
                color: 0x8844ff,
                emissive: 0x4422aa,
                transparent: true,
                opacity: 0.7 - i * 0.1
            });
            
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = Math.PI / 2;
            path.add(ring);
        }
        
        return path;
    }

    createEnergyPath() {
        const path = new THREE.Group();
        
        // Energy spirals
        const spiralGeometry = new THREE.BufferGeometry();
        const spiralPoints = [];
        
        for (let i = 0; i < 200; i++) {
            const t = i / 200 * Math.PI * 4;
            const radius = 2 + t * 0.5;
            spiralPoints.push(
                Math.cos(t) * radius,
                t * 0.5,
                Math.sin(t) * radius
            );
        }
        
        spiralGeometry.setAttribute('position', new THREE.Float32BufferAttribute(spiralPoints, 3));
        
        const spiralMaterial = new THREE.LineBasicMaterial({
            color: 0xff8844,
            transparent: true,
            opacity: 0.8
        });
        
        const spiral = new THREE.Line(spiralGeometry, spiralMaterial);
        path.add(spiral);
        
        return path;
    }

    startJourney(journeyType) {
        this.currentJourney = journeyType;
        
        // Hide all journey paths
        Object.values(this.journeyPaths).forEach(path => {
            path.visible = false;
        });
        
        // Show selected journey path
        if (this.journeyPaths[journeyType]) {
            this.journeyPaths[journeyType].visible = true;
            this.meditationSpace.add(this.journeyPaths[journeyType]);
        }
        
        // Update environment for journey
        if (this.environmentMaterial) {
            const journeyValue = journeyType === 'tranquility' ? 1 : 
                               journeyType === 'focus' ? 2 : 3;
            this.environmentMaterial.uniforms.journeyType.value = journeyValue;
        }
    }

    updateBreathing(phase) {
        this.breathPhase = phase;
        if (this.breathingParticles) {
            this.breathingParticles.material.uniforms.breathPhase.value = phase;
        }
    }

    updateCalmness(level) {
        this.calmnessMeter = level;
        
        // Update all materials
        if (this.environmentMaterial) {
            this.environmentMaterial.uniforms.calmness.value = level;
        }
        
        if (this.breathingParticles) {
            this.breathingParticles.material.uniforms.calmness.value = level;
        }
        
        // Update auroras
        this.auroras.forEach(aurora => {
            aurora.material.uniforms.calmness.value = level;
        });
        
        // Update cosmic rays
        this.cosmicRays.forEach(ray => {
            ray.material.uniforms.calmness.value = level;
        });
    }

    updateSoundVisualizer(type, level) {
        const visualizer = this.soundVisualizers.get(type);
        if (visualizer) {
            visualizer.visible = level > 0;
            visualizer.material.uniforms.audioLevel.value = level;
        }
    }

    activate() {
        this.isActive = true;
        this.meditationSpace.visible = true;
        this.startTime = Date.now();
        
        // Start breathing guide
        this.startBreathingGuide();
    }

    deactivate() {
        this.isActive = false;
        this.meditationSpace.visible = false;
        
        if (this.breathInterval) {
            clearInterval(this.breathInterval);
            this.breathInterval = null;
        }
    }

    startBreathingGuide() {
        // Implement breathing patterns
        const patterns = {
            '4-7-8': { inhale: 4, hold: 7, exhale: 8 },
            'box': { inhale: 4, hold: 4, exhale: 4, holdEmpty: 4 },
            'coherent': { inhale: 5, exhale: 5 }
        };
        
        const pattern = patterns[this.breathingPattern];
        let phase = 'inhale';
        let phaseTime = 0;
        
        this.breathInterval = trackSetInterval(() => {
            // Update breath phase
            this.updateBreathingUI(phase);
            
            // Calculate next phase
            // Implementation depends on pattern
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
                case 'holdEmpty':
                    breathText.textContent = 'Hold Empty';
                    break;
            }
        }
    }

    update(deltaTime) {
        if (!this.isActive) return;
        
        const time = Date.now() * 0.001;
        
        // Update environment
        if (this.environmentMaterial) {
            this.environmentMaterial.uniforms.time.value = time;
        }
        
        // Update breathing particles
        if (this.breathingParticles) {
            this.breathingParticles.material.uniforms.time.value = time;
            this.breathingParticles.rotation.y += 0.0005;
        }
        
        // Update auroras
        this.auroras.forEach((aurora, index) => {
            aurora.material.uniforms.time.value = time;
            aurora.mesh.position.x = Math.sin(time * 0.2 + index) * 10;
        });
        
        // Update cosmic rays
        this.cosmicRays.forEach((ray, index) => {
            ray.material.uniforms.time.value = time;
            ray.mesh.rotation.y += 0.001;
        });
        
        // Update sound visualizers
        this.soundVisualizers.forEach((visualizer, type) => {
            if (visualizer.visible) {
                visualizer.material.uniforms.time.value = time;
                visualizer.rotation.z += 0.002;
            }
        });
        
        // Update user galaxy stones
        this.userGalaxy.forEach(item => {
            const age = (Date.now() - item.created) / 1000;
            item.growth = Math.min(age / 30, 1); // 30 seconds to full growth
            
            item.material.uniforms.time.value = time;
            item.material.uniforms.growth.value = item.growth;
            item.material.uniforms.userEnergy.value = this.calmnessMeter;
            
            // Show orbit particles when grown
            if (item.growth > 0.5 && !item.orbitParticles.visible) {
                item.orbitParticles.visible = true;
            }
            
            // Gentle rotation
            item.stone.rotation.y += 0.001;
            item.stone.rotation.x = Math.sin(time * 0.5) * 0.1;
            
            // Rotate orbit particles
            if (item.orbitParticles.visible) {
                item.orbitParticles.rotation.y += 0.003;
            }
        });
        
        // Update journey paths
        if (this.currentJourney && this.journeyPaths[this.currentJourney]) {
            const path = this.journeyPaths[this.currentJourney];
            path.rotation.y += 0.001;
            
            // Journey-specific animations
            if (this.currentJourney === 'tranquility') {
                path.children.forEach((petal, i) => {
                    petal.position.y = Math.sin(time * 0.5 + i * 0.5) * 2;
                });
            } else if (this.currentJourney === 'focus') {
                path.children.forEach((ring, i) => {
                    ring.scale.setScalar(1 + Math.sin(time + i * 0.5) * 0.1);
                });
            }
        }
        
        // Update meditation time
        this.meditationTime += deltaTime;
        this.updateMeditationStats();
        
        // Auto-adjust calmness based on consistency
        const breathingConsistency = Math.sin(this.breathPhase) * 0.5 + 0.5;
        const targetCalmness = Math.min(breathingConsistency * (this.meditationTime / 300), 1); // 5 minutes to max
        this.updateCalmness(this.calmnessMeter + (targetCalmness - this.calmnessMeter) * 0.01);
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

    // Add stone at meditation milestones
    checkMilestones() {
        const milestones = [60, 180, 300, 600, 900]; // 1, 3, 5, 10, 15 minutes
        const currentMilestone = Math.floor(this.meditationTime / 60) * 60;
        
        if (milestones.includes(currentMilestone) && !this.reachedMilestones?.includes(currentMilestone)) {
            this.reachedMilestones = this.reachedMilestones || [];
            this.reachedMilestones.push(currentMilestone);
            
            // Add a new meditation stone
            const angle = Math.random() * Math.PI * 2;
            const distance = 10 + this.userGalaxy.length * 3;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            this.createMeditationStone(x, z);
            
            // Show achievement
            if (window.showAchievement) {
                window.showAchievement('Meditation Milestone!', `${currentMilestone / 60} minutes of peace achieved`);
            }
        }
    }
}

// Export for use in other modules
export const cosmicMeditation = new CosmicMeditationSystem();