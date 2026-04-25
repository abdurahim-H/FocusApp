// Navigation Module
// Handles mode switching and navigation controls.
//
// Phase 2 note: Motion One spring on .mode was tried and reverted — Motion's
// inline transform style conflicts with the CSS layout of .mode panels
// (#home uses translateX(-50%) for centering, #focus/#ambient use margin auto).
// The Phase 1 CSS visibility+transform approach in style.css is sufficient.
// Phase 4: brief squash/stretch on the nav pill when changing tabs.

import { isReducedMotion } from '../core/motion.js';
import { state } from '../core/state.js';
import { updateDateTime } from '../features/timer.js';

export function switchMode(mode) {
    if (!mode) {
        console.error('switchMode called with undefined mode');
        return;
    }

    const previousMode = state.mode;
    state.mode = mode;

    // Update nav buttons (CSS handles the sliding pill via :has())
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach((btn) => {
        const isActive = btn.dataset.mode === mode;
        btn.classList.toggle('active', isActive);
    });

    // Phase 4: squash the nav pill briefly while it slides to the new tab
    if (previousMode !== mode) {
        triggerNavPillSquash();
    }

    // Update mode panels — CSS in style.css handles the visibility transition
    const modeElements = document.querySelectorAll('.mode');
    modeElements.forEach((modeEl) => {
        const isActive = modeEl.id === mode;
        modeEl.classList.toggle('active', isActive);
    });

    if (mode === 'home') {
        updateDateTime();
    }

    // Phase 6: Move focus to the primary element of the new mode panel
    // so keyboard / screen-reader users land somewhere meaningful.
    if (previousMode !== mode) {
        setTimeout(() => {
            const targets = {
                home: '#home h1',
                focus: '#timerDisplay',
            };
            const el = document.querySelector(targets[mode]);
            if (el) {
                // Make non-interactive elements temporarily focusable
                if (!el.getAttribute('tabindex')) el.setAttribute('tabindex', '-1');
                el.focus({ preventScroll: true });
            }
        }, 120);
    }
}

// Briefly squash the .nav-buttons container's CSS variable so the ::before
// pill (which uses var(--pill-scale)) compresses then springs back. This is
// the closest equivalent to Apple's tab pill squish without rebuilding the
// pseudo-element layout.
function triggerNavPillSquash() {
    if (isReducedMotion()) return;
    const nav = document.querySelector('.nav-buttons');
    if (!nav) return;
    nav.style.setProperty('--pill-scale-x', '0.88');
    nav.style.setProperty('--pill-scale-y', '1.06');
    // Snap back after the slide animation has had a moment to begin
    setTimeout(() => {
        nav.style.setProperty('--pill-scale-x', '1');
        nav.style.setProperty('--pill-scale-y', '1');
    }, 180);
}

export function setupNavigation() {
    // Navigation with better event handling for nested elements
    const navButtons = document.querySelectorAll('.nav-btn');

    navButtons.forEach((btn, index) => {
        // Remove any existing listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        // Add click listener to the button itself
        newBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            switchMode(this.dataset.mode);
        });

        // Also add listener to any child elements (like span.btn-text)
        const childElements = newBtn.querySelectorAll('*');
        childElements.forEach((child) => {
            child.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                switchMode(newBtn.dataset.mode);
            });
        });
    });

    // Also add a document-level listener as backup
    document.addEventListener('click', (e) => {
        // Check if click was on a navigation element
        const navBtn = e.target.closest('.nav-btn');
        if (navBtn && navBtn.dataset.mode) {
            switchMode(navBtn.dataset.mode);
        }
    });
}
