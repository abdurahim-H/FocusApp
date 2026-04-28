// settings/apply.js
//
// Runtime apply hooks. When store.set(key, value) is called, the store looks
// up APPLY_HOOKS[key] and invokes it with the new value. This is where we
// push settings into the running app — the store stays pure, the app reacts.
//
// Import strategy: everything here uses dynamic imports so this module can
// load before Babylon and the scene exist. A missing module is not an error —
// the hook just becomes a no-op for that session.
//
// Hooks are grouped by subsystem for scanning.

import { state } from '../../core/state.js';
import { GRAPHICS_PRESETS, tierToPreset } from './graphics-presets.js';

// Lazy module refs — populated on first hook invocation that needs them.
const lazy = {
    timer: null,
    sounds: null,
    pipeline: null,
    godRays: null,
    cameraFx: null,
    sceneManager: null,
    motion: null,
};

async function getModule(name) {
    if (lazy[name]) return lazy[name];
    try {
        switch (name) {
            case 'timer':
                lazy.timer = await import('../../features/timer.js');
                break;
            case 'sounds':
                lazy.sounds = await import('../../features/sounds.js');
                break;
            case 'pipeline':
                lazy.pipeline = await import('../../graphics/postprocessing/pipeline.js');
                break;
            case 'godRays':
                lazy.godRays = await import('../../graphics/postprocessing/god-rays.js');
                break;
            case 'cameraFx':
                lazy.cameraFx = await import('../../graphics/camera/camera-effects.js');
                break;
            case 'sceneManager':
                lazy.sceneManager = await import('../../graphics/scene/scene-manager.js');
                break;
            case 'motion':
                lazy.motion = await import('../../core/motion.js');
                break;
        }
    } catch (e) {
        console.warn(`[settings/apply] could not load ${name}:`, e);
    }
    return lazy[name];
}

// ============================================================================
// Graphics preset switching
// ============================================================================
import { get as getSetting, setMany } from './store.js';

async function applyGraphicsPreset(presetId) {
    let resolvedId = presetId;
    if (presetId === 'auto') {
        // Ensure scene-manager is loaded so we can read the detected tier.
        const sm = await getModule('sceneManager');
        const tier = sm?.getDeviceProfile?.()?.tier ?? 'high';
        resolvedId = tierToPreset(tier);
    }
    const preset = GRAPHICS_PRESETS[resolvedId];
    if (!preset) return;
    // setMany fires individual apply hooks for each value → the scene updates
    // live as the preset flips every knob at once. The user's explicit
    // `scene.quality` choice is preserved — we don't overwrite it here.
    setMany(preset.values);
}

// ============================================================================
// Hook table
// ============================================================================
export const APPLY_HOOKS = {
    // ───────── Timer ─────────
    'timer.focusDuration': (v) => {
        state.timer.settings.focusDuration = v;
        getModule('timer').then((mod) => {
            if (!state.timer.isRunning && !state.timer.isBreak) {
                state.timer.minutes = v;
                state.timer.seconds = 0;
                mod?.updateTimerDisplay?.();
            }
        });
    },
    'timer.shortBreakDuration': (v) => {
        state.timer.settings.shortBreakDuration = v;
    },
    'timer.longBreakDuration': (v) => {
        state.timer.settings.longBreakDuration = v;
    },
    'timer.timeFormat': (v) => {
        getModule('timer').then((mod) => mod?.updateDateTime?.());
    },
    // autoStart, autoStartDelay, longBreakInterval, pomodoroGoal:
    // Consumed directly from the store by timer.js on each completeSession tick,
    // so no apply hook is needed — writing the value is enough.

    // ───────── Sounds ─────────
    'sounds.masterVolume': (v) => {
        getModule('sounds').then((mod) => mod?.setVolume?.(v));
    },

    // ───────── Scene: quality preset ─────────
    'scene.quality': (v) => applyGraphicsPreset(v),

    // ───────── Scene: individual post-processing knobs ─────────
    'scene.bloomWeight': (v) => {
        getModule('pipeline').then((mod) => mod?.setBloomIntensity?.(v));
    },
    'scene.exposure': (v) => {
        getModule('pipeline').then((mod) => mod?.setBaseExposure?.(v));
    },
    'scene.godRayIntensity': (v) => {
        getModule('godRays').then((mod) => mod?.setGodRayExposure?.(v));
    },
    'scene.vignette': (v) => {
        getModule('pipeline').then((mod) => mod?.setVignetteWeight?.(v));
    },
    'scene.chromaticAberration': (v) => {
        getModule('pipeline').then((mod) => mod?.setChromaticAberrationAmount?.(v));
    },
    'scene.grain': (v) => {
        getModule('pipeline').then((mod) => mod?.setGrainIntensity?.(v));
    },
    'scene.cameraShake': (v) => {
        getModule('cameraFx').then((mod) => mod?.setShakeMultiplier?.(v));
    },
    'scene.dofEnabled': (v) => {
        getModule('pipeline').then((mod) => mod?.setDepthOfFieldEnabled?.(v));
    },
    // scene.starDensity: no live apply — starfield rebuild is too heavy.
    // The stored value is read by scene-manager on next init3D().

    // ───────── Motion ─────────
    'motion.forceReduce': (v) => {
        getModule('motion').then((mod) => mod?.setForceReducedMotion?.(v));
    },
    'motion.speedMultiplier': (v) => {
        getModule('motion').then((mod) => mod?.setSpeedMultiplier?.(v));
    },

    // ───────── Greeting ─────────
    'greeting.text': (v) => {
        const el = document.getElementById('greeting');
        if (el) {
            el.textContent = interpolateGreeting(v);
        }
    },

    // ───────── Scene theme — driven by the registry in scene-manager ────
    'scene.theme': (v) => {
        document.documentElement.setAttribute('data-theme', v);
        document.body.setAttribute('data-theme', v);
        // Lazy import so the apply hooks don't pull the whole 3D
        // bundle eagerly. setActiveTheme is a no-op if the scene
        // hasn't initialised yet — first paint reads the saved id
        // directly via readSavedThemeId.
        import('../../graphics/scene/scene-manager.js').then((m) => {
            try { m.setActiveTheme?.(v); } catch (_) {}
        });
    },
};

// ============================================================================
// Helpers
// ============================================================================

/** Supports {{time}} → morning/afternoon/evening. */
function interpolateGreeting(raw) {
    const fallback = 'Welcome to Your Universe!';
    const text = raw || fallback;
    if (!text.includes('{{')) return text;
    const h = new Date().getHours();
    const timeOfDay =
        h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night';
    return text.replace(/\{\{\s*time\s*\}\}/g, timeOfDay);
}
