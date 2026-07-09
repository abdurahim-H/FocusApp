/*
 * New-shell boot. Mounts the rebuilt UI, then brings up the real Babylon scene
 * (reusing the existing scene-manager). Keeps the scene/state/feature layers;
 * only the UI layer is new. Served from index2.html during the rebuild.
 */
import * as scene3d from '../graphics/scene/scene-manager.js';
import * as cleanup from '../utils/cleanup.js';
import { mountShell } from './shell.js';

async function boot() {
    // Tracked intervals (the timer tick) register with the cleanup system.
    cleanup.initCleanupSystem?.();
    mountShell();

    const loading = document.getElementById('cf-loading');
    try {
        await scene3d.init3D();
    } catch (err) {
        // Boot-critical failure — surface it (console.error survives prod stripping).
        console.error('[shell] scene init failed', err);
    } finally {
        if (loading) {
            loading.classList.add('hide');
            setTimeout(() => loading.remove(), 400);
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
