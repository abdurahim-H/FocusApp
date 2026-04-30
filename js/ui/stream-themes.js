// stream-themes.js
//
// Wave 5 — YouTube + SoundCloud "video themes". Replaces the 3D
// black-hole scene with a full-viewport iframe pulling in a chosen
// stream (Lofi Girl, jazz café, study-with-me, paste-your-own URL).
// CSP allows YouTube, youtube-nocookie, SoundCloud frames; embed is
// pinned `bottom = 0; right = 0` covering the whole viewport with a
// negative z-index so the focus card / nav / mini-timer all overlay.
//
// The 3D canvas hides while a stream theme is active. Cosmos sound
// bodies and ambient mixer keep their existing data signals — they
// just don't render visually until the user switches back to a 3D
// theme.

import { activeStreamId, signal, effect } from '../core/state.js';
import { setStreamDucking } from '../features/sounds.js';
import { get as settingsGet, subscribe as settingsSub } from './settings/store.js';

const HOST_ID = 'streamThemeHost';
const FRAME_ID = 'streamThemeFrame';
const CANVAS_ID = 'babylon-canvas'; // matches the babylon-engine canvas id

// ───────────────────────────────────────────────────────────────────────
// Curated starter library. Each entry has a short id, a human label,
// the kind of stream (`youtube` or `soundcloud`), and the embed src.
// YouTube ids use `youtube-nocookie` to skip the "before you continue"
// consent interstitial when possible. Live-stream ids are kept here
// rather than fetched at runtime to avoid the YouTube Data API.
// ───────────────────────────────────────────────────────────────────────

export const STREAM_LIBRARY = [
    {
        id: 'lofigirl',
        label: 'Lofi Girl — beats to focus to',
        kind: 'youtube',
        videoId: 'jfKfPfyJRdk',
        author: 'Lofi Girl',
        mood: 'lofi · all-day',
    },
    {
        id: 'lofigirl-sleep',
        label: 'Lofi Girl — beats to sleep to',
        kind: 'youtube',
        videoId: 'rUxyKA_-grg',
        author: 'Lofi Girl',
        mood: 'lofi · low-bpm',
    },
    {
        id: 'chillhop',
        label: 'Chillhop Music — afternoon café',
        kind: 'youtube',
        videoId: '7NOSDKb0HlU',
        author: 'Chillhop',
        mood: 'lofi · jazz',
    },
    {
        id: 'jazzcafe',
        label: 'Cozy Jazz Café',
        kind: 'youtube',
        videoId: 'Dx5qFachd3A',
        author: 'Cafe Music BGM Channel',
        mood: 'jazz · café',
    },
    {
        id: 'fireplace',
        label: 'Fireplace with crackling',
        kind: 'youtube',
        videoId: 'L_LUpnjgPso',
        author: 'Virtual Fireplace',
        mood: 'fireplace · ambient',
    },
    {
        id: 'rain-window',
        label: 'Rain on a window — 8 hours',
        kind: 'youtube',
        videoId: 'mPZkdNFkNps',
        author: 'Cat Trumpet',
        mood: 'rain · sleep',
    },
    {
        id: 'studywithme',
        label: 'Study with me — Korea live',
        kind: 'youtube',
        videoId: 'fQbxOFhO64s',
        author: 'NoLoFi-StudyWithMe',
        mood: 'silent · accountability',
    },
    {
        id: 'classical',
        label: 'Classical study music',
        kind: 'youtube',
        videoId: 'jgpJVI3tDbY',
        author: 'HALIDONMUSIC',
        mood: 'classical · piano',
    },
];

/** Return one stream by id (curated or custom). */
export function findStream(id) {
    if (!id) return null;
    if (id.startsWith('custom:')) return parseCustomStream(id);
    return STREAM_LIBRARY.find((s) => s.id === id) || null;
}

/** Parse a `custom:<youtube-id>` or `custom:soundcloud:<url-encoded>` shorthand. */
function parseCustomStream(id) {
    const rest = id.slice('custom:'.length);
    if (rest.startsWith('soundcloud:')) {
        const url = decodeURIComponent(rest.slice('soundcloud:'.length));
        return {
            id,
            label: 'Custom SoundCloud',
            kind: 'soundcloud',
            scUrl: url,
            author: 'You',
            mood: 'custom',
        };
    }
    return {
        id,
        label: 'Custom YouTube',
        kind: 'youtube',
        videoId: rest,
        author: 'You',
        mood: 'custom',
    };
}

/** Convert any user-pasted YouTube link into a `custom:<id>` shorthand
 *  so we can store a single string in settings. Returns null if the
 *  URL doesn't look like a YouTube link. */
export function shortenYouTubeUrl(url) {
    if (!url) return null;
    try {
        const u = new URL(url.trim());
        if (u.hostname.endsWith('youtu.be')) {
            return `custom:${u.pathname.replace(/^\//, '').split('/')[0]}`;
        }
        if (u.hostname.endsWith('youtube.com') || u.hostname.endsWith('youtube-nocookie.com')) {
            const v = u.searchParams.get('v');
            if (v) return `custom:${v}`;
            // /live/<id> / /embed/<id> shorthands.
            const m = u.pathname.match(/\/(?:live|embed)\/([^/?#]+)/);
            if (m) return `custom:${m[1]}`;
        }
        return null;
    } catch (_) {
        return null;
    }
}

/** Same idea for SoundCloud — stored as `custom:soundcloud:<encoded>`. */
export function shortenSoundCloudUrl(url) {
    if (!url) return null;
    try {
        const u = new URL(url.trim());
        if (!u.hostname.endsWith('soundcloud.com')) return null;
        return `custom:soundcloud:${encodeURIComponent(u.toString())}`;
    } catch (_) {
        return null;
    }
}

// ───────────────────────────────────────────────────────────────────────
// Render — show / hide the stream iframe + the 3D canvas.
// ───────────────────────────────────────────────────────────────────────

let initialised = false;

export function initStreamThemes() {
    if (initialised) return;
    initialised = true;
    // Start with whatever the user last had active.
    paint(activeStreamId.value);
    syncDucking();
    effect(() => {
        paint(activeStreamId.value);
        syncDucking();
    });
    // Wave 5.6 — toggling the setting mid-session updates the duck
    // immediately. Without this listener the user would have to
    // bounce the stream off and on again to apply their preference.
    settingsSub('sounds.muteOnStream', syncDucking);
}

/** Apply the duck based on the combined state of `activeStreamId`
 *  and the `sounds.muteOnStream` setting. Both must be true for
 *  the cosmos master to fade out; any other combination restores
 *  the user's stored volume. */
function syncDucking() {
    const streamActive = !!findStream(activeStreamId.value);
    const muteOn = settingsGet('sounds.muteOnStream') !== false;
    setStreamDucking(streamActive && muteOn);
}

/** Set the active stream by id. `null` clears it (returns to 3D). */
export function setActiveStream(id) {
    activeStreamId.value = id || null;
}

function paint(id) {
    const stream = findStream(id);
    const host = ensureHost();
    const canvas = document.getElementById(CANVAS_ID);
    if (!stream) {
        // 3D mode: clear iframe, show canvas.
        host.classList.add('hidden');
        const frame = host.querySelector(`#${FRAME_ID}`);
        if (frame) frame.remove();
        if (canvas) canvas.classList.remove('hidden');
        return;
    }
    // Stream mode: hide canvas, mount the iframe.
    host.classList.remove('hidden');
    if (canvas) canvas.classList.add('hidden');
    // Replace the iframe in place so changing streams doesn't leak
    // an old player. youtube-nocookie + autoplay + mute is the polite
    // default — autoplay-with-sound is blocked in modern browsers
    // until the user has gestured anyway.
    const frame = document.createElement('iframe');
    frame.id = FRAME_ID;
    frame.title = stream.label;
    frame.allow = 'autoplay; encrypted-media; fullscreen';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.src = streamSrc(stream);
    const old = host.querySelector(`#${FRAME_ID}`);
    if (old) old.replaceWith(frame);
    else host.appendChild(frame);
}

function streamSrc(stream) {
    if (stream.kind === 'youtube') {
        // autoplay=1, mute=1, controls=0, modestbranding=1, rel=0
        // (no related-video panel after the stream ends — we want a
        // single continuous backdrop).
        const params = new URLSearchParams({
            autoplay: '1',
            mute: '1',
            controls: '1',
            modestbranding: '1',
            rel: '0',
            playsinline: '1',
            loop: '1',
            playlist: stream.videoId,
        });
        return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(stream.videoId)}?${params.toString()}`;
    }
    if (stream.kind === 'soundcloud') {
        const url = stream.scUrl || '';
        const params = new URLSearchParams({
            url,
            auto_play: 'true',
            buying: 'false',
            sharing: 'false',
            download: 'false',
            show_artwork: 'true',
            show_user: 'true',
        });
        return `https://w.soundcloud.com/player/?${params.toString()}`;
    }
    return '';
}

function ensureHost() {
    let host = document.getElementById(HOST_ID);
    if (!host) {
        host = document.createElement('div');
        host.id = HOST_ID;
        host.className = 'stream-theme-host hidden';
        host.setAttribute('aria-hidden', 'true');
        // Keep the host outside .container so position:fixed resolves
        // against the viewport (per CLAUDE.md's overlay-positioning rule).
        document.body.appendChild(host);
    }
    return host;
}
