// tasks.js
//
// Phase 1: tasks are now driven by the `tasks` signal in state.js.
// - All mutations are immutable so signals fire correctly.
// - Rendering is handled by an effect() — no manual renderTasks() calls needed.
// - All click handlers use event delegation, no inline onclick.

import { tasks, effect } from '../core/state.js';

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
    tasks.value = tasks.value.map(t =>
        t.id === id ? { ...t, completed: !t.completed } : t
    );
}

// Legacy no-op — rendering is automatic now via the effect below.
export function renderTasks() {}

// ============================================================================
// Auto-render via signals effect + event delegation
// ============================================================================

let initialized = false;

export function initTaskRender() {
    if (initialized) return;
    initialized = true;

    const list = document.getElementById('taskList');
    const clearBtn = document.getElementById('clearAllBtn');
    if (!list) {
        console.warn('[tasks] taskList element not found');
        return;
    }

    // Single delegated click handler for all task interactions
    list.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('[data-delete-task]');
        if (deleteBtn) {
            e.preventDefault();
            deleteTask(Number(deleteBtn.dataset.deleteTask));
            return;
        }
        const toggle = e.target.closest('[data-toggle-task]');
        if (toggle) {
            e.preventDefault();
            toggleTask(Number(toggle.dataset.toggleTask));
        }
    });

    // Clear-all button (also delegated, single listener)
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            clearAllTasks();
        });
    }

    // Reactive render — runs once now, then every time `tasks.value` changes
    effect(() => {
        const current = tasks.value;
        list.innerHTML = current.map(task => `
            <li class="task-item liquid-glass-task">
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
            </li>
        `).join('');

        if (clearBtn) {
            clearBtn.classList.toggle('hidden', current.length === 0);
        }
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
