// blackhole-interstellar.js - Interstellar-style Black Hole with Gravitational Lensing
// Recreates the iconic accretion disk with proper light bending

import * as THREE from 'three';

let accretionDiskSystem = null;
let polarJets = null;
let sceneRef = null;

const SCHWARZSCHILD_RADIUS = 4.0;
const INNER_STABLE_ORBIT = SCHWARZSCHILD_RADIUS * 3;
const DISK_OUTER_RADIUS = SCHWARZSCHILD_RADIUS * 10;

export function createEnhancedBlackHole(scene) {
    console.log('🕳️ Creating Interstellar black hole with gravitational lensing...');
    sceneRef = scene;
    
    createAccretionDisk();
    createPolarJets();
    
    console.log('✅ Black hole system complete');
}

function createAccretionDisk() {
    console.log('💫 Creating accretion disk with 8 density layers...');
    
    // Multiple layers for continuous, dense appearance
    const ringLayers = 8;
    const particlesPerLayer = 12000;
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
        const layerOffset = (layer - ringLayers / 2) * 0.12;
        
        for (let i = 0; i < particlesPerLayer; i++) {
            const i3 = idx * 3;
            
            // Very dense, continuous spiral distribution
            const spiralTurns = 8;
            const u = i / particlesPerLayer;
            const radius = INNER_STABLE_ORBIT + (DISK_OUTER_RADIUS - INNER_STABLE_ORBIT) * Math.pow(u, 0.25);
            const angle = u * Math.PI * 2 * spiralTurns + layer * 0.8;
            
            positions[i3] = Math.cos(angle) * radius;
            positions[i3 + 1] = layerOffset * (1 - Math.pow(u, 0.5));
            positions[i3 + 2] = Math.sin(angle) * radius;
            
            // Temperature gradient (Interstellar golden palette)
            const temperature = 1.0 - (radius - INNER_STABLE_ORBIT) / (DISK_OUTER_RADIUS - INNER_STABLE_ORBIT);
            
            if (temperature > 0.85) {
                // Brilliant white core
                colors[i3] = 1.0;
                colors[i3 + 1] = 1.0;
                colors[i3 + 2] = 0.95;
                sizes[idx] = 2.0 + Math.random() * 1.5;
            } else if (temperature > 0.65) {
                // Signature golden-yellow
                colors[i3] = 1.0;
                colors[i3 + 1] = 0.88;
                colors[i3 + 2] = 0.4;
                sizes[idx] = 1.8 + Math.random() * 1.2;
            } else if (temperature > 0.45) {
                // Deep amber/orange
                colors[i3] = 1.0;
                colors[i3 + 1] = 0.65;
                colors[i3 + 2] = 0.2;
                sizes[idx] = 1.5 + Math.random() * 1.0;
            } else if (temperature > 0.25) {
                // Burnt orange
                colors[i3] = 1.0;
                colors[i3 + 1] = 0.45;
                colors[i3 + 2] = 0.1;
                sizes[idx] = 1.2 + Math.random() * 0.8;
            } else {
                // Dark red edge
                colors[i3] = 0.9;
                colors[i3 + 1] = 0.25;
                colors[i3 + 2] = 0.05;
                sizes[idx] = 1.0 + Math.random() * 0.6;
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
            
            // Gravitational lensing approximation
            vec3 applyGravitationalLensing(vec3 pos, vec3 camPos) {
                vec3 toBH = pos - blackHolePos;
                float dist = length(toBH);
                vec3 toCamera = normalize(camPos - pos);
                
                // Schwarzschild light deflection
                float rs = 6.0; // Schwarzschild radius
                float deflectionAngle = 4.0 * rs / dist;
                
                // Apply bending perpendicular to line of sight
                vec3 perpendicular = cross(normalize(toBH), toCamera);
                vec3 deflectionDir = normalize(cross(perpendicular, toBH));
                
                // Stronger effect closer to event horizon
                float strength = smoothstep(40.0, 10.0, dist);
                
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
                
                // Apply gravitational lensing for double-ring effect
                vec3 lensedPos = applyGravitationalLensing(orbitPos, cameraPosition);
                vLensStrength = length(lensedPos - orbitPos) * 2.0;
                
                // Dynamic intensity
                float turbulence = 1.0 + sin(time * 3.0 + phase) * 0.15;
                vIntensity = 0.85 + sin(time * 2.5 + phase * 2.0) * 0.15;
                
                vec4 mvPosition = modelViewMatrix * vec4(lensedPos, 1.0);
                gl_PointSize = size * pixelRatio * (600.0 / -mvPosition.z) * turbulence;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vIntensity;
            varying float vRadius;
            varying float vLensStrength;
            
            void main() {
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);
                
                if (dist > 0.5) discard;
                
                // Soft, volumetric glow
                float intensity = 1.0 - smoothstep(0.0, 0.5, dist);
                intensity = pow(intensity, 1.3);
                
                // Brighter inner regions (realistic luminosity)
                float radialBrightness = 1.0 - (vRadius / 40.0);
                radialBrightness = pow(radialBrightness, 0.5);
                
                // Boost from gravitational lensing
                float lensingBoost = 1.0 + vLensStrength * 0.4;
                
                // Bright glowing emission like Interstellar
                vec3 finalColor = vColor * (2.5 + vIntensity * 1.5) * radialBrightness * lensingBoost;
                float alpha = intensity * vIntensity * 1.2 * radialBrightness;
                
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

function createPolarJets() {
    console.log('🌊 Creating relativistic polar jets...');
    
    polarJets = new THREE.Group();
    
    for (let jetIndex = 0; jetIndex < 2; jetIndex++) {
        const direction = jetIndex === 0 ? 1 : -1;
        const jetParticleCount = 12000;
        
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(jetParticleCount * 3);
        const colors = new Float32Array(jetParticleCount * 3);
        const sizes = new Float32Array(jetParticleCount);
        const phases = new Float32Array(jetParticleCount);
        const heights = new Float32Array(jetParticleCount);
        
        for (let i = 0; i < jetParticleCount; i++) {
            const i3 = i * 3;
            
            const height = Math.pow(Math.random(), 0.7) * 80 * direction;
            const radius = Math.abs(height) * 0.08 * (0.3 + Math.random() * 0.7);
            const angle = Math.random() * Math.PI * 2;
            
            const helixAngle = height * 0.15;
            const helixRadius = radius * (1.0 + Math.sin(helixAngle) * 0.3);
            
            positions[i3] = Math.cos(angle + helixAngle) * helixRadius;
            positions[i3 + 1] = height;
            positions[i3 + 2] = Math.sin(angle + helixAngle) * helixRadius;
            
            const intensity = 1.0 - Math.abs(height) / 80.0;
            
            if (Math.sin(height * 0.3 + angle) > 0) {
                colors[i3] = 0.2 * intensity;
                colors[i3 + 1] = 0.8 * intensity;
                colors[i3 + 2] = 1.0 * intensity;
            } else {
                colors[i3] = 1.0 * intensity;
                colors[i3 + 1] = 0.5 * intensity;
                colors[i3 + 2] = 0.1 * intensity;
            }
            
            sizes[i] = (0.4 + Math.random() * 0.6) * intensity;
            phases[i] = Math.random() * Math.PI * 2;
            heights[i] = height;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
        geometry.setAttribute('height', new THREE.BufferAttribute(heights, 1));
        
        const jetMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
            },
            vertexShader: `
                attribute float size;
                attribute float phase;
                attribute float height;
                uniform float time;
                uniform float pixelRatio;
                varying vec3 vColor;
                varying float vAlpha;
                
                void main() {
                    vColor = color;
                    
                    vec3 pos = position;
                    // Move particles outward continuously
                    pos.y += time * 15.0 * sign(height);
                    
                    // Reset far particles to base instead of cycling
                    if (abs(pos.y) > 80.0) {
                        pos.y = sign(height) * 5.0;
                    }
                    
                    float fade = 1.0 - abs(pos.y) / 80.0;
                    vAlpha = fade * (0.8 + sin(time * 3.0 + phase) * 0.2);
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;
                
                void main() {
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);
                    if (dist > 0.5) discard;
                    
                    float intensity = 1.0 - smoothstep(0.0, 0.5, dist);
                    intensity = pow(intensity, 2.0);
                    
                    gl_FragColor = vec4(vColor * 1.5, intensity * vAlpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            vertexColors: true,
            blending: THREE.AdditiveBlending
        });
        
        const jet = new THREE.Points(geometry, jetMaterial);
        polarJets.add(jet);
    }
    
    sceneRef.add(polarJets);
    console.log('✨ Polar jets created with magnetic field structure');
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
