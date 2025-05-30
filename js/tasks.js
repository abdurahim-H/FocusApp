// Task Management Module
// Handles all task creation, completion, and rendering functionality

import { state } from './state.js';
import { updateUniverseStats, showAchievement } from './timer.js';
import { triggerTaskCompletionBurst } from './blackhole.js';
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
            task.completedAt = Date.now(); // Track completion time for effects
            state.universe.tasksCompleted++;
            state.universe.stars += 0.5;
            updateUniverseStats();
            showAchievement('Task Complete!', 'Great job!');
            
            // Trigger spectacular black hole burst effect
            triggerTaskCompletionBurst();
            
            // Trigger camera shake for impact
            triggerTaskCompletionShake();
            
            // Trigger UI celebration effect
            const taskElement = document.querySelector(`[data-task-id="${id}"]`);
            triggerTaskCompletionUI(taskElement);
            
            // Every 3rd task completion gets time dilation effect
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
        li.className = 'task-item' + (task.completed ? ' completed' : '');
        li.setAttribute('data-task-id', task.id); // Add for UI effects targeting
        li.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                <input type="checkbox" ${task.completed ? 'checked' : ''} 
                       onchange="window.toggleTask(${task.id})">
                <span>${task.text}</span>
            </div>
            <button class="btn" style="padding: 5px 10px;" onclick="window.deleteTask(${task.id})">✕</button>
        `;
        list.appendChild(li);
    });
}
