// upgrade.js — single shared modal triggered by every paywall gate.
//
// Public API:
//   showUpgradeModal({ feature })   feature ∈ FEATURES (below)
//
// Architecture notes:
//   • One modal element, lazily built on first call.
//   • Lives outside .container (the .container has `contain: layout
//     style paint`, which would clip a fixed-position overlay — same
//     pattern the auth modal, settings panel, and account dropdown
//     already use).
//   • Trigger paths:
//       - openNotepad() while free
//       - profile section click on a Pro section while free
//       - future: connect-music buttons while free
//       - settings → account section "Upgrade" button
//   • The "Try free for 7 days" CTA goes through Stripe Checkout
//     because Stripe Checkout requires a payment method even for
//     trials. The trial period itself is handled by Stripe; no card
//     is charged for 7 days. We surface that in the copy.

import { isPro, startCheckout } from '../features/billing.js';
import { getUser, isConfigured } from '../features/auth.js';
import { createFocusTrap } from './focus-trap.js';

const FEATURES = {
    notes: {
        eyebrow: 'NOTES',
        headline: 'The full Notes workspace.',
        body: 'Multi-note workspace, templates, search, voice dictation, and exports — all under Pro.',
    },
    overview: {
        eyebrow: 'PROFILE — OVERVIEW',
        headline: 'Your full account dashboard.',
        body: 'Identity card, cosmic signature, and the at-a-glance KPIs that show how the app sees your focus year.',
    },
    tasks: {
        eyebrow: 'PROFILE — TASKS',
        headline: 'Deep task analytics.',
        body: 'Per-day throughput, day-of-week and hour breakdowns, efficiency, and tasks-per-session ratios.',
    },
    sounds: {
        eyebrow: 'PROFILE — SOUNDS',
        headline: 'Which sounds actually deepen your focus.',
        body: 'Cohen\'s d effect sizes on focus quality by sound — the single most surprising number in the app.',
    },
    insights: {
        eyebrow: 'PROFILE — INSIGHTS',
        headline: 'Plain-English insights.',
        body: 'Regression trends, week-over-week deltas, anomaly callouts, and the friction-cost estimate of tab-switching during focus.',
    },
    spotify: {
        eyebrow: 'MUSIC',
        headline: 'Connect Spotify.',
        body: 'Control playback from the focus screen and log what fuels your deepest focus into Insights. Coming with Pro.',
    },
    youtube: {
        eyebrow: 'MUSIC',
        headline: 'Connect YouTube Music.',
        body: 'Same shape as Spotify — control playback from focus and log what works.',
    },
    apple: {
        eyebrow: 'MUSIC',
        headline: 'Connect Apple Music.',
        body: 'Same shape — control playback from focus and log what works.',
    },
    generic: {
        eyebrow: 'COSMIC FOCUS',
        headline: 'Cosmic Focus Pro.',
        body: 'The full cosmos. Without limits.',
    },
};

const FEATURE_LIST = [
    '✓ The full Notes workspace — multi-note, templates, search, voice, exports',
    '✓ Deep analytics — Overview, Tasks, Sounds, Insights with plain-English narratives',
    '✓ Spotify, YouTube Music, Apple Music integrations (coming)',
    '✓ Sync across all your devices (coming)',
];

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

let modalEl = null;
let trap = null;
let isOpen = false;

/** Open the upgrade modal. `feature` chooses the headline copy. */
export function showUpgradeModal({ feature = 'generic' } = {}) {
    if (isPro()) return; // already paid — nothing to upgrade to
    if (!modalEl) build();
    paint(feature);
    open();
}

// ────────────────────────────────────────────────────────────────────────────
// Build / paint
// ────────────────────────────────────────────────────────────────────────────

function build() {
    modalEl = document.createElement('div');
    modalEl.className = 'upgrade-modal';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-label', 'Upgrade to Pro');
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.innerHTML = `
        <div class="upgrade-modal__scrim" data-upgrade-close></div>
        <div class="upgrade-modal__sheet">
            <button class="upgrade-modal__close" type="button"
                    aria-label="Close" data-upgrade-close>×</button>
            <div class="upgrade-modal__head">
                <span class="upgrade-modal__eyebrow" data-eyebrow></span>
                <h2 class="upgrade-modal__headline" data-headline></h2>
                <p class="upgrade-modal__body" data-body></p>
            </div>
            <div class="upgrade-modal__plans">
                <button class="upgrade-modal__plan" type="button" data-plan="monthly">
                    <span class="upgrade-modal__plan-price">€5</span>
                    <span class="upgrade-modal__plan-cadence">per month, incl. VAT</span>
                    <span class="upgrade-modal__plan-fine">cancel anytime</span>
                </button>
                <button class="upgrade-modal__plan upgrade-modal__plan--featured"
                        type="button" data-plan="yearly">
                    <span class="upgrade-modal__plan-tag">save a month</span>
                    <span class="upgrade-modal__plan-price">€55</span>
                    <span class="upgrade-modal__plan-cadence">per year, incl. VAT</span>
                    <span class="upgrade-modal__plan-fine">~€4.58 / mo</span>
                </button>
            </div>
            <p class="upgrade-modal__trial" data-trial-line>
                Both plans start with a <strong>7-day free trial</strong>. After the trial, the chosen plan renews automatically each billing cycle until cancelled.
            </p>
            <ul class="upgrade-modal__features">
                ${FEATURE_LIST.map((f) => `<li>${escapeHtml(f.replace('✓ ', ''))}</li>`).join('')}
            </ul>
            <div class="upgrade-modal__disclosure">
                <p>
                    Prices for EU consumers include applicable VAT at your country's rate. EU business customers can enter a VAT ID at checkout for reverse-charge handling where eligible. Cancel anytime in <em>Settings → Account → Manage subscription</em>; Pro features remain active until the end of the current billing period. Payment is processed by Stripe Payments Europe, Ltd.
                </p>
                <p>
                    By subscribing you agree to immediate performance and acknowledge that, under §356(5) BGB, your statutory 14-day right of withdrawal expires the moment Pro features are activated. You can still cancel the subscription contractually at any time as described above.
                </p>
                <p class="upgrade-modal__legal-links">
                    <a href="/terms.html" target="_blank" rel="noopener">Terms</a>
                    ·
                    <a href="/privacy.html" target="_blank" rel="noopener">Privacy</a>
                    ·
                    <a href="/widerrufsbelehrung.html" target="_blank" rel="noopener">Right of Withdrawal</a>
                    ·
                    <a href="/impressum.html" target="_blank" rel="noopener">Impressum</a>
                </p>
            </div>
            <p class="upgrade-modal__error" data-error hidden></p>
            <p class="upgrade-modal__signin" data-signin-line hidden>
                <button type="button" class="upgrade-modal__signin-btn"
                        data-action="signin">Sign in</button>
                first to start your trial — your tier travels with your account.
            </p>
        </div>
    `;
    document.body.appendChild(modalEl);

    modalEl.querySelectorAll('[data-upgrade-close]').forEach((el) =>
        el.addEventListener('click', close)
    );

    modalEl.querySelectorAll('[data-plan]').forEach((btn) =>
        btn.addEventListener('click', () => onPlanClick(btn.dataset.plan))
    );

    modalEl.querySelector('[data-action="signin"]')?.addEventListener('click', () => {
        close();
        // The account satellite owns the auth modal.
        document.querySelector('.account-satellite')?.click();
    });

    document.addEventListener('keydown', (e) => {
        if (!isOpen) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            close();
        }
    });
}

function paint(featureKey) {
    const f = FEATURES[featureKey] || FEATURES.generic;
    modalEl.querySelector('[data-eyebrow]').textContent = f.eyebrow;
    modalEl.querySelector('[data-headline]').textContent = f.headline;
    modalEl.querySelector('[data-body]').textContent = f.body;
    modalEl.querySelector('[data-error]').hidden = true;

    // If the user isn't signed in, swap the "trial" line for a sign-in
    // prompt — Stripe Checkout needs an authed user_id to attach the
    // subscription to.
    const signedIn = isConfigured() && Boolean(getUser());
    modalEl.querySelector('[data-signin-line]').hidden = signedIn;
    modalEl.querySelector('[data-trial-line]').hidden = !signedIn;
    modalEl.querySelectorAll('[data-plan]').forEach((btn) => {
        btn.disabled = !signedIn;
    });
}

// ────────────────────────────────────────────────────────────────────────────
// Show / hide
// ────────────────────────────────────────────────────────────────────────────

function open() {
    isOpen = true;
    modalEl.setAttribute('aria-hidden', 'false');
    modalEl.classList.add('is-open');
    if (!trap) trap = createFocusTrap(modalEl);
    trap.activate(document.activeElement);
}

function close() {
    if (!isOpen) return;
    isOpen = false;
    modalEl.classList.remove('is-open');
    modalEl.setAttribute('aria-hidden', 'true');
    trap?.deactivate();
}

// ────────────────────────────────────────────────────────────────────────────
// Plan click → Stripe Checkout
// ────────────────────────────────────────────────────────────────────────────

async function onPlanClick(plan) {
    if (!plan) return;
    const errEl = modalEl.querySelector('[data-error]');
    errEl.hidden = true;
    // Disable both buttons while we hit the edge function.
    modalEl.querySelectorAll('[data-plan]').forEach((b) => (b.disabled = true));
    try {
        await startCheckout(plan);
        // startCheckout redirects on success; this line only runs on
        // unexpected resolve (shouldn't happen).
    } catch (err) {
        console.warn('[upgrade] checkout failed:', err);
        errEl.textContent = 'Something went wrong starting checkout. Please try again in a moment.';
        errEl.hidden = false;
        modalEl.querySelectorAll('[data-plan]').forEach((b) => (b.disabled = false));
    }
}
