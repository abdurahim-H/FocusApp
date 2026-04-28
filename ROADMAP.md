# Cosmic Focus — Roadmap

The full feature backlog. Cross items off as they ship.

**Legend.**
`[ ]` open · `[x]` shipped · `[~]` in progress · `[-]` cancelled / superseded.
**S/M/L/XL** = approximate effort: S < 1 day, M = 1–3 days, L = 1–2 weeks, XL = 2+ weeks.
**(blocks: X)** means *X depends on this landing first*.
**(after: Y)** means *do not start until Y is done*.

The ordering inside each wave is the order I'd ship in. Waves can run in parallel where the dependencies allow.

This roadmap is deliberately maximal — every feature I think belongs in a "best-in-the-world" focus / productivity / ambient app is on this list. Nothing is held back. Some items are ambitious, some are R&D, some require third-party developer accounts and approvals; that's all surfaced honestly in the notes.

---

## Wave 0 — Bug fixes and quick wins (week 1)

These are real bugs the audits caught. Cheap, high-value, ship first.

- [x] **0.1 Fix dead-code constellation menu (S).** Wired pin-star + ⋯ menu onto `libcard--constellation` in the actual library drawer. Pin auto-enables `sounds.autoStartOnFocus`; menu opens the existing rename / share / delete popover. Built-ins get share-only.
- [x] **0.2 Wire the legacy `mode.ambient` shortcut (S).** Repurposed as `library.open` — the `3` key now opens the sound library drawer. Legacy `storeKey` preserved so users who rebound it keep their custom binding.
- [x] **0.3 Fix mini-timer click target (S).** Removed the dead `.hmt-ring` reference in `home-mini-timer.js`; `.hmt-body` is the documented click target and it already worked, just left an orphan `if (el)` guard hiding the issue.
- [x] **0.4 Single source of truth for APP_VERSION (S).** New `js/core/version.js` exports `APP_VERSION`; `feedback.js` and `settings/data-io.js` both import from it. Now matches `package.json` (1.0.0).
- [x] **0.5 Wire the unused chart primitives (S).** `kpi()` accepts an optional `trend` array → renders a sparkline beneath the number. Wired on Overview's "hours focused" + "last 7 days" KPIs. `percentileGauge` is a new chart card on Profile → Focus showing today's percentile against the trailing 90-day window.

---

## Wave 1 — Surface-level analytics polish (week 1–2)

Already-have data, brand-new framing. Highest UX gain per dollar of engineering on this list.

- [x] **1.1 Weekly summary tile on Home (M).** New `home-period-tiles.js` paints this week's total + Mon-Sun mini-bars + "↑ N% vs last week" delta. Tap opens Profile → Focus. Hidden until at least one finished focus session.
- [x] **1.2 Monthly summary tile on Home (M).** Sibling tile in the same row showing 30-day total, prior 30-day delta, sessions / active days / best-day stats. Tap opens Profile → Time.
- [x] **1.3 Year-in-review surface in Profile → Time (M).** New `renderYearInReview()` renders a retrospective card at the bottom of the Time section: total hours / sessions / active days, monthly bar strip with peak month called out, "Longest day / Peak hour / Best month" highlight tiles. Hidden until ≥30 active days this calendar year.
- [x] **1.4 Current-streak chip in stats bar (S).** New `.stat-chip--streak` chip wired to the existing `currentStreak` signal.
- [x] **1.5 Period toggle in stats bar (M).** New `.stat-period-toggle` pill at the leading edge cycles today → week → month → all-time on click. The "sessions / focused / tasks done" chips recompute on each cycle (data sourced from the full session history for non-today periods). Period persists in `localStorage` (`fu_stats_period`). Each period gets a tinted toggle (today amber / week green / month violet / all cream).
- [x] **1.6 Daily goal ring (M).** New `timer.dailyGoalMinutes` setting (0-480, default 90) + matching `timer.weeklyGoalMinutes` (0-3600, default 720). The "focused" chip in the stats bar now wraps a progress ring that fills clockwise as today's minutes approach the daily goal. Ring goes green when complete.
- [x] **1.7 Weekday vs weekend distribution chart (S).** Two-segment split bar in Profile → Time computed from the existing `bucketByDayOfWeek` data.
- [x] **1.8 Box-plot chart for session durations (M).** New `boxPlot()` chart primitive in `charts.js` (Tukey-fence outlier detection, Type-7 quartile interpolation). Rendered in Profile → Focus under the histogram. Suppressed below 4 sessions where quartiles aren't meaningful.
- [x] **1.9 "This week vs last week" daily breakdown (M).** Inline `renderWeekOverWeekChart()` in `profile.js` paints paired bars per weekday (this week filled, last week outlined) with today's weekday-label highlighted. Suppressed below 14 days of history.
- [x] **1.10 "Best day ever" + "longest streak ever" callouts in Profile → Overview (S).** New `computeAllTimeRecords()` walks the full session history once and surfaces three callout pills: best day ever (minutes + date), longest streak ever, current streak.

---

## Wave 2 — Tasks v2 (week 2–3)

Tasks today are `{ id, text, completed }` and are session-scoped (they don't carry across reloads). This is the single biggest UX bug in the app.

- [x] **2.1 Persist tasks across sessions (M).** Already shipped — `state.js:175-193` auto-persists the `tasks` signal to `fu_state_v1`; tasks survive reloads. The audit's "session-scoped" note was inaccurate. Marked done as-is.
- [x] **2.2 Estimated duration field per task (M).** New `estimatedPomodoros` field on each task (0–20). Inline +/− stepper on every row; visible on hover/focus, always visible once an estimate exists. New `setTaskEstimate(id, n)` mutation.
- [x] **2.3 Time spent field, auto-tracked (M).** `addSpentSeconds(id, sec)` lives in `tasks.js`; `timer.js` calls it from `completeSession()` whenever an active task is pinned. Increments `spentSeconds` and `completedInSession` on the right task. The session ends → the badge updates live.
- [x] **2.4 ETA pill on the Tasks card header (M).** New `.tasks-eta` pill renders next to "Tasks for this session". Sums remaining pomodoros across incomplete estimated tasks (estimate − spent), converts to minutes, projects an arrival time on the wall clock. Respects `timer.timeFormat` (12h / 24h). Hidden when nothing is estimated.
- [x] **2.5 Due dates with overdue styling (M).** New `dueAt` field + `setTaskDueDate()` mutation. Each row gets a small 📅 affordance that opens a native date picker on click; the underlying `<input type="date">` is overlaid invisibly on the icon. Inline pill in the task content surfaces the relative date — "due today", "due tomorrow", "due in 3 days", "overdue 2 days" — tone-coded red / amber / honey / muted. (Auto-sort overdue-to-top is left for a future PR; for now they sort by hand-order alongside drag-reorder.)
- [x] **2.6 Subtasks (one level deep) (M).** New `subtasks: [{id, text, completed}]` field on the task model. Each parent row gains a chevron toggle that reveals an indented drawer with the subtask list and an inline "+ Add subtask" form. Subtasks toggle / delete with their own buttons. Parent row shows a "2/5" counter chip when subtasks exist. New mutations: `addSubtask`, `toggleSubtask`, `deleteSubtask`.
- [x] **2.7 Drag-to-reorder (M).** HTML5 native drag handle (⋮⋮) at the leading edge of every task row. New `moveTask(from, to)` mutation reorders the array; the persisted signal carries the new order across reloads. Dragging-over a task row gets a champagne underline so the drop target is unmistakable. Home list complete; the expand panel still uses the same data signal so its order updates live too — its handle wiring lands with the next pass.
- [x] **2.8 Recurring tasks (M).** New `repeat: 'daily' | 'weekdays' | 'weekly' | null` field on the task model + `setTaskRecurrence()`. The detail drawer hosts the editor (radio-style 4-button group). `resetExpiredRecurringTasks()` runs at init, on `visibilitychange`, and every 60 s — flips completed recurring tasks back to uncompleted (and resets their subtasks) when the local-day boundary has rolled over and the cycle applies. Daily resets every day, weekdays skips Sat/Sun, weekly waits for 7+ days since completion. Each row gets a small ↻ chip when recurrence is set. Custom RRULE is intentionally not in scope — covers the 95% case.
- [x] **2.9 Project / tag grouping (M done; L deferred).** Data side complete (`project` field on task model, `setTaskProject()`, inline `#project` chip on every row). The editor input lives in the new task detail drawer (2.11). The per-project view in **Profile → Tasks** and a list-level filter are deferred to a follow-up — neither blocks the rest of Wave 3.
- [x] **2.10 Bulk operations (S).** New `clearCompletedTasks()` + a "Clear completed" button next to "Clear All" (only visible when at least one task is checked off). Also `setAllTasksDone(true|false)` exported for future "mark-all" UI affordances.
- [x] **2.11 Task detail surface (M).** New `js/ui/task-detail.js` + `css/components/modules/22-task-detail.css`. A small `›` button on each row opens the drawer (lazy-loaded). Drawer hosts: editable text, estimate stepper, due-date picker with clear-button, project tag editor, recurrence radio group, subtask list + add form, time-on-this-task block (total focused / sessions touched / % of estimate), created / completed timestamps, and a two-step delete confirm. Drops down with the same animation pattern as Settings / Help / Profile.
- [x] **2.12 Pomodoro-count badge per task (S).** Small "spent / estimated" pill rendered next to the task text whenever either side has data. No estimate yet but pomodoros logged → "N 🍅" badge.
- [x] **2.13 Carry-over rollover (S).** Reframed as "stale-task banner". When the user has incomplete non-recurring tasks created more than 24 h ago, a small banner above the task list announces "N tasks open longer than a day" with two actions: **Keep** (bumps each stale task's `createdAt` forward to "now" and dismisses the banner for today) or **Clear stale** (deletes them outright). Dismissal flag lives in `localStorage` keyed to `today's local date` so the banner re-arms each day. Recurring tasks are exempt — they have their own reset cycle.
- [x] **2.14 Focus-on-this-task lock (M).** New `activeTaskId` signal (persisted across reloads). Each task row gains a `◎` lock pin: click to pin / unpin. The pinned row gains a left amber rail; the next focus session that completes credits its elapsed seconds to the pinned task via `addSpentSeconds()`. Pin survives reloads. Pin is automatically cleared if the active task gets deleted between session start and end. (Timer-body label override + session-record link land later.)

---

## Wave 3 — Notepad and writing surface (week 3–4)

A first-class place to write. Markdown-aware, sync-ready, AI-assisted.

- [ ] **3.1 Notepad panel (M).** New drop-down panel reachable from a toolbar button and via `n` shortcut. Mirror the Help Center / Profile / Settings drop pattern.
- [ ] **3.2 Tiptap rich-markdown editor (L).** Bold / italic / headings / lists / code / quotes / links. Live keyboard shortcuts (`Cmd+B` etc.) without buttons cluttering the surface.
- [ ] **3.3 Word + character count + reading time (S).** Footer status bar in the notepad.
- [ ] **3.4 Multiple notes with a sidebar (M).** Note list, search, "+ new note" button. Default note "Daily — YYYY-MM-DD" auto-created on first write each day.
- [ ] **3.5 Auto-save with debounce (S).** 800 ms debounce, visible "saved" indicator.
- [ ] **3.6 Tags + cross-linking (M).** `#tag` for tags, `[[note title]]` for cross-links (Obsidian-style). Sidebar can filter by tag.
- [ ] **3.7 Full-text search (M).** Across all notes. Modifier keys to constrain search ("tag:work"). Indexed locally.
- [ ] **3.8 Voice dictation via Web Speech API (M).** Free; works in Chrome / Safari. Microphone button in the notepad toolbar.
- [ ] **3.9 Pomodoro auto-prepend hook (S).** Optional setting: when a focus session starts, prepend "## 9:42 AM — focus session 1" to today's daily note.
- [ ] **3.10 AI session summary at end of focus block (M).** LLM (Cloudflare Workers AI, free at our volume) reads what you wrote during the session and emits a 2-sentence recap. Recap appended to the daily note.
- [ ] **3.11 Export — Markdown / HTML / PDF (M).** Per-note and bulk.
- [ ] **3.12 Templates (S).** Daily-note template, weekly-review template, meeting-notes template. Configurable in Settings.

---

## Wave 4 — Theme registry + first 8 themes (week 4–7)

The biggest visual upgrade in the app. Required scaffolding for Wave 5 (YouTube themes) and Wave 11 (user-uploaded themes).

- [ ] **4.1 Theme registry architecture (L).** Refactor `scene-manager.js` to take an explicit theme object: `{ id, label, modules: [...], palette, postfx }`. Each scene module exposes `init / update / dispose`. `setTheme(id)` tears down old, brings up new.
- [ ] **4.2 Theme: Black Hole (existing) registered as theme #1 (S).** No visible change; just registered through the new system. (after 4.1)
- [ ] **4.3 Theme: Cosmic Garden (L).** Reuses `ethereal-petals.js` (already in codebase, currently unused). Greener nebula palette, soft blue-green motes, drifting petals.
- [ ] **4.4 Theme: Liminal Library (XL).** Drifting dust shader, soft warm side-lighting, fireplace-flicker post-effect, slowly falling particles. New shader work.
- [ ] **4.5 Theme: Storm Window (XL).** Rain-streaked plane in front of a calm cityscape, occasional lightning flash, raindrops audio-reactive to the master volume. New shader work.
- [ ] **4.6 Theme: Aurora Plain (XL).** Green / violet aurora curtains, low horizon, slow camera pan, distant snow particles. New shader work.
- [ ] **4.7 Theme: Ocean Depth (XL).** Underwater scene, kelp swaying, light shafts cutting through water, slow drift. New shader work.
- [ ] **4.8 Theme: Sakura Garden (L).** Warm pink-and-cream palette, drifting cherry-blossom petals (reusable from 4.3), distant temple silhouette.
- [ ] **4.9 Theme: Nordic Cabin (L).** Warm interior, small window with snow falling outside, fireplace, orange-and-amber palette.
- [ ] **4.10 Time-of-day palette interpolation (M).** All themes get a sunrise / midday / golden-hour / dusk / midnight palette ramp that interpolates from the system clock.
- [ ] **4.11 Seasonal modifier (M).** Spring / summer / autumn / winter overlays on every theme — petal type, snow density, leaf colour. Auto-detects from date or manually overridable.
- [ ] **4.12 Weather-reactive modifier (M).** Pull live weather from OpenWeatherMap (free tier) for the user's city. When it's raining outside, the scene has rain. Opt-in.
- [ ] **4.13 Generative theme (XL).** Each user gets a unique procedural-galaxy seed; their universe is mathematically theirs. New seed available via "regenerate" button.

---

## Wave 5 — YouTube and SoundCloud video / audio backgrounds (week 7)

Massively-requested competitor feature (Lofi Girl-style). Blocked on the theme registry.

- [ ] **5.1 CSP relaxation (S).** Add `frame-src https://www.youtube.com https://www.youtube-nocookie.com https://w.soundcloud.com` to `public/_headers`. Test in production. (after 4.1)
- [ ] **5.2 YouTube IFrame Player API integration (M).** New theme type `youtube`. Iframe embedded as scene background, behind the focus card. Mute / unmute via the API.
- [ ] **5.3 SoundCloud Widget integration (M).** Same shape as YouTube. Different theme type `soundcloud`.
- [ ] **5.4 Curated starter playlist (S).** Lofi Girl, Lofi Cafe, Jazz Cafe, Chillhop, Ambient Sleep — ~12 hand-picked YouTube live-streams.
- [ ] **5.5 Paste-your-own URL (S).** Settings → Scene → Streams → "Paste a YouTube or SoundCloud URL." Validates and saves to user-themes.
- [ ] **5.6 Stream + ambient mixing (M).** When a YouTube theme is active, ambient sounds in our cosmos default to muted; per-toggle to layer them anyway.

---

## Wave 6 — Soundscapes (week 8–10)

Longer-form curated audio. Endel / Brain.fm category. Both static-file and procedural paths.

- [ ] **6.1 Soundscape content type in SOUND_LIBRARY (S).** New `type: 'soundscape'`. Different shader for the cosmos body (richer, slower-pulsing).
- [ ] **6.2 First 10 hand-produced soundscapes (XL — audio production).** Commission a sound designer (~$5K total) or curate from royalty-free libraries (Freesound, ZapSplat). Examples: "Rainy Library 45 min", "Forest Dawn 60 min", "Deep Work 25 min Pomodoro", "Sleep Wind-down 30 min", "Morning Energy 25 min".
- [ ] **6.3 Procedural soundscape composer (XL — engineering).** A JSON-driven scheduler. Each soundscape = `{ duration, layers: [...], automation: [{ layer, param, keyframes: [[t, v], ...] }] }`. Plays alongside the existing audio graph; layers fade in/out per the timeline.
- [ ] **6.4 Procedural soundscape: Forest Dawn (M).** First procedural soundscape using the engine — birds, brook, distant thunder layers automated over 60 min.
- [ ] **6.5 Procedural soundscape: Coffee Shop (M).** Cafe + light rain + occasional door-bell ring — automated over 45 min.
- [ ] **6.6 Procedural soundscape: Mountain Storm (M).** Wind + rain + thunder layers escalating then releasing.
- [ ] **6.7 Binaural / isochronic tone layer (M).** Opt-in. Alpha (8–12 Hz) for relaxed focus, beta (12–30 Hz) for energy, theta (4–8 Hz) for deep flow. Layered under a soundscape via a separate audio bus. Real research backing.
- [ ] **6.8 AI-personalised soundscape (XL — R&D).** Read the user's focus quality data and generate a soundscape tuned to when they focus best. Cloudflare Workers AI for the LLM, the existing procedural engine for the audio.
- [ ] **6.9 Soundscape sleep-timer integration (S).** Soundscapes automatically respect the existing sleep-timer fade-out.
- [ ] **6.10 Soundscape browser (M).** Library drawer gets a Soundscapes tab alongside Sounds and Constellations.

---

## Wave 7 — Distraction blocker browser extension (week 10–11)

Heavy-user pull feature (Forest, Cold Turkey, Freedom). A separate codebase but tightly coupled.

- [ ] **7.1 Manifest V3 Chrome extension (L).** Hard-blocks user-defined site lists during a focus session. Reads the timer state from the web app via a small messaging channel.
- [ ] **7.2 Firefox port (M).** Manifest V3 with WebExtensions polyfill.
- [ ] **7.3 Safari port (M).** Apple Developer account required ($99/yr). Different review timeline.
- [ ] **7.4 Default block-list (S).** Curated starter list (Reddit, Twitter, YouTube, Instagram, TikTok, Hacker News). User-editable.
- [ ] **7.5 "Allow during break" mode (S).** During a break session, sites unblock automatically.
- [ ] **7.6 Stats sync (M).** Extension reports blocked-attempt count back to the web app; visible as a "distractions blocked: 14" chip in the focus tab.
- [ ] **7.7 Hardcore mode (S).** Optional setting: blocks can't be undone until the session ends, even if the extension is disabled.
- [ ] **7.8 Cross-extension messaging protocol (M).** A small messaging bridge between the web app and any future extensions / apps so they share state cleanly.

---

## Wave 8 — Cross-device sync (week 12–14)

Currently identity + focus-session metadata sync. Tasks, settings, mixes, presets, notes are local-only.

- [ ] **8.1 Sync queue module (M).** A small `js/features/sync-queue.js` — best-effort cloud writes, retry on transient failure, durable local cache so offline still works.
- [ ] **8.2 Conflict policy decision + tests (M).** Last-write-wins by timestamp for most data; per-key merge for settings (so device A doesn't blast device B's preferences). Document policy.
- [ ] **8.3 Bootstrap on sign-in (M).** Pull cloud → merge with local → push merged. Visible "syncing…" / "synced just now" / "sync failed, retry" indicator on the satellite.
- [ ] **8.4 Tasks sync (`public.tasks` table + read/write paths) (M).** Schema, RLS policy, upsert RPC, full bootstrap. Includes new fields from Wave 2.
- [ ] **8.5 Settings sync (`public.settings_kv`) (M).** Per-key rows so granular merge works.
- [ ] **8.6 Ambient mixes sync (`public.ambient_mixes`) (M).** Mixes are JSON snapshots; serialize cleanly.
- [ ] **8.7 Focus presets sync (`public.focus_presets`) (M).** Same pattern as mixes.
- [ ] **8.8 Notes sync (`public.notes`) (M).** From Wave 3; per-note row.
- [ ] **8.9 Sign-out doesn't wipe local cache (S).** Different account on same browser = separate localStorage namespace per user-id.
- [ ] **8.10 Real-time updates via Supabase Realtime (M).** Optional: a task ticked off on the phone shows up on the desktop within seconds.
- [ ] **8.11 Offline-first reliability (M).** Service worker caches the app shell + last-known-good state. App opens offline; sync resumes when reconnected.
- [ ] **8.12 Migration tool (S).** One-time migration for existing local data when a user first signs in.

---

## Wave 9 — AI focus coach (week 13)

The Profile already has all the analytical primitives (clustering, change-point, lift, Markov). Missing piece: an LLM that turns numbers into copy.

- [ ] **9.1 Cloudflare Workers AI integration (M).** Free at our volume. Llama 3.1 70B is plenty for this. Prompt-engineer the digest.
- [ ] **9.2 Weekly digest email (M).** Sunday 8 PM in user's timezone. Uses focus data from the week. ~250-word personalised summary with one specific suggestion.
- [ ] **9.3 In-app weekly digest (S).** Same content, surfaced in Profile → Insights.
- [ ] **9.4 Daily reflection prompt (S).** Optional. End of last session of the day, ask "any reflections?" — saves to today's daily note.
- [ ] **9.5 Smart goal recommendations (M).** "You finished 42% of evening sessions vs 78% of morning ones; consider scheduling deep work before lunch."
- [ ] **9.6 Anomaly explanations (M).** When the change-point insight or anomaly insight fires, the AI generates a candidate explanation: "This dip lines up with your `vacation` calendar event."
- [ ] **9.7 Conversational coach (XL — R&D).** Chat surface. "Why am I struggling to focus this week?" — the AI uses the data to answer. Phase later.

---

## Wave 10 — Goals + habit tracking (week 14)

- [ ] **10.1 Weekly goal: target focus minutes (M).** Set a weekly hours target (default 12 hrs). Progress ring on the Home tab and on the weekly tile (1.1).
- [ ] **10.2 Streak goal (S).** Target N days in a row with at least one focus session.
- [ ] **10.3 Tasks-per-week goal (S).** Optional: target N tasks completed per week.
- [ ] **10.4 Per-day goal calibration (M).** Goal can be uniform (target/7 each day) or weekday-only or custom.
- [ ] **10.5 Push notifications when falling behind (M).** Web push (Wave 11). "It's Friday and you're 4 hrs short of your weekly goal." Configurable cadence.
- [ ] **10.6 Goal history + completion stats (M).** "You hit your weekly goal 38 of the last 52 weeks (73%)."
- [ ] **10.7 Habits beyond focus minutes (M).** Generic habit tracker: "stretch every day", "drink water 8x", with the same UI patterns. Configurable list.

---

## Wave 11 — Mobile / PWA (week 15–17)

Today the app is desktop-optimised. To compete we need full mobile.

- [ ] **11.1 PWA install banner (S).** Manifest tweak; "Add to Home Screen" works in browsers that support it.
- [ ] **11.2 Mobile-first responsive pass on Home (M).** Greeting, clock, tiles all stack cleanly under 480 px width.
- [ ] **11.3 Mobile-first responsive pass on Focus (M).** Timer, tasks, stats, mixer all work in a column on mobile.
- [ ] **11.4 Mobile-first responsive pass on Profile (L).** All charts re-flow; the rail collapses to a tab strip; day-detail and insight-detail panels go full-screen.
- [ ] **11.5 Mobile-first responsive pass on Help / Settings / Library drawer (M).** All drop-down panels become full-screen sheets on mobile.
- [ ] **11.6 Touch gestures (M).** Swipe to switch tabs; pull to refresh stats; long-press to open detail; pinch-to-zoom on charts.
- [ ] **11.7 Reduce motion respect on mobile (S).** Auto-detect `prefers-reduced-motion` and dial back the scene + transitions.
- [ ] **11.8 Web push notifications (M).** Session-end notifications, goal-falling-behind notifications. iOS 16.4+ supports it; Android always has.
- [ ] **11.9 Capacitor wrapper for iOS (L).** Same codebase, native shell, App Store presence. $99/yr Apple Developer account required.
- [ ] **11.10 Capacitor wrapper for Android (L).** $25 one-time Google Play Console fee.
- [ ] **11.11 iOS lockscreen widget (M).** Live Activity showing the timer countdown. iOS 16.1+.
- [ ] **11.12 Android lockscreen widget (M).** AppWidgetProvider showing timer + today's stats.
- [ ] **11.13 Apple Watch complication (M).** Shows current timer state on the watch face.
- [ ] **11.14 Wear OS complication (M).** Same on Wear OS watches.
- [ ] **11.15 iOS Focus / Shortcuts integration (M).** Siri Shortcut "Start a focus session"; iOS Focus mode auto-enables when a session starts.

---

## Wave 12 — Calendar integration (week 17–18)

- [ ] **12.1 Google Calendar OAuth (M).** Read-only by default; opt-in to write.
- [ ] **12.2 Calendar overlay on Home (M).** "Your next meeting is in 47 minutes — you can fit one Pomodoro." Shows next 3 events.
- [ ] **12.3 Calendar overlay on Focus (S).** Tiny "next meeting" pill near the timer.
- [ ] **12.4 Auto-mute notifications during meetings (S).** Optional. Detects calendar events and suppresses our break-end notifications.
- [ ] **12.5 Write completed sessions back as time-entries (M).** Phase 2; opt-in. "Focus session — Cosmic Focus" appears as a calendar event after each session.
- [ ] **12.6 iCal subscription URL support (M).** For Apple Calendar / Outlook / etc. without OAuth.
- [ ] **12.7 Time-blocking suggestions (M).** "You consistently focus best at 9–11 AM; want me to block that time daily?" Writes to calendar with consent.
- [ ] **12.8 Microsoft 365 / Outlook integration (M).** Microsoft Graph API. Same shape as Google.

---

## Wave 13 — External music services (week 18–22)

All four shipped. Heavy maintenance burden, real value.

- [ ] **13.1 Unified "now playing" UI (M).** One surface across all four services so the user never has to think about which they're on. Lives in the cosmos toolbar.
- [ ] **13.2 YouTube Music / general YouTube playback (M).** IFrame Player API; free; no auth. Playlist URL → plays.
- [ ] **13.3 SoundCloud (M).** Widget API. Free.
- [ ] **13.4 Spotify Web Playback SDK (XL).** Premium account required for users. OAuth (PKCE). Workers proxy for token refresh. ~2 weeks of work.
- [ ] **13.5 Spotify lyrics overlay (M).** Display synced lyrics under the now-playing chip. (after 13.4)
- [ ] **13.6 Spotify recommendations seeded by focus history (M).** "Tracks you focus best to" — uses the Spotify recommendations API. (after 13.4)
- [ ] **13.7 Apple Music MusicKit JS (XL).** Apple Developer account required ($99/yr). Signed Developer Token. ~1 week.
- [ ] **13.8 Tidal integration (L).** Tidal API. Smaller user base; audiophile-friendly.
- [ ] **13.9 Local file drag-and-drop (M).** Drag MP3 / FLAC / OGG into the cosmos toolbar; plays in the same audio graph as ambient.
- [ ] **13.10 Lock-screen / Bluetooth media controls work for all of the above (M).** Extend the existing Media Session API integration.
- [ ] **13.11 Music-source-of-truth fallback (S).** If a user signs out of Spotify, the now-playing UI gracefully degrades.

---

## Wave 14 — User-uploaded themes (week 22–24)

After theme registry (Wave 4) and sync (Wave 8).

- [ ] **14.1 Supabase Storage bucket `user-themes` (S).** With RLS so each user only writes/reads their own folder.
- [ ] **14.2 File-upload UI in Settings → Scene → My themes (M).** `<input type="file" accept="image/*,video/mp4">`. Client-side validation (≤5 MB image, ≤10 MB / 10 sec video).
- [ ] **14.3 Custom theme: static image background (M).** Image renders behind the focus card with an opacity slider; canvas hidden.
- [ ] **14.4 Custom theme: short looping video (M).** Same shape; `<video loop muted autoplay>` element.
- [ ] **14.5 Custom theme: palette JSON (S).** Override CSS custom properties (--primary, --accent, etc.) without uploading any asset.
- [ ] **14.6 CSP delta for user-uploaded media (S).** Add Supabase Storage origin to `media-src`.
- [ ] **14.7 Storage limits (S).** 100 MB / user, ~10 themes max. Configurable.
- [ ] **14.8 Theme preview before applying (S).** Hover any theme card to see a live preview without committing.
- [ ] **14.9 Public theme gallery (L).** Opt-in: publish your theme to a public gallery. Users can browse and apply themes built by others.

---

## Wave 15 — Widget dashboard (week 16–18, parallel)

The Home tab is three static elements today. Make it a real dashboard.

- [ ] **15.1 Widget registry (M).** Each widget = a renderer in `js/ui/widgets/<id>.js`, registered in `js/ui/widget-registry.js`.
- [ ] **15.2 Settings → Home → widgets array (M).** Drag-reorder; toggle on/off; per-widget settings nest under `widget.<id>.<setting>`.
- [ ] **15.3 Widget: Greeting (S).** Existing greeting, just registered.
- [ ] **15.4 Widget: Clock (S).** Existing clock, just registered. Toggle digital / analogue.
- [ ] **15.5 Widget: Today's focus (S).** Sessions count + total time + next session.
- [ ] **15.6 Widget: Active task / current goal (S).** A pinned task card.
- [ ] **15.7 Widget: Mini ambient mixer (M).** Right on Home — load a constellation in one click, see currently-active sounds.
- [ ] **15.8 Widget: Streak counter (S).** Big number, history graph below.
- [ ] **15.9 Widget: Word count (S).** From notepad — today / week / month.
- [ ] **15.10 Widget: Quote of the day (S).** Curated list, opt-in. Phase 2 — user-submitted quotes.
- [ ] **15.11 Widget: Calendar mini (M).** Next 3 events from Google Calendar (after Wave 12).
- [ ] **15.12 Widget: Weather (M).** OpenWeatherMap free tier. Opt-in. Phase 2 — used by Wave 4.12.
- [ ] **15.13 Widget: Recent notes (S).** Last 5 notes with one-click open.
- [ ] **15.14 Widget: Music now-playing (S).** What's playing through Wave 13.
- [ ] **15.15 Widget: Goal progress rings (S).** Today / week / month goals from Wave 10.
- [ ] **15.16 Drag-resize grid (L).** Widgets can be 1×1, 1×2, 2×1, 2×2. CSS Grid + drag-resize JS.
- [ ] **15.17 Multiple dashboard layouts (M).** "work" / "personal" / "weekend" with one-tap switching.
- [ ] **15.18 Cross-screen rendering (L).** When the app is cast / AirPlayed to a second screen, only the dashboard shows there — focus card stays on the primary.

---

## Wave 16 — Public profile + sharing (week 24)

- [ ] **16.1 Public profile URL (M).** `universefocuses.com/u/<handle>`. Configurable privacy (off / aggregated / full).
- [ ] **16.2 Share-card image generator (M).** "I focused 12 hours this week" — auto-generated PNG for Twitter / LinkedIn / Discord.
- [ ] **16.3 Embeddable stats badge (M).** `<iframe src="universefocuses.com/embed/<handle>">` for personal sites.
- [ ] **16.4 Yearly recap share (M).** End-of-year LinkedIn-ready image with personalised stats.
- [ ] **16.5 Streak share-cards (S).** "30-day streak — Cosmic Focus" share image.

---

## Wave 17 — Pomodoro / cycle variants (week 25)

Pomodoro is one of many. Some users hate it.

- [ ] **17.1 Custom interval (S).** Already supported via the focus-duration slider (1–90 min).
- [ ] **17.2 52/17 cycle preset (S).** 52 min focus + 17 min break.
- [ ] **17.3 90/20 ultradian cycle preset (S).** Aligned to the human ultradian rhythm.
- [ ] **17.4 Deep-work mode (M).** A 3–4 hour focus block with structured break protocols (5-min stretch break every 60 min, longer break in the middle).
- [ ] **17.5 Open-ended focus (S).** No countdown; tracks elapsed time. Ends when user hits stop.
- [ ] **17.6 Mode chooser at session start (M).** "Pomodoro / 52-17 / 90-20 / Deep work / Open-ended" — picker on the Focus tab.

---

## Wave 18 — Wellness + breaks (week 26)

- [ ] **18.1 Smart break activities (M).** Stretch / breathing / eye exercise / hydration prompts during break sessions. Configurable list.
- [ ] **18.2 Box-breathing animation (M).** During a break, an animated box-breathing guide (4 in, 4 hold, 4 out, 4 hold).
- [ ] **18.3 Eye-rest 20-20-20 reminder (S).** Every 20 min, gentle prompt to look at something 20 ft away for 20 sec.
- [ ] **18.4 Posture-check reminder (S).** Configurable interval; gentle full-screen reminder.
- [ ] **18.5 Hydration reminder (S).** Configurable interval.
- [ ] **18.6 Mood tracker before / after sessions (M).** 5-point scale; correlate with focus quality in the Profile.
- [ ] **18.7 Apple HealthKit integration (L).** Read step / heart-rate / sleep data; correlate with focus quality. iOS only.
- [ ] **18.8 Fitbit integration (L).** Same shape; cross-platform.
- [ ] **18.9 WHOOP integration (L).** Recovery-score-aware focus suggestions.
- [ ] **18.10 Sleep-mode UI (M).** After-hours, the app dims, switches to evening palette, prompts wind-down soundscapes.

---

## Wave 19 — Community (week 27–28)

- [ ] **19.1 Body-doubling rooms (XL).** Real-time silent video co-working, max 4 users per room. Cloudflare Calls (WebRTC infrastructure). Free at small scale.
- [ ] **19.2 Group focus challenges (L).** Invite friends; daily / weekly / monthly hours target; leaderboard within the group.
- [ ] **19.3 Accountability partners (M).** Pair with one other user; weekly recap of each other's focus stats; nudge each other.
- [ ] **19.4 Public study-with-me streams (XL).** Users can publish their focus session as a livestream (audio-only by default; opt-in video). Live waiting room.
- [ ] **19.5 Discord / Slack rich presence (M).** "Abdurahim is in deep focus — back in 22 min." For accountability.
- [ ] **19.6 In-app chat during co-working (M).** Optional. Per-room text chat.

---

## Wave 20 — Integrations and platform (week 29–32)

- [ ] **20.1 REST API (L).** Read sessions / tasks / mixes for power users. OAuth with PKCE for third-party apps.
- [ ] **20.2 Webhooks on session-end (M).** Post to Slack / Discord / IFTTT / Zapier.
- [ ] **20.3 Notion integration (M).** Auto-create journal entries for each focus session in a configured Notion database.
- [ ] **20.4 Obsidian integration (M).** Same as Notion via the Obsidian Local REST API plugin.
- [ ] **20.5 Linear integration (M).** Auto-link focus sessions to Linear issues; show issue context on the Focus tab.
- [ ] **20.6 Asana / Trello / Jira / GitHub Issues integrations (L each).** Same pattern, one-by-one.
- [ ] **20.7 GitHub commit auto-correlation (M).** If you focused 9–10 AM and committed at 9:47, the commit links to the focus session. Visible in Profile → Tasks.
- [ ] **20.8 VS Code extension (L).** Tracks coding sessions; surfaces in the web app. Optional auto-start focus when you start coding.
- [ ] **20.9 JetBrains plugin (L).** Same.
- [ ] **20.10 Raycast extension (M).** Start / pause / skip focus sessions from the macOS Raycast launcher.
- [ ] **20.11 Alfred workflow (M).** Same on Alfred.
- [ ] **20.12 Macro / iOS Shortcuts integration (S).** Already partly via 11.15.
- [ ] **20.13 CLI companion (M).** `cf start --duration 50` from the terminal. For developer power-users.

---

## Wave 21 — Marketplace + creator surface (week 33–37)

Turn the app into a platform.

- [ ] **21.1 Theme creator visual editor (XL).** A surface where users design their own themes (palette, scene-module composition, post-effects) and save them.
- [ ] **21.2 Soundscape creator visual editor (XL).** A timeline-based composer for procedural soundscapes — drop layers, draw automation curves, preview, save.
- [ ] **21.3 Constellation creator (existing, polished) (M).** Already exists; just improve the saving / sharing flow.
- [ ] **21.4 Public marketplace UI (XL).** Browse / rate / follow creators / install community themes & soundscapes & constellations.
- [ ] **21.5 Creator profiles (M).** Public page per creator showing all their published assets.
- [ ] **21.6 Featured curation (S).** Editorial list of "this week's standout themes / soundscapes."
- [ ] **21.7 Revenue share for creators (XL).** Optional paid themes / soundscapes; 70/30 split. Payment via Stripe Connect. Real legal / tax work involved.

---

## Wave 22 — Localization + accessibility (week 38–40)

- [ ] **22.1 Localization framework (M).** i18next or similar; extract every string in the app to a translation table.
- [ ] **22.2 Localizations: EN, ES, FR, DE, JA, ZH-Hans (L).** Six languages. Either commission translators or use AI + human review.
- [ ] **22.3 RTL language support (M).** Arabic / Hebrew. CSS logical properties pass.
- [ ] **22.4 WCAG AAA full audit (L).** Color contrast, focus order, keyboard navigation, screen-reader support, captions for any video, prefers-reduced-motion paths.
- [ ] **22.5 Dyslexia-friendly font option (S).** OpenDyslexic. Settings → Accessibility.
- [ ] **22.6 High-contrast theme (S).** Settings → Accessibility.
- [ ] **22.7 Larger-text mode (S).** Global text-size slider.
- [ ] **22.8 Voice control of every UI action (L).** "Start focus session", "Add task buy groceries", "Open my notes". Web Speech API for input; intent matching with a small grammar.

---

## Wave 23 — Enterprise (week 41+)

After consumer is dialled, this opens a separate market.

- [ ] **23.1 Team accounts (XL).** Org-level container with admin-controllable members.
- [ ] **23.2 SSO via SAML / OIDC (XL).** For enterprise sign-in.
- [ ] **23.3 SCIM provisioning (M).** For automatic user lifecycle in enterprise IDPs.
- [ ] **23.4 Org-level analytics dashboard (L).** Aggregated team focus stats, with privacy controls (no individual data leaks).
- [ ] **23.5 Audit log (M).** Sign-ins, settings changes, sync events. Exportable.
- [ ] **23.6 Brand customization for teams (M).** Company logo, accent colour, custom welcome message.
- [ ] **23.7 White-label deployment option (XL).** Self-hostable for highly-regulated customers.
- [ ] **23.8 Custom domain support (M).** `focus.<companyname>.com`.
- [ ] **23.9 Data residency options (L).** EU / US / APAC region pinning.
- [ ] **23.10 SOC 2 Type II compliance (XL).** Auditable controls, evidence collection. ~6 months elapsed time.
- [ ] **23.11 GDPR / CCPA compliance (L).** Data subject rights endpoints, retention controls.
- [ ] **23.12 HIPAA-eligible deployment (XL).** Only if we want healthcare market. BAA with Cloudflare and Supabase required.

---

## Stretch — moonshots and R&D (no fixed week)

Items I genuinely want to ship but can't honestly schedule until the foundations are dialled.

- [ ] **S.1 Real-time collaborative focus rooms (XL).** Like body-doubling but with shared timers, shared task list, group ambient mix.
- [ ] **S.2 AI scene generation (XL).** Describe a scene in words; we generate the GLSL shader and the supporting modules. Long R&D.
- [ ] **S.3 EEG / biometric-driven adaptation (XL).** Open BCI / Muse headband integration; the scene and audio dynamically respond to your focus state.
- [ ] **S.4 Native macOS app with menu-bar widget (L).** Electron is out; native Swift menu-bar. Tighter integration with macOS Focus modes, lock-screen, etc.
- [ ] **S.5 Native Windows app with system-tray widget (L).** Same idea on Windows.
- [ ] **S.6 Native Linux app (M).** Probably AppImage. Smaller user base but a meaningful one for our audience.
- [ ] **S.7 Voice-only mode (M).** App driven entirely by voice for blind / low-vision users (and hands-busy use-cases like cooking).
- [ ] **S.8 Apple Vision Pro / Quest 3 immersive theme (XL).** WebXR. The black hole becomes a fully-3D environment you sit inside.
- [ ] **S.9 Generative LLM-driven coach with memory (XL).** A persistent AI relationship. Knows your history, your goals, your patterns. Conversational. Scoped privacy.
- [ ] **S.10 Encrypted end-to-end notes (L).** Notes, private by default; client-side encryption with the user's password. Server can't read them.
- [ ] **S.11 Federation / decentralised host (XL).** ActivityPub-style federation so users can self-host their own instance and still interoperate.
- [ ] **S.12 Public API for hardware integrations (L).** A spec so a Stream Deck button / smart-light system / Philips Hue / etc. can react to focus session state. (Some of this is webhook-shaped already; this is the published spec.)
- [ ] **S.13 Hardware product (XXL).** A small dedicated focus device — a desk pill that runs a stripped-down version of the app. Way out there.

---

## Wave 24 — Gamification (week 30, parallel)

Optional layer. Off by default for the people who hate it; on for those who love it.

- [ ] **24.1 XP + levels (M).** 10 XP per finished session, 25 for a 50+ min session, 50 for a perfect day, etc. Settings toggle to show / hide.
- [ ] **24.2 Achievements / badges (M).** ~80 achievements: first session, first 10 hrs, first 100 hrs, 7-day streak, 30-day streak, 365-day streak, finished a week of perfect days, used all 4 sounds in one session, used a soundscape after 9 PM, the long ones — "1000 hours focused", "5 years on the platform". Visual badges in Profile → Achievements.
- [ ] **24.3 Daily quests (M).** Three opt-in daily challenges that rotate: "complete 4 sessions", "no tab-switches for 90 min", "finish 3 tasks before noon". XP reward.
- [ ] **24.4 Seasonal events (M).** Quarterly themed events with limited-time achievements (winter solstice marathon, NaNoWriMo writing sprint, exam-week study challenge).
- [ ] **24.5 Profile flair (S).** Equip up to 3 badges to display on your public profile.
- [ ] **24.6 Constellation unlocks (S).** Some hand-tuned mixes / soundscapes / themes locked behind achievement levels for the gamification crowd.
- [ ] **24.7 Friend leaderboards (M).** Among friends only — never global anonymous leaderboards (those break user wellbeing).
- [ ] **24.8 Streak insurance (S).** "Use a streak freeze" — once a week, opt-in, you can take a day off without losing your streak. Compassionate gamification.
- [ ] **24.9 Personal-best alerts (S).** "New personal record: 3.5 hrs in one day."
- [ ] **24.10 Constellation discovery garden (M).** Visualise every achievement as a star in your personal galaxy.

---

## Wave 25 — Persona-specific modes (week 31–34)

The same core engine, surfaced very differently for distinct user types.

### 25A. Writers mode

- [ ] **25A.1 Word-count goal during session (M).** Set a per-session word target ("write 500 words"). Live progress bar.
- [ ] **25A.2 Daily writing streak (S).** Days in a row with at least one writing session that hit the word goal.
- [ ] **25A.3 NaNoWriMo mode (M).** November-only. 50,000-word goal across the month. Daily target widget on Home.
- [ ] **25A.4 Sprint timer (S).** Short rapid bursts (10 / 15 / 20 min) for "writing sprints" — a separate mode from Pomodoro.
- [ ] **25A.5 Writing-only distraction blocker (M).** Blocks everything except the notepad. (after 7.1)
- [ ] **25A.6 Style + readability metrics (M).** Live Flesch-Kincaid, average sentence length, passive-voice count in the notepad. For self-editing.
- [ ] **25A.7 Citation / footnote support in notepad (M).** Markdown + reference-style footnotes; export carries them.

### 25B. Students mode

- [ ] **25B.1 Course / subject tagging (M).** Tag each focus session and task with a course code. Profile gains a "by course" breakdown.
- [ ] **25B.2 Semester / term tracker (M).** Define a date range; see total hours per course over the term.
- [ ] **25B.3 Exam countdown widget (S).** Single date; counts down. (Wave 15 widget.)
- [ ] **25B.4 Spaced-repetition flashcards (XL).** Anki-style; integrated reviews can count as focus sessions. Or ship as just an integration with Anki.
- [ ] **25B.5 Pomodoro × subject rotation (S).** Auto-rotate subjects per Pomodoro for interleaved study.
- [ ] **25B.6 Study-with-friends rooms (XL).** Body-doubling (Wave 19.1) but tagged for academic use.
- [ ] **25B.7 LMS data import — Canvas / Moodle / Blackboard (XL each).** Auto-create tasks for assignments. Read-only pull.

### 25C. Coders mode

- [ ] **25C.1 GitHub commit auto-correlation (M).** Already in 20.7; surfaced more prominently in this mode.
- [ ] **25C.2 IDE auto-start (S).** When VS Code / JetBrains starts, focus session auto-starts. (after 20.8 / 20.9)
- [ ] **25C.3 PR-review timer (S).** Special session type for code review with longer breaks (eyes need them).
- [ ] **25C.4 Stack Overflow / docs allow-list (S).** Distraction blocker variant for coders that allowlists technical docs.
- [ ] **25C.5 Build / test integration (M).** Long-running builds visible as a separate timer next to the focus timer.
- [ ] **25C.6 Compile-time mode (M).** Special break activity for waiting on long compiles — quick breathing exercise tied to estimated build time.

### 25D. Freelancers mode

- [ ] **25D.1 Per-client time tracking (M).** Tag sessions / tasks with a client. Profile gains a per-client report.
- [ ] **25D.2 Billable rate per client (S).** Computes earnings.
- [ ] **25D.3 Invoice generation (L).** PDF invoice from a date-range client report.
- [ ] **25D.4 Toggl / Clockify / Harvest export (M each).** One-click export. Or two-way sync.
- [ ] **25D.5 Tax-friendly time export (S).** CSV with the columns accountants want.
- [ ] **25D.6 Stripe Tax / quarterly summary (M).** Optional integration.

### 25E. Researchers mode

- [ ] **25E.1 Reading time per paper (M).** Each task can be a paper title with a DOI; session time accumulates against it.
- [ ] **25E.2 Zotero integration (L).** Pulls reading list into the task list.
- [ ] **25E.3 Lit-review mode (M).** Special UI optimised for reading + note-taking simultaneously.
- [ ] **25E.4 BibTeX export from notepad (S).** Citation-style note rendering.

### 25F. Music creators mode

- [ ] **25F.1 BPM-aware soundscapes (M).** Soundscape layer locks to a specified BPM.
- [ ] **25F.2 DAW timer integration (M).** Logic Pro / Ableton OSC bridge — focus timer runs alongside the DAW.
- [ ] **25F.3 Reference-track ear-training session (S).** Special session that randomly plays reference tracks for active listening.

### 25G. Designers mode

- [ ] **25G.1 Figma plugin (L).** Shows focus state in Figma; auto-starts session when you open a file.
- [ ] **25G.2 Design-sprint mode (M).** Five focused 25-min slots with structured break activities tailored to design ideation.
- [ ] **25G.3 Mood-board ambient mix (S).** Mixes auto-suggest based on the project's vibe (described in a tag).

---

## Wave 26 — Hardware integrations (week 35–37)

The app extends to the physical world.

- [ ] **26.1 Philips Hue (M).** Lights dim during focus sessions; gentle shift to break colour during breaks. Webhook + Hue API.
- [ ] **26.2 LIFX / Nanoleaf (M).** Same shape, different APIs.
- [ ] **26.3 Smart desk integrations (M).** Uplift / Autonomous / Fully — auto-raise the desk for a stretch break.
- [ ] **26.4 Sonos / HEOS / Bluetooth speaker control (L).** Selects a speaker as the audio output for our ambient.
- [ ] **26.5 Stream Deck plugin (M).** Hardware buttons for start / pause / skip / next-task.
- [ ] **26.6 Loupedeck plugin (M).** Same on Loupedeck.
- [ ] **26.7 macOS Touch Bar app (S).** For the few users who still have one. Optional polish.
- [ ] **26.8 Smart-clock displays (M).** Lametric / Glance Clock — show focus state and timer.
- [ ] **26.9 Smart-display widgets — Echo Show / Nest Hub (L each).** Big display showing the cosmos + timer.
- [ ] **26.10 Apple HomeKit integration (M).** Trigger HomeKit scenes on session start / end ("focus" scene closes blinds, dims lights, mutes Sonos).
- [ ] **26.11 Google Home / Alexa routine triggers (L each).** Same idea via Google / Amazon.
- [ ] **26.12 IFTTT / Make.com triggers (S).** Webhook-shaped already; published as an IFTTT applet.
- [ ] **26.13 Pebble watchface (M).** Smaller user base, beloved community. Why not.
- [ ] **26.14 Garmin Connect IQ widget (M).** For runners / triathletes who want focus on their watch.

---

## Wave 27 — External time-tracking imports (week 36)

For users coming from existing tools.

- [ ] **27.1 RescueTime data import (M).** Pull historical activity to bootstrap analytics.
- [ ] **27.2 Toggl / Clockify / Harvest import (M each).** Merge into our session history (with clear "imported" markers).
- [ ] **27.3 Forest data import (M).** From the Forest CSV export. Heavy gainful audience overlap.
- [ ] **27.4 Be Focused / Flow / Session.app import (M each).** Smaller competitors but real users.
- [ ] **27.5 Apple Screen Time import (M).** iOS only; via Shortcuts.
- [ ] **27.6 Generic CSV import wizard (M).** Map columns; bring in any time-tracking dataset.
- [ ] **27.7 Manual session backfill (S).** "I focused 2 hrs yesterday, didn't track it" — add it after the fact.

---

## Wave 28 — Browser depth (week 38)

Beyond the distraction blocker — full browsing experience.

- [ ] **28.1 New-tab page extension (L).** Cosmic Focus replaces the new-tab page. Stats, today's tasks, ambient running.
- [ ] **28.2 Page-action button (S).** Click the extension icon to start / pause from any tab.
- [ ] **28.3 Reader mode auto-trigger during focus (M).** When focused, links auto-open in a clean reader view.
- [ ] **28.4 Tab counter ambient pressure (M).** "You have 47 tabs open" — gentle nudge.
- [ ] **28.5 Browser-history ambient sync (M).** Browser shows a soft Cosmic Focus border when in a focus session, so you remember.

---

## Wave 29 — Languages — full matrix (week 39–42)

Wave 22 already lists 6 languages. Going to 16 here.

- [ ] **29.1 Chinese (Simplified) — zh-Hans (L).** Already in Wave 22.2; surfaced explicitly here.
- [ ] **29.2 Chinese (Traditional) — zh-Hant (L).**
- [ ] **29.3 Korean — ko (L).**
- [ ] **29.4 Japanese — ja (L).** Already in Wave 22.2; surfaced explicitly here.
- [ ] **29.5 Hindi — hi (L).**
- [ ] **29.6 Bengali — bn (L).**
- [ ] **29.7 Arabic — ar (L). RTL.** Already in Wave 22.3; surfaced explicitly here.
- [ ] **29.8 Hebrew — he (M). RTL.**
- [ ] **29.9 Portuguese (Brazilian) — pt-BR (L).**
- [ ] **29.10 Russian — ru (L).**
- [ ] **29.11 Italian — it (L).**
- [ ] **29.12 Polish — pl (L).**
- [ ] **29.13 Turkish — tr (L).**
- [ ] **29.14 Vietnamese — vi (L).**
- [ ] **29.15 Indonesian — id (L).**
- [ ] **29.16 Thai — th (L).**
- [ ] **29.17 Ukrainian — uk (L).**
- [ ] **29.18 Dutch — nl (L).**
- [ ] **29.19 Swedish — sv (L).**
- [ ] **29.20 Filipino — fil (L).**

(Each language is "L" because high-quality, idiomatic translation by a human reviewer is the long pole; AI machine translation as a baseline is a day per language.)

---

## Wave 30 — Power-user editor + customisation (week 43)

For the people who will care about every keystroke.

- [ ] **30.1 Vim-mode keybindings in notepad (M).**
- [ ] **30.2 Emacs-mode keybindings in notepad (M).**
- [ ] **30.3 User-configurable keyboard shortcuts everywhere (M).** Settings → Shortcuts already partly does this; extend to every action.
- [ ] **30.4 Configurable colour palette (M).** Every CSS custom property exposed in Settings → Theme → Colours.
- [ ] **30.5 Custom CSS injection (S).** "Power user" toggle reveals a textarea; user CSS applied last. Document escape hatches.
- [ ] **30.6 Custom JavaScript (XL).** Plugin system for power users to add their own widgets / behaviours. Sandboxed with restricted DOM access.
- [ ] **30.7 URL command interface (M).** `/?focus=start&duration=25` — query-string-driven actions for bookmarklets and integrations.
- [ ] **30.8 Settings export — full snapshot (S).** Already exists; clean it up + add JSON Schema validation.
- [ ] **30.9 Settings as a config file (M).** Power users can edit a `.cosmic-focus` file and import it.

---

## Wave 31 — Long-tail moonshots (no schedule)

The wild ideas. Some will land, some won't, none are off the table.

- [ ] **31.1 AI rewrites your notes for clarity (M).** One-click "polish" button on a note; LLM rewrites for clarity without changing meaning. Optional.
- [ ] **31.2 AI summarises your week into a haiku (S).** Just for fun. End-of-week cosmetic.
- [ ] **31.3 AI generates your tomorrow's plan from today's notes (M).** Suggests tasks based on what you wrote. User approves before they enter the list.
- [ ] **31.4 Personalised wallpaper of the day (M).** Your stats rendered as art, downloadable. Auto-set as your desktop wallpaper via a tiny helper app.
- [ ] **31.5 Time-travel feature (M).** Open Profile → click any past day → see the cosmos in the exact state it was in during that day's longest focus session. The constellation. The mix. The mood.
- [ ] **31.6 Print my year as a poster (M).** End-of-year service: high-res print-ready PDF of your year-in-stats. Optional paid premium poster ship via Printful.
- [ ] **31.7 Personal soundtrack album (M).** Generate a 12-track album of soundscapes used most in the year, downloadable. End-of-year cosmetic.
- [ ] **31.8 Memory-lane mode (M).** "On this day last year, you focused 3.2 hrs." Surfaces in Profile → Overview.
- [ ] **31.9 Voice-driven dictated tasks (M).** "Hey Cosmic, add task — buy groceries — estimate 1 pomodoro." Web Speech API + small intent matcher.
- [ ] **31.10 Ambient-aware webcam reactions (XL).** Your camera detects you slumping and the cosmos gently brightens to remind you to sit up. Privacy-respecting (camera processing client-side only). Off by default.
- [ ] **31.11 Heart-rate-aware soundscapes (XL).** With Apple Watch / Fitbit / WHOOP integration (Wave 18), the soundscape adapts to your physiological state (calmer when stressed, more energising when slumping).
- [ ] **31.12 Natural-language session start (S).** Chat box: "give me a 50-min focus session with rain and a soft jazz background, target 800 words written." Parsed and executed.
- [ ] **31.13 Embeddable widget for Notion / Obsidian / personal sites (M).** Pre-styled `<iframe>` showing your live timer + stats.
- [ ] **31.14 Personal "wrapped" video (M).** Like Spotify Wrapped — a 30-second video at year-end with your stats animated cinematically.
- [ ] **31.15 Genealogy view (M).** Your habits and patterns over years rendered as a tree of growth.
- [ ] **31.16 Constellation mood detection (XL).** Camera or biometric detects mood (optional) and suggests a soundscape / theme.
- [ ] **31.17 AI study tutor in deep-work mode (XL).** Optional. While studying, ask the AI questions inline — it answers without breaking your focus rhythm.
- [ ] **31.18 Pomodoro DAO / productivity guild (XL).** Cross-pollination with web3 community — opt-in shared pool of focus minutes funding causes / charities. R&D, controversial, listed for completeness.
- [ ] **31.19 Personal API for everything (M).** A user-specific GraphQL endpoint exposing their entire data graph. For tinkerers.
- [ ] **31.20 Open-source the engine (XL).** At some point — open-source the rendering / audio engine portions so the community can build derivatives. Strategic decision; not a sprint task.
- [ ] **31.21 Hardware product (XXL).** A small dedicated focus device — desktop pill / OLED display / tactile buttons / always shows your timer + ambient. ~18 months to MVP.
- [ ] **31.22 Companion app for kids (L).** A kid-friendly variant — homework timer, study breaks with stretch animations, parent-configurable.
- [ ] **31.23 Therapy-mode (XL).** A tightly-scoped variant designed in collaboration with cognitive behavioural therapists for ADHD / executive-function support. Real research, real claims, real responsibility.
- [ ] **31.24 Audiobook integration (M).** Listen to an audiobook during focus sessions; the audiobook position / reading-time counts toward your stats.
- [ ] **31.25 Podcast integration (M).** Same shape — Pocket Casts / Overcast / Apple Podcasts / Spotify.
- [ ] **31.26 Ambient music generator (XXL).** Magenta / RNN-based — generates novel ambient music tuned to your focus profile. Continuously novel; never repeats.
- [ ] **31.27 Spatial-audio soundscapes (M).** Dolby Atmos / Apple Spatial Audio support for users with compatible hardware.
- [ ] **31.28 Federated multi-instance hosting (XL).** Already in stretch S.11; surfaced here too because it's a long-tail capability worth tracking.
- [ ] **31.29 Cosmic Focus for Vision Pro (XL).** Already S.8 above; surfaced here because the AR/VR space is still early — it'll land here when it lands.
- [ ] **31.30 Brain-computer-interface adaptive scenes (XL).** S.3 same idea.

---

## Cross-cutting quality work (always)

These don't belong in one wave; they happen continuously while everything else ships.

- [ ] **Q.1 Smoke test growth.** Every shipped feature gets at least one Playwright test.
- [ ] **Q.2 Performance budgets.** Page-load < 3 s on a mid-tier mobile (3G simulated). Bundle size growth tracked per PR.
- [ ] **Q.3 Lighthouse scores.** Performance / accessibility / best-practices / SEO all > 90.
- [ ] **Q.4 Error tracking (Sentry or similar).** Currently silent in prod. Ship a tracker; respect privacy (no user-content payloads).
- [ ] **Q.5 Analytics on app health (anonymised).** Nothing about who; just feature-use counts so we know what works.
- [ ] **Q.6 Documentation parity.** Every shipped feature gets a Help Center entry the same PR (CLAUDE.md doc contract). README, ARCHITECTURE.md, DEPLOYMENT.md, SECURITY.md, CHANGELOG.md updated when relevant.
- [ ] **Q.7 Database migrations as code.** Every Supabase schema change as an idempotent migration in `db/migrations/`.
- [ ] **Q.8 Deprecation discipline.** When a feature is removed or renamed, leave a one-release shim that warns and migrates.
- [ ] **Q.9 Backup + restore.** Per-user data export (already exists for stats); add per-user full export (settings + tasks + notes + mixes + sessions). And a one-click restore.
- [ ] **Q.10 Privacy & data-handling docs.** SECURITY.md kept in sync with new data flows. Every external integration gets a privacy note.

---

## Summary cadence

- **Weeks 1–3.** Polish + foundations (Waves 0–3 — bug fixes, analytics polish, tasks v2, notepad).
- **Weeks 4–7.** Theme registry + first themes + YouTube backgrounds + widget dashboard (Waves 4–5 + 15).
- **Weeks 8–14.** Soundscapes + distraction blocker + sync + AI coach + goals (Waves 6–10).
- **Weeks 15–22.** Mobile + calendar + music services (Waves 11–13).
- **Weeks 22–28.** User-uploaded themes + public profiles + Pomodoro variants + wellness + community (Waves 14–19).
- **Weeks 29–37.** Integrations + marketplace + gamification + persona modes (Waves 20–21 + 24–25).
- **Weeks 35–42.** Hardware + external imports + browser depth + full language matrix (Waves 26–29).
- **Weeks 41+.** Localization + accessibility + enterprise + power-user editor + long-tail moonshots (Waves 22–23 + 30–31 + Stretch).

The whole list is **maximal**. About **12–14 months of full-time senior engineering work** end-to-end, including testing, polish, infra, audio production, design partner cycles, App Store / Chrome Store reviews, the inevitable rework, and long-tail moonshot R&D. Less if we cut. More if we go deeper. Cross things off as they ship; we'll revisit the cadence at every wave boundary.

This is the ceiling, not a contract — it lists every feature I'd want in a "best in the world" focus / productivity / ambient app, including ones with non-trivial third-party dependencies (Apple Developer accounts, Spotify partner approvals, App Store / Play Store review timelines, sound-design commissions, translator availability, SOC 2 audit cycles). Many items fan out into smaller PRs once we start shipping; others will grow as we ship dependencies.

When something on this list lands, mark it `[x]`. When it's actively being worked, mark `[~]`. When it's superseded by a better idea (which will happen), mark `[-]` and add the better idea as a new entry with a brief note on why.
