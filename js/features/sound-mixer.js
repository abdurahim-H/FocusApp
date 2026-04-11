// sound-mixer.js
//
// Phase 5D: Sound mixer — ambient presets + per-sound volume sliders.
//
// Presets: predefined combinations of sounds at specific volumes.
// Per-sound volume: injected into the active-sound-chips as range sliders.

import { toggleAmbientSound, setSoundVolume, stopAllAmbientSounds, isSoundActive } from './sounds.js';
import { state } from '../core/state.js';

// ============================================================================
// Preset definitions — { soundType: volumePercent }
// ============================================================================
const PRESETS = {
    'rainy-library': {
        sounds: { rain: 65, library: 35 },
        label: 'Rainy Library',
    },
    'forest-morning': {
        sounds: { forest: 60, birds: 50, stream: 40 },
        label: 'Forest Morning',
    },
    'deep-focus': {
        sounds: { brownnoise: 55, rain: 25 },
        label: 'Deep Focus',
    },
};

// ============================================================================
// Activate a preset — stops all current sounds, starts preset sounds
// ============================================================================
async function activatePreset(presetId) {
    const preset = PRESETS[presetId];
    if (!preset) return;

    // Stop all existing sounds first
    stopAllAmbientSounds();

    // Small delay to let stop complete
    await new Promise(r => setTimeout(r, 100));

    // Start each sound in the preset at its volume
    for (const [soundType, volume] of Object.entries(preset.sounds)) {
        if (!isSoundActive(soundType)) {
            await toggleAmbientSound(soundType);
        }
        setSoundVolume(soundType, volume);
    }

    // Update preset button states
    updatePresetStates(presetId);
}

function updatePresetStates(activePresetId) {
    document.querySelectorAll('.preset-card').forEach(card => {
        card.classList.toggle('active', card.dataset.preset === activePresetId);
    });
}

// ============================================================================
// Per-sound volume sliders in active-sound-chips
// ============================================================================

// Patch the chip rendering to include a volume slider.
// We observe mutations on the #activeSounds container and inject sliders
// into newly added chips.
function observeActiveChips() {
    const container = document.getElementById('activeSounds');
    if (!container) return;

    const observer = new MutationObserver(() => {
        injectVolumeSliders(container);
    });

    observer.observe(container, { childList: true, subtree: true });

    // Also inject on init for already-active sounds
    injectVolumeSliders(container);
}

function injectVolumeSliders(container) {
    const chips = container.querySelectorAll('.active-sound-chip');
    chips.forEach(chip => {
        // Skip if slider already injected
        if (chip.querySelector('.chip-volume-slider')) return;

        const soundType = chip.querySelector('.chip-close')?.dataset.sound;
        if (!soundType) return;

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'chip-volume-slider';
        slider.min = '0';
        slider.max = '100';
        slider.value = '30';
        slider.dataset.sound = soundType;

        slider.addEventListener('input', () => {
            setSoundVolume(soundType, parseInt(slider.value));
        });

        // Prevent click from propagating to chip close
        slider.addEventListener('click', e => e.stopPropagation());

        // Insert before the close button
        const closeBtn = chip.querySelector('.chip-close');
        chip.insertBefore(slider, closeBtn);
    });
}

// ============================================================================
// Setup
// ============================================================================
export function initSoundMixer() {
    // Preset card click handlers
    document.querySelectorAll('.preset-card').forEach(card => {
        const presetId = card.dataset.preset;
        if (presetId) {
            card.addEventListener('click', () => activatePreset(presetId));
        }
    });

    // Per-sound volume slider injection
    observeActiveChips();
}
