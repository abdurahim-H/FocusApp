/*
 * Expanded-pill nav: Home · Focus · Progress. A single sliding aurora
 * indicator (driven by --x/--w) tracks the active button, so it works without
 * :has() and animates on the compositor. Returns { el, setActive(id) }.
 */
import { h } from './kit/index.js';

export function createNav({ modes, active, onChange }) {
    const indicator = h('div', { class: 'cf-navpill__indicator', 'aria-hidden': 'true' });
    const buttons = modes.map((m) =>
        h(
            'button',
            {
                class: 'cf-navpill__btn',
                type: 'button',
                role: 'tab',
                dataset: { mode: m.id },
                onClick: () => onChange?.(m.id),
            },
            m.label
        )
    );
    const pill = h(
        'div',
        { class: 'cf-navpill', role: 'tablist', 'aria-label': 'Primary navigation' },
        indicator,
        ...buttons
    );

    let current = active;

    function moveIndicator(id) {
        const btn = buttons.find((b) => b.dataset.mode === id);
        if (!btn) return;
        const pr = pill.getBoundingClientRect();
        const br = btn.getBoundingClientRect();
        if (br.width === 0) return; // not laid out yet
        indicator.style.setProperty('--w', `${br.width}px`);
        indicator.style.setProperty('--x', `${br.left - pr.left}px`);
    }

    function setActive(id) {
        current = id;
        for (const b of buttons) {
            const on = b.dataset.mode === id;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-selected', String(on));
            if (on) b.setAttribute('aria-current', 'page');
            else b.removeAttribute('aria-current');
        }
        requestAnimationFrame(() => moveIndicator(id));
    }

    window.addEventListener('resize', () => moveIndicator(current));
    setActive(active);

    return { el: pill, setActive };
}
