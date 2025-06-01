// Debug version of tasks.js with enhanced logging
// Task Management Module
// Handles all task creation, completion, and rendering functionality

import { state } from './state.js';
import { updateUniverseStats, showAchievement } from './timer.js';
import { triggerTaskCompletionBurst } from './blackhole.js';
import { triggerTaskCompletionShake, triggerTimeDilationEffect } from './camera-effects.js';
import { triggerTaskCompletionUI, triggerTimeDilationUI } from './ui-effects.js';

export function addTask() {
    console.log('🔧 addTask() called');
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
        console.log('✅ Task added:', task);
        renderTasks();
    }
}

export function toggleTask(id) {
    console.log('🎯 toggleTask() called with id:', id);
    console.log('📊 Current state before toggle:', {
        tasksCount: state.tasks.length,
        completedTasks: state.tasks.filter(t => t.completed).length,
        universeStats: state.universe
    });
    
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        console.log('🔍 Found task:', task);
        task.completed = !task.completed;
        console.log('✅ Task completion toggled to:', task.completed);
        
        if (task.completed) {
            console.log('🎉 TASK COMPLETED - Starting celebration sequence!');
            
            // Track completion time for effects
            task.completedAt = Date.now();
            console.log('⏰ Completion time recorded:', task.completedAt);
            
            // Update universe stats
            state.universe.tasksCompleted++;
            state.universe.stars += 0.5;
            console.log('🌟 Universe stats updated:', state.universe);
            
            // Show achievement
            console.log('🏆 Showing achievement...');
            updateUniverseStats();
            showAchievement('Task Complete!', 'Great job!');
            
            // Trigger spectacular black hole burst effect
            // DISABLED: Unwanted yellow ring effect (debug version)
            console.log('🔥 DEBUG: Yellow ring burst effect DISABLED (triggerTaskCompletionBurst)');
            // try {
            //     triggerTaskCompletionBurst();
            //     console.log('✅ Black hole burst effect triggered');
            // } catch (error) {
            //     console.error('❌ Error in black hole burst:', error);
            // }
            
            // Trigger camera shake for impact
            console.log('📸 Triggering camera shake...');
            try {
                triggerTaskCompletionShake();
                console.log('✅ Camera shake triggered');
            } catch (error) {
                console.error('❌ Error in camera shake:', error);
            }
            
            // Trigger UI celebration effect
            console.log('🎨 Triggering UI celebration...');
            const taskElement = document.querySelector(`[data-task-id="${id}"]`);
            console.log('🎯 Found task element:', taskElement);
            try {
                triggerTaskCompletionUI(taskElement);
                console.log('✅ UI celebration triggered');
            } catch (error) {
                console.error('❌ Error in UI celebration:', error);
            }
            
            // Every 3rd task completion gets time dilation effect
            if (state.universe.tasksCompleted % 3 === 0) {
                console.log('⚡ 3RD TASK MILESTONE - Triggering time dilation effects!');
                try {
                    triggerTimeDilationEffect();
                    triggerTimeDilationUI();
                    console.log('✅ Time dilation effects triggered');
                } catch (error) {
                    console.error('❌ Error in time dilation effects:', error);
                }
            }
        } else {
            console.log('↩️ Task unchecked - no special effects triggered');
        }
        
        console.log('🔄 Re-rendering task list...');
        renderTasks();
        console.log('✅ Task toggle sequence complete');
    } else {
        console.error('❌ Task not found with id:', id);
    }
}

export function deleteTask(id) {
    console.log('🗑️ deleteTask() called with id:', id);
    state.tasks = state.tasks.filter(t => t.id !== id);
    renderTasks();
    console.log('✅ Task deleted and list re-rendered');
}

export function renderTasks() {
    console.log('🎨 renderTasks() called');
    const list = document.getElementById('taskList');
    list.innerHTML = '';
    
    console.log('📝 Rendering tasks:', state.tasks);
    
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
        console.log(`✅ Rendered task: ${task.text} (ID: ${task.id}, Completed: ${task.completed})`);
    });
    
    console.log('🎨 Task rendering complete');
}
