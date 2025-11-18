// scene3d.js - Three.js Ultimate Cosmic Scene
// Ultra-immersive black hole environment with photorealistic shaders

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Scene globals
let renderer, scene, camera, composer;
let animationId;
let clock = new THREE.Clock();

// Scene objects
export let blackHoleSystem = null;
export let accretionDisk = null;
export let starField = null;
export let cosmicEnvironment = null;

// Performance monitoring
const stats = {
    fps: 0,
    frameTime: 0,
    lastTime: performance.now()
};

// Initialize Three.js scene
export function init3D() {
    console.log('🚀 Initializing Three.js Ultimate Cosmic Scene...');
    
    const container = document.getElementById('scene-container');
    if (!container) {
        console.error('Scene container not found');
        return false;
    }

    try {
        // Setup WebGL renderer with optimal settings
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true
        });
        
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap for performance
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        container.appendChild(renderer.domElement);

        // Create scene
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000005, 0.00015);

        // Setup camera with cinematic FOV
        camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            3000
        );
        camera.position.set(50, 20, 50);
        camera.lookAt(0, 0, 0);

        // Post-processing setup
        setupPostProcessing();

        // Create scene elements
        createStarField();
        createBlackHoleSystem();
        createCosmicEnvironment();
        
        // Import and create black hole accretion disk
        import('./blackhole.js').then(module => {
            module.createEnhancedBlackHole();
        });

        // Setup lighting
        setupLighting();

        // Event listeners
        window.addEventListener('resize', onWindowResize);

        // Start animation loop
        animate();

        console.log('✨ Three.js scene initialized successfully!');
        return true;

    } catch (error) {
        console.error('Failed to initialize Three.js scene:', error);
        return false;
    }
}

// Setup advanced post-processing pipeline
function setupPostProcessing() {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    // Unreal Bloom for cosmic glow
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,  // strength
        0.4,  // radius
        0.85  // threshold
    );
    composer.addPass(bloomPass);

    // Chromatic Aberration shader
    const chromaticAberrationShader = {
        uniforms: {
            'tDiffuse': { value: null },
            'amount': { value: 0.0015 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float amount;
            varying vec2 vUv;
            
            void main() {
                vec2 offset = amount * (vUv - 0.5);
                vec4 cr = texture2D(tDiffuse, vUv + offset);
                vec4 cga = texture2D(tDiffuse, vUv);
                vec4 cb = texture2D(tDiffuse, vUv - offset);
                gl_FragColor = vec4(cr.r, cga.g, cb.b, cga.a);
            }
        `
    };
    
    const chromaticPass = new ShaderPass(chromaticAberrationShader);
    composer.addPass(chromaticPass);

    console.log('📸 Post-processing pipeline ready');
}

// Create GPU-accelerated starfield with 100,000+ stars
function createStarField() {
    console.log('⭐ Creating GPU-accelerated starfield...');

    const starCount = 100000;
    const geometry = new THREE.BufferGeometry();
    
    // Positions
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const phases = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        
        // Spherical distribution
        const radius = 150 + Math.random() * 1000;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);

        // Stellar classification colors
        const type = Math.random();
        if (type < 0.05) {
            // O-type (blue giants)
            colors[i3] = 0.6;
            colors[i3 + 1] = 0.7;
            colors[i3 + 2] = 1.0;
            sizes[i] = 2.5 + Math.random() * 2;
        } else if (type < 0.15) {
            // B-type (blue-white)
            colors[i3] = 0.8;
            colors[i3 + 1] = 0.9;
            colors[i3 + 2] = 1.0;
            sizes[i] = 2.0 + Math.random() * 1.5;
        } else if (type < 0.35) {
            // A-type (white)
            colors[i3] = 1.0;
            colors[i3 + 1] = 1.0;
            colors[i3 + 2] = 1.0;
            sizes[i] = 1.5 + Math.random() * 1.5;
        } else if (type < 0.55) {
            // F-G type (yellow-white)
            colors[i3] = 1.0;
            colors[i3 + 1] = 0.95;
            colors[i3 + 2] = 0.8;
            sizes[i] = 1.2 + Math.random();
        } else if (type < 0.75) {
            // K-type (orange)
            colors[i3] = 1.0;
            colors[i3 + 1] = 0.8;
            colors[i3 + 2] = 0.6;
            sizes[i] = 1.0 + Math.random() * 0.8;
        } else {
            // M-type (red dwarfs)
            colors[i3] = 1.0;
            colors[i3 + 1] = 0.6;
            colors[i3 + 2] = 0.4;
            sizes[i] = 0.8 + Math.random() * 0.5;
        }

        phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    // Custom star shader
    const starMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            pixelRatio: { value: renderer.getPixelRatio() }
        },
        vertexShader: `
            attribute float size;
            attribute float phase;
            varying vec3 vColor;
            varying float vAlpha;
            uniform float time;
            uniform float pixelRatio;

            void main() {
                vColor = color;
                
                // Twinkling effect
                float twinkle = sin(time * 2.0 + phase) * 0.3 + 0.7;
                vAlpha = twinkle;
                
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z) * twinkle;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vAlpha;

            void main() {
                // Circular star with soft edges
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);
                
                if (dist > 0.5) discard;
                
                float intensity = 1.0 - smoothstep(0.0, 0.5, dist);
                intensity = pow(intensity, 2.0);
                
                gl_FragColor = vec4(vColor, intensity * vAlpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        vertexColors: true,
        blending: THREE.AdditiveBlending
    });

    starField = new THREE.Points(geometry, starMaterial);
    scene.add(starField);

    console.log(`✨ Created ${starCount.toLocaleString()} stars`);
}

// Create black hole with gravitational lensing
function createBlackHoleSystem() {
    console.log('🕳️ Creating black hole with gravitational lensing...');

    blackHoleSystem = new THREE.Group();
    
    // Event horizon with custom shader
    const horizonGeometry = new THREE.SphereGeometry(6, 64, 64);
    const horizonMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: `
            varying vec3 vPosition;
            varying vec3 vNormal;
            
            void main() {
                vPosition = position;
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            varying vec3 vPosition;
            varying vec3 vNormal;
            
            void main() {
                // Pure black with subtle edge glow
                float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
                rim = pow(rim, 3.0) * 0.15;
                
                vec3 color = vec3(0.05, 0.03, 0.02) * rim;
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        side: THREE.DoubleSide
    });
    
    const eventHorizon = new THREE.Mesh(horizonGeometry, horizonMaterial);
    blackHoleSystem.add(eventHorizon);

    // Photon sphere (gravitational lensing ring)
    const photonGeometry = new THREE.TorusGeometry(9, 0.3, 16, 100);
    const photonMaterial = new THREE.ShaderMaterial({
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
            uniform float time;
            varying vec2 vUv;
            
            void main() {
                float intensity = sin(vUv.x * 20.0 + time * 3.0) * 0.5 + 0.5;
                intensity *= sin(vUv.y * 5.0) * 0.5 + 0.5;
                
                vec3 color = vec3(1.0, 0.7, 0.3) * intensity;
                gl_FragColor = vec4(color, intensity * 0.6);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending
    });
    
    const photonSphere = new THREE.Mesh(photonGeometry, photonMaterial);
    photonSphere.rotation.x = Math.PI / 2;
    blackHoleSystem.add(photonSphere);

    scene.add(blackHoleSystem);
    console.log('✅ Black hole created');
}

// Create cosmic environment
function createCosmicEnvironment() {
    console.log('🌌 Creating cosmic environment...');
    
    cosmicEnvironment = new THREE.Group();
    
    // Add nebula clouds with procedural noise
    createNebulaClouds();
    
    scene.add(cosmicEnvironment);
    console.log('✅ Cosmic environment ready');
}

// Create volumetric nebula clouds
function createNebulaClouds() {
    const nebulaCount = 8;
    
    for (let i = 0; i < nebulaCount; i++) {
        const particleCount = 2000;
        const geometry = new THREE.BufferGeometry();
        
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        // Nebula color palettes
        const palettes = [
            { r: 1.0, g: 0.3, b: 0.5 },  // Pink emission
            { r: 0.3, g: 0.5, b: 1.0 },  // Blue reflection
            { r: 0.4, g: 1.0, b: 0.7 },  // Green planetary
            { r: 1.0, g: 0.7, b: 0.3 },  // Orange
            { r: 0.7, g: 0.4, b: 1.0 }   // Purple
        ];
        
        const palette = palettes[i % palettes.length];
        const nebulaPos = new THREE.Vector3(
            (Math.random() - 0.5) * 400,
            (Math.random() - 0.5) * 200,
            (Math.random() - 0.5) * 400
        );
        
        for (let j = 0; j < particleCount; j++) {
            const j3 = j * 3;
            
            // Gaussian distribution
            const radius = Math.abs(randomGaussian()) * 40;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[j3] = nebulaPos.x + radius * Math.sin(phi) * Math.cos(theta);
            positions[j3 + 1] = nebulaPos.y + radius * Math.sin(phi) * Math.sin(theta) * 0.3;
            positions[j3 + 2] = nebulaPos.z + radius * Math.cos(phi);
            
            const variation = Math.random() * 0.3 + 0.7;
            colors[j3] = palette.r * variation;
            colors[j3 + 1] = palette.g * variation;
            colors[j3 + 2] = palette.b * variation;
            
            sizes[j] = 10 + Math.random() * 30;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const nebulaMaterial = new THREE.PointsMaterial({
            size: 20,
            vertexColors: true,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });
        
        const nebula = new THREE.Points(geometry, nebulaMaterial);
        cosmicEnvironment.add(nebula);
    }
    
    console.log(`☁️ Created ${nebulaCount} nebula clouds`);
}

// Setup lighting
function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x0a0a15, 0.3);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x4040ff, 1.5, 200);
    pointLight1.position.set(20, 10, 20);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff4040, 1.0, 150);
    pointLight2.position.set(-20, 5, -20);
    scene.add(pointLight2);
}

// Animation loop
function animate() {
    animationId = requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();
    
    // Update star field
    if (starField) {
        starField.material.uniforms.time.value = elapsed;
        starField.rotation.y += 0.00005;
    }
    
    // Update black hole
    if (blackHoleSystem) {
        blackHoleSystem.children.forEach((child, index) => {
            if (child.material && child.material.uniforms && child.material.uniforms.time) {
                child.material.uniforms.time.value = elapsed;
            }
        });
    }
    
    // Update black hole effects
    import('./blackhole.js').then(module => {
        if (module.updateBlackHoleEffects) {
            module.updateBlackHoleEffects();
        }
    });
    
    // Cinematic camera motion
    const radius = 50 + Math.sin(elapsed * 0.05) * 8;
    const height = 20 + Math.sin(elapsed * 0.1) * 5;
    camera.position.x = Math.sin(elapsed * 0.03) * radius;
    camera.position.y = height;
    camera.position.z = Math.cos(elapsed * 0.03) * radius;
    camera.lookAt(0, 0, 0);
    
    // Render with post-processing
    composer.render();
    
    // Performance stats
    updateStats();
}

// Update performance statistics
function updateStats() {
    const now = performance.now();
    stats.frameTime = now - stats.lastTime;
    stats.fps = Math.round(1000 / stats.frameTime);
    stats.lastTime = now;
}

// Window resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// Cleanup
export function dispose() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    if (renderer) {
        renderer.dispose();
    }
}

// Helper: Gaussian random
function randomGaussian() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Export for external access
export { scene, camera, renderer, stats };
