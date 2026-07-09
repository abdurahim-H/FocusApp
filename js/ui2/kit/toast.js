/*
 * Unified toast queue — replaces the legacy gentle-toast / ambient-toast /
 * settings-toast trio. One region, aria-live=polite, never steals focus.
 * Supports an Undo action (the app-wide reversible-destructive pattern).
 */
import { h, mountBodyLevel } from './dom.js';
import { icon } from './icons.js';

let region = null;
const ICONS = { success: 'check', error: 'alert', celebrate: 'star', info: 'info' };

function ensureRegion() {
    if (region && region.isConnected) return region;
    region = h('div', { class: 'cf-toast-region', role: 'status', 'aria-live': 'polite' });
    mountBodyLevel(region);
    return region;
}

export function toast({
    type = 'info',
    title,
    detail,
    action,
    actionLabel = 'Undo',
    timeout = 4200,
} = {}) {
    const r = ensureRegion();
    let timer = null;

    const node = h(
        'div',
        { class: `cf-toast cf-toast--${type}` },
        icon(ICONS[type] || 'info', { size: 20 }),
        h(
            'div',
            { class: 'cf-toast__body' },
            title && h('div', { class: 'cf-toast__title' }, title),
            detail && h('div', { class: 'cf-toast__detail' }, detail)
        ),
        action &&
            h(
                'button',
                {
                    class: 'cf-toast__action',
                    type: 'button',
                    onClick: () => {
                        try {
                            action();
                        } finally {
                            dismiss();
                        }
                    },
                },
                actionLabel
            )
    );

    function dismiss() {
        clearTimeout(timer);
        if (!node.isConnected) return;
        node.classList.remove('is-visible');
        const done = () => node.remove();
        node.addEventListener('transitionend', done, { once: true });
        setTimeout(done, 500);
    }

    r.appendChild(node);
    requestAnimationFrame(() => node.classList.add('is-visible'));
    if (timeout) timer = setTimeout(dismiss, timeout);
    while (r.children.length > 3) r.firstChild.remove();

    return { dismiss };
}

toast.success = (title, detail) => toast({ type: 'success', title, detail });
toast.error = (title, detail) => toast({ type: 'error', title, detail, timeout: 6000 });
toast.info = (title, detail) => toast({ type: 'info', title, detail });
toast.celebrate = (title, detail) => toast({ type: 'celebrate', title, detail, timeout: 5400 });
toast.undo = (title, onUndo, detail) =>
    toast({ type: 'info', title, detail, action: onUndo, actionLabel: 'Undo', timeout: 5000 });
