// anamorphic-streak.js - Cinematic horizontal light streaks
// Mimics anamorphic cinema lenses — the signature "expensive" look
// Catches all bright elements scene-wide: accretion disk, nebula, hero stars, photon ring

let streakPostProcess = null;

const STREAK_FRAGMENT = `
    precision highp float;
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform vec2 texelSize;
    uniform float threshold;
    uniform float intensity;
    uniform float streakSpread;

    void main() {
        vec3 scene = texture2D(textureSampler, vUV).rgb;

        // Extract bright pixels
        float lum = dot(scene, vec3(0.2126, 0.7152, 0.0722));
        vec3 bright = max(scene - vec3(threshold), vec3(0.0));

        // 13-tap horizontal Gaussian blur with wide spacing
        vec3 streak = bright * 0.16;
        float totalWeight = 0.16;

        for (int i = 1; i <= 6; i++) {
            float fi = float(i);
            float w = exp(-fi * fi * 0.12);
            float offset = fi * streakSpread;
            vec3 s1 = texture2D(textureSampler, vUV + vec2(offset, 0.0)).rgb;
            vec3 s2 = texture2D(textureSampler, vUV - vec2(offset, 0.0)).rgb;
            streak += max(s1 - vec3(threshold), vec3(0.0)) * w;
            streak += max(s2 - vec3(threshold), vec3(0.0)) * w;
            totalWeight += w * 2.0;
        }

        streak /= totalWeight;

        // Warm anamorphic tint
        streak *= vec3(1.0, 0.95, 0.88);

        // Subtle color fringe at streak edges (blue leading, warm trailing)
        vec3 streakL = max(texture2D(textureSampler, vUV + vec2(streakSpread * 5.0, 0.0)).rgb - vec3(threshold), vec3(0.0));
        vec3 streakR = max(texture2D(textureSampler, vUV - vec2(streakSpread * 5.0, 0.0)).rgb - vec3(threshold), vec3(0.0));
        vec3 fringe = vec3(0.0);
        fringe.b += length(streakL) * 0.015;
        fringe.r += length(streakR) * 0.01;

        gl_FragColor = vec4(scene + streak * intensity + fringe, 1.0);
    }
`;

/**
 * Create anamorphic streak post-process
 * @param {BABYLON.Scene} scene
 * @param {BABYLON.Camera} camera
 */
export function createAnamorphicStreak(scene, camera) {
    BABYLON.Effect.ShadersStore['anamorphicStreakFragmentShader'] = STREAK_FRAGMENT;

    streakPostProcess = new BABYLON.PostProcess(
        'anamorphicStreak',
        'anamorphicStreak',
        ['texelSize', 'threshold', 'intensity', 'streakSpread'],
        null,
        0.5, // Half resolution for performance
        camera,
        BABYLON.Texture.BILINEAR_SAMPLINGMODE,
        scene.getEngine()
    );

    streakPostProcess.onApply = function (effect) {
        const engine = scene.getEngine();
        effect.setFloat2('texelSize',
            1.0 / engine.getRenderWidth(),
            1.0 / engine.getRenderHeight()
        );
        effect.setFloat('threshold', 1.2);       // Only very bright elements (accretion disk core, star glows)
        effect.setFloat('intensity', 0.15);
        effect.setFloat('streakSpread', 0.003);
    };

    return streakPostProcess;
}

export function disposeAnamorphicStreak() {
    if (streakPostProcess) {
        streakPostProcess.dispose();
        streakPostProcess = null;
    }
}

/** Graceful-degradation toggle. Creating / disposing is cheap because the
 *  compiled shader is cached in Babylon's ShadersStore. */
export function setAnamorphicStreakEnabled(enabled, scene, camera) {
    if (enabled) {
        if (!streakPostProcess && scene && camera) createAnamorphicStreak(scene, camera);
    } else {
        disposeAnamorphicStreak();
    }
}
export function isAnamorphicStreakActive() { return !!streakPostProcess; }
