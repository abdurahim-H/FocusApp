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

        // Create central energy column
        createCentralEnergyColumn(blackHoleGroup);
        console.log('Central energy column created');

        // Create enhanced orbital rings
        createEnhancedOrbitalRings(blackHoleGroup);
        console.log('Enhanced orbital rings created');

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

// Create spectacular central energy column
function createCentralEnergyColumn(parentGroup) {
    const columnGroup = new BABYLON.TransformNode("energyColumnGroup", scene);
    columnGroup.parent = parentGroup;
    
    // Main energy beam
    const energyBeam = BABYLON.MeshBuilder.CreateCylinder("energyBeam", {
        height: 200,
        diameterTop: 0.5,
        diameterBottom: 3,
        tessellation: 32
    }, scene);
    
    const beamMaterial = new BABYLON.StandardMaterial("energyBeamMat", scene);
    beamMaterial.diffuseColor = new BABYLON.Color3(0.4, 1, 1);
    beamMaterial.emissiveColor = new BABYLON.Color3(0.6, 1, 1);
    beamMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
    beamMaterial.alpha = 0.8;
    beamMaterial.backFaceCulling = false;
    
    energyBeam.material = beamMaterial;
    energyBeam.parent = columnGroup;
    
    // Energy column particle system
    const columnParticles = new BABYLON.ParticleSystem("columnParticles", 500, scene);
    columnParticles.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
            <defs>
                <radialGradient id="columnGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:#98fff6;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#ffffff;stop-opacity:0.8" />
                    <stop offset="100%" style="stop-color:#7dfcf7;stop-opacity:0" />
                </radialGradient>
            </defs>
            <circle cx="16" cy="16" r="16" fill="url(#columnGrad)" />
        </svg>
    `), scene);
    
    columnParticles.emitter = energyBeam;
    columnParticles.createCylinderEmitter(1, 100, 1, 0);
    
    columnParticles.color1 = new BABYLON.Color4(0.6, 1, 0.95, 1);
    columnParticles.color2 = new BABYLON.Color4(1, 1, 1, 1);
    columnParticles.colorDead = new BABYLON.Color4(0.4, 0.8, 1, 0);
    
    columnParticles.minSize = 0.5;
    columnParticles.maxSize = 2.5;
    columnParticles.minLifeTime = 2;
    columnParticles.maxLifeTime = 8;
    columnParticles.emitRate = 100;
    
    columnParticles.direction1 = new BABYLON.Vector3(0, 1, 0);
    columnParticles.direction2 = new BABYLON.Vector3(0, 1, 0);
    columnParticles.minEmitPower = 5;
    columnParticles.maxEmitPower = 15;
    columnParticles.gravity = new BABYLON.Vector3(0, -2, 0);
    
    columnParticles.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    columnParticles.start();
    
    // Store for animation
    energyBeam.userData = {
        baseIntensity: 0.6,
        pulseSpeed: 0.02,
        columnParticles: columnParticles
    };
    
    energyParticles.push(columnParticles);
    
    // Add glow rings around the column
    for (let i = 0; i < 5; i++) {
        const glowRing = BABYLON.MeshBuilder.CreateTorus(`glowRing${i}`, {
            diameter: 8 + i * 4,
            thickness: 0.5,
            tessellation: 32
        }, scene);
        
        glowRing.position.y = -20 + i * 20;
        
        const ringMat = new BABYLON.StandardMaterial(`glowRingMat${i}`, scene);
        ringMat.diffuseColor = new BABYLON.Color3(0.2, 0.8, 1);
        ringMat.emissiveColor = new BABYLON.Color3(0.4, 1, 1);
        ringMat.alpha = 0.6 - i * 0.1;
        ringMat.backFaceCulling = false;
        
        glowRing.material = ringMat;
        glowRing.parent = columnGroup;
        
        glowRing.userData = {
            pulsePhase: i * Math.PI / 3,
            rotationSpeed: 0.01 + i * 0.002
        };
    }
}

// Create enhanced orbital rings system
function createEnhancedOrbitalRings(parentGroup) {
    const orbitalGroup = new BABYLON.TransformNode("orbitalRingsGroup", scene);
    orbitalGroup.parent = parentGroup;
    
    // Create three main orbital rings
    for (let i = 0; i < 3; i++) {
        const ringRadius = 35 + i * 15;
        const ring = BABYLON.MeshBuilder.CreateTorus(`orbitalRing${i}`, {
            diameter: ringRadius * 2,
            thickness: 3,
            tessellation: 128
        }, scene);
        
        // Apply orbital inclination and rotation
        ring.rotation.x = Math.PI / 2 + (i * 0.3);
        ring.rotation.z = -0.2 + (i * 0.1);
        
        const ringMaterial = new BABYLON.StandardMaterial(`orbitalRingMat${i}`, scene);
        ringMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.4, 1);
        ringMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.2, 0.8);
        ringMaterial.specularColor = new BABYLON.Color3(1, 0.8, 1);
        ringMaterial.alpha = 0.55;
        ringMaterial.backFaceCulling = false;
        
        ring.material = ringMaterial;
        ring.parent = orbitalGroup;
        
        // Animation data
        ring.userData = {
            baseRotationSpeed: 0.005 - i * 0.001,
            pulsePhase: i * Math.PI / 2,
            baseAlpha: 0.55,
            radius: ringRadius
        };
        
        gravitationalWaves.push(ring);
        
        // Add energy particles along the ring
        const ringParticles = new BABYLON.ParticleSystem(`ringParticles${i}`, 150, scene);
        ringParticles.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                <defs>
                    <radialGradient id="ringParticleGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" style="stop-color:#b26afc;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#b26afc;stop-opacity:0" />
                    </radialGradient>
                </defs>
                <circle cx="8" cy="8" r="8" fill="url(#ringParticleGrad)" />
            </svg>
        `), scene);
        
        ringParticles.emitter = ring;
        ringParticles.createSphereEmitter(ringRadius, 1);
        
        ringParticles.color1 = new BABYLON.Color4(0.7, 0.4, 1, 0.8);
        ringParticles.color2 = new BABYLON.Color4(1, 0.6, 1, 0.6);
        ringParticles.colorDead = new BABYLON.Color4(0.5, 0.2, 0.8, 0);
        
        ringParticles.minSize = 0.3;
        ringParticles.maxSize = 1.2;
        ringParticles.minLifeTime = 3;
        ringParticles.maxLifeTime = 8;
        ringParticles.emitRate = 20;
        
        ringParticles.direction1 = new BABYLON.Vector3(-0.1, -0.1, -0.1);
        ringParticles.direction2 = new BABYLON.Vector3(0.1, 0.1, 0.1);
        ringParticles.minEmitPower = 0.1;
        ringParticles.maxEmitPower = 0.3;
        
        ringParticles.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        ringParticles.start();
        
        energyParticles.push(ringParticles);
    }
}

// Enhanced black hole effects animation with spectacular energy dynamics
export function updateBlackHoleEffects() {
    const time = performance.now() * 0.001;
    
    // Get current theme and app state
    const theme = document.body.getAttribute('data-theme');
    const isLightTheme = theme === 'light';
    const isCosmosTheme = theme === 'cosmos';
    const isFocusMode = appState.currentMode === 'focus';
    
    // Rotate the entire black hole system with task completion boost
    if (blackHoleSystem.group) {
        const completedTasks = appState.tasks ? appState.tasks.filter(task => task.completed).length : 0;
        const baseSpeed = 0.001;
        const bonusSpeed = completedTasks * 0.0002;
        const focusBoost = isFocusMode ? 0.0005 : 0;
        const rotationSpeed = baseSpeed + bonusSpeed + focusBoost;
        
        blackHoleSystem.group.rotation.y += rotationSpeed;
        
        // Add subtle wobble during focus mode
        if (isFocusMode) {
            const wobble = Math.sin(time * 0.5) * 0.02;
            blackHoleSystem.group.rotation.x = wobble;
            blackHoleSystem.group.rotation.z = Math.cos(time * 0.3) * 0.01;
        }
    }
    
    // Enhanced accretion disk animation
    if (blackHoleSystem.accretionDisk) {
        const rings = blackHoleSystem.accretionDisk.getChildren();
        rings.forEach(ring => {
            if (ring.metadata && ring.metadata.baseRotationSpeed) {
                // Differential rotation speed based on distance
                const speedMultiplier = isFocusMode ? 1.5 : 1;
                ring.rotation.z += ring.metadata.baseRotationSpeed * speedMultiplier;
                
                // Enhanced pulsing with heat variations
                const heatPulse = 1 + Math.sin(time * 3 + ring.metadata.index * 0.5) * 0.08;
                const focusPulse = isFocusMode ? 1 + Math.sin(time * 5) * 0.05 : 1;
                ring.scaling.setAll(heatPulse * focusPulse);
                
                // Dynamic material properties
                if (ring.material) {
                    const baseIntensity = 0.8 - ring.metadata.index * 0.3;
                    const variation = Math.sin(time * 2 + ring.metadata.index) * 0.2;
                    const focusBoost = isFocusMode ? 0.3 : 0;
                    
                    ring.material.emissiveColor = ring.material.emissiveColor.scale(baseIntensity + variation + focusBoost);
                }
            }
        });
    }
    
    // Animate central energy column
    const energyColumn = scene.getMeshByName("energyBeam");
    if (energyColumn && energyColumn.userData) {
        const data = energyColumn.userData;
        
        // Pulsing energy intensity
        const pulseIntensity = data.baseIntensity + Math.sin(time * data.pulseSpeed * 100) * 0.4;
        const focusIntensity = isFocusMode ? 1.5 : 1;
        
        if (energyColumn.material) {
            energyColumn.material.emissiveColor = new BABYLON.Color3(
                0.6 * pulseIntensity * focusIntensity,
                1 * pulseIntensity * focusIntensity,
                1 * pulseIntensity * focusIntensity
            );
            energyColumn.material.alpha = 0.8 + Math.sin(time * 0.5) * 0.2;
        }
        
        // Column particle emission rate based on app state
        if (data.columnParticles) {
            data.columnParticles.emitRate = isFocusMode ? 200 : 100;
        }
    }
    
    // Animate glow rings around energy column
    for (let i = 0; i < 5; i++) {
        const glowRing = scene.getMeshByName(`glowRing${i}`);
        if (glowRing && glowRing.userData) {
            const data = glowRing.userData;
            
            // Rotation
            glowRing.rotation.z += data.rotationSpeed;
            
            // Pulsing glow
            const pulse = 0.6 + Math.sin(time * 2 + data.pulsePhase) * 0.4;
            const focusGlow = isFocusMode ? 1.3 : 1;
            
            if (glowRing.material) {
                glowRing.material.alpha = pulse * focusGlow * (0.6 - i * 0.1);
                glowRing.material.emissiveColor = new BABYLON.Color3(
                    0.4 * pulse * focusGlow,
                    1 * pulse * focusGlow,
                    1 * pulse * focusGlow
                );
            }
        }
    }
    
    // Enhanced gravitational waves and orbital rings
    gravitationalWaves.forEach((wave, index) => {
        if (wave.metadata || wave.userData) {
            const data = wave.metadata || wave.userData;
            
            if (data.speed !== undefined) {
                // Original gravitational lensing rings
                const pulseFactor = 1 + Math.sin(time * data.speed * 100 + data.phase) * 0.03;
                wave.scaling.setAll(pulseFactor);
                wave.rotation.z += data.speed;
                
                if (wave.material) {
                    const baseAlpha = 0.3 - index * 0.05;
                    const focusBonus = isFocusMode ? 0.15 : 0;
                    wave.material.alpha = baseAlpha + focusBonus + Math.sin(time + index) * 0.05;
                }
            } else if (data.baseRotationSpeed !== undefined) {
                // Enhanced orbital rings
                const speedMultiplier = isFocusMode ? 1.2 : 1;
                wave.rotation.y += data.baseRotationSpeed * speedMultiplier;
                
                // Spectacular pulsing effects
                const mainPulse = 1 + Math.sin(time * 0.8 + data.pulsePhase) * 0.1;
                const fastPulse = 1 + Math.sin(time * 4 + data.pulsePhase) * 0.05;
                wave.scaling.setAll(mainPulse * fastPulse);
                
                // Dynamic opacity and glow
                if (wave.material) {
                    const baseAlpha = data.baseAlpha;
                    const pulseAlpha = Math.sin(time * 1.5 + data.pulsePhase) * 0.2;
                    const focusAlpha = isFocusMode ? 0.3 : 0;
                    
                    wave.material.alpha = baseAlpha + pulseAlpha + focusAlpha;
                    
                    // Enhanced glow during focus
                    const glowIntensity = isFocusMode ? 1.5 : 1;
                    wave.material.emissiveColor = new BABYLON.Color3(
                        0.5 * glowIntensity,
                        0.2 * glowIntensity,
                        0.8 * glowIntensity
                    );
                }
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
        
        // Subtle event horizon pulsing
        const horizonPulse = 0.05 + Math.sin(time * 0.3) * 0.03;
        blackHoleSystem.eventHorizonMaterial.emissiveColor = blackHoleSystem.eventHorizonMaterial.emissiveColor.scale(1 + horizonPulse);
    }
    
    // Update all energy particle systems
    energyParticles.forEach(system => {
        if (isFocusMode) {
            system.emitRate = Math.min(system.emitRate * 1.5, 200);
        } else {
            // Restore normal emission rates
            if (system.name && system.name.includes('energyParticles')) {
                system.emitRate = 30;
            } else if (system.name && system.name.includes('columnParticles')) {
                system.emitRate = 100;
            } else if (system.name && system.name.includes('ringParticles')) {
                system.emitRate = 20;
            }
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