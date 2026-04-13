// settings/graphics-presets.js
//
// Named quality tiers that each flip multiple scene knobs at once.
// Picked via the "Preset" segmented control in the Scene section.
// Users can still override individual values afterwards in the Advanced drawer.

export const GRAPHICS_PRESETS = {
    low: {
        label: 'Low',
        values: {
            'scene.bloomWeight': 0.25,
            'scene.exposure': 1.0,
            'scene.godRayIntensity': 0,
            'scene.vignette': 0.8,
            'scene.chromaticAberration': 0,
            'scene.grain': 0,
            'scene.cameraShake': 0.5,
            'scene.starDensity': 0.3,
            'scene.dofEnabled': false,
        },
    },
    medium: {
        label: 'Medium',
        values: {
            'scene.bloomWeight': 0.4,
            'scene.exposure': 1.1,
            'scene.godRayIntensity': 0.05,
            'scene.vignette': 1.2,
            'scene.chromaticAberration': 1,
            'scene.grain': 0.02,
            'scene.cameraShake': 0.8,
            'scene.starDensity': 0.5,
            'scene.dofEnabled': false,
        },
    },
    high: {
        label: 'High',
        values: {
            'scene.bloomWeight': 0.55,
            'scene.exposure': 1.2,
            'scene.godRayIntensity': 0.1,
            'scene.vignette': 1.5,
            'scene.chromaticAberration': 2,
            'scene.grain': 0.03,
            'scene.cameraShake': 1,
            'scene.starDensity': 1,
            'scene.dofEnabled': false,
        },
    },
    ultra: {
        label: 'Ultra',
        values: {
            'scene.bloomWeight': 0.65,
            'scene.exposure': 1.25,
            'scene.godRayIntensity': 0.15,
            'scene.vignette': 1.6,
            'scene.chromaticAberration': 2.5,
            'scene.grain': 0.03,
            'scene.cameraShake': 1.2,
            'scene.starDensity': 1.5,
            // DOF disabled — it blurs the entire scene making UI unreadable.
            // Users can still enable it manually in Advanced if they want the cinematic look.
            'scene.dofEnabled': false,
        },
    },
};

/**
 * Map a detected device tier (from performance-profile.js) to a preset id
 * when the user has "Auto" selected.
 */
export function tierToPreset(tier) {
    switch (tier) {
        case 'low':    return 'low';
        case 'medium': return 'medium';
        case 'high':   return 'high';
        default:       return 'high';
    }
}
