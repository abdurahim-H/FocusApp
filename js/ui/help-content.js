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
                a: "The small jewel-cut circle hanging off the right edge of the Home / Focus pill at the top of the screen. It's your account control — click it to sign in, or, once signed in, to see your profile menu. The thin engraved rail tethering it to the nav is purely decorative — it tells the eye the satellite belongs with the nav, not drifting on its own.",
            },
            {
                q: 'Why would I sign in?',
                a: 'So your universe travels with you. Tasks, stats, settings, and saved constellations follow you across every device you sign in on. Sign-in works today; the cross-device sync layer it powers arrives in the next release.',
            },
            {
                q: 'How do I sign in or create an account?',
                a: 'Click the satellite, then <strong>Sign in</strong> or <strong>Create account</strong>. Three options:<br><strong>Email + password</strong> — the default. Sign-up sends a confirmation link to your inbox; once verified you can sign in any time.<br><strong>Magic link</strong> — type your email, we send a one-tap sign-in link. No password to remember.<br><strong>Continue with Google</strong> — single click; OAuth handles the rest.',
            },
            {
                q: 'Which sign-in method should I pick?',
                a: '<strong>Email + password</strong> works the same as anywhere else; the password is checked against a strength policy and a known-breach list (HIBP) before sign-up is allowed, so weak or compromised passwords are rejected up front. <strong>Magic link</strong> is the lower-friction option — no password to remember; we send a one-tap sign-in link to your inbox. <strong>Continue with Google</strong> is the lowest-friction option of all and is the only OAuth provider currently wired up. Whichever you pick, your session lives in the browser as a refresh token; the password (if you set one) is never stored on this device.',
            },
            {
                q: 'How do I sign out?',
                a: 'Click the satellite while signed in. The dropdown shows your name, email, an <strong>Open Profile</strong> row, an <strong>Open notes</strong> row, an <strong>Account analytics</strong> row, a placeholder <strong>Cross-device sync</strong> row marked "soon", and a <strong>Sign out</strong> row at the bottom.',
            },
            {
                q: 'What does the small dot on the satellite mean?',
                a: "A pulsing gold dot at 1 o'clock = sync in flight. A solid red dot = sync failed. No dot = idle. The dot is wired up via <code>setSyncState()</code> as a placeholder — the cross-device sync layer it visualises hasn't shipped yet, so you should not see either state today.",
            },
            {
                q: 'Is my data private?',
                a: "Yes. Until you sign in, everything stays in your browser — same as before. Once you sign in, identity (email, display name, unique handle) is stored in a Postgres database protected by row-level security; productivity data still lives only in your browser today and isn't mirrored to the server yet (the cross-device sync layer is the next phase). Sign-in tokens live in your browser's session storage; passwords (if you set one) are hashed by Supabase Auth before they're stored — the app never reads or keeps a plaintext copy.",
            },
            {
                q: 'I signed in but nothing seems different',
                a: "That's expected for now. The visible difference is the satellite — gold instead of dark, your initial in place of the person glyph. The cross-device sync that lets your universe follow you to a new device arrives in the next release.",
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
                a: 'A cinematic Pomodoro timer built on top of a real-time 3D black-hole scene. Focused work sessions, ambient sounds you arrange as a constellation around the black hole, a task dock pinned to the bottom of the Focus tab, a notepad, live stats, and a deep analytics profile — all in your browser, no account needed.',
            },
            {
                q: 'What are the two tabs?',
                a: "<strong>Home</strong> — landing page with the greeting, the clock, this week and this month at-a-glance tiles, and the floating mini-timer once a session is running.<br><strong>Focus</strong> — the Pomodoro timer, the live stats bar, and the task dock pinned to the bottom of the screen.<br>Ambient sounds aren't a separate tab anymore — they live in the cosmos itself, controlled directly in the 3D scene from any tab.",
            },
            {
                q: 'How do I start my first focus session?',
                a: 'Click <strong>Focus</strong>, then <strong>Start Focus</strong>. The timer begins counting down. When it hits zero, it rolls into a short break automatically. A compact mini-timer also appears on the Home tab so the countdown stays visible while you browse.',
            },
            {
                q: 'How do I add ambient sounds?',
                a: 'Open the <strong>cosmos toolbar</strong> at the bottom of the screen and tap the <strong>+</strong> icon. Pick a sound from the library — it spawns as a glowing celestial body that orbits the black hole. Drag the body to set volume and pan. See <em>Cosmos Sound System</em> below for the full guide.',
            },
            {
                q: 'Does my data save automatically?',
                a: "Yes. Tasks, settings, stats, notes, and saved constellations all persist in your browser's local storage. No server, no account. Closing the tab and reopening it restores everything.",
            },
            {
                q: 'How do I open Settings?',
                a: 'Click the <strong>✦ star</strong> in the top-right corner. It has a glow that brightens as your mouse approaches.',
            },
            {
                q: 'Can I replay the welcome tour?',
                a: 'Yes. <strong>Settings → Data & About → Help → Replay welcome tour</strong>. The same walkthrough you saw on first visit runs again.',
            },
            {
                q: 'Do I need to be online?',
                a: 'No. Once the page has loaded, the timer, tasks, settings, stats, and notepad all run entirely in-browser. A connection is only needed for the initial page load, to fetch ambient sounds the first time you use them, and (optionally) to embed a YouTube / SoundCloud stream backdrop.',
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
                q: 'What cycle presets are available?',
                a: "<strong>Settings → Timer → Cycle preset → Style</strong>. Seven options:<br><strong>Pomodoro (25 / 5)</strong> — the classic.<br><strong>Long Pomodoro (50 / 10)</strong> — half-hour-plus blocks.<br><strong>52 / 17 — DeskTime</strong> — derived from the DeskTime productivity study.<br><strong>90 / 20 — Ultradian rhythm</strong> — aligned to the natural 90-minute attention cycle.<br><strong>Deep work (180 / 30)</strong> — three-hour deep sessions.<br><strong>Open-ended (count up, no target)</strong> — the timer counts UP from 00:00 instead of down. Stop whenever you're done.<br><strong>Custom</strong> — leaves the duration sliders alone so you can dial them in by hand.<br>Picking any preset other than Custom rewrites the focus / short break / long break sliders below.",
            },
            {
                q: 'How do I change the timer durations directly?',
                a: 'Open <strong>Settings → Timer → Durations</strong>. Three sliders: <strong>Focus</strong> (1–240 min, default 25), <strong>Short break</strong> (1–30 min, default 5), <strong>Long break</strong> (1–60 min, default 15). Touching them switches the cycle preset to <em>Custom</em> automatically.',
            },
            {
                q: 'What does Auto-start do?',
                a: 'Under <strong>Settings → Timer → Flow</strong>. When enabled (default), the next session starts automatically after the current one ends — no need to click Start. A <strong>Delay</strong> slider (0–3000 ms, default 150) lets you pause briefly before it begins, for a breath between sessions.',
            },
            {
                q: 'What does "Long break every" mean?',
                a: 'Also in <strong>Settings → Timer → Flow</strong>. Controls when the rhythm switches from short to long break. Default: every 4 focus sessions. Range 2–8.',
            },
            {
                q: 'What is the Cycle goal?',
                a: 'The total number of focus sessions that make up one full cycle. The Focus tab shows it as <strong>Session N of M</strong>; the floating mini-timer shows the same number compactly as <strong>N / M</strong>. Range 1–12, default 4. Separate from the long-break interval.',
            },
            {
                q: 'What does the Reset button do?',
                a: "There are two reset buttons.<br>The <strong>R</strong> shortcut and the matching toolbar control reset only the <em>current</em> timer back to its starting time — focus stays focus, break stays break, the session counter doesn't change.<br>The small <strong>⟳</strong> icon next to the Start row resets the <em>entire</em> Pomodoro cycle back to session 1 of focus. Useful when you want a clean slate, not just a do-over of the current session.",
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
                a: 'A compact floating widget that appears as soon as any session is running or paused. Shows the countdown, progress arc, session label (FOCUS / BREAK), session number (1 / 4), and the dock + play/pause + skip + reset controls. The clock face is a real analogue dial — minute hand sweeps over the session, second hand ticks. Click the central body (label, digits, or session number) to jump to the Focus tab.',
            },
            {
                q: 'Can I move or resize the mini-timer?',
                a: 'Yes. Drag from any non-button area to reposition it anywhere on screen. Drag the small <strong>↘</strong> handle at the bottom-right corner to resize. Position and size both persist across reloads.',
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
    // GOALS  (matches Settings → Timer → Goals)
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'goals',
        label: 'Goals & Gamification',
        // Target / bullseye — matches the goal-ring affordance in the stats bar.
        iconSvg:
            '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
        entries: [
            {
                q: 'What is the daily focus goal?',
                a: '<strong>Settings → Timer → Goals → Daily focus goal</strong> (slider, 0–480 min, default 90). Drives the gold goal-ring that wraps the "focused today" chip in the stats bar — the ring fills clockwise as today\'s minutes approach the target. Set to 0 to hide the ring entirely.',
            },
            {
                q: 'What is the weekly focus goal?',
                a: '<strong>Settings → Timer → Goals → Weekly focus goal</strong> (slider, 0–3600 min, default 720 = 12 hrs). Surfaces a thin progress bar under the Home <em>this week</em> tile. The bar visually caps at 100% so it never glitches past the right edge — the label still reads honestly when you overshoot ("12.5 / 12 hrs"). Set to 0 to hide the bar.',
            },
            {
                q: 'What is the streak target?',
                a: '<strong>Settings → Timer → Goals → Streak target</strong> (stepper, 0–365 days, default 7). Once <code>currentStreak</code> reaches the target, a <strong>🎯 N-day target hit</strong> chip lights up beside the day-streak counter in the stats bar. The chip is calm-coded — it celebrates the achievement without nagging you with "N to go" copy when you\'re below the target.',
            },
            {
                q: 'What is the weekly tasks goal?',
                a: '<strong>Settings → Timer → Goals → Weekly tasks goal</strong> (stepper, 0–200 tasks, default 20). Renders a second progress bar under the Home <em>this month</em> tile — sums <code>tasksCompleted</code> across the trailing 7-day session window. Set to 0 to hide.',
            },
            {
                q: 'What are personal-best alerts?',
                a: '<strong>Settings → Timer → Gamification → Personal-best alerts</strong> (default ON). Celebrates the moment a day overtakes your previous best for total focus time — a single calm top-right toast: <em>🌟 New personal best — N hrs focused today</em>. Never fires on the very first record (so the very first session you ever finish is a calm experience, not an instant celebration).',
            },
            {
                q: 'What is streak insurance?',
                a: '<strong>Settings → Timer → Gamification → Streak insurance</strong> (default OFF, opt-in). Once a week, lets one missed day pass without breaking your streak — the next focused day extends the streak as if yesterday was continuous. Bookkeeping uses <code>lastFreezeUsedDate</code> in localStorage to enforce the once-per-ISO-week limit. Compassionate gamification: the streak is allowed to survive a single off-day.',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TASKS  (task dock + task detail drawer + custom date picker)
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'tasks',
        label: 'Tasks',
        iconSvg:
            '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>',
        entries: [
            {
                q: 'Where do tasks live?',
                a: 'In a slim <strong>task dock</strong> pinned to the bottom of the Focus tab. The dock is 44 px tall by default so the timer stays uncluttered, and expands into a 60vh panel when you tap the pull-rail handle (the small horizontal grip at the top edge) or anywhere on the slim strip. Outside-click or <kbd>Esc</kbd> collapses it back. Your collapsed-vs-expanded preference is remembered across reloads (key <code>fu_task_dock_state</code>).',
            },
            {
                q: 'How do I add a task?',
                a: 'Expand the dock, type into the input field at the top of the panel, then press <kbd>Enter</kbd> or click <strong>Add</strong>. New tasks slide in at the top of the list. The shortcut <kbd>/</kbd> jumps your cursor straight into this field from anywhere — and switches to the Focus tab and expands the dock if needed.',
            },
            {
                q: 'What does the slim strip preview show?',
                a: 'When the dock is collapsed, the strip displays an eyebrow tag plus a task name plus a count chip. The eyebrow reads <strong>NOW</strong> (the pinned active task), <strong>NEXT</strong> (the first open task if no active task is pinned), <strong>DONE</strong> (every task is completed), or stays blank when the list is empty. The count chip shows "X of Y." If the active task has a Pomodoro estimate, a small progress badge appears next to the count.',
            },
            {
                q: 'What does the expanded dock contain?',
                a: "A sticky header at the top with the <em>TASKS</em> eyebrow, the title <em>Tasks for this session</em>, three count chips (<strong>X open · Y done · Z total</strong>), and an X close button. Below: the carry-over banner (only when stale tasks are present), the add-task input + <strong>Add</strong> button, the scrollable task list, and a footer with bulk actions <strong>Clear completed</strong> and <strong>Clear All</strong>. The dock's width is 540 px when collapsed and 760 px when expanded so all the chips fit on a single row.",
            },
            {
                q: 'How do I mark a task done?',
                a: 'Tap anywhere on the task content area — the row is the toggle target. Tap once to mark done (the text gets a strikethrough), tap again to mark not-done. Keyboard: focus a row with <kbd>Tab</kbd> and press <kbd>Enter</kbd> or <kbd>Space</kbd>.',
            },
            {
                q: 'How do I delete a task?',
                a: 'Click the <strong>✕</strong> on the right side of the task row. It slides out with an exit animation. The delete button is its own target — tapping it never accidentally toggles the task.',
            },
            {
                q: 'How do I clear all tasks at once?',
                a: "In the dock's footer: <strong>Clear All</strong> wipes everything; <strong>Clear completed</strong> removes only the done ones. Both buttons appear only when there's something to clear.",
            },
            {
                q: 'How do I reorder tasks?',
                a: 'Each row has a small <strong>⋮⋮</strong> drag handle on its left. Pick it up and drop the row where you want it. The new order persists across reloads.',
            },
            {
                q: 'What does the carry-over banner do?',
                a: 'When the dock detects open, non-recurring tasks created more than 24 hours ago, a banner appears at the top of the panel: <em>You have N stale tasks from earlier sessions.</em> Two buttons: <strong>Keep</strong> dismisses the banner for today; <strong>Clear stale</strong> deletes those old open tasks in one go. Recurring tasks are never flagged as stale.',
            },
            {
                q: "What's the › info button on each task?",
                a: "Opens the <strong>task detail drawer</strong> — a panel that drops down from below the nav, the same animation pattern used by Settings / Help / Profile. It contains the longer-form fields that don't fit on the inline row.",
            },
            {
                q: "What's in the task detail drawer?",
                a: 'A header with a <strong>‹ Back to tasks</strong> pill on the left and the X close on the right. The body has: editable <strong>Task name</strong>, a <strong>Mark done</strong> toggle, an <strong>Estimate</strong> stepper (Pomodoros), a <strong>Due date</strong> picker (custom calendar), a <strong>Project</strong> tag, a <strong>Repeats</strong> radio group (<em>Never · Every day · Weekdays · Every week</em>), a subtasks list with an on-demand <strong>+ Add a subtask</strong> trigger that reveals the input form, a sessions-touched history, and a <strong>Delete</strong> button (two-step confirm).',
            },
            {
                q: 'How does the custom date picker work?',
                a: "Tap the small calendar icon on a task row (or the Due-date picker inside the task detail drawer). A Mon-first 6×7 calendar grid pops up. Today's cell has a subtle gold dot. Two action buttons: <strong>Clear</strong> wipes the date, <strong>Today</strong> jumps the cursor back to today. Keyboard: arrow keys move the day cursor, <kbd>Enter</kbd> picks, <kbd>Esc</kbd> closes. The calendar icon itself is an inline feather-style SVG (rounded rectangle + header line + two small top tabs) — emoji glyphs render very differently across operating systems, which broke the visual register before.",
            },
            {
                q: 'How do subtasks work?',
                a: "Each task row has a chevron toggle. Tap it to reveal the subtask drawer. When the parent has no subtasks, the toggle's aria-label reads <em>Add a subtask</em> — clicking it expands an inline form to add the first one. Subtasks have their own checkbox and ✕. A small <em>n / total</em> counter pill on the parent row shows progress at a glance.",
            },
            {
                q: 'What do the small chips next to a task name mean?',
                a: 'Left to right: a Pomodoro <strong>estimate badge</strong> (when an estimate is set), a <strong>due-date badge</strong> ("due today" / "due tomorrow" / "overdue 3 days"), a <strong>↻ recurring indicator</strong> (when the task repeats), and a <strong>#project chip</strong> (when a project tag is set). Long task text now wraps to up to 3 lines instead of being truncated with ellipsis.',
            },
            {
                q: 'Do tasks persist?',
                a: "Yes. Tasks are saved to local storage automatically. Close the tab, come back, they're there.",
            },
            {
                q: 'Is there a keyboard shortcut for the task input?',
                a: "Press <kbd>/</kbd> to instantly focus the task field. If you're on Home, the shortcut switches to Focus first; if the dock is collapsed, the input is still focused (the keystroke unfolds it via the focus event).",
            },
            {
                q: 'Where do I see how productive my tasks are?',
                a: 'Open the <strong>Profile</strong> (account satellite at the top, or press <kbd>i</kbd>) and switch to the <strong>Tasks</strong> section. The four KPIs at the top are <strong>tasks done</strong>, <strong>avg per session</strong>, <strong>tasks per hour</strong>, and <strong>sessions w/ tasks (%)</strong>. Below the KPIs sits a 30-day per-day chart with a regression trend line, plus by-day-of-week and by-hour bar charts whose subtitles call out your peak weekday and peak hour. See the Profile section in this Help Center for the full breakdown.',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // NOTEPAD
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'notepad',
        label: 'Notepad',
        // Open notebook — distinct from the tasks check-box.
        iconSvg:
            '<path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><line x1="4" y1="8" x2="19" y2="8"/><line x1="8" y1="12" x2="15" y2="12"/><line x1="8" y1="16" x2="15" y2="16"/>',
        entries: [
            {
                q: 'What is the notepad?',
                a: "A focused-writing surface for thoughts, notes, and journaling that you don't want sitting inside a task. Multi-note, tag chips, full-text search, autosave, voice dictation, and exports. All notes live in <code>localStorage</code> under <code>fu_notes_v1</code> — never sent anywhere.",
            },
            {
                q: 'How do I open the notepad?',
                a: "Press <kbd>n</kbd> from anywhere except inside a text field or while another modal owns the keyboard (Auth modal, Help Center, Settings panel, Profile, task detail drawer, or expanded task dock). You can also open it from the account dropdown's <strong>Open notes</strong> row. <kbd>Esc</kbd> closes it.",
            },
            {
                q: 'How do I create a new note?',
                a: 'Inside the notepad, the sidebar lists every note. The <strong>+</strong> button at the top of the sidebar creates a fresh blank note and selects it. Click any other note to switch to it; the editor saves the previous one before swapping.',
            },
            {
                q: 'What are the tag chips?',
                a: 'Hash-tags inside a note body (<code>#meeting</code>, <code>#research</code>, etc.) are extracted automatically and appear above the sidebar as filter chips. Click a chip to filter the sidebar to notes with that tag; click it again to clear the filter.',
            },
            {
                q: 'How does search work?',
                a: 'Type into the search box at the top of the sidebar. Both note titles and bodies are matched case-insensitively. The list narrows as you type.',
            },
            {
                q: 'How do I dictate with my voice?',
                a: "Tap the microphone button in the notepad header. Browser speech recognition (where supported — Chrome / Edge / Safari) listens and appends transcribed text to the active note. Tap again to stop. The button shows a disabled state if your browser doesn't support the Web Speech API.",
            },
            {
                q: 'How do I export a note?',
                a: "Tap the export button in the notepad header. A small menu offers <strong>Markdown (.md)</strong>, <strong>HTML (.html)</strong>, and <strong>PDF (via print)</strong>. The first two download a file directly; PDF opens the browser's print dialog so you can save-as-PDF.",
            },
            {
                q: 'What does the Pomodoro auto-prepend do?',
                a: "When a focus session starts, the notepad automatically appends a header — <em>## H:MM AM — focus session N</em> — to today's daily note (created lazily on first use). It gives you a chronological log of when you focused without lifting a finger. Break sessions don't add a header.",
            },
            {
                q: 'Are notes part of the welcome tour?',
                a: 'No — the notepad is a quieter surface that\'s deliberately not in the first-run tour. The <kbd>n</kbd> shortcut and the account dropdown\'s "Open notes" row are how you find it.',
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
                a: "<strong>Click a body</strong> (without dragging) to open its EQ control ring — three concentric rings labelled <strong>Bass</strong>, <strong>Mid</strong>, and <strong>Treble</strong>. Each ring has a notch you drag to set ±12 dB for that band. The audio responds in real time. (The body's tint stays fixed per sound — only the audio changes.) Click another body or empty space to close the ring.",
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
                a: 'The toolbar is a floating pill at the bottom-centre of the screen. Hover any button to see its name as a tooltip. From left to right:<br><strong>Add a sound</strong> (a circle with a cross inside) opens the sound library.<br><strong>Save constellation</strong> (a five-point star) saves the current arrangement under a name you choose.<br><strong>Sleep timer</strong> (a crescent moon) sets a 15 / 30 / 60 / 120-minute fade-out — the button glows around the rim while the timer is running.<br><strong>Surprise me</strong> (a four-point sparkle) picks 1–3 sounds at random with tasteful volumes and small EQ tilts.<br><strong>Immersive mode</strong> (four corner brackets) hides the nav, settings star, mini-timer, and toolbar so the scene fills the viewport.<br><strong>Clear sky</strong> (a circle with a horizontal line) fades out and removes every active sound.',
            },
            {
                q: 'How does the master volume work?',
                a: '<strong>The black hole is the master bus.</strong> Drag it vertically (up = louder, down = quieter). The accretion disk and photon ring brighten with master energy, so you can see the loudness, not just hear it.',
            },
            {
                q: 'What sounds are available?',
                a: 'Today four ambient sounds, each rendered in the cosmos as a tiny luminous celestial body: <strong>Rain</strong> (cool blue), <strong>Ocean</strong> (cyan), <strong>Forest</strong> (emerald green), and <strong>Café</strong> (amber/gold). The body is the same shape for every sound — a bright core wrapped in a soft halo — only the tint differs, so the four are easy to recognise without reading copy. Each one has its own resting orbital lane around the black hole. Ten more sounds (thunder, wind, stream, birds, fireplace, library, fan, white/pink/brown noise) appear in the library drawer tagged <strong>Soon</strong>.',
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
                a: "Honest answer: those affordances are not currently exposed in the live library drawer — the constellation cards activate a saved arrangement when clicked, and that's it. The underlying <code>renameMix</code> / <code>deleteMix</code> / share-link helpers exist in the codebase but the UI hooks for a per-card menu aren't rendered today. If you need to remove a saved constellation in the meantime, <strong>Settings → Data & About → Reset → Clear all data</strong> wipes saved constellations along with everything else (it's the only nuclear lever currently available).",
            },
            {
                q: 'How do I pin a constellation as my focus-start arrangement?',
                a: "The pin star is also part of the unrendered constellation-management UI noted above. The setting it would feed — <strong>Settings → Sounds → Behavior → Auto-start mix on focus session</strong> — is wired up and respects whichever constellation id has been pinned via <code>sounds.focusStartMixId</code>; that key just isn't reachable from any visible control yet.",
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
                a: "Yes. Press <kbd>Alt</kbd>+<kbd>L</kbd> to open the <strong>Cosmos accessible mixer</strong> — a flat panel with every active sound as a row containing volume / pan sliders, mute, and remove. Tab between fields, Esc closes. Screen readers can always reach the same panel; it's rendered off-screen at rest, full parity with the visual surface. (<kbd>Cmd</kbd>+<kbd>L</kbd> is also wired up but most macOS browsers swallow it for the address bar; <kbd>Alt</kbd>+<kbd>L</kbd> is the reliable shortcut.)",
            },
            {
                q: 'What does "Remember active sounds" do?',
                a: '<strong>Settings → Sounds → Behavior → Remember active sounds</strong>. When on (default), your last constellation is restored on page load.',
            },
            {
                q: 'What does "Fade out when session ends" do?',
                a: '<strong>Settings → Sounds → Behavior → Fade out when session ends</strong>. When on (default), the master volume smoothly fades to silence over ~4 s when a focus or break session completes.',
            },
            {
                q: 'What does "Auto-start mix on focus session" do?',
                a: "<strong>Settings → Sounds → Behavior → Auto-start mix on focus session</strong>. When on, starting a focus session is supposed to load your pinned constellation. Off by default. As noted above, the pin-star control isn't currently exposed in the library drawer, so this toggle has nothing to act on until that UI lands.",
            },
            {
                q: 'What does "Mute cosmos sounds during a stream theme" do?',
                a: "<strong>Settings → Sounds → Behavior → Mute cosmos sounds during a stream theme</strong> (default ON). When you pick a YouTube / SoundCloud backdrop in <em>Settings → Scene → Streams</em>, this fades the cosmos ambient mix to silence so the two audio sources don't fight. Turn it off to deliberately layer them — for example, run a fireplace livestream over the rain constellation.",
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
                a: "Each track has its own <code>AnalyserNode</code> tapped after its post-pan signal. The cosmos sound-body for that track reads the analyser's overall energy every frame and uses it to gently brighten the body's core and halo when the track is loud. It's per-track, not per-master — turning one sound up makes only that one body breathe harder. The motion is intentionally subtle: the body reads as a celestial object, not as a bouncing audio meter.",
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // STREAM THEMES  (Wave 5)
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'stream-themes',
        label: 'Stream Themes',
        // Play arrow inside a rounded screen — short-hand for live stream.
        iconSvg:
            '<rect x="3" y="5" width="18" height="13" rx="2"/><polygon points="10 9 15 11.5 10 14"/>',
        entries: [
            {
                q: 'What is a stream theme?',
                a: "A YouTube or SoundCloud livestream embedded full-viewport <em>behind</em> the focus card, replacing the 3D cosmos with someone else's ambience for the session. The focus card, mini-timer, task dock, and settings star all stay floating on top; the canvas is what gets swapped out. Pick from a curated list under <strong>Settings → Scene → Streams</strong> or paste any youtube.com / soundcloud.com URL.",
            },
            {
                q: 'Which curated streams are available?',
                a: '<strong>Settings → Scene → Streams (collapsible) → Live stream backdrop</strong>. Eight built-in options:<br>• <strong>Lofi Girl — beats to focus to</strong><br>• <strong>Lofi Girl — beats to sleep to</strong><br>• <strong>Chillhop — afternoon café</strong><br>• <strong>Cozy Jazz Café</strong><br>• <strong>Fireplace with crackling</strong><br>• <strong>Rain on a window</strong><br>• <strong>Study with me — Korea live</strong><br>• <strong>Classical study music</strong><br>Or <strong>None — use 3D theme</strong> to revert to the black-hole scene.',
            },
            {
                q: 'Can I use a custom stream URL?',
                a: 'Yes — the <strong>Custom URL</strong> text field below the picker accepts any <code>youtube.com</code> or <code>soundcloud.com</code> link. Pasting a value overrides the picker; clear the field to fall back to the picker selection. The CSP is configured to allow embedding from YouTube, youtube-nocookie, and SoundCloud — other hosts will refuse to load.',
            },
            {
                q: "Does the cosmos audio fight with a stream's audio?",
                a: 'Not by default. <strong>Settings → Sounds → Behavior → Mute cosmos sounds during a stream theme</strong> is ON out of the box, which fades the constellation to silence whenever a stream backdrop is active. Turn it off if you specifically want both audio sources to layer (rain stream + crackling fire constellation, for example).',
            },
            {
                q: 'Can I see my stats and timer with a stream playing?',
                a: 'Yes. The stream sits behind the focus card on the Focus tab, and on the Home tab it sits behind the home content. The mini-timer, task dock, settings star, account satellite, and cosmos toolbar all overlay it — your full UI stays accessible.',
            },
            {
                q: 'Why is my custom URL not loading?',
                a: 'Two common causes. (1) The host isn\'t YouTube or SoundCloud — the CSP blocks every other origin from being framed. (2) The video has embedding disabled by its uploader, which the YouTube player surfaces as a "Video unavailable" inside the iframe. Try a different video or fall back to one of the curated streams.',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // PROFILE
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'profile',
        label: 'Profile',
        // Bar chart + line graph — analytics destination
        iconSvg:
            '<line x1="3" y1="20" x2="21" y2="20"/><polyline points="6 16 10 11 14 14 18 8"/><circle cx="6" cy="16" r="0.8"/><circle cx="10" cy="11" r="0.8"/><circle cx="14" cy="14" r="0.8"/><circle cx="18" cy="8" r="0.8"/>',
        entries: [
            // ── Overview of what the Profile is ───────────────────────────
            {
                q: 'What is the Profile?',
                a: 'The full analytics surface for your focus sessions. Six sections — Overview, Focus, Tasks, Sounds, Time, Insights — built from the per-session data the app records every time you finish or cut short a focus block. Everything is computed locally in your browser; nothing is shared.',
            },
            {
                q: 'How do I open the Profile?',
                a: 'Three ways: <strong>(1)</strong> click the account satellite at the top of the screen and pick <strong>Open Profile</strong> from the dropdown, <strong>(2)</strong> click the small momentum-trail dots in the stats bar, or <strong>(3)</strong> press the <kbd>i</kbd> key from anywhere outside a text field (and outside an open Auth modal, Help Center, or Settings panel). Press <kbd>Esc</kbd> to close.',
            },
            {
                q: 'How do I jump between Profile sections?',
                a: 'Click any item in the left rail, or press <kbd>1</kbd>–<kbd>6</kbd> while the Profile is open: 1 Overview, 2 Focus, 3 Tasks, 4 Sounds, 5 Time, 6 Insights.',
            },
            {
                q: 'Do I need an account for the Profile?',
                a: "No. Profile works entirely from your local data and is available the moment you've finished one focus session. Signing in lets the same data follow you to other devices once cloud sync ships in the next release.",
            },

            // ── Overview section ──────────────────────────────────────────
            {
                q: "What's in the Overview section?",
                a: 'A quick read on your account.<br><strong>Hours focused</strong> — total time spent in focus sessions, all-time.<br><strong>Sessions</strong> — total number of focus sessions started.<br><strong>Last 7 days</strong> — total minutes focused in the trailing week.<br><strong>Avg quality</strong> — average focus-quality score (0–100) across all your sessions.<br>Below the numbers: a 30-day daily-focus line chart, and a 60-day calendar grid where each square is one day, brighter = more focused, today is the bottom-right square.',
            },
            {
                q: 'What is "focus quality"?',
                a: 'A 0–100 score the app computes for every session. The formula (in <code>focusQualityScore()</code>) adds: up to 50 points for proportion of target duration completed, +15 for finishing the full target, up to +15 for completing tasks (8 per task, capped), and subtracts up to 35 for distractions (3 per tab-away plus a tab-away-time penalty). Higher = longer, finished, productive sessions with few distractions.',
            },
            {
                q: 'Can I click a day on the 60-day grid?',
                a: 'Yes. Tap any square to jump into a full breakdown of that single day — minutes focused, sessions started/finished, tasks done, tab-switches, average quality, plus a timeline strip showing when each session ran. The same click works on the 90-day calendar (Focus section) and the 365-day calendar (Time section).',
            },

            // ── Focus section ─────────────────────────────────────────────
            {
                q: "What's in the Focus section?",
                a: "Deep stats on your focus sessions.<br><strong>Total time</strong> · <strong>Sessions</strong> · <strong>Avg duration</strong> · <strong>Completion %</strong> at the top.<br>Then a 90-day daily-minutes line chart with a regression trend line, a histogram + smooth curve of your typical session length, a 7-day moving average, a 90-day calendar heatmap, and three callout pills (this week vs last week, today vs your normal, today's percentile rank).",
            },
            {
                q: 'What does "avg duration" mean?',
                a: "The mean number of minutes per session across every focus session you've finished. A common pattern: someone with a 25-minute target may have an avg duration of 18 because some sessions get cut short.",
            },
            {
                q: 'What is the trend line on the daily-minutes chart?',
                a: "A linear regression fit through the last 90 days of daily focus minutes. A line going up = you're focusing more over time; flat = no clear direction; down = trending the other way. The subtitle text underneath says how much per week and how clear the pattern is.",
            },
            {
                q: 'What is the smooth curve on the duration histogram?',
                a: 'A Gaussian kernel density estimate (KDE). Bars show counts in 10 equal-width bins; the curve smooths over bin boundaries to show the true shape of your session-length distribution. If the curve has two peaks, you have two different "modes" of working (e.g. quick 25-minute sessions plus longer 50-minute deep-work blocks).',
            },
            {
                q: 'What is the 7-day moving average?',
                a: "For each day, the average of that day plus the 6 days before. Short-term spikes wash out; the underlying drift becomes obvious. Use it when day-to-day numbers are noisy and you want to see whether you're actually moving forward.",
            },

            // ── Tasks section ─────────────────────────────────────────────
            {
                q: "What's in the Tasks section?",
                a: 'When you actually get tasks done.<br><strong>Tasks done</strong> · <strong>Avg per session</strong> · <strong>Tasks per hour</strong> · <strong>Sessions w/ tasks (%)</strong> at the top.<br>Then a 30-day per-day chart, a by-day-of-week bar chart, a by-hour bar chart, and an efficiency callout. Lets you spot the weekday and time of day you actually finish work.',
            },
            {
                q: 'What does "tasks per hour" mean?',
                a: 'Total tasks completed across all your history divided by total focused hours. A rough proxy for throughput. Most people land around 1–3 tasks per hour. The unit is tasks per hour of focus, not per wall-clock hour.',
            },
            {
                q: 'What is the "sessions w/ tasks %" number?',
                a: "The percentage of focus sessions that had at least one task ticked off during them. Sessions with no tasks recorded aren't bad — sometimes you're just deep-thinking — but a low number can suggest you're not actively tracking what you do during focus blocks.",
            },

            // ── Sounds section ────────────────────────────────────────────
            {
                q: "What's in the Sounds section?",
                a: 'Which ambient sounds you use and whether they actually help.<br><strong>Unique sounds tried</strong> · <strong>Sessions with sound on (%)</strong> · <strong>Avg sounds per session</strong> · <strong>Your favourite</strong>.<br>A donut chart of your top 5 most-used sounds, plus a table showing how each sound shifts your average session length compared to sessions without it.',
            },
            {
                q: 'What does the "change" column mean in the sound effects table?',
                a: 'The percentage difference in average session length when that sound is on versus off. <strong>+15%</strong> means sessions with this sound on tend to run 15% longer than sessions without it. Negative numbers mean shorter.',
            },
            {
                q: 'What does the "strength" column mean (small/medium/large)?',
                a: "Cohen's d — a standardised effect size. It accounts for how much variation you have between sessions, not just the raw average. <em>Trivial</em> = noise. <em>Small</em> = real but subtle. <em>Medium</em> = noticeable. <em>Large</em> = sound clearly changes your session shape.",
            },

            // ── Time section ──────────────────────────────────────────────
            {
                q: "What's in the Time section?",
                a: 'When across the day and week you focus.<br><strong>Peak hour</strong> · <strong>Peak day</strong> · <strong>Span (days)</strong> · <strong>Time-of-day character</strong> at the top.<br>An hour-by-day heatmap (24 hours × 7 weekdays, brighter cells = more minutes focused), a polar best-hour curve, a by-day bar chart with a weekday/weekend split bar, and a 365-day calendar heatmap of your full year. The split bar now renders correctly even at extreme 100%/0% splits — earlier versions clipped the WEEKDAYS label off the left edge.',
            },
            {
                q: 'What is the "time-of-day character"?',
                a: "Whether you're a morning, afternoon, or evening person, based on which third of the day you spend the most minutes focusing. <strong>Morning</strong> = 5 AM up until noon. <strong>Afternoon</strong> = noon up until 6 PM. <strong>Evening</strong> = 6 PM right through to 5 AM (it absorbs the late-night and pre-dawn hours).",
            },
            {
                q: 'What is the polar best-hour curve?',
                a: "A ring chart showing 24 hours arranged like a clock face. The thicker / brighter a wedge, the more minutes you've focused at that hour across all your history. The peak wedge is your strongest hour.",
            },

            // ── Insights section overview ─────────────────────────────────
            {
                q: "What's in the Insights section?",
                a: "Up to 10 narrative cards derived from real machine-learning and statistics on your own data. Each card is a single sentence that tells you something concrete you couldn't get at a glance. The card surfaces the headline; <strong>tap any card</strong> to expand into a full breakdown — what the metric is, how it was computed, your actual numbers, and a caveat where one applies.",
            },
            {
                q: 'Why are some Insights cards missing for me?',
                a: "Each card has a sample-size requirement and a signal threshold. If you don't have enough sessions yet, or your data shows no real pattern, the card is hidden. Cards quietly appear over time as your history grows — a couple of weeks of regular use lights most of them up. We deliberately don't show cards that would require statistical hand-waving on thin data.",
            },
            {
                q: 'How do I open the full breakdown for an insight?',
                a: 'Tap the card, or focus it with <kbd>Tab</kbd> and press <kbd>Enter</kbd>. The grid swaps to a single-card detail view with sections like "What this is," "How we found it," "Your numbers," and "A note on this." Press <strong>‹ back to insights</strong> or hit <kbd>Esc</kbd> to return to the grid.',
            },

            // ── Per-insight: TREND ────────────────────────────────────────
            {
                q: 'What is the "Trend" insight?',
                a: 'Whether your daily focus minutes are going up or down over the last 30 days.<br><strong>How it works:</strong> we fit a straight line through your 30 most recent days using linear regression — the line that minimises the squared distance from every point to it. The slope of that line is how many minutes per day your focus is shifting. We multiply by 7 to get the per-week change.<br><strong>How sure we are:</strong> the R² ("fit quality," 0–1). 0.50+ = clear pattern. 0.25–0.50 = real but bumpy. 0.10–0.25 = weak signal. Under 0.10 = probably just noise. Surfaced when |slope| > 0.5 min/week.',
            },

            // ── Per-insight: CHANGE-POINT ─────────────────────────────────
            {
                q: 'What is the "Your pattern shifted" insight?',
                a: "A specific day your daily focus jumped or dropped to a different level — not a gradual slope, but a step-change in how much you typically focus per day.<br><strong>How it works:</strong> CUSUM (cumulative sum) walks forward through your daily totals from the last 60 days. It accumulates how far each day deviates from your baseline. When the running sum crosses a significance threshold, that's the day the pattern changed. More honest than splitting the window in half — that approach reports the same result whether your shift happened on day 3 or day 27. CUSUM finds the actual moment.<br><strong>What it doesn't say:</strong> why. Common causes: starting or finishing a project, vacation, schedule change, picking up a new tool. If the date matches something specific in your life, the pattern is real.",
            },

            // ── Per-insight: VS THE MONTH BEFORE ──────────────────────────
            {
                q: 'What is the "Vs the month before" insight?',
                a: 'How your average daily focus has changed comparing the last 30 days to the 30 days before that.<br><strong>How it works:</strong> we take the mean of your daily focus minutes for each 30-day stretch, then compute the percentage change from older to newer. Suppressed when the change is under ±5% (no signal) or when the change-point insight already explains the shift more precisely.',
            },

            // ── Per-insight: UNUSUAL DAY ──────────────────────────────────
            {
                q: 'What is the "Unusual day" insight?',
                a: "When today's focus minutes stand out from your last 30 days, OR when there have been one or more standout days in your last month.<br><strong>How it works:</strong> the z-score — how many standard deviations today is from your recent mean. Z ≥ 2 = top ~2.5% of recent days. Z ≥ 1.5 = notably above normal. Z ≤ −2 = bottom ~2.5%. We use leave-one-out: each day's z is computed against the *other* days, so a single big outlier can't inflate the distribution it's being measured against. Surfaced when |z| ≥ 1.5.",
            },

            // ── Per-insight: PATTERN FOUND (correlation) ──────────────────
            {
                q: 'What is the "Pattern found" insight?',
                a: "A relationship between two of your numbers — specifically, whether tab-switches inside a session correlate with that session's focus quality.<br><strong>How it works:</strong> Pearson correlation (r). Returns a value between −1 and +1. Negative r = when one goes up, the other goes down (the expected case for distractions vs quality). Positive r = both move together (the surprising case worth flagging). |r| ≥ 0.7 = very strong. ≥ 0.5 = strong. ≥ 0.3 = moderate. Under 0.2 = no insight surfaced.<br><strong>Caveat:</strong> correlation isn't causation. We see the pattern, but don't conclude that switching tabs <em>causes</em> lower quality.",
            },

            // ── Per-insight: TIME LOST ────────────────────────────────────
            {
                q: 'What is the "Time lost" insight?',
                a: "An estimate of focused time you've lost to context-switching during your sessions.<br><strong>How it works:</strong> the Page Visibility API tells us when you switch away from this tab during a focus session. Each tab-away costs about <strong>9.5 minutes</strong> of getting-back-into-it time — a conservative figure from research on attention recovery (some studies cite 23 minutes). Total time lost = tab-aways × 9.5. Surfaced once you have at least 5 tab-aways in your history.",
            },

            // ── Per-insight: FORECAST ─────────────────────────────────────
            {
                q: 'What is the "Forecast" insight?',
                a: "How much you'll focus over the next 30 days, based on your recent pattern.<br><strong>How it works:</strong> Holt-Winters additive seasonal exponential smoothing. The model tracks three things at once — your current daily level, whether it's drifting up or down, and which days of the week tend to be higher or lower than your typical day. Recent days get more weight than old ones, so the forecast adjusts as you keep going.<br><strong>Confidence band:</strong> the shaded area around the projection is one standard deviation of the in-sample residuals, widened by √h with horizon. Wider band = less certain prediction.<br><strong>Fallback:</strong> with under 14 days of history, we use a simpler trailing-7-day flat-line projection (no weekly rhythm modelling).",
            },

            // ── Per-insight: WORK PATTERNS ────────────────────────────────
            {
                q: 'What is the "Work patterns" insight?',
                a: 'A grouping of all your focus sessions into "types" — for example, "long, quiet sessions" or "scattered, interrupted sessions."<br><strong>How it works:</strong> k-means++ clustering. Each session becomes a 3-D point: (duration, focus quality, distractions). We try K = 2, 3, and 4, run each one 5 times with different random starts, and pick the K that produces the cleanest separation between groups (silhouette score). If no K produces meaningful separation (silhouette < 0.2), the insight is suppressed — the data simply has no clear groups.<br><strong>What you see:</strong> a small scatter where every session is a coloured dot, with the centre of each cluster drawn as a larger circle. Each cluster gets a plain-English label and description in the detail view.',
            },

            // ── Per-insight: WHAT HELPS YOU FINISH ────────────────────────
            {
                q: 'What is the "What helps you finish" insight?',
                a: "Which conditions (time of day, sound on, weekday, etc.) make you more or less likely to actually run a focus session to completion.<br><strong>How it works:</strong> for each named condition we compute P(complete | condition) — the percentage of sessions matching that condition that you finished. Then we divide by your overall completion rate to get the lift. A lift of 1.5× means you're 50% more likely to finish in that condition; 0.7× means 30% less likely.<br><strong>Sample-size guard:</strong> we need at least 10 sessions matching a condition before showing it. Below that, a 100%-of-3 fluke could dominate the ranked list with what's essentially coin-flip evidence.",
            },

            // ── Per-insight: STREAK PATTERN ───────────────────────────────
            {
                q: 'What is the "Streak pattern" insight?',
                a: 'Whether one finished or cut-short session predicts the next.<br><strong>How it works:</strong> a 2-state Markov chain over your sessions in chronological order. We count every back-to-back pair and compute four conditional probabilities — P(finish | finish), P(cut | finish), P(finish | cut), P(cut | cut). Then we compare each to its baseline rate (your overall finish rate). A cut-streak lift of 1.5× means after a cut-short session, you cut the next one 50% more often than baseline.<br><strong>Why this beats the completion-rate KPI:</strong> the overall percentage hides whether bad sessions cluster. Knowing that one cut predicts another is much more actionable — it tells you to be careful about the *next* session, not just to "finish more."',
            },

            // ── Per-insight: FINISH RATE / COMPLETION ─────────────────────
            {
                q: 'What is the "Finish rate" insight?',
                a: 'The percentage of focus sessions you start that you actually run all the way to the target time. <strong>Finished</strong> means you ran the full target duration (e.g. all 25 minutes of a 25-minute session). <strong>Cut short</strong> means you stopped, reset, or skipped before time was up. The detail view also breaks completion down by day of week and shows your last 8 sessions with their statuses.',
            },

            // ── About the data and ML ─────────────────────────────────────
            {
                q: 'How accurate are these insights with very few sessions?',
                a: "Each insight has a hard sample-size threshold below which it's suppressed entirely. The trend card needs daily data over 30 days; correlation needs 8+ sessions; clustering needs 12+; lift conditions need 10+ matching the condition; the change-point insight needs at least 14 days of history. We'd rather hide a card than show you something that's mostly noise.",
            },
            {
                q: 'Where can I see the actual data behind an insight?',
                a: 'Tap the card. The detail view always includes a "Your numbers" or "What we found" block with the underlying values — averages, sample sizes, conditional probabilities, etc. Nothing is computed and hidden; if a card claims a pattern, the supporting numbers are visible to you.',
            },
            {
                q: 'Are my insights ever compared against other users?',
                a: 'No. Every metric, every threshold, every trend, every cluster is computed only against your own past behaviour. There\'s no anonymised peer benchmark, no "users like you," no leaderboard — and no plan for any of those. The Profile is a mirror for your own work, not a comparison surface.',
            },
            {
                q: 'How is "session quality" different from "completion"?',
                a: '<strong>Completion</strong> is binary — did you run the full duration or not. <strong>Quality</strong> is a 0–100 score that takes into account proportion-of-target completed, the completion bonus, the number of tasks ticked off during the session, and a distraction penalty (per tab-away plus tab-away seconds). A 50-minute session with zero tab-aways scores higher than a 25-minute session you finished but kept switching tabs in.',
            },
            {
                q: 'How does the click-into-day feature work?',
                a: 'Any day cell on the 60-day Overview grid, the 90-day Focus calendar, or the 365-day Time calendar is clickable. Tapping it opens a single-day breakdown: minutes focused, sessions started/finished, tasks done, tab-switches, average quality, plus a 24-hour timeline strip showing when each session ran (solid bands for finished, dashed for cut short). Comparison block measures the day against your overall daily mean and your typical day-of-week. Empty days get an honest "no focus sessions on this day" card. Press <strong>‹ back</strong> or <kbd>Esc</kbd> to return.',
            },
            {
                q: 'Why does the detail view sometimes show a "z-score" or "Pearson r" or "lift"?',
                a: 'We use real statistical methods rather than made-up scoring rules, and surface the raw numbers so a careful reader can verify the headline. Each detail block explains the term in plain English the first time it\'s used — z-score is "how many standard deviations from the mean," Pearson r is "how strongly two numbers move together (−1 to +1)," lift is "the ratio of one rate to the baseline rate." If you want the math, it\'s there; if you don\'t, the headline tells you everything that matters.',
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
                a: 'A real-time cinematic space rendering — a tilted accretion disk around a black hole, a golden nebula, a parallax starfield, drifting cosmic motes, shooting stars, god rays, and film grain. Currently rendered with Babylon.js on WebGL2; a WebGPU path exists in the codebase but is disabled while we wait for upstream fixes to a post-pipeline texture-format issue.',
            },
            {
                q: 'What themes are available?',
                a: 'The <strong>Black Hole</strong> theme is the only built-in scene at <strong>Settings → Scene → Theme</strong> today; two slots are tagged "Coming soon." Under the hood the scene is now plug-in-shaped — a theme registry in <code>js/graphics/scene/theme-registry.js</code> means future themes drop in without rewriting the scene manager. Layered <em>on top</em> of the 3D theme is the <strong>Streams</strong> group below it, where you can swap the canvas for a YouTube / SoundCloud livestream backdrop.',
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
                a: '<strong>Settings → Scene → Advanced → Depth of field</strong>. Optional focus blur — elements near the focal distance stay sharp, things in front/behind go soft. Off by default because it can make the scene feel softly out of focus rather than crisp. WebGL2 only — disabled when running on WebGPU.',
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
            {
                q: 'What are wellness reminders?',
                a: 'A separate <strong>Settings → Notifications → Wellness reminders</strong> group. Three toggles, all off by default. Each surfaces as a calm in-app toast (never a system notification) and only fires while a focus session is actively running — pausing, finishing, or switching to a break tab silences them. All three share a single toast slot, so simultaneous reminders queue instead of overlapping.',
            },
            {
                q: 'What is the 20-20-20 eye rest reminder?',
                a: '<strong>Settings → Notifications → Wellness reminders → 20-20-20 eye rest</strong> (default OFF). Every 20 minutes during a running focus session, a gentle toast: <em>👁 Eye rest — Look 20 ft away for 20 seconds</em>. The cadence is fixed at 20 minutes by definition (the 20-20-20 rule is the prescription).',
            },
            {
                q: 'What is the hydration reminder?',
                a: '<strong>Settings → Notifications → Wellness reminders → Hydration check-in</strong> (default OFF). When enabled, a slider appears for the interval (15–120 min, default 60). The toast: <em>💧 Hydration check — Take a sip of water</em>.',
            },
            {
                q: 'What is the posture reminder?',
                a: '<strong>Settings → Notifications → Wellness reminders → Posture check-in</strong> (default OFF). When enabled, a slider appears for the interval (15–120 min, default 45). The toast: <em>🧘 Posture check — Roll the shoulders, lengthen the spine</em>.',
            },
            {
                q: "Why don't I get wellness reminders during a break?",
                a: "By design. Breaks are when you're supposed to be away from the screen anyway, so chiming you with another reminder during a break would defeat the point. The reminders auto-mute on focus-pause, focus-end, focus-reset, and any break.",
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
                a: 'The <strong>stats bar</strong> sits directly under the timer controls on the Focus tab. A period toggle on the left cycles <em>TODAY → THIS WEEK → THIS MONTH → ALL-TIME</em>; the chips next to it switch their copy to match. Live chips include <strong>sessions</strong>, <strong>focused</strong> (with a goal ring when a daily target is set), <strong>tasks done</strong>, <strong>day streak</strong> (with an optional 🎯 target-hit badge), and the <strong>momentum trail</strong> — seven dots showing the past seven days at a glance.',
            },
            {
                q: 'What does each stat track?',
                a: '<strong>Sessions</strong> — focus sessions completed in the active period.<br><strong>Focused</strong> — total focus time in that period; formatted h/m/s. The gold ring around it fills clockwise as you approach <em>Settings → Timer → Goals → Daily focus goal</em>.<br><strong>Tasks done</strong> — tasks completed in that period.<br><strong>Day streak</strong> — consecutive calendar days with at least one finished focus session. Once <code>currentStreak</code> reaches your <em>Streak target</em>, a 🎯 chip lights up beside it.<br><strong>Momentum</strong> — seven dots, oldest on the left, today on the right. Each dot brightens with the number of focus sessions you completed that day, normalised against your recent peak.',
            },
            {
                q: 'How do I switch between today / week / month / all-time?',
                a: 'Click the <strong>TODAY</strong> pill on the far left of the stats bar. It cycles through TODAY → THIS WEEK → THIS MONTH → ALL-TIME and back. The chips re-render with the matching numbers and the chip suffix copy ("focused" / "sessions") stays consistent.',
            },
            {
                q: 'How does the momentum trail work?',
                a: "Each dot represents one day. The rightmost is today; the leftmost is six days ago. The more focus sessions you completed on a given day, the brighter that day's dot. Brightness is normalised against your own recent peak (with a soft floor so a single session still reads as clearly lit) and a faint baseline so empty days never disappear entirely. Replaces the old guilt-shaped streak counter that reset to zero on a missed day — the trail tells you the same story without punishing you for taking a break. (The classic streak counter still appears as its own chip; momentum is the trailing visual.)",
            },
            {
                q: 'What does the goal ring around "focused" mean?',
                a: 'A thin gold ring drawn behind the focused-time chip. It fills clockwise as today\'s minutes approach <em>Settings → Timer → Goals → Daily focus goal</em>. When you reach 100%, the ring fully lights up. Setting the goal to 0 hides the ring. The accessible label reads "N% of daily focus goal" so screen readers report progress.',
            },
            {
                q: 'Can I export my stats?',
                a: 'Yes. <strong>Settings → Data & About → Export → Stats (CSV)</strong>. The file is a small two-column "metric, value" table with these rows: <code>sessionsToday</code>, <code>totalFocusSeconds</code>, <code>tasksCompletedToday</code>, <code>currentStreak</code>, <code>lastFocusDate</code>.',
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
                a: '<table class="hc-shortcut-table"><tr><td><kbd>Space</kbd></td><td>Start / pause timer</td></tr><tr><td><kbd>R</kbd></td><td>Reset timer</td></tr><tr><td><kbd>1</kbd></td><td>Switch to Home</td></tr><tr><td><kbd>2</kbd></td><td>Switch to Focus</td></tr><tr><td><kbd>3</kbd></td><td>Open the sound library</td></tr><tr><td><kbd>/</kbd></td><td>Focus the task input (auto-switches to Focus and expands the dock if needed)</td></tr><tr><td><kbd>?</kbd></td><td>Open this Help Center</td></tr><tr><td><kbd>i</kbd></td><td>Open the Profile</td></tr><tr><td><kbd>n</kbd></td><td>Open the Notepad</td></tr><tr><td><kbd>Alt</kbd>+<kbd>L</kbd></td><td>Open the cosmos accessible mixer (flat keyboard surface for the sound bodies)</td></tr><tr><td><kbd>Esc</kbd></td><td>Close any modal / panel</td></tr></table>',
            },
            {
                q: 'Can I rebind shortcuts?',
                a: "Yes — for the seven shortcuts listed under <strong>Settings → Shortcuts → Keyboard</strong> (Space, R, 1, 2, 3, /, ?). Click any row, then press the key you want to assign. Click the same row again or press <kbd>Esc</kbd> to cancel. <kbd>Esc</kbd> itself can't be rebound — it's the universal escape hatch. The <kbd>i</kbd> (Profile), <kbd>n</kbd> (Notepad), and <kbd>Alt</kbd>+<kbd>L</kbd> (cosmos accessible mixer) shortcuts are wired directly into their owning modules and aren't user-rebindable.",
            },
            {
                q: "Shortcuts don't work while I'm typing — is that a bug?",
                a: "No, by design. Shortcuts are disabled when you're focused on a text input (task field, search box, settings inputs, feedback textarea, notepad editor) so your keystrokes go into the field. Press <kbd>Esc</kbd> to unfocus first. Many module-owned shortcuts (i, n) also self-suppress when another modal is open so they don't fight for keystrokes.",
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
                a: "<strong>Settings → Presets → Focus presets</strong>. Type a name into the input field at the bottom of the list, then click <strong>Create from current</strong>. Whatever your current Settings look like becomes the new preset's snapshot.",
            },
            {
                q: 'How do I switch presets?',
                a: 'In the same <strong>Settings → Presets</strong> panel, click any preset name to activate it. The active preset is highlighted.',
            },
            {
                q: 'Can I update or delete a preset?',
                a: 'Each non-default preset row has a <strong>save</strong> button (overwrites the snapshot with your current Settings) and a <strong>✕</strong> button (deletes it). There is no inline rename today — to rename a preset, recreate it under a new name and delete the old one. The built-in "Default" preset can\'t be deleted; it\'s your safe fallback.',
            },
            {
                q: 'Difference between focus presets and constellations?',
                a: "<strong>Focus preset</strong> = snapshot of <em>all</em> Settings (timer, scene, sounds, notifications, wellness, gamification, …). <strong>Constellation</strong> = just the active sounds plus each body's orbital position, volume, EQ, and pan. They're orthogonal — you can pair any preset with any constellation.",
            },
            {
                q: 'Difference between cycle preset and focus preset?',
                a: '<strong>Cycle preset</strong> (<em>Settings → Timer → Cycle preset → Style</em>) is a quick switch between common Pomodoro rhythms — Pomodoro / Long Pomodoro / 52-17 / 90-20 / Deep work / Open-ended / Custom. It only rewrites the focus + short-break + long-break duration sliders.<br><strong>Focus preset</strong> is a much wider snapshot — every settings key, including scene quality, sound behaviour, and goals. You typically pick a cycle preset to set the rhythm, then layer that into a focus preset that also bundles the scene + sound mood.',
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
                a: 'Click <strong>Settings → Feedback</strong>. Pick <strong>Bug report</strong> or <strong>Feature request</strong> at the top, type your message, then click <strong>Send report</strong> (for bugs) or <strong>Send request</strong> (for features). Your mail client opens with the subject and body pre-filled. Or click <strong>Copy as email</strong> to put the whole thing on your clipboard.',
            },
            {
                q: 'What information gets sent along with my feedback?',
                a: "Only auto-collected technical context that helps reproduce what you're describing: app version, timestamp, the URL you were on, browser user-agent string, platform, language, viewport size and pixel ratio, and the GPU renderer + vendor (if your browser exposes them via the WEBGL_debug_renderer_info extension). Nothing identifying or personal. You can see the exact content in the copied email.",
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
                a: '<strong>Settings → Data & About → Greeting</strong>. Type whatever you want, up to 80 characters. Use <code>{{time}}</code> as a placeholder — it becomes "morning", "afternoon", "evening", or "night" based on the current hour.',
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
                a: 'Walks every settings key in the schema and restores its default — Scene (including streams), Timer (including goals + gamification), Sounds, Notifications (including wellness reminders), Shortcuts (including the Motion sub-group), Greeting, and the rest of Data & About. Does NOT touch tasks, statistics, notes, saved focus presets, or saved constellations — those live in separate localStorage keys.',
            },
            {
                q: 'What does "Clear all data" do?',
                a: 'The nuclear option. Wipes <strong>everything</strong> — settings, presets, statistics, tasks, notes, saved constellations. Page reloads fresh. Requires double-confirmation.',
            },
            {
                q: 'What is the gold dot next to a setting label?',
                a: 'That setting has been changed from its default value. It pulses to draw attention. Resetting the section clears all dots.',
            },
            {
                q: 'Is my data private?',
                a: "Yes. Productivity data — settings, tasks, statistics, notes, saved constellations, focus presets — lives in your browser's <code>localStorage</code> and never leaves it today; the optional account stores only identity (email, display name, unique handle) in a Postgres database protected by row-level security. There are no analytics about you personally, no leaderboards, no anonymised peer benchmarks. Ambient sound files are fetched from our CDN (Cloudflare R2). The 3D library (Babylon.js) is loaded once from a CDN. YouTube / SoundCloud stream backdrops, when enabled, embed third-party iframes — those services log their own embed views per their own privacy policies. None of these third parties receive identifying information from us.",
            },
            {
                q: 'Where can I read the privacy policy and terms?',
                a: '<strong>Settings → Data & About → Legal → Privacy Policy / Terms of Service</strong>. They open in a new tab.',
            },
            {
                q: 'What does the About section show?',
                a: 'Under <strong>Settings → Data & About → About</strong>: app version, detected GPU tier (used by the "Auto" quality preset), the render engine label (currently always "WebGL" — see the Scene & Visuals category for why WebGPU is paused), a live FPS readout that ticks every 800 ms while the panel is open, and your browser name. Useful when filing a bug report or verifying performance tier.',
            },
        ],
    },
];
