// shooting-stars.js - Occasional shooting star streaks
// Spawns brief, bright trails across the sky at random intervals

let particleSystem = null;
let scene = null;
let nextSpawnTime = 0;
let isActive = false;

// Shooting star texture
function createTrailTexture(sceneRef) {
    const size = 64;
    const texture = new BABYLON.DynamicTexture('shootingStarTex', size, sceneRef, false);
    const ctx = texture.getContext();

    // Elongated bright streak with soft glow
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.15, 'rgba(200, 220, 255, 0.9)');
    gradient.addColorStop(0.4, 'rgba(150, 180, 255, 0.4)');
    gradient.addColorStop(0.7, 'rgba(100, 140, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(80, 100, 200, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    texture.update();
    return texture;
}

/**
 * Create the shooting star particle system
 * @param {BABYLON.Scene} sceneRef
 */
export function createShootingStars(sceneRef) {
    scene = sceneRef;

    console.log('💫 Creating shooting star system...');

    particleSystem = new BABYLON.ParticleSystem('shootingStars', 200, scene);
    particleSystem.particleTexture = createTrailTexture(scene);

    // Emitter — will be repositioned each spawn
    particleSystem.emitter = new BABYLON.Vector3(0, 100, 0);
    particleSystem.createPointEmitter(
        new BABYLON.Vector3(-1, -0.5, -0.3),
        new BABYLON.Vector3(-0.8, -0.4, -0.2)
    );

    // Particle properties
    particleSystem.minSize = 0.3;
    particleSystem.maxSize = 0.8;
    particleSystem.minLifeTime = 0.2;
    particleSystem.maxLifeTime = 0.5;
    particleSystem.emitRate = 0; // Manual bursts only
    particleSystem.minEmitPower = 80;
    particleSystem.maxEmitPower = 150;
    particleSystem.updateSpeed = 0.02;

    // Colors — white-blue streak
    particleSystem.color1 = new BABYLON.Color4(1.0, 1.0, 1.0, 1.0);
    particleSystem.color2 = new BABYLON.Color4(0.7, 0.85, 1.0, 0.9);
    particleSystem.colorDead = new BABYLON.Color4(0.4, 0.5, 0.8, 0);

    // Size over life — shrinks to create tail
    particleSystem.addSizeGradient(0, 0.6, 0.8);
    particleSystem.addSizeGradient(0.3, 0.4, 0.6);
    particleSystem.addSizeGradient(1.0, 0.0, 0.05);

    // Additive blending for glow
    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

    // No gravity — straight line
    particleSystem.gravity = new BABYLON.Vector3(0, -2, 0);

    particleSystem.renderingGroupId = 0;
    particleSystem.start();

    // Schedule first shooting star
    nextSpawnTime = 3 + Math.random() * 5; // First one within 3-8 seconds

    console.log('   ✓ Shooting star system ready');
}

/**
 * Update — spawns shooting stars at random intervals
 * @param {number} elapsed - seconds since start
 */
export function updateShootingStars(elapsed) {
    if (!particleSystem) return;

    if (elapsed >= nextSpawnTime && !isActive) {
        spawnShootingStar();
        // Next spawn in 8-20 seconds
        nextSpawnTime = elapsed + 8 + Math.random() * 12;
    }
}

/**
 * Spawn a single shooting star burst
 */
function spawnShootingStar() {
    if (!particleSystem) return;

    // Random position on the sky sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.4 + 0.2; // Mostly above horizon
    const radius = 150 + Math.random() * 200;

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    particleSystem.emitter = new BABYLON.Vector3(x, y, z);

    // Direction: roughly toward center with some randomness
    const dirX = -x * 0.5 + (Math.random() - 0.5) * 50;
    const dirY = -y * 0.3 + (Math.random() - 0.5) * 30;
    const dirZ = -z * 0.5 + (Math.random() - 0.5) * 50;

    const dir = new BABYLON.Vector3(dirX, dirY, dirZ).normalize();
    const spread = 0.05;

    particleSystem.createPointEmitter(
        new BABYLON.Vector3(dir.x - spread, dir.y - spread, dir.z - spread),
        new BABYLON.Vector3(dir.x + spread, dir.y + spread, dir.z + spread)
    );

    // Burst emit
    isActive = true;
    particleSystem.emitRate = 150;

    // Stop after brief burst
    setTimeout(() => {
        if (particleSystem) {
            particleSystem.emitRate = 0;
            isActive = false;
        }
    }, 100);
}

/**
 * Dispose shooting star resources
 */
export function disposeShootingStars() {
    if (particleSystem) {
        particleSystem.dispose();
        particleSystem = null;
    }
    scene = null;
    isActive = false;
}
