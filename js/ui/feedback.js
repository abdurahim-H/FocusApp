// feedback.js — lightweight bug report + feature request flow.
//
// Opens a modal where the user types a description, we append auto-collected
// system diagnostics, then either open their mail client (mailto:) or copy
// the whole thing to clipboard as a fallback. No server required.

import { createFocusTrap } from './focus-trap.js';

const SUPPORT_EMAIL = 'abduh@universefocuses.com';
const APP_VERSION = '1.0.0';

let trap = null;
let lastType = 'bug';

export function openFeedback(type = 'bug') {
    lastType = type;
    const el = ensureModal();
    const titleEl = el.querySelector('[data-feedback-title]');
    const hintEl = el.querySelector('[data-feedback-hint]');
    const submitEl = el.querySelector('[data-feedback-submit]');

    if (type === 'feature') {
        titleEl.textContent = 'Request a feature';
        hintEl.textContent = 'What would make Cosmic Focus better for you?';
        submitEl.textContent = 'Send request';
    } else {
        titleEl.textContent = 'Report a bug';
        hintEl.textContent = 'What happened, what did you expect, and what steps triggered it?';
        submitEl.textContent = 'Send report';
    }

    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');

    const textarea = el.querySelector('[data-feedback-body]');
    textarea.value = '';
    setTimeout(() => textarea.focus(), 120);

    if (!trap) trap = createFocusTrap(el);
    trap.activate(document.activeElement);
}

function closeFeedback() {
    const el = document.getElementById('feedbackModal');
    if (!el) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    trap?.deactivate();
}

function ensureModal() {
    let el = document.getElementById('feedbackModal');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'feedbackModal';
    el.className = 'feedback-modal';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
        <div class="feedback-modal__scrim" data-feedback-close></div>
        <form class="feedback-modal__card" data-feedback-form>
            <h3 class="feedback-modal__title" data-feedback-title>Report a bug</h3>
            <p class="feedback-modal__hint" data-feedback-hint>What happened?</p>
            <textarea class="feedback-modal__body"
                      data-feedback-body
                      rows="7"
                      placeholder="Describe what you saw…"
                      required
                      maxlength="4000"></textarea>
            <p class="feedback-modal__small">
                We'll attach your browser, GPU, and FPS so I can reproduce it.
                Nothing else.
            </p>
            <div class="feedback-modal__actions">
                <button type="button" class="deck-btn" data-feedback-close>Cancel</button>
                <button type="button" class="deck-btn" data-feedback-copy>Copy as email</button>
                <button type="submit" class="deck-btn deck-btn--primary" data-feedback-submit>
                    Send report
                </button>
            </div>
            <p class="feedback-modal__email">
                Going to: <strong>${SUPPORT_EMAIL}</strong>
            </p>
        </form>
    `;
    document.body.appendChild(el);

    // Bindings
    el.querySelectorAll('[data-feedback-close]').forEach((b) =>
        b.addEventListener('click', closeFeedback)
    );
    el.querySelector('[data-feedback-form]').addEventListener('submit', (e) => {
        e.preventDefault();
        const body = el.querySelector('[data-feedback-body]').value.trim();
        if (!body) return;
        openMailto(compose(lastType, body));
        closeFeedback();
    });
    el.querySelector('[data-feedback-copy]').addEventListener('click', async () => {
        const body = el.querySelector('[data-feedback-body]').value.trim();
        if (!body) return;
        const { subject, body: fullBody } = compose(lastType, body);
        const combined = `To: ${SUPPORT_EMAIL}\nSubject: ${subject}\n\n${fullBody}`;
        try {
            await navigator.clipboard.writeText(combined);
            flashCopyButton(el.querySelector('[data-feedback-copy]'));
        } catch (_) {
            // Older Safari — legacy fallback
            const ta = document.createElement('textarea');
            ta.value = combined;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (_) {}
            ta.remove();
            flashCopyButton(el.querySelector('[data-feedback-copy]'));
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && el.classList.contains('is-open')) closeFeedback();
    });

    return el;
}

function flashCopyButton(btn) {
    if (!btn) return;
    const prev = btn.textContent;
    btn.textContent = 'Copied ✓';
    btn.classList.add('is-confirmed');
    setTimeout(() => {
        btn.textContent = prev;
        btn.classList.remove('is-confirmed');
    }, 1500);
}

function compose(type, description) {
    const subject = type === 'feature'
        ? '[Cosmic Focus] Feature request'
        : '[Cosmic Focus] Bug report';

    const body =
        description +
        '\n\n— — — Diagnostics (auto-filled) — — —\n' +
        getSystemInfo();

    return { subject, body };
}

function openMailto({ subject, body }) {
    const href = `mailto:${SUPPORT_EMAIL}` +
        `?subject=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(body)}`;
    // Use location assignment (not window.open) so the user's mail client
    // opens in place without a popup blocker interfering.
    window.location.href = href;
}

function getSystemInfo() {
    const lines = [];
    lines.push(`Version: ${APP_VERSION}`);
    lines.push(`Timestamp: ${new Date().toISOString()}`);
    lines.push(`URL: ${location.href}`);
    lines.push(`Browser: ${navigator.userAgent}`);
    lines.push(`Platform: ${navigator.platform || 'unknown'}`);
    lines.push(`Language: ${navigator.language}`);
    lines.push(`Viewport: ${window.innerWidth}×${window.innerHeight} @ ${window.devicePixelRatio || 1}x`);

    // GPU (best effort — unmasked info is a privileged WebGL extension)
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
    } catch (_) { /* ignore */ }

    // Live FPS, if the scene has reported it.
    try {
        const fps = Number(document.querySelector('[data-readonly-key="about.fps"]')?.textContent);
        if (Number.isFinite(fps) && fps > 0) lines.push(`FPS: ${fps}`);
    } catch (_) {}

    return lines.join('\n');
}
