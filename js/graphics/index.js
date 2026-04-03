export { init3D, dispose, getFPS, getScene, getCamera } from './scene/scene-manager.js';

export {
    createStarField,
    updateStarField,
    disposeStarField,
    getStarField
} from './environment/starfield.js';

export {
    setupPostProcessing,
    setBloomIntensity,
    setExposure,
    setDepthOfFieldEnabled,
    setFocusDistance,
    getPipeline,
    disposePostProcessing
} from './postprocessing/pipeline.js';
