// blackhole.js
// Enhanced Black Hole System - Complete Fixed Babylon.js Implementation
// Creates spectacular cosmic phenomena with advanced particle systems and shaders

import { scene } from './scene3d.js';
import { appState } from './state.js';

export let blackHoleSystem = {};
let shaderMaterials = [];
let energyParticles = [];
let gravitationalWaves = [];
let dustParticleSystem = null;
let lensingPlane = null;
let polarJetParticles = [];

export function createEnhancedBlackHole() {
    try {
        if (!scene) {
            console.error('Scene not available for black hole creation');
            return;
        }

        console.log('Creating enhanced black hole...');

        // Create a TransformNode to group all black hole elements
        const blackHoleGroup = new BABYLON.TransformNode("blackHoleGroup", scene);
        blackHoleGroup.position = new BABYLON.Vector3(0, 0, 0);

        // Create the event horizon (black hole core)
        const eventHorizon = BABYLON.MeshBuilder.CreateSphere("eventHorizon", {
            diameter: 8, 
            segments: 32
        }, scene);
        
        const eventHorizonMaterial = new BABYLON.StandardMaterial("eventHorizonMat", scene);
        eventHorizonMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        eventHorizonMaterial.emissiveColor = new BABYLON.Color3(0.05, 0, 0.1);
        eventHorizonMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        eventHorizon.material = eventHorizonMaterial;
        eventHorizon.parent = blackHoleGroup;
        
        console.log('Event horizon created');

        // Create accretion disk
        const accretionDisk = createAccretionDisk(blackHoleGroup);
        console.log('Accretion disk created');

        // Create gravitational lensing effects
        createGravitationalLensing(blackHoleGroup);
        console.log('Gravitational lensing created');

        // Create energy particles
        createEnergyParticles(blackHoleGroup);
        console.log('Energy particles created');

        // Store the black hole system
        blackHoleSystem = {
            group: blackHoleGroup,
            eventHorizon: eventHorizon,
            accretionDisk: accretionDisk,
            eventHorizonMaterial: eventHorizonMaterial
        };
        
        console.log('Black hole system created successfully');
        
    } catch (error) {
        console.error('Failed to create enhanced black hole:', error);
        console.error('Error stack:', error.stack);
        
        // Fallback: create a simple black sphere
        try {
            const fallback = BABYLON.MeshBuilder.CreateSphere("fallbackBlackHole", {diameter: 8}, scene);
            const fallbackMat = new BABYLON.StandardMaterial("fallbackBlackHoleMat", scene);
            fallbackMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.3);
            fallbackMat.emissiveColor = new BABYLON.Color3(0, 0, 0.2);
            fallback.material = fallbackMat;
            fallback.position = new BABYLON.Vector3(0, 0, 0);
            blackHoleSystem = { group: fallback, eventHorizon: fallback };
            console.log('Fallback black hole created');
        } catch (fallbackError) {
            console.error('Failed to create fallback black hole:', fallbackError);
        }
    }
}

// Create accretion disk with enhanced visuals
function createAccretionDisk(parentGroup) {
    const diskGroup = new BABYLON.TransformNode("diskGroup", scene);
    diskGroup.parent = parentGroup;
    
    // Create multiple torus rings for the accretion disk
    const ringCount = 3;
    const rings = [];
    
    for (let i = 0; i < ringCount; i++) {
        const ring = BABYLON.MeshBuilder.CreateTorus(`accretionRing${i}`, {
            diameter: 20 + i * 8,
            thickness: 2 + i * 0.5,
            tessellation: 64
        }, scene);
        
        ring.rotation.x = Math.PI / 2;
        
        const ringMaterial = new BABYLON.StandardMaterial(`ringMat${i}`, scene);
        
        // Inner rings are hotter (bluer), outer rings cooler (redder)
        const heatFactor = 1 - (i / ringCount);
        ringMaterial.diffuseColor = new BABYLON.Color3(
            1 - heatFactor * 0.3,
            0.5 - heatFactor * 0.2,
            heatFactor * 0.8
        );
        ringMaterial.emissiveColor = new BABYLON.Color3(
            0.8 - heatFactor * 0.3,
            0.3 - heatFactor * 0.1,
            heatFactor * 0.5
        );
        ringMaterial.specularColor = new BABYLON.Color3(1, 0.8, 0.6);
        ringMaterial.specularPower = 64;
        ringMaterial.alpha = 0.9 - i * 0.2;
        
        ring.material = ringMaterial;
        ring.parent = diskGroup;
        
        // Store for animation
        ring.metadata = {
            baseRotationSpeed: 0.02 - i * 0.005,
            index: i
        };
        
        rings.push(ring);
    }
    
    // Add dust particles around the disk
    const dustSystem = new BABYLON.ParticleSystem("diskDust", 1000, scene);
    dustSystem.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="8" fill="rgba(255,200,100,0.8)" />
        </svg>
    `), scene);
    
    dustSystem.emitter = diskGroup;
    dustSystem.createConeEmitter(15, 0.5);
    
    dustSystem.color1 = new BABYLON.Color4(1, 0.8, 0.4, 0.8);
    dustSystem.color2 = new BABYLON.Color4(0.8, 0.4, 0.2, 0.6);
    dustSystem.colorDead = new BABYLON.Color4(0.5, 0.2, 0.1, 0);
    
    dustSystem.minSize = 0.5;
    dustSystem.maxSize = 2;
    dustSystem.minLifeTime = 5;
    dustSystem.maxLifeTime = 15;
    dustSystem.emitRate = 50;
    
    dustSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
    dustSystem.gravity = new BABYLON.Vector3(0, 0, 0);
    dustSystem.direction1 = new BABYLON.Vector3(-1, 0, -1);
    dustSystem.direction2 = new BABYLON.Vector3(1, 0, 1);
    dustSystem.minEmitPower = 0.1;
    dustSystem.maxEmitPower = 0.3;
    
    dustSystem.start();
    dustParticleSystem = dustSystem;
    
    return diskGroup;
}

// Create gravitational lensing effect rings
function createGravitationalLensing(parentGroup) {
    const lensingGroup = new BABYLON.TransformNode("lensingGroup", scene);
    lensingGroup.parent = parentGroup;
    
    // Create multiple lensing rings
    for (let i = 0; i < 5; i++) {
        const radius = 15 + i * 5;
        const ring = BABYLON.MeshBuilder.CreateTorus(`lensingRing${i}`, {
            diameter: radius * 2,
            thickness: 1.5 + i * 0.3,
            tessellation: 64
        }, scene);
        
        ring.rotation.x = Math.PI / 2;
        
        const ringMaterial = new BABYLON.StandardMaterial(`lensingMat${i}`, scene);
        ringMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.8);
        ringMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.6);
        ringMaterial.specularColor = new BABYLON.Color3(0.5, 0.5, 1);
        ringMaterial.alpha = 0.3 - i * 0.05;
        ringMaterial.backFaceCulling = false;
        
        ring.material = ringMaterial;
        ring.parent = lensingGroup;
        
        // Store for animation
        ring.metadata = {
            radius: radius,
            speed: 0.001 + i * 0.0002,
            phase: i * Math.PI / 3
        };
        
        gravitationalWaves.push(ring);
        shaderMaterials.push(ringMaterial);
    }
}

// Create energy particles
function createEnergyParticles(parentGroup) {
    const particleCount = 300;
    const energyParticleSystem = new BABYLON.ParticleSystem("energyParticles", particleCount, scene);
    
    // Create particle texture
    energyParticleSystem.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <defs>
                <radialGradient id="energyGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:#FFAA00;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#FFAA00;stop-opacity:0" />
                </radialGradient>
            </defs>
            <circle cx="12" cy="12" r="12" fill="url(#energyGrad)" />
        </svg>
    `), scene);
    
    // Setup emitter
    energyParticleSystem.emitter = parentGroup;
    energyParticleSystem.createSphereEmitter(20);
    
    // Particle properties
    energyParticleSystem.color1 = new BABYLON.Color4(1.0, 0.5, 0.0, 1.0);
    energyParticleSystem.color2 = new BABYLON.Color4(1.0, 1.0, 0.0, 1.0);
    energyParticleSystem.colorDead = new BABYLON.Color4(1.0, 0.0, 0.0, 0.0);
    
    energyParticleSystem.minSize = 1.0;
    energyParticleSystem.maxSize = 3.0;
    energyParticleSystem.minLifeTime = 5.0;
    energyParticleSystem.maxLifeTime = 15.0;
    
    energyParticleSystem.emitRate = 30;
    energyParticleSystem.direction1 = new BABYLON.Vector3(-1, -1, -1);
    energyParticleSystem.direction2 = new BABYLON.Vector3(1, 1, 1);
    energyParticleSystem.minEmitPower = 0.05;
    energyParticleSystem.maxEmitPower = 0.15;
    
    energyParticleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
    energyParticleSystem.start();
    
    energyParticles.push(energyParticleSystem);
}

// Update black hole effects animation
export function updateBlackHoleEffects() {
    const time = performance.now() * 0.001;
    
    // Get current theme
    const theme = document.body.getAttribute('data-theme');
    const isLightTheme = theme === 'light';
    const isCosmosTheme = theme === 'cosmos';
    
    // Rotate the entire black hole system
    if (blackHoleSystem.group) {
        const completedTasks = appState.tasks ? appState.tasks.filter(task => task.completed).length : 0;
        const baseSpeed = 0.001;
        const bonusSpeed = completedTasks * 0.0002;
        const rotationSpeed = baseSpeed + bonusSpeed;
        
        blackHoleSystem.group.rotation.y += rotationSpeed;
    }
    
    // Animate accretion disk
    if (blackHoleSystem.accretionDisk) {
        const rings = blackHoleSystem.accretionDisk.getChildren();
        rings.forEach(ring => {
            if (ring.metadata && ring.metadata.baseRotationSpeed) {
                ring.rotation.z += ring.metadata.baseRotationSpeed;
                
                // Pulsing effect
                const pulseFactor = 1 + Math.sin(time * 2 + ring.metadata.index) * 0.05;
                ring.scaling.setAll(pulseFactor);
            }
        });
    }
    
    // Animate gravitational waves
    gravitationalWaves.forEach((wave, index) => {
        if (wave.metadata) {
            // Radial pulsing
            const pulseFactor = 1 + Math.sin(time * wave.metadata.speed * 100 + wave.metadata.phase) * 0.03;
            wave.scaling.setAll(pulseFactor);
            
            // Gentle rotation
            wave.rotation.z += wave.metadata.speed;
            
            // Opacity fluctuation based on focus mode
            if (wave.material) {
                const baseAlpha = 0.3 - index * 0.05;
                const focusBonus = appState.currentMode === 'focus' ? 0.1 : 0;
                wave.material.alpha = baseAlpha + focusBonus + Math.sin(time + index) * 0.05;
            }
        }
    });
    
    // Update material properties based on theme
    if (blackHoleSystem.eventHorizonMaterial) {
        if (isLightTheme) {
            blackHoleSystem.eventHorizonMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.05, 0.2);
        } else if (isCosmosTheme) {
            blackHoleSystem.eventHorizonMaterial.emissiveColor = new BABYLON.Color3(0.1, 0, 0.15);
        } else {
            blackHoleSystem.eventHorizonMaterial.emissiveColor = new BABYLON.Color3(0.05, 0, 0.1);
        }
    }
    
    // Update particle systems based on app state
    energyParticles.forEach(system => {
        if (appState.currentMode === 'focus') {
            system.emitRate = 50; // Increase emission in focus mode
        } else {
            system.emitRate = 30;
        }
    });
}

// Trigger focus intensification effect
export function triggerFocusIntensification() {
    // This is handled smoothly in updateBlackHoleEffects
    console.log('Focus mode intensification triggered');
}

// Clean up function
export function disposeBlackHole() {
    if (blackHoleSystem.group) {
        blackHoleSystem.group.dispose();
    }
    
    energyParticles.forEach(system => system.dispose());
    if (dustParticleSystem) dustParticleSystem.dispose();
    
    energyParticles = [];
    gravitationalWaves = [];
    shaderMaterials = [];
}