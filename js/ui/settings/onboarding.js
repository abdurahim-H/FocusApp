// settings/onboarding.js
//
// Lightweight welcome tour overlay. Steps highlight key areas of the app.
// Can be triggered from Settings > Data & About > "Replay welcome tour"
// or automatically on first visit (checks localStorage flag).

import { isReducedMotion } from '../../core/motion.js';

const STORAGE_KEY = 'fu_tour_seen';

const STEPS = [
    {
        title: 'Welcome to Cosmic Focus',
        body: 'A cinematic Pomodoro timer with a living black hole scene behind it. Let\u2019s take a quick tour.',
        target: null, // no highlight — centered intro
    },
    {
        title: 'Navigation',
        body: 'Switch between Home, Focus, and Ambient modes with these tabs.',
        target: '.nav-buttons',
    },
    {
        title: 'Focus Timer',
        body: 'Start a Pomodoro session. The timer counts down and auto-rolls into breaks.',
        target: '.timer-controls',
    },
    {
        title: 'Tasks',
        body: 'Add tasks for your session. They persist across refreshes and animate in/out.',
        target: '.task-section',
    },
    {
        title: 'Ambient Sounds',
        body: 'Switch to the Ambient tab to mix background sounds while you work.',
        target: '[data-mode="ambient"]',
    },
    {
        title: 'Settings',
        body: 'Tweak graphics quality, timer durations, keyboard shortcuts, profiles, and more.',
        target: '.settings-trigger',
    },
    {
        title: 'Keyboard Shortcuts',
        body: 'Press <kbd>?</kbd> anytime to see all keyboard shortcuts. Space starts/pauses the timer.',
        target: null,
    },
    {
        title: 'You\u2019re all set!',
        body: 'Enjoy your cosmic focus sessions. You can replay this tour from Settings \u2192 Data & About.',
        target: null,
    },
];

let overlay = null;
let currentStep = 0;

export function startTour() {
    // Close settings panel if open
    const panel = document.getElementById('settingsPanel');
    if (panel && !panel.classList.contains('hidden')) {
        panel.classList.add('hidden');
        document.getElementById('settingsModalOverlay')?.classList.remove('active');
        document.querySelector('.settings-trigger')?.classList.remove('open');
    }

    currentStep = 0;
    createOverlay();
    renderStep();
}

/** Auto-show on first visit. Call from app.js init. */
export function maybeShowFirstVisitTour() {
    if (localStorage.getItem(STORAGE_KEY)) return;
    localStorage.setItem(STORAGE_KEY, '1');
    // Small delay so the app finishes rendering first.
    setTimeout(() => startTour(), 1200);
}

function createOverlay() {
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.className = 'tour-overlay';
    overlay.innerHTML = `
        <div class="tour-scrim"></div>
        <div class="tour-card">
            <div class="tour-card__title"></div>
            <div class="tour-card__body"></div>
            <div class="tour-card__footer">
                <span class="tour-card__step"></span>
                <div class="tour-card__actions">
                    <button class="tour-btn tour-btn--skip">Skip</button>
                    <button class="tour-btn tour-btn--next">Next</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.tour-btn--skip').addEventListener('click', closeTour);
    overlay.querySelector('.tour-btn--next').addEventListener('click', nextStep);
    overlay.querySelector('.tour-scrim').addEventListener('click', closeTour);

    // Force reflow then animate in
    if (isReducedMotion()) {
        overlay.classList.add('is-active');
    } else {
        requestAnimationFrame(() => overlay.classList.add('is-active'));
    }
}

function renderStep() {
    if (!overlay) return;
    const step = STEPS[currentStep];
    overlay.querySelector('.tour-card__title').textContent = step.title;
    // XSS safety: step.body is static author HTML from the STEPS array above.
    // If tour steps are ever sourced from user input, switch to textContent.
    overlay.querySelector('.tour-card__body').innerHTML = step.body;
    overlay.querySelector('.tour-card__step').textContent = `${currentStep + 1} / ${STEPS.length}`;

    const nextBtn = overlay.querySelector('.tour-btn--next');
    nextBtn.textContent = currentStep === STEPS.length - 1 ? 'Done' : 'Next';

    // Highlight target element
    document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
    if (step.target) {
        const targetEl = document.querySelector(step.target);
        if (targetEl) targetEl.classList.add('tour-highlight');
    }
}

function nextStep() {
    currentStep++;
    if (currentStep >= STEPS.length) {
        closeTour();
        return;
    }
    renderStep();
}

function closeTour() {
    if (!overlay) return;
    document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
    overlay.classList.remove('is-active');
    setTimeout(() => {
        overlay?.remove();
        overlay = null;
    }, 350);
}
