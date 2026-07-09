/*
 * Destructive-action safety — the app-wide pattern.
 *   - Reversible acts (complete/delete a task): do it now + toast.undo(...).
 *   - Irreversible/bulk (clear all, reset stats, delete account): confirmAction()
 *     turns the trigger into a two-step "tap again to confirm", auto-reverting.
 * Replaces the four legacy idioms and every native confirm().
 */

export function confirmAction(
    btn,
    { confirmLabel = 'Tap again to confirm', timeout = 4000, onConfirm } = {}
) {
    if (btn._cfDisarm) {
        // already armed -> this is the confirming click
        btn._cfDisarm();
        onConfirm?.();
        return true;
    }
    const originalText = btn.textContent;
    btn.classList.add('is-arming');
    btn.setAttribute('aria-live', 'assertive');
    btn.textContent = confirmLabel;
    const timer = setTimeout(() => btn._cfDisarm?.(), timeout);
    btn._cfDisarm = () => {
        clearTimeout(timer);
        btn.textContent = originalText;
        btn.classList.remove('is-arming');
        btn.removeAttribute('aria-live');
        btn._cfDisarm = null;
    };
    return false;
}
