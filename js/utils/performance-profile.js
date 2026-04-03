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

    console.log(`📊 Device profile: ${profile.tier} (GPU: ${gpuTier}, mobile: ${isMobile}, cores: ${cores}, DPR: ${pixelRatio})`);
    return profile;
}

/**
 * FPS watchdog — monitors performance and triggers quality reduction
 * @param {object} stats - Performance stats object with fps property
 * @param {function} onDegrade - Callback when quality should be reduced
 */
export function createFPSWatchdog(stats, onDegrade) {
    let lowFPSFrames = 0;
    const threshold = 24;
    const warmupFrames = 180; // 3 seconds at 60fps
    let totalFrames = 0;
    let degraded = false;

    return function check() {
        totalFrames++;
        if (totalFrames < warmupFrames || degraded) return;

        if (stats.fps > 0 && stats.fps < threshold) {
            lowFPSFrames++;
        } else {
            lowFPSFrames = Math.max(0, lowFPSFrames - 1);
        }

        // Sustained low FPS for ~2 seconds
        if (lowFPSFrames > 60) {
            degraded = true;
            console.warn(`⚠️ Sustained low FPS (${stats.fps}), reducing quality`);
            onDegrade();
        }
    };
}
