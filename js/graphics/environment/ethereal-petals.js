// ethereal-petals.js - Drifting semi-transparent petal/crystal shapes
// Cool violet/pink shapes that tumble slowly through the scene
// Adds color contrast against gold + mystical anime quality

let particleSystem = null;
let scene = null;

/**
 * Create the ethereal petals particle system
 */
export function createEtherealPetals(sceneRef) {
    scene = sceneRef;

    particleSystem = new BABYLON.ParticleSystem('etherealPetals', 200, scene);

    // Create petal texture
    particleSystem.particleTexture = createPetalTexture();

    // Emit from a very large box encompassing the scene
    particleSystem.createBoxEmitter(
        new BABYLON.Vector3(0.1, -0.3, 0.05),    // Gentle downward-diagonal drift
        new BABYLON.Vector3(0.3, -0.1, 0.15),
        new BABYLON.Vector3(-120, -60, -120),
        new BABYLON.Vector3(120, 80, 120)
    );

    // Sizes — small and delicate
    particleSystem.minSize = 0.3;
    particleSystem.maxSize = 1.2;

    // Long lifetime — slow, meditative drift
    particleSystem.minLifeTime = 12;
    particleSystem.maxLifeTime = 25;

    // Sparse — enough to notice, not enough to overwhelm
    particleSystem.emitRate = 3;

    // Very slow drift speed
    particleSystem.minEmitPower = 0.3;
    particleSystem.maxEmitPower = 0.8;

    // Tumbling rotation — key to the petal feel
    particleSystem.minAngularSpeed = 0.2;
    particleSystem.maxAngularSpeed = 1.2;

    // Color — cool violet/pink with some warm gold edge highlights
    // Mix of colors for variety
    particleSystem.color1 = new BABYLON.Color4(0.65, 0.45, 0.85, 0.35);  // Soft violet
    particleSystem.color2 = new BABYLON.Color4(0.85, 0.5, 0.7, 0.25);    // Dusty rose
    particleSystem.colorDead = new BABYLON.Color4(0.5, 0.35, 0.6, 0);

    // Size fades over life — appears, drifts, vanishes
    particleSystem.addSizeGradient(0, 0.1, 0.2);
    particleSystem.addSizeGradient(0.1, 0.6, 1.0);
    particleSystem.addSizeGradient(0.5, 0.8, 1.2);
    particleSystem.addSizeGradient(0.85, 0.5, 0.8);
    particleSystem.addSizeGradient(1.0, 0.0, 0.1);

    // Alpha over life — gentle fade in/out
    particleSystem.addColorGradient(0, new BABYLON.Color4(0.65, 0.45, 0.85, 0));
    particleSystem.addColorGradient(0.12, new BABYLON.Color4(0.65, 0.45, 0.85, 0.3));
    particleSystem.addColorGradient(0.5, new BABYLON.Color4(0.75, 0.5, 0.8, 0.3));
    particleSystem.addColorGradient(0.85, new BABYLON.Color4(0.85, 0.55, 0.7, 0.15));
    particleSystem.addColorGradient(1.0, new BABYLON.Color4(0.5, 0.35, 0.6, 0));

    // Slight gravity for organic float feel
    particleSystem.gravity = new BABYLON.Vector3(0.02, -0.01, 0.01);

    // Standard blending — not additive, these should feel solid/semi-transparent
    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;

    particleSystem.renderingGroupId = 0;
    particleSystem.emitter = new BABYLON.Vector3(0, 0, 0);

    particleSystem.start();
}

/**
 * Create a petal-shaped texture
 */
function createPetalTexture() {
    const size = 64;
    const texture = new BABYLON.DynamicTexture('petalTexture', size, scene, false);
    const ctx = texture.getContext();

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Draw a soft diamond/petal shape
    const cx = size / 2;
    const cy = size / 2;

    // Petal shape — elongated soft diamond
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 6); // Slight rotation for organic feel

    // Gradient fill
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.4);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(0.3, 'rgba(220, 200, 240, 0.7)');
    grad.addColorStop(0.6, 'rgba(180, 160, 220, 0.4)');
    grad.addColorStop(1.0, 'rgba(140, 120, 180, 0)');

    ctx.fillStyle = grad;

    // Diamond shape
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.38);
    ctx.quadraticCurveTo(size * 0.22, -size * 0.1, 0, size * 0.38);
    ctx.quadraticCurveTo(-size * 0.22, -size * 0.1, 0, -size * 0.38);
    ctx.fill();

    // Subtle highlight edge — golden catch light
    ctx.strokeStyle = 'rgba(255, 220, 150, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.35);
    ctx.quadraticCurveTo(size * 0.18, -size * 0.08, 0, size * 0.35);
    ctx.stroke();

    ctx.restore();

    texture.update();
    texture.hasAlpha = true;
    return texture;
}

/**
 * Update petals — follows camera for consistent coverage
 */
export function updateEtherealPetals(elapsed, camera) {
    if (particleSystem && camera) {
        particleSystem.emitter = camera.position.clone();
    }
}

/**
 * Dispose petal resources
 */
export function disposeEtherealPetals() {
    if (particleSystem) {
        particleSystem.dispose();
        particleSystem = null;
    }
    scene = null;
}
