// scene-manager.js - Cinematic Scene Orchestrator for Babylon.js
// Coordinates all graphics modules: starfield, camera, post-processing

import {
    disposeEngine,
    getEngine,
    initEngine,
    isUsingWebGPU,
} from '../../engine/babylon-engine.js';
import { getMasterEnergy } from '../../features/sounds.js';
import { createFPSWatchdog, detectDeviceProfile } from '../../utils/performance-profile.js';
import { initSoundBodies, updateSoundBodies } from '../blackhole/sound-bodies.js';
// Update functions are still imported here (not via the registry) so
// the render loop's hot path stays a flat sequence of direct calls —
// the registry handles theme init / dispose, scene-manager drives
// per-frame updates.
import { updateBlackHole } from '../blackhole/blackhole.js';
import { updateCosmicMotes } from '../environment/cosmic-motes.js';
import { updateCosmicSkybox } from '../environment/cosmic-skybox.js';
import { updateEtherealPetals } from '../environment/ethereal-petals.js';
import { updateNebula } from '../environment/nebula.js';
import { updateShootingStars } from '../environment/shooting-stars.js';
import { updateStarGlows } from '../environment/star-glows.js';
import { updateStarField } from '../environment/starfield.js';
import { activateTheme, deactivateTheme, getTheme, updateActiveTheme } from './theme-registry.js';
import {
    createAnamorphicStreak,
    disposeAnamorphicStreak,
    setAnamorphicStreakEnabled,
} from '../postprocessing/anamorphic-streak.js';
import {
    createGodRays,
    disposeGodRays,
    setGodRaysEnabled,
    updateGodRays,
} from '../postprocessing/god-rays.js';
import {
    createFilmGrainEffect,
    disposePostProcessing,
    getBaseExposure,
    setBloomEnabled,
    setBloomKernel,
    setChromaticAberrationEnabled,
    setExposure,
    setFilmGrainEnabled,
    setupPostProcessing,
} from '../postprocessing/pipeline.js';

// Scene globals
let scene = null;
let camera = null;
let engine = null;
let canvas = null;
// The active theme + the shared ctx the registry uses to thread
// scene / camera / blackholeMesh through every module's init.
// Exposed via getActiveTheme() for future UI surfaces that want to
// reflect / override the current theme at runtime.
let activeTheme = null;
let activeCtx = null;

// Mouse parallax state (desktop only)
const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
let parallaxEnabled = false;
let deviceProfile = null;
let fpsWatchdog = null;

// Animation timing
const clock = {
    startTime: performance.now(),
    lastTime: performance.now(),
    getElapsedTime() {
        return (performance.now() - this.startTime) / 1000;
    },
    getDeltaTime() {
        const now = performance.now();
        const delta = (now - this.lastTime) / 1000;
        this.lastTime = now;
        return delta;
    },
};

// Performance stats
const stats = {
    fps: 0,
    frameTime: 0,
    lastTime: performance.now(),
    frameCount: 0,
};

/**
 * Initialize the 3D scene
 * Main entry point called by app.js
 * @returns {Promise<boolean>} Success status
 */
export async function init3D() {
    try {
        // Initialize engine (handles WebGPU/WebGL2)
        const engineResult = await initEngine();
        engine = engineResult.engine;
        canvas = engineResult.canvas;
        // Detect device capability
        deviceProfile = detectDeviceProfile();

        // User-override: scale the auto-detected star density by the setting.
        // Read via a dynamic import so the store is optional at init time.
        try {
            const store = await import('../../ui/settings/store.js');
            const densityOverride = store.get('scene.starDensity');
            if (typeof densityOverride === 'number' && densityOverride > 0) {
                deviceProfile.starMultiplier = deviceProfile.starMultiplier * densityOverride;
            }
        } catch (_) {
            /* store unavailable — use defaults */
        }

        // Create scene with HDR support
        scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0.001, 0.001, 0.003, 1.0);

        // Enable rendering groups for proper layering
        scene.setRenderingAutoClearDepthStencil(0, true, true, true);
        scene.setRenderingAutoClearDepthStencil(1, false, false, false);
        scene.setRenderingAutoClearDepthStencil(2, false, false, false);

        // Setup cinematic camera first
        setupCinematicCamera();

        // Bring up the active theme. The theme registry knows which
        // modules to init and in what order; today only Black Hole is
        // registered, so this is a one-line drop-in for the historical
        // hard-coded init sequence. Future themes (Cosmic Garden,
        // Liminal Library, etc.) plug in via theme-registry.js without
        // touching this file.
        activeTheme = getTheme(await readSavedThemeId());
        activeCtx = activateTheme(activeTheme, {
            scene,
            camera,
            deviceProfile,
            blackholeMesh: null,
        });

        // Cosmos sound system — bodies that orbit the black hole, one per
        // active ambient track. Doesn't spawn anything on init; ambient-ui
        // calls summonBody() when the user starts a sound. The blackhole
        // module is responsible for stashing its mesh on the ctx so we
        // can pass it through here. Themes without a blackhole skip this.
        if (activeCtx.blackholeMesh) {
            initSoundBodies(scene, camera, activeCtx.blackholeMesh);
        }

        // Setup ambient lighting
        setupLighting();

        // Setup post-processing pipeline (bloom, ACES, vignette, color grading)
        setupPostProcessing(scene, camera);

        // Cinematic post-process chain (order matters — film grain must be last)
        createAnamorphicStreak(scene, camera);
        createGodRays(scene, camera);
        createFilmGrainEffect();

        // Setup FPS watchdog with a multi-level graceful-degradation ladder.
        // Instead of dropping render resolution the moment FPS dips (the old
        // binary-downgrade behaviour that made the scene look pixelated),
        // we now switch off expensive post-process effects one rung at a
        // time. Hardware scaling is a last-resort fallback. Every 5 minutes
        // we probe whether full quality is sustainable again.
        const BLOOM_DEFAULT_KERNEL = 64;
        fpsWatchdog = createFPSWatchdog(
            stats,
            (from, to) => {
                applyQualityLevel(to, { from });
            },
            5
        );

        function applyQualityLevel(level, { from } = {}) {
            if (!scene || !camera) return;
            // Each level is additive: level 3 implies everything at level 1..3.
            // We walk the full ladder each time so recovery is symmetric.

            // Level 1 — cheap post-processes first (minimal visual cost).
            const wantGrain = level < 1;
            const wantChromatic = level < 1;
            // Level 2 — anamorphic streak (visible on bright elements).
            const wantStreak = level < 2;
            // Level 3 — god rays (the radial beam effect).
            const wantGodRays = level < 3;
            // Level 4 — shrink bloom kernel (halves the most expensive pass).
            const targetKernel =
                level < 4 ? BLOOM_DEFAULT_KERNEL : Math.floor(BLOOM_DEFAULT_KERNEL / 2);
            // Level 5 — last resort: lower render resolution slightly.
            const targetScaling = level < 5 ? 1.0 : 1.25;

            try {
                setFilmGrainEnabled(wantGrain);
            } catch (e) {
                /* ignore */
            }
            try {
                setChromaticAberrationEnabled(wantChromatic);
            } catch (e) {
                /* ignore */
            }
            try {
                setAnamorphicStreakEnabled(wantStreak, scene, camera);
            } catch (e) {
                /* ignore */
            }
            try {
                setGodRaysEnabled(wantGodRays, scene, camera);
            } catch (e) {
                /* ignore */
            }
            try {
                setBloomKernel(targetKernel);
            } catch (e) {
                /* ignore */
            }
            try {
                if (engine) engine.setHardwareScalingLevel(targetScaling);
            } catch (e) {
                /* ignore */
            }
        }

        engine.runRenderLoop(renderLoop);

        // Handle window resize
        window.addEventListener('resize', handleResize);

        // Replay any saved scene settings now that pipeline + god rays exist.
        // This catches the case where loadSettings() ran BEFORE the scene was
        // ready, so the apply hooks had nothing to push into.
        try {
            const [{ APPLY_HOOKS }, store] = await Promise.all([
                import('../../ui/settings/apply.js'),
                import('../../ui/settings/store.js'),
            ]);
            const all = store.getAll();
            for (const key of Object.keys(all)) {
                if (!key.startsWith('scene.') && !key.startsWith('motion.')) continue;
                const fn = APPLY_HOOKS[key];
                if (typeof fn === 'function') {
                    try {
                        fn(all[key]);
                    } catch (_) {
                        /* tolerate */
                    }
                }
            }
        } catch (_) {
            /* optional */
        }

        // Mouse parallax (desktop only)
        if (!('ontouchstart' in window)) {
            parallaxEnabled = true;
            window.addEventListener('mousemove', (e) => {
                mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
                mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
            });
        }

        return true;
    } catch (error) {
        console.error('Failed to initialize scene:', error);
        return false;
    }
}

/**
 * Setup the cinematic camera with slow orbital motion
 */
function setupCinematicCamera() {
    // ArcRotateCamera for smooth orbital movement
    camera = new BABYLON.ArcRotateCamera(
        'cinematicCamera',
        Math.PI * 0.25, // Alpha (horizontal angle)
        Math.PI * 0.4, // Beta (vertical angle) - slightly above horizon
        65, // Radius (distance from center)
        BABYLON.Vector3.Zero(),
        scene
    );

    // Camera constraints
    camera.lowerRadiusLimit = 30;
    camera.upperRadiusLimit = 200;
    camera.lowerBetaLimit = 0.1;
    camera.upperBetaLimit = Math.PI - 0.1;

    // Smooth camera movement
    camera.inertia = 0.9;

    // Disable user input for cinematic mode
    camera.inputs.clear();

    // Set FOV for cinematic feel (wider than default)
    camera.fov = 0.9; // ~52 degrees

    // Near/far planes for proper depth
    camera.minZ = 0.1;
    camera.maxZ = 2000;
}

/**
 * Setup subtle ambient lighting
 */
function setupLighting() {
    // Very dim ambient - space is dark
    const ambient = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), scene);
    ambient.intensity = 0.05;
    ambient.diffuse = new BABYLON.Color3(0.05, 0.05, 0.1);
    ambient.groundColor = new BABYLON.Color3(0.02, 0.02, 0.05);

    // Subtle blue key light (from above-left)
    const keyLight = new BABYLON.PointLight('keyLight', new BABYLON.Vector3(-50, 40, 50), scene);
    keyLight.diffuse = new BABYLON.Color3(0.2, 0.25, 0.4);
    keyLight.intensity = 0.3;
    keyLight.range = 300;

    // Warm fill light (from below-right)
    const fillLight = new BABYLON.PointLight('fillLight', new BABYLON.Vector3(40, -20, -40), scene);
    fillLight.diffuse = new BABYLON.Color3(0.4, 0.2, 0.1);
    fillLight.intensity = 0.15;
    fillLight.range = 200;
}

/** Pull the user's saved theme id from settings. Falls back to null
 *  (which `getTheme` resolves to the first registered theme). Wrapped
 *  in a try because the settings store is loaded async at scene init
 *  and may not be ready on the very first paint. */
async function readSavedThemeId() {
    try {
        const store = await import('../../ui/settings/store.js');
        return store.get('scene.theme') ?? null;
    } catch (_) {
        return null;
    }
}

/** Public — current theme metadata. UI surfaces (e.g. settings)
 *  can read this without coupling to the registry directly. */
export function getActiveTheme() {
    return activeTheme;
}

/** Swap the active theme at runtime. Tears down the old module set,
 *  brings up the new one through the registry, and reattaches the
 *  cosmos sound bodies to the new black-hole mesh (if any). Cheap
 *  per-call: each module disposes its own resources. Safe to spam
 *  through a settings slider. */
export function setActiveTheme(id) {
    if (!scene || !camera) return;
    // Boot race: loadSettings() replays apply hooks synchronously, which
    // calls setActiveTheme via the scene.theme hook *while* init3D() is
    // still mid-await. At that point scene + camera are set but
    // activeTheme is null — so the early-return below didn't fire and we
    // ended up activating modules a second time once init3D resumed.
    // The orphan first-set meshes never got disposed (the module's local
    // ref pointed only at the second set), which read on screen as
    // "previous theme leaks through after a switch."
    if (!activeTheme) return;
    if (activeTheme.id === id) return;
    const next = getTheme(id);
    if (!next) return;
    deactivateTheme(activeTheme);
    activeTheme = next;
    activeCtx = activateTheme(activeTheme, {
        scene,
        camera,
        deviceProfile,
        blackholeMesh: null,
    });
    if (activeCtx.blackholeMesh) {
        initSoundBodies(scene, camera, activeCtx.blackholeMesh);
    }
}

/**
 * Main render loop
 */
function renderLoop() {
    const elapsed = clock.getElapsedTime();
    const delta = clock.getDeltaTime();

    // Update all systems. The Black Hole theme's modules are driven by
    // these direct calls (legacy hot path, kept for clarity); they
    // safely no-op when their material/mesh is null (i.e. when a
    // different theme is active). Themes registered AFTER Black Hole
    // (Aurora Plain, future themes) update via updateActiveTheme()
    // below — that walks the active theme's module list and runs
    // each module's update hook.
    updateCinematicCamera(elapsed);
    updateCosmicSkybox(elapsed);
    updateStarField(elapsed);
    updateNebula(elapsed);
    updateShootingStars(elapsed);
    updateBlackHole(elapsed, { masterEnergy: getMasterEnergy() });
    updateSoundBodies(elapsed);
    updateStarGlows(elapsed);
    updateCosmicMotes(elapsed);
    updateEtherealPetals(elapsed, camera);
    // Theme-registry-driven updates. The Black Hole theme's modules
    // wouldn't double-fire because the registry's update hooks call
    // the same update functions — but those functions are safe to call
    // multiple times per frame (idempotent setFloat). For Aurora
    // Plain and future themes, this is the only update path.
    if (activeTheme && activeTheme.id !== 'blackhole') {
        updateActiveTheme(activeTheme, elapsed, delta);
    }
    updateGodRays(scene, camera);

    // Update exposure based on camera position (auto-exposure simulation)
    updateAutoExposure(elapsed);

    // Render the scene
    scene.render();

    // Update performance stats
    updateStats();

    // Check FPS watchdog
    if (fpsWatchdog) fpsWatchdog();
}

/**
 * Update camera for cinematic orbital motion
 * Layered sine waves for organic Perlin-like drift
 * @param {number} elapsed - Elapsed time in seconds
 */
function updateCinematicCamera(elapsed) {
    // --- Orbital rotation: 3 layered sine waves for organic drift ---
    const baseAlpha = Math.PI * 0.25;
    const orbitDrift =
        elapsed * 0.015 +
        Math.sin(elapsed * 0.023) * 0.04 +
        Math.sin(elapsed * 0.011) * 0.025 +
        Math.sin(elapsed * 0.037) * 0.015;
    camera.alpha = baseAlpha + orbitDrift;

    // --- Vertical drift: layered for smooth organic motion ---
    const baseBeta = Math.PI * 0.4;
    const verticalDrift =
        Math.sin(elapsed * 0.013) * 0.06 +
        Math.sin(elapsed * 0.029) * 0.03 +
        Math.sin(elapsed * 0.007) * 0.02;
    camera.beta = Math.max(0.3, Math.min(Math.PI - 0.3, baseBeta + verticalDrift));

    // --- Asymmetric breathing: cube creates longer hold at extremes ---
    const baseRadius = 65;
    const breathSin = Math.sin(elapsed * 0.02);
    const breathing = Math.abs(breathSin) ** 0.6 * Math.sign(breathSin) * 10;
    camera.radius = baseRadius + breathing;

    // --- Micro-motion: subtle film shake ---
    let targetX = Math.sin(elapsed * 2.3) * 0.003 + Math.sin(elapsed * 5.7) * 0.001;
    let targetY = Math.sin(elapsed * 1.7) * 0.002 + Math.sin(elapsed * 4.1) * 0.001;

    // --- Mouse parallax (desktop only) ---
    if (parallaxEnabled) {
        // Smooth lerp toward mouse position
        mouse.x += (mouse.targetX - mouse.x) * 0.02;
        mouse.y += (mouse.targetY - mouse.y) * 0.02;
        targetX += mouse.x * 1.5;
        targetY += -mouse.y * 1.0;
    }

    camera.target.x = targetX;
    camera.target.y = targetY;
}

/**
 * Simulate auto-exposure based on scene brightness. The base exposure is
 * driven by Settings > Scene > Advanced > Exposure — this loop just adds a
 * tiny sinusoidal variation on top so the scene breathes.
 * @param {number} elapsed
 */
function updateAutoExposure(elapsed) {
    const base = getBaseExposure();
    const variation = Math.sin(elapsed * 0.1) * 0.05;
    setExposure(base + variation);
}

/**
 * Update performance statistics
 */
// Rolling window of recent frame times so stats.fps reflects sustained
// performance, not whichever single frame happened to land on a GC pause.
// 60 samples ≈ 1 second at 60 fps — one hitch can't dominate.
const FPS_WINDOW = 60;
const _frameTimes = new Array(FPS_WINDOW).fill(16.67);
let _frameIdx = 0;

function updateStats() {
    const now = performance.now();
    stats.frameTime = now - stats.lastTime;
    stats.lastTime = now;
    stats.frameCount++;

    // Feed the rolling window. Skip obvious outliers (tab backgrounding,
    // debugger pause) that would otherwise contaminate the average for
    // an entire second afterward.
    if (stats.frameTime > 0 && stats.frameTime < 500) {
        _frameTimes[_frameIdx] = stats.frameTime;
        _frameIdx = (_frameIdx + 1) % FPS_WINDOW;
    }

    // Recompute averaged FPS every 30 frames — same cadence as before.
    if (stats.frameCount % 30 === 0) {
        let sum = 0;
        for (let i = 0; i < FPS_WINDOW; i++) sum += _frameTimes[i];
        stats.fps = Math.round(1000 / (sum / FPS_WINDOW));
    }
}

/**
 * Handle window resize
 */
function handleResize() {
    if (engine) {
        engine.resize();
    }
}

/**
 * Get current FPS
 * @returns {number}
 */
export function getFPS() {
    return stats.fps;
}

/**
 * Get the detected device profile (tier + quality knobs). Used by the
 * Settings About panel and the "Auto" graphics preset.
 */
export function getDeviceProfile() {
    return deviceProfile;
}

/**
 * Get scene reference
 * @returns {BABYLON.Scene}
 */
export function getScene() {
    return scene;
}

/**
 * Get camera reference
 * @returns {BABYLON.Camera}
 */
export function getCamera() {
    return camera;
}

/**
 * Dispose all resources and clean up
 */
export function dispose() {
    window.removeEventListener('resize', handleResize);

    disposeGodRays();
    disposeAnamorphicStreak();
    disposePostProcessing();
    disposeEtherealPetals();
    disposeCosmicMotes();
    disposeStarGlows();
    disposeShootingStars();
    disposeBlackHole();
    disposeNebula();
    disposeStarField();
    disposeCosmicSkybox();

    if (scene) {
        scene.dispose();
        scene = null;
    }

    disposeEngine();

    camera = null;
    engine = null;
    canvas = null;
}

// Export for external access
export { camera, scene, stats };
