// video-backdrop.js — factory for video-loop background themes.
//
// Both Sakura and Aurora Plain are pre-rendered Veo loops dropped on
// top of (and replacing) the Babylon canvas. This module factors the
// DOM scaffolding — <video autoplay loop muted playsinline> + a CSS
// vignette + a keyframe-animated SVG-fractal-noise grain — into a
// single factory so each theme just needs its src + filter config.
//
// Each call to makeVideoTheme({...}) returns its own { init, update,
// dispose } module with closure-private state, so themes don't share
// DOM refs and disposing one doesn't tear down another.

const KEYFRAMES_ID = 'video-backdrop-grain-keyframes';
const KEYFRAMES_CSS = `
    @keyframes videoBackdropGrain {
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

function injectKeyframesOnce() {
    if (document.getElementById(KEYFRAMES_ID)) return;
    const style = document.createElement('style');
    style.id = KEYFRAMES_ID;
    style.textContent = KEYFRAMES_CSS;
    document.head.appendChild(style);
}

/**
 * Build a theme module that paints a video loop onto #scene-container.
 *
 * @param {object} config
 * @param {string} config.id          - registry id (e.g. 'sakuraVideo')
 * @param {string} config.src         - video URL (e.g. '/sakura/sakura-loop.mp4')
 * @param {string} config.filter      - CSS filter string for colour grading
 * @param {string} [config.fallback]  - solid background colour shown until first frame paints
 * @param {string} [config.vignette]  - radial-gradient string for the multiply-blend overlay
 * @param {number} [config.grainOpacity=0.07] - 0..1; 0 disables the grain layer
 *
 * @returns {{ id: string, init: () => void, update: () => void, dispose: () => void }}
 */
export function makeVideoTheme(config) {
    const {
        id,
        src,
        filter,
        fallback = '#02050d',
        vignette = 'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.42) 100%)',
        grainOpacity = 0.07,
    } = config;

    let stack = null;
    let video = null;
    let canvasEl = null;
    let prevCanvasDisplay = null;

    function init() {
        const container = document.getElementById('scene-container');
        if (!container) {
            console.warn(`[${id}] #scene-container not found`);
            return;
        }

        // Hide the Babylon canvas while the video theme is active.
        // Babylon's render loop still runs (cheap once theme modules
        // are disposed) but we don't waste compositing cycles on the
        // empty frame.
        canvasEl = container.querySelector('canvas');
        if (canvasEl) {
            prevCanvasDisplay = canvasEl.style.display;
            canvasEl.style.display = 'none';
        }

        injectKeyframesOnce();

        stack = document.createElement('div');
        stack.dataset.videoBackdrop = id;
        stack.setAttribute('aria-hidden', 'true');
        Object.assign(stack.style, {
            position: 'absolute',
            inset: '0',
            zIndex: '2',
            pointerEvents: 'none',
            overflow: 'hidden',
            background: fallback,
        });

        video = document.createElement('video');
        video.src = src;
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
            filter,
            willChange: 'filter',
        });
        // Modern play() returns a promise — swallow any rejection
        // (e.g., document not yet interacted with). Muted+autoplay
        // is allowed without a user gesture, but Safari / older
        // browsers may still reject.
        video.addEventListener('loadedmetadata', () => {
            video.play().catch(() => {
                /* tolerate */
            });
        });

        const vignetteEl = document.createElement('div');
        Object.assign(vignetteEl.style, {
            position: 'absolute',
            inset: '0',
            background: vignette,
            pointerEvents: 'none',
            mixBlendMode: 'multiply',
        });

        stack.appendChild(video);
        stack.appendChild(vignetteEl);

        if (grainOpacity > 0) {
            const grainEl = document.createElement('div');
            Object.assign(grainEl.style, {
                position: 'absolute',
                inset: '-25%',
                backgroundImage:
                    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
                backgroundSize: '240px 240px',
                opacity: String(grainOpacity),
                pointerEvents: 'none',
                mixBlendMode: 'overlay',
                animation: 'videoBackdropGrain 1.4s steps(8) infinite',
            });
            stack.appendChild(grainEl);
        }

        container.appendChild(stack);
    }

    function update() {
        // No per-frame work — playback + grain animate themselves.
    }

    function dispose() {
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

        if (canvasEl) {
            canvasEl.style.display = prevCanvasDisplay ?? '';
            canvasEl = null;
            prevCanvasDisplay = null;
        }
    }

    return { id, init, update, dispose };
}
