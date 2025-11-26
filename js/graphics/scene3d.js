// scene3d.js - Three.js Ultimate Cosmic Scene v2.0
// Ultra-immersive black hole environment with photorealistic shaders
// Enhanced with cinematic camera, multi-layer parallax stars, and cosmic depth

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { createEnhancedBlackHole, updateBlackHoleSystems, cleanupBlackHole } from './blackhole-interstellar.js';
import { initCameraEffects, updateCameraEffects } from './camera-effects.js';

// Scene globals
let renderer, composer;
let fxaaPass = null;
let bloomPass = null;
let animationId;
let clock = new THREE.Clock();

// Export scene and camera immediately for imports
export let scene = null;
export let camera = null;

// Scene objects
export let blackHoleSystem = null;
export let accretionDisk = null;
export let starField = null;
export let cosmicEnvironment = null;

// Multi-layer star systems
let starLayers = {
    main: null,
    beacon: null,
    distant: null,
    dust: null
};

// Distant cosmic objects
let distantGalaxies = [];
let nebulaWisps = [];

// Camera state for cinematic motion
const cameraState = {
    baseRadius: 50,
    currentRadius: 50,
    baseHeight: 18,
    currentHeight: 18,
    rotation: 0,
    breathPhase: 0,
    driftX: 0,
    driftZ: 0,
    lookAtOffset: new THREE.Vector3(0, 0, 0)
};

// Performance monitoring
const stats = {
    fps: 0,
    frameTime: 0,
    lastTime: performance.now()
};

// Initialize Three.js scene
export function init3D() {
    console.log('🚀 Initializing Three.js Ultimate Cosmic Scene v2.0...');

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
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.35; // Slightly brighter for better star visibility
        container.appendChild(renderer.domElement);

        // Create scene
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000008, 0.00012); // Slightly lighter fog

        // Setup camera with cinematic FOV
        camera = new THREE.PerspectiveCamera(
            70, // Slightly narrower FOV for more cinematic feel
            window.innerWidth / window.innerHeight,
            0.1,
            5000 // Extended far plane for distant objects
        );
        camera.position.set(50, 20, 50);
        camera.lookAt(0, 0, 0);

        // Post-processing setup
        setupPostProcessing();

        // Create multi-layer starfield
        createMultiLayerStarField();

        // Create distant cosmic elements
        createDistantCosmicElements();

        // Create master group for tilted black hole
        const masterBlackHoleGroup = new THREE.Group();
        masterBlackHoleGroup.rotation.x = THREE.MathUtils.degToRad(20);
        masterBlackHoleGroup.rotation.z = THREE.MathUtils.degToRad(10);
        scene.add(masterBlackHoleGroup);

        createBlackHoleSystem(masterBlackHoleGroup);

        // Create Interstellar-style black hole with lensing
        createEnhancedBlackHole(masterBlackHoleGroup);

        // Setup lighting
        setupLighting();

        // Initialize camera effects
        initCameraEffects();

        // Event listeners
        window.addEventListener('resize', onWindowResize);

        // Start animation loop
        animate();

        console.log('✨ Three.js scene v2.0 initialized successfully!');
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

    // Enhanced Bloom with better settings
    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.6,   // bloom strength
        0.5,   // radius
        0.85   // threshold
    );
    composer.addPass(bloomPass);

    // Film grain shader for cinematic feel
    const filmGrainShader = {
        uniforms: {
            'tDiffuse': { value: null },
            'time': { value: 0 },
            'amount': { value: 0.03 }
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
            uniform float time;
            uniform float amount;
            varying vec2 vUv;

            float random(vec2 co) {
                return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
            }

            void main() {
                vec4 color = texture2D(tDiffuse, vUv);
                float noise = (random(vUv + time) - 0.5) * amount;
                color.rgb += noise;
                gl_FragColor = color;
            }
        `
    };

    const filmGrainPass = new ShaderPass(filmGrainShader);
    filmGrainPass.uniforms.time = { value: 0 };
    composer.addPass(filmGrainPass);

    // Chromatic Aberration shader
    const chromaticAberrationShader = {
        uniforms: {
            'tDiffuse': { value: null },
            'amount': { value: 0.0012 }
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

    // Vignette shader for cinematic framing
    const vignetteShader = {
        uniforms: {
            'tDiffuse': { value: null },
            'darkness': { value: 0.5 },
            'offset': { value: 1.2 }
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
            uniform float darkness;
            uniform float offset;
            varying vec2 vUv;

            void main() {
                vec4 color = texture2D(tDiffuse, vUv);
                vec2 center = vUv - 0.5;
                float dist = length(center);
                float vignette = smoothstep(offset, offset - 0.5, dist * (darkness + offset));
                color.rgb *= vignette;
                gl_FragColor = color;
            }
        `
    };

    const vignettePass = new ShaderPass(vignetteShader);
    composer.addPass(vignettePass);

    // FXAA Anti-Aliasing
    fxaaPass = new ShaderPass(FXAAShader);
    const pixelRatio = renderer.getPixelRatio();
    fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pixelRatio);
    fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pixelRatio);
    composer.addPass(fxaaPass);

    console.log('📸 Enhanced post-processing pipeline ready');
}

// Create multi-layer starfield with parallax depth
function createMultiLayerStarField() {
    console.log('⭐ Creating multi-layer parallax starfield...');

    // Layer 1: Main visible stars (closer, brighter)
    createMainStarLayer();

    // Layer 2: Beacon stars (bright cross-shaped like NASA photos)
    createBeaconStarLayer();

    // Layer 3: Distant colorful stars
    createDistantStarLayer();

    // Layer 4: Star dust (tiny background particles)
    createStarDustLayer();

    console.log('✨ Multi-layer starfield complete!');
}

// Main star layer - visible and beautiful
function createMainStarLayer() {
    const starCount = 50000;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const phases = new Float32Array(starCount);
    const twinkleSpeeds = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;

        // Spherical distribution with galactic disk concentration
        const distributionType = Math.random();
        let radius, theta, phi;

        if (distributionType < 0.6) {
            // Galactic disk (flattened)
            radius = 100 + Math.random() * 500;
            theta = Math.random() * Math.PI * 2;
            phi = Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        } else if (distributionType < 0.85) {
            // Spherical halo
            radius = 200 + Math.random() * 600;
            theta = Math.random() * Math.PI * 2;
            phi = Math.acos(2 * Math.random() - 1);
        } else {
            // Core cluster
            radius = 80 + Math.random() * 150;
            theta = Math.random() * Math.PI * 2;
            phi = Math.acos(2 * Math.random() - 1);
        }

        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);

        // Realistic stellar classification
        const type = Math.random();
        if (type < 0.03) {
            // O-type (blue supergiants) - rare but spectacular
            colors[i3] = 0.6; colors[i3 + 1] = 0.75; colors[i3 + 2] = 1.0;
            sizes[i] = 3.0 + Math.random() * 2.5;
            twinkleSpeeds[i] = 1.5 + Math.random();
        } else if (type < 0.12) {
            // B-type (blue-white)
            colors[i3] = 0.75; colors[i3 + 1] = 0.85; colors[i3 + 2] = 1.0;
            sizes[i] = 2.2 + Math.random() * 1.8;
            twinkleSpeeds[i] = 1.8 + Math.random();
        } else if (type < 0.30) {
            // A-type (white)
            colors[i3] = 0.95; colors[i3 + 1] = 0.95; colors[i3 + 2] = 1.0;
            sizes[i] = 1.8 + Math.random() * 1.5;
            twinkleSpeeds[i] = 2.0 + Math.random();
        } else if (type < 0.50) {
            // F-G type (yellow-white, Sun-like)
            colors[i3] = 1.0; colors[i3 + 1] = 0.95; colors[i3 + 2] = 0.85;
            sizes[i] = 1.4 + Math.random() * 1.2;
            twinkleSpeeds[i] = 2.2 + Math.random();
        } else if (type < 0.70) {
            // K-type (orange)
            colors[i3] = 1.0; colors[i3 + 1] = 0.78; colors[i3 + 2] = 0.55;
            sizes[i] = 1.2 + Math.random() * 1.0;
            twinkleSpeeds[i] = 2.5 + Math.random();
        } else {
            // M-type (red dwarfs) - most common
            colors[i3] = 1.0; colors[i3 + 1] = 0.58; colors[i3 + 2] = 0.4;
            sizes[i] = 0.9 + Math.random() * 0.8;
            twinkleSpeeds[i] = 3.0 + Math.random();
        }

        phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('twinkleSpeed', new THREE.BufferAttribute(twinkleSpeeds, 1));

    const starMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            pixelRatio: { value: renderer.getPixelRatio() }
        },
        vertexShader: `
            attribute float size;
            attribute float phase;
            attribute float twinkleSpeed;
            varying vec3 vColor;
            varying float vAlpha;
            uniform float time;
            uniform float pixelRatio;

            void main() {
                vColor = color;

                // Multi-frequency twinkling for realism
                float twinkle = sin(time * twinkleSpeed + phase) * 0.25 +
                               sin(time * twinkleSpeed * 0.7 + phase * 1.3) * 0.15 + 0.75;
                vAlpha = twinkle;

                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * pixelRatio * (350.0 / -mvPosition.z) * twinkle;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vAlpha;

            void main() {
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);

                if (dist > 0.5) discard;

                // Soft glow with bright core
                float core = 1.0 - smoothstep(0.0, 0.15, dist);
                float glow = 1.0 - smoothstep(0.0, 0.5, dist);
                float intensity = core * 0.7 + glow * 0.3;
                intensity = pow(intensity, 1.5);

                gl_FragColor = vec4(vColor, intensity * vAlpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        vertexColors: true,
        blending: THREE.AdditiveBlending
    });

    starLayers.main = new THREE.Points(geometry, starMaterial);
    scene.add(starLayers.main);

    console.log(`  ✨ Main layer: ${starCount.toLocaleString()} stars`);
}

// Beacon stars - bright cross-shaped like telescope images
function createBeaconStarLayer() {
    const beaconCount = 150;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(beaconCount * 3);
    const colors = new Float32Array(beaconCount * 3);
    const sizes = new Float32Array(beaconCount);
    const phases = new Float32Array(beaconCount);

    for (let i = 0; i < beaconCount; i++) {
        const i3 = i * 3;

        // Strategic placement for visibility
        const radius = 150 + Math.random() * 600;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);

        // Bright star colors
        const colorType = Math.random();
        if (colorType < 0.4) {
            // Pure white
            colors[i3] = 1.0; colors[i3 + 1] = 1.0; colors[i3 + 2] = 1.0;
        } else if (colorType < 0.7) {
            // Blue-white
            colors[i3] = 0.85; colors[i3 + 1] = 0.92; colors[i3 + 2] = 1.0;
        } else {
            // Warm white
            colors[i3] = 1.0; colors[i3 + 1] = 0.95; colors[i3 + 2] = 0.85;
        }

        sizes[i] = 5 + Math.random() * 6;
        phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    // Cross-shaped beacon star shader
    const beaconMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            pixelRatio: { value: renderer.getPixelRatio() }
        },
        vertexShader: `
            attribute float size;
            attribute float phase;
            varying vec3 vColor;
            varying float vPhase;
            uniform float time;
            uniform float pixelRatio;

            void main() {
                vColor = color;
                vPhase = phase;

                // Pulsing effect
                float pulse = sin(time * 1.5 + phase) * 0.2 + 0.9;

                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * pixelRatio * (400.0 / -mvPosition.z) * pulse;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vPhase;

            void main() {
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);

                // Create cross/diffraction spike pattern
                float angle = atan(center.y, center.x);
                float spike = pow(abs(sin(angle * 2.0)), 8.0);

                // Core glow
                float core = exp(-dist * 8.0);

                // Diffraction spikes
                float spikes = spike * exp(-dist * 3.0) * 0.6;

                float intensity = core + spikes;
                intensity = clamp(intensity, 0.0, 1.0);

                if (intensity < 0.01) discard;

                gl_FragColor = vec4(vColor, intensity);
            }
        `,
        transparent: true,
        depthWrite: false,
        vertexColors: true,
        blending: THREE.AdditiveBlending
    });

    starLayers.beacon = new THREE.Points(geometry, beaconMaterial);
    scene.add(starLayers.beacon);

    console.log(`  ✨ Beacon layer: ${beaconCount} bright stars`);
}

// Distant colorful stars for depth
function createDistantStarLayer() {
    const starCount = 80000;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const phases = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;

        // Very distant spherical distribution
        const radius = 400 + Math.random() * 1200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);

        // Subtle color variations
        const hue = Math.random();
        if (hue < 0.3) {
            // Warm tint
            colors[i3] = 1.0; colors[i3 + 1] = 0.9; colors[i3 + 2] = 0.85;
        } else if (hue < 0.6) {
            // Cool tint
            colors[i3] = 0.88; colors[i3 + 1] = 0.92; colors[i3 + 2] = 1.0;
        } else {
            // Neutral
            colors[i3] = 0.95; colors[i3 + 1] = 0.95; colors[i3 + 2] = 0.95;
        }

        sizes[i] = 0.5 + Math.random() * 1.2;
        phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    const distantMaterial = new THREE.ShaderMaterial({
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

                // Gentle twinkling
                float twinkle = sin(time * 1.5 + phase) * 0.15 + 0.85;
                vAlpha = twinkle * 0.7;

                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * pixelRatio * (200.0 / -mvPosition.z) * twinkle;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vAlpha;

            void main() {
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);

                if (dist > 0.5) discard;

                float intensity = 1.0 - smoothstep(0.0, 0.5, dist);
                intensity = pow(intensity, 1.8);

                gl_FragColor = vec4(vColor, intensity * vAlpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        vertexColors: true,
        blending: THREE.AdditiveBlending
    });

    starLayers.distant = new THREE.Points(geometry, distantMaterial);
    scene.add(starLayers.distant);

    console.log(`  ✨ Distant layer: ${starCount.toLocaleString()} stars`);
}

// Star dust - tiny particles for ultimate depth
function createStarDustLayer() {
    const dustCount = 30000;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(dustCount * 3);
    const sizes = new Float32Array(dustCount);

    for (let i = 0; i < dustCount; i++) {
        const i3 = i * 3;

        const radius = 800 + Math.random() * 2000;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);

        sizes[i] = 0.2 + Math.random() * 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const dustMaterial = new THREE.PointsMaterial({
        size: 0.4,
        color: 0xaabbcc,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
    });

    starLayers.dust = new THREE.Points(geometry, dustMaterial);
    scene.add(starLayers.dust);

    console.log(`  ✨ Dust layer: ${dustCount.toLocaleString()} particles`);
}

// Create distant cosmic elements (galaxies, nebula wisps)
function createDistantCosmicElements() {
    console.log('🌌 Creating distant cosmic elements...');

    // Create distant spiral galaxies
    for (let i = 0; i < 5; i++) {
        createDistantGalaxy();
    }

    // Create subtle nebula wisps
    for (let i = 0; i < 8; i++) {
        createNebulaWisp();
    }

    console.log('✅ Distant cosmic elements created');
}

// Create a distant spiral galaxy
function createDistantGalaxy() {
    const particleCount = 3000;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    // Random position in the far distance
    const distance = 1500 + Math.random() * 2000;
    const theta = Math.random() * Math.PI * 2;
    const height = (Math.random() - 0.5) * 800;

    const galaxyCenter = new THREE.Vector3(
        Math.cos(theta) * distance,
        height,
        Math.sin(theta) * distance
    );

    const galaxyRadius = 80 + Math.random() * 60;
    const armCount = 2 + Math.floor(Math.random() * 3);
    const tilt = Math.random() * Math.PI * 0.4;

    // Galaxy color (purple/blue/pink tints)
    const galaxyHue = Math.random();
    let baseColor;
    if (galaxyHue < 0.33) {
        baseColor = { r: 0.8, g: 0.6, b: 1.0 }; // Purple
    } else if (galaxyHue < 0.66) {
        baseColor = { r: 0.6, g: 0.7, b: 1.0 }; // Blue
    } else {
        baseColor = { r: 1.0, g: 0.7, b: 0.8 }; // Pink
    }

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        // Spiral arm distribution
        const armIndex = i % armCount;
        const armAngle = (armIndex / armCount) * Math.PI * 2;
        const radius = Math.pow(Math.random(), 0.5) * galaxyRadius;
        const spiralAngle = armAngle + radius * 0.15 + (Math.random() - 0.5) * 0.5;

        let x = Math.cos(spiralAngle) * radius;
        let y = (Math.random() - 0.5) * 5 * (1 - radius / galaxyRadius);
        let z = Math.sin(spiralAngle) * radius;

        // Apply tilt
        const cosT = Math.cos(tilt);
        const sinT = Math.sin(tilt);
        const newY = y * cosT - z * sinT;
        const newZ = y * sinT + z * cosT;

        positions[i3] = galaxyCenter.x + x;
        positions[i3 + 1] = galaxyCenter.y + newY;
        positions[i3 + 2] = galaxyCenter.z + newZ;

        // Color with core brightness
        const brightness = 1 - (radius / galaxyRadius) * 0.5;
        colors[i3] = baseColor.r * brightness;
        colors[i3 + 1] = baseColor.g * brightness;
        colors[i3 + 2] = baseColor.b * brightness;

        sizes[i] = 1 + Math.random() * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
    });

    const galaxy = new THREE.Points(geometry, material);
    galaxy.userData = { rotationSpeed: 0.0001 + Math.random() * 0.0002 };
    scene.add(galaxy);
    distantGalaxies.push(galaxy);
}

// Create subtle nebula wisp
function createNebulaWisp() {
    const particleCount = 1500;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    // Random position
    const distance = 600 + Math.random() * 1200;
    const theta = Math.random() * Math.PI * 2;
    const height = (Math.random() - 0.5) * 500;

    const center = new THREE.Vector3(
        Math.cos(theta) * distance,
        height,
        Math.sin(theta) * distance
    );

    // Nebula color palettes
    const palettes = [
        { r: 1.0, g: 0.4, b: 0.6 },  // Pink/magenta
        { r: 0.4, g: 0.6, b: 1.0 },  // Blue
        { r: 0.6, g: 1.0, b: 0.8 },  // Cyan/green
        { r: 1.0, g: 0.6, b: 0.4 },  // Orange
        { r: 0.8, g: 0.5, b: 1.0 }   // Purple
    ];

    const palette = palettes[Math.floor(Math.random() * palettes.length)];
    const nebulaSize = 50 + Math.random() * 100;

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        // Gaussian distribution for organic cloud shape
        const r1 = Math.random(), r2 = Math.random();
        const gaussian1 = Math.sqrt(-2 * Math.log(r1)) * Math.cos(2 * Math.PI * r2);
        const gaussian2 = Math.sqrt(-2 * Math.log(r1)) * Math.sin(2 * Math.PI * r2);
        const r3 = Math.random(), r4 = Math.random();
        const gaussian3 = Math.sqrt(-2 * Math.log(r3)) * Math.cos(2 * Math.PI * r4);

        positions[i3] = center.x + gaussian1 * nebulaSize;
        positions[i3 + 1] = center.y + gaussian2 * nebulaSize * 0.5;
        positions[i3 + 2] = center.z + gaussian3 * nebulaSize;

        const variation = 0.7 + Math.random() * 0.3;
        colors[i3] = palette.r * variation;
        colors[i3 + 1] = palette.g * variation;
        colors[i3 + 2] = palette.b * variation;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 8,
        vertexColors: true,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
    });

    const wisp = new THREE.Points(geometry, material);
    scene.add(wisp);
    nebulaWisps.push(wisp);
}

// Create black hole with gravitational lensing effect
function createBlackHoleSystem(parent) {
    console.log('🕳️ Creating black hole system...');

    blackHoleSystem = new THREE.Group();

    // Event horizon with photon ring effect
    const horizonGeometry = new THREE.SphereGeometry(6, 64, 64);
    const horizonMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: `
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec3 vViewPosition;

            void main() {
                vPosition = position;
                vNormal = normalize(normalMatrix * normal);
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vViewPosition = -mvPosition.xyz;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform float time;
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec3 vViewPosition;

            void main() {
                vec3 viewDir = normalize(vViewPosition);
                float rim = 1.0 - abs(dot(vNormal, viewDir));

                // Photon ring effect at the edge
                float photonRing = pow(rim, 8.0) * 0.3;

                // Orange-gold photon ring color (like Interstellar)
                vec3 ringColor = vec3(1.0, 0.6, 0.2) * photonRing;

                // Pure black center
                vec3 color = ringColor;
                float alpha = max(1.0 - pow(rim, 2.0) * 0.5, photonRing);

                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        side: THREE.FrontSide
    });

    const eventHorizon = new THREE.Mesh(horizonGeometry, horizonMaterial);
    blackHoleSystem.add(eventHorizon);

    // Add photon ring torus
    const photonRingGeometry = new THREE.TorusGeometry(7.5, 0.15, 16, 100);
    const photonRingMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            uniform float time;

            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            uniform float time;

            void main() {
                // Animated glow
                float pulse = sin(time * 2.0 + vUv.x * 20.0) * 0.3 + 0.7;

                // Bright orange-gold color
                vec3 color = vec3(1.0, 0.5, 0.1) * pulse * 1.5;

                gl_FragColor = vec4(color, pulse * 0.8);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });

    const photonRing = new THREE.Mesh(photonRingGeometry, photonRingMaterial);
    photonRing.rotation.x = Math.PI / 2;
    blackHoleSystem.add(photonRing);

    if (parent) {
        parent.add(blackHoleSystem);
    } else {
        scene.add(blackHoleSystem);
    }
    console.log('✅ Black hole with photon ring created');
}

// Setup lighting
function setupLighting() {
    // Subtle ambient light
    const ambientLight = new THREE.AmbientLight(0x0a0a18, 0.12);
    scene.add(ambientLight);

    // Accent lights for depth
    const pointLight1 = new THREE.PointLight(0x3030ff, 0.25, 250);
    pointLight1.position.set(30, 15, 30);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff3030, 0.15, 200);
    pointLight2.position.set(-30, 10, -30);
    scene.add(pointLight2);

    // Rim light for black hole
    const rimLight = new THREE.PointLight(0xff6600, 0.3, 100);
    rimLight.position.set(0, 0, 0);
    scene.add(rimLight);
}

// Animation loop
function animate() {
    animationId = requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // Update star layers
    updateStarLayers(elapsed);

    // Update distant cosmic elements
    updateDistantElements(elapsed);

    // Update black hole
    updateBlackHole(elapsed);

    // Update Interstellar black hole with lensing
    updateBlackHoleSystems(elapsed, delta, camera);

    // Update camera effects
    updateCameraEffects();

    // Cinematic camera motion
    updateCinematicCamera(elapsed);

    // Update film grain time
    if (composer.passes[1] && composer.passes[1].uniforms && composer.passes[1].uniforms.time) {
        composer.passes[1].uniforms.time.value = elapsed;
    }

    // Render with post-processing
    composer.render();

    // Performance stats
    updateStats();
}

// Update star layers
function updateStarLayers(elapsed) {
    // Main stars
    if (starLayers.main) {
        starLayers.main.material.uniforms.time.value = elapsed;
        starLayers.main.rotation.y += 0.00003;
    }

    // Beacon stars
    if (starLayers.beacon) {
        starLayers.beacon.material.uniforms.time.value = elapsed;
        starLayers.beacon.rotation.y += 0.00002;
    }

    // Distant stars (slower rotation for parallax)
    if (starLayers.distant) {
        starLayers.distant.material.uniforms.time.value = elapsed;
        starLayers.distant.rotation.y += 0.00001;
    }

    // Star dust (slowest for maximum depth)
    if (starLayers.dust) {
        starLayers.dust.rotation.y += 0.000005;
    }
}

// Update distant cosmic elements
function updateDistantElements(elapsed) {
    // Rotate distant galaxies
    distantGalaxies.forEach(galaxy => {
        if (galaxy.userData && galaxy.userData.rotationSpeed) {
            galaxy.rotation.y += galaxy.userData.rotationSpeed;
        }
    });

    // Subtle nebula animation
    nebulaWisps.forEach((wisp, index) => {
        wisp.rotation.y += 0.00005;
        // Gentle breathing effect
        const breathe = Math.sin(elapsed * 0.2 + index) * 0.02 + 1;
        wisp.scale.setScalar(breathe);
    });
}

// Update black hole effects
function updateBlackHole(elapsed) {
    if (blackHoleSystem) {
        blackHoleSystem.children.forEach(child => {
            if (child.material && child.material.uniforms && child.material.uniforms.time) {
                child.material.uniforms.time.value = elapsed;
            }
        });
    }
}

// Cinematic camera motion
function updateCinematicCamera(elapsed) {
    // Multi-layered breathing effect
    const breathe1 = Math.sin(elapsed * 0.05) * 6;
    const breathe2 = Math.sin(elapsed * 0.08) * 3;
    const breathe3 = Math.cos(elapsed * 0.03) * 2;

    // Dynamic radius with breathing
    cameraState.currentRadius = cameraState.baseRadius + breathe1 + breathe2;

    // Complex height variation
    const heightWave1 = Math.sin(elapsed * 0.07) * 5;
    const heightWave2 = Math.cos(elapsed * 0.11) * 3;
    cameraState.currentHeight = cameraState.baseHeight + heightWave1 + heightWave2;

    // Slow continuous rotation
    cameraState.rotation += 0.0008;

    // Figure-8 drift pattern
    cameraState.driftX = Math.sin(elapsed * 0.04) * Math.cos(elapsed * 0.02) * 5;
    cameraState.driftZ = Math.cos(elapsed * 0.03) * Math.sin(elapsed * 0.05) * 4;

    // Calculate target position
    const targetX = Math.sin(cameraState.rotation) * cameraState.currentRadius + cameraState.driftX;
    const targetY = cameraState.currentHeight + breathe3;
    const targetZ = Math.cos(cameraState.rotation) * cameraState.currentRadius + cameraState.driftZ;

    // Smooth camera interpolation
    camera.position.x += (targetX - camera.position.x) * 0.015;
    camera.position.y += (targetY - camera.position.y) * 0.015;
    camera.position.z += (targetZ - camera.position.z) * 0.015;

    // Dynamic look-at with subtle drift
    cameraState.lookAtOffset.x = Math.sin(elapsed * 0.02) * 1.5;
    cameraState.lookAtOffset.y = Math.cos(elapsed * 0.03) * 0.8;
    cameraState.lookAtOffset.z = Math.sin(elapsed * 0.025) * 1.2;

    camera.lookAt(cameraState.lookAtOffset);
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

    // Update FXAA resolution
    if (fxaaPass) {
        const pixelRatio = renderer.getPixelRatio();
        fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pixelRatio);
        fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pixelRatio);
    }

    // Update bloom resolution
    if (bloomPass) {
        bloomPass.resolution.set(window.innerWidth, window.innerHeight);
    }
}

// Cleanup
export function dispose() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }

    // Cleanup black hole
    cleanupBlackHole();

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
export { renderer, stats };
