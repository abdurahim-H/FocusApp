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
            blending: THREE.AdditiveBlending
        });
    
        const accretionDisk = new THREE.Mesh(diskGeometry, diskMaterial);
        accretionDisk.rotation.x = Math.PI / 2;
        blackHoleGroup.add(accretionDisk);
        shaderMaterials.push(diskMaterial);
    
        // KEEP THE CYAN POLAR JETS - No changes to this!
        createPolarJets(blackHoleGroup);
        
        // Gravitational lensing rings - CLOSER TOGETHER
        createGravitationalLensing(blackHoleGroup);
        
        // Smooth energy particles
        createSmoothEnergyParticles(blackHoleGroup);
        
        // Space-time distortion waves - CLOSER TOGETHER
        createGravitationalWaves(blackHoleGroup);
        
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
    const themeValue = isLightTheme ? 1.0 : 0.0;
    
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
            side: THREE.DoubleSide
        });
        
        const jet = new THREE.Mesh(jetGeometry, jetMaterial);
        jet.position.y = direction * 25;
        jet.rotation.z = direction > 0 ? 0 : Math.PI;
        parentGroup.add(jet);
        shaderMaterials.push(jetMaterial);
    });
}

// CLOSER gravitational lensing rings with BETTER VISIBILITY
function createGravitationalLensing(parentGroup) {
    // Rings closer together
    const ringConfigs = [
        { radius: 25, tiltRange: 30 },     // Ring 1
        { radius: 35, tiltRange: 45 },     // Ring 2 (was 50)
        { radius: 45, tiltRange: 60 }      // Ring 3 (was 65)
    ];
    
    ringConfigs.forEach((config, i) => {
        const ringGeometry = new THREE.RingGeometry(config.radius - 0.5, config.radius + 0.5, 128);
        const ringMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                ringIndex: { value: i },
                theme: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                uniform float time;
                uniform float ringIndex;
                
                void main() {
                    vUv = uv;
                    
                    // Subtle wave distortion
                    vec3 pos = position;
                    float wave = sin(time * 0.3 + ringIndex * 1.5) * 0.1;
                    wave *= sin(length(position.xy) * 0.1 + time * 0.2);
                    pos.z += wave;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                uniform float time;
                uniform float ringIndex;
                uniform float theme;
                
                void main() {
                    float pulse = sin(time * 1.0 + ringIndex * 0.8) * 0.3 + 0.7;
                    
                    vec3 color;
                    float opacity;
                    
                    if (theme > 0.5) {
                        // Light theme - keep purple but darker
                        color = vec3(0.6, 0.3, 1.0) * pulse;
                        opacity = 0.5;
                    } else {
                        // Dark/Cosmos theme - brighter, more vibrant colors
                        color = mix(
                            vec3(0.4, 0.8, 1.0),  // Cyan
                            vec3(1.0, 0.4, 0.8),  // Pink
                            sin(time * 0.5 + ringIndex)
                        ) * pulse;
                        opacity = 0.7;
                    }
                    
                    // Smooth fade based on angle
                    float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
                    float angleFade = sin(angle * 4.0 + time * 0.5) * 0.5 + 0.5;
                    
                    gl_FragColor = vec4(color, opacity * angleFade);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        
        // Apply randomized tilt
        const tiltRadians = (config.tiltRange * Math.PI / 180);
        const randomTiltX = (Math.random() - 0.5) * 2 * tiltRadians;
        const randomTiltY = (Math.random() - 0.5) * 2 * tiltRadians;
        
        ring.rotation.x = Math.PI / 2 + randomTiltX;
        ring.rotation.y = randomTiltY;
        
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
    parentGroup.add(particles);
    shaderMaterials.push(particleMaterial);
    energyParticles.push(particles);
}

// CLOSER gravitational waves with BETTER VISIBILITY
function createGravitationalWaves(parentGroup) {
    // Waves closer together
    const waveConfigs = [
        { innerRadius: 30, outerRadius: 32, tiltRange: 15 },
        { innerRadius: 42, outerRadius: 44, tiltRange: 30 },   // was 60
        { innerRadius: 54, outerRadius: 56, tiltRange: 45 }    // was 80
    ];
    
    waveConfigs.forEach((config, i) => {
        const waveGeometry = new THREE.RingGeometry(config.innerRadius, config.outerRadius, 64);
        const waveMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                waveIndex: { value: i },
                productivity: { value: 0.5 },
                theme: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                uniform float time;
                uniform float waveIndex;
                
                void main() {
                    vUv = uv;
                    
                    vec3 pos = position;
                    float wave = sin(time * 0.3 + waveIndex * 0.5) * 0.5;
                    pos.z += wave;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                uniform float time;
                uniform float waveIndex;
                uniform float productivity;
                uniform float theme;
                
                void main() {
                    float wave = sin(time * 0.8 + waveIndex * 1.2) * 0.5 + 0.5;
                    
                    vec3 color;
                    float opacity;
                    
                    if (theme > 0.5) {
                        // Light theme - visible but not overpowering
                        vec3 lowColor = vec3(0.8, 0.4, 0.8);   // Pink
                        vec3 highColor = vec3(0.4, 0.2, 0.8);  // Purple
                        color = mix(lowColor, highColor, productivity);
                        opacity = wave * 0.15 * (productivity + 0.5);
                    } else {
                        // Dark/Cosmos theme - brighter for visibility
                        vec3 lowColor = vec3(0.2, 0.6, 1.0);   // Bright blue
                        vec3 highColor = vec3(1.0, 0.2, 0.6);  // Hot pink
                        color = mix(lowColor, highColor, productivity);
                        opacity = wave * 0.25 * (productivity + 0.5);
                    }
                    
                    gl_FragColor = vec4(color, opacity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        
        const wave = new THREE.Mesh(waveGeometry, waveMaterial);
        
        // Apply randomized tilt
        const tiltRadians = (config.tiltRange * Math.PI / 180);
        
        // Randomize which axis to rotate around for variety
        const axisChoice = Math.random();
        if (axisChoice < 0.33) {
            wave.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 2 * tiltRadians;
        } else if (axisChoice < 0.66) {
            wave.rotation.x = Math.PI / 2;
            wave.rotation.y = (Math.random() - 0.5) * 2 * tiltRadians;
        } else {
            wave.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * tiltRadians;
            wave.rotation.y = (Math.random() - 0.5) * tiltRadians;
        }
        
        wave.position.y = (Math.random() - 0.5) * 2;
        parentGroup.add(wave);
        shaderMaterials.push(waveMaterial);
        gravitationalWaves.push(wave);
    });
}

// Smooth animation update function
export function updateBlackHoleEffects() {
    const time = Date.now() * 0.001;
    
    // Update theme for all materials
    const theme = document.body.getAttribute('data-theme');
    const isLightTheme = theme === 'light';
    const themeValue = isLightTheme ? 1.0 : 0.0;
    
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
    
    // Smooth gravitational wave animations
    gravitationalWaves.forEach((wave, index) => {
        // Only rotate around Z axis to maintain the randomized tilts
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