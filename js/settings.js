import { state } from './state.js';
import { updateTimerDisplay } from './timer.js';
import { setVolume } from './sounds.js';
// Temporarily disabled notifications import for debugging
// import { 
//     requestNotificationPermission, 
//     getNotificationPermission, 
//     areNotificationsEnabled 
// } from './notifications.js';

function setTheme(theme) {
    console.log(`🎨 Applying theme: ${theme}`);
    
    // Update DOM attributes
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    
    // Update localStorage
    localStorage.setItem('fu_theme', theme);
    
    // Update theme button states
    const themeButtons = document.querySelectorAll('[data-theme]');
    themeButtons.forEach(btn => {
        if (btn.id && btn.id.includes('theme')) {
            btn.classList.remove('active', 'btn-primary');
            if (btn.getAttribute('data-theme') === theme || 
                (btn.id === `theme${theme.charAt(0).toUpperCase() + theme.slice(1)}Btn`)) {
                btn.classList.add('active', 'btn-primary');
            }
        }
    });
    
    // Apply theme-specific 3D scene adjustments
    applyThemeTo3DScene(theme);
    
    // Apply theme-specific UI adjustments
    applyThemeToUI(theme);
}

// Apply theme changes to 3D scene
function applyThemeTo3DScene(theme) {
    if (!window.scene) return;
    
    try {
        switch (theme) {
            case 'light':
                // Light theme - brighter, more colorful
                if (window.scene.ambientLight) {
                    window.scene.ambientLight.intensity = 0.6;
                    window.scene.ambientLight.diffuse = new BABYLON.Color3(0.9, 0.9, 1);
                    window.scene.ambientLight.groundColor = new BABYLON.Color3(0.7, 0.7, 0.8);
                }
                window.scene.clearColor = new BABYLON.Color4(0.95, 0.95, 1, 1);
                window.scene.fogColor = new BABYLON.Color3(0.9, 0.9, 0.95);
                window.scene.fogDensity = 0.0005;
                break;
                
            case 'dark':
                // Dark theme - default space theme
                if (window.scene.ambientLight) {
                    window.scene.ambientLight.intensity = 0.4;
                    window.scene.ambientLight.diffuse = new BABYLON.Color3(0.4, 0.4, 0.6);
                    window.scene.ambientLight.groundColor = new BABYLON.Color3(0.1, 0.1, 0.2);
                }
                window.scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
                window.scene.fogColor = new BABYLON.Color3(0.02, 0.02, 0.06);
                window.scene.fogDensity = 0.0008;
                break;
                
            case 'cosmos':
                // Cosmos theme - deep purple space
                if (window.scene.ambientLight) {
                    window.scene.ambientLight.intensity = 0.5;
                    window.scene.ambientLight.diffuse = new BABYLON.Color3(0.5, 0.3, 0.8);
                    window.scene.ambientLight.groundColor = new BABYLON.Color3(0.2, 0.1, 0.4);
                }
                window.scene.clearColor = new BABYLON.Color4(0.05, 0.02, 0.15, 1);
                window.scene.fogColor = new BABYLON.Color3(0.1, 0.05, 0.2);
                window.scene.fogDensity = 0.001;
                break;
                
            case 'auto':
                // Auto theme - check system preference
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                applyThemeTo3DScene(prefersDark ? 'dark' : 'light');
                return;
        }
        
        console.log(`✅ 3D scene updated for ${theme} theme`);
    } catch (error) {
        console.warn('Could not update 3D scene theme:', error);
    }
}

// Apply theme changes to UI elements
function applyThemeToUI(theme) {
    // Update any dynamic UI elements that need theme-specific adjustments
    const achievement = document.getElementById('achievement');
    const progress3d = document.getElementById('progress3d');
    
    // Add theme-specific classes for extra styling if needed
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-cosmos', 'theme-auto');
    document.body.classList.add(`theme-${theme}`);
}

export function setupSettingsModal() {
    console.log('🔧 Setting up settings modal...');
    
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsOverlay = document.getElementById('settingsModalOverlay');
        const closeBtn = document.getElementById('closeSettingsBtn');
        
        if (!settingsBtn || !settingsOverlay || !closeBtn) {
            console.error('Settings elements not found');
            return;
        }
        
        // Settings button click
        settingsBtn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            settingsOverlay.classList.add('active');
            console.log('Settings modal opened');
        });
        
        // Close button
        closeBtn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            settingsOverlay.classList.remove('active');
            console.log('Settings modal closed');
        });
        
        // Click outside to close
        settingsOverlay.addEventListener('click', function(event) {
            if (event.target === settingsOverlay) {
                settingsOverlay.classList.remove('active');
                console.log('Settings modal closed by overlay click');
            }
        });
        
        console.log('✅ Settings modal event listeners attached');
    }, 100);
}

export function setupSettingsControls() {
    console.log('🎛️ Setting up settings controls...');
    
    // Use setTimeout to ensure DOM is ready, similar to setupSettingsModal
    setTimeout(() => {
        const elements = {
            saveBtn: document.getElementById('saveSettingsBtn'),
            resetBtn: document.getElementById('resetSettingsBtn'),
            focusRange: document.getElementById('focusLengthRange'),
            focusValue: document.getElementById('focusLengthValue'),
            shortBreakRange: document.getElementById('shortBreakRange'),
            shortBreakValue: document.getElementById('shortBreakValue'),
            longBreakRange: document.getElementById('longBreakRange'),
            longBreakValue: document.getElementById('longBreakValue'),
            soundRange: document.getElementById('soundVolumeRange'),
            soundValue: document.getElementById('soundVolumeValue'),
            greetingInput: document.getElementById('greetingInput'),
            savedMsg: document.getElementById('settingsSavedMsg'),
            enableNotificationsBtn: document.getElementById('enableNotificationsBtn'),
            notificationStatus: document.getElementById('notificationStatus'),
            themeBtns: {
                light: document.getElementById('themeLightBtn'),
                dark: document.getElementById('themeDarkBtn'),
                cosmos: document.getElementById('themeCosmosBtn'),
                auto: document.getElementById('themeAutoBtn')
            }
        };

        // Debug: Log which elements were found
        console.log('🔍 Settings elements found:', {
            saveBtn: !!elements.saveBtn,
            resetBtn: !!elements.resetBtn,
            focusRange: !!elements.focusRange,
            focusValue: !!elements.focusValue,
            shortBreakRange: !!elements.shortBreakRange,
            shortBreakValue: !!elements.shortBreakValue,
            longBreakRange: !!elements.longBreakRange,
            longBreakValue: !!elements.longBreakValue,
            soundRange: !!elements.soundRange,
            soundValue: !!elements.soundValue,
            greetingInput: !!elements.greetingInput,
            savedMsg: !!elements.savedMsg
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
            const volume = parseInt(elements.soundRange.value);
            elements.soundValue.textContent = volume;
            
            // Set the master volume for all ambient sounds
            setVolume(volume);
            
            console.log(`🎛️ Settings: Ambient sound volume set to ${volume}%`);
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
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                setTheme(theme);
                console.log(`Theme changed to: ${theme}`);
            });
        }
    });

    // Save button
    if (elements.saveBtn) {
        elements.saveBtn.addEventListener('click', function() {
            console.log('🔧 Save button clicked');
            try {
                const focusDuration = parseInt(elements.focusRange.value);
                const shortBreakDuration = parseInt(elements.shortBreakRange.value);
                const longBreakDuration = parseInt(elements.longBreakRange.value);
                const soundVolume = parseInt(elements.soundRange.value);
                const greeting = elements.greetingInput.value;
                const theme = document.body.getAttribute('data-theme') || 'auto';
                
                console.log('🔧 Settings to save:', {
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
                
                console.log('✅ Settings saved to localStorage');
                
                // Apply settings immediately
                if (focusDuration && focusDuration > 0) {
                    state.timer.settings.focusDuration = focusDuration;
                    
                    // If timer is not running and not in break, update display
                    if (!state.timer.isRunning && !state.timer.isBreak) {
                        state.timer.minutes = focusDuration;
                        state.timer.seconds = 0;
                        updateTimerDisplay();
                        
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
                    
                    if (!state.timer.isRunning && state.timer.isBreak && !state.timer.isLongBreak) {
                        state.timer.minutes = shortBreakDuration;
                        state.timer.seconds = 0;
                        updateTimerDisplay();
                    }
                }
                
                if (longBreakDuration && longBreakDuration > 0) {
                    state.timer.settings.longBreakDuration = longBreakDuration;
                    
                    if (!state.timer.isRunning && state.timer.isBreak && state.timer.isLongBreak) {
                        state.timer.minutes = longBreakDuration;
                        state.timer.seconds = 0;
                        updateTimerDisplay();
                    }
                }
                
                // Update sound volume
                setVolume(soundVolume);
                
                // Update greeting
                document.getElementById('greeting').textContent = greeting || 'Welcome to Your Universe!';
                
                // Show success message
                if (elements.savedMsg) {
                    elements.savedMsg.style.opacity = 1;
                    setTimeout(() => {
                        elements.savedMsg.style.opacity = 0;
                    }, 1500);
                }
                
                console.log('✅ Settings applied successfully');
                
            } catch (error) {
                console.error('❌ Error saving settings:', error);
            }
        });
    } else {
        console.error('❌ Save button not found');
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
    
    // Notification controls - temporarily disabled for debugging
    // if (elements.enableNotificationsBtn && elements.notificationStatus) {
    //     updateNotificationStatus(elements.notificationStatus);
    //     elements.enableNotificationsBtn.addEventListener('click', async () => {
    //         // notification code here
    //     });
    // }
    
    }, 100); // Close setTimeout
}

/**
 * Update notification status display based on current permission
 * Temporarily disabled for debugging
 */
/*
function updateNotificationStatus(statusElement) {
    const permission = getNotificationPermission();
    const button = document.getElementById('enableNotificationsBtn');
    
    if (!('Notification' in window)) {
        statusElement.textContent = 'Not supported';
        statusElement.className = 'notification-status disabled';
        if (button) {
            button.textContent = 'Not Supported';
            button.disabled = true;
        }
        return;
    }
    
    switch (permission) {
        case 'granted':
            statusElement.textContent = 'Notifications enabled';
            statusElement.className = 'notification-status enabled';
            if (button) {
                button.textContent = 'Enabled';
                button.disabled = true;
            }
            break;
        case 'denied':
            statusElement.textContent = 'Permission denied';
            statusElement.className = 'notification-status disabled';
            if (button) {
                button.textContent = 'Blocked';
                button.disabled = true;
            }
            break;
        default: // 'default'
            statusElement.textContent = 'Click to enable';
            statusElement.className = 'notification-status pending';
            if (button) {
                button.textContent = 'Enable Notifications';
                button.disabled = false;
            }
            break;
    }
}
*/

export function loadSettings() {
    console.log('📥 Loading saved settings...');
    
    // Load theme with proper fallback
    const savedTheme = localStorage.getItem('fu_theme') || 'dark';
    setTheme(savedTheme);
    
    const focusLength = localStorage.getItem('fu_focusLength') || '25';
    const shortBreakLength = localStorage.getItem('fu_shortBreakLength') || '5';
    const longBreakLength = localStorage.getItem('fu_longBreakLength') || '15';
    const soundVolume = localStorage.getItem('fu_soundVolume') || '30';
    const greeting = localStorage.getItem('fu_greeting') || '';
    
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
    
    // Apply loaded sound volume
    const loadedSoundVolume = parseInt(soundVolume);
    if (loadedSoundVolume >= 0) {
        setVolume(loadedSoundVolume);
        console.log(`🎛️ Loaded ambient sound volume: ${loadedSoundVolume}%`);
    }
}

// Handle system theme changes for auto mode
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const currentTheme = document.body.getAttribute('data-theme');
    if (currentTheme === 'auto') {
        applyThemeTo3DScene(e.matches ? 'dark' : 'light');
        applyThemeToUI('auto');
    }
});