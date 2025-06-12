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
        
        // Enhanced star texture with multi-layered glow
        starParticleSystem.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
                <defs>
                    <radialGradient id="starCore" cx="50%" cy="50%" r="20%">
                        <stop offset="0%" style="stop-color:white;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:white;stop-opacity:0.9" />
                    </radialGradient>
                    <radialGradient id="starHalo" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" style="stop-color:white;stop-opacity:0.8" />
                        <stop offset="60%" style="stop-color:cyan;stop-opacity:0.4" />
                        <stop offset="100%" style="stop-color:blue;stop-opacity:0" />
                    </radialGradient>
                </defs>
                <circle cx="32" cy="32" r="32" fill="url(#starHalo)" />
                <circle cx="32" cy="32" r="8" fill="url(#starCore)" />
            </svg>
        `), scene);
        
        // Enhanced particle properties with dynamic sizing
        starParticleSystem.minSize = 0.3;
        starParticleSystem.maxSize = 4.5;
        starParticleSystem.minLifeTime = Number.MAX_VALUE;
        starParticleSystem.maxLifeTime = Number.MAX_VALUE;
        starParticleSystem.emitRate = 0;
        
        // Enhanced blending for spectacular cosmic glow
        starParticleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        // Set rendering group for background positioning
        starParticleSystem.renderingGroupId = 0; // Background layer - renders first
        
        // Dynamic color variations with stellar classification
        starParticleSystem.color1 = new BABYLON.Color4(1, 1, 1, 0.9);
        starParticleSystem.color2 = new BABYLON.Color4(0.7, 0.9, 1, 0.8);
        starParticleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        
        // Start the particle system and emit all particles at once
        starParticleSystem.start();
        starParticleSystem.manualEmitCount = starCount;
        
        // Position star particles manually with enhanced stellar distribution
        setTimeout(() => {
            const particles = starParticleSystem.particles;
            
            for (let i = 0; i < particles.length; i++) {
                const particle = particles[i];
                if (!particle) continue;
                
                // Create realistic stellar distribution with galactic disk structure
                const distributionType = Math.random();
                let radius, theta, phi;
                
                if (distributionType < 0.7) {
                    // Galactic disk distribution (most stars)
                    radius = 80 + Math.pow(Math.random(), 0.3) * 350;
                    theta = Math.random() * Math.PI * 2;
                    phi = Math.PI / 2 + (Math.random() - 0.5) * 0.4; // Flattened disk
                } else if (distributionType < 0.9) {
                    // Halo distribution (sparse outer stars)
                    radius = 200 + Math.random() * 300;
                    theta = Math.random() * Math.PI * 2;
                    phi = Math.acos(2 * Math.random() - 1);
                } else {
                    // Core cluster (bright central stars)
                    radius = 30 + Math.random() * 80;
                    theta = Math.random() * Math.PI * 2;
                    phi = Math.acos(2 * Math.random() - 1);
                }
                
                particle.position.x = radius * Math.sin(phi) * Math.cos(theta);
                particle.position.y = radius * Math.sin(phi) * Math.sin(theta);
                particle.position.z = radius * Math.cos(phi);
                
                // Enhanced stellar classification with realistic colors and sizes
                const starType = Math.random();
                if (starType < 0.4) {
                    // Main sequence stars (G-K type - Sun-like)
                    particle.size = 0.8 + Math.random() * 1.2;
                    particle.color = new BABYLON.Color4(
                        1,
                        0.9 + Math.random() * 0.1,
                        0.7 + Math.random() * 0.2,
                        0.8 + Math.random() * 0.2
                    );
                } else if (starType < 0.6) {
                    // Blue giants (O-B type)
                    particle.size = 2 + Math.random() * 2;
                    particle.color = new BABYLON.Color4(
                        0.7 + Math.random() * 0.2,
                        0.8 + Math.random() * 0.2,
                        1,
                        0.9
                    );
                } else if (starType < 0.8) {
                    // Red dwarfs (M type)
                    particle.size = 0.3 + Math.random() * 0.7;
                    particle.color = new BABYLON.Color4(
                        1,
                        0.5 + Math.random() * 0.3,
                        0.3 + Math.random() * 0.2,
                        0.7 + Math.random() * 0.2
                    );
                } else if (starType < 0.95) {
                    // White dwarfs
                    particle.size = 0.4 + Math.random() * 0.6;
                    particle.color = new BABYLON.Color4(
                        0.9 + Math.random() * 0.1,
                        0.9 + Math.random() * 0.1,
                        1,
                        0.9
                    );
                } else {
                    // Supergiants and variable stars
                    particle.size = 3 + Math.random() * 2;
                    particle.color = new BABYLON.Color4(
                        0.8 + Math.random() * 0.2,
                        0.6 + Math.random() * 0.2,
                        0.4 + Math.random() * 0.3,
                        0.8 + Math.sin(i * 0.1) * 0.2 // Variable brightness
                    );
                }
                
                // Store stellar properties for animation
                particle.userData = {
                    baseSize: particle.size,
                    twinkleSpeed: 0.02 + Math.random() * 0.08,
                    twinklePhase: Math.random() * Math.PI * 2,
                    pulseSpeed: 0.005 + Math.random() * 0.01,
                    stellarType: starType < 0.95 ? 'normal' : 'variable'
                };
            }
        }, 100);
        
        // Store particle system with enhanced animation data
        starParticleSystem.userData = {
            rotationSpeed: 0.00002,
            driftSpeed: 0.00001,
            parallaxLayers: 3,
            isMainStarField: true,
            lastUpdateTime: 0
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

// Create enhanced nebula clouds with dynamic colors and movement
function createNebulaCloud() {
    const cloudCount = 5;
    
    for (let i = 0; i < cloudCount; i++) {
        const nebulaSystem = new BABYLON.ParticleSystem(`nebula${i}`, 800, scene);
        
        const emitter = BABYLON.MeshBuilder.CreateSphere(`nebulaEmitter${i}`, {diameter: 0.1}, scene);
        emitter.isVisible = false;
        emitter.position = new BABYLON.Vector3(
            (Math.random() - 0.5) * 300,
            (Math.random() - 0.5) * 150,
            (Math.random() - 0.5) * 300
        );
        nebulaSystem.emitter = emitter;
        
        // Enhanced nebula texture with layered gradients
        nebulaSystem.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
                <defs>
                    <radialGradient id="nebulaCore${i}" cx="50%" cy="50%" r="30%">
                        <stop offset="0%" style="stop-color:white;stop-opacity:0.8" />
                        <stop offset="50%" style="stop-color:cyan;stop-opacity:0.6" />
                        <stop offset="100%" style="stop-color:white;stop-opacity:0.3" />
                    </radialGradient>
                    <radialGradient id="nebulaHalo${i}" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" style="stop-color:white;stop-opacity:0.4" />
                        <stop offset="30%" style="stop-color:purple;stop-opacity:0.3" />
                        <stop offset="70%" style="stop-color:blue;stop-opacity:0.2" />
                        <stop offset="100%" style="stop-color:transparent;stop-opacity:0" />
                    </radialGradient>
                </defs>
                <circle cx="64" cy="64" r="64" fill="url(#nebulaHalo${i})" />
                <circle cx="64" cy="64" r="32" fill="url(#nebulaCore${i})" />
            </svg>
        `), scene);
        
        // Dynamic nebula color palettes
        const nebulaPalettes = [
            // Emission nebula (red/pink)
            [new BABYLON.Color4(0.8, 0.2, 0.4, 0.4), new BABYLON.Color4(1, 0.4, 0.6, 0.2)],
            // Reflection nebula (blue)
            [new BABYLON.Color4(0.2, 0.4, 0.9, 0.4), new BABYLON.Color4(0.4, 0.6, 1, 0.2)],
            // Planetary nebula (green/cyan)
            [new BABYLON.Color4(0.2, 0.8, 0.6, 0.4), new BABYLON.Color4(0.4, 1, 0.8, 0.2)],
            // Dark nebula with stars (purple)
            [new BABYLON.Color4(0.4, 0.2, 0.8, 0.3), new BABYLON.Color4(0.6, 0.4, 1, 0.1)],
            // Supernova remnant (orange/yellow)
            [new BABYLON.Color4(0.9, 0.6, 0.2, 0.4), new BABYLON.Color4(1, 0.8, 0.4, 0.2)]
        ];
        
        const colorPair = nebulaPalettes[i % nebulaPalettes.length];
        nebulaSystem.color1 = colorPair[0];
        nebulaSystem.color2 = colorPair[1];
        nebulaSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        
        nebulaSystem.minSize = 15;
        nebulaSystem.maxSize = 45;
        nebulaSystem.minLifeTime = Number.MAX_VALUE;
        nebulaSystem.maxLifeTime = Number.MAX_VALUE;
        nebulaSystem.emitRate = 0;
        nebulaSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        nebulaSystem.start();
        nebulaSystem.manualEmitCount = 300;
        
        // Enhanced particle positioning with fractal-like distribution
        setTimeout(() => {
            const particles = nebulaSystem.particles;
            for (let j = 0; j < particles.length; j++) {
                const particle = particles[j];
                if (!particle) continue;
                
                // Multi-scale distribution for realistic nebula structure
                const scale1 = Math.abs(randomGaussian()) * 60;
                const scale2 = Math.abs(randomGaussian()) * 30;
                const scale3 = Math.abs(randomGaussian()) * 15;
                
                const angle1 = Math.random() * Math.PI * 2;
                const angle2 = Math.random() * Math.PI * 2;
                const height = randomGaussian() * 25;
                
                // Combine multiple scales for fractal-like structure
                const radius = Math.max(scale1, scale2 * 0.5, scale3 * 0.3);
                
                particle.position = new BABYLON.Vector3(
                    radius * Math.cos(angle1),
                    height + Math.sin(angle2) * 10,
                    radius * Math.sin(angle1)
                );
                
                particle.size = 15 + Math.random() * 30;
                
                // Create density variations
                const density = Math.exp(-radius / 40);
                const finalColor = BABYLON.Color4.Lerp(colorPair[0], colorPair[1], Math.random());
                finalColor.a *= density;
                particle.color = finalColor;
                
                // Store animation data
                particle.userData = {
                    baseSize: particle.size,
                    swaySpeed: 0.001 + Math.random() * 0.002,
                    swayPhase: Math.random() * Math.PI * 2,
                    pulseSpeed: 0.005 + Math.random() * 0.01,
                    originalPosition: particle.position.clone()
                };
            }
        }, 150 + i * 75);
        
        nebulaSystem.userData = {
            isNebula: true,
            nebulaType: i % nebulaPalettes.length,
            rotationSpeed: 0.0001 + Math.random() * 0.0002,
            breathingSpeed: 0.003 + Math.random() * 0.002
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
            size: 2.2, 
            color: new BABYLON.Color3(0.9, 0.4, 0.3), 
            emissive: new BABYLON.Color3(0.3, 0.08, 0.05), 
            distance: 28, 
            speed: 0.025,
            name: 'Crimson Forge',
            atmosphere: true,
            atmosphereColor: new BABYLON.Color3(0.8, 0.2, 0.1),
            rings: false,
            moons: 1
        },
        { 
            size: 3.2, 
            color: new BABYLON.Color3(0.2, 0.5, 0.9), 
            emissive: new BABYLON.Color3(0.05, 0.15, 0.3), 
            distance: 42, 
            speed: 0.018,
            name: 'Azure Deep',
            atmosphere: true,
            atmosphereColor: new BABYLON.Color3(0.3, 0.6, 0.9),
            rings: false,
            moons: 2
        },
        { 
            size: 1.8, 
            color: new BABYLON.Color3(0.95, 0.85, 0.4), 
            emissive: new BABYLON.Color3(0.25, 0.2, 0.05), 
            distance: 55, 
            speed: 0.012,
            name: 'Golden Sphere',
            atmosphere: false,
            rings: false,
            moons: 0
        },
        { 
            size: 4.5, 
            color: new BABYLON.Color3(0.6, 0.8, 0.7), 
            emissive: new BABYLON.Color3(0.15, 0.2, 0.15), 
            distance: 75, 
            speed: 0.009,
            name: 'Jade Giant',
            atmosphere: true,
            atmosphereColor: new BABYLON.Color3(0.4, 0.7, 0.5),
            rings: true,
            moons: 4
        },
        { 
            size: 5.2, 
            color: new BABYLON.Color3(0.8, 0.6, 0.9), 
            emissive: new BABYLON.Color3(0.2, 0.15, 0.25), 
            distance: 95, 
            speed: 0.007,
            name: 'Violet Colossus',
            atmosphere: true,
            atmosphereColor: new BABYLON.Color3(0.7, 0.5, 0.8),
            rings: true,
            moons: 6
        }
    ];

    planetConfigs.forEach((config, index) => {
        // Create planet core with enhanced detail
        const planet = BABYLON.MeshBuilder.CreateSphere(`planet_${index}`, {
            diameter: config.size * 2,
            segments: 128  // Higher detail for smoother planets
        }, scene);
        
        // Enhanced planet material with improved lighting and effects
        const planetMaterial = new BABYLON.StandardMaterial(`planetMat_${index}`, scene);
        planetMaterial.diffuseColor = config.color;
        planetMaterial.emissiveColor = config.emissive.scale(1.2);  // Slightly brighter emission
        planetMaterial.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        planetMaterial.specularPower = 128;  // Higher specular for better reflections
        
        // Add surface detail texture
        planetMaterial.bumpTexture = createProceduralPlanetTexture(config.name, config.color);
        
        // Enhanced surface roughness for realism
        if (config.size > 3) {
            // Gas giants - smoother, more reflective
            planetMaterial.specularPower = 256;
            planetMaterial.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        } else {
            // Rocky planets - more detailed surface
            planetMaterial.specularPower = 64;
            planetMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        }
        
        planet.material = planetMaterial;
        
        // Set rendering group for proper depth sorting
        planet.renderingGroupId = 1; // Foreground celestial objects
        
        // Create atmosphere if specified
        if (config.atmosphere) {
            createPlanetAtmosphere(planet, config);
        }
        
        // Enhanced orbital positioning with inclination
        const startAngle = (Math.PI * 2 * index) / planetConfigs.length;
        const inclination = (Math.random() - 0.5) * 0.3; // Orbital inclination
        const eccentricity = 0.05 + Math.random() * 0.15; // Orbital eccentricity
        
        planet.position.x = Math.cos(startAngle) * config.distance;
        planet.position.z = Math.sin(startAngle) * config.distance;
        planet.position.y = Math.sin(inclination) * config.distance * 0.1;
        
        // Enhanced animation data with realistic orbital mechanics
        planet.userData = {
            distance: config.distance,
            speed: config.speed,
            angle: startAngle,
            inclination: inclination,
            eccentricity: eccentricity,
            rotationSpeed: (Math.random() + 0.3) * 0.015,
            axialTilt: (Math.random() - 0.5) * 0.5,
            name: config.name,
            baseSize: config.size,
            pulsePhase: Math.random() * Math.PI * 2
        };
        
        // Store planet
        planets.push({
            mesh: planet,
            config: config
        });
        
        // Add planetary rings
        if (config.rings) {
            createEnhancedPlanetRings(planet, config);
        }
        
        // Add moons
        if (config.moons > 0) {
            createEnhancedMoons(planet, config);
        }
        
        console.log(`✨ Created planet: ${config.name}`);
    });
}

// Create procedural planet surface texture
function createProceduralPlanetTexture(planetName, baseColor) {
    // Create a procedural texture using canvas
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Create base surface with noise pattern
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % canvas.width;
        const y = Math.floor((i / 4) / canvas.width);
        
        // Generate noise-based height map
        const noise = Math.sin(x * 0.02) * Math.cos(y * 0.02) + 
                     Math.sin(x * 0.05) * Math.cos(y * 0.05) * 0.5 +
                     Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.25;
        
        const intensity = (noise + 1) * 127.5;
        data[i] = intensity;     // R
        data[i + 1] = intensity; // G
        data[i + 2] = intensity; // B
        data[i + 3] = 255;       // A
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const texture = new BABYLON.Texture(`data:${canvas.toDataURL()}`, scene);
    texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    return texture;
}

// Create planet atmosphere
function createPlanetAtmosphere(planet, config) {
    const atmosphere = BABYLON.MeshBuilder.CreateSphere(`atmosphere_${planet.name}`, {
        diameter: config.size * 2.3,
        segments: 32
    }, scene);
    
    const atmosphereMaterial = new BABYLON.StandardMaterial(`atmosphereMat_${planet.name}`, scene);
    atmosphereMaterial.diffuseColor = config.atmosphereColor;
    atmosphereMaterial.emissiveColor = config.atmosphereColor.scale(0.2);
    atmosphereMaterial.alpha = 0.15;
    atmosphereMaterial.backFaceCulling = false;
    
    atmosphere.material = atmosphereMaterial;
    atmosphere.parent = planet;
    
    // Set rendering group for proper depth sorting
    atmosphere.renderingGroupId = 1; // Foreground celestial objects
    
    // Store for animation
    atmosphere.userData = {
        isAtmosphere: true,
        swaySpeed: 0.02 + Math.random() * 0.01
    };
}

// Create enhanced planetary rings with multiple bands
function createEnhancedPlanetRings(planet, config) {
    const ringGroup = new BABYLON.TransformNode(`ringGroup_${planet.name}`, scene);
    ringGroup.parent = planet;
    
    const ringCount = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < ringCount; i++) {
        const ring = BABYLON.MeshBuilder.CreateTorus(`planetRing_${planet.name}_${i}`, {
            diameter: config.size * (4 + i * 1.5),
            thickness: 0.2 + i * 0.1,
            tessellation: 128
        }, scene);
        
        ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.2;
        ring.parent = ringGroup;
        
        const ringMaterial = new BABYLON.StandardMaterial(`ringMat_${planet.name}_${i}`, scene);
        
        // Ring color variations
        const ringColors = [
            new BABYLON.Color3(0.9, 0.8, 0.6),
            new BABYLON.Color3(0.8, 0.7, 0.5),
            new BABYLON.Color3(0.7, 0.6, 0.4),
            new BABYLON.Color3(0.9, 0.9, 0.8),
            new BABYLON.Color3(0.6, 0.5, 0.4)
        ];
        
        ringMaterial.diffuseColor = ringColors[i % ringColors.length];
        ringMaterial.emissiveColor = ringColors[i % ringColors.length].scale(0.2);
        ringMaterial.alpha = 0.8 - i * 0.15;
        ringMaterial.backFaceCulling = false;
        
        ring.material = ringMaterial;
        
        // Set rendering group for proper depth sorting
        ring.renderingGroupId = 1; // Foreground celestial objects
        
        // Animation data
        ring.userData = {
            rotationSpeed: 0.005 + Math.random() * 0.01,
            originalRotation: ring.rotation.clone(),
            swayAmplitude: (Math.random() - 0.5) * 0.1
        };
    }
}

// Create enhanced moons with orbital dynamics
function createEnhancedMoons(planet, config) {
    for (let i = 0; i < config.moons; i++) {
        const moonSize = config.size * (0.15 + Math.random() * 0.25);
        const moon = BABYLON.MeshBuilder.CreateSphere(`moon_${planet.name}_${i}`, {
            diameter: moonSize * 2,
            segments: 24
        }, scene);
        
        const moonMaterial = new BABYLON.StandardMaterial(`moonMat_${planet.name}_${i}`, scene);
        
        // Moon type variations
        const moonTypes = [
            { color: new BABYLON.Color3(0.8, 0.8, 0.8), emissive: new BABYLON.Color3(0.05, 0.05, 0.05) }, // Rocky
            { color: new BABYLON.Color3(0.7, 0.9, 1), emissive: new BABYLON.Color3(0.02, 0.05, 0.08) },    // Icy
            { color: new BABYLON.Color3(0.9, 0.7, 0.5), emissive: new BABYLON.Color3(0.08, 0.05, 0.02) }, // Desert
            { color: new BABYLON.Color3(0.6, 0.8, 0.6), emissive: new BABYLON.Color3(0.03, 0.05, 0.03) }  // Mineral
        ];
        
        const moonType = moonTypes[Math.floor(Math.random() * moonTypes.length)];
        moonMaterial.diffuseColor = moonType.color;
        moonMaterial.emissiveColor = moonType.emissive;
        
        moon.material = moonMaterial;
        
        // Set rendering group for proper depth sorting
        moon.renderingGroupId = 1; // Foreground celestial objects
        
        const moonDistance = config.size * (3 + i * 2);
        const moonInclination = (Math.random() - 0.5) * 0.5;
        
        moon.userData = {
            angle: Math.random() * Math.PI * 2,
            distance: moonDistance,
            speed: 0.04 + Math.random() * 0.03,
            inclination: moonInclination,
            rotationSpeed: 0.01 + Math.random() * 0.02,
            phase: Math.random() * Math.PI * 2
        };
        
        moon.parent = planet;
    }
}

export function createNebula() {
    // Enhanced nebula background with dynamic gradient
    const nebulaSphere = BABYLON.MeshBuilder.CreateSphere("nebulaBackground", {
        diameter: 800,
        segments: 32
    }, scene);
    
    const nebulaMaterial = new BABYLON.StandardMaterial("nebulaBgMat", scene);
    
    // Create dynamic gradient texture
    const gradientTexture = new BABYLON.DynamicTexture("nebulaGradient", {width: 512, height: 512}, scene);
    const context = gradientTexture.getContext();
    
    // Create radial gradient
    const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, 'rgba(15, 15, 35, 0.8)');     // Dark blue center
    gradient.addColorStop(0.3, 'rgba(25, 15, 45, 0.6)');   // Purple mid
    gradient.addColorStop(0.6, 'rgba(10, 25, 40, 0.4)');   // Dark blue-green
    gradient.addColorStop(0.8, 'rgba(5, 15, 25, 0.2)');    // Very dark blue
    gradient.addColorStop(1, 'rgba(2, 5, 10, 0.1)');       // Almost black edge
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);
    gradientTexture.update();
    
    nebulaMaterial.diffuseTexture = gradientTexture;
    nebulaMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.2);
    nebulaMaterial.alpha = 0.3;
    nebulaMaterial.backFaceCulling = false;
    
    nebulaSphere.material = nebulaMaterial;
    nebulaSphere.renderingGroupId = 0;
    
    // Add slow rotation for dynamic effect
    nebulaSphere.userData = {
        rotationSpeed: 0.0001
    };
    
    console.log('✨ Enhanced nebula background created');
}

export function createComets() {
    // Create enhanced spectacular comets
    for (let i = 0; i < 5; i++) { // More comets for better effect
        const cometGroup = new BABYLON.TransformNode(`cometGroup_${i}`, scene);
        
        // Enhanced comet head with multiple components
        const cometCore = BABYLON.MeshBuilder.CreateSphere(`cometCore_${i}`, {diameter: 1.2}, scene);
        
        // Multi-layered comet material for better visual appeal
        const cometMaterial = new BABYLON.StandardMaterial(`cometMaterial_${i}`, scene);
        const cometTypes = [
            { color: new BABYLON.Color3(0.9, 0.9, 1), emission: new BABYLON.Color3(0.6, 0.6, 0.9) },    // Ice comet
            { color: new BABYLON.Color3(1, 0.8, 0.6), emission: new BABYLON.Color3(0.8, 0.5, 0.3) },    // Rocky comet  
            { color: new BABYLON.Color3(0.8, 1, 0.9), emission: new BABYLON.Color3(0.4, 0.7, 0.5) },    // Gas-rich comet
            { color: new BABYLON.Color3(1, 0.9, 0.7), emission: new BABYLON.Color3(0.9, 0.7, 0.4) },    // Metallic comet
            { color: new BABYLON.Color3(0.9, 0.7, 1), emission: new BABYLON.Color3(0.6, 0.4, 0.8) }     // Exotic comet
        ];
        
        const cometType = cometTypes[i % cometTypes.length];
        cometMaterial.diffuseColor = cometType.color;
        cometMaterial.emissiveColor = cometType.emission;
        cometMaterial.specularColor = new BABYLON.Color3(0.8, 0.8, 1);
        cometMaterial.specularPower = 128;
        cometCore.material = cometMaterial;
        cometCore.parent = cometGroup;
        
        // Add coma (atmosphere around comet)
        const coma = BABYLON.MeshBuilder.CreateSphere(`coma_${i}`, {diameter: 2.5}, scene);
        const comaMaterial = new BABYLON.StandardMaterial(`comaMaterial_${i}`, scene);
        comaMaterial.diffuseColor = cometType.color.scale(0.5);
        comaMaterial.emissiveColor = cometType.emission.scale(0.3);
        comaMaterial.alpha = 0.4;
        comaMaterial.backFaceCulling = false;
        coma.material = comaMaterial;
        coma.parent = cometGroup;
        
        // Set rendering group for proper depth sorting
        cometCore.renderingGroupId = 1; // Foreground celestial objects
        coma.renderingGroupId = 1;
        
        // Enhanced spectacular tail particles with multiple layers
        const tailSystem = new BABYLON.ParticleSystem(`cometTail_${i}`, 400, scene); // More particles
        tailSystem.emitter = cometCore;
        
        // Enhanced tail texture with better glow
        tailSystem.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
                <defs>
                    <radialGradient id="tailGrad${i}" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" style="stop-color:white;stop-opacity:0.9" />
                        <stop offset="30%" style="stop-color:cyan;stop-opacity:0.7" />
                        <stop offset="60%" style="stop-color:blue;stop-opacity:0.4" />
                        <stop offset="100%" style="stop-color:rgba(0,0,255,0)" />
                    </radialGradient>
                </defs>
                <circle cx="32" cy="32" r="32" fill="url(#tailGrad${i})" />
            </svg>
        `), scene);
        
        tailSystem.color1 = new BABYLON.Color4(
            cometType.emission.r, 
            cometType.emission.g, 
            cometType.emission.b, 
            1
        );
        tailSystem.color2 = new BABYLON.Color4(1, 1, 1, 0.8);
        tailSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        tailSystem.minSize = 0.5;
        tailSystem.maxSize = 2.5; // Larger tail particles
        tailSystem.minLifeTime = 1.0;
        tailSystem.maxLifeTime = 4.0; // Longer-lasting tail
        tailSystem.emitRate = 150; // More particles per second
        tailSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        tailSystem.gravity = new BABYLON.Vector3(0, 0, 0);
        tailSystem.direction1 = new BABYLON.Vector3(-3, -1, -1);
        tailSystem.direction2 = new BABYLON.Vector3(-6, 1, 1);
        tailSystem.minEmitPower = 2;
        tailSystem.maxEmitPower = 5;
        
        // Add secondary dust tail for realism
        const dustTail = new BABYLON.ParticleSystem(`dustTail_${i}`, 200, scene);
        dustTail.emitter = cometCore;
        dustTail.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64," + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="8" fill="rgba(255,255,255,0.3)" />
            </svg>
        `), scene);
        
        dustTail.color1 = new BABYLON.Color4(0.8, 0.7, 0.6, 0.6);
        dustTail.color2 = new BABYLON.Color4(0.6, 0.5, 0.4, 0.3);
        dustTail.minSize = 0.2;
        dustTail.maxSize = 1.0;
        dustTail.minLifeTime = 2.0;
        dustTail.maxLifeTime = 6.0;
        dustTail.emitRate = 80;
        dustTail.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
        dustTail.direction1 = new BABYLON.Vector3(-2, -0.5, -0.5);
        dustTail.direction2 = new BABYLON.Vector3(-4, 0.5, 0.5);
        dustTail.minEmitPower = 1;
        dustTail.maxEmitPower = 3;
        
        // Set rendering group for comet tail particles
        tailSystem.renderingGroupId = 1; // Foreground celestial objects
        dustTail.renderingGroupId = 1;
        
        tailSystem.start();
        dustTail.start();
        
        // Enhanced initial positioning with realistic orbital patterns
        const spawnDistance = 120 + Math.random() * 80;
        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnHeight = (Math.random() - 0.5) * 60;
        
        cometGroup.position = new BABYLON.Vector3(
            Math.cos(spawnAngle) * spawnDistance,
            spawnHeight,
            Math.sin(spawnAngle) * spawnDistance
        );
        
        // Enhanced animation data with realistic comet physics
        const targetCenter = new BABYLON.Vector3(
            (Math.random() - 0.5) * 40,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 40
        );
        
        const direction = targetCenter.subtract(cometGroup.position).normalize();
        const baseSpeed = 0.3 + Math.random() * 0.4;
        
        cometGroup.metadata = {
            velocity: direction.scale(baseSpeed),
            life: 600 + Math.random() * 600,
            maxLife: 1200,
            tailSystem: tailSystem,
            dustTail: dustTail,
            coma: coma,
            rotationSpeed: (Math.random() - 0.5) * 0.02,
            pulsePeriod: 2 + Math.random() * 4,
            type: cometType
        };
        
        comets.push(cometGroup);
    }
    
    console.log('☄️ Enhanced spectacular comets created');
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
                
                // Set rendering group for proper depth sorting
                body.renderingGroupId = 1; // Foreground celestial objects
                
                // Solar panels
                const panelMaterial = new BABYLON.StandardMaterial("panelMat", scene);
                panelMaterial.diffuseColor = new BABYLON.Color3(0, 0.1, 0.3);
                panelMaterial.emissiveColor = new BABYLON.Color3(0, 0, 0.1);
                
                const leftPanel = BABYLON.MeshBuilder.CreatePlane("leftPanel", {width: 2, height: 0.8}, scene);
                leftPanel.position.x = -1.5;
                leftPanel.rotation.y = Math.PI / 2;
                leftPanel.material = panelMaterial;
                leftPanel.parent = group;
                
                // Set rendering group for solar panels
                leftPanel.renderingGroupId = 1; // Foreground celestial objects
                
                const rightPanel = BABYLON.MeshBuilder.CreatePlane("rightPanel", {width: 2, height: 0.8}, scene);
                rightPanel.position.x = 1.5;
                rightPanel.rotation.y = Math.PI / 2;
                rightPanel.material = panelMaterial;
                rightPanel.parent = group;
                
                // Set rendering group for solar panels
                rightPanel.renderingGroupId = 1; // Foreground celestial objects
                
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
                
                // Set rendering group for proper depth sorting
                asteroid.renderingGroupId = 1; // Foreground celestial objects
                
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