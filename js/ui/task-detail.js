// task-detail.js
//
// Detail surface for a single task. Drops down from below the nav
// cluster — same animation pattern as Settings / Help / Profile —
// and hosts the longer-form editing UI for things that don't fit on
// the inline row: full text edit, estimate stepper, due-date picker,
// project tag, subtasks, sessions-touched history, delete.
//
// Trigger: the small `›` info button on each task row. Clicking it
// passes the task id through `openTaskDetail(id)`.
//
// The panel reads the live `tasks` signal so any edit done elsewhere
// (or from this panel) repaints the surface synchronously.

import { effect, tasks } from '../core/state.js';
import { isReducedMotion } from '../core/motion.js';
import { createFocusTrap } from './focus-trap.js';
import {
    addSubtask,
    deleteSubtask,
    deleteTask,
    normalizeTask,
    setTaskDueDate,
    setTaskEstimate,
    setTaskProject,
    setTaskRecurrence,
    toggleSubtask,
    toggleTask,
} from '../features/tasks.js';

let initialised = false;
let panel = null;
let trap = null;
let isOpen = false;
let activeTaskId = null;
let unsubscribe = null;

// ───────────────────────────────────────────────────────────────────────
// Public entry
// ───────────────────────────────────────────────────────────────────────

export function initTaskDetail() {
    if (initialised) return;
    initialised = true;

    document.addEventListener('keydown', (e) => {
        if (!isOpen || e.key !== 'Escape') return;
        e.preventDefault();
        close();
    });
}

export function openTaskDetail(id) {
    if (!Number.isFinite(id)) return;
    if (!panel) buildPanel();
    activeTaskId = id;
    isOpen = true;
    panel.setAttribute('aria-hidden', 'false');
    panel.classList.add('is-open');
    if (!trap) trap = createFocusTrap(panel);
    trap.activate(document.activeElement);
    if (!unsubscribe) {
        // Re-render whenever the underlying tasks signal changes —
        // covers external edits (drag reorder, completion toggle from
        // another surface, etc.).
        unsubscribe = effect(() => {
            tasks.value;
            if (isOpen) render();
        });
    } else {
        render();
    }
    // Focus the text field after the open animation settles so the
    // user can start editing without an extra click.
    setTimeout(() => {
        const txt = panel.querySelector('[data-detail-text]');
        if (txt) txt.focus();
    }, isReducedMotion() ? 0 : 240);
}

// ───────────────────────────────────────────────────────────────────────
// Build / render
// ───────────────────────────────────────────────────────────────────────

function buildPanel() {
    panel = document.createElement('div');
    panel.className = 'task-detail';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Task detail');
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = `
        <div class="task-detail__scrim" data-detail-close></div>
        <div class="task-detail__sheet">
            <header class="task-detail__head">
                <span class="task-detail__eyebrow">TASK</span>
                <button class="task-detail__close" type="button"
                        aria-label="Close detail view"
                        data-detail-close>×</button>
            </header>
            <div class="task-detail__body" id="taskDetailBody"></div>
        </div>
    `;
    document.body.appendChild(panel);

    // Close handlers (scrim + × button)
    panel.querySelectorAll('[data-detail-close]').forEach((el) =>
        el.addEventListener('click', close)
    );

    // Delegated handlers — the body innerHTML is replaced on every
    // render, so listeners go on the stable host.
    const body = panel.querySelector('#taskDetailBody');
    body.addEventListener('click', onBodyClick);
    body.addEventListener('change', onBodyChange);
    body.addEventListener('input', onBodyInput);
    body.addEventListener('submit', onBodySubmit);
    body.addEventListener('keydown', onBodyKeydown);
}

function close() {
    if (!isOpen) return;
    isOpen = false;
    activeTaskId = null;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    trap?.deactivate();
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
}

function getActiveTask() {
    if (activeTaskId == null) return null;
    const t = tasks.value.find((x) => x.id === activeTaskId);
    return t ? normalizeTask(t) : null;
}

function render() {
    const body = panel?.querySelector('#taskDetailBody');
    if (!body) return;
    const task = getActiveTask();
    if (!task) {
        // Task was deleted while the panel was open. Show a tiny
        // empty-state and the user can close.
        body.innerHTML = `
            <div class="task-detail__missing">
                <p class="task-detail__missing-headline">this task was deleted</p>
                <p class="task-detail__missing-sub">close this drawer and pick another from the list.</p>
            </div>
        `;
        return;
    }

    const dueIso = task.dueAt ? new Date(task.dueAt).toLocaleDateString('en-CA') : '';
    const created = task.createdAt
        ? new Date(task.createdAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
          })
        : null;
    const completed = task.completedAt
        ? new Date(task.completedAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
          })
        : null;
    const spentMinutes = task.spentSeconds > 0 ? task.spentSeconds / 60 : 0;
    const spentDisplay = spentMinutes >= 60
        ? `${(spentMinutes / 60).toFixed(1)} hrs`
        : `${Math.round(spentMinutes)} min`;
    const subtaskItems = task.subtasks
        .map(
            (s) => `
        <li class="task-detail__subtask ${s.completed ? 'is-done' : ''}" data-subtask-id="${s.id}">
            <button class="task-detail__sub-toggle"
                    type="button"
                    data-subtask-toggle="${s.id}"
                    aria-pressed="${s.completed}"
                    aria-label="${s.completed ? 'Mark not done' : 'Mark done'}: ${esc(s.text)}">
                <span class="task-detail__sub-check">${s.completed ? '✓' : ''}</span>
                <span>${esc(s.text)}</span>
            </button>
            <button class="task-detail__sub-del"
                    type="button"
                    data-subtask-delete="${s.id}"
                    aria-label="Delete subtask">×</button>
        </li>
    `
        )
        .join('');

    body.innerHTML = `
        <section class="task-detail__section">
            <label class="task-detail__field">
                <span class="task-detail__label">Task</span>
                <input type="text"
                       class="task-detail__text-input"
                       data-detail-text
                       value="${escAttr(task.text)}"
                       maxlength="300"
                       aria-label="Task text">
            </label>
            <button class="task-detail__done-toggle ${task.completed ? 'is-on' : ''}"
                    type="button"
                    data-detail-toggle-done
                    aria-pressed="${task.completed}">
                ${task.completed ? '✓ Marked done' : 'Mark done'}
            </button>
        </section>

        <section class="task-detail__section task-detail__section--grid">
            <div class="task-detail__field">
                <span class="task-detail__label">Estimate</span>
                <div class="task-detail__stepper">
                    <button type="button" class="task-detail__step-btn"
                            data-detail-est-decr aria-label="Decrease estimate"
                            ${task.estimatedPomodoros <= 0 ? 'disabled' : ''}>−</button>
                    <span class="task-detail__stepper-val">${task.estimatedPomodoros} pomodoros</span>
                    <button type="button" class="task-detail__step-btn"
                            data-detail-est-incr aria-label="Increase estimate"
                            ${task.estimatedPomodoros >= 20 ? 'disabled' : ''}>+</button>
                </div>
            </div>
            <label class="task-detail__field">
                <span class="task-detail__label">Due</span>
                <div class="task-detail__date-row">
                    <input type="date" class="task-detail__date"
                           data-detail-due value="${esc(dueIso)}">
                    ${task.dueAt ? `
                        <button type="button" class="task-detail__date-clear"
                                data-detail-due-clear
                                aria-label="Clear due date">clear</button>
                    ` : ''}
                </div>
            </label>
            <label class="task-detail__field task-detail__field--full">
                <span class="task-detail__label">Project</span>
                <input type="text" class="task-detail__project"
                       data-detail-project
                       value="${escAttr(task.project)}"
                       maxlength="32"
                       placeholder="e.g. landing-page · paper-thesis · q4-launch">
            </label>
            <div class="task-detail__field task-detail__field--full">
                <span class="task-detail__label">Repeats</span>
                <div class="task-detail__repeat" role="radiogroup" aria-label="Recurrence">
                    ${[
                        { v: null, label: 'Never', short: 'one-off' },
                        { v: 'daily', label: 'Every day', short: 'daily' },
                        { v: 'weekdays', label: 'Weekdays', short: 'Mon–Fri' },
                        { v: 'weekly', label: 'Every week', short: '7d cycle' },
                    ].map((opt) => `
                        <button class="task-detail__repeat-btn ${(task.repeat || null) === opt.v ? 'is-on' : ''}"
                                type="button"
                                role="radio"
                                aria-checked="${(task.repeat || null) === opt.v}"
                                data-detail-repeat="${opt.v == null ? '' : opt.v}">
                            <span class="task-detail__repeat-label">${esc(opt.label)}</span>
                            <span class="task-detail__repeat-sub">${esc(opt.short)}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        </section>

        <section class="task-detail__section">
            <h3 class="task-detail__section-title">Subtasks</h3>
            <ul class="task-detail__sublist">${subtaskItems}</ul>
            <form class="task-detail__sub-add" data-detail-subtask-add>
                <input type="text"
                       class="task-detail__sub-input"
                       placeholder="Add a subtask…"
                       maxlength="120"
                       aria-label="New subtask text">
                <button type="submit" class="task-detail__sub-add-btn"
                        aria-label="Add subtask">Add</button>
            </form>
        </section>

        <section class="task-detail__section">
            <h3 class="task-detail__section-title">Time on this task</h3>
            <ul class="task-detail__time-stats">
                <li>
                    <span class="task-detail__time-num">${spentDisplay}</span>
                    <span class="task-detail__time-label">total focused</span>
                </li>
                <li>
                    <span class="task-detail__time-num">${task.completedInSession || 0}</span>
                    <span class="task-detail__time-label">sessions touched it</span>
                </li>
                ${task.estimatedPomodoros > 0 ? `
                    <li>
                        <span class="task-detail__time-num">
                            ${Math.round((spentMinutes / 25) * 100 / Math.max(task.estimatedPomodoros, 1))}%
                        </span>
                        <span class="task-detail__time-label">of estimate</span>
                    </li>
                ` : ''}
            </ul>
            <p class="task-detail__time-note">
                Time logs only when the task is pinned with <span aria-hidden="true">◎</span> as the focus session's active target.
            </p>
        </section>

        <section class="task-detail__section task-detail__section--meta">
            ${created ? `<p>Created ${esc(created)}</p>` : ''}
            ${completed ? `<p>Completed ${esc(completed)}</p>` : ''}
        </section>

        <section class="task-detail__section task-detail__section--danger">
            <button class="task-detail__delete" type="button" data-detail-delete>
                Delete this task
            </button>
        </section>
    `;
}

// ───────────────────────────────────────────────────────────────────────
// Body event handlers
// ───────────────────────────────────────────────────────────────────────

function onBodyClick(e) {
    if (activeTaskId == null) return;

    if (e.target.closest('[data-detail-toggle-done]')) {
        e.preventDefault();
        toggleTask(activeTaskId);
        return;
    }
    if (e.target.closest('[data-detail-est-decr]')) {
        e.preventDefault();
        const t = getActiveTask();
        if (t) setTaskEstimate(activeTaskId, (t.estimatedPomodoros || 0) - 1);
        return;
    }
    if (e.target.closest('[data-detail-est-incr]')) {
        e.preventDefault();
        const t = getActiveTask();
        if (t) setTaskEstimate(activeTaskId, (t.estimatedPomodoros || 0) + 1);
        return;
    }
    if (e.target.closest('[data-detail-due-clear]')) {
        e.preventDefault();
        setTaskDueDate(activeTaskId, null);
        return;
    }
    const repeatBtn = e.target.closest('[data-detail-repeat]');
    if (repeatBtn) {
        e.preventDefault();
        const v = repeatBtn.dataset.detailRepeat;
        setTaskRecurrence(activeTaskId, v || null);
        return;
    }
    const subTog = e.target.closest('[data-subtask-toggle]');
    if (subTog) {
        e.preventDefault();
        toggleSubtask(activeTaskId, Number(subTog.dataset.subtaskToggle));
        return;
    }
    const subDel = e.target.closest('[data-subtask-delete]');
    if (subDel) {
        e.preventDefault();
        deleteSubtask(activeTaskId, Number(subDel.dataset.subtaskDelete));
        return;
    }
    if (e.target.closest('[data-detail-delete]')) {
        e.preventDefault();
        // Two-step confirm — first click flips into a confirm state
        // for a couple of seconds, second click commits. Avoids a
        // browser confirm dialog (which mid-interaction breaks the
        // panel's focus trap).
        const btn = e.target.closest('[data-detail-delete]');
        if (btn.dataset.confirming === 'true') {
            const id = activeTaskId;
            close();
            deleteTask(id);
            return;
        }
        btn.dataset.confirming = 'true';
        btn.textContent = 'Tap again to confirm';
        btn.classList.add('is-confirming');
        setTimeout(() => {
            btn.dataset.confirming = '';
            btn.classList.remove('is-confirming');
            btn.textContent = 'Delete this task';
        }, 2500);
        return;
    }
}

function onBodyChange(e) {
    if (activeTaskId == null) return;
    if (e.target.closest('[data-detail-due]')) {
        const v = e.target.value;
        setTaskDueDate(activeTaskId, v || null);
    }
}

function onBodyInput(e) {
    if (activeTaskId == null) return;
    if (e.target.closest('[data-detail-text]')) {
        const v = e.target.value;
        // Direct mutation so we don't fight the input focus / cursor
        // position. setTaskText doesn't exist yet — minimal inline
        // update against the signal.
        tasks.value = tasks.value.map((t) =>
            t.id === activeTaskId ? { ...t, text: v } : t
        );
    } else if (e.target.closest('[data-detail-project]')) {
        // Debouncing the project input would be nice but the cost of
        // a full re-render is small enough to skip for now.
        const v = e.target.value;
        setTaskProject(activeTaskId, v);
    }
}

function onBodySubmit(e) {
    if (activeTaskId == null) return;
    const form = e.target.closest('[data-detail-subtask-add]');
    if (!form) return;
    e.preventDefault();
    const input = form.querySelector('.task-detail__sub-input');
    if (!input) return;
    addSubtask(activeTaskId, input.value);
    input.value = '';
    input.focus();
}

function onBodyKeydown(e) {
    // Allow Enter to commit the text-input edit without re-firing on
    // newline insertion (it's a single-line input — Enter blurs).
    if (e.key === 'Enter' && e.target.matches('[data-detail-text]')) {
        e.target.blur();
    }
}

// ───────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
function escAttr(s) {
    return esc(s).replace(/"/g, '&quot;');
}
