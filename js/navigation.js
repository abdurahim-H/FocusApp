// Navigation Module
// Handles mode switching and navigation controls

import { state } from './state.js';
import { updateDateTime } from './timer.js';

export function switchMode(mode) {
    state.mode = mode;
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Update mode displays
    document.querySelectorAll('.mode').forEach(modeEl => {
        modeEl.classList.toggle('active', modeEl.id === mode);
    });

    // Update date/time for home mode
    if (mode === 'home') {
        updateDateTime();
    }
}

export function setupNavigation() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });
}
