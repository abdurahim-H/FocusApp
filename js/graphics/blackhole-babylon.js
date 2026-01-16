// blackhole-babylon.js - Cinematic Black Hole with Gravitational Lensing
// Implements Schwarzschild metric distortion, photon ring, and physically-motivated accretion disk

// Physics constants
const SCHWARZSCHILD_RADIUS = 6.0;
const PHOTON_SPHERE_RADIUS = SCHWARZSCHILD_RADIUS * 1.5; // 1.5 Rs where photons orbit
const ISCO_RADIUS = SCHWARZSCHILD_RADIUS * 3.0; // Innermost Stable Circular Orbit
const DISK_OUTER_RADIUS = SCHWARZSCHILD_RADIUS * 8.0;
const DISK_INNER_EDGE = ISCO_RADIUS;

// Scene references
let blackHoleGroup = null;
let eventHorizon = null;
let photonRing = null;
let accretionDiskMesh = null;
let lensingPostProcess = null;
let diskMaterial = null;
let scene = null;
let camera = null;

// Animation state
let diskRotationAngle = 0;
let time = 0;

/**
 * Create the complete black hole system with gravitational lensing
 * @param {BABYLON.Scene} sceneRef - The Babylon.js scene
 * @param {BABYLON.Camera} cameraRef - The main camera
 * @returns {BABYLON.TransformNode} The black hole group
 */
export function createBlackHole(sceneRef, cameraRef) {
    console.log('🕳️ Creating cinematic black hole system...');
    scene = sceneRef;
    camera = cameraRef;

    // Create parent group for all black hole components
    blackHoleGroup = new BABYLON.TransformNode('blackHoleGroup', scene);

    // Tilt for dramatic viewing angle (like Interstellar's Gargantua)
    blackHoleGroup.rotation.x = BABYLON.Tools.ToRadians(75); // Edge-on view
    blackHoleGroup.rotation.z = BABYLON.Tools.ToRadians(5);

    // Create components in order
    createEventHorizon();
    createPhotonRing();
    createAccretionDisk();
    createGravitationalLensing();

    console.log('✅ Cinematic black hole system created');
    return blackHoleGroup;
}

/**
 * Create the event horizon - pure black sphere
 */
function createEventHorizon() {
    eventHorizon = BABYLON.MeshBuilder.CreateSphere('eventHorizon', {
        diameter: SCHWARZSCHILD_RADIUS * 2,
        segments: 64
    }, scene);

    // Pure black material - the void that absorbs everything
    const material = new BABYLON.StandardMaterial('horizonMat', scene);
    material.emissiveColor = new BABYLON.Color3(0, 0, 0);
    material.diffuseColor = new BABYLON.Color3(0, 0, 0);
    material.specularColor = new BABYLON.Color3(0, 0, 0);
    material.ambientColor = new BABYLON.Color3(0, 0, 0);
    material.disableLighting = true;
    material.backFaceCulling = false;

    eventHorizon.material = material;
    eventHorizon.parent = blackHoleGroup;
    eventHorizon.renderingGroupId = 1; // Render after background

    console.log('   ✓ Event horizon created');
}

/**
 * Create the photon ring - razor-thin bright ring at the photon sphere
 * This is THE signature visual of a black hole
 */
function createPhotonRing() {
    // Create a thin torus for the photon ring
    photonRing = BABYLON.MeshBuilder.CreateTorus('photonRing', {
        diameter: PHOTON_SPHERE_RADIUS * 2,
        thickness: 0.15, // Razor thin
        tessellation: 128
    }, scene);

    // Extremely bright emissive material
    const ringMaterial = new BABYLON.StandardMaterial('photonRingMat', scene);
    ringMaterial.emissiveColor = new BABYLON.Color3(2.5, 2.2, 1.8); // HDR bright white-gold
    ringMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    ringMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    ringMaterial.disableLighting = true;
    ringMaterial.alpha = 0.95;

    photonRing.material = ringMaterial;
    photonRing.parent = blackHoleGroup;
    photonRing.renderingGroupId = 2;

    // Create secondary Einstein ring (light from behind bent around)
    const einsteinRing = BABYLON.MeshBuilder.CreateTorus('einsteinRing', {
        diameter: PHOTON_SPHERE_RADIUS * 2.2,
        thickness: 0.08,
        tessellation: 128
    }, scene);

    const einsteinMaterial = new BABYLON.StandardMaterial('einsteinMat', scene);
    einsteinMaterial.emissiveColor = new BABYLON.Color3(1.5, 1.4, 1.2);
    einsteinMaterial.disableLighting = true;
    einsteinMaterial.alpha = 0.6;
    einsteinRing.material = einsteinMaterial;
    einsteinRing.parent = blackHoleGroup;
    einsteinRing.renderingGroupId = 2;

    console.log('   ✓ Photon ring created');
}

/**
 * Create the accretion disk with proper physics
 * Uses custom shader for temperature gradient and Doppler beaming
 */
function createAccretionDisk() {
    console.log('💫 Creating physically-motivated accretion disk...');

    // Create disk geometry - a flat ring with many subdivisions
    accretionDiskMesh = BABYLON.MeshBuilder.CreateDisc('accretionDisk', {
        radius: DISK_OUTER_RADIUS,
        tessellation: 256,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);

    // Create shader material for the disk
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
    diskMaterial.needAlphaBlending = function() { return true; };

    accretionDiskMesh.material = diskMaterial;
    accretionDiskMesh.parent = blackHoleGroup;
    accretionDiskMesh.renderingGroupId = 2;

    // Create secondary upper disk layer for volume
    const upperDisk = accretionDiskMesh.clone('upperDisk');
    upperDisk.position.z = 0.3;
    upperDisk.scaling = new BABYLON.Vector3(0.95, 0.95, 1);
    upperDisk.material = diskMaterial;
    upperDisk.parent = blackHoleGroup;

    // Lower disk layer
    const lowerDisk = accretionDiskMesh.clone('lowerDisk');
    lowerDisk.position.z = -0.3;
    lowerDisk.scaling = new BABYLON.Vector3(0.92, 0.92, 1);
    lowerDisk.material = diskMaterial;
    lowerDisk.parent = blackHoleGroup;

    console.log('   ✓ Accretion disk with shader created');
}

/**
 * Create gravitational lensing post-process effect
 * Distorts the background based on Schwarzschild metric
 */
function createGravitationalLensing() {
    console.log('🌀 Creating gravitational lensing effect...');

    // Custom post-process shader for gravitational lensing
    BABYLON.Effect.ShadersStore["gravitationalLensingFragmentShader"] = `
        precision highp float;

        // Samplers
        varying vec2 vUV;
        uniform sampler2D textureSampler;

        // Uniforms
        uniform vec2 screenSize;
        uniform vec2 blackHoleScreenPos;
        uniform float schwarzschildRadius;
        uniform float lensingStrength;
        uniform float time;

        void main() {
            vec2 uv = vUV;

            // Calculate direction and distance from black hole center
            vec2 toCenter = blackHoleScreenPos - uv;
            float dist = length(toCenter);
            vec2 dir = normalize(toCenter);

            // Avoid division by zero
            if (dist < 0.001) {
                gl_FragColor = texture2D(textureSampler, uv);
                return;
            }

            // Schwarzschild-like lensing formula
            // Deflection angle increases as we get closer to the event horizon
            float rs = schwarzschildRadius; // Schwarzschild radius in screen space

            // Einstein ring radius (where deflection is maximum)
            float einsteinRadius = rs * 2.5;

            // Calculate deflection based on impact parameter
            float impactParam = dist;
            float deflection = 0.0;

            if (impactParam > rs * 0.5) {
                // Approximate deflection angle: 4GM/c²b simplified
                deflection = lensingStrength * rs / impactParam;

                // Enhanced bending near photon sphere
                float photonSphere = rs * 1.5;
                if (impactParam < photonSphere * 2.0) {
                    float proximity = 1.0 - (impactParam - rs * 0.5) / (photonSphere * 1.5);
                    proximity = clamp(proximity, 0.0, 1.0);
                    deflection *= (1.0 + proximity * 3.0);
                }
            }

            // Apply the deflection - bend light toward the black hole
            vec2 deflectedUV = uv + dir * deflection;

            // Add subtle chromatic aberration near the edge
            float chromatic = deflection * 0.3;
            vec2 redUV = uv + dir * (deflection + chromatic);
            vec2 blueUV = uv + dir * (deflection - chromatic);

            // Sample with chromatic aberration
            float r = texture2D(textureSampler, redUV).r;
            float g = texture2D(textureSampler, deflectedUV).g;
            float b = texture2D(textureSampler, blueUV).b;

            vec3 color = vec3(r, g, b);

            // Darken inside event horizon
            if (dist < rs * 0.8) {
                float darkness = smoothstep(rs * 0.3, rs * 0.8, dist);
                color *= darkness;
            }

            // Add subtle Einstein ring glow at the right distance
            float ringDist = abs(dist - einsteinRadius);
            float ringGlow = exp(-ringDist * ringDist * 500.0) * 0.15;
            color += vec3(0.8, 0.75, 0.6) * ringGlow;

            gl_FragColor = vec4(color, 1.0);
        }
    `;

    // Create the post-process
    lensingPostProcess = new BABYLON.PostProcess(
        'gravitationalLensing',
        'gravitationalLensing',
        ['screenSize', 'blackHoleScreenPos', 'schwarzschildRadius', 'lensingStrength', 'time'],
        null,
        1.0,
        camera,
        BABYLON.Texture.BILINEAR_SAMPLINGMODE,
        scene.getEngine()
    );

    lensingPostProcess.onApply = function(effect) {
        const engine = scene.getEngine();
        effect.setFloat2('screenSize', engine.getRenderWidth(), engine.getRenderHeight());

        // Project black hole position to screen space
        if (blackHoleGroup) {
            const worldPos = blackHoleGroup.getAbsolutePosition();
            const screenPos = BABYLON.Vector3.Project(
                worldPos,
                BABYLON.Matrix.Identity(),
                scene.getTransformMatrix(),
                camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
            );

            // Normalize to 0-1 range
            const normalizedX = screenPos.x / engine.getRenderWidth();
            const normalizedY = 1.0 - (screenPos.y / engine.getRenderHeight()); // Flip Y

            effect.setFloat2('blackHoleScreenPos', normalizedX, normalizedY);
        } else {
            effect.setFloat2('blackHoleScreenPos', 0.5, 0.5);
        }

        // Schwarzschild radius in screen space (approximate)
        effect.setFloat('schwarzschildRadius', 0.08);
        effect.setFloat('lensingStrength', 0.15);
        effect.setFloat('time', time);
    };

    console.log('   ✓ Gravitational lensing post-process created');
}

/**
 * Update the black hole system each frame
 * @param {number} elapsed - Elapsed time in seconds
 * @param {number} delta - Delta time since last frame
 */
export function updateBlackHole(elapsed, delta) {
    time = elapsed;

    // Update disk shader time
    if (diskMaterial) {
        diskMaterial.setFloat('time', elapsed);
        if (camera) {
            diskMaterial.setVector3('cameraPosition', camera.position);
        }
    }

    // Subtle photon ring pulsation
    if (photonRing && photonRing.material) {
        const pulse = 1.0 + Math.sin(elapsed * 2.0) * 0.1;
        photonRing.material.emissiveColor = new BABYLON.Color3(
            2.5 * pulse,
            2.2 * pulse,
            1.8 * pulse
        );
    }
}

/**
 * Get the black hole group reference
 * @returns {BABYLON.TransformNode|null}
 */
export function getBlackHoleGroup() {
    return blackHoleGroup;
}

/**
 * Get the lensing post-process
 * @returns {BABYLON.PostProcess|null}
 */
export function getLensingPostProcess() {
    return lensingPostProcess;
}

/**
 * Dispose all black hole resources
 */
export function disposeBlackHole() {
    if (lensingPostProcess) {
        lensingPostProcess.dispose();
        lensingPostProcess = null;
    }
    if (diskMaterial) {
        diskMaterial.dispose();
        diskMaterial = null;
    }
    if (accretionDiskMesh) {
        accretionDiskMesh.dispose();
        accretionDiskMesh = null;
    }
    if (photonRing) {
        photonRing.dispose();
        photonRing = null;
    }
    if (eventHorizon) {
        eventHorizon.dispose();
        eventHorizon = null;
    }
    if (blackHoleGroup) {
        blackHoleGroup.dispose();
        blackHoleGroup = null;
    }
    scene = null;
    camera = null;
}

// Export constants for other modules
export { SCHWARZSCHILD_RADIUS, PHOTON_SPHERE_RADIUS, ISCO_RADIUS, DISK_OUTER_RADIUS };
