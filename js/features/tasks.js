// tasks.js
//
// Phase 1: tasks driven by the `tasks` signal in state.js (reactive + persisted).
// Phase 2: animated add/remove via Motion One. The render is now diff-based
// (not innerHTML batch) so individual <li> elements can play exit animations.

import { tasks, effect } from '../core/state.js';
import { springAnim, anim, prefersReducedMotion } from '../core/motion.js';
import { recordTaskToggle } from '../features/statistics.js';

// ============================================================================
// Mutations (immutable — required for signals to detect changes)
// ============================================================================

export function addTask() {
    const input = document.getElementById('taskInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    tasks.value = [...tasks.value, { id: Date.now(), text, completed: false }];
    input.value = '';
}

export function deleteTask(id) {
    tasks.value = tasks.value.filter(t => t.id !== id);
}

export function clearAllTasks() {
    tasks.value = [];
}

export function toggleTask(id) {
    const task = tasks.value.find(t => t.id === id);
    if (!task) return;

    const newCompleted = !task.completed;
    tasks.value = tasks.value.map(t =>
        t.id === id ? { ...t, completed: newCompleted } : t
    );

    // Track both directions: completing increments, uncompleting decrements
    recordTaskToggle(newCompleted);
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

    // Single delegated click handler — handles toggle + delete (with exit anim)
    list.addEventListener('click', (e) => {
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

    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleClearAllWithAnimation();
        });
    }

    // Reactive diff-based render
    effect(() => {
        const current = tasks.value;
        const currentIds = new Set(current.map(t => t.id));

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
    });
}

// ============================================================================
// DOM construction
// ============================================================================

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'task-item liquid-glass-task';
    li.dataset.taskId = task.id;
    li.innerHTML = `
        <div class="task-content">
            <label class="liquid-glass-checkbox" data-toggle-task="${task.id}">
                <input type="checkbox" ${task.completed ? 'checked' : ''} tabindex="-1">
                <span class="checkmark"></span>
            </label>
            <span class="task-text${task.completed ? ' task-completed' : ''}">${escapeHtml(task.text)}</span>
        </div>
        <button class="liquid-glass-btn liquid-glass-btn--small liquid-glass-btn--danger" data-delete-task="${task.id}" aria-label="Delete task">
            <span class="btn-icon">✕</span>
        </button>
    `;
    return li;
}

function updateTaskElement(el, task) {
    const checkbox = el.querySelector('input[type="checkbox"]');
    const textEl = el.querySelector('.task-text');
    if (checkbox) checkbox.checked = task.completed;
    if (textEl) {
        textEl.classList.toggle('task-completed', task.completed);
    }
}

// ============================================================================
// Animations
// ============================================================================

function animateEnter(el) {
    if (prefersReducedMotion) return;
    // Start state — invisible, slightly down and scaled
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px) scale(0.96)';
    // Spring into place
    springAnim(el, {
        opacity: [0, 1],
        transform: ['translateY(-8px) scale(0.96)', 'translateY(0px) scale(1)'],
    }, 'standard', { duration: 0.5 });
}

function animateExit(el) {
    if (prefersReducedMotion) {
        return Promise.resolve();
    }
    const animation = anim(el, {
        opacity: [1, 0],
        transform: ['translateY(0px) scale(1)', 'translateX(20px) scale(0.92)'],
    }, { duration: 0.28, easing: 'ease-in' });
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

async function handleClearAllWithAnimation() {
    const allElements = Array.from(elementsById.entries());
    if (allElements.length === 0) return;
    // Stagger out
    const exits = allElements.map(([id, el], i) => {
        exiting.add(id);
        return new Promise(resolve => {
            setTimeout(async () => {
                if (!prefersReducedMotion) await animateExit(el);
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
