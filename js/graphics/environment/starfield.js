// starfield-babylon.js - Multi-layered Cinematic Starfield System
// Creates layered parallax starfield with dust and debris for cinematic depth

// Layer configuration
const LAYERS = {
    FAR_STARS: { count: 40000, minRadius: 400, maxRadius: 1200, speedMultiplier: 0.2 },
    MID_STARS: { count: 8000, minRadius: 150, maxRadius: 400, speedMultiplier: 0.5 },
    NEAR_STARS: { count: 2000, minRadius: 80, maxRadius: 150, speedMultiplier: 1.0 },
    DUST: { count: 2000, minRadius: 20, maxRadius: 100, speedMultiplier: 2.0 },
    DEBRIS: { count: 500, minRadius: 15, maxRadius: 60, speedMultiplier: 3.0 }
};

// Scene references
let starLayers = {};
let starMaterials = [];
let dustParticles = null;
let debrisParticles = null;
let scene = null;
let camera = null;
let shadersRegistered = false;

// Star twinkling shaders — smooth, organic breathing animation
const STAR_VERTEX_SHADER = `
    precision highp float;

    attribute vec3 position;
    attribute vec3 normal;
    attribute vec4 color;

    uniform mat4 worldViewProjection;
    uniform float time;

    varying vec4 vColor;
    varying float vTwinkle;

    void main() {
        float starId = fract(sin(dot(position.xyz, vec3(12.9898, 78.233, 45.164))) * 43758.5453);

        // Slow breathing pulse — organic, not mechanical
        float breathRate = 0.4 + starId * 0.6;  // Each star breathes at its own rate
        float breath = sin(time * breathRate + starId * 6.283);
        // Asymmetric — holds longer at peak brightness
        breath = 0.65 + 0.35 * breath * breath * sign(breath);

        // Secondary very slow modulation — changes which stars are bright over time
        float slowMod = 0.8 + 0.2 * sin(time * 0.12 + starId * 50.0);
        float twinkle = breath * slowMod;

        // Occasional gentle brightening for ~8% of stars (not jarring flare)
        float gentleBright = step(0.92, starId) * 0.4 * pow(max(0.0, sin(time * 0.3 + starId * 30.0)), 4.0);
        twinkle += gentleBright;

        vColor = color;
        vTwinkle = clamp(twinkle, 0.15, 1.8);

        gl_Position = worldViewProjection * vec4(position, 1.0);
    }
`;

const STAR_FRAGMENT_SHADER = `
    precision highp float;

    varying vec4 vColor;
    varying float vTwinkle;

    void main() {
        vec3 col = vColor.rgb * vTwinkle;
        float alpha = vColor.a * clamp(vTwinkle, 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
    }
`;

function registerStarShaders() {
    if (shadersRegistered) return;
    BABYLON.Effect.ShadersStore['starTwinkleVertexShader'] = STAR_VERTEX_SHADER;
    BABYLON.Effect.ShadersStore['starTwinkleFragmentShader'] = STAR_FRAGMENT_SHADER;
    shadersRegistered = true;
}

/**
 * Create the complete layered starfield system
 * @param {BABYLON.Scene} sceneRef - The Babylon.js scene
 * @param {BABYLON.Camera} cameraRef - The main camera
 * @returns {Object} References to all starfield layers
 */
export function createStarField(sceneRef, cameraRef, starMultiplier = 1.0) {
    console.log(`⭐ Creating cinematic starfield (quality: ${Math.round(starMultiplier * 100)}%)...`);
    scene = sceneRef;
    camera = cameraRef;

    // Scale star counts based on device capability
    const scale = (config) => ({
        ...config,
        count: Math.round(config.count * starMultiplier)
    });

    // Create each star layer
    starLayers.far = createStarLayer('farStars', scale(LAYERS.FAR_STARS), 0.3);
    starLayers.mid = createStarLayer('midStars', scale(LAYERS.MID_STARS), 0.5);
    starLayers.near = createStarLayer('nearStars', scale(LAYERS.NEAR_STARS), 0.8);

    // Create dust and debris particle systems
    createDustParticles();
    createDebrisParticles();

    console.log('✨ Cinematic starfield system created');
    return starLayers;
}

/**
 * Create a single star layer using SolidParticleSystem
 * @param {string} name - Layer name
 * @param {Object} config - Layer configuration
 * @param {number} brightnessScale - Overall brightness multiplier
 * @returns {BABYLON.SolidParticleSystem}
 */
function createStarLayer(name, config, brightnessScale) {
    const SPS = new BABYLON.SolidParticleSystem(name, scene, {
        updatable: false,
        isPickable: false
    });

    // Minimal geometry — stars are tiny points, 2 segments = 8 triangles per star
    const starModel = BABYLON.MeshBuilder.CreateSphere('starModel', {
        diameter: 1,
        segments: 2
    }, scene);

    // Add particles
    SPS.addShape(starModel, config.count, {
        positionFunction: (particle, i) => {
            setStarParticleProperties(particle, config, brightnessScale);
        }
    });

    SPS.buildMesh();
    starModel.dispose();

    // Register twinkling shaders
    registerStarShaders();

    // GPU-based twinkling via ShaderMaterial
    const mat = new BABYLON.ShaderMaterial(name + 'Mat', scene, {
        vertex: 'starTwinkle',
        fragment: 'starTwinkle'
    }, {
        attributes: ['position', 'normal', 'color'],
        uniforms: ['worldViewProjection', 'time'],
        needAlphaBlending: true
    });

    mat.setFloat('time', 0);
    mat.backFaceCulling = false;

    SPS.mesh.material = mat;
    SPS.mesh.hasVertexAlpha = true;
    SPS.mesh.renderingGroupId = 0; // Render first (background)

    // Store config and material reference for animation
    SPS.mesh._layerConfig = config;
    starMaterials.push(mat);

    console.log(`   ✓ ${name}: ${config.count.toLocaleString()} stars`);
    return SPS;
}

/**
 * Set properties for a single star particle
 * @param {Object} particle - The particle to configure
 * @param {Object} config - Layer configuration
 * @param {number} brightnessScale - Brightness multiplier
 */
function setStarParticleProperties(particle, config, brightnessScale) {
    // Spherical distribution
    const radius = config.minRadius + Math.random() * (config.maxRadius - config.minRadius);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    particle.position.x = radius * Math.sin(phi) * Math.cos(theta);
    particle.position.y = radius * Math.sin(phi) * Math.sin(theta);
    particle.position.z = radius * Math.cos(phi);

    // Star type distribution (realistic - most stars are dim red dwarfs)
    const type = Math.random();
    const stellar = getStellarClassification(type);

    // Scale based on layer depth (farther = smaller apparent size)
    const depthScale = 1.0 - (radius - config.minRadius) / (config.maxRadius - config.minRadius) * 0.5;
    particle.scaling = new BABYLON.Vector3(
        stellar.scale * depthScale,
        stellar.scale * depthScale,
        stellar.scale * depthScale
    );

    // Color with brightness adjustment
    particle.color = new BABYLON.Color4(
        stellar.color.r * brightnessScale,
        stellar.color.g * brightnessScale,
        stellar.color.b * brightnessScale,
        stellar.color.a * brightnessScale
    );
}

/**
 * Get stellar classification properties
 * Uses realistic distribution (more dim red dwarfs, fewer bright blue giants)
 * @param {number} type - Random value 0-1
 * @returns {{scale: number, color: BABYLON.Color4}}
 */
function getStellarClassification(type) {
    if (type < 0.02) {
        // Bright blue — rare, prominent, triggers bloom
        return {
            scale: 0.7 + Math.random() * 0.5,
            color: new BABYLON.Color4(0.9, 1.0, 2.2, 1.0)
        };
    } else if (type < 0.06) {
        // Bright crisp white — visible bloom
        return {
            scale: 0.45 + Math.random() * 0.35,
            color: new BABYLON.Color4(1.8, 1.8, 1.9, 1.0)
        };
    } else if (type < 0.15) {
        // Medium white — clean bright points
        return {
            scale: 0.3 + Math.random() * 0.2,
            color: new BABYLON.Color4(1.4, 1.4, 1.5, 1.0)
        };
    } else if (type < 0.24) {
        // Cool blue-white
        return {
            scale: 0.22 + Math.random() * 0.15,
            color: new BABYLON.Color4(1.1, 1.2, 1.5, 0.95)
        };
    } else if (type < 0.37) {
        // Warm white — slight golden tint
        return {
            scale: 0.18 + Math.random() * 0.15,
            color: new BABYLON.Color4(1.3, 1.15, 0.9, 0.95)
        };
    } else if (type < 0.50) {
        // Golden — complements the ribbons
        return {
            scale: 0.14 + Math.random() * 0.12,
            color: new BABYLON.Color4(1.15, 0.9, 0.55, 0.85)
        };
    } else if (type < 0.63) {
        // Subtle warm amber
        return {
            scale: 0.1 + Math.random() * 0.1,
            color: new BABYLON.Color4(1.0, 0.75, 0.4, 0.7)
        };
    } else {
        // Faint blue-white fill — background texture
        return {
            scale: 0.07 + Math.random() * 0.08,
            color: new BABYLON.Color4(0.6, 0.65, 0.8, 0.5)
        };
    }
}

/**
 * Create near-camera dust particle system
 * Tiny particles that catch light and create depth
 */
function createDustParticles() {
    console.log('   Creating near-camera dust...');

    dustParticles = new BABYLON.ParticleSystem('dust', 2000, scene);

    // Create tiny dust texture
    const dustTexture = createDustTexture();
    dustParticles.particleTexture = dustTexture;

    // Emit from box — particles FLOW in a direction (diagonal drift)
    dustParticles.createBoxEmitter(
        new BABYLON.Vector3(0.5, 0.2, 0.1),   // Direction 1 — diagonal flow
        new BABYLON.Vector3(1.0, 0.4, 0.3),   // Direction 2
        new BABYLON.Vector3(-60, -40, -60),
        new BABYLON.Vector3(60, 40, 60)
    );

    // Mix of tiny specks and slightly larger sparkles
    dustParticles.minSize = 0.02;
    dustParticles.maxSize = 0.08;

    // Medium lifetime
    dustParticles.minLifeTime = 5;
    dustParticles.maxLifeTime = 12;

    // More particles for visible golden dust
    dustParticles.emitRate = 80;

    // Noticeable flow speed
    dustParticles.minEmitPower = 0.5;
    dustParticles.maxEmitPower = 1.5;

    // Vibrant golden dust
    dustParticles.color1 = new BABYLON.Color4(1.0, 0.85, 0.35, 0.35);
    dustParticles.color2 = new BABYLON.Color4(1.0, 0.65, 0.2, 0.2);
    dustParticles.colorDead = new BABYLON.Color4(0.6, 0.3, 0.05, 0);

    // Additive blending for glow
    dustParticles.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

    // Position relative to camera
    dustParticles.emitter = new BABYLON.Vector3(0, 0, 0);

    dustParticles.start();
    console.log('   ✓ Dust particles created');
}

/**
 * Create debris particle system
 * Small rocks/ice specks at mid-distance
 */
function createDebrisParticles() {
    console.log('   Creating space debris...');

    debrisParticles = new BABYLON.ParticleSystem('debris', 300, scene);

    // Create debris texture
    const debrisTexture = createDebrisTexture();
    debrisParticles.particleTexture = debrisTexture;

    // Emit from larger box
    debrisParticles.createBoxEmitter(
        new BABYLON.Vector3(-1, -1, -1),
        new BABYLON.Vector3(1, 1, 1),
        new BABYLON.Vector3(-100, -100, -100),
        new BABYLON.Vector3(100, 100, 100)
    );

    // Small — subtle specks, not rocks
    debrisParticles.minSize = 0.02;
    debrisParticles.maxSize = 0.08;

    // Long lifetime
    debrisParticles.minLifeTime = 15;
    debrisParticles.maxLifeTime = 30;

    // Slow emission
    debrisParticles.emitRate = 5;

    // Very slow drift
    debrisParticles.minEmitPower = 0.05;
    debrisParticles.maxEmitPower = 0.15;

    // Angular velocity for tumbling
    debrisParticles.minAngularSpeed = 0.1;
    debrisParticles.maxAngularSpeed = 0.5;

    // Warm golden-amber tones
    debrisParticles.color1 = new BABYLON.Color4(0.6, 0.45, 0.2, 0.25);
    debrisParticles.color2 = new BABYLON.Color4(0.4, 0.3, 0.15, 0.15);
    debrisParticles.colorDead = new BABYLON.Color4(0.2, 0.15, 0.05, 0);

    // Standard blending
    debrisParticles.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;

    debrisParticles.emitter = new BABYLON.Vector3(0, 0, 0);

    debrisParticles.start();
    console.log('   ✓ Debris particles created');
}

/**
 * Create a small glow texture for dust
 * @returns {BABYLON.DynamicTexture}
 */
function createDustTexture() {
    const size = 32;
    const texture = new BABYLON.DynamicTexture('dustTexture', size, scene, false);
    const ctx = texture.getContext();

    // Soft radial gradient
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(200, 210, 255, 0.6)');
    gradient.addColorStop(0.7, 'rgba(150, 160, 200, 0.2)');
    gradient.addColorStop(1, 'rgba(100, 100, 150, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    texture.update();
    return texture;
}

/**
 * Create a rocky texture for debris
 * @returns {BABYLON.DynamicTexture}
 */
function createDebrisTexture() {
    const size = 32;
    const texture = new BABYLON.DynamicTexture('debrisTexture', size, scene, false);
    const ctx = texture.getContext();

    // Irregular rocky shape
    ctx.fillStyle = '#4a4540';
    ctx.beginPath();
    ctx.ellipse(size/2, size/2, size/2.5, size/3, Math.PI/6, 0, Math.PI * 2);
    ctx.fill();

    // Add some variation
    ctx.fillStyle = '#5a5550';
    ctx.beginPath();
    ctx.ellipse(size/2.2, size/2.3, size/4, size/5, -Math.PI/4, 0, Math.PI * 2);
    ctx.fill();

    texture.update();
    return texture;
}

/**
 * Update the starfield each frame
 * Creates parallax effect based on camera movement
 * @param {number} elapsed - Elapsed time in seconds
 */
export function updateStarField(elapsed) {
    // Update twinkling time uniform on all star materials
    starMaterials.forEach(mat => mat.setFloat('time', elapsed));

    // Rotate each layer at different speeds for parallax
    if (starLayers.far && starLayers.far.mesh) {
        starLayers.far.mesh.rotation.y = elapsed * 0.003;
        starLayers.far.mesh.rotation.x = elapsed * 0.001;
    }

    if (starLayers.mid && starLayers.mid.mesh) {
        starLayers.mid.mesh.rotation.y = elapsed * 0.006;
        starLayers.mid.mesh.rotation.x = elapsed * 0.002;
    }

    if (starLayers.near && starLayers.near.mesh) {
        starLayers.near.mesh.rotation.y = elapsed * 0.01;
        starLayers.near.mesh.rotation.x = elapsed * 0.004;
    }

    // Update dust emitter position to follow camera
    if (dustParticles && camera) {
        dustParticles.emitter = camera.position.clone();
    }

    // Update debris emitter
    if (debrisParticles && camera) {
        debrisParticles.emitter = camera.position.clone();
    }
}

/**
 * Get the starfield layers
 * @returns {Object}
 */
export function getStarField() {
    return starLayers;
}

/**
 * Dispose all starfield resources
 */
export function disposeStarField() {
    Object.values(starLayers).forEach(layer => {
        if (layer && layer.dispose) {
            layer.dispose();
        }
    });
    starLayers = {};
    starMaterials = [];

    if (dustParticles) {
        dustParticles.dispose();
        dustParticles = null;
    }

    if (debrisParticles) {
        debrisParticles.dispose();
        debrisParticles = null;
    }

    scene = null;
    camera = null;
}

// Export for external access
export { LAYERS };
