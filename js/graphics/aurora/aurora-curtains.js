// aurora-curtains.js — the dancing ribbons.
//
// Aurora Borealis are vast curtains of light: vertical "rays" gathered
// into shimmering folds that drift horizontally across the night sky.
// Real auroras have layered colors — green at their base where atomic
// oxygen emits at 557 nm, fading up through teal and into magenta /
// violet where ionized nitrogen and high-altitude oxygen take over.
// The curtains aren't smooth — they have flowing micro-rays inside
// them, like rain falling upward.
//
// Approach: two crossed billboard planes (so the aurora has 3D
// presence as the camera orbits) host a fragment shader that paints
// six independent curtain "tongues". Each tongue:
//   • Has its own X-position with a multi-octave horizontal wave
//     (the slow, swimming undulation real auroras do).
//   • Has its own internal vertical noise flow (the scrolling rays).
//   • Has its own color hue offset, drifting slowly over time.
//
// The tongues additively blend through ALPHA_ADD so overlap brightens
// without visual seams. Audio energy from the cosmos brightens the
// curtains slightly — a quiet feedback loop between the user's mix
// and the scene.

import { getMasterEnergy } from '../../features/sounds.js';

const meshes = [];
let material = null;
let smoothedEnergy = 0;

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
    uniform float energy; // 0..1 master-bus amplitude

    // ── Noise ───────────────────────────────────────────────
    float hash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
    }
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        // Quintic smoothstep — smoother derivatives than cubic.
        f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
        return mix(
            mix(hash(i),              hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
        );
    }
    float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        mat2 rot = mat2(0.87, 0.48, -0.48, 0.87);
        for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p = rot * p * 2.0 + vec2(100.0);
            a *= 0.5;
        }
        return v;
    }

    // ── Aurora palette ──────────────────────────────────────
    // Real-aurora colors keyed to vertical position. yFrac ∈ [0,1]
    // where 0 is the base (close to ground / horizon) and 1 is the
    // upper edge that fades into space. hueShift slowly walks the
    // palette so the curtains never sit in a static color.
    vec3 auroraPalette(float yFrac, float hueShift) {
        // Saturated fluorescent greens and teals at the base, blue-violet
        // mid, magenta tip — same gradient solar-particle ionization
        // produces in the upper atmosphere.
        vec3 baseLime  = vec3(0.50, 1.00, 0.45);   // O₂ 557nm — vivid green
        vec3 baseTeal  = vec3(0.10, 0.95, 0.70);   // O₂ + N₂ blend
        vec3 cyan      = vec3(0.30, 0.80, 1.00);   // high-O blue
        vec3 violet    = vec3(0.55, 0.40, 1.00);   // N₂ ion 427nm
        vec3 magenta   = vec3(1.00, 0.45, 0.85);   // upper N₂ red-violet

        // Hue cycle: shift the palette key so over time the dominant
        // color rotates green → teal → cyan → violet → magenta → back.
        float h = mod(yFrac + hueShift, 1.0);
        vec3 c;
        if (h < 0.25)      c = mix(baseLime, baseTeal, h / 0.25);
        else if (h < 0.50) c = mix(baseTeal, cyan,    (h - 0.25) / 0.25);
        else if (h < 0.75) c = mix(cyan,     violet,  (h - 0.50) / 0.25);
        else               c = mix(violet,   magenta, (h - 0.75) / 0.25);
        return c;
    }

    // ── A single curtain tongue ─────────────────────────────
    // params:
    //   xCenter    — base x position (UV space, 0..1)
    //   width      — base curtain thickness
    //   amp        — horizontal wave amplitude
    //   freq       — wave frequency (how many wiggles vertically)
    //   speed      — sway / flow speed
    //   seed       — phase offset
    //   hueShift   — color offset so adjacent tongues read distinct
    // returns RGB contribution (already alpha-weighted).
    vec3 tongue(vec2 uv, float xCenter, float width, float amp, float freq, float speed, float seed, float hueShift) {
        float t = time * speed + seed;

        // Curtain X-position — three harmonics for organic motion.
        float wave = amp * sin(uv.y * freq + t)
                   + amp * 0.55 * sin(uv.y * (freq * 1.9) + t * 1.4 + seed * 1.7)
                   + amp * 0.28 * sin(uv.y * (freq * 3.3) + t * 0.6 + seed * 3.2);
        float xCurtain = xCenter + wave;

        // Vertical extent — bright body in the middle of the plane,
        // tapers softly at top into space, slightly more abrupt at
        // base where the curtain meets the horizon glow / mountain
        // ridge. The plane sits high enough that v=0 is below the
        // horizon line (occluded by mountains) so no hard cut-off.
        float topFade = smoothstep(1.0, 0.55, uv.y);
        float baseFade = smoothstep(0.0, 0.25, uv.y);
        float yMask = topFade * baseFade;

        // Distance from the curtain centerline.
        float dx = uv.x - xCurtain;
        float absDx = abs(dx);

        // Vertical RAYS — the defining feature of an active aurora.
        // Tall narrow streaks of light raining upward from the base.
        // Two flow layers at different scales and speeds stack into
        // discrete fast-moving rays plus a slower drift, so the curtain
        // never reads as a uniform glow band.
        float rayFlow = fbm(vec2(uv.x * 12.0 + seed * 5.0, uv.y * 28.0 - time * speed * 2.5 + seed));
        rayFlow = pow(rayFlow, 1.6);
        float drift = fbm(vec2(uv.x * 5.0 - seed * 3.0, uv.y * 9.0 - time * speed * 1.1 + seed * 2.0));
        drift = pow(drift, 1.4);
        float flow = rayFlow * 0.7 + drift * 0.3;

        // Curtain has variable width — slightly thicker where flow is bright.
        float w = width * (0.6 + flow * 0.85);

        // Body falloff — sharper core for visual snap, softer halo for
        // additive overlap with neighbouring tongues.
        float core     = smoothstep(w * 0.85, 0.0, absDx) * 0.65;
        float shoulder = smoothstep(w * 2.4,  w * 0.6, absDx) * 0.50;
        float halo     = smoothstep(w * 5.5,  w * 1.4, absDx) * 0.22;
        float band = (core + shoulder + halo) * yMask;

        // Discrete vertical streaks — sharp pow falloff so rays read
        // as bright filaments inside the band, not just brightness
        // variation.
        float streaks = pow(rayFlow, 3.5) * smoothstep(w * 1.3, 0.0, absDx) * yMask * 1.6;

        // Brightness = band + rays + audio kick.
        float bright = band * (0.55 + drift * 0.55) + streaks;
        bright *= 1.0 + energy * 0.18;

        // Color. The base of each tongue runs greener (real auroras
        // anchor in the 557 nm green band at the lowest altitudes);
        // upper part rotates through the palette. Hue cycles slowly
        // with time too.
        float yFrac = clamp(uv.y * 1.1, 0.0, 1.0);
        float cycle = time * 0.013 + hueShift;
        vec3 col = auroraPalette(yFrac * 0.80 + 0.05, cycle);

        return col * bright;
    }

    // ── Lower haze layer ────────────────────────────────────
    // Below the curtains, where the aurora bleeds into the upper
    // atmosphere as a wide low-saturation green wash. Pronounced
    // enough to anchor the curtains visually to the horizon — without
    // it the aurora can read as floating in mid-air.
    vec3 lowerHaze(vec2 uv) {
        // Wide horizontal band right at the base, modulated by fbm so
        // it doesn't read as a flat strip.
        float band = smoothstep(0.42, 0.08, uv.y) * smoothstep(-0.1, 0.08, uv.y);
        float n = fbm(vec2(uv.x * 3.5 - time * 0.04, uv.y * 5.0 + time * 0.02));
        n = pow(n, 1.6);
        float bright = band * (0.55 + n * 0.85);
        // Cool, low-sat wash with a magenta whisper at the brightest patches.
        vec3 col = mix(vec3(0.08, 0.55, 0.38), vec3(0.16, 0.95, 0.65), n);
        col += vec3(0.18, 0.04, 0.20) * smoothstep(0.7, 0.95, n) * 0.4;
        return col * bright * 0.62;
    }

    // ── High wisps ──────────────────────────────────────────
    // Soft fbm-noise wash up high, separate from the discrete tongues —
    // makes the upper sky feel suffused with aurora, not just
    // segmented by columns.
    vec3 upperWisps(vec2 uv) {
        float band = smoothstep(0.32, 0.85, uv.y) * smoothstep(1.0, 0.78, uv.y);
        float n = fbm(vec2(uv.x * 2.2 + time * 0.020, uv.y * 3.0 - time * 0.018));
        n = pow(n, 2.0);
        float bright = band * n * 0.55;
        // Cycle the wisp colour high through the palette.
        float cycle = time * 0.011 + 0.4;
        vec3 col = auroraPalette(0.55, cycle);
        return col * bright;
    }

    void main() {
        vec2 uv = vUV;

        // Soft horizontal edge fade so the plane edges aren't a hard
        // cutoff against the sky behind. The plane is wide; we only
        // want the inner ~80% to carry visible color.
        float edge = smoothstep(0.0, 0.12, uv.x) * smoothstep(1.0, 0.88, uv.x);
        if (edge < 0.001) discard;

        vec3 col = vec3(0.0);

        // Eight tongues spread across the plane — denser than the
        // first iteration so adjacent curtains additively reinforce
        // each other and the curtain reads as a continuous wall of
        // light with bright filaments rather than discrete strands.
        col += tongue(uv, 0.10, 0.022, 0.038, 5.2,  0.085,  3.7, 0.00);
        col += tongue(uv, 0.22, 0.030, 0.048, 4.3,  0.072, 11.3, 0.08);
        col += tongue(uv, 0.34, 0.038, 0.058, 3.4,  0.064, 27.7, 0.16);
        col += tongue(uv, 0.46, 0.044, 0.062, 2.8,  0.058, 42.1, 0.24);
        col += tongue(uv, 0.58, 0.040, 0.058, 3.2,  0.062, 51.5, 0.34);
        col += tongue(uv, 0.70, 0.034, 0.050, 4.0,  0.072, 65.3, 0.44);
        col += tongue(uv, 0.82, 0.026, 0.040, 5.4,  0.084, 79.9, 0.54);
        col += tongue(uv, 0.92, 0.018, 0.032, 6.8,  0.098, 91.1, 0.66);

        // Lower haze unifies the base of all curtains.
        col += lowerHaze(uv);

        // Upper wisps — soft suffusion above the discrete tongues.
        col += upperWisps(uv);

        // Slight global brightness pulse — extremely subtle, gives the
        // impression of solar wind variation. Wrap-safe (sin only).
        float globalPulse = 0.94 + 0.06 * sin(time * 0.07);
        col *= globalPulse;

        col *= edge;

        // Alpha gates the additive blend so the very-dim background
        // doesn't bleed onto the sky.
        float alpha = clamp(length(col) * 1.5, 0.0, 1.0);
        alpha *= edge;

        gl_FragColor = vec4(col, alpha);
    }
`;

export function createAuroraCurtains(scene) {
    BABYLON.Effect.ShadersStore['auroraCurtainsVertexShader'] = VERTEX;
    BABYLON.Effect.ShadersStore['auroraCurtainsFragmentShader'] = FRAGMENT;

    material = new BABYLON.ShaderMaterial(
        'auroraCurtainsMat',
        scene,
        { vertex: 'auroraCurtains', fragment: 'auroraCurtains' },
        {
            attributes: ['position', 'uv'],
            uniforms: ['worldViewProjection', 'time', 'energy'],
            needAlphaBlending: true,
        }
    );
    material.setFloat('time', 0);
    material.setFloat('energy', 0);
    material.backFaceCulling = false;
    material.alphaMode = BABYLON.Engine.ALPHA_ADD;
    material.disableDepthWrite = true;
    material.forceDepthWrite = false;

    // Wraparound aurora belt — six vertical planes ringed around the
    // origin so a curtain is always visible regardless of where the
    // camera orbits. Each plane is a wide broadside the camera can
    // see when its azimuth lines up; six slots at 60° give substantial
    // overlap so transitions between camera angles never reveal a
    // gap. The planes start slightly below the horizon and reach high
    // into the sky — taller than they are wide, like a real aurora's
    // vertical light columns.
    // Plane geometry tuned so the camera (at y~20, looking at origin
    // from radius ~65) sees the bright body of the curtain shader,
    // not its faded top/bottom margins. Width is generous so adjacent
    // ring planes overlap horizontally — no visible gaps as the
    // camera orbits.
    const W = 480;
    const H = 90;
    const Y = 38;       // plane centre well above the mountain ridge.
    const RADIUS = 220; // close enough to read large in the frame

    const slots = 6;
    for (let i = 0; i < slots; i++) {
        const angle = (i / slots) * Math.PI * 2;
        const plane = BABYLON.MeshBuilder.CreatePlane(
            `auroraCurtains${i}`,
            { width: W, height: H, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
            scene
        );
        // Each plane faces inward (toward origin) so its visible side
        // catches the camera regardless of orbit direction.
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

export function updateAuroraCurtains(elapsed) {
    if (!material) return;
    material.setFloat('time', elapsed % TIME_WRAP);
    const raw = safeEnergy();
    smoothedEnergy = smoothedEnergy + (raw - smoothedEnergy) * 0.06;
    material.setFloat('energy', smoothedEnergy);
}

function safeEnergy() {
    try { return Math.max(0, Math.min(1, getMasterEnergy())); }
    catch (_) { return 0; }
}

export function disposeAuroraCurtains() {
    for (const m of meshes) m.dispose();
    meshes.length = 0;
    if (material) { material.dispose(); material = null; }
    smoothedEnergy = 0;
}
