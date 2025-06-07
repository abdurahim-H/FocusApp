import { scene } from './scene3d.js';
import { appState } from './state.js';
import { trackRequestAnimationFrame } from './cleanup.js';

export let blackHoleSystem = {};
let shaderMaterials = [];
let energyParticles = [];
let gravitationalWaves = [];
let dustParticleSystem = null;
let lensingPlane = null;
let polarJetParticles = [];

export function createEnhancedBlackHole() {
    try {
        if (!scene) {
            console.warn('Scene not available for black hole creation');
            return;
        }

        const blackHoleGroup = new THREE.Group();
    
        // Create gravitational lensing effect plane
        createGravitationalLensingHalo(blackHoleGroup);
    
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
    
        // Enhanced Accretion Disk with heat shimmer
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
                    
                    // Create smooth swirling pattern with heat shimmer
                    float angle = atan(vPosition.y, vPosition.x);
                    float spiral = sin(angle * 6.0 + time * 1.5 - radius * 0.2) * 0.5 + 0.5;
                    spiral *= sin(angle * 3.0 - time * 0.8 + radius * 0.15) * 0.5 + 0.5;
                    
                    // Heat shimmer effect
                    float shimmer = sin(radius * 10.0 + time * 5.0) * sin(angle * 8.0 - time * 3.0);
                    shimmer *= 0.1 * temperature;
                    
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
                    baseColor += shimmer; // Apply heat shimmer
                    
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
                    float baseOpacity = theme > 0.5 ? 0.9 : 0.8;
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
        accretionDisk.renderOrder = 1;
        blackHoleGroup.add(accretionDisk);
        shaderMaterials.push(diskMaterial);
    
        // Create dust particle stream along accretion disk
        createDustParticleStream(blackHoleGroup);
    
        // Create relativistic polar jets with particles
        createRelativisticPolarJets(blackHoleGroup);
        
        // Enhanced gravitational lensing rings with heat shimmer and breathing
        createEnhancedGravitationalLensing(blackHoleGroup);
        
        // Smooth energy particles
        createSmoothEnergyParticles(blackHoleGroup);
        
        // Create symmetric energy beam with flow
        createSymmetricEnergyBeam(blackHoleGroup);
        
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

// Create gravitational lensing halo effect
function createGravitationalLensingHalo(parentGroup) {
    const lensGeometry = new THREE.RingGeometry(10, 50, 64, 1);
    const lensMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            lensStrength: { value: 0.3 }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vPosition;
            void main() {
                vUv = uv;
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            varying vec3 vPosition;
            uniform float time;
            uniform float lensStrength;
            
            void main() {
                float radius = length(vPosition.xy);
                float distortionStrength = 1.0 / (1.0 + radius * 0.1);
                
                // Create circular distortion pattern
                float angle = atan(vPosition.y, vPosition.x);
                float ripple = sin(radius * 0.5 - time * 0.2) * 0.5 + 0.5;
                
                // Lensing effect color
                vec3 lensColor = vec3(0.1, 0.2, 0.4);
                float opacity = distortionStrength * lensStrength * ripple * 0.1;
                
                gl_FragColor = vec4(lensColor, opacity);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    
    lensingPlane = new THREE.Mesh(lensGeometry, lensMaterial);
    lensingPlane.rotation.x = Math.PI / 2;
    lensingPlane.renderOrder = -1;
    parentGroup.add(lensingPlane);
    shaderMaterials.push(lensMaterial);
}

// -----------------------------------------------------------------------------------------------------//

// // Create relativistic polar jets with particle system
// function createRelativisticPolarJets(parentGroup) {
//     [-1, 1].forEach(direction => {
//         // Create particle jet
//         const jetParticleCount = 1000;
//         const jetGeometry = new THREE.BufferGeometry();
//         const positions = new Float32Array(jetParticleCount * 3);
//         const velocities = new Float32Array(jetParticleCount * 3);
//         const ages = new Float32Array(jetParticleCount);
//         const sizes = new Float32Array(jetParticleCount);
        
//         for (let i = 0; i < jetParticleCount; i++) {
//             const i3 = i * 3;
            
//             // Start particles near event horizon
//             const spreadRadius = 0.5;
//             const x = (Math.random() - 0.5) * spreadRadius;
//             const z = (Math.random() - 0.5) * spreadRadius;
//             const y = direction * 3; // Start at black hole poles
            
//             positions[i3] = x;
//             positions[i3 + 1] = y;
//             positions[i3 + 2] = z;
            
//             // Relativistic velocity (near speed of light)
//             const speed = 0.5 + Math.random() * 0.3;
//             velocities[i3] = x * 0.1; // Slight spread
//             velocities[i3 + 1] = direction * speed;
//             velocities[i3 + 2] = z * 0.1;
            
//             ages[i] = Math.random() * 100;
//             sizes[i] = 1 + Math.random() * 2;
//         }
        
//         jetGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
//         jetGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
//         jetGeometry.setAttribute('age', new THREE.BufferAttribute(ages, 1));
//         jetGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
//         const jetMaterial = new THREE.ShaderMaterial({
//             uniforms: {
//                 time: { value: 0 },
//                 direction: { value: direction }
//             },
//             vertexShader: `
//                 attribute vec3 velocity;
//                 attribute float age;
//                 attribute float size;
//                 varying float vAge;
//                 varying float vDistance;
//                 varying float vSpeed;
//                 uniform float time;
//                 uniform float direction;
                
//                 void main() {
//                     vAge = mod(age + time * 20.0, 100.0);
                    
//                     // Calculate position along jet
//                     float lifeTime = vAge / 100.0;
//                     vec3 pos = position + velocity * lifeTime * 50.0;
                    
//                     // Cone shape - wider as it travels
//                     float spread = lifeTime * 0.5;
//                     pos.x += pos.x * spread;
//                     pos.z += pos.z * spread;
                    
//                     vDistance = length(pos - position);
//                     vSpeed = length(velocity);
                    
//                     gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
//                     gl_PointSize = size * (100.0 / -gl_Position.z) * (2.0 - lifeTime);
//                 }
//             `,
//             fragmentShader: `
//                 varying float vAge;
//                 varying float vDistance;
//                 varying float vSpeed;
//                 uniform float time;
//                 uniform float direction;
                
//                 void main() {
//                     float life = vAge / 100.0;
                    
//                     // Pulse effect
//                     float pulse = sin(time * 3.0 + vDistance * 0.1) * 0.3 + 0.7;
                    
//                     // Color cooling as particles travel
//                     vec3 hotColor = vec3(0.5, 0.8, 1.0); // Blue-white hot
//                     vec3 coolColor = vec3(0.2, 0.6, 1.0); // Cooler blue
//                     vec3 color = mix(hotColor, coolColor, life);
                    
//                     // Brightness based on speed and distance
//                     float brightness = (1.0 - life) * pulse * vSpeed;
//                     brightness = pow(brightness, 1.5);
                    
//                     // Soft particle edges
//                     vec2 center = gl_PointCoord - vec2(0.5);
//                     float dist = length(center);
//                     float alpha = smoothstep(0.5, 0.0, dist);
                    
//                     gl_FragColor = vec4(color * brightness * 2.0, alpha * brightness);
//                 }
//             `,
//             transparent: true,
//             blending: THREE.AdditiveBlending,
//             depthWrite: false
//         });
        
//         const jetParticles = new THREE.Points(jetGeometry, jetMaterial);
//         jetParticles.renderOrder = 5;
//         parentGroup.add(jetParticles);
//         shaderMaterials.push(jetMaterial);
//         polarJetParticles.push(jetParticles);
//     });
// }

// Create relativistic polar jets with particle system
function createRelativisticPolarJets(parentGroup) {
    [-1, 1].forEach(direction => {
        // Create jet container
        const jetGroup = new THREE.Group();
        
        // 1. PLASMA SPINE - Razor-thin core with flowing texture
        const spineGeometry = new THREE.CylinderGeometry(0.15, 0.05, 60, 16, 32, true);
        const spineMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                direction: { value: direction }
            },
            vertexShader: `
                varying vec2 vUv;
                varying float vY;
                varying float vFade;
                uniform float time;
                
                void main() {
                    vUv = uv;
                    vY = position.y;
                    
                    // Fade at the ends
                    vFade = 1.0 - smoothstep(20.0, 30.0, abs(position.y));
                    
                    vec3 pos = position;
                    
                    // Subtle wave along spine
                    float wave = sin(time * 2.0 + position.y * 0.1) * 0.02;
                    pos.x += wave;
                    pos.z += wave * 0.7;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                varying float vY;
                varying float vFade;
                uniform float time;
                uniform float direction;
                
                void main() {
                    // Flowing texture
                    float flow = fract(vY * 0.1 - time * 0.4);
                    flow = pow(flow, 2.0);
                    
                    // Core colors: cyan-white
                    vec3 coreColor = vec3(0.9, 1.0, 1.0); // #E6FFFF
                    vec3 midColor = vec3(0.43, 0.95, 1.0); // #6DF2FF
                    
                    vec3 color = mix(coreColor, midColor, flow);
                    
                    // Radial fade
                    float radialFade = 1.0 - smoothstep(0.0, 1.0, abs(vUv.x - 0.5) * 2.0);
                    
                    // Combined opacity
                    float opacity = radialFade * vFade * (0.8 + flow * 0.2);
                    
                    gl_FragColor = vec4(color * 1.5, opacity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        const spine = new THREE.Mesh(spineGeometry, spineMaterial);
        jetGroup.add(spine);
        shaderMaterials.push(spineMaterial);
        
        // 2. PARTICLE SHEATH - Thousands of spiraling particles
        const particleCount = 5000;
        const sheathGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const ages = new Float32Array(particleCount);
        const sizes = new Float32Array(particleCount);
        const angles = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Start near black hole in a cone
            const coneAngle = (Math.random() - 0.5) * 10 * Math.PI / 180; // 5-10 degree cone
            const radius = Math.random() * 0.3;
            const theta = Math.random() * Math.PI * 2;
            
            positions[i3] = Math.cos(theta) * radius;
            positions[i3 + 1] = direction * 3; // Start at black hole pole
            positions[i3 + 2] = Math.sin(theta) * radius;
            
            // Velocity with slight outward curve
            const speed = 0.3 + Math.random() * 0.2;
            velocities[i3] = Math.sin(coneAngle) * Math.cos(theta) * 0.1;
            velocities[i3 + 1] = direction * speed;
            velocities[i3 + 2] = Math.sin(coneAngle) * Math.sin(theta) * 0.1;
            
            ages[i] = Math.random() * 100;
            sizes[i] = 0.5 + Math.random() * 1.5;
            angles[i] = Math.random() * Math.PI * 2;
        }
        
        sheathGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        sheathGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        sheathGeometry.setAttribute('age', new THREE.BufferAttribute(ages, 1));
        sheathGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        sheathGeometry.setAttribute('angle', new THREE.BufferAttribute(angles, 1));
        
        const sheathMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                direction: { value: direction }
            },
            vertexShader: `
                attribute vec3 velocity;
                attribute float age;
                attribute float size;
                attribute float angle;
                varying float vAge;
                varying float vDistance;
                uniform float time;
                uniform float direction;
                
                void main() {
                    float lifetime = mod(age + time * 20.0, 100.0);
                    vAge = lifetime / 100.0;
                    
                    // Particle position along jet with spiral
                    vec3 pos = position;
                    float travelDistance = vAge * 50.0;
                    
                    // Spiral motion
                    float spiralRadius = 0.2 + vAge * 0.5;
                    float spiralAngle = angle + time * 2.0 + travelDistance * 0.2;
                    
                    pos.x = cos(spiralAngle) * spiralRadius;
                    pos.z = sin(spiralAngle) * spiralRadius;
                    pos.y = direction * (3.0 + travelDistance);
                    
                    // Slight outward curve
                    pos.x += vAge * vAge * velocity.x * 10.0;
                    pos.z += vAge * vAge * velocity.z * 10.0;
                    
                    vDistance = travelDistance;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * (100.0 / -gl_Position.z) * (1.0 - vAge * 0.5);
                }
            `,
            fragmentShader: `
                varying float vAge;
                varying float vDistance;
                uniform float time;
                
                void main() {
                    // Color gradient from white-hot to aqua to magenta
                    vec3 hotColor = vec3(1.0, 1.0, 1.0);
                    vec3 midColor = vec3(0.0, 0.81, 1.0); // #00CFFF
                    vec3 coolColor = vec3(0.58, 0.34, 1.0); // #9457FF
                    
                    vec3 color;
                    if (vAge < 0.5) {
                        color = mix(hotColor, midColor, vAge * 2.0);
                    } else {
                        color = mix(midColor, coolColor, (vAge - 0.5) * 2.0);
                    }
                    
                    // Particle fade
                    float opacity = 1.0 - smoothstep(0.7, 1.0, vAge);
                    opacity *= 0.8;
                    
                    // Soft edges
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);
                    float alpha = smoothstep(0.5, 0.0, dist);
                    
                    gl_FragColor = vec4(color * 1.2, alpha * opacity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const sheath = new THREE.Points(sheathGeometry, sheathMaterial);
        jetGroup.add(sheath);
        shaderMaterials.push(sheathMaterial);
        
        // 3. SHOCK WAVE RINGS
        const shockWaves = [];
        const maxShockWaves = 5;
        
        for (let i = 0; i < maxShockWaves; i++) {
            const ringGeometry = new THREE.RingGeometry(0.1, 0.5, 32, 1);
            const ringMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    birthTime: { value: -1 },
                    direction: { value: direction }
                },
                vertexShader: `
                    varying vec2 vUv;
                    uniform float time;
                    uniform float birthTime;
                    uniform float direction;
                    
                    void main() {
                        vUv = uv;
                        
                        vec3 pos = position;
                        
                        if (birthTime > 0.0) {
                            float age = time - birthTime;
                            float travelDistance = age * 15.0;
                            
                            // Move along jet
                            pos.y += direction * travelDistance;
                            
                            // Expand radius
                            float expansion = 1.0 + age * 2.0;
                            pos.x *= expansion;
                            pos.z *= expansion;
                        }
                        
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                fragmentShader: `
                    varying vec2 vUv;
                    uniform float time;
                    uniform float birthTime;
                    
                    void main() {
                        if (birthTime < 0.0) {
                            discard;
                        }
                        
                        float age = time - birthTime;
                        
                        // Fade out over 1 second
                        float opacity = 1.0 - smoothstep(0.0, 1.0, age);
                        
                        // Ring gradient
                        float ring = 1.0 - abs(vUv.y - 0.5) * 2.0;
                        
                        vec3 color = vec3(0.8, 0.95, 1.0);
                        
                        gl_FragColor = vec4(color * 2.0, ring * opacity * 0.8);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = direction * 3;
            ring.visible = false;
            jetGroup.add(ring);
            shaderMaterials.push(ringMaterial);
            
            shockWaves.push({
                mesh: ring,
                material: ringMaterial,
                lastEmit: -10
            });
        }
        
        // 4. SOFT HALO/BLOOM
        const haloGeometry = new THREE.CylinderGeometry(2, 0.5, 60, 8, 1, true);
        const haloMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                intensity: { value: 1.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                varying float vY;
                
                void main() {
                    vUv = uv;
                    vY = position.y;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                varying float vY;
                uniform float time;
                uniform float intensity;
                
                void main() {
                    // Soft radial fade
                    float radialFade = 1.0 - smoothstep(0.0, 1.0, abs(vUv.x - 0.5) * 2.0);
                    radialFade = pow(radialFade, 3.0);
                    
                    // Vertical fade
                    float verticalFade = 1.0 - smoothstep(20.0, 30.0, abs(vY));
                    
                    // Breathing intensity
                    float breathing = 0.85 + sin(time * 0.314) * 0.15; // ~20s cycle
                    
                    vec3 haloColor = vec3(0.31, 0.44, 1.0); // #4F70FF
                    
                    float opacity = radialFade * verticalFade * breathing * intensity * 0.2;
                    
                    gl_FragColor = vec4(haloColor, opacity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        const halo = new THREE.Mesh(haloGeometry, haloMaterial);
        jetGroup.add(halo);
        shaderMaterials.push(haloMaterial);
        
        // Position and add the complete jet
        jetGroup.position.y = direction * 25;
        jetGroup.userData = {
            direction: direction,
            shockWaves: shockWaves,
            sheathGeometry: sheathGeometry,
            lastShockTime: 0
        };
        
        parentGroup.add(jetGroup);
        polarJetParticles.push(jetGroup);
    });
}

// Create dust particle stream along accretion disk
function createDustParticleStream(parentGroup) {
    const dustCount = 2000;
    const dustGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(dustCount * 3);
    const velocities = new Float32Array(dustCount * 3);
    const ages = new Float32Array(dustCount);
    const sizes = new Float32Array(dustCount);
    const diskRadii = new Float32Array(dustCount);
    
    for (let i = 0; i < dustCount; i++) {
        const i3 = i * 3;
        
        // Start particles along the accretion disk
        const radius = 3.5 + Math.random() * 4;
        const angle = Math.random() * Math.PI * 2;
        const height = (Math.random() - 0.5) * 0.5;
        
        positions[i3] = Math.cos(angle) * radius;
        positions[i3 + 1] = height;
        positions[i3 + 2] = Math.sin(angle) * radius;
        
        // Orbital velocity
        const orbitalSpeed = 0.02 / Math.sqrt(radius);
        velocities[i3] = -Math.sin(angle) * orbitalSpeed;
        velocities[i3 + 1] = 0;
        velocities[i3 + 2] = Math.cos(angle) * orbitalSpeed;
        
        ages[i] = Math.random() * 100;
        sizes[i] = 0.5 + Math.random() * 1.5;
        diskRadii[i] = radius;
    }
    
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dustGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    dustGeometry.setAttribute('age', new THREE.BufferAttribute(ages, 1));
    dustGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    dustGeometry.setAttribute('diskRadius', new THREE.BufferAttribute(diskRadii, 1));
    
    const dustMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            focusMode: { value: 0 }
        },
        vertexShader: `
            attribute vec3 velocity;
            attribute float age;
            attribute float size;
            attribute float diskRadius;
            varying float vAge;
            varying float vDiskRadius;
            uniform float time;
            
            void main() {
                vAge = age;
                vDiskRadius = diskRadius;
                
                // Orbital motion with spiral
                float angle = atan(position.z, position.x);
                float radius = diskRadius;
                
                // Add spiral motion
                angle += time * velocity.length() * 20.0;
                radius -= time * 0.01;
                
                vec3 pos = vec3(
                    cos(angle) * radius,
                    position.y + sin(time * 2.0 + age) * 0.1,
                    sin(angle) * radius
                );
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (100.0 / -gl_Position.z);
            }
        `,
        fragmentShader: `
            varying float vAge;
            varying float vDiskRadius;
            uniform float time;
            uniform float focusMode;
            
            void main() {
                float life = mod(vAge + time * 10.0, 100.0) / 100.0;
                float opacity = smoothstep(1.0, 0.0, life) * 0.3;
                
                vec3 dustColor = vec3(0.8, 0.6, 0.3);
                
                float radialFade = 1.0 - smoothstep(3.5, 7.5, vDiskRadius);
                opacity *= radialFade;
                
                opacity *= 1.0 - focusMode * 0.7;
                
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);
                float alpha = smoothstep(0.5, 0.0, dist);
                
                gl_FragColor = vec4(dustColor, opacity * alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    dustParticleSystem = new THREE.Points(dustGeometry, dustMaterial);
    dustParticleSystem.renderOrder = 2;
    parentGroup.add(dustParticleSystem);
    shaderMaterials.push(dustMaterial);
}

// Update theme for all materials
function updateTheme() {
    const theme = document.body.getAttribute('data-theme');
    const isLightTheme = theme === 'light';
    const isCosmosTheme = theme === 'cosmos';
    const isDarkTheme = theme === 'dark';
    
    let themeValue = 0;
    if (isLightTheme) themeValue = 1;
    else if (isCosmosTheme) themeValue = 0.5;
    
    if (blackHoleSystem.diskMaterial && blackHoleSystem.diskMaterial.uniforms.theme) {
        blackHoleSystem.diskMaterial.uniforms.theme.value = themeValue;
    }
    
    shaderMaterials.forEach(material => {
        if (material.uniforms && material.uniforms.theme) {
            material.uniforms.theme.value = themeValue;
        }
    });
}

// Create symmetric energy beam with flow texture
function createSymmetricEnergyBeam(parentGroup) {
    // Create beam geometry - uniform cylinder
    const beamGeometry = new THREE.CylinderGeometry(1.0, 1.0, 60, 32, 1, true);
    const beamMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            varying float vY;
            varying vec3 vPosition;
            uniform float time;
            
            void main() {
                vUv = uv;
                vY = position.y;
                vPosition = position;
                
                vec3 pos = position;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            varying float vY;
            varying vec3 vPosition;
            uniform float time;
            
            void main() {
                // Radial gradient for core glow
                vec2 center = vec2(vUv.x - 0.5, 0.0) * 2.0;
                float radialDist = length(center);
                float coreGlow = 1.0 - smoothstep(0.0, 0.8, radialDist);
                coreGlow = pow(coreGlow, 2.0);
                
                // Symmetric vertical fade
                float distFromCenter = abs(vY) / 30.0;
                float verticalFade = 1.0 - smoothstep(0.7, 1.0, distFromCenter);
                
                // Flowing energy texture
                float flow = sin(vY * 0.2 - time * 5.0) * 0.5 + 0.5;
                flow *= sin(vY * 0.15 + time * 3.0) * 0.5 + 0.5;
                
                // Outer glow layer
                float outerGlow = 1.0 - smoothstep(0.5, 1.0, radialDist);
                outerGlow = pow(outerGlow, 1.5);
                
                // Cyan energy color
                vec3 coreColor = vec3(0.6, 1.0, 1.0);
                vec3 glowColor = vec3(0.2, 0.8, 1.0);
                vec3 color = mix(glowColor, coreColor, coreGlow);
                
                // Combine effects
                float intensity = coreGlow * verticalFade;
                intensity = mix(intensity, intensity * flow, 0.5);
                
                // Add outer glow
                intensity += outerGlow * 0.3 * verticalFade;
                
                // Bloom effect
                color *= 1.5;
                
                gl_FragColor = vec4(color, intensity);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.y = 0;
    beam.renderOrder = 10;
    parentGroup.add(beam);
    shaderMaterials.push(beamMaterial);
}

// Enhanced gravitational lensing rings with breathing and heat shimmer
function createEnhancedGravitationalLensing(parentGroup) {
    const baseRadius = 15;
    const ringConfigs = [
        { radius: baseRadius, width: 1.5 },
        { radius: baseRadius * 1.4, width: 1.8 },
        { radius: baseRadius * 1.8, width: 2.0 },
        { radius: baseRadius * 2.3, width: 2.3 },
        { radius: baseRadius * 2.9, width: 2.5 }
    ];
    
    
    ringConfigs.forEach((config, i) => {
        const ringSegments = 128;
        const ringThickness = 32;
        const geometry = new THREE.BufferGeometry();
        
        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        
        for (let j = 0; j <= ringSegments; j++) {
            const angle = (j / ringSegments) * Math.PI * 2;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            
            for (let k = 0; k <= ringThickness; k++) {
                const t = k / ringThickness;
                
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
                focusMode: { value: 0 },
                baseRadius: { value: config.radius }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                uniform float time;
                uniform float ringIndex;
                
                void main() {
                    vUv = uv;
                    vPosition = position;
                    vNormal = normal;
                    
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
                uniform float focusMode;
                uniform float baseRadius;
                
                void main() {
                    vec3 viewDir = normalize(vViewPosition);
                    float fresnel = 1.0 - abs(dot(viewDir, vNormal));
                    float edgeFade = pow(fresnel, 1.5);
                    
                    float radialFade = 1.0 - smoothstep(0.0, 1.0, abs(vUv.y - 0.5) * 2.0);
                    
                    // Heat shimmer effect
                    float angle = atan(vPosition.y, vPosition.x);
                    float radius = length(vPosition.xy);
                    float shimmer = sin(radius * 5.0 + time * 3.0) * sin(angle * 10.0 - time * 2.0);
                    shimmer *= 0.2;
                    
                    float pulse = sin(time * 1.0 + ringIndex * 0.8) * 0.3 + 0.7;
                    
                    vec3 baseColor;
                    vec3 emissiveColor;
                    float opacity;
                    float emissiveIntensity;
                    
                    if (theme > 0.75) {
                        baseColor = vec3(0.463, 0.376, 0.902);
                        emissiveColor = vec3(0.686, 0.608, 1.0);
                        emissiveIntensity = 0.6;
                        opacity = 0.7 * radialFade;
                        
                        vec3 edgeColor = vec3(0.3, 0.2, 0.5);
                        baseColor = mix(baseColor, edgeColor, pow(1.0 - radialFade, 3.0));
                        
                    } else if (theme > 0.25) {
                        baseColor = vec3(0.416, 0.325, 0.831);
                        emissiveColor = baseColor;
                        emissiveIntensity = 0.2;
                        opacity = 0.5 * radialFade;
                        
                        emissiveIntensity += edgeFade * 0.3;
                        
                    } else {
                        baseColor = vec3(0.6, 0.3, 1.0);
                        emissiveColor = baseColor;
                        emissiveIntensity = 0.35;
                        opacity = 0.5 * radialFade;
                        
                        emissiveIntensity += edgeFade * 0.2;
                    }
                    
                    if (focusMode > 0.0) {
                        float gray = dot(baseColor, vec3(0.299, 0.587, 0.114));
                        baseColor = mix(baseColor, vec3(gray), focusMode * 0.8);
                        emissiveColor = mix(emissiveColor, vec3(gray), focusMode * 0.8);
                        emissiveIntensity *= (1.0 - focusMode * 0.5);
                        opacity *= (1.0 - focusMode * 0.3);
                    }
                    
                    vec3 color = baseColor * pulse;
                    color += shimmer * baseColor; // Apply heat shimmer
                    
                    color += emissiveColor * emissiveIntensity * (0.7 + pulse * 0.3);
                    color += emissiveColor * pow(edgeFade, 2.0) * 0.3 * (1.0 - focusMode * 0.5);
                    
                    float angle2 = atan(vUv.y - 0.5, vUv.x - 0.5);
                    float angleFade = sin(angle2 * 4.0 + time * 0.5) * 0.5 + 0.5;
                    opacity *= angleFade;
                    
                    opacity = max(opacity, 0.15 * (1.0 - focusMode * 0.5));
                    
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
        
        const initialTiltX = (Math.random() - 0.5) * Math.PI * 0.3;
        const initialTiltY = (Math.random() - 0.5) * Math.PI * 0.2;
        
        ring.rotation.x = Math.PI / 2 + initialTiltX;
        ring.rotation.y = initialTiltY;
        
        // Store precession and breathing parameters
        ring.userData = {
            precessionPhaseX: i * 0.4 * Math.PI,
            precessionPhaseY: i * 0.7 * Math.PI,
            initialTiltX: ring.rotation.x,
            initialTiltY: ring.rotation.y,
            breathingPhase: i * 0.6 * Math.PI,
            baseRadius: config.radius
        };
        
        ring.renderOrder = 0;
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
        
        const radius = 5 + Math.random() * 10;
        const angle = Math.random() * Math.PI * 2;
        const height = (Math.random() - 0.5) * 5;
        
        positions[i3] = Math.cos(angle) * radius;
        positions[i3 + 1] = height;
        positions[i3 + 2] = Math.sin(angle) * radius;
        
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
                
                vec3 baseColor = vec3(1.0, 0.5, 0.0);
                vec3 completionColor = vec3(1.0, 1.0, 0.0);
                vec3 color = mix(baseColor, completionColor, taskCompletion);
                
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

// // Smooth animation update function
// export function updateBlackHoleEffects() {
//     const time = Date.now() * 0.001;
    
//     const theme = document.body.getAttribute('data-theme');
//     const isLightTheme = theme === 'light';
//     const isCosmosTheme = theme === 'cosmos';
//     const isDarkTheme = theme === 'dark';
    
//     let themeValue = 0;
//     if (isLightTheme) themeValue = 1;
//     else if (isCosmosTheme) themeValue = 0.5;
    
//     shaderMaterials.forEach(material => {
//         if (material.uniforms.time) {
//             material.uniforms.time.value = time;
//         }
        
//         if (material.uniforms.theme !== undefined) {
//             const currentTheme = material.uniforms.theme.value;
//             material.uniforms.theme.value += (themeValue - currentTheme) * 0.05;
//         }
        
//         if (material.uniforms.focusMode !== undefined) {
//             const targetFocus = appState.currentMode === 'focus' ? 1.0 : 0.0;
//             const currentFocus = material.uniforms.focusMode.value;
//             material.uniforms.focusMode.value += (targetFocus - currentFocus) * 0.05;
//         }
        
//         if (material.uniforms.productivity) {
//             const completedTasks = appState.tasks.filter(task => task.completed).length;
//             const totalTasks = appState.tasks.length;
//             const targetProductivity = totalTasks > 0 ? completedTasks / totalTasks : 0.5;
//             const currentProductivity = material.uniforms.productivity.value;
//             material.uniforms.productivity.value += (targetProductivity - currentProductivity) * 0.05;
//         }
        
//         if (material.uniforms.taskCompletion) {
//             const recentCompletions = appState.tasks.filter(task => 
//                 task.completed && Date.now() - task.completedAt < 5000
//             ).length;
//             const targetCompletion = Math.min(recentCompletions / 3, 1.0);
//             const currentCompletion = material.uniforms.taskCompletion.value;
//             material.uniforms.taskCompletion.value += (targetCompletion - currentCompletion) * 0.05;
//         }
//     });
    
//     if (lensingPlane) {
//         lensingPlane.rotation.z += 0.0001;
//     }
    
//     if (blackHoleSystem.group) {
//         const completedTasks = appState.tasks.filter(task => task.completed).length;
//         const baseSpeed = 0.001;
//         const bonusSpeed = completedTasks * 0.0002;
//         const rotationSpeed = baseSpeed + bonusSpeed;
        
//         blackHoleSystem.group.rotation.y += rotationSpeed;
        
//         if (appState.currentMode === 'focus' && blackHoleSystem.eventHorizonMaterial) {
//             const targetIntensity = 0.7 + Math.sin(time * 2) * 0.3;
//             const currentIntensity = blackHoleSystem.eventHorizonMaterial.uniforms.intensity.value;
//             blackHoleSystem.eventHorizonMaterial.uniforms.intensity.value += 
//                 (targetIntensity - currentIntensity) * 0.05;
//         }
//     }
    
//     // Enhanced gravitational wave animations with precession and breathing
//     gravitationalWaves.forEach((wave, index) => {
//         if (wave.userData) {
//             // Continuous precession (multi-minute loops)
//             const precessionX = Math.sin(time * (2 * Math.PI / 120) + wave.userData.precessionPhaseX) * (15 * Math.PI / 180);
//             const precessionY = Math.sin(time * (2 * Math.PI / 165) + wave.userData.precessionPhaseY) * (10 * Math.PI / 180);
            
//             wave.rotation.x = wave.userData.initialTiltX + precessionX;
//             wave.rotation.y = wave.userData.initialTiltY + precessionY;
            
//             // Subtle radial breathing
//             const breathingScale = 1 + Math.sin(time * (2 * Math.PI / 90) + wave.userData.breathingPhase) * 0.03;
//             wave.scale.setScalar(breathingScale);
//         }
        
//         if (appState.timerState === 'running') {
//             const targetScale = wave.scale.x * (1 + Math.sin(time * 0.3 + index) * 0.02);
//             const currentScale = wave.scale.x;
//             const newScale = currentScale + (targetScale - currentScale) * 0.05;
//             wave.scale.setScalar(newScale);
//         }
//     });
// }

// Smooth animation update function
export function updateBlackHoleEffects() {
    const time = Date.now() * 0.001;
    
    const theme = document.body.getAttribute('data-theme');
    const isLightTheme = theme === 'light';
    const isCosmosTheme = theme === 'cosmos';
    const isDarkTheme = theme === 'dark';
    
    let themeValue = 0;
    if (isLightTheme) themeValue = 1;
    else if (isCosmosTheme) themeValue = 0.5;
    
    shaderMaterials.forEach(material => {
        if (material.uniforms.time) {
            material.uniforms.time.value = time;
        }
        
        if (material.uniforms.theme !== undefined) {
            const currentTheme = material.uniforms.theme.value;
            material.uniforms.theme.value += (themeValue - currentTheme) * 0.05;
        }
        
        if (material.uniforms.focusMode !== undefined) {
            const targetFocus = appState.currentMode === 'focus' ? 1.0 : 0.0;
            const currentFocus = material.uniforms.focusMode.value;
            material.uniforms.focusMode.value += (targetFocus - currentFocus) * 0.05;
        }
        
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
    
    // Update relativistic jets and shock waves
    polarJetParticles.forEach(jetGroup => {
        if (jetGroup.userData && jetGroup.userData.shockWaves) {
            // Emit shock waves every 6-8 seconds
            const timeSinceLastShock = time - jetGroup.userData.lastShockTime;
            const shockInterval = 6 + Math.random() * 2;
            
            if (timeSinceLastShock > shockInterval) {
                // Find an available shock wave
                const availableShock = jetGroup.userData.shockWaves.find(shock => 
                    shock.material.uniforms.birthTime.value < 0 || 
                    (time - shock.material.uniforms.birthTime.value) > 1.5
                );
                
                if (availableShock) {
                    availableShock.material.uniforms.birthTime.value = time;
                    availableShock.mesh.visible = true;
                    jetGroup.userData.lastShockTime = time;
                }
            }
            
            // Update particle ages for respawning
            if (jetGroup.userData.sheathGeometry) {
                const ages = jetGroup.userData.sheathGeometry.attributes.age.array;
                for (let i = 0; i < ages.length; i++) {
                    ages[i] = (ages[i] + 0.5) % 100; // Cycle through lifetimes
                }
                jetGroup.userData.sheathGeometry.attributes.age.needsUpdate = true;
            }
        }
    });
    
    if (lensingPlane) {
        lensingPlane.rotation.z += 0.0001;
    }
    
    if (blackHoleSystem.group) {
        const completedTasks = appState.tasks.filter(task => task.completed).length;
        const baseSpeed = 0.001;
        const bonusSpeed = completedTasks * 0.0002;
        const rotationSpeed = baseSpeed + bonusSpeed;
        
        blackHoleSystem.group.rotation.y += rotationSpeed;
        
        if (appState.currentMode === 'focus' && blackHoleSystem.eventHorizonMaterial) {
            const targetIntensity = 0.7 + Math.sin(time * 2) * 0.3;
            const currentIntensity = blackHoleSystem.eventHorizonMaterial.uniforms.intensity.value;
            blackHoleSystem.eventHorizonMaterial.uniforms.intensity.value += 
                (targetIntensity - currentIntensity) * 0.05;
        }
    }
    
    // Enhanced gravitational wave animations with precession and breathing
    gravitationalWaves.forEach((wave, index) => {
        if (wave.userData) {
            // Continuous precession (multi-minute loops)
            const precessionX = Math.sin(time * (2 * Math.PI / 120) + wave.userData.precessionPhaseX) * (15 * Math.PI / 180);
            const precessionY = Math.sin(time * (2 * Math.PI / 165) + wave.userData.precessionPhaseY) * (10 * Math.PI / 180);
            
            wave.rotation.x = wave.userData.initialTiltX + precessionX;
            wave.rotation.y = wave.userData.initialTiltY + precessionY;
            
            // Subtle radial breathing
            const breathingScale = 1 + Math.sin(time * (2 * Math.PI / 90) + wave.userData.breathingPhase) * 0.03;
            wave.scale.setScalar(breathingScale);
        }
        
        if (appState.timerState === 'running') {
            const targetScale = wave.scale.x * (1 + Math.sin(time * 0.3 + index) * 0.02);
            const currentScale = wave.scale.x;
            const newScale = currentScale + (targetScale - currentScale) * 0.05;
            wave.scale.setScalar(newScale);
        }
    });
}

// Keep other functions but ensure they don't cause visual disruption
export function triggerFocusIntensification() {
    if (blackHoleSystem.diskMaterial) {
        // Already handled in updateBlackHoleEffects with smooth transitions
    }
}

export function triggerTaskCompletionBurst() {
    console.log('🔥 WARNING: triggerTaskCompletionBurst() called - this should be DISABLED!');
    return;
}