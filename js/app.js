/**
 * Cosmic Focus - Main Application Entry Point
 * Enhanced with Babylon.js integration and stunning visual effects
 */

let modules = {};
let sceneInitialized = false;
let loadingProgress = 0;

/**
 * Create cosmic loading animation with Babylon.js
 */
function createLoadingAnimation() {
    const canvas = document.getElementById('renderCanvas');
    const loadingEngine = new BABYLON.Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        antialias: true
    });
    
    const loadingScene = new BABYLON.Scene(loadingEngine);
    loadingScene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
    
    // Create loading camera
    const camera = new BABYLON.FreeCamera("loadingCamera", new BABYLON.Vector3(0, 0, -10), loadingScene);
    camera.setTarget(BABYLON.Vector3.Zero());
    
    // Create cosmic particle system for loading
    const particleSystem = new BABYLON.ParticleSystem("loadingParticles", 2000, loadingScene);
    particleSystem.particleTexture = new BABYLON.Texture("https://raw.githubusercontent.com/BabylonJS/Babylon.js/master/assets/textures/flare.png", loadingScene);
    
    // Emitter
    const fountain = BABYLON.MeshBuilder.CreateBox("fountain", {size: 0.1}, loadingScene);
    fountain.visibility = 0;
    particleSystem.emitter = fountain;
    
    // Particle settings
    particleSystem.minEmitBox = new BABYLON.Vector3(-8, -8, -8);
    particleSystem.maxEmitBox = new BABYLON.Vector3(8, 8, 8);
    
    particleSystem.color1 = new BABYLON.Color4(0.7, 0.8, 1.0, 1.0);
    particleSystem.color2 = new BABYLON.Color4(0.2, 0.5, 1.0, 1.0);
    particleSystem.colorDead = new BABYLON.Color4(0, 0, 0.2, 0.0);
    
    particleSystem.minSize = 0.1;
    particleSystem.maxSize = 0.5;
    
    particleSystem.minLifeTime = 2;
    particleSystem.maxLifeTime = 3.5;
    
    particleSystem.emitRate = 500;
    
    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
    
    particleSystem.gravity = new BABYLON.Vector3(0, 0, 0);
    
    particleSystem.direction1 = new BABYLON.Vector3(-1, 8, 1);
    particleSystem.direction2 = new BABYLON.Vector3(1, 8, -1);
    
    particleSystem.minAngularSpeed = 0;
    particleSystem.maxAngularSpeed = Math.PI;
    
    particleSystem.minEmitPower = 1;
    particleSystem.maxEmitPower = 3;
    particleSystem.updateSpeed = 0.025;
    
    particleSystem.start();
    
    // Create loading progress visualization
    const progressRing = BABYLON.MeshBuilder.CreateTorus("progressRing", {
        diameter: 4,
        thickness: 0.2,
        tessellation: 64
    }, loadingScene);
    
    const progressMaterial = new BABYLON.StandardMaterial("progressMat", loadingScene);
    progressMaterial.emissiveColor = new BABYLON.Color3(0.4, 0.6, 1);
    progressMaterial.alpha = 0.8;
    progressRing.material = progressMaterial;
    
    // Animate loading
    let time = 0;
    loadingEngine.runRenderLoop(() => {
        time += 0.01;
        progressRing.rotation.x += 0.01;
        progressRing.rotation.y += 0.02;
        progressRing.scaling = new BABYLON.Vector3(
            1 + Math.sin(time) * 0.1,
            1 + Math.sin(time) * 0.1,
            1 + Math.sin(time) * 0.1
        );
        
        // Update material based on progress
        const progress = loadingProgress / 100;
        progressMaterial.emissiveColor = new BABYLON.Color3(
            0.4 + progress * 0.6,
            0.6 - progress * 0.1,
            1 - progress * 0.5
        );
        
        loadingScene.render();
    });
    
    return { engine: loadingEngine, scene: loadingScene };
}

/**
 * Enhanced module loading with progress tracking
 */
async function loadModules() {
    const moduleList = [
        { name: 'cleanup', path: './cleanup.js', weight: 5 },
        { name: 'state', path: './state.js', weight: 5 },
        { name: 'scene3d', path: './scene3d.js', weight: 25 },
        { name: 'blackhole', path: './blackhole.js', weight: 15 },
        { name: 'galaxy', path: './galaxy.js', weight: 10 },
        { name: 'timer', path: './timer.js', weight: 10 },
        { name: 'tasks', path: './tasks.js', weight: 5 },
        { name: 'sounds', path: './sounds.js', weight: 5 },
        { name: 'settings', path: './settings.js', weight: 5 },
        { name: 'cosmicSettings', path: './cosmic-settings.js', weight: 5 },
        { name: 'navigation', path: './navigation.js', weight: 5 },
        { name: 'uiEffects', path: './ui-effects.js', weight: 5 }
    ];

    let currentProgress = 0;
    const totalWeight = moduleList.reduce((sum, mod) => sum + mod.weight, 0);

    for (const module of moduleList) {
        try {
            modules[module.name] = await import(module.path);
            currentProgress += module.weight;
            loadingProgress = (currentProgress / totalWeight) * 100;
            updateLoadingBar(loadingProgress);
        } catch (error) {
            console.warn(`Failed to load module ${module.name}:`, error);
            currentProgress += module.weight;
            loadingProgress = (currentProgress / totalWeight) * 100;
            updateLoadingBar(loadingProgress);
        }
    }

    return modules;
}

/**
 * Update loading bar with cosmic effect
 */
function updateLoadingBar(progress) {
    const loadingProgressEl = document.getElementById('loadingProgress');
    if (loadingProgressEl) {
        loadingProgressEl.style.width = `${progress}%`;
        
        // Add glow effect as progress increases
        const glowIntensity = progress / 100;
        loadingProgressEl.style.boxShadow = `
            0 0 ${10 + glowIntensity * 20}px rgba(99, 102, 241, ${0.5 + glowIntensity * 0.5}),
            inset 0 0 ${5 + glowIntensity * 10}px rgba(6, 214, 160, ${0.3 + glowIntensity * 0.3})
        `;
    }
}

/**
 * Initialize the application with enhanced visual transitions
 */
export async function initApp() {
    // Start loading animation
    let loadingAnimation = null;
    try {
        loadingAnimation = createLoadingAnimation();
    } catch (error) {
        console.warn('Could not create loading animation:', error);
    }
    
    const loadedModules = await loadModules();
    
    // Initialize cleanup system first
    if (loadedModules.cleanup?.initCleanupSystem) {
        loadedModules.cleanup.initCleanupSystem();
        loadedModules.cleanup.enableAggressiveTracking();
    }
    
    // Initialize audio system early for better performance
    if (loadedModules.sounds?.initAudioSystem) {
        loadedModules.sounds.initAudioSystem();
    }
    
    function doInit() {
        // Spectacular loading screen transition
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            
            if (loadingAnimation) {
                // Final burst effect
                createLoadingBurst(loadingAnimation.scene);
                
                setTimeout(() => {
                    loadingAnimation.engine.stopRenderLoop();
                    loadingAnimation.scene.dispose();
                    loadingAnimation.engine.dispose();
                }, 1000);
            }
            
            if (loadingScreen) {
                loadingScreen.classList.add('cosmic-fade-out');
                
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    // Initialize main 3D scene after loading completes
                    initializeMainScene(loadedModules);
                }, 1000);
            }
        }, 1500);

        // Setup all modules
        setupApplicationModules(loadedModules);
        
        // Add cosmic entrance animation to main content
        addCosmicEntranceAnimation();
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit);
    } else {
        doInit();
    }
}

/**
 * Create loading burst effect
 */
function createLoadingBurst(scene) {
    const burst = new BABYLON.ParticleSystem("burst", 1000, scene);
    burst.particleTexture = new BABYLON.Texture("https://raw.githubusercontent.com/BabylonJS/Babylon.js/master/assets/textures/flare.png", scene);
    
    const emitter = BABYLON.MeshBuilder.CreateBox("burstEmitter", {size: 0.1}, scene);
    emitter.visibility = 0;
    burst.emitter = emitter;
    
    burst.minEmitBox = new BABYLON.Vector3(0, 0, 0);
    burst.maxEmitBox = new BABYLON.Vector3(0, 0, 0);
    
    burst.color1 = new BABYLON.Color4(1, 1, 1, 1);
    burst.color2 = new BABYLON.Color4(0.4, 0.6, 1, 1);
    burst.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    
    burst.minSize = 0.1;
    burst.maxSize = 1;
    
    burst.minLifeTime = 0.5;
    burst.maxLifeTime = 1.5;
    
    burst.emitRate = 1000;
    burst.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
    
    burst.direction1 = new BABYLON.Vector3(-1, -1, -1);
    burst.direction2 = new BABYLON.Vector3(1, 1, 1);
    
    burst.minEmitPower = 5;
    burst.maxEmitPower = 10;
    
    burst.start();
    
    setTimeout(() => burst.stop(), 100);
}

/**
 * Initialize main 3D scene with enhanced features
 */
function initializeMainScene(loadedModules) {
    try {
        if (loadedModules.scene3d?.init3D) {
            const success = loadedModules.scene3d.init3D();
            if (success) {
                sceneInitialized = true;
                
                // Add performance monitoring
                if (window.engine && window.scene) {
                    setupPerformanceMonitoring();
                }
            }
        }
    } catch (error) {
        console.error('Failed to initialize 3D scene:', error);
        fallbackToBasicMode();
    }
}

/**
 * Setup all application modules
 */
function setupApplicationModules(loadedModules) {
    if (loadedModules.navigation?.setupNavigation) {
        loadedModules.navigation.setupNavigation();
    }
    
    setupTimerControls(loadedModules);
    setupTaskControls(loadedModules);
    
    if (loadedModules.sounds?.setupAmbientControls) {
        loadedModules.sounds.setupAmbientControls();
    }
    
    // Use cosmic settings if available, fallback to regular settings
    if (loadedModules.cosmicSettings?.setupCosmicSettingsModal) {
        loadedModules.cosmicSettings.setupCosmicSettingsModal();
        loadedModules.cosmicSettings.initCosmicSettings();
    } else if (loadedModules.settings?.setupSettingsModal) {
        loadedModules.settings.setupSettingsModal();
        loadedModules.settings.setupSettingsControls();
    }
    
    if (loadedModules.settings?.loadSettings) {
        loadedModules.settings.loadSettings();
    }
    
    if (loadedModules.uiEffects?.initUIEffects) {
        loadedModules.uiEffects.initUIEffects();
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
        setInterval(() => loadedModules.timer.updateDateTime(), 60000);
    }
    
    if (loadedModules.timer?.updateTimerDisplay) {
        loadedModules.timer.updateTimerDisplay();
    }

    if (loadedModules.timer?.updateSessionDisplay) {
        loadedModules.timer.updateSessionDisplay();
    }

    // Make functions globally accessible
    window.toggleTask = loadedModules.tasks?.toggleTask;
    window.deleteTask = loadedModules.tasks?.deleteTask;
    window.animate = loadedModules.scene3d?.animate;
}

/**
 * Add cosmic entrance animation to main content
 */
function addCosmicEntranceAnimation() {
    const container = document.querySelector('.container');
    if (container) {
        container.classList.add('cosmic-entrance');
        
        // Stagger animations for child elements
        const elements = container.querySelectorAll('.mode, .nav, .settings-btn, .progress-3d');
        elements.forEach((el, index) => {
            el.style.animationDelay = `${index * 0.1}s`;
            el.classList.add('cosmic-entrance-item');
        });
    }
}

/**
 * Setup performance monitoring
 */
function setupPerformanceMonitoring() {
    if (!window.engine || !window.scene) return;
    
    let frameCount = 0;
    let lastTime = performance.now();
    
    const performanceMonitor = () => {
        frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - lastTime >= 1000) {
            const fps = window.engine.getFps();
            const drawCalls = window.engine.drawCalls;
            
            // Adjust quality based on performance
            if (fps < 30 && frameCount > 60) {
                adjustQualitySettings('low');
            } else if (fps > 50) {
                adjustQualitySettings('high');
            }
            
            frameCount = 0;
            lastTime = currentTime;
        }
        
        if (modules.cleanup?.trackRequestAnimationFrame) {
            modules.cleanup.trackRequestAnimationFrame(performanceMonitor);
        } else {
            requestAnimationFrame(performanceMonitor);
        }
    };
    
    performanceMonitor();
}

/**
 * Adjust rendering quality based on performance
 */
function adjustQualitySettings(quality) {
    if (!window.scene?.postProcessing) return;
    
    const { pipeline, glowLayer } = window.scene.postProcessing;
    
    switch (quality) {
        case 'low':
            pipeline.samples = 2;
            pipeline.bloomEnabled = false;
            pipeline.chromaticAberrationEnabled = false;
            glowLayer.blurKernelSize = 32;
            break;
        case 'high':
            pipeline.samples = 4;
            pipeline.bloomEnabled = true;
            pipeline.chromaticAberrationEnabled = true;
            glowLayer.blurKernelSize = 64;
            break;
    }
}

/**
 * Fallback to basic mode if 3D fails
 */
function fallbackToBasicMode() {
    console.log('Falling back to basic mode');
    document.body.classList.add('basic-mode');
    
    // Hide 3D canvas
    const canvas = document.getElementById('renderCanvas');
    if (canvas) canvas.style.display = 'none';
    
    // Add fallback background
    document.body.style.background = 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)';
}

/**
 * Enhanced timer controls with visual feedback
 */
function setupTimerControls(loadedModules) {
    if (loadedModules.timer) {
        document.getElementById('startBtn').addEventListener('click', loadedModules.timer.startTimer);
        document.getElementById('pauseBtn').addEventListener('click', loadedModules.timer.pauseTimer);
        document.getElementById('resetBtn').addEventListener('click', loadedModules.timer.resetTimer);
        document.getElementById('skipBreakBtn').addEventListener('click', loadedModules.timer.skipBreak);
        document.getElementById('skipFocusBtn').addEventListener('click', loadedModules.timer.skipFocus);
        
        // Add visual feedback to all timer buttons
        const timerButtons = ['startBtn', 'pauseBtn', 'resetBtn', 'skipBreakBtn', 'skipFocusBtn'];
        timerButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', function() {
                    createButtonRipple(this);
                });
            }
        });
        
        // Enhanced reset session button with cosmic animation
        const resetSessionBtn = document.getElementById('resetSessionBtn');
        if (resetSessionBtn) {
            resetSessionBtn.addEventListener('click', function() {
                this.classList.add('cosmic-reset');
                createCosmicResetEffect();
                loadedModules.timer.resetSession();
                
                setTimeout(() => {
                    this.classList.remove('cosmic-reset');
                }, 1000);
            });
        }
    }
}

/**
 * Create button ripple effect
 */
function createButtonRipple(button) {
    const ripple = document.createElement('span');
    ripple.className = 'button-ripple';
    button.appendChild(ripple);
    
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = event.clientX - rect.left - size / 2 + 'px';
    ripple.style.top = event.clientY - rect.top - size / 2 + 'px';
    
    setTimeout(() => ripple.remove(), 600);
}

/**
 * Create cosmic reset effect in the 3D scene
 */
function createCosmicResetEffect() {
    if (!window.scene || !sceneInitialized) return;
    
    // Create a temporary shockwave mesh
    const shockwave = BABYLON.MeshBuilder.CreateDisc("shockwave", {
        radius: 1,
        tessellation: 64
    }, window.scene);
    
    const shockwaveMaterial = new BABYLON.StandardMaterial("shockwaveMat", window.scene);
    shockwaveMaterial.emissiveColor = new BABYLON.Color3(0, 1, 1);
    shockwaveMaterial.alpha = 0.8;
    shockwaveMaterial.backFaceCulling = false;
    
    shockwave.material = shockwaveMaterial;
    shockwave.rotation.x = Math.PI / 2;
    shockwave.position.y = 0;
    
    // Animate shockwave
    let scale = 1;
    const shockwaveAnimation = () => {
        scale += 2;
        shockwave.scaling = new BABYLON.Vector3(scale, scale, scale);
        shockwaveMaterial.alpha *= 0.92;
        
        if (shockwaveMaterial.alpha > 0.01) {
            requestAnimationFrame(shockwaveAnimation);
        } else {
            shockwave.dispose();
        }
    };
    
    shockwaveAnimation();
}

/**
 * Enhanced task controls with animations
 */
function setupTaskControls(loadedModules) {
    if (loadedModules.tasks) {
        const addTaskBtn = document.getElementById('addTaskBtn');
        const taskInput = document.getElementById('taskInput');
        
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', function() {
                createButtonRipple(this);
                loadedModules.tasks.addTask();
            });
        }
        
        if (taskInput) {
            taskInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    createButtonRipple(addTaskBtn);
                    loadedModules.tasks.addTask();
                }
            });
            
            // Add cosmic glow on focus
            taskInput.addEventListener('focus', function() {
                this.parentElement.classList.add('cosmic-focus');
            });
            
            taskInput.addEventListener('blur', function() {
                this.parentElement.classList.remove('cosmic-focus');
            });
        }
    }
}

// Add CSS for new animations
const style = document.createElement('style');
style.textContent = `
    .cosmic-fade-out {
        animation: cosmicFadeOut 1s ease-out forwards;
    }
    
    @keyframes cosmicFadeOut {
        0% { opacity: 1; filter: blur(0px); }
        50% { opacity: 0.5; filter: blur(2px); }
        100% { opacity: 0; filter: blur(10px); transform: scale(1.1); }
    }
    
    .cosmic-entrance {
        animation: cosmicEntrance 1.5s ease-out;
    }
    
    @keyframes cosmicEntrance {
        0% { opacity: 0; transform: translateY(30px) scale(0.95); }
        50% { opacity: 0.7; transform: translateY(10px) scale(0.98); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    
    .cosmic-entrance-item {
        opacity: 0;
        animation: cosmicEntranceItem 0.8s ease-out forwards;
    }
    
    @keyframes cosmicEntranceItem {
        0% { opacity: 0; transform: translateY(20px); }
        100% { opacity: 1; transform: translateY(0); }
    }
    
    .button-ripple {
        position: absolute;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%);
        transform: scale(0);
        animation: rippleEffect 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes rippleEffect {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .cosmic-reset {
        animation: cosmicResetPulse 1s ease-out;
    }
    
    @keyframes cosmicResetPulse {
        0% { transform: scale(1) rotate(0deg); }
        25% { transform: scale(1.2) rotate(90deg); }
        50% { transform: scale(1.1) rotate(180deg); }
        75% { transform: scale(1.05) rotate(270deg); }
        100% { transform: scale(1) rotate(360deg); }
    }
    
    .cosmic-focus {
        box-shadow: 0 0 30px rgba(6, 214, 160, 0.4);
        border-color: var(--accent) !important;
    }
    
    .basic-mode .container {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
    }
`;
document.head.appendChild(style);

// Initialize the app with enhanced error handling
(async function() {
    try {
        await initApp();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        fallbackToBasicMode();
        
        // Basic functionality
        function updateDateTime() {
            const now = new Date();
            const dateTimeEl = document.getElementById('dateTime');
            if (dateTimeEl) {
                dateTimeEl.textContent = now.toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        }
        
        setInterval(updateDateTime, 1000);
        updateDateTime();
        
        // Add global performance monitoring for development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            setupDevelopmentTools();
        }
    }
})();

/**
 * Development tools for performance monitoring and debugging
 */
function setupDevelopmentTools() {
    console.log('🔧 Development tools enabled');
    
    // Add performance monitor to console
    window.getAppPerformanceStats = function() {
        const stats = {
            engine: {
                fps: window.engine?.getFps() || 0,
                drawCalls: window.engine?.drawCalls || 0
            },
            scene: {
                meshes: window.scene?.meshes?.length || 0,
                materials: window.scene?.materials?.length || 0,
                textures: window.scene?.textures?.length || 0,
                activeMeshes: window.scene?.getActiveMeshes()?.length || 0
            },
            memory: {}
        };
        
        if (performance.memory) {
            stats.memory = {
                used: `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
                total: `${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
                limit: `${(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
            };
        }
        
        // Get meditation system stats if available
        if (window.cosmicMeditation?.getPerformanceStats) {
            stats.meditation = window.cosmicMeditation.getPerformanceStats();
        }
        
        console.table(stats);
        return stats;
    };
    
    // Add quality adjustment controls
    window.setAppQuality = function(quality) {
        if (['low', 'medium', 'high'].includes(quality)) {
            adjustQualitySettings(quality);
            console.log(`🎨 Quality set to: ${quality}`);
        } else {
            console.log('❌ Valid quality levels: low, medium, high');
        }
    };
    
    // Add memory cleanup utility
    window.cleanupUnusedResources = function() {
        if (modules.cleanup?.disposeUnusedTextures) {
            modules.cleanup.disposeUnusedTextures();
        }
        if (modules.cleanup?.optimizeMeshes) {
            modules.cleanup.optimizeMeshes();
        }
        console.log('🧹 Cleanup completed');
    };
    
    console.log('💡 Available commands:');
    console.log('  getAppPerformanceStats() - View performance statistics');
    console.log('  setAppQuality("low"|"medium"|"high") - Adjust quality level');
    console.log('  cleanupUnusedResources() - Clean up unused resources');
}
