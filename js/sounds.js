// Ambient Sounds Module - Enhanced with Web Audio API for seamless looping
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
let currentSource = null;
let gainNode = null;
let audioBuffer = null;
let isLooping = false;
let nextStartTime = 0;

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
}

// Load audio file into buffer for seamless looping
async function loadAudioBuffer(url) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log(`Audio loaded: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.sampleRate}Hz`);
        return audioBuffer;
    } catch (error) {
        console.error('Failed to load audio buffer:', error);
        throw error;
    }
}

// Seamless loop scheduling function
function scheduleLoop() {
    if (!isLooping || !audioBuffer) return;
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(gainNode);
    
    // Schedule precise start time
    source.start(nextStartTime);
    currentSource = source;
    
    // Calculate next loop start time for gapless playback
    nextStartTime += audioBuffer.duration;
    
    // Schedule next loop before current one ends (overlap for seamless transition)
    const scheduleNextIn = Math.max(0, (audioBuffer.duration - 0.1) * 1000);
    setTimeout(() => {
        if (isLooping) scheduleLoop();
    }, scheduleNextIn);
}

export function playAmbientSound(type) {
    // Stop current sound
    stopAmbientSound();

    if (type && ambientSounds[type]) {
        // All sounds are now local files, use Web Audio API for seamless looping
        playSeamlessLoop(type);
    }
}

// Seamless Web Audio API playback
async function playSeamlessLoop(type) {
    try {
        await initAudioContext();
        await loadAudioBuffer(ambientSounds[type]);
        
        isLooping = true;
        nextStartTime = audioContext.currentTime;
        state.sounds.active = type;
        
        // Start the seamless loop
        scheduleLoop();
        console.log(`Started seamless ${type} loop`);
        
    } catch (error) {
        console.error('Seamless audio failed, falling back to HTML5:', error);
        playHTML5Audio(type);
    }
}

// Fallback HTML5 audio for external URLs
function playHTML5Audio(type) {
    state.sounds.audio = new Audio(ambientSounds[type]);
    state.sounds.audio.loop = true;
    state.sounds.audio.volume = 0.3;
    state.sounds.audio.play().catch(e => console.log('Audio play failed:', e));
    state.sounds.active = type;
}

export function stopAmbientSound() {
    // Stop Web Audio API sources
    isLooping = false;
    if (currentSource) {
        try {
            currentSource.stop();
        } catch (e) {
            // Source might already be stopped
        }
        currentSource = null;
    }
    
    // Stop HTML5 audio
    if (state.sounds.audio) {
        state.sounds.audio.pause();
        state.sounds.audio = null;
    }
    
    state.sounds.active = null;
    audioBuffer = null;
}

export function setVolume(volume) {
    const volumeLevel = Math.max(0, Math.min(1, volume / 100));
    
    // Set Web Audio API volume
    if (gainNode) {
        gainNode.gain.setTargetAtTime(volumeLevel, audioContext.currentTime, 0.1);
    }
    
    // Set HTML5 audio volume
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
    // Ambient sound controls with user interaction requirement for audio context
    document.getElementById('rainBtn').addEventListener('click', async () => {
        await initAudioContext(); // Ensure context is ready
        playAmbientSound('rain');
    });
    document.getElementById('oceanBtn').addEventListener('click', async () => {
        await initAudioContext();
        playAmbientSound('ocean');
    });
    document.getElementById('forestBtn').addEventListener('click', async () => {
        await initAudioContext();
        playAmbientSound('forest');
    });
    document.getElementById('cafeBtn').addEventListener('click', async () => {
        await initAudioContext();
        playAmbientSound('cafe');
    });
}
