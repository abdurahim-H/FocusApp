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
        body: 'A cinematic Pomodoro timer where ambient sound is something you arrange in space. Let’s take 30 seconds.',
        target: null,
    },
    {
        title: 'Two tabs',
        body: 'Home for the dashboard, Focus for the timer + tasks. Sounds are everywhere — they live in the cosmos.',
        target: '.nav-buttons',
    },
    {
        title: 'Focus Timer',
        body: 'Start a Pomodoro session. Counts down, auto-rolls into breaks. <kbd>Space</kbd> starts/pauses.',
        target: '.timer-controls',
    },
    {
        title: 'Open the sound library',
        body: 'Tap the <strong>+</strong> in the cosmos toolbar to summon ambient sounds. Each sound becomes a celestial body orbiting the black hole.',
        target: '#deckAddSoundBtn',
    },
    {
        title: 'Bodies are your mixer',
        body: '<strong>Drag a body up/down</strong> to set volume. <strong>Left/right</strong> to pan. <strong>Click</strong> to open its EQ ring. <strong>Drag toward the black hole</strong> to remove it — gravity does the rest.',
        target: null,
    },
    {
        title: 'The black hole is master',
        body: 'Drag the black hole vertically to set master volume. The accretion disk brightens with the loudness.',
        target: null,
    },
    {
        title: 'Constellations',
        body: 'Save your favourite arrangements. Tap the <strong>star</strong> in the toolbar to save the current constellation. Recall it any time from the library.',
        target: '#deckSaveMixBtn',
    },
    {
        title: 'Tasks',
        body: 'Track what you’re working on. Tasks persist across refreshes.',
        target: '.task-section',
    },
    {
        title: 'Settings',
        body: 'Graphics quality, timer durations, keyboard shortcuts, profiles, theming.',
        target: '.settings-trigger',
    },
    {
        title: 'You’re ready',
        body: 'Press <kbd>?</kbd> any time for help. Replay this tour from Settings → Data & About.',
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
    document
        .querySelectorAll('.tour-highlight')
        .forEach((el) => el.classList.remove('tour-highlight'));
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
    document
        .querySelectorAll('.tour-highlight')
        .forEach((el) => el.classList.remove('tour-highlight'));
    overlay.classList.remove('is-active');
    setTimeout(() => {
        overlay?.remove();
        overlay = null;
    }, 350);
}
