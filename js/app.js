// Main App Module
// Handles initialization, event listeners, and app startup

// Import modules with error handling
let modules = {};

async function loadModules() {
    console.log('🚀 Loading modules...');
    
    try {
        modules.scene3d = await import('./scene3d.js');
        console.log('✅ scene3d loaded');
    } catch (error) {
        console.error('❌ Failed to load scene3d:', error);
    }
    
    try {
        modules.timer = await import('./timer.js');
        console.log('✅ timer loaded');
    } catch (error) {
        console.error('❌ Failed to load timer:', error);
    }
    
    try {
        modules.tasks = await import('./tasks.js');
        console.log('✅ tasks loaded');
    } catch (error) {
        console.error('❌ Failed to load tasks:', error);
    }
    
    try {
        modules.sounds = await import('./sounds.js');
        console.log('✅ sounds loaded');
    } catch (error) {
        console.error('❌ Failed to load sounds:', error);
    }
    
    try {
        modules.settings = await import('./settings.js');
        console.log('✅ settings loaded');
    } catch (error) {
        console.error('❌ Failed to load settings:', error);
    }
    
    try {
        modules.navigation = await import('./navigation.js');
        console.log('✅ navigation loaded');
    } catch (error) {
        console.error('❌ Failed to load navigation:', error);
    }
    
    try {
        modules.uiEffects = await import('./ui-effects.js');
        console.log('✅ ui-effects loaded');
    } catch (error) {
        console.error('❌ Failed to load ui-effects:', error);
    }
    
    try {
        modules.cleanup = await import('./cleanup.js');
        console.log('✅ cleanup loaded');
    } catch (error) {
        console.error('❌ Failed to load cleanup:', error);
    }
    
    console.log('🚀 Module loading complete');
    return modules;
}

// Initialize the application
export async function initApp() {
    console.log('🚀 App initialization starting...');
    
    // Load all modules first
    const loadedModules = await loadModules();
    
    try {
        // Initialize cleanup system first
        if (loadedModules.cleanup?.initCleanupSystem) {
            loadedModules.cleanup.initCleanupSystem();
            console.log('✅ Cleanup system initialized');
        } else {
            console.warn('⚠️ Cleanup system not available');
        }
    } catch (error) {
        console.error('❌ Error initializing cleanup system:', error);
    }
    
    function doInit() {
        console.log('🚀 Running main initialization...');
        
        try {
            // Hide loading screen
            setTimeout(() => {
                console.log('🚀 Starting loading screen timeout...');
                const loadingProgress = document.getElementById('loadingProgress');
                const loadingScreen = document.getElementById('loadingScreen');
                
                if (loadingProgress) {
                    loadingProgress.style.width = '100%';
                    console.log('✅ Loading progress set to 100%');
                } else {
                    console.error('❌ Loading progress element not found');
                }
                
                setTimeout(() => {
                    if (loadingScreen) {
                        loadingScreen.classList.add('hide');
                        console.log('✅ Loading screen hidden');
                        
                        // Properly hide after transition completes
                        setTimeout(() => {
                            loadingScreen.style.display = 'none';
                        }, 500);
                    } else {
                        console.error('❌ Loading screen element not found');
                    }
                }, 500);
            }, 1000);
        } catch (error) {
            console.error('❌ Error in loading screen logic:', error);
        }

        try {
            // Initialize 3D scene with error handling
            console.log('🚀 Initializing 3D scene...');
            if (loadedModules.scene3d?.init3D) {
                const scene3DInitialized = loadedModules.scene3d.init3D();
                if (!scene3DInitialized) {
                    console.warn('3D scene initialization failed, continuing with 2D fallback');
                } else {
                    console.log('✅ 3D scene initialized successfully');
                }
            } else {
                console.warn('⚠️ 3D scene module not available');
            }
        } catch (error) {
            console.error('❌ Error initializing 3D scene:', error);
        }

        // Setup all modules
        if (loadedModules.navigation?.setupNavigation) {
            loadedModules.navigation.setupNavigation();
            console.log('✅ Navigation setup complete');
        }
        
        setupTimerControls(loadedModules);
        setupTaskControls(loadedModules);
        
        if (loadedModules.sounds?.setupAmbientControls) {
            loadedModules.sounds.setupAmbientControls();
            console.log('✅ Ambient controls setup complete');
        }
        
        console.log('🚀 Setting up settings...');
        if (loadedModules.settings?.setupSettingsModal) {
            loadedModules.settings.setupSettingsModal();
            loadedModules.settings.setupSettingsControls();
            console.log('✅ Settings setup complete');
        }
        
        // Load saved settings including theme
        console.log('🚀 Loading settings...');
        if (loadedModules.settings?.loadSettings) {
            loadedModules.settings.loadSettings();
            console.log('✅ Settings loaded');
        }
        
        // Add global theme testing function for debugging
        window.testThemeSwitch = function(theme) {
            console.log('🎨 Global theme test:', theme);
            import('./settings.js').then(({ setTheme }) => {
                setTheme(theme);
            });
        };
        
        console.log('🎨 Theme testing: Use testThemeSwitch("light"|"dark"|"auto") in console');
        
        // Initialize UI effects system
        if (loadedModules.uiEffects?.initUIEffects) {
            loadedModules.uiEffects.initUIEffects();
            console.log('✅ UI effects initialized');
        }

        // Start breathing animation
        if (loadedModules.timer?.startBreathing) {
            loadedModules.timer.startBreathing();
            console.log('✅ Breathing animation started');
        }

        // Initialize stats and displays
        if (loadedModules.timer?.updateUniverseStats) {
            loadedModules.timer.updateUniverseStats();
            console.log('✅ Universe stats updated');
        }
        
        if (loadedModules.timer?.updateDateTime) {
            loadedModules.timer.updateDateTime();
            console.log('✅ Date/time updated');
        }
        
        if (loadedModules.timer?.updateTimerDisplay) {
            loadedModules.timer.updateTimerDisplay();
            console.log('✅ Timer display updated');
        }

        // Make functions globally accessible for HTML onclick handlers
        if (loadedModules.tasks?.toggleTask) {
            window.toggleTask = loadedModules.tasks.toggleTask;
        }
        if (loadedModules.tasks?.deleteTask) {
            window.deleteTask = loadedModules.tasks.deleteTask;
        }
        
        console.log('🚀 App initialization complete!');
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        doInit();
    }
}

function setupTimerControls(loadedModules) {
    // Timer controls - use modules to access timer functions
    if (loadedModules.timer) {
        document.getElementById('startBtn').addEventListener('click', loadedModules.timer.startTimer);
        document.getElementById('pauseBtn').addEventListener('click', loadedModules.timer.pauseTimer);
        document.getElementById('resetBtn').addEventListener('click', loadedModules.timer.resetTimer);
        document.getElementById('skipBtn').addEventListener('click', loadedModules.timer.skipBreak);
        console.log('✅ Timer controls setup complete');
    } else {
        console.error('❌ Timer module not available for controls setup');
    }
    
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

function setupTaskControls(loadedModules) {
    // Task controls - use modules to access task functions
    if (loadedModules.tasks) {
        document.getElementById('addTaskBtn').addEventListener('click', loadedModules.tasks.addTask);
        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loadedModules.tasks.addTask();
        });
        console.log('✅ Task controls setup complete');
    } else {
        console.error('❌ Tasks module not available for controls setup');
    }
}

// Initialize the app
(async function() {
    console.log('🚀 Starting app initialization...');
    
    // First, hide the loading screen quickly to show the UI
    setTimeout(() => {
        console.log('🚀 Quick loading screen removal...');
        const loadingScreen = document.getElementById('loadingScreen');
        const loadingProgress = document.getElementById('loadingProgress');
        
        if (loadingProgress) {
            loadingProgress.style.width = '100%';
        }
        
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                console.log('✅ Loading screen hidden');
            }, 500);
        }
    }, 500);
    
    // Then try to initialize the full app
    try {
        await initApp();
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        console.log('🚀 Continuing with basic functionality...');
        
        // Basic date/time update
        function updateDateTime() {
            const now = new Date();
            const dateTimeEl = document.getElementById('dateTime');
            if (dateTimeEl) {
                dateTimeEl.textContent = now.toLocaleString();
            }
        }
        
        setInterval(updateDateTime, 1000);
        updateDateTime();
    }
})();
