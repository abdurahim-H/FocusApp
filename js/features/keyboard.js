// keyboard.js
//
// Phase 5A + Phase 6: Global keyboard shortcuts. Bindings are read live from
// the settings store on every keydown, so rebinding in Settings > Shortcuts
// takes effect immediately.
//
// Guards against firing when focus is in an input/textarea/contenteditable.
// Escape always works, even when typing.

import { state } from '../core/state.js';
import { pauseTimer, resetTimer, startTimer } from '../features/timer.js';
import { isHelpCenterOpen, toggleHelpCenter } from '../ui/help-center.js';
import { switchMode } from '../ui/navigation.js';
import { getShortcut, SHORTCUTS } from '../ui/settings/shortcuts-registry.js';
import { get as settingsGet } from '../ui/settings/store.js';

function isTyping(e) {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (e.target.isContentEditable) return true;
    return false;
}

function closeAnyModal() {
    const soundModal = document.getElementById('soundLibraryModal');
    if (soundModal?.classList.contains('active')) {
        soundModal.classList.remove('active');
        document.body.style.overflow = '';
        return true;
    }
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsPanel?.classList.contains('visible')) {
        if (window._closeSettings) window._closeSettings();
        return true;
    }
    return false;
}

/** Return the currently-bound key for a shortcut id (falls back to default). */
function boundKey(id) {
    const s = getShortcut(id);
    if (!s) return null;
    return settingsGet(s.storeKey) ?? s.defaultKey;
}

function handleKeydown(e) {
    // Escape always works — close help center first if open
    if (e.key === 'Escape') {
        if (isHelpCenterOpen()) {
            e.preventDefault();
            toggleHelpCenter();
            return;
        }
        if (closeAnyModal()) {
            e.preventDefault();
            return;
        }
    }

    if (isTyping(e)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const k = e.key;

    if (k === boundKey('timer.toggle')) {
        e.preventDefault();
        if (state.timer.isRunning) pauseTimer();
        else startTimer();
        return;
    }
    if (k === boundKey('timer.reset')) {
        e.preventDefault();
        resetTimer();
        return;
    }
    if (k === boundKey('mode.home')) {
        e.preventDefault();
        switchMode('home');
        return;
    }
    if (k === boundKey('mode.focus')) {
        e.preventDefault();
        switchMode('focus');
        return;
    }
    // The old `3 = Ambient mode` binding (when Ambient was a top-level
    // tab) now opens the sound library drawer, which is where ambient
    // sounds live in the cosmos era. Lazy-imported so the keyboard
    // module doesn't pull the whole ambient bundle eagerly.
    if (k === boundKey('library.open')) {
        e.preventDefault();
        import('../ui/ambient-ui.js').then((m) => m.openDrawer?.());
        return;
    }
    if (k === boundKey('task.focus')) {
        e.preventDefault();
        if (state.mode !== 'focus') switchMode('focus');
        setTimeout(() => {
            const input = document.getElementById('taskInput');
            if (input) input.focus();
        }, 50);
        return;
    }
    if (k === boundKey('help.show')) {
        e.preventDefault();
        toggleHelpCenter();
        return;
    }
}

export function initKeyboardShortcuts() {
    document.addEventListener('keydown', handleKeydown);
}
