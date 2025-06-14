import { state } from './state.js';
import { updateUniverseStats, showAchievement } from './timer.js';
import { triggerTaskCompletionShake, triggerTimeDilationEffect } from './camera-effects.js';
import { triggerTaskCompletionUI, triggerTimeDilationUI } from './ui-effects.js';

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

export function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        if (task.completed) {
            task.completedAt = Date.now();
            state.universe.tasksCompleted++;
            state.universe.stars += 0.5;
            
            // Add completion animation
            const taskElement = document.querySelector(`[data-task-id="${id}"]`);
            if (taskElement) {
                taskElement.classList.add('completing');
                setTimeout(() => {
                    taskElement.classList.remove('completing');
                }, 400);
            }
            
            updateUniverseStats();
            showAchievement('Task Complete!', 'Great job!');
            
            triggerTaskCompletionUI(taskElement);
            
            if (state.universe.tasksCompleted % 3 === 0) {
                triggerTimeDilationEffect();
                triggerTimeDilationUI();
            }
        }
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
        li.className = 'task-item liquid-glass-task' + (task.completed ? ' completed' : '');
        li.setAttribute('data-task-id', task.id); // Add for UI effects targeting
        li.innerHTML = `
            <div class="task-content">
                <label class="liquid-glass-checkbox">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} 
                           onchange="window.toggleTask(${task.id})">
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
