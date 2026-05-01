// task-dock.js
//
// Bottom-anchored task surface for the Focus tab. Slim by default,
// expandable into a 60vh task panel.
//
// Why a dock: the previous in-card .task-section slot was capped at
// 220px so the timer + stats + cosmos toolbar could share the same
// viewport. Long lists hid one task at a time. The dock hoists task
// management out of the focus card and into a body-level pinned
// surface, giving the list real room while keeping the timer
// uncluttered.
//
// State:
//   collapsed (default): slim 64px strip, shows the pinned active
//                        task name + total count
//   expanded:            60vh panel — full add input, scrollable list,
//                        bulk actions
//
// Visibility: only on the Focus tab (mode === 'focus'). Switching
// tabs collapses and animates out. Outside-click / Esc collapse from
// expanded.
//
// The dock is rendered in index.html (so the existing tasks.js
// queries — #taskList, #taskInput, #addTaskBtn, #tasksCarryBanner,
// etc — keep working without change). This module owns the chrome:
// state transitions, active-task preview, count, body class flags
// for the cosmos toolbar lift.

import { activeTaskId, effect, mode, tasks } from '../core/state.js';
import { normalizeTask } from '../features/tasks.js';

const STATE_KEY = 'fu_task_dock_state';

let initialised = false;
let dock = null;
let collapsedBtn = null;
let railBtn = null;
let closeBtn = null;
let activeNameEl = null;
let countEl = null;
let progressEl = null;
let emptyEl = null;
let listEl = null;
let openEl = null;
let doneEl = null;
let totalEl = null;

function readState() {
    try {
        const v = localStorage.getItem(STATE_KEY);
        return v === 'collapsed' || v === 'expanded' ? v : 'collapsed';
    } catch (_) {
        return 'collapsed';
    }
}

function writeState(s) {
    try { localStorage.setItem(STATE_KEY, s); } catch (_) { /* ignore */ }
}

export function initTaskDock() {
    if (initialised) return;
    initialised = true;

    dock = document.getElementById('taskDock');
    if (!dock) return;

    collapsedBtn = document.getElementById('taskDockCollapsed');
    railBtn = document.getElementById('taskDockRail');
    closeBtn = document.getElementById('taskDockClose');
    activeNameEl = document.getElementById('taskDockActiveName');
    countEl = document.getElementById('taskDockCount');
    progressEl = document.getElementById('taskDockProgress');
    emptyEl = document.getElementById('taskDockEmpty');
    listEl = document.getElementById('taskList');
    openEl = document.getElementById('taskDockOpen');
    doneEl = document.getElementById('taskDockDone');
    totalEl = document.getElementById('taskDockTotal');

    // Restore the user's last-used state. Default to collapsed so the
    // focus card (timer + controls) stays unobscured on first arrival;
    // the user expands the dock when they want to manage tasks.
    const saved = readState();
    dock.dataset.state = saved;
    railBtn?.setAttribute('aria-expanded', saved === 'expanded' ? 'true' : 'false');

    // Toggle expand from either the rail or the collapsed strip.
    railBtn?.addEventListener('click', toggle);
    collapsedBtn?.addEventListener('click', toggle);
    closeBtn?.addEventListener('click', collapse);

    // Outside click collapses an expanded dock. We use mousedown on the
    // capture phase so a click that starts inside but ends outside
    // (text selection) doesn't collapse mid-drag.
    document.addEventListener('mousedown', onOutside, true);
    document.addEventListener('keydown', onKey);

    // Reactive: visibility follows the current top-level navigation
    // tab. The user explicitly didn't want the dock to appear on the
    // Home tab — including while a timer is running — so we drop the
    // legacy 'timer' mode value (which timer.js still writes for its
    // own state machine) and only show on 'focus'. Tasks remain
    // accessible from Home via the cosmos toolbar's tasks button.
    effect(() => {
        const m = mode.value;
        if (m === 'focus') {
            show();
        } else {
            hide();
        }
    });

    // Reactive: collapsed-state preview. Re-paints whenever the task
    // list or pinned active task changes.
    effect(() => {
        // Touch both signals so the effect re-runs on either change.
        const list = tasks.value;
        const activeId = activeTaskId.value;
        paintPreview(list, activeId);
    });
}

function show() {
    if (!dock) return;
    dock.classList.remove('hidden');
    document.body.classList.add('has-task-dock');
    // Sync the body's expanded class with the dock's current state so
    // the cosmos toolbar lifts the correct distance from the start.
    document.body.classList.toggle(
        'is-task-dock-expanded',
        dock.dataset.state === 'expanded'
    );
}

function hide() {
    if (!dock) return;
    // Hide the dock but preserve dock.dataset.state — it's the user's
    // saved expand/collapse preference. We just clear the body classes
    // so the cosmos toolbar drops back to its default position while
    // the dock is off-screen on a non-focus tab.
    dock.classList.add('hidden');
    document.body.classList.remove('has-task-dock');
    document.body.classList.remove('is-task-dock-expanded');
}

function toggle() {
    if (!dock) return;
    if (dock.dataset.state === 'expanded') collapse();
    else expand();
}

/** Public entry — opened by the cosmos toolbar's tasks button. The
 *  dock only renders on the Focus tab, so we run the full nav switch
 *  (which updates both the mode signal and the active-tab pill) and
 *  expand once the focus panel has settled. */
export function openTaskDock() {
    import('./navigation.js').then(({ switchMode }) => {
        switchMode('focus');
        // Mode change → visibility effect runs → show() wires up the
        // dock; expand on the next frame.
        requestAnimationFrame(() => expand());
    });
}

function expand() {
    if (!dock || dock.dataset.state === 'expanded') return;
    dock.dataset.state = 'expanded';
    railBtn?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-task-dock-expanded');
    writeState('expanded');
    // Move focus into the panel for keyboard users — first focusable
    // is the close button. Wait a frame so the layout has settled and
    // the element is actually visible.
    requestAnimationFrame(() => closeBtn?.focus());
}

function collapse() {
    if (!dock || dock.dataset.state === 'collapsed') return;
    dock.dataset.state = 'collapsed';
    railBtn?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-task-dock-expanded');
    writeState('collapsed');
}

function onOutside(e) {
    if (!dock || dock.dataset.state !== 'expanded') return;
    // Hidden dock = wrong tab. Outside-click should only collapse a
    // dock the user can currently see; otherwise switching tabs from
    // Home → Focus would silently collapse the user's saved expanded
    // preference because the tab-switch click is technically outside
    // the (off-screen) dock.
    if (dock.classList.contains('hidden')) return;
    if (dock.contains(e.target)) return;
    // Don't collapse when the click lands on a body-level overlay
    // that the dock itself launched. These live outside the dock's
    // DOM subtree (so dock.contains() misses them) but they're part
    // of the same task-management session — collapsing the dock when
    // the user clicks the task-detail's "Back to tasks" button or
    // edits a field there would defeat the whole flow. Add new
    // dock-launched overlays here when they ship.
    if (e.target.closest(
        '.task-detail, .date-picker, .ambient-toast, #celebrateToast, #gentleToast'
    )) return;
    collapse();
}

function onKey(e) {
    if (e.key !== 'Escape') return;
    if (!dock || dock.dataset.state !== 'expanded') return;
    if (dock.classList.contains('hidden')) return;
    // If a date picker (or other modal) is on top, let it handle Esc
    // first — its keydown listener runs in capture phase and stops
    // propagation, so we'll only see Esc here when nothing else is
    // open.
    e.preventDefault();
    collapse();
}

function paintPreview(list, activeId) {
    if (!activeNameEl || !countEl) return;
    const all = Array.isArray(list) ? list : [];
    const active = activeId != null
        ? all.find((t) => t.id === activeId)
        : null;
    const remaining = all.filter((t) => !t.completed).length;
    const total = all.length;

    // Eyebrow text reflects what the preview is showing: NOW for the
    // pinned active task, NEXT for the first open task in the list,
    // DONE when the list is finished, blank when empty.
    const eyebrowEl = document.getElementById('taskDockEyebrow');
    if (active) {
        const norm = normalizeTask(active);
        activeNameEl.textContent = norm.text || '— untitled task —';
        if (eyebrowEl) eyebrowEl.textContent = 'NOW';
        dock?.classList.remove('task-dock--no-active');
    } else if (remaining > 0) {
        // Show the first open task as the preview — the user can jump
        // straight into it. Picking the topmost open task matches the
        // "next up" mental model of an ordered list.
        const next = all.find((t) => !t.completed);
        const norm = next ? normalizeTask(next) : null;
        activeNameEl.textContent = norm?.text || '— untitled task —';
        if (eyebrowEl) eyebrowEl.textContent = 'NEXT';
        dock?.classList.remove('task-dock--no-active');
    } else if (total > 0) {
        activeNameEl.textContent = 'all tasks done';
        if (eyebrowEl) eyebrowEl.textContent = 'DONE';
        dock?.classList.add('task-dock--no-active');
    } else {
        activeNameEl.textContent = 'add your first task';
        if (eyebrowEl) eyebrowEl.textContent = '';
        dock?.classList.add('task-dock--no-active');
    }

    countEl.textContent = total === 0
        ? 'tap to add'
        : `${remaining} of ${total}`;

    // Summary chips in the expanded header — open / done / total.
    const done = total - remaining;
    if (openEl) openEl.textContent = remaining;
    if (doneEl) doneEl.textContent = done;
    if (totalEl) totalEl.textContent = total;

    if (progressEl) {
        if (active) {
            const norm = normalizeTask(active);
            const est = Number(norm.estimatedPomodoros) || 0;
            const spentMin = Math.round((Number(norm.spentSeconds) || 0) / 60);
            if (est > 0) {
                const pomMin = 25;
                const pomDone = Math.min(est, Math.round(spentMin / pomMin));
                progressEl.textContent = `${pomDone}/${est} 🍅`;
                progressEl.classList.remove('hidden');
            } else if (spentMin > 0) {
                progressEl.textContent = `${spentMin}m in`;
                progressEl.classList.remove('hidden');
            } else {
                progressEl.classList.add('hidden');
                progressEl.textContent = '';
            }
        } else {
            progressEl.classList.add('hidden');
            progressEl.textContent = '';
        }
    }

    if (emptyEl && listEl) {
        const isEmpty = total === 0;
        emptyEl.classList.toggle('hidden', !isEmpty);
        listEl.classList.toggle('hidden', isEmpty);
    }
}
