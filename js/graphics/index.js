// index.js - Graphics System
// Central export for all graphics modules

// Scene management
export { init3D, dispose, getFPS, getScene, getCamera } from './scene/scene-manager.js';

// Black hole system
export {
    createBlackHole,
    updateBlackHole,
    disposeBlackHole,
    getBlackHoleGroup,
    getLensingPostProcess,
    SCHWARZSCHILD_RADIUS,
    PHOTON_SPHERE_RADIUS,
    ISCO_RADIUS,
    DISK_OUTER_RADIUS
} from './blackhole/index.js';

// Camera system
export {
    initCinematicCamera,
    updateCinematicCamera,
    triggerDramaticZoom,
    getCameraState
} from './camera/cinematic-camera.js';

// Starfield / Environment
export {
    createStarField,
    updateStarField,
    disposeStarField,
    getStarField
} from './environment/starfield.js';

// Post-processing
export {
    setupPostProcessing,
    setBloomIntensity,
    setExposure,
    setDepthOfFieldEnabled,
    setFocusDistance,
    getPipeline,
    disposePostProcessing
} from './postprocessing/pipeline.js';
