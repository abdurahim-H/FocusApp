// UI Visual Effects Module
// Manages CSS-based visual effects that complement the 3D animations.
//
// The productivity glow (pulsing box-shadow on .container at >70% completion)
// was removed — it was a leftover from an older design and gave overwhelming
// visual feedback. Per-task feedback (checkmark + strikethrough) is sufficient.

// No-ops kept for API compatibility with timer.js imports
export function triggerTaskCompletionUI() {}
export function triggerFocusIntensity() {}
export function removeFocusIntensity() {}
export function triggerSessionCompleteUI() {}
export function enhanceAchievement() {}
export function updateProductivityGlow() {}

// Initialize UI effects system — currently nothing to initialize.
// Reserved for future per-frame visual effects (Phase 4+).
export function initUIEffects() {}

// Clean up all active effects
export function cleanupUIEffects() {}
