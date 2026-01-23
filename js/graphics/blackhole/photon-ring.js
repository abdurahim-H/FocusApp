// photon-ring.js - Razor-Thin Bright Ring at Photon Sphere
// THE signature visual of a black hole - where light orbits

import { PHOTON_SPHERE_RADIUS } from './constants.js';

let photonRing = null;
let einsteinRing = null;

/**
 * Create the photon ring - razor-thin bright ring at the photon sphere
 * This is the most recognizable visual element of a black hole
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 * @param {BABYLON.TransformNode} parent - Parent transform node
 * @returns {BABYLON.Mesh} The photon ring mesh
 */
export function createPhotonRing(scene, parent) {
    // Create a thin torus for the photon ring
    photonRing = BABYLON.MeshBuilder.CreateTorus('photonRing', {
        diameter: PHOTON_SPHERE_RADIUS * 2,
        thickness: 0.15, // Razor thin
        tessellation: 128
    }, scene);

    // Extremely bright emissive material
    const ringMaterial = new BABYLON.StandardMaterial('photonRingMat', scene);
    ringMaterial.emissiveColor = new BABYLON.Color3(2.5, 2.2, 1.8); // HDR bright white-gold
    ringMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    ringMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    ringMaterial.disableLighting = true;
    ringMaterial.alpha = 0.95;

    photonRing.material = ringMaterial;
    photonRing.parent = parent;
    photonRing.renderingGroupId = 2;

    // Create secondary Einstein ring (light from behind bent around)
    einsteinRing = BABYLON.MeshBuilder.CreateTorus('einsteinRing', {
        diameter: PHOTON_SPHERE_RADIUS * 2.2,
        thickness: 0.08,
        tessellation: 128
    }, scene);

    const einsteinMaterial = new BABYLON.StandardMaterial('einsteinMat', scene);
    einsteinMaterial.emissiveColor = new BABYLON.Color3(1.5, 1.4, 1.2);
    einsteinMaterial.disableLighting = true;
    einsteinMaterial.alpha = 0.6;
    einsteinRing.material = einsteinMaterial;
    einsteinRing.parent = parent;
    einsteinRing.renderingGroupId = 2;

    console.log('   ✓ Photon ring created');
    return photonRing;
}

/**
 * Update photon ring with subtle pulsation
 * @param {number} elapsed - Elapsed time in seconds
 */
export function updatePhotonRing(elapsed) {
    if (photonRing && photonRing.material) {
        const pulse = 1.0 + Math.sin(elapsed * 2.0) * 0.1;
        photonRing.material.emissiveColor = new BABYLON.Color3(
            2.5 * pulse,
            2.2 * pulse,
            1.8 * pulse
        );
    }
}

/**
 * Get the photon ring mesh
 * @returns {BABYLON.Mesh|null}
 */
export function getPhotonRing() {
    return photonRing;
}

/**
 * Dispose photon ring resources
 */
export function disposePhotonRing() {
    if (einsteinRing) {
        einsteinRing.dispose();
        einsteinRing = null;
    }
    if (photonRing) {
        photonRing.dispose();
        photonRing = null;
    }
}
