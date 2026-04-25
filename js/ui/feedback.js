// feedback.js — helpers for the inline Feedback section in Settings.
//
// The settings renderer builds the actual form DOM (see renderer.js
// renderFeedbackForm). This module just exposes the glue: composing the
// email body (user text + auto-collected diagnostics), opening mailto,
// and copying to clipboard as a fallback.

export const SUPPORT_EMAIL = 'abduh@universefocuses.com';
const APP_VERSION = '1.0.0';

/** Open the user's mail client with a pre-filled email. */
export function sendFeedback(type, description) {
    const { subject, body } = compose(type, description);
    const href =
        `mailto:${SUPPORT_EMAIL}` +
        `?subject=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(body)}`;
    window.location.href = href;
}

/** Copy a nicely-formatted version of the email to the clipboard.
 *  Returns a promise that resolves on success. */
export async function copyFeedbackToClipboard(type, description) {
    const { subject, body } = compose(type, description);
    const blob = `To: ${SUPPORT_EMAIL}\nSubject: ${subject}\n\n${body}`;
    try {
        await navigator.clipboard.writeText(blob);
    } catch (_) {
        // Safari fallback
        const ta = document.createElement('textarea');
        ta.value = blob;
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
        } catch (_) {
            /* ignore */
        }
        ta.remove();
    }
}

function compose(type, description) {
    const subject =
        type === 'feature' ? '[Cosmic Focus] Feature request' : '[Cosmic Focus] Bug report';
    const body =
        (description || '').trim() +
        '\n\n— — — Diagnostics (auto-filled) — — —\n' +
        getSystemInfo();
    return { subject, body };
}

function getSystemInfo() {
    const lines = [];
    lines.push(`Version: ${APP_VERSION}`);
    lines.push(`Timestamp: ${new Date().toISOString()}`);
    lines.push(`URL: ${location.href}`);
    lines.push(`Browser: ${navigator.userAgent}`);
    lines.push(`Platform: ${navigator.platform || 'unknown'}`);
    lines.push(`Language: ${navigator.language}`);
    lines.push(
        `Viewport: ${window.innerWidth}×${window.innerHeight} @ ${window.devicePixelRatio || 1}x`
    );

    try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        if (gl) {
            const dbg = gl.getExtension('WEBGL_debug_renderer_info');
            if (dbg) {
                lines.push(`GPU: ${gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)}`);
                lines.push(`GPU vendor: ${gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)}`);
            }
        }
        c.remove();
    } catch (_) {
        /* ignore */
    }

    return lines.join('\n');
}
