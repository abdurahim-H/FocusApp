// // Settings Module
// // Handles settings modal, theme switching, and localStorage management

// import { state } from './state.js';
// import { updateTimerDisplay } from './timer.js';

// export function setupSettingsControls() {
//     const elements = {
//         saveBtn: document.getElementById('saveSettingsBtn'),
//         resetBtn: document.getElementById('resetSettingsBtn'),
//         savedMsg: document.getElementById('settingsSavedMsg'),
//         focusRange: document.getElementById('focusLengthRange'),
//         focusValue: document.getElementById('focusLengthValue'),
//         soundRange: document.getElementById('soundVolumeRange'),
//         soundValue: document.getElementById('soundVolumeValue'),
//         greetingInput: document.getElementById('greetingInput'),
//         themeBtns: {
//             light: document.getElementById('themeLightBtn'),
//             dark: document.getElementById('themeDarkBtn'),
//             cosmos: document.getElementById('themeCosmosBtn'),
//             auto: document.getElementById('themeAutoBtn')
//         }
//     };

//     console.log('Setting up controls, elements found:', {
//         saveBtn: !!elements.saveBtn,
//         resetBtn: !!elements.resetBtn,
//         focusRange: !!elements.focusRange
//     });

//     // Focus length range
//     if (elements.focusRange && elements.focusValue) {
//         elements.focusRange.addEventListener('input', () => {
//             elements.focusValue.textContent = elements.focusRange.value;
//         });
//     }

//     // Sound volume range
//     if (elements.soundRange && elements.soundValue) {
//         elements.soundRange.addEventListener('input', () => {
//             elements.soundValue.textContent = elements.soundRange.value;
//             if (state.sounds.audio) {
//                 state.sounds.audio.volume = elements.soundRange.value / 100;
//             }
//         });
//     }

//     // Greeting input
//     if (elements.greetingInput) {
//         elements.greetingInput.addEventListener('input', () => {
//             const greetingText = elements.greetingInput.value || 'Welcome to Your Universe!';
//             document.getElementById('greeting').textContent = greetingText;
//         });
//     }

//     // Theme buttons
//     Object.entries(elements.themeBtns).forEach(([theme, btn]) => {
//         if (btn) {
//             btn.addEventListener('click', () => setTheme(theme));
//         }
//     });

//     // Save button
//     if (elements.saveBtn) {
//         console.log('Attaching save button event listener');
        
//         elements.saveBtn.addEventListener('click', function() {
//             console.log('SAVE BUTTON CLICKED! Processing settings...');
            
//             try {
//                 // Get values
//                 const focusDuration = parseInt(elements.focusRange.value);
//                 const soundVolume = parseInt(elements.soundRange.value);
//                 const greeting = elements.greetingInput.value;
//                 const theme = document.body.getAttribute('data-theme') || 'auto';
                
//                 console.log('Saving settings:', { focusDuration, soundVolume, greeting, theme });
                
//                 // Save to localStorage
//                 localStorage.setItem('fu_theme', theme);
//                 localStorage.setItem('fu_focusLength', focusDuration);
//                 localStorage.setItem('fu_soundVolume', soundVolume);
//                 localStorage.setItem('fu_greeting', greeting);
                
//                 // Apply settings immediately
//                 if (focusDuration && focusDuration > 0) {
//                     state.timer.settings.focusDuration = focusDuration;
                    
//                     // If timer is not running and not in break, update display
//                     if (!state.timer.isRunning && !state.timer.isBreak) {
//                         state.timer.minutes = focusDuration;
//                         state.timer.seconds = 0;
//                         updateTimerDisplay();
//                         console.log('Timer display updated to:', focusDuration);
                        
//                         // Reset start button
//                         const startBtn = document.getElementById('startBtn');
//                         if (startBtn) {
//                             startBtn.textContent = 'Start Focus';
//                             startBtn.classList.remove('hidden');
//                         }
//                         const pauseBtn = document.getElementById('pauseBtn');
//                         if (pauseBtn) {
//                             pauseBtn.classList.add('hidden');
//                         }
//                     }
//                 }
                
//                 // Update sound volume
//                 if (state.sounds.audio) {
//                     state.sounds.audio.volume = soundVolume / 100;
//                 }
                
//                 // Update greeting
//                 document.getElementById('greeting').textContent = greeting || 'Welcome to Your Universe!';
                
//                 // Show success message
//                 elements.savedMsg.style.opacity = 1;
//                 setTimeout(() => {
//                     elements.savedMsg.style.opacity = 0;
//                 }, 1500);
                
//                 console.log('Settings saved successfully!');
                
//             } catch (error) {
//                 console.error('Error saving settings:', error);
//             }
//         });
//     } else {
//         console.error('Save button not found!');
//     }

//     // Reset button
//     if (elements.resetBtn) {
//         elements.resetBtn.addEventListener('click', () => {
//             setTheme('auto');
//             elements.focusRange.value = 25;
//             elements.focusValue.textContent = '25';
//             elements.soundRange.value = 30;
//             elements.soundValue.textContent = '30';
//             elements.greetingInput.value = '';
//             document.getElementById('greeting').textContent = 'Welcome to Your Universe!';
            
//             // Clear localStorage
//             localStorage.removeItem('fu_theme');
//             localStorage.removeItem('fu_focusLength');
//             localStorage.removeItem('fu_soundVolume');
//             localStorage.removeItem('fu_greeting');
            
//             // Reset timer settings
//             state.timer.settings.focusDuration = 25;
//             if (!state.timer.isRunning && !state.timer.isBreak) {
//                 state.timer.minutes = 25;
//                 state.timer.seconds = 0;
//                 updateTimerDisplay();
//             }
//         });
//     }
// }

// // Theme function
// export function setTheme(theme) {
//     console.log('Setting theme to:', theme);
    
//     // Set theme on both body and document element for maximum compatibility
//     document.body.setAttribute('data-theme', theme);
//     document.documentElement.setAttribute('data-theme', theme);
    
//     // Force immediate CSS recalculation
//     document.body.style.display = 'none';
//     document.body.offsetHeight; // Force reflow
//     document.body.style.display = '';
    
//     console.log('Theme attributes set:', {
//         body: document.body.getAttribute('data-theme'),
//         documentElement: document.documentElement.getAttribute('data-theme')
//     });
    
//     // Update theme buttons
//     document.querySelectorAll('.theme-buttons [data-theme]').forEach(btn => {
//         btn.classList.remove('btn-primary');
//         btn.classList.add('btn');
//     });
    
//     const activeBtn = document.querySelector(`.theme-buttons [data-theme="${theme}"]`);
//     if (activeBtn) {
//         activeBtn.classList.remove('btn');
//         activeBtn.classList.add('btn-primary');
//         console.log('Set active theme button for theme:', theme);
//     } else {
//         console.warn('Theme button not found for theme:', theme);
//     }
    
//     // Save theme immediately when changed
//     localStorage.setItem('fu_theme', theme);
//     console.log('Theme saved to localStorage:', theme);
    
//     // Log computed styles for debugging
//     setTimeout(() => {
//         const computedStyle = getComputedStyle(document.body);
//         console.log('Computed styles after theme change:', {
//             backgroundColor: computedStyle.backgroundColor,
//             color: computedStyle.color,
//             bgDark: computedStyle.getPropertyValue('--bg-dark'),
//             textPrimary: computedStyle.getPropertyValue('--text-primary')
//         });
//     }, 100);
// }

// // Load settings
// export function loadSettings() {
//     const theme = localStorage.getItem('fu_theme') || 'auto';
//     const focusLength = localStorage.getItem('fu_focusLength') || '25';
//     const soundVolume = localStorage.getItem('fu_soundVolume') || '30';
//     const greeting = localStorage.getItem('fu_greeting') || '';
    
//     console.log('Loading settings:', { theme, focusLength, soundVolume, greeting });
    
//     // Always set theme, even if it's the default
//     setTheme(theme);
    
//     const focusRange = document.getElementById('focusLengthRange');
//     const focusValue = document.getElementById('focusLengthValue');
//     if (focusRange && focusValue) {
//         focusRange.value = focusLength;
//         focusValue.textContent = focusLength;
//     }
    
//     const soundRange = document.getElementById('soundVolumeRange');
//     const soundValue = document.getElementById('soundVolumeValue');
//     if (soundRange && soundValue) {
//         soundRange.value = soundVolume;
//         soundValue.textContent = soundVolume;
//     }
    
//     const greetingInput = document.getElementById('greetingInput');
//     if (greetingInput) {
//         greetingInput.value = greeting;
//         document.getElementById('greeting').textContent = greeting || 'Welcome to Your Universe!';
//     }
    
//     // Apply loaded focus duration to timer state
//     const loadedFocusDuration = parseInt(focusLength);
//     if (loadedFocusDuration && loadedFocusDuration > 0) {
//         state.timer.settings.focusDuration = loadedFocusDuration;
//         if (!state.timer.isRunning && !state.timer.isBreak) {
//             state.timer.minutes = loadedFocusDuration;
//             state.timer.seconds = 0;
//             updateTimerDisplay();
//         }
//     }
    
//     if (state.sounds.audio) {
//         state.sounds.audio.volume = parseInt(soundVolume) / 100;
//     }
// }

// export function setupSettingsModal() {
//     // Settings modal
//     document.getElementById('settingsBtn').addEventListener('click', () => {
//         document.getElementById('settingsModalOverlay').classList.add('active');
//         loadSettings();
//     });

//     document.getElementById('closeSettingsBtn').addEventListener('click', () => {
//         document.getElementById('settingsModalOverlay').classList.remove('active');
//     });

//     document.getElementById('settingsModalOverlay').addEventListener('click', (e) => {
//         if (e.target === e.currentTarget) {
//             document.getElementById('settingsModalOverlay').classList.remove('active');
//         }
//     });
// }


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
        shortBreakRange: document.getElementById('shortBreakRange'),
        shortBreakValue: document.getElementById('shortBreakValue'),
        longBreakRange: document.getElementById('longBreakRange'),
        longBreakValue: document.getElementById('longBreakValue'),
        soundRange: document.getElementById('soundVolumeRange'),
        soundValue: document.getElementById('soundVolumeValue'),
        greetingInput: document.getElementById('greetingInput'),
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
        shortBreakRange: !!elements.shortBreakRange,
        longBreakRange: !!elements.longBreakRange
    });

    // Focus length range
    if (elements.focusRange && elements.focusValue) {
        elements.focusRange.addEventListener('input', () => {
            elements.focusValue.textContent = elements.focusRange.value;
        });
    }

    // Short break length range
    if (elements.shortBreakRange && elements.shortBreakValue) {
        elements.shortBreakRange.addEventListener('input', () => {
            elements.shortBreakValue.textContent = elements.shortBreakRange.value;
        });
    }

    // Long break length range
    if (elements.longBreakRange && elements.longBreakValue) {
        elements.longBreakRange.addEventListener('input', () => {
            elements.longBreakValue.textContent = elements.longBreakRange.value;
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
                const shortBreakDuration = parseInt(elements.shortBreakRange.value);
                const longBreakDuration = parseInt(elements.longBreakRange.value);
                const soundVolume = parseInt(elements.soundRange.value);
                const greeting = elements.greetingInput.value;
                const theme = document.body.getAttribute('data-theme') || 'auto';
                
                console.log('Saving settings:', { 
                    focusDuration, 
                    shortBreakDuration, 
                    longBreakDuration, 
                    soundVolume, 
                    greeting, 
                    theme 
                });
                
                // Save to localStorage
                localStorage.setItem('fu_theme', theme);
                localStorage.setItem('fu_focusLength', focusDuration);
                localStorage.setItem('fu_shortBreakLength', shortBreakDuration);
                localStorage.setItem('fu_longBreakLength', longBreakDuration);
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
                
                // Update break durations
                if (shortBreakDuration && shortBreakDuration > 0) {
                    state.timer.settings.shortBreakDuration = shortBreakDuration;
                    
                    // If timer is not running and in short break, update display
                    if (!state.timer.isRunning && state.timer.isBreak && !state.timer.isLongBreak) {
                        state.timer.minutes = shortBreakDuration;
                        state.timer.seconds = 0;
                        updateTimerDisplay();
                        console.log('Short break timer display updated to:', shortBreakDuration);
                    }
                }
                
                if (longBreakDuration && longBreakDuration > 0) {
                    state.timer.settings.longBreakDuration = longBreakDuration;
                    
                    // If timer is not running and in long break, update display
                    if (!state.timer.isRunning && state.timer.isBreak && state.timer.isLongBreak) {
                        state.timer.minutes = longBreakDuration;
                        state.timer.seconds = 0;
                        updateTimerDisplay();
                        console.log('Long break timer display updated to:', longBreakDuration);
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
            setTheme('dark');
            elements.focusRange.value = 25;
            elements.focusValue.textContent = '25';
            elements.shortBreakRange.value = 5;
            elements.shortBreakValue.textContent = '5';
            elements.longBreakRange.value = 15;
            elements.longBreakValue.textContent = '15';
            elements.soundRange.value = 30;
            elements.soundValue.textContent = '30';
            elements.greetingInput.value = '';
            document.getElementById('greeting').textContent = 'Welcome to Your Universe!';
            
            // Clear localStorage
            localStorage.removeItem('fu_theme');
            localStorage.removeItem('fu_focusLength');
            localStorage.removeItem('fu_shortBreakLength');
            localStorage.removeItem('fu_longBreakLength');
            localStorage.removeItem('fu_soundVolume');
            localStorage.removeItem('fu_greeting');
            
            // Reset timer settings
            state.timer.settings.focusDuration = 25;
            state.timer.settings.shortBreakDuration = 5;
            state.timer.settings.longBreakDuration = 15;
            
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
    const theme = localStorage.getItem('fu_theme') || 'dark';
    const focusLength = localStorage.getItem('fu_focusLength') || '25';
    const shortBreakLength = localStorage.getItem('fu_shortBreakLength') || '5';
    const longBreakLength = localStorage.getItem('fu_longBreakLength') || '15';
    const soundVolume = localStorage.getItem('fu_soundVolume') || '30';
    const greeting = localStorage.getItem('fu_greeting') || '';
    
    console.log('Loading settings:', { 
        theme, 
        focusLength, 
        shortBreakLength, 
        longBreakLength, 
        soundVolume, 
        greeting 
    });
    
    // Always set theme, even if it's the default
    setTheme(theme);
    
    const focusRange = document.getElementById('focusLengthRange');
    const focusValue = document.getElementById('focusLengthValue');
    if (focusRange && focusValue) {
        focusRange.value = focusLength;
        focusValue.textContent = focusLength;
    }
    
    const shortBreakRange = document.getElementById('shortBreakRange');
    const shortBreakValue = document.getElementById('shortBreakValue');
    if (shortBreakRange && shortBreakValue) {
        shortBreakRange.value = shortBreakLength;
        shortBreakValue.textContent = shortBreakLength;
    }
    
    const longBreakRange = document.getElementById('longBreakRange');
    const longBreakValue = document.getElementById('longBreakValue');
    if (longBreakRange && longBreakValue) {
        longBreakRange.value = longBreakLength;
        longBreakValue.textContent = longBreakLength;
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
    
    // Apply loaded timer durations to timer state
    const loadedFocusDuration = parseInt(focusLength);
    const loadedShortBreakDuration = parseInt(shortBreakLength);
    const loadedLongBreakDuration = parseInt(longBreakLength);
    
    if (loadedFocusDuration && loadedFocusDuration > 0) {
        state.timer.settings.focusDuration = loadedFocusDuration;
        if (!state.timer.isRunning && !state.timer.isBreak) {
            state.timer.minutes = loadedFocusDuration;
            state.timer.seconds = 0;
            updateTimerDisplay();
        }
    }
    
    if (loadedShortBreakDuration && loadedShortBreakDuration > 0) {
        state.timer.settings.shortBreakDuration = loadedShortBreakDuration;
    }
    
    if (loadedLongBreakDuration && loadedLongBreakDuration > 0) {
        state.timer.settings.longBreakDuration = loadedLongBreakDuration;
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