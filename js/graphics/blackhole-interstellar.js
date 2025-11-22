// blackhole-interstellar.js - Interstellar-style Black Hole with Gravitational Lensing
// Recreates the iconic accretion disk with proper light bending

import * as THREE from 'three';

let accretionDiskSystem = null;
let polarJets = null;
let volumetricGlowMesh = null;
let sceneRef = null;

const SCHWARZSCHILD_RADIUS = 6.0;  // Smaller black hole size
const INNER_STABLE_ORBIT = SCHWARZSCHILD_RADIUS * 1.5;  // Much closer to event horizon
const DISK_OUTER_RADIUS = SCHWARZSCHILD_RADIUS * 3.5;  // Compact, proportional disk

export function createEnhancedBlackHole(scene) {
    console.log('🕳️ Creating Interstellar black hole with gravitational lensing...');
    sceneRef = scene;

    // Volumetric glow layer removed - accretion disk particles provide the glow
    createAccretionDisk();
    createAccretionStreams();

    console.log('✅ Black hole system complete');
}

function createVolumetricGlowLayer() {
    console.log('🌟 Creating smooth volumetric glow layer...');

    // Create a smooth torus mesh for continuous glow
    const innerRadius = INNER_STABLE_ORBIT * 1.2;
    const outerRadius = DISK_OUTER_RADIUS * 0.9;
    const avgRadius = (innerRadius + outerRadius) / 2;
    const tubeRadius = (outerRadius - innerRadius) / 2;

    const geometry = new THREE.TorusGeometry(avgRadius, tubeRadius, 64, 128);

    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            innerRadius: { value: INNER_STABLE_ORBIT },
            outerRadius: { value: DISK_OUTER_RADIUS },
            glowColor: { value: new THREE.Color(1.0, 0.35, 0.08) }
        },
        vertexShader: `
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying float vDistanceFromCenter;
            uniform float innerRadius;
            uniform float outerRadius;

            void main() {
                vPosition = position;
                vNormal = normal;

                // Calculate distance from black hole center
                vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                float distFromCenter = length(worldPos.xz);
                vDistanceFromCenter = distFromCenter;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying float vDistanceFromCenter;
            uniform float time;
            uniform float innerRadius;
            uniform float outerRadius;
            uniform vec3 glowColor;

            void main() {
                // Radial gradient from inner to outer edge
                float normalizedDist = (vDistanceFromCenter - innerRadius) / (outerRadius - innerRadius);
                normalizedDist = clamp(normalizedDist, 0.0, 1.0);

                // Brighter at inner edge, fade to outer
                float radialIntensity = 1.0 - normalizedDist;
                radialIntensity = pow(radialIntensity, 0.8);

                // Vertical falloff for disk thickness
                float verticalFalloff = 1.0 - abs(vNormal.y);
                verticalFalloff = pow(verticalFalloff, 1.5);

                // Subtle animation
                float pulse = 0.9 + sin(time * 1.5 + vDistanceFromCenter * 0.1) * 0.1;

                // Combine effects
                float alpha = radialIntensity * verticalFalloff * pulse * 0.4;
                vec3 finalColor = glowColor * (1.2 + radialIntensity * 0.5);

                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });

    volumetricGlowMesh = new THREE.Mesh(geometry, material);
    sceneRef.add(volumetricGlowMesh);

    console.log('✨ Volumetric glow layer created (smooth base for particles)');
}

function createAccretionDisk() {
    console.log('💫 Creating ultra-dense accretion disk...');
    
    // Medium particle count - goldilocks zone
    const ringLayers = 20;
    const particlesPerLayer = 13000;
    const totalParticles = ringLayers * particlesPerLayer;
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(totalParticles * 3);
    const velocities = new Float32Array(totalParticles * 3);
    const colors = new Float32Array(totalParticles * 3);
    const sizes = new Float32Array(totalParticles);
    const phases = new Float32Array(totalParticles);
    const radii = new Float32Array(totalParticles);
    
    let idx = 0;
    for (let layer = 0; layer < ringLayers; layer++) {
        const layerOffset = (layer - ringLayers / 2) * 0.15;  // Thinner for smoother look
        
        for (let i = 0; i < particlesPerLayer; i++) {
            const i3 = idx * 3;

            // Random distribution with radial density falloff (no spiral banding)
            const u = Math.random();
            const radius = INNER_STABLE_ORBIT + (DISK_OUTER_RADIUS - INNER_STABLE_ORBIT) * Math.pow(u, 0.5);
            const angle = Math.random() * Math.PI * 2;
            
            positions[i3] = Math.cos(angle) * radius;
            positions[i3 + 1] = layerOffset * (1 - Math.pow(u, 0.5));
            positions[i3 + 2] = Math.sin(angle) * radius;
            
            // Temperature gradient (Orange/Red palette like reference images)
            const temperature = 1.0 - (radius - INNER_STABLE_ORBIT) / (DISK_OUTER_RADIUS - INNER_STABLE_ORBIT);

            if (temperature > 0.85) {
                colors[i3] = 1.0;
                colors[i3 + 1] = 0.5;
                colors[i3 + 2] = 0.1;
                sizes[idx] = 0.35 + Math.random() * 0.2;
            } else if (temperature > 0.65) {
                colors[i3] = 1.0;
                colors[i3 + 1] = 0.4;
                colors[i3 + 2] = 0.08;
                sizes[idx] = 0.3 + Math.random() * 0.2;
            } else if (temperature > 0.45) {
                colors[i3] = 1.0;
                colors[i3 + 1] = 0.32;
                colors[i3 + 2] = 0.06;
                sizes[idx] = 0.28 + Math.random() * 0.15;
            } else if (temperature > 0.25) {
                colors[i3] = 0.95;
                colors[i3 + 1] = 0.22;
                colors[i3 + 2] = 0.04;
                sizes[idx] = 0.25 + Math.random() * 0.12;
            } else {
                colors[i3] = 0.9;
                colors[i3 + 1] = 0.15;
                colors[i3 + 2] = 0.02;
                sizes[idx] = 0.22 + Math.random() * 0.1;
            }
            
            // Keplerian orbital velocity
            const speed = Math.sqrt(SCHWARZSCHILD_RADIUS / radius) * 0.5;
            velocities[i3] = -Math.sin(angle) * speed;
            velocities[i3 + 1] = 0;
            velocities[i3 + 2] = Math.cos(angle) * speed;
            
            phases[idx] = Math.random() * Math.PI * 2;
            radii[idx] = radius;
            
            idx++;
        }
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('radius', new THREE.BufferAttribute(radii, 1));
    
    console.log(`✨ Created ${totalParticles.toLocaleString()} particles in ${ringLayers} layers`);
    
    // Shader with gravitational lensing
    const diskMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
            blackHolePos: { value: new THREE.Vector3(0, 0, 0) }
        },
        vertexShader: `
            attribute float size;
            attribute float phase;
            attribute float radius;
            attribute vec3 velocity;
            
            uniform float time;
            uniform float pixelRatio;
            uniform vec3 blackHolePos;
            
            varying vec3 vColor;
            varying float vIntensity;
            varying float vRadius;
            varying float vLensStrength;
            varying float vCameraDistance;

            // Gravitational lensing approximation
            vec3 applyGravitationalLensing(vec3 pos, vec3 camPos, vec3 bhPos) {
                vec3 toBH = pos - bhPos;
                float dist = length(toBH);
                vec3 toCamera = normalize(camPos - pos);
                
                // Schwarzschild light deflection
                float rs = 6.0; // Schwarzschild radius (matches event horizon)
                float deflectionAngle = 4.0 * rs / dist;
                
                // Apply bending perpendicular to line of sight
                vec3 perpendicular = cross(normalize(toBH), toCamera);
                vec3 deflectionDir = normalize(cross(perpendicular, toBH));

                // Stronger effect closer to event horizon
                float strength = smoothstep(24.0, 6.0, dist);

                return pos + deflectionDir * deflectionAngle * strength;
            }
            
            void main() {
                vColor = color;
                vRadius = radius;
                
                // Orbital motion
                float orbitalSpeed = sqrt(6.0 / radius);
                float currentAngle = atan(position.z, position.x) + time * orbitalSpeed * 0.25;
                
                vec3 orbitPos;
                orbitPos.x = cos(currentAngle) * radius;
                orbitPos.z = sin(currentAngle) * radius;
                orbitPos.y = position.y;
                
                // Transform to World Space for correct lensing
                vec3 worldPos = (modelMatrix * vec4(orbitPos, 1.0)).xyz;
                vec3 worldBlackHolePos = (modelMatrix * vec4(blackHolePos, 1.0)).xyz;

                // Apply gravitational lensing in World Space
                vec3 lensedWorldPos = applyGravitationalLensing(worldPos, cameraPosition, worldBlackHolePos);
                vLensStrength = length(lensedWorldPos - worldPos) * 2.0;
                
                // Dynamic intensity
                float turbulence = 1.0 + sin(time * 3.0 + phase) * 0.15;
                vIntensity = 0.85 + sin(time * 2.5 + phase * 2.0) * 0.15;

                // Calculate camera distance for soft particle blending
                vec4 mvPosition = viewMatrix * vec4(lensedWorldPos, 1.0);
                vCameraDistance = -mvPosition.z;

                // Adaptive point size based on distance
                float distanceFactor = 750.0 / max(vCameraDistance, 1.0);
                gl_PointSize = size * pixelRatio * distanceFactor * turbulence;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vIntensity;
            varying float vRadius;
            varying float vLensStrength;
            varying float vCameraDistance;

            void main() {
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center) * 2.0;

                // Smooth Gaussian falloff for soft, blended particles
                float gaussianFalloff = exp(-dist * dist * 3.5);

                // Additional soft edge with cubic smoothstep
                float edgeSoftness = 1.0 - smoothstep(0.0, 1.0, dist);
                edgeSoftness = edgeSoftness * edgeSoftness * (3.0 - 2.0 * edgeSoftness);

                // Combine Gaussian core with soft edges
                float intensity = gaussianFalloff * edgeSoftness;

                // Brighter inner regions with smooth gradient
                float radialBrightness = 1.0 - (vRadius / 21.0);
                radialBrightness = pow(radialBrightness, 0.6);

                // Boost from gravitational lensing
                float lensingBoost = 1.0 + vLensStrength * 0.5;

                // HDR-aware color blending - prevents oversaturation
                vec3 baseColor = vColor * radialBrightness;
                vec3 glowColor = baseColor * (1.0 + vIntensity * 0.4);

                // Distance-based soft particle blending
                // Closer particles are softer, distant particles sharper
                float distanceSoftness = smoothstep(30.0, 90.0, vCameraDistance);
                float softBlend = mix(0.95, 0.75, distanceSoftness);

                // Smooth alpha with distance-based falloff
                float alpha = intensity * vIntensity * softBlend * radialBrightness * lensingBoost;
                alpha = pow(alpha, 0.85 + distanceSoftness * 0.15); // Adaptive alpha curve

                // Apply soft color with smooth blending
                vec3 finalColor = mix(baseColor, glowColor, intensity * 0.7);

                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        vertexColors: true,
        blending: THREE.AdditiveBlending
    });
    
    accretionDiskSystem = new THREE.Points(geometry, diskMaterial);
    sceneRef.add(accretionDiskSystem);
}

function createAccretionStreams() {
    console.log('⚡ Creating high-energy plasma jets...');

    polarJets = new THREE.Group();

    // Create TWO jets (bipolar - up and down)
    for (let jetIndex = 0; jetIndex < 2; jetIndex++) {
        const direction = jetIndex === 0 ? 1 : -1; // One up, one down
        const particleCount = 40000; // High density for plasma look

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const phases = new Float32Array(particleCount);
        const strands = new Float32Array(particleCount);
        const radialOffsets = new Float32Array(particleCount);
        const angleOffsets = new Float32Array(particleCount);
        const speeds = new Float32Array(particleCount);

        // Create 12 distinct plasma filaments
        const numStrands = 12;

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;

            // Initial random height
            positions[i3] = 0; 
            positions[i3 + 1] = Math.random() * 100.0 * direction; // Longer jets
            positions[i3 + 2] = 0; 

            // Assign to a specific filament strand
            strands[i] = Math.floor(Math.random() * numStrands);

            // Tighter radial distribution for collimated beam look
            // Gaussian distribution
            const r = Math.sqrt(-2.0 * Math.log(Math.random()));
            radialOffsets[i] = r * 0.5; // Slightly tighter core (was 0.6)
            angleOffsets[i] = Math.random() * Math.PI * 2;

            // High speed plasma
            speeds[i] = 25.0 + Math.random() * 15.0;

            // Richer Color Palette (Blue, Cyan, Purple, Magenta, White)
            const colorMix = Math.random();
            if (colorMix < 0.3) {
                // Electric Blue
                colors[i3] = 0.1;
                colors[i3 + 1] = 0.5;
                colors[i3 + 2] = 1.0;
            } else if (colorMix < 0.5) {
                // Cyan
                colors[i3] = 0.0;
                colors[i3 + 1] = 0.9;
                colors[i3 + 2] = 1.0;
            } else if (colorMix < 0.7) {
                // Deep Purple
                colors[i3] = 0.6;
                colors[i3 + 1] = 0.0;
                colors[i3 + 2] = 1.0;
            } else if (colorMix < 0.85) {
                // Magenta/Pink
                colors[i3] = 1.0;
                colors[i3 + 1] = 0.2;
                colors[i3 + 2] = 0.8;
            } else {
                // White hot core
                colors[i3] = 1.0;
                colors[i3 + 1] = 1.0;
                colors[i3 + 2] = 1.0;
            }

            // Varied sizes for depth
            sizes[i] = (0.5 + Math.random() * 1.5);
            phases[i] = Math.random() * Math.PI * 2;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
        geometry.setAttribute('strand', new THREE.BufferAttribute(strands, 1));
        geometry.setAttribute('radialOffset', new THREE.BufferAttribute(radialOffsets, 1));
        geometry.setAttribute('angleOffset', new THREE.BufferAttribute(angleOffsets, 1));
        geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));

        const streamMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
                direction: { value: direction }
            },
            vertexShader: `
                attribute float size;
                attribute float phase;
                attribute float strand;
                attribute float radialOffset;
                attribute float angleOffset;
                attribute float speed;
                
                uniform float time;
                uniform float pixelRatio;
                uniform float direction;
                
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    vColor = color;

                    // Animate height
                    float maxH = 100.0;
                    float currentH = position.y + time * speed * direction;
                    
                    // Wrap around
                    float h = mod(abs(currentH), maxH);
                    float signedH = h * direction;

                    // Plasma Filament Logic
                    // Each strand follows a slightly different path
                    float strandAngle = (strand / 12.0) * 6.28318;
                    
                    // Clean Spiral Twist
                    // Removed the wobbly noise, added smooth rotation
                    float spiralSpeed = 2.0;
                    float twistAmount = h * 0.15; // Tighter spiral
                    float currentAngle = strandAngle + twistAmount + time * spiralSpeed * direction;
                    
                    // Filament radius expands slightly with height (slightly tighter now)
                    float filamentRadius = 1.2 + h * 0.06; // Reduced from 1.5 + h * 0.08
                    
                    // Calculate filament center
                    float centerX = cos(currentAngle) * filamentRadius;
                    float centerZ = sin(currentAngle) * filamentRadius;
                    
                    // Add volume offset (particle distance from filament center)
                    float cloudX = cos(angleOffset) * radialOffset;
                    float cloudZ = sin(angleOffset) * radialOffset;
                    
                    vec3 newPos = vec3(centerX + cloudX, signedH, centerZ + cloudZ);

                    // Fade in/out
                    float fadeIn = smoothstep(0.0, 5.0, h);
                    float fadeOut = 1.0 - smoothstep(80.0, 100.0, h);
                    
                    // High frequency flicker for plasma effect
                    float flicker = 0.8 + sin(time * 20.0 + phase * 10.0) * 0.2;
                    
                    vAlpha = fadeIn * fadeOut * 0.15; // Slightly higher opacity for plasma

                    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
                    float distanceScale = 500.0 / -mvPosition.z;
                    gl_PointSize = size * pixelRatio * distanceScale * flicker;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center) * 2.0;

                    // Electric glow falloff
                    float intensity = pow(1.0 - dist, 3.0);
                    
                    if (intensity < 0.01) discard;

                    // Add a hot white core to particles
                    vec3 finalColor = mix(vColor, vec3(1.0), intensity * 0.5);

                    gl_FragColor = vec4(finalColor, intensity * vAlpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            vertexColors: true,
            blending: THREE.AdditiveBlending
        });

        const jet = new THREE.Points(geometry, streamMaterial);
        polarJets.add(jet);
    }

    sceneRef.add(polarJets);
    console.log('✨ Plasma jets created');
}

export function updateBlackHoleSystems(time, deltaTime, camera) {
    if (accretionDiskSystem) {
        accretionDiskSystem.material.uniforms.time.value = time;
    }

    if (polarJets) {
        polarJets.children.forEach(jet => {
            jet.material.uniforms.time.value = time;
        });
    }
}

export function cleanupBlackHole() {
    if (accretionDiskSystem) {
        accretionDiskSystem.geometry.dispose();
        accretionDiskSystem.material.dispose();
        if (sceneRef) sceneRef.remove(accretionDiskSystem);
        accretionDiskSystem = null;
    }

    if (polarJets) {
        polarJets.children.forEach(jet => {
            jet.geometry.dispose();
            jet.material.dispose();
        });
        if (sceneRef) sceneRef.remove(polarJets);
        polarJets = null;
    }
}
