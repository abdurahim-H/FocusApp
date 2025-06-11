// blackhole.js
// Re-architected Black Hole System - Authentic Cosmic Experience
// Creates a unified, meditative black hole environment with realistic physics

import { scene } from './scene3d.js';
import { appState } from './state.js';

export let blackHoleSystem = {};
let shaderMaterials = [];
let energyParticles = [];
let gravitationalWaves = [];
let dustParticleSystem = null;
let lensingPlane = null;
let polarJetParticles = [];
let jetEmissionTimer = 0;

// Unified Color Triad - Deep Violet, Cyan, Ember Orange
const COLOR_PALETTE = {
    DEEP_VIOLET: { r: 0.4, g: 0.2, b: 0.8 },      // Infrastructure
    CYAN: { r: 0.2, g: 0.8, b: 1.0 },             // Energetic effects
    EMBER_ORANGE: { r: 1.0, g: 0.4, b: 0.1 },     // Core highlights
    DARK_NAVY: { r: 0.05, g: 0.05, b: 0.2 },      // Ambient background
    DESATURATED_BASE: 0.8                           // 20% desaturation for backgrounds
};

// Ring architecture constants - smaller vertical orbital rings
const RING_CONFIG = {
    COUNT: 6,
    BASE_RADIUS: 15,        // Smaller rings
    RADIUS_INCREMENT: 6,    // Closer spacing
    THICKNESS_OUTER_RATIO: 0.12,  // Thicker for visibility
    THICKNESS_INNER_RATIO: 0.06,  // Progressive thinning
    TILT_RANGE: 0.35,       // ±20° random tilt range  
    ROTATION_PERIOD: [30, 60],     // Faster rotation (30-60 seconds)
    BASE_TILT_ANGLE: 0       // Start vertical
};

// Orbital band configuration for balanced system architecture
const ORBITAL_BANDS = {
    INNER: {
        distance: 25,
        color: [0.8, 0.4, 0.3],
        inclination: 0.1
    },
    MIDDLE: {
        distance: 50,
        color: [0.6, 0.7, 0.9],
        inclination: 0.05
    },
    OUTER: {
        distance: 85,
        color: [0.7, 0.8, 0.9],
        inclination: 0.15
    }
};

// Orbital bodies with balanced composition
let orbitalBodies = [];
let authenticRings = [];
let accretionDisk = null;
let eventHorizon = null;

export function createEnhancedBlackHole() {
    try {
        if (!scene) {
            console.error('Scene not available for black hole creation');
            return;
        }

        console.log('Creating re-architected black hole system...');

        // Create a TransformNode to group all black hole elements
        const blackHoleGroup = new BABYLON.TransformNode("blackHoleGroup", scene);
        blackHoleGroup.position = new BABYLON.Vector3(0, 0, 0);

        // 1. Create authentic black hole centerpiece
        createAuthenticBlackHole(blackHoleGroup);
        console.log('✅ Authentic black hole centerpiece created');

        // 2. Create unified ring family
        createUnifiedRingFamily(blackHoleGroup);
        console.log('✅ Unified ring family with', RING_CONFIG.COUNT, 'rings created');

        // 3. Create balanced orbital composition
        createBalancedOrbitals(blackHoleGroup);
        console.log('✅ Balanced orbital system created with', orbitalBodies.length, 'bodies');

        // 4. Add subtle environmental effects
        createCosmicEnvironment(blackHoleGroup);
        console.log('Cosmic environment effects added');

        // Store the black hole system
        blackHoleSystem = {
            group: blackHoleGroup,
            eventHorizon: eventHorizon,
            accretionDisk: accretionDisk,
            rings: authenticRings,
            orbitalBodies: orbitalBodies
        };
        
        console.log('Re-architected black hole system created successfully');
        
    } catch (error) {
        console.error('Failed to create black hole system:', error);
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

// Create realistic accretion disk with temperature gradients and shadowing
function createRealisticAccretionDisk(parentGroup) {
    const diskGroup = new BABYLON.TransformNode("diskGroup", scene);
    diskGroup.parent = parentGroup;
    
    // Create multiple torus rings for the accretion disk with proper temperature gradient
    const ringCount = 8;
    const rings = [];
    
    for (let i = 0; i < ringCount; i++) {
        const innerRadius = 12 + i * 3;
        const outerRadius = innerRadius + 2.5;
        
        // Create disk segment as flat torus
        const ring = BABYLON.MeshBuilder.CreateTorus(`accretionRing${i}`, {
            diameter: (innerRadius + outerRadius),
            thickness: (outerRadius - innerRadius),
            tessellation: 128
        }, scene);
        
        ring.rotation.x = Math.PI / 2;
        
        const ringMaterial = new BABYLON.StandardMaterial(`ringMat${i}`, scene);
        
        // Temperature gradient: white-hot inner to deep red outer
        const tempFactor = 1 - (i / ringCount);
        const distanceFactor = 1 / (1 + i * 0.3); // Brightness falls with distance
        
        if (tempFactor > 0.8) {
            // Inner white-hot regions
            ringMaterial.diffuseColor = new BABYLON.Color3(1, 1, 0.9);
            ringMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.8, 0.6);
        } else if (tempFactor > 0.6) {
            // Blue-white regions
            ringMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.95, 1);
            ringMaterial.emissiveColor = new BABYLON.Color3(0.6, 0.7, 0.8);
        } else if (tempFactor > 0.4) {
            // Yellow-orange regions
            ringMaterial.diffuseColor = new BABYLON.Color3(1, 0.8, 0.4);
            ringMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.5, 0.2);
        } else if (tempFactor > 0.2) {
            // Orange-red regions
            ringMaterial.diffuseColor = new BABYLON.Color3(1, 0.5, 0.2);
            ringMaterial.emissiveColor = new BABYLON.Color3(0.6, 0.3, 0.1);
        } else {
            // Deep red outer regions
            ringMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.1);
            ringMaterial.emissiveColor = new BABYLON.Color3(0.4, 0.1, 0.05);
        }
        
        // Apply shadowing - darker on one side
        ringMaterial.diffuseColor = ringMaterial.diffuseColor.scale(distanceFactor);
        ringMaterial.emissiveColor = ringMaterial.emissiveColor.scale(distanceFactor);
        
        ringMaterial.specularColor = new BABYLON.Color3(1, 0.9, 0.7);
        ringMaterial.specularPower = 32 + i * 8;
        ringMaterial.alpha = 0.85 - i * 0.08;
        ringMaterial.backFaceCulling = false;
        
        ring.material = ringMaterial;
        ring.parent = diskGroup;
        
        // Physics-based rotation: inner rings faster (Kepler's laws)
        const keplerSpeed = Math.sqrt(1 / Math.pow(innerRadius / 15, 3)) * 0.015;
        
        ring.metadata = {
            baseRotationSpeed: keplerSpeed,
            index: i,
            innerRadius: innerRadius,
            tempFactor: tempFactor
        };
        
        rings.push(ring);
    }
    
    // Enhanced dust particle system with realistic physics
    const dustSystem = new BABYLON.ParticleSystem("accretionDust", 2000, scene);
    dustSystem.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
            <defs>
                <radialGradient id="dustGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:#ffaa44;stop-opacity:0.9" />
                    <stop offset="100%" style="stop-color:#cc4400;stop-opacity:0" />
                </radialGradient>
            </defs>
            <circle cx="8" cy="8" r="8" fill="url(#dustGrad)" />
        </svg>
    `), scene);
    
    dustSystem.emitter = diskGroup;
    dustSystem.createConeEmitter(25, 0.3);
    
    // Temperature-based particle colors
    dustSystem.color1 = new BABYLON.Color4(1, 0.9, 0.6, 1);
    dustSystem.color2 = new BABYLON.Color4(0.9, 0.4, 0.2, 0.8);
    dustSystem.colorDead = new BABYLON.Color4(0.3, 0.1, 0.05, 0);
    
    dustSystem.minSize = 0.3;
    dustSystem.maxSize = 1.5;
    dustSystem.minLifeTime = 8;
    dustSystem.maxLifeTime = 20;
    dustSystem.emitRate = 80;
    
    dustSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
    dustSystem.gravity = new BABYLON.Vector3(0, 0, 0);
    
    // Orbital motion for dust particles
    dustSystem.direction1 = new BABYLON.Vector3(-0.5, 0, -0.5);
    dustSystem.direction2 = new BABYLON.Vector3(0.5, 0, 0.5);
    dustSystem.minEmitPower = 0.1;
    dustSystem.maxEmitPower = 0.4;
    
    dustSystem.start();
    dustParticleSystem = dustSystem;
    
    return diskGroup;
}

// Create spacetime lensing with ripple distortion effects
function createSpacetimeLensing(parentGroup) {
    const lensingGroup = new BABYLON.TransformNode("lensingGroup", scene);
    lensingGroup.parent = parentGroup;
    
    // Create gravitational lensing rings with spacetime curvature visualization
    for (let i = 0; i < 6; i++) {
        const radius = 18 + i * 8;
        const ring = BABYLON.MeshBuilder.CreateTorus(`lensingRing${i}`, {
            diameter: radius * 2,
            thickness: 0.8 + i * 0.2,
            tessellation: 96
        }, scene);
        
        ring.rotation.x = Math.PI / 2;
        
        const ringMaterial = new BABYLON.StandardMaterial(`lensingMat${i}`, scene);
        
        // Lensing effect colors - blue shifted light
        const intensityFactor = 1 - (i / 6);
        ringMaterial.diffuseColor = new BABYLON.Color3(
            0.2 + intensityFactor * 0.3,
            0.3 + intensityFactor * 0.4,
            0.6 + intensityFactor * 0.4
        );
        ringMaterial.emissiveColor = new BABYLON.Color3(
            0.1 + intensityFactor * 0.2,
            0.15 + intensityFactor * 0.25,
            0.4 + intensityFactor * 0.3
        );
        
        ringMaterial.specularColor = new BABYLON.Color3(0.7, 0.8, 1);
        ringMaterial.alpha = (0.4 - i * 0.05) * intensityFactor;
        ringMaterial.backFaceCulling = false;
        
        ring.material = ringMaterial;
        ring.parent = lensingGroup;
        
        // Spacetime ripple animation parameters
        ring.metadata = {
            radius: radius,
            speed: 0.0008 + i * 0.0003,
            phase: i * Math.PI / 4,
            rippleAmplitude: 0.05 - i * 0.008
        };
        
        gravitationalWaves.push(ring);
        shaderMaterials.push(ringMaterial);
    }
    
    // Create background star distortion effect (simplified gravitational lensing)
    const lensingField = BABYLON.MeshBuilder.CreateGround("lensingField", {
        width: 200,
        height: 200,
        subdivisions: 32
    }, scene);
    
    lensingField.rotation.x = Math.PI / 2;
    lensingField.position.z = -50;
    
    const lensingMaterial = new BABYLON.StandardMaterial("lensingFieldMat", scene);
    lensingMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.2);
    lensingMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.1);
    lensingMaterial.alpha = 0.15;
    lensingMaterial.backFaceCulling = false;
    
    lensingField.material = lensingMaterial;
    lensingField.parent = lensingGroup;
    
    lensingPlane = lensingField;
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

// Create orbital architecture with physics-driven motion
function createOrbitalArchitecture(parentGroup) {
    const orbitalGroup = new BABYLON.TransformNode("orbitalArchitectureGroup", scene);
    orbitalGroup.parent = parentGroup;
    
    // Clear existing orbital bodies
    orbitalBodies = [];
    
    // Create orbital bodies following astrophysical hierarchy
    Object.entries(ORBITAL_BANDS).forEach(([bandName, bandConfig], bandIndex) => {
        const bandGroup = new BABYLON.TransformNode(`${bandName.toLowerCase()}Band`, scene);
        bandGroup.parent = orbitalGroup;
        
        // Apply orbital inclination to the entire band
        bandGroup.rotation.x = bandConfig.inclination;
        
        if (bandName === 'INNER') {
            // Inner band: Hot rocky planets and debris
            createRockyPlanets(bandGroup, bandConfig, 3);
            createDebrisRings(bbandGroup, bandConfig, 2);
        } else if (bandName === 'MIDDLE') {
            // Middle band: Gas giants with moon systems
            createGasGiants(bandGroup, bandConfig, 2);
        } else {
            // Outer band: Ice giants and scattered objects
            createIceGiants(bandGroup, bandConfig, 2);
            createScatteredObjects(bandGroup, bandConfig, 8);
        }
    });
}

// Create rocky planets in inner band
function createRockyPlanets(parentGroup, bandConfig, count) {
    for (let i = 0; i < count; i++) {
        const distance = bandConfig.distance + i * 8 + Math.random() * 4;
        const size = 1.5 + Math.random() * 1; // Small rocky planets
        
        const planet = BABYLON.MeshBuilder.CreateSphere(`rockyPlanet${i}`, {
            diameter: size * 2,
            segments: 24
        }, scene);
        
        const planetMaterial = new BABYLON.StandardMaterial(`rockyMat${i}`, scene);
        planetMaterial.diffuseColor = new BABYLON.Color3(...bandConfig.color);
        planetMaterial.emissiveColor = new BABYLON.Color3(
            bandConfig.color[0] * 0.1,
            bandConfig.color[1] * 0.1,
            bandConfig.color[2] * 0.1
        );
        planetMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        
        planet.material = planetMaterial;
        planet.parent = parentGroup;
        
        // Kepler's third law: orbital speed inversely related to distance
        const orbitalSpeed = Math.sqrt(1 / Math.pow(distance / 20, 3)) * 0.01;
        const eccentricity = 0.02 + Math.random() * 0.08; // Slight elliptical orbits
        
        // Initial position
        const startAngle = Math.random() * Math.PI * 2;
        planet.position.x = Math.cos(startAngle) * distance;
        planet.position.z = Math.sin(startAngle) * distance;
        planet.position.y = 0;
        
        planet.userData = {
            orbitalDistance: distance,
            orbitalSpeed: orbitalSpeed,
            eccentricity: eccentricity,
            currentAngle: startAngle,
            rotationSpeed: 0.02 + Math.random() * 0.03,
            precessionRate: 0.0001 + Math.random() * 0.0002,
            size: size,
            type: 'rocky'
        };
        
        orbitalBodies.push(planet);
        
        // Create small moons for larger planets
        if (size > 2) {
            createMoonSystem(planet, Math.floor(Math.random() * 2) + 1);
        }
    }
}

// Create gas giants in middle band
function createGasGiants(parentGroup, bandConfig, count) {
    for (let i = 0; i < count; i++) {
        const distance = bandConfig.distance + i * 15 + Math.random() * 8;
        const size = 4 + Math.random() * 3; // Large gas giants
        
        const planet = BABYLON.MeshBuilder.CreateSphere(`gasGiant${i}`, {
            diameter: size * 2,
            segments: 32
        }, scene);
        
        const planetMaterial = new BABYLON.StandardMaterial(`gasMat${i}`, scene);
        planetMaterial.diffuseColor = new BABYLON.Color3(...bandConfig.color);
        planetMaterial.emissiveColor = new BABYLON.Color3(
            bandConfig.color[0] * 0.15,
            bandConfig.color[1] * 0.15,
            bandConfig.color[2] * 0.15
        );
        planetMaterial.specularColor = new BABYLON.Color3(0.6, 0.6, 0.6);
        
        planet.material = planetMaterial;
        planet.parent = parentGroup;
        
        const orbitalSpeed = Math.sqrt(1 / Math.pow(distance / 20, 3)) * 0.008;
        const eccentricity = 0.01 + Math.random() * 0.05;
        
        const startAngle = Math.random() * Math.PI * 2;
        planet.position.x = Math.cos(startAngle) * distance;
        planet.position.z = Math.sin(startAngle) * distance;
        planet.position.y = 0;
        
        planet.userData = {
            orbitalDistance: distance,
            orbitalSpeed: orbitalSpeed,
            eccentricity: eccentricity,
            currentAngle: startAngle,
            rotationSpeed: 0.025 + Math.random() * 0.02,
            precessionRate: 0.00005 + Math.random() * 0.0001,
            size: size,
            type: 'gas'
        };
        
        orbitalBodies.push(planet);
        
        // Create extensive moon systems
        createMoonSystem(planet, 3 + Math.floor(Math.random() * 4));
        
        // Create ring system
        createPlanetaryRings(planet, size);
    }
}

// Create ice giants in outer band
function createIceGiants(parentGroup, bandConfig, count) {
    for (let i = 0; i < count; i++) {
        const distance = bandConfig.distance + i * 20 + Math.random() * 10;
        const size = 3 + Math.random() * 2; // Medium ice giants
        
        const planet = BABYLON.MeshBuilder.CreateSphere(`iceGiant${i}`, {
            diameter: size * 2,
            segments: 28
        }, scene);
        
        const planetMaterial = new BABYLON.StandardMaterial(`iceMat${i}`, scene);
        planetMaterial.diffuseColor = new BABYLON.Color3(...bandConfig.color);
        planetMaterial.emissiveColor = new BABYLON.Color3(
            bandConfig.color[0] * 0.08,
            bandConfig.color[1] * 0.08,
            bandConfig.color[2] * 0.08
        );
        planetMaterial.specularColor = new BABYLON.Color3(0.8, 0.8, 1);
        
        planet.material = planetMaterial;
        planet.parent = parentGroup;
        
        const orbitalSpeed = Math.sqrt(1 / Math.pow(distance / 20, 3)) * 0.006;
        const eccentricity = 0.03 + Math.random() * 0.1;
        
        const startAngle = Math.random() * Math.PI * 2;
        planet.position.x = Math.cos(startAngle) * distance;
        planet.position.z = Math.sin(startAngle) * distance;
        planet.position.y = 0;
        
        planet.userData = {
            orbitalDistance: distance,
            orbitalSpeed: orbitalSpeed,
            eccentricity: eccentricity,
            currentAngle: startAngle,
            rotationSpeed: 0.015 + Math.random() * 0.015,
            precessionRate: 0.00003 + Math.random() * 0.00007,
            size: size,
            type: 'ice'
        };
        
        orbitalBodies.push(planet);
        
        // Create modest moon systems
        createMoonSystem(planet, 1 + Math.floor(Math.random() * 3));
    }
}

// Create debris rings
function createDebrisRings(parentGroup, bandConfig, count) {
    for (let i = 0; i < count; i++) {
        const distance = bandConfig.distance + i * 6 + Math.random() * 4;
        
        const debrisRing = BABYLON.MeshBuilder.CreateTorus(`debrisRing${i}`, {
            diameter: distance * 2,
            thickness: 0.5 + Math.random() * 0.5,
            tessellation: 64
        }, scene);
        
        debrisRing.rotation.x = Math.PI / 2;
        debrisRing.parent = parentGroup;
        
        const ringMaterial = new BABYLON.StandardMaterial(`debrisMat${i}`, scene);
        ringMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.5, 0.4);
        ringMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.08, 0.06);
        ringMaterial.alpha = 0.6;
        ringMaterial.backFaceCulling = false;
        
        debrisRing.material = ringMaterial;
        
        const orbitalSpeed = Math.sqrt(1 / Math.pow(distance / 20, 3)) * 0.012;
        
        debrisRing.userData = {
            orbitalSpeed: orbitalSpeed,
            type: 'debris'
        };
        
        orbitalBodies.push(debrisRing);
    }
}

// Create scattered objects in outer regions
function createScatteredObjects(parentGroup, bandConfig, count) {
    for (let i = 0; i < count; i++) {
        const distance = bandConfig.distance + Math.random() * 30;
        const size = 0.3 + Math.random() * 0.8; // Small objects
        
        const object = BABYLON.MeshBuilder.CreateSphere(`scatteredObject${i}`, {
            diameter: size * 2,
            segments: 12
        }, scene);
        
        const objectMaterial = new BABYLON.StandardMaterial(`scatteredMat${i}`, scene);
        objectMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.6);
        objectMaterial.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.03);
        
        object.material = objectMaterial;
        object.parent = parentGroup;
        
        const orbitalSpeed = Math.sqrt(1 / Math.pow(distance / 20, 3)) * 0.004;
        const eccentricity = 0.1 + Math.random() * 0.3; // Highly eccentric
        
        const startAngle = Math.random() * Math.PI * 2;
        object.position.x = Math.cos(startAngle) * distance;
        object.position.z = Math.sin(startAngle) * distance;
        object.position.y = (Math.random() - 0.5) * 10; // More scattered in Y
        
        object.userData = {
            orbitalDistance: distance,
            orbitalSpeed: orbitalSpeed,
            eccentricity: eccentricity,
            currentAngle: startAngle,
            rotationSpeed: 0.01 + Math.random() * 0.02,
            precessionRate: 0.00001 + Math.random() * 0.00005,
            size: size,
            type: 'scattered'
        };
        
        orbitalBodies.push(object);
    }
}

// Create moon systems
function createMoonSystem(planet, moonCount) {
    for (let i = 0; i < moonCount; i++) {
        const moonDistance = planet.userData.size * (2 + i * 1.5);
        const moonSize = planet.userData.size * (0.1 + Math.random() * 0.2);
        
        const moon = BABYLON.MeshBuilder.CreateSphere(`moon_${planet.name}_${i}`, {
            diameter: moonSize * 2,
            segments: 16
        }, scene);
        
        const moonMaterial = new BABYLON.StandardMaterial(`moonMat_${planet.name}_${i}`, scene);
        moonMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.75);
        moonMaterial.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.025);
        
        moon.material = moonMaterial;
        moon.parent = planet;
        
        const moonSpeed = Math.sqrt(1 / Math.pow(moonDistance / 3, 3)) * 0.05;
        const startAngle = Math.random() * Math.PI * 2;
        
        moon.position.x = Math.cos(startAngle) * moonDistance;
        moon.position.z = Math.sin(startAngle) * moonDistance;
        moon.position.y = (Math.random() - 0.5) * moonDistance * 0.3;
        
        moon.userData = {
            orbitalDistance: moonDistance,
            orbitalSpeed: moonSpeed,
            currentAngle: startAngle,
            rotationSpeed: 0.01 + Math.random() * 0.02,
            type: 'moon'
        };
    }
}

// Create planetary ring systems
function createPlanetaryRings(planet, planetSize) {
    const ringGroup = new BABYLON.TransformNode(`rings_${planet.name}`, scene);
    ringGroup.parent = planet;
    
    const ringCount = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < ringCount; i++) {
        const ringRadius = planetSize * (2.5 + i * 0.8);
        
        const ring = BABYLON.MeshBuilder.CreateTorus(`planetRing_${planet.name}_${i}`, {
            diameter: ringRadius * 2,
            thickness: 0.3 + i * 0.1,
            tessellation: 96
        }, scene);
        
        ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.1;
        ring.parent = ringGroup;
        
        const ringMaterial = new BABYLON.StandardMaterial(`ringMat_${planet.name}_${i}`, scene);
        ringMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.7, 0.6);
        ringMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.08, 0.06);
        ringMaterial.alpha = 0.7 - i * 0.1;
        ringMaterial.backFaceCulling = false;
        
        ring.material = ringMaterial;
        
        ring.userData = {
            rotationSpeed: Math.sqrt(1 / Math.pow(ringRadius / planetSize, 3)) * 0.02,
            type: 'planetRing'
        };
    }
}

// Create comet swarms with eccentric trajectories
function createCometSwarms(parentGroup) {
    const cometGroup = new BABYLON.TransformNode("cometSwarmGroup", scene);
    cometGroup.parent = parentGroup;
    
    comets = [];
    const cometCount = 12;
    
    for (let i = 0; i < cometCount; i++) {
        // Comet nucleus
        const cometSize = 0.5 + Math.random() * 0.8;
        const comet = BABYLON.MeshBuilder.CreateSphere(`comet${i}`, {
            diameter: cometSize * 2,
            segments: 12
        }, scene);
        
        const cometMaterial = new BABYLON.StandardMaterial(`cometMat${i}`, scene);
        cometMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.35, 0.3);
        cometMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.04, 0.03);
        cometMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        
        comet.material = cometMaterial;
        comet.parent = cometGroup;
        
        // Highly eccentric orbit parameters
        const periapsis = 15 + Math.random() * 20; // Closest approach
        const apoapsis = 80 + Math.random() * 120; // Farthest distance
        const eccentricity = (apoapsis - periapsis) / (apoapsis + periapsis);
        const semiMajorAxis = (periapsis + apoapsis) / 2;
        
        // Random orbital inclination for comets
        const inclination = (Math.random() - 0.5) * Math.PI * 0.6;
        
        // Initial position at random point in orbit
        const startAnomaly = Math.random() * Math.PI * 2;
        const orbitalSpeed = Math.sqrt(1 / Math.pow(semiMajorAxis / 20, 3)) * 0.003;
        
        comet.userData = {
            periapsis: periapsis,
            apoapsis: apoapsis,
            eccentricity: eccentricity,
            semiMajorAxis: semiMajorAxis,
            inclination: inclination,
            currentAnomaly: startAnomaly,
            orbitalSpeed: orbitalSpeed,
            rotationSpeed: 0.02 + Math.random() * 0.03,
            size: cometSize,
            type: 'comet',
            tailParticles: null
        };
        
        // Calculate initial position
        updateCometPosition(comet);
        
        // Create comet tail particle system
        createCometTail(comet);
        
        comets.push(comet);
    }
}

// Create comet tail particle system
function createCometTail(comet) {
    const tailSystem = new BABYLON.ParticleSystem(`cometTail_${comet.name}`, 200, scene);
    
    tailSystem.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
            <defs>
                <radialGradient id="cometGrad" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" style="stop-color:#88ccff;stop-opacity:0.8" />
                    <stop offset="70%" style="stop-color:#4488cc;stop-opacity:0.4" />
                    <stop offset="100%" style="stop-color:#2244aa;stop-opacity:0" />
                </radialGradient>
            </defs>
            <circle cx="8" cy="8" r="8" fill="url(#cometGrad)" />
        </svg>
    `), scene);
    
    tailSystem.emitter = comet;
    tailSystem.createSphereEmitter(comet.userData.size);
    
    tailSystem.color1 = new BABYLON.Color4(0.6, 0.8, 1, 0.8);
    tailSystem.color2 = new BABYLON.Color4(0.4, 0.6, 0.9, 0.6);
    tailSystem.colorDead = new BABYLON.Color4(0.2, 0.3, 0.5, 0);
    
    tailSystem.minSize = 0.5;
    tailSystem.maxSize = 2;
    tailSystem.minLifeTime = 3;
    tailSystem.maxLifeTime = 8;
    tailSystem.emitRate = 30;
    
    // Tail points away from center (black hole)
    tailSystem.direction1 = new BABYLON.Vector3(-0.2, -0.2, -0.2);
    tailSystem.direction2 = new BABYLON.Vector3(0.2, 0.2, 0.2);
    tailSystem.minEmitPower = 2;
    tailSystem.maxEmitPower = 8;
    
    tailSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    tailSystem.gravity = new BABYLON.Vector3(0, 0, 0);
    
    tailSystem.start();
    comet.userData.tailParticles = tailSystem;
    energyParticles.push(tailSystem);
}

// Update comet position based on orbital mechanics
function updateCometPosition(comet) {
    const userData = comet.userData;
    const eccentricAnomaly = userData.currentAnomaly;
    
    // Calculate distance from focus (black hole)
    const distance = userData.semiMajorAxis * (1 - userData.eccentricity * Math.cos(eccentricAnomaly));
    
    // Calculate true anomaly
    const trueAnomaly = 2 * Math.atan(
        Math.sqrt((1 + userData.eccentricity) / (1 - userData.eccentricity)) * 
        Math.tan(eccentricAnomaly / 2)
    );
    
    // Position in orbital plane
    const x = distance * Math.cos(trueAnomaly);
    const y = 0;
    const z = distance * Math.sin(trueAnomaly);
    
    // Apply orbital inclination
    const inclinedY = y * Math.cos(userData.inclination) - z * Math.sin(userData.inclination);
    const inclinedZ = y * Math.sin(userData.inclination) + z * Math.cos(userData.inclination);
    
    comet.position.x = x;
    comet.position.y = inclinedY;
    comet.position.z = inclinedZ;
    
    // Update tail direction (away from black hole)
    if (userData.tailParticles) {
        const directionFromCenter = comet.position.normalize();
        userData.tailParticles.direction1 = directionFromCenter.scale(0.5);
        userData.tailParticles.direction2 = directionFromCenter.scale(1.5);
        
        // Tail intensity based on distance to black hole
        const distanceToCenter = comet.position.length();
        const intensity = Math.max(0.1, 1 - (distanceToCenter / 100));
        userData.tailParticles.emitRate = 10 + intensity * 40;
    }
}

// Create authentic black hole centerpiece with event horizon and accretion disk
function createAuthenticBlackHole(parentGroup) {
    const blackHoleCore = new BABYLON.TransformNode("blackHoleCore", scene);
    blackHoleCore.parent = parentGroup;
    
    // Event Horizon - Dark sphere with gravitational lensing edge
    eventHorizon = BABYLON.MeshBuilder.CreateSphere("eventHorizon", {
        diameter: 8,  // Slightly larger for better visual impact
        segments: 32
    }, scene);
    
    const horizonMaterial = new BABYLON.StandardMaterial("eventHorizonMat", scene);
    horizonMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    horizonMaterial.emissiveColor = new BABYLON.Color3(0, 0, 0);
    horizonMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    
    // Gravitational lensing edge effect
    horizonMaterial.rimLightColor = new BABYLON.Color3(
        COLOR_PALETTE.CYAN.r * 0.3,
        COLOR_PALETTE.CYAN.g * 0.3,
        COLOR_PALETTE.CYAN.b * 0.3
    );
    horizonMaterial.rimLightIntensity = 0.5;
    
    eventHorizon.material = horizonMaterial;
    eventHorizon.parent = blackHoleCore;
    
    // Accretion Disk - positioned tightly around black hole
    accretionDisk = BABYLON.MeshBuilder.CreateTorus("accretionDisk", {
        diameter: 16,     // Inner edge starts close to event horizon
        thickness: 6,     // Wider disk for better visibility
        tessellation: 128
    }, scene);
    
    // Flat horizontal disk around black hole
    accretionDisk.rotation.x = Math.PI / 2;
    accretionDisk.position.y = 0;  // Centered on black hole
    accretionDisk.parent = blackHoleCore;
    
    const diskMaterial = new BABYLON.StandardMaterial("accretionDiskMat", scene);
    
    // White-hot inner rim to amber/red outer gradient
    diskMaterial.diffuseColor = new BABYLON.Color3(1, 1, 0.9);
    diskMaterial.emissiveColor = new BABYLON.Color3(
        COLOR_PALETTE.EMBER_ORANGE.r * 0.8,
        COLOR_PALETTE.EMBER_ORANGE.g * 0.6,
        COLOR_PALETTE.EMBER_ORANGE.b * 0.3
    );
    diskMaterial.specularColor = new BABYLON.Color3(1, 0.9, 0.7);
    diskMaterial.specularPower = 64;
    diskMaterial.alpha = 0.9;
    diskMaterial.backFaceCulling = false;
    
    accretionDisk.material = diskMaterial;
    
    // Store pulsation data for core brightness variation
    accretionDisk.userData = {
        baseBrightness: 0.8,
        pulsePeriod: 6.0,  // 6 second pulsation cycle
        pulseAmplitude: 0.1  // ±10% intensity variation
    };
    
    // Dust-plasma emitter above and below disk
    createDustPlasmaEmitters(blackHoleCore);
    
    return blackHoleCore;
}

// Create dust-plasma emitters with polar jets
function createDustPlasmaEmitters(parentGroup) {
    // Upper jet emitter
    const upperJet = new BABYLON.ParticleSystem("upperPolarJet", 300, scene);
    upperJet.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
            <defs>
                <radialGradient id="jetGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:#55ccff;stop-opacity:1" />
                    <stop offset="70%" style="stop-color:#2288cc;stop-opacity:0.6" />
                    <stop offset="100%" style="stop-color:#1144aa;stop-opacity:0" />
                </radialGradient>
            </defs>
            <circle cx="8" cy="8" r="8" fill="url(#jetGrad)" />
        </svg>
    `), scene);
    
    upperJet.emitter = parentGroup;
    upperJet.createConeEmitter(2, 0.3);
    upperJet.direction1 = new BABYLON.Vector3(-0.1, 0.8, -0.1);
    upperJet.direction2 = new BABYLON.Vector3(0.1, 1.2, 0.1);
    
    upperJet.color1 = new BABYLON.Color4(
        COLOR_PALETTE.CYAN.r,
        COLOR_PALETTE.CYAN.g,
        COLOR_PALETTE.CYAN.b,
        0.8
    );
    upperJet.color2 = new BABYLON.Color4(
        COLOR_PALETTE.DEEP_VIOLET.r,
        COLOR_PALETTE.DEEP_VIOLET.g,
        COLOR_PALETTE.DEEP_VIOLET.b,
        0.6
    );
    upperJet.colorDead = new BABYLON.Color4(0.1, 0.1, 0.3, 0);
    
    upperJet.minSize = 0.5;
    upperJet.maxSize = 1.5;
    upperJet.minLifeTime = 4;
    upperJet.maxLifeTime = 10;
    upperJet.emitRate = 0; // Will be triggered every ~8 seconds
    upperJet.minEmitPower = 8;
    upperJet.maxEmitPower = 15;
    upperJet.gravity = new BABYLON.Vector3(0, 0, 0);
    upperJet.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    
    // Lower jet emitter (mirror of upper)
    const lowerJet = upperJet.clone("lowerPolarJet");
    lowerJet.direction1 = new BABYLON.Vector3(-0.1, -0.8, -0.1);
    lowerJet.direction2 = new BABYLON.Vector3(0.1, -1.2, 0.1);
    
    upperJet.start();
    lowerJet.start();
    
    polarJetParticles.push(upperJet, lowerJet);
    energyParticles.push(upperJet, lowerJet);
    
    // Store jet emission timing
    parentGroup.userData = {
        lastJetEmission: 0,
        jetInterval: 8000,  // 8 seconds between jet emissions
        upperJet: upperJet,
        lowerJet: lowerJet
    };
}

// Create unified ring family with progressive thinning and balanced composition
function createUnifiedRingFamily(parentGroup) {
    const ringGroup = new BABYLON.TransformNode("unifiedRingFamily", scene);
    ringGroup.parent = parentGroup;
    
    authenticRings = [];
    
    // Create 6 vertical orbital rings with random tilts
    for (let i = 0; i < RING_CONFIG.COUNT; i++) {
        const ringRadius = RING_CONFIG.BASE_RADIUS + (i * RING_CONFIG.RADIUS_INCREMENT);
        
        // Progressive thickness: outer rings thicker, inner rings thinner
        const thicknessRatio = RING_CONFIG.THICKNESS_OUTER_RATIO - 
            (i / (RING_CONFIG.COUNT - 1)) * (RING_CONFIG.THICKNESS_OUTER_RATIO - RING_CONFIG.THICKNESS_INNER_RATIO);
        const ringThickness = ringRadius * thicknessRatio;
        
        // Create ring mesh
        const ring = BABYLON.MeshBuilder.CreateTorus(`orbitalRing${i}`, {
            diameter: ringRadius * 2,
            thickness: ringThickness,
            tessellation: 64  // Optimized tessellation
        }, scene);
        
        // Make rings VERTICAL and add random tilts
        ring.rotation.x = 0;  // Start vertical
        ring.rotation.y = 0;  
        ring.rotation.z = (Math.random() - 0.5) * RING_CONFIG.TILT_RANGE;  // Random tilt ±20°
        
        // Additional random tilt on Y axis for more variety
        ring.rotation.y = (Math.random() - 0.5) * RING_CONFIG.TILT_RANGE * 0.5;  // ±10° Y tilt
        
        // Realistic orbital ring materials - metallic and industrial
        const ringMaterial = new BABYLON.StandardMaterial(`orbitalRingMat${i}`, scene);
        
        // Space orbital ring colors - metallic grays and blues with industrial look
        const metallic = 0.7 + Math.random() * 0.3;  // Vary metallic appearance
        
        if (i < 2) {
            // Outer rings - Dark metallic with blue tints
            ringMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.35, 0.5);
            ringMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.1, 0.2);
        } else if (i < 4) {
            // Middle rings - Steel gray with cyan highlights
            ringMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.45, 0.5);
            ringMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.15, 0.25);
        } else {
            // Inner rings - Brighter metallic with orange/amber highlights
            ringMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.45, 0.35);
            ringMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.15, 0.1);
        }
        
        // Metallic appearance for space structures
        ringMaterial.specularColor = new BABYLON.Color3(metallic, metallic, metallic * 1.1);
        ringMaterial.specularPower = 32 + i * 12;
        ringMaterial.alpha = 0.85 - i * 0.03;  // Slight transparency variation
        ringMaterial.backFaceCulling = false;
        
        ring.material = ringMaterial;
        ring.parent = ringGroup;
        
        // Faster rotation periods for dynamic effect
        const rotationPeriod = RING_CONFIG.ROTATION_PERIOD[0] + 
            (i / (RING_CONFIG.COUNT - 1)) * (RING_CONFIG.ROTATION_PERIOD[1] - RING_CONFIG.ROTATION_PERIOD[0]);
        const rotationSpeed = (Math.PI * 2) / (rotationPeriod * 60); // Convert to radians per frame (60fps)
        
        // Each ring rotates on a different axis for more variety
        const rotationAxis = Math.random() < 0.5 ? 'y' : 'z';  // Random rotation axis
        
        // Store ring metadata
        ring.userData = {
            baseRotationSpeed: rotationSpeed * (0.5 + Math.random()),  // Vary speed ±50%
            ringIndex: i,
            radius: ringRadius,
            thickness: ringThickness,
            rotationAxis: rotationAxis,
            rotationPeriod: rotationPeriod,
            pulsationPhase: i * Math.PI / 3,
            initialTiltZ: ring.rotation.z,
            initialTiltY: ring.rotation.y
        };
        
        authenticRings.push(ring);
        shaderMaterials.push(ringMaterial);
    }
    
    return ringGroup;
}

// Create balanced orbital composition with proper scaling
function createBalancedOrbitals(parentGroup) {
    const orbitalsGroup = new BABYLON.TransformNode("balancedOrbitals", scene);
    orbitalsGroup.parent = parentGroup;
    
    orbitalBodies = [];
    
    // Balanced composition: varied sizes with largest <20% of inner ring diameter
    const innerRingDiameter = (RING_CONFIG.BASE_RADIUS + 
        (RING_CONFIG.COUNT - 1) * RING_CONFIG.RADIUS_INCREMENT) * 2;
    const maxPlanetSize = innerRingDiameter * 0.18; // <20% constraint
    
    // Create 3 size categories of orbital bodies
    
    // Large planets (3-4 bodies) with random orbital parameters
    for (let i = 0; i < 3; i++) {
        const planetSize = maxPlanetSize * (0.7 + Math.random() * 0.3);
        const distance = 80 + i * 25 + Math.random() * 15;
        
        const planet = BABYLON.MeshBuilder.CreateSphere(`largePlanet${i}`, {
            diameter: planetSize
        }, scene);
        
        const planetMaterial = new BABYLON.StandardMaterial(`largePlanetMat${i}`, scene);
        
        // Varied planet types with unified color influence
        if (i === 0) {
            // Gas giant with deep violet influence
            planetMaterial.diffuseColor = new BABYLON.Color3(
                0.6 + COLOR_PALETTE.DEEP_VIOLET.r * 0.2,
                0.4 + COLOR_PALETTE.DEEP_VIOLET.g * 0.3,
                0.3 + COLOR_PALETTE.DEEP_VIOLET.b * 0.4
            );
        } else if (i === 1) {
            // Ice world with cyan influence
            planetMaterial.diffuseColor = new BABYLON.Color3(
                0.4 + COLOR_PALETTE.CYAN.r * 0.3,
                0.6 + COLOR_PALETTE.CYAN.g * 0.2,
                0.8 + COLOR_PALETTE.CYAN.b * 0.1
            );
        } else {
            // Rocky world with ember orange influence
            planetMaterial.diffuseColor = new BABYLON.Color3(
                0.5 + COLOR_PALETTE.EMBER_ORANGE.r * 0.3,
                0.3 + COLOR_PALETTE.EMBER_ORANGE.g * 0.2,
                0.2 + COLOR_PALETTE.EMBER_ORANGE.b * 0.1
            );
        }
        
        planetMaterial.emissiveColor = planetMaterial.diffuseColor.scale(0.1);
        planetMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        
        planet.material = planetMaterial;
        planet.parent = orbitalsGroup;
        
        // Random orbital parameters for non-aligned orbits
        const orbitalSpeed = Math.sqrt(1 / Math.pow(distance / 20, 3)) * 0.008;
        const startAngle = Math.random() * Math.PI * 2;
        const orbitalInclination = (Math.random() - 0.5) * 0.6; // ±17° inclination
        const orbitalPlaneRotation = Math.random() * Math.PI * 2; // Random orbital plane
        const eccentricity = 0.05 + Math.random() * 0.15; // Some eccentricity
        
        // Initial position using spherical coordinates
        const x = Math.cos(startAngle) * distance;
        const z = Math.sin(startAngle) * distance;
        const y = Math.sin(orbitalInclination) * distance * 0.3;
        
        // Apply orbital plane rotation
        planet.position.x = x * Math.cos(orbitalPlaneRotation) - z * Math.sin(orbitalPlaneRotation);
        planet.position.z = x * Math.sin(orbitalPlaneRotation) + z * Math.cos(orbitalPlaneRotation);
        planet.position.y = y;
        
        planet.userData = {
            orbitalDistance: distance,
            orbitalSpeed: orbitalSpeed,
            currentAngle: startAngle,
            rotationSpeed: 0.02 + Math.random() * 0.015,
            size: planetSize,
            type: 'largePlanet',
            orbitalInclination: orbitalInclination,
            orbitalPlaneRotation: orbitalPlaneRotation,
            eccentricity: eccentricity
        };
        
        orbitalBodies.push(planet);
        
        // Add moons to larger planets
        if (planetSize > maxPlanetSize * 0.8) {
            createBalancedMoonSystem(planet, 2 + Math.floor(Math.random() * 3));
        }
    }
    
    // Medium asteroids (8-12 bodies) with random orbital inclinations
    for (let i = 0; i < 10; i++) {
        const asteroidSize = maxPlanetSize * (0.1 + Math.random() * 0.3);
        const distance = 45 + Math.random() * 80;
        
        const asteroid = BABYLON.MeshBuilder.CreateSphere(`asteroid${i}`, {
            diameter: asteroidSize
        }, scene);
        
        // Make asteroids irregular
        asteroid.scaling = new BABYLON.Vector3(
            0.8 + Math.random() * 0.4,
            0.7 + Math.random() * 0.6,
            0.9 + Math.random() * 0.2
        );
        
        const asteroidMaterial = new BABYLON.StandardMaterial(`asteroidMat${i}`, scene);
        asteroidMaterial.diffuseColor = new BABYLON.Color3(
            0.3 + Math.random() * 0.2,
            0.2 + Math.random() * 0.1,
            0.15 + Math.random() * 0.1
        );
        asteroidMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.02, 0.01);
        
        asteroid.material = asteroidMaterial;
        asteroid.parent = orbitalsGroup;
        
        // Random orbital parameters for asteroids
        const orbitalSpeed = Math.sqrt(1 / Math.pow(distance / 20, 3)) * 0.015;
        const startAngle = Math.random() * Math.PI * 2;
        const orbitalInclination = (Math.random() - 0.5) * 0.8; // ±23° inclination for asteroids
        const orbitalPlaneRotation = Math.random() * Math.PI * 2;
        const eccentricity = 0.1 + Math.random() * 0.25; // More eccentric orbits
        
        // Initial position with orbital plane rotation
        const x = Math.cos(startAngle) * distance;
        const z = Math.sin(startAngle) * distance;
        const y = Math.sin(orbitalInclination) * distance * 0.4;
        
        asteroid.position.x = x * Math.cos(orbitalPlaneRotation) - z * Math.sin(orbitalPlaneRotation);
        asteroid.position.z = x * Math.sin(orbitalPlaneRotation) + z * Math.cos(orbitalPlaneRotation);
        asteroid.position.y = y;
        
        asteroid.userData = {
            orbitalDistance: distance,
            orbitalSpeed: orbitalSpeed,
            currentAngle: startAngle,
            rotationSpeed: 0.03 + Math.random() * 0.04,
            size: asteroidSize,
            type: 'asteroid',
            orbitalInclination: orbitalInclination,
            orbitalPlaneRotation: orbitalPlaneRotation,
            eccentricity: eccentricity
        };
        
        orbitalBodies.push(asteroid);
    }
    
    // Small debris (15-20 bodies) with highly varied orbital patterns
    for (let i = 0; i < 18; i++) {
        const debrisSize = maxPlanetSize * (0.02 + Math.random() * 0.08);
        const distance = 30 + Math.random() * 120;
        
        const debris = BABYLON.MeshBuilder.CreateSphere(`debris${i}`, {
            diameter: debrisSize
        }, scene);
        
        const debrisMaterial = new BABYLON.StandardMaterial(`debrisMat${i}`, scene);
        debrisMaterial.diffuseColor = new BABYLON.Color3(
            0.15 + Math.random() * 0.1,
            0.1 + Math.random() * 0.05,
            0.08 + Math.random() * 0.04
        );
        
        debris.material = debrisMaterial;
        debris.parent = orbitalsGroup;
        
        // Highly random orbital parameters for debris
        const orbitalSpeed = Math.sqrt(1 / Math.pow(distance / 20, 3)) * 0.025;
        const startAngle = Math.random() * Math.PI * 2;
        const orbitalInclination = (Math.random() - 0.5) * 1.2; // ±34° inclination for debris
        const orbitalPlaneRotation = Math.random() * Math.PI * 2;
        const eccentricity = 0.15 + Math.random() * 0.4; // Highly eccentric orbits
        
        // Initial position with maximum orbital variety
        const x = Math.cos(startAngle) * distance;
        const z = Math.sin(startAngle) * distance;
        const y = Math.sin(orbitalInclination) * distance * 0.6;
        
        debris.position.x = x * Math.cos(orbitalPlaneRotation) - z * Math.sin(orbitalPlaneRotation);
        debris.position.z = x * Math.sin(orbitalPlaneRotation) + z * Math.cos(orbitalPlaneRotation);
        debris.position.y = y;
        
        debris.userData = {
            orbitalDistance: distance,
            orbitalSpeed: orbitalSpeed,
            currentAngle: startAngle,
            rotationSpeed: 0.05 + Math.random() * 0.1,
            size: debrisSize,
            type: 'debris',
            orbitalInclination: orbitalInclination,
            orbitalPlaneRotation: orbitalPlaneRotation,
            eccentricity: eccentricity
        };
        
        orbitalBodies.push(debris);
    }
    
    return orbitalsGroup;
}

// Helper function for balanced moon systems
function createBalancedMoonSystem(planet, moonCount) {
    const planetSize = planet.userData.size;
    
    for (let i = 0; i < moonCount; i++) {
        const moonSize = planetSize * (0.1 + Math.random() * 0.3);
        const moonDistance = planetSize * (2 + i * 1.5);
        
        const moon = BABYLON.MeshBuilder.CreateSphere(`moon_${planet.name}_${i}`, {
            diameter: moonSize
        }, scene);
        
        const moonMaterial = new BABYLON.StandardMaterial(`moonMat_${planet.name}_${i}`, scene);
        moonMaterial.diffuseColor = new BABYLON.Color3(
            0.4 + Math.random() * 0.2,
            0.35 + Math.random() * 0.15,
            0.3 + Math.random() * 0.1
        );
        
        moon.material = moonMaterial;
        moon.parent = planet;
        
        const moonSpeed = Math.sqrt(1 / Math.pow(moonDistance / planetSize, 3)) * 0.08;
        const startAngle = Math.random() * Math.PI * 2;
        
        moon.position.x = Math.cos(startAngle) * moonDistance;
        moon.position.z = Math.sin(startAngle) * moonDistance;
        moon.position.y = (Math.random() - 0.5) * moonDistance * 0.2;
        
        moon.userData = {
            orbitalDistance: moonDistance,
            orbitalSpeed: moonSpeed,
            currentAngle: startAngle,
            rotationSpeed: 0.015 + Math.random() * 0.02,
            type: 'moon'
        };
    }
}

// Create cosmic environment with simple space background
function createCosmicEnvironment(parentGroup) {
    const envGroup = new BABYLON.TransformNode("cosmicEnvironment", scene);
    envGroup.parent = parentGroup;
    
    // Dark navy ambient lighting with cosmic tints
    scene.ambientColor = new BABYLON.Color3(
        COLOR_PALETTE.DARK_NAVY.r * 1.2,
        COLOR_PALETTE.DARK_NAVY.g * 1.2,
        COLOR_PALETTE.DARK_NAVY.b * 1.5
    );
    
    // Cool rim lighting
    const rimLight = new BABYLON.DirectionalLight("rimLight", new BABYLON.Vector3(-0.5, -0.3, -0.8), scene);
    rimLight.diffuse = new BABYLON.Color3(
        COLOR_PALETTE.CYAN.r * 0.4,
        COLOR_PALETTE.CYAN.g * 0.5,
        COLOR_PALETTE.CYAN.b * 0.6
    );
    rimLight.intensity = 0.5;
    
    // Simple sparkling stars
    createSparklingStars(envGroup);
    
    // Single distant galaxy
    createDistantGalaxy(envGroup);
    
    return envGroup;
}

// Create simple sparkling stars in the background
function createSparklingStars(parentGroup) {
    const starSystem = new BABYLON.ParticleSystem("sparklingStars", 500, scene);
    
    // Simple star texture
    starSystem.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
            <defs>
                <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:white;stop-opacity:1" />
                    <stop offset="80%" style="stop-color:lightblue;stop-opacity:0.6" />
                    <stop offset="100%" style="stop-color:blue;stop-opacity:0" />
                </radialGradient>
            </defs>
            <circle cx="6" cy="6" r="6" fill="url(#starGlow)" />
        </svg>
    `), scene);
    
    starSystem.emitter = parentGroup;
    starSystem.createSphereEmitter(800); // Large sphere around the scene
    
    starSystem.color1 = new BABYLON.Color4(1, 1, 1, 0.8);
    starSystem.color2 = new BABYLON.Color4(0.8, 0.9, 1, 0.6);
    starSystem.colorDead = new BABYLON.Color4(0.6, 0.7, 1, 0);
    
    starSystem.minSize = 0.2;
    starSystem.maxSize = 1.0;
    starSystem.minLifeTime = Number.MAX_VALUE; // Stars don't die
    starSystem.maxLifeTime = Number.MAX_VALUE;
    starSystem.emitRate = 0; // Manual emit
    
    starSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    starSystem.start();
    starSystem.manualEmitCount = 500; // Emit all stars at once
    
    // Add twinkling animation data after particles are created
    setTimeout(() => {
        starSystem.particles.forEach((particle, i) => {
            if (particle) {
                particle.userData = {
                    baseBrightness: particle.color.a,
                    twinkleSpeed: 0.01 + Math.random() * 0.03,
                    twinklePhase: Math.random() * Math.PI * 2
                };
            }
        });
    }, 500);
    
    energyParticles.push(starSystem);
    return starSystem;
}

// Create cosmic nebulae
function createCosmicNebulae(parentGroup) {
    const nebulae = [];
    
    for (let i = 0; i < 8; i++) {
        const nebulaSystem = new BABYLON.ParticleSystem(`cosmicNebula${i}`, 300, scene);
        
        nebulaSystem.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                <defs>
                    <radialGradient id="nebulaGrad${i}" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" style="stop-color:white;stop-opacity:0.2" />
                        <stop offset="50%" style="stop-color:cyan;stop-opacity:0.1" />
                        <stop offset="100%" style="stop-color:purple;stop-opacity:0" />
                    </radialGradient>
                </defs>
                <circle cx="16" cy="16" r="16" fill="url(#nebulaGrad${i})" />
            </svg>
        `), scene);
        
        // Position nebula in space
        const emitter = BABYLON.MeshBuilder.CreateSphere(`nebulaEmitter${i}`, {diameter: 0.1}, scene);
        emitter.isVisible = false;
        emitter.position = new BABYLON.Vector3(
            (Math.random() - 0.5) * 600,
            (Math.random() - 0.5) * 200,
            (Math.random() - 0.5) * 600
        );
        emitter.parent = parentGroup;
        
        nebulaSystem.emitter = emitter;
        nebulaSystem.createSphereEmitter(50);
        
        // Colorful nebula variations
        const nebulaColors = [
            [new BABYLON.Color4(0.8, 0.4, 1, 0.15), new BABYLON.Color4(0.6, 0.2, 0.8, 0.08)],  // Purple
            [new BABYLON.Color4(0.4, 0.8, 1, 0.15), new BABYLON.Color4(0.2, 0.6, 0.8, 0.08)],  // Cyan
            [new BABYLON.Color4(1, 0.6, 0.4, 0.15), new BABYLON.Color4(0.8, 0.4, 0.2, 0.08)],  // Orange
            [new BABYLON.Color4(0.6, 1, 0.4, 0.15), new BABYLON.Color4(0.4, 0.8, 0.2, 0.08)],  // Green
        ];
        
        const colorPair = nebulaColors[i % nebulaColors.length];
        nebulaSystem.color1 = colorPair[0];
        nebulaSystem.color2 = colorPair[1];
        nebulaSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        
        nebulaSystem.minSize = 20;
        nebulaSystem.maxSize = 60;
        nebulaSystem.minLifeTime = Number.MAX_VALUE;
        nebulaSystem.maxLifeTime = Number.MAX_VALUE;
        nebulaSystem.emitRate = 0;
        
        nebulaSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        nebulaSystem.start();
        nebulaSystem.manualEmitCount = 300;
        
        nebulaSystem.userData = {
            swaySpeed: 0.001 + Math.random() * 0.002,
            breathSpeed: 0.002 + Math.random() * 0.003,
            originalPosition: emitter.position.clone()
        };
        
        nebulae.push(nebulaSystem);
        energyParticles.push(nebulaSystem);
    }
    
    return nebulae;
}

// Create stellar phenomena (pulsars, quasars, etc.)
function createStellarPhenomena(parentGroup, scene, energyParticles) {
    // Create a distant quasar
    const quasar = BABYLON.MeshBuilder.CreateSphere("quasar", { diameter: 3 }, scene);
    quasar.position = new BABYLON.Vector3(800, 200, -600);
    quasar.parent = parentGroup;
    
    const quasarMaterial = new BABYLON.StandardMaterial("quasarMat", scene);
    quasarMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
    quasarMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.9, 1);
    quasarMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
    quasar.material = quasarMaterial;
    
    // Quasar jet particle system
    const quasarJet = new BABYLON.ParticleSystem("quasarJet", 200, scene);
    quasarJet.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="6" height="6" viewBox="0 0 6 6">
            <circle cx="3" cy="3" r="3" fill="white" opacity="0.6"/>
        </svg>
    `), scene);
    
    quasarJet.emitter = quasar;
    quasarJet.createConeEmitter(0.1, 0.1);
    quasarJet.direction1 = new BABYLON.Vector3(0, 1, 0);
    quasarJet.direction2 = new BABYLON.Vector3(0, 1, 0);
    quasarJet.minEmitPower = 20;
    quasarJet.maxEmitPower = 40;
    quasarJet.color1 = new BABYLON.Color4(1, 1, 1, 0.8);
    quasarJet.color2 = new BABYLON.Color4(0.8, 0.9, 1, 0.4);
    quasarJet.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    quasarJet.minSize = 0.5;
    quasarJet.maxSize = 2;
    quasarJet.minLifeTime = 10;
    quasarJet.maxLifeTime = 20;
    quasarJet.emitRate = 10;
    quasarJet.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    quasarJet.start();
    
    // Store for animation
    quasar.userData = {
        pulseSpeed: 0.005,
        baseBrightness: quasarMaterial.emissiveColor.clone()
    };
    
    energyParticles.push(quasarJet);
    return [quasar, quasarJet];
}

// Create enhanced visual effects
function createCosmicVisualEffects(scene) {
    if (scene.activeCamera) {
        try {
            const depthOfFieldEffect = new BABYLON.DepthOfFieldEffect(scene.activeCamera, {
                focusDistance: 100,
                fStop: 1.2,
                focalLength: 50,
                blurBackgroundEffect: true
            });
            const bloomEffect = new BABYLON.BloomEffect(scene, 1.2, 0.5, 512);
            bloomEffect.luminanceThreshold = 0.25;
            bloomEffect.luminanceSmoothing = 0.9;
            bloomEffect.bloomScale = 0.8;
            console.log('✨ Enhanced cosmic visual effects applied');
        } catch (error) {
            console.warn('Visual effects not supported on this device:', error);
        }
    }
}

// Main environment setup
function createEnvironment(scene, energyParticles) {
    const envGroup = new BABYLON.TransformNode("envGroup", scene);

    // Add stellar phenomena
    createStellarPhenomena(envGroup, scene, energyParticles);

    // Apply post-processing / visual effects
    createCosmicVisualEffects(scene);

    return envGroup;
}


// Enhanced update function with meditative timing and effects
export function updateBlackHoleEffects() {
    if (!blackHoleSystem || !blackHoleSystem.group) return;
    
    const time = Date.now() * 0.001; // Convert to seconds
    
    // Update unified ring family rotation with varied axes and meditative timing
    authenticRings.forEach((ring, index) => {
        if (ring && ring.userData) {
            // Smooth rotation on the designated axis
            if (ring.userData.rotationAxis === 'y') {
                ring.rotation.y += ring.userData.baseRotationSpeed;
            } else if (ring.userData.rotationAxis === 'z') {
                ring.rotation.z += ring.userData.baseRotationSpeed;
            }
            
            // Maintain the initial random tilts while spinning
            if (ring.userData.rotationAxis === 'y') {
                ring.rotation.z = ring.userData.initialTiltZ;
            } else {
                ring.rotation.y = ring.userData.initialTiltY;
            }
            
            // Subtle pulsation effect
            const pulsePhase = time * 0.5 + ring.userData.pulsationPhase;
            const pulseIntensity = 0.9 + Math.sin(pulsePhase) * 0.1;
            
            if (ring.material && ring.material.emissiveColor) {
                const baseMaterial = ring.material;
                baseMaterial.emissiveColor = baseMaterial.emissiveColor.scale(pulseIntensity);
            }
        }
    });
    
    // Update balanced orbital motion with random orbital planes
    orbitalBodies.forEach(body => {
        if (body && body.userData) {
            // Update orbital angle
            body.userData.currentAngle += body.userData.orbitalSpeed;
            
            // Calculate position based on orbital parameters
            const distance = body.userData.orbitalDistance;
            const angle = body.userData.currentAngle;
            const inclination = body.userData.orbitalInclination || 0;
            const planeRotation = body.userData.orbitalPlaneRotation || 0;
            const eccentricity = body.userData.eccentricity || 0;
            
            // Apply eccentricity to distance
            const adjustedDistance = distance * (1 + eccentricity * Math.cos(angle));
            
            // Calculate position in orbital plane
            const x = Math.cos(angle) * adjustedDistance;
            const z = Math.sin(angle) * adjustedDistance;
            const y = Math.sin(inclination) * adjustedDistance * 0.5;
            
            // Apply orbital plane rotation
            body.position.x = x * Math.cos(planeRotation) - z * Math.sin(planeRotation);
            body.position.z = x * Math.sin(planeRotation) + z * Math.cos(planeRotation);
            body.position.y = y;
            
            // Self rotation with varied axes
            body.rotation.y += body.userData.rotationSpeed;
            body.rotation.x += body.userData.rotationSpeed * 0.3;
            body.rotation.z += body.userData.rotationSpeed * 0.1;
        }
    });
    
    // Update accretion disk pulsation (6-second cycle)
    if (accretionDisk && accretionDisk.userData) {
        const diskData = accretionDisk.userData;
        const pulsePhase = (time % diskData.pulsePeriod) / diskData.pulsePeriod * Math.PI * 2;
        const brightness = diskData.baseBrightness + Math.sin(pulsePhase) * diskData.pulseAmplitude;
        
        if (accretionDisk.material && accretionDisk.material.emissiveColor) {
            accretionDisk.material.emissiveColor = accretionDisk.material.emissiveColor.scale(brightness);
        }
    }
    
    // Polar jet emissions every ~8 seconds
    if (blackHoleSystem.group && blackHoleSystem.group.userData) {
        const jetData = blackHoleSystem.group.userData;
        if (jetData && time - jetData.lastJetEmission > jetData.jetInterval / 1000) {
            // Trigger jet burst
            if (jetData.upperJet) {
                jetData.upperJet.emitRate = 150;
                setTimeout(() => {
                    if (jetData.upperJet) jetData.upperJet.emitRate = 0;
                }, 2000); // 2-second burst
            }
            
            if (jetData.lowerJet) {
                jetData.lowerJet.emitRate = 150;
                setTimeout(() => {
                    if (jetData.lowerJet) jetData.lowerJet.emitRate = 0;
                }, 2000);
            }
            
            jetData.lastJetEmission = time;
        }
    }
    
    // Update gravitational wave ripples
    gravitationalWaves.forEach(wave => {
        if (wave && wave.metadata) {
            const meta = wave.metadata;
            const ripplePhase = time * meta.speed + meta.phase;
            const rippleScale = 1 + Math.sin(ripplePhase) * meta.rippleAmplitude;
            
            wave.scaling.x = rippleScale;
            wave.scaling.z = rippleScale;
        }
    });
    
    // ✨ SIMPLE COSMIC ENVIRONMENT ANIMATIONS ✨
    
    // Animate sparkling stars twinkling
    energyParticles.forEach(particleSystem => {
        if (particleSystem && particleSystem.particles && particleSystem.name === "sparklingStars") {
            particleSystem.particles.forEach(particle => {
                if (particle && particle.userData) {
                    const data = particle.userData;
                    const twinklePhase = time * data.twinkleSpeed + data.twinklePhase;
                    const twinkleIntensity = 0.4 + Math.sin(twinklePhase) * 0.6;
                    
                    // Simple twinkling effect
                    particle.color.a = data.baseBrightness * twinkleIntensity;
                }
            });
        }
    });
    
    // Animate distant galaxy - rotation and pulsing
    scene.transformNodes.forEach(node => {
        if (node.name === 'distantGalaxy' && node.userData) {
            const data = node.userData;
            
            // Slow galaxy rotation
            node.rotation.y += data.rotationSpeed;
            
            // Galaxy core pulsing
            const pulsePhase = time * data.pulseSpeed;
            const pulseBrightness = 0.8 + Math.sin(pulsePhase) * 0.2;
            
            // Find and update galaxy core material
            node.getChildren().forEach(child => {
                if (child.name === 'galaxyCore' && child.material) {
                    child.material.emissiveColor = data.baseBrightness.scale(pulseBrightness);
                }
            });
        }
    });
    
    // Subtle shader material updates for realistic lighting
    shaderMaterials.forEach(material => {
        if (material && material.emissiveColor) {
            const flickerPhase = time * 2 + Math.random() * Math.PI;
            const flicker = 0.95 + Math.sin(flickerPhase) * 0.05;
            material.emissiveColor = material.emissiveColor.scale(flicker);
        }
    });
}
