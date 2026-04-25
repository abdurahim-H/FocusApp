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
            const focusable = Array.from(container.querySelectorAll(FOCUSABLE)).filter(
                (el) => el.offsetParent !== null
            ); // visible only
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
        // Capture into a local — trigger is nulled synchronously below, and
        // the setTimeout closure would otherwise read `null` at fire time.
        const t = trigger;
        trigger = null;

        // Move focus out of the container synchronously. Callers typically
        // set aria-hidden="true" on the container right after deactivate(),
        // which would otherwise trip the "aria-hidden on a focused
        // descendant" accessibility warning.
        const active = document.activeElement;
        if (active && container.contains(active) && typeof active.blur === 'function') {
            active.blur();
        }

        if (t && typeof t.focus === 'function') {
            setTimeout(() => {
                // Element may have been removed from the DOM while we waited.
                if (t.isConnected && typeof t.focus === 'function') t.focus();
            }, 16);
        }
    }

    return { activate, deactivate };
}
