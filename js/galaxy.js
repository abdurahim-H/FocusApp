// Galaxy Creation Module
// Handles all galaxy and space object creation functionality

import { scene, stars, planets, comets, galaxyCore, spaceObjects } from './scene3d.js';

export function createStarField() {
    try {
        if (!scene) {
            console.warn('Scene not available for star field creation');
            return;
        }

        const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1,
        sizeAttenuation: true
    });

    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starVertices.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);
    
    // Create distant colorful stars
    const colorfulStarGeometry = new THREE.BufferGeometry();
    const colorfulStarMaterial = new THREE.PointsMaterial({
        size: 2,
        sizeAttenuation: true,
        vertexColors: true
    });

    const colorfulVertices = [];
    const colors = [];
    
    for (let i = 0; i < 2000; i++) {
        const x = (Math.random() - 0.5) * 3000;
        const y = (Math.random() - 0.5) * 3000;
        const z = (Math.random() - 0.5) * 3000;
        colorfulVertices.push(x, y, z);
        
        // Random star colors
        const color = new THREE.Color();
        color.setHSL(Math.random(), 0.8, 0.9);
        colors.push(color.r, color.g, color.b);
    }

    colorfulStarGeometry.setAttribute('position', new THREE.Float32BufferAttribute(colorfulVertices, 3));
    colorfulStarGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    const colorfulStars = new THREE.Points(colorfulStarGeometry, colorfulStarMaterial);
    scene.add(colorfulStars);
    
    stars.push(starField, colorfulStars);
    } catch (error) {
        console.error('Failed to create star field:', error);
        // Fallback: create a simple star field
        try {
            const fallbackGeometry = new THREE.BufferGeometry();
            const fallbackVertices = [];
            for (let i = 0; i < 1000; i++) {
                fallbackVertices.push(
                    (Math.random() - 0.5) * 1000,
                    (Math.random() - 0.5) * 1000,
                    (Math.random() - 0.5) * 1000
                );
            }
            fallbackGeometry.setAttribute('position', new THREE.Float32BufferAttribute(fallbackVertices, 3));
            const fallbackMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1 });
            const fallbackStars = new THREE.Points(fallbackGeometry, fallbackMaterial);
            scene.add(fallbackStars);
            stars.push(fallbackStars);
        } catch (fallbackError) {
            console.error('Failed to create fallback star field:', fallbackError);
        }
    }
}

export function createGalaxyCore() {
    // The enhanced black hole system will be created separately
    // This function is now a placeholder for compatibility
    console.log('Enhanced black hole system will be initialized by scene3d.js');
}

export function createPlanets() {
    const planetConfigs = [
        { 
            size: 2, 
            color: 0xff6b6b, 
            emissive: 0x441111, 
            distance: 25, 
            speed: 0.02,
            name: 'Mars-like'
        },
        { 
            size: 3, 
            color: 0x4ecdc4, 
            emissive: 0x114444, 
            distance: 35, 
            speed: 0.015,
            name: 'Neptune-like'
        },
        { 
            size: 1.5, 
            color: 0xffe66d, 
            emissive: 0x444411, 
            distance: 45, 
            speed: 0.01,
            name: 'Venus-like'
        },
        { 
            size: 4, 
            color: 0xa8e6cf, 
            emissive: 0x224422, 
            distance: 60, 
            speed: 0.008,
            name: 'Gas Giant'
        },
        { 
            size: 1, 
            color: 0xddbdfc, 
            emissive: 0x332244, 
            distance: 15, 
            speed: 0.03,
            name: 'Small World'
        }
    ];

    planetConfigs.forEach((config, index) => {
        const geometry = new THREE.SphereGeometry(config.size, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: config.color,
            emissive: config.emissive,
            emissiveIntensity: 0.1,
            shininess: 30
        });

        const planet = new THREE.Mesh(geometry, material);
        
        // Random starting position on orbit
        const startAngle = (Math.PI * 2 * index) / planetConfigs.length;
        planet.position.x = Math.cos(startAngle) * config.distance;
        planet.position.z = Math.sin(startAngle) * config.distance;
        planet.position.y = (Math.random() - 0.5) * 10; // Some vertical variation
        
        // Store orbital properties
        planet.userData = {
            distance: config.distance,
            speed: config.speed,
            angle: startAngle,
            rotationSpeed: (Math.random() + 0.5) * 0.02,
            name: config.name
        };

        scene.add(planet);
        planets.push(planet);

        // Add asteroid ring to larger planets
        if (config.size >= 3) {
            createAsteroidRing(planet, config.size + 2, config.color);
        }
    });
}

function createAsteroidRing(planet, ringRadius, planetColor) {
    const asteroidGeometry = new THREE.BufferGeometry();
    const asteroidMaterial = new THREE.PointsMaterial({
        color: planetColor,
        size: 0.5,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.6
    });

    const asteroidVertices = [];
    const asteroidCount = 200;
    
    for (let i = 0; i < asteroidCount; i++) {
        const angle = (Math.PI * 2 * i) / asteroidCount;
        const radius = ringRadius + (Math.random() - 0.5) * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (Math.random() - 0.5) * 0.5; // Thin ring
        
        asteroidVertices.push(x, y, z);
    }

    asteroidGeometry.setAttribute('position', new THREE.Float32BufferAttribute(asteroidVertices, 3));
    const asteroidRing = new THREE.Points(asteroidGeometry, asteroidMaterial);
    
    // Attach ring to planet
    planet.add(asteroidRing);
}

export function createNebula() {
    // Create a large sphere with nebula-like texture
    const nebulaGeometry = new THREE.SphereGeometry(180, 32, 32);
    const nebulaMaterial = new THREE.MeshBasicMaterial({
        color: 0x1a1a2e,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
        fog: false
    });

    const nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
    scene.add(nebula);

    // Create floating cosmic dust particles
    const dustGeometry = new THREE.BufferGeometry();
    const dustMaterial = new THREE.PointsMaterial({
        color: 0x8b5cf6,
        size: 1,
        transparent: true,
        opacity: 0.3,
        sizeAttenuation: true
    });

    const dustVertices = [];
    for (let i = 0; i < 500; i++) {
        const x = (Math.random() - 0.5) * 400;
        const y = (Math.random() - 0.5) * 400;
        const z = (Math.random() - 0.5) * 400;
        dustVertices.push(x, y, z);
    }

    dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dustVertices, 3));
    const cosmicDust = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(cosmicDust);
    
    // Store for animation
    cosmicDust.userData = { rotationSpeed: 0.0005 };
    stars.push(cosmicDust);
}

export function createComets() {
    // Create a few comets that will streak across the sky
    for (let i = 0; i < 3; i++) {
        const cometGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const cometMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });

        const comet = new THREE.Mesh(cometGeometry, cometMaterial);
        
        // Random starting position far away
        const angle = Math.random() * Math.PI * 2;
        comet.position.set(
            Math.cos(angle) * 150,
            (Math.random() - 0.5) * 100,
            Math.sin(angle) * 150
        );

        // Create comet tail
        const tailGeometry = new THREE.BufferGeometry();
        const tailMaterial = new THREE.PointsMaterial({
            color: 0x06d6a0,
            size: 2,
            transparent: true,
            opacity: 0.6,
            sizeAttenuation: true
        });

        const tailVertices = [];
        for (let j = 0; j < 50; j++) {
            tailVertices.push(0, 0, j * -2); // Trail behind comet
        }

        tailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(tailVertices, 3));
        const tail = new THREE.Points(tailGeometry, tailMaterial);
        comet.add(tail);

        comet.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.5
            ),
            life: Math.random() * 1000 + 500,
            maxLife: 1000
        };

        scene.add(comet);
        comets.push(comet);
    }
}

export function createSpaceObjects() {
    // Create various space objects floating around
    const spaceObjectTypes = [
        {
            name: 'satellite',
            count: 8,
            creator: function(position) {
                const group = new THREE.Group();
                
                // Main body
                const bodyGeometry = new THREE.BoxGeometry(1, 0.5, 0.5);
                const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
                const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
                group.add(body);
                
                // Solar panels
                const panelGeometry = new THREE.PlaneGeometry(2, 0.8);
                const panelMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x001166,
                    transparent: true,
                    opacity: 0.8
                });
                
                const leftPanel = new THREE.Mesh(panelGeometry, panelMaterial);
                leftPanel.position.set(-1.5, 0, 0);
                leftPanel.rotation.y = Math.PI / 2;
                group.add(leftPanel);
                
                const rightPanel = new THREE.Mesh(panelGeometry, panelMaterial);
                rightPanel.position.set(1.5, 0, 0);
                rightPanel.rotation.y = Math.PI / 2;
                group.add(rightPanel);
                
                // Antenna
                const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1);
                const antennaMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
                const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
                antenna.position.set(0, 0.75, 0);
                group.add(antenna);
                
                return group;
            }
        },
        {
            name: 'spaceStation',
            count: 3,
            creator: function(position) {
                const group = new THREE.Group();
                
                // Main ring
                const ringGeometry = new THREE.TorusGeometry(2, 0.3, 8, 16);
                const ringMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc });
                const ring = new THREE.Mesh(ringGeometry, ringMaterial);
                group.add(ring);
                
                // Central hub
                const hubGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1);
                const hubMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
                const hub = new THREE.Mesh(hubGeometry, hubMaterial);
                group.add(hub);
                
                // Docking ports
                for (let i = 0; i < 4; i++) {
                    const angle = (i / 4) * Math.PI * 2;
                    const portGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.5);
                    const portMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
                    const port = new THREE.Mesh(portGeometry, portMaterial);
                    port.position.set(Math.cos(angle) * 2.5, 0, Math.sin(angle) * 2.5);
                    group.add(port);
                }
                
                return group;
            }
        },
        {
            name: 'asteroid',
            count: 12,
            creator: function(position) {
                // Irregular asteroid shape
                const geometry = new THREE.SphereGeometry(
                    0.3 + Math.random() * 0.7, 
                    6 + Math.random() * 4, 
                    6 + Math.random() * 4
                );
                
                // Deform vertices for irregular shape
                const vertices = geometry.attributes.position.array;
                for (let i = 0; i < vertices.length; i += 3) {
                    vertices[i] += (Math.random() - 0.5) * 0.3;
                    vertices[i + 1] += (Math.random() - 0.5) * 0.3;
                    vertices[i + 2] += (Math.random() - 0.5) * 0.3;
                }
                geometry.attributes.position.needsUpdate = true;
                
                const material = new THREE.MeshPhongMaterial({ 
                    color: 0x8B4513,
                    roughness: 0.8
                });
                
                return new THREE.Mesh(geometry, material);
            }
        },
        {
            name: 'debris',
            count: 15,
            creator: function(position) {
                const group = new THREE.Group();
                
                // Random debris pieces
                for (let i = 0; i < 3 + Math.random() * 3; i++) {
                    const pieceGeometry = new THREE.BoxGeometry(
                        Math.random() * 0.3,
                        Math.random() * 0.3,
                        Math.random() * 0.3
                    );
                    const pieceMaterial = new THREE.MeshPhongMaterial({ 
                        color: new THREE.Color().setHSL(Math.random(), 0.3, 0.4)
                    });
                    const piece = new THREE.Mesh(pieceGeometry, pieceMaterial);
                    
                    piece.position.set(
                        (Math.random() - 0.5) * 0.5,
                        (Math.random() - 0.5) * 0.5,
                        (Math.random() - 0.5) * 0.5
                    );
                    piece.rotation.set(
                        Math.random() * Math.PI,
                        Math.random() * Math.PI,
                        Math.random() * Math.PI
                    );
                    
                    group.add(piece);
                }
                
                return group;
            }
        }
    ];

    // Create all space objects
    spaceObjectTypes.forEach(type => {
        for (let i = 0; i < type.count; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * 200,
                (Math.random() - 0.5) * 100,
                (Math.random() - 0.5) * 200
            );
            
            const object = type.creator(position);
            object.position.copy(position);
            
            // Add random rotation
            object.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );
            
            // Add orbital motion data
            object.userData = {
                type: type.name,
                rotationSpeed: (Math.random() + 0.1) * 0.01,
                orbitSpeed: Math.random() * 0.005,
                orbitRadius: position.length(),
                orbitAngle: Math.atan2(position.z, position.x)
            };
            
            scene.add(object);
            spaceObjects.push(object);
        }
    });
}
