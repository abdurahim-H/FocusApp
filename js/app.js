// app.js

/**
 * Cosmic Focus - Main Application Entry Point
 * Handles module loading, initialization, and core app setup
 */

let modules = {};

/**
 * Dynamically loads all application modules
 * @returns {Object} Loaded modules object
 */
async function loadModules() {
    const moduleList = [
        { name: 'scene3d', path: './scene3d.js' },
        { name: 'timer', path: './timer.js' },
        { name: 'tasks', path: './tasks.js' },
        { name: 'sounds', path: './sounds.js' },
        { name: 'settings', path: './settings.js' },
        { name: 'navigation', path: './navigation.js' },
        { name: 'uiEffects', path: './ui-effects.js' },
        { name: 'cleanup', path: './cleanup.js' },
        { name: 'notifications', path: './notifications.js' }
    ];

    for (const module of moduleList) {
        try {
            console.log(`Loading module: ${module.name} from ${module.path}`);
            modules[module.name] = await import(module.path);
            console.log(`✓ Successfully loaded module: ${module.name}`);
        } catch (error) {
            console.error(`✗ Failed to load module ${module.name}:`, error);
        }
    }

    return modules;
}

/**
 * Initialize the application
 * Sets up all modules and core functionality
 */
export async function initApp() {
    const loadedModules = await loadModules();
    
    // Initialize performance monitor first and make it globally available
    if (loadedModules.performanceMonitor?.performanceMonitor) {
        window.performanceMonitor = loadedModules.performanceMonitor.performanceMonitor;
        console.log('✓ Performance monitor initialized and available globally');
    }
    
    // Initialize adaptive quality system
    if (loadedModules.adaptiveQuality?.adaptiveQuality) {
        window.adaptiveQuality = loadedModules.adaptiveQuality.adaptiveQuality;
        console.log('✓ Adaptive quality system initialized');
    }
    
    // Initialize cleanup system first
    if (loadedModules.cleanup?.initCleanupSystem) {
        loadedModules.cleanup.initCleanupSystem();
    }
    
    // Initialize audio system early for better performance
    if (loadedModules.sounds?.initAudioSystem) {
        loadedModules.sounds.initAudioSystem();
    }
    
    function doInit() {
        // Initialize 3D scene after a slight delay to ensure layout stability
        setTimeout(() => {
            try {
                if (loadedModules.scene3d?.init3D) {
                    console.log('Initializing 3D scene...');
                    loadedModules.scene3d.init3D();
                    console.log('3D scene initialized successfully');
                } else {
                    console.error('scene3d module or init3D function not found');
                }
            } catch (error) {
                console.error('3D initialization error:', error);
            }
        }, 100); // Small delay to ensure layout is stable

        // Setup all modules
        console.log('Setting up navigation module...');
        if (loadedModules.navigation?.setupNavigation) {
            // Ensure DOM is ready before setting up navigation
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    console.log('DOM ready, setting up navigation');
                    loadedModules.navigation.setupNavigation();
                });
            } else {
                console.log('DOM already ready, setting up navigation immediately');
                loadedModules.navigation.setupNavigation();
            }
        } else {
            console.error('Navigation module or setupNavigation function not found');
        }
        
        setupTimerControls(loadedModules);
        setupTaskControls(loadedModules);
        
        if (loadedModules.sounds?.setupAmbientControls) {
            loadedModules.sounds.setupAmbientControls();
        }
        
		if (loadedModules.settings?.setupSettingsModal) {
			loadedModules.settings.setupSettingsModal();
			loadedModules.settings.setupSettingsControls();
			
			// Initialize iOS water enhancements
			setTimeout(() => {
				console.log('🚀 Initializing iOS water settings...');
				// The iOS enhancements will auto-initialize when settings modal opens
			}, 500);
		}
        
        if (loadedModules.settings?.loadSettings) {
            loadedModules.settings.loadSettings();
        }
        
        // Initialize notifications system
        if (loadedModules.notifications?.initNotifications) {
            loadedModules.notifications.initNotifications();
            
            // Show notification prompt after a delay (for better UX)
            setTimeout(() => {
                if (loadedModules.notifications?.showNotificationPrompt) {
                    loadedModules.notifications.showNotificationPrompt();
                }
            }, 5000); // 5 seconds after app load
        }
        
        if (loadedModules.uiEffects?.initUIEffects) {
            loadedModules.uiEffects.initUIEffects();
        }

        // Initialize water container effects
        if (loadedModules.uiEffects?.initWaterContainerEffects) {
            loadedModules.uiEffects.initWaterContainerEffects();
        }

        // Start core timers and displays
        if (loadedModules.timer?.startBreathing) {
            loadedModules.timer.startBreathing();
        }

        if (loadedModules.timer?.updateUniverseStats) {
            loadedModules.timer.updateUniverseStats();
        }
        
        if (loadedModules.timer?.updateDateTime) {
            loadedModules.timer.updateDateTime();
        }
        
        if (loadedModules.timer?.updateTimerDisplay) {
            loadedModules.timer.updateTimerDisplay();
        }

        if (loadedModules.timer?.updateSessionDisplay) {
            loadedModules.timer.updateSessionDisplay();
        }

        // Make task functions globally accessible
        if (loadedModules.tasks?.toggleTask) {
            window.toggleTask = loadedModules.tasks.toggleTask;
        }
        if (loadedModules.tasks?.deleteTask) {
            window.deleteTask = loadedModules.tasks.deleteTask;
        }
        if (loadedModules.tasks?.addTask) {
            window.addTask = loadedModules.tasks.addTask;
        }
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
        document.getElementById('skipBreakBtn').addEventListener('click', loadedModules.timer.skipBreak);
        document.getElementById('skipFocusBtn').addEventListener('click', loadedModules.timer.skipFocus);
        
        // Enhanced reset session button with click animation
        document.getElementById('resetSessionBtn').addEventListener('click', function() {
            const btn = this;
            btn.classList.add('clicked');
            loadedModules.timer.resetSession();
            
            // Remove animation class after animation completes
            setTimeout(() => {
                btn.classList.remove('clicked');
            }, 600);
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
    }
}

// Add keyboard shortcut for performance dashboard
document.addEventListener('keydown', (event) => {
    // Ctrl+P to toggle performance dashboard
    if (event.ctrlKey && event.key === 'p') {
        event.preventDefault();
        if (window.performanceDashboard) {
            window.performanceDashboard.toggle();
        }
    }
});

// Pre-stabilize container positions before any dynamic loading
function stabilizeContainerLayout() {
    const containers = document.querySelectorAll('.water-cosmic-container');
    containers.forEach(container => {
        // Force layout calculation and lock position
        const rect = container.getBoundingClientRect();
        container.style.willChange = 'auto'; // Reduce reflow triggers
        container.style.transform = 'translateZ(0)'; // Hardware acceleration
    });
    
    // Pre-populate dynamic content placeholders to prevent layout shifts
    const dateTimeEl = document.getElementById('dateTime');
    if (dateTimeEl && !dateTimeEl.textContent.trim()) {
        // Set temporary placeholder to maintain layout
        dateTimeEl.textContent = new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    const breathingGuide = document.getElementById('breathingGuide');
    if (breathingGuide && !breathingGuide.textContent.trim()) {
        breathingGuide.textContent = 'Breathe In...';
    }
    
    console.log('Container layout stabilized');
}

// Initialize the app with performance optimizations
(async function() {
    // Immediately stabilize layout on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', stabilizeContainerLayout);
    } else {
        stabilizeContainerLayout();
    }
    
    // Show faster loading progression - SINGLE loading screen hide sequence
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        const loadingProgress = document.getElementById('loadingProgress');
        
        if (loadingProgress) {
            loadingProgress.style.width = '100%';
        }
        
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 300); // Allow for fade transition
        }
    }, 1200); // Increased time to ensure layout is stable first
    
    try {
        await initApp();
    } catch (error) {
        console.error('App initialization failed:', error);
        
        // Basic date/time update fallback
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
