// account.js — wires the account satellite, dropdown, and auth modal.
//
// The trigger lives in #accountTrigger. The dropdown lives in
// #accountDropdown. The auth modal lives in #authModal. All three are
// populated/managed from this single module.
//
// Auth state flows in via auth.onChange — this module reflects that
// state into the trigger's class set and the dropdown's contents. It
// never owns auth state itself.

import { isReducedMotion } from '../core/motion.js';
import * as auth from '../features/auth.js';
import { createFocusTrap } from './focus-trap.js';

let initialised = false;

let trigger = null;
let tooltipEl = null;
let dropdown = null;
let dropdownInner = null;
let modal = null;
let modalCard = null;
let modalTrap = null;

let dropdownOpen = false;
let modalOpen = false;
let mode = 'signin'; // 'signin' | 'signup' inside the modal

let currentUser = null;

// ═══════════════════════════════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════════════════════════════

export function initAccount() {
    if (initialised) return;
    initialised = true;

    trigger = document.getElementById('accountTrigger');
    dropdown = document.getElementById('accountDropdown');
    dropdownInner = dropdown?.querySelector('.account-dropdown__inner');
    modal = document.getElementById('authModal');
    modalCard = document.getElementById('authModalCard');
    if (!trigger || !dropdown || !modal || !modalCard) return;

    // Build the satellite tooltip lazily (one DOM node, reused).
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'account-satellite__tooltip';
    tooltipEl.innerHTML = `
        <span class="account-satellite__tooltip-name"></span>
        <span class="account-satellite__tooltip-sub"></span>
    `;
    trigger.appendChild(tooltipEl);
    syncTooltip();

    // Proximity glow — same pattern the settings star uses.
    setupProximityGlow(trigger);

    // Trigger click → toggle dropdown.
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dropdownOpen) closeDropdown();
        else openDropdown();
    });

    // Dropdown close handlers.
    document.addEventListener('click', (e) => {
        if (!dropdownOpen) return;
        if (dropdown.contains(e.target) || trigger.contains(e.target)) return;
        closeDropdown();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dropdownOpen) closeDropdown();
    });
    window.addEventListener('resize', () => {
        if (dropdownOpen) anchorDropdown();
    });
    window.addEventListener('scroll', () => {
        if (dropdownOpen) anchorDropdown();
    }, true);

    // Auth modal close handlers (set up once; re-used for every open).
    modal.querySelector('.auth-modal__scrim')?.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOpen) closeModal();
    });

    // Wire to auth state. The first call fires synchronously (queueMicrotask
    // in auth.onChange) so the trigger is correct from the start.
    auth.onChange(({ user }) => {
        currentUser = user || null;
        renderTriggerState();
        if (dropdownOpen) renderDropdownContent();
    });

    // Best-effort initial session restore. No-op if not configured.
    auth.init();
}

// ═══════════════════════════════════════════════════════════════════════════
// Trigger state
// ═══════════════════════════════════════════════════════════════════════════

function renderTriggerState() {
    if (!trigger) return;
    if (currentUser) {
        trigger.classList.remove('is-signed-out');
        trigger.classList.add('is-signed-in');
        const initial = (currentUser.user_metadata?.name ||
                         currentUser.email ||
                         '?').trim().charAt(0).toUpperCase();
        const initialEl = trigger.querySelector('.account-satellite__initial');
        if (initialEl) initialEl.textContent = initial;
        const avatar = currentUser.user_metadata?.avatar_url;
        const imgEl = trigger.querySelector('.account-satellite__avatar');
        if (avatar && imgEl) {
            // If the avatar URL fails to load (CSP block, expired Google
            // CDN signature, network), drop has-avatar so the glyph
            // shows instead of the broken-image placeholder.
            imgEl.onerror = () => {
                trigger.classList.remove('has-avatar');
                imgEl.removeAttribute('src');
            };
            imgEl.onload = () => trigger.classList.add('has-avatar');
            imgEl.src = avatar;
        } else {
            trigger.classList.remove('has-avatar');
            if (imgEl) imgEl.removeAttribute('src');
        }
        trigger.setAttribute('aria-label',
            `Account — ${currentUser.user_metadata?.name || currentUser.email}`);
    } else {
        trigger.classList.remove('is-signed-in', 'has-avatar');
        trigger.classList.add('is-signed-out');
        trigger.setAttribute('aria-label', 'Sign in');
    }
    syncTooltip();
}

function syncTooltip() {
    if (!tooltipEl) return;
    const nameEl = tooltipEl.querySelector('.account-satellite__tooltip-name');
    const subEl = tooltipEl.querySelector('.account-satellite__tooltip-sub');
    if (currentUser) {
        const meta = currentUser.user_metadata || {};
        const name = meta.name || 'Signed in';
        const username = meta.username || '';
        if (nameEl) nameEl.textContent = name;
        // If a username is set, the bottom line shows "@username" as a
        // distinct identifier. If not, the bottom line is hidden — the
        // top line (name) is enough on its own. Email is intentionally
        // not shown in the tooltip; that's profile-detail territory and
        // belongs in the dropdown.
        if (subEl) {
            if (username) {
                subEl.textContent = `@${username}`;
                subEl.hidden = false;
            } else {
                subEl.textContent = '';
                subEl.hidden = true;
            }
        }
    } else {
        if (nameEl) nameEl.textContent = 'Sign in';
        if (subEl) {
            subEl.textContent = 'your universe, anywhere';
            subEl.hidden = false;
        }
    }
}

function obscureEmail(email) {
    // "abduh@example.com" → "abduh@…com"
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    const tld = domain.split('.').pop() || '';
    return `${local}@…${tld}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Dropdown
// ═══════════════════════════════════════════════════════════════════════════

function openDropdown() {
    if (!dropdown || dropdownOpen) return;
    dropdownOpen = true;
    renderDropdownContent();
    dropdown.classList.remove('hidden');
    dropdown.setAttribute('aria-hidden', 'false');
    trigger.classList.add('is-open');
    anchorDropdown();
    requestAnimationFrame(() => dropdown.classList.add('is-open'));
}

function closeDropdown() {
    if (!dropdown || !dropdownOpen) return;
    dropdownOpen = false;
    dropdown.classList.remove('is-open');
    trigger.classList.remove('is-open');
    setTimeout(() => {
        if (!dropdownOpen) {
            dropdown.classList.add('hidden');
            dropdown.setAttribute('aria-hidden', 'true');
        }
    }, 240);
}

function anchorDropdown() {
    if (!dropdown || !trigger) return;
    const rect = trigger.getBoundingClientRect();
    const dropW = 268;
    // Centre under the trigger, but keep within viewport with 12px gutters.
    const cx = rect.left + rect.width / 2;
    let left = cx - dropW / 2;
    const maxLeft = window.innerWidth - dropW - 12;
    if (left < 12) left = 12;
    if (left > maxLeft) left = maxLeft;
    const top = rect.bottom + 4;
    dropdown.style.left = `${left}px`;
    dropdown.style.top = `${top}px`;

    // Move the arrow so it visually points up at the trigger centre.
    const arrow = dropdown.querySelector('.account-dropdown__arrow');
    if (arrow) {
        const arrowLeft = cx - left;
        arrow.style.left = `${arrowLeft}px`;
    }
}

function renderDropdownContent() {
    if (!dropdownInner) return;
    if (currentUser) renderSignedInDropdown();
    else renderSignedOutDropdown();
}

function renderSignedOutDropdown() {
    dropdownInner.innerHTML = `
        <div>
            <h3 class="account-dropdown__intro-title">Sign in to Cosmic Focus</h3>
            <p class="account-dropdown__intro-body">
                Keep your tasks, stats, and constellations in sync across every device.
            </p>
        </div>
        <button class="account-dropdown__btn account-dropdown__btn--primary" data-action="signin">Sign in</button>
        <button class="account-dropdown__btn" data-action="signup">Create account</button>
    `;
    dropdownInner.querySelector('[data-action="signin"]')?.addEventListener('click', () => {
        closeDropdown();
        openModal('signin');
    });
    dropdownInner.querySelector('[data-action="signup"]')?.addEventListener('click', () => {
        closeDropdown();
        openModal('signup');
    });
}

function renderSignedInDropdown() {
    const name = currentUser.user_metadata?.name || 'Signed in';
    const email = currentUser.email || '';
    const initial = name.trim().charAt(0).toUpperCase() || '?';
    const avatar = currentUser.user_metadata?.avatar_url;
    // The avatar shows the user's uploaded image when present; otherwise
    // the universal account glyph (matching the satellite).
    const glyphSvg = `<svg class="account-dropdown__avatar-glyph" viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="8" cy="6" r="2.6"/>
        <path d="M3 13.5c0-2.5 2.2-4 5-4s5 1.5 5 4"/>
    </svg>`;
    // referrerpolicy + crossorigin keep Google's avatar CDN happy. Failed
    // loads fall back to the glyph via the error listener wired below.
    const avatarSlot = avatar
        ? `<img class="account-dropdown__avatar-img" src="${escapeAttr(avatar)}"
                alt="" referrerpolicy="no-referrer" crossorigin="anonymous">`
        : glyphSvg;
    dropdownInner.innerHTML = `
        <div class="account-dropdown__header">
            <div class="account-dropdown__avatar">
                ${avatarSlot}
            </div>
            <div class="account-dropdown__identity">
                <span class="account-dropdown__name">${escapeHtml(name)}</span>
                <span class="account-dropdown__email">${escapeHtml(email)}</span>
            </div>
        </div>
        <button class="account-dropdown__row" data-action="profile">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="8" cy="6" r="2.6"/>
                <path d="M3 13.5c0-2.5 2.2-4 5-4s5 1.5 5 4"/>
            </svg>
            Profile
        </button>
        <button class="account-dropdown__row" data-action="sync" disabled style="opacity:.65;cursor:default;">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M2 8a6 6 0 1 0 1.4-3.8"/>
                <polyline points="2 2 2 5 5 5"/>
            </svg>
            Sync across devices
            <span class="account-dropdown__sync-state">soon</span>
        </button>
        <div class="account-dropdown__divider"></div>
        <button class="account-dropdown__row account-dropdown__row--danger" data-action="signout">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M10.5 12V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h6.5a1 1 0 0 1 1 1v2"/>
                <polyline points="13 11 16 8 13 5"/>
                <line x1="16" y1="8" x2="6" y2="8"/>
            </svg>
            Sign out
        </button>
    `;
    // If the avatar image failed to load (broken / expired URL / CSP),
    // swap it for the glyph fallback in place.
    const avatarImg = dropdownInner.querySelector('.account-dropdown__avatar-img');
    if (avatarImg) {
        avatarImg.addEventListener('error', () => {
            const slot = avatarImg.parentElement;
            if (slot) slot.innerHTML = glyphSvg;
        }, { once: true });
    }
    dropdownInner.querySelector('[data-action="signout"]')?.addEventListener('click', async () => {
        try {
            await auth.signOut();
            closeDropdown();
        } catch (e) {
            console.error('[account] sign out failed:', e);
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// Auth modal
// ═══════════════════════════════════════════════════════════════════════════

function openModal(initialMode = 'signin') {
    if (!modal || modalOpen) return;
    modalOpen = true;
    mode = initialMode;
    renderModal();
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    if (!modalTrap) modalTrap = createFocusTrap(modal);
    modalTrap.activate(trigger);
}

function closeModal() {
    if (!modal || !modalOpen) return;
    modalOpen = false;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    modalTrap?.deactivate();
}

function renderModal() {
    if (!modalCard) return;

    if (!auth.isConfigured()) {
        renderConfigNotice();
        return;
    }

    const isSignIn = mode === 'signin';
    modalCard.innerHTML = `
        <button class="auth-modal__close" type="button" aria-label="Close" data-auth-close>×</button>
        <div class="auth-toggle ${isSignIn ? '' : 'is-signup'}" role="tablist">
            <span class="auth-toggle__pill" aria-hidden="true"></span>
            <button class="auth-toggle__btn ${isSignIn ? 'is-active' : ''}" data-mode="signin" role="tab">Sign in</button>
            <button class="auth-toggle__btn ${isSignIn ? '' : 'is-active'}" data-mode="signup" role="tab">Create account</button>
        </div>
        <h2 class="auth-modal__title">${isSignIn ? 'Welcome back' : 'Create your account'}</h2>
        <p class="auth-modal__subtitle">${isSignIn
            ? 'Sign in to Cosmic Focus.'
            : 'We’ll send a confirmation link to verify your email.'}</p>

        <div class="auth-error" id="authError" hidden></div>

        <form id="authForm" novalidate>
            ${isSignIn ? '' : `
            <label class="auth-field">
                <span class="auth-field__label">Name</span>
                <input class="auth-field__input" type="text" id="authName"
                       placeholder="Your name"
                       autocomplete="given-name"
                       maxlength="60" required>
            </label>
            <label class="auth-field">
                <span class="auth-field__label">Username
                    <span class="auth-field__hint">optional</span>
                </span>
                <input class="auth-field__input" type="text" id="authUsername"
                       placeholder="@handle (optional)"
                       autocomplete="username"
                       maxlength="30" pattern="[A-Za-z0-9._-]+">
            </label>
            `}
            <label class="auth-field">
                <span class="auth-field__label">Email</span>
                <input class="auth-field__input" type="email" id="authEmail"
                       placeholder="you@example.com"
                       autocomplete="email" required>
            </label>
            <label class="auth-field">
                <span class="auth-field__label">Password
                    ${isSignIn ? '' : '<span class="auth-field__hint">8+ characters</span>'}
                </span>
                <input class="auth-field__input" type="password" id="authPassword"
                       placeholder="••••••••"
                       autocomplete="${isSignIn ? 'current-password' : 'new-password'}"
                       minlength="8" required>
            </label>
            <button class="auth-modal__primary" type="submit" id="authSubmit">
                ${isSignIn ? 'Sign in' : 'Create account'}
            </button>
            <div class="auth-alt">
                ${isSignIn
                    ? '<button type="button" class="auth-alt__link" data-action="forgot">Forgot password?</button><span class="auth-alt__dot">·</span><button type="button" class="auth-alt__link" data-action="magic">Email me a sign-in link</button>'
                    : '<button type="button" class="auth-alt__link" data-action="magic">Or sign up with a magic link</button>'}
            </div>
        </form>

        <div class="auth-divider">or</div>

        <div class="auth-oauth">
            <button class="auth-oauth__btn" type="button" data-oauth="google">
                <svg class="auth-oauth__icon" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M15.7 8.2c0-.6 0-1.1-.1-1.6H8v3h4.3c-.2 1-.7 1.8-1.6 2.3v1.9h2.5c1.5-1.4 2.5-3.4 2.5-5.6z" fill="#4285F4"/>
                    <path d="M8 16c2.2 0 4-.7 5.3-2l-2.5-1.9c-.7.5-1.6.8-2.7.8-2.1 0-3.9-1.4-4.5-3.3H1v2c1.3 2.6 4 4.4 7 4.4z" fill="#34A853"/>
                    <path d="M3.5 9.6c-.2-.5-.3-1-.3-1.6s.1-1.1.3-1.6V4.4H1C.4 5.5 0 6.7 0 8s.4 2.5 1 3.6l2.5-2z" fill="#FBBC05"/>
                    <path d="M8 3.2c1.2 0 2.3.4 3.1 1.2l2.3-2.3C12 .8 10.2 0 8 0 5 0 2.3 1.8 1 4.4l2.5 2C4.1 4.6 5.9 3.2 8 3.2z" fill="#EA4335"/>
                </svg>
                Continue with Google
            </button>
        </div>

        <p class="auth-modal__footnote">
            By continuing you agree to the
            <a href="/terms.html" target="_blank" rel="noopener">Terms</a> and
            <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.
        </p>
    `;
    bindModalEvents();
    // Focus the first input (Name on sign-up, Email on sign-in).
    setTimeout(() => modalCard.querySelector('.auth-field__input')?.focus(), 80);
}

function renderConfigNotice() {
    modalCard.innerHTML = `
        <button class="auth-modal__close" type="button" aria-label="Close" data-auth-close>×</button>
        <h2 class="auth-modal__title">Almost there</h2>
        <p class="auth-modal__subtitle">
            Authentication isn't fully configured yet — the project still
            needs a Supabase URL and anon key.
        </p>
        <div class="auth-modal__notice">
            <p style="margin:0 0 6px;">Edit <code>js/features/auth-config.js</code> and set:</p>
            <p style="margin:0 0 4px;"><code>SUPABASE_URL</code> — your project URL</p>
            <p style="margin:0;"><code>SUPABASE_ANON_KEY</code> — the public anon key</p>
        </div>
        <p class="auth-modal__footnote" style="margin-top:18px;">
            Both values are public; row-level security on Supabase is what
            protects user data. Don't paste a service-role key.
        </p>
    `;
    modalCard.querySelectorAll('[data-auth-close]').forEach((el) =>
        el.addEventListener('click', closeModal)
    );
}

function bindModalEvents() {
    modalCard.querySelectorAll('[data-auth-close]').forEach((el) =>
        el.addEventListener('click', closeModal)
    );
    modalCard.querySelectorAll('.auth-toggle__btn').forEach((btn) =>
        btn.addEventListener('click', () => {
            mode = btn.dataset.mode;
            renderModal();
        })
    );
    modalCard.querySelector('#authForm')?.addEventListener('submit', handlePasswordSubmit);
    modalCard.querySelector('[data-action="magic"]')?.addEventListener('click', handleMagicLink);
    modalCard.querySelector('[data-action="forgot"]')?.addEventListener('click', handleForgotPassword);
    modalCard.querySelectorAll('[data-oauth]').forEach((btn) =>
        btn.addEventListener('click', () => handleOAuth(btn.dataset.oauth))
    );
}

function readForm() {
    return {
        nameEl: modalCard.querySelector('#authName'),
        usernameEl: modalCard.querySelector('#authUsername'),
        emailEl: modalCard.querySelector('#authEmail'),
        passwordEl: modalCard.querySelector('#authPassword'),
        submitEl: modalCard.querySelector('#authSubmit'),
        errorEl: modalCard.querySelector('#authError'),
    };
}

/** Strip the leading "@" if a user types it into the username field —
 *  we display the handle with an @ prefix in the tooltip, but store
 *  it raw. Lowercase to keep it canonical. */
function normaliseUsername(raw) {
    if (!raw) return '';
    return raw.trim().replace(/^@/, '').toLowerCase();
}

function showError(msg) {
    const errorEl = modalCard.querySelector('#authError');
    if (!errorEl) return;
    errorEl.hidden = !msg;
    errorEl.textContent = msg || '';
}

/** Email + password — sign-in or sign-up depending on the toggle.
 *  Sign-up also collects display name (required) and username (optional)
 *  and stores them in Supabase user_metadata. */
async function handlePasswordSubmit(e) {
    e.preventDefault();
    const { nameEl, usernameEl, emailEl, passwordEl, submitEl } = readForm();
    const email = emailEl?.value.trim();
    const password = passwordEl?.value || '';
    showError(null);
    if (!email) {
        showError('Enter your email.');
        emailEl?.focus();
        return;
    }
    if (password.length < 8) {
        showError('Password must be at least 8 characters.');
        passwordEl?.focus();
        return;
    }
    const isSignIn = mode === 'signin';
    if (!isSignIn) {
        const name = nameEl?.value.trim();
        if (!name) {
            showError('Tell us your name.');
            nameEl?.focus();
            return;
        }
        // Username is optional — but if provided, validate it has no spaces
        // and is short enough. Pattern attribute on the input handles
        // characters; we just check length here.
        const username = normaliseUsername(usernameEl?.value);
        if (username && (username.length < 2 || username.length > 30)) {
            showError('Username must be between 2 and 30 characters.');
            usernameEl?.focus();
            return;
        }
    }
    submitEl.disabled = true;
    const original = submitEl.textContent;
    submitEl.textContent = isSignIn ? 'Signing in…' : 'Creating account…';
    try {
        if (isSignIn) {
            await auth.signInWithPassword(email, password);
            closeModal();
        } else {
            const name = nameEl?.value.trim();
            const username = normaliseUsername(usernameEl?.value);
            const { confirmationRequired } = await auth.signUpWithPassword(
                email,
                password,
                { name, username },
            );
            if (confirmationRequired) {
                renderConfirmation(email, 'signup');
            } else {
                closeModal();
            }
        }
    } catch (err) {
        showError(humaniseAuthError(err, isSignIn));
        submitEl.disabled = false;
        submitEl.textContent = original;
    }
}

/** Send a magic link instead of using a password. */
async function handleMagicLink() {
    const { emailEl } = readForm();
    const email = emailEl?.value.trim();
    showError(null);
    if (!email) {
        showError('Enter your email first.');
        emailEl?.focus();
        return;
    }
    try {
        await auth.signInWithMagicLink(email);
        renderConfirmation(email, 'magic');
    } catch (err) {
        showError(err?.message || 'Could not send the link. Try again.');
    }
}

/** Send a password-reset email. */
async function handleForgotPassword() {
    const { emailEl } = readForm();
    const email = emailEl?.value.trim();
    showError(null);
    if (!email) {
        showError('Enter your email so we know who to send the reset to.');
        emailEl?.focus();
        return;
    }
    try {
        await auth.sendPasswordReset(email);
        renderConfirmation(email, 'reset');
    } catch (err) {
        showError(err?.message || 'Could not send the reset email. Try again.');
    }
}

/** Translate Supabase error messages into something friendlier. */
function humaniseAuthError(err, isSignIn) {
    const msg = String(err?.message || '');
    if (/invalid login credentials/i.test(msg)) {
        return 'Email or password is incorrect.';
    }
    if (/email not confirmed/i.test(msg)) {
        return 'Please confirm your email first — check your inbox for the link we sent.';
    }
    if (/already registered|already exists/i.test(msg)) {
        return 'An account with this email already exists. Try signing in instead.';
    }
    if (/rate limit/i.test(msg)) {
        return 'Too many attempts. Wait a minute and try again.';
    }
    return msg || (isSignIn ? 'Could not sign you in. Try again.' : 'Could not create the account. Try again.');
}

async function handleOAuth(provider) {
    const errorEl = modalCard.querySelector('#authError');
    if (errorEl) { errorEl.hidden = true; errorEl.textContent = ''; }
    try {
        await auth.signInWithOAuth(provider);
        // OAuth redirects away — nothing more to do here.
    } catch (err) {
        if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent = err?.message || 'Could not start sign-in.';
        }
    }
}

function renderConfirmation(email, kind /* 'signup' | 'magic' | 'reset' */) {
    const copy = {
        signup: {
            title: 'Confirm your email',
            body: 'We sent a confirmation link to',
            tail: 'Click it to verify your account, then come back to sign in.',
        },
        magic: {
            title: 'Check your inbox',
            body: 'We sent a sign-in link to',
            tail: 'Click it from this device to finish signing in.',
        },
        reset: {
            title: 'Reset link sent',
            body: 'We sent a password-reset link to',
            tail: 'Click it to choose a new password.',
        },
    }[kind] || {
        title: 'Check your inbox',
        body: 'We sent a link to',
        tail: 'Click it to continue.',
    };
    modalCard.innerHTML = `
        <button class="auth-modal__close" type="button" aria-label="Close" data-auth-close>×</button>
        <div class="auth-confirm">
            <div class="auth-confirm__envelope">
                <svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="4" y="8" width="24" height="16" rx="2"/>
                    <polyline points="4 10 16 18 28 10"/>
                </svg>
            </div>
            <h2 class="auth-confirm__title">${copy.title}</h2>
            <p class="auth-confirm__body">
                ${copy.body}
                <span class="auth-confirm__email">${escapeHtml(email)}</span>.
                ${copy.tail}
            </p>
            <button class="auth-confirm__back" type="button" data-back>Use a different email</button>
        </div>
    `;
    modalCard.querySelectorAll('[data-auth-close]').forEach((el) =>
        el.addEventListener('click', closeModal)
    );
    modalCard.querySelector('[data-back]')?.addEventListener('click', renderModal);
}

// ═══════════════════════════════════════════════════════════════════════════
// Proximity glow (lifted from settings.js — keep behaviour identical)
// ═══════════════════════════════════════════════════════════════════════════

function setupProximityGlow(btn) {
    const OUTER_RADIUS = 250;
    let rafId = null;
    let mouseX = -9999;
    let mouseY = -9999;

    function update() {
        if (isReducedMotion()) {
            btn.style.setProperty('--glow', '0');
            rafId = null;
            return;
        }
        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(mouseX - cx, mouseY - cy);
        const t = 1 - Math.min(1, Math.max(0, dist / OUTER_RADIUS));
        btn.style.setProperty('--glow', (t * t).toFixed(3));
        rafId = null;
    }

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (!rafId) rafId = requestAnimationFrame(update);
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
        mouseX = -9999;
        mouseY = -9999;
        btn.style.setProperty('--glow', '0');
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════════

function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = String(s ?? '');
    return div.innerHTML;
}
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }

// ═══════════════════════════════════════════════════════════════════════════
// Sync indicator (placeholder for Phase 2)
// ═══════════════════════════════════════════════════════════════════════════

/** External hook so the future sync layer can flag the satellite. */
export function setSyncState(state) {
    if (!trigger) return;
    trigger.classList.toggle('is-syncing', state === 'syncing');
    trigger.classList.toggle('is-sync-error', state === 'error');
}
