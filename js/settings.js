// Settings Module
// Handles settings modal, theme switching, and localStorage management

import { state } from './state.js';
import { updateTimerDisplay } from './timer.js';

export function setupSettingsControls() {
    const elements = {
        saveBtn: document.getElementById('saveSettingsBtn'),
        resetBtn: document.getElementById('resetSettingsBtn'),
        savedMsg: document.getElementById('settingsSavedMsg'),
        focusRange: document.getElementById('focusLengthRange'),
        focusValue: document.getElementById('focusLengthValue'),
        soundRange: document.getElementById('soundVolumeRange'),
        soundValue: document.getElementById('soundVolumeValue'),
        cosmicEnergyRange: document.getElementById('cosmicEnergyRange'),
        cosmicEnergyValue: document.getElementById('cosmicEnergyValue'),
        greetingInput: document.getElementById('greetingInput'),
        previewBtn: document.getElementById('previewCosmosBtn'),
        themeBtns: {
            light: document.getElementById('themeLightBtn'),
            dark: document.getElementById('themeDarkBtn'),
            cosmos: document.getElementById('themeCosmosBtn'),
            auto: document.getElementById('themeAutoBtn')
        }
    };

    console.log('Setting up controls, elements found:', {
        saveBtn: !!elements.saveBtn,
        resetBtn: !!elements.resetBtn,
        focusRange: !!elements.focusRange,
        cosmicEnergyRange: !!elements.cosmicEnergyRange
    });

    // Initialize cosmic effects
    initCosmicEffects();

    // Focus length range
    if (elements.focusRange && elements.focusValue) {
        elements.focusRange.addEventListener('input', () => {
            elements.focusValue.textContent = elements.focusRange.value;
            updateStellarTrack(elements.focusRange);
        });
    }

    // Sound volume range
    if (elements.soundRange && elements.soundValue) {
        elements.soundRange.addEventListener('input', () => {
            elements.soundValue.textContent = elements.soundRange.value;
            updateStellarTrack(elements.soundRange);
            if (state.sounds.audio) {
                state.sounds.audio.volume = elements.soundRange.value / 100;
            }
        });
    }

    // Cosmic energy range
    if (elements.cosmicEnergyRange && elements.cosmicEnergyValue) {
        elements.cosmicEnergyRange.addEventListener('input', () => {
            elements.cosmicEnergyValue.textContent = elements.cosmicEnergyRange.value;
            updateStellarTrack(elements.cosmicEnergyRange);
        });
    }

    // Greeting input
    if (elements.greetingInput) {
        elements.greetingInput.addEventListener('input', () => {
            const greetingText = elements.greetingInput.value || 'Welcome to Your Universe!';
            document.getElementById('greeting').textContent = greetingText;
        });
    }

    // Preview cosmos button
    if (elements.previewBtn) {
        elements.previewBtn.addEventListener('click', () => {
            triggerCosmicPreview();
        });
    }

    // Theme buttons
    Object.entries(elements.themeBtns).forEach(([theme, btn]) => {
        if (btn) {
            btn.addEventListener('click', () => setTheme(theme));
        }
    });

    // Save button
    if (elements.saveBtn) {
        console.log('Attaching save button event listener');
        
        elements.saveBtn.addEventListener('click', function() {
            console.log('SAVE BUTTON CLICKED! Processing settings...');
            
            try {
                // Get values
                const focusDuration = parseInt(elements.focusRange.value);
                const soundVolume = parseInt(elements.soundRange.value);
                const cosmicEnergy = parseInt(elements.cosmicEnergyRange.value) || 75;
                const greeting = elements.greetingInput.value;
                const theme = document.body.getAttribute('data-theme') || 'auto';
                
                console.log('Saving settings:', { focusDuration, soundVolume, cosmicEnergy, greeting, theme });
                
                // Add cosmic saving animation
                elements.saveBtn.classList.add('cosmic-saving');
                
                // Save to localStorage
                localStorage.setItem('fu_theme', theme);
                localStorage.setItem('fu_focusLength', focusDuration);
                localStorage.setItem('fu_soundVolume', soundVolume);
                localStorage.setItem('fu_cosmicEnergy', cosmicEnergy);
                localStorage.setItem('fu_greeting', greeting);
                
                // Apply settings immediately
                if (focusDuration && focusDuration > 0) {
                    state.timer.settings.focusDuration = focusDuration;
                    
                    // If timer is not running and not in break, update display
                    if (!state.timer.isRunning && !state.timer.isBreak) {
                        state.timer.minutes = focusDuration;
                        state.timer.seconds = 0;
                        updateTimerDisplay();
                        console.log('Timer display updated to:', focusDuration);
                        
                        // Reset start button
                        const startBtn = document.getElementById('startBtn');
                        if (startBtn) {
                            startBtn.textContent = 'Start Focus';
                            startBtn.classList.remove('hidden');
                        }
                        const pauseBtn = document.getElementById('pauseBtn');
                        if (pauseBtn) {
                            pauseBtn.classList.add('hidden');
                        }
                    }
                }
                
                // Update sound volume
                if (state.sounds.audio) {
                    state.sounds.audio.volume = soundVolume / 100;
                }
                
                // Update greeting
                document.getElementById('greeting').textContent = greeting || 'Welcome to Your Universe!';
                
                // Show cosmic success message
                showCosmicSuccessMessage();
                
                // Remove cosmic saving animation
                setTimeout(() => {
                    elements.saveBtn.classList.remove('cosmic-saving');
                }, 2000);
                
                console.log('Settings saved successfully!');
                
            } catch (error) {
                console.error('Error saving settings:', error);
            }
        });
    } else {
        console.error('Save button not found!');
    }

    // Reset button
    if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', () => {
            setTheme('auto');
            elements.focusRange.value = 25;
            elements.focusValue.textContent = '25';
            elements.soundRange.value = 30;
            elements.soundValue.textContent = '30';
            if (elements.cosmicEnergyRange && elements.cosmicEnergyValue) {
                elements.cosmicEnergyRange.value = 75;
                elements.cosmicEnergyValue.textContent = '75';
                updateStellarTrack(elements.cosmicEnergyRange);
            }
            elements.greetingInput.value = '';
            document.getElementById('greeting').textContent = 'Welcome to Your Universe!';
            
            // Update stellar tracks
            updateStellarTrack(elements.focusRange);
            updateStellarTrack(elements.soundRange);
            
            // Clear localStorage
            localStorage.removeItem('fu_theme');
            localStorage.removeItem('fu_focusLength');
            localStorage.removeItem('fu_soundVolume');
            localStorage.removeItem('fu_cosmicEnergy');
            localStorage.removeItem('fu_greeting');
            
            // Reset timer settings
            state.timer.settings.focusDuration = 25;
            if (!state.timer.isRunning && !state.timer.isBreak) {
                state.timer.minutes = 25;
                state.timer.seconds = 0;
                updateTimerDisplay();
            }
            
            // Show reset confirmation
            showCosmicSuccessMessage();
        });
    }
}

// Theme function
export function setTheme(theme) {
    console.log('Setting theme to:', theme);
    
    // Set theme on both body and document element for maximum compatibility
    document.body.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    // Force immediate CSS recalculation
    document.body.style.display = 'none';
    document.body.offsetHeight; // Force reflow
    document.body.style.display = '';
    
    console.log('Theme attributes set:', {
        body: document.body.getAttribute('data-theme'),
        documentElement: document.documentElement.getAttribute('data-theme')
    });
    
    // Update theme buttons
    document.querySelectorAll('.theme-buttons [data-theme]').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn');
    });
    
    const activeBtn = document.querySelector(`.theme-buttons [data-theme="${theme}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('btn');
        activeBtn.classList.add('btn-primary');
        console.log('Set active theme button for theme:', theme);
    } else {
        console.warn('Theme button not found for theme:', theme);
    }
    
    // Save theme immediately when changed
    localStorage.setItem('fu_theme', theme);
    console.log('Theme saved to localStorage:', theme);
    
    // Log computed styles for debugging
    setTimeout(() => {
        const computedStyle = getComputedStyle(document.body);
        console.log('Computed styles after theme change:', {
            backgroundColor: computedStyle.backgroundColor,
            color: computedStyle.color,
            bgDark: computedStyle.getPropertyValue('--bg-dark'),
            textPrimary: computedStyle.getPropertyValue('--text-primary')
        });
    }, 100);
}

// Load settings
export function loadSettings() {
    const theme = localStorage.getItem('fu_theme') || 'auto';
    const focusLength = localStorage.getItem('fu_focusLength') || '25';
    const soundVolume = localStorage.getItem('fu_soundVolume') || '30';
    const cosmicEnergy = localStorage.getItem('fu_cosmicEnergy') || '75';
    const greeting = localStorage.getItem('fu_greeting') || '';
    
    console.log('Loading settings:', { theme, focusLength, soundVolume, cosmicEnergy, greeting });
    
    // Always set theme, even if it's the default
    setTheme(theme);
    
    const focusRange = document.getElementById('focusLengthRange');
    const focusValue = document.getElementById('focusLengthValue');
    if (focusRange && focusValue) {
        focusRange.value = focusLength;
        focusValue.textContent = focusLength;
        updateStellarTrack(focusRange);
    }
    
    const soundRange = document.getElementById('soundVolumeRange');
    const soundValue = document.getElementById('soundVolumeValue');
    if (soundRange && soundValue) {
        soundRange.value = soundVolume;
        soundValue.textContent = soundVolume;
        updateStellarTrack(soundRange);
    }
    
    const cosmicEnergyRange = document.getElementById('cosmicEnergyRange');
    const cosmicEnergyValue = document.getElementById('cosmicEnergyValue');
    if (cosmicEnergyRange && cosmicEnergyValue) {
        cosmicEnergyRange.value = cosmicEnergy;
        cosmicEnergyValue.textContent = cosmicEnergy;
        updateStellarTrack(cosmicEnergyRange);
    }
    
    const greetingInput = document.getElementById('greetingInput');
    if (greetingInput) {
        greetingInput.value = greeting;
        document.getElementById('greeting').textContent = greeting || 'Welcome to Your Universe!';
    }
    
    // Apply loaded focus duration to timer state
    const loadedFocusDuration = parseInt(focusLength);
    if (loadedFocusDuration && loadedFocusDuration > 0) {
        state.timer.settings.focusDuration = loadedFocusDuration;
        if (!state.timer.isRunning && !state.timer.isBreak) {
            state.timer.minutes = loadedFocusDuration;
            state.timer.seconds = 0;
            updateTimerDisplay();
        }
    }
    
    if (state.sounds.audio) {
        state.sounds.audio.volume = parseInt(soundVolume) / 100;
    }
}

export function setupSettingsModal() {
    // Settings modal
    document.getElementById('settingsBtn').addEventListener('click', () => {
        const overlay = document.getElementById('settingsModalOverlay');
        const modal = document.querySelector('.settings-modal');
        
        overlay.classList.add('active');
        
        // Add cosmic entrance animation
        setTimeout(() => {
            if (modal) {
                modal.classList.add('cosmic-entrance-active');
            }
        }, 50);
        
        loadSettings();
    });

    document.getElementById('closeSettingsBtn').addEventListener('click', () => {
        const overlay = document.getElementById('settingsModalOverlay');
        const modal = document.querySelector('.settings-modal');
        
        // Add cosmic exit animation
        if (modal) {
            modal.classList.remove('cosmic-entrance-active');
            modal.classList.add('cosmic-exit-active');
        }
        
        setTimeout(() => {
            overlay.classList.remove('active');
            if (modal) {
                modal.classList.remove('cosmic-exit-active');
            }
        }, 400);
    });

    document.getElementById('settingsModalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            const overlay = document.getElementById('settingsModalOverlay');
            const modal = document.querySelector('.settings-modal');
            
            // Add cosmic exit animation
            if (modal) {
                modal.classList.remove('cosmic-entrance-active');
                modal.classList.add('cosmic-exit-active');
            }
            
            setTimeout(() => {
                overlay.classList.remove('active');
                if (modal) {
                    modal.classList.remove('cosmic-exit-active');
                }
            }, 400);
        }
    });
}

// Cosmic Effects Functions
function initCosmicEffects() {
    // Initialize stellar tracks for all sliders
    const sliders = document.querySelectorAll('.stellar-slider');
    sliders.forEach(slider => {
        updateStellarTrack(slider);
        
        // Add cosmic thumb tracking
        const container = slider.closest('.stellar-control-container');
        if (container) {
            const cosmicThumb = container.querySelector('.cosmic-thumb');
            if (cosmicThumb) {
                slider.addEventListener('input', () => {
                    updateCosmicThumb(slider, cosmicThumb);
                });
                updateCosmicThumb(slider, cosmicThumb);
            }
        }
    });

    // Add cosmic entrance animation to modal
    const modal = document.querySelector('.settings-modal');
    if (modal) {
        setTimeout(() => {
            modal.classList.add('cosmic-entrance-active');
        }, 100);
    }
}

function updateStellarTrack(slider) {
    const container = slider.closest('.stellar-control-container');
    if (!container) return;
    
    const track = container.querySelector('.stellar-track');
    if (!track) return;
    
    const value = slider.value;
    const max = slider.max;
    const percentage = (value / max) * 100;
    
    // Update track fill
    track.style.setProperty('--value-percent', `${percentage}%`);
    
    // Update stellar points
    const existingStars = container.querySelectorAll('.track-star');
    existingStars.forEach(star => star.remove());
    
    const starCount = Math.floor(percentage / 20); // One star per 20%
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'track-star star-active';
        star.style.left = `${(i + 1) * 20}%`;
        container.appendChild(star);
    }
}

function updateCosmicThumb(slider, cosmicThumb) {
    const value = slider.value;
    const max = slider.max;
    const percentage = (value / max) * 100;
    
    cosmicThumb.style.left = `${percentage}%`;
    cosmicThumb.style.opacity = '1';
}

function triggerCosmicPreview() {
    console.log('🌌 Triggering cosmic preview...');
    
    // Add ripple effect to preview button
    const previewBtn = document.getElementById('previewCosmosBtn');
    if (previewBtn) {
        const ripple = document.createElement('div');
        ripple.className = 'cosmic-ripple';
        previewBtn.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 1000);
    }
    
    // Trigger UI effect (this will be filtered by cosmic-settings.js)
    if (window.triggerUIEffect) {
        window.triggerUIEffect('cosmicPortalOpen');
    }
    
    // Add temporary cosmic glow to modal
    const modal = document.querySelector('.settings-modal');
    if (modal) {
        modal.style.boxShadow = '0 0 50px rgba(139, 92, 246, 0.8), 0 0 100px rgba(139, 92, 246, 0.4)';
        setTimeout(() => {
            modal.style.boxShadow = '';
        }, 3000);
    }
}

function showCosmicSuccessMessage() {
    const successMsg = document.getElementById('settingsSavedMsg');
    if (successMsg) {
        successMsg.classList.add('show', 'success-visible');
        
        setTimeout(() => {
            successMsg.classList.remove('show', 'success-visible');
        }, 3000);
    }
}

// Add particle effect to buttons
function addButtonParticleEffect(button) {
    const particleBurst = button.querySelector('.btn-particle-burst');
    if (!particleBurst) return;
    
    for (let i = 0; i < 6; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            top: 50%;
            left: 50%;
            pointer-events: none;
            animation: particleExplosion 0.6s ease-out forwards;
            animation-delay: ${i * 50}ms;
        `;
        particleBurst.appendChild(particle);
        
        setTimeout(() => {
            particle.remove();
        }, 600);
    }
}

// Add CSS for particle explosion if not already present
if (!document.querySelector('#cosmic-particle-styles')) {
    const style = document.createElement('style');
    style.id = 'cosmic-particle-styles';
    style.textContent = `
        @keyframes particleExplosion {
            to {
                transform: translate(
                    ${Math.random() * 60 - 30}px,
                    ${Math.random() * 60 - 30}px
                ) scale(0);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}
