// focus-trap.js
//
// Phase 6: Lightweight focus trap + restore for modal dialogs.
// Usage:
//   const trap = createFocusTrap(modalElement);
//   trap.activate(triggerElement);   // saves trigger, traps focus
//   trap.deactivate();               // restores focus to trigger

const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function createFocusTrap(container) {
    let trigger = null;
    let handler = null;

    function activate(triggerEl) {
        trigger = triggerEl || document.activeElement;
        handler = (e) => {
            if (e.key !== 'Tab') return;
            const focusable = Array.from(container.querySelectorAll(FOCUSABLE))
                .filter(el => el.offsetParent !== null); // visible only
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        container.addEventListener('keydown', handler);
    }

    function deactivate() {
        if (handler) {
            container.removeEventListener('keydown', handler);
            handler = null;
        }
        if (trigger && typeof trigger.focus === 'function') {
            // Delay slightly so the closing animation doesn't fight with focus
            setTimeout(() => trigger.focus(), 16);
        }
        trigger = null;
    }

    return { activate, deactivate };
}
