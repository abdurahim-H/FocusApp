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
import { effect, tasks } from '../core/state.js';
import { recordTaskToggle } from '../features/statistics.js';

// ============================================================================
// Task model
// ============================================================================

/** Fill in any missing optional fields with sensible defaults so the UI
 *  can render uniformly regardless of whether the task was created
 *  pre- or post-Wave-2. Cheap; called on every read path. */
export function normalizeTask(t) {
    if (!t || typeof t !== 'object') return t;
    return {
        id: t.id,
        text: t.text || '',
        completed: !!t.completed,
        createdAt: t.createdAt || null,
        completedAt: t.completedAt || null,
        estimatedPomodoros: Number.isFinite(t.estimatedPomodoros)
            ? Math.max(0, Math.min(20, Math.round(t.estimatedPomodoros)))
            : 0,
        spentSeconds: Math.max(0, Number(t.spentSeconds) || 0),
        completedInSession: Math.max(0, Number(t.completedInSession) || 0),
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

    // Single delegated click handler — handles toggle, delete, and the
    // estimate stepper buttons. Order matters: the stepper buttons sit
    // outside the toggle area, but their explicit short-circuits keep
    // a click on +/- from toggling the task-done state.
    list.addEventListener('click', (e) => {
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

    // Reactive diff-based render
    effect(() => {
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
    });
}

// ============================================================================
// DOM construction
// ============================================================================

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'task-item liquid-glass-task';
    li.dataset.taskId = task.id;
    // Whole content row is the toggle target — tap anywhere on the
    // task to flip done/undone. Delete button stays its own target;
    // the click handler runs the delete check first and short-circuits.
    // The estimate stepper sits between the text and the delete button.
    li.innerHTML = `
        <div class="task-content" data-toggle-task="${task.id}" role="button" tabindex="0"
             aria-pressed="${task.completed}"
             aria-label="${task.completed ? 'Mark not done' : 'Mark done'}: ${escapeHtml(task.text)}">
            <span class="liquid-glass-checkbox">
                <input type="checkbox" ${task.completed ? 'checked' : ''} tabindex="-1" aria-hidden="true">
                <span class="checkmark"></span>
            </span>
            <span class="task-text${task.completed ? ' task-completed' : ''}">${escapeHtml(task.text)}</span>
            ${renderTaskBadge(task)}
        </div>
        ${renderEstimateStepper(task)}
        <button class="liquid-glass-btn liquid-glass-btn--small liquid-glass-btn--danger" data-delete-task="${task.id}" aria-label="Delete task">
            <span class="btn-icon" aria-hidden="true">✕</span>
        </button>
    `;
    return li;
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
    // Refresh the badge + stepper without rebuilding the whole row so
    // the diff render's exit animations still play cleanly. We replace
    // each fragment in place to match the new task shape.
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
