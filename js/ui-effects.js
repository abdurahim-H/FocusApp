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
    
    // Add cosmic particles around achievement
    const particleContainer = document.createElement('div');
    particleContainer.className = 'achievement-particles';
    achievementElement.appendChild(particleContainer);
    
    // Create particle effects based on achievement type
    const particleCount = type === 'milestone' ? 20 : 10;
    const colors = {
        task: ['#06d6a0', '#7209b7', '#560bad'],
        milestone: ['#f72585', '#b5179e', '#7209b7'],
        session: ['#4cc9f0', '#4361ee', '#3f37c9']
    };
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('span');
        particle.className = 'cosmic-particle';
        
        // Random positioning around the achievement
        const angle = (Math.PI * 2 * i) / particleCount;
        const distance = 50 + Math.random() * 50;
        particle.style.setProperty('--start-x', `${Math.cos(angle) * distance}px`);
        particle.style.setProperty('--start-y', `${Math.sin(angle) * distance}px`);
        particle.style.setProperty('--end-x', `${Math.cos(angle) * distance * 2}px`);
        particle.style.setProperty('--end-y', `${Math.sin(angle) * distance * 2}px`);
        
        // Random color from palette
        const colorPalette = colors[type] || colors.task;
        particle.style.backgroundColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        
        // Random animation delay
        particle.style.animationDelay = `${Math.random() * 0.5}s`;
        
        particleContainer.appendChild(particle);
    }
    
    // Add glow effect
    achievementElement.classList.add('achievement-enhanced', `achievement-${type}`);
    
    // Trigger 3D scene celebration if available
    if (window.scene && type === 'milestone') {
        triggerSceneCelebration();
    }
    
    // Clean up particles after animation
    trackSetTimeout(() => {
        particleContainer.remove();
        achievementElement.classList.remove('achievement-enhanced', `achievement-${type}`);
    }, 3000);
}

// Trigger celebration in 3D scene
function triggerSceneCelebration() {
    if (!window.scene || !window.BABYLON) return;
    
    // Create fireworks particle system
    const fireworks = new BABYLON.ParticleSystem("fireworks", 500, window.scene);
    fireworks.particleTexture = new BABYLON.Texture("https://raw.githubusercontent.com/BabylonJS/Babylon.js/master/assets/textures/flare.png", window.scene);
    
    // Emitter at center
    fireworks.emitter = new BABYLON.Vector3(0, 10, 0);
    
    // Particle properties
    fireworks.minEmitBox = new BABYLON.Vector3(-1, 0, -1);
    fireworks.maxEmitBox = new BABYLON.Vector3(1, 0, 1);
    
    fireworks.color1 = new BABYLON.Color4(1, 0.5, 0, 1);
    fireworks.color2 = new BABYLON.Color4(1, 0, 1, 1);
    fireworks.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    
    fireworks.minSize = 0.5;
    fireworks.maxSize = 1.5;
    
    fireworks.minLifeTime = 0.5;
    fireworks.maxLifeTime = 1.5;
    
    fireworks.emitRate = 200;
    
    fireworks.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
    
    fireworks.gravity = new BABYLON.Vector3(0, -9.81, 0);
    
    fireworks.direction1 = new BABYLON.Vector3(-2, 8, -2);
    fireworks.direction2 = new BABYLON.Vector3(2, 8, 2);
    
    fireworks.minAngularSpeed = 0;
    fireworks.maxAngularSpeed = Math.PI;
    
    fireworks.minEmitPower = 10;
    fireworks.maxEmitPower = 20;
    
    fireworks.start();
    
    // Stop after burst
    trackSetTimeout(() => {
        fireworks.stop();
        trackSetTimeout(() => fireworks.dispose(), 2000);
    }, 200);
}

// Enhanced space warp effect for mode transitions
export function triggerSpaceWarp(fromMode, toMode) {
    const container = document.querySelector('.container');
    const body = document.body;
    
    // Add warp class
    body.classList.add('space-warping');
    container.classList.add('warp-transition', `from-${fromMode}`, `to-${toMode}`);
    
    // Create warp lines
    const warpContainer = document.createElement('div');
    warpContainer.className = 'warp-lines-container';
    body.appendChild(warpContainer);
    
    // Generate warp lines
    for (let i = 0; i < 50; i++) {
        const line = document.createElement('div');
        line.className = 'warp-line';
        line.style.left = `${Math.random() * 100}%`;
        line.style.top = `${Math.random() * 100}%`;
        line.style.animationDelay = `${Math.random() * 0.3}s`;
        line.style.animationDuration = `${0.5 + Math.random() * 0.5}s`;
        warpContainer.appendChild(line);
    }
    
    // Clean up after animation
    trackSetTimeout(() => {
        body.classList.remove('space-warping');
        container.classList.remove('warp-transition', `from-${fromMode}`, `to-${toMode}`);
        warpContainer.remove();
    }, 1000);
}

// Initialize UI effects system
export function initUIEffects() {
    // Add CSS for new effects
    const style = document.createElement('style');
    style.textContent = `
        .achievement-particles {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: -1;
        }
        
        .cosmic-particle {
            position: absolute;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            animation: particleBurst 3s ease-out forwards;
        }
        
        @keyframes particleBurst {
            0% {
                transform: translate(0, 0) scale(0);
                opacity: 1;
            }
            50% {
                opacity: 1;
            }
            100% {
                transform: translate(var(--end-x), var(--end-y)) scale(0);
                opacity: 0;
            }
        }
        
        .achievement-enhanced {
            animation: achievementGlow 3s ease-out;
        }
        
        @keyframes achievementGlow {
            0%, 100% {
                box-shadow: 0 8px 32px var(--shadow);
            }
            50% {
                box-shadow: 0 8px 32px var(--shadow),
                            0 0 50px rgba(99, 102, 241, 0.5),
                            inset 0 0 20px rgba(99, 102, 241, 0.1);
            }
        }
        
        .space-warping {
            perspective: 1000px;
            overflow: hidden;
        }
        
        .warp-transition {
            animation: warpEffect 1s ease-in-out;
        }
        
        @keyframes warpEffect {
            0% {
                transform: translateZ(0) scale(1);
                filter: blur(0);
            }
            50% {
                transform: translateZ(-500px) scale(0.8);
                filter: blur(5px);
            }
            100% {
                transform: translateZ(0) scale(1);
                filter: blur(0);
            }
        }
        
        .warp-lines-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9998;
            pointer-events: none;
            overflow: hidden;
        }
        
        .warp-line {
            position: absolute;
            width: 2px;
            height: 100px;
            background: linear-gradient(to bottom, transparent, white, transparent);
            transform-origin: center;
            animation: warpLineMove linear forwards;
        }
        
        @keyframes warpLineMove {
            0% {
                transform: translateY(-100vh) scaleY(1);
                opacity: 0;
            }
            50% {
                opacity: 1;
            }
            100% {
                transform: translateY(100vh) scaleY(3);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    console.log('✨ UI Effects initialized');
}
