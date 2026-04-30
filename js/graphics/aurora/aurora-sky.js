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
        // Cold deep-navy zenith → indigo mid → soft teal where the aurora
        // bleeds into the air just above the horizon.
        vec3 zenith     = vec3(0.005, 0.012, 0.038);
        vec3 mid        = vec3(0.012, 0.030, 0.075);
        vec3 horizonHi  = vec3(0.018, 0.075, 0.115);
        vec3 horizonLo  = vec3(0.020, 0.090, 0.085); // teal kiss from the aurora

        // Map elevation 0..1 (horizon..zenith) to the gradient.
        float h = clamp((yUp + 0.05) / 1.05, 0.0, 1.0);
        vec3 sky = mix(horizonLo, horizonHi, smoothstep(0.0, 0.18, h));
        sky = mix(sky, mid,    smoothstep(0.18, 0.55, h));
        sky = mix(sky, zenith, smoothstep(0.55, 1.0, h));

        // ── Below-horizon: deep cold navy fading toward black ──
        if (yUp < 0.0) {
            sky = mix(vec3(0.012, 0.018, 0.035), vec3(0.0, 0.0, 0.0), clamp(-yUp * 1.5, 0.0, 1.0));
        }

        // ── Star layers (only above horizon) ──────────────────
        if (yUp > 0.0) {
            // Star count fades to nothing at the very horizon so haze hides them.
            float starGate = smoothstep(0.02, 0.18, h);

            // Three densities for parallax / brightness variety.
            sky += vec3(0.30, 0.35, 0.45)
                 * starLayer(uv, 1800.0, vec2(73.1, 419.3),  0.997, 800.0, 0.0)
                 * 0.30 * starGate;
            sky += vec3(0.55, 0.62, 0.78)
                 * starLayer(uv, 1100.0, vec2(0.0, 0.0),     0.9975, 500.0, 0.4)
                 * 0.50 * starGate;
            // The bright few — slightly warm cast on a fraction of them.
            float s3 = starLayer(uv, 600.0, vec2(269.5, 183.3), 0.9985, 250.0, 0.55);
            vec3 s3col = mix(vec3(0.85, 0.92, 1.0), vec3(1.0, 0.92, 0.78), starHash(floor(uv * 600.0) + vec2(50.0)));
            sky += s3col * s3 * 0.85 * starGate;
        }

        // ── Low moon glow behind the mountain ridge ──────────
        // A soft halo just above the horizon, slightly off-centre, to
        // anchor the composition. The aurora is the showpiece, not the
        // moon, so we keep the disc very small and rely on its halo.
        float moonAng = 0.62; // azimuth offset (radians)
        vec3 moonDir = normalize(vec3(cos(moonAng), 0.04, sin(moonAng)));
        float moonDot = max(0.0, dot(d, moonDir));
        float moonHalo = pow(moonDot, 220.0) * 0.65
                       + pow(moonDot, 32.0)  * 0.06
                       + pow(moonDot, 8.0)   * 0.012;
        sky += vec3(0.95, 0.92, 0.85) * moonHalo;

        // Faint horizon glow band — broadens where the aurora is high.
        float horizonBand = smoothstep(0.1, 0.0, abs(yUp - 0.02));
        sky += vec3(0.04, 0.16, 0.22) * horizonBand * 0.45;

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
    if (skyMesh) { skyMesh.dispose(); skyMesh = null; }
    if (skyMaterial) { skyMaterial.dispose(); skyMaterial = null; }
}
