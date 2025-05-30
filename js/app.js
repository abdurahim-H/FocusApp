// Main App Module
// Handles initialization, event listeners, and app startup

import { init3D } from './scene3d.js';
import { startTimer, pauseTimer, resetTimer, skipBreak, updateTimerDisplay, updateUniverseStats, updateDateTime, startBreathing } from './timer.js';
import { addTask, toggleTask, deleteTask } from './tasks.js';
import { setupAmbientControls } from './sounds.js';
import { setupSettingsModal, setupSettingsControls, loadSettings } from './settings.js';
import { setupNavigation } from './navigation.js';
import { initUIEffects } from './ui-effects.js';
import { initCleanupSystem } from './cleanup.js';

// Initialize the application
export function initApp() {
    console.log('🚀 App initialization starting...');
    
    // Initialize cleanup system first
    initCleanupSystem();
    
    function doInit() {
        console.log('🚀 Running main initialization...');
        
        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loadingProgress').style.width = '100%';
            setTimeout(() => {
                document.getElementById('loadingScreen').classList.add('hide');
            }, 500);
        }, 1000);

        // Initialize 3D scene with error handling
        const scene3DInitialized = init3D();
        if (!scene3DInitialized) {
            console.warn('3D scene initialization failed, continuing with 2D fallback');
        }

        // Setup all modules
        setupNavigation();
        setupTimerControls();
        setupTaskControls();
        setupAmbientControls();
        
        console.log('🚀 Setting up settings...');
        setupSettingsModal();
        setupSettingsControls();
        
        // Load saved settings including theme
        console.log('🚀 Loading settings...');
        loadSettings();
        
        // Add global theme testing function for debugging
        window.testThemeSwitch = function(theme) {
            console.log('🎨 Global theme test:', theme);
            import('./settings.js').then(({ setTheme }) => {
                setTheme(theme);
            });
        };
        
        console.log('🎨 Theme testing: Use testThemeSwitch("light"|"dark"|"auto") in console');
        
        // Initialize UI effects system
        initUIEffects();

        // Start breathing animation
        startBreathing();

        // Initialize stats and displays
        updateUniverseStats();
        updateDateTime();
        updateTimerDisplay();

        // Make functions globally accessible for HTML onclick handlers
        window.toggleTask = toggleTask;
        window.deleteTask = deleteTask;
        
        console.log('🚀 App initialization complete!');
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        doInit();
    }
}

function setupTimerControls() {
    // Timer controls
    document.getElementById('startBtn').addEventListener('click', startTimer);
    document.getElementById('pauseBtn').addEventListener('click', pauseTimer);
    document.getElementById('resetBtn').addEventListener('click', resetTimer);
    document.getElementById('skipBtn').addEventListener('click', skipBreak);
    
    // Theme debug button (temporary)
    const themeDebugBtn = document.getElementById('themeDebugBtn');
    if (themeDebugBtn) {
        let currentDebugTheme = 0;
        const themes = ['auto', 'light', 'dark'];
        
        themeDebugBtn.addEventListener('click', () => {
            currentDebugTheme = (currentDebugTheme + 1) % themes.length;
            const theme = themes[currentDebugTheme];
            console.log('🎨 Debug: Switching to theme:', theme);
            
            // Import and use setTheme function
            import('./settings.js').then(({ setTheme }) => {
                setTheme(theme);
            });
        });
    }
}

function setupTaskControls() {
    // Task controls
    document.getElementById('addTaskBtn').addEventListener('click', addTask);
    document.getElementById('taskInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
}

// Initialize the app
initApp();
