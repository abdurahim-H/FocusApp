// UI Visual Effects Module
// Manages CSS-based visual effects that complement the 3D animations

import { appState } from './state.js';
import { trackSetTimeout, trackSetInterval } from './cleanup.js';

let activeEffects = new Set();

// Apply productivity glow based on completion rate
export function updateProductivityGlow() {
    const completedTasks = appState.tasks.filter(task => task.completed).length;
    const totalTasks = appState.tasks.length;
    const productivity = totalTasks > 0 ? completedTasks / totalTasks : 0;
    
    // Debug logging to understand the issue
    // console.log(`🔍 Productivity calc: ${completedTasks}/${totalTasks} = ${productivity.toFixed(2)}`);
    
    const container = document.querySelector('.container');
    
    if (productivity > 0.7) {
        container.classList.add('productivity-glow');
    } else {
        container.classList.remove('productivity-glow');
    }
    
    // Add cosmic flow to highly productive sessions
    if (productivity > 0.8) {
        container.classList.add('cosmic-flow');
    } else {
        container.classList.remove('cosmic-flow');
    }
}

// Trigger task completion celebration
export function triggerTaskCompletionUI(taskElement) {
    if (taskElement) {
        taskElement.classList.add('task-celebration');
        
        // Remove after animation
        setTimeout(() => {
            taskElement.classList.remove('task-celebration');
        }, 800);
    }
    
    // Also trigger on the main container for global effect
    const container = document.querySelector('.container');
    container.classList.add('task-celebration');
    
    setTimeout(() => {
        container.classList.remove('task-celebration');
    }, 800);
}

// Apply focus mode intensity
export function triggerFocusIntensity() {
    const timerContainer = document.querySelector('#timer-mode');
    const buttons = document.querySelectorAll('.btn');
    
    timerContainer?.classList.add('focus-intense');
    buttons.forEach(btn => btn.classList.add('btn-particle'));
    
    // Remove after focus session or when paused
    activeEffects.add('focus-intensity');
}

export function removeFocusIntensity() {
    const timerContainer = document.querySelector('#timer-mode');
    const buttons = document.querySelectorAll('.btn');
    
    timerContainer?.classList.remove('focus-intense');
    buttons.forEach(btn => btn.classList.remove('btn-particle'));
    
    activeEffects.delete('focus-intensity');
}

// Session completion epic effect
export function triggerSessionCompleteUI() {
    const container = document.querySelector('.container');
    const achievement = document.querySelector('.achievement');
    
    container.classList.add('session-complete');
    achievement?.classList.add('session-complete');
    
    // Add gravitational pull effect to simulate black hole influence
    setTimeout(() => {
        container.classList.add('gravitational-pull');
    }, 1000);
    
    // Remove effects after animation
    setTimeout(() => {
        container.classList.remove('session-complete', 'gravitational-pull');
        achievement?.classList.remove('session-complete');
    }, 4000);
}

// Black hole approach effect (for break time)
export function triggerBlackHoleApproachUI() {
    const body = document.body;
    
    // Gradually increase redshift effect
    let intensity = 0;
    const maxIntensity = 0.3;
    const duration = 4000; // 4 seconds
    const steps = 60;
    const stepTime = duration / steps;
    const intensityStep = maxIntensity / steps;
    
    const increaseRedshift = () => {
        intensity += intensityStep;
        body.style.setProperty('--redshift-intensity', intensity.toString());
        
        if (intensity < maxIntensity) {
            setTimeout(increaseRedshift, stepTime);
        }
    };
    
    increaseRedshift();
    
    // Hold at max intensity for 2 seconds, then decrease
    setTimeout(() => {
        triggerBlackHoleEscapeUI();
    }, duration + 2000);
}

// Black hole escape effect
export function triggerBlackHoleEscapeUI() {
    const body = document.body;
    const currentIntensity = parseFloat(body.style.getPropertyValue('--redshift-intensity')) || 0;
    
    let intensity = currentIntensity;
    const duration = 2000; // 2 seconds
    const steps = 60;
    const stepTime = duration / steps;
    const intensityStep = currentIntensity / steps;
    
    const decreaseRedshift = () => {
        intensity -= intensityStep;
        body.style.setProperty('--redshift-intensity', Math.max(0, intensity).toString());
        
        if (intensity > 0) {
            setTimeout(decreaseRedshift, stepTime);
        } else {
            body.style.removeProperty('--redshift-intensity');
        }
    };
    
    decreaseRedshift();
}

// Time dilation effect
export function triggerTimeDilationUI(duration = 3000) {
    const body = document.body;
    const elements = document.querySelectorAll('*');
    
    // Apply slow motion
    body.style.setProperty('--time-scale', '0.3');
    elements.forEach(el => {
        if (el.style.animationDuration || el.style.transitionDuration) {
            el.style.setProperty('--time-scale', '0.3');
        }
    });
    
    // Gradually return to normal speed
    setTimeout(() => {
        const returnToNormal = () => {
            let scale = 0.3;
            const targetScale = 1;
            const steps = 30;
            const stepTime = 1000 / steps; // 1 second to return to normal
            const scaleStep = (targetScale - scale) / steps;
            
            const adjustScale = () => {
                scale += scaleStep;
                const newScale = Math.min(scale, targetScale);
                body.style.setProperty('--time-scale', newScale.toString());
                
                elements.forEach(el => {
                    if (el.style.getPropertyValue('--time-scale')) {
                        el.style.setProperty('--time-scale', newScale.toString());
                    }
                });
                
                if (newScale < targetScale) {
                    setTimeout(adjustScale, stepTime);
                } else {
                    // Clean up
                    body.style.removeProperty('--time-scale');
                    elements.forEach(el => el.style.removeProperty('--time-scale'));
                }
            };
            
            adjustScale();
        };
        
        returnToNormal();
    }, duration / 2); // Start returning to normal halfway through
}

// Achievement enhancement with cosmic effects
export function enhanceAchievement(achievementElement, type = 'task') {
    if (!achievementElement) return;
    
    achievementElement.classList.add('cosmic-flow');
    
    switch (type) {
        case 'task':
            achievementElement.classList.add('task-celebration');
            break;
        case 'session':
            achievementElement.classList.add('session-complete');
            break;
        case 'focus':
            achievementElement.classList.add('focus-intense');
            break;
    }
    
    // Remove effects after display
    setTimeout(() => {
        achievementElement.classList.remove(
            'cosmic-flow', 
            'task-celebration', 
            'session-complete', 
            'focus-intense'
        );
    }, 3000);
}

// Productivity wave effect across the UI
export function triggerProductivityWave() {
    const elements = document.querySelectorAll('.glass-card, .btn, .task-item');
    
    elements.forEach((el, index) => {
        setTimeout(() => {
            el.classList.add('productivity-glow');
            
            setTimeout(() => {
                el.classList.remove('productivity-glow');
            }, 2000);
        }, index * 100); // Stagger the effect
    });
}

// Monitor productivity and apply effects automatically
export function updateUIBasedOnProductivity() {
    updateProductivityGlow();
    
    // Check for major milestones
    const completedTasks = appState.tasks.filter(task => task.completed).length;
    
    // Every 5 tasks completed triggers a wave
    if (completedTasks > 0 && completedTasks % 5 === 0) {
        triggerProductivityWave();
    }
    
    // Focus mode effects
    if (appState.currentMode === 'focus' && !activeEffects.has('focus-intensity')) {
        triggerFocusIntensity();
    } else if (appState.currentMode !== 'focus' && activeEffects.has('focus-intensity')) {
        removeFocusIntensity();
    }
}

// Initialize UI effects system
export function initUIEffects() {
    // Set up periodic checks
    setInterval(updateUIBasedOnProductivity, 1000);
    
    // Add particle effects to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.classList.add('btn-particle');
        });
        
        btn.addEventListener('mouseleave', () => {
            // Only remove if not in focus mode
            if (!activeEffects.has('focus-intensity')) {
                btn.classList.remove('btn-particle');
            }
        });
    });
}

// Clean up all active effects
export function cleanupUIEffects() {
    const body = document.body;
    const container = document.querySelector('.container');
    const allElements = document.querySelectorAll('*');
    
    // Remove all effect classes
    const effectClasses = [
        'productivity-glow', 'task-celebration', 'focus-intense',
        'session-complete', 'gravitational-pull', 'cosmic-flow',
        'btn-particle'
    ];
    
    allElements.forEach(el => {
        effectClasses.forEach(className => {
            el.classList.remove(className);
        });
    });
    
    // Remove CSS custom properties
    body.style.removeProperty('--time-scale');
    body.style.removeProperty('--redshift-intensity');
    
    activeEffects.clear();
}
