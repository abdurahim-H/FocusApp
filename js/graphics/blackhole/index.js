// index.js - Black Hole System
// Orchestrates all black hole components into a unified system

import { SCHWARZSCHILD_RADIUS, PHOTON_SPHERE_RADIUS, ISCO_RADIUS, DISK_OUTER_RADIUS } from './constants.js';
import { createEventHorizon, disposeEventHorizon } from './event-horizon.js';
import { createPhotonRing, updatePhotonRing, disposePhotonRing } from './photon-ring.js';
import { createAccretionDisk, updateAccretionDisk, disposeAccretionDisk, getDiskMaterial } from './accretion-disk.js';
import { createGravitationalLensing, updateGravitationalLensing, getLensingPostProcess, disposeGravitationalLensing } from './gravitational-lensing.js';

// Scene references
let blackHoleGroup = null;
let scene = null;
let camera = null;

/**
 * Create the complete black hole system with all components
 * @param {BABYLON.Scene} sceneRef - The Babylon.js scene
 * @param {BABYLON.Camera} cameraRef - The main camera
 * @returns {BABYLON.TransformNode} The black hole group
 */
export function createBlackHole(sceneRef, cameraRef) {
    console.log('🕳️ Creating cinematic black hole system...');
    scene = sceneRef;
    camera = cameraRef;

    // Create parent group for all black hole components
    blackHoleGroup = new BABYLON.TransformNode('blackHoleGroup', scene);

    // Tilt for dramatic viewing angle (like Interstellar's Gargantua)
    blackHoleGroup.rotation.x = BABYLON.Tools.ToRadians(75); // Edge-on view
    blackHoleGroup.rotation.z = BABYLON.Tools.ToRadians(5);

    // Create components in order
    createEventHorizon(scene, blackHoleGroup);
    createPhotonRing(scene, blackHoleGroup);
    createAccretionDisk(scene, camera, blackHoleGroup);
    createGravitationalLensing(scene, camera, blackHoleGroup);

    console.log('✅ Cinematic black hole system created');
    return blackHoleGroup;
}

/**
 * Update the black hole system each frame
 * @param {number} elapsed - Elapsed time in seconds
 * @param {number} delta - Delta time since last frame
 */
export function updateBlackHole(elapsed, delta) {
    updateAccretionDisk(elapsed, camera);
    updatePhotonRing(elapsed);
    updateGravitationalLensing(elapsed);
}

/**
 * Get the black hole group reference
 * @returns {BABYLON.TransformNode|null}
 */
export function getBlackHoleGroup() {
    return blackHoleGroup;
}

/**
 * Dispose all black hole resources
 */
export function disposeBlackHole() {
    disposeGravitationalLensing();
    disposeAccretionDisk();
    disposePhotonRing();
    disposeEventHorizon();

    if (blackHoleGroup) {
        blackHoleGroup.dispose();
        blackHoleGroup = null;
    }
    scene = null;
    camera = null;
}

// Re-export for convenience
export {
    SCHWARZSCHILD_RADIUS,
    PHOTON_SPHERE_RADIUS,
    ISCO_RADIUS,
    DISK_OUTER_RADIUS,
    getLensingPostProcess,
    getDiskMaterial
};
