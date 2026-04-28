// tasks-expand.js
//
// "Open in expanded view" surface for the task list. The home tab's
// task slot is constrained to 220px to leave room for the timer +
// stats + cosmos toolbar, which means longer task lists end up
// scrolling inside a tight box. This module gives users a
// full-canvas alternative — tap the ⤢ trigger and the same task
// list opens in a roomy panel anchored just below the nav cluster,
// modelled on the Settings / Help Center / Profile drop-down pattern.
//
// State is shared with the home list via the same `tasks` signal,
// so adding / completing / deleting in either surface updates the
// other live.

import { effect, tasks } from '../core/state.js';
import { addTask, clearAllTasks, deleteTask, toggleTask } from '../features/tasks.js';
import { isReducedMotion } from '../core/motion.js';
import { createFocusTrap } from './focus-trap.js';

let initialised = false;
let panel = null;
let trap = null;
let isOpen = false;
let unsubscribe = null;

export function initTasksExpand() {
    if (initialised) return;
    initialised = true;

    const trigger = document.getElementById('tasksExpandTrigger');
    if (!trigger) return;

    trigger.addEventListener('click', (e) => {
        e.preventDefault();
        open();
    });

    document.addEventListener('keydown', (e) => {
        if (!isOpen || e.key !== 'Escape') return;
        e.preventDefault();
        close();
    });
}

function buildPanel() {
    panel = document.createElement('div');
    panel.className = 'tasks-expand';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Expanded task list');
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = `
        <div class="tasks-expand__scrim" data-tasks-close></div>
        <div class="tasks-expand__sheet">
            <header class="tasks-expand__head">
                <span class="tasks-expand__eyebrow">TASKS</span>
                <h2 class="tasks-expand__title">Tasks for this session</h2>
                <button class="tasks-expand__close" type="button"
                        aria-label="Close expanded view"
                        data-tasks-close>×</button>
            </header>
            <div class="tasks-expand__add">
                <input type="text" class="tasks-expand__input"
                       id="tasksExpandInput"
                       placeholder="What are you working on?"
                       aria-label="New task" />
                <button class="tasks-expand__add-btn" type="button"
                        id="tasksExpandAddBtn">Add task</button>
            </div>
            <div class="tasks-expand__body">
                <div class="tasks-expand__count" id="tasksExpandCount"></div>
                <ul class="tasks-expand__list" id="tasksExpandList"></ul>
                <div class="tasks-expand__empty" id="tasksExpandEmpty" hidden>
                    <p class="tasks-expand__empty-headline">no tasks yet</p>
                    <p class="tasks-expand__empty-sub">add one above and it shows up here and on the home tab.</p>
                </div>
            </div>
            <footer class="tasks-expand__foot">
                <button class="tasks-expand__clear" type="button" id="tasksExpandClear">
                    Clear all
                </button>
                <span class="tasks-expand__hint">tap any task to mark it done · esc to close</span>
            </footer>
        </div>
    `;
    document.body.appendChild(panel);

    panel.querySelectorAll('[data-tasks-close]').forEach((el) =>
        el.addEventListener('click', close)
    );

    const input = panel.querySelector('#tasksExpandInput');
    const addBtn = panel.querySelector('#tasksExpandAddBtn');
    const list = panel.querySelector('#tasksExpandList');
    const clearBtn = panel.querySelector('#tasksExpandClear');

    const submit = () => {
        const text = input.value.trim();
        if (!text) return;
        // Use the same path as the home input: setting the home
        // input's value, calling addTask(), then clearing the
        // expand input. This keeps the source of truth in one place
        // and reuses the tasks signal's existing wiring.
        const homeInput = document.getElementById('taskInput');
        if (homeInput) {
            homeInput.value = text;
            addTask();
        }
        input.value = '';
        input.focus();
    };
    addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        submit();
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submit();
        }
    });

    list.addEventListener('click', (e) => {
        const del = e.target.closest('[data-x-delete]');
        if (del) {
            e.preventDefault();
            deleteTask(Number(del.dataset.xDelete));
            return;
        }
        const tog = e.target.closest('[data-x-toggle]');
        if (tog) {
            e.preventDefault();
            toggleTask(Number(tog.dataset.xToggle));
        }
    });
    list.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const tog = e.target.closest('[data-x-toggle]');
        if (tog) {
            e.preventDefault();
            toggleTask(Number(tog.dataset.xToggle));
        }
    });

    clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (tasks.value.length === 0) return;
        clearAllTasks();
    });
}

function open() {
    if (isOpen) return;
    isOpen = true;
    if (!panel) buildPanel();
    panel.setAttribute('aria-hidden', 'false');
    render();
    panel.classList.add('is-open');

    if (!trap) trap = createFocusTrap(panel);
    trap.activate(document.activeElement);

    if (!unsubscribe) {
        // Subscribe to the tasks signal so the expand list mirrors
        // changes from the home list (and vice versa). `effect` from
        // @preact/signals-core fires synchronously on each
        // dependency change and returns a disposer.
        unsubscribe = effect(() => {
            // Tracking dependency.
            tasks.value;
            if (isOpen) render();
        });
    }

    // Focus the input so the user can immediately add a task.
    requestAnimationFrame(() => {
        const inp = panel.querySelector('#tasksExpandInput');
        if (inp) inp.focus();
    });
}

function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    trap?.deactivate();
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
}

function render() {
    const list = panel.querySelector('#tasksExpandList');
    const empty = panel.querySelector('#tasksExpandEmpty');
    const count = panel.querySelector('#tasksExpandCount');
    const clearBtn = panel.querySelector('#tasksExpandClear');
    if (!list || !empty || !count || !clearBtn) return;

    const items = tasks.value;
    const total = items.length;
    const done = items.filter((t) => t.completed).length;
    const open = total - done;

    if (total === 0) {
        list.innerHTML = '';
        empty.hidden = false;
        count.textContent = '';
        clearBtn.disabled = true;
        clearBtn.setAttribute('aria-disabled', 'true');
        return;
    }
    empty.hidden = true;
    clearBtn.disabled = false;
    clearBtn.removeAttribute('aria-disabled');
    count.innerHTML = `
        <span class="tasks-expand__pill tasks-expand__pill--open">${open} open</span>
        <span class="tasks-expand__pill tasks-expand__pill--done">${done} done</span>
        <span class="tasks-expand__pill tasks-expand__pill--total">${total} total</span>
    `;

    // Render — order: open tasks first, completed tasks afterwards
    // so the user sees what's left to do without scrolling past
    // already-finished items.
    const ordered = [
        ...items.filter((t) => !t.completed),
        ...items.filter((t) => t.completed),
    ];
    list.innerHTML = ordered.map((task) => `
        <li class="tasks-expand__item ${task.completed ? 'is-done' : ''}">
            <div class="tasks-expand__row" data-x-toggle="${task.id}"
                 role="button" tabindex="0"
                 aria-pressed="${task.completed}"
                 aria-label="${task.completed ? 'Mark not done' : 'Mark done'}: ${escapeHtml(task.text)}">
                <span class="tasks-expand__check" aria-hidden="true">
                    <svg viewBox="0 0 12 12" width="12" height="12">
                        <path d="M2.5 6.2 L5 8.6 L9.5 3.6"
                              fill="none" stroke="currentColor"
                              stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </span>
                <span class="tasks-expand__text">${escapeHtml(task.text)}</span>
            </div>
            <button class="tasks-expand__del" type="button"
                    data-x-delete="${task.id}"
                    aria-label="Delete task">×</button>
        </li>
    `).join('');

    if (!isReducedMotion()) {
        // A staggered fade-in on the items so the list feels alive
        // when the panel first opens. requestAnimationFrame so the
        // class applies after layout, not before.
        requestAnimationFrame(() => {
            list.querySelectorAll('.tasks-expand__item').forEach((el, i) => {
                el.style.animationDelay = `${Math.min(20 * i, 240)}ms`;
                el.classList.add('is-revealed');
            });
        });
    }
}

function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = String(s ?? '');
    return div.innerHTML;
}
