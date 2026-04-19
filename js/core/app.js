// app.js

/**
 * Cosmic Focus - Main Application Entry Point
 * Handles module loading, initialization, and core app setup
 */

import { isReducedMotion } from '../core/motion.js';
import * as scene3d from '../graphics/scene/scene-manager.js';
import * as timer from '../features/timer.js';
import * as tasks from '../features/tasks.js';
import * as sounds from '../features/sounds.js';
import * as navigation from '../ui/navigation.js';
import * as uiEffects from '../ui/ui-effects.js';
import * as cleanup from '../utils/cleanup.js';
import * as buttonFeel from '../ui/button-feel.js';
import * as keyboard from '../features/keyboard.js';
import * as statistics from '../features/statistics.js';
import * as notificationBanner from '../features/notification-banner.js';
import * as settings from '../ui/settings.js';
import * as soundMixer from '../features/sound-mixer.js';
import * as timerParticles from '../ui/timer-particles.js';
import * as helpCenter from '../ui/help-center.js';
import * as homeMiniTimer from '../ui/home-mini-timer.js';
import * as ambientUI from '../ui/ambient-ui.js';

const modules = {
    scene3d, timer, tasks, sounds, navigation, uiEffects, cleanup,
    buttonFeel, keyboard, statistics, notificationBanner, settings,
    soundMixer, timerParticles, helpCenter, homeMiniTimer, ambientUI,
};

/**
 * Initialize the application
 * Sets up all modules and core functionality
 */
export async function initApp() {
    const loadedModules = modules;

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

        // The orbital progress arc is driven by a --progress custom property
        // (0-100). CSS maps that to stroke-dashoffset. See style.css.
        const setProgress = (pct) => {
            if (loadingProgress) loadingProgress.style.setProperty('--progress', String(pct));
        };

        // Start progress animation immediately
        if (loadingProgress) {
            if (isReducedMotion()) {
                loadingProgress.style.transition = 'none';
                setProgress(100);
            } else {
                setProgress(20);
            }
        }

        // Initialize 3D scene — progress arc tracks actual initialization
        try {
            if (loadedModules.scene3d?.init3D) {
                // Animate progress during init
                if (loadingProgress && !isReducedMotion()) {
                    setTimeout(() => setProgress(50), 200);
                    setTimeout(() => setProgress(75), 600);
                }

                loadedModules.scene3d.init3D().then(success => {
                    if (!success) {
                        console.error('3D scene initialization returned false');
                    }

                    // Scene is ready — complete the progress arc and hide screen
                    setProgress(100);
                    if (container) {
                        container.classList.add('loaded');
                    }

                    if (isReducedMotion()) {
                        if (loadingScreen) {
                            loadingScreen.style.display = 'none';
                        }
                    } else {
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
                    }
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

        // Mixing-deck UI (Phase B) — wires the deck controls, library drawer,
        // save-mix and sleep popovers, and the reactive state bindings.
        if (loadedModules.ambientUI?.initAmbientUI) {
            loadedModules.ambientUI.initAmbientUI();
        }

        // Sound-mixer module still initialised so its CRUD / activateMix()
        // exports are ready by the time the deck UI calls them.
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

        // Help center ? button
        if (loadedModules.helpCenter?.setupHelpButton) {
            loadedModules.helpCenter.setupHelpButton();
        }

        // Home mini timer
        if (loadedModules.homeMiniTimer?.initHomeMiniTimer) {
            loadedModules.homeMiniTimer.initHomeMiniTimer();
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
