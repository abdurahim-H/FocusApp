import { state } from '../core/state.js';
import { updateUniverseStats } from './timer.js';
import { triggerTaskCompletionShake, triggerTimeDilationEffect } from '../graphics/camera-effects.js';
import { triggerTaskCompletionUI, triggerTimeDilationUI } from '../ui/ui-effects.js';

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
    console.log('🔵 toggleTask called - ID:', id);
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        console.log('📋 Task found:', task.text);
        console.log('⏹️  Current state:', task.completed ? 'completed' : 'not completed');
        
        task.completed = !task.completed;
        console.log('🔄 Toggled to:', task.completed ? 'completed' : 'not completed');
        
        if (task.completed) {
            console.log('✅ TASK COMPLETED - Starting completion flow');
            task.completedAt = Date.now();
            state.universe.tasksCompleted++;
            state.universe.stars += 0.5;
            console.log('⭐ Universe stats updated - Total completed:', state.universe.tasksCompleted, '| Stars:', state.universe.stars);
            
            // Add completion animation
            const taskElement = document.querySelector(`[data-task-id="${id}"]`);
            console.log('🎯 Task element found:', !!taskElement);
            if (taskElement) {
                console.log('🎬 Adding "completing" class for animation');
                taskElement.classList.add('completing');
                console.log('📸 Classes after adding:', taskElement.className);
                setTimeout(() => {
                    console.log('⏰ Removing "completing" class after 400ms');
                    taskElement.classList.remove('completing');
                }, 400);
            }
            
            console.log('📊 Calling updateUniverseStats()');
            updateUniverseStats();
            
            console.log('🎨 Calling triggerTaskCompletionUI()');
            triggerTaskCompletionUI(taskElement);
            
            if (state.universe.tasksCompleted % 3 === 0) {
                console.log('🌀 EVERY 3RD TASK - Triggering time dilation effects');
                triggerTimeDilationEffect();
                triggerTimeDilationUI();
            }
        } else {
            console.log('❌ Task uncompleted');
        }
        
        console.log('🔄 Calling renderTasks() to refresh UI');
        renderTasks();
        console.log('✨ toggleTask complete\n');
    } else {
        console.log('❗ Task not found with ID:', id);
    }
}

export function deleteTask(id) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    renderTasks();
}

export function renderTasks() {
    console.log('🖼️  renderTasks called - Total tasks:', state.tasks.length);
    const list = document.getElementById('taskList');
    list.innerHTML = '';
    
    state.tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-item liquid-glass-task' + (task.completed ? ' completed' : '');
        console.log('  📦 Rendering task:', task.text, '| Classes:', li.className);
        li.setAttribute('data-task-id', task.id); // Add for UI effects targeting
        li.innerHTML = `
            <div class="task-content">
                <label class="liquid-glass-checkbox">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} 
                           onchange="console.log('📍 Checkbox onchange event fired'); window.toggleTask(${task.id})">
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
