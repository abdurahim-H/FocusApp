// starfield-babylon.js - Multi-layered Cinematic Starfield System
// Creates layered parallax starfield with dust and debris for cinematic depth

// Layer configuration
const LAYERS = {
    FAR_STARS: { count: 80000, minRadius: 400, maxRadius: 1200, speedMultiplier: 0.2 },
    MID_STARS: { count: 15000, minRadius: 150, maxRadius: 400, speedMultiplier: 0.5 },
    NEAR_STARS: { count: 3000, minRadius: 80, maxRadius: 150, speedMultiplier: 1.0 },
    DUST: { count: 2000, minRadius: 20, maxRadius: 100, speedMultiplier: 2.0 },
    DEBRIS: { count: 500, minRadius: 15, maxRadius: 60, speedMultiplier: 3.0 }
};

// Scene references
let starLayers = {};
let dustParticles = null;
let debrisParticles = null;
let scene = null;
let camera = null;

/**
 * Create the complete layered starfield system
 * @param {BABYLON.Scene} sceneRef - The Babylon.js scene
 * @param {BABYLON.Camera} cameraRef - The main camera
 * @returns {Object} References to all starfield layers
 */
export function createStarField(sceneRef, cameraRef) {
    console.log('⭐ Creating cinematic multi-layered starfield...');
    scene = sceneRef;
    camera = cameraRef;

    // Create each star layer
    starLayers.far = createStarLayer('farStars', LAYERS.FAR_STARS, 0.3);
    starLayers.mid = createStarLayer('midStars', LAYERS.MID_STARS, 0.5);
    starLayers.near = createStarLayer('nearStars', LAYERS.NEAR_STARS, 0.8);

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

    // Simple sphere for stars
    const starModel = BABYLON.MeshBuilder.CreateSphere('starModel', {
        diameter: 1,
        segments: 4
    }, scene);

    // Add particles
    SPS.addShape(starModel, config.count, {
        positionFunction: (particle, i) => {
            setStarParticleProperties(particle, config, brightnessScale);
        }
    });

    SPS.buildMesh();
    starModel.dispose();

    // Emissive material
    const material = new BABYLON.StandardMaterial(name + 'Mat', scene);
    material.emissiveColor = new BABYLON.Color3(1, 1, 1);
    material.disableLighting = true;
    material.backFaceCulling = false;

    SPS.mesh.material = material;
    SPS.mesh.hasVertexAlpha = true;
    SPS.mesh.renderingGroupId = 0; // Render first (background)

    // Store config for animation
    SPS.mesh._layerConfig = config;

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
    // Majority of stars are dim
    if (type < 0.03) {
        // O-type blue giants (very rare, very bright)
        return {
            scale: 1.5 + Math.random() * 1.0,
            color: new BABYLON.Color4(0.7, 0.8, 1.0, 1.0)
        };
    } else if (type < 0.08) {
        // B-type blue-white
        return {
            scale: 1.0 + Math.random() * 0.5,
            color: new BABYLON.Color4(0.85, 0.9, 1.0, 1.0)
        };
    } else if (type < 0.18) {
        // A-type white
        return {
            scale: 0.6 + Math.random() * 0.4,
            color: new BABYLON.Color4(1.0, 1.0, 1.0, 0.95)
        };
    } else if (type < 0.35) {
        // F-G type (Sun-like, yellow-white)
        return {
            scale: 0.4 + Math.random() * 0.3,
            color: new BABYLON.Color4(1.0, 0.95, 0.85, 0.9)
        };
    } else if (type < 0.55) {
        // K-type orange
        return {
            scale: 0.3 + Math.random() * 0.2,
            color: new BABYLON.Color4(1.0, 0.75, 0.5, 0.85)
        };
    } else {
        // M-type red dwarfs (most common, dimmest)
        return {
            scale: 0.15 + Math.random() * 0.2,
            color: new BABYLON.Color4(1.0, 0.5, 0.3, 0.6)
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

    // Emit from a box around the camera
    dustParticles.createBoxEmitter(
        new BABYLON.Vector3(-1, -1, -1),
        new BABYLON.Vector3(1, 1, 1),
        new BABYLON.Vector3(-50, -50, -50),
        new BABYLON.Vector3(50, 50, 50)
    );

    // Very small particles
    dustParticles.minSize = 0.02;
    dustParticles.maxSize = 0.08;

    // Long lifetime for slow drift
    dustParticles.minLifeTime = 8;
    dustParticles.maxLifeTime = 15;

    // Slow emission
    dustParticles.emitRate = 100;

    // Subtle movement
    dustParticles.minEmitPower = 0.1;
    dustParticles.maxEmitPower = 0.3;

    // Very subtle colors - just light catch
    dustParticles.color1 = new BABYLON.Color4(1.0, 1.0, 1.0, 0.15);
    dustParticles.color2 = new BABYLON.Color4(0.8, 0.85, 1.0, 0.08);
    dustParticles.colorDead = new BABYLON.Color4(0.5, 0.5, 0.6, 0);

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

    // Larger than dust
    debrisParticles.minSize = 0.1;
    debrisParticles.maxSize = 0.4;

    // Long lifetime
    debrisParticles.minLifeTime = 15;
    debrisParticles.maxLifeTime = 30;

    // Slow emission
    debrisParticles.emitRate = 10;

    // Very slow drift
    debrisParticles.minEmitPower = 0.05;
    debrisParticles.maxEmitPower = 0.15;

    // Angular velocity for tumbling
    debrisParticles.minAngularSpeed = 0.1;
    debrisParticles.maxAngularSpeed = 0.5;

    // Rocky colors
    debrisParticles.color1 = new BABYLON.Color4(0.4, 0.35, 0.3, 0.8);
    debrisParticles.color2 = new BABYLON.Color4(0.3, 0.3, 0.35, 0.6);
    debrisParticles.colorDead = new BABYLON.Color4(0.2, 0.2, 0.2, 0);

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
