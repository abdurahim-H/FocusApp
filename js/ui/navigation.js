// Navigation Module
// Handles mode switching and navigation controls.
//
// Phase 2 note: Motion One spring on .mode was tried and reverted — Motion's
// inline transform style conflicts with the CSS layout of .mode panels
// (#home uses translateX(-50%) for centering, #focus/#ambient use margin auto).
// The Phase 1 CSS visibility+transform approach in style.css is sufficient.

import { state } from '../core/state.js';
import { updateDateTime } from '../features/timer.js';

export function switchMode(mode) {
    if (!mode) {
        console.error('switchMode called with undefined mode');
        return;
    }

    state.mode = mode;

    // Update nav buttons (CSS handles the sliding pill via :has())
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        const isActive = btn.dataset.mode === mode;
        btn.classList.toggle('active', isActive);
    });

    // Update mode panels — CSS in style.css handles the visibility transition
    const modeElements = document.querySelectorAll('.mode');
    modeElements.forEach(modeEl => {
        const isActive = modeEl.id === mode;
        modeEl.classList.toggle('active', isActive);
    });

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
