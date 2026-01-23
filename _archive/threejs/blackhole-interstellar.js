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
    console.log('⚡ Creating ethereal energy streams...');

    polarJets = new THREE.Group();

    // Create TWO jets (bipolar - up and down)
    for (let jetIndex = 0; jetIndex < 2; jetIndex++) {
        const direction = jetIndex === 0 ? 1 : -1;
        const particleCount = 55000; // Balanced density

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const randomness = new Float32Array(particleCount * 3); // x: radius, y: angle, z: speed
        const sizes = new Float32Array(particleCount);
        const phases = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;

            positions[i3] = 0;
            positions[i3 + 1] = 0;
            positions[i3 + 2] = 0;

            // Create a "Braided" structure
            // 3 main intertwining energy streams
            const strandCount = 3;
            const strandId = Math.floor(Math.random() * strandCount);
            const baseAngle = (strandId / strandCount) * Math.PI * 2;
            
            // Gaussian scatter for soft volume
            const r = Math.sqrt(-2.0 * Math.log(Math.random()));
            const radius = r * 0.8; // Tighter core

            randomness[i3] = radius;           
            randomness[i3 + 1] = baseAngle + (Math.random() - 0.5) * 1.0; // Angle with spread
            randomness[i3 + 2] = 15.0 + Math.random() * 20.0; // Varied speed

            // Mix of tiny dust and larger energy globs
            sizes[i] = Math.random() * Math.random(); // Bias towards smaller
            phases[i] = Math.random() * Math.PI * 2;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('aRandom', new THREE.BufferAttribute(randomness, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

        const streamMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
                direction: { value: direction },
                // Elegant Gradient: Gold (Base) -> Cyan (Mid) -> Violet (Tip)
                // This connects the orange disk to the blue cosmos
                colorBase: { value: new THREE.Color(1.0, 0.7, 0.3) }, // Warm Gold
                colorMid: { value: new THREE.Color(0.0, 0.8, 1.0) },  // Electric Cyan
                colorTip: { value: new THREE.Color(0.5, 0.0, 1.0) }   // Deep Violet
            },
            vertexShader: `
                attribute vec3 aRandom;
                attribute float size;
                attribute float phase;
                
                uniform float time;
                uniform float pixelRatio;
                uniform float direction;
                
                varying float vAlpha;
                varying float vRelHeight;
                varying float vRadialRatio;

                void main() {
                    float maxH = 160.0;
                    float speed = aRandom.z;
                    
                    float currentH = mod(time * speed + phase * 50.0, maxH);
                    float h = currentH;
                    vRelHeight = h / maxH;
                    
                    // BRAIDED MOTION
                    // Particles rotate as they rise, creating a DNA-like structure
                    float rotationSpeed = 2.0;
                    float currentAngle = aRandom.y + (h * 0.05) + time * 0.5;
                    
                    // Collimation: Starts tight, expands, then stays focused
                    float beamWidth = 1.0 + smoothstep(0.0, 30.0, h) * 1.5;
                    float r = aRandom.x * beamWidth;
                    
                    // Add organic turbulence
                    float noise = sin(h * 0.1 - time * 2.0) * sin(currentAngle * 2.0);
                    r += noise * 0.5 * (h / 100.0);
                    
                    float x = cos(currentAngle) * r;
                    float z = sin(currentAngle) * r;
                    float y = h * direction;
                    
                    vec3 newPos = vec3(x, y, z);
                    
                    vRadialRatio = clamp(aRandom.x / 2.0, 0.0, 1.0);

                    // Soft fade in/out
                    float fadeIn = smoothstep(0.0, 20.0, h);
                    float fadeOut = 1.0 - smoothstep(maxH * 0.6, maxH, h);
                    vAlpha = fadeIn * fadeOut;

                    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
                    
                    // Distance attenuation
                    float pointSize = size * (500.0 / -mvPosition.z);
                    gl_PointSize = pointSize * pixelRatio;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 colorBase;
                uniform vec3 colorMid;
                uniform vec3 colorTip;
                
                varying float vAlpha;
                varying float vRelHeight;
                varying float vRadialRatio;

                void main() {
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center) * 2.0;
                    
                    // Soft particle shape
                    float shape = exp(-dist * dist * 4.0);
                    if (shape < 0.01) discard;
                    
                    // ELEGANT GRADIENT MAPPING
                    vec3 finalColor;
                    
                    // Smooth transition based on height
                    // Base (0.0) -> Mid (0.4) -> Tip (1.0)
                    float midPoint = 0.4;
                    
                    if (vRelHeight < midPoint) {
                        float t = vRelHeight / midPoint;
                        finalColor = mix(colorBase, colorMid, t);
                    } else {
                        float t = (vRelHeight - midPoint) / (1.0 - midPoint);
                        finalColor = mix(colorMid, colorTip, t);
                    }
                    
                    // Core is always whiter/hotter
                    finalColor = mix(finalColor, vec3(1.0), (1.0 - vRadialRatio) * 0.5);
                    
                    // Subtle glow boost
                    finalColor *= 1.1;

                    // Balanced opacity for "ethereal" look
                    gl_FragColor = vec4(finalColor, shape * vAlpha * 0.4);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        const jet = new THREE.Points(geometry, streamMaterial);
        polarJets.add(jet);
    }

    sceneRef.add(polarJets);
    console.log('✨ Ethereal energy streams created');
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
