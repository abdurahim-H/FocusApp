// event-horizon.js - Pure Black Event Horizon Sphere
// The void that absorbs everything - no light escapes

import { SCHWARZSCHILD_RADIUS } from './constants.js';

let eventHorizon = null;

/**
 * Create the event horizon - pure black sphere at Schwarzschild radius
 * @param {BABYLON.Scene} scene - The Babylon.js scene
 * @param {BABYLON.TransformNode} parent - Parent transform node
 * @returns {BABYLON.Mesh} The event horizon mesh
 */
export function createEventHorizon(scene, parent) {
    eventHorizon = BABYLON.MeshBuilder.CreateSphere('eventHorizon', {
        diameter: SCHWARZSCHILD_RADIUS * 2,
        segments: 64
    }, scene);

    // Pure black material - the void that absorbs everything
    const material = new BABYLON.StandardMaterial('horizonMat', scene);
    material.emissiveColor = new BABYLON.Color3(0, 0, 0);
    material.diffuseColor = new BABYLON.Color3(0, 0, 0);
    material.specularColor = new BABYLON.Color3(0, 0, 0);
    material.ambientColor = new BABYLON.Color3(0, 0, 0);
    material.disableLighting = true;
    material.backFaceCulling = false;

    eventHorizon.material = material;
    eventHorizon.parent = parent;
    eventHorizon.renderingGroupId = 1; // Render after background

    console.log('   ✓ Event horizon created');
    return eventHorizon;
}

/**
 * Get the event horizon mesh
 * @returns {BABYLON.Mesh|null}
 */
export function getEventHorizon() {
    return eventHorizon;
}

/**
 * Dispose event horizon resources
 */
export function disposeEventHorizon() {
    if (eventHorizon) {
        eventHorizon.dispose();
        eventHorizon = null;
    }
}
