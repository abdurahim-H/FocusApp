// Ambient Sounds Module - Optimized for large files with HTML5 Audio streaming
// Uses HTML5 Audio elements instead of Web Audio API for better performance with large files

import { state } from './state.js';

// Ambient sounds configuration
const ambientSounds = {
    rain: './sounds/rain_00.wav',
    ocean: './sounds/ocean_04.wav',
    forest: './sounds/forest_00.wav',
    cafe: './sounds/crowd_0.wav'
};

// HTML5 Audio elements for streaming
const audioElements = {};
let masterVolume = 0.3;
let isInitialized = false;

// Initialize audio elements (lightweight)
function initAudioElements() {
    if (isInitialized) return;
    
    Object.entries(ambientSounds).forEach(([type, url]) => {
        const audio = new Audio();
        audio.src = url;
        audio.loop = true;
        audio.volume = masterVolume; // Initialize with master volume instead of 0
        audio.preload = 'metadata'; // Only load metadata, not full audio
        
        // Add error handling for audio loading
        audio.addEventListener('error', (e) => {
            console.error(`🎵 Error loading ${type} audio:`, e);
        });
        
        // Add audio state event listeners
        audio.addEventListener('loadstart', () => {
            console.log(`🎵 Started loading ${type}`);
        });
        
        audio.addEventListener('canplay', () => {
            console.log(`🎵 ${type} ready to play`);
        });
        
        audioElements[type] = audio;
    });
    
    isInitialized = true;
    console.log('🎵 Audio elements initialized for streaming');
}

// Start playing a sound
async function startSound(type) {
    try {
        const audio = audioElements[type];
        if (!audio) {
            console.error(`🎵 Audio element for ${type} not found`);
            return;
        }

        // Ensure audio is ready before playing
        if (audio.readyState < 2) {
            console.log(`🎵 Waiting for ${type} to load...`);
            await new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error(`Timeout loading ${type}`));
                }, 10000); // 10 second timeout
                
                audio.addEventListener('canplay', () => {
                    clearTimeout(timeoutId);
                    resolve();
                }, { once: true });
                
                audio.addEventListener('error', (e) => {
                    clearTimeout(timeoutId);
                    reject(e);
                }, { once: true });
                
                // Trigger loading if not already started
                audio.load();
            });
        }

        // Set volume and play - ensure volume is audible
        const volumeToSet = masterVolume > 0 ? masterVolume : 0.3;
        audio.volume = volumeToSet;
        
        // Play with retry logic
        let playAttempts = 0;
        const maxAttempts = 3;
        
        while (playAttempts < maxAttempts) {
            try {
                await audio.play();
                break;
            } catch (playError) {
                playAttempts++;
                console.warn(`🎵 Play attempt ${playAttempts} failed for ${type}:`, playError);
                
                if (playAttempts >= maxAttempts) {
                    throw playError;
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        console.log(`🎵 Started playing ${type} at volume ${Math.round(volumeToSet * 100)}%`);

        // Add to active sounds
        if (!state.sounds.active.includes(type)) {
            state.sounds.active.push(type);
        }

    } catch (error) {
        console.error(`🎵 Error starting ${type}:`, error);
        // Remove from active sounds if it failed to start
        const index = state.sounds.active.indexOf(type);
        if (index > -1) {
            state.sounds.active.splice(index, 1);
        }
    }
}

// Stop playing a sound
function stopSound(type) {
    try {
        const audio = audioElements[type];
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            console.log(`🎵 Stopped ${type}`);
        }

        // Remove from active sounds
        const index = state.sounds.active.indexOf(type);
        if (index > -1) {
            state.sounds.active.splice(index, 1);
        }

    } catch (error) {
        console.error(`🎵 Error stopping ${type}:`, error);
    }
}

// Toggle ambient sound on/off
export async function toggleAmbientSound(type) {
    console.log(`🎵 Toggling ${type}...`);
    
    // Initialize audio elements if needed
    if (!isInitialized) {
        initAudioElements();
    }
    
    const isActive = state.sounds.active.includes(type);
    
    if (isActive) {
        stopSound(type);
    } else {
        // Ensure audio context is resumed (required by some browsers)
        try {
            if (typeof AudioContext !== 'undefined') {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                    console.log('🎵 Audio context resumed');
                }
            }
        } catch (e) {
            console.warn('🎵 Could not resume audio context:', e);
        }
        
        await startSound(type);
    }
    
    // Update UI
    updateSoundButtonState(type, !isActive);
}

// Update button visual state
function updateSoundButtonState(type, isActive) {
    const buttonMap = {
        rain: 'rainBtn',
        ocean: 'oceanBtn', 
        forest: 'forestBtn',
        cafe: 'cafeBtn'
    };
    
    const buttonId = buttonMap[type];
    const button = document.getElementById(buttonId);
    
    if (button) {
        if (isActive) {
            button.classList.add('active');
            button.style.background = '#28a745';
        } else {
            button.classList.remove('active'); 
            button.style.background = '';
        }
    }
}

// Set master volume for all sounds
export function setAmbientVolume(volumeLevel) {
    masterVolume = Math.max(0, Math.min(1, volumeLevel));
    
    // Update all active audio elements
    Object.values(audioElements).forEach(audio => {
        audio.volume = masterVolume;
    });
    
    console.log(`🎵 Master volume set to ${Math.round(masterVolume * 100)}%`);
}

// Legacy function for backward compatibility with meditation.js
export function setVolume(volumePercent) {
    const volumeLevel = Math.max(0, Math.min(100, volumePercent)) / 100;
    setAmbientVolume(volumeLevel);
}

// Set volume for a specific sound
export function setSoundVolume(type, volumePercent) {
    const volumeLevel = Math.max(0, Math.min(100, volumePercent)) / 100;
    const audio = audioElements[type];
    
    if (audio) {
        audio.volume = volumeLevel;
        console.log(`🎵 Set ${type} volume to ${Math.round(volumeLevel * 100)}%`);
    }
}

// Setup ambient sound controls
export function setupAmbientControls() {
    console.log('🎵 Setting up ambient controls...');
    
    // Initialize audio elements
    initAudioElements();
    
    // Rain button
    const rainBtn = document.getElementById('rainBtn');
    if (rainBtn) {
        rainBtn.addEventListener('click', () => toggleAmbientSound('rain'));
    }
    
    // Ocean button
    const oceanBtn = document.getElementById('oceanBtn');
    if (oceanBtn) {
        oceanBtn.addEventListener('click', () => toggleAmbientSound('ocean'));
    }
    
    // Forest button
    const forestBtn = document.getElementById('forestBtn');
    if (forestBtn) {
        forestBtn.addEventListener('click', () => toggleAmbientSound('forest'));
    }
    
    // Cafe button
    const cafeBtn = document.getElementById('cafeBtn');
    if (cafeBtn) {
        cafeBtn.addEventListener('click', () => toggleAmbientSound('cafe'));
    }
    
    console.log('🎵 Ambient controls ready');
}

// Stop all ambient sounds
export function stopAllAmbientSounds() {
    console.log('🎵 Stopping all ambient sounds...');
    
    Object.keys(audioElements).forEach(type => {
        stopSound(type);
        updateSoundButtonState(type, false);
    });
}

// Initialize audio system (lightweight)
export function initAudioSystem() {
    console.log('🎵 Initializing audio system...');
    initAudioElements();
    return true;
}

// Check if sound is playing
export function isSoundActive(type) {
    return state.sounds.active.includes(type);
}

// Get all active sounds
export function getActiveSounds() {
    return [...state.sounds.active];
}
