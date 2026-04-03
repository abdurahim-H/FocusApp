// cosmic-motes.js - Luminous cosmic firefly-like orbs
// Tiny glowing particles that drift on gentle curved paths through the scene
// The primary "this cosmos is alive" visual element

let motes = [];
let scene = null;
let moteMaterial = null;

const MOTE_COUNT = 30;

const MOTE_VERTEX = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    varying vec2 vUV;
    void main() {
        vUV = uv;
        gl_Position = worldViewProjection * vec4(position, 1.0);
    }
`;

const MOTE_FRAGMENT = `
    precision highp float;
    varying vec2 vUV;
    uniform float time;
    uniform float seed;
    uniform float life;       // 0-1, current position in lifecycle
    uniform vec3 moteColor;

    void main() {
        vec2 uv = vUV - 0.5;
        float dist = length(uv);

        // Soft glowing orb
        float core = exp(-dist * dist * 60.0);      // Tight bright center
        float glow = exp(-dist * dist * 12.0) * 0.5; // Soft halo
        float outer = exp(-dist * dist * 4.0) * 0.12; // Faint outer glow

        float total = core + glow + outer;

        // Gentle brightness pulsing
        float pulse = 0.75 + 0.25 * sin(time * (1.5 + seed * 2.0) + seed * 6.28);

        // Fade in/out over lifecycle
        float fadein = smoothstep(0.0, 0.08, life);
        float fadeout = smoothstep(1.0, 0.85, life);
        float lifeFade = fadein * fadeout;

        total *= pulse * lifeFade;

        // Color — white core fading to mote color
        vec3 color = mix(moteColor, vec3(1.0, 0.98, 0.94), core * 0.7);
        color *= total;

        float alpha = clamp(total * 2.0, 0.0, 1.0);
        if (alpha < 0.003) discard;

        gl_FragColor = vec4(color, alpha);
    }
`;

// Generate a smooth curved path for a mote
function createMotePath(seed) {
    // Each mote follows a unique 3D Lissajous-like curve
    const freqX = 0.015 + seed * 0.02;
    const freqY = 0.01 + (seed * 3.7 % 1.0) * 0.015;
    const freqZ = 0.012 + (seed * 7.3 % 1.0) * 0.018;
    const phaseX = seed * 6.28;
    const phaseY = seed * 4.15;
    const phaseZ = seed * 2.73;
    const ampX = 30 + seed * 50;
    const ampY = 20 + (seed * 2.3 % 1.0) * 40;
    const ampZ = 25 + (seed * 5.1 % 1.0) * 45;
    const centerX = (seed - 0.5) * 60;
    const centerY = ((seed * 3.1 % 1.0) - 0.5) * 40;
    const centerZ = ((seed * 7.7 % 1.0) - 0.5) * 60;

    return { freqX, freqY, freqZ, phaseX, phaseY, phaseZ, ampX, ampY, ampZ, centerX, centerY, centerZ };
}

/**
 * Create the cosmic motes system
 */
export function createCosmicMotes(sceneRef) {
    scene = sceneRef;

    BABYLON.Effect.ShadersStore['cosmicMoteVertexShader'] = MOTE_VERTEX;
    BABYLON.Effect.ShadersStore['cosmicMoteFragmentShader'] = MOTE_FRAGMENT;

    for (let i = 0; i < MOTE_COUNT; i++) {
        const seed = Math.random();
        const path = createMotePath(seed);

        // Size — most are tiny, a few slightly larger
        const sizeClass = Math.random();
        let size;
        if (sizeClass < 0.1) size = 2.0 + Math.random() * 1.5;       // Few larger
        else if (sizeClass < 0.35) size = 1.0 + Math.random() * 1.0;  // Medium
        else size = 0.4 + Math.random() * 0.6;                         // Most tiny

        // Color — mix of warm gold and cool blue
        let color;
        const colorClass = Math.random();
        if (colorClass < 0.45) {
            // Warm golden
            color = new BABYLON.Vector3(1.0, 0.82, 0.4);
        } else if (colorClass < 0.75) {
            // Cool blue-white
            color = new BABYLON.Vector3(0.7, 0.85, 1.0);
        } else if (colorClass < 0.9) {
            // Soft warm white
            color = new BABYLON.Vector3(1.0, 0.93, 0.8);
        } else {
            // Faint violet accent
            color = new BABYLON.Vector3(0.8, 0.7, 1.0);
        }

        // Lifecycle — stagger start times so they don't all appear at once
        const lifecycleDuration = 20 + Math.random() * 40; // 20-60 seconds per cycle
        const lifecycleOffset = Math.random() * lifecycleDuration;

        const plane = BABYLON.MeshBuilder.CreatePlane('mote_' + i, {
            width: size, height: size
        }, scene);

        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        plane.renderingGroupId = 0;
        plane.isPickable = false;

        const mat = new BABYLON.ShaderMaterial('moteMat_' + i, scene, {
            vertex: 'cosmicMote', fragment: 'cosmicMote'
        }, {
            attributes: ['position', 'uv'],
            uniforms: ['worldViewProjection', 'time', 'seed', 'life', 'moteColor'],
            needAlphaBlending: true
        });

        mat.setFloat('time', 0);
        mat.setFloat('seed', seed);
        mat.setFloat('life', 0);
        mat.setVector3('moteColor', color);
        mat.backFaceCulling = false;
        mat.alphaMode = BABYLON.Engine.ALPHA_ADD;
        mat.forceDepthWrite = false;

        plane.material = mat;

        motes.push({
            mesh: plane,
            material: mat,
            path,
            seed,
            lifecycleDuration,
            lifecycleOffset,
            speed: 0.8 + Math.random() * 0.6
        });
    }

}

/**
 * Update mote positions along their curved paths
 */
export function updateCosmicMotes(elapsed) {
    for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        const t = elapsed * m.speed;
        const p = m.path;

        // Position along 3D Lissajous curve
        m.mesh.position.x = p.centerX + p.ampX * Math.sin(t * p.freqX + p.phaseX);
        m.mesh.position.y = p.centerY + p.ampY * Math.sin(t * p.freqY + p.phaseY);
        m.mesh.position.z = p.centerZ + p.ampZ * Math.sin(t * p.freqZ + p.phaseZ);

        // Lifecycle — looping fade in/out
        const cycleTime = (elapsed + m.lifecycleOffset) % m.lifecycleDuration;
        const life = cycleTime / m.lifecycleDuration;

        m.material.setFloat('time', elapsed);
        m.material.setFloat('life', life);
    }
}

/**
 * Dispose all motes
 */
export function disposeCosmicMotes() {
    for (let i = 0; i < motes.length; i++) {
        motes[i].mesh.dispose();
        motes[i].material.dispose();
    }
    motes = [];
    scene = null;
}
