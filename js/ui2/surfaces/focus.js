/*
 * Focus surface — the core Pomodoro loop, rebuilt on the kit and bridged to the
 * kept timer.js. timer.js writes MM:SS to #timerDisplay and the session numbers
 * to #pomodoroCount/#pomodoroTotal, and toggles `.hidden` on the control buttons
 * (start/pause/skip), so we provide those IDs and call its functions directly.
 * It also fires focus-timer:{start,pause,reset,end}, which we use to keep the
 * session-type label and the primary-button label in sync.
 */

import { state } from '../../core/state.js';
import {
    pauseTimer,
    resetSession,
    resetTimer,
    skipBreak,
    skipFocus,
    startTimer,
    updateSessionDisplay,
    updateTimerDisplay,
} from '../../features/timer.js';
import { h, icon, lifecycle } from '../kit/index.js';

export function mountFocus(root, ctx) {
    const life = lifecycle();

    const typeLabel = h('div', { class: 'cf-timer__type', id: 'cf-session-type' }, 'Focus');
    const time = h(
        'div',
        { class: 'cf-timer__time', id: 'timerDisplay', role: 'timer', 'aria-live': 'off' },
        '25:00'
    );
    const session = h(
        'div',
        { class: 'cf-timer__session' },
        'Session ',
        h('span', { id: 'pomodoroCount' }, '1'),
        ' of ',
        h('span', { id: 'pomodoroTotal' }, '4')
    );

    const startLabel = h('span', {}, 'Start Focus');
    const startBtn = h(
        'button',
        {
            id: 'startBtn',
            class: 'cf-btn cf-btn--primary cf-btn--lg',
            type: 'button',
            onClick: () => startTimer(),
        },
        icon('play', { size: 18 }),
        startLabel
    );
    const pauseBtn = h(
        'button',
        {
            id: 'pauseBtn',
            class: 'cf-btn cf-btn--lg hidden',
            type: 'button',
            onClick: () => pauseTimer(),
        },
        icon('pause', { size: 18 }),
        'Pause'
    );
    const skipBreakBtn = h(
        'button',
        { id: 'skipBreakBtn', class: 'cf-btn hidden', type: 'button', onClick: () => skipBreak() },
        icon('skip', { size: 16 }),
        'Skip break'
    );
    const skipFocusBtn = h(
        'button',
        { id: 'skipFocusBtn', class: 'cf-btn hidden', type: 'button', onClick: () => skipFocus() },
        icon('skip', { size: 16 }),
        'Skip focus'
    );
    const resetBtn = h(
        'button',
        {
            id: 'resetBtn',
            class: 'cf-btn cf-btn--ghost',
            type: 'button',
            onClick: () => resetTimer(),
        },
        icon('reset', { size: 16 }),
        'Reset'
    );
    const cycleBtn = h(
        'button',
        {
            id: 'resetSessionBtn',
            class: 'cf-btn cf-btn--icon cf-btn--ghost cf-btn--sm cf-timer__cycle',
            type: 'button',
            'aria-label': 'Reset the whole cycle',
            onClick: () => resetSession(),
        },
        icon('reset', { size: 16 })
    );

    const card = h(
        'div',
        { class: 'cf-surface cf-timer on-scene-panel' },
        typeLabel,
        time,
        session,
        h(
            'div',
            { class: 'cf-timer__controls' },
            startBtn,
            pauseBtn,
            skipBreakBtn,
            skipFocusBtn,
            resetBtn
        ),
        cycleBtn
    );
    root.appendChild(card);

    // Populate from current state and keep the phase label / primary label synced.
    function syncLabels() {
        const isBreak = state.timer.isBreak;
        card.classList.toggle('is-break', isBreak);
        typeLabel.textContent = isBreak
            ? state.timer.isLongBreak
                ? 'Long break'
                : 'Break'
            : 'Focus';
        const paused = state.timerState === 'paused';
        startLabel.textContent = isBreak ? 'Start break' : paused ? 'Resume' : 'Start Focus';
    }

    updateTimerDisplay();
    updateSessionDisplay();
    syncLabels();

    for (const evt of [
        'focus-timer:start',
        'focus-timer:pause',
        'focus-timer:reset',
        'focus-timer:end',
    ]) {
        life.on(document, evt, () => {
            updateSessionDisplay();
            syncLabels();
        });
    }

    return () => life.destroy();
}
