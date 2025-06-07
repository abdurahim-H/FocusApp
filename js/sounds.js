// Ambient Sounds Module - Enhanced with pre-loading, toggle functionality, and multiple simultaneous sounds
// Handles ambient sound controls and audio management

import { state } from './state.js';

// Ambient sounds configuration
const ambientSounds = {
    rain: './sounds/rain_00.wav',
    ocean: './sounds/ocean_04.wav',
    forest: './sounds/forest_00.wav',
    cafe: './sounds/crowd_0.wav'
};

// Web Audio API context and nodes
let audioContext = null;
let gainNode = null;
let isInitialized = false;

// Initialize Web Audio API
async function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = 0.3; // Default volume
    }
    
    // Resume context if suspended (required by some browsers)
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    
    return audioContext;
}

// Pre-load all audio buffers for instant playback
async function preloadAllAudioBuffers() {
    if (isInitialized) return;
    
    try {
        await initAudioContext();
        
        const loadPromises = Object.entries(ambientSounds).map(async ([type, url]) => {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                state.sounds.buffers[type] = audioBuffer;
            } catch (error) {
                console.error(`Failed to load ${type}:`, error);
            }
        });
        
        await Promise.all(loadPromises);
        isInitialized = true;
        
    } catch (error) {
        console.error('Failed to pre-load audio buffers:', error);
    }
}

// Seamless loop scheduling function for a specific sound type
function scheduleLoop(type) {
    const audioBuffer = state.sounds.buffers[type];
    if (!audioBuffer || !state.sounds.sources[type]?.isLooping) return;
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(gainNode);
    
    // Schedule precise start time
    const startTime = state.sounds.sources[type].nextStartTime;
    source.start(startTime);
    state.sounds.sources[type].currentSource = source;
    
    // Calculate next loop start time for gapless playback
    state.sounds.sources[type].nextStartTime += audioBuffer.duration;
    
    // Schedule next loop before current one ends (overlap for seamless transition)
    const scheduleNextIn = Math.max(0, (audioBuffer.duration - 0.1) * 1000);
    setTimeout(() => {
        if (state.sounds.sources[type]?.isLooping) {
            scheduleLoop(type);
        }
    }, scheduleNextIn);
}

// Start playing a sound with seamless looping
async function startSound(type) {
    try {
        // Ensure audio context is ready
        await initAudioContext();
        
        // Pre-load if not already done
        if (!isInitialized) {
            await preloadAllAudioBuffers();
        }
        
        const audioBuffer = state.sounds.buffers[type];
        if (!audioBuffer) {
            return;
        }
        
        // Initialize source tracking for this sound type
        state.sounds.sources[type] = {
            isLooping: true,
            currentSource: null,
            nextStartTime: audioContext.currentTime
        };
        
        // Add to active sounds list
        if (!state.sounds.active.includes(type)) {
            state.sounds.active.push(type);
        }
        
        // Start the seamless loop
        scheduleLoop(type);
        
        // Update button appearance
        updateButtonState(type, true);
        
    } catch (error) {
        console.error(`Failed to start ${type}:`, error);
    }
}

// Stop playing a specific sound
function stopSound(type) {
    if (state.sounds.sources[type]) {
        // Stop looping
        state.sounds.sources[type].isLooping = false;
        
        // Stop current source
        if (state.sounds.sources[type].currentSource) {
            try {
                state.sounds.sources[type].currentSource.stop();
            } catch (e) {
                // Source might already be stopped
            }
        }
        
        // Clean up source tracking
        delete state.sounds.sources[type];
    }
    
    // Remove from active sounds list
    const index = state.sounds.active.indexOf(type);
    if (index > -1) {
        state.sounds.active.splice(index, 1);
    }
    
    // Update button appearance
    updateButtonState(type, false);
}

// Toggle sound on/off
export function toggleAmbientSound(type) {
    if (state.sounds.active.includes(type)) {
        stopSound(type);
    } else {
        startSound(type);
    }
}

// Update button visual state
function updateButtonState(type, isActive) {
    const button = document.getElementById(`${type}Btn`);
    if (button) {
        if (isActive) {
            button.classList.add('active');
            button.style.backgroundColor = 'rgba(74, 222, 128, 0.3)';
            button.style.borderColor = 'rgba(74, 222, 128, 0.5)';
        } else {
            button.classList.remove('active');
            button.style.backgroundColor = '';
            button.style.borderColor = '';
        }
    }
}

// Legacy function for backward compatibility - now toggles instead
export function playAmbientSound(type) {
    toggleAmbientSound(type);
}

// Stop all ambient sounds
export function stopAllAmbientSounds() {
    const activeSounds = [...state.sounds.active]; // Copy array to avoid modification during iteration
    activeSounds.forEach(type => stopSound(type));
}

// Legacy function - now stops all sounds
export function stopAmbientSound() {
    stopAllAmbientSounds();
}

export function setVolume(volume) {
    const volumeLevel = Math.max(0, Math.min(1, volume / 100));
    
    // Set Web Audio API volume
    if (gainNode) {
        gainNode.gain.setTargetAtTime(volumeLevel, audioContext.currentTime, 0.1);
    }
    
    // Set HTML5 audio volume (legacy support)
    if (state.sounds.audio) {
        state.sounds.audio.volume = volumeLevel;
    }
}

// Smooth volume fade for transitions
export function fadeVolume(targetVolume, duration = 1000) {
    if (!gainNode || !audioContext) return;
    
    const volumeLevel = Math.max(0, Math.min(1, targetVolume / 100));
    const fadeTime = duration / 1000;
    
    gainNode.gain.setTargetAtTime(volumeLevel, audioContext.currentTime, fadeTime / 3);
}

export function setupAmbientControls() {
    // Pre-load audio buffers on first user interaction
    let hasPreloaded = false;
    
    async function ensurePreloaded() {
        if (!hasPreloaded) {
            await preloadAllAudioBuffers();
            hasPreloaded = true;
        }
    }
    
    // Ambient sound controls with toggle functionality
    document.getElementById('rainBtn').addEventListener('click', async () => {
        await ensurePreloaded();
        toggleAmbientSound('rain');
    });
    
    document.getElementById('oceanBtn').addEventListener('click', async () => {
        await ensurePreloaded();
        toggleAmbientSound('ocean');
    });
    
    document.getElementById('forestBtn').addEventListener('click', async () => {
        await ensurePreloaded();
        toggleAmbientSound('forest');
    });
    
    document.getElementById('cafeBtn').addEventListener('click', async () => {
        await ensurePreloaded();
        toggleAmbientSound('cafe');
    });
}
