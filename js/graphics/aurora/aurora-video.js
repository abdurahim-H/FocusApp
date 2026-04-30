// aurora-video.js — video-backed Aurora Plain theme.
//
// The shader-based curtain build never reached the bar set by the
// reference postcard. This module replaces it with a pre-rendered
// video loop (public/aurora/aurora-loop.mp4) overlaid on the scene
// container, with CSS filter colour grading and a layered grain +
// vignette overlay for the extra polish that distinguishes "video
// playing in a frame" from "scene".
//
// Assets:
//   public/aurora/aurora-loop.mp4   — primary loop (~18 MB)
//
// The video is muted + autoplays + loops. Browsers gate autoplay on
// muted-only since Chrome 66 / Safari 11 — set both attributes
// explicitly so it plays without user gesture.

const VIDEO_SRC = '/aurora/aurora-loop.mp4';
const CONTAINER_ID = 'aurora-video-stack';

let stack = null;
let video = null;
let grainEl = null;
let vignetteEl = null;
let canvasEl = null;
let prevCanvasDisplay = null;

/** Create the video element + overlay layers and play. Inserted
 *  inside #scene-container at a higher z-index than the Babylon
 *  canvas so the video covers the (now empty) canvas. */
export function createAuroraVideo() {
    const container = document.getElementById('scene-container');
    if (!container) {
        console.warn('[aurora-video] #scene-container not found');
        return null;
    }

    // Hide the Babylon canvas while the video theme is active.
    // Babylon's render loop still runs (cheap once all scene meshes
    // are disposed by the theme switch) but the empty frame is no
    // longer composited over the video.
    canvasEl = container.querySelector('canvas');
    if (canvasEl) {
        prevCanvasDisplay = canvasEl.style.display;
        canvasEl.style.display = 'none';
    }

    stack = document.createElement('div');
    stack.id = CONTAINER_ID;
    stack.setAttribute('aria-hidden', 'true');
    Object.assign(stack.style, {
        position: 'absolute',
        inset: '0',
        zIndex: '2',
        pointerEvents: 'none',
        overflow: 'hidden',
        background: '#02050d',
    });

    video = document.createElement('video');
    video.src = VIDEO_SRC;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    // Defensive: some browsers require the explicit attribute too.
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    Object.assign(video.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        // CSS colour grading — push saturation, slight contrast, dim
        // brightness for a night-sky feel that matches the rest of
        // the app's dark palette.
        filter: 'saturate(1.18) contrast(1.06) brightness(0.92)',
        willChange: 'filter',
    });
    // play() returns a promise on modern browsers — swallow any
    // rejection (e.g., document not yet interacted with) since the
    // muted+autoplay path normally succeeds.
    video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {
            /* tolerate */
        });
    });

    // Vignette: radial darken at the corners. Gives the video frame
    // a focused-centre, anchored-corners feel.
    vignetteEl = document.createElement('div');
    Object.assign(vignetteEl.style, {
        position: 'absolute',
        inset: '0',
        background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.42) 100%)',
        pointerEvents: 'none',
        mixBlendMode: 'multiply',
    });

    // Grain overlay: SVG-fractal-noise pattern, animated by translating
    // a tiny offset every frame via CSS animation. Adds the cinematic
    // texture the raw video doesn't carry on its own.
    grainEl = document.createElement('div');
    Object.assign(grainEl.style, {
        position: 'absolute',
        inset: '-25%',
        backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        backgroundSize: '240px 240px',
        opacity: '0.07',
        pointerEvents: 'none',
        mixBlendMode: 'overlay',
        animation: 'auroraVideoGrain 1.4s steps(8) infinite',
    });

    // Inject the grain animation keyframes once.
    if (!document.getElementById('aurora-video-keyframes')) {
        const style = document.createElement('style');
        style.id = 'aurora-video-keyframes';
        style.textContent = `
            @keyframes auroraVideoGrain {
                0%   { transform: translate(0, 0); }
                12%  { transform: translate(-2%,  1%); }
                25%  { transform: translate( 1%, -2%); }
                37%  { transform: translate(-1%, -1%); }
                50%  { transform: translate( 2%,  2%); }
                62%  { transform: translate(-2%,  1%); }
                75%  { transform: translate( 1%, -1%); }
                87%  { transform: translate(-1%,  2%); }
                100% { transform: translate(0, 0); }
            }
        `;
        document.head.appendChild(style);
    }

    stack.appendChild(video);
    stack.appendChild(vignetteEl);
    stack.appendChild(grainEl);
    container.appendChild(stack);

    return stack;
}

/** No per-frame work — the <video> element drives playback itself
 *  and the grain layer animates via CSS keyframes. Kept as a no-op
 *  so the registry's update protocol stays uniform. */
export function updateAuroraVideo() {}

export function disposeAuroraVideo() {
    if (video) {
        try {
            video.pause();
            video.removeAttribute('src');
            video.load();
        } catch (_) {
            /* tolerate */
        }
        video = null;
    }
    if (stack && stack.parentNode) {
        stack.parentNode.removeChild(stack);
    }
    stack = null;
    grainEl = null;
    vignetteEl = null;

    // Restore the Babylon canvas so the next theme (Black Hole etc.)
    // is visible again.
    if (canvasEl) {
        canvasEl.style.display = prevCanvasDisplay ?? '';
        canvasEl = null;
        prevCanvasDisplay = null;
    }
}
