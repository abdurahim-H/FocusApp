// aurora-snow.js — drifting cold particles (snow / ice motes).
//
// Built on Babylon's ParticleSystem so the GPU does the heavy lifting.
// Snow is fine, slow, and slightly varied in size + opacity. Wind
// gives it a gentle horizontal sway as it falls; lifetime is generous
// so particles linger rather than streak. Particles spawn in a wide
// box above the camera and drift down past it, recycled when they
// fall off-screen.

let particles = null;

const TIME_WRAP = 4 * 60 * 60;

/** Generate a tiny circular sprite at runtime — saves a network
 *  request and keeps the asset bundle clean. The disc has a soft
 *  radial falloff so particles read as glowing motes, not disks. */
function makeSpriteTexture(scene) {
    const size = 64;
    const dynamicTex = new BABYLON.DynamicTexture(
        'auroraSnowSprite',
        size,
        scene,
        false,
        BABYLON.Texture.NEAREST_SAMPLINGMODE
    );
    const ctx = dynamicTex.getContext();
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0.0, 'rgba(245, 250, 255, 0.95)');
    grad.addColorStop(0.45, 'rgba(220, 232, 245, 0.50)');
    grad.addColorStop(1.0, 'rgba(180, 220, 240, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    dynamicTex.update();
    dynamicTex.hasAlpha = true;
    return dynamicTex;
}

export function createAuroraSnow(scene) {
    particles = new BABYLON.ParticleSystem('auroraSnow', 1400, scene);
    particles.particleTexture = makeSpriteTexture(scene);

    // Emit from a wide box well above the camera so particles always
    // fall through the visible volume.
    particles.emitter = new BABYLON.Vector3(0, 60, 0);
    particles.minEmitBox = new BABYLON.Vector3(-180, 0, -180);
    particles.maxEmitBox = new BABYLON.Vector3(180, 0, 180);

    // Cool icy palette — slight blue tint, never pure white.
    particles.color1 = new BABYLON.Color4(0.85, 0.93, 1.0, 0.65);
    particles.color2 = new BABYLON.Color4(0.95, 0.98, 1.0, 0.55);
    // Fade out near the end of life.
    particles.colorDead = new BABYLON.Color4(0.7, 0.85, 1.0, 0.0);

    particles.minSize = 0.18;
    particles.maxSize = 0.55;

    // Long lifetime so the snow lingers — gives the scene a calm,
    // contemplative density without chewing through emit budget.
    particles.minLifeTime = 12.0;
    particles.maxLifeTime = 22.0;

    // Steady, modest emission — the visual goal is "calm" not "blizzard".
    particles.emitRate = 90;

    // Additive blend so overlap glows softly against the dark sky.
    particles.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

    // Gravity — gentle fall.
    particles.gravity = new BABYLON.Vector3(0, -1.2, 0);

    // Initial velocity — nearly zero plus a faint wind drift.
    particles.direction1 = new BABYLON.Vector3(-0.15, -0.4, -0.1);
    particles.direction2 = new BABYLON.Vector3(0.15, -0.7, 0.1);

    particles.minAngularSpeed = -0.4;
    particles.maxAngularSpeed = 0.4;

    particles.minEmitPower = 0.5;
    particles.maxEmitPower = 1.4;

    particles.updateSpeed = 0.012;

    // Belongs to the foreground layer so it draws on top of the
    // mountains but in front of the curtains. RenderingGroupId 2 sits
    // above the aurora's group 1 in the existing layer scheme.
    particles.renderingGroupId = 2;

    particles.start();
    return particles;
}

export function updateAuroraSnow() {
    // Babylon's ParticleSystem updates itself on scene render; nothing
    // per-frame needed here. Kept as a no-op so the registry's update
    // protocol stays uniform.
}

export function disposeAuroraSnow() {
    if (particles) {
        particles.stop();
        particles.dispose();
        particles = null;
    }
}
