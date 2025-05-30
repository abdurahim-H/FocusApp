// Ambient Sounds Module
// Handles ambient sound controls and audio management

import { state } from './state.js';

// Ambient sounds configuration
const ambientSounds = {
    rain: 'https://www.soundjay.com/misc/sounds/rain-01.wav',
    ocean: 'https://www.soundjay.com/misc/sounds/ocean-waves.wav',
    forest: 'https://www.soundjay.com/misc/sounds/forest.wav',
    space: 'https://www.soundjay.com/misc/sounds/space-ambient.wav'
};

export function playAmbientSound(type) {
    // Stop current sound
    if (state.sounds.audio) {
        state.sounds.audio.pause();
        state.sounds.audio = null;
    }

    // Play new sound
    if (type && ambientSounds[type]) {
        state.sounds.audio = new Audio(ambientSounds[type]);
        state.sounds.audio.loop = true;
        state.sounds.audio.volume = 0.3;
        state.sounds.audio.play().catch(e => console.log('Audio play failed:', e));
        state.sounds.active = type;
    }
}

export function stopAmbientSound() {
    if (state.sounds.audio) {
        state.sounds.audio.pause();
        state.sounds.audio = null;
        state.sounds.active = null;
    }
}

export function setVolume(volume) {
    if (state.sounds.audio) {
        state.sounds.audio.volume = volume / 100;
    }
}

export function setupAmbientControls() {
    // Ambient sound controls
    document.getElementById('rainBtn').addEventListener('click', () => playAmbientSound('rain'));
    document.getElementById('oceanBtn').addEventListener('click', () => playAmbientSound('ocean'));
    document.getElementById('forestBtn').addEventListener('click', () => playAmbientSound('forest'));
    document.getElementById('spaceBtn').addEventListener('click', () => playAmbientSound('space'));
}
