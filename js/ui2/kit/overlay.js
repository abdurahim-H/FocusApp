/*
 * Overlay primitives — the shared "sheet / drawer / popover" pattern that
 * Settings, Help, Profile, Task-detail, Music, and the popovers all reused
 * by hand. One implementation: scrim + focus trap + Esc + scrim-close + motion.
 * All mount as body-level siblings (never inside a `contain:` box).
 */

import { createFocusTrap } from '../../ui/focus-trap.js';
import { h, mountBodyLevel } from './dom.js';
import { icon } from './icons.js';

function controller({ scrim, panel, onClose, closeOnScrim = true, closeOnEsc = true }) {
    const trap = createFocusTrap(panel);
    let open = false;
    let escHandler = null;

    function doOpen(trigger) {
        if (open) return;
        open = true;
        mountBodyLevel(scrim);
        mountBodyLevel(panel);
        requestAnimationFrame(() => {
            scrim.classList.add('is-open');
            panel.classList.add('is-open');
        });
        trap.activate(trigger);
        if (closeOnEsc) {
            escHandler = (e) => {
                if (e.key === 'Escape') {
                    e.stopPropagation();
                    doClose();
                }
            };
            document.addEventListener('keydown', escHandler, true);
        }
        requestAnimationFrame(() => {
            const f = panel.querySelector('input, button, [tabindex]:not([tabindex="-1"])');
            if (f) f.focus();
        });
    }

    function doClose() {
        if (!open) return;
        open = false;
        scrim.classList.remove('is-open');
        panel.classList.remove('is-open');
        trap.deactivate();
        if (escHandler) {
            document.removeEventListener('keydown', escHandler, true);
            escHandler = null;
        }
        const done = () => {
            scrim.remove();
            panel.remove();
        };
        panel.addEventListener('transitionend', done, { once: true });
        setTimeout(done, 500);
        onClose?.();
    }

    if (closeOnScrim) scrim.addEventListener('click', doClose);
    return {
        open: doOpen,
        close: doClose,
        get isOpen() {
            return open;
        },
        panel,
        scrim,
    };
}

export function createSheet({ eyebrow, title, onClose } = {}) {
    const scrim = h('div', { class: 'cf-scrim' });
    const body = h('div', { class: 'cf-sheet__body' });
    const closeBtn = h(
        'button',
        { class: 'cf-sheet__close', type: 'button', 'aria-label': 'Close' },
        icon('close')
    );
    const heading = h('h2', { class: 'cf-sheet__title' }, title || '');
    const panel = h(
        'div',
        { class: 'cf-sheet', role: 'dialog', 'aria-modal': 'true' },
        h(
            'header',
            { class: 'cf-sheet__head' },
            eyebrow && h('span', { class: 'cf-sheet__eyebrow' }, eyebrow),
            heading,
            closeBtn
        ),
        body
    );
    const ctrl = controller({ scrim, panel, onClose });
    closeBtn.addEventListener('click', ctrl.close);
    return {
        ...ctrl,
        body,
        setTitle: (t) => {
            heading.textContent = t;
        },
    };
}

export function createDrawer({ title, onClose } = {}) {
    const scrim = h('div', { class: 'cf-scrim' });
    const body = h('div', {
        class: 'cf-drawer__body',
        style: { flex: '1 1 auto', overflowY: 'auto', padding: 'var(--sp-5)' },
    });
    const closeBtn = h(
        'button',
        { class: 'cf-drawer__close', type: 'button', 'aria-label': 'Close' },
        icon('close')
    );
    const panel = h(
        'aside',
        { class: 'cf-drawer', role: 'dialog', 'aria-modal': 'true' },
        h(
            'header',
            { class: 'cf-sheet__head' },
            h('h2', { class: 'cf-sheet__title' }, title || ''),
            closeBtn
        ),
        body
    );
    const ctrl = controller({ scrim, panel, onClose });
    closeBtn.addEventListener('click', ctrl.close);
    return { ...ctrl, body };
}

export function createPopover({ onClose } = {}) {
    const scrim = h('div', {
        class: 'cf-scrim',
        style: { background: 'transparent', backdropFilter: 'none', WebkitBackdropFilter: 'none' },
    });
    const panel = h('div', { class: 'cf-popover', role: 'dialog' });
    const ctrl = controller({ scrim, panel, onClose });
    function openAt(anchor) {
        ctrl.open(anchor);
        requestAnimationFrame(() => {
            const r = anchor.getBoundingClientRect();
            const pw = panel.offsetWidth,
                ph = panel.offsetHeight;
            let left = r.left + r.width / 2 - pw / 2;
            let top = r.bottom + 8;
            left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
            if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 8);
            panel.style.left = `${left}px`;
            panel.style.top = `${top}px`;
        });
    }
    return { ...ctrl, openAt, panel };
}
