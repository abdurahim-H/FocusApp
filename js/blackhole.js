import { scene } from './scene3d.js';
import { appState } from './state.js';
import { trackRequestAnimationFrame } from './cleanup.js';

export let blackHoleSystem = {};
let shaderMaterials = [];
let energyParticles = [];
let gravitationalWaves = [];

export function createEnhancedBlackHole() {
    try {
        if (!scene) {
            console.warn('Scene not available for black hole creation');
            return;
        }

        const blackHoleGroup = new THREE.Group();
    
        // Event Horizon with smooth warping
        const eventHorizonGeometry = new THREE.SphereGeometry(3, 64, 64);
        const eventHorizonMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                intensity: { value: 1.0 }
            },
            vertexShader: `
                varying vec3 vPosition;
                varying vec3 vNormal;
                uniform float time;
                
                void main() {
                    vPosition = position;
                    vNormal = normal;
                    
                    // Subtle vertex displacement for warping effect
                    vec3 pos = position;
                    float warp = sin(time * 0.3 + pos.x * 0.2) * 0.05;
                    warp += cos(time * 0.4 + pos.y * 0.3) * 0.05;
                    pos += normal * warp;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vPosition;
                varying vec3 vNormal;
                uniform float time;
                uniform float intensity;
                
                void main() {
                    // Create event horizon effect - pure black with subtle edge glow
                    vec3 viewDirection = normalize(cameraPosition - vPosition);
                    float fresnel = 1.0 - abs(dot(viewDirection, vNormal));
                    
                    // Hawking radiation effect at the edge
                    float hawkingGlow = pow(fresnel, 3.0) * intensity;
                    vec3 hawkingColor = vec3(0.0, 0.1, 0.3) * hawkingGlow;
                    
                    // Time-based intensity variation
                    float pulse = sin(time * 0.2) * 0.1 + 0.9;
                    
                    gl_FragColor = vec4(hawkingColor * pulse, 1.0 - fresnel * 0.3);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });
    
        const eventHorizon = new THREE.Mesh(eventHorizonGeometry, eventHorizonMaterial);
        blackHoleGroup.add(eventHorizon);
        shaderMaterials.push(eventHorizonMaterial);
    
        // Tight Accretion Disk that hugs the black hole (no gap) - FIXED YELLOW COLOR
        const diskGeometry = new THREE.RingGeometry(3.1, 8, 128, 32);
        const diskMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                focusMode: { value: 0.0 },
                productivity: { value: 0.5 },
                theme: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                uniform float time;
                
                void main() {
                    vUv = uv;
                    vPosition = position;
                    
                    // Smooth wave-based height variation
                    float radius = length(position.xy);
                    float wave1 = sin(time * 1.0 + radius * 0.3) * 0.1;
                    float wave2 = cos(time * 0.7 + radius * 0.5) * 0.08;
                    float height = wave1 + wave2;
                    
                    vec3 pos = position;
                    pos.z += height * smoothstep(3.1, 8.0, radius) * 0.5;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                uniform float time;
                uniform float focusMode;
                uniform float productivity;
                uniform float theme;
                
                void main() {
                    float radius = length(vPosition.xy);
                    float normalizedRadius = (radius - 3.1) / 4.9;
                    
                    // Smooth temperature gradient
                    float temperature = smoothstep(1.0, 0.0, normalizedRadius);
                    
                    // Create smooth swirling pattern
                    float angle = atan(vPosition.y, vPosition.x);
                    float spiral = sin(angle * 6.0 + time * 1.5 - radius * 0.2) * 0.5 + 0.5;
                    spiral *= sin(angle * 3.0 - time * 0.8 + radius * 0.15) * 0.5 + 0.5;
                    
                    // Theme-aware color scheme
                    vec3 hotColor, mediumColor, coolColor;
                    
                    if (theme > 0.5) {
                        // Light theme - PROPER YELLOW/ORANGE accretion disk
                        hotColor = vec3(1.0, 0.65, 0.0);      // Orange-yellow
                        mediumColor = vec3(1.0, 0.8, 0.0);    // Yellow
                        coolColor = vec3(1.0, 0.9, 0.2);      // Light yellow
                    } else {
                        // Dark/Cosmic theme - vibrant colors for visibility
                        hotColor = vec3(1.0, 0.3, 0.0);       // Orange-red
                        mediumColor = vec3(1.0, 0.6, 0.1);    // Orange
                        coolColor = vec3(0.4, 0.6, 1.0);      // Blue
                    }
                    
                    vec3 baseColor = mix(coolColor, mix(mediumColor, hotColor, temperature), temperature);
                    
                    // Focus mode enhancement
                    if (focusMode > 0.0) {
                        vec3 focusColor = theme > 0.5 ? vec3(1.0, 0.7, 0.0) : vec3(0.0, 1.0, 1.0);
                        baseColor = mix(baseColor, focusColor, focusMode * 0.3 * spiral);
                    }
                    
                    // Productivity boost effect
                    float productivityGlow = productivity * spiral * 0.3;
                    baseColor += vec3(productivityGlow * 0.2, productivityGlow * 0.4, productivityGlow * 0.1);
                    
                    // Enhanced opacity for better visibility
                    float turbulence = spiral * temperature;
                    float baseOpacity = theme > 0.5 ? 0.9 : 0.8; // Higher base opacity
                    float opacity = turbulence * baseOpacity + 0.2;
                    opacity = clamp(opacity, 0.0, 1.0);
                    
                    // Ensure disk is always visible
                    opacity = max(opacity, 0.4);
                    
                    gl_FragColor = vec4(baseColor, opacity);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: true
        });
    
        const accretionDisk = new THREE.Mesh(diskGeometry, diskMaterial);
        accretionDisk.rotation.x = Math.PI / 2;
        accretionDisk.renderOrder = 1; // Render after background but before UI
        blackHoleGroup.add(accretionDisk);
        shaderMaterials.push(diskMaterial);
    
        // KEEP THE CYAN POLAR JETS - No changes to this!
        createPolarJets(blackHoleGroup);
        
        // Enhanced gravitational lensing rings with improvements
        createEnhancedGravitationalLensing(blackHoleGroup);
        
        // Smooth energy particles
        createSmoothEnergyParticles(blackHoleGroup);
        
        scene.add(blackHoleGroup);
        
        // Store references
        blackHoleSystem = {
            group: blackHoleGroup,
            eventHorizon: eventHorizon,
            accretionDisk: accretionDisk,
            eventHorizonMaterial: eventHorizonMaterial,
            diskMaterial: diskMaterial
        };
        
        // Listen for theme changes
        const observer = new MutationObserver(() => {
            updateTheme();
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
        
        // Initial theme update
        updateTheme();
        
    } catch (error) {
        console.error('Failed to create enhanced black hole:', error);
        // Fallback: create a simple black sphere
        try {
            const fallbackGeometry = new THREE.SphereGeometry(3, 32, 32);
            const fallbackMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
            const fallbackBlackHole = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
            scene.add(fallbackBlackHole);
            blackHoleSystem = { group: fallbackBlackHole };
        } catch (fallbackError) {
            console.error('Failed to create fallback black hole:', fallbackError);
        }
    }
}

// Update theme for all materials
function updateTheme() {
    const theme = document.body.getAttribute('data-theme');
    const isLightTheme = theme === 'light';
    const isCosmosTheme = theme === 'cosmos';
    const isDarkTheme = theme === 'dark';
    
    let themeValue = 0; // Default dark
    if (isLightTheme) themeValue = 1;
    else if (isCosmosTheme) themeValue = 0.5;
    
    // Update disk material
    if (blackHoleSystem.diskMaterial && blackHoleSystem.diskMaterial.uniforms.theme) {
        blackHoleSystem.diskMaterial.uniforms.theme.value = themeValue;
    }
    
    // Update other shader materials that might need theme awareness
    shaderMaterials.forEach(material => {
        if (material.uniforms && material.uniforms.theme) {
            material.uniforms.theme.value = themeValue;
        }
    });
}

// KEEP THE ORIGINAL POLAR JETS - They are the cyan beams!
function createPolarJets(parentGroup) {
    // Create two jets shooting from the poles
    [-1, 1].forEach(direction => {
        const jetGeometry = new THREE.CylinderGeometry(0.2, 1, 40, 8, 1, true);
        const jetMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                direction: { value: direction }
            },
            vertexShader: `
                varying vec2 vUv;
                varying float vY;
                uniform float time;
                uniform float direction;
                
                void main() {
                    vUv = uv;
                    vY = position.y;
                    
                    // Add energy flow animation
                    vec3 pos = position;
                    float wave = sin(time * 4.0 + position.y * 0.3) * 0.1;
                    pos.x += wave;
                    pos.z += wave * 0.7;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                varying float vY;
                uniform float time;
                uniform float direction;
                
                void main() {
                    float intensity = 1.0 - abs(vY) / 20.0;
                    float flow = sin(time * 6.0 + vY * 0.5) * 0.5 + 0.5;
                    
                    vec3 jetColor = vec3(0.2, 0.8, 1.0); // Cyan energy
                    float opacity = intensity * flow * 0.8;
                    
                    gl_FragColor = vec4(jetColor, opacity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        const jet = new THREE.Mesh(jetGeometry, jetMaterial);
        jet.position.y = direction * 25;
        jet.rotation.z = direction > 0 ? 0 : Math.PI;
        jet.renderOrder = 2;
        parentGroup.add(jet);
        shaderMaterials.push(jetMaterial);
    });
}

// ENHANCED gravitational lensing rings with all improvements
function createEnhancedGravitationalLensing(parentGroup) {
    // Three hero rings with rational size progression (1.3x)
    const baseRadius = 20;
    const ringConfigs = [
        { 
            radius: baseRadius, 
            width: 2.0,
            tiltRange: 30,
            wobbleSpeed: 0.2
        },
        { 
            radius: baseRadius * 1.3, 
            width: 2.5,
            tiltRange: 45,
            wobbleSpeed: 0.3
        },
        { 
            radius: baseRadius * 1.69, // 1.3 * 1.3
            width: 3.0,
            tiltRange: 60,
            wobbleSpeed: 0.25
        }
    ];
    
    ringConfigs.forEach((config, i) => {
        // Create tapered ring geometry
        const ringSegments = 128;
        const ringThickness = 32;
        const geometry = new THREE.BufferGeometry();
        
        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        
        // Generate vertices for tapered ring
        for (let j = 0; j <= ringSegments; j++) {
            const angle = (j / ringSegments) * Math.PI * 2;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            
            for (let k = 0; k <= ringThickness; k++) {
                const t = k / ringThickness;
                
                // Taper the width based on viewing angle
                const viewAngle = Math.atan2(sin, cos);
                const taper = 1.0 - Math.abs(Math.sin(viewAngle)) * 0.3;
                
                const innerRadius = config.radius - config.width * 0.5 * taper;
                const outerRadius = config.radius + config.width * 0.5 * taper;
                const radius = innerRadius + (outerRadius - innerRadius) * t;
                
                positions.push(cos * radius, sin * radius, 0);
                normals.push(0, 0, 1);
                uvs.push(j / ringSegments, t);
            }
        }
        
        // Generate indices
        for (let j = 0; j < ringSegments; j++) {
            for (let k = 0; k < ringThickness; k++) {
                const a = j * (ringThickness + 1) + k;
                const b = a + ringThickness + 1;
                const c = a + 1;
                const d = b + 1;
                
                indices.push(a, b, c);
                indices.push(b, d, c);
            }
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        
        const ringMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                ringIndex: { value: i },
                theme: { value: 0 },
                wobbleSpeed: { value: config.wobbleSpeed }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                uniform float time;
                uniform float ringIndex;
                uniform float wobbleSpeed;
                
                void main() {
                    vUv = uv;
                    vPosition = position;
                    vNormal = normal;
                    
                    // Subtle wave distortion
                    vec3 pos = position;
                    float wave = sin(time * 0.3 + ringIndex * 1.5) * 0.1;
                    wave *= sin(length(position.xy) * 0.1 + time * 0.2);
                    pos.z += wave;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    vViewPosition = -mvPosition.xyz;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                uniform float time;
                uniform float ringIndex;
                uniform float theme;
                uniform float wobbleSpeed;
                
                void main() {
                    // Edge fade using fresnel
                    vec3 viewDir = normalize(vViewPosition);
                    float fresnel = 1.0 - abs(dot(viewDir, vNormal));
                    float edgeFade = pow(fresnel, 1.5);
                    
                    // Radial gradient for dusty halo effect
                    float radialFade = 1.0 - smoothstep(0.0, 1.0, abs(vUv.y - 0.5) * 2.0);
                    
                    // Animated glow
                    float pulse = sin(time * 1.0 + ringIndex * 0.8) * 0.3 + 0.7;
                    
                    vec3 baseColor;
                    vec3 emissiveColor;
                    float opacity;
                    float emissiveIntensity;
                    
                    // Theme-specific colors and settings
                    if (theme > 0.75) {
                        // Light theme - high contrast purple with emissive
                        baseColor = vec3(0.463, 0.376, 0.902); // #7660E6
                        emissiveColor = vec3(0.686, 0.608, 1.0); // #AF9BFF
                        emissiveIntensity = 0.6;
                        opacity = 0.7 * radialFade;
                        
                        // Add extra edge highlight for light theme
                        vec3 edgeColor = vec3(0.3, 0.2, 0.5); // Dark purple edge
                        baseColor = mix(baseColor, edgeColor, pow(1.0 - radialFade, 3.0));
                        
                    } else if (theme > 0.25) {
                        // Cosmos theme - vibrant with bloom
                        baseColor = vec3(0.416, 0.325, 0.831); // #6A53D4
                        emissiveColor = baseColor;
                        emissiveIntensity = 0.2;
                        opacity = 0.5 * radialFade;
                        
                        // Enhanced fresnel glow for cosmos
                        emissiveIntensity += edgeFade * 0.3;
                        
                    } else {
                        // Dark theme - current violet with higher emissive
                        baseColor = vec3(0.6, 0.3, 1.0);
                        emissiveColor = baseColor;
                        emissiveIntensity = 0.35;
                        opacity = 0.5 * radialFade;
                        
                        // Fresnel edge enhancement
                        emissiveIntensity += edgeFade * 0.2;
                    }
                    
                    // Apply pulse animation
                    vec3 color = baseColor * pulse;
                    
                    // Add emissive glow
                    color += emissiveColor * emissiveIntensity * (0.7 + pulse * 0.3);
                    
                    // Additional glow based on edge fade
                    color += emissiveColor * pow(edgeFade, 2.0) * 0.3;
                    
                    // Smooth fade based on angle for animation
                    float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
                    float angleFade = sin(angle * 4.0 + time * 0.5) * 0.5 + 0.5;
                    opacity *= angleFade;
                    
                    // Ensure minimum visibility
                    opacity = max(opacity, 0.15);
                    
                    gl_FragColor = vec4(color, opacity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: true
        });
        
        const ring = new THREE.Mesh(geometry, ringMaterial);
        
        // Apply initial randomized tilt
        const tiltRadians = (config.tiltRange * Math.PI / 180);
        const randomTiltX = (Math.random() - 0.5) * 2 * tiltRadians;
        const randomTiltY = (Math.random() - 0.5) * 2 * tiltRadians;
        
        ring.rotation.x = Math.PI / 2 + randomTiltX;
        ring.rotation.y = randomTiltY;
        
        // Store wobble parameters
        ring.userData = {
            baseTiltX: ring.rotation.x,
            baseTiltY: ring.rotation.y,
            wobbleSpeed: config.wobbleSpeed,
            wobblePhase: Math.random() * Math.PI * 2
        };
        
        ring.renderOrder = 0; // Render behind everything else
        parentGroup.add(ring);
        shaderMaterials.push(ringMaterial);
        gravitationalWaves.push(ring);
    });
}

function createSmoothEnergyParticles(parentGroup) {
    const particleCount = 300;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const ages = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Start near the black hole
        const radius = 5 + Math.random() * 10;
        const angle = Math.random() * Math.PI * 2;
        const height = (Math.random() - 0.5) * 5;
        
        positions[i3] = Math.cos(angle) * radius;
        positions[i3 + 1] = height;
        positions[i3 + 2] = Math.sin(angle) * radius;
        
        // Smooth velocities
        velocities[i3] = (positions[i3] / radius) * (0.05 + Math.random() * 0.1);
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.05;
        velocities[i3 + 2] = (positions[i3 + 2] / radius) * (0.05 + Math.random() * 0.1);
        
        ages[i] = Math.random() * 100;
        sizes[i] = 1 + Math.random() * 2;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    particleGeometry.setAttribute('age', new THREE.BufferAttribute(ages, 1));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            taskCompletion: { value: 0.0 }
        },
        vertexShader: `
            attribute vec3 velocity;
            attribute float age;
            attribute float size;
            varying float vAge;
            varying float vSize;
            uniform float time;
            
            void main() {
                vAge = age;
                vSize = size;
                
                vec3 pos = position + velocity * time * 10.0;
                
                // Spiral motion
                float angle = time * 0.5 + age * 0.1;
                pos.x += sin(angle) * 0.5;
                pos.z += cos(angle) * 0.5;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * 2.0 * (100.0 / -gl_Position.z);
            }
        `,
        fragmentShader: `
            varying float vAge;
            varying float vSize;
            uniform float time;
            uniform float taskCompletion;
            
            void main() {
                float life = mod(vAge + time * 10.0, 100.0) / 100.0;
                float opacity = smoothstep(1.0, 0.0, life);
                
                // Task completion makes particles more golden
                vec3 baseColor = vec3(1.0, 0.5, 0.0);
                vec3 completionColor = vec3(1.0, 1.0, 0.0);
                vec3 color = mix(baseColor, completionColor, taskCompletion);
                
                // Soft particle edges
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);
                float alpha = smoothstep(0.5, 0.0, dist);
                
                gl_FragColor = vec4(color, opacity * alpha * 0.8);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.renderOrder = 3;
    parentGroup.add(particles);
    shaderMaterials.push(particleMaterial);
    energyParticles.push(particles);
}

// Smooth animation update function
export function updateBlackHoleEffects() {
    const time = Date.now() * 0.001;
    
    // Update theme for all materials
    const theme = document.body.getAttribute('data-theme');
    const isLightTheme = theme === 'light';
    const isCosmosTheme = theme === 'cosmos';
    const isDarkTheme = theme === 'dark';
    
    let themeValue = 0; // Default dark
    if (isLightTheme) themeValue = 1;
    else if (isCosmosTheme) themeValue = 0.5;
    
    // Update all shader materials with smooth transitions
    shaderMaterials.forEach(material => {
        if (material.uniforms.time) {
            material.uniforms.time.value = time;
        }
        
        // Smooth theme transition
        if (material.uniforms.theme !== undefined) {
            const currentTheme = material.uniforms.theme.value;
            material.uniforms.theme.value += (themeValue - currentTheme) * 0.05;
        }
        
        // Smooth focus mode transition
        if (material.uniforms.focusMode) {
            const targetFocus = appState.currentMode === 'focus' ? 1.0 : 0.0;
            const currentFocus = material.uniforms.focusMode.value;
            material.uniforms.focusMode.value += (targetFocus - currentFocus) * 0.05;
        }
        
        // Smooth productivity updates
        if (material.uniforms.productivity) {
            const completedTasks = appState.tasks.filter(task => task.completed).length;
            const totalTasks = appState.tasks.length;
            const targetProductivity = totalTasks > 0 ? completedTasks / totalTasks : 0.5;
            const currentProductivity = material.uniforms.productivity.value;
            material.uniforms.productivity.value += (targetProductivity - currentProductivity) * 0.05;
        }
        
        if (material.uniforms.taskCompletion) {
            const recentCompletions = appState.tasks.filter(task => 
                task.completed && Date.now() - task.completedAt < 5000
            ).length;
            const targetCompletion = Math.min(recentCompletions / 3, 1.0);
            const currentCompletion = material.uniforms.taskCompletion.value;
            material.uniforms.taskCompletion.value += (targetCompletion - currentCompletion) * 0.05;
        }
    });
    
    // Smooth black hole rotation
    if (blackHoleSystem.group) {
        const completedTasks = appState.tasks.filter(task => task.completed).length;
        const baseSpeed = 0.001;
        const bonusSpeed = completedTasks * 0.0002;
        const rotationSpeed = baseSpeed + bonusSpeed;
        
        blackHoleSystem.group.rotation.y += rotationSpeed;
        
        // Smooth intensity pulsing in focus mode
        if (appState.currentMode === 'focus' && blackHoleSystem.eventHorizonMaterial) {
            const targetIntensity = 0.7 + Math.sin(time * 2) * 0.3;
            const currentIntensity = blackHoleSystem.eventHorizonMaterial.uniforms.intensity.value;
            blackHoleSystem.eventHorizonMaterial.uniforms.intensity.value += 
                (targetIntensity - currentIntensity) * 0.05;
        }
    }
    
    // Enhanced gravitational wave animations with orbital wobble
    gravitationalWaves.forEach((wave, index) => {
        // Orbital wobble (precession)
        if (wave.userData) {
            const wobbleAmount = 0.1; // radians
            const wobbleX = Math.sin(time * wave.userData.wobbleSpeed + wave.userData.wobblePhase) * wobbleAmount;
            const wobbleY = Math.cos(time * wave.userData.wobbleSpeed * 0.7 + wave.userData.wobblePhase) * wobbleAmount;
            
            wave.rotation.x = wave.userData.baseTiltX + wobbleX;
            wave.rotation.y = wave.userData.baseTiltY + wobbleY;
        }
        
        // Gentle rotation around Z axis
        wave.rotation.z += 0.0005 + index * 0.0002;
        
        // Smooth scale pulsing
        if (appState.timerState === 'running') {
            const targetScale = 1 + Math.sin(time * 0.3 + index) * 0.03;
            const currentScale = wave.scale.x;
            const newScale = currentScale + (targetScale - currentScale) * 0.05;
            wave.scale.setScalar(newScale);
        }
    });
}

// Keep other functions but ensure they don't cause visual disruption
export function triggerFocusIntensification() {
    // Smooth intensification without jarring changes
    if (blackHoleSystem.diskMaterial) {
        // Already handled in updateBlackHoleEffects with smooth transitions
    }
}

export function triggerTaskCompletionBurst() {
    // Disabled as requested
    console.log('🔥 WARNING: triggerTaskCompletionBurst() called - this should be DISABLED!');
    return; // Early return to prevent execution
}