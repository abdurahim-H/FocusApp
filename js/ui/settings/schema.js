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
    // Feather-style stroke icons (rendered with stroke, not fill)
    {
        id: 'scene',
        label: 'Scene',
        iconStroke: true,
        iconSvg:
            '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41"/>',
    },
    {
        id: 'timer',
        label: 'Timer',
        iconStroke: true,
        iconSvg: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    },
    {
        id: 'sounds',
        label: 'Sounds',
        iconStroke: true,
        iconSvg:
            '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/>',
    },
    {
        id: 'notifications',
        label: 'Notifications',
        iconStroke: true,
        iconSvg:
            '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>',
    },
    {
        id: 'shortcuts',
        label: 'Shortcuts',
        iconStroke: true,
        iconSvg:
            '<rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>',
    },
    {
        id: 'profiles',
        label: 'Presets',
        iconStroke: true,
        iconSvg:
            '<path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/><circle cx="12" cy="12" r="3"/>',
    },
    {
        id: 'feedback',
        label: 'Feedback',
        iconStroke: true,
        iconSvg:
            '<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>',
    },
    {
        id: 'data',
        label: 'Data & About',
        iconStroke: true,
        iconSvg:
            '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    },
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
            { value: 'coming-2', label: 'Coming soon', disabled: true },
            { value: 'coming-3', label: 'Coming soon', disabled: true },
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
            { value: 'auto', label: 'Auto' },
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Med' },
            { value: 'high', label: 'High' },
            { value: 'ultra', label: 'Ultra' },
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
        section: 'scene',
        advanced: true,
        type: 'slider',
        key: 'scene.bloomWeight',
        label: 'Bloom',
        min: 0,
        max: 1.5,
        step: 0.05,
        default: 0.55,
    },
    {
        section: 'scene',
        advanced: true,
        type: 'slider',
        key: 'scene.exposure',
        label: 'Exposure',
        min: 0.5,
        max: 2,
        step: 0.05,
        default: 1.2,
    },
    {
        section: 'scene',
        advanced: true,
        type: 'slider',
        key: 'scene.godRayIntensity',
        label: 'God rays',
        min: 0,
        max: 0.3,
        step: 0.01,
        default: 0.1,
    },
    {
        section: 'scene',
        advanced: true,
        type: 'slider',
        key: 'scene.vignette',
        label: 'Vignette',
        min: 0,
        max: 3,
        step: 0.1,
        default: 1.5,
    },
    {
        section: 'scene',
        advanced: true,
        type: 'slider',
        key: 'scene.chromaticAberration',
        label: 'Chromatic',
        min: 0,
        max: 10,
        step: 0.5,
        default: 2,
    },
    {
        section: 'scene',
        advanced: true,
        type: 'slider',
        key: 'scene.grain',
        label: 'Film grain',
        min: 0,
        max: 0.1,
        step: 0.005,
        default: 0.03,
    },
    {
        section: 'scene',
        advanced: true,
        type: 'slider',
        key: 'scene.cameraShake',
        label: 'Camera shake',
        min: 0,
        max: 3,
        step: 0.1,
        default: 1,
    },
    {
        section: 'scene',
        advanced: true,
        type: 'slider',
        key: 'scene.starDensity',
        label: 'Star density',
        min: 0.3,
        max: 1.5,
        step: 0.1,
        default: 1,
        help: 'Applies on next page load',
    },
    {
        section: 'scene',
        advanced: true,
        type: 'toggle',
        key: 'scene.dofEnabled',
        label: 'Depth of field',
        default: false,
        help: 'WebGL2 only — disabled on WebGPU',
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TIMER
    // ═══════════════════════════════════════════════════════════════════════
    { section: 'timer', type: 'group', label: 'Durations' },
    {
        section: 'timer',
        type: 'slider',
        key: 'timer.focusDuration',
        label: 'Focus',
        min: 1,
        max: 90,
        step: 1,
        unit: 'm',
        default: 25,
    },
    {
        section: 'timer',
        type: 'slider',
        key: 'timer.shortBreakDuration',
        label: 'Short break',
        min: 1,
        max: 30,
        step: 1,
        unit: 'm',
        default: 5,
    },
    {
        section: 'timer',
        type: 'slider',
        key: 'timer.longBreakDuration',
        label: 'Long break',
        min: 1,
        max: 60,
        step: 1,
        unit: 'm',
        default: 15,
    },

    { section: 'timer', type: 'group', label: 'Flow' },
    {
        section: 'timer',
        type: 'toggle',
        key: 'timer.autoStart',
        label: 'Auto-start next session',
        default: true,
        help: 'Rolls from focus → break → focus without clicks',
    },
    {
        section: 'timer',
        type: 'slider',
        key: 'timer.autoStartDelay',
        label: 'Delay',
        min: 0,
        max: 3000,
        step: 50,
        unit: 'ms',
        default: 150,
        showIf: (s) => s.get('timer.autoStart'),
    },
    {
        section: 'timer',
        type: 'stepper',
        key: 'timer.longBreakInterval',
        label: 'Long break every',
        min: 2,
        max: 8,
        step: 1,
        suffix: 'sessions',
        default: 4,
    },
    {
        section: 'timer',
        type: 'stepper',
        key: 'timer.pomodoroGoal',
        label: 'Cycle goal',
        min: 1,
        max: 12,
        step: 1,
        suffix: 'sessions',
        default: 4,
    },

    { section: 'timer', type: 'group', label: 'Goals' },
    {
        section: 'timer',
        type: 'slider',
        key: 'timer.dailyGoalMinutes',
        label: 'Daily focus goal',
        min: 0,
        max: 480,
        step: 5,
        unit: 'm',
        default: 90,
        help: 'Progress ring shows how close today is to this target. 0 disables the ring.',
    },
    {
        section: 'timer',
        type: 'slider',
        key: 'timer.weeklyGoalMinutes',
        label: 'Weekly focus goal',
        min: 0,
        max: 3600,
        step: 30,
        unit: 'm',
        default: 720,
        help: 'Optional weekly target shown on the Home week tile. 0 hides it.',
    },

    { section: 'timer', type: 'group', label: 'Display' },
    {
        section: 'timer',
        type: 'select',
        key: 'timer.timeFormat',
        label: 'Time format',
        default: '12h',
        options: [
            { value: '12h', label: '12-hour' },
            { value: '24h', label: '24-hour' },
        ],
        help: 'Affects the clock on the Home screen',
    },

    {
        section: 'timer',
        type: 'group',
        label: 'Schedules',
        collapsible: true,
        collapsed: true,
    },
    {
        section: 'timer',
        type: 'schedule-list',
        key: 'timer.schedules',
        default: [],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SOUNDS
    // ═══════════════════════════════════════════════════════════════════════
    { section: 'sounds', type: 'group', label: 'Volume' },
    {
        section: 'sounds',
        type: 'slider',
        key: 'sounds.masterVolume',
        label: 'Master',
        min: 0,
        max: 100,
        step: 1,
        unit: '%',
        default: 30,
    },

    { section: 'sounds', type: 'group', label: 'Behavior' },
    {
        section: 'sounds',
        type: 'toggle',
        key: 'sounds.autoResume',
        label: 'Remember active sounds',
        default: true,
        help: 'Restore your last mix on page load',
    },
    {
        section: 'sounds',
        type: 'toggle',
        key: 'sounds.autoFadeOnSessionEnd',
        label: 'Fade out when session ends',
        default: true,
        help: 'Smoothly fades the mix to silence when a focus or break ends',
    },
    {
        section: 'sounds',
        type: 'toggle',
        key: 'sounds.autoStartOnFocus',
        label: 'Auto-start mix on focus session',
        default: false,
        help: 'When a focus session begins, play the mix pinned as your focus-start mix',
    },

    // ═══════════════════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════════════
    { section: 'notifications', type: 'group', label: 'Permission' },
    { section: 'notifications', type: 'notif-permission', key: 'notifications.permission' },

    { section: 'notifications', type: 'group', label: 'Alerts' },
    {
        section: 'notifications',
        type: 'toggle',
        key: 'notifications.focusComplete',
        label: 'Focus session complete',
        default: true,
    },
    {
        section: 'notifications',
        type: 'toggle',
        key: 'notifications.breakComplete',
        label: 'Break complete',
        default: true,
    },
    {
        section: 'notifications',
        type: 'toggle',
        key: 'notifications.cycleComplete',
        label: 'Full cycle complete',
        default: true,
    },
    {
        section: 'notifications',
        type: 'select',
        key: 'notifications.autoClose',
        label: 'Auto-close after',
        default: 15,
        options: [
            { value: 5, label: '5s' },
            { value: 10, label: '10s' },
            { value: 15, label: '15s' },
            { value: 30, label: '30s' },
            { value: 0, label: 'Never' },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SHORTCUTS & MOTION
    // ═══════════════════════════════════════════════════════════════════════
    { section: 'shortcuts', type: 'group', label: 'Keyboard' },
    { section: 'shortcuts', type: 'shortcut-list' },

    { section: 'shortcuts', type: 'group', label: 'Motion' },
    {
        section: 'shortcuts',
        type: 'toggle',
        key: 'motion.forceReduce',
        label: 'Reduce motion',
        default: false,
        help: 'Override your system preference',
    },
    {
        section: 'shortcuts',
        type: 'slider',
        key: 'motion.speedMultiplier',
        label: 'Animation speed',
        min: 0.5,
        max: 2,
        step: 0.1,
        default: 1,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // PROFILES
    // ═══════════════════════════════════════════════════════════════════════
    {
        section: 'profiles',
        type: 'group',
        label: 'Focus presets',
        hint: 'Save current settings as a preset to switch between different focus setups.',
    },
    { section: 'profiles', type: 'profile-list' },

    // ═══════════════════════════════════════════════════════════════════════
    // FEEDBACK
    // ═══════════════════════════════════════════════════════════════════════
    { section: 'feedback', type: 'group', label: 'Help shape Cosmic Focus' },
    { section: 'feedback', type: 'feedback-form' },

    // ═══════════════════════════════════════════════════════════════════════
    // DATA & ABOUT
    // ═══════════════════════════════════════════════════════════════════════
    { section: 'data', type: 'group', label: 'Greeting' },
    {
        section: 'data',
        type: 'text',
        key: 'greeting.text',
        label: 'Greeting',
        placeholder: 'Welcome to Your Universe!',
        default: '',
        // Hard cap so a paste of an essay can't blow out localStorage
        // or stall layout. The home headline only has room for ~5 words.
        maxLength: 80,
        help: 'Use {{time}} for morning/afternoon/evening',
    },

    { section: 'data', type: 'group', label: 'Export' },
    {
        section: 'data',
        type: 'button-row',
        items: [
            { id: 'export-json', label: 'Settings (JSON)' },
            { id: 'export-csv', label: 'Stats (CSV)' },
            { id: 'share-link', label: 'Share link' },
        ],
    },

    { section: 'data', type: 'group', label: 'Import' },
    { section: 'data', type: 'button', id: 'import-json', label: 'Import settings file' },

    { section: 'data', type: 'group', label: 'Reset' },
    {
        section: 'data',
        type: 'button',
        id: 'reset-section',
        label: 'Reset current section',
    },
    {
        section: 'data',
        type: 'button',
        id: 'reset-all',
        label: 'Reset all settings',
        danger: true,
        confirm: true,
    },
    {
        section: 'data',
        type: 'button',
        id: 'clear-data',
        label: 'Clear all data (settings + stats)',
        danger: true,
        confirm: true,
    },

    { section: 'data', type: 'group', label: 'Help' },
    { section: 'data', type: 'button', id: 'show-tour', label: 'Replay welcome tour' },

    { section: 'data', type: 'group', label: 'Legal' },
    {
        section: 'data',
        type: 'button-row',
        items: [
            { id: 'open-privacy', label: 'Privacy Policy' },
            { id: 'open-terms', label: 'Terms of Service' },
        ],
    },

    { section: 'data', type: 'group', label: 'About' },
    { section: 'data', type: 'readonly', key: 'about.version', label: 'Version' },
    { section: 'data', type: 'readonly', key: 'about.gpuTier', label: 'GPU tier' },
    { section: 'data', type: 'readonly', key: 'about.engine', label: 'Render engine' },
    { section: 'data', type: 'readonly', key: 'about.fps', label: 'FPS', live: true },
    { section: 'data', type: 'readonly', key: 'about.browser', label: 'Browser' },
];

/** Find all schema rows that belong to a given section. */
export function rowsForSection(sectionId) {
    return SCHEMA.filter((r) => r.section === sectionId);
}

/** Look up a single row by its key. */
export function rowForKey(key) {
    return SCHEMA.find((r) => r.key === key);
}
