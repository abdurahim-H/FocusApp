// // 3D Scene Setup and Management - Enhanced Cosmic Animations with Fixed Camera
// import { createStarField, createGalaxyCore, createPlanets, createNebula, createComets, createSpaceObjects } from './galaxy.js';
// import { updateBlackHoleEffects, createEnhancedBlackHole } from './blackhole.js';
// import { initCameraEffects, updateCameraEffects } from './camera-effects.js';
// import { trackRequestAnimationFrame } from './cleanup.js';

// let scene, camera, renderer, composer;
// export let stars = [];
// export let focusOrbs = [];
// let particleSystem;
// export let galaxyCore = {};
// export let planets = [];
// export let comets = [];
// export let spaceObjects = [];
// let ambientLight, pointLight;
// let cameraTarget = new THREE.Vector3(0, 0, 0); // Fixed at origin
// let cameraRotation = 0;
// let time = 0;

// export { scene };

// // Check WebGL availability
// function checkWebGLSupport() {
//     try {
//         const canvas = document.createElement('canvas');
//         const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
//         return !!gl;
//     } catch (e) {
//         return false;
//     }
// }

// // Initialize 3D Scene
// export function init3D() {
//     if (!window.THREE) {
//         console.warn('Three.js not loaded, skipping 3D initialization');
//         return false;
//     }

//     if (!checkWebGLSupport()) {
//         console.warn('WebGL not supported, skipping 3D initialization');
//         return false;
//     }

//     const container = document.getElementById('scene-container');
//     if (!container) {
//         console.error('Scene container not found');
//         return false;
//     }

//     try {
//         scene = new THREE.Scene();
//         scene.fog = new THREE.FogExp2(0x000510, 0.0008);

//         // Camera with better initial position
//         camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
//         camera.position.set(40, 15, 40); // Start at a good viewing angle

//         // Renderer with enhanced settings
//         renderer = new THREE.WebGLRenderer({ 
//             antialias: true, 
//             alpha: true,
//             powerPreference: "high-performance"
//         });
//         renderer.setSize(window.innerWidth, window.innerHeight);
//         renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
//         renderer.setClearColor(0x000000, 0);
//         renderer.shadowMap.enabled = true;
//         renderer.shadowMap.type = THREE.PCFSoftShadowMap;
//         container.appendChild(renderer.domElement);

//         // Enhanced lighting
//         ambientLight = new THREE.AmbientLight(0x404040, 0.3);
//         scene.add(ambientLight);

//         // Multiple point lights for depth
//         const lightColors = [0x6366f1, 0x8b5cf6, 0x06d6a0];
//         lightColors.forEach((color, index) => {
//             const light = new THREE.PointLight(color, 0.8, 150);
//             light.position.set(
//                 Math.cos(index * Math.PI * 2 / 3) * 30,
//                 10 + index * 5,
//                 Math.sin(index * Math.PI * 2 / 3) * 30
//             );
//             scene.add(light);
//         });

//         // Create galaxy elements - STARS FIRST for immediate visibility
//         createStarField();
//         createNebula();
//         createEnhancedBlackHole();
//         createPlanets();
//         createComets();
//         createSpaceObjects();

//         // Initialize camera effects
//         initCameraEffects(camera);

//         // Start animation loop
//         animate();

//         // Handle window resize
//         window.addEventListener('resize', onWindowResize);

//         return true;
//     } catch (error) {
//         console.error('Failed to initialize 3D scene:', error);
//         if (container) {
//             container.style.display = 'none';
//         }
//         return false;
//     }
// }

// // Enhanced animation loop with stable camera movement
// export function animate() {
//     trackRequestAnimationFrame(animate);
    
//     time += 0.01;

//     // Update enhanced black hole effects
//     updateBlackHoleEffects();

//     // Update camera effects
//     updateCameraEffects();

//     // FIXED CAMERA MOVEMENT - Keep everything in view
//     cameraRotation += 0.001; // Slower rotation
    
//     // Camera orbits around the center at a fixed angle
//     const cameraRadius = 50; // Fixed distance
//     const cameraHeight = 20 + Math.sin(time * 0.1) * 5; // Gentle vertical movement
    
//     camera.position.x = Math.sin(cameraRotation) * cameraRadius;
//     camera.position.y = cameraHeight;
//     camera.position.z = Math.cos(cameraRotation) * cameraRadius;
    
//     // Always look at the center where the black hole is
//     camera.lookAt(cameraTarget);

//     // Enhanced planet animations
//     planets.forEach((planet, index) => {
//         // Orbital motion
//         planet.userData.angle += planet.userData.speed * 0.7;
//         const orbitRadius = planet.userData.distance + Math.sin(time + index) * 2;
//         planet.position.x = Math.cos(planet.userData.angle) * orbitRadius;
//         planet.position.z = Math.sin(planet.userData.angle) * orbitRadius;
//         planet.position.y = Math.sin(planet.userData.angle * 2 + index) * 3;
        
//         // Smooth rotation
//         planet.rotation.y += planet.userData.rotationSpeed;
//         planet.rotation.x = Math.sin(time * 0.5 + index) * 0.1;
        
//         // Gentle bobbing
//         planet.position.y += Math.sin(time * 2 + index * 0.5) * 0.05;
        
//         // Update planet shader time uniform
//         if (planet.userData.material && planet.userData.material.uniforms.time) {
//             planet.userData.material.uniforms.time.value = time;
//         }
        
//         // Animate moons
//         if (planet.children) {
//             planet.children.forEach((child, moonIndex) => {
//                 if (child.userData && child.userData.angle !== undefined) {
//                     child.userData.angle += child.userData.speed;
//                     child.position.x = Math.cos(child.userData.angle) * child.userData.distance;
//                     child.position.z = Math.sin(child.userData.angle) * child.userData.distance;
//                     child.position.y = Math.sin(child.userData.angle * 3) * 0.5;
//                 }
//             });
//         }
//     });

//     // Enhanced star animations - FIXED to always be visible
//     stars.forEach((starField, index) => {
//         // Ensure stars are always visible
//         starField.visible = true;
        
//         // Update shader time for animated stars
//         if (starField.material.uniforms && starField.material.uniforms.time) {
//             starField.material.uniforms.time.value = time;
//         }
        
//         // Only update rotation for star fields, not opacity
//         if (starField.userData && starField.userData.rotationSpeed) {
//             starField.rotation.y += starField.userData.rotationSpeed * 0.5;
//             starField.rotation.x += starField.userData.rotationSpeed * 0.3;
//         }
        
//         // Subtle drift for nebula clouds only (not main star field)
//         if (starField.userData && starField.userData.isNebula) {
//             starField.position.x = Math.sin(time * 0.05) * 2;
//             starField.position.y = Math.cos(time * 0.07) * 2;
//         }
//     });

//     // Enhanced comet animations
//     comets.forEach((comet, index) => {
//         // Curved paths for comets
//         const curve = Math.sin(time * 0.5 + index) * 0.02;
//         comet.userData.velocity.y += curve;
        
//         comet.position.add(comet.userData.velocity);
//         comet.userData.life--;
        
//         // Smooth opacity fade
//         const opacity = Math.pow(comet.userData.life / comet.userData.maxLife, 2);
//         if (comet.userData.tailMaterial) {
//             comet.userData.tailMaterial.uniforms.opacity.value = opacity;
//             comet.userData.tailMaterial.uniforms.time.value = time;
//         }
//         if (comet.userData.auraMaterial) {
//             comet.userData.auraMaterial.uniforms.time.value = time;
//         }
        
//         // Update tail orientation
//         if (comet.children[0]) {
//             comet.children[0].lookAt(
//                 comet.position.clone().sub(comet.userData.velocity.clone().multiplyScalar(10))
//             );
//         }
        
//         if (comet.userData.life <= 0 || comet.position.length() > 200) {
//             resetComet(comet, index);
//         }
//     });

//     // Enhanced space object animations
//     spaceObjects.forEach((spaceObject, index) => {
//         const floatSpeed = 0.3;
//         const driftRadius = 2;
        
//         // Smooth floating motion
//         const floatX = Math.sin(time * floatSpeed + index * 0.5) * driftRadius;
//         const floatY = Math.sin(time * floatSpeed * 0.7 + index * 0.3) * driftRadius;
//         const floatZ = Math.cos(time * floatSpeed * 0.5 + index * 0.7) * driftRadius;
        
//         spaceObject.position.x += floatX * 0.01;
//         spaceObject.position.y += floatY * 0.01;
//         spaceObject.position.z += floatZ * 0.01;
        
//         // Different rotation patterns for different objects
//         switch (spaceObject.userData.type) {
//             case 'satellite':
//                 spaceObject.rotation.y += 0.01;
//                 spaceObject.rotation.x = Math.sin(time) * 0.2;
//                 break;
//             case 'spaceStation':
//                 spaceObject.rotation.y += 0.003;
//                 spaceObject.rotation.z = Math.sin(time * 0.5) * 0.05;
//                 break;
//             case 'asteroid':
//                 spaceObject.rotation.x += 0.008;
//                 spaceObject.rotation.y += 0.006;
//                 spaceObject.rotation.z += 0.004;
//                 break;
//             case 'debris':
//                 spaceObject.rotation.x += 0.015 * Math.sin(time + index);
//                 spaceObject.rotation.y += 0.012;
//                 spaceObject.rotation.z += 0.010;
//                 break;
//         }
        
//         // Keep objects within bounds
//         if (spaceObject.position.length() > 250) {
//             spaceObject.position.multiplyScalar(0.99);
//         }
//     });

//     renderer.render(scene, camera);
// }

// // Reset comet with smooth transition
// function resetComet(comet, index) {
//     const angle = Math.random() * Math.PI * 2;
//     const distance = 150 + Math.random() * 50;
    
//     comet.position.set(
//         Math.cos(angle) * distance,
//         (Math.random() - 0.5) * 100,
//         Math.sin(angle) * distance
//     );
    
//     // Velocity towards center with variation
//     const targetPoint = new THREE.Vector3(
//         (Math.random() - 0.5) * 30,
//         (Math.random() - 0.5) * 30,
//         (Math.random() - 0.5) * 30
//     );
    
//     comet.userData.velocity = targetPoint.sub(comet.position).normalize().multiplyScalar(0.3 + Math.random() * 0.2);
//     comet.userData.life = 500 + Math.random() * 500;
//     comet.userData.maxLife = comet.userData.life;
// }

// // Handle window resize
// export function onWindowResize() {
//     camera.aspect = window.innerWidth / window.innerHeight;
//     camera.updateProjectionMatrix();
//     renderer.setSize(window.innerWidth, window.innerHeight);
// }

// 3D Scene Setup and Management - Enhanced Cosmic Animations with Fixed Camera
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
let cameraTarget = new THREE.Vector3(0, 0, 0); // Fixed at origin
let cameraRotation = 0;
let time = 0;

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
        console.warn('Three.js not loaded, skipping 3D initialization');
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
        scene.fog = new THREE.FogExp2(0x000510, 0.0008);

        // Camera with better initial position
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        camera.position.set(40, 15, 40); // Start at a good viewing angle

        // Renderer with enhanced settings
        renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance"
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // Enhanced lighting
        ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        scene.add(ambientLight);

        // Multiple point lights for depth
        const lightColors = [0x6366f1, 0x8b5cf6, 0x06d6a0];
        lightColors.forEach((color, index) => {
            const light = new THREE.PointLight(color, 0.8, 150);
            light.position.set(
                Math.cos(index * Math.PI * 2 / 3) * 30,
                10 + index * 5,
                Math.sin(index * Math.PI * 2 / 3) * 30
            );
            scene.add(light);
        });

        // Create galaxy elements - STARS FIRST for immediate visibility
        createStarField();
        createNebula();
        createEnhancedBlackHole();
        createPlanets();
        createComets();
        createSpaceObjects();

        // Initialize camera effects
        initCameraEffects(camera);

        // Start animation loop
        animate();

        // Handle window resize
        window.addEventListener('resize', onWindowResize);

        return true;
    } catch (error) {
        console.error('Failed to initialize 3D scene:', error);
        if (container) {
            container.style.display = 'none';
        }
        return false;
    }
}

// Enhanced animation loop with stable camera movement
export function animate() {
    trackRequestAnimationFrame(animate);
    
    time += 0.01;

    // Update enhanced black hole effects
    updateBlackHoleEffects();

    // Update camera effects
    updateCameraEffects();

    // FIXED CAMERA MOVEMENT - Keep everything in view
    cameraRotation += 0.001; // Slower rotation
    
    // Camera orbits around the center at a fixed angle
    const cameraRadius = 50; // Fixed distance
    const cameraHeight = 20 + Math.sin(time * 0.1) * 5; // Gentle vertical movement
    
    camera.position.x = Math.sin(cameraRotation) * cameraRadius;
    camera.position.y = cameraHeight;
    camera.position.z = Math.cos(cameraRotation) * cameraRadius;
    
    // Always look at the center where the black hole is
    camera.lookAt(cameraTarget);

    // Enhanced planet animations with tilted orbits
    planets.forEach((planetData, index) => {
        const planet = planetData.mesh;
        
        // Orbital motion within the tilted plane
        planet.userData.angle += planet.userData.speed * 0.7;
        const orbitRadius = planet.userData.distance + Math.sin(time + index) * 2;
        
        // Calculate position in the orbital plane
        planet.position.x = Math.cos(planet.userData.angle) * orbitRadius;
        planet.position.z = Math.sin(planet.userData.angle) * orbitRadius;
        planet.position.y = 0; // Keep Y at 0 within the tilted orbital plane
        
        // The tilt is handled by the parent orbitGroup, so no need to adjust Y here
        
        // Smooth rotation
        planet.rotation.y += planet.userData.rotationSpeed;
        planet.rotation.x = Math.sin(time * 0.5 + index) * 0.1;
        
        // Update planet shader time uniform
        if (planet.userData.material && planet.userData.material.uniforms.time) {
            planet.userData.material.uniforms.time.value = time;
        }
        
        // Animate moons
        if (planet.children) {
            planet.children.forEach((child, moonIndex) => {
                if (child.userData && child.userData.angle !== undefined) {
                    child.userData.angle += child.userData.speed;
                    child.position.x = Math.cos(child.userData.angle) * child.userData.distance;
                    child.position.z = Math.sin(child.userData.angle) * child.userData.distance;
                    child.position.y = Math.sin(child.userData.angle * 3) * 0.5;
                }
            });
        }
    });

    // Enhanced star animations - FIXED to always be visible with twinkling
    stars.forEach((starField, index) => {
        // Ensure stars are always visible
        starField.visible = true;
        
        // Update shader time for animated stars and twinkling
        if (starField.material.uniforms && starField.material.uniforms.time) {
            starField.material.uniforms.time.value = time;
        }
        
        // Only update rotation for star fields, not opacity
        if (starField.userData && starField.userData.rotationSpeed) {
            starField.rotation.y += starField.userData.rotationSpeed * 0.5;
            starField.rotation.x += starField.userData.rotationSpeed * 0.3;
        }
        
        // Subtle drift for nebula clouds only (not main star field)
        if (starField.userData && starField.userData.isNebula) {
            starField.position.x = Math.sin(time * 0.05) * 2;
            starField.position.y = Math.cos(time * 0.07) * 2;
        }
    });

    // Enhanced comet animations
    comets.forEach((comet, index) => {
        // Curved paths for comets
        const curve = Math.sin(time * 0.5 + index) * 0.02;
        comet.userData.velocity.y += curve;
        
        comet.position.add(comet.userData.velocity);
        comet.userData.life--;
        
        // Smooth opacity fade
        const opacity = Math.pow(comet.userData.life / comet.userData.maxLife, 2);
        if (comet.userData.tailMaterial) {
            comet.userData.tailMaterial.uniforms.opacity.value = opacity;
            comet.userData.tailMaterial.uniforms.time.value = time;
        }
        if (comet.userData.auraMaterial) {
            comet.userData.auraMaterial.uniforms.time.value = time;
        }
        
        // Update tail orientation
        if (comet.children[0]) {
            comet.children[0].lookAt(
                comet.position.clone().sub(comet.userData.velocity.clone().multiplyScalar(10))
            );
        }
        
        if (comet.userData.life <= 0 || comet.position.length() > 200) {
            resetComet(comet, index);
        }
    });

    // Enhanced space object animations
    spaceObjects.forEach((spaceObject, index) => {
        const floatSpeed = 0.3;
        const driftRadius = 2;
        
        // Smooth floating motion
        const floatX = Math.sin(time * floatSpeed + index * 0.5) * driftRadius;
        const floatY = Math.sin(time * floatSpeed * 0.7 + index * 0.3) * driftRadius;
        const floatZ = Math.cos(time * floatSpeed * 0.5 + index * 0.7) * driftRadius;
        
        spaceObject.position.x += floatX * 0.01;
        spaceObject.position.y += floatY * 0.01;
        spaceObject.position.z += floatZ * 0.01;
        
        // Different rotation patterns for different objects
        switch (spaceObject.userData.type) {
            case 'satellite':
                spaceObject.rotation.y += 0.01;
                spaceObject.rotation.x = Math.sin(time) * 0.2;
                break;
            case 'spaceStation':
                spaceObject.rotation.y += 0.003;
                spaceObject.rotation.z = Math.sin(time * 0.5) * 0.05;
                break;
            case 'asteroid':
                spaceObject.rotation.x += 0.008;
                spaceObject.rotation.y += 0.006;
                spaceObject.rotation.z += 0.004;
                break;
            case 'debris':
                spaceObject.rotation.x += 0.015 * Math.sin(time + index);
                spaceObject.rotation.y += 0.012;
                spaceObject.rotation.z += 0.010;
                break;
        }
        
        // Keep objects within bounds
        if (spaceObject.position.length() > 250) {
            spaceObject.position.multiplyScalar(0.99);
        }
    });

    renderer.render(scene, camera);
}

// Reset comet with smooth transition
function resetComet(comet, index) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 150 + Math.random() * 50;
    
    comet.position.set(
        Math.cos(angle) * distance,
        (Math.random() - 0.5) * 100,
        Math.sin(angle) * distance
    );
    
    // Velocity towards center with variation
    const targetPoint = new THREE.Vector3(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30
    );
    
    comet.userData.velocity = targetPoint.sub(comet.position).normalize().multiplyScalar(0.3 + Math.random() * 0.2);
    comet.userData.life = 500 + Math.random() * 500;
    comet.userData.maxLife = comet.userData.life;
}

// Handle window resize
export function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}