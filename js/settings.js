import { state } from './state.js';
import { updateTimerDisplay } from './timer.js';
import { setVolume } from './sounds.js';

// iOS Water Settings Enhancement Variables
let iosSettingsInitialized = false;

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
        btn.classList.remove('active', 'btn-primary');
        if (btn.getAttribute('data-theme') === theme) {
            btn.classList.add('active', 'btn-primary');
        }
    });
    
    // Apply theme-specific 3D scene adjustments
    applyThemeTo3DScene(theme);
    
    // Apply theme-specific UI adjustments
    applyThemeToUI(theme);
}

function applyThemeTo3DScene(theme) {
    if (!window.scene) return;
    
    try {
        switch (theme) {
            case 'dark':
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
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                applyThemeTo3DScene(prefersDark ? 'dark' : 'cosmos');
                return;
        }
        
        console.log(`✅ 3D scene updated for ${theme} theme`);
    } catch (error) {
        console.warn('Could not update 3D scene theme:', error);
    }
}

function applyThemeToUI(theme) {
    const body = document.body;
    body.classList.remove('theme-dark', 'theme-cosmos', 'theme-auto');
    body.classList.add(`theme-${theme}`);
}

// Enhanced Settings Header Creation
function enhanceSettingsHeader() {
    console.log('🎨 Enhancing settings header with iOS design...');
    
    setTimeout(() => {
        const settingsModal = document.querySelector('.settings-modal');
        if (!settingsModal) {
            console.error('Settings modal not found');
            return;
        }
        
        // Check if header already exists
        let settingsHeader = settingsModal.querySelector('.settings-header');
        if (settingsHeader) {
            console.log('Settings header already exists, updating...');
        } else {
            // Create the new header structure
            settingsHeader = document.createElement('div');
            settingsHeader.className = 'settings-header';
            
            // Insert at the top of the modal
            const firstChild = settingsModal.firstElementChild;
            settingsModal.insertBefore(settingsHeader, firstChild);
        }
        
        // Create header content
        settingsHeader.innerHTML = `
            <div class="settings-title">Settings</div>
            <div class="header-buttons">
                <button class="header-btn reset-btn" id="resetSettingsBtn">Reset</button>
                <button class="header-btn save-btn" id="saveSettingsBtn">Save</button>
                <button class="header-btn close-btn" id="closeSettingsBtn">✕</button>
            </div>
        `;
        
        // Hide the old title if it exists
        const oldTitle = settingsModal.querySelector('h2');
        if (oldTitle) {
            oldTitle.style.display = 'none';
        }
        
        // Hide the old close button if it exists
        const oldCloseBtn = document.querySelector('.close-btn:not(.header-btn)');
        if (oldCloseBtn && oldCloseBtn.parentElement !== settingsHeader) {
            oldCloseBtn.style.display = 'none';
        }
        
        // Setup event listeners for the new buttons
        setupHeaderButtons();
        
        console.log('✅ Settings header enhanced successfully');
    }, 100);
}

function setupHeaderButtons() {
    // Close button
    const closeBtn = document.getElementById('closeSettingsBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            
            // Add ripple effect
            createWaterRipple(closeBtn, event);
            
            // Close modal
            const overlay = document.getElementById('settingsModalOverlay');
            if (overlay) {
                overlay.classList.remove('active');
            }
            
            console.log('Settings modal closed');
        });
    }
    
    // Save button
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            
            // Add ripple effect
            createWaterRipple(saveBtn, event);
            
            // Call save function
            saveSettings();
            
            console.log('Settings saved with water effect');
        });
    }
    
    // Reset button
    const resetBtn = document.getElementById('resetSettingsBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            
            // Add ripple effect
            createWaterRipple(resetBtn, event);
            
            // Reset settings
            resetSettings();
            
            console.log('Settings reset with water effect');
        });
    }
}

function createWaterRipple(element, event) {
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    const ripple = document.createElement('div');
    ripple.className = 'water-ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    element.style.position = 'relative';
    element.appendChild(ripple);
    
    setTimeout(() => {
        if (ripple.parentNode) {
            ripple.parentNode.removeChild(ripple);
        }
    }, 600);
}

function updateRangeProgress(slider) {
    const value = slider.value;
    const max = slider.max;
    const percentage = (value / max) * 100;
    slider.style.setProperty('--range-progress', percentage + '%');
}

function showSuccessMessage(message) {
    // Remove existing message
    const existingMsg = document.querySelector('.settings-saved-msg');
    if (existingMsg) existingMsg.remove();
    
    // Create new message
    const successMsg = document.createElement('div');
    successMsg.className = 'settings-saved-msg show';
    successMsg.textContent = message || 'Settings Saved! ✨';
    document.body.appendChild(successMsg);
    
    setTimeout(() => {
        successMsg.classList.remove('show');
        setTimeout(() => successMsg.remove(), 500);
    }, 2000);
}

// Enhanced Settings Modal Setup
export function setupSettingsModal() {
    console.log('🔧 Setting up iOS-style settings modal...');
    
    setTimeout(() => {
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsOverlay = document.getElementById('settingsModalOverlay');
        
        if (!settingsBtn || !settingsOverlay) {
            console.error('Settings elements not found');
            return;
        }
        
        // Enhance the modal structure first
        enhanceSettingsHeader();
        
        // Settings button click
        settingsBtn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            settingsOverlay.classList.add('active');
            
            // Initialize iOS enhancements if not done yet
            if (!iosSettingsInitialized) {
                initializeIOSEnhancements();
                iosSettingsInitialized = true;
            }
            
            console.log('Settings modal opened');
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

function initializeIOSEnhancements() {
    console.log('🚀 Initializing iOS enhancements...');
    
    // Enhance range inputs
    enhanceRangeInputs();
    
    // Enhance theme buttons
    enhanceThemeButtons();
    
    // Enhance notification button
    enhanceNotificationButton();
    
    // Add water ripple to interactive elements
    addWaterRippleToElements();
}

function enhanceRangeInputs() {
    const rangeInputs = document.querySelectorAll('.range-input');
    rangeInputs.forEach(slider => {
        // Set initial progress
        updateRangeProgress(slider);
        
        // Add input event listener
        slider.addEventListener('input', function() {
            updateRangeProgress(this);
            
            // Update corresponding value display
            const sliderId = this.id;
            let valueElementId = '';
            
            switch(sliderId) {
                case 'focusLengthRange':
                    valueElementId = 'focusLengthValue';
                    break;
                case 'shortBreakRange':
                    valueElementId = 'shortBreakValue';
                    break;
                case 'longBreakRange':
                    valueElementId = 'longBreakValue';
                    break;
                case 'soundVolumeRange':
                    valueElementId = 'soundVolumeValue';
                    break;
            }
            
            if (valueElementId) {
                const valueElement = document.getElementById(valueElementId);
                if (valueElement) {
                    valueElement.textContent = this.value;
                }
            }
        });
    });
}

function enhanceThemeButtons() {
    const themeButtons = document.querySelectorAll('[data-theme]');
    themeButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            // Add ripple effect
            createWaterRipple(this, event);
            
            // Remove active class from all buttons
            themeButtons.forEach(btn => {
                btn.classList.remove('active', 'btn-primary');
            });
            
            // Add active class to clicked button
            this.classList.add('active', 'btn-primary');
            
            // Apply theme
            const theme = this.getAttribute('data-theme');
            if (theme) {
                setTheme(theme);
            }
        });
    });
}

function enhanceNotificationButton() {
    const notificationBtn = document.getElementById('enableNotificationsBtn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function(event) {
            createWaterRipple(this, event);
            
            // Request notification permission
            if ('Notification' in window) {
                if (Notification.permission === 'default') {
                    Notification.requestPermission().then(permission => {
                        updateNotificationStatus(permission);
                    });
                } else {
                    updateNotificationStatus(Notification.permission);
                }
            }
        });
    }
}

function updateNotificationStatus(permission) {
    const statusElement = document.getElementById('notificationStatus');
    const button = document.getElementById('enableNotificationsBtn');
    
    if (!statusElement || !button) return;
    
    switch (permission) {
        case 'granted':
            statusElement.textContent = 'Notifications enabled ✓';
            statusElement.className = 'notification-status enabled';
            button.textContent = 'Enabled';
            button.style.background = 'rgba(52, 199, 89, 0.25)';
            break;
        case 'denied':
            statusElement.textContent = 'Permission denied';
            statusElement.className = 'notification-status disabled';
            button.textContent = 'Blocked';
            break;
        default:
            statusElement.textContent = 'Click to enable';
            statusElement.className = 'notification-status pending';
            break;
    }
}

function addWaterRippleToElements() {
    const interactiveElements = document.querySelectorAll(
        '.settings-section, .text-input, .liquid-glass-btn:not(.header-btn)'
    );
    
    interactiveElements.forEach(element => {
        element.addEventListener('click', function(event) {
            if (!this.classList.contains('water-ripple-added')) {
                createWaterRipple(this, event);
                this.classList.add('water-ripple-added');
                setTimeout(() => {
                    this.classList.remove('water-ripple-added');
                }, 600);
            }
        });
    });
}

export function setupSettingsControls() {
    console.log('🎛️ Setting up settings controls...');
    
    setTimeout(() => {
        const elements = {
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
                dark: document.getElementById('themeDarkBtn'),
                cosmos: document.getElementById('themeCosmosBtn'),
                auto: document.getElementById('themeAutoBtn')
            }
        };

        // Focus length range
        if (elements.focusRange && elements.focusValue) {
            elements.focusRange.addEventListener('input', () => {
                elements.focusValue.textContent = elements.focusRange.value;
                updateRangeProgress(elements.focusRange);
            });
        }

        // Short break length range
        if (elements.shortBreakRange && elements.shortBreakValue) {
            elements.shortBreakRange.addEventListener('input', () => {
                elements.shortBreakValue.textContent = elements.shortBreakRange.value;
                updateRangeProgress(elements.shortBreakRange);
            });
        }

        // Long break length range
        if (elements.longBreakRange && elements.longBreakValue) {
            elements.longBreakRange.addEventListener('input', () => {
                elements.longBreakValue.textContent = elements.longBreakRange.value;
                updateRangeProgress(elements.longBreakRange);
            });
        }

        // Sound volume range
        if (elements.soundRange && elements.soundValue) {
            elements.soundRange.addEventListener('input', () => {
                const volume = parseInt(elements.soundRange.value);
                elements.soundValue.textContent = volume;
                setVolume(volume);
                updateRangeProgress(elements.soundRange);
                console.log(`🎛️ Settings: Ambient sound volume set to ${volume}%`);
            });
        }

        // Greeting input
        if (elements.greetingInput) {
            elements.greetingInput.addEventListener('input', () => {
                const greetingText = elements.greetingInput.value || 'Welcome to Your Universe!';
                const greetingElement = document.getElementById('greeting');
                if (greetingElement) {
                    greetingElement.textContent = greetingText;
                }
            });
        }

        // Theme buttons - will be enhanced by enhanceThemeButtons()
        Object.entries(elements.themeBtns).forEach(([theme, btn]) => {
            if (btn) {
                btn.setAttribute('data-theme', theme);
            }
        });
        
    }, 100);
}

function saveSettings() {
    console.log('🔧 Save button clicked');
    try {
        const focusRange = document.getElementById('focusLengthRange');
        const shortBreakRange = document.getElementById('shortBreakRange');
        const longBreakRange = document.getElementById('longBreakRange');
        const soundRange = document.getElementById('soundVolumeRange');
        const greetingInput = document.getElementById('greetingInput');
        
        const focusDuration = parseInt(focusRange?.value || 25);
        const shortBreakDuration = parseInt(shortBreakRange?.value || 5);
        const longBreakDuration = parseInt(longBreakRange?.value || 15);
        const soundVolume = parseInt(soundRange?.value || 30);
        const greeting = greetingInput?.value || 'Welcome to Your Universe!';
        const theme = document.body.getAttribute('data-theme') || 'dark';
        
        // Save to localStorage
        localStorage.setItem('fu_theme', theme);
        localStorage.setItem('fu_focusLength', focusDuration);
        localStorage.setItem('fu_shortBreakLength', shortBreakDuration);
        localStorage.setItem('fu_longBreakLength', longBreakDuration);
        localStorage.setItem('fu_soundVolume', soundVolume);
        localStorage.setItem('fu_greeting', greeting);
        
        // Apply settings immediately
        if (focusDuration > 0) {
            state.timer.settings.focusDuration = focusDuration;
            
            if (!state.timer.isRunning && !state.timer.isBreak) {
                state.timer.minutes = focusDuration;
                state.timer.seconds = 0;
                updateTimerDisplay();
            }
        }
        
        if (shortBreakDuration > 0) {
            state.timer.settings.shortBreakDuration = shortBreakDuration;
        }
        
        if (longBreakDuration > 0) {
            state.timer.settings.longBreakDuration = longBreakDuration;
        }
        
        // Update sound volume
        setVolume(soundVolume);
        
        // Update greeting
        const greetingElement = document.getElementById('greeting');
        if (greetingElement) {
            greetingElement.textContent = greeting;
        }
        
        // Show success message
        showSuccessMessage('Settings Saved! ✨');
        
        console.log('✅ Settings applied successfully');
        
    } catch (error) {
        console.error('❌ Error saving settings:', error);
    }
}

function resetSettings() {
    // Reset theme to dark
    setTheme('dark');
    
    // Reset range values
    const focusRange = document.getElementById('focusLengthRange');
    const focusValue = document.getElementById('focusLengthValue');
    if (focusRange && focusValue) {
        focusRange.value = 25;
        focusValue.textContent = '25';
        updateRangeProgress(focusRange);
    }
    
    const shortBreakRange = document.getElementById('shortBreakRange');
    const shortBreakValue = document.getElementById('shortBreakValue');
    if (shortBreakRange && shortBreakValue) {
        shortBreakRange.value = 5;
        shortBreakValue.textContent = '5';
        updateRangeProgress(shortBreakRange);
    }
    
    const longBreakRange = document.getElementById('longBreakRange');
    const longBreakValue = document.getElementById('longBreakValue');
    if (longBreakRange && longBreakValue) {
        longBreakRange.value = 15;
        longBreakValue.textContent = '15';
        updateRangeProgress(longBreakRange);
    }
    
    const soundRange = document.getElementById('soundVolumeRange');
    const soundValue = document.getElementById('soundVolumeValue');
    if (soundRange && soundValue) {
        soundRange.value = 30;
        soundValue.textContent = '30';
        updateRangeProgress(soundRange);
    }
    
    // Reset greeting
    const greetingInput = document.getElementById('greetingInput');
    if (greetingInput) {
        greetingInput.value = 'Welcome to Your Universe!';
    }
    
    const greetingElement = document.getElementById('greeting');
    if (greetingElement) {
        greetingElement.textContent = 'Welcome to Your Universe!';
    }
    
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
    
    // Show success message
    showSuccessMessage('Settings Reset! ✨');
}

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
    
    // Set values in form elements
    const focusRange = document.getElementById('focusLengthRange');
    const focusValue = document.getElementById('focusLengthValue');
    if (focusRange && focusValue) {
        focusRange.value = focusLength;
        focusValue.textContent = focusLength;
        updateRangeProgress(focusRange);
    }
    
    const shortBreakRange = document.getElementById('shortBreakRange');
    const shortBreakValue = document.getElementById('shortBreakValue');
    if (shortBreakRange && shortBreakValue) {
        shortBreakRange.value = shortBreakLength;
        shortBreakValue.textContent = shortBreakLength;
        updateRangeProgress(shortBreakRange);
    }
    
    const longBreakRange = document.getElementById('longBreakRange');
    const longBreakValue = document.getElementById('longBreakValue');
    if (longBreakRange && longBreakValue) {
        longBreakRange.value = longBreakLength;
        longBreakValue.textContent = longBreakLength;
        updateRangeProgress(longBreakRange);
    }
    
    const soundRange = document.getElementById('soundVolumeRange');
    const soundValue = document.getElementById('soundVolumeValue');
    if (soundRange && soundValue) {
        soundRange.value = soundVolume;
        soundValue.textContent = soundVolume;
        updateRangeProgress(soundRange);
    }
    
    const greetingInput = document.getElementById('greetingInput');
    if (greetingInput) {
        greetingInput.value = greeting;
        const greetingElement = document.getElementById('greeting');
        if (greetingElement) {
            greetingElement.textContent = greeting || 'Welcome to Your Universe!';
        }
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
        applyThemeTo3DScene(e.matches ? 'dark' : 'cosmos');
        applyThemeToUI('auto');
    }
});