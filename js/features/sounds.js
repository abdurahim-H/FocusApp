// Ambient Sounds Module - Modal Library System
// Handles modal UI, active sound chips, and audio playback for 25+ sounds

import { state } from '../core/state.js';
import { isReducedMotion } from '../core/motion.js';
import { createFocusTrap } from '../ui/focus-trap.js';

// Sound files live in Cloudflare R2 behind this CDN domain.
// To add new sounds: upload to the `focusapp-sounds` R2 bucket, then add
// a new entry in `ambientSounds` below. No rebuild of the audio library
// is needed — only the mapping changes.
const SOUND_CDN = 'https://cdn.universefocuses.com';

// Comprehensive sound library with audio file mappings
const ambientSounds = {
    // Nature sounds
    rain: `${SOUND_CDN}/rain_00.wav`,
    ocean: `${SOUND_CDN}/ocean_04.wav`,
    forest: `${SOUND_CDN}/forest_00.wav`,
    thunder: `${SOUND_CDN}/rain_00.wav`, // Placeholder
    wind: `${SOUND_CDN}/ocean_04.wav`, // Placeholder
    stream: `${SOUND_CDN}/rain_00.wav`, // Placeholder
    birds: `${SOUND_CDN}/forest_00.wav`, // Placeholder
    cricket: `${SOUND_CDN}/forest_00.wav`, // Placeholder

    // Indoor sounds
    fireplace: `${SOUND_CDN}/rain_00.wav`, // Placeholder
    cafe: `${SOUND_CDN}/crowd_0.wav`,
    library: `${SOUND_CDN}/crowd_0.wav`, // Placeholder
    fan: `${SOUND_CDN}/ocean_04.wav`, // Placeholder
    clock: `${SOUND_CDN}/ocean_04.wav`, // Placeholder

    // Urban sounds
    city: `${SOUND_CDN}/crowd_0.wav`, // Placeholder
    train: `${SOUND_CDN}/ocean_04.wav`, // Placeholder
    subway: `${SOUND_CDN}/crowd_0.wav`, // Placeholder
    construction: `${SOUND_CDN}/crowd_0.wav`, // Placeholder

    // White noise
    whitenoise: `${SOUND_CDN}/ocean_04.wav`, // Placeholder
    pinknoise: `${SOUND_CDN}/ocean_04.wav`, // Placeholder
    brownnoise: `${SOUND_CDN}/ocean_04.wav`, // Placeholder

    // Musical
    piano: `${SOUND_CDN}/forest_00.wav`, // Placeholder
    guitar: `${SOUND_CDN}/forest_00.wav`, // Placeholder
    chimes: `${SOUND_CDN}/rain_00.wav`, // Placeholder
};

// Sound metadata for display
const soundMetadata = {
    rain: { icon: '🌧️', name: 'Rain' },
    ocean: { icon: '🌊', name: 'Ocean Waves' },
    forest: { icon: '🌲', name: 'Forest' },
    thunder: { icon: '⚡', name: 'Thunder' },
    wind: { icon: '💨', name: 'Wind' },
    stream: { icon: '💧', name: 'Stream' },
    birds: { icon: '🐦', name: 'Birds' },
    cricket: { icon: '🦗', name: 'Crickets' },
    fireplace: { icon: '🔥', name: 'Fireplace' },
    cafe: { icon: '☕', name: 'Cafe' },
    library: { icon: '📚', name: 'Library' },
    fan: { icon: '🌀', name: 'Fan' },
    clock: { icon: '⏰', name: 'Clock' },
    city: { icon: '🚗', name: 'City Traffic' },
    train: { icon: '🚂', name: 'Train' },
    subway: { icon: '🚇', name: 'Subway' },
    construction: { icon: '🏗️', name: 'Construction' },
    whitenoise: { icon: '📻', name: 'White Noise' },
    pinknoise: { icon: '🎙️', name: 'Pink Noise' },
    brownnoise: { icon: '🎚️', name: 'Brown Noise' },
    piano: { icon: '🎹', name: 'Piano' },
    guitar: { icon: '🎸', name: 'Guitar' },
    chimes: { icon: '🎐', name: 'Wind Chimes' },
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
        
        audioElements[type] = audio;
    });
    
    isInitialized = true;
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
                }
            }
        } catch (e) {
            console.warn('🎵 Could not resume audio context:', e);
        }
        
        await startSound(type);
    }
    
    // Update all UI
    updateSoundCardState(type, !isActive);
    updateActiveSoundsDisplay();
}

// Update button visual state (legacy support)
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
        } else {
            button.classList.remove('active');
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
    }
}

// Filter sound cards based on search query
function filterSoundCards(query) {
    const searchTerm = query.toLowerCase().trim();
    const soundCards = document.querySelectorAll('.sound-card');
    let visibleCount = 0;
    
    const reduceMotion = isReducedMotion();
    soundCards.forEach((card, index) => {
        const soundName = card.getAttribute('data-sound-name') || '';
        const soundTags = card.getAttribute('data-sound-tags') || '';
        const searchText = `${soundName} ${soundTags}`.toLowerCase();

        const matches = !searchTerm || searchText.includes(searchTerm);

        if (matches) {
            if (reduceMotion) {
                card.style.display = 'flex';
                card.style.animation = 'none';
            } else {
                // Stagger animation - show card
                setTimeout(() => {
                    card.style.display = 'flex';
                    card.style.animation = 'soundCardFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
                }, visibleCount * 40); // 40ms stagger delay per visible card
            }
            visibleCount++;
        } else {
            if (reduceMotion) {
                card.style.display = 'none';
                card.style.animation = 'none';
            } else {
                // Hide card
                card.style.animation = 'soundCardFadeOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards';
                setTimeout(() => {
                    card.style.display = 'none';
                }, 300);
            }
        }
    });
    
    // Hide empty categories
    const categories = document.querySelectorAll('.sound-category');
    categories.forEach(category => {
        const visibleCards = Array.from(category.querySelectorAll('.sound-card'))
            .filter(card => card.style.display !== 'none');
        category.style.display = visibleCards.length > 0 ? 'block' : 'none';
    });
}

// Update active sounds chip display
function updateActiveSoundsDisplay() {
    const container = document.getElementById('activeSounds');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (state.sounds.active.length === 0) {
        container.style.minHeight = '0';
        return;
    }
    
    container.style.minHeight = '40px';
    
    state.sounds.active.forEach(soundType => {
        const metadata = soundMetadata[soundType];
        if (!metadata) return;
        
        const chip = document.createElement('div');
        chip.className = 'active-sound-chip';
        chip.innerHTML = `
            <span class="chip-icon" aria-hidden="true">${metadata.icon}</span>
            <span class="chip-name">${metadata.name}</span>
            <button class="chip-close" data-sound="${soundType}" aria-label="Stop ${metadata.name}">×</button>
        `;
        
        // Add click handler to close button
        const closeBtn = chip.querySelector('.chip-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleAmbientSound(soundType);
        });
        
        container.appendChild(chip);
    });
}

// Update sound card active state
function updateSoundCardState(soundType, isActive) {
    const soundCards = document.querySelectorAll(`[data-sound="${soundType}"]`);
    soundCards.forEach(card => {
        if (isActive) {
            card.classList.add('active');
            card.setAttribute('aria-pressed', 'true');
        } else {
            card.classList.remove('active');
            card.setAttribute('aria-pressed', 'false');
        }
    });
}

// Setup modal controls
let soundModalTrap = null;

function setupModalControls() {
    const modal = document.getElementById('soundLibraryModal');
    const browseBtn = document.getElementById('browseSoundsBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const backdrop = modal?.querySelector('.modal-backdrop');
    const searchInput = document.getElementById('modalSoundSearch');

    if (!modal || !browseBtn) return;

    soundModalTrap = createFocusTrap(modal);

    // Open modal
    browseBtn.addEventListener('click', () => {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        soundModalTrap.activate(browseBtn);

        // Focus search after animation
        setTimeout(() => {
            searchInput?.focus();
        }, 300);
    });

    // Close modal
    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        soundModalTrap.deactivate();

        // Clear search
        if (searchInput) {
            searchInput.value = '';
            filterSoundCards('');
        }
    };
    
    closeBtn?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', closeModal);
    
    // ESC key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
    
    // Setup search
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterSoundCards(e.target.value);
        });
    }
    
    // Setup sound card clicks
    const soundCards = document.querySelectorAll('.sound-card');
    soundCards.forEach(card => {
        const soundType = card.getAttribute('data-sound');
        if (soundType) {
            card.addEventListener('click', () => {
                toggleAmbientSound(soundType);
            });
        }
    });
}

// Setup ambient sound controls
export function setupAmbientControls() {
    
    // Initialize audio elements
    initAudioElements();
    
    // Setup modal
    setupModalControls();
    
    // Initialize active sounds display
    updateActiveSoundsDisplay();
    
}

// Stop all ambient sounds
export function stopAllAmbientSounds() {
    
    Object.keys(audioElements).forEach(type => {
        stopSound(type);
    });
    
    // Update all UI
    updateActiveSoundsDisplay();
    
    // Update all sound cards
    const soundCards = document.querySelectorAll('.sound-card');
    soundCards.forEach(card => {
        card.classList.remove('active');
    });
}

// Initialize audio system (lightweight)
export function initAudioSystem() {
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
