/*
 * Home surface — hero, time-aware greeting, live clock, primary CTA.
 * The first rebuilt surface. Period tiles / stats land with the Progress surface.
 */
import { h, icon } from '../kit/index.js';

function greeting() {
    const hr = new Date().getHours();
    if (hr < 5) return 'The universe is quiet — perfect for deep work.';
    if (hr < 12) return 'Good morning. Set your intention for today.';
    if (hr < 18) return 'Good afternoon. One focused block at a time.';
    return 'Good evening. Wind down with a calm session.';
}

export function mountHome(root, ctx) {
    const clock = h('div', { class: 'cf-home__clock' });
    const startBtn = h(
        'button',
        {
            class: 'cf-btn cf-btn--primary cf-btn--lg',
            type: 'button',
            onClick: () => ctx.goTo('focus'),
        },
        icon('play', { size: 18 }),
        'Start a focus session'
    );

    const home = h(
        'div',
        { class: 'cf-home on-scene' },
        h('p', { class: 'cf-home__eyebrow' }, 'Cosmic Focus'),
        h(
            'h1',
            { class: 'cf-home__title' },
            h('span', { class: 'aurora-text' }, 'Focus'),
            ' among the stars'
        ),
        h('p', { class: 'cf-home__greeting' }, greeting()),
        clock,
        h('div', { class: 'cf-home__cta' }, startBtn)
    );
    root.appendChild(home);

    function tick() {
        clock.textContent = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
    }
    tick();
    const id = setInterval(tick, 15000);

    return () => {
        clearInterval(id);
        home.remove();
    };
}
