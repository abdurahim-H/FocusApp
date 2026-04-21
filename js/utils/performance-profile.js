// performance-profile.js - Device capability detection and adaptive quality
// Detects device tier and provides quality settings for graphics modules

/**
 * Detect device capability and return a quality profile
 * @returns {{tier: string, starMultiplier: number, shaderOctaves: number, enableDOF: boolean, bloomKernel: number, glowSize: number}}
 */
export function detectDeviceProfile() {
    const profile = {
        tier: 'high',
        starMultiplier: 1.0,
        shaderOctaves: 5,
        enableDOF: true,
        bloomKernel: 64,
        glowSize: 512
    };

    const isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
    const isSmallScreen = window.innerWidth < 480;
    const pixelRatio = window.devicePixelRatio || 1;
    const cores = navigator.hardwareConcurrency || 4;

    // GPU heuristic via WebGL renderer string
    let gpuTier = 'unknown';
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
                const rendererLower = renderer.toLowerCase();

                // Low-end mobile GPUs
                if (/mali-4|mali-t[67]|adreno\s?[2-3]|powervr\s?sgx|intel\s?hd\s?[234]/i.test(rendererLower)) {
                    gpuTier = 'low';
                }
                // Mid-range
                else if (/mali-g[5-7]|adreno\s?[4-5]|intel\s?(iris|uhd)|apple\s?gpu/i.test(rendererLower)) {
                    gpuTier = 'medium';
                }
                // High-end
                else {
                    gpuTier = 'high';
                }
            }
        }
        canvas.remove();
    } catch (e) {
        // WebGL detection failed, assume medium
        gpuTier = 'medium';
    }

    // Determine final profile
    if (isMobile && (gpuTier === 'low' || isSmallScreen || cores <= 2)) {
        profile.tier = 'low';
        profile.starMultiplier = 0.3;
        profile.shaderOctaves = 3;
        profile.enableDOF = false;
        profile.bloomKernel = 32;
        profile.glowSize = 256;
    } else if (isMobile || gpuTier === 'medium') {
        profile.tier = 'medium';
        profile.starMultiplier = 0.5;
        profile.shaderOctaves = 4;
        profile.enableDOF = false;
        profile.bloomKernel = 48;
        profile.glowSize = 256;
    }
    // else: high defaults apply

    return profile;
}

// ═══════════════════════════════════════════════════════════════════════════
// FPS watchdog — graceful, multi-level quality degradation
// ═══════════════════════════════════════════════════════════════════════════
//
// Replaces the old binary "degraded: true/false" flag that toggled hardware
// scaling to 1.5×. The new model:
//
//   • currentLevel starts at 0 (full quality). On sustained low-FPS it bumps
//     +1; on sustained good-FPS it bumps -1. onLevelChange(from, to) fires
//     each transition and the caller decides what each level means
//     (disable film grain, then streak, then god rays, …; hardware scaling
//     is last resort).
//
//   • Recovery bar is now GOOD_FPS=32 (was 45) so mid-range devices stuck
//     in the 35–40 fps range in degraded mode can actually bubble back up.
//
//   • Every PROBE_INTERVAL frames, if we're above level 0, we force the
//     level back to 0 for PROBE_DURATION. If FPS holds ≥ LOW_FPS during
//     the probe, we stay recovered. Otherwise we snap back to the previous
//     level. Safety valve for "my device is actually too slow to ever
//     trigger the normal recovery" cases.
//
//   • stats.fps is assumed to be a rolling window average (see updateStats
//     in scene-manager.js); the thresholds below are tuned for averages,
//     not raw single-frame FPS.
//
// @param {object}   stats           { fps: number }
// @param {function} onLevelChange   (prevLevel, nextLevel) => void
// @param {number}   maxLevel        inclusive cap on currentLevel (default 5)

export function createFPSWatchdog(stats, onLevelChange, maxLevel = 5) {
    const LOW_FPS          = 22;    // averaged fps below this counts as "bad"
    const GOOD_FPS         = 32;    // averaged fps above this counts as "good"
    const WARMUP_FRAMES    = 600;   // 10s: GPU / JIT / texture upload settle
    const DEGRADE_TRIGGER  = 1800;  // ~30s sustained bad before stepping down
    const RECOVER_TRIGGER  = 600;   // ~10s sustained good before stepping up
    const PROBE_INTERVAL   = 60 * 60 * 5;   // 5 min @ 60fps = 18000 frames
    const PROBE_DURATION   = 60 * 20;       // 20s @ 60fps = 1200 frames
    const PROBE_REQUIRE_FPS = LOW_FPS;      // probe passes if fps stays above this

    let lowFPSFrames = 0;
    let goodFPSFrames = 0;
    let totalFrames = 0;
    let framesSinceLastProbe = 0;
    let probing = false;
    let probeFrames = 0;
    let probeSavedLevel = 0;
    let currentLevel = 0;

    function setLevel(target) {
        const clamped = Math.max(0, Math.min(maxLevel, target | 0));
        if (clamped === currentLevel) return;
        const prev = currentLevel;
        currentLevel = clamped;
        try { onLevelChange(prev, clamped); }
        catch (e) { console.error('[watchdog] onLevelChange threw', e); }
    }

    function check() {
        totalFrames++;
        if (totalFrames < WARMUP_FRAMES) return;
        if (stats.fps <= 0) return;

        // ── Safety-valve probe ────────────────────────────────────────────
        framesSinceLastProbe++;
        if (!probing && currentLevel > 0 && framesSinceLastProbe >= PROBE_INTERVAL) {
            probing = true;
            probeFrames = 0;
            probeSavedLevel = currentLevel;
            framesSinceLastProbe = 0;
            console.info('[watchdog] 🔍 Periodic quality probe: restoring full quality for 20s');
            setLevel(0);
            return;
        }
        if (probing) {
            probeFrames++;
            if (stats.fps < PROBE_REQUIRE_FPS) {
                // Probe failed — device can't actually hold full quality. Snap back.
                console.info(`[watchdog] 🔍 Probe failed (fps ${stats.fps}), reverting to level ${probeSavedLevel}`);
                probing = false;
                lowFPSFrames = 0;
                goodFPSFrames = 0;
                setLevel(probeSavedLevel);
                return;
            }
            if (probeFrames >= PROBE_DURATION) {
                // Probe succeeded — full quality is sustainable again.
                console.info(`[watchdog] ✅ Probe succeeded (fps ${stats.fps}), staying at full quality`);
                probing = false;
                lowFPSFrames = 0;
                goodFPSFrames = 0;
                // currentLevel is already 0 from the probe; keep it there.
            }
            return;
        }

        // ── Normal hysteresis ─────────────────────────────────────────────
        if (stats.fps < LOW_FPS) {
            lowFPSFrames++;
            goodFPSFrames = 0;
        } else if (stats.fps >= GOOD_FPS) {
            goodFPSFrames++;
            lowFPSFrames = Math.max(0, lowFPSFrames - 2);
        } else {
            lowFPSFrames = Math.max(0, lowFPSFrames - 1);
            goodFPSFrames = Math.max(0, goodFPSFrames - 1);
        }

        if (lowFPSFrames > DEGRADE_TRIGGER && currentLevel < maxLevel) {
            lowFPSFrames = 0;
            goodFPSFrames = 0;
            console.warn(`[watchdog] ⚠️ Sustained low FPS (${stats.fps}), degrading ${currentLevel} → ${currentLevel + 1}`);
            setLevel(currentLevel + 1);
        } else if (goodFPSFrames > RECOVER_TRIGGER && currentLevel > 0) {
            lowFPSFrames = 0;
            goodFPSFrames = 0;
            console.info(`[watchdog] ✅ FPS recovered (${stats.fps}), restoring ${currentLevel} → ${currentLevel - 1}`);
            setLevel(currentLevel - 1);
        }
    }

    // Convenience accessor if the caller wants to inspect state.
    check.getLevel = () => currentLevel;
    return check;
}
