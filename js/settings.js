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
        greetingInput: document.getElementById('greetingInput'),
        themeBtns: {
            light: document.getElementById('themeLightBtn'),
            dark: document.getElementById('themeDarkBtn'),
            auto: document.getElementById('themeAutoBtn')
        }
    };

    console.log('Setting up controls, elements found:', {
        saveBtn: !!elements.saveBtn,
        resetBtn: !!elements.resetBtn,
        focusRange: !!elements.focusRange
    });

    // Focus length range
    if (elements.focusRange && elements.focusValue) {
        elements.focusRange.addEventListener('input', () => {
            elements.focusValue.textContent = elements.focusRange.value;
        });
    }

    // Sound volume range
    if (elements.soundRange && elements.soundValue) {
        elements.soundRange.addEventListener('input', () => {
            elements.soundValue.textContent = elements.soundRange.value;
            if (state.sounds.audio) {
                state.sounds.audio.volume = elements.soundRange.value / 100;
            }
        });
    }

    // Greeting input
    if (elements.greetingInput) {
        elements.greetingInput.addEventListener('input', () => {
            const greetingText = elements.greetingInput.value || 'Welcome to Your Universe!';
            document.getElementById('greeting').textContent = greetingText;
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
                const greeting = elements.greetingInput.value;
                const theme = document.body.getAttribute('data-theme') || 'auto';
                
                console.log('Saving settings:', { focusDuration, soundVolume, greeting, theme });
                
                // Save to localStorage
                localStorage.setItem('fu_theme', theme);
                localStorage.setItem('fu_focusLength', focusDuration);
                localStorage.setItem('fu_soundVolume', soundVolume);
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
                
                // Show success message
                elements.savedMsg.style.opacity = 1;
                setTimeout(() => {
                    elements.savedMsg.style.opacity = 0;
                }, 1500);
                
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
            elements.greetingInput.value = '';
            document.getElementById('greeting').textContent = 'Welcome to Your Universe!';
            
            // Clear localStorage
            localStorage.removeItem('fu_theme');
            localStorage.removeItem('fu_focusLength');
            localStorage.removeItem('fu_soundVolume');
            localStorage.removeItem('fu_greeting');
            
            // Reset timer settings
            state.timer.settings.focusDuration = 25;
            if (!state.timer.isRunning && !state.timer.isBreak) {
                state.timer.minutes = 25;
                state.timer.seconds = 0;
                updateTimerDisplay();
            }
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
    const greeting = localStorage.getItem('fu_greeting') || '';
    
    console.log('Loading settings:', { theme, focusLength, soundVolume, greeting });
    
    // Always set theme, even if it's the default
    setTheme(theme);
    
    const focusRange = document.getElementById('focusLengthRange');
    const focusValue = document.getElementById('focusLengthValue');
    if (focusRange && focusValue) {
        focusRange.value = focusLength;
        focusValue.textContent = focusLength;
    }
    
    const soundRange = document.getElementById('soundVolumeRange');
    const soundValue = document.getElementById('soundVolumeValue');
    if (soundRange && soundValue) {
        soundRange.value = soundVolume;
        soundValue.textContent = soundVolume;
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
        document.getElementById('settingsModalOverlay').classList.add('active');
        loadSettings();
    });

    document.getElementById('closeSettingsBtn').addEventListener('click', () => {
        document.getElementById('settingsModalOverlay').classList.remove('active');
    });

    document.getElementById('settingsModalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            document.getElementById('settingsModalOverlay').classList.remove('active');
        }
    });
}
