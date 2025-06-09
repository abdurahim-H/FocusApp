// Create stunning galaxy components with Babylon.js.


import { scene, engine, stars, planets, comets, galaxyCore, spaceObjects } from './scene3d.js';
import { trackBabylonMesh, trackBabylonMaterial, trackBabylonTexture, trackBabylonParticleSystem } from './cleanup.js';

// Create an immersive star field with multiple layers
export function createStarField(scene) {
    const starLayers = [];
    
    // Create multiple star layers for depth
    for (let layer = 0; layer < 3; layer++) {
        const starCount = 1000 - layer * 200;
        const starField = new BABYLON.Mesh(`starField${layer}`, scene);
        
        // Create custom vertex data for stars
        const positions = [];
        const colors = [];
        const sizes = [];
        
        for (let i = 0; i < starCount; i++) {
            // Random position in sphere
            const radius = 100 + layer * 150;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions.push(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.sin(phi) * Math.sin(theta),
                radius * Math.cos(phi)
            );
            
            // Star colors - white, blue, yellow, red
            const starType = Math.random();
            if (starType < 0.6) {
                colors.push(1, 1, 1, 1); // White
            } else if (starType < 0.8) {
                colors.push(0.7, 0.8, 1, 1); // Blue
            } else if (starType < 0.95) {
                colors.push(1, 1, 0.7, 1); // Yellow
            } else {
                colors.push(1, 0.5, 0.3, 1); // Red giant
            }
            
            // Variable star sizes
            sizes.push(0.5 + Math.random() * 2 + layer * 0.5);
        }
        
        // Create point cloud for stars
        const pointCloud = new BABYLON.PointsCloudSystem(`starCloud${layer}`, 1, scene);
        pointCloud.addPoints(starCount, (particle, i) => {
            particle.position = new BABYLON.Vector3(
                positions[i * 3],
                positions[i * 3 + 1],
                positions[i * 3 + 2]
            );
            particle.color = new BABYLON.Color4(
                colors[i * 4],
                colors[i * 4 + 1],
                colors[i * 4 + 2],
                colors[i * 4 + 3]
            );
        });
        
        pointCloud.buildMeshAsync().then((mesh) => {
            // Create twinkling shader material
            const starMaterial = new BABYLON.StandardMaterial(`starMat${layer}`, scene);
            starMaterial.pointsCloud = true;
            starMaterial.pointSize = 2 + layer;
            starMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
            
            mesh.material = starMaterial;
            mesh.metadata = {
                rotationSpeed: 0.0001 * (layer + 1),
                isStarField: true,
                layer: layer
            };
            
            starLayers.push(mesh);
            trackBabylonMesh(mesh);
            trackBabylonMaterial(starMaterial);
        });
    }
    
    return starLayers;
}

// Create a spectacular nebula with volumetric effects
export function createNebula(scene) {
    const nebulaMeshes = [];
    
    // Create multiple nebula clouds
    for (let i = 0; i < 5; i++) {
        const nebula = BABYLON.MeshBuilder.CreateSphere(`nebula${i}`, {
            diameter: 30 + Math.random() * 20,
            segments: 32
        }, scene);
        
        // Position nebula clouds
        const angle = (i / 5) * Math.PI * 2;
        const distance = 80 + Math.random() * 40;
        nebula.position = new BABYLON.Vector3(
            Math.cos(angle) * distance,
            (Math.random() - 0.5) * 40,
            Math.sin(angle) * distance
        );
        
        // Create volumetric nebula material
        const nebulaMaterial = new BABYLON.StandardMaterial(`nebulaMat${i}`, scene);
        nebulaMaterial.diffuseTexture = createNebulaTexture(scene, i);
        nebulaMaterial.opacityTexture = nebulaMaterial.diffuseTexture;
        nebulaMaterial.emissiveColor = getNebulaColor(i);
        nebulaMaterial.alpha = 0.3;
        nebulaMaterial.backFaceCulling = false;
        nebulaMaterial.alphaMode = BABYLON.Engine.ALPHA_ADD;
        
        nebula.material = nebulaMaterial;
        nebula.metadata = {
            isNebula: true,
            baseScale: nebula.scaling.clone(),
            pulsePhase: Math.random() * Math.PI * 2
        };
        
        nebulaMeshes.push(nebula);
        trackBabylonMesh(nebula);
        trackBabylonMaterial(nebulaMaterial);
    }
    
    return nebulaMeshes;
}

// Create procedural nebula texture
function createNebulaTexture(scene, index) {
    const size = 512;
    const texture = new BABYLON.DynamicTexture(`nebulaTexture${index}`, size, scene, false);
    const context = texture.getContext();
    
    // Create gradient
    const gradient = context.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    const colors = [
        ['rgba(99, 102, 241, 1)', 'rgba(139, 92, 246, 0.5)', 'rgba(99, 102, 241, 0)'],
        ['rgba(245, 40, 145, 1)', 'rgba(245, 40, 145, 0.5)', 'rgba(245, 40, 145, 0)'],
        ['rgba(6, 214, 160, 1)', 'rgba(6, 214, 160, 0.5)', 'rgba(6, 214, 160, 0)'],
        ['rgba(255, 190, 11, 1)', 'rgba(255, 190, 11, 0.5)', 'rgba(255, 190, 11, 0)'],
        ['rgba(108, 99, 255, 1)', 'rgba(108, 99, 255, 0.5)', 'rgba(108, 99, 255, 0)']
    ];
    
    const colorSet = colors[index % colors.length];
    gradient.addColorStop(0, colorSet[0]);
    gradient.addColorStop(0.5, colorSet[1]);
    gradient.addColorStop(1, colorSet[2]);
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    
    // Add noise for cloud effect
    const imageData = context.getImageData(0, 0, size, size);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 50;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    
    context.putImageData(imageData, 0, 0);
    texture.update();
    
    trackBabylonTexture(texture);
    return texture;
}

function getNebulaColor(index) {
    const colors = [
        new BABYLON.Color3(0.39, 0.4, 0.95),   // Purple-blue
        new BABYLON.Color3(0.96, 0.16, 0.57),  // Pink
        new BABYLON.Color3(0.02, 0.84, 0.63),  // Cyan
        new BABYLON.Color3(1, 0.75, 0.04),     // Golden
        new BABYLON.Color3(0.42, 0.39, 1)      // Indigo
    ];
    return colors[index % colors.length];
}

// Create realistic planets with atmosphere
export function createPlanets(scene) {
    const planets = [];
    
    const planetConfigs = [
        { name: 'Terra', size: 3, distance: 30, color: new BABYLON.Color3(0.2, 0.5, 0.8), hasAtmosphere: true },
        { name: 'Mars', size: 2, distance: 45, color: new BABYLON.Color3(0.8, 0.3, 0.1), hasAtmosphere: false },
        { name: 'Aurora', size: 4, distance: 60, color: new BABYLON.Color3(0.3, 0.8, 0.3), hasAtmosphere: true },
        { name: 'Nexus', size: 2.5, distance: 75, color: new BABYLON.Color3(0.6, 0.3, 0.8), hasAtmosphere: true }
    ];
    
    planetConfigs.forEach((config, index) => {
        // Create planet mesh
        const planet = BABYLON.MeshBuilder.CreateSphere(config.name, {
            diameter: config.size * 2,
            segments: 32
        }, scene);
        
        // Create planet material with custom shader
        const planetMaterial = new BABYLON.StandardMaterial(`${config.name}Mat`, scene);
        planetMaterial.diffuseColor = config.color;
        planetMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        planetMaterial.emissiveColor = config.color.scale(0.1);
        
        planet.material = planetMaterial;
        
        // Position planet
        const angle = (index / planetConfigs.length) * Math.PI * 2;
        planet.position.x = Math.cos(angle) * config.distance;
        planet.position.z = Math.sin(angle) * config.distance;
        planet.position.y = (Math.random() - 0.5) * 10;
        
        // Add atmosphere if configured
        if (config.hasAtmosphere) {
            const atmosphere = BABYLON.MeshBuilder.CreateSphere(`${config.name}Atmosphere`, {
                diameter: config.size * 2.4,
                segments: 32
            }, scene);
            
            const atmosphereMaterial = new BABYLON.StandardMaterial(`${config.name}AtmoMat`, scene);
            atmosphereMaterial.diffuseColor = config.color.scale(0.5);
            atmosphereMaterial.emissiveColor = config.color.scale(0.3);
            atmosphereMaterial.alpha = 0.3;
            atmosphereMaterial.backFaceCulling = false;
            
            atmosphere.material = atmosphereMaterial;
            atmosphere.parent = planet;
            
            trackBabylonMesh(atmosphere);
            trackBabylonMaterial(atmosphereMaterial);
        }
        
        // Add planet metadata
        planet.metadata = {
            name: config.name,
            distance: config.distance,
            speed: 0.1 / (index + 1),
            rotationSpeed: 0.01 + Math.random() * 0.02,
            angle: angle,
            orbitTilt: (Math.random() - 0.5) * 0.2
        };
        
        // Create moons for some planets
        if (Math.random() > 0.5) {
            const moonCount = 1 + Math.floor(Math.random() * 2);
            for (let m = 0; m < moonCount; m++) {
                const moon = BABYLON.MeshBuilder.CreateSphere(`${config.name}Moon${m}`, {
                    diameter: 0.5,
                    segments: 16
                }, scene);
                
                const moonMaterial = new BABYLON.StandardMaterial(`${config.name}MoonMat${m}`, scene);
                moonMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
                moonMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                
                moon.material = moonMaterial;
                moon.parent = planet;
                moon.position.x = (2 + m) * 1.5;
                
                moon.metadata = {
                    angle: 0,
                    distance: (2 + m) * 1.5,
                    speed: 0.03 * (m + 1)
                };
                
                trackBabylonMesh(moon);
                trackBabylonMaterial(moonMaterial);
            }
        }
        
        planets.push({ mesh: planet, config: config });
        trackBabylonMesh(planet);
        trackBabylonMaterial(planetMaterial);
    });
    
    return planets;
}

// Create dynamic comets
export function createComets(scene) {
    const comets = [];
    
    for (let i = 0; i < 3; i++) {
        // Create comet head
        const comet = BABYLON.MeshBuilder.CreateSphere(`comet${i}`, {
            diameter: 0.5,
            segments: 16
        }, scene);
        
        const cometMaterial = new BABYLON.StandardMaterial(`cometMat${i}`, scene);
        cometMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
        cometMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.9, 1);
        
        comet.material = cometMaterial;
        
        // Create comet tail using particle system
        const tail = new BABYLON.ParticleSystem(`cometTail${i}`, 500, scene);
        tail.particleTexture = new BABYLON.Texture("https://raw.githubusercontent.com/BabylonJS/Babylon.js/master/assets/textures/flare.png", scene);
        
        tail.emitter = comet;
        tail.minEmitBox = new BABYLON.Vector3(0, 0, 0);
        tail.maxEmitBox = new BABYLON.Vector3(0, 0, 0);
        
        tail.color1 = new BABYLON.Color4(0.8, 0.9, 1, 1);
        tail.color2 = new BABYLON.Color4(0.4, 0.6, 1, 0.5);
        tail.colorDead = new BABYLON.Color4(0.2, 0.3, 0.7, 0);
        
        tail.minSize = 0.1;
        tail.maxSize = 0.5;
        
        tail.minLifeTime = 0.5;
        tail.maxLifeTime = 1.5;
        
        tail.emitRate = 100;
        
        tail.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        tail.gravity = new BABYLON.Vector3(0, 0, 0);
        
        tail.direction1 = new BABYLON.Vector3(-1, 0, 0);
        tail.direction2 = new BABYLON.Vector3(-1, 0.5, 0);
        
        tail.minEmitPower = 2;
        tail.maxEmitPower = 4;
        
        tail.start();
        
        // Initialize comet position and velocity
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * 50;
        
        comet.position = new BABYLON.Vector3(
            Math.cos(angle) * distance,
            (Math.random() - 0.5) * 50,
            Math.sin(angle) * distance
        );
        
        comet.metadata = {
            velocity: new BABYLON.Vector3(
                -Math.cos(angle) * 0.5,
                (Math.random() - 0.5) * 0.2,
                -Math.sin(angle) * 0.5
            ),
            life: 1000,
            maxLife: 1000,
            tail: tail
        };
        
        comets.push(comet);
        trackBabylonMesh(comet);
        trackBabylonMaterial(cometMaterial);
        trackBabylonParticleSystem(tail);
    }
    
    return comets;
}

// Create various space objects (asteroids, satellites, space stations)
export function createSpaceObjects(scene) {
    const spaceObjects = [];
    
    // Create asteroids
    for (let i = 0; i < 10; i++) {
        const asteroid = BABYLON.MeshBuilder.CreatePolyhedron(`asteroid${i}`, {
            type: Math.floor(Math.random() * 14),
            size: 0.5 + Math.random() * 1.5
        }, scene);
        
        const asteroidMaterial = new BABYLON.StandardMaterial(`asteroidMat${i}`, scene);
        asteroidMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.4, 0.3);
        asteroidMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        
        asteroid.material = asteroidMaterial;
        
        // Random position in asteroid belt
        const angle = Math.random() * Math.PI * 2;
        const distance = 85 + Math.random() * 20;
        asteroid.position = new BABYLON.Vector3(
            Math.cos(angle) * distance,
            (Math.random() - 0.5) * 15,
            Math.sin(angle) * distance
        );
        
        asteroid.metadata = {
            type: 'asteroid',
            rotationSpeed: {
                x: (Math.random() - 0.5) * 0.02,
                y: (Math.random() - 0.5) * 0.02,
                z: (Math.random() - 0.5) * 0.02
            }
        };
        
        spaceObjects.push(asteroid);
        trackBabylonMesh(asteroid);
        trackBabylonMaterial(asteroidMaterial);
    }
    
    // Create space station
    const spaceStation = BABYLON.MeshBuilder.CreateCylinder("spaceStation", {
        diameter: 3,
        height: 1,
        tessellation: 32
    }, scene);
    
    const stationMaterial = new BABYLON.StandardMaterial("stationMat", scene);
    stationMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.8);
    stationMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.2);
    stationMaterial.specularColor = new BABYLON.Color3(0.9, 0.9, 0.9);
    
    spaceStation.material = stationMaterial;
    spaceStation.position = new BABYLON.Vector3(40, 10, 40);
    
    // Add rotating section
    const rotatingSection = BABYLON.MeshBuilder.CreateTorus("rotatingSection", {
        diameter: 4,
        thickness: 0.5,
        tessellation: 32
    }, scene);
    rotatingSection.parent = spaceStation;
    rotatingSection.material = stationMaterial;
    
    spaceStation.metadata = {
        type: 'spaceStation',
        rotatingSection: rotatingSection
    };
    
    spaceObjects.push(spaceStation);
    trackBabylonMesh(spaceStation);
    trackBabylonMesh(rotatingSection);
    
    return spaceObjects;
}

// Create galaxy core with swirling effect
export function createGalaxyCore(scene) {
    // This is handled by the black hole in blackhole.js
    // But we can add additional galactic features here
    
    // Create galactic plane
    const galacticPlane = BABYLON.MeshBuilder.CreateDisc("galacticPlane", {
        radius: 200,
        tessellation: 64
    }, scene);
    
    const planeMaterial = new BABYLON.StandardMaterial("galacticPlaneMat", scene);
    planeMaterial.diffuseTexture = createGalacticTexture(scene);
    planeMaterial.opacityTexture = planeMaterial.diffuseTexture;
    planeMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.3, 0.5);
    planeMaterial.alpha = 0.2;
    planeMaterial.backFaceCulling = false;
    
    galacticPlane.material = planeMaterial;
    galacticPlane.rotation.x = Math.PI / 2;
    galacticPlane.position.y = -50;
    
    trackBabylonMesh(galacticPlane);
    trackBabylonMaterial(planeMaterial);
    
    return { galacticPlane };
}

// Create galactic spiral texture
function createGalacticTexture(scene) {
    const size = 1024;
    const texture = new BABYLON.DynamicTexture("galacticTexture", size, scene, false);
    const context = texture.getContext();
    
    // Create spiral gradient
    context.fillStyle = 'black';
    context.fillRect(0, 0, size, size);
    
    const centerX = size / 2;
    const centerY = size / 2;
    
    // Draw spiral arms
    for (let arm = 0; arm < 3; arm++) {
        const armAngle = (arm / 3) * Math.PI * 2;
        
        for (let i = 0; i < 1000; i++) {
            const angle = armAngle + i * 0.01;
            const radius = i * 0.5;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            const gradient = context.createRadialGradient(x, y, 0, x, y, 10);
            gradient.addColorStop(0, `rgba(100, 150, 255, ${1 - i / 1000})`);
            gradient.addColorStop(1, 'transparent');
            
            context.fillStyle = gradient;
            context.fillRect(x - 10, y - 10, 20, 20);
        }
    }
    
    texture.update();
    trackBabylonTexture(texture);
    return texture;
}