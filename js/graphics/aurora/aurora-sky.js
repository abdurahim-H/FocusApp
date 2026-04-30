// aurora-sky.js — sky dome for the Aurora Plain theme.
//
// Inverted sphere infinitely far from the camera. Fragment shader
// paints a cold-night sky gradient (deep navy zenith → indigo mid →
// faint teal-green toward the horizon where the aurora's glow leaks
// into the atmosphere) plus a sparse star layer and a low full-moon
// halo behind the mountains. Time-driven flicker on the brighter
// stars keeps the sky alive without being noisy.

let skyMesh = null;
let skyMaterial = null;

const TIME_WRAP = 4 * 60 * 60;

const VERTEX = `
    precision highp float;
    attribute vec3 position;
    attribute vec3 normal;
    uniform mat4 worldViewProjection;
    varying vec3 vDir;
    void main() {
        vDir = normalize(position);
        gl_Position = worldViewProjection * vec4(position, 1.0);
    }
`;

const FRAGMENT = `
    precision highp float;
    varying vec3 vDir;
    uniform float time;

    // Hash + cell-center star sampler — same style as cosmic-skybox so
    // the visual register matches across themes that share the void.
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float starHash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
    }

    float starLayer(vec2 uv, float gridScale, vec2 offset, float threshold, float sharpness, float twinkle) {
        vec2 g = uv * gridScale;
        vec2 id = floor(g);
        vec2 f = fract(g);
        float h = starHash(id + offset);
        if (h < threshold) return 0.0;
        vec2 starPos = vec2(
            fract(sin(dot(id + offset, vec2(41.1, 73.7))) * 4758.5),
            fract(sin(dot(id + offset, vec2(57.3, 113.1))) * 3758.1)
        );
        starPos = clamp(starPos, 0.15, 0.85);
        float d = length(f - starPos);
        // Per-star phase so the twinkle doesn't pulse in lockstep.
        float phase = h * 6.2831;
        float pulse = 0.6 + 0.4 * sin(time * 0.9 + phase);
        return exp(-d * d * sharpness) * mix(1.0, pulse, twinkle);
    }

    void main() {
        vec3 d = normalize(vDir);

        // Spherical UV used for the star grid sample. phi is x/z atan,
        // theta is the y elevation. Range: u 0..1, v 0..1.
        float phi = atan(d.z, d.x);
        float theta = acos(clamp(d.y, -1.0, 1.0));
        vec2 uv = vec2(phi / 6.2831 + 0.5, theta / 3.1415);

        // Vertical fraction: 1 at zenith, 0 at horizon, negative below.
        float yUp = d.y;

        // ── Base sky gradient ─────────────────────────────────────
        // Cold deep-navy throughout. Horizon stays dark so the aurora
        // curtain is the only bright thing in the upper half — bloom
        // bleeds bright pixels, so a bright horizon would wash the
        // composition.
        vec3 zenith     = vec3(0.003, 0.008, 0.025);
        vec3 mid        = vec3(0.005, 0.014, 0.040);
        vec3 horizonHi  = vec3(0.008, 0.022, 0.052);
        vec3 horizonLo  = vec3(0.012, 0.028, 0.055); // sits flush with mountain/terrain fog

        // Map elevation 0..1 (horizon..zenith) to the gradient.
        float h = clamp((yUp + 0.05) / 1.05, 0.0, 1.0);
        vec3 sky = mix(horizonLo, horizonHi, smoothstep(0.0, 0.18, h));
        sky = mix(sky, mid,    smoothstep(0.18, 0.55, h));
        sky = mix(sky, zenith, smoothstep(0.55, 1.0, h));

        // ── Below-horizon: occluded by terrain. Black-ish to be safe. ──
        if (yUp < 0.0) {
            sky = mix(vec3(0.012, 0.028, 0.055), vec3(0.0, 0.0, 0.0), clamp(-yUp * 2.0, 0.0, 1.0));
        }

        // ── Star layers (only above horizon) ──────────────────
        if (yUp > 0.0) {
            // Star count fades to nothing at the very horizon so haze hides them.
            float starGate = smoothstep(0.02, 0.18, h);

            // Four densities for rich, varied star field. Thresholds
            // tuned so denser layers have more stars overall.
            sky += vec3(0.28, 0.32, 0.40)
                 * starLayer(uv, 2200.0, vec2(73.1, 419.3),  0.994, 900.0, 0.0)
                 * 0.32 * starGate;
            sky += vec3(0.42, 0.48, 0.62)
                 * starLayer(uv, 1500.0, vec2(127.7, 31.5),  0.996, 700.0, 0.25)
                 * 0.44 * starGate;
            sky += vec3(0.65, 0.72, 0.88)
                 * starLayer(uv, 950.0,  vec2(0.0, 0.0),     0.9975, 480.0, 0.45)
                 * 0.62 * starGate;
            // The bright few — slightly warm cast on a fraction of them.
            float s4 = starLayer(uv, 520.0, vec2(269.5, 183.3), 0.9985, 230.0, 0.6);
            vec3 s4col = mix(vec3(0.85, 0.92, 1.0), vec3(1.0, 0.92, 0.78), starHash(floor(uv * 520.0) + vec2(50.0)));
            sky += s4col * s4 * 1.0 * starGate;
        }

        // No moon — the previous build's huge yellow halo at the horizon
        // read as a fake spotlight and competed with the curtain for
        // visual weight. The aurora is the showpiece; the sky stays
        // dark between curtains so they punch.

        // Horizon glow — tight teal whisper at the horizon line.
        // Kept subtle — bloom amplifies small bright additions, and
        // the brighter aurora curtain above is the showpiece.
        float horizonBand = smoothstep(0.10, 0.0, abs(yUp - 0.005));
        sky += vec3(0.025, 0.075, 0.085) * horizonBand * 0.55;

        // ── Wide aurora glow ────────────────────────────────
        // Just enough atmospheric tint behind the mountain silhouette
        // that mountains read as silhouettes against tinted sky, not
        // as black-on-black. Per-channel contribution capped so the
        // sky pixel never gets close to the bloom threshold even
        // before any aurora ribbon adds on top.
        if (yUp > 0.0) {
            float lowBand = exp(-pow((yUp - 0.20) * 2.4, 2.0));
            float highBand = exp(-pow((yUp - 0.55) * 1.6, 2.0));
            float glowNoise = 0.5 + 0.5 * sin(uv.x * 12.0 + time * 0.04)
                                  * cos(uv.x * 5.0 - time * 0.03);
            sky += vec3(0.022, 0.080, 0.062) * lowBand * (0.55 + glowNoise * 0.45);
            sky += vec3(0.045, 0.018, 0.060) * highBand * (0.45 + glowNoise * 0.40);
        }

        gl_FragColor = vec4(sky, 1.0);
    }
`;

export function createAuroraSky(scene) {
    BABYLON.Effect.ShadersStore['auroraSkyVertexShader'] = VERTEX;
    BABYLON.Effect.ShadersStore['auroraSkyFragmentShader'] = FRAGMENT;

    skyMesh = BABYLON.MeshBuilder.CreateSphere(
        'auroraSky',
        { diameter: 1800, segments: 32, sideOrientation: BABYLON.Mesh.BACKSIDE },
        scene
    );
    skyMesh.renderingGroupId = 0;
    skyMesh.infiniteDistance = true;
    skyMesh.isPickable = false;

    skyMaterial = new BABYLON.ShaderMaterial(
        'auroraSkyMat',
        scene,
        { vertex: 'auroraSky', fragment: 'auroraSky' },
        {
            attributes: ['position', 'normal'],
            uniforms: ['worldViewProjection', 'time'],
        }
    );
    skyMaterial.setFloat('time', 0);
    skyMaterial.backFaceCulling = false;
    skyMaterial.disableDepthWrite = true;
    skyMesh.material = skyMaterial;
    return skyMesh;
}

export function updateAuroraSky(elapsed) {
    if (skyMaterial) skyMaterial.setFloat('time', elapsed % TIME_WRAP);
}

export function disposeAuroraSky() {
    if (skyMesh) {
        skyMesh.dispose();
        skyMesh = null;
    }
    if (skyMaterial) {
        skyMaterial.dispose();
        skyMaterial = null;
    }
}
