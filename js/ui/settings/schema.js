// settings/schema.js
//
// Declarative settings blueprint. Every row is data — the renderer iterates
// this list and builds the DOM. Adding a new setting = adding an entry.
//
// Row shape varies by `type`:
//   { section, type: 'group',          label, collapsible?, collapsed? }
//   { section, type: 'slider',         key, label, min, max, step, unit?, default, help? }
//   { section, type: 'toggle',         key, label, default, help? }
//   { section, type: 'stepper',        key, label, min, max, step, suffix?, default }
//   { section, type: 'segmented',      key, label, options:[{value,label}], default }
//   { section, type: 'select',         key, label, options:[{value,label}], default }
//   { section, type: 'theme-cards',    key, options:[...], default }
//   { section, type: 'text',           key, label, placeholder?, default }
//   { section, type: 'button',         id, label, danger?, confirm? }
//   { section, type: 'button-row',     items:[{id,label}] }
//   { section, type: 'shortcut-list' }
//   { section, type: 'notif-permission', key }
//   { section, type: 'profile-list' }
//   { section, type: 'schedule-list',  key, default }
//   { section, type: 'readonly',       key, label, live? }
//
// Optional row fields:
//   help      — secondary description shown below the control
//   showIf    — fn(store) → bool; hides the row when false
//   advanced  — true → lives inside the collapsible Advanced group

export const SECTIONS = [
    { id: 'scene',         label: 'Scene',         iconPath: 'M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4L2 9.4h7.6z' }, // star
    { id: 'timer',         label: 'Timer',         iconPath: 'M12 2a10 10 0 100 20 10 10 0 000-20zm1 10V6h-2v7l5.5 3.3 1-1.7z' },   // clock
    { id: 'sounds',        label: 'Sounds',        iconPath: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 8v8a4.5 4.5 0 002.5-4z' }, // speaker
    { id: 'notifications', label: 'Notifications', iconPath: 'M12 22a2 2 0 002-2h-4a2 2 0 002 2zm6-6V11c0-3-2-5.5-5-6V4a1 1 0 10-2 0v1c-3 .5-5 3-5 6v5l-2 2v1h16v-1l-2-2z' }, // bell
    { id: 'shortcuts',     label: 'Shortcuts',     iconPath: 'M20 5H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-3 0h2v2H5v-2zm0-3h2v2H5V8zm3 6h8v2H8v-2zm6-3h2v2h-2v-2zm0-3h2v2h-2V8zm3 3h2v2h-2v-2zm0-3h2v2h-2V8z' }, // keyboard
    { id: 'profiles',      label: 'Profiles',      iconPath: 'M12 2L4 6v6c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V6l-8-4z' }, // shield
    { id: 'data',          label: 'Data & About',  iconPath: 'M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z' }, // info
];

export const SCHEMA = [
    // ═══════════════════════════════════════════════════════════════════════
    // SCENE
    // ═══════════════════════════════════════════════════════════════════════
    { section: 'scene', type: 'group', label: 'Theme' },
    {
        section: 'scene',
        type: 'theme-cards',
        key: 'scene.theme',
        default: 'blackhole',
        options: [
            { value: 'blackhole', label: 'Black Hole' },
            { value: 'coming-2',  label: 'Coming soon', disabled: true },
            { value: 'coming-3',  label: 'Coming soon', disabled: true },
        ],
    },

    { section: 'scene', type: 'group', label: 'Quality' },
    {
        section: 'scene',
        type: 'segmented',
        key: 'scene.quality',
        label: 'Preset',
        default: 'auto',
        options: [
            { value: 'auto',   label: 'Auto' },
            { value: 'low',    label: 'Low' },
            { value: 'medium', label: 'Med' },
            { value: 'high',   label: 'High' },
            { value: 'ultra',  label: 'Ultra' },
        ],
        help: 'Auto = detected from your GPU',
    },

    {
        section: 'scene',
        type: 'group',
        label: 'Advanced',
        collapsible: true,
        collapsed: true,
    },
    {
        section: 'scene', advanced: true, type: 'slider',
        key: 'scene.bloomWeight', label: 'Bloom',
        min: 0, max: 1.5, step: 0.05, default: 0.55,
    },
    {
        section: 'scene', advanced: true, type: 'slider',
        key: 'scene.exposure', label: 'Exposure',
        min: 0.5, max: 2, step: 0.05, default: 1.2,
    },
    {
        section: 'scene', advanced: true, type: 'slider',
        key: 'scene.godRayIntensity', label: 'God rays',
        min: 0, max: 0.3, step: 0.01, default: 0.1,
    },
    {
        section: 'scene', advanced: true, type: 'slider',
        key: 'scene.vignette', label: 'Vignette',
        min: 0, max: 3, step: 0.1, default: 1.5,
    },
    {
        section: 'scene', advanced: true, type: 'slider',
        key: 'scene.chromaticAberration', label: 'Chromatic',
        min: 0, max: 10, step: 0.5, default: 2,
    },
    {
        section: 'scene', advanced: true, type: 'slider',
        key: 'scene.grain', label: 'Film grain',
        min: 0, max: 0.1, step: 0.005, default: 0.03,
    },
    {
        section: 'scene', advanced: true, type: 'slider',
        key: 'scene.cameraShake', label: 'Camera shake',
        min: 0, max: 3, step: 0.1, default: 1,
    },
    {
        section: 'scene', advanced: true, type: 'slider',
        key: 'scene.starDensity', label: 'Star density',
        min: 0.3, max: 1.5, step: 0.1, default: 1,
        help: 'Applies on next page load',
    },
    {
        section: 'scene', advanced: true, type: 'toggle',
        key: 'scene.dofEnabled', label: 'Depth of field',
        default: false,
        help: 'WebGL2 only — disabled on WebGPU',
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TIMER
    // ═══════════════════════════════════════════════════════════════════════
    { section: 'timer', type: 'group', label: 'Durations' },
    {
        section: 'timer', type: 'slider',
        key: 'timer.focusDuration', label: 'Focus',
        min: 1, max: 90, step: 1, unit: 'm', default: 25,
    },
    {
        section: 'timer', type: 'slider',
        key: 'timer.shortBreakDuration', label: 'Short break',
        min: 1, max: 30, step: 1, unit: 'm', default: 5,
    },
    {
        section: 'timer', type: 'slider',
        key: 'timer.longBreakDuration', label: 'Long break',
        min: 1, max: 60, step: 1, unit: 'm', default: 15,
    },

    { section: 'timer', type: 'group', label: 'Flow' },
    {
        section: 'timer', type: 'toggle',
        key: 'timer.autoStart', label: 'Auto-start next session',
        default: true,
        help: 'Rolls from focus → break → focus without clicks',
    },
    {
        section: 'timer', type: 'slider',
        key: 'timer.autoStartDelay', label: 'Delay',
        min: 0, max: 3000, step: 50, unit: 'ms', default: 150,
        showIf: (s) => s.get('timer.autoStart'),
    },
    {
        section: 'timer', type: 'stepper',
        key: 'timer.longBreakInterval', label: 'Long break every',
        min: 2, max: 8, step: 1, suffix: 'sessions', default: 4,
    },
    {
        section: 'timer', type: 'stepper',
        key: 'timer.pomodoroGoal', label: 'Cycle goal',
        min: 1, max: 12, step: 1, suffix: 'sessions', default: 4,
    },

    {
        section: 'timer', type: 'group',
        label: 'Schedules',
        collapsible: true, collapsed: true,
    },
    {
        section: 'timer', type: 'schedule-list',
        key: 'timer.schedules',
        default: [],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SOUNDS
    // ═══════════════════════════════════════════════════════════════════════
    { section: 'sounds', type: 'group', label: 'Volume' },
    {
        section: 'sounds', type: 'slider',
        key: 'sounds.masterVolume', label: 'Master',
        min: 0, max: 100, step: 1, unit: '%', default: 30,
    },

    { section: 'sounds', type: 'group', label: 'Behavior' },
    {
        section: 'sounds', type: 'toggle',
        key: 'sounds.autoResume', label: 'Remember active sounds',
        default: true,
        help: 'Restore your last mix on page load',
    },

    // ═══════════════════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════════════
    { section: 'notifications', type: 'group', label: 'Permission' },
    { section: 'notifications', type: 'notif-permission', key: 'notifications.permission' },

    { section: 'notifications', type: 'group', label: 'Alerts' },
    {
        section: 'notifications', type: 'toggle',
        key: 'notifications.focusComplete', label: 'Focus session complete',
        default: true,
    },
    {
        section: 'notifications', type: 'toggle',
        key: 'notifications.breakComplete', label: 'Break complete',
        default: true,
    },
    {
        section: 'notifications', type: 'toggle',
        key: 'notifications.cycleComplete', label: 'Full cycle complete',
        default: true,
    },
    {
        section: 'notifications', type: 'select',
        key: 'notifications.autoClose', label: 'Auto-close after',
        default: 15,
        options: [
            { value: 5,  label: '5s' },
            { value: 10, label: '10s' },
            { value: 15, label: '15s' },
            { value: 30, label: '30s' },
            { value: 0,  label: 'Never' },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SHORTCUTS & MOTION
    // ═══════════════════════════════════════════════════════════════════════
    { section: 'shortcuts', type: 'group', label: 'Keyboard' },
    { section: 'shortcuts', type: 'shortcut-list' },

    { section: 'shortcuts', type: 'group', label: 'Motion' },
    {
        section: 'shortcuts', type: 'toggle',
        key: 'motion.forceReduce', label: 'Reduce motion',
        default: false,
        help: 'Override your system preference',
    },
    {
        section: 'shortcuts', type: 'slider',
        key: 'motion.speedMultiplier', label: 'Animation speed',
        min: 0.5, max: 2, step: 0.1, default: 1,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // PROFILES
    // ═══════════════════════════════════════════════════════════════════════
    { section: 'profiles', type: 'group', label: 'Focus profiles' },
    { section: 'profiles', type: 'profile-list' },

    // ═══════════════════════════════════════════════════════════════════════
    // DATA & ABOUT
    // ═══════════════════════════════════════════════════════════════════════
    { section: 'data', type: 'group', label: 'Greeting' },
    {
        section: 'data', type: 'text',
        key: 'greeting.text', label: 'Greeting',
        placeholder: 'Welcome to Your Universe!',
        default: '',
        help: 'Use {{time}} for morning/afternoon/evening',
    },

    { section: 'data', type: 'group', label: 'Export' },
    {
        section: 'data', type: 'button-row',
        items: [
            { id: 'export-json',  label: 'Settings (JSON)' },
            { id: 'export-csv',   label: 'Stats (CSV)' },
            { id: 'share-link',   label: 'Share link' },
        ],
    },

    { section: 'data', type: 'group', label: 'Import' },
    { section: 'data', type: 'button', id: 'import-json', label: 'Import settings file' },

    { section: 'data', type: 'group', label: 'Reset' },
    {
        section: 'data', type: 'button', id: 'reset-section',
        label: 'Reset current section',
    },
    {
        section: 'data', type: 'button', id: 'reset-all',
        label: 'Reset all settings', danger: true, confirm: true,
    },
    {
        section: 'data', type: 'button', id: 'clear-data',
        label: 'Clear all data (settings + stats)', danger: true, confirm: true,
    },

    { section: 'data', type: 'group', label: 'About' },
    { section: 'data', type: 'readonly', key: 'about.version',   label: 'Version' },
    { section: 'data', type: 'readonly', key: 'about.gpuTier',   label: 'GPU tier' },
    { section: 'data', type: 'readonly', key: 'about.engine',    label: 'Render engine' },
    { section: 'data', type: 'readonly', key: 'about.fps',       label: 'FPS', live: true },
    { section: 'data', type: 'readonly', key: 'about.browser',   label: 'Browser' },
];

/** Find all schema rows that belong to a given section. */
export function rowsForSection(sectionId) {
    return SCHEMA.filter(r => r.section === sectionId);
}

/** Look up a single row by its key. */
export function rowForKey(key) {
    return SCHEMA.find(r => r.key === key);
}
