// 3D Scene Setup and Management
import { createStarField, createGalaxyCore, createPlanets, createNebula, createComets, createSpaceObjects } from './galaxy.js';
import { updateBlackHoleEffects, createEnhancedBlackHole } from './blackhole.js';
import { initCameraEffects, updateCameraEffects } from './camera-effects.js';
import { trackRequestAnimationFrame } from './cleanup.js';

let scene, camera, renderer, composer;
export let stars = [];
export let focusOrbs = [];
let particleSystem;
export let galaxyCore = {};
export let planets = [];
export let comets = [];
export let spaceObjects = [];
let ambientLight, pointLight;
let cameraTarget = new THREE.Vector3();
let cameraRotation = 0;

export { scene };

// Check WebGL availability
function checkWebGLSupport() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!gl;
    } catch (e) {
        return false;
    }
}

// Initialize 3D Scene
export function init3D() {
    if (!window.THREE) {
        console.error('Three.js not loaded, skipping 3D initialization');
        return false;
    }

    if (!checkWebGLSupport()) {
        console.warn('WebGL not supported, skipping 3D initialization');
        return false;
    }

    const container = document.getElementById('scene-container');
    if (!container) {
        console.error('Scene container not found');
        return false;
    }

    try {
        scene = new THREE.Scene();

        // Camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 20; // Even closer than before (was 30, then 50 originally)
        camera.position.y = 5; // Slightly elevated to get a better angle
        camera.lookAt(0, 0, 0); // Explicitly look at the center where black hole is

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);
        container.appendChild(renderer.domElement);

        // Lighting
        ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        scene.add(ambientLight);

        pointLight = new THREE.PointLight(0x6366f1, 1, 100);
        pointLight.position.set(10, 10, 10);
        scene.add(pointLight);

        // Create galaxy elements
        createStarField();
        
        // Create enhanced black hole with delay
        setTimeout(() => {
            createEnhancedBlackHole();
        }, 100);
        createPlanets();
        createNebula();
        createComets();
        createSpaceObjects();
        
        // Components loaded successfully

        // Initialize camera effects
        initCameraEffects(camera);

        // Start animation loop
        animate();

        // Handle window resize
        window.addEventListener('resize', onWindowResize);

        return true;
    } catch (error) {
        console.error('Failed to initialize 3D scene:', error);
        // Fallback: hide scene container
        if (container) {
            container.style.display = 'none';
        }
        return false;
    }
}

// Animation loop
export function animate() {
    trackRequestAnimationFrame(animate);

    // Update enhanced black hole effects
    updateBlackHoleEffects();

    // Update camera effects
    updateCameraEffects();

    // Animate planets
    planets.forEach(planet => {
        planet.userData.angle += planet.userData.speed;
        planet.position.x = Math.cos(planet.userData.angle) * planet.userData.distance;
        planet.position.z = Math.sin(planet.userData.angle) * planet.userData.distance;
        planet.rotation.y += planet.userData.rotationSpeed;
        planet.rotation.x += planet.userData.rotationSpeed * 0.3;
    });

    // Animate stars and cosmic elements
    stars.forEach((starField, index) => {
        if (starField.material.opacity !== undefined) {
            const time = Date.now() * 0.001;
            starField.material.opacity = 0.6 + Math.sin(time + index) * 0.3;
        }
        
        if (starField.userData && starField.userData.rotationSpeed) {
            starField.rotation.y += starField.userData.rotationSpeed;
            starField.rotation.x += starField.userData.rotationSpeed * 0.5;
        }
    });

    // Animate comets
    comets.forEach((comet, index) => {
        comet.position.add(comet.userData.velocity);
        comet.userData.life--;
        
        const opacity = comet.userData.life / comet.userData.maxLife;
        comet.material.opacity = opacity;
        
        if (comet.userData.life <= 0 || comet.position.length() > 200) {
            const angle = Math.random() * Math.PI * 2;
            comet.position.set(
                Math.cos(angle) * 150,
                (Math.random() - 0.5) * 100,
                Math.sin(angle) * 150
            );
            
            comet.userData.velocity.set(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.5
            );
            
            comet.userData.life = Math.random() * 1000 + 500;
            comet.material.opacity = 1;
        }
    });

    // Animate space objects
    spaceObjects.forEach((spaceObject, index) => {
        const time = Date.now() * 0.001;
        
        spaceObject.position.y += Math.sin(time + index * 0.5) * 0.01;
        spaceObject.position.x += Math.cos(time * 0.7 + index * 0.3) * 0.005;
        spaceObject.position.z += Math.sin(time * 0.5 + index * 0.7) * 0.005;
        
        if (spaceObject.userData.type === 'satellite') {
            spaceObject.rotation.y += 0.02;
            spaceObject.rotation.x += 0.01;
        } else if (spaceObject.userData.type === 'spaceStation') {
            spaceObject.rotation.y += 0.005;
        } else if (spaceObject.userData.type === 'asteroid') {
            spaceObject.rotation.x += 0.015;
            spaceObject.rotation.y += 0.012;
            spaceObject.rotation.z += 0.008;
        } else if (spaceObject.userData.type === 'debris') {
            spaceObject.rotation.x += 0.025;
            spaceObject.rotation.y += 0.03;
            spaceObject.rotation.z += 0.02;
        }
    });

    // Camera movement - reduced orbit distance to see black hole better
    cameraRotation += 0.002;
    camera.position.x = Math.sin(cameraRotation) * 40; // Reduced from 60 to 40
    camera.position.z = Math.cos(cameraRotation) * 40; // Reduced from 60 to 40
    camera.lookAt(cameraTarget);

    renderer.render(scene, camera);
}

// Handle window resize
export function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
