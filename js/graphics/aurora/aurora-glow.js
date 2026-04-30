// aurora-glow.js — atmospheric haze along the horizon line.
//
// A thin horizontal billboarded plane sitting where mountains meet
// sky. Adds a soft volumetric glow that ties the layers together:
// without it, the sky's lower edge meets the mountains' upper edge
// with a perceptible seam. The shader paints a low-saturation
// teal-green band that pulses gently in the same colour family as
// the curtains — visually completing the impression of aurora light
// suffusing the entire upper atmosphere.

const meshes = [];
let material = null;

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

    float hash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
    }
    float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(hash(i),               hash(i + vec2(1,0)), f.x),
            mix(hash(i + vec2(0,1)),   hash(i + vec2(1,1)), f.x),
            f.y
        );
    }

    void main() {
        // Plane is wide and short — paint a vertical falloff (band
        // thickest in the middle of the plane height) and a slow
        // horizontal flow.
        float v = vUV.y;
        float u = vUV.x;

        // Thickest at v=0.5, fades to nothing top + bottom.
        float band = exp(-pow((v - 0.5) * 3.2, 2.0));

        // Horizontal modulation — the glow is brighter where the
        // curtains' base would be (the centre of the plane azimuth-wise)
        // and softer at the far ends.
        float lateral = exp(-pow((u - 0.5) * 1.6, 2.0)) * 0.85 + 0.15;

        // Slow noise flow so the glow breathes. Two scales for layered movement.
        float flowA = noise(vec2(u * 3.5 + time * 0.012, v * 2.0));
        float flowB = noise(vec2(u * 8.0 - time * 0.02,  v * 4.0 + 17.0));
        float flow = flowA * 0.55 + flowB * 0.45;

        float intensity = band * lateral * (0.6 + flow * 0.6);

        // Aurora-tinted teal/green wash with a faint magenta high
        // streak following slow horizontal phase.
        vec3 base = vec3(0.04, 0.32, 0.26);
        vec3 hot  = vec3(0.18, 0.65, 0.45);
        vec3 col = mix(base, hot, flow);
        // Occasional violet tint where flowB peaks.
        col += vec3(0.12, 0.04, 0.20) * smoothstep(0.65, 0.95, flowB) * 0.5;

        col *= intensity;
        float alpha = clamp(intensity * 1.6, 0.0, 0.85);
        gl_FragColor = vec4(col, alpha);
    }
`;

export function createAuroraGlow(scene) {
    BABYLON.Effect.ShadersStore['auroraGlowVertexShader'] = VERTEX;
    BABYLON.Effect.ShadersStore['auroraGlowFragmentShader'] = FRAGMENT;

    material = new BABYLON.ShaderMaterial(
        'auroraGlowMat',
        scene,
        { vertex: 'auroraGlow', fragment: 'auroraGlow' },
        {
            attributes: ['position', 'uv'],
            uniforms: ['worldViewProjection', 'time'],
            needAlphaBlending: true,
        }
    );
    material.setFloat('time', 0);
    material.alphaMode = BABYLON.Engine.ALPHA_ADD;
    material.backFaceCulling = false;
    material.disableDepthWrite = true;

    // Six planes ringed around the camera so the horizon haze is
    // continuous from every orbital angle.
    const W = 280;
    const H = 60;
    const Y = 14; // sit just above the mountain ridge, blending with
                  // the curtain bases (curtains center at y=12).
    const RADIUS = 215;
    const slots = 6;
    for (let i = 0; i < slots; i++) {
        const angle = (i / slots) * Math.PI * 2;
        const plane = BABYLON.MeshBuilder.CreatePlane(
            `auroraGlow${i}`,
            { width: W, height: H, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
            scene
        );
        plane.position = new BABYLON.Vector3(
            Math.cos(angle) * RADIUS,
            Y,
            Math.sin(angle) * RADIUS,
        );
        plane.rotation = new BABYLON.Vector3(0, -angle - Math.PI / 2, 0);
        plane.material = material;
        plane.renderingGroupId = 1;
        plane.isPickable = false;
        meshes.push(plane);
    }
}

export function updateAuroraGlow(elapsed) {
    if (material) material.setFloat('time', elapsed % TIME_WRAP);
}

export function disposeAuroraGlow() {
    for (const m of meshes) m.dispose();
    meshes.length = 0;
    if (material) { material.dispose(); material = null; }
}
