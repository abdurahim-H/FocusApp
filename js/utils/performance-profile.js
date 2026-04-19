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

/**
 * FPS watchdog — monitors performance and toggles quality reduction in both
 * directions so a transient dip (GC pause, tab-switch hitch, OS spike) can't
 * latch the scene into permanent low-res mode.
 * @param {object} stats - Performance stats object with fps property
 * @param {function} onDegrade - Called when quality should be reduced
 * @param {function} [onRecover] - Called when FPS has recovered; quality should be restored
 */
export function createFPSWatchdog(stats, onDegrade, onRecover) {
    // Thresholds tuned so the watchdog can't fire on transient hitches and
    // can actually recover on mid-range GPUs.
    // stats.fps is a rolling 60-frame average (see updateStats in
    // scene-manager.js) so we're comparing sustained performance here.
    const LOW_FPS = 22;            // averaged fps below this is "bad"
    const GOOD_FPS = 45;           // averaged fps above this is "recovered"
    const WARMUP_FRAMES = 600;     // 10s at 60fps — scene, textures, JIT settle
    const DEGRADE_TRIGGER = 1800;  // ~30s sustained bad before we downgrade
    const RECOVER_TRIGGER = 600;   // ~10s sustained good — recover quickly

    let lowFPSFrames = 0;
    let goodFPSFrames = 0;
    let totalFrames = 0;
    let degraded = false;

    return function check() {
        totalFrames++;
        if (totalFrames < WARMUP_FRAMES) return;
        if (stats.fps <= 0) return;

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

        if (!degraded && lowFPSFrames > DEGRADE_TRIGGER) {
            degraded = true;
            lowFPSFrames = 0;
            goodFPSFrames = 0;
            console.warn(`⚠️ Sustained low FPS (${stats.fps}), reducing quality`);
            onDegrade();
        } else if (degraded && goodFPSFrames > RECOVER_TRIGGER) {
            degraded = false;
            lowFPSFrames = 0;
            goodFPSFrames = 0;
            console.info(`✅ FPS recovered (${stats.fps}), restoring quality`);
            if (typeof onRecover === 'function') onRecover();
        }
    };
}
