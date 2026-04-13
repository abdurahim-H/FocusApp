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
    // Bare paths only — adding ?v= query strings here causes module duplication
    // because static imports inside these files use bare paths, and ES modules
    // are keyed by URL. Hard refresh (Cmd+Shift+R) handles cache freshness.
    const moduleList = [
        { name: 'scene3d', path: '../graphics/scene/scene-manager.js' },
        { name: 'timer', path: '../features/timer.js' },
        { name: 'tasks', path: '../features/tasks.js' },
        { name: 'sounds', path: '../features/sounds.js' },
        { name: 'navigation', path: '../ui/navigation.js' },
        { name: 'uiEffects', path: '../ui/ui-effects.js' },
        { name: 'cleanup', path: '../utils/cleanup.js' },
        { name: 'buttonFeel', path: '../ui/button-feel.js' },
        { name: 'keyboard', path: '../features/keyboard.js' },
        { name: 'statistics', path: '../features/statistics.js' },
        { name: 'notificationBanner', path: '../features/notification-banner.js' },
        { name: 'settings', path: '../ui/settings.js' },
        { name: 'soundMixer', path: '../features/sound-mixer.js' },
        { name: 'timerParticles', path: '../ui/timer-particles.js' }
    ];

    for (const module of moduleList) {
        try {
            modules[module.name] = await import(module.path);
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

    // Initialize cleanup system first
    if (loadedModules.cleanup?.initCleanupSystem) {
        loadedModules.cleanup.initCleanupSystem();
    }

    // Initialize audio system early for better performance
    if (loadedModules.sounds?.initAudioSystem) {
        loadedModules.sounds.initAudioSystem();
    }

    function doInit() {
        const loadingProgress = document.getElementById('loadingProgress');
        const loadingScreen = document.getElementById('loadingScreen');
        const container = document.querySelector('.container');

        // Start progress bar animation immediately
        if (loadingProgress) {
            loadingProgress.style.transition = 'width 0.3s ease';
            loadingProgress.style.width = '20%';
        }

        // Initialize 3D scene — progress bar tracks actual initialization
        try {
            if (loadedModules.scene3d?.init3D) {
                // Animate progress during init
                if (loadingProgress) {
                    setTimeout(() => { loadingProgress.style.width = '50%'; }, 200);
                    setTimeout(() => { loadingProgress.style.width = '75%'; }, 600);
                }

                loadedModules.scene3d.init3D().then(success => {
                    if (!success) {
                        console.error('3D scene initialization returned false');
                    }

                    // Scene is ready — complete the loading bar and hide screen
                    if (loadingProgress) {
                        loadingProgress.style.width = '100%';
                    }
                    if (container) {
                        container.classList.add('loaded');
                    }

                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            if (loadingScreen) {
                                loadingScreen.classList.add('hide');
                                setTimeout(() => {
                                    loadingScreen.style.display = 'none';
                                }, 300);
                            }
                        }, 200);
                    });
                }).catch(err => {
                    console.error('3D initialization error:', err);
                    // Still hide loading screen on error
                    if (loadingScreen) {
                        loadingScreen.classList.add('hide');
                        setTimeout(() => { loadingScreen.style.display = 'none'; }, 300);
                    }
                });
            } else {
                console.error('scene3d module or init3D function not found');
            }
        } catch (error) {
            console.error('3D initialization error:', error);
        }

        // Setup all modules
        if (loadedModules.navigation?.setupNavigation) {
            // Ensure DOM is ready before setting up navigation
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    loadedModules.navigation.setupNavigation();
                });
            } else {
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

        // Phase 5D: sound mixer (presets + per-sound volume sliders)
        if (loadedModules.soundMixer?.initSoundMixer) {
            loadedModules.soundMixer.initSoundMixer();
        }

        if (loadedModules.uiEffects?.initUIEffects) {
            loadedModules.uiEffects.initUIEffects();
        }

        // Phase 2: coordinated button press spring (delegated, app-wide)
        if (loadedModules.buttonFeel?.initButtonFeel) {
            loadedModules.buttonFeel.initButtonFeel();
        }

        // Timer particle effect (experiment — revert if unwanted)
        if (loadedModules.timerParticles?.initTimerParticles) {
            loadedModules.timerParticles.initTimerParticles();
        }

        // Phase 5A: keyboard shortcuts (Space=start/pause, R=reset, 1/2/3=mode, /=input)
        if (loadedModules.keyboard?.initKeyboardShortcuts) {
            loadedModules.keyboard.initKeyboardShortcuts();
        }

        // Phase 5B: statistics tracking
        if (loadedModules.statistics?.initStatistics) {
            loadedModules.statistics.initStatistics();
        }

        // Phase 5E: notification permission banner
        if (loadedModules.notificationBanner?.initNotificationBanner) {
            loadedModules.notificationBanner.initNotificationBanner();
        }

        // Phase 5C: settings panel (load saved settings + wire modal)
        if (loadedModules.settings?.loadSettings) {
            loadedModules.settings.loadSettings();
        }
        if (loadedModules.settings?.setupSettingsModal) {
            loadedModules.settings.setupSettingsModal();
        }
        if (loadedModules.settings?.setupSettingsControls) {
            loadedModules.settings.setupSettingsControls();
        }

        // T3.5: onboarding tour — auto-show on first visit
        import('../ui/settings/onboarding.js').then(mod => mod.maybeShowFirstVisitTour()).catch(() => {});

        // Start core timers and displays
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

        // Phase 1: task globals removed — tasks use signals + delegated events.
        // (Clear-all button is wired inside tasks.initTaskRender.)
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
        document.getElementById('resetSessionBtn').addEventListener('click', function () {
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
    // Task controls — Add button + Enter key. Render & delete are reactive (see tasks.js).
    if (loadedModules.tasks) {
        document.getElementById('addTaskBtn').addEventListener('click', loadedModules.tasks.addTask);
        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loadedModules.tasks.addTask();
        });
        if (loadedModules.tasks.initTaskRender) {
            loadedModules.tasks.initTaskRender();
        }
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

// Initialize the app with performance optimizations
(async function () {
    try {
        // Wait for fonts to load before showing content to prevent layout shift
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        await initApp();
    } catch (error) {
        console.error('App initialization failed:', error);

        // Show container even on error
        const container = document.querySelector('.container');
        if (container) {
            container.classList.add('loaded');
        }

        // Hide loading screen on error
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hide');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 300);
        }

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
