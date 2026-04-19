// help-content.js
//
// All help center content as a searchable data structure.
// Each category has an id, label, icon (feather-style SVG), and entries.
// Each entry has a question (title) and answer (HTML string).

export const HELP_CATEGORIES = [
    {
        id: 'getting-started',
        label: 'Getting Started',
        iconSvg: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
        entries: [
            {
                q: 'What is Cosmic Focus?',
                a: 'Cosmic Focus is a cinematic Pomodoro timer built around an interactive 3D black hole scene. It combines focused work sessions with ambient sounds and task management — all in your browser, no account needed.',
            },
            {
                q: 'What are the three modes?',
                a: '<strong>Home</strong> — Your landing page showing a greeting, date and time.<br><strong>Focus</strong> — The Pomodoro timer, tasks, and session stats. This is where you do deep work.<br><strong>Ambient</strong> — A sound mixer for layering ambient sounds (rain, fireplace, café, etc.) while you work or relax.',
            },
            {
                q: 'How do I start my first focus session?',
                a: 'Click <strong>Focus</strong> in the navigation bar, then click <strong>Start Focus</strong>. The timer begins counting down from your configured focus duration (default 25 minutes). When it hits zero, you automatically get a break. Once a session is running, a compact mini timer also appears on the Home tab so you can track progress while checking the clock.',
            },
            {
                q: 'Does my data save automatically?',
                a: 'Yes. Tasks, settings, statistics, and sound preferences all persist in your browser\'s local storage. No server, no account. Closing the tab and reopening it restores everything exactly where you left off.',
            },
            {
                q: 'Can I use this on my phone?',
                a: 'The app works in mobile browsers but is designed primarily for desktop use. The 3D scene and keyboard shortcuts are optimized for larger screens.',
            },
            {
                q: 'What is the 3D scene behind the UI?',
                a: 'A real-time cinematic space scene — a tilted accretion disk around a black hole, a golden nebula, a parallax starfield, drifting cosmic motes, and shooting stars. It is fully animated and reacts to your mouse. Quality can be tuned or scaled down in <strong>Settings → Scene</strong>.',
            },
            {
                q: 'Can I replay the welcome tour?',
                a: 'Yes. Open <strong>Settings → Data & About → Replay welcome tour</strong>. The same 8-step walkthrough you saw on first visit will run again, highlighting the key parts of the UI one by one.',
            },
        ],
    },
    {
        id: 'focus-timer',
        label: 'Focus Timer',
        iconSvg: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
        entries: [
            {
                q: 'What is the Pomodoro technique?',
                a: 'A time management method: work in focused intervals (typically 25 minutes) separated by short breaks (5 minutes). After a set number of sessions, you take a longer break. Cosmic Focus automates this entire cycle.',
            },
            {
                q: 'How do breaks work?',
                a: 'After each focus session, the app automatically switches to a <strong>short break</strong> (default 5 minutes). After every 4th session (configurable), you get a <strong>long break</strong> (default 15 minutes) instead. The break timer starts automatically if auto-start is enabled.',
            },
            {
                q: 'Can I skip a break or focus session?',
                a: 'Yes. During a focus session, a <strong>Skip Focus</strong> button appears. During a break, <strong>Skip Break</strong> appears. Skipping moves you to the next phase immediately.',
            },
            {
                q: 'What does the Reset button do?',
                a: 'The <strong>Reset</strong> button (⟳) resets the current timer back to its starting time without changing the session type. The <strong>Reset Session</strong> button resets the entire Pomodoro cycle back to session 1.',
            },
            {
                q: 'How do I change the timer duration?',
                a: 'Open <strong>Settings → Timer</strong>. You\'ll find sliders for Focus duration (1–90 min), Short break (1–30 min), and Long break (1–60 min).',
            },
            {
                q: 'What is auto-start?',
                a: 'When enabled in <strong>Settings → Timer</strong>, the next session starts automatically after the current one ends — no need to click Start. You can also set a delay (0–3000ms) before it begins.',
            },
            {
                q: 'What does "Session 1 of 4" mean?',
                a: 'It shows your progress in the current Pomodoro cycle. "1 of 4" means you\'re on your first focus session, and after 4 sessions (configurable), you\'ll get a long break and the cycle resets.',
            },
            {
                q: 'Do I get notifications when a session ends?',
                a: 'Yes, if you grant notification permission. Go to <strong>Settings → Notifications</strong> to enable/disable alerts for focus complete, break complete, and full cycle complete. You can also set auto-close timing.',
            },
            {
                q: 'What is the mini timer on the Home tab?',
                a: 'A compact floating widget that appears on the Home tab as soon as a focus or break session is running or paused. It shows a live countdown, a circular progress ring, the current label (FOCUS / BREAK), and the session count (e.g. "1 / 4"). It also has its own Play/Pause and Skip buttons, so you can control the timer without leaving Home. Click the face to jump straight to the Focus tab.',
            },
            {
                q: 'Can I drag the mini timer?',
                a: 'Yes. Click and hold anywhere on the mini timer that isn\'t a button, then drag it to park it wherever you like on the Home screen. Its position is remembered for your session.',
            },
            {
                q: 'What happens to my timer if I refresh the page?',
                a: 'The current session is preserved through a normal refresh — the elapsed time, remaining time, session number, and running/paused state are all restored. Closing the tab entirely resets the cycle back to Session 1.',
            },
            {
                q: 'What is the difference between "Long break every" and "Cycle goal"?',
                a: '<strong>Long break every</strong> controls when the rhythm switches from short break to long break (default every 4 focus sessions). <strong>Cycle goal</strong> is the total number of focus sessions that make up one full cycle — it\'s the "1 of N" you see in the session counter. Set them independently in <strong>Settings → Timer → Flow</strong>.',
            },
        ],
    },
    {
        id: 'tasks',
        label: 'Tasks',
        iconSvg: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>',
        entries: [
            {
                q: 'How do I add a task?',
                a: 'In <strong>Focus</strong> mode, type in the task input field at the bottom and press <strong>Enter</strong> or click the <strong>Add</strong> button. Tasks appear instantly with a spring animation.',
            },
            {
                q: 'How do I complete or delete a task?',
                a: 'Click the <strong>checkbox</strong> to mark a task complete — it gets a gold strikethrough. Click the <strong>✕</strong> button to delete it with a slide-out animation. Use <strong>Clear All</strong> to remove everything.',
            },
            {
                q: 'Do tasks persist across page reloads?',
                a: 'Yes. Tasks are saved to local storage automatically. Close the tab, come back later, and they\'re still there.',
            },
            {
                q: 'Is there a keyboard shortcut to focus the task input?',
                a: 'Press <kbd>/</kbd> to instantly focus the task input field. Start typing immediately.',
            },
        ],
    },
    {
        id: 'ambient-sounds',
        label: 'Ambient Sounds',
        iconSvg: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
        entries: [
            {
                q: 'How do I play ambient sounds?',
                a: 'Go to <strong>Ambient</strong> mode and click <strong>Browse Sound Library</strong>. Click any sound card to toggle it on/off. Active sounds appear as chips above the library button.',
            },
            {
                q: 'Can I play multiple sounds at once?',
                a: 'Yes — that\'s the point. Layer rain + fireplace + café noise for your perfect work atmosphere. Each sound plays independently.',
            },
            {
                q: 'What are sound presets?',
                a: 'Pre-made combinations at the top of the sound library:<br><strong>Rainy Library</strong> — Rain + Library ambience<br><strong>Forest Morning</strong> — Forest + Birds + Stream<br><strong>Deep Focus</strong> — Brown noise + Rain<br>Click a preset to activate that exact mix.',
            },
            {
                q: 'How do I control volume?',
                a: 'Go to <strong>Settings → Sounds</strong> and adjust the <strong>Master Volume</strong> slider (0–100%).',
            },
            {
                q: 'What sounds are available?',
                a: '<strong>Nature</strong> — Rain, Ocean Waves, Forest, Thunder, Wind, Stream, Birds, Crickets<br><strong>Indoor</strong> — Fireplace, Café, Library, Fan, Clock Ticking<br><strong>Urban</strong> — City Traffic, Train, Subway, Construction<br><strong>White Noise</strong> — White, Pink, Brown<br><strong>Musical</strong> — Piano, Guitar, Wind Chimes',
            },
        ],
    },
    {
        id: 'statistics',
        label: 'Statistics',
        iconSvg: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
        entries: [
            {
                q: 'Where can I see my session statistics?',
                a: 'The <strong>stats bar</strong> sits directly under the timer controls on the Focus tab. It shows four live chips: sessions today, total focus time, tasks done today, and current streak.',
            },
            {
                q: 'What do each of the stats track?',
                a: '<strong>Sessions</strong> — Focus sessions completed today; resets automatically at midnight.<br><strong>Total focus time</strong> — Lifetime focus time, formatted as hours/minutes/seconds.<br><strong>Tasks done</strong> — Tasks you checked off today; also resets at midnight.<br><strong>Streak</strong> — Consecutive calendar days with at least one completed focus session.',
            },
            {
                q: 'How does the streak work?',
                a: 'It counts every consecutive day that you finish at least one focus session. Miss a day and the streak resets to zero the next time you complete a session. Finishing a session on the same day keeps the streak intact.',
            },
            {
                q: 'Can I export my statistics?',
                a: 'Yes. Open <strong>Settings → Data & About → Stats (CSV)</strong>. You\'ll get a CSV file with columns for sessions today, total focus seconds, tasks completed today, current streak, and the last focus date — ready to import into a spreadsheet.',
            },
            {
                q: 'Can I reset my statistics?',
                a: 'Yes. Click the small <strong>⟳</strong> button at the end of the stats bar on the Focus tab. It asks for a confirmation, then zeroes out every stat. The <strong>Clear all data</strong> option in Settings also wipes stats (along with everything else).',
            },
        ],
    },
    {
        id: 'settings-presets',
        label: 'Settings & Presets',
        iconSvg: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
        entries: [
            {
                q: 'How do I open settings?',
                a: 'Click the <strong>star icon</strong> (✦) in the top-right corner. It glows as your mouse approaches.',
            },
            {
                q: 'What are quality presets?',
                a: 'In <strong>Settings → Scene → Quality</strong>, choose from:<br><strong>Auto</strong> — Detects your GPU and picks the best tier<br><strong>Low</strong> — Minimal effects, best performance<br><strong>Medium</strong> — Balanced<br><strong>High</strong> — Full effects<br><strong>Ultra</strong> — Maximum quality with enhanced bloom, god rays, and grain<br>You can further tweak individual values in the <strong>Advanced</strong> section.',
            },
            {
                q: 'What are focus presets?',
                a: 'Named snapshots of all your settings. Create a "Deep Work" preset with 50-min focus and rain sounds, then a "Casual" preset with 25-min focus and café sounds. Switch between them with one click instead of re-adjusting everything.<br>Find them in <strong>Settings → Presets</strong>.',
            },
            {
                q: 'How do I export/import my settings?',
                a: 'Go to <strong>Settings → Data & About</strong>:<br><strong>Settings (JSON)</strong> — Downloads a backup file<br><strong>Import settings file</strong> — Load a backup<br><strong>Share link</strong> — Generates a URL you can share with others',
            },
            {
                q: 'What does "Reset current section" do?',
                a: 'Resets only the settings in the section you\'re currently viewing back to defaults. Other sections stay untouched.',
            },
            {
                q: 'What does "Reset all settings" do?',
                a: 'Resets every section — Scene, Timer, Sounds, Notifications, Shortcuts, Motion, and Presets — back to their defaults in one step. It does <em>not</em> touch tasks or statistics.',
            },
            {
                q: 'What does "Clear all data" do?',
                a: 'The nuclear option. Wipes <strong>everything</strong>: settings, presets, statistics, tasks, and sounds. The page reloads completely fresh. Requires a double-confirmation to prevent accidents.',
            },
            {
                q: 'What are schedules?',
                a: 'In <strong>Settings → Timer → Schedules</strong>, you can set up automatic mode switches at specific times. For example, auto-switch to Focus mode at 9:00 AM on weekdays. The app checks every 5 seconds and fires once per minute.',
            },
            {
                q: 'What does the gold dot next to a setting label mean?',
                a: 'It means that setting has been changed from its default value. It pulses gently to draw attention. Resetting the section removes all dots.',
            },
            {
                q: 'How do I customize the greeting?',
                a: 'Go to <strong>Settings → Data & About</strong> and find the <strong>Greeting</strong> text field. You can use <code>{{time}}</code> as a placeholder that becomes "morning", "afternoon", "evening", or "night" based on the current hour.',
            },
            {
                q: 'What themes are available?',
                a: 'Currently only the <strong>Black Hole</strong> theme — a tilted accretion disk, gravitational lensing, a photon ring, and a flowing golden nebula. Two more themes are marked "Coming soon" in <strong>Settings → Scene → Theme</strong>.',
            },
            {
                q: 'What do the Advanced scene settings do?',
                a: 'Open <strong>Settings → Scene → Advanced</strong> to fine-tune the look:<br><strong>Bloom</strong> — softness/intensity of glow around bright areas.<br><strong>Exposure</strong> — overall brightness of the scene.<br><strong>God rays</strong> — volumetric light beams from the black hole.<br><strong>Vignette</strong> — dark edge falloff around the viewport.<br><strong>Chromatic</strong> — subtle rainbow fringe at the edges (lens aberration).<br><strong>Film grain</strong> — animated noise texture over the image.<br><strong>Camera shake</strong> — strength of the cinematic camera drift.<br><strong>Star density</strong> — how many stars are spawned (applies on next load).<br><strong>Depth of field</strong> — optional focus blur (WebGL2 only).',
            },
            {
                q: 'What does Depth of field do?',
                a: 'Adds a cinematic focus blur — elements near the camera\'s focal distance stay sharp while things in front of or behind go soft. It\'s off by default because it can make the scene feel blurry if misconfigured, and it\'s disabled entirely on WebGPU due to texture-format compatibility.',
            },
            {
                q: 'What is the Reduce motion setting?',
                a: 'In <strong>Settings → Shortcuts → Motion</strong>. When on, the app dampens or skips the larger UI animations (tour fade-in, modal springs, timer ticks, etc.). It overrides the <code>prefers-reduced-motion</code> system setting so you can force it on even if your OS isn\'t set that way.',
            },
            {
                q: 'What does the Animation speed slider do?',
                a: 'A global multiplier from 0.5× to 2× on most UI animations — micro-transitions, hover pulses, tour intros, mini-timer reveals, etc. Slow it down if motion feels too busy, or speed it up if you find the defaults sluggish.',
            },
            {
                q: 'What does the About section show?',
                a: 'Under <strong>Settings → Data & About → About</strong> you\'ll see the app version, the detected GPU tier (used by the "Auto" quality preset), the active render engine (WebGL2 / WebGPU), a live FPS readout, and your browser. Useful when reporting an issue or verifying a performance tier.',
            },
            {
                q: 'Do I need to be online to use Cosmic Focus?',
                a: 'No. Once the page has loaded, the timer, tasks, settings, stats, and ambient sounds all run entirely in your browser. A connection is only needed for the initial page load and for re-fetching sound files the first time you use them.',
            },
        ],
    },
    {
        id: 'keyboard-shortcuts',
        label: 'Keyboard Shortcuts',
        iconSvg: '<rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>',
        entries: [
            {
                q: 'What keyboard shortcuts are available?',
                a: '<table class="hc-shortcut-table"><tr><td><kbd>Space</kbd></td><td>Start / pause timer</td></tr><tr><td><kbd>R</kbd></td><td>Reset timer</td></tr><tr><td><kbd>1</kbd></td><td>Switch to Home</td></tr><tr><td><kbd>2</kbd></td><td>Switch to Focus</td></tr><tr><td><kbd>3</kbd></td><td>Switch to Ambient</td></tr><tr><td><kbd>/</kbd></td><td>Focus task input</td></tr><tr><td><kbd>?</kbd></td><td>Open this Help Center</td></tr><tr><td><kbd>Esc</kbd></td><td>Close any modal</td></tr></table>',
            },
            {
                q: 'Can I rebind keyboard shortcuts?',
                a: 'Yes. Go to <strong>Settings → Shortcuts</strong>, click any shortcut row, then press the key you want to assign. Click the same row again or press <kbd>Esc</kbd> to cancel. The <kbd>Esc</kbd> shortcut cannot be rebound.',
            },
            {
                q: 'Shortcuts don\'t work while I\'m typing — is that a bug?',
                a: 'No, by design. Shortcuts are disabled when you\'re focused on a text input (task field, search box, settings inputs) so your keystrokes go into the field, not the app. Press <kbd>Esc</kbd> to unfocus the input first.',
            },
        ],
    },
];
