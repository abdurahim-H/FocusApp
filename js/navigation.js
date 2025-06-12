// Navigation Module
// Handles mode switching and navigation controls

import { state } from './state.js';
import { updateDateTime } from './timer.js';

export function switchMode(mode) {
    console.log('switchMode called with:', mode);
    
    if (!mode) {
        console.error('switchMode called with undefined mode');
        return;
    }
    
    state.mode = mode;
    console.log('State updated to:', state.mode);
    
    // Update nav buttons
    const navButtons = document.querySelectorAll('.nav-btn');
    console.log('Updating', navButtons.length, 'navigation buttons');
    
    navButtons.forEach(btn => {
        const isActive = btn.dataset.mode === mode;
        btn.classList.toggle('active', isActive);
        console.log(`Button ${btn.dataset.mode} active:`, isActive);
    });
    
    // Update mode displays
    const modeElements = document.querySelectorAll('.mode');
    console.log('Updating', modeElements.length, 'mode displays');
    
    modeElements.forEach(modeEl => {
        const isActive = modeEl.id === mode;
        modeEl.classList.toggle('active', isActive);
        console.log(`Mode ${modeEl.id} active:`, isActive);
    });

    // Update date/time for home mode
    if (mode === 'home') {
        console.log('Updating date/time for home mode');
        updateDateTime();
    }
    
    console.log('switchMode completed for:', mode);
}

export function setupNavigation() {
    console.log('Setting up navigation...');
    
    // Navigation with better event handling for nested elements
    const navButtons = document.querySelectorAll('.nav-btn');
    console.log('Found navigation buttons:', navButtons.length);
    
    navButtons.forEach((btn, index) => {
        console.log(`Setting up button ${index}:`, btn.dataset.mode);
        
        // Remove any existing listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        // Add click listener to the button itself
        newBtn.addEventListener('click', function(e) {
            console.log('Navigation button clicked:', this.dataset.mode);
            e.preventDefault();
            e.stopPropagation();
            switchMode(this.dataset.mode);
        });
        
        // Also add listener to any child elements (like span.btn-text)
        const childElements = newBtn.querySelectorAll('*');
        childElements.forEach(child => {
            child.addEventListener('click', function(e) {
                console.log('Child element clicked, delegating to parent button');
                e.preventDefault();
                e.stopPropagation();
                switchMode(newBtn.dataset.mode);
            });
        });
        
        console.log('Event listeners added to:', newBtn.dataset.mode);
    });
    
    // Also add a document-level listener as backup
    document.addEventListener('click', function(e) {
        // Check if click was on a navigation element
        const navBtn = e.target.closest('.nav-btn');
        if (navBtn && navBtn.dataset.mode) {
            console.log('Document-level nav click detected:', navBtn.dataset.mode);
            switchMode(navBtn.dataset.mode);
        }
    });
    
    console.log('Navigation setup complete with enhanced event handling');
}
