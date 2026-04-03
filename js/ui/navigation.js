// Navigation Module
// Handles mode switching and navigation controls

import { state } from '../core/state.js';
import { updateDateTime } from '../features/timer.js';

export function switchMode(mode) {
    if (!mode) {
        console.error('switchMode called with undefined mode');
        return;
    }

    state.mode = mode;

    // Update nav buttons
    const navButtons = document.querySelectorAll('.nav-btn');

    navButtons.forEach(btn => {
        const isActive = btn.dataset.mode === mode;
        btn.classList.toggle('active', isActive);
    });

    // Update mode displays
    const modeElements = document.querySelectorAll('.mode');

    modeElements.forEach(modeEl => {
        const isActive = modeEl.id === mode;
        modeEl.classList.toggle('active', isActive);
    });

    // Update date/time for home mode
    if (mode === 'home') {
        updateDateTime();
    }
}

export function setupNavigation() {
    // Navigation with better event handling for nested elements
    const navButtons = document.querySelectorAll('.nav-btn');

    navButtons.forEach((btn, index) => {
        // Remove any existing listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        // Add click listener to the button itself
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            switchMode(this.dataset.mode);
        });

        // Also add listener to any child elements (like span.btn-text)
        const childElements = newBtn.querySelectorAll('*');
        childElements.forEach(child => {
            child.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                switchMode(newBtn.dataset.mode);
            });
        });
    });

    // Also add a document-level listener as backup
    document.addEventListener('click', function(e) {
        // Check if click was on a navigation element
        const navBtn = e.target.closest('.nav-btn');
        if (navBtn && navBtn.dataset.mode) {
            switchMode(navBtn.dataset.mode);
        }
    });
}
