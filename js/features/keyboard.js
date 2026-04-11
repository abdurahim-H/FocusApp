// keyboard.js
//
// Phase 5A: Global keyboard shortcuts.
//
// All shortcuts are guarded against firing when focus is inside an input,
// textarea, or contenteditable element.
//
// Shortcut map:
//   Space       → start/pause timer (toggle)
//   R           → reset timer
//   1           → switch to Home
//   2           → switch to Focus
//   3           → switch to Ambient
//   /           → focus the task input (switches to Focus mode if needed)
//   Escape      → close any open modal
//   ?           → show shortcut hint (future)

import { state } from '../core/state.js';
import { startTimer, pauseTimer, resetTimer } from '../features/timer.js';
import { switchMode } from '../ui/navigation.js';

function isTyping(e) {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (e.target.isContentEditable) return true;
    return false;
}

function closeAnyModal() {
    // Sound library modal
    const soundModal = document.getElementById('soundLibraryModal');
    if (soundModal?.classList.contains('active')) {
        soundModal.classList.remove('active');
        document.body.style.overflow = '';
        return true;
    }
    // Settings modal
    const settingsOverlay = document.getElementById('settingsModalOverlay');
    if (settingsOverlay?.classList.contains('active')) {
        settingsOverlay.classList.remove('active');
        document.body.style.overflow = '';
        // Stop the star spin
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) settingsBtn.classList.remove('open');
        return true;
    }
    return false;
}

function handleKeydown(e) {
    // Escape always works — even inside inputs
    if (e.key === 'Escape') {
        if (closeAnyModal()) {
            e.preventDefault();
            return;
        }
    }

    // All other shortcuts: skip if user is typing
    if (isTyping(e)) return;

    // Don't fire on combos (Ctrl+R = browser reload, not our reset)
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    switch (e.key) {
        case ' ':
            e.preventDefault();
            if (state.timer.isRunning) {
                pauseTimer();
            } else {
                startTimer();
            }
            break;

        case 'r':
            e.preventDefault();
            resetTimer();
            break;

        case '1':
            e.preventDefault();
            switchMode('home');
            break;

        case '2':
            e.preventDefault();
            switchMode('focus');
            break;

        case '3':
            e.preventDefault();
            switchMode('ambient');
            break;

        case '/':
            e.preventDefault();
            // Switch to Focus mode if not already there
            if (state.mode !== 'focus') {
                switchMode('focus');
            }
            // Focus the task input after a brief delay (mode may need to render)
            setTimeout(() => {
                const input = document.getElementById('taskInput');
                if (input) input.focus();
            }, 50);
            break;
    }
}

export function initKeyboardShortcuts() {
    document.addEventListener('keydown', handleKeydown);
}
