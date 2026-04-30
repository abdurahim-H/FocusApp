// aurora-mountains.js — real 3D mountain ridges.
//
// Replaces the flat billboard planes that fronted the previous Aurora
// build. Each ring is a single mesh built from custom vertex data:
// hundreds of segments around the camera, each segment's top vertex
// pushed up by a procedural ridge height. The result is genuine 3D
// geometry — silhouettes carved INTO the mesh — so the camera sees
// real ridges with depth, not painted-on shapes.
//
// Two concentric rings give layered depth:
//   • far ring at radius 580, taller dramatic peaks, heavy haze
//   • near ring at radius 240, shorter ridge, brighter aurora reflection
//
// Ridge heights wrap perfectly around the ring because the height
// function samples 2D value noise on a circle in noise-space — the
// circle is closed by definition.

let meshes = [];
let materials = [];

const TIME_WRAP = 4 * 60 * 60;

const VERTEX = `
    precision highp float;
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    uniform mat4 world;
    varying vec3 vWorld;
    varying vec3 vNormal;
    varying vec2 vUV;
    void main() {
        vec4 wp = world * vec4(position, 1.0);
        vWorld = wp.xyz;
        // Mountains are placed at world origin so world matrix is
        // identity-or-close; but normalise mat3 just in case.
        vNormal = normalize(mat3(world) * normal);
        vUV = uv;
        gl_Position = worldViewProjection * vec4(position, 1.0);
    }
`;

const FRAGMENT = `
    precision highp float;
    varying vec3 vWorld;
    varying vec3 vNormal;
    varying vec2 vUV;
    uniform vec3 silhouette;
    uniform vec3 snowCap;
    uniform vec3 backlight;
    uniform vec3 auroraColor;
    uniform float layerDepth;   // 0 far, 1 near — drives haze + aurora gain
    uniform float time;

    float hash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
    }
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
        return mix(
            mix(hash(i),                  hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
        );
    }
    float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
        return v;
    }

    void main() {
        vec3 N = normalize(vNormal);
        float upDot = clamp(N.y, 0.0, 1.0);

        // Ridge-relative vertical position. uv.y = 0 at base, 1 at the
        // peak of the ridge profile. Used to drive snow + ridge rim.
        float h = vUV.y;

        // ── Body ─────────────────────────────────────────
        // Slightly varied base — fbm noise on world position breaks up
        // the silhouette colour so the rock face doesn't read as flat.
        float rockNoise = fbm(vWorld.xz * 0.04 + vec2(vWorld.y * 0.1));
        vec3 body = silhouette * (0.78 + rockNoise * 0.4);

        // ── Snow caps ────────────────────────────────────
        // Snow accumulates above a noise-modulated snow line. The line
        // wobbles by uv.x so peaks aren't all uniformly capped.
        float snowLine = 0.55 + fbm(vec2(vUV.x * 6.0, 0.0)) * 0.18 - layerDepth * 0.05;
        float snowMask = smoothstep(snowLine, snowLine + 0.18, h);
        // Where the slope is too steep, snow doesn't stick (avalanches).
        snowMask *= smoothstep(0.15, 0.45, upDot);
        vec3 col = mix(body, snowCap, snowMask);

        // ── Aurora reflection on snow ───────────────────
        // Subtle aurora tint on the snow caps — strong enough to feel
        // like the curtain is lighting the peaks, weak enough that the
        // mountain still reads as a silhouette. Tighter mask via upDot
        // pow so only flat-up snow facets glow, not the whole cap.
        float reflectGain = 0.22 + layerDepth * 0.32;
        col += auroraColor * snowMask * pow(upDot, 2.0) * reflectGain;

        // ── Ridge rim ───────────────────────────────────
        // Bright band right at the silhouette top — aurora glow
        // catching the very tip of the ridge from above. Stronger
        // than the previous build so the silhouette has a clear
        // bright outline that reads against the curtain behind.
        float ridgeRim = smoothstep(0.78, 1.00, h);
        float rimPulse = 0.7 + 0.3 * sin(time * 0.15 + vUV.x * 9.0);
        col += backlight * ridgeRim * rimPulse * 0.95;

        // ── Atmospheric haze ────────────────────────────
        // Distance fog tints far mountains toward the deep-navy
        // horizon. Colour matched to terrain fog so the ground/
        // mountain seam is invisible. Density tuned so the near ridge
        // stays a clear silhouette against the brighter aurora behind.
        float dist = length(vWorld.xz);
        float haze = 1.0 - exp(-dist * 0.0014);
        haze *= (1.0 - layerDepth * 0.62);
        haze = clamp(haze, 0.0, 0.85);
        vec3 hazeColor = vec3(0.008, 0.018, 0.035);
        col = mix(col, hazeColor, haze);

        // ── Subtle rim-light alpha so the silhouette top blends ──
        // Hard-cut alpha at the top (already geometry-bounded), but
        // soften the very-top pixels so they don't pixel-stair against
        // the sky. uv.y = 1.0 at exact top.
        float topFade = smoothstep(0.985, 1.0, h);
        col = mix(col, hazeColor, topFade * 0.4);

        gl_FragColor = vec4(col, 1.0);
    }
`;

// Periodic 2D value noise built in JS for geometry generation.
function jsHash(x, z) {
    const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return h - Math.floor(h);
}
function jsNoise(x, z) {
    const xi = Math.floor(x);
    const zi = Math.floor(z);
    const xf = x - xi;
    const zf = z - zi;
    const u = xf * xf * (3 - 2 * xf);
    const v = zf * zf * (3 - 2 * zf);
    const a = jsHash(xi, zi);
    const b = jsHash(xi + 1, zi);
    const c = jsHash(xi, zi + 1);
    const d = jsHash(xi + 1, zi + 1);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
function jsFbm(x, z, octaves) {
    let v = 0;
    let a = 0.5;
    let px = x;
    let pz = z;
    for (let i = 0; i < octaves; i++) {
        v += a * jsNoise(px, pz);
        px = px * 2.07 + 11.3;
        pz = pz * 2.07 - 7.7;
        a *= 0.5;
    }
    return v;
}

/** Periodic ridge height for angle parameter t in [0,1).
 *  Samples 2D noise along a circle of radius `freq` so the result is
 *  exactly periodic — last segment lines up with the first. */
function ridgeHeight(t, seed, freq, peak) {
    const ang = t * Math.PI * 2;
    const cx = seed + Math.cos(ang) * freq;
    const cz = seed * 0.7 + Math.sin(ang) * freq;
    // Three octaves stacked manually so we can tune their relative weight.
    const low = jsFbm(cx, cz, 4);
    const mid = jsFbm(cx * 3.1 + 7.0, cz * 3.1 - 4.0, 3);
    const fine = jsFbm(cx * 8.5 - 13.0, cz * 8.5 + 5.0, 2);
    let h = low * 0.62 + mid * 0.28 + fine * 0.1;
    // Power curve for sharper peaks — pushes the upper register.
    h = h ** 0.85;
    return h * peak;
}

function buildRingMesh(scene, name, opts) {
    const { radius, segments, seed, freq, peak, baseDepth } = opts;
    const positions = [];
    const indices = [];
    const uvs = [];

    // Build segments+1 columns of (bottom, top) vertices.
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = t * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const h = ridgeHeight(t % 1, seed, freq, peak);

        // Bottom vertex (well below ground level so terrain hides the seam).
        positions.push(x, -baseDepth, z);
        uvs.push(t, 0);
        // Top vertex (the ridge silhouette).
        positions.push(x, h, z);
        uvs.push(t, 1);
    }

    // Stitch triangles. Wind so normals point INWARD toward origin.
    for (let i = 0; i < segments; i++) {
        const a = i * 2;
        const b = i * 2 + 1;
        const c = (i + 1) * 2;
        const d = (i + 1) * 2 + 1;
        // Inward-facing: a → d → b (CCW from inside)
        indices.push(a, d, b);
        indices.push(a, c, d);
    }

    const mesh = new BABYLON.Mesh(name, scene);
    const vd = new BABYLON.VertexData();
    vd.positions = positions;
    vd.indices = indices;
    vd.uvs = uvs;
    const normals = [];
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    vd.normals = normals;
    vd.applyToMesh(mesh);
    return mesh;
}

function buildRidgeMaterial(scene, opts) {
    const mat = new BABYLON.ShaderMaterial(
        opts.name,
        scene,
        { vertex: 'auroraMountains', fragment: 'auroraMountains' },
        {
            attributes: ['position', 'normal', 'uv'],
            uniforms: [
                'worldViewProjection',
                'world',
                'time',
                'silhouette',
                'snowCap',
                'backlight',
                'auroraColor',
                'layerDepth',
            ],
        }
    );
    mat.setFloat('time', 0);
    mat.setColor3('silhouette', opts.silhouette);
    mat.setColor3('snowCap', opts.snowCap);
    mat.setColor3('backlight', opts.backlight);
    mat.setColor3('auroraColor', new BABYLON.Color3(0.18, 0.78, 0.55));
    mat.setFloat('layerDepth', opts.layerDepth);
    mat.backFaceCulling = true;
    return mat;
}

export function createAuroraMountains(scene) {
    BABYLON.Effect.ShadersStore['auroraMountainsVertexShader'] = VERTEX;
    BABYLON.Effect.ShadersStore['auroraMountainsFragmentShader'] = FRAGMENT;

    // ── Far ring — dramatic skyline ────────────────────
    // Taller peaks rise clearly into the aurora's bright zone.
    // Silhouette is dark but not black so the ridge reads against
    // bloom-spread aurora; snow caps are pale-blue (cool nighttime
    // snow under aurora light, matching the reference).
    const farMat = buildRidgeMaterial(scene, {
        name: 'auroraMountainsFarMat',
        silhouette: new BABYLON.Color3(0.020, 0.032, 0.058),
        snowCap: new BABYLON.Color3(0.140, 0.180, 0.245),
        backlight: new BABYLON.Color3(0.10, 0.55, 0.40),
        layerDepth: 0.0,
    });
    const farMesh = buildRingMesh(scene, 'auroraMountainsFar', {
        radius: 540,
        segments: 384,
        seed: 13.7,
        freq: 4.0,
        peak: 185,
        baseDepth: 18,
    });
    farMesh.material = farMat;
    farMesh.renderingGroupId = 0;
    farMesh.isPickable = false;
    meshes.push(farMesh);
    materials.push(farMat);

    // ── Mid ring — between near + far ───────────────────
    const midMat = buildRidgeMaterial(scene, {
        name: 'auroraMountainsMidMat',
        silhouette: new BABYLON.Color3(0.028, 0.042, 0.072),
        snowCap: new BABYLON.Color3(0.165, 0.205, 0.270),
        backlight: new BABYLON.Color3(0.13, 0.62, 0.46),
        layerDepth: 0.45,
    });
    const midMesh = buildRingMesh(scene, 'auroraMountainsMid', {
        radius: 340,
        segments: 320,
        seed: 41.7,
        freq: 5.0,
        peak: 110,
        baseDepth: 18,
    });
    midMesh.material = midMat;
    midMesh.renderingGroupId = 0;
    midMesh.isPickable = false;
    meshes.push(midMesh);
    materials.push(midMat);

    // ── Near ring — short foothills ─────────────────────
    const nearMat = buildRidgeMaterial(scene, {
        name: 'auroraMountainsNearMat',
        silhouette: new BABYLON.Color3(0.036, 0.056, 0.090),
        snowCap: new BABYLON.Color3(0.190, 0.230, 0.290),
        backlight: new BABYLON.Color3(0.18, 0.72, 0.52),
        layerDepth: 1.0,
    });
    const nearMesh = buildRingMesh(scene, 'auroraMountainsNear', {
        radius: 180,
        segments: 256,
        seed: 27.31,
        freq: 6.5,
        peak: 50,
        baseDepth: 18,
    });
    nearMesh.material = nearMat;
    nearMesh.renderingGroupId = 0;
    nearMesh.isPickable = false;
    meshes.push(nearMesh);
    materials.push(nearMat);
}

export function updateAuroraMountains(elapsed) {
    const t = elapsed % TIME_WRAP;

    // Aurora colour cycle matched to the curtains/terrain — green →
    // teal → cyan → violet → magenta. Same period (~77 s).
    const cycle = (elapsed * 0.013) % 1;
    let r;
    let g;
    let b;
    if (cycle < 0.25) {
        const k = cycle / 0.25;
        r = 0.1 + (0.1 - 0.1) * k;
        g = 0.85 + (0.95 - 0.85) * k;
        b = 0.45 + (0.7 - 0.45) * k;
    } else if (cycle < 0.5) {
        const k = (cycle - 0.25) / 0.25;
        r = 0.1 + (0.3 - 0.1) * k;
        g = 0.95 + (0.8 - 0.95) * k;
        b = 0.7 + (1.0 - 0.7) * k;
    } else if (cycle < 0.75) {
        const k = (cycle - 0.5) / 0.25;
        r = 0.3 + (0.55 - 0.3) * k;
        g = 0.8 + (0.4 - 0.8) * k;
        b = 1.0 + (1.0 - 1.0) * k;
    } else {
        const k = (cycle - 0.75) / 0.25;
        r = 0.55 + (1.0 - 0.55) * k;
        g = 0.4 + (0.45 - 0.4) * k;
        b = 1.0 + (0.85 - 1.0) * k;
    }

    for (const m of materials) {
        m.setFloat('time', t);
        m.getEffect()?.setFloat3('auroraColor', r, g, b);
    }
}

export function disposeAuroraMountains() {
    for (const m of meshes) m.dispose();
    meshes = [];
    for (const mat of materials) mat.dispose();
    materials = [];
}
