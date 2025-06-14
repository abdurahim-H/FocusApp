// Ambient Sounds Module - Optimized for large files with HTML5 Audio
// Uses streaming instead of pre-loading massive buffers

import { state } from './state.js';

// Ambient sounds configuration
const ambientSounds = {
    rain: './sounds/rain_00.wav',
    ocean: './sounds/ocean_04.wav',
    forest: './sounds/forest_00.wav',
    cafe: './sounds/crowd_0.wav'
};

// HTML5 Audio elements for efficient streaming
const audioElements = {};
let masterVolume = 0.3;

// Initialize audio elements (lightweight - no downloading)
function initAudioElements() {
    Object.entries(ambientSounds).forEach(([type, url]) => {
        if (!audioElements[type]) {
            const audio = new Audio();
            audio.src = url;
            audio.loop = true;
            audio.volume = 0;
            audio.preload = 'none'; // Don't preload - stream on demand
            audioElements[type] = audio;
        }
    });
}

// Start playing a sound with immediate response and seamless looping
async function startSound(type) {
    console.log(`🎵 Starting ${type} sound...`);

    const audio = audioElements[type];
    if (!audio) {
        console.error(`🎵 Audio element for ${type} not found`);
        return;
    }

    // Set volume
    audio.volume = masterVolume;

    try {
        // Play immediately (awaits if browser returns a promise)
        const playPromise = audio.play();
        if (playPromise) {
            await playPromise;
        }

        // Add to active sounds if not already there
        if (!state.sounds.active.includes(type)) {
            state.sounds.active.push(type);
        }

        // Start the seamless loop
        scheduleLoop(type);

        // Update button appearance to "playing"
        updateButtonState(type, true);

        console.log(`🎵 Started playing ${type}`);
    } catch (error) {
        console.error(`🎵 Failed to start ${type}:`, error);
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
    // Audio will be pre-loaded on first user interaction via initAudioSystem()
    
    // Ambient sound controls with toggle functionality
    document.getElementById('rainBtn')?.addEventListener('click', () => {
        toggleAmbientSound('rain');
    });
    
    document.getElementById('oceanBtn')?.addEventListener('click', () => {
        toggleAmbientSound('ocean');
    });
    
    document.getElementById('forestBtn')?.addEventListener('click', () => {
        toggleAmbientSound('forest');
    });
    
    document.getElementById('cafeBtn')?.addEventListener('click', () => {
        toggleAmbientSound('cafe');
    });
}

// Setup one-time user interaction handler to pre-load audio
let userInteractionHandler = null;
let isAudioPreloaded = false;

export async function initAudioSystem() {
    if (userInteractionHandler) return; // Already set up
    
    console.log('🎵 Setting up audio pre-loading on first user interaction...');
    
    userInteractionHandler = async () => {
        if (isAudioPreloaded) return;
        
        console.log('🎵 User interaction detected - pre-loading audio...');
        try {
            await initAudioContext();
            await preloadAllAudioBuffers();
            isAudioPreloaded = true;
            console.log('🎵 Audio pre-loading completed!');
            
            // Remove the event listeners as they're no longer needed
            document.removeEventListener('click', userInteractionHandler);
            document.removeEventListener('keydown', userInteractionHandler);
            document.removeEventListener('touchstart', userInteractionHandler);
        } catch (error) {
            console.error('🎵 Error during audio pre-loading:', error);
        }
    };
    
    // Add event listeners for user interaction
    document.addEventListener('click', userInteractionHandler);
    document.addEventListener('keydown', userInteractionHandler);
    document.addEventListener('touchstart', userInteractionHandler);
}
