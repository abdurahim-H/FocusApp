// Cosmic Meditation Chamber Module
// Enhanced ambient mode with interactive meditation features

import { state } from './state.js';
import { trackSetInterval, trackRequestAnimationFrame } from './cleanup.js';
import { toggleAmbientSound, setVolume, setSoundVolume, stopAmbientSound } from './sounds.js';
import { notifyMeditationMilestone } from './notifications.js';

let meditationCanvas, meditationCtx;
let meditationTimer = null;
let meditationStartTime = null;
let currentMeditationMode = 'breathing';
let orbParticles = [];
let animationFrameId = null;
let soundStates = {
    rain: { active: false, volume: 0 },
    ocean: { active: false, volume: 0 },
    forest: { active: false, volume: 0 },
    cafe: { active: false, volume: 0 }
};

let meditationStats = {
    totalMinutesToday: 0,
    streak: 0,
    calmLevel: 0,
    lastMeditationDate: null
};

// Breathing patterns for different modes
const breathingPatterns = {
    breathing: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 }, // Box breathing
    focus: { inhale: 4, hold1: 7, exhale: 8, hold2: 0 }, // 4-7-8 technique
    sleep: { inhale: 4, hold1: 2, exhale: 6, hold2: 2 }, // Relaxing pattern
    energy: { inhale: 6, hold1: 0, exhale: 2, hold2: 0 } // Energizing breaths
};

// Sound presets for different moods
const soundPresets = {
    'deep-focus': {
        rain: 30,
        ocean: 0,
        forest: 0,
        cafe: 0
    },
    'relaxation': {
        rain: 20,
        ocean: 50,
        forest: 30,
        cafe: 0
    },
    'sleep': {
        rain: 40,
        ocean: 30,
        forest: 0,
        cafe: 0
    },
    'energy': {
        rain: 0,
        ocean: 0,
        forest: 0,
        cafe: 40
    }
};

export function initMeditationChamber() {
    console.log('🧘 Initializing Meditation Chamber...');
    
    meditationCanvas = document.getElementById('meditationOrb');
    if (!meditationCanvas) {
        console.error('Meditation canvas not found');
        return;
    }
    
    meditationCtx = meditationCanvas.getContext('2d');
    
    // Initialize orb particles
    createOrbParticles();
    
    // Setup event listeners
    setupMeditationControls();
    setupSoundMixer();
    setupPresetButtons();
    
    // Load saved stats
    loadMeditationStats();
    
    // Start animation when ambient mode is active
    checkAndStartAnimation();
    
    // Make restart function available globally for cleanup system
    window.restartMeditationAnimation = restartMeditationAnimation;
    
    console.log('🧘 Meditation Chamber initialized');
}

function checkAndStartAnimation() {
    const ambientMode = document.getElementById('ambient');
    if (ambientMode && ambientMode.classList.contains('active')) {
        startMeditationTimer();
        if (!animationFrameId) {
            animateMeditationOrb();
        }
    }
}

// Function to restart meditation animation - used by cleanup system
function restartMeditationAnimation() {
    const ambientMode = document.getElementById('ambient');
    if (ambientMode && ambientMode.classList.contains('active') && !animationFrameId) {
        animateMeditationOrb();
    }
}

function createOrbParticles() {
    orbParticles = [];
    const particleCount = 100;
    
    for (let i = 0; i < particleCount; i++) {
        orbParticles.push({
            x: Math.random() * meditationCanvas.width,
            y: Math.random() * meditationCanvas.height,
            radius: Math.random() * 3 + 1,
            color: `hsla(${200 + Math.random() * 60}, 70%, 60%, ${Math.random() * 0.5 + 0.3})`,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            pulse: Math.random() * Math.PI * 2
        });
    }
}

function animateMeditationOrb() {
    if (!meditationCtx) return;
    
    const ambientMode = document.getElementById('ambient');
    if (!ambientMode || !ambientMode.classList.contains('active')) {
        animationFrameId = null;
        return;
    }
    
    const centerX = meditationCanvas.width / 2;
    const centerY = meditationCanvas.height / 2;
    const time = Date.now() * 0.001;
    
    // Clear canvas with fade effect
    meditationCtx.fillStyle = 'rgba(10, 10, 15, 0.1)';
    meditationCtx.fillRect(0, 0, meditationCanvas.width, meditationCanvas.height);
    
    // Draw breathing orb
    const pattern = breathingPatterns[currentMeditationMode];
    const cycleTime = pattern.inhale + pattern.hold1 + pattern.exhale + pattern.hold2;
    const cyclePosition = (time % cycleTime) / cycleTime;
    
    let orbScale = 1;
    let phaseText = '';
    
    // Calculate orb size based on breathing phase
    const inhaleEnd = pattern.inhale / cycleTime;
    const hold1End = (pattern.inhale + pattern.hold1) / cycleTime;
    const exhaleEnd = (pattern.inhale + pattern.hold1 + pattern.exhale) / cycleTime;
    
    if (cyclePosition < inhaleEnd) {
        orbScale = 1 + (cyclePosition / inhaleEnd) * 0.3;
        phaseText = 'Breathe In...';
    } else if (cyclePosition < hold1End && pattern.hold1 > 0) {
        orbScale = 1.3;
        phaseText = 'Hold...';
    } else if (cyclePosition < exhaleEnd) {
        orbScale = 1.3 - ((cyclePosition - hold1End) / (exhaleEnd - hold1End)) * 0.3;
        phaseText = 'Breathe Out...';
    } else if (pattern.hold2 > 0) {
        orbScale = 1;
        phaseText = 'Hold...';
    }
    
    // Update breathing phase text
    const phaseElement = document.getElementById('breathingPhase');
    if (phaseElement && phaseElement.textContent !== phaseText) {
        phaseElement.textContent = phaseText;
    }
    
    // Draw main orb with gradient
    const gradient = meditationCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 100 * orbScale);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)');
    gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.5)');
    gradient.addColorStop(1, 'rgba(6, 214, 160, 0.2)');
    
    meditationCtx.beginPath();
    meditationCtx.arc(centerX, centerY, 100 * orbScale, 0, Math.PI * 2);
    meditationCtx.fillStyle = gradient;
    meditationCtx.fill();
    
    // Draw energy rings
    for (let i = 0; i < 3; i++) {
        const ringScale = orbScale + i * 0.1;
        const alpha = 0.2 - i * 0.05;
        
        meditationCtx.beginPath();
        meditationCtx.arc(centerX, centerY, (120 + i * 20) * ringScale, 0, Math.PI * 2);
        meditationCtx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
        meditationCtx.lineWidth = 2;
        meditationCtx.stroke();
    }
    
    // Animate particles
    orbParticles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.pulse += 0.05;
        
        // Wrap around edges
        if (particle.x < 0) particle.x = meditationCanvas.width;
        if (particle.x > meditationCanvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = meditationCanvas.height;
        if (particle.y > meditationCanvas.height) particle.y = 0;
        
        // Draw particle with pulsing effect
        const pulseScale = 1 + Math.sin(particle.pulse) * 0.3;
        meditationCtx.beginPath();
        meditationCtx.arc(particle.x, particle.y, particle.radius * pulseScale, 0, Math.PI * 2);
        meditationCtx.fillStyle = particle.color;
        meditationCtx.fill();
    });
    
    // Update calm level based on meditation duration
    if (meditationStartTime) {
        const duration = (Date.now() - meditationStartTime) / 1000 / 60; // minutes
        const calmLevel = Math.min(100, Math.floor(duration * 10));
        const calmElement = document.getElementById('calmLevel');
        if (calmElement) {
            calmElement.textContent = `${calmLevel}%`;
        }
    }
    
    animationFrameId = trackRequestAnimationFrame(animateMeditationOrb);
}

function setupMeditationControls() {
    console.log('🧘 Setting up meditation controls...');
    
    // Meditation mode buttons (Breathing, Focus, Sleep, Energy)
    document.querySelectorAll('.meditation-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all buttons
            document.querySelectorAll('.meditation-btn').forEach(b => b.classList.remove('active'));
            // Add active to clicked button
            btn.classList.add('active');
            // Update current mode
            currentMeditationMode = btn.dataset.mode;
            console.log(`🧘 Switched to ${currentMeditationMode} breathing pattern`);
        });
    });
    
    // Watch for ambient mode activation/deactivation
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            const target = mutation.target;
            if (target.id === 'ambient') {
                if (target.classList.contains('active')) {
                    console.log('🧘 Ambient mode activated');
                    startMeditationTimer();
                    if (!animationFrameId) {
                        animateMeditationOrb();
                    }
                } else {
                    console.log('🧘 Ambient mode deactivated');
                    stopMeditationTimer();
                    if (animationFrameId) {
                        cancelAnimationFrame(animationFrameId);
                        animationFrameId = null;
                    }
                }
            }
        });
    });
    
    const ambientMode = document.getElementById('ambient');
    if (ambientMode) {
        observer.observe(ambientMode, { attributes: true, attributeFilter: ['class'] });
    }
}

function setupSoundMixer() {
    console.log('🎵 Setting up sound mixer...');
    
    // Setup new sound layer controls
    document.querySelectorAll('.sound-layer').forEach(layer => {
        const sound = layer.dataset.sound;
        const volumeSlider = layer.querySelector('.layer-volume');
        const toggleBtn = layer.querySelector('.layer-toggle');
        
        if (!volumeSlider || !toggleBtn) return;
        
        // Initialize slider visual
        volumeSlider.style.setProperty('--value', '0%');
        
        // Volume slider control
        volumeSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            e.target.style.setProperty('--value', value + '%');
            
            // Update sound state
            soundStates[sound].volume = value;
            
            // If volume > 0 and sound is not active, activate it
            if (value > 0 && !soundStates[sound].active) {
                activateSound(sound, toggleBtn, layer);
            }
            // If volume = 0 and sound is active, deactivate it
            else if (value === 0 && soundStates[sound].active) {
                deactivateSound(sound, toggleBtn, layer);
            }
            
            // Apply volume to active sounds
            if (soundStates[sound].active) {
                // Set individual sound volume instead of master volume
                setSoundVolume(sound, value);
            }
        });
        
        // Toggle button control
        toggleBtn.addEventListener('click', () => {
            const isActive = soundStates[sound].active;
            
            if (isActive) {
                // Turn OFF
                deactivateSound(sound, toggleBtn, layer);
                volumeSlider.value = 0;
                volumeSlider.style.setProperty('--value', '0%');
            } else {
                // Turn ON
                activateSound(sound, toggleBtn, layer);
                if (volumeSlider.value === '0') {
                    volumeSlider.value = 50;
                    volumeSlider.style.setProperty('--value', '50%');
                    soundStates[sound].volume = 50;
                    setSoundVolume(sound, 50); // Use individual sound volume
                }
            }
        });
    });
}

function activateSound(sound, toggleBtn, layer) {
    console.log(`🎵 Activating ${sound} sound`);
    
    soundStates[sound].active = true;
    toggleBtn.classList.add('active');
    toggleBtn.textContent = 'ON';
    layer.classList.add('active');
    
    // Start the sound using the optimized toggle function
    toggleAmbientSound(sound);
}

function deactivateSound(sound, toggleBtn, layer) {
    console.log(`🎵 Deactivating ${sound} sound`);
    
    soundStates[sound].active = false;
    soundStates[sound].volume = 0;
    toggleBtn.classList.remove('active');
    toggleBtn.textContent = 'OFF';
    layer.classList.remove('active');
    
    // Stop the sound using the optimized toggle function
    if (state.sounds.active.includes(sound)) {
        toggleAmbientSound(sound);
    }
}

function setupPresetButtons() {
    console.log('🎵 Setting up preset buttons...');
    
    // Preset buttons for quick sound combinations
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.dataset.preset;
            console.log(`🎵 Applying ${preset} preset`);
            applyPreset(preset);
            
            // Visual feedback
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setTimeout(() => btn.classList.remove('active'), 2000);
        });
    });
}

function applyPreset(presetName) {
    const preset = soundPresets[presetName];
    if (!preset) return;
    
    console.log(`🎵 Applying preset: ${presetName}`, preset);
    
    // First, stop all currently playing sounds
    Object.keys(soundStates).forEach(sound => {
        if (soundStates[sound].active) {
            const layer = document.querySelector(`.sound-layer[data-sound="${sound}"]`);
            const toggleBtn = layer?.querySelector('.layer-toggle');
            if (toggleBtn && layer) {
                deactivateSound(sound, toggleBtn, layer);
            }
        }
    });
    
    // Then apply the preset
    setTimeout(() => {
        Object.entries(preset).forEach(([sound, volume]) => {
            const layer = document.querySelector(`.sound-layer[data-sound="${sound}"]`);
            const volumeSlider = layer?.querySelector('.layer-volume');
            const toggleBtn = layer?.querySelector('.layer-toggle');
            
            if (!layer || !volumeSlider || !toggleBtn) return;
            
            if (volume > 0) {
                // Set volume first
                volumeSlider.value = volume;
                volumeSlider.style.setProperty('--value', volume + '%');
                soundStates[sound].volume = volume;
                
                // Then activate sound
                activateSound(sound, toggleBtn, layer);
                setSoundVolume(sound, volume); // Use individual sound volume
            }
        });
    }, 100);
}

function startMeditationTimer() {
    if (meditationTimer) return; // Already running
    
    console.log('⏱️ Starting meditation timer');
    meditationStartTime = Date.now();
    let lastNotifiedMinute = 0;
    
    // Update timer every second
    meditationTimer = trackSetInterval(() => {
        const elapsed = Date.now() - meditationStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        const timerElement = document.getElementById('meditationTime');
        if (timerElement) {
            timerElement.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Send milestone notifications every 5 minutes
        if (minutes > 0 && minutes % 5 === 0 && minutes !== lastNotifiedMinute) {
            notifyMeditationMilestone(minutes);
            lastNotifiedMinute = minutes;
        }
    }, 1000);
    
    // Update timer immediately
    const timerElement = document.getElementById('meditationTime');
    if (timerElement) {
        timerElement.textContent = '00:00';
    }
}

function stopMeditationTimer() {
    console.log('⏹️ Stopping meditation timer');
    
    if (meditationTimer) {
        clearInterval(meditationTimer);
        meditationTimer = null;
        
        // Update stats
        if (meditationStartTime) {
            const duration = (Date.now() - meditationStartTime) / 1000 / 60; // minutes
            updateMeditationStats(duration);
        }
        
        meditationStartTime = null;
    }
    
    // Stop all sounds when leaving ambient mode
    Object.keys(soundStates).forEach(sound => {
        if (soundStates[sound].active) {
            const layer = document.querySelector(`.sound-layer[data-sound="${sound}"]`);
            const toggleBtn = layer?.querySelector('.layer-toggle');
            const volumeSlider = layer?.querySelector('.layer-volume');
            
            if (toggleBtn && layer) {
                deactivateSound(sound, toggleBtn, layer);
                if (volumeSlider) {
                    volumeSlider.value = 0;
                    volumeSlider.style.setProperty('--value', '0%');
                }
            }
        }
    });
}

function updateMeditationStats(duration) {
    const today = new Date().toDateString();
    
    // Update total time (only count if more than 1 minute)
    if (duration >= 1) {
        meditationStats.totalMinutesToday += Math.floor(duration);
        
        // Update streak
        if (meditationStats.lastMeditationDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (meditationStats.lastMeditationDate === yesterday.toDateString()) {
                meditationStats.streak++;
            } else {
                meditationStats.streak = 1;
            }
            
            meditationStats.lastMeditationDate = today;
        }
        
        // Save stats
        saveMeditationStats();
    }
    
    // Update UI
    updateStatsDisplay();
}

function updateStatsDisplay() {
    const totalElement = document.getElementById('totalMeditation');
    const streakElement = document.getElementById('meditationStreak');
    
    if (totalElement) totalElement.textContent = meditationStats.totalMinutesToday;
    if (streakElement) streakElement.textContent = meditationStats.streak;
}

function saveMeditationStats() {
    localStorage.setItem('cosmic_meditation_stats', JSON.stringify(meditationStats));
}

function loadMeditationStats() {
    const saved = localStorage.getItem('cosmic_meditation_stats');
    if (saved) {
        try {
            meditationStats = JSON.parse(saved);
            
            // Reset daily stats if it's a new day
            const today = new Date().toDateString();
            if (meditationStats.lastMeditationDate !== today && 
                meditationStats.lastMeditationDate !== null) {
                // Check if it's the next day for streak
                const lastDate = new Date(meditationStats.lastMeditationDate);
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                if (lastDate.toDateString() !== yesterday.toDateString()) {
                    // Streak broken
                    meditationStats.streak = 0;
                }
                
                meditationStats.totalMinutesToday = 0;
            }
            
            // Update UI
            updateStatsDisplay();
            
            // Reset calm level
            const calmElement = document.getElementById('calmLevel');
            if (calmElement) calmElement.textContent = '0%';
            
        } catch (error) {
            console.error('Failed to load meditation stats:', error);
        }
    }
}

// Export for external use
export { startMeditationTimer, stopMeditationTimer };