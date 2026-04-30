// settings/shortcuts-registry.js
//
// Central catalog of every keyboard shortcut the app responds to.
// Both keyboard.js and the settings cheatsheet read from here so the two
// never drift out of sync.

export const SHORTCUTS = [
    {
        id: 'timer.toggle',
        label: 'Start / pause timer',
        defaultKey: ' ',
        displayDefault: 'Space',
        storeKey: 'shortcuts.timer.toggle',
    },
    {
        id: 'timer.reset',
        label: 'Reset timer',
        defaultKey: 'r',
        displayDefault: 'R',
        storeKey: 'shortcuts.timer.reset',
    },
    {
        id: 'mode.home',
        label: 'Home mode',
        defaultKey: '1',
        displayDefault: '1',
        storeKey: 'shortcuts.mode.home',
    },
    {
        id: 'mode.focus',
        label: 'Focus mode',
        defaultKey: '2',
        displayDefault: '2',
        storeKey: 'shortcuts.mode.focus',
    },
    {
        id: 'library.open',
        label: 'Open sound library',
        defaultKey: '3',
        displayDefault: '3',
        // storeKey kept as `shortcuts.mode.ambient` so users who rebound
        // the legacy "Ambient mode" key (when Ambient was a top-level
        // tab) keep their custom binding without a migration step.
        storeKey: 'shortcuts.mode.ambient',
    },
    {
        id: 'task.focus',
        label: 'Focus task input',
        defaultKey: '/',
        displayDefault: '/',
        storeKey: 'shortcuts.task.focus',
    },
    {
        id: 'help.show',
        label: 'Show shortcuts cheatsheet',
        defaultKey: '?',
        displayDefault: '?',
        storeKey: 'shortcuts.help.show',
    },
    {
        id: 'modal.close',
        label: 'Close modal',
        defaultKey: 'Escape',
        displayDefault: 'Esc',
        storeKey: 'shortcuts.modal.close',
        locked: true, // Esc can never be rebound — it's the universal escape hatch
    },
];

/** Human-readable label for a raw key string. */
export function displayKey(k) {
    if (k === ' ') return 'Space';
    if (k === 'Escape') return 'Esc';
    if (k === 'ArrowUp') return '↑';
    if (k === 'ArrowDown') return '↓';
    if (k === 'ArrowLeft') return '←';
    if (k === 'ArrowRight') return '→';
    if (k.length === 1) return k.toUpperCase();
    return k;
}

/** Look up a shortcut by id. */
export function getShortcut(id) {
    return SHORTCUTS.find((s) => s.id === id);
}
