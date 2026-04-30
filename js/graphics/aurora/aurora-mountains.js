// aurora-mountains.js — distant mountain silhouettes.
//
// Two ridge layers at different distances give the scene depth: a far
// ridge in deep navy that almost merges into the sky, and a nearer
// ridge in cooler graphite tones with a faint aurora-tinted edge
// where the curtains' light catches the snow-line.
//
// The ridges are built procedurally from layered fbm — the fragment
// shader computes a "ridge profile" from the UV's x position, then
// fills below it. No geometry per ridge segment, no expensive draw
// calls; just two planes with shaders.

const meshes = [];
const materials = [];

const TIME_WRAP = 4 * 60 * 60;

const VERTEX = `
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

const FRAGMENT = `
    precision highp float;
    varying vec2 vUV;
    uniform float time;
    uniform float seed;       // randomizes the ridge profile across layers
    uniform float ridgeBase;  // average ridge height (UV space, 0..1)
    uniform float ridgeAmp;   // peak-to-peak amplitude
    uniform vec3 silhouette;  // primary silhouette colour
    uniform vec3 backlight;   // edge-glow tint (tuned to aurora green/teal)
    uniform float layerDepth; // 0 = far, 1 = near (drives sharpness + sky leak)

    float hash(float n) { return fract(sin(n) * 43758.5453); }
    float noise(float x) {
        float i = floor(x);
        float f = fract(x);
        float a = hash(i);
        float b = hash(i + 1.0);
        // Quintic for smoother interp.
        float u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
        return mix(a, b, u);
    }
    float fbm1(float x) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 5; i++) {
            v += a * noise(x);
            x = x * 2.07 + 13.0;
            a *= 0.5;
        }
        return v;
    }

    // Ridge profile — returns the silhouette y at this x.
    // Slow drift adds a tiny breathing motion (very subtle parallax cue).
    float ridgeProfile(float x) {
        float low  = fbm1(x * 1.4 + seed * 7.13);
        float mid  = fbm1(x * 4.5 + seed * 3.71);
        float fine = fbm1(x * 12.0 + seed * 11.27);
        // Combine octaves so peaks stay sharp without high-frequency noise
        // dominating the silhouette.
        float h = low * 0.62 + mid * 0.28 + fine * 0.10;
        // Bias toward the lower half (mountains are heavier at base).
        return ridgeBase + (h - 0.5) * ridgeAmp;
    }

    void main() {
        float ridge = ridgeProfile(vUV.x);
        float distFromRidge = vUV.y - ridge; // > 0 above ridge, < 0 below

        // Soft AA on the ridge edge — pixel-relative width.
        float edge = smoothstep(0.005, -0.005, distFromRidge);
        if (edge < 0.001) discard;

        // Body: silhouette colour, slightly darker at the base.
        float depthShade = smoothstep(0.0, 0.55, -distFromRidge); // 0 at top, 1 deep
        vec3 col = mix(silhouette * 1.05, silhouette * 0.62, depthShade);

        // Aurora backlight on the upper ridge — only a thin band right
        // below the silhouette edge, simulating snow-cap reflecting the
        // aurora's glow.
        float topBand = smoothstep(0.05, 0.0, -distFromRidge) * smoothstep(-0.005, -0.025, distFromRidge);
        col += backlight * topBand * (0.45 + 0.35 * layerDepth);

        // Atmospheric haze near the very bottom (closer ridge has less).
        float haze = smoothstep(0.32, 0.55, -distFromRidge) * (1.0 - layerDepth) * 0.6;
        col = mix(col, vec3(0.020, 0.075, 0.110), haze);

        // Slight sky-leak at the silhouette edge (far ridge softer).
        float skyLeak = smoothstep(0.012, 0.0, -distFromRidge) * (1.0 - layerDepth);
        col = mix(col, vec3(0.022, 0.060, 0.095), skyLeak * 0.5);

        // Horizontal edge feather — fade the silhouette to fully
        // transparent at the plane edges so adjacent ring slices
        // overlap-blend without showing visible seams where they meet.
        float lateralFade = smoothstep(0.0, 0.15, vUV.x) * smoothstep(1.0, 0.85, vUV.x);
        float alpha = edge * lateralFade;

        gl_FragColor = vec4(col, alpha);
    }
`;

/** Build one ridge plane. */
function buildRidge(scene, name, opts) {
    const mat = new BABYLON.ShaderMaterial(
        `${name}Mat`,
        scene,
        { vertex: 'auroraMountains', fragment: 'auroraMountains' },
        {
            attributes: ['position', 'uv'],
            uniforms: [
                'worldViewProjection',
                'time',
                'seed',
                'ridgeBase',
                'ridgeAmp',
                'silhouette',
                'backlight',
                'layerDepth',
            ],
            needAlphaBlending: true,
        }
    );
    mat.setFloat('time', 0);
    mat.setFloat('seed', opts.seed);
    mat.setFloat('ridgeBase', opts.ridgeBase);
    mat.setFloat('ridgeAmp', opts.ridgeAmp);
    mat.setColor3('silhouette', opts.silhouette);
    mat.setColor3('backlight', opts.backlight);
    mat.setFloat('layerDepth', opts.layerDepth);
    mat.backFaceCulling = false;
    mat.alphaMode = BABYLON.Engine.ALPHA_COMBINE;
    mat.disableDepthWrite = false;

    const plane = BABYLON.MeshBuilder.CreatePlane(
        name,
        { width: opts.width, height: opts.height, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
        scene
    );
    plane.position = new BABYLON.Vector3(opts.x, opts.y, opts.z);
    plane.rotation = opts.rotation || BABYLON.Vector3.Zero();
    plane.material = mat;
    plane.renderingGroupId = 1;
    plane.isPickable = false;

    meshes.push(plane);
    materials.push(mat);
}

export function createAuroraMountains(scene) {
    BABYLON.Effect.ShadersStore['auroraMountainsVertexShader'] = VERTEX;
    BABYLON.Effect.ShadersStore['auroraMountainsFragmentShader'] = FRAGMENT;

    // Build ridges around the camera in a near-cylinder. Each ridge is
    // a wide vertical plane positioned at a fixed azimuth. We ring the
    // origin so the camera always sees mountains regardless of orbit.
    const RADIUS_FAR = 200;
    const RADIUS_NEAR = 130;
    const Y_FAR = 9;
    const Y_NEAR = 6;

    // Far ridge — softer, slate-blue, almost merging into the sky.
    const farSilhouette = new BABYLON.Color3(0.040, 0.075, 0.120);
    const farBacklight  = new BABYLON.Color3(0.10, 0.55, 0.45); // teal glow

    // Near ridge — graphite cooler, more contrast against the plain.
    const nearSilhouette = new BABYLON.Color3(0.025, 0.045, 0.075);
    const nearBacklight  = new BABYLON.Color3(0.18, 0.78, 0.55); // brighter green

    // Twelve slices per ring (every 30°) — overlap is generous enough
    // that the lateral feather in the shader hides every seam, and
    // the procedural ridge profiles read as a continuous mountain
    // skyline when the camera orbits.
    const slices = 12;
    // Each slice is wider than 360°/slices worth of arc so adjacent
    // tiles physically overlap. WIDTH_FAR / WIDTH_NEAR are tuned so
    // the feathered edges visually blend into each other.
    const WIDTH_FAR = 180;
    const WIDTH_NEAR = 130;

    for (let i = 0; i < slices; i++) {
        const angle = (i / slices) * Math.PI * 2;
        const rotY = -angle - Math.PI / 2; // face toward origin
        const seed = i * 2.71828 + 0.7;

        // Far ring slice — taller plane, ridge sits high so peaks read
        // as a dramatic skyline against the aurora.
        buildRidge(scene, `auroraMountainFar${i}`, {
            width: WIDTH_FAR,
            height: 80,
            x: Math.cos(angle) * RADIUS_FAR,
            y: Y_FAR,
            z: Math.sin(angle) * RADIUS_FAR,
            rotation: new BABYLON.Vector3(0, rotY, 0),
            seed,
            ridgeBase: 0.62,
            ridgeAmp: 0.32,
            silhouette: farSilhouette,
            backlight: farBacklight,
            layerDepth: 0.05,
        });

        // Near ring slice (offset half a step so its peaks don't align with the far ring)
        buildRidge(scene, `auroraMountainNear${i}`, {
            width: WIDTH_NEAR,
            height: 65,
            x: Math.cos(angle + Math.PI / slices) * RADIUS_NEAR,
            y: Y_NEAR,
            z: Math.sin(angle + Math.PI / slices) * RADIUS_NEAR,
            rotation: new BABYLON.Vector3(0, -angle - Math.PI / 2 - Math.PI / slices, 0),
            seed: seed + 5.7,
            ridgeBase: 0.55,
            ridgeAmp: 0.36,
            silhouette: nearSilhouette,
            backlight: nearBacklight,
            layerDepth: 0.55,
        });
    }
}

export function updateAuroraMountains(elapsed) {
    const t = elapsed % TIME_WRAP;
    for (const m of materials) m.setFloat('time', t);
}

export function disposeAuroraMountains() {
    for (const m of meshes) m.dispose();
    meshes.length = 0;
    for (const mat of materials) mat.dispose();
    materials.length = 0;
}
