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
import { get as getSetting, set as setSetting, setMany } from './store.js';

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
        // Scene theme writes to its own attribute so it doesn't fight
        // the color theme system (theme-init.js owns `data-theme` for
        // dark / light / cosmos). CSS scopes chrome overrides via
        // `[data-scene-theme="sakura"]`, `[data-scene-theme="aurora-plain"]`,
        // and `[data-scene-theme="celestial-garden"]`.
        document.documentElement.setAttribute('data-scene-theme', v);
        document.body.setAttribute('data-scene-theme', v);
        // Lazy import so the apply hooks don't pull the whole 3D
        // bundle eagerly. setActiveTheme is a no-op if the scene
        // hasn't initialised yet — first paint reads the saved id
        // directly via readSavedThemeId.
        import('../../graphics/scene/scene-manager.js').then((m) => {
            try { m.setActiveTheme?.(v); } catch (_) {}
        });
    },

    // ───────── Cycle preset (Wave 17) ─────────
    // Picking a named preset writes the matching durations + long-break
    // interval into their own settings keys. "custom" leaves the
    // sliders alone. "open-ended" sets a flag the timer reads to
    // switch into count-up mode; durations don't matter then.
    'timer.cyclePreset': (v) => {
        if (!v || v === 'custom') return;
        import('./store.js').then((store) => {
            const presets = {
                pomodoro: { focus: 25, short: 5, long: 15, every: 4, openEnded: false },
                'pomodoro-long': { focus: 50, short: 10, long: 30, every: 4, openEnded: false },
                '52-17': { focus: 52, short: 17, long: 30, every: 4, openEnded: false },
                '90-20': { focus: 90, short: 20, long: 30, every: 3, openEnded: false },
                deepwork: { focus: 180, short: 30, long: 60, every: 1, openEnded: false },
                'open-ended': { focus: 25, short: 5, long: 15, every: 4, openEnded: true },
            };
            const p = presets[v];
            if (!p) return;
            store.set('timer.focusDuration', p.focus);
            store.set('timer.shortBreakDuration', p.short);
            store.set('timer.longBreakDuration', p.long);
            store.set('timer.longBreakInterval', p.every);
            store.set('timer.openEnded', p.openEnded);
        });
    },
    // Open-ended flag is also writable directly so a future toggle can
    // flip it without going through the preset picker.
    'timer.openEnded': (_v) => {
        // No DOM mutation here — timer.js reads the flag inline. The
        // hook exists so the settings store fires the apply chain.
    },

    // ───────── Streams (Wave 5) ─────────
    // The picker writes a curated id; the custom-URL field writes a
    // shortened `custom:<videoId>` shorthand. Both feed the same
    // activeStreamId signal via stream-themes.setActiveStream.
    'scene.streamId': (v) => {
        // Curated id wins unless a custom URL is also set.
        import('../../core/state.js').then((s) => {
            // If a custom URL is already set, leave the live signal
            // alone — the user explicitly opted into that one.
            const customRaw = (
                document.documentElement.dataset?.streamCustom ?? ''
            ).trim();
            if (customRaw) return;
            s.activeStreamId.value = v || null;
        });
    },
    'scene.streamCustomUrl': (v) => {
        const url = (v || '').trim();
        if (!url) {
            // Cleared — fall back to whatever scene.streamId is set
            // to (could be empty / a curated id).
            document.documentElement.dataset.streamCustom = '';
            Promise.all([
                import('../../core/state.js'),
                import('./store.js'),
            ]).then(([s, store]) => {
                s.activeStreamId.value = store.get('scene.streamId') || null;
            });
            return;
        }
        document.documentElement.dataset.streamCustom = '1';
        Promise.all([
            import('../../core/state.js'),
            import('../stream-themes.js'),
        ]).then(([s, st]) => {
            const yt = st.shortenYouTubeUrl(url);
            if (yt) {
                s.activeStreamId.value = yt;
                return;
            }
            const sc = st.shortenSoundCloudUrl(url);
            if (sc) {
                s.activeStreamId.value = sc;
                return;
            }
            // Unrecognised link — clear so the user sees no effect
            // and can correct without a confusing partial state.
            s.activeStreamId.value = null;
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
