// Enhanced Galaxy Creation Module
// Creates beautiful, smooth cosmic elements

import { scene, stars, planets, comets, galaxyCore, spaceObjects } from './scene3d.js';

export function createStarField() {
    try {
        if (!scene) {
            return;
        }

        // Create main star field with varied sizes
        const starCount = 15000;
        const starGeometry = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starCount * 3);
        const starSizes = new Float32Array(starCount);
        const starColors = new Float32Array(starCount * 3);
        const starBrightness = new Float32Array(starCount); // For twinkling
        
        for (let i = 0; i < starCount; i++) {
            const i3 = i * 3;
            
            // Distribute stars in a sphere with clustering
            const radius = 300 + Math.random() * 700;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            starPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            starPositions[i3 + 2] = radius * Math.cos(phi);
            
            // Varied star sizes - some larger for twinkling effect
            starSizes[i] = Math.random() < 0.1 ? 3 + Math.random() * 2 : 0.5 + Math.random() * 2;
            
            // Track which stars will twinkle
            starBrightness[i] = starSizes[i] > 3 ? 1.0 : 0.0;
            
            // Subtle color variations
            const colorType = Math.random();
            if (colorType < 0.7) {
                // White/blue stars
                starColors[i3] = 0.9 + Math.random() * 0.1;
                starColors[i3 + 1] = 0.9 + Math.random() * 0.1;
                starColors[i3 + 2] = 1;
            } else if (colorType < 0.9) {
                // Yellow stars
                starColors[i3] = 1;
                starColors[i3 + 1] = 0.9 + Math.random() * 0.1;
                starColors[i3 + 2] = 0.7 + Math.random() * 0.2;
            } else {
                // Red stars
                starColors[i3] = 1;
                starColors[i3 + 1] = 0.7 + Math.random() * 0.2;
                starColors[i3 + 2] = 0.6 + Math.random() * 0.2;
            }
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
        starGeometry.setAttribute('brightness', new THREE.BufferAttribute(starBrightness, 1));
        
        const starMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                theme: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                attribute float brightness;
                varying vec3 vColor;
                varying float vBrightness;
                uniform float time;
                
                void main() {
                    vColor = color;
                    vBrightness = brightness;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    
                    // Twinkling effect for larger stars
                    float twinkle = 1.0;
                    if (brightness > 0.5) {
                        twinkle = 0.7 + sin(time * 3.0 + position.x * 0.1) * 0.3;
                        twinkle *= 0.8 + sin(time * 2.0 - position.y * 0.1) * 0.2;
                    }
                    
                    gl_PointSize = size * (300.0 / -mvPosition.z) * twinkle;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vBrightness;
                uniform float theme;
                
                void main() {
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);
                    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                    
                    // Add subtle bloom for bright stars
                    if (vBrightness > 0.5) {
                        float bloom = 1.0 - smoothstep(0.0, 1.0, dist);
                        alpha = max(alpha, bloom * 0.3);
                    }
                    
                    // Theme-aware star rendering
                    vec3 finalColor = vColor;
                    float finalAlpha = alpha;
                    
                    if (theme > 0.5) {
                        // Light theme - make stars darker and more visible
                        finalColor = vColor * 0.3;
                        finalAlpha = alpha * 1.5;
                    }
                    
                    gl_FragColor = vec4(finalColor, finalAlpha);
                }
            `,
            transparent: true,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const starField = new THREE.Points(starGeometry, starMaterial);
        starField.userData.rotationSpeed = 0.00005;
        starField.userData.isMainStarField = true;
        starField.visible = true;
        starField.frustumCulled = false;
        starField.renderOrder = -10; // Ensure stars render first
        scene.add(starField);
        stars.push(starField);
        
        // Create nebula clouds
        createNebulaCloud();
        
        // Listen for theme changes
        const observer = new MutationObserver(() => {
            updateStarTheme();
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
        
        // Initial theme update
        updateStarTheme();
        
    } catch (error) {
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
            const fallbackMaterial = new THREE.PointsMaterial({ 
                color: 0xffffff, 
                size: 1,
                sizeAttenuation: true
            });
            const fallbackStars = new THREE.Points(fallbackGeometry, fallbackMaterial);
            fallbackStars.visible = true;
            fallbackStars.frustumCulled = false;
            fallbackStars.renderOrder = -10;
            scene.add(fallbackStars);
            stars.push(fallbackStars);
        } catch (fallbackError) {
            // Silently handle fallback creation failure
        }
    }
}

// Update star theme
function updateStarTheme() {
    const theme = document.body.getAttribute('data-theme');
    const isLightTheme = theme === 'light';
    const themeValue = isLightTheme ? 1.0 : 0.0;
    
    stars.forEach(starField => {
        // Always keep stars visible
        starField.visible = true;
        
        if (starField.material && starField.material.uniforms && starField.material.uniforms.theme) {
            starField.material.uniforms.theme.value = themeValue;
        }
    });
}

function createNebulaCloud() {
    const cloudCount = 5;
    
    for (let i = 0; i < cloudCount; i++) {
        const cloudGeometry = new THREE.BufferGeometry();
        const cloudParticles = 500;
        const positions = new Float32Array(cloudParticles * 3);
        const colors = new Float32Array(cloudParticles * 3);
        const sizes = new Float32Array(cloudParticles);
        
        // Nebula colors
        const nebulaColors = [
            { r: 0.4, g: 0.2, b: 0.8 }, // Purple
            { r: 0.2, g: 0.4, b: 0.8 }, // Blue
            { r: 0.8, g: 0.2, b: 0.4 }, // Pink
            { r: 0.2, g: 0.8, b: 0.6 }  // Cyan
        ];
        
        const baseColor = nebulaColors[i % nebulaColors.length];
        const centerX = (Math.random() - 0.5) * 600;
        const centerY = (Math.random() - 0.5) * 300;
        const centerZ = (Math.random() - 0.5) * 600;
        
        for (let j = 0; j < cloudParticles; j++) {
            const j3 = j * 3;
            
            // Gaussian distribution for cloud shape
            const u1 = Math.random();
            const u2 = Math.random();
            const radius = Math.sqrt(-2.0 * Math.log(u1)) * 50;
            const theta = 2.0 * Math.PI * u2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[j3] = centerX + radius * Math.sin(phi) * Math.cos(theta);
            positions[j3 + 1] = centerY + radius * Math.sin(phi) * Math.sin(theta);
            positions[j3 + 2] = centerZ + radius * Math.cos(phi);
            
            // Color variation
            colors[j3] = baseColor.r + Math.random() * 0.2;
            colors[j3 + 1] = baseColor.g + Math.random() * 0.2;
            colors[j3 + 2] = baseColor.b + Math.random() * 0.2;
            
            sizes[j] = 5 + Math.random() * 10;
        }
        
        cloudGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        cloudGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        cloudGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const cloudMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                theme: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                uniform float time;
                
                void main() {
                    vColor = color;
                    vec3 pos = position;
                    pos += sin(time * 0.2 + position.x * 0.01) * 2.0;
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                uniform float theme;
                
                void main() {
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);
                    float alpha = 0.3 * (1.0 - smoothstep(0.0, 0.5, dist));
                    
                    // Theme-aware nebula
                    vec3 finalColor = vColor;
                    float finalAlpha = alpha;
                    
                    if (theme > 0.5) {
                        // Light theme - make nebula slightly more visible
                        finalColor = vColor * 0.7;
                        finalAlpha = alpha * 1.2;
                    }
                    
                    gl_FragColor = vec4(finalColor, finalAlpha);
                }
            `,
            transparent: true,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const cloud = new THREE.Points(cloudGeometry, cloudMaterial);
        cloud.userData.rotationSpeed = 0.00003;
        cloud.userData.isNebula = true;
        cloud.visible = true;
        cloud.frustumCulled = false;
        cloud.renderOrder = -9; // Render after stars but before everything else
        scene.add(cloud);
        stars.push(cloud);
    }
}

export function createGalaxyCore() {
    // The enhanced black hole system will be created separately
    // This function is now a placeholder for compatibility
}

export function createPlanets() {
    const planetConfigs = [
        { 
            size: 2, 
            color: 0xff6b6b, 
            emissive: 0x441111, 
            distance: 25, 
            speed: 0.02,
            name: 'Mars-like',
            texture: 'rocky'
        },
        { 
            size: 3, 
            color: 0x4ecdc4, 
            emissive: 0x114444, 
            distance: 35, 
            speed: 0.015,
            name: 'Neptune-like',
            texture: 'ice'
        },
        { 
            size: 1.5, 
            color: 0xffe66d, 
            emissive: 0x444411, 
            distance: 45, 
            speed: 0.01,
            name: 'Venus-like',
            texture: 'cloudy'
        },
        { 
            size: 4, 
            color: 0xa8e6cf, 
            emissive: 0x224422, 
            distance: 60, 
            speed: 0.008,
            name: 'Gas Giant',
            texture: 'gas',
            rings: true
        },
        { 
            size: 1, 
            color: 0xddbdfc, 
            emissive: 0x332244, 
            distance: 15, 
            speed: 0.03,
            name: 'Small World',
            texture: 'rocky'
        }
    ];

    planetConfigs.forEach((config, index) => {
        // Create an orbital plane group for each planet
        const orbitGroup = new THREE.Group();
        
        // Random orbital tilt between 0° and ±30°
        const tiltAmount = Math.random() * 30 * Math.PI / 180; // 0 to 30 degrees in radians
        const tiltDirection = Math.random() * Math.PI * 2; // Random direction in 360 degrees
        
        // Apply tilt to the orbit group
        // Break down the tilt into X and Z rotations for more natural distribution
        orbitGroup.rotation.x = Math.sin(tiltDirection) * tiltAmount;
        orbitGroup.rotation.z = Math.cos(tiltDirection) * tiltAmount;
        
        // Add a small random Y rotation for additional variation
        orbitGroup.rotation.y = (Math.random() - 0.5) * 0.2;
        
        const geometry = new THREE.SphereGeometry(config.size, 32, 32);
        
        // Create procedural texture based on planet type with bloom effect
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                baseColor: { value: new THREE.Color(config.color) },
                emissiveColor: { value: new THREE.Color(config.emissive) }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 baseColor;
                uniform vec3 emissiveColor;
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                void main() {
                    vec3 light = normalize(vec3(1.0, 1.0, 0.5));
                    float lighting = max(dot(vNormal, light), 0.0);
                    
                    // Add some surface detail
                    float noise = sin(vPosition.x * 10.0) * sin(vPosition.y * 10.0) * sin(vPosition.z * 10.0);
                    vec3 color = mix(baseColor, baseColor * 1.2, noise * 0.5 + 0.5);
                    
                    // Atmospheric glow on edges with subtle bloom
                    float fresnel = 1.0 - abs(dot(vNormal, normalize(cameraPosition - vPosition)));
                    vec3 atmosphere = emissiveColor * pow(fresnel, 2.0);
                    
                    // Add subtle bloom effect
                    vec3 bloom = emissiveColor * 0.3 * pow(fresnel, 1.5);
                    
                    gl_FragColor = vec4(color * lighting + atmosphere * 0.5 + bloom, 1.0);
                }
            `
        });

        const planet = new THREE.Mesh(geometry, material);
        
        // Random starting position on orbit
        const startAngle = (Math.PI * 2 * index) / planetConfigs.length + (Math.random() - 0.5) * 0.5;
        planet.position.x = Math.cos(startAngle) * config.distance;
        planet.position.z = Math.sin(startAngle) * config.distance;
        planet.position.y = 0; // Keep Y at 0 within the tilted plane
        
        // Store orbital properties including the tilt info
        planet.userData = {
            distance: config.distance,
            speed: config.speed,
            angle: startAngle,
            rotationSpeed: (Math.random() + 0.5) * 0.01,
            name: config.name,
            material: material,
            orbitTiltX: orbitGroup.rotation.x,
            orbitTiltZ: orbitGroup.rotation.z
        };

        // Add planet to its orbit group
        orbitGroup.add(planet);
        
        // Add the orbit group to the scene
        scene.add(orbitGroup);
        
        // Store reference to both planet and its orbit group
        planets.push({
            mesh: planet,
            orbitGroup: orbitGroup,
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
    });
}

function createPlanetRings(planet, planetSize) {
    const innerRadius = planetSize * 1.5;
    const outerRadius = planetSize * 2.5;
    
    const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64, 8);
    const ringMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            uniform float time;
            
            void main() {
                float dist = length(vUv - 0.5) * 2.0;
                float ring = sin(dist * 50.0 + time) * 0.5 + 0.5;
                float alpha = ring * 0.6 * (1.0 - dist);
                vec3 color = vec3(0.8, 0.7, 0.6);
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });
    
    const rings = new THREE.Mesh(ringGeometry, ringMaterial);
    rings.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.2;
    planet.add(rings);
}

function createMoons(planet, planetSize) {
    const moonCount = Math.floor(Math.random() * 2) + 1;
    
    for (let i = 0; i < moonCount; i++) {
        const moonSize = planetSize * 0.2;
        const moonGeometry = new THREE.SphereGeometry(moonSize, 16, 16);
        const moonMaterial = new THREE.MeshPhongMaterial({
            color: 0xcccccc,
            emissive: 0x111111
        });
        
        const moon = new THREE.Mesh(moonGeometry, moonMaterial);
        const moonDistance = planetSize * (2 + i);
        
        moon.userData = {
            angle: Math.random() * Math.PI * 2,
            distance: moonDistance,
            speed: 0.03 + Math.random() * 0.02
        };
        
        planet.add(moon);
    }
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
    cosmicDust.visible = true;
    cosmicDust.frustumCulled = false;
    scene.add(cosmicDust);
    
    // Store for animation
    cosmicDust.userData = { rotationSpeed: 0.0005 };
    stars.push(cosmicDust);
}

export function createComets() {
    for (let i = 0; i < 5; i++) {
        const cometGroup = new THREE.Group();
        
        // Comet head with bloom
        const cometGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const cometMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            emissive: 0xaaaaff,
            emissiveIntensity: 2
        });
        const cometHead = new THREE.Mesh(cometGeometry, cometMaterial);
        cometGroup.add(cometHead);
        
        // Glowing aura
        const auraGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        const auraMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normal;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                uniform float time;
                
                void main() {
                    float intensity = pow(0.8 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                    vec3 color = vec3(0.3, 0.6, 1.0);
                    gl_FragColor = vec4(color, intensity * 0.8);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
        const aura = new THREE.Mesh(auraGeometry, auraMaterial);
        cometGroup.add(aura);
        
        // Create comet tail
        const tailGeometry = new THREE.ConeGeometry(0.5, 20, 8, 1, true);
        const tailMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                opacity: { value: 0.6 }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                void main() {
                    vUv = uv;
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                uniform float time;
                uniform float opacity;
                
                void main() {
                    float fade = 1.0 - vUv.y;
                    float wave = sin(vUv.y * 10.0 + time * 5.0) * 0.5 + 0.5;
                    vec3 color = mix(vec3(0.5, 0.8, 1.0), vec3(1.0, 1.0, 1.0), wave);
                    gl_FragColor = vec4(color, fade * opacity * 0.4);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.rotation.x = Math.PI / 2;
        tail.position.z = 10;
        cometGroup.add(tail);
        
        // Set initial position
        const angle = Math.random() * Math.PI * 2;
        cometGroup.position.set(
            Math.cos(angle) * 150,
            (Math.random() - 0.5) * 100,
            Math.sin(angle) * 150
        );
        
        cometGroup.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.5
            ),
            life: 500 + Math.random() * 500,
            maxLife: 1000,
            tailMaterial: tailMaterial,
            auraMaterial: auraMaterial
        };
        
        scene.add(cometGroup);
        comets.push(cometGroup);
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
                geometry.computeVertexNormals();
                
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