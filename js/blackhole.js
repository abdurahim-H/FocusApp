// import { scene } from './scene3d.js';
// import { appState } from './state.js';
// import { trackRequestAnimationFrame } from './cleanup.js';

// export let blackHoleSystem = {};
// let shaderMaterials = [];
// let energyParticles = [];
// let gravitationalWaves = [];

// export function createEnhancedBlackHole() {
//     try {
//         if (!scene) {
//             console.warn('Scene not available for black hole creation');
//             return;
//         }

//         const blackHoleGroup = new THREE.Group();
    
//         const eventHorizonGeometry = new THREE.SphereGeometry(3, 64, 64);
//         const eventHorizonMaterial = new THREE.ShaderMaterial({
//         uniforms: {
//             time: { value: 0 },
//             intensity: { value: 1.0 }
//         },
//         vertexShader: `
//             varying vec3 vPosition;
//             varying vec3 vNormal;
//             uniform float time;
            
//             void main() {
//                 vPosition = position;
//                 vNormal = normal;
                
//                 // Add subtle vertex displacement for warping effect
//                 vec3 pos = position;
//                 float warp = sin(time * 0.5 + pos.x * 0.3) * 0.1;
//                 pos += normal * warp;
                
//                 gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
//             }
//         `,
//         fragmentShader: `
//             varying vec3 vPosition;
//             varying vec3 vNormal;
//             uniform float time;
//             uniform float intensity;
            
//             void main() {
//                 // Create event horizon effect - pure black with subtle edge glow
//                 vec3 viewDirection = normalize(cameraPosition - vPosition);
//                 float fresnel = 1.0 - abs(dot(viewDirection, vNormal));
                
//                 // Hawking radiation effect at the edge
//                 float hawkingGlow = pow(fresnel, 3.0) * intensity;
//                 vec3 hawkingColor = vec3(0.0, 0.1, 0.3) * hawkingGlow;
                
//                 // Time-based intensity variation
//                 float pulse = sin(time * 0.3) * 0.2 + 0.8;
                
//                 gl_FragColor = vec4(hawkingColor * pulse, 1.0 - fresnel * 0.3);
//             }
//         `,
//         transparent: true,
//         side: THREE.DoubleSide
//     });
    
//     const eventHorizon = new THREE.Mesh(eventHorizonGeometry, eventHorizonMaterial);
//     blackHoleGroup.add(eventHorizon);
//     shaderMaterials.push(eventHorizonMaterial);
    
//     // 2. Enhanced Accretion Disk with realistic physics visualization
//     const diskGeometry = new THREE.RingGeometry(4, 20, 128, 32);
//     const diskMaterial = new THREE.ShaderMaterial({
//         uniforms: {
//             time: { value: 0 },
//             focusMode: { value: 0.0 },
//             productivity: { value: 0.5 }
//         },
//         vertexShader: `
//             varying vec2 vUv;
//             varying vec3 vPosition;
//             uniform float time;
            
//             void main() {
//                 vUv = uv;
//                 vPosition = position;
                
//                 // Add temperature-based height variation
//                 float radius = length(position.xy);
//                 float height = sin(time * 2.0 + radius * 0.5) * 0.2;
                
//                 vec3 pos = position;
//                 pos.z += height;
                
//                 gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
//             }
//         `,
//         fragmentShader: `
//             varying vec2 vUv;
//             varying vec3 vPosition;
//             uniform float time;
//             uniform float focusMode;
//             uniform float productivity;
            
//             void main() {
//                 float radius = length(vPosition.xy);
//                 float normalizedRadius = (radius - 4.0) / 16.0;
                
//                 // Temperature gradient (hotter closer to black hole)
//                 float temperature = 1.0 - normalizedRadius;
                
//                 // Create swirling pattern
//                 float angle = atan(vPosition.y, vPosition.x);
//                 float spiral = sin(angle * 8.0 + time * 2.0 - radius * 0.3) * 0.5 + 0.5;
                
//                 // Color based on temperature and activity
//                 vec3 hotColor = vec3(1.0, 0.4, 0.1); // Orange-red
//                 vec3 mediumColor = vec3(0.8, 0.6, 0.2); // Yellow
//                 vec3 coolColor = vec3(0.3, 0.5, 1.0); // Blue
                
//                 vec3 baseColor = mix(coolColor, mix(mediumColor, hotColor, temperature), temperature);
                
//                 // Focus mode enhancement - more intense colors
//                 if (focusMode > 0.5) {
//                     baseColor = mix(baseColor, vec3(0.0, 1.0, 1.0), focusMode * 0.3);
//                 }
                
//                 // Productivity boost effect
//                 float productivityGlow = productivity * spiral * 0.5;
//                 baseColor += vec3(productivityGlow * 0.3, productivityGlow * 0.6, productivityGlow * 0.2);
                
//                 // Turbulence and opacity
//                 float turbulence = spiral * temperature;
//                 float opacity = turbulence * (0.6 + sin(time + radius) * 0.2);
                
//                 gl_FragColor = vec4(baseColor, opacity);
//             }
//         `,
//         transparent: true,
//         side: THREE.DoubleSide,
//         blending: THREE.AdditiveBlending
//     });
    
//     const accretionDisk = new THREE.Mesh(diskGeometry, diskMaterial);
//     accretionDisk.rotation.x = Math.PI / 2;
//     blackHoleGroup.add(accretionDisk);
//     shaderMaterials.push(diskMaterial);
    
//     // 3. Polar Jets - high-energy particle streams
//     createPolarJets(blackHoleGroup);
    
//     // 4. Gravitational Lensing Effect
//     createGravitationalLensing(blackHoleGroup);
    
//     // 5. Energy Burst Particles
//     createEnergyParticles(blackHoleGroup);
    
//     // 6. Space-time Distortion Waves
//     createGravitationalWaves(blackHoleGroup);
    
//     scene.add(blackHoleGroup);
    
//     // Store references
//     blackHoleSystem = {
//         group: blackHoleGroup,
//         eventHorizon: eventHorizon,
//         accretionDisk: accretionDisk,
//         eventHorizonMaterial: eventHorizonMaterial,
//         diskMaterial: diskMaterial
//     };
//     } catch (error) {
//         console.error('Failed to create enhanced black hole:', error);
//         // Fallback: create a simple black sphere
//         try {
//             const fallbackGeometry = new THREE.SphereGeometry(3, 32, 32);
//             const fallbackMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
//             const fallbackBlackHole = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
//             scene.add(fallbackBlackHole);
//             blackHoleSystem = { group: fallbackBlackHole };
//         } catch (fallbackError) {
//             console.error('Failed to create fallback black hole:', fallbackError);
//         }
//     }
// }

// function createPolarJets(parentGroup) {
//     // Create two jets shooting from the poles
//     [-1, 1].forEach(direction => {
//         const jetGeometry = new THREE.CylinderGeometry(0.2, 1, 40, 8, 1, true);
//         const jetMaterial = new THREE.ShaderMaterial({
//             uniforms: {
//                 time: { value: 0 },
//                 direction: { value: direction }
//             },
//             vertexShader: `
//                 varying vec2 vUv;
//                 varying float vY;
//                 uniform float time;
//                 uniform float direction;
                
//                 void main() {
//                     vUv = uv;
//                     vY = position.y;
                    
//                     // Add energy flow animation
//                     vec3 pos = position;
//                     float wave = sin(time * 4.0 + position.y * 0.3) * 0.1;
//                     pos.x += wave;
//                     pos.z += wave * 0.7;
                    
//                     gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
//                 }
//             `,
//             fragmentShader: `
//                 varying vec2 vUv;
//                 varying float vY;
//                 uniform float time;
//                 uniform float direction;
                
//                 void main() {
//                     float intensity = 1.0 - abs(vY) / 20.0;
//                     float flow = sin(time * 6.0 + vY * 0.5) * 0.5 + 0.5;
                    
//                     vec3 jetColor = vec3(0.2, 0.8, 1.0); // Cyan energy
//                     float opacity = intensity * flow * 0.8;
                    
//                     gl_FragColor = vec4(jetColor, opacity);
//                 }
//             `,
//             transparent: true,
//             blending: THREE.AdditiveBlending,
//             side: THREE.DoubleSide
//         });
        
//         const jet = new THREE.Mesh(jetGeometry, jetMaterial);
//         jet.position.y = direction * 25;
//         jet.rotation.z = direction > 0 ? 0 : Math.PI;
//         parentGroup.add(jet);
//         shaderMaterials.push(jetMaterial);
//     });
// }

// function createGravitationalLensing(parentGroup) {
//     // Create multiple rings showing space-time distortion
//     for (let i = 0; i < 3; i++) {
//         const radius = 25 + i * 8;
//         const ringGeometry = new THREE.RingGeometry(radius - 0.5, radius + 0.5, 64);
//         const ringMaterial = new THREE.ShaderMaterial({
//             uniforms: {
//                 time: { value: 0 },
//                 ringIndex: { value: i }
//             },
//             vertexShader: `
//                 varying vec2 vUv;
//                 uniform float time;
//                 uniform float ringIndex;
                
//                 void main() {
//                     vUv = uv;
                    
//                     // Subtle wave distortion
//                     vec3 pos = position;
//                     float wave = sin(time * 0.5 + ringIndex * 2.0) * 0.2;
//                     pos.z += wave;
                    
//                     gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
//                 }
//             `,
//             fragmentShader: `
//                 varying vec2 vUv;
//                 uniform float time;
//                 uniform float ringIndex;
                
//                 void main() {
//                     float pulse = sin(time * 1.5 + ringIndex * 1.0) * 0.3 + 0.4;
//                     vec3 color = vec3(0.6, 0.3, 1.0) * pulse; // Purple gravitational effect
                    
//                     gl_FragColor = vec4(color, pulse * 0.3);
//                 }
//             `,
//             transparent: true,
//             blending: THREE.AdditiveBlending,
//             side: THREE.DoubleSide
//         });
        
//         const ring = new THREE.Mesh(ringGeometry, ringMaterial);
//         ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.2;
//         parentGroup.add(ring);
//         shaderMaterials.push(ringMaterial);
//         gravitationalWaves.push(ring);
//     }
// }

// function createEnergyParticles(parentGroup) {
//     // High-energy particles escaping the black hole
//     const particleCount = 200;
//     const particleGeometry = new THREE.BufferGeometry();
//     const positions = new Float32Array(particleCount * 3);
//     const velocities = new Float32Array(particleCount * 3);
//     const ages = new Float32Array(particleCount);
    
//     for (let i = 0; i < particleCount; i++) {
//         const i3 = i * 3;
        
//         // Start near the black hole
//         const radius = 5 + Math.random() * 10;
//         const angle = Math.random() * Math.PI * 2;
//         const height = (Math.random() - 0.5) * 5;
        
//         positions[i3] = Math.cos(angle) * radius;
//         positions[i3 + 1] = height;
//         positions[i3 + 2] = Math.sin(angle) * radius;
        
//         // Random velocities pointing outward
//         velocities[i3] = (positions[i3] / radius) * (0.1 + Math.random() * 0.2);
//         velocities[i3 + 1] = (Math.random() - 0.5) * 0.1;
//         velocities[i3 + 2] = (positions[i3 + 2] / radius) * (0.1 + Math.random() * 0.2);
        
//         ages[i] = Math.random() * 100;
//     }
    
//     particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
//     particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
//     particleGeometry.setAttribute('age', new THREE.BufferAttribute(ages, 1));
    
//     const particleMaterial = new THREE.ShaderMaterial({
//         uniforms: {
//             time: { value: 0 },
//             taskCompletion: { value: 0.0 }
//         },
//         vertexShader: `
//             attribute vec3 velocity;
//             attribute float age;
//             varying float vAge;
//             uniform float time;
            
//             void main() {
//                 vAge = age;
                
//                 vec3 pos = position + velocity * time;
//                 gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
//                 gl_PointSize = 3.0;
//             }
//         `,
//         fragmentShader: `
//             varying float vAge;
//             uniform float time;
//             uniform float taskCompletion;
            
//             void main() {
//                 float life = mod(vAge + time * 10.0, 100.0) / 100.0;
//                 float opacity = 1.0 - life;
                
//                 // Task completion makes particles more golden
//                 vec3 baseColor = vec3(1.0, 0.5, 0.0); // Orange
//                 vec3 completionColor = vec3(1.0, 1.0, 0.0); // Gold
//                 vec3 color = mix(baseColor, completionColor, taskCompletion);
                
//                 gl_FragColor = vec4(color, opacity * 0.8);
//             }
//         `,
//         transparent: true,
//         blending: THREE.AdditiveBlending
//     });
    
//     const particles = new THREE.Points(particleGeometry, particleMaterial);
//     parentGroup.add(particles);
//     shaderMaterials.push(particleMaterial);
//     energyParticles.push(particles);
// }

// function createGravitationalWaves(parentGroup) {
//     // Ripples in space-time
//     for (let i = 0; i < 5; i++) {
//         const waveGeometry = new THREE.RingGeometry(30 + i * 15, 32 + i * 15, 64);
//         const waveMaterial = new THREE.ShaderMaterial({
//             uniforms: {
//                 time: { value: 0 },
//                 waveIndex: { value: i },
//                 productivity: { value: 0.5 }
//             },
//             vertexShader: `
//                 varying vec2 vUv;
//                 uniform float time;
//                 uniform float waveIndex;
                
//                 void main() {
//                     vUv = uv;
                    
//                     vec3 pos = position;
//                     float wave = sin(time * 0.3 + waveIndex * 0.5) * 0.5;
//                     pos.z += wave;
                    
//                     gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
//                 }
//             `,
//             fragmentShader: `
//                 varying vec2 vUv;
//                 uniform float time;
//                 uniform float waveIndex;
//                 uniform float productivity;
                
//                 void main() {
//                     float wave = sin(time * 0.8 + waveIndex * 1.2) * 0.5 + 0.5;
                    
//                     // Productivity affects wave intensity and color
//                     vec3 lowColor = vec3(0.2, 0.2, 0.8);  // Blue
//                     vec3 highColor = vec3(0.8, 0.2, 0.8); // Magenta
//                     vec3 color = mix(lowColor, highColor, productivity);
                    
//                     float opacity = wave * 0.1 * productivity;
                    
//                     gl_FragColor = vec4(color, opacity);
//                 }
//             `,
//             transparent: true,
//             blending: THREE.AdditiveBlending,
//             side: THREE.DoubleSide
//         });
        
//         const wave = new THREE.Mesh(waveGeometry, waveMaterial);
//         wave.rotation.x = Math.PI / 2;
//         wave.position.y = (Math.random() - 0.5) * 2;
//         parentGroup.add(wave);
//         shaderMaterials.push(waveMaterial);
//         gravitationalWaves.push(wave);
//     }
// }

// // Animation update function
// export function updateBlackHoleEffects() {
//     const time = Date.now() * 0.001;
    
//     // Update all shader materials
//     shaderMaterials.forEach(material => {
//         if (material.uniforms.time) {
//             material.uniforms.time.value = time;
//         }
        
//         // Update based on app state
//         if (material.uniforms.focusMode && appState.currentMode === 'focus') {
//             material.uniforms.focusMode.value = 1.0;
//         } else if (material.uniforms.focusMode) {
//             material.uniforms.focusMode.value = 0.0;
//         }
        
//         if (material.uniforms.productivity) {
//             const completedTasks = appState.tasks.filter(task => task.completed).length;
//             const totalTasks = appState.tasks.length;
//             material.uniforms.productivity.value = totalTasks > 0 ? completedTasks / totalTasks : 0.5;
//         }
        
//         if (material.uniforms.taskCompletion) {
//             // Boost effect when tasks are completed recently
//             const recentCompletions = appState.tasks.filter(task => 
//                 task.completed && Date.now() - task.completedAt < 5000
//             ).length;
//             material.uniforms.taskCompletion.value = Math.min(recentCompletions / 3, 1.0);
//         }
//     });
    
//     // Animate black hole group
//     if (blackHoleSystem.group) {
//         // Slow rotation based on productivity
//         const completedTasks = appState.tasks.filter(task => task.completed).length;
//         const rotationSpeed = 0.002 + (completedTasks * 0.001);
//         blackHoleSystem.group.rotation.y += rotationSpeed;
        
//         // Intensity pulsing in focus mode
//         if (appState.currentMode === 'focus' && blackHoleSystem.eventHorizonMaterial) {
//             const pulse = Math.sin(time * 2) * 0.3 + 0.7;
//             blackHoleSystem.eventHorizonMaterial.uniforms.intensity.value = pulse;
//         }
//     }
    
//     // Animate gravitational waves
//     gravitationalWaves.forEach((wave, index) => {
//         wave.rotation.z += 0.001 + index * 0.0005;
        
//         // Expand/contract based on timer state
//         if (appState.timerState === 'running') {
//             const scale = 1 + Math.sin(time * 0.5 + index) * 0.05;
//             wave.scale.setScalar(scale);
//         }
//     });
// }

// // Trigger special effects
// export function triggerTaskCompletionBurst() {
//     console.log('🔥 WARNING: triggerTaskCompletionBurst() called - this should be DISABLED!');
    
//     // DISABLED: This function creates the unwanted yellow ring
//     return; // Early return to prevent execution
    
//     // Create a spectacular burst effect when tasks are completed
//     const burstGeometry = new THREE.RingGeometry(1, 50, 32);
//     const burstMaterial = new THREE.ShaderMaterial({
//         uniforms: {
//             time: { value: 0 },
//             startTime: { value: Date.now() * 0.001 }
//         },
//         vertexShader: `
//             varying vec2 vUv;
//             uniform float time;
//             uniform float startTime;
            
//             void main() {
//                 vUv = uv;
                
//                 float elapsed = time - startTime;
//                 vec3 pos = position * (1.0 + elapsed * 2.0);
                
//                 gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
//             }
//         `,
//         fragmentShader: `
//             varying vec2 vUv;
//             uniform float time;
//             uniform float startTime;
            
//             void main() {
//                 float elapsed = time - startTime;
//                 float life = 1.0 - elapsed / 3.0; // 3 second effect
                
//                 if (life <= 0.0) discard;
                
//                 vec3 color = vec3(1.0, 1.0, 0.0); // Golden burst
//                 float opacity = life * 0.8;
                
//                 gl_FragColor = vec4(color, opacity);
//             }
//         `,
//         transparent: true,
//         blending: THREE.AdditiveBlending,
//         side: THREE.DoubleSide
//     });
    
//     const burst = new THREE.Mesh(burstGeometry, burstMaterial);
//     burst.rotation.x = Math.PI / 2;
//     blackHoleSystem.group.add(burst);
    
//     // Remove after 3 seconds
//     setTimeout(() => {
//         blackHoleSystem.group.remove(burst);
//         burstMaterial.dispose();
//         burstGeometry.dispose();
//     }, 3000);
    
//     // Update material for animation
//     const animate = () => {
//         burstMaterial.uniforms.time.value = Date.now() * 0.001;
//         requestAnimationFrame(animate);
//     };
//     animate();
// }

// export function triggerFocusIntensification() {
//     // Intensify black hole effects when entering focus mode
//     if (blackHoleSystem.diskMaterial) {
//         // Temporarily boost accretion disk intensity
//         const originalIntensity = blackHoleSystem.diskMaterial.uniforms.focusMode.value;
//         blackHoleSystem.diskMaterial.uniforms.focusMode.value = 1.5;
        
//         setTimeout(() => {
//             blackHoleSystem.diskMaterial.uniforms.focusMode.value = originalIntensity;
//         }, 2000);
//     }
// }


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
    
        // Enhanced Accretion Disk with smoother animation
        const diskGeometry = new THREE.RingGeometry(4, 20, 128, 32);
        const diskMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                focusMode: { value: 0.0 },
                productivity: { value: 0.5 }
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
                    pos.z += height * smoothstep(4.0, 20.0, radius);
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                uniform float time;
                uniform float focusMode;
                uniform float productivity;
                
                void main() {
                    float radius = length(vPosition.xy);
                    float normalizedRadius = (radius - 4.0) / 16.0;
                    
                    // Smooth temperature gradient
                    float temperature = smoothstep(1.0, 0.0, normalizedRadius);
                    
                    // Create smooth swirling pattern
                    float angle = atan(vPosition.y, vPosition.x);
                    float spiral = sin(angle * 6.0 + time * 1.5 - radius * 0.2) * 0.5 + 0.5;
                    spiral *= sin(angle * 3.0 - time * 0.8 + radius * 0.15) * 0.5 + 0.5;
                    
                    // Color based on temperature and activity
                    vec3 hotColor = vec3(1.0, 0.4, 0.1);
                    vec3 mediumColor = vec3(0.8, 0.6, 0.2);
                    vec3 coolColor = vec3(0.3, 0.5, 1.0);
                    
                    vec3 baseColor = mix(coolColor, mix(mediumColor, hotColor, temperature), temperature);
                    
                    // Focus mode enhancement - smooth transition
                    if (focusMode > 0.0) {
                        vec3 focusColor = vec3(0.0, 1.0, 1.0);
                        baseColor = mix(baseColor, focusColor, focusMode * 0.3 * spiral);
                    }
                    
                    // Productivity boost effect
                    float productivityGlow = productivity * spiral * 0.3;
                    baseColor += vec3(productivityGlow * 0.2, productivityGlow * 0.4, productivityGlow * 0.1);
                    
                    // Smooth turbulence and opacity
                    float turbulence = spiral * temperature;
                    float opacity = turbulence * (0.5 + sin(time * 0.5 + radius * 0.2) * 0.1);
                    opacity = smoothstep(0.0, 1.0, opacity);
                    
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
    
        // Smooth polar jets
        createSmoothPolarJets(blackHoleGroup);
        
        // Graceful gravitational lensing
        createGracefulGravitationalLensing(blackHoleGroup);
        
        // Smooth energy particles
        createSmoothEnergyParticles(blackHoleGroup);
        
        // Space-time distortion waves
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

function createSmoothPolarJets(parentGroup) {
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
                    
                    // Smooth energy flow animation
                    vec3 pos = position;
                    float wave = sin(time * 2.0 + position.y * 0.2) * 0.05;
                    wave += cos(time * 3.0 - position.y * 0.3) * 0.03;
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
                    float intensity = smoothstep(20.0, 0.0, abs(vY));
                    float flow = sin(time * 3.0 + vY * 0.4) * 0.5 + 0.5;
                    flow *= cos(time * 2.0 - vY * 0.3) * 0.5 + 0.5;
                    
                    vec3 jetColor = vec3(0.2, 0.8, 1.0);
                    float opacity = intensity * flow * 0.6;
                    
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

function createGracefulGravitationalLensing(parentGroup) {
    for (let i = 0; i < 3; i++) {
        const radius = 25 + i * 8;
        const ringGeometry = new THREE.RingGeometry(radius - 0.5, radius + 0.5, 128);
        const ringMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                ringIndex: { value: i }
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
                
                void main() {
                    float pulse = sin(time * 1.0 + ringIndex * 0.8) * 0.2 + 0.3;
                    vec3 color = vec3(0.6, 0.3, 1.0) * pulse;
                    
                    // Smooth fade based on angle
                    float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
                    float angleFade = sin(angle * 4.0 + time * 0.5) * 0.5 + 0.5;
                    
                    gl_FragColor = vec4(color, pulse * angleFade * 0.3);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.1;
        parentGroup.add(ring);
        shaderMaterials.push(ringMaterial);
        gravitationalWaves.push(ring);
    }
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

function createGravitationalWaves(parentGroup) {
    // Ripples in space-time
    for (let i = 0; i < 5; i++) {
        const waveGeometry = new THREE.RingGeometry(30 + i * 15, 32 + i * 15, 64);
        const waveMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                waveIndex: { value: i },
                productivity: { value: 0.5 }
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
                
                void main() {
                    float wave = sin(time * 0.8 + waveIndex * 1.2) * 0.5 + 0.5;
                    
                    // Productivity affects wave intensity and color
                    vec3 lowColor = vec3(0.2, 0.2, 0.8);  // Blue
                    vec3 highColor = vec3(0.8, 0.2, 0.8); // Magenta
                    vec3 color = mix(lowColor, highColor, productivity);
                    
                    float opacity = wave * 0.1 * productivity;
                    
                    gl_FragColor = vec4(color, opacity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        
        const wave = new THREE.Mesh(waveGeometry, waveMaterial);
        wave.rotation.x = Math.PI / 2;
        wave.position.y = (Math.random() - 0.5) * 2;
        parentGroup.add(wave);
        shaderMaterials.push(waveMaterial);
        gravitationalWaves.push(wave);
    }
}

// Smooth animation update function
export function updateBlackHoleEffects() {
    const time = Date.now() * 0.001;
    
    // Update all shader materials with smooth transitions
    shaderMaterials.forEach(material => {
        if (material.uniforms.time) {
            material.uniforms.time.value = time;
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