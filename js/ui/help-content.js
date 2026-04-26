// help-content.js
//
// All help center content as a searchable data structure.
// Each category has id, label, iconSvg (feather-style, stroke-rendered),
// and entries of { q, a }. Where a category maps to a Settings section,
// its iconSvg matches the one used in the Settings rail so search hits
// show the same visual mark the user sees in Settings.

export const HELP_CATEGORIES = [
    // ═══════════════════════════════════════════════════════════════════════
    // ACCOUNT
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'account',
        label: 'Account',
        // Person silhouette — matches the satellite glyph.
        iconSvg: '<circle cx="12" cy="9" r="3.5"/><path d="M5 21c0-3.5 3-6 7-6s7 2.5 7 6"/>',
        entries: [
            {
                q: 'What is the account satellite?',
                a: 'The small jewel-cut circle hanging off the right edge of the Home / Focus pill at the top of the screen. It\'s your account control — click it to sign in, or, once signed in, to see your profile menu. The thin engraved rail tethering it to the nav is purely decorative — it tells the eye the satellite belongs with the nav, not drifting on its own.',
            },
            {
                q: 'Why would I sign in?',
                a: 'So your universe travels with you. Tasks, stats, settings, and saved constellations follow you across every device you sign in on. Sign-in works today; the cross-device sync layer it powers arrives in the next release.',
            },
            {
                q: 'How do I sign in or create an account?',
                a: 'Click the satellite, then <strong>Sign in</strong> or <strong>Create account</strong>. The modal offers three options:<br><strong>Magic link</strong> — type your email, we send a one-tap sign-in link. No password.<br><strong>Continue with Google</strong> — single click; OAuth handles the rest.<br><strong>Continue with Apple</strong> — same flow, on Apple devices and any browser that supports Sign in with Apple.',
            },
            {
                q: 'Why no password?',
                a: 'Magic links and OAuth are safer and less friction. Passwords get reused across sites, leaked in breaches, and forgotten. A link to your inbox proves you control the email; OAuth proves you control your Google or Apple account. We never see a password and you never have to remember one.',
            },
            {
                q: 'How do I sign out?',
                a: 'Click the satellite while signed in. The dropdown shows your name, email, and a <strong>Sign out</strong> row at the bottom.',
            },
            {
                q: 'What does the small dot on the satellite mean?',
                a: 'A pulsing gold dot at 1 o\'clock = sync in flight. A solid red dot = sync failed; click it to retry. No dot = idle. The dot stays idle until cross-device sync goes live in the next release.',
            },
            {
                q: 'Is my data private?',
                a: 'Yes. Until you sign in, everything stays in your browser — same as before. Once you do, your data is stored in a Postgres database protected by row-level security; auth credentials live in your browser\'s secure session storage; we never see a password (there isn\'t one).',
            },
            {
                q: 'I signed in but nothing seems different',
                a: 'That\'s expected for now. The visible difference is the satellite — gold instead of dark, your initial in place of the person glyph. The cross-device sync that lets your universe follow you to a new device arrives in the next release.',
            },
        ],
    },

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
                a: 'A cinematic Pomodoro timer built on top of a real-time 3D black-hole scene. Focused work sessions, ambient sounds you arrange as a constellation around the black hole, task list, and live stats — all in your browser, no account needed.',
            },
            {
                q: 'What are the two tabs?',
                a: "<strong>Home</strong> — landing page with greeting, clock, and the floating mini-timer once a session is running.<br><strong>Focus</strong> — the Pomodoro timer, task list, and session stats.<br>Ambient sounds aren't a separate tab anymore — they live in the cosmos itself, controlled directly in the 3D scene from any tab.",
            },
            {
                q: 'How do I start my first focus session?',
                a: 'Click <strong>Focus</strong>, then <strong>Start Focus</strong>. The timer begins counting down. When it hits zero, it rolls into a short break automatically. A compact mini-timer also appears on the Home tab.',
            },
            {
                q: 'How do I add ambient sounds?',
                a: 'Open the <strong>cosmos toolbar</strong> at the bottom of the screen and tap the <strong>+</strong> icon. Pick a sound from the library — it spawns as a glowing celestial body that orbits the black hole. Drag the body to set volume and pan. See <em>Cosmos Sound System</em> below for the full guide.',
            },
            {
                q: 'Does my data save automatically?',
                a: "Yes. Tasks, settings, stats, and saved constellations all persist in your browser's local storage. No server, no account. Closing the tab and reopening it restores everything.",
            },
            {
                q: 'How do I open Settings?',
                a: 'Click the <strong>✦ star</strong> in the top-right corner. It has a glow that brightens as your mouse approaches.',
            },
            {
                q: 'Can I replay the welcome tour?',
                a: 'Yes. <strong>Settings → Data & About → Replay welcome tour</strong>. The same 10-step walkthrough you saw on first visit runs again.',
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
                a: "A compact floating widget that appears as soon as any session is running or paused. Shows the countdown, progress arc, session number (1 / 4), and the play/pause + skip + reset controls. The clock face is a real analogue dial — minute hand sweeps over the session, second hand ticks. Click the time digits to jump to the Focus tab.",
            },
            {
                q: 'Can I move or resize the mini-timer?',
                a: "Yes. Drag from any non-button area to reposition it anywhere on screen. Drag the small <strong>↘</strong> handle at the bottom-right corner to resize. Position and size both persist across reloads.",
            },
            {
                q: 'What does the dock button do?',
                a: "The <strong>›</strong> arrow at the top of the mini-timer's controls column docks it as a thin <strong>sliver</strong> pinned to the right edge of the viewport. The sliver shows MM·SS, plus play/pause, skip, and reset. Click the chevron at the top of the sliver to unfurl back to the full mini-timer. Your dock preference persists across reloads.",
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
        iconSvg:
            '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>',
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
                a: "Yes. Tasks are saved to local storage automatically. Close the tab, come back, they're there.",
            },
            {
                q: 'Is there a keyboard shortcut for the task input?',
                a: 'Press <kbd>/</kbd> to instantly focus the task field.',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // COSMOS SOUND SYSTEM  (matches Settings → Sounds)
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'cosmos-sounds',
        label: 'Cosmos Sound System',
        // iconSvg matches Settings → Sounds (speaker + waves)
        iconSvg:
            '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/>',
        entries: [
            {
                q: 'What is the Cosmos Sound System?',
                a: "Every ambient sound is represented as a glowing celestial body that orbits the black hole. You compose your mix by arranging this constellation: drag a body to set its volume and pan, click it to open an EQ ring, drag it into the black hole to remove it. The black hole itself is the master volume. There's no panel of sliders — the cosmos is the mixer.",
            },
            {
                q: 'How do I add a sound?',
                a: 'Tap the <strong>+</strong> icon in the cosmos toolbar (bottom-centre of the screen). The library drawer slides in. Pick a sound — it spawns as a celestial body that flies into orbit around the black hole. The audio comes up as the body settles.',
            },
            {
                q: 'How do I adjust volume and pan?',
                a: "<strong>Drag the body</strong> directly. Vertical drag (up/down) sets volume — closer to the black hole means louder. Horizontal drag (left/right) sets stereo pan. The body's glow scales with volume and the audio updates in real time.",
            },
            {
                q: 'How do I tweak EQ?',
                a: "<strong>Click a body</strong> (without dragging) to open its EQ control ring — three concentric rings labelled <strong>Bass</strong>, <strong>Mid</strong>, and <strong>Treble</strong>. Each ring has a notch you drag to set ±12 dB for that band. The body's color shifts in real time as you adjust. Click outside the ring to close.",
            },
            {
                q: 'How do I mute a sound?',
                a: 'Click the body to open its EQ ring; the <strong>mute</strong> button sits at the bottom of the ring. The body dims while muted; click again to unmute.',
            },
            {
                q: 'How do I remove a sound?',
                a: '<strong>Drag the body into the black hole.</strong> Once inside the event horizon it gets gravitationally lensed and consumed; the audio fades out in lockstep with the visual. (You can also use the <strong>Clear sky</strong> button in the toolbar to remove all of them at once.)',
            },
            {
                q: 'I removed a sound by accident. Can I get it back?',
                a: 'Yes — open the library (<strong>+</strong> in the toolbar) and pick the same sound again. It spawns fresh and rejoins the orbit. Track-level state (volume, EQ, pan) is whatever the defaults are; if you had it tuned, save the constellation first next time.',
            },
            {
                q: 'What does each cosmos toolbar button do?',
                a: 'Hover any toolbar button to see its name. From left to right:<br><strong>Add a sound</strong> (⊕) opens the sound library.<br><strong>Save constellation</strong> (★) saves the current arrangement.<br><strong>Sleep timer</strong> (☾) sets a 15/30/60/120 min fade-out.<br><strong>Surprise me</strong> (✦) drops in a random arrangement.<br><strong>Immersive mode</strong> (⌗) hides the chrome.<br><strong>Clear sky</strong> (⊝) fades out and removes every sound.',
            },
            {
                q: 'How does the master volume work?',
                a: '<strong>The black hole is the master bus.</strong> Drag it vertically (up = louder, down = quieter). The accretion disk and photon ring brighten with master energy, so you can see the loudness, not just hear it.',
            },
            {
                q: 'What sounds are available?',
                a: 'Today: <strong>Rain</strong> (translucent droplet-nebula, shimmer on highs), <strong>Ocean</strong> (wave-ringed gas giant, swell on bass), <strong>Forest</strong> (moss-canopy moon, twist on mids), and <strong>Café</strong> (warm hearth-star, flares on highs). Each body has a bespoke shader bound to its own audio FFT — every body breathes with its own audio, not the master. More sounds tagged "Soon" appear in the library drawer.',
            },
            {
                q: 'What is a constellation?',
                a: 'A saved arrangement of celestial bodies — the set of active sounds plus each body\'s position, volume, EQ, and pan. Replaces the old "saved mixes" concept. You can save your current sky as a constellation and recall it later; loading one animates the bodies back into formation.',
            },
            {
                q: 'How do I save the current constellation?',
                a: "Tap the <strong>★</strong> in the cosmos toolbar. Give it a name. The constellation appears in the library drawer's <em>Constellations</em> section as a small dot-cluster portrait of the orbital arrangement.",
            },
            {
                q: 'What are the built-in constellations?',
                a: 'Eight curated starters in the library drawer: <strong>Rainy Library</strong>, <strong>Forest Walk</strong>, <strong>Ocean Breath</strong>, <strong>Storm Window</strong>, <strong>Tide Pool</strong>, <strong>Garden Café</strong>, <strong>Deep Work</strong>, and <strong>Night Shore</strong>. Each is a hand-tuned arrangement — click to crossfade into it, then drag bodies to refine.',
            },
            {
                q: 'How do I rename, delete, or share a constellation?',
                a: 'In the library drawer, click the <strong>⋯</strong> on any saved constellation. Options: <strong>Rename</strong>, <strong>Share</strong> (copies a <code>/?mix=…</code> link anyone can open), <strong>Delete</strong>. Built-in constellations can be shared but not modified.',
            },
            {
                q: 'How do I pin a constellation as my focus-start arrangement?',
                a: 'Click the <strong>star</strong> on any constellation in the library. Combined with <em>Settings → Sounds → Auto-start mix on focus session</em>, this automatically loads the pinned constellation every time you start a focus session.',
            },
            {
                q: 'What does the cosmos toolbar do?',
                a: 'Floating pill at the bottom-centre of the screen. Six tools:<br><strong>+</strong> Open the sound library<br><strong>★</strong> Save current constellation<br><strong>☾</strong> Sleep timer<br><strong>✧</strong> Surprise me — random constellation<br><strong>⛶</strong> Immersive mode — hides chrome, scene fills viewport<br><strong>⊝</strong> Clear sky — fade out all sounds',
            },
            {
                q: 'What is the sleep timer?',
                a: 'Cosmos toolbar → <strong>☾</strong>. Choose 15, 30, 60, or 120 minutes. A gentle fade-out begins in the last 30 seconds, then everything stops. The toolbar button glows while the timer is running.',
            },
            {
                q: 'What is "Surprise me"?',
                a: "Cosmos toolbar → <strong>✧</strong>. Picks 1–3 sounds at random with tasteful volumes and small EQ tilts and spawns them into orbit. Good when you're indecisive.",
            },
            {
                q: 'What is Immersive mode?',
                a: 'Cosmos toolbar → <strong>⛶</strong>. Hides the nav, settings star, mini-timer, and toolbar so the black-hole scene fills the viewport. Press <kbd>Esc</kbd> to exit.',
            },
            {
                q: 'Can I use the keyboard or a screen reader instead of dragging bodies?',
                a: "Yes. Press <kbd>Alt</kbd>+<kbd>L</kbd> (or <kbd>Cmd</kbd>+<kbd>L</kbd> on macOS) to open the <strong>Cosmos accessible mixer</strong> — a flat panel with every active sound as a row containing volume / pan sliders, mute, and remove. Tab between fields, Esc closes. Screen readers can always reach the same panel; it's rendered off-screen at rest, full parity with the visual surface.",
            },
            {
                q: 'What does "Remember active sounds" do?',
                a: '<strong>Settings → Sounds → Behavior → Remember active sounds</strong>. When on (default), your last constellation is restored on page load.',
            },
            {
                q: 'What does "Fade out when session ends" do?',
                a: '<strong>Settings → Sounds → Fade out when session ends</strong>. When on (default), the master volume smoothly fades to silence over ~4 s when a focus or break session completes.',
            },
            {
                q: 'What does "Auto-start mix on focus session" do?',
                a: '<strong>Settings → Sounds → Auto-start mix on focus session</strong>. When on, starting a focus session loads your pinned constellation (see the star icon on constellations in the library). Off by default.',
            },
            {
                q: "Why don't my sounds play?",
                a: "Sound files are hosted on a CDN. If the CDN blocks cross-origin access, the app falls back to basic HTML playback (no EQ, no pan, no scene reactivity) — audio still plays. If you hear silence entirely, drag the black hole upward (master volume), and check the body isn't muted (click it to open the EQ ring and check the mute toggle at the bottom).",
            },
            {
                q: 'Does ambient keep playing when I switch tabs?',
                a: "Yes. Sounds continue across Home and Focus tabs — the cosmos is always there in the background. The cosmos toolbar is also always available regardless of which tab you're on.",
            },
            {
                q: "Can I control ambient from my phone's lock screen?",
                a: 'Yes — through the Media Session API. Lock-screen play/pause and Bluetooth / CarPlay controls route to the ambient engine while a constellation is playing.',
            },
            {
                q: 'How are the bodies audio-reactive?',
                a: "Each track has its own <code>AnalyserNode</code> tapped after its post-pan signal, feeding FFT data straight into that body's shader. The rain droplet shimmers on highs, the ocean ring swells on bass, the forest moss twists on mids — all driven by the actual frequency content of the audio coming out of <em>that</em> track, not the master bus.",
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
        iconSvg:
            '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41"/>',
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
                a: "The FPS watchdog monitors sustained performance. If sustained FPS drops below 22 for 30 seconds, the watchdog degrades quality gradually — first disabling film grain and chromatic aberration, then anamorphic streak, then god rays, then halving bloom kernel, and only as a last resort lowering render resolution. Every 5 minutes it probes full quality to check if the device can handle it again. If you're seeing pixelation, your device is genuinely struggling — try lowering <em>Settings → Scene → Quality</em> to Medium or Low.",
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
        iconSvg:
            '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>',
        entries: [
            {
                q: 'How do I enable desktop notifications?',
                a: "<strong>Settings → Notifications → Enable notifications</strong>. You'll see the browser permission prompt — click Allow. After that, Cosmic Focus can send a system notification when a session ends, even if the tab is in the background.",
            },
            {
                q: 'What notifications can I control?',
                a: "Three separate toggles under <strong>Settings → Notifications → Alerts</strong>:<br><strong>Focus session complete</strong> — when a focus timer reaches zero<br><strong>Break complete</strong> — when a short or long break ends<br><strong>Full cycle complete</strong> — when you've finished all sessions in a full Pomodoro cycle",
            },
            {
                q: 'How long do notifications stay on screen?',
                a: '<strong>Settings → Notifications → Auto-close after</strong>. Choose 5, 10, 15 (default), or 30 seconds — or <strong>Never</strong> to leave them until the user dismisses them manually.',
            },
            {
                q: "Notifications aren't working — what do I check?",
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
        iconSvg:
            '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
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
        iconSvg:
            '<rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>',
        entries: [
            {
                q: 'What keyboard shortcuts exist?',
                a: '<table class="hc-shortcut-table"><tr><td><kbd>Space</kbd></td><td>Start / pause timer</td></tr><tr><td><kbd>R</kbd></td><td>Reset timer</td></tr><tr><td><kbd>1</kbd></td><td>Switch to Home</td></tr><tr><td><kbd>2</kbd></td><td>Switch to Focus</td></tr><tr><td><kbd>/</kbd></td><td>Focus the task input</td></tr><tr><td><kbd>?</kbd></td><td>Open this Help Center</td></tr><tr><td><kbd>Alt</kbd>+<kbd>L</kbd></td><td>Open the cosmos accessible mixer (flat keyboard surface for the sound bodies)</td></tr><tr><td><kbd>Esc</kbd></td><td>Close any modal / panel</td></tr></table>',
            },
            {
                q: 'Can I rebind shortcuts?',
                a: "Yes. <strong>Settings → Shortcuts → Keyboard</strong>. Click any row, then press the key you want to assign. Click the same row again or press <kbd>Esc</kbd> to cancel. The <kbd>Esc</kbd> shortcut itself can't be rebound — it's the universal escape hatch.",
            },
            {
                q: "Shortcuts don't work while I'm typing — is that a bug?",
                a: "No, by design. Shortcuts are disabled when you're focused on a text input (task field, search box, settings inputs, feedback textarea) so your keystrokes go into the field. Press <kbd>Esc</kbd> to unfocus first.",
            },
            {
                q: 'What is Reduce motion?',
                a: "<strong>Settings → Shortcuts → Motion → Reduce motion</strong>. When on, the app dampens or skips the larger UI animations (tour fade-in, modal springs, timer tick pulses, etc.). It overrides the <code>prefers-reduced-motion</code> system setting so you can force it on even if your OS isn't set that way.",
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
        iconSvg:
            '<path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/><circle cx="12" cy="12" r="3"/>',
        entries: [
            {
                q: 'What are focus presets?',
                a: 'Named snapshots of your whole Settings state. Set up a "Deep Work" preset with 50-minute focus + rain sounds, then a "Casual" preset with 25-minute focus + café — switch between them with one click instead of re-adjusting every slider.',
            },
            {
                q: 'How do I create one?',
                a: "<strong>Settings → Presets → Focus presets → New preset</strong>. Give it a name. Whatever your current Settings look like becomes the preset's snapshot.",
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
                q: 'Difference between focus presets and constellations?',
                a: "<strong>Focus preset</strong> = snapshot of <em>all</em> Settings (timer, scene, sounds, notifications…). <strong>Constellation</strong> = just the active sounds plus each body's orbital position, volume, EQ, and pan. They're orthogonal — you can pair any preset with any constellation.",
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
        iconSvg:
            '<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>',
        entries: [
            {
                q: 'How do I report a bug or request a feature?',
                a: 'Click <strong>Settings → Feedback</strong>. Pick <strong>Bug report</strong> or <strong>Feature request</strong> at the top, type your message, and hit <strong>Send</strong>. Your mail client opens with the subject and body pre-filled. Or click <strong>Copy as email</strong> to put the whole thing on your clipboard.',
            },
            {
                q: 'What information gets sent along with my feedback?',
                a: "Only auto-collected technical context that helps reproduce what you're describing: app version, browser + platform string, GPU (if your browser exposes it), viewport size, language, and a timestamp. Nothing identifying or personal. You can see the exact content in the copied email.",
            },
            {
                q: 'Who does my feedback go to?',
                a: 'Straight to the maintainer at the email shown under the form. No intermediary, no tracking, no ticketing system.',
            },
            {
                q: "What if I don't have a mail client set up?",
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
        iconSvg:
            '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
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
                a: 'The nuclear option. Wipes <strong>everything</strong> — settings, presets, statistics, tasks, saved constellations. Page reloads fresh. Requires double-confirmation.',
            },
            {
                q: 'What is the gold dot next to a setting label?',
                a: 'That setting has been changed from its default value. It pulses to draw attention. Resetting the section clears all dots.',
            },
            {
                q: 'Is my data private?',
                a: "Yes. Everything lives in your browser's <code>localStorage</code>. No server, no analytics about you personally, no account. Ambient sound files are fetched from a CDN (Cloudflare R2). The 3D library (Babylon.js) is loaded once from a CDN. None of them receive identifying information.",
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
