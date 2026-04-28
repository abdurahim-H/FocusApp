// tasks.js
//
// Phase 1: tasks driven by the `tasks` signal in state.js (reactive + persisted).
// Phase 2: animated add/remove via Motion One. The render is now diff-based
// (not innerHTML batch) so individual <li> elements can play exit animations.
// Phase 3 (Wave 2 — Tasks v2):
//   - Each task gains optional fields: estimatedPomodoros, spentSeconds,
//     createdAt, completedAt, dueAt, project. Old tasks loaded from
//     localStorage without these are upgraded inline (`normalizeTask`)
//     so the rest of the code can rely on a uniform shape.
//   - "Bulk" operations: clearCompletedTasks + setAllTasksDone alongside
//     the existing clearAllTasks.

import { anim, isReducedMotion, springAnim } from '../core/motion.js';
import { activeTaskId, effect, tasks } from '../core/state.js';
import { recordTaskToggle } from '../features/statistics.js';

// ============================================================================
// Task model
// ============================================================================

const RECUR_VALUES = new Set(['daily', 'weekdays', 'weekly']);

/** Fill in any missing optional fields with sensible defaults so the UI
 *  can render uniformly regardless of whether the task was created
 *  pre- or post-Wave-2. Cheap; called on every read path. */
export function normalizeTask(t) {
    if (!t || typeof t !== 'object') return t;
    const subtasks = Array.isArray(t.subtasks)
        ? t.subtasks
              .filter((s) => s && typeof s === 'object')
              .map((s) => ({
                  id: Number(s.id) || Date.now() + Math.random(),
                  text: s.text || '',
                  completed: !!s.completed,
              }))
        : [];
    return {
        id: t.id,
        text: t.text || '',
        completed: !!t.completed,
        createdAt: t.createdAt || null,
        completedAt: t.completedAt || null,
        dueAt: Number.isFinite(t.dueAt) ? Number(t.dueAt) : null,
        project: typeof t.project === 'string' ? t.project.trim() : '',
        estimatedPomodoros: Number.isFinite(t.estimatedPomodoros)
            ? Math.max(0, Math.min(20, Math.round(t.estimatedPomodoros)))
            : 0,
        spentSeconds: Math.max(0, Number(t.spentSeconds) || 0),
        completedInSession: Math.max(0, Number(t.completedInSession) || 0),
        subtasks,
        repeat: RECUR_VALUES.has(t.repeat) ? t.repeat : null,
    };
}

// ============================================================================
// Mutations (immutable — required for signals to detect changes)
// ============================================================================

export function addTask() {
    const input = document.getElementById('taskInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const now = Date.now();
    tasks.value = [
        ...tasks.value,
        normalizeTask({ id: now, text, completed: false, createdAt: now }),
    ];
    input.value = '';
}

export function deleteTask(id) {
    tasks.value = tasks.value.filter((t) => t.id !== id);
}

export function clearAllTasks() {
    tasks.value = [];
}

/** Drop only the completed ones — the most-requested bulk op. */
export function clearCompletedTasks() {
    tasks.value = tasks.value.filter((t) => !t.completed);
}

/** Mark every task done (or every task not-done if all are already done). */
export function setAllTasksDone(done = true) {
    const target = !!done;
    let changed = 0;
    tasks.value = tasks.value.map((t) => {
        if (t.completed === target) return t;
        changed += 1;
        return {
            ...normalizeTask(t),
            completed: target,
            completedAt: target ? Date.now() : null,
        };
    });
    if (changed > 0) recordTaskToggle(target);
}

export function toggleTask(id) {
    const task = tasks.value.find((t) => t.id === id);
    if (!task) return;

    const newCompleted = !task.completed;
    tasks.value = tasks.value.map((t) =>
        t.id === id
            ? {
                  ...normalizeTask(t),
                  completed: newCompleted,
                  completedAt: newCompleted ? Date.now() : null,
              }
            : t
    );

    // Track both directions: completing increments, uncompleting decrements
    recordTaskToggle(newCompleted);
}

/** Update the per-task estimated pomodoro count. 0 clears the estimate. */
export function setTaskEstimate(id, estimatedPomodoros) {
    const safe = Math.max(0, Math.min(20, Math.round(Number(estimatedPomodoros) || 0)));
    tasks.value = tasks.value.map((t) =>
        t.id === id ? { ...normalizeTask(t), estimatedPomodoros: safe } : t
    );
}

/** Move a task to a new index. Used by the drag-to-reorder handler.
 *  Both indices are clamped to the current list length so a stale
 *  drop after another mutation can't corrupt the array. */
export function moveTask(fromIndex, toIndex) {
    const list = tasks.value;
    if (!list.length) return;
    const from = Math.max(0, Math.min(list.length - 1, fromIndex | 0));
    const to = Math.max(0, Math.min(list.length - 1, toIndex | 0));
    if (from === to) return;
    const next = list.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    tasks.value = next;
}

/** Add a subtask to a parent task. text is trimmed; empty strings ignored. */
export function addSubtask(parentId, text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return;
    tasks.value = tasks.value.map((t) => {
        if (t.id !== parentId) return t;
        const norm = normalizeTask(t);
        return {
            ...norm,
            subtasks: [
                ...norm.subtasks,
                { id: Date.now(), text: trimmed, completed: false },
            ],
        };
    });
}

/** Toggle a subtask's completed state. */
export function toggleSubtask(parentId, subtaskId) {
    tasks.value = tasks.value.map((t) => {
        if (t.id !== parentId) return t;
        const norm = normalizeTask(t);
        return {
            ...norm,
            subtasks: norm.subtasks.map((s) =>
                s.id === subtaskId ? { ...s, completed: !s.completed } : s
            ),
        };
    });
}

/** Delete a subtask by id. */
export function deleteSubtask(parentId, subtaskId) {
    tasks.value = tasks.value.map((t) => {
        if (t.id !== parentId) return t;
        const norm = normalizeTask(t);
        return {
            ...norm,
            subtasks: norm.subtasks.filter((s) => s.id !== subtaskId),
        };
    });
}

/** Set or clear a task's project tag. Empty string clears it. */
export function setTaskProject(id, project) {
    const trimmed = (project || '').trim().slice(0, 32);
    tasks.value = tasks.value.map((t) =>
        t.id === id ? { ...normalizeTask(t), project: trimmed } : t
    );
}

/** Set the recurrence schedule for a task. Pass `null` to clear,
 *  or 'daily' / 'weekdays' / 'weekly' to enable. Anything else is
 *  ignored (no error — the UI is what gates valid values). */
export function setTaskRecurrence(id, repeat) {
    const next = RECUR_VALUES.has(repeat) ? repeat : null;
    tasks.value = tasks.value.map((t) =>
        t.id === id ? { ...normalizeTask(t), repeat: next } : t
    );
}

/** Walk the task list and reset any completed recurring tasks that
 *  rolled past their period boundary. "Reset" means flipping
 *  `completed` back to false and clearing `completedAt` so the user
 *  sees a fresh instance for the new day / weekday / week. Called
 *  on init, on document visibility change, and from a 60s interval
 *  while the tab is open. */
export function resetExpiredRecurringTasks(now = Date.now()) {
    const todayStart = startOfLocalDay(now);
    const today = new Date(now);
    let anyChanged = false;
    const next = tasks.value.map((t) => {
        const norm = normalizeTask(t);
        if (!norm.repeat || !norm.completed) return t;
        if (!norm.completedAt) return t;
        const completedDayStart = startOfLocalDay(norm.completedAt);
        if (completedDayStart >= todayStart) return t; // still same day
        let shouldReset = false;
        if (norm.repeat === 'daily') {
            shouldReset = true;
        } else if (norm.repeat === 'weekdays') {
            const dow = today.getDay(); // 0 Sun .. 6 Sat
            shouldReset = dow !== 0 && dow !== 6;
        } else if (norm.repeat === 'weekly') {
            shouldReset = now - norm.completedAt >= 7 * 86_400_000;
        }
        if (!shouldReset) return t;
        anyChanged = true;
        return {
            ...norm,
            completed: false,
            completedAt: null,
            // Subtasks reset alongside the parent — for daily habits
            // the user expects a clean checklist each new period.
            subtasks: norm.subtasks.map((s) => ({ ...s, completed: false })),
        };
    });
    if (anyChanged) tasks.value = next;
}

function startOfLocalDay(epochMs) {
    const d = new Date(epochMs);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

// ============================================================================
// Carry-over banner — surfaces incomplete non-recurring tasks that
// were created more than 24h ago. The banner offers two responses:
//   - Keep    → resets each stale task's `createdAt` to "now" so the
//               banner doesn't fire again for them today, and dismisses
//               the banner via a local flag tied to today's date.
//   - Clear   → deletes every stale incomplete non-recurring task.
// Recurring tasks are exempt (they self-reset on a schedule).
// ============================================================================

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;
const CARRY_DISMISS_KEY = 'fu_tasks_carry_dismissed';

function staleTasks(now = Date.now()) {
    const cutoff = now - STALE_THRESHOLD_MS;
    return tasks.value.filter((t) => {
        const norm = normalizeTask(t);
        if (norm.completed || norm.repeat) return false;
        if (!norm.createdAt) return false; // pre-Wave-2 tasks lack createdAt — leave alone
        return norm.createdAt < cutoff;
    });
}

function isCarryDismissedToday() {
    try {
        const v = localStorage.getItem(CARRY_DISMISS_KEY);
        if (!v) return false;
        return v === todayLocalISO();
    } catch (_) {
        return false;
    }
}

function dismissCarryToday() {
    try {
        localStorage.setItem(CARRY_DISMISS_KEY, todayLocalISO());
    } catch (_) {}
}

function todayLocalISO() {
    const d = new Date();
    return d.toLocaleDateString('en-CA'); // yyyy-mm-dd in local TZ
}

function paintCarryBanner() {
    const banner = document.getElementById('tasksCarryBanner');
    const copyEl = document.getElementById('tasksCarryBannerCopy');
    if (!banner || !copyEl) return;
    if (isCarryDismissedToday()) {
        banner.classList.add('hidden');
        return;
    }
    const stale = staleTasks();
    if (stale.length === 0) {
        banner.classList.add('hidden');
        return;
    }
    banner.classList.remove('hidden');
    const word = stale.length === 1 ? 'task' : 'tasks';
    copyEl.textContent = `${stale.length} ${word} open longer than a day`;
}

function carryKeep() {
    // Bump each stale task's createdAt forward so it ages out of the
    // "stale" filter, then dismiss the banner for today. The user
    // explicitly chose to keep them — they shouldn't get re-pestered.
    const now = Date.now();
    const staleIds = new Set(staleTasks().map((t) => t.id));
    if (staleIds.size > 0) {
        tasks.value = tasks.value.map((t) =>
            staleIds.has(t.id) ? { ...normalizeTask(t), createdAt: now } : t
        );
    }
    dismissCarryToday();
    paintCarryBanner();
}

function carryClearStale() {
    const staleIds = new Set(staleTasks().map((t) => t.id));
    if (staleIds.size > 0) {
        tasks.value = tasks.value.filter((t) => !staleIds.has(t.id));
    }
    paintCarryBanner();
}

/** Set or clear a task's due date. Pass null to clear; pass a yyyy-mm-dd
 *  string or a numeric epoch ms to set. Stored as epoch ms keyed off
 *  the local-day-start so timezone changes don't shift the due date. */
export function setTaskDueDate(id, dueAt) {
    let normalized = null;
    if (dueAt != null) {
        if (typeof dueAt === 'string') {
            // yyyy-mm-dd in local time → epoch ms at local-midnight.
            const m = dueAt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (m) {
                const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
                normalized = d.getTime();
            }
        } else if (Number.isFinite(dueAt)) {
            normalized = Number(dueAt);
        }
    }
    tasks.value = tasks.value.map((t) =>
        t.id === id ? { ...normalizeTask(t), dueAt: normalized } : t
    );
}

/** Pin a task as the focus session's active target. Clicking the same
 *  task again clears the pin. Sessions completed while a task is
 *  active attribute their elapsed seconds to it (see addSpentSeconds).
 *  Passing null directly clears the pin without toggling. */
export function setActiveTask(id) {
    if (id == null) {
        activeTaskId.value = null;
        return;
    }
    activeTaskId.value = activeTaskId.value === id ? null : id;
}

/** Add elapsed seconds against a specific task. Called from timer.js
 *  when a focus session ends with `activeTaskId` set. Increments
 *  `completedInSession` so the per-task pomodoro badge can show how
 *  many sessions actually touched the task even if estimates change. */
export function addSpentSeconds(id, seconds) {
    if (!id || !Number.isFinite(seconds) || seconds <= 0) return;
    let didTouch = false;
    tasks.value = tasks.value.map((t) => {
        if (t.id !== id) return t;
        didTouch = true;
        const norm = normalizeTask(t);
        return {
            ...norm,
            spentSeconds: norm.spentSeconds + seconds,
            completedInSession: norm.completedInSession + 1,
        };
    });
    if (!didTouch) {
        // Pinned task was deleted between session start and end —
        // clear the dangling pin so the next session starts clean.
        if (activeTaskId.value === id) activeTaskId.value = null;
    }
}

// Legacy no-op — rendering is automatic now via the effect below.
export function renderTasks() {}

// ============================================================================
// Diff-based reactive render with enter/exit animations
// ============================================================================

let initialized = false;
// Tracks <li> elements currently in the DOM keyed by task id, so we can diff
// against the next signal value and only add/remove what changed.
const elementsById = new Map();
// Set of ids currently animating out — they're still in the DOM but already
// removed from the signal. We render them as "ghosts" until the exit completes.
const exiting = new Set();

export function initTaskRender() {
    if (initialized) return;
    initialized = true;

    const list = document.getElementById('taskList');
    const clearBtn = document.getElementById('clearAllBtn');
    if (!list) {
        console.warn('[tasks] taskList element not found');
        return;
    }

    // Single delegated click handler — handles toggle, delete, the
    // estimate stepper buttons, and the focus-lock pin. Order matters:
    // the stepper / lock / delete buttons sit outside the toggle area,
    // but their explicit short-circuits keep a click on them from
    // toggling the task-done state.
    list.addEventListener('click', (e) => {
        // Subtasks toggle (chevron) — open/close the drawer.
        const subToggleBtn = e.target.closest('[data-subtasks-toggle]');
        if (subToggleBtn) {
            e.preventDefault();
            e.stopPropagation();
            const li = subToggleBtn.closest('.task-item');
            if (li) li.classList.toggle('is-expanded');
            return;
        }
        // Subtask check toggle.
        const subTog = e.target.closest('[data-subtask-toggle]');
        if (subTog) {
            e.preventDefault();
            e.stopPropagation();
            toggleSubtask(Number(subTog.dataset.parentTask), Number(subTog.dataset.subtaskToggle));
            return;
        }
        // Subtask delete.
        const subDel = e.target.closest('[data-subtask-delete]');
        if (subDel) {
            e.preventDefault();
            e.stopPropagation();
            deleteSubtask(Number(subDel.dataset.parentTask), Number(subDel.dataset.subtaskDelete));
            return;
        }
        const lockBtn = e.target.closest('[data-task-lock]');
        if (lockBtn) {
            e.preventDefault();
            e.stopPropagation();
            setActiveTask(Number(lockBtn.dataset.taskLock));
            return;
        }
        const infoBtn = e.target.closest('[data-task-info]');
        if (infoBtn) {
            e.preventDefault();
            e.stopPropagation();
            // Lazy-load the detail module so the home / focus tabs
            // don't pull its bytes until a user actually opens a task.
            const id = Number(infoBtn.dataset.taskInfo);
            import('../ui/task-detail.js').then((m) => m.openTaskDetail?.(id));
            return;
        }
        const decrBtn = e.target.closest('[data-estimate-decr]');
        if (decrBtn) {
            e.preventDefault();
            e.stopPropagation();
            const id = Number(decrBtn.dataset.estimateDecr);
            const task = tasks.value.find((t) => t.id === id);
            setTaskEstimate(id, (task?.estimatedPomodoros || 0) - 1);
            return;
        }
        const incrBtn = e.target.closest('[data-estimate-incr]');
        if (incrBtn) {
            e.preventDefault();
            e.stopPropagation();
            const id = Number(incrBtn.dataset.estimateIncr);
            const task = tasks.value.find((t) => t.id === id);
            setTaskEstimate(id, (task?.estimatedPomodoros || 0) + 1);
            return;
        }
        const deleteBtn = e.target.closest('[data-delete-task]');
        if (deleteBtn) {
            e.preventDefault();
            const id = Number(deleteBtn.dataset.deleteTask);
            handleDeleteWithAnimation(id);
            return;
        }
        const toggle = e.target.closest('[data-toggle-task]');
        if (toggle) {
            e.preventDefault();
            toggleTask(Number(toggle.dataset.toggleTask));
        }
    });

    // Keyboard parity — Enter/Space on a focused task row toggles it.
    list.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const toggle = e.target.closest('[data-toggle-task]');
        if (toggle) {
            e.preventDefault();
            toggleTask(Number(toggle.dataset.toggleTask));
        }
    });

    // Due-date input — fires `change` once the user picks (or clears)
    // a date. Reads the input's value (yyyy-mm-dd) and feeds it to
    // setTaskDueDate, which interprets the date in local time.
    list.addEventListener('change', (e) => {
        const dueInput = e.target.closest('[data-due-input]');
        if (!dueInput) return;
        const id = Number(dueInput.dataset.dueInput);
        setTaskDueDate(id, dueInput.value || null);
    });

    // Subtask add form — Enter in the input or click on the + button
    // submits. The form handler stops propagation so the parent row
    // doesn't toggle its done state.
    list.addEventListener('submit', (e) => {
        const form = e.target.closest('[data-subtask-add]');
        if (!form) return;
        e.preventDefault();
        const parentId = Number(form.dataset.subtaskAdd);
        const input = form.querySelector('.subtask-add__input');
        if (!input) return;
        addSubtask(parentId, input.value);
        input.value = '';
        input.focus();
        // Make sure the parent row is expanded after adding.
        const li = form.closest('.task-item');
        if (li) li.classList.add('is-expanded');
    });

    // ── Drag-to-reorder ────────────────────────────────────────────
    // Native HTML5 drag-and-drop. dragstart records the source id,
    // dragover allows the drop, drop swaps. The "current dropTarget"
    // gets a CSS class so the user sees where the drop will land.
    let dragId = null;
    list.addEventListener('dragstart', (e) => {
        const li = e.target.closest('.task-item');
        if (!li) return;
        dragId = Number(li.dataset.taskId);
        li.classList.add('is-dragging');
        try { e.dataTransfer.effectAllowed = 'move'; } catch (_) {}
    });
    list.addEventListener('dragend', (e) => {
        const li = e.target.closest('.task-item');
        if (li) li.classList.remove('is-dragging');
        list.querySelectorAll('.is-drag-over').forEach((el) => el.classList.remove('is-drag-over'));
        dragId = null;
    });
    list.addEventListener('dragover', (e) => {
        const target = e.target.closest('.task-item');
        if (!target || dragId == null) return;
        e.preventDefault();
        try { e.dataTransfer.dropEffect = 'move'; } catch (_) {}
        list.querySelectorAll('.is-drag-over').forEach((el) => {
            if (el !== target) el.classList.remove('is-drag-over');
        });
        target.classList.add('is-drag-over');
    });
    list.addEventListener('drop', (e) => {
        const target = e.target.closest('.task-item');
        if (!target || dragId == null) return;
        e.preventDefault();
        const targetId = Number(target.dataset.taskId);
        const current = tasks.value;
        const fromIdx = current.findIndex((t) => t.id === dragId);
        const toIdx = current.findIndex((t) => t.id === targetId);
        if (fromIdx >= 0 && toIdx >= 0) moveTask(fromIdx, toIdx);
        target.classList.remove('is-drag-over');
        dragId = null;
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleClearAllWithAnimation();
        });
    }

    const clearCompletedBtn = document.getElementById('clearCompletedBtn');
    if (clearCompletedBtn) {
        clearCompletedBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleClearCompletedWithAnimation();
        });
    }

    // Recurring-task reset cycle. Catches the "user kept the tab open
    // overnight" case (interval), the "user came back from another
    // tab/window" case (visibilitychange), and the cold-start case
    // (immediate). Every check is a single pass over the list; cheap.
    resetExpiredRecurringTasks();
    paintCarryBanner();
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            resetExpiredRecurringTasks();
            paintCarryBanner();
        }
    });
    setInterval(() => {
        resetExpiredRecurringTasks();
        paintCarryBanner();
    }, 60_000);

    // Carry-over banner buttons.
    const carryKeepBtn = document.getElementById('tasksCarryKeep');
    const carryClearBtn = document.getElementById('tasksCarryClear');
    if (carryKeepBtn) carryKeepBtn.addEventListener('click', () => carryKeep());
    if (carryClearBtn) carryClearBtn.addEventListener('click', () => carryClearStale());

    // Reactive diff-based render
    effect(() => {
        // Track activeTaskId so the lock button + .is-active-task class
        // refresh whenever the user pins / unpins a task.
        activeTaskId.value;
        const current = tasks.value;
        const currentIds = new Set(current.map((t) => t.id));

        // 1. Remove elements that disappeared (and aren't already exiting)
        for (const [id, el] of elementsById) {
            if (!currentIds.has(id) && !exiting.has(id)) {
                // Mutated externally (not via our delete handler) — just remove
                el.remove();
                elementsById.delete(id);
            }
        }

        // 2. Add new elements + reorder
        current.forEach((task, index) => {
            let el = elementsById.get(task.id);
            if (!el) {
                el = createTaskElement(task);
                elementsById.set(task.id, el);
                // Insert at correct position
                const referenceNode = list.children[index] || null;
                list.insertBefore(el, referenceNode);
                animateEnter(el);
            } else {
                // Existing — update completed state in place (cheap)
                updateTaskElement(el, task);
                // Move into correct position if needed
                if (list.children[index] !== el) {
                    list.insertBefore(el, list.children[index] || null);
                }
            }
        });

        if (clearBtn) {
            clearBtn.classList.toggle('hidden', current.length === 0);
        }
        const completedBtn = document.getElementById('clearCompletedBtn');
        if (completedBtn) {
            const hasCompleted = current.some((t) => t.completed);
            completedBtn.classList.toggle('hidden', !hasCompleted);
        }
        renderTasksEta(current);
        paintCarryBanner();
    });
}

/** Render the "ETA HH:MM" pill on the tasks header. Computes the
 *  remaining estimated work for incomplete tasks (estimate − spent),
 *  treats each pomodoro as 25 minutes, and projects an arrival time
 *  by adding to the wall clock. Hidden when no incomplete task carries
 *  an estimate — silence is better than fake numbers. */
function renderTasksEta(taskList) {
    const eta = document.getElementById('tasksEta');
    if (!eta) return;
    const incomplete = taskList.filter((t) => !t.completed);
    let remainingMinutes = 0;
    for (const t of incomplete) {
        const norm = normalizeTask(t);
        if (norm.estimatedPomodoros <= 0) continue;
        const spentPomodoros = norm.spentSeconds > 0 ? norm.spentSeconds / 60 / 25 : 0;
        const remainingPomos = Math.max(0, norm.estimatedPomodoros - spentPomodoros);
        remainingMinutes += remainingPomos * 25;
    }
    if (remainingMinutes <= 0) {
        eta.classList.add('hidden');
        eta.textContent = '';
        return;
    }
    eta.classList.remove('hidden');
    const finishAt = new Date(Date.now() + remainingMinutes * 60 * 1000);
    const totalText = remainingMinutes >= 60
        ? `${(remainingMinutes / 60).toFixed(1)}h`
        : `${Math.round(remainingMinutes)}m`;
    eta.textContent = `${totalText} · ETA ${formatClockTime(finishAt)}`;
    eta.title = `${incomplete.filter((t) => normalizeTask(t).estimatedPomodoros > 0).length} estimated task${incomplete.length === 1 ? '' : 's'} left`;
}

function formatClockTime(d) {
    // Respects 12 / 24h based on the timer setting, but reads it
    // lazily without importing the settings store at module-load time.
    let format = '12h';
    try {
        // ESM dynamic import would force async; fall back to localStorage
        // probe so the renderer stays sync.
        const raw = localStorage.getItem('fu_settings_v2');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.['timer.timeFormat']) format = parsed['timer.timeFormat'];
        }
    } catch (_) {}
    if (format === '24h') {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    }
    let h = d.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${mm} ${ampm}`;
}

// ============================================================================
// DOM construction
// ============================================================================

function createTaskElement(task) {
    const norm = normalizeTask(task);
    const li = document.createElement('li');
    li.className = 'task-item liquid-glass-task';
    if (activeTaskId.value === task.id) li.classList.add('is-active-task');
    if (norm.subtasks.length > 0) li.classList.add('has-subtasks');
    li.dataset.taskId = task.id;
    li.draggable = true;
    // Track expansion state per-row in a data attribute so re-renders
    // don't collapse a user's open subtask drawer.
    li.dataset.subtasksExpanded = norm.subtasks.length > 0 ? 'true' : 'false';
    li.innerHTML = `
        <div class="task-row">
            <span class="task-drag-handle" aria-hidden="true" title="Drag to reorder">⋮⋮</span>
            <div class="task-content" data-toggle-task="${task.id}" role="button" tabindex="0"
                 aria-pressed="${task.completed}"
                 aria-label="${task.completed ? 'Mark not done' : 'Mark done'}: ${escapeHtml(task.text)}">
                <span class="liquid-glass-checkbox">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} tabindex="-1" aria-hidden="true">
                    <span class="checkmark"></span>
                </span>
                <span class="task-text${task.completed ? ' task-completed' : ''}">${escapeHtml(task.text)}</span>
                ${renderTaskBadge(task)}
                ${renderDueDateBadge(task)}
                ${renderRepeatIndicator(task)}
                ${renderProjectChip(task)}
                ${renderSubtaskCounter(norm)}
            </div>
            ${renderSubtasksToggle(task)}
            ${renderFocusLockButton(task)}
            ${renderDueDateInput(task)}
            ${renderEstimateStepper(task)}
            <button class="task-info" type="button"
                    data-task-info="${task.id}"
                    aria-label="Open task detail"
                    title="Open task detail">›</button>
            <button class="liquid-glass-btn liquid-glass-btn--small liquid-glass-btn--danger" data-delete-task="${task.id}" aria-label="Delete task">
                <span class="btn-icon" aria-hidden="true">✕</span>
            </button>
        </div>
        ${renderSubtasksDrawer(task)}
    `;
    return li;
}

/** Chevron toggle that expands the subtask drawer. Always rendered so
 *  the user can ADD a first subtask; rotates to open state when the
 *  drawer is expanded. */
function renderSubtasksToggle(task) {
    const norm = normalizeTask(task);
    const hasAny = norm.subtasks.length > 0;
    return `
        <button class="task-subtasks-toggle ${hasAny ? 'has-any' : ''}"
                type="button"
                data-subtasks-toggle="${task.id}"
                aria-label="${hasAny ? 'Show subtasks' : 'Add a subtask'}"
                title="${hasAny ? 'Show / hide subtasks' : 'Add a subtask'}">
            <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                <path d="M3 4.5 L6 7.5 L9 4.5" fill="none" stroke="currentColor"
                      stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
    `;
}

/** Small "n / total" pill on the parent row when subtasks exist. */
function renderSubtaskCounter(norm) {
    if (!norm.subtasks.length) return '';
    const done = norm.subtasks.filter((s) => s.completed).length;
    return `<span class="task-subtask-counter" title="subtasks done">${done}/${norm.subtasks.length}</span>`;
}

/** Optional project chip rendered next to the task text. */
function renderProjectChip(task) {
    const norm = normalizeTask(task);
    if (!norm.project) return '';
    return `<span class="task-project-chip" title="project tag">#${escapeHtml(norm.project)}</span>`;
}

/** Tiny ↻ indicator when a task recurs. */
function renderRepeatIndicator(task) {
    const norm = normalizeTask(task);
    if (!norm.repeat) return '';
    const label = norm.repeat === 'daily'
        ? 'repeats daily'
        : norm.repeat === 'weekdays'
            ? 'repeats Mon–Fri'
            : 'repeats weekly';
    return `<span class="task-repeat-chip" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">↻</span>`;
}

/** Subtasks drawer — a collapsible nested list with an "add" input.
 *  Rendered inside the parent <li>; the .task-item.is-expanded class
 *  on the parent toggles its visibility. */
function renderSubtasksDrawer(task) {
    const norm = normalizeTask(task);
    const items = norm.subtasks
        .map(
            (s) => `
        <li class="subtask-item ${s.completed ? 'is-done' : ''}" data-subtask-id="${s.id}">
            <button class="subtask-toggle"
                    type="button"
                    data-subtask-toggle="${s.id}"
                    data-parent-task="${task.id}"
                    aria-pressed="${s.completed}"
                    aria-label="${s.completed ? 'Mark not done' : 'Mark done'}: ${escapeHtml(s.text)}">
                <span class="subtask-toggle__check" aria-hidden="true">${s.completed ? '✓' : ''}</span>
                <span class="subtask-toggle__text">${escapeHtml(s.text)}</span>
            </button>
            <button class="subtask-delete"
                    type="button"
                    data-subtask-delete="${s.id}"
                    data-parent-task="${task.id}"
                    aria-label="Delete subtask">×</button>
        </li>
    `
        )
        .join('');
    return `
        <div class="task-subtasks">
            <ul class="subtask-list">${items}</ul>
            <form class="subtask-add" data-subtask-add="${task.id}">
                <input type="text" class="subtask-add__input"
                       placeholder="Add a subtask…"
                       maxlength="120"
                       aria-label="New subtask text">
                <button type="submit" class="subtask-add__btn" aria-label="Add subtask">+</button>
            </form>
        </div>
    `;
}

/** Optional inline due-date input. Hidden behind a small calendar
 *  icon by default; only the icon is rendered. The actual <input
 *  type="date"> lives next to it but visually overlaid so clicking
 *  the icon activates the picker. */
function renderDueDateInput(task) {
    const norm = normalizeTask(task);
    const isoValue = norm.dueAt ? new Date(norm.dueAt).toLocaleDateString('en-CA') : '';
    return `
        <label class="task-due ${norm.dueAt ? 'has-date' : ''}"
               aria-label="${norm.dueAt ? 'Edit due date' : 'Set due date'}"
               title="${norm.dueAt ? 'Edit due date' : 'Set due date'}">
            <span class="task-due__icon" aria-hidden="true">📅</span>
            <input type="date" class="task-due__input"
                   data-due-input="${task.id}"
                   value="${escapeHtml(isoValue)}">
        </label>
    `;
}

/** Inline due-date badge — visible inside the task content area so
 *  the user sees "due Tomorrow" / "overdue 3 days" without opening
 *  the picker. Rendered only when a due date is set. */
function renderDueDateBadge(task) {
    const norm = normalizeTask(task);
    if (!norm.dueAt) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(norm.dueAt);
    due.setHours(0, 0, 0, 0);
    const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
    let label, tone;
    if (days < 0) {
        label = days === -1 ? 'overdue 1 day' : `overdue ${-days} days`;
        tone = 'overdue';
    } else if (days === 0) {
        label = 'due today';
        tone = 'today';
    } else if (days === 1) {
        label = 'due tomorrow';
        tone = 'soon';
    } else if (days <= 7) {
        label = `due in ${days} days`;
        tone = 'soon';
    } else {
        label = `due ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
        tone = 'later';
    }
    return `<span class="task-due-badge task-due-badge--${tone}">${escapeHtml(label)}</span>`;
}

/** Focus-lock button — pin / unpin the task as the active session
 *  target. Visible on hover/focus, always visible while pinned. */
function renderFocusLockButton(task) {
    const isActive = activeTaskId.value === task.id;
    return `
        <button class="task-lock ${isActive ? 'is-on' : ''}"
                type="button"
                data-task-lock="${task.id}"
                aria-pressed="${isActive}"
                aria-label="${isActive ? 'Stop focusing on this task' : 'Focus on this task'}"
                title="${isActive ? 'Pinned — your next session credits time here' : 'Focus on this task'}">
            ◎
        </button>
    `;
}

function updateTaskElement(el, task) {
    const checkbox = el.querySelector('input[type="checkbox"]');
    const textEl = el.querySelector('.task-text');
    const content = el.querySelector('[data-toggle-task]');
    if (checkbox) checkbox.checked = task.completed;
    if (textEl) {
        textEl.classList.toggle('task-completed', task.completed);
    }
    if (content) {
        content.setAttribute('aria-pressed', String(task.completed));
        content.setAttribute(
            'aria-label',
            `${task.completed ? 'Mark not done' : 'Mark done'}: ${task.text}`
        );
    }
    // Refresh the badge + stepper + lock without rebuilding the whole
    // row so the diff render's exit animations still play cleanly. We
    // replace each fragment in place to match the new task shape.
    const oldBadge = el.querySelector('.task-badge');
    const newBadgeHtml = renderTaskBadge(task);
    if (oldBadge && !newBadgeHtml) {
        oldBadge.remove();
    } else if (oldBadge && newBadgeHtml) {
        oldBadge.outerHTML = newBadgeHtml;
    } else if (!oldBadge && newBadgeHtml && content) {
        content.insertAdjacentHTML('beforeend', newBadgeHtml);
    }
    const stepper = el.querySelector('.task-estimate');
    if (stepper) stepper.outerHTML = renderEstimateStepper(task);
    const lock = el.querySelector('.task-lock');
    if (lock) lock.outerHTML = renderFocusLockButton(task);
    const due = el.querySelector('.task-due');
    if (due) due.outerHTML = renderDueDateInput(task);
    const dueBadge = el.querySelector('.task-due-badge');
    const newDueBadge = renderDueDateBadge(task);
    if (dueBadge && !newDueBadge) dueBadge.remove();
    else if (dueBadge && newDueBadge) dueBadge.outerHTML = newDueBadge;
    else if (!dueBadge && newDueBadge && content) content.insertAdjacentHTML('beforeend', newDueBadge);

    // Subtasks drawer + counter + project chip — replace fragments in
    // place so the user's expanded/collapsed state on the parent row
    // is preserved (carried via the `.is-expanded` class on the <li>).
    const norm = normalizeTask(task);
    const counter = el.querySelector('.task-subtask-counter');
    const newCounter = renderSubtaskCounter(norm);
    if (counter && !newCounter) counter.remove();
    else if (counter && newCounter) counter.outerHTML = newCounter;
    else if (!counter && newCounter && content) content.insertAdjacentHTML('beforeend', newCounter);

    const project = el.querySelector('.task-project-chip');
    const newProject = renderProjectChip(task);
    if (project && !newProject) project.remove();
    else if (project && newProject) project.outerHTML = newProject;
    else if (!project && newProject && content) content.insertAdjacentHTML('beforeend', newProject);

    const repeat = el.querySelector('.task-repeat-chip');
    const newRepeat = renderRepeatIndicator(task);
    if (repeat && !newRepeat) repeat.remove();
    else if (repeat && newRepeat) repeat.outerHTML = newRepeat;
    else if (!repeat && newRepeat && content) content.insertAdjacentHTML('beforeend', newRepeat);

    const drawer = el.querySelector('.task-subtasks');
    if (drawer) drawer.outerHTML = renderSubtasksDrawer(task);
    const subToggle = el.querySelector('.task-subtasks-toggle');
    if (subToggle) subToggle.outerHTML = renderSubtasksToggle(task);

    el.classList.toggle('has-subtasks', norm.subtasks.length > 0);
    el.classList.toggle('is-active-task', activeTaskId.value === task.id);
}

/** Inline pomodoro-count badge — shown when an estimate exists or
 *  when actual time has been logged against the task. Compact "1 / 3"
 *  format mirrors the timer's session counter convention. */
function renderTaskBadge(task) {
    const t = normalizeTask(task);
    if (!t.estimatedPomodoros && !t.spentSeconds) return '';
    const spentPomodoros = t.spentSeconds > 0
        ? Math.round((t.spentSeconds / 60) / 25)
        : 0;
    if (t.estimatedPomodoros > 0) {
        return `<span class="task-badge" title="estimated ${t.estimatedPomodoros} × 25-min pomodoros">${spentPomodoros} / ${t.estimatedPomodoros}</span>`;
    }
    if (spentPomodoros > 0) {
        return `<span class="task-badge task-badge--no-estimate" title="${spentPomodoros} pomodoros logged so far">${spentPomodoros} 🍅</span>`;
    }
    return '';
}

/** Inline +/- stepper for the task's estimated pomodoro count.
 *  Hidden by default; revealed on hover/focus of the parent row.
 *  Buttons stop event propagation so a click here doesn't toggle the
 *  task-done state. */
function renderEstimateStepper(task) {
    const t = normalizeTask(task);
    const count = t.estimatedPomodoros;
    return `
        <div class="task-estimate" role="group" aria-label="Estimated pomodoros">
            <button class="task-estimate__btn"
                    type="button"
                    data-estimate-decr="${task.id}"
                    aria-label="Decrease estimate"
                    ${count <= 0 ? 'disabled' : ''}>−</button>
            <span class="task-estimate__val" aria-live="polite">${count}</span>
            <button class="task-estimate__btn"
                    type="button"
                    data-estimate-incr="${task.id}"
                    aria-label="Increase estimate"
                    ${count >= 20 ? 'disabled' : ''}>+</button>
        </div>
    `;
}

// ============================================================================
// Animations
// ============================================================================

function animateEnter(el) {
    if (isReducedMotion()) return;
    // Start state — invisible, slightly down and scaled
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px) scale(0.96)';
    // Spring into place
    springAnim(
        el,
        {
            opacity: [0, 1],
            transform: ['translateY(-8px) scale(0.96)', 'translateY(0px) scale(1)'],
        },
        'standard',
        { duration: 0.5 }
    );
}

function animateExit(el) {
    if (isReducedMotion()) {
        return Promise.resolve();
    }
    const animation = anim(
        el,
        {
            opacity: [1, 0],
            transform: ['translateY(0px) scale(1)', 'translateX(20px) scale(0.92)'],
        },
        { duration: 0.28, easing: 'ease-in' }
    );
    return animation.finished;
}

async function handleDeleteWithAnimation(id) {
    const el = elementsById.get(id);
    if (!el) {
        // No element tracked — just delete
        deleteTask(id);
        return;
    }
    exiting.add(id);
    await animateExit(el);
    el.remove();
    elementsById.delete(id);
    exiting.delete(id);
    deleteTask(id);
}

async function handleClearCompletedWithAnimation() {
    const completed = tasks.value.filter((t) => t.completed);
    if (completed.length === 0) return;
    const exits = completed.map((t, i) => {
        const el = elementsById.get(t.id);
        if (!el) return Promise.resolve();
        exiting.add(t.id);
        return new Promise((resolve) => {
            setTimeout(async () => {
                if (!isReducedMotion()) await animateExit(el);
                el.remove();
                elementsById.delete(t.id);
                exiting.delete(t.id);
                resolve();
            }, i * 30);
        });
    });
    await Promise.all(exits);
    clearCompletedTasks();
}

async function handleClearAllWithAnimation() {
    const allElements = Array.from(elementsById.entries());
    if (allElements.length === 0) return;
    // Stagger out
    const exits = allElements.map(([id, el], i) => {
        exiting.add(id);
        return new Promise((resolve) => {
            setTimeout(async () => {
                if (!isReducedMotion()) await animateExit(el);
                el.remove();
                elementsById.delete(id);
                exiting.delete(id);
                resolve();
            }, i * 40);
        });
    });
    await Promise.all(exits);
    clearAllTasks();
}

// ============================================================================
// Helpers
// ============================================================================

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
