// galaxy.js
// Enhanced Galaxy Creation Module - Complete Fixed Babylon.js Implementation
// Creates beautiful, smooth cosmic elements with advanced particle systems

import { scene, stars, planets, comets, galaxyCore, spaceObjects } from './scene3d.js';

export function createStarField() {
    try {
        if (!scene) {
            console.warn('Scene not available for star field creation');
            return;
        }

        // Create enhanced star field with Babylon.js particle system
        const starCount = 10000; // Reduced for better performance
        
        // Create a custom star particle system
        const starParticleSystem = new BABYLON.ParticleSystem("starParticles", starCount, scene);
        
        // Create a dummy emitter (we'll position particles manually)
        const emitter = BABYLON.MeshBuilder.CreateBox("emitter", {size: 0.01}, scene);
        emitter.isVisible = false;
        starParticleSystem.emitter = emitter;
        
        // Enhanced star texture
        starParticleSystem.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                <defs>
                    <radialGradient id="starGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" style="stop-color:white;stop-opacity:1" />
                        <stop offset="70%" style="stop-color:white;stop-opacity:0.8" />
                        <stop offset="100%" style="stop-color:white;stop-opacity:0" />
                    </radialGradient>
                </defs>
                <circle cx="16" cy="16" r="16" fill="url(#starGrad)" />
            </svg>
        `), scene);
        
        // Enhanced particle properties
        starParticleSystem.minSize = 0.5;
        starParticleSystem.maxSize = 3.0;
        starParticleSystem.minLifeTime = Number.MAX_VALUE; // Stars live forever
        starParticleSystem.maxLifeTime = Number.MAX_VALUE;
        starParticleSystem.emitRate = 0; // We'll emit all at once
        
        // Enhanced blending for cosmic glow
        starParticleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        // Color variations
        starParticleSystem.color1 = new BABYLON.Color4(1, 1, 1, 1);
        starParticleSystem.color2 = new BABYLON.Color4(0.8, 0.8, 1, 1);
        starParticleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        
        // Start the particle system and emit all particles at once
        starParticleSystem.start();
        starParticleSystem.manualEmitCount = starCount;
        
        // Position star particles manually after a short delay
        setTimeout(() => {
            const particles = starParticleSystem.particles;
            
            for (let i = 0; i < particles.length; i++) {
                const particle = particles[i];
                if (!particle) continue;
                
                // Distribute stars in a sphere
                const radius = 100 + Math.random() * 400;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                
                particle.position.x = radius * Math.sin(phi) * Math.cos(theta);
                particle.position.y = radius * Math.sin(phi) * Math.sin(theta);
                particle.position.z = radius * Math.cos(phi);
                
                // Varied star sizes
                const isBrightStar = Math.random() < 0.1;
                particle.size = isBrightStar ? 2 + Math.random() * 1 : 0.5 + Math.random() * 1.5;
                
                // Color variations
                const colorType = Math.random();
                if (colorType < 0.7) {
                    // White/blue stars
                    particle.color = new BABYLON.Color4(
                        0.9 + Math.random() * 0.1,
                        0.9 + Math.random() * 0.1,
                        1,
                        0.8
                    );
                } else if (colorType < 0.9) {
                    // Yellow stars
                    particle.color = new BABYLON.Color4(
                        1,
                        0.9 + Math.random() * 0.1,
                        0.7 + Math.random() * 0.2,
                        0.8
                    );
                } else {
                    // Red stars
                    particle.color = new BABYLON.Color4(
                        1,
                        0.7 + Math.random() * 0.2,
                        0.6 + Math.random() * 0.2,
                        0.8
                    );
                }
            }
        }, 100);
        
        // Store particle system
        starParticleSystem.userData = {
            rotationSpeed: 0.00005,
            isMainStarField: true
        };
        
        stars.push(starParticleSystem);
        
        console.log('✨ Star field created with', starCount, 'stars');
        
        // Create nebula clouds
        createNebulaCloud();
        
    } catch (error) {
        console.error('Failed to create star field:', error);
        // Create a simple fallback
        createFallbackStars();
    }
}

// Fallback star creation
function createFallbackStars() {
    try {
        // Create simple sphere-based stars
        for (let i = 0; i < 50; i++) {
            const star = BABYLON.MeshBuilder.CreateSphere(`star${i}`, {diameter: 2}, scene);
            
            // Random position
            star.position = new BABYLON.Vector3(
                (Math.random() - 0.5) * 300,
                (Math.random() - 0.5) * 300,
                (Math.random() - 0.5) * 300
            );
            
            // Simple material
            const starMat = new BABYLON.StandardMaterial(`starMat${i}`, scene);
            starMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
            starMat.disableLighting = true;
            star.material = starMat;
            
            stars.push(star);
        }
        console.log('✨ Fallback stars created');
    } catch (e) {
        console.error('Fallback star creation failed:', e);
    }
}

// Create nebula clouds
function createNebulaCloud() {
    const cloudCount = 3;
    
    for (let i = 0; i < cloudCount; i++) {
        const nebulaSystem = new BABYLON.ParticleSystem(`nebula${i}`, 500, scene);
        
        const emitter = BABYLON.MeshBuilder.CreateSphere(`nebulaEmitter${i}`, {diameter: 0.1}, scene);
        emitter.isVisible = false;
        emitter.position = new BABYLON.Vector3(
            (Math.random() - 0.5) * 200,
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 200
        );
        nebulaSystem.emitter = emitter;
        
        // Nebula texture
        nebulaSystem.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
                <defs>
                    <radialGradient id="nebulaGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" style="stop-color:white;stop-opacity:0.6" />
                        <stop offset="40%" style="stop-color:white;stop-opacity:0.3" />
                        <stop offset="100%" style="stop-color:white;stop-opacity:0" />
                    </radialGradient>
                </defs>
                <circle cx="32" cy="32" r="32" fill="url(#nebulaGrad)" />
            </svg>
        `), scene);
        
        // Nebula colors
        const nebulaColors = [
            [new BABYLON.Color4(0.4, 0.2, 0.8, 0.3), new BABYLON.Color4(0.6, 0.4, 1, 0.1)], // Purple
            [new BABYLON.Color4(0.2, 0.4, 0.8, 0.3), new BABYLON.Color4(0.4, 0.6, 1, 0.1)], // Blue
            [new BABYLON.Color4(0.8, 0.2, 0.4, 0.3), new BABYLON.Color4(1, 0.4, 0.6, 0.1)]  // Pink
        ];
        
        const colorPair = nebulaColors[i % nebulaColors.length];
        nebulaSystem.color1 = colorPair[0];
        nebulaSystem.color2 = colorPair[1];
        nebulaSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        
        nebulaSystem.minSize = 10;
        nebulaSystem.maxSize = 30;
        nebulaSystem.minLifeTime = Number.MAX_VALUE;
        nebulaSystem.maxLifeTime = Number.MAX_VALUE;
        nebulaSystem.emitRate = 0;
        nebulaSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        nebulaSystem.start();
        nebulaSystem.manualEmitCount = 200;
        
        // Position particles
        setTimeout(() => {
            const particles = nebulaSystem.particles;
            for (let j = 0; j < particles.length; j++) {
                const particle = particles[j];
                if (!particle) continue;
                
                // Gaussian distribution for cloud shape
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.abs(randomGaussian()) * 50;
                const height = randomGaussian() * 20;
                
                particle.position = new BABYLON.Vector3(
                    radius * Math.cos(angle),
                    height,
                    radius * Math.sin(angle)
                );
                
                particle.size = 10 + Math.random() * 20;
                particle.color = BABYLON.Color4.Lerp(colorPair[0], colorPair[1], Math.random());
            }
        }, 150 + i * 50);
        
        nebulaSystem.userData = {
            isNebula: true
        };
        
        stars.push(nebulaSystem);
    }
}

// Helper function for Gaussian distribution
function randomGaussian() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function createGalaxyCore() {
    // The black hole is created in blackhole.js
    console.log('Galaxy core will be created by blackhole.js');
}

export function createPlanets() {
    const planetConfigs = [
        { 
            size: 2, 
            color: new BABYLON.Color3(0.8, 0.3, 0.3), 
            emissive: new BABYLON.Color3(0.2, 0.05, 0.05), 
            distance: 25, 
            speed: 0.02,
            name: 'Mars-like'
        },
        { 
            size: 3, 
            color: new BABYLON.Color3(0.3, 0.6, 0.8), 
            emissive: new BABYLON.Color3(0.05, 0.1, 0.2), 
            distance: 35, 
            speed: 0.015,
            name: 'Neptune-like'
        },
        { 
            size: 1.5, 
            color: new BABYLON.Color3(0.9, 0.8, 0.4), 
            emissive: new BABYLON.Color3(0.2, 0.15, 0.05), 
            distance: 45, 
            speed: 0.01,
            name: 'Venus-like'
        },
        { 
            size: 4, 
            color: new BABYLON.Color3(0.6, 0.8, 0.7), 
            emissive: new BABYLON.Color3(0.1, 0.15, 0.1), 
            distance: 60, 
            speed: 0.008,
            name: 'Gas Giant',
            rings: true
        }
    ];

    planetConfigs.forEach((config, index) => {
        // Create planet
        const planet = BABYLON.MeshBuilder.CreateSphere(`planet_${index}`, {
            diameter: config.size * 2,
            segments: 32
        }, scene);
        
        // Create material
        const planetMaterial = new BABYLON.StandardMaterial(`planetMat_${index}`, scene);
        planetMaterial.diffuseColor = config.color;
        planetMaterial.emissiveColor = config.emissive;
        planetMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        planetMaterial.specularPower = 32;
        
        planet.material = planetMaterial;
        
        // Position planet
        const startAngle = (Math.PI * 2 * index) / planetConfigs.length;
        planet.position.x = Math.cos(startAngle) * config.distance;
        planet.position.z = Math.sin(startAngle) * config.distance;
        planet.position.y = 0;
        
        // Animation data
        planet.userData = {
            distance: config.distance,
            speed: config.speed,
            angle: startAngle,
            rotationSpeed: (Math.random() + 0.5) * 0.01,
            name: config.name
        };
        
        // Store planet
        planets.push({
            mesh: planet,
            config: config
        });
        
        // Add rings to gas giant
        if (config.rings) {
            createPlanetRings(planet, config.size);
        }
        
        // Add moons to larger planets
        if (config.size >= 2) {
            createMoons(planet, config.size);
        }
        
        console.log(`✨ Created planet: ${config.name}`);
    });
}

// Create planet rings
function createPlanetRings(planet, planetSize) {
    const ring = BABYLON.MeshBuilder.CreateTorus("planetRing", {
        diameter: planetSize * 4,
        thickness: 0.3,
        tessellation: 64
    }, scene);
    
    ring.rotation.x = Math.PI / 2;
    ring.parent = planet;
    
    const ringMaterial = new BABYLON.StandardMaterial("ringMat", scene);
    ringMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.7, 0.6);
    ringMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.15, 0.1);
    ringMaterial.alpha = 0.7;
    ringMaterial.backFaceCulling = false;
    
    ring.material = ringMaterial;
}

// Create moons
function createMoons(planet, planetSize) {
    const moonCount = Math.floor(Math.random() * 2) + 1;
    
    for (let i = 0; i < moonCount; i++) {
        const moonSize = planetSize * 0.2;
        const moon = BABYLON.MeshBuilder.CreateSphere(`moon_${i}`, {
            diameter: moonSize * 2,
            segments: 16
        }, scene);
        
        const moonMaterial = new BABYLON.StandardMaterial(`moonMat_${i}`, scene);
        moonMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        moonMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        
        moon.material = moonMaterial;
        
        const moonDistance = planetSize * (2 + i);
        
        moon.userData = {
            angle: Math.random() * Math.PI * 2,
            distance: moonDistance,
            speed: 0.03 + Math.random() * 0.02
        };
        
        moon.parent = planet;
    }
}

export function createNebula() {
    // Additional nebula background
    const nebulaSphere = BABYLON.MeshBuilder.CreateSphere("nebulaBackground", {
        diameter: 500,
        segments: 32
    }, scene);
    
    const nebulaMaterial = new BABYLON.StandardMaterial("nebulaBgMat", scene);
    nebulaMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.15);
    nebulaMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.08);
    nebulaMaterial.alpha = 0.15;
    nebulaMaterial.backFaceCulling = false;
    
    nebulaSphere.material = nebulaMaterial;
    nebulaSphere.renderingGroupId = 0;
    
    console.log('✨ Nebula background created');
}

export function createComets() {
    // Create comets
    for (let i = 0; i < 3; i++) {
        const cometGroup = new BABYLON.TransformNode(`cometGroup_${i}`, scene);
        
        // Comet head
        const cometHead = BABYLON.MeshBuilder.CreateSphere(`cometHead_${i}`, {diameter: 0.8}, scene);
        
        const cometMaterial = new BABYLON.StandardMaterial(`cometMaterial_${i}`, scene);
        cometMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 1);
        cometMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.8);
        cometHead.material = cometMaterial;
        cometHead.parent = cometGroup;
        
        // Comet tail particles
        const tailSystem = new BABYLON.ParticleSystem(`cometTail_${i}`, 200, scene);
        tailSystem.emitter = cometHead;
        
        tailSystem.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                <defs>
                    <radialGradient id="tailGrad">
                        <stop offset="0%" style="stop-color:white;stop-opacity:0.8" />
                        <stop offset="100%" style="stop-color:cyan;stop-opacity:0" />
                    </radialGradient>
                </defs>
                <circle cx="16" cy="16" r="16" fill="url(#tailGrad)" />
            </svg>
        `), scene);
        
        tailSystem.color1 = new BABYLON.Color4(0.5, 0.8, 1, 1);
        tailSystem.color2 = new BABYLON.Color4(1, 1, 1, 1);
        tailSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        tailSystem.minSize = 0.3;
        tailSystem.maxSize = 1.2;
        tailSystem.minLifeTime = 0.5;
        tailSystem.maxLifeTime = 2.0;
        tailSystem.emitRate = 100;
        tailSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        tailSystem.gravity = new BABYLON.Vector3(0, 0, 0);
        tailSystem.direction1 = new BABYLON.Vector3(-2, -0.5, -0.5);
        tailSystem.direction2 = new BABYLON.Vector3(-4, 0.5, 0.5);
        tailSystem.minEmitPower = 1;
        tailSystem.maxEmitPower = 3;
        
        tailSystem.start();
        
        // Initial position
        const angle = Math.random() * Math.PI * 2;
        cometGroup.position = new BABYLON.Vector3(
            Math.cos(angle) * 150,
            (Math.random() - 0.5) * 50,
            Math.sin(angle) * 150
        );
        
        // Animation data
        cometGroup.metadata = {
            velocity: new BABYLON.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.5
            ),
            life: 500 + Math.random() * 500,
            maxLife: 1000,
            tailSystem: tailSystem
        };
        
        comets.push(cometGroup);
    }
    
    console.log('☄️ Comets created');
}

export function createSpaceObjects() {
    // Create various space objects
    const objectTypes = [
        {
            name: 'satellite',
            count: 5,
            creator: function() {
                const group = new BABYLON.TransformNode("satelliteGroup", scene);
                
                // Main body
                const body = BABYLON.MeshBuilder.CreateBox("satelliteBody", {width: 1, height: 0.5, depth: 0.5}, scene);
                const bodyMaterial = new BABYLON.StandardMaterial("bodyMat", scene);
                bodyMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
                bodyMaterial.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
                body.material = bodyMaterial;
                body.parent = group;
                
                // Solar panels
                const panelMaterial = new BABYLON.StandardMaterial("panelMat", scene);
                panelMaterial.diffuseColor = new BABYLON.Color3(0, 0.1, 0.3);
                panelMaterial.emissiveColor = new BABYLON.Color3(0, 0, 0.1);
                
                const leftPanel = BABYLON.MeshBuilder.CreatePlane("leftPanel", {width: 2, height: 0.8}, scene);
                leftPanel.position.x = -1.5;
                leftPanel.rotation.y = Math.PI / 2;
                leftPanel.material = panelMaterial;
                leftPanel.parent = group;
                
                const rightPanel = BABYLON.MeshBuilder.CreatePlane("rightPanel", {width: 2, height: 0.8}, scene);
                rightPanel.position.x = 1.5;
                rightPanel.rotation.y = Math.PI / 2;
                rightPanel.material = panelMaterial;
                rightPanel.parent = group;
                
                return group;
            }
        },
        {
            name: 'asteroid',
            count: 8,
            creator: function() {
                const asteroid = BABYLON.MeshBuilder.CreateSphere("asteroid", {
                    diameter: 0.5 + Math.random() * 1,
                    segments: 6
                }, scene);
                
                // Deform for irregular shape
                const positions = asteroid.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i] += (Math.random() - 0.5) * 0.2;
                    positions[i + 1] += (Math.random() - 0.5) * 0.2;
                    positions[i + 2] += (Math.random() - 0.5) * 0.2;
                }
                asteroid.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
                asteroid.createNormals(false);
                
                const material = new BABYLON.StandardMaterial("asteroidMat", scene);
                material.diffuseColor = new BABYLON.Color3(0.5, 0.4, 0.3);
                material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                asteroid.material = material;
                
                return asteroid;
            }
        }
    ];

    // Create objects
    objectTypes.forEach(type => {
        for (let i = 0; i < type.count; i++) {
            const position = new BABYLON.Vector3(
                (Math.random() - 0.5) * 200,
                (Math.random() - 0.5) * 100,
                (Math.random() - 0.5) * 200
            );
            
            const object = type.creator();
            object.position = position;
            
            object.rotation = new BABYLON.Vector3(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );
            
            object.metadata = {
                type: type.name,
                rotationSpeed: (Math.random() + 0.1) * 0.01
            };
            
            spaceObjects.push(object);
        }
    });
    
    console.log('🛰️ Space objects created');
}