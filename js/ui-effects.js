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

export function triggerSessionCompleteUI() {
    const container = document.querySelector('.container');
    const achievement = document.querySelector('.achievement');
    
    container.classList.add('session-complete');
    achievement?.classList.add('session-complete');
    
    setTimeout(() => {
        if (container.classList.contains('session-complete')) {
            container.classList.add('gravitational-pull');
        }
    }, 1500);
    
    setTimeout(() => {
        container.classList.remove('session-complete', 'gravitational-pull');
        achievement?.classList.remove('session-complete');
    }, 5000);
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
    const elements = document.querySelectorAll('*:not(audio):not(video)'); // Exclude audio/video elements
    
    // Apply slow motion
    body.style.setProperty('--time-scale', '0.3');
    elements.forEach(el => {
        // Skip audio and video elements
        if (el.tagName === 'AUDIO' || el.tagName === 'VIDEO') return;
        
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
                    // Skip audio and video elements
                    if (el.tagName === 'AUDIO' || el.tagName === 'VIDEO') return;
                    
                    if (el.style.getPropertyValue('--time-scale')) {
                        el.style.setProperty('--time-scale', newScale.toString());
                    }
                });
                
                if (newScale < targetScale) {
                    setTimeout(adjustScale, stepTime);
                } else {
                    // Clean up
                    body.style.removeProperty('--time-scale');
                    elements.forEach(el => {
                        if (el.tagName !== 'AUDIO' && el.tagName !== 'VIDEO') {
                            el.style.removeProperty('--time-scale');
                        }
                    });
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
    
    // Initialize water container effects
    initWaterContainerEffects();
}

// =============================================================================
// WATER COSMIC CONTAINER EFFECTS
// =============================================================================

// Initialize water container interactive effects
export function initWaterContainerEffects() {
    const waterContainers = document.querySelectorAll('.water-cosmic-container');
    
    waterContainers.forEach(container => {
        // Add water ripple effect on click
        container.addEventListener('click', (e) => {
            triggerWaterRipple(container, e);
        });
        
        // Add parallax motion on hover
        container.addEventListener('mouseenter', () => {
            container.classList.add('water-parallax');
        });
        
        container.addEventListener('mouseleave', () => {
            container.classList.remove('water-parallax');
        });
        
        // Add breathing effect for ambient containers
        if (container.classList.contains('ambient-content')) {
            container.classList.add('water-breathing');
        }
    });
    
    // Auto-shimmer effect for containers in view
    observeWaterContainersInView();
}

// Trigger water ripple effect
export function triggerWaterRipple(container, event = null) {
    // Remove any existing ripple
    container.classList.remove('water-ripple');
    
    // Force reflow
    container.offsetHeight;
    
    // Add ripple effect
    container.classList.add('water-ripple');
    
    // Create ripple element at click position
    if (event) {
        createWaterRippleElement(container, event);
    }
    
    // Remove ripple class after animation
    trackSetTimeout(() => {
        container.classList.remove('water-ripple');
    }, 600);
}

// Create visual ripple element at click position
function createWaterRippleElement(container, event) {
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const ripple = document.createElement('div');
    ripple.className = 'water-ripple-element';
    ripple.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: radial-gradient(circle, 
            rgba(176, 224, 230, 0.6) 0%,
            rgba(176, 224, 230, 0.3) 50%,
            transparent 100%);
        pointer-events: none;
        z-index: 10;
        animation: waterRippleSpread 0.6s ease-out forwards;
        transform: translate(-50%, -50%);
    `;
    
    // Add CSS animation keyframes if not already added
    if (!document.querySelector('#water-ripple-styles')) {
        const style = document.createElement('style');
        style.id = 'water-ripple-styles';
        style.textContent = `
            @keyframes waterRippleSpread {
                0% {
                    width: 0;
                    height: 0;
                    opacity: 0.8;
                }
                50% {
                    width: 100px;
                    height: 100px;
                    opacity: 0.4;
                }
                100% {
                    width: 200px;
                    height: 200px;
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    container.style.position = 'relative';
    container.appendChild(ripple);
    
    // Remove ripple element after animation
    trackSetTimeout(() => {
        if (ripple.parentNode) {
            ripple.parentNode.removeChild(ripple);
        }
    }, 600);
}

// Observe water containers for auto-shimmer when in view
function observeWaterContainersInView() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add subtle auto-shimmer for containers in view
                const container = entry.target;
                container.classList.add('water-in-view');
                
                // Random shimmer interval
                const shimmerInterval = trackSetInterval(() => {
                    if (Math.random() > 0.7) { // 30% chance every interval
                        triggerSubtleShimmer(container);
                    }
                }, 3000 + Math.random() * 2000); // 3-5 second intervals
                
                // Store interval ID on element for cleanup
                container._shimmerInterval = shimmerInterval;
            } else {
                // Remove auto-shimmer when out of view
                const container = entry.target;
                container.classList.remove('water-in-view');
                
                if (container._shimmerInterval) {
                    clearInterval(container._shimmerInterval);
                    delete container._shimmerInterval;
                }
            }
        });
    }, { threshold: 0.2 });
    
    document.querySelectorAll('.water-cosmic-container').forEach(container => {
        observer.observe(container);
    });
}

// Trigger subtle shimmer effect
function triggerSubtleShimmer(container) {
    const shimmer = document.createElement('div');
    shimmer.className = 'water-subtle-shimmer';
    shimmer.style.cssText = `
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, 
            transparent 0%,
            rgba(176, 224, 230, 0.15) 50%,
            transparent 100%);
        pointer-events: none;
        z-index: 1;
        animation: waterShimmerPass 2s ease-in-out forwards;
    `;
    
    // Add shimmer animation if not already added
    if (!document.querySelector('#water-shimmer-styles')) {
        const style = document.createElement('style');
        style.id = 'water-shimmer-styles';
        style.textContent = `
            @keyframes waterShimmerPass {
                0% {
                    left: -100%;
                    opacity: 0;
                }
                50% {
                    left: 0%;
                    opacity: 1;
                }
                100% {
                    left: 100%;
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    container.appendChild(shimmer);
    
    // Remove shimmer after animation
    trackSetTimeout(() => {
        if (shimmer.parentNode) {
            shimmer.parentNode.removeChild(shimmer);
        }
    }, 2000);
}

// Enhanced focus effects for water containers
export function triggerWaterContainerFocus(container) {
    container.classList.add('water-focus-enhanced');
    
    // Add light bloom effect
    const bloom = document.createElement('div');
    bloom.className = 'water-light-bloom';
    bloom.style.cssText = `
        position: absolute;
        top: -10px;
        left: -10px;
        right: -10px;
        bottom: -10px;
        background: radial-gradient(circle, 
            rgba(176, 224, 230, 0.1) 0%,
            transparent 70%);
        border-radius: inherit;
        pointer-events: none;
        z-index: -1;
        animation: waterBloomPulse 2s ease-in-out infinite;
    `;
    
    // Add bloom animation
    if (!document.querySelector('#water-bloom-styles')) {
        const style = document.createElement('style');
        style.id = 'water-bloom-styles';
        style.textContent = `
            @keyframes waterBloomPulse {
                0%, 100% {
                    opacity: 0.5;
                    transform: scale(1);
                }
                50% {
                    opacity: 0.8;
                    transform: scale(1.05);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    container.style.position = 'relative';
    container.appendChild(bloom);
    
    // Store bloom element for cleanup
    container._lightBloom = bloom;
}

// Remove water container focus effects
export function removeWaterContainerFocus(container) {
    container.classList.remove('water-focus-enhanced');
    
    if (container._lightBloom && container._lightBloom.parentNode) {
        container._lightBloom.parentNode.removeChild(container._lightBloom);
        delete container._lightBloom;
    }
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
    
    // Cleanup water effects
    cleanupWaterEffects();
    
    activeEffects.clear();
    
    // Cleanup water effects
    cleanupWaterEffects();
}

// Cleanup water effects
export function cleanupWaterEffects() {
    document.querySelectorAll('.water-cosmic-container').forEach(container => {
        // Clear shimmer intervals
        if (container._shimmerInterval) {
            clearInterval(container._shimmerInterval);
            delete container._shimmerInterval;
        }
        
        // Remove light bloom elements
        if (container._lightBloom && container._lightBloom.parentNode) {
            container._lightBloom.parentNode.removeChild(container._lightBloom);
            delete container._lightBloom;
        }
        
        // Remove all water effect classes
        container.classList.remove('water-ripple', 'water-parallax', 'water-in-view', 'water-focus-enhanced');
    });
    
    // Remove injected styles
    const stylesToRemove = [
        '#water-ripple-styles',
        '#water-shimmer-styles', 
        '#water-bloom-styles'
    ];
    
    stylesToRemove.forEach(selector => {
        const style = document.querySelector(selector);
        if (style) {
            style.remove();
        }
    });
}

// Enhanced interaction for specific containers
document.addEventListener('DOMContentLoaded', () => {
    // Auto-trigger water effects demonstration
    setTimeout(() => {
        const nav = document.querySelector('.nav.water-cosmic-container');
        if (nav) {
            triggerWaterRipple(nav);
        }
    }, 2000);
    
    // Enhanced focus container interactions
    const focusContent = document.querySelector('.focus-content.water-cosmic-container');
    if (focusContent) {
        focusContent.addEventListener('focus', () => {
            triggerWaterContainerFocus(focusContent);
        });
        
        focusContent.addEventListener('blur', () => {
            removeWaterContainerFocus(focusContent);
        });
    }
    
    // Enhanced timer controls interactions
    const timerControls = document.querySelector('.timer-controls.water-cosmic-container');
    if (timerControls) {
        const buttons = timerControls.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                triggerWaterRipple(timerControls);
            });
        });
    }
    
    // Enhanced settings interactions
    const settingsModal = document.querySelector('.settings-content.water-cosmic-container');
    if (settingsModal) {
        const settingSections = settingsModal.querySelectorAll('.settings-section.water-cosmic-container');
        settingSections.forEach(section => {
            section.addEventListener('mouseenter', () => {
                triggerSubtleShimmer(section);
            });
        });
    }
    
    // Enhanced ambient breathing sync
    const ambientContent = document.querySelector('.ambient-content.water-cosmic-container');
    if (ambientContent) {
        // Sync water breathing with breathing circle animation
        setInterval(() => {
            const breathingCircle = document.querySelector('.breathing-circle');
            if (breathingCircle && ambientContent.classList.contains('water-breathing')) {
                // Add extra shimmer during breathing cycle
                if (Math.random() > 0.6) {
                    triggerSubtleShimmer(ambientContent);
                }
            }
        }, 4000); // Every 4 seconds to sync with breathing
    }
});
