// gentle-toast.js
//
// Single shared toast slot for the calm, non-blocking notifications
// fired by personal-best alerts (Wave 24.9) and wellness reminders
// (Wave 18.3 / 18.4 / 18.5). Each call queues a payload — when two
// toasts fire at once (e.g. eye-rest + hydration both due at the
// 60-min mark), the second waits its turn instead of stacking on
// top of the first. On desktop the toast anchors top-right; on
// mobile it pins to the bottom — either way only one is on screen
// at a time, so the collision the per-id renderers used to produce
// can't happen.
//
// XSS contract: icon / title / detail are all author-controlled
// strings (hardcoded constants in the calling modules). The helper
// uses textContent for title and detail to keep us safe even if a
// future caller pipes user input through.

const TOAST_ID = 'gentleToast';
const DEFAULT_TTL = 5400;
const FADE_OUT_MS = 350;
const GAP_MS = 200;

const queue = [];
let showing = false;
let hideTimer = null;

function ensureEl() {
    let el = document.getElementById(TOAST_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = TOAST_ID;
    el.className = 'celebrate-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = `
        <span class="celebrate-toast__icon" aria-hidden="true"></span>
        <span class="celebrate-toast__body">
            <span class="celebrate-toast__title"></span>
            <span class="celebrate-toast__detail"></span>
        </span>
    `;
    document.body.appendChild(el);
    return el;
}

function paint(payload) {
    const el = ensureEl();
    el.querySelector('.celebrate-toast__icon').textContent = payload.icon || '';
    el.querySelector('.celebrate-toast__title').textContent = payload.title || '';
    el.querySelector('.celebrate-toast__detail').textContent = payload.detail || '';
    // Re-trigger the entrance animation if it's already mounted.
    el.classList.remove('is-visible');
    void el.offsetWidth;
    el.classList.add('is-visible');
}

function next() {
    if (queue.length === 0) {
        showing = false;
        return;
    }
    showing = true;
    const payload = queue.shift();
    paint(payload);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
        const el = document.getElementById(TOAST_ID);
        if (el) el.classList.remove('is-visible');
        // Wait for the fade-out to finish before showing the next
        // entry so the user sees a clean transition between them.
        setTimeout(next, FADE_OUT_MS + GAP_MS);
    }, payload.ttl || DEFAULT_TTL);
}

/** Queue a toast. Returns immediately. Multiple calls in a single
 *  tick are shown back-to-back, in the order they arrived. */
export function showGentleToast(payload) {
    queue.push(payload);
    if (!showing) next();
}
