// accretion-disk.js - Physically-Motivated Accretion Disk
// Custom shader for temperature gradient, Doppler beaming, and turbulence

import { DISK_INNER_EDGE, DISK_OUTER_RADIUS } from './constants.js';

let accretionDiskMesh = null;
let diskMaterial = null;
let upperDisk = null;
let lowerDisk = null;

// Register shaders once
let shadersRegistered = false;

/**
 * Register the accretion disk shaders with Babylon.js
 */
function registerShaders() {
    if (shadersRegistered) return;

    BABYLON.Effect.ShadersStore["accretionDiskVertexShader"] = `
        precision highp float;

        // Attributes
        attribute vec3 position;
        attribute vec2 uv;

        // Uniforms
        uniform mat4 worldViewProjection;
        uniform mat4 world;
        uniform float time;
        uniform float innerRadius;
        uniform float outerRadius;

        // Varyings
        varying vec2 vUV;
        varying vec3 vWorldPos;
        varying float vRadius;
        varying float vAngle;

        void main() {
            vec4 worldPos = world * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;

            // Calculate radius and angle from center
            vRadius = length(position.xy);
            vAngle = atan(position.y, position.x);

            // Apply Keplerian rotation - inner parts rotate faster
            float orbitalVelocity = 1.0 / sqrt(max(vRadius, 0.1));
            float rotatedAngle = vAngle + time * orbitalVelocity * 0.3;

            // Create spiral density waves
            float spiralPhase = rotatedAngle * 3.0 - vRadius * 0.5 + time * 0.2;

            vec3 newPos = position;
            // Slight vertical displacement for 3D feel
            newPos.z = sin(spiralPhase) * 0.15 * smoothstep(innerRadius, outerRadius, vRadius);

            vUV = uv;
            gl_Position = worldViewProjection * vec4(newPos, 1.0);
        }
    `;

    BABYLON.Effect.ShadersStore["accretionDiskFragmentShader"] = `
        precision highp float;

        // Varyings
        varying vec2 vUV;
        varying vec3 vWorldPos;
        varying float vRadius;
        varying float vAngle;

        // Uniforms
        uniform float time;
        uniform float innerRadius;
        uniform float outerRadius;
        uniform vec3 cameraPosition;
        uniform float dopplerStrength;

        // Blackbody color approximation based on temperature
        vec3 blackbodyColor(float temp) {
            // Temperature in thousands of Kelvin (normalized 0-1 input)
            // Inner disk ~20,000K (blue-white), outer ~3,000K (deep red)
            temp = clamp(temp, 0.0, 1.0);

            vec3 color;
            if (temp > 0.7) {
                // Hot: white to blue-white
                color = vec3(0.8, 0.85, 1.0) + (temp - 0.7) * vec3(0.2, 0.15, 0.0);
            } else if (temp > 0.4) {
                // Medium: yellow to white
                float t = (temp - 0.4) / 0.3;
                color = mix(vec3(1.0, 0.8, 0.4), vec3(1.0, 0.95, 0.9), t);
            } else if (temp > 0.15) {
                // Warm: orange to yellow
                float t = (temp - 0.15) / 0.25;
                color = mix(vec3(1.0, 0.4, 0.1), vec3(1.0, 0.7, 0.3), t);
            } else {
                // Cool: deep red
                color = vec3(0.8 + temp, 0.2 + temp * 0.5, 0.05);
            }
            return color;
        }

        // Noise function for turbulence
        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);

            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));

            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
            float value = 0.0;
            float amplitude = 0.5;
            for (int i = 0; i < 5; i++) {
                value += amplitude * noise(p);
                p *= 2.0;
                amplitude *= 0.5;
            }
            return value;
        }

        void main() {
            // Mask out the center (inside inner radius)
            float radialMask = smoothstep(innerRadius * 0.95, innerRadius * 1.1, vRadius);
            // Fade at outer edge
            float outerFade = 1.0 - smoothstep(outerRadius * 0.7, outerRadius, vRadius);

            if (radialMask < 0.01) {
                discard;
            }

            // Temperature based on radius (inner = hot, outer = cool)
            float normalizedRadius = (vRadius - innerRadius) / (outerRadius - innerRadius);
            float temperature = 1.0 - pow(normalizedRadius, 0.6);

            // Base color from temperature
            vec3 baseColor = blackbodyColor(temperature);

            // Add turbulent structure
            float spiralCoord = vAngle * 4.0 - vRadius * 0.8 + time * 0.15;
            vec2 turbCoord = vec2(spiralCoord, vRadius * 2.0);
            float turbulence = fbm(turbCoord + time * 0.1);

            // Create spiral density variations
            float spiral = sin(vAngle * 6.0 - vRadius * 1.5 + time * 0.2) * 0.5 + 0.5;
            spiral = pow(spiral, 2.0);

            // Fine filament detail
            float filaments = fbm(vec2(vAngle * 20.0 + time * 0.3, vRadius * 8.0));
            filaments = pow(filaments, 1.5);

            // Doppler beaming - approaching side is brighter
            // This creates asymmetry that sells the rotation
            float dopplerAngle = vAngle + time * 0.2;
            float doppler = 1.0 + dopplerStrength * sin(dopplerAngle);

            // Blue shift on approaching side, red shift on receding
            vec3 dopplerColor = baseColor;
            float shift = sin(dopplerAngle) * 0.15;
            dopplerColor.b += shift * temperature;
            dopplerColor.r -= shift * 0.5 * temperature;

            // Combine all effects
            float density = radialMask * outerFade;
            density *= (0.6 + 0.4 * turbulence);
            density *= (0.7 + 0.3 * spiral);
            density *= (0.8 + 0.2 * filaments);
            density *= doppler;

            // Hot spots - occasional bright knots
            float hotSpot = pow(noise(vec2(vAngle * 3.0 + time * 0.5, vRadius * 2.0)), 8.0);
            dopplerColor += vec3(1.5, 1.2, 0.8) * hotSpot * temperature;

            // Final color with HDR intensity
            vec3 finalColor = dopplerColor * density * (1.5 + temperature);

            // Boost inner disk brightness significantly
            float innerBoost = pow(1.0 - normalizedRadius, 2.0) * 2.0;
            finalColor *= (1.0 + innerBoost);

            gl_FragColor = vec4(finalColor, density * 0.95);
        }
    `;

    shadersRegistered = true;
}

/**
 * Create the accretion disk with proper physics
 * Uses custom shader for temperature gradient and Doppler beaming
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 * @param {BABYLON.Camera} camera - The main camera
 * @param {BABYLON.TransformNode} parent - Parent transform node
 * @returns {BABYLON.Mesh} The accretion disk mesh
 */
export function createAccretionDisk(scene, camera, parent) {
    console.log('💫 Creating physically-motivated accretion disk...');

    // Register shaders
    registerShaders();

    // Create disk geometry - a flat ring with many subdivisions
    accretionDiskMesh = BABYLON.MeshBuilder.CreateDisc('accretionDisk', {
        radius: DISK_OUTER_RADIUS,
        tessellation: 256,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);

    // Create the shader material
    diskMaterial = new BABYLON.ShaderMaterial('accretionDiskMaterial', scene, {
        vertex: 'accretionDisk',
        fragment: 'accretionDisk'
    }, {
        attributes: ['position', 'uv'],
        uniforms: ['worldViewProjection', 'world', 'time', 'innerRadius', 'outerRadius',
            'cameraPosition', 'dopplerStrength']
    });

    diskMaterial.setFloat('innerRadius', DISK_INNER_EDGE);
    diskMaterial.setFloat('outerRadius', DISK_OUTER_RADIUS);
    diskMaterial.setFloat('time', 0);
    diskMaterial.setFloat('dopplerStrength', 0.4);
    diskMaterial.setVector3('cameraPosition', camera.position);

    diskMaterial.backFaceCulling = false;
    diskMaterial.alphaMode = BABYLON.Engine.ALPHA_ADD;
    diskMaterial.needAlphaBlending = function () { return true; };

    accretionDiskMesh.material = diskMaterial;
    accretionDiskMesh.parent = parent;
    accretionDiskMesh.renderingGroupId = 2;

    // Create secondary upper disk layer for volume
    upperDisk = accretionDiskMesh.clone('upperDisk');
    upperDisk.position.z = 0.3;
    upperDisk.scaling = new BABYLON.Vector3(0.95, 0.95, 1);
    upperDisk.material = diskMaterial;
    upperDisk.parent = parent;

    // Lower disk layer
    lowerDisk = accretionDiskMesh.clone('lowerDisk');
    lowerDisk.position.z = -0.3;
    lowerDisk.scaling = new BABYLON.Vector3(0.92, 0.92, 1);
    lowerDisk.material = diskMaterial;
    lowerDisk.parent = parent;

    console.log('   ✓ Accretion disk with shader created');
    return accretionDiskMesh;
}

/**
 * Update accretion disk animation
 * @param {number} elapsed - Elapsed time in seconds
 * @param {BABYLON.Camera} camera - The main camera
 */
export function updateAccretionDisk(elapsed, camera) {
    if (diskMaterial) {
        diskMaterial.setFloat('time', elapsed);
        if (camera) {
            diskMaterial.setVector3('cameraPosition', camera.position);
        }
    }
}

/**
 * Get the accretion disk mesh
 * @returns {BABYLON.Mesh|null}
 */
export function getAccretionDisk() {
    return accretionDiskMesh;
}

/**
 * Get the disk material for external manipulation
 * @returns {BABYLON.ShaderMaterial|null}
 */
export function getDiskMaterial() {
    return diskMaterial;
}

/**
 * Dispose accretion disk resources
 */
export function disposeAccretionDisk() {
    if (lowerDisk) {
        lowerDisk.dispose();
        lowerDisk = null;
    }
    if (upperDisk) {
        upperDisk.dispose();
        upperDisk = null;
    }
    if (diskMaterial) {
        diskMaterial.dispose();
        diskMaterial = null;
    }
    if (accretionDiskMesh) {
        accretionDiskMesh.dispose();
        accretionDiskMesh = null;
    }
}
