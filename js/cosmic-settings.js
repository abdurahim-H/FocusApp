import { state } from './state.js';
import { updateTimerDisplay } from './timer.js';
import { triggerTaskCompletionUI } from './ui-effects.js';

let cosmicSettingsInitialized = false;
let particleSystem = null;
let settingsAnimationFrame = null;

function triggerUIEffect(effectType) {
    console.log(`🌟 Cosmic Effect: ${effectType}`);
}

export function initCosmicSettings() {
    if (cosmicSettingsInitialized) return;
    
    console.log('🌌 Initializing Cosmic Settings Panel...');
    
    createParticleBackground();
    enhanceSettingsControls();
    setupCosmicPreview();
    addSpectacularAnimations();
    
    cosmicSettingsInitialized = true;
}

function createParticleBackground() {
    const settingsModal = document.querySelector('.settings-modal');
    if (!settingsModal) return;
    
    // Create particle canvas
    const particleCanvas = document.createElement('canvas');
    particleCanvas.className = 'settings-particles';
    particleCanvas.width = 800;
    particleCanvas.height = 600;
    settingsModal.appendChild(particleCanvas);
    
    const ctx = particleCanvas.getContext('2d');
    const particles = [];
    
    // Initialize particles
    for (let i = 0; i < 50; i++) {
        particles.push({
            x: Math.random() * particleCanvas.width,
            y: Math.random() * particleCanvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 2 + 1,
            opacity: Math.random() * 0.5 + 0.2,
            hue: Math.random() * 60 + 200 // Blue to purple range
        });
    }
    
    // Animate particles
    function animateParticles() {
        ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        
        particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Wrap around edges
            if (particle.x < 0) particle.x = particleCanvas.width;
            if (particle.x > particleCanvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = particleCanvas.height;
            if (particle.y > particleCanvas.height) particle.y = 0;
            
            // Draw particle with glow
            ctx.beginPath();
            ctx.globalAlpha = particle.opacity;
            
            // Outer glow
            const gradient = ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size * 3
            );
            gradient.addColorStop(0, `hsla(${particle.hue}, 70%, 60%, 0.8)`);
            gradient.addColorStop(1, `hsla(${particle.hue}, 70%, 60%, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Core particle
            ctx.fillStyle = `hsla(${particle.hue}, 80%, 80%, 1)`;
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.globalAlpha = 1;
        settingsAnimationFrame = requestAnimationFrame(animateParticles);
    }
    
    animateParticles();
}

// Enhance existing controls with cosmic effects
function enhanceSettingsControls() {
    // Transform theme buttons into cosmic orbs
    enhanceThemeButtons();
    
    // Transform sliders into stellar controls
    enhanceSliderControls();
    
    // Transform text input into holographic interface
    enhanceTextInput();
    
    // Transform action buttons into cosmic controls
    enhanceActionButtons();
    
    // Add cosmic sound preview
    addCosmicSoundPreview();
}

function enhanceThemeButtons() {
    const themeSection = document.querySelector('.settings-section:first-child');
    if (!themeSection) return;
    
    const themeButtons = themeSection.querySelector('.theme-buttons');
    themeButtons.className = 'cosmic-theme-selector';
    
    // Create a more elegant theme selector
    const themeContainer = document.createElement('div');
    themeContainer.className = 'theme-selector-container';
    themeContainer.innerHTML = `
        <div class="theme-selector-track"></div>
        <div class="theme-selector-glow"></div>
    `;
    
    themeButtons.innerHTML = '';
    themeButtons.appendChild(themeContainer);
    
    const themes = [
        { id: 'light', label: 'Light', icon: '☀️', color: '#FFD700' },
        { id: 'dark', label: 'Dark', icon: '🌙', color: '#4B0082' },
        { id: 'cosmos', label: 'Cosmos', icon: '🌌', color: '#8B5CF6' },
        { id: 'auto', label: 'Auto', icon: '✨', color: '#9333EA' }
    ];
    
    themes.forEach((theme, index) => {
        const themeOption = document.createElement('button');
        themeOption.className = 'theme-option';
        themeOption.setAttribute('data-theme', theme.id);
        themeOption.innerHTML = `
            <span class="theme-icon">${theme.icon}</span>
            <span class="theme-label">${theme.label}</span>
        `;
        themeOption.style.setProperty('--theme-color', theme.color);
        
        themeOption.addEventListener('click', () => {
            setTheme(theme.id);
            updateThemeSelector(theme.id);
        });
        
        themeContainer.appendChild(themeOption);
    });
    
    // Initialize with current theme
    const currentTheme = document.body.getAttribute('data-theme') || 'auto';
    updateThemeSelector(currentTheme);
}

function updateThemeSelector(activeTheme) {
    const options = document.querySelectorAll('.theme-option');
    const glow = document.querySelector('.theme-selector-glow');
    
    options.forEach(option => {
        if (option.getAttribute('data-theme') === activeTheme) {
            option.classList.add('active');
            
            // Move glow to active option
            if (glow) {
                const rect = option.getBoundingClientRect();
                const containerRect = option.parentElement.getBoundingClientRect();
                const left = rect.left - containerRect.left;
                const width = rect.width;
                
                glow.style.left = `${left}px`;
                glow.style.width = `${width}px`;
                glow.style.backgroundColor = option.style.getPropertyValue('--theme-color');
            }
        } else {
            option.classList.remove('active');
        }
    });
}

function enhanceSliderControls() {
    const sliders = document.querySelectorAll('.range-input');
    
    sliders.forEach(slider => {
        const container = slider.parentElement;
        container.className = 'stellar-control-container';
        
        // Create stellar track
        const stellarTrack = document.createElement('div');
        stellarTrack.className = 'stellar-track';
        
        // Add star particles along the track
        for (let i = 0; i < 20; i++) {
            const star = document.createElement('div');
            star.className = 'track-star';
            star.style.left = `${(i / 19) * 100}%`;
            stellarTrack.appendChild(star);
        }
        
        container.insertBefore(stellarTrack, slider);
        
        // Create cosmic thumb
        const cosmicThumb = document.createElement('div');
        cosmicThumb.className = 'cosmic-thumb';
        container.appendChild(cosmicThumb);
        
        slider.className = 'stellar-slider';
        
        // Set initial value percentage for CSS
        const percentage = (slider.value / slider.max) * 100;
        slider.style.setProperty('--value-percent', `${percentage}%`);
        
        // Add real-time cosmic feedback
        slider.addEventListener('input', () => {
            const newPercentage = (slider.value / slider.max) * 100;
            slider.style.setProperty('--value-percent', `${newPercentage}%`);
            updateStellarVisualization(slider);
            
            // Smooth thumb animation
            if (cosmicThumb) {
                cosmicThumb.style.opacity = '1';
                cosmicThumb.style.left = `${newPercentage}%`;
                
                clearTimeout(cosmicThumb.fadeTimeout);
                cosmicThumb.fadeTimeout = setTimeout(() => {
                    cosmicThumb.style.opacity = '0';
                }, 300);
            }
        });
    });
}

function enhanceTextInput() {
    const greetingInput = document.getElementById('greetingInput');
    if (!greetingInput) return;
    
    const container = greetingInput.parentElement;
    container.className = 'holographic-input-container';
    
    // Create holographic border
    const holoBorder = document.createElement('div');
    holoBorder.className = 'holographic-border';
    container.appendChild(holoBorder);
    
    // Create floating letters effect
    const floatingLetters = document.createElement('div');
    floatingLetters.className = 'floating-letters';
    container.appendChild(floatingLetters);
    
    greetingInput.className = 'holographic-input';
    
    // Add holographic typing effects
    greetingInput.addEventListener('input', () => {
        triggerHolographicEffect(floatingLetters, greetingInput.value);
    });
}

function enhanceActionButtons() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    const resetBtn = document.getElementById('resetSettingsBtn');
    
    if (saveBtn) {
        saveBtn.className = 'cosmic-action-btn cosmic-save';
        saveBtn.innerHTML = `
            <span class="btn-text">Save Universe</span>
            <div class="btn-energy-core"></div>
            <div class="btn-particle-burst"></div>
        `;
    }
    
    if (resetBtn) {
        resetBtn.className = 'cosmic-action-btn cosmic-reset';
        resetBtn.innerHTML = `
            <span class="btn-text">Reset Cosmos</span>
            <div class="btn-energy-core"></div>
            <div class="btn-particle-burst"></div>
        `;
    }
}

// Add cosmic sound preview with visualization
function addCosmicSoundPreview() {
    const soundSection = document.querySelector('#soundVolumeRange')?.closest('.settings-section');
    if (!soundSection) return;
    
    // Create cosmic sound visualizer
    const visualizer = document.createElement('div');
    visualizer.className = 'cosmic-sound-visualizer';
    visualizer.innerHTML = `
        <canvas class="sound-waves" width="300" height="60"></canvas>
        <div class="sound-orbs">
            <div class="sound-orb" data-frequency="low"></div>
            <div class="sound-orb" data-frequency="mid"></div>
            <div class="sound-orb" data-frequency="high"></div>
        </div>
    `;
    
    soundSection.appendChild(visualizer);
    
    // Initialize sound wave animation
    const canvas = visualizer.querySelector('.sound-waves');
    const ctx = canvas.getContext('2d');
    let waveAnimation;
    
    function drawSoundWaves(volume) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const amplitude = (volume / 100) * 20;
        const frequency = 0.02;
        
        ctx.beginPath();
        ctx.strokeStyle = `rgba(139, 92, 246, 0.8)`;
        ctx.lineWidth = 2;
        
        for (let x = 0; x < canvas.width; x++) {
            const y = canvas.height / 2 + Math.sin(x * frequency + Date.now() * 0.002) * amplitude;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        
        ctx.stroke();
        
        // Update sound orbs
        const orbs = visualizer.querySelectorAll('.sound-orb');
        orbs.forEach((orb, i) => {
            const scale = 1 + (volume / 100) * 0.5 * Math.sin(Date.now() * 0.001 + i);
            orb.style.transform = `scale(${scale})`;
            orb.style.opacity = 0.3 + (volume / 100) * 0.7;
        });
        
        waveAnimation = requestAnimationFrame(() => drawSoundWaves(volume));
    }
    
    // Start animation when hovering over sound section
    soundSection.addEventListener('mouseenter', () => {
        const volume = parseInt(document.getElementById('soundVolumeRange').value);
        drawSoundWaves(volume);
    });
    
    soundSection.addEventListener('mouseleave', () => {
        cancelAnimationFrame(waveAnimation);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
}

// Setup cosmic preview that shows how settings affect the universe
function setupCosmicPreview() {
    const settingsContent = document.querySelector('.settings-content');
    if (!settingsContent) return;
    
    // Create cosmic preview section
    const previewSection = document.createElement('div');
    previewSection.className = 'cosmic-preview-section';
    previewSection.innerHTML = `
        <h4 class="preview-title">Universe Preview</h4>
        <div class="cosmic-preview-container">
            <canvas class="mini-universe" width="300" height="200"></canvas>
            <div class="preview-stats">
                <div class="stat-item">
                    <span class="stat-label">Focus Intensity</span>
                    <div class="stat-bar">
                        <div class="stat-fill" id="focusIntensityBar"></div>
                    </div>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Cosmic Energy</span>
                    <div class="stat-bar">
                        <div class="stat-fill" id="cosmicEnergyBar"></div>
                    </div>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Sound Harmony</span>
                    <div class="stat-bar">
                        <div class="stat-fill" id="soundHarmonyBar"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Insert preview at the top of settings content
    settingsContent.insertBefore(previewSection, settingsContent.firstChild);
    
    // Initialize mini universe
    initMiniUniverse();
}

function initMiniUniverse() {
    const canvas = document.querySelector('.mini-universe');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    let rotation = 0;
    
    function drawMiniUniverse() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw cosmic background
        const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 150);
        bgGradient.addColorStop(0, 'rgba(20, 10, 40, 1)');
        bgGradient.addColorStop(1, 'rgba(5, 5, 15, 1)');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw mini black hole
        const blackHoleSize = 15;
        ctx.beginPath();
        ctx.arc(centerX, centerY, blackHoleSize, 0, Math.PI * 2);
        
        const blackHoleGradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, blackHoleSize
        );
        blackHoleGradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
        blackHoleGradient.addColorStop(0.7, 'rgba(100, 50, 200, 0.8)');
        blackHoleGradient.addColorStop(1, 'rgba(200, 100, 255, 0.3)');
        
        ctx.fillStyle = blackHoleGradient;
        ctx.fill();
        
        // Draw accretion disk
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);
        
        for (let i = 0; i < 3; i++) {
            const radius = 25 + i * 8;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${280 + i * 20}, 70%, 60%, ${0.3 - i * 0.1})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        ctx.restore();
        
        // Draw orbiting particles
        for (let i = 0; i < 8; i++) {
            const angle = (rotation * 2) + (i * Math.PI / 4);
            const radius = 60 + Math.sin(rotation + i) * 10;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${200 + i * 20}, 80%, 70%, 0.8)`;
            ctx.fill();
        }
        
        rotation += 0.02;
        requestAnimationFrame(drawMiniUniverse);
    }
    
    drawMiniUniverse();
}

// Animation and effect functions
function addSpectacularAnimations() {
    // Add entrance animation for the entire modal
    const modal = document.querySelector('.settings-modal');
    if (modal) {
        modal.classList.add('cosmic-modal-entrance');
    }
    
    // Add staggered entrance for sections
    const sections = document.querySelectorAll('.settings-section');
    sections.forEach((section, index) => {
        section.style.animationDelay = `${index * 0.1}s`;
        section.classList.add('cosmic-section-entrance');
    });
}

function triggerCosmicRipple(element) {
    const ripple = document.createElement('div');
    ripple.className = 'cosmic-ripple';
    element.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 1000);
}

function triggerCosmicPulse(element) {
    element.classList.add('cosmic-pulse');
    setTimeout(() => {
        element.classList.remove('cosmic-pulse');
    }, 300);
}

function updateStellarVisualization(slider) {
    const value = slider.value;
    const max = slider.max;
    const percentage = (value / max) * 100;
    
    // Update track stars
    const stars = slider.parentElement.querySelectorAll('.track-star');
    stars.forEach((star, index) => {
        const starPosition = (index / (stars.length - 1)) * 100;
        if (starPosition <= percentage) {
            star.classList.add('star-active');
        } else {
            star.classList.remove('star-active');
        }
    });
    
    // Update preview stats
    updatePreviewStats();
}

function updatePreviewStats() {
    const focusSlider = document.getElementById('focusLengthRange');
    const soundSlider = document.getElementById('soundVolumeRange');
    
    if (focusSlider) {
        const focusBar = document.getElementById('focusIntensityBar');
        if (focusBar) {
            const percentage = (focusSlider.value / focusSlider.max) * 100;
            focusBar.style.width = `${percentage}%`;
            focusBar.style.background = `linear-gradient(90deg, 
                hsl(${200 + percentage}, 70%, 60%), 
                hsl(${280 + percentage}, 80%, 70%))`;
        }
    }
    
    if (soundSlider) {
        const soundBar = document.getElementById('soundHarmonyBar');
        if (soundBar) {
            const percentage = (soundSlider.value / soundSlider.max) * 100;
            soundBar.style.width = `${percentage}%`;
            soundBar.style.background = `linear-gradient(90deg, 
                hsl(${120 + percentage}, 70%, 60%), 
                hsl(${180 + percentage}, 80%, 70%))`;
        }
    }
    
    // Update cosmic energy based on overall configuration
    const cosmicBar = document.getElementById('cosmicEnergyBar');
    if (cosmicBar) {
        const avgPercentage = ((focusSlider?.value || 25) / 60 + (soundSlider?.value || 30) / 100) / 2 * 100;
        cosmicBar.style.width = `${avgPercentage}%`;
        cosmicBar.style.background = `linear-gradient(90deg, 
            hsl(${300 + avgPercentage}, 70%, 60%), 
            hsl(${350 + avgPercentage}, 80%, 70%))`;
    }
}

function triggerHolographicEffect(container, text) {
    // Clear previous letters
    container.innerHTML = '';
    
    // Create floating letters for the last few characters
    const recentChars = text.slice(-3);
    for (let i = 0; i < recentChars.length; i++) {
        const letter = document.createElement('span');
        letter.className = 'floating-letter';
        letter.textContent = recentChars[i];
        letter.style.animationDelay = `${i * 0.1}s`;
        container.appendChild(letter);
    }
}

// Enhanced setup function that replaces the original
export function setupCosmicSettingsModal() {
    console.log('🌌 setupCosmicSettingsModal called!');
    
    // Use a more robust element selection with retry mechanism
    function findAndSetupElements() {
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsOverlay = document.getElementById('settingsModalOverlay');
        const closeBtn = document.getElementById('closeSettingsBtn');
        
        console.log('🌌 Elements found:');
        console.log('🌌 - settingsBtn:', settingsBtn);
        console.log('🌌 - settingsOverlay:', settingsOverlay);
        console.log('🌌 - closeBtn:', closeBtn);
        
        if (!settingsBtn || !settingsOverlay || !closeBtn) {
            console.error('🌌 Settings modal elements not found, retrying in 100ms...');
            setTimeout(findAndSetupElements, 100);
            return;
        }
        
        console.log('🌌 All elements found, setting up event listeners...');
        
        // Remove any existing event listeners by cloning the element
        const newSettingsBtn = settingsBtn.cloneNode(true);
        settingsBtn.parentNode.replaceChild(newSettingsBtn, settingsBtn);
        
        // Initialize cosmic enhancements
        initCosmicSettings();
        
        // Open modal with spectacular entrance
        newSettingsBtn.addEventListener('click', function(event) {
            console.log('🌌 Settings button clicked!');
            event.preventDefault();
            event.stopPropagation();
            
            settingsOverlay.classList.add('active');
            const modal = settingsOverlay.querySelector('.settings-modal');
            if (modal) {
                modal.classList.add('cosmic-entrance-active');
            }
            
            // Trigger cosmic opening effect
            triggerUIEffect('cosmicPortalOpen');
            
            // Update preview stats
            setTimeout(updatePreviewStats, 100);
        });
        
        console.log('🌌 Click event listener added to settings button');
        
        // Close modal with spectacular exit
        function closeModal() {
            const modal = settingsOverlay.querySelector('.settings-modal');
            if (modal) {
                modal.classList.add('cosmic-exit-active');
            }
            
            setTimeout(() => {
                settingsOverlay.classList.remove('active');
                if (modal) {
                    modal.classList.remove('cosmic-entrance-active', 'cosmic-exit-active');
                }
            }, 500);
            
            // Trigger cosmic closing effect
            triggerUIEffect('cosmicPortalClose');
        }

        closeBtn.addEventListener('click', closeModal);
        settingsOverlay.addEventListener('click', (e) => {
            if (e.target === settingsOverlay) closeModal();
        });
        
        console.log('🌌 setupCosmicSettingsModal completed successfully!');
        
        // Make the setup function globally available as backup
        window.cosmicSettingsReady = true;
    }
    
    // Start the setup process
    findAndSetupElements();
}

// Make functions globally available for fallback
window.setupCosmicSettingsModal = setupCosmicSettingsModal;
window.initCosmicSettings = initCosmicSettings;

// Spectacular save function with cosmic effects
export function saveCosmicSettings() {
    console.log('🌌 Saving cosmic settings with spectacular effects...');
    
    // Trigger massive cosmic burst effect
    triggerUIEffect('cosmicSaveExplosion');
    
    // Add cosmic save animation to the button
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
        saveBtn.classList.add('cosmic-saving');
        
        // Show energy burst
        const burst = saveBtn.querySelector('.btn-particle-burst');
        if (burst) {
            burst.classList.add('burst-active');
        }
        
        setTimeout(() => {
            saveBtn.classList.remove('cosmic-saving');
            if (burst) burst.classList.remove('burst-active');
        }, 2000);
    }
    
    // Show cosmic success message
    showCosmicSuccessMessage();
    
    // Save actual settings (existing logic)
    const elements = {
        focusRange: document.getElementById('focusLengthRange'),
        soundRange: document.getElementById('soundVolumeRange'),
        greetingInput: document.getElementById('greetingInput')
    };
    
    const focusDuration = parseInt(elements.focusRange?.value || 25);
    const soundVolume = parseInt(elements.soundRange?.value || 30);
    const greeting = elements.greetingInput?.value || 'Welcome to Your Universe!';
    const theme = document.body.getAttribute('data-theme') || 'auto';
    
    // Save to localStorage
    localStorage.setItem('fu_theme', theme);
    localStorage.setItem('fu_focusLength', focusDuration);
    localStorage.setItem('fu_soundVolume', soundVolume);
    localStorage.setItem('fu_greeting', greeting);
    
    // Apply settings
    if (focusDuration > 0) {
        state.timer.settings.focusDuration = focusDuration;
        
        if (!state.timer.isRunning && !state.timer.isBreak) {
            state.timer.minutes = focusDuration;
            state.timer.seconds = 0;
            updateTimerDisplay();
        }
    }
    
    console.log('✨ Cosmic settings saved successfully!');
}

function showCosmicSuccessMessage() {
    const existingMsg = document.querySelector('.cosmic-success-message');
    if (existingMsg) existingMsg.remove();
    
    const successMsg = document.createElement('div');
    successMsg.className = 'cosmic-success-message';
    successMsg.innerHTML = `
        <div class="success-icon">✨</div>
        <div class="success-text">Universe Configuration Saved!</div>
        <div class="success-subtitle">Your cosmic preferences are now active</div>
    `;
    
    document.body.appendChild(successMsg);
    
    setTimeout(() => {
        successMsg.classList.add('success-visible');
    }, 100);
    
    setTimeout(() => {
        successMsg.classList.remove('success-visible');
        setTimeout(() => successMsg.remove(), 500);
    }, 3000);
}

// Cleanup function
export function cleanupCosmicSettings() {
    if (settingsAnimationFrame) {
        cancelAnimationFrame(settingsAnimationFrame);
        settingsAnimationFrame = null;
    }
}

// Export enhanced setup functions
export { setupCosmicSettingsModal as setupSettingsModal };
export { saveCosmicSettings as handleSaveSettings };

// Legacy compatibility exports
export function setupSettingsControls() {
    console.log('🌌 Setting up cosmic settings controls...');
    
    const elements = {
        saveBtn: document.getElementById('saveSettingsBtn'),
        resetBtn: document.getElementById('resetSettingsBtn'),
        focusRange: document.getElementById('focusLengthRange'),
        focusValue: document.getElementById('focusLengthValue'),
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
    
    // Enhanced focus range with cosmic effects and REAL-TIME UPDATE FIX
    if (elements.focusRange && elements.focusValue) {
        elements.focusRange.addEventListener('input', () => {
            const newValue = elements.focusRange.value;
            elements.focusValue.textContent = newValue;
            updateStellarVisualization(elements.focusRange);
            
            // CRITICAL FIX: Update timer display in real-time when not running
            if (!state.timer.isRunning && !state.timer.isBreak) {
                state.timer.minutes = parseInt(newValue);
                state.timer.seconds = 0;
                updateTimerDisplay();
                console.log(`Timer display updated to: ${newValue}:00`);
            }
            
            // Update the state for future sessions
            state.timer.settings.focusDuration = parseInt(newValue);
        });
    }
    
    // Enhanced sound range with cosmic effects
    if (elements.soundRange && elements.soundValue) {
        elements.soundRange.addEventListener('input', () => {
            elements.soundValue.textContent = elements.soundRange.value;
            updateStellarVisualization(elements.soundRange);
            
            if (state.sounds.audio) {
                state.sounds.audio.volume = elements.soundRange.value / 100;
            }
        });
    }
    
    // Enhanced greeting input with holographic effects
    if (elements.greetingInput) {
        elements.greetingInput.addEventListener('input', () => {
            const greetingText = elements.greetingInput.value || 'Welcome to Your Universe!';
            const greetingElement = document.getElementById('greeting');
            if (greetingElement) {
                // Holographic text update effect
                greetingElement.style.opacity = '0.5';
                greetingElement.style.filter = 'blur(2px)';
                setTimeout(() => {
                    greetingElement.textContent = greetingText;
                    greetingElement.style.opacity = '1';
                    greetingElement.style.filter = 'blur(0)';
                }, 150);
            }
            
            const floatingLetters = document.querySelector('.floating-letters');
            if (floatingLetters) {
                triggerHolographicEffect(floatingLetters, greetingText);
            }
        });
    }
    
    // Enhanced theme buttons with cosmic effects
    Object.entries(elements.themeBtns).forEach(([theme, btn]) => {
        if (btn) {
            btn.addEventListener('click', () => {
                setTheme(theme);
                // Don't trigger extra transition effects
            });
        }
    });
    
    // Enhanced save button with spectacular effects
    if (elements.saveBtn) {
        elements.saveBtn.addEventListener('click', saveCosmicSettings);
    }
    
    // Enhanced reset button with confirmation portal
    if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', () => {
            // Create cosmic confirmation portal
            createCosmicConfirmation('Reset all settings to default?', () => {
                // Reset logic
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
                
                // Trigger cosmic reset effect
                triggerCosmicResetEffect();
            });
        });
    }
}

// New cosmic functions
function triggerCosmicThemeTransition(theme) {
    const body = document.body;
    const overlay = document.createElement('div');
    overlay.className = 'cosmic-theme-transition';
    overlay.style.background = getThemeTransitionGradient(theme);
    body.appendChild(overlay);
    
    setTimeout(() => {
        overlay.classList.add('active');
    }, 10);
    
    setTimeout(() => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 500);
    }, 1000);
}

function getThemeTransitionGradient(theme) {
    const gradients = {
        light: 'radial-gradient(circle, rgba(255,220,100,0.8) 0%, rgba(255,255,255,0.9) 100%)',
        dark: 'radial-gradient(circle, rgba(20,10,40,0.8) 0%, rgba(0,0,0,0.9) 100%)',
        cosmos: 'radial-gradient(circle, rgba(139,92,246,0.8) 0%, rgba(11,20,38,0.9) 100%)',
        auto: 'radial-gradient(circle, rgba(100,50,200,0.8) 0%, rgba(50,25,100,0.9) 100%)'
    };
    return gradients[theme] || gradients.auto;
}

function createCosmicConfirmation(message, onConfirm) {
    const portal = document.createElement('div');
    portal.className = 'cosmic-confirmation-portal';
    portal.innerHTML = `
        <div class="confirmation-vortex"></div>
        <div class="confirmation-content">
            <div class="confirmation-icon">⚠️</div>
            <div class="confirmation-message">${message}</div>
            <div class="confirmation-buttons">
                <button class="cosmic-confirm-btn">Confirm</button>
                <button class="cosmic-cancel-btn">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(portal);
    
    // Animate entrance
    setTimeout(() => portal.classList.add('active'), 10);
    
    // Button handlers
    portal.querySelector('.cosmic-confirm-btn').addEventListener('click', () => {
        onConfirm();
        closePortal();
    });
    
    portal.querySelector('.cosmic-cancel-btn').addEventListener('click', closePortal);
    
    function closePortal() {
        portal.classList.remove('active');
        setTimeout(() => portal.remove(), 500);
    }
}

function triggerCosmicResetEffect() {
    // Create particle explosion
    const explosion = document.createElement('div');
    explosion.className = 'cosmic-reset-explosion';
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'reset-particle';
        particle.style.setProperty('--angle', `${(360 / 20) * i}deg`);
        particle.style.setProperty('--delay', `${Math.random() * 0.3}s`);
        explosion.appendChild(particle);
    }
    
    document.body.appendChild(explosion);
    
    setTimeout(() => {
        explosion.classList.add('active');
    }, 10);
    
    setTimeout(() => {
        explosion.remove();
    }, 2000);
}

// Theme setting function (from original) - SMOOTH TRANSITION FIX
function setTheme(theme) {
    // Add transition class for smooth change
    document.body.classList.add('theme-transitioning');
    
    // Set theme on both body and document element
    document.body.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    // Remove transition class after animation
    setTimeout(() => {
        document.body.classList.remove('theme-transitioning');
    }, 300);
    
    // Update theme button states with cosmic effects
    updateThemeSelector(theme);
    
    // Save theme to localStorage
    localStorage.setItem('fu_theme', theme);
    
    // Log for debugging
    console.log(`Theme changed to: ${theme}`);
}

// Load settings function update
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
        
        // CRITICAL: Update timer display immediately on load
        const loadedFocusDuration = parseInt(focusLength);
        if (loadedFocusDuration && loadedFocusDuration > 0) {
            state.timer.settings.focusDuration = loadedFocusDuration;
            if (!state.timer.isRunning && !state.timer.isBreak) {
                state.timer.minutes = loadedFocusDuration;
                state.timer.seconds = 0;
                updateTimerDisplay();
                console.log(`Timer initialized to: ${loadedFocusDuration}:00`);
            }
        }
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
    
    if (state.sounds.audio) {
        state.sounds.audio.volume = parseInt(soundVolume) / 100;
    }
}
