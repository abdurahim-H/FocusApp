// UI Visual Effects Module
// Manages CSS-based visual effects that complement the 3D animations

import { appState } from '../core/state.js';
import { trackSetInterval } from '../utils/cleanup.js';

// Apply productivity glow based on completion rate
export function updateProductivityGlow() {
    const completedTasks = appState.tasks.filter(task => task.completed).length;
    const totalTasks = appState.tasks.length;
    const productivity = totalTasks > 0 ? completedTasks / totalTasks : 0;

    const container = document.querySelector('.container');
    if (!container) return;

    if (productivity > 0.7) {
        container.classList.add('productivity-glow');
    } else {
        container.classList.remove('productivity-glow');
    }
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
