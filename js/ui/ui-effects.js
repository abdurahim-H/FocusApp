// UI Visual Effects Module
// Manages CSS-based visual effects that complement the 3D animations

import { appState } from '../core/state.js';
import { trackSetInterval } from '../utils/cleanup.js';

// Productivity glow disabled — leftover from an older design that put a
// pulsing box-shadow on the .container when >70% of tasks were complete.
// The visual feedback was overwhelming (giant gold/indigo panel behind the
// nav buttons). Tasks already give per-item feedback via the checked checkmark
// + strikethrough, so this container-level effect is redundant.
export function updateProductivityGlow() {
    const container = document.querySelector('.container');
    if (container) container.classList.remove('productivity-glow');
}

// No-ops kept for API compatibility with timer.js imports
export function triggerTaskCompletionUI() {}
export function triggerFocusIntensity() {}
export function removeFocusIntensity() {}
export function triggerSessionCompleteUI() {}
export function enhanceAchievement() {}

// Initialize UI effects system
export function initUIEffects() {
    trackSetInterval(updateProductivityGlow, 1000);
}

// Clean up all active effects
export function cleanupUIEffects() {
    const container = document.querySelector('.container');
    if (container) {
        container.classList.remove('productivity-glow');
    }
}
