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

    // Rings removed for cleaner black hole appearance
    // createUnifiedRingFamily(root);
    // console.log(`✔ ${RING_CONFIG.COUNT} vertical rings created`);

    createBalancedOrbitals(root);
    console.log(`✔ ${orbitalBodies.length} orbital bodies created`);

    createCosmicEnvironment(root);
    console.log('✔ Cosmic environment added');

    blackHoleSystem = {
        group: root,
        eventHorizon,
        accretionDisk,
        rings: [], // No rings anymore
        orbitalBodies
    };
    console.log('🏁 Black hole system ready');
}

// function createAuthenticBlackHole(parent) {
//     // Create a tilted container for the black hole system
//     const blackHoleContainer = new BABYLON.TransformNode('blackHoleContainer', scene);
//     blackHoleContainer.parent = parent;
//     // Tilt to the right (around Z axis) and slightly forward (around X axis)
//     blackHoleContainer.rotation.z = -Math.PI / 6; // 30 degrees right tilt
//     blackHoleContainer.rotation.x = Math.PI / 12; // 15 degrees forward tilt
    
//     // Event Horizon
//     eventHorizon = BABYLON.MeshBuilder.CreateSphere('eventHorizon', { diameter:8, segments:32 }, scene);
//     const horMat = new BABYLON.StandardMaterial('eventHorizonMat', scene);
//     horMat.diffuseColor = BABYLON.Color3.Black();
//     horMat.emissiveColor = BABYLON.Color3.Black();
//     horMat.rimLightColor = new BABYLON.Color3(
//         COLOR_PALETTE.CYAN.r*0.5,
//         COLOR_PALETTE.CYAN.g*0.5,
//         COLOR_PALETTE.CYAN.b*0.5
//     );
//     horMat.rimLightIntensity = 0.5;
//     horMat.backFaceCulling = false;
//     eventHorizon.material = horMat;
//     eventHorizon.parent = blackHoleContainer;

//     // Accretion Disk - directly touching the event horizon
//     accretionDisk = BABYLON.MeshBuilder.CreateTorus('accretionDisk', {
//         diameter: 8.0, // Same diameter as event horizon
//         thickness: 3.5, // Thicker for more dramatic effect
//         tessellation: 128
//     }, scene);
//     accretionDisk.rotation.x = Math.PI/2;
//     accretionDisk.parent = blackHoleContainer;
    
//     // Gradient material for accretion disk - Cyan + Magenta + White
//     const diskMat = new BABYLON.StandardMaterial('accretionDiskMat', scene);
//     diskMat.diffuseColor = new BABYLON.Color3(1, 0.8, 1); // Light magenta base
//     diskMat.emissiveColor = new BABYLON.Color3(0.5, 1, 1); // Cyan glow
//     diskMat.specularColor = new BABYLON.Color3(1, 1, 1); // White highlights
//     diskMat.specularPower = 128;
//     diskMat.alpha = 0.95;
//     diskMat.backFaceCulling = false;
//     accretionDisk.material = diskMat;
//     accretionDisk.userData = {
//         baseBrightness: 0.8,
//         pulsePeriod:    4,
//         pulseAmplitude: 0.15
//     };

//     // Swirling dust outflow instead of blue cylinder jets
//     createDustPlasmaEmitters(blackHoleContainer);
// }

// 1. Authentic Black Hole + Accretion Disk
function createAuthenticBlackHole(parent) {
    // Create a tilted container for the black hole system
    const blackHoleContainer = new BABYLON.TransformNode('blackHoleContainer', scene);
    blackHoleContainer.parent = parent;
    // Tilt to the right (around Z axis) and slightly forward (around X axis)
    blackHoleContainer.rotation.z = -Math.PI / 6; // 30 degrees right tilt
    blackHoleContainer.rotation.x = Math.PI / 12; // 15 degrees forward tilt
    
    // Event Horizon - Pure black sphere with subtle rim lighting
    eventHorizon = BABYLON.MeshBuilder.CreateSphere('eventHorizon', { diameter:8, segments:32 }, scene);
    const horMat = new BABYLON.StandardMaterial('eventHorizonMat', scene);
    horMat.diffuseColor = BABYLON.Color3.Black();
    horMat.emissiveColor = BABYLON.Color3.Black();
    horMat.specularColor = BABYLON.Color3.Black();
    horMat.ambientColor = BABYLON.Color3.Black();
    horMat.disableLighting = false; // Enable lighting for rim effect
    eventHorizon.material = horMat;
    eventHorizon.parent = blackHoleContainer;
    
    // Set rendering group for proper depth sorting
    eventHorizon.renderingGroupId = 1; // Foreground celestial objects
    
    // Add a subtle glow sphere around the event horizon
    const glowSphere = BABYLON.MeshBuilder.CreateSphere('eventHorizonGlow', { diameter:8.5, segments:32 }, scene);
    const glowMat = new BABYLON.StandardMaterial('glowMat', scene);
    glowMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
    glowMat.emissiveColor = new BABYLON.Color3(0.2, 0.1, 0.3); // Very subtle purple glow
    glowMat.alpha = 0.3;
    glowMat.backFaceCulling = false;
    glowSphere.material = glowMat;
    glowSphere.parent = blackHoleContainer;
    
    // Set rendering group for proper depth sorting
    glowSphere.renderingGroupId = 1; // Foreground celestial objects

    // Accretion Disk - DISABLED for cleaner black hole appearance
    // All torus disk components commented out to remove rings around black hole
    
    // // Inner hot disk
    // const innerDisk = BABYLON.MeshBuilder.CreateTorus('innerAccretionDisk', {
    //     diameter: 8.0,
    //     thickness: 1.5,
    //     tessellation: 128
    // }, scene);
    // innerDisk.rotation.x = Math.PI/2;
    // innerDisk.parent = blackHoleContainer;
    
    // const innerDiskMat = new BABYLON.StandardMaterial('innerDiskMat', scene);
    // innerDiskMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
    // innerDiskMat.emissiveColor = new BABYLON.Color3(1, 0.8, 1); // White-hot with magenta tint
    // innerDiskMat.specularColor = new BABYLON.Color3(1, 1, 1);
    // innerDiskMat.specularPower = 256;
    // innerDiskMat.alpha = 0.9;
    // innerDiskMat.backFaceCulling = false;
    // innerDisk.material = innerDiskMat;
    // innerDisk.renderingGroupId = 1;
    
    // // Middle disk
    // accretionDisk = BABYLON.MeshBuilder.CreateTorus('accretionDisk', {
    //     diameter: 10.0,
    //     thickness: 3.0,
    //     tessellation: 128
    // }, scene);
    // accretionDisk.rotation.x = Math.PI/2;
    // accretionDisk.parent = blackHoleContainer;
    
    // const diskMat = new BABYLON.StandardMaterial('accretionDiskMat', scene);
    // diskMat.diffuseColor = new BABYLON.Color3(0.8, 0.4, 1); // Purple-magenta
    // diskMat.emissiveColor = new BABYLON.Color3(0.3, 0.8, 1); // Cyan glow
    // diskMat.specularColor = new BABYLON.Color3(1, 1, 1);
    // diskMat.specularPower = 128;
    // diskMat.alpha = 0.8;
    // diskMat.backFaceCulling = false;
    // accretionDisk.material = diskMat;
    // accretionDisk.renderingGroupId = 1;
    
    // // Outer cooler disk
    // const outerDisk = BABYLON.MeshBuilder.CreateTorus('outerAccretionDisk', {
    //     diameter: 14.0,
    //     thickness: 3.5,
    //     tessellation: 128
    // }, scene);
    // outerDisk.rotation.x = Math.PI/2;
    // outerDisk.parent = blackHoleContainer;
    
    // const outerDiskMat = new BABYLON.StandardMaterial('outerDiskMat', scene);
    // outerDiskMat.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.8);
    // outerDiskMat.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
    // outerDiskMat.specularColor = new BABYLON.Color3(0.5, 0.7, 1);
    // outerDiskMat.specularPower = 64;
    // outerDiskMat.alpha = 0.5;
    // outerDiskMat.backFaceCulling = false;
    // outerDisk.material = outerDiskMat;
    // outerDisk.renderingGroupId = 1;
    
    // Set accretion disk to null since we're not creating it
    accretionDisk = null;

    // Swirling dust outflow
    createDustPlasmaEmitters(blackHoleContainer);
}

// 2. Vertical Orbital Rings - DISABLED (rings removed)
// function createUnifiedRingFamily(parent) {
//     const group = new BABYLON.TransformNode('unifiedRingFamily', scene);
//     group.parent = parent;
//     authenticRings = [];

//     for (let i=0; i<RING_CONFIG.COUNT; i++) {
//         const r = RING_CONFIG.BASE_RADIUS + i*RING_CONFIG.RADIUS_INCREMENT;
//         const thickness = r * (
//             RING_CONFIG.THICKNESS_OUTER_RATIO
//             - (i/(RING_CONFIG.COUNT-1))*(RING_CONFIG.THICKNESS_OUTER_RATIO - RING_CONFIG.THICKNESS_INNER_RATIO)
//         );
//         const ring = BABYLON.MeshBuilder.CreateTorus(`ring${i}`, {
//             diameter: 2*r,
//             thickness,
//             tessellation: 64
//         }, scene);

//         // Vertical + random tilt
//         ring.rotation.x = 0;
//         ring.rotation.z = (Math.random()-0.5)*RING_CONFIG.TILT_RANGE;
//         ring.rotation.y = (Math.random()-0.5)*(RING_CONFIG.TILT_RANGE*0.5);

//         // Metallic, space-like color
//         const mat = new BABYLON.StandardMaterial(`ringMat${i}`, scene);
//         if (i<2) {
//             mat.diffuseColor  = new BABYLON.Color3(0.3,0.35,0.5);
//             mat.emissiveColor = new BABYLON.Color3(0.05,0.1,0.2);
//         } else if (i<4) {
//             mat.diffuseColor  = new BABYLON.Color3(0.4,0.45,0.5);
//             mat.emissiveColor = new BABYLON.Color3(0.1,0.15,0.25);
//         } else {
//             mat.diffuseColor  = new BABYLON.Color3(0.5,0.45,0.35);
//             mat.emissiveColor = new BABYLON.Color3(0.2,0.15,0.1);
//         }
//         mat.specularColor = new BABYLON.Color3(0.8,0.8,0.9);
//         mat.specularPower = 32 + i*8;
//         mat.alpha         = 0.85 - i*0.03;
//         mat.backFaceCulling = false;
//         ring.material = mat;

//         ring.parent = group;
        
//         // Set rendering group for proper depth sorting
//         ring.renderingGroupId = 1; // Foreground celestial objects
        
//         const period = RING_CONFIG.ROTATION_PERIOD[0] + (i/(RING_CONFIG.COUNT-1))*(RING_CONFIG.ROTATION_PERIOD[1]-RING_CONFIG.ROTATION_PERIOD[0]);
//         const speed  = (Math.PI*2)/(period*60);
//         ring.userData = {
//             baseRotationSpeed: speed*(0.5+Math.random()),
//             rotationAxis:      (Math.random()<0.5?'y':'z'),
//             pulsationPhase:    i*Math.PI/3
//         };

//         authenticRings.push(ring);
//         shaderMaterials.push(mat);
//     }
// }


// 3. Randomized Orbiting Bodies
function createBalancedOrbitals(parent) {
    const group = new BABYLON.TransformNode('balancedOrbitals', scene);
    group.parent = parent;
    orbitalBodies = [];

    for (let i=0; i<20; i++) {
        const size = 0.3 + Math.random()*0.7;
        const body = BABYLON.MeshBuilder.CreateSphere(`body${i}`, { diameter:size*2, segments:16 }, scene);
        const mat  = new BABYLON.StandardMaterial(`bodyMat${i}`, scene);
        mat.diffuseColor = new BABYLON.Color3(Math.random(),Math.random(),Math.random());
        body.material = mat;
        body.parent   = group;
        body.userData = {
            distance:     10 + Math.random()*60,
            angle:        Math.random()*Math.PI*2,
            speed:        0.005 + Math.random()*0.01,
            inclination:  (Math.random()-0.5)*0.5,
            planeRotation:Math.random()*Math.PI*2
        };
        orbitalBodies.push(body);
    }
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

    // Distant galaxy
    const gal = BABYLON.MeshBuilder.CreateSphere('distantGalaxy', { diameter:80, segments:32 }, scene);
    gal.position.set(100,50,-200);
    gal.parent = parent;
    const gmat = new BABYLON.StandardMaterial('galaxyMat', scene);
    gmat.diffuseColor  = new BABYLON.Color3(0.8,0.8,1);
    gmat.emissiveColor = new BABYLON.Color3(0.8,0.8,1);
    gmat.backFaceCulling=false;
    gal.material = gmat;
    gal.userData = { rotationSpeed:0.001 };
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
        ps.minLifeTime = 2; ps.maxLifeTime = 6;
        ps.emitRate    = 200;

        ps.direction1 = dir.add(new BABYLON.Vector3(0.2,0,0.2));
        ps.direction2 = dir.add(new BABYLON.Vector3(-0.2,0,-0.2));
        ps.gravity    = BABYLON.Vector3.Zero();
        ps.minEmitPower = 1; ps.maxEmitPower = 4;
        ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        ps.start();
        energyParticles.push(ps);
    }

    makeEmitter('upperDustOutflow', new BABYLON.Vector3(0,1,0));
    makeEmitter('lowerDustOutflow', new BABYLON.Vector3(0,-1,0));
}


// 5. Animation Loop
export function updateBlackHoleEffects() {
    const t = Date.now()*0.001;

    // Rings animation removed (no more rings)
    // authenticRings.forEach(r=>{
    //     if(r.userData.rotationAxis==='y') r.rotation.y+=r.userData.baseRotationSpeed;
    //     else r.rotation.z+=r.userData.baseRotationSpeed;
    //     const pulse = 1 + Math.sin(t*0.5 + r.userData.pulsationPhase)*0.1;
    //     r.material.emissiveColor.scaleInPlace(pulse);
    // });

    // Orbiting bodies
    orbitalBodies.forEach(b=>{
        const u = b.userData;
        u.angle += u.speed;
        const d = u.distance*(1+0.1*Math.cos(u.angle));
        const x = Math.cos(u.angle)*d, z = Math.sin(u.angle)*d;
        b.position.x = x*Math.cos(u.planeRotation)-z*Math.sin(u.planeRotation);
        b.position.z = x*Math.sin(u.planeRotation)+z*Math.cos(u.planeRotation);
        b.position.y = Math.sin(u.inclination)*d*0.3;
        b.rotation.y += 0.02;
    });

    // Accretion disk pulsation - DISABLED since accretion disk removed
    // if (accretionDisk && accretionDisk.userData) {
    //     const d = accretionDisk.userData;
    //     const p = (t % d.pulsePeriod)/d.pulsePeriod * Math.PI*2;
    //     const br = d.baseBrightness + Math.sin(p)*d.pulseAmplitude;
    //     accretionDisk.material.emissiveColor.scaleInPlace(br);
    // }

    // Enhanced star twinkling animation
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

    // Distant galaxy slow rotation
    const gal = scene.getTransformNodeByName('distantGalaxy');
    if (gal && gal.userData) gal.rotation.y += gal.userData.rotationSpeed;
}


export function triggerFocusIntensification(duration = 5) {
    console.log(`🔦 Focus intensification triggered for ${duration}s`);
    // Note: Originally would increase accretionDisk pulseAmplitude, but 
    // accretion disk has been removed for cleaner black hole appearance
    // if (accretionDisk && accretionDisk.userData) {
    //     const data = accretionDisk.userData;
    //     const originalAmplitude = data.pulseAmplitude;
    //     data.pulseAmplitude = originalAmplitude * 2;
    //     setTimeout(() => {
    //         data.pulseAmplitude = originalAmplitude;
    //         console.log('🔦 Focus intensification ended, restored original amplitude');
    //     }, duration * 1000);
    // }
}
