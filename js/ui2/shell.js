/*
 * New app shell — the chrome the rebuilt surfaces slot into.
 * Builds the expanded-pill nav + 3 mode panels (Home/Focus/Progress), mounts
 * body-level per the containment rule, and drives mode switching.
 * Corner chrome (settings/help/account) is scaffolded here; wired in Phase 3.
 */
import { h, icon, mountBodyLevel } from './kit/index.js';
import { createNav } from './nav.js';
import { mountFocus } from './surfaces/focus.js';
import { mountHome } from './surfaces/home.js';

const MODES = [
    { id: 'home', label: 'Home' },
    { id: 'focus', label: 'Focus' },
    { id: 'progress', label: 'Progress' },
];

export function mountShell() {
    const panels = {};
    const sections = MODES.map((m) => {
        const sec = h('section', {
            class: 'cf-mode',
            id: `cf-mode-${m.id}`,
            dataset: { mode: m.id },
            role: 'tabpanel',
            'aria-label': m.label,
        });
        panels[m.id] = sec;
        return sec;
    });

    const app = h(
        'div',
        { class: 'cf-app' },
        h('main', { class: 'cf-modes', id: 'cf-main' }, ...sections)
    );

    const ctx = { goTo };
    const nav = createNav({ modes: MODES, active: 'home', onChange: goTo });
    const topnav = h('div', { class: 'cf-topnav' }, nav.el);

    const left = h(
        'div',
        { class: 'cf-corner cf-corner--left' },
        h(
            'button',
            {
                class: 'cf-btn cf-btn--icon cf-btn--ghost',
                type: 'button',
                'aria-label': 'Settings',
            },
            icon('sliders')
        ),
        h(
            'button',
            { class: 'cf-btn cf-btn--icon cf-btn--ghost', type: 'button', 'aria-label': 'Help' },
            icon('help')
        )
    );
    const right = h(
        'div',
        { class: 'cf-corner cf-corner--right' },
        h(
            'button',
            { class: 'cf-btn cf-btn--icon cf-btn--ghost', type: 'button', 'aria-label': 'Account' },
            icon('user')
        )
    );

    const skip = h('a', { class: 'cf-skip', href: '#cf-main' }, 'Skip to content');
    document.body.insertBefore(skip, document.body.firstChild);
    mountBodyLevel(app);
    mountBodyLevel(topnav);
    mountBodyLevel(left);
    mountBodyLevel(right);

    // Mount surfaces. Focus/Progress are placeholders until their phases land.
    mountHome(panels.home, ctx);
    mountFocus(panels.focus, ctx);
    panels.progress.appendChild(
        h(
            'div',
            { class: 'cf-empty on-scene' },
            h('p', { class: 'cf-empty__headline' }, 'Progress'),
            h('p', { class: 'cf-empty__sub' }, 'Your focus stats and analytics will live here.')
        )
    );

    let current = null;
    function goTo(id) {
        if (id === current || !panels[id]) return;
        current = id;
        for (const m of MODES) panels[m.id].classList.toggle('is-active', m.id === id);
        nav.setActive(id);
        document.body.dataset.mode = id;
    }
    goTo('home');

    return { ctx, goTo };
}
