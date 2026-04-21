// help-content.js
//
// All help center content as a searchable data structure.
// Each category has id, label, iconSvg (feather-style, stroke-rendered),
// and entries of { q, a }. Where a category maps to a Settings section,
// its iconSvg matches the one used in the Settings rail so search hits
// show the same visual mark the user sees in Settings.

export const HELP_CATEGORIES = [
    // ═══════════════════════════════════════════════════════════════════════
    // GETTING STARTED
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'getting-started',
        label: 'Getting Started',
        iconSvg: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
        entries: [
            {
                q: 'What is Cosmic Focus?',
                a: 'A cinematic Pomodoro timer built on top of a real-time 3D black-hole scene. Focused work sessions, ambient sounds, task list, and live stats — all in your browser, no account needed.',
            },
            {
                q: 'What are the three modes?',
                a: '<strong>Home</strong> — landing page with greeting, clock, and the mini-timer once a session is running.<br><strong>Focus</strong> — the Pomodoro timer, task list, and session stats.<br><strong>Ambient</strong> — the mixing deck for layering rain, café, forest and more.',
            },
            {
                q: 'How do I start my first focus session?',
                a: 'Click <strong>Focus</strong>, then <strong>Start Focus</strong>. The timer begins counting down. When it hits zero, it rolls into a short break automatically. A compact mini-timer also appears on the Home tab.',
            },
            {
                q: 'Does my data save automatically?',
                a: 'Yes. Tasks, settings, stats, and saved ambient mixes all persist in your browser\'s local storage. No server, no account. Closing the tab and reopening it restores everything.',
            },
            {
                q: 'How do I open Settings?',
                a: 'Click the <strong>✦ star</strong> in the top-right corner. It has a glow that brightens as your mouse approaches.',
            },
            {
                q: 'Can I replay the welcome tour?',
                a: 'Yes. <strong>Settings → Data & About → Replay welcome tour</strong>. The same 8-step walkthrough you saw on first visit runs again.',
            },
            {
                q: 'Do I need to be online?',
                a: 'No. Once the page has loaded, the timer, tasks, settings, and stats all run entirely in-browser. A connection is only needed for the initial page load and to fetch ambient sounds the first time you use them.',
            },
            {
                q: 'Can I use this on my phone?',
                a: 'Yes, though the 3D scene and keyboard shortcuts are optimised for desktop. Mobile works — you may want to lower <em>Settings → Scene → Quality</em> to <em>Low</em> or <em>Medium</em>.',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // FOCUS TIMER  (matches Settings → Timer)
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'focus-timer',
        label: 'Focus Timer',
        // iconSvg matches Settings → Timer (clock)
        iconSvg: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
        entries: [
            {
                q: 'What is the Pomodoro technique?',
                a: 'Work in focused intervals (usually 25 minutes) separated by short breaks (5 min). After every 4th session, take a longer break (15 min). Cosmic Focus automates the whole cycle.',
            },
            {
                q: 'How do I change the timer durations?',
                a: 'Open <strong>Settings → Timer → Durations</strong>. Three sliders: <strong>Focus</strong> (1–90 min, default 25), <strong>Short break</strong> (1–30 min, default 5), <strong>Long break</strong> (1–60 min, default 15).',
            },
            {
                q: 'What does Auto-start do?',
                a: 'Under <strong>Settings → Timer → Flow</strong>. When enabled, the next session starts automatically after the current one ends — no need to click Start. A <strong>Delay</strong> slider (0–3000 ms) lets you pause briefly before it begins, for a breath between sessions.',
            },
            {
                q: 'What does "Long break every" mean?',
                a: 'Also in <strong>Settings → Timer → Flow</strong>. Controls when the rhythm switches from short to long break. Default: every 4 focus sessions. Range 2–8.',
            },
            {
                q: 'What is the Cycle goal?',
                a: 'The total number of focus sessions that make up one full cycle. You see it as "N / M" in the session counter ("1 / 4" means session 1 of 4). Range 1–12, default 4. Separate from the long-break interval.',
            },
            {
                q: 'What does the Reset button do?',
                a: 'The <strong>⟳</strong> next to Start resets the current timer to its starting time without changing the session type. Hold (or use the small <strong>Reset session</strong> icon) to reset the entire cycle back to session 1.',
            },
            {
                q: 'Can I skip a session?',
                a: 'Yes. During a focus session, a <strong>Skip Focus</strong> button appears. During a break, <strong>Skip Break</strong>. Skipping moves immediately to the next phase.',
            },
            {
                q: 'What time format does the Home clock use?',
                a: '<strong>Settings → Timer → Display → Time format</strong>. Toggle between 12-hour and 24-hour.',
            },
            {
                q: 'What are Schedules?',
                a: 'Under <strong>Settings → Timer → Schedules</strong> (collapsible group). Set up automatic mode switches at specific times on chosen days. Example: "switch to Focus at 9:00 AM on weekdays." The scheduler checks every 5 seconds and fires once per minute.',
            },
            {
                q: 'What is the Home mini-timer?',
                a: 'A compact floating widget on the Home tab that appears as soon as any session is running or paused. Shows countdown, progress ring, session number, and gives you play/pause + skip controls without leaving the tab. Click the face to jump to the Focus tab. It\'s draggable and remembers its size across reloads.',
            },
            {
                q: 'What happens to my timer if I refresh?',
                a: 'The current session (elapsed time, remaining time, session number, running/paused state) is preserved through a normal refresh. Closing the tab entirely resets the cycle back to Session 1.',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TASKS
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'tasks',
        label: 'Tasks',
        iconSvg: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>',
        entries: [
            {
                q: 'How do I add a task?',
                a: 'In <strong>Focus</strong> mode, type into the task input at the bottom and press <strong>Enter</strong> or click <strong>Add</strong>. Tasks animate in with a spring.',
            },
            {
                q: 'How do I complete or delete a task?',
                a: 'Click the <strong>checkbox</strong> to mark a task complete — it gets a gold strikethrough. Click the <strong>✕</strong> to remove it with a slide-out animation. Use <strong>Clear All</strong> to wipe the whole list.',
            },
            {
                q: 'Do tasks persist?',
                a: 'Yes. Tasks are saved to local storage automatically. Close the tab, come back, they\'re there.',
            },
            {
                q: 'Is there a keyboard shortcut for the task input?',
                a: 'Press <kbd>/</kbd> to instantly focus the task field.',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // AMBIENT SOUNDS  (matches Settings → Sounds)
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'ambient-sounds',
        label: 'Ambient Sounds',
        // iconSvg matches Settings → Sounds (speaker + waves)
        iconSvg: '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/>',
        entries: [
            {
                q: 'How do I start an ambient mix?',
                a: 'Open the <strong>Ambient</strong> tab. The saved-mixes rail at the top has three built-ins (Rainy Library, Forest Walk, Ocean Breath) — click one to crossfade into it. Or click <strong>+ Add sound</strong> to pick individual tracks from the library drawer.',
            },
            {
                q: 'Can I layer multiple sounds?',
                a: 'Yes — that\'s the point. Each track becomes a card with its own volume slider, 3-band EQ, pan, mute, and remove controls. Mix rain + café + forest to taste.',
            },
            {
                q: 'What sounds are available?',
                a: 'Today: <strong>Rain</strong>, <strong>Ocean</strong>, <strong>Forest</strong>, and <strong>Café</strong>. More are coming — you\'ll see them tagged "Soon" in the library drawer. If you have a sound you\'d love to see, use <strong>Settings → Feedback</strong>.',
            },
            {
                q: 'What are the three built-in mixes?',
                a: '<strong>Rainy Library</strong> (rain + café, default 65/35), <strong>Forest Walk</strong> (forest + distant rain), <strong>Ocean Breath</strong> (ocean only, boosted lows). Each is a starting point — click it, then tweak.',
            },
            {
                q: 'How do I save my own mix?',
                a: 'Get the deck tuned the way you like, then click the <strong>♡ Save mix</strong> button in the deck controls bar. Give it a name. It\'ll appear as a card in the saved-mixes rail.',
            },
            {
                q: 'How do I rename, delete, or share a mix?',
                a: 'Click the <strong>⋯</strong> on any user mix card in the rail. Options: <strong>Rename</strong>, <strong>Share</strong> (copies a <code>/?mix=…</code> link anyone can open), <strong>Delete</strong>. Built-in mixes can\'t be modified.',
            },
            {
                q: 'What does the star icon on mix cards do?',
                a: 'Pins that mix as your <strong>focus-start mix</strong>. Combined with <em>Settings → Sounds → Auto-start mix on focus session</em>, this automatically fires the mix every time you start a focus session. Unpin by clicking again.',
            },
            {
                q: 'What is the sleep timer?',
                a: 'Deck controls → <strong>☾ Sleep</strong>. Choose 15, 30, 60, or 120 minutes. A gentle fade-out begins in the last 30 seconds, then everything stops. Cancel from the same popover while it\'s running.',
            },
            {
                q: 'What\'s "Surprise me"?',
                a: 'Picks 1–3 sounds at random with tasteful volumes and small EQ tilts. Good when you\'re indecisive.',
            },
            {
                q: 'What\'s Immerse?',
                a: 'A fullscreen mode for the deck. Hides the nav, settings star, and mini-timer so the black-hole scene fills the viewport with the mixing deck floating over it. Press <kbd>Esc</kbd> to exit.',
            },
            {
                q: 'Where is the master volume?',
                a: 'The right side of the deck control bar — labelled <strong>MASTER</strong>. Also available from <strong>Settings → Sounds → Master</strong>. Both sliders stay in sync.',
            },
            {
                q: 'What does "Remember active sounds" do?',
                a: '<strong>Settings → Sounds → Behavior → Remember active sounds</strong>. When on (default), your last mix is restored on page load.',
            },
            {
                q: 'What does "Fade out when session ends" do?',
                a: '<strong>Settings → Sounds → Fade out when session ends</strong>. When on (default), the master volume smoothly fades to silence over ~4 s when a focus or break session completes.',
            },
            {
                q: 'What does "Auto-start mix on focus session" do?',
                a: '<strong>Settings → Sounds → Auto-start mix on focus session</strong>. When on, starting a focus session activates your pinned focus-start mix (see the star icon on mix cards). Off by default.',
            },
            {
                q: 'Why don\'t my sounds play?',
                a: 'Sound files are hosted on a CDN. If the CDN blocks cross-origin access, the app falls back to basic HTML playback (no EQ, no pan, no scene reactivity) — audio still plays. If you hear silence entirely, check your master volume and that the track isn\'t muted (click 🔇 to unmute).',
            },
            {
                q: 'Does ambient keep playing when I leave the Ambient tab?',
                a: 'Yes. Sounds continue across Home / Focus / Ambient tabs. The home mini-player (bottom-left of Home) gives you play/pause and master volume without switching tabs.',
            },
            {
                q: 'Can I control ambient from my phone\'s lock screen?',
                a: 'Yes — through the Media Session API. Lock-screen play/pause and Bluetooth / CarPlay controls route to the ambient engine while a mix is playing.',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SCENE & VISUALS  (matches Settings → Scene)
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'scene',
        label: 'Scene & Visuals',
        // iconSvg matches Settings → Scene (sun)
        iconSvg: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41"/>',
        entries: [
            {
                q: 'What is the 3D scene?',
                a: 'A real-time cinematic space rendering — a tilted accretion disk around a black hole, a golden nebula, a parallax starfield, drifting cosmic motes, shooting stars, god rays, and film grain. It runs on WebGL2 (with a WebGPU path if your browser supports it).',
            },
            {
                q: 'What themes are available?',
                a: 'Currently the <strong>Black Hole</strong> theme. Two more are tagged "Coming soon" in <strong>Settings → Scene → Theme</strong>.',
            },
            {
                q: 'What are the Quality presets?',
                a: '<strong>Settings → Scene → Quality → Preset</strong>.<br><strong>Auto</strong> — detects your GPU tier and picks the best level<br><strong>Low</strong> — minimal effects, best perf for old devices<br><strong>Medium</strong> — balanced<br><strong>High</strong> — full effects<br><strong>Ultra</strong> — maximum quality with enhanced bloom, god rays, grain<br>Any value can be tweaked further in the <strong>Advanced</strong> section below.',
            },
            {
                q: 'What does the Bloom slider do?',
                a: '<strong>Settings → Scene → Advanced → Bloom</strong> (0–1.5, default 0.55). Intensity of the glow around bright areas (the disk core, star glows, photon ring). Higher = more dreamy.',
            },
            {
                q: 'What does Exposure do?',
                a: '<strong>Settings → Scene → Advanced → Exposure</strong> (0.5–2, default 1.2). Overall brightness of the scene before tone mapping. Also oscillates slightly each frame to simulate auto-exposure.',
            },
            {
                q: 'What are God rays?',
                a: '<strong>Settings → Scene → Advanced → God rays</strong> (0–0.3, default 0.1). Volumetric light beams that radiate outward from the black hole. Screen-space light scattering. 0 = off.',
            },
            {
                q: 'What does Vignette do?',
                a: '<strong>Settings → Scene → Advanced → Vignette</strong> (0–3, default 1.5). Subtle dark falloff around the edges of the viewport to draw the eye to the centre. 0 = off.',
            },
            {
                q: 'What is Chromatic aberration?',
                a: '<strong>Settings → Scene → Advanced → Chromatic</strong> (0–10, default 2). Subtle rainbow fringe at the edges of the frame — mimics a real lens. Very low by default. 0 = off.',
            },
            {
                q: 'What is Film grain?',
                a: '<strong>Settings → Scene → Advanced → Film grain</strong> (0–0.1, default 0.03). Animated noise overlay that gives the rendered image a filmic texture. 0 = off, clean digital.',
            },
            {
                q: 'What does Camera shake do?',
                a: '<strong>Settings → Scene → Advanced → Camera shake</strong> (0–3, default 1). Strength of the cinematic camera drift — the slow orbital motion and micro-shake. 0 = perfectly static camera.',
            },
            {
                q: 'What does Star density do?',
                a: '<strong>Settings → Scene → Advanced → Star density</strong> (0.3–1.5, default 1). Multiplier on the auto-detected star count. Lower = fewer stars, faster. Applies on the next page load.',
            },
            {
                q: 'What is Depth of field?',
                a: '<strong>Settings → Scene → Advanced → Depth of field</strong>. Optional focus blur — elements near the focal distance stay sharp, things in front/behind go soft. Off by default because it can make the scene feel blurry, and disabled entirely on WebGPU due to texture-format compatibility.',
            },
            {
                q: 'Why does the scene look pixelated after hours?',
                a: 'The FPS watchdog monitors sustained performance. If sustained FPS drops below 22 for 30 seconds, the watchdog degrades quality gradually — first disabling film grain and chromatic aberration, then anamorphic streak, then god rays, then halving bloom kernel, and only as a last resort lowering render resolution. Every 5 minutes it probes full quality to check if the device can handle it again. If you\'re seeing pixelation, your device is genuinely struggling — try lowering <em>Settings → Scene → Quality</em> to Medium or Low.',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // NOTIFICATIONS  (matches Settings → Notifications)
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'notifications',
        label: 'Notifications',
        // iconSvg matches Settings → Notifications (bell)
        iconSvg: '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>',
        entries: [
            {
                q: 'How do I enable desktop notifications?',
                a: '<strong>Settings → Notifications → Enable notifications</strong>. You\'ll see the browser permission prompt — click Allow. After that, Cosmic Focus can send a system notification when a session ends, even if the tab is in the background.',
            },
            {
                q: 'What notifications can I control?',
                a: 'Three separate toggles under <strong>Settings → Notifications → Alerts</strong>:<br><strong>Focus session complete</strong> — when a focus timer reaches zero<br><strong>Break complete</strong> — when a short or long break ends<br><strong>Full cycle complete</strong> — when you\'ve finished all sessions in a full Pomodoro cycle',
            },
            {
                q: 'How long do notifications stay on screen?',
                a: '<strong>Settings → Notifications → Auto-close after</strong>. Choose 5, 10, 15 (default), or 30 seconds — or <strong>Never</strong> to leave them until the user dismisses them manually.',
            },
            {
                q: 'Notifications aren\'t working — what do I check?',
                a: 'First: <strong>Settings → Notifications → Permission</strong> should read "Enabled". If it says "Blocked", revoke the block in your browser\'s site settings and re-grant it. If your OS has Do Not Disturb on, notifications are silenced by the OS — check your system Focus / DND setting.',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // STATISTICS
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'statistics',
        label: 'Statistics',
        iconSvg: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
        entries: [
            {
                q: 'Where can I see my stats?',
                a: 'The <strong>stats bar</strong> sits directly under the timer controls on the Focus tab. Four live chips: sessions today, total focus time, tasks done today, current streak.',
            },
            {
                q: 'What does each stat track?',
                a: '<strong>Sessions</strong> — focus sessions completed today; resets at midnight.<br><strong>Total focus time</strong> — lifetime focus time, formatted h/m/s.<br><strong>Tasks done</strong> — tasks you checked off today; resets at midnight.<br><strong>Streak</strong> — consecutive calendar days with at least one completed focus session.',
            },
            {
                q: 'How does the streak work?',
                a: 'Every day you finish at least one focus session counts as +1. Miss a day and the streak resets to zero the next time you complete a session.',
            },
            {
                q: 'Can I export my stats?',
                a: 'Yes. <strong>Settings → Data & About → Export → Stats (CSV)</strong>. Columns: sessions today, total focus seconds, tasks completed today, current streak, last focus date.',
            },
            {
                q: 'Can I reset my stats?',
                a: 'Click the small <strong>⟳</strong> at the end of the stats bar. Confirm, and everything resets. The <strong>Clear all data</strong> option in Settings also wipes stats (along with everything else).',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // KEYBOARD SHORTCUTS & MOTION  (matches Settings → Shortcuts)
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'shortcuts',
        label: 'Shortcuts & Motion',
        // iconSvg matches Settings → Shortcuts (keyboard)
        iconSvg: '<rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>',
        entries: [
            {
                q: 'What keyboard shortcuts exist?',
                a: '<table class="hc-shortcut-table"><tr><td><kbd>Space</kbd></td><td>Start / pause timer</td></tr><tr><td><kbd>R</kbd></td><td>Reset timer</td></tr><tr><td><kbd>1</kbd></td><td>Switch to Home</td></tr><tr><td><kbd>2</kbd></td><td>Switch to Focus</td></tr><tr><td><kbd>3</kbd></td><td>Switch to Ambient</td></tr><tr><td><kbd>/</kbd></td><td>Focus the task input</td></tr><tr><td><kbd>?</kbd></td><td>Open this Help Center</td></tr><tr><td><kbd>Esc</kbd></td><td>Close any modal / panel</td></tr></table>',
            },
            {
                q: 'Can I rebind shortcuts?',
                a: 'Yes. <strong>Settings → Shortcuts → Keyboard</strong>. Click any row, then press the key you want to assign. Click the same row again or press <kbd>Esc</kbd> to cancel. The <kbd>Esc</kbd> shortcut itself can\'t be rebound — it\'s the universal escape hatch.',
            },
            {
                q: 'Shortcuts don\'t work while I\'m typing — is that a bug?',
                a: 'No, by design. Shortcuts are disabled when you\'re focused on a text input (task field, search box, settings inputs, feedback textarea) so your keystrokes go into the field. Press <kbd>Esc</kbd> to unfocus first.',
            },
            {
                q: 'What is Reduce motion?',
                a: '<strong>Settings → Shortcuts → Motion → Reduce motion</strong>. When on, the app dampens or skips the larger UI animations (tour fade-in, modal springs, timer tick pulses, etc.). It overrides the <code>prefers-reduced-motion</code> system setting so you can force it on even if your OS isn\'t set that way.',
            },
            {
                q: 'What does the Animation speed slider do?',
                a: '<strong>Settings → Shortcuts → Motion → Animation speed</strong> (0.5–2×). Global multiplier on UI animations — micro-transitions, hover pulses, tour intros, mini-timer reveals. Slow it down if motion feels busy, speed it up if defaults feel sluggish.',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // FOCUS PRESETS  (matches Settings → Presets)
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'presets',
        label: 'Focus Presets',
        // iconSvg matches Settings → Presets (cog + dot)
        iconSvg: '<path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/><circle cx="12" cy="12" r="3"/>',
        entries: [
            {
                q: 'What are focus presets?',
                a: 'Named snapshots of your whole Settings state. Set up a "Deep Work" preset with 50-minute focus + rain sounds, then a "Casual" preset with 25-minute focus + café — switch between them with one click instead of re-adjusting every slider.',
            },
            {
                q: 'How do I create one?',
                a: '<strong>Settings → Presets → Focus presets → New preset</strong>. Give it a name. Whatever your current Settings look like becomes the preset\'s snapshot.',
            },
            {
                q: 'How do I switch presets?',
                a: 'In the same <strong>Settings → Presets</strong> panel, click any preset to activate it. The name of the active preset is highlighted.',
            },
            {
                q: 'Can I rename or delete a preset?',
                a: 'Yes — the row has inline edit + delete controls. The built-in "Default" preset can\'t be deleted; it\'s your safe fallback.',
            },
            {
                q: 'Difference between focus presets and ambient mixes?',
                a: '<strong>Focus preset</strong> = snapshot of <em>all</em> Settings (timer, scene, sounds, notifications…). <strong>Ambient mix</strong> = just the set of active sounds and their per-track volume/EQ/pan. They\'re orthogonal — you can pair any preset with any mix.',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // FEEDBACK  (matches Settings → Feedback)
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'feedback',
        label: 'Feedback',
        // iconSvg matches Settings → Feedback (chat bubble)
        iconSvg: '<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>',
        entries: [
            {
                q: 'How do I report a bug or request a feature?',
                a: 'Click <strong>Settings → Feedback</strong>. Pick <strong>Bug report</strong> or <strong>Feature request</strong> at the top, type your message, and hit <strong>Send</strong>. Your mail client opens with the subject and body pre-filled. Or click <strong>Copy as email</strong> to put the whole thing on your clipboard.',
            },
            {
                q: 'What information gets sent along with my feedback?',
                a: 'Only auto-collected technical context that helps reproduce what you\'re describing: app version, browser + platform string, GPU (if your browser exposes it), viewport size, language, and a timestamp. Nothing identifying or personal. You can see the exact content in the copied email.',
            },
            {
                q: 'Who does my feedback go to?',
                a: 'Straight to the maintainer at the email shown under the form. No intermediary, no tracking, no ticketing system.',
            },
            {
                q: 'What if I don\'t have a mail client set up?',
                a: 'Click <strong>Copy as email</strong> instead. That puts "To: …, Subject: …, body" on your clipboard — paste it into whatever you use (webmail, Slack DM, GitHub issue).',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // DATA & ABOUT  (matches Settings → Data & About)
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'data',
        label: 'Data & Privacy',
        // iconSvg matches Settings → Data & About (info circle)
        iconSvg: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
        entries: [
            {
                q: 'How do I customize the greeting?',
                a: '<strong>Settings → Data & About → Greeting</strong>. Type whatever you want. Use <code>{{time}}</code> as a placeholder — it becomes "morning", "afternoon", "evening", or "night" based on the current hour.',
            },
            {
                q: 'How do I export my data?',
                a: '<strong>Settings → Data & About → Export</strong>. Three options:<br><strong>Settings (JSON)</strong> — backup of all your settings + presets<br><strong>Stats (CSV)</strong> — your statistics in spreadsheet format<br><strong>Share link</strong> — a URL with your current settings encoded, great for sharing setups',
            },
            {
                q: 'How do I import settings?',
                a: '<strong>Settings → Data & About → Import → Import settings file</strong>. Pick a JSON file you previously exported. It overwrites your current settings.',
            },
            {
                q: 'What does "Reset current section" do?',
                a: 'Resets only the settings visible in the current rail tab back to defaults. Other sections stay untouched.',
            },
            {
                q: 'What does "Reset all settings" do?',
                a: 'Resets every section in one step — Scene, Timer, Sounds, Notifications, Shortcuts, Motion, Presets. Does NOT touch tasks or statistics.',
            },
            {
                q: 'What does "Clear all data" do?',
                a: 'The nuclear option. Wipes <strong>everything</strong> — settings, presets, statistics, tasks, ambient mixes. Page reloads fresh. Requires double-confirmation.',
            },
            {
                q: 'What is the gold dot next to a setting label?',
                a: 'That setting has been changed from its default value. It pulses to draw attention. Resetting the section clears all dots.',
            },
            {
                q: 'Is my data private?',
                a: 'Yes. Everything lives in your browser\'s <code>localStorage</code>. No server, no analytics about you personally, no account. Ambient sound files are fetched from a CDN (Cloudflare R2). The 3D library (Babylon.js) is loaded once from a CDN. None of them receive identifying information.',
            },
            {
                q: 'Where can I read the privacy policy and terms?',
                a: '<strong>Settings → Data & About → Legal → Privacy Policy / Terms of Service</strong>. They open in a new tab.',
            },
            {
                q: 'What does the About section show?',
                a: 'Under <strong>Settings → Data & About → About</strong>: app version, detected GPU tier (used by the "Auto" quality preset), active render engine (WebGL2 / WebGPU), a live FPS readout, and your browser string. Useful when filing a bug report or verifying performance tier.',
            },
        ],
    },
];
