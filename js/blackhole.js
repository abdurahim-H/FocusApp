// blackhole.js
// Re-architected Black Hole System - Authentic Cosmic Experience
// Creates a unified, meditative black hole environment with realistic physics

import { scene } from './scene3d.js';
import { appState } from './state.js';

export let blackHoleSystem = {};
let shaderMaterials        = [];
let energyParticles        = [];
let gravitationalWaves     = [];
let dustParticleSystem     = null;
let lensingPlane           = null;
let polarJetParticles      = [];
let jetEmissionTimer       = 0;

// Unified Color Triad - Deep Violet, Cyan, Ember Orange
const COLOR_PALETTE = {
    DEEP_VIOLET:     { r: 0.4, g: 0.2, b: 0.8 },
    CYAN:            { r: 0.2, g: 0.8, b: 1.0 },
    EMBER_ORANGE:    { r: 1.0, g: 0.4, b: 0.1 },
    DARK_NAVY:       { r: 0.05, g: 0.05, b: 0.2 },
    DESATURATED_BASE: 0.8
};

// Ring architecture constants - vertical orbital rings
const RING_CONFIG = {
    COUNT:                6,
    BASE_RADIUS:         10,    // Smaller rings
    RADIUS_INCREMENT:     4,    // Tighter spacing
    THICKNESS_OUTER_RATIO:0.12,
    THICKNESS_INNER_RATIO:0.06,
    TILT_RANGE:           0.35, // ±20° random tilt
    ROTATION_PERIOD:     [20,40],
    BASE_TILT_ANGLE:      0
};

// Orbital band configuration
const ORBITAL_BANDS = {
    INNER:  { distance: 20, color: [0.8,0.4,0.3], inclination: 0.2 },
    MIDDLE: { distance: 40, color: [0.6,0.7,0.9], inclination: 0.1 },
    OUTER:  { distance: 70, color: [0.7,0.8,0.9], inclination: 0.15 }
};

// Global holders
let orbitalBodies     = [];
let authenticRings    = [];
let accretionDisk     = null;
let eventHorizon      = null;

export function createEnhancedBlackHole() {
    if (!scene) {
        console.error('Scene not available for black hole creation');
        return;
    }

    console.log('▶ Creating enhanced black hole system…');

    const root = new BABYLON.TransformNode('blackHoleGroup', scene);
    root.position.set(0,0,0);

    createAuthenticBlackHole(root);
    console.log('✔ Centerpiece created');

    createMinimalistCosmicEnvironment(root);
    console.log('✔ Minimalist cosmic environment added');

    blackHoleSystem = {
        group: root,
        eventHorizon,
        accretionDisk,
        rings: [], // No rings in minimalist mode
        orbitalBodies: [] // No orbital bodies in minimalist mode
    };
    console.log('🏁 Black hole system ready');
}


// 1. Authentic Black Hole + Accretion Disk
function createAuthenticBlackHole(parent) {
    // Create a tilted container for the black hole system
    const blackHoleContainer = new BABYLON.TransformNode('blackHoleContainer', scene);
    blackHoleContainer.parent = parent;
    // Tilt to the right (around Z axis) and slightly forward (around X axis)
    blackHoleContainer.rotation.z = -Math.PI / 6; // 30 degrees right tilt
    blackHoleContainer.rotation.x = Math.PI / 12; // 15 degrees forward tilt
    
    // Event Horizon - Pure black sphere with realistic appearance
    eventHorizon = BABYLON.MeshBuilder.CreateSphere('eventHorizon', { diameter:12, segments:48 }, scene);
    const horMat = new BABYLON.StandardMaterial('eventHorizonMat', scene);
    horMat.diffuseColor = BABYLON.Color3.Black();
    horMat.emissiveColor = BABYLON.Color3.Black();
    horMat.specularColor = BABYLON.Color3.Black();
    horMat.ambientColor = BABYLON.Color3.Black();
    horMat.disableLighting = false; // Enable lighting for rim effect
    eventHorizon.material = horMat;
    eventHorizon.parent = blackHoleContainer;
    
    // Set rendering group for proper depth sorting
    eventHorizon.renderingGroupId = 2; // Middle layer - after accretion disk
    
    // Add realistic gravitational lensing glow
    const glowSphere = BABYLON.MeshBuilder.CreateSphere('eventHorizonGlow', { diameter:13.5, segments:48 }, scene);
    const glowMat = new BABYLON.StandardMaterial('glowMat', scene);
    glowMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
    glowMat.emissiveColor = new BABYLON.Color3(0.15, 0.08, 0.03); // Soft gravitational lensing glow
    glowMat.alpha = 0.4;
    glowMat.backFaceCulling = false;
    glowSphere.material = glowMat;
    glowSphere.parent = blackHoleContainer;
    
    // Set rendering group for proper depth sorting
    glowSphere.renderingGroupId = 1; // Behind black hole
    
    // Create the accretion disk with realistic physics
    createAccretionDisk(blackHoleContainer);
    
    // Add polar jets
    createPolarJets(blackHoleContainer);
}

// Create ethereal accretion disk using pure particle systems
function createAccretionDisk(parent) {
    const diskGroup = new BABYLON.TransformNode('accretionDiskGroup', scene);
    diskGroup.parent = parent;
    
    // Create main accretion disk as swirling particles
    const mainDisk = new BABYLON.ParticleSystem('accretionDiskMain', 2500, scene);
    mainDisk.particleTexture = new BABYLON.Texture(
        'data:image/svg+xml;base64,'+btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
              <defs>
                <radialGradient id="diskGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="white" stop-opacity="1"/>
                  <stop offset="30%" stop-color="yellow" stop-opacity="0.9"/>
                  <stop offset="70%" stop-color="orange" stop-opacity="0.6"/>
                  <stop offset="100%" stop-color="rgba(255,100,0,0)"/>
                </radialGradient>
              </defs>
              <circle cx="16" cy="16" r="16" fill="url(#diskGrad)"/>
            </svg>
        `),
        scene
    );
    
    mainDisk.emitter = diskGroup;
    mainDisk.createSphereEmitter(4, 0); // Smaller diameter - reduced from 6 to 4
    mainDisk.color1 = new BABYLON.Color4(1, 1, 1, 1);     // White-hot inner
    mainDisk.color2 = new BABYLON.Color4(1, 0.6, 0.2, 0.8); // Orange outer
    mainDisk.colorDead = new BABYLON.Color4(0.5, 0.1, 0, 0);
    mainDisk.minSize = 0.6; // Reduced from 0.8
    mainDisk.maxSize = 2.4; // Reduced from 3.2
    mainDisk.minLifeTime = Number.MAX_VALUE;
    mainDisk.maxLifeTime = Number.MAX_VALUE;
    mainDisk.emitRate = 400; // Increased from 200 for more particles
    mainDisk.gravity = BABYLON.Vector3.Zero();
    mainDisk.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    mainDisk.renderingGroupId = 1; // Behind black hole
    
    // Custom update function for spiral motion
    mainDisk.updateFunction = (particles) => {
        for (let p = 0; p < particles.length; p++) {
            const particle = particles[p];
            if (!particle) continue;
            
            const distance = Math.sqrt(particle.position.x * particle.position.x + particle.position.z * particle.position.z);
            
            // Spiral outward motion
            if (distance < 20) { // Reduced from 24 to 20
                const angle = Math.atan2(particle.position.z, particle.position.x) + (0.03 / Math.max(1, distance * 0.1));
                const newDistance = Math.min(20, distance + 0.1); // Reduced from 24 to 20
                particle.position.x = Math.cos(angle) * newDistance;
                particle.position.z = Math.sin(angle) * newDistance;
                
                // Keep particles in disk plane with slight variation
                particle.position.y = Math.sin(Date.now() * 0.001 + distance) * 0.5;
                
                // Temperature-based color evolution
                const temp = Math.max(0, 1 - distance / 17); // Adjusted from 20 to 17
                particle.color.r = 1;
                particle.color.g = 0.8 + temp * 0.2;
                particle.color.b = 0.2 + temp * 0.6;
                particle.color.a = 0.7 + temp * 0.3;
            }
        }
    };
    
    mainDisk.start();
    
    // Add animated matter streams
    createMatterStreams(diskGroup);
    
    // Store reference
    accretionDisk = {
        group: diskGroup,
        mainDisk: mainDisk
    };
}

// Create DNA-shaped spiral stream emerging from black hole center
function createPolarJets(parent) {
    const spiralGroup = new BABYLON.TransformNode('dnaSpiralGroup', scene);
    spiralGroup.parent = parent;
    
    // Tilt the entire DNA helix system
    spiralGroup.rotation.z = Math.PI / 5; // 36 degrees tilt to the right (increased from 22.5°)
    spiralGroup.rotation.x = Math.PI / 8; // 22.5 degrees forward tilt for depth (increased from 15°)
    
    // Create particle texture with cyan glow for helix effect
    const cyanTexture = new BABYLON.Texture(
        'data:image/svg+xml;base64,'+btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">
              <defs>
                <radialGradient id="cyanCore" cx="50%" cy="50%" r="30%">
                  <stop offset="0%" stop-color="white" stop-opacity="1"/>
                  <stop offset="50%" stop-color="#00ffff" stop-opacity="0.9"/>
                  <stop offset="100%" stop-color="rgba(0,255,255,0.4)"/>
                </radialGradient>
                <radialGradient id="cyanGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="rgba(0,255,255,0.4)"/>
                  <stop offset="40%" stop-color="rgba(0,200,200,0.3)"/>
                  <stop offset="80%" stop-color="rgba(0,150,150,0.2)"/>
                  <stop offset="100%" stop-color="rgba(0,100,100,0)"/>
                </radialGradient>
              </defs>
              <circle cx="10" cy="10" r="10" fill="url(#cyanGlow)"/>
              <circle cx="10" cy="10" r="6" fill="url(#cyanCore)"/>
              <circle cx="10" cy="10" r="2" fill="white" opacity="0.95"/>
            </svg>
        `),
        scene
    );
    
    // Create particle texture with ember orange glow
    const orangeTexture = new BABYLON.Texture(
        'data:image/svg+xml;base64,'+btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">
              <defs>
                <radialGradient id="orangeCore" cx="50%" cy="50%" r="30%">
                  <stop offset="0%" stop-color="white" stop-opacity="1"/>
                  <stop offset="50%" stop-color="#ff5e00" stop-opacity="0.9"/>
                  <stop offset="100%" stop-color="rgba(255,94,0,0.3)"/>
                </radialGradient>
                <radialGradient id="orangeGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="rgba(255,94,0,0.3)"/>
                  <stop offset="40%" stop-color="rgba(200,75,0,0.25)"/>
                  <stop offset="80%" stop-color="rgba(150,55,0,0.2)"/>
                  <stop offset="100%" stop-color="rgba(100,35,0,0)"/>
                </radialGradient>
              </defs>
              <circle cx="10" cy="10" r="10" fill="url(#orangeGlow)"/>
              <circle cx="10" cy="10" r="6" fill="url(#orangeCore)"/>
              <circle cx="10" cy="10" r="2" fill="white" opacity="0.95"/>
            </svg>
        `),
        scene
    );
    
    // Create first helix strand (cyan)
    const helixStrand1 = new BABYLON.ParticleSystem('dnaHelix1', 600, scene);
    helixStrand1.particleTexture = cyanTexture;
    helixStrand1.emitter = spiralGroup;
    helixStrand1.createPointEmitter(new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, 0, 0));
    
    helixStrand1.color1 = new BABYLON.Color4(0, 1, 1, 0.9);        // Bright cyan (#00ffff)
    helixStrand1.color2 = new BABYLON.Color4(0, 0.8, 0.8, 0.7);    // Darker cyan
    helixStrand1.colorDead = new BABYLON.Color4(0, 0.4, 0.4, 0);   // Faded cyan
    helixStrand1.minSize = 0.6;
    helixStrand1.maxSize = 1.8;
    helixStrand1.minLifeTime = Number.MAX_VALUE;
    helixStrand1.maxLifeTime = Number.MAX_VALUE;
    helixStrand1.emitRate = 120;
    helixStrand1.gravity = BABYLON.Vector3.Zero();
    helixStrand1.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    helixStrand1.renderingGroupId = 1;
    
    // Create second helix strand (ember orange - counter-rotating)
    const helixStrand2 = new BABYLON.ParticleSystem('dnaHelix2', 600, scene);
    helixStrand2.particleTexture = orangeTexture;
    helixStrand2.emitter = spiralGroup;
    helixStrand2.createPointEmitter(new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, 0, 0));
    
    helixStrand2.color1 = new BABYLON.Color4(1, 0.37, 0, 0.9);     // Bright ember orange (#ff5e00)
    helixStrand2.color2 = new BABYLON.Color4(0.8, 0.3, 0, 0.7);    // Darker ember orange
    helixStrand2.colorDead = new BABYLON.Color4(0.4, 0.15, 0, 0);  // Faded ember orange
    helixStrand2.minSize = 0.6;
    helixStrand2.maxSize = 1.8;
    helixStrand2.minLifeTime = Number.MAX_VALUE;
    helixStrand2.maxLifeTime = Number.MAX_VALUE;
    helixStrand2.emitRate = 120;
    helixStrand2.gravity = BABYLON.Vector3.Zero();
    helixStrand2.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    helixStrand2.renderingGroupId = 1;
    
    // Custom DNA helix motion for first strand - CONTINUOUS STREAM
    helixStrand1.updateFunction = (particles) => {
        for (let p = 0; p < particles.length; p++) {
            const particle = particles[p];
            if (!particle) continue;
            
            // Initialize particle if new - randomize start times to prevent batching
            if (!particle.userData) {
                particle.userData = {
                    age: Math.random() * 20, // Random starting position along the helix
                    basePhase: Math.random() * Math.PI * 2
                };
            }
            
            const data = particle.userData;
            data.age += 0.15; // Faster, more visible motion
            
            // Reset when particle reaches the top
            if (data.age > 20) {
                data.age = 0;
                data.basePhase = Math.random() * Math.PI * 2;
            }
            
            const height = data.age;
            const radius = 0.3 + (height * 0.15); // Start at radius 0.3, expand to 3.3
            const helixAngle = height * 0.8 + data.basePhase; // Tighter helix
            
            // Calculate helix position
            const x = Math.cos(helixAngle) * radius;
            const y = height;
            const z = Math.sin(helixAngle) * radius;
            
            // Apply manual tilt transformation
            const tiltX = Math.PI / 12; // 15 degrees forward
            const tiltZ = -Math.PI / 10; // 18 degrees left
            
            // Apply Z rotation (left tilt)
            const rotatedX = x * Math.cos(tiltZ) - y * Math.sin(tiltZ);
            const rotatedY = x * Math.sin(tiltZ) + y * Math.cos(tiltZ);
            
            // Apply X rotation (forward tilt)
            const finalX = rotatedX;
            const finalY = rotatedY * Math.cos(tiltX) - z * Math.sin(tiltX);
            const finalZ = rotatedY * Math.sin(tiltX) + z * Math.cos(tiltX);
            
            particle.position.x = finalX;
            particle.position.y = finalY;
            particle.position.z = finalZ;
            
            // Opacity fade
            const fadeStart = 15;
            particle.color.a = height > fadeStart ? 
                Math.max(0.1, 1 - (height - fadeStart) / 5) : 
                Math.min(0.9, height / 3);
        }
    };
    
    // Custom DNA helix motion for second strand - CONTINUOUS STREAM
    helixStrand2.updateFunction = (particles) => {
        for (let p = 0; p < particles.length; p++) {
            const particle = particles[p];
            if (!particle) continue;
            
            // Initialize particle if new - randomize start times to prevent batching
            if (!particle.userData) {
                particle.userData = {
                    age: Math.random() * 20, // Random starting position along the helix
                    basePhase: Math.random() * Math.PI * 2
                };
            }
            
            const data = particle.userData;
            data.age += 0.15; // Same motion as first strand
            
            // Reset when particle reaches the top
            if (data.age > 20) {
                data.age = 0;
                data.basePhase = Math.random() * Math.PI * 2;
            }
            
            const height = data.age;
            const radius = 0.3 + (height * 0.15); // Start at radius 0.3, expand to 3.3
            const helixAngle = -height * 0.8 + data.basePhase + Math.PI; // Counter-rotating, 180° offset
            
            // Calculate helix position
            const x = Math.cos(helixAngle) * radius;
            const y = height;
            const z = Math.sin(helixAngle) * radius;
            
            // Apply same manual tilt transformation
            const tiltX = Math.PI / 12; // 15 degrees forward
            const tiltZ = -Math.PI / 10; // 18 degrees left
            
            // Apply Z rotation (left tilt)
            const rotatedX = x * Math.cos(tiltZ) - y * Math.sin(tiltZ);
            const rotatedY = x * Math.sin(tiltZ) + y * Math.cos(tiltZ);
            
            // Apply X rotation (forward tilt)
            const finalX = rotatedX;
            const finalY = rotatedY * Math.cos(tiltX) - z * Math.sin(tiltX);
            const finalZ = rotatedY * Math.sin(tiltX) + z * Math.cos(tiltX);
            
            particle.position.x = finalX;
            particle.position.y = finalY;
            particle.position.z = finalZ;
            
            // Same opacity fade
            const fadeStart = 15;
            particle.color.a = height > fadeStart ? 
                Math.max(0.1, 1 - (height - fadeStart) / 5) : 
                Math.min(0.9, height / 3);
        }
    };
    
    // Create downward DNA helix strands
    const helixStrand3 = new BABYLON.ParticleSystem('dnaHelixDown1', 600, scene);
    helixStrand3.particleTexture = cyanTexture;
    helixStrand3.emitter = spiralGroup;
    helixStrand3.createPointEmitter(new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, 0, 0));
    
    helixStrand3.color1 = new BABYLON.Color4(0, 1, 1, 0.9);        // Bright cyan (#00ffff)
    helixStrand3.color2 = new BABYLON.Color4(0, 0.8, 0.8, 0.7);    // Darker cyan
    helixStrand3.colorDead = new BABYLON.Color4(0, 0.4, 0.4, 0);   // Faded cyan
    helixStrand3.minSize = 0.6;
    helixStrand3.maxSize = 1.8;
    helixStrand3.minLifeTime = Number.MAX_VALUE;
    helixStrand3.maxLifeTime = Number.MAX_VALUE;
    helixStrand3.emitRate = 120;
    helixStrand3.gravity = BABYLON.Vector3.Zero();
    helixStrand3.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    helixStrand3.renderingGroupId = 1;
    
    const helixStrand4 = new BABYLON.ParticleSystem('dnaHelixDown2', 600, scene);
    helixStrand4.particleTexture = orangeTexture;
    helixStrand4.emitter = spiralGroup;
    helixStrand4.createPointEmitter(new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, 0, 0));
    
    helixStrand4.color1 = new BABYLON.Color4(1, 0.37, 0, 0.9);     // Bright ember orange (#ff5e00)
    helixStrand4.color2 = new BABYLON.Color4(0.8, 0.3, 0, 0.7);    // Darker ember orange
    helixStrand4.colorDead = new BABYLON.Color4(0.4, 0.15, 0, 0);  // Faded ember orange
    helixStrand4.minSize = 0.6;
    helixStrand4.maxSize = 1.8;
    helixStrand4.minLifeTime = Number.MAX_VALUE;
    helixStrand4.maxLifeTime = Number.MAX_VALUE;
    helixStrand4.emitRate = 120;
    helixStrand4.gravity = BABYLON.Vector3.Zero();
    helixStrand4.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    helixStrand4.renderingGroupId = 1;
    
    // Downward helix motion for third strand
    helixStrand3.updateFunction = (particles) => {
        for (let p = 0; p < particles.length; p++) {
            const particle = particles[p];
            if (!particle) continue;
            
            // Initialize particle if new - randomize start times to prevent batching
            if (!particle.userData) {
                particle.userData = {
                    age: Math.random() * 20, // Random starting position along the helix
                    basePhase: Math.random() * Math.PI * 2
                };
            }
            
            const data = particle.userData;
            data.age += 0.15; // Same speed as upward strands
            
            // Reset when particle reaches the bottom
            if (data.age > 20) {
                data.age = 0;
                data.basePhase = Math.random() * Math.PI * 2;
            }
            
            const depth = data.age;
            const radius = 0.3 + (depth * 0.15); // Start at radius 0.3, expand to 3.3
            const helixAngle = depth * 0.8 + data.basePhase; // Same direction as first strand
            
            // Calculate downward helix position
            const x = Math.cos(helixAngle) * radius;
            const y = -depth; // Negative for downward
            const z = Math.sin(helixAngle) * radius;
            
            // Apply same manual tilt transformation
            const tiltX = Math.PI / 12; // 15 degrees forward
            const tiltZ = -Math.PI / 10; // 18 degrees left
            
            // Apply Z rotation (left tilt)
            const rotatedX = x * Math.cos(tiltZ) - y * Math.sin(tiltZ);
            const rotatedY = x * Math.sin(tiltZ) + y * Math.cos(tiltZ);
            
            // Apply X rotation (forward tilt)
            const finalX = rotatedX;
            const finalY = rotatedY * Math.cos(tiltX) - z * Math.sin(tiltX);
            const finalZ = rotatedY * Math.sin(tiltX) + z * Math.cos(tiltX);
            
            particle.position.x = finalX;
            particle.position.y = finalY;
            particle.position.z = finalZ;
            
            // Same opacity fade
            const fadeStart = 15;
            particle.color.a = depth > fadeStart ? 
                Math.max(0.1, 1 - (depth - fadeStart) / 5) : 
                Math.min(0.9, depth / 3);
        }
    };
    
    // Downward helix motion for fourth strand (counter-rotating)
    helixStrand4.updateFunction = (particles) => {
        for (let p = 0; p < particles.length; p++) {
            const particle = particles[p];
            if (!particle) continue;
            
            // Initialize particle if new - randomize start times to prevent batching
            if (!particle.userData) {
                particle.userData = {
                    age: Math.random() * 20, // Random starting position along the helix
                    basePhase: Math.random() * Math.PI * 2
                };
            }
            
            const data = particle.userData;
            data.age += 0.15; // Same speed as other strands
            
            // Reset when particle reaches the bottom
            if (data.age > 20) {
                data.age = 0;
                data.basePhase = Math.random() * Math.PI * 2;
            }
            
            const depth = data.age;
            const radius = 0.3 + (depth * 0.15); // Start at radius 0.3, expand to 3.3
            const helixAngle = -depth * 0.8 + data.basePhase + Math.PI; // Counter-rotating, 180° offset
            
            // Calculate downward helix position
            const x = Math.cos(helixAngle) * radius;
            const y = -depth; // Negative for downward
            const z = Math.sin(helixAngle) * radius;
            
            // Apply same manual tilt transformation
            const tiltX = Math.PI / 12; // 15 degrees forward
            const tiltZ = -Math.PI / 10; // 18 degrees left
            
            // Apply Z rotation (left tilt)
            const rotatedX = x * Math.cos(tiltZ) - y * Math.sin(tiltZ);
            const rotatedY = x * Math.sin(tiltZ) + y * Math.cos(tiltZ);
            
            // Apply X rotation (forward tilt)
            const finalX = rotatedX;
            const finalY = rotatedY * Math.cos(tiltX) - z * Math.sin(tiltX);
            const finalZ = rotatedY * Math.sin(tiltX) + z * Math.cos(tiltX);
            
            particle.position.x = finalX;
            particle.position.y = finalY;
            particle.position.z = finalZ;
            
            // Same opacity fade
            const fadeStart = 15;
            particle.color.a = depth > fadeStart ? 
                Math.max(0.1, 1 - (depth - fadeStart) / 5) : 
                Math.min(0.9, depth / 3);
        }
    };

    helixStrand1.start();
    helixStrand2.start();
    helixStrand3.start();
    helixStrand4.start();
    
    polarJetParticles.push(helixStrand1, helixStrand2, helixStrand3, helixStrand4);
}

// Create ethereal matter streams in the accretion disk
function createMatterStreams(parent) {
    const streamGroup = new BABYLON.TransformNode('matterStreamsGroup', scene);
    streamGroup.parent = parent;
    
    // Create spiraling matter streams - pure particle effects
    for (let i = 0; i < 2; i++) {
        const stream = new BABYLON.ParticleSystem(`matterStream_${i}`, 300, scene);
        stream.particleTexture = new BABYLON.Texture(
            'data:image/svg+xml;base64,'+btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                  <defs>
                    <radialGradient id="matterGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stop-color="white" stop-opacity="0.9"/>
                      <stop offset="40%" stop-color="yellow" stop-opacity="0.7"/>
                      <stop offset="80%" stop-color="orange" stop-opacity="0.3"/>
                      <stop offset="100%" stop-color="rgba(255,100,0,0)"/>
                    </radialGradient>
                  </defs>
                  <circle cx="8" cy="8" r="8" fill="url(#matterGrad)"/>
                </svg>
            `),
            scene
        );
        
        stream.emitter = streamGroup;
        stream.createSphereEmitter(12, 0.2); // Reduced from 15 to 12
        stream.color1 = new BABYLON.Color4(1, 0.9, 0.5, 0.8);
        stream.color2 = new BABYLON.Color4(1, 0.6, 0.2, 0.6);
        stream.colorDead = new BABYLON.Color4(0.8, 0.2, 0.1, 0);
        stream.minSize = 0.3; // Reduced from 0.4
        stream.maxSize = 1.4; // Reduced from 1.8
        stream.minLifeTime = Number.MAX_VALUE;
        stream.maxLifeTime = Number.MAX_VALUE;
        stream.emitRate = 50;
        stream.gravity = BABYLON.Vector3.Zero();
        stream.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        stream.renderingGroupId = 1;
        
        // Smooth spiral motion
        stream.updateFunction = (particles) => {
            for (let p = 0; p < particles.length; p++) {
                const particle = particles[p];
                if (!particle) continue;
                
                const distance = Math.sqrt(particle.position.x * particle.position.x + particle.position.z * particle.position.z);
                if (distance > 5 && distance < 20) { // Reduced from 6-25 to 5-20
                    const angle = Math.atan2(particle.position.z, particle.position.x) + (0.04 / Math.max(1, distance * 0.2));
                    particle.position.x = Math.cos(angle) * distance;
                    particle.position.z = Math.sin(angle) * distance;
                    
                    // Subtle vertical oscillation
                    particle.position.y = Math.sin(Date.now() * 0.002 + distance) * 1.5;
                }
            }
        };
        
        stream.start();
        energyParticles.push(stream);
    }
}


// 3. Beautiful 7-Planet System - Custom planetary configuration
function createBalancedOrbitals(parent) {
    const solarSystem = new BABYLON.TransformNode('solarSystem', scene);
    solarSystem.parent = parent;
    orbitalBodies = [];

    // Create central star
    createCentralStar(solarSystem);
    
    // Create 7 beautiful planets with unique characteristics
    const planetConfigs = [
        { 
            name: 'Crimson Mercury',
            distance: 22, 
            size: 0.5, 
            color: new BABYLON.Color3(0.9, 0.3, 0.2),    // Deep red
            emissive: new BABYLON.Color3(0.15, 0.05, 0.02),
            speed: 0.018,
            tilt: 15, // +15°
            hasRings: false,
            moons: 0
        },
        { 
            name: 'Golden Venus',
            distance: 32, 
            size: 0.8, 
            color: new BABYLON.Color3(1.0, 0.8, 0.4),    // Bright gold
            emissive: new BABYLON.Color3(0.18, 0.14, 0.08),
            speed: 0.014,
            tilt: -20, // -20°
            hasRings: false,
            moons: 1
        },
        { 
            name: 'Azure Earth',
            distance: 45, 
            size: 1.0, 
            color: new BABYLON.Color3(0.2, 0.5, 0.9),    // Earth blue
            emissive: new BABYLON.Color3(0.04, 0.1, 0.18),
            speed: 0.011,
            tilt: 12, // +12°
            hasRings: false,
            moons: 2
        },
        { 
            name: 'Rust Warrior',
            distance: 62, 
            size: 0.7, 
            color: new BABYLON.Color3(0.8, 0.4, 0.2),    // Mars rust
            emissive: new BABYLON.Color3(0.12, 0.06, 0.03),
            speed: 0.008,
            tilt: -8, // -8°
            hasRings: false,
            moons: 3
        },
        { 
            name: 'Titan Colossus',
            distance: 85, 
            size: 2.2, 
            color: new BABYLON.Color3(0.7, 0.6, 0.4),    // Jupiter tan
            emissive: new BABYLON.Color3(0.14, 0.12, 0.08),
            speed: 0.005,
            tilt: 25, // +25°
            hasRings: false,
            moons: 4
        },
        { 
            name: 'Ringed Beauty',
            distance: 115, 
            size: 1.9, 
            color: new BABYLON.Color3(0.9, 0.8, 0.6),    // Saturn gold
            emissive: new BABYLON.Color3(0.16, 0.14, 0.10),
            speed: 0.003,
            tilt: -15, // -15°
            hasRings: true, // The Saturn-like planet!
            moons: 3
        },
        { 
            name: 'Ice Neptune',
            distance: 145, 
            size: 1.6, 
            color: new BABYLON.Color3(0.3, 0.6, 0.9),    // Neptune blue
            emissive: new BABYLON.Color3(0.06, 0.12, 0.18),
            speed: 0.002,
            tilt: 18, // +18°
            hasRings: false,
            moons: 2
        }
    ];

    // Create each planet independently
    planetConfigs.forEach((config, index) => {
        createPlanet(solarSystem, config, index);
    });
    
    // Summary of created system
    const totalMoons = planetConfigs.reduce((sum, config) => sum + config.moons, 0);
    const ringedPlanets = planetConfigs.filter(config => config.hasRings).length;
    
    console.log(`✨ Created beautiful 7-planet system:`);
    console.log(`   🌍 ${planetConfigs.length} unique planets with different tilts`);
    console.log(`   🌙 ${totalMoons} moons orbiting their planets`);
    console.log(`   💍 ${ringedPlanets} planet(s) with ring systems`);
    console.log(`   ⭐ 1 central star`);
}

// Create central star
function createCentralStar(parent) {
    const star = BABYLON.MeshBuilder.CreateSphere('centralStar', { 
        diameter: 8, 
        segments: 32 
    }, scene);
    
    const starMaterial = new BABYLON.StandardMaterial('starMat', scene);
    starMaterial.diffuseColor = new BABYLON.Color3(1, 0.9, 0.7);
    starMaterial.emissiveColor = new BABYLON.Color3(1, 0.8, 0.4);
    starMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    
    star.material = starMaterial;
    star.parent = parent;
    star.position.set(0, 0, 0);
    star.renderingGroupId = 1;
    
    // Add star glow
    const starGlow = BABYLON.MeshBuilder.CreateSphere('starGlow', { 
        diameter: 12, 
        segments: 32 
    }, scene);
    
    const glowMaterial = new BABYLON.StandardMaterial('starGlowMat', scene);
    glowMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    glowMaterial.emissiveColor = new BABYLON.Color3(1, 0.7, 0.3);
    glowMaterial.alpha = 0.3;
    glowMaterial.backFaceCulling = false;
    
    starGlow.material = glowMaterial;
    starGlow.parent = parent;
    starGlow.position.set(0, 0, 0);
    starGlow.renderingGroupId = 1;
    
    // Store star data
    star.userData = {
        rotationSpeed: 0.02,
        pulseSpeed: 2.0,
        baseBrightness: 1.0
    };
    
    orbitalBodies.push(star, starGlow);
}

// Create individual planet with its own orbital system
function createPlanet(parent, config, planetIndex) {
    // Create orbital pivot for this planet
    const planetOrbit = new BABYLON.TransformNode(`${config.name}_orbit`, scene);
    planetOrbit.parent = parent;
    
    // Apply orbital inclination using the tilt property
    const tiltRadians = (config.tilt * Math.PI) / 180; // Convert degrees to radians
    planetOrbit.rotation.x = tiltRadians;
    planetOrbit.rotation.z = (Math.random() - 0.5) * 0.1; // Small random variation
    
    // Create planet
    const planet = BABYLON.MeshBuilder.CreateSphere(config.name, { 
        diameter: config.size * 2, 
        segments: 32 
    }, scene);
    
    // Enhanced planet material for better visuals
    const planetMaterial = new BABYLON.StandardMaterial(`${config.name}Mat`, scene);
    planetMaterial.diffuseColor = config.color;
    planetMaterial.emissiveColor = config.emissive;
    planetMaterial.specularColor = new BABYLON.Color3(0.4, 0.4, 0.4);
    planetMaterial.specularPower = 128; // More reflective
    
    // Add subtle texture variation
    if (config.size > 1.5) {
        // Gas giants - more reflective
        planetMaterial.specularPower = 256;
        planetMaterial.specularColor = new BABYLON.Color3(0.6, 0.6, 0.6);
    } else {
        // Rocky planets - less reflective
        planetMaterial.specularPower = 64;
        planetMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    }
    
    planet.material = planetMaterial;
    planet.parent = planetOrbit;
    planet.position.x = config.distance;
    planet.renderingGroupId = 1;
    
    // Planet animation data
    planet.userData = {
        orbitPivot: planetOrbit,
        distance: config.distance,
        angle: Math.random() * Math.PI * 2, // Random starting position
        orbitSpeed: config.speed,
        rotationSpeed: 0.015 + Math.random() * 0.01,
        baseEmission: config.emissive.clone(),
        planetIndex: planetIndex,
        tiltAngle: tiltRadians
    };
    
    orbitalBodies.push(planet);
    
    // Create ring system if specified
    if (config.hasRings) {
        createPlanetRings(planet, config);
    }
    
    // Create moons
    for (let m = 0; m < config.moons; m++) {
        createMoon(planet, config, m);
    }
}

// Create ring system for a planet
function createPlanetRings(planet, config) {
    const ringGroup = new BABYLON.TransformNode(`${config.name}_rings`, scene);
    ringGroup.parent = planet;
    
    // Create multiple ring layers for spectacular Saturn-like appearance
    const ringLayers = [
        { radius: config.size * 1.6, thickness: 0.08, alpha: 0.8, color: 1.0 },
        { radius: config.size * 1.9, thickness: 0.06, alpha: 0.6, color: 0.9 },
        { radius: config.size * 2.3, thickness: 0.05, alpha: 0.5, color: 0.8 },
        { radius: config.size * 2.7, thickness: 0.04, alpha: 0.4, color: 0.7 },
        { radius: config.size * 3.1, thickness: 0.03, alpha: 0.3, color: 0.6 }
    ];
    
    ringLayers.forEach((layer, index) => {
        const ring = BABYLON.MeshBuilder.CreateTorus(`${config.name}_ring_${index}`, {
            diameter: layer.radius * 2,
            thickness: layer.thickness,
            tessellation: 128 // Higher detail for smoother rings
        }, scene);
        
        const ringMaterial = new BABYLON.StandardMaterial(`${config.name}_ringMat_${index}`, scene);
        
        // Enhanced ring colors with subtle variations
        const ringColor = config.color.scale(layer.color);
        ringMaterial.diffuseColor = ringColor;
        ringMaterial.emissiveColor = config.emissive.scale(0.3 * layer.alpha);
        ringMaterial.alpha = layer.alpha;
        ringMaterial.backFaceCulling = false;
        ringMaterial.useAlphaFromDiffuseTexture = false;
        
        // Add subtle specular reflection for ice/rock particles
        ringMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        ringMaterial.specularPower = 64;
        
        ring.material = ringMaterial;
        ring.parent = ringGroup;
        ring.rotation.x = Math.PI / 2; // Make rings horizontal
        ring.renderingGroupId = 1;
        
        // Individual ring rotation at different speeds
        ring.userData = {
            rotationSpeed: 0.003 + Math.random() * 0.004 + (index * 0.001),
            layer: index,
            baseAlpha: layer.alpha
        };
        
        orbitalBodies.push(ring);
    });
    
    // Apply a dramatic tilt to the entire ring system
    const ringTilt = (Math.random() - 0.5) * 0.6; // ±34 degree tilt
    ringGroup.rotation.x = ringTilt;
    ringGroup.rotation.z = (Math.random() - 0.5) * 0.4; // Additional tilt variation
    
    console.log(`💍 Created beautiful ring system for ${config.name} with ${ringLayers.length} layers`);
}

// Create moon orbiting a planet
function createMoon(planet, planetConfig, moonIndex) {
    const moonOrbit = new BABYLON.TransformNode(`${planetConfig.name}_moon${moonIndex}_orbit`, scene);
    moonOrbit.parent = planet;
    
    // Calculate moon distance based on planet size and moon index
    const moonDistance = planetConfig.size * 2.5 + moonIndex * planetConfig.size * 1.2;
    const moonSize = planetConfig.size * (0.15 + Math.random() * 0.1); // Varied moon sizes
    
    const moon = BABYLON.MeshBuilder.CreateSphere(`${planetConfig.name}_moon${moonIndex}`, { 
        diameter: moonSize * 2, 
        segments: 16 
    }, scene);
    
    // Enhanced moon material with variety
    const moonMaterial = new BABYLON.StandardMaterial(`${planetConfig.name}_moonMat${moonIndex}`, scene);
    
    // Give moons different colors based on their planet
    const moonBaseColor = planetConfig.color.scale(0.6); // Darker than planet
    const colorVariation = new BABYLON.Color3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
    );
    
    moonMaterial.diffuseColor = moonBaseColor.add(colorVariation);
    moonMaterial.emissiveColor = planetConfig.emissive.scale(0.3); // Subtle glow
    moonMaterial.specularColor = new BABYLON.Color3(0.15, 0.15, 0.15);
    moonMaterial.specularPower = 32;
    
    moon.material = moonMaterial;
    moon.parent = moonOrbit;
    moon.position.x = moonDistance;
    moon.renderingGroupId = 1;
    
    // Give each moon a slight orbital tilt for visual variety
    moonOrbit.rotation.z = (Math.random() - 0.5) * 0.3; // ±17 degrees
    moonOrbit.rotation.x = (Math.random() - 0.5) * 0.2; // ±11 degrees
    
    // Moon animation data - ensuring proper orbital motion
    moon.userData = {
        orbitPivot: moonOrbit,
        distance: moonDistance,
        angle: Math.random() * Math.PI * 2, // Random starting position
        orbitSpeed: 0.025 + Math.random() * 0.02 + (moonIndex * 0.005), // Inner moons faster
        rotationSpeed: 0.008 + Math.random() * 0.01,
        moonIndex: moonIndex,
        parentPlanet: planetConfig.name
    };
    
    orbitalBodies.push(moon);
    
    console.log(`🌙 Created moon ${moonIndex + 1} for ${planetConfig.name} at distance ${moonDistance.toFixed(1)}`);
}

// Create beautiful asteroid belts around the black hole
function createAsteroidBelts(parent) {
    const beltGroup = new BABYLON.TransformNode('asteroidBelts', scene);
    beltGroup.parent = parent;
    
    // Create 3 different asteroid belts at various distances
    const beltConfigs = [
        { distance: 35, count: 40, size: [0.1, 0.3], color: new BABYLON.Color3(0.6, 0.5, 0.4) },
        { distance: 60, count: 60, size: [0.2, 0.5], color: new BABYLON.Color3(0.7, 0.6, 0.5) },
        { distance: 85, count: 80, size: [0.3, 0.8], color: new BABYLON.Color3(0.5, 0.4, 0.3) }
    ];
    
    beltConfigs.forEach((config, beltIndex) => {
        for (let i = 0; i < config.count; i++) {
            // Create irregular asteroid shape
            const baseSize = config.size[0] + Math.random() * (config.size[1] - config.size[0]);
            const asteroid = BABYLON.MeshBuilder.CreateSphere(`asteroid_${beltIndex}_${i}`, {
                diameter: baseSize * 2,
                segments: 8 + Math.floor(Math.random() * 8)
            }, scene);
            
            // Deform for irregular shape
            const positions = asteroid.getVerticesData(BABYLON.VertexBuffer.PositionKind);
            for (let j = 0; j < positions.length; j += 3) {
                positions[j] += (Math.random() - 0.5) * baseSize * 0.4;
                positions[j + 1] += (Math.random() - 0.5) * baseSize * 0.4;
                positions[j + 2] += (Math.random() - 0.5) * baseSize * 0.4;
            }
            asteroid.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
            asteroid.createNormals(false);
            
            // Enhanced asteroid material
            const asteroidMaterial = new BABYLON.StandardMaterial(`asteroidMat_${beltIndex}_${i}`, scene);
            asteroidMaterial.diffuseColor = config.color.add(new BABYLON.Color3(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2
            ));
            asteroidMaterial.emissiveColor = config.color.scale(0.05);
            asteroidMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            asteroidMaterial.specularPower = 32;
            asteroid.material = asteroidMaterial;
            asteroid.parent = beltGroup;
            
            // Position in belt with some variation
            const angle = (Math.PI * 2 * i) / config.count + (Math.random() - 0.5) * 0.3;
            const distance = config.distance + (Math.random() - 0.5) * 8;
            const height = (Math.random() - 0.5) * 4;
            
            asteroid.position.x = Math.cos(angle) * distance;
            asteroid.position.z = Math.sin(angle) * distance;
            asteroid.position.y = height;
            
            // Animation data for belt rotation
            asteroid.userData = {
                angle: angle,
                distance: distance,
                baseHeight: height,
                speed: 0.002 + Math.random() * 0.003,
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                wobblePhase: Math.random() * Math.PI * 2
            };
            
            // Set rendering group
            asteroid.renderingGroupId = 1;
            
            orbitalBodies.push(asteroid);
        }
    });
    
    console.log(`✨ Created beautiful asteroid belts`);
}


// 4. Cosmic Environment: Stars + Distant Galaxy
function createCosmicEnvironment(parent) {
    // Ambient background
    scene.ambientColor = new BABYLON.Color3(
        COLOR_PALETTE.DARK_NAVY.r*1.2,
        COLOR_PALETTE.DARK_NAVY.g*1.2,
        COLOR_PALETTE.DARK_NAVY.b*1.5
    );

    // Enhanced sparkling star field with multiple layers
    createEnhancedSparklingStars(parent);
    
    // Additional distant micro stars for depth
    createMicroStarField(parent);

    // Single secondary star for lighting/mood
    const secondaryStar = BABYLON.MeshBuilder.CreateSphere('secondaryStar', { diameter:6, segments:32 }, scene);
    secondaryStar.position.set(-80, 30, -150);
    secondaryStar.parent = parent;
    const secondaryMat = new BABYLON.StandardMaterial('secondaryStarMat', scene);
    secondaryMat.diffuseColor = new BABYLON.Color3(0.9, 0.7, 1);
    secondaryMat.emissiveColor = new BABYLON.Color3(0.6, 0.4, 0.8);
    secondaryMat.backFaceCulling = false;
    secondaryStar.material = secondaryMat;
    secondaryStar.userData = { rotationSpeed: 0.008, pulseSpeed: 1.5 };
    
    // Distant galaxy (much smaller and further)
    const galaxy = BABYLON.MeshBuilder.CreateSphere('distantGalaxy', { diameter:40, segments:32 }, scene);
    galaxy.position.set(120, 80, -300);
    galaxy.parent = parent;
    const galaxyMat = new BABYLON.StandardMaterial('galaxyMat', scene);
    galaxyMat.diffuseColor = new BABYLON.Color3(0.7, 0.8, 1);
    galaxyMat.emissiveColor = new BABYLON.Color3(0.4, 0.5, 0.7);
    galaxyMat.alpha = 0.6;
    galaxyMat.backFaceCulling = false;
    galaxy.material = galaxyMat;
    galaxy.userData = { rotationSpeed: 0.001 };
}


// Minimalist cosmic environment - only dust particles and sparkling stars
function createMinimalistCosmicEnvironment(parent) {
    // Ambient background for deep space
    scene.ambientColor = new BABYLON.Color3(
        COLOR_PALETTE.DARK_NAVY.r * 0.8,  // Darker for minimalist space
        COLOR_PALETTE.DARK_NAVY.g * 0.8,
        COLOR_PALETTE.DARK_NAVY.b * 1.2
    );

    // Enhanced sparkling star field with multiple layers (keep the dust particles)
    createEnhancedSparklingStars(parent);
    
    // Additional distant micro stars for depth (keep tiny background stars)
    createMicroStarField(parent);

}


// Enhanced sparkling star field with multiple layers
function createEnhancedSparklingStars(parentGroup) {
    // Main sparkly star layer
    const mainStars = new BABYLON.ParticleSystem('mainSparklingStars', 3000, scene);
    mainStars.particleTexture = new BABYLON.Texture(
        'data:image/svg+xml;base64,'+btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
              <defs>
                <radialGradient id="starCore" cx="50%" cy="50%" r="30%">
                  <stop offset="0%" stop-color="white" stop-opacity="1"/>
                  <stop offset="70%" stop-color="white" stop-opacity="0.8"/>
                  <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
                </radialGradient>
                <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="white" stop-opacity="0.6"/>
                  <stop offset="40%" stop-color="cyan" stop-opacity="0.3"/>
                  <stop offset="80%" stop-color="blue" stop-opacity="0.1"/>
                  <stop offset="100%" stop-color="rgba(0,0,255,0)"/>
                </radialGradient>
              </defs>
              <circle cx="8" cy="8" r="8" fill="url(#starGlow)"/>
              <circle cx="8" cy="8" r="3" fill="url(#starCore)"/>
              <circle cx="8" cy="8" r="1.5" fill="white" opacity="0.95"/>
            </svg>
        `),
        scene
    );
    
    mainStars.emitter = parentGroup;
    mainStars.createSphereEmitter(300, 1);
    mainStars.color1 = new BABYLON.Color4(1, 1, 1, 1);
    mainStars.color2 = new BABYLON.Color4(0.8, 0.9, 1, 0.8);
    mainStars.minSize = 0.2;
    mainStars.maxSize = 1.2;
    mainStars.minLifeTime = Number.MAX_VALUE;
    mainStars.maxLifeTime = Number.MAX_VALUE;
    mainStars.manualEmitCount = 3000;
    mainStars.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    
    // Set rendering group for background positioning
    mainStars.renderingGroupId = 0; // Background layer - renders first
    mainStars.start();
    
    // Add twinkling animation data
    setTimeout(() => {
        const particles = mainStars.particles;
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            if (!particle) continue;
            
            // Random stellar colors
            const starType = Math.random();
            if (starType < 0.6) {
                // White/blue stars
                particle.color = new BABYLON.Color4(
                    0.9 + Math.random() * 0.1,
                    0.9 + Math.random() * 0.1,
                    1,
                    0.8 + Math.random() * 0.2
                );
            } else if (starType < 0.8) {
                // Yellow stars
                particle.color = new BABYLON.Color4(
                    1,
                    0.9 + Math.random() * 0.1,
                    0.7 + Math.random() * 0.2,
                    0.8 + Math.random() * 0.2
                );
            } else {
                // Red stars
                particle.color = new BABYLON.Color4(
                    1,
                    0.6 + Math.random() * 0.3,
                    0.4 + Math.random() * 0.2,
                    0.7 + Math.random() * 0.2
                );
            }
            
            particle.userData = {
                baseSize: particle.size,
                twinkleSpeed: 2 + Math.random() * 4,
                twinklePhase: Math.random() * Math.PI * 2,
                baseAlpha: particle.color.a
            };
        }
    }, 100);
    
    energyParticles.push(mainStars);
    
    // Secondary distant star layer
    const distantStars = new BABYLON.ParticleSystem('distantSparklingStars', 2000, scene);
    distantStars.particleTexture = new BABYLON.Texture(
        'data:image/svg+xml;base64,'+btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8">
              <defs>
                <radialGradient id="distantStar" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="white" stop-opacity="0.9"/>
                  <stop offset="80%" stop-color="white" stop-opacity="0.3"/>
                  <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
                </radialGradient>
              </defs>
              <circle cx="4" cy="4" r="4" fill="url(#distantStar)"/>
            </svg>
        `),
        scene
    );
    
    distantStars.emitter = parentGroup;
    distantStars.createSphereEmitter(500, 1);
    distantStars.color1 = new BABYLON.Color4(1, 1, 1, 0.6);
    distantStars.color2 = new BABYLON.Color4(0.7, 0.8, 1, 0.4);
    distantStars.minSize = 0.1;
    distantStars.maxSize = 0.6;
    distantStars.minLifeTime = Number.MAX_VALUE;
    distantStars.maxLifeTime = Number.MAX_VALUE;
    distantStars.manualEmitCount = 2000;
    distantStars.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    
    // Set rendering group for background positioning
    distantStars.renderingGroupId = 0; // Background layer - renders first
    distantStars.start();
    
    setTimeout(() => {
        const particles = distantStars.particles;
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            if (!particle) continue;
            
            particle.userData = {
                baseSize: particle.size,
                twinkleSpeed: 1 + Math.random() * 2,
                twinklePhase: Math.random() * Math.PI * 2,
                baseAlpha: particle.color.a
            };
        }
    }, 150);
    
    energyParticles.push(distantStars);
}

// Create micro star field for background depth
function createMicroStarField(parentGroup) {
    const microStars = new BABYLON.ParticleSystem('microStars', 5000, scene);
    microStars.particleTexture = new BABYLON.Texture(
        'data:image/svg+xml;base64,'+btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="4" height="4">
              <circle cx="2" cy="2" r="2" fill="white" opacity="0.7"/>
            </svg>
        `),
        scene
    );
    
    microStars.emitter = parentGroup;
    microStars.createSphereEmitter(800, 1);
    microStars.color1 = new BABYLON.Color4(1, 1, 1, 0.4);
    microStars.color2 = new BABYLON.Color4(0.8, 0.9, 1, 0.2);
    microStars.minSize = 0.05;
    microStars.maxSize = 0.3;
    microStars.minLifeTime = Number.MAX_VALUE;
    microStars.maxLifeTime = Number.MAX_VALUE;
    microStars.manualEmitCount = 5000;
    microStars.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    
    // Set rendering group for background positioning
    microStars.renderingGroupId = 0; // Background layer - renders first
    microStars.start();
    
    setTimeout(() => {
        const particles = microStars.particles;
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            if (!particle) continue;
            
            particle.userData = {
                baseSize: particle.size,
                twinkleSpeed: 0.5 + Math.random() * 1,
                twinklePhase: Math.random() * Math.PI * 2,
                baseAlpha: particle.color.a
            };
        }
    }, 200);
    
    energyParticles.push(microStars);
}


// --- Dust Particle Emitters (replaces blue cylinder jets) ---
function createDustPlasmaEmitters(parentGroup) {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
          <defs>
            <radialGradient id="dustGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" style="stop-color:rgba(200,200,255,0.9)"/>
              <stop offset="60%" style="stop-color:rgba(100,100,200,0.6)"/>
              <stop offset="100%" style="stop-color:rgba(50,50,100,0)"/>
            </radialGradient>
          </defs>
          <circle cx="8" cy="8" r="8" fill="url(#dustGrad)"/>
        </svg>
    `;
    const tex = new BABYLON.Texture("data:image/svg+xml;base64,"+btoa(svg), scene);

    function makeEmitter(name, dir) {
        const ps = new BABYLON.ParticleSystem(name, 1500, scene);
        ps.particleTexture = tex;
        ps.emitter = parentGroup;
        ps.createConeEmitter(1.5,0.4);

        ps.color1 = new BABYLON.Color4(0.8,0.8,1,0.8);
        ps.color2 = new BABYLON.Color4(0.6,0.6,0.9,0.6);
        ps.colorDead = new BABYLON.Color4(0.2,0.2,0.4,0);

        ps.minSize = 0.2; ps.maxSize = 1.2;
        ps.minLifeTime = Number.MAX_VALUE; ps.maxLifeTime = Number.MAX_VALUE;
        ps.emitRate    = 400; // Increased from 200 for more persistent particles

        ps.direction1 = dir.add(new BABYLON.Vector3(0.2,0,0.2));
        ps.direction2 = dir.add(new BABYLON.Vector3(-0.2,0,-0.2));
        ps.gravity    = BABYLON.Vector3.Zero();
        ps.minEmitPower = 1; ps.maxEmitPower = 4;
        ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        ps.start();
        energyParticles.push(ps);
    }

    makeEmitter('upperDustOutflow', new BABYLON.Vector3(0,1,0));
}


// 5. Animation Loop
export function updateBlackHoleEffects() {
    const t = Date.now()*0.001;

    // Debug particle counts periodically (every 10 seconds)
    if (Math.floor(t) % 10 === 0 && Math.floor(t * 10) % 10 === 0) {
        console.log('🌟 Active particle systems:');
        energyParticles.forEach((ps, index) => {
            if (ps && ps.particles) {
                console.log(`   ${ps.name || 'Unknown'}: ${ps.particles.length} particles`);
            }
        });
    }

    // Animate accretion disk particle effects
    if (accretionDisk && accretionDisk.group) {
        // Rotate the entire disk group for overall motion
        accretionDisk.group.rotation.y += 0.005;
        
        // Animate main disk particles intensity
        if (accretionDisk.mainDisk) {
            const intensity = Math.sin(t * 1.5) * 0.3 + 1.0;
            accretionDisk.mainDisk.emitRate = 200 * intensity;
        }
    }

    // Enhanced star twinkling animation for dust particles
    energyParticles.forEach(particleSystem => {
        if (particleSystem && particleSystem.particles) {
            const particles = particleSystem.particles;
            for (let i = 0; i < particles.length; i++) {
                const particle = particles[i];
                if (!particle || !particle.userData) continue;
                
                const data = particle.userData;
                const twinkle = Math.sin(t * data.twinkleSpeed + data.twinklePhase) * 0.4 + 0.6;
                
                // Update particle size for twinkling
                particle.size = data.baseSize * twinkle;
                
                // Update alpha for sparkle effect
                if (particle.color && data.baseAlpha) {
                    particle.color.a = data.baseAlpha * twinkle;
                }
            }
        }
    });

    // Animate DNA spiral streams
    polarJetParticles.forEach((spiral, index) => {
        if (spiral && spiral.emitRate !== undefined) {
            // Gentle breathing effect for spiral intensity
            const spiralIntensity = Math.sin(t * 1.5 + index * Math.PI * 0.5) * 0.2 + 0.9;
            spiral.emitRate = 120 * spiralIntensity;
            
            // Subtle size variation for organic feel
            const sizeVariation = Math.sin(t * 2 + index * Math.PI) * 0.1 + 1;
            spiral.minSize = 0.6 * sizeVariation;
            spiral.maxSize = 1.8 * sizeVariation;
        }
    });
}


export function triggerFocusIntensification(duration = 5) {
    console.log(`🔦 Focus intensification triggered for ${duration}s`);

}