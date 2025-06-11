// blackhole.js
// Enhanced Black Hole System - Complete Physics-Driven Implementation
// Creates spectacular cosmic phenomena with realistic orbital mechanics and gravitational effects

import { scene } from './scene3d.js';
import { appState } from './state.js';

export let blackHoleSystem = {};
let shaderMaterials = [];
let energyParticles = [];
let gravitationalWaves = [];
let dustParticleSystem = null;
let lensingPlane = null;
let polarJetParticles = [];

// Orbital architecture constants
const ORBITAL_BANDS = {
    INNER: { inclination: 0, distance: 25, color: [1, 0.8, 0.4] },
    MIDDLE: { inclination: 0.26, distance: 45, color: [0.8, 1, 0.6] }, // +15° in radians
    OUTER: { inclination: -0.17, distance: 75, color: [0.6, 0.8, 1] }  // -10° in radians
};

// Orbital bodies with astrophysical hierarchy
let orbitalBodies = [];
let comets = [];

export function createEnhancedBlackHole() {
    try {
        if (!scene) {
            console.error('Scene not available for black hole creation');
            return;
        }

        console.log('Creating enhanced black hole with orbital architecture...');

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

        // Create enhanced accretion disk with temperature gradients
        const accretionDisk = createRealisticAccretionDisk(blackHoleGroup);
        console.log('Realistic accretion disk created');

        // Create gravitational lensing effects with spacetime distortion
        createSpacetimeLensing(blackHoleGroup);
        console.log('Spacetime lensing created');

        // Create orbital architecture with physics-driven motion
        createOrbitalArchitecture(blackHoleGroup);
        console.log('Orbital architecture created');

        // Create comets with eccentric trajectories
        createCometSwarms(blackHoleGroup);
        console.log('Comet swarms created');

        // Create energy particles
        createEnergyParticles(blackHoleGroup);
        console.log('Energy particles created');

        // Create central energy column
        createCentralEnergyColumn(blackHoleGroup);
        console.log('Central energy column created');

        // Store the black hole system
        blackHoleSystem = {
            group: blackHoleGroup,
            eventHorizon: eventHorizon,
            accretionDisk: accretionDisk,
            eventHorizonMaterial: eventHorizonMaterial,
            orbitalBodies: orbitalBodies,
            comets: comets
        };
        
        console.log('Enhanced black hole system created successfully');
        
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

// Enhanced black hole effects animation with physics-driven orbital mechanics
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
        const baseSpeed = 0.0008;
        const bonusSpeed = completedTasks * 0.0001;
        const focusBoost = isFocusMode ? 0.0003 : 0;
        const rotationSpeed = baseSpeed + bonusSpeed + focusBoost;
        
        blackHoleSystem.group.rotation.y += rotationSpeed;
        
        // Add subtle wobble during focus mode
        if (isFocusMode) {
            const wobble = Math.sin(time * 0.5) * 0.015;
            blackHoleSystem.group.rotation.x = wobble;
            blackHoleSystem.group.rotation.z = Math.cos(time * 0.3) * 0.008;
        }
    }
    
    // Enhanced accretion disk animation with realistic temperature dynamics
    if (blackHoleSystem.accretionDisk) {
        const rings = blackHoleSystem.accretionDisk.getChildren();
        rings.forEach(ring => {
            if (ring.metadata && ring.metadata.baseRotationSpeed) {
                // Keplerian rotation with differential speeds
                const speedMultiplier = isFocusMode ? 1.3 : 1;
                ring.rotation.z += ring.metadata.baseRotationSpeed * speedMultiplier;
                
                // Temperature fluctuations
                const tempVariation = 1 + Math.sin(time * 2 + ring.metadata.index * 0.8) * 0.1;
                const focusHeat = isFocusMode ? 1.2 : 1;
                
                if (ring.material) {
                    const baseIntensity = ring.metadata.tempFactor;
                    const dynamicIntensity = baseIntensity * tempVariation * focusHeat;
                    
                    // Update material colors based on temperature
                    if (baseIntensity > 0.8) {
                        ring.material.emissiveColor = new BABYLON.Color3(
                            0.8 * dynamicIntensity,
                            0.8 * dynamicIntensity,
                            0.6 * dynamicIntensity
                        );
                    } else if (baseIntensity > 0.6) {
                        ring.material.emissiveColor = new BABYLON.Color3(
                            0.6 * dynamicIntensity,
                            0.7 * dynamicIntensity,
                            0.8 * dynamicIntensity
                        );
                    } else {
                        ring.material.emissiveColor = new BABYLON.Color3(
                            0.8 * dynamicIntensity,
                            0.5 * dynamicIntensity,
                            0.2 * dynamicIntensity
                        );
                    }
                }
            }
        });
    }
    
    // Update orbital bodies with realistic physics
    orbitalBodies.forEach(body => {
        if (!body.userData) return;
        
        const userData = body.userData;
        
        if (userData.type === 'debris') {
            // Simple rotation for debris rings
            body.rotation.z += userData.orbitalSpeed;
        } else {
            // Complex orbital mechanics for planets and objects
            updateOrbitalMotion(body, time);
        }
        
        // Rotational motion
        body.rotation.y += userData.rotationSpeed;
        
        // Orbital precession (slow drift of orbit orientation)
        if (userData.precessionRate) {
            userData.currentAngle += userData.precessionRate;
        }
        
        // Update moon systems
        if (body.getChildren) {
            body.getChildren().forEach(child => {
                if (child.userData && child.userData.type === 'moon') {
                    updateMoonOrbit(child, time);
                } else if (child.userData && child.userData.type === 'planetRing') {
                    child.rotation.z += child.userData.rotationSpeed;
                }
            });
        }
    });
    
    // Update comet orbits and tails
    comets.forEach(comet => {
        updateCometOrbit(comet, time);
    });
    
    // Animate central energy column with enhanced physics
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
    
    // Enhanced gravitational waves and spacetime lensing
    gravitationalWaves.forEach((wave, index) => {
        if (wave.metadata) {
            const data = wave.metadata;
            
            // Spacetime ripple effects
            const rippleFactor = 1 + Math.sin(time * data.speed * 100 + data.phase) * data.rippleAmplitude;
            wave.scaling.setAll(rippleFactor);
            wave.rotation.z += data.speed;
            
            // Dynamic lensing opacity
            if (wave.material) {
                const baseAlpha = 0.4 - index * 0.05;
                const focusBonus = isFocusMode ? 0.2 : 0;
                const rippleAlpha = Math.sin(time * 0.8 + index) * 0.1;
                wave.material.alpha = baseAlpha + focusBonus + rippleAlpha;
                
                // Enhanced blue-shifted glow during focus
                const glowIntensity = isFocusMode ? 1.4 : 1;
                wave.material.emissiveColor = new BABYLON.Color3(
                    0.1 * glowIntensity,
                    0.15 * glowIntensity,
                    0.4 * glowIntensity
                );
            }
        }
    });
    
    // Update spacetime lensing plane
    if (lensingPlane && lensingPlane.material) {
        const distortionIntensity = 0.15 + Math.sin(time * 0.3) * 0.05;
        lensingPlane.material.alpha = distortionIntensity * (isFocusMode ? 1.5 : 1);
    }
    
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
        blackHoleSystem.eventHorizonMaterial.emissiveColor = 
            blackHoleSystem.eventHorizonMaterial.emissiveColor.scale(1 + horizonPulse);
    }
    
    // Update all energy particle systems
    energyParticles.forEach(system => {
        if (isFocusMode) {
            system.emitRate = Math.min(system.emitRate * 1.5, 300);
        } else {
            // Restore normal emission rates based on system type
            if (system.name && system.name.includes('energyParticles')) {
                system.emitRate = 30;
            } else if (system.name && system.name.includes('columnParticles')) {
                system.emitRate = 100;
            } else if (system.name && system.name.includes('cometTail')) {
                // Comet tail rate is handled in updateCometPosition
            } else {
                system.emitRate = 20;
            }
        }
    });
}

// Update orbital motion using realistic physics
function updateOrbitalMotion(body, time) {
    const userData = body.userData;
    
    // Update mean anomaly
    userData.currentAngle += userData.orbitalSpeed;
    
    // Calculate eccentric anomaly (simplified Kepler's equation)
    const eccentricAnomaly = userData.currentAngle + userData.eccentricity * Math.sin(userData.currentAngle);
    
    // Calculate true anomaly
    const trueAnomaly = 2 * Math.atan(
        Math.sqrt((1 + userData.eccentricity) / (1 - userData.eccentricity)) * 
        Math.tan(eccentricAnomaly / 2)
    );
    
    // Calculate orbital radius
    const orbitalRadius = userData.orbitalDistance * (1 - userData.eccentricity * userData.eccentricity) / 
                         (1 + userData.eccentricity * Math.cos(trueAnomaly));
    
    // Update position
    body.position.x = Math.cos(trueAnomaly) * orbitalRadius;
    body.position.z = Math.sin(trueAnomaly) * orbitalRadius;
    
    // Small vertical oscillation
    body.position.y = Math.sin(time * 0.1 + userData.currentAngle) * 0.8;
}

// Update moon orbits
function updateMoonOrbit(moon, time) {
    const userData = moon.userData;
    
    userData.currentAngle += userData.orbitalSpeed;
    
    const x = Math.cos(userData.currentAngle) * userData.orbitalDistance;
    const z = Math.sin(userData.currentAngle) * userData.orbitalDistance;
    const y = Math.sin(userData.currentAngle * 2) * userData.orbitalDistance * 0.2;
    
    moon.position.x = x;
    moon.position.y = y;
    moon.position.z = z;
    
    moon.rotation.y += userData.rotationSpeed;
}

// Update comet orbits with tail dynamics
function updateCometOrbit(comet, time) {
    const userData = comet.userData;
    
    // Update mean anomaly
    userData.currentAnomaly += userData.orbitalSpeed;
    
    // Update position
    updateCometPosition(comet);
    
    // Rotation
    comet.rotation.x += userData.rotationSpeed;
    comet.rotation.y += userData.rotationSpeed * 0.7;
    comet.rotation.z += userData.rotationSpeed * 0.5;
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
    orbitalBodies = [];
    comets = [];
}