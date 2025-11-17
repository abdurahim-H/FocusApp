import { state } from '../core/state.js';

export function addTask() {
    const input = document.getElementById('taskInput');
    const text = input.value.trim();
    if (text) {
        const task = {
            id: Date.now(),
            text: text,
            completed: false
        };
        state.tasks.push(task);
        input.value = '';
        renderTasks();
    }
}



export function deleteTask(id) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    renderTasks();
}

export function renderTasks() {
    const list = document.getElementById('taskList');
    list.innerHTML = '';
    
    state.tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-item liquid-glass-task';
        li.innerHTML = `
            <div class="task-content">
                <label class="liquid-glass-checkbox">
                    <input type="checkbox">
                    <span class="checkmark"></span>
                </label>
                <span class="task-text">${task.text}</span>
            </div>
            <button class="liquid-glass-btn liquid-glass-btn--small liquid-glass-btn--danger" onclick="window.deleteTask(${task.id})">
                <span class="btn-icon">✕</span>
            </button>
        `;
        list.appendChild(li);
    });
}
