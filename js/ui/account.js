// account.js — wires the account satellite, dropdown, and auth modal.
//
// The trigger lives in #accountTrigger. The dropdown lives in
// #accountDropdown. The auth modal lives in #authModal. All three are
// populated/managed from this single module.
//
// Auth state flows in via auth.onChange — this module reflects that
// state into the trigger's class set and the dropdown's contents. It
// never owns auth state itself.
//
// SECURITY / ROBUSTNESS NOTES:
//   • Every user-visible string from `currentUser.user_metadata` runs
//     through escapeHtml before reaching innerHTML. textContent is used
//     wherever possible.
//   • Avatar URLs are protocol-validated (https only) before going into
//     <img src>. javascript:/data:/file: URLs are rejected.
//   • Submit buttons set an in-flight flag synchronously before any
//     await — guards against double-click double-submit.
//   • Magic-link / forgot-password are throttled to once per 4s in the
//     UI in addition to Supabase's server-side rate limiting.
//   • All error messages route through humaniseAuthError → typed `code`
//     → safe copy. Raw Supabase strings never reach the user.
//   • Modal opening sets `inert` on background containers so screen
//     readers can't tab into the cosmos behind it.

import { isReducedMotion } from '../core/motion.js';
import * as auth from '../features/auth.js';
import { evaluatePassword, validatePassword } from '../features/password-policy.js';
import { createFocusTrap } from './focus-trap.js';
import { openProfile } from './profile.js';

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
        const meta = currentUser.user_metadata || {};
        const displayName = meta.name || currentUser.email || 'Account';
        const initial = (meta.name || currentUser.email || '?')
            .trim().charAt(0).toUpperCase();
        const initialEl = trigger.querySelector('.account-satellite__initial');
        if (initialEl) initialEl.textContent = initial;
        const safeAvatarUrl = sanitiseAvatarUrl(meta.avatar_url);
        const imgEl = trigger.querySelector('.account-satellite__avatar');
        if (safeAvatarUrl && imgEl) {
            // If the avatar URL fails to load (CSP block, expired Google
            // CDN signature, network), drop has-avatar so the glyph
            // shows instead of the broken-image placeholder.
            imgEl.onerror = () => {
                trigger.classList.remove('has-avatar');
                imgEl.removeAttribute('src');
            };
            imgEl.onload = () => trigger.classList.add('has-avatar');
            imgEl.src = safeAvatarUrl;
        } else {
            trigger.classList.remove('has-avatar');
            if (imgEl) imgEl.removeAttribute('src');
        }
        // setAttribute auto-encodes attribute values, so user-controlled
        // displayName is safe here. Cap length so the accessible name
        // doesn't become a paragraph.
        trigger.setAttribute('aria-label',
            `Account — ${displayName.slice(0, 80)}`);
    } else {
        trigger.classList.remove('is-signed-in', 'has-avatar');
        trigger.classList.add('is-signed-out');
        trigger.setAttribute('aria-label', 'Sign in');
    }
    syncTooltip();
}

/** Only allow https / http URLs for avatars. Rejects javascript:/data:/
 *  file: and any malformed URL so we never forward an attacker-supplied
 *  string to <img src>. Returns the URL string if safe, otherwise ''. */
function sanitiseAvatarUrl(url) {
    if (typeof url !== 'string' || url.length === 0 || url.length > 2048) return '';
    try {
        const u = new URL(url, window.location.href);
        if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
        return u.toString();
    } catch {
        return '';
    }
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
        <div class="account-dropdown__divider"></div>
        <button class="account-dropdown__row" data-action="profile">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="8" cy="8" r="6"/>
                <path d="M2 8h12M8 2v12M3.5 3.5l9 9M12.5 3.5l-9 9"/>
            </svg>
            Open Profile
            <span class="account-dropdown__sync-state">your analytics</span>
        </button>
        <button class="account-dropdown__row" data-action="notepad">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 2.5h7l3 3V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z"/>
                <path d="M9.5 2.5v3h3M5 8h6M5 10.5h6M5 5.5h2"/>
            </svg>
            Open notes
            <span class="account-dropdown__sync-state">press n</span>
        </button>
    `;
    dropdownInner.querySelector('[data-action="signin"]')?.addEventListener('click', () => {
        closeDropdown();
        openModal('signin');
    });
    dropdownInner.querySelector('[data-action="signup"]')?.addEventListener('click', () => {
        closeDropdown();
        openModal('signup');
    });
    dropdownInner.querySelector('[data-action="profile"]')?.addEventListener('click', () => {
        closeDropdown();
        openProfile();
    });
    dropdownInner.querySelector('[data-action="notepad"]')?.addEventListener('click', () => {
        closeDropdown();
        import('./notepad.js').then((m) => m.openNotepad?.());
    });
}

function renderSignedInDropdown() {
    const meta = currentUser.user_metadata || {};
    const name = meta.name || 'Signed in';
    const email = currentUser.email || '';
    const safeAvatar = sanitiseAvatarUrl(meta.avatar_url);
    // The avatar shows the user's uploaded image when present; otherwise
    // the universal account glyph (matching the satellite).
    const glyphSvg = `<svg class="account-dropdown__avatar-glyph" viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="8" cy="6" r="2.6"/>
        <path d="M3 13.5c0-2.5 2.2-4 5-4s5 1.5 5 4"/>
    </svg>`;
    // referrerpolicy + crossorigin keep Google's avatar CDN happy. Failed
    // loads fall back to the glyph via the error listener wired below.
    const avatarSlot = safeAvatar
        ? `<img class="account-dropdown__avatar-img" src="${escapeAttr(safeAvatar)}"
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
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="8" cy="8" r="6"/>
                <path d="M2 8h12M8 2v12M3.5 3.5l9 9M12.5 3.5l-9 9"/>
            </svg>
            Open Profile
            <span class="account-dropdown__sync-state">your analytics</span>
        </button>
        <button class="account-dropdown__row" data-action="notepad">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 2.5h7l3 3V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z"/>
                <path d="M9.5 2.5v3h3M5 8h6M5 10.5h6M5 5.5h2"/>
            </svg>
            Open notes
            <span class="account-dropdown__sync-state">press n</span>
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
    dropdownInner.querySelector('[data-action="profile"]')?.addEventListener('click', () => {
        closeDropdown();
        openProfile();
    });
    dropdownInner.querySelector('[data-action="notepad"]')?.addEventListener('click', () => {
        closeDropdown();
        import('./notepad.js').then((m) => m.openNotepad?.());
    });
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
    // Refuse to open the auth modal for an already-signed-in user. The
    // dropdown handles in-session profile actions; opening sign-in/up
    // while signed in is meaningless and risks confusing the SDK state.
    if (currentUser) return;
    modalOpen = true;
    mode = initialMode;
    renderModal();
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    setBackgroundInert(true);
    if (!modalTrap) modalTrap = createFocusTrap(modal);
    modalTrap.activate(trigger);
}

function closeModal() {
    if (!modal || !modalOpen) return;
    modalOpen = false;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    setBackgroundInert(false);
    modalTrap?.deactivate();
}

/** When the auth modal is open, mark the rest of the app as `inert`
 *  so screen readers and keyboard navigation can't tab into the cosmos
 *  behind the modal. The modal itself stays interactive. */
function setBackgroundInert(on) {
    const targets = [
        document.querySelector('.container'),
        document.querySelector('.nav-cluster'),
        document.querySelector('.cosmos-toolbar'),
        document.querySelector('.help-trigger'),
        document.querySelector('.settings-trigger'),
        document.getElementById('homeMiniTimer'),
        document.getElementById('hmtSliver'),
    ];
    for (const el of targets) {
        if (!el) continue;
        if (on) el.setAttribute('inert', '');
        else el.removeAttribute('inert');
    }
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
        <div class="auth-toggle ${isSignIn ? '' : 'is-signup'}" role="tablist" aria-label="Sign in or create an account">
            <span class="auth-toggle__pill" aria-hidden="true"></span>
            <button class="auth-toggle__btn ${isSignIn ? 'is-active' : ''}"
                    data-mode="signin" role="tab"
                    aria-selected="${isSignIn ? 'true' : 'false'}">Sign in</button>
            <button class="auth-toggle__btn ${isSignIn ? '' : 'is-active'}"
                    data-mode="signup" role="tab"
                    aria-selected="${isSignIn ? 'false' : 'true'}">Create account</button>
        </div>
        <h2 class="auth-modal__title">${isSignIn ? 'Welcome back' : 'Create your account'}</h2>
        <p class="auth-modal__subtitle">${isSignIn
            ? 'Sign in to Cosmic Focus.'
            : 'We’ll send a confirmation link to verify your email.'}</p>

        <div class="auth-error" id="authError" role="alert" aria-live="polite" hidden></div>

        <form id="authForm" novalidate aria-describedby="authError">
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
                    <span class="auth-field__hint" id="authUsernameStatus">optional</span>
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
            <label class="auth-field auth-field--password">
                <span class="auth-field__label">Password
                    ${isSignIn ? '' : '<span class="auth-field__hint">8+ characters</span>'}
                </span>
                <span class="auth-field__password">
                    <input class="auth-field__input" type="password" id="authPassword"
                           placeholder="••••••••"
                           autocomplete="${isSignIn ? 'current-password' : 'new-password'}"
                           minlength="8" required>
                    <button type="button" class="auth-field__eye" id="authShowPassword"
                            aria-label="Show password" aria-pressed="false">
                        <svg class="auth-field__eye-icon auth-field__eye-icon--show" viewBox="0 0 16 16" width="16" height="16"
                             fill="none" stroke="currentColor" stroke-width="1.5"
                             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/>
                            <circle cx="8" cy="8" r="2"/>
                        </svg>
                        <svg class="auth-field__eye-icon auth-field__eye-icon--hide" viewBox="0 0 16 16" width="16" height="16"
                             fill="none" stroke="currentColor" stroke-width="1.5"
                             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M2 2.5l11.5 11.5"/>
                            <path d="M6.7 4.3A6.5 6.5 0 0 1 8 4.2c4.4 0 6.8 4.3 6.8 4.3a14 14 0 0 1-2 2.4"/>
                            <path d="M3.4 5.5A14 14 0 0 0 1.2 8.5s2.4 4.3 6.8 4.3a6.4 6.4 0 0 0 2.5-.55"/>
                            <path d="M9.4 9.4a2 2 0 0 1-2.8-2.8"/>
                        </svg>
                    </button>
                </span>
                <span class="auth-field__caps-hint" id="authCapsHint" hidden role="status">
                    <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M6 2 L2 5.5 H4 V8.5 H8 V5.5 H10 Z"/>
                        <path d="M4 10 H8"/>
                    </svg>
                    Caps Lock is on
                </span>
                ${isSignIn ? '' : `
                <div class="auth-strength" id="authStrength" aria-live="polite">
                    <div class="auth-strength__meter" id="authStrengthMeter" data-score="0" aria-hidden="true">
                        <span></span><span></span><span></span><span></span>
                    </div>
                    <span class="auth-strength__label" id="authStrengthLabel"></span>
                </div>
                `}
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
    // Focus the first input on the form (Name on sign-up, Email on sign-in).
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
            <p style="margin:0 0 6px;">Edit <code>js/core/auth-config.js</code> and set:</p>
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
    // Password field — show/hide toggle, live strength meter (sign-up
    // only), Caps Lock detection.
    const passwordEl = modalCard.querySelector('#authPassword');
    if (passwordEl) {
        passwordEl.addEventListener('input', updateStrengthMeter);
        passwordEl.addEventListener('keydown', updateCapsLockHint);
        passwordEl.addEventListener('keyup', updateCapsLockHint);
        passwordEl.addEventListener('blur', () => {
            const hint = modalCard.querySelector('#authCapsHint');
            if (hint) hint.hidden = true;
        });
    }
    modalCard.querySelector('#authShowPassword')?.addEventListener('click', toggleShowPassword);
    // Live username availability — debounced to avoid hammering Supabase
    // every keystroke. The post-signup claim is the authoritative gate;
    // this is just a UX warm-up so the user knows before they hit submit.
    const usernameEl = modalCard.querySelector('#authUsername');
    if (usernameEl) {
        usernameEl.addEventListener('input', queueUsernameCheck);
        usernameEl.addEventListener('blur', queueUsernameCheck);
    }
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

/** Render a banner above the form. `kind === 'info'` swaps the alarming
 *  red palette for a warm-amber treatment, used for advisory messages
 *  like "this email already has an account, sign in instead". */
function showError(msg, kind = 'error') {
    const errorEl = modalCard.querySelector('#authError');
    if (!errorEl) return;
    errorEl.hidden = !msg;
    errorEl.textContent = msg || '';
    errorEl.classList.toggle('is-info', kind === 'info');
}

/** Live strength meter — sign-up only. Mirrors the password-policy
 *  evaluatePassword score onto a 4-bar meter via a data-score attribute,
 *  and writes the human label ("weak" / "fair" / etc.) next to it. */
function updateStrengthMeter() {
    if (mode !== 'signup') return;
    const passwordEl = modalCard.querySelector('#authPassword');
    const meterEl = modalCard.querySelector('#authStrengthMeter');
    const labelEl = modalCard.querySelector('#authStrengthLabel');
    if (!passwordEl || !meterEl) return;
    const password = passwordEl.value;
    if (!password) {
        meterEl.dataset.score = '0';
        if (labelEl) labelEl.textContent = '';
        return;
    }
    const { score, label } = evaluatePassword(password);
    meterEl.dataset.score = String(score);
    if (labelEl) labelEl.textContent = label;
}

/** Show a small "Caps Lock is on" badge next to the password field while
 *  Caps Lock is active. Saves users from a baffling "wrong password"
 *  rejection when their key is just stuck. */
function updateCapsLockHint(e) {
    const hintEl = modalCard.querySelector('#authCapsHint');
    if (!hintEl || typeof e.getModifierState !== 'function') return;
    hintEl.hidden = !e.getModifierState('CapsLock');
}

// Username availability — debounced live check. The status hint flips
// between optional / checking / available / taken / invalid.
let usernameCheckTimer = null;
let usernameCheckSeq = 0;
const USERNAME_DEBOUNCE_MS = 380;

function queueUsernameCheck() {
    const usernameEl = modalCard.querySelector('#authUsername');
    const statusEl = modalCard.querySelector('#authUsernameStatus');
    if (!usernameEl || !statusEl) return;
    const raw = (usernameEl.value || '').trim().replace(/^@+/, '').toLowerCase();
    if (usernameCheckTimer) clearTimeout(usernameCheckTimer);
    if (!raw) {
        setUsernameStatus('optional', null);
        return;
    }
    if (!/^[a-z0-9._-]{2,30}$/.test(raw)) {
        setUsernameStatus('2–30 letters / numbers / . _ -', 'invalid');
        return;
    }
    setUsernameStatus('checking…', 'checking');
    const seq = ++usernameCheckSeq;
    usernameCheckTimer = setTimeout(async () => {
        const result = await auth.isUsernameAvailable(raw);
        // Discard stale results — user typed more after the request fired.
        if (seq !== usernameCheckSeq) return;
        if (result === true) setUsernameStatus('available', 'available');
        else if (result === false) setUsernameStatus('taken', 'taken');
        else setUsernameStatus('optional', null); // null = couldn't check
    }, USERNAME_DEBOUNCE_MS);
}

function setUsernameStatus(text, kind) {
    const statusEl = modalCard.querySelector('#authUsernameStatus');
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.dataset.state = kind || '';
}

/** Toggle the password input between text + password types. Stops the
 *  click from bubbling so the surrounding <label> doesn't re-focus the
 *  input on every press. */
function toggleShowPassword(e) {
    e.preventDefault();
    e.stopPropagation();
    const passwordEl = modalCard.querySelector('#authPassword');
    const btn = modalCard.querySelector('#authShowPassword');
    if (!passwordEl || !btn) return;
    const showing = passwordEl.type === 'text';
    passwordEl.type = showing ? 'password' : 'text';
    btn.setAttribute('aria-pressed', String(!showing));
    btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    btn.classList.toggle('is-revealing', !showing);
}

// In-flight guards. We use one async-action lock for the password form
// and a separate per-action timestamp map for the magic-link / forgot
// throttles (4-second cool-down each). Server-side rate limits exist
// in Supabase already; this is a UX guard so a user can't fire ten
// emails to themselves in rapid succession by spamming the link.
let actionInFlight = false;
const lastFiredAt = Object.create(null); // action → epoch ms
const ACTION_COOLDOWN_MS = 4000;

function isCoolingDown(action) {
    const last = lastFiredAt[action];
    return last != null && Date.now() - last < ACTION_COOLDOWN_MS;
}
function markFired(action) { lastFiredAt[action] = Date.now(); }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Email + password — sign-in or sign-up depending on the toggle. */
async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (actionInFlight) return; // guard against double-submit
    const { nameEl, usernameEl, emailEl, passwordEl, submitEl } = readForm();
    const email = (emailEl?.value || '').trim();
    const password = passwordEl?.value || '';
    showError(null);
    if (!email || !EMAIL_RE.test(email)) {
        showError('Enter a valid email address.');
        emailEl?.focus();
        return;
    }
    const isSignIn = mode === 'signin';
    // Sign-in: just require a value. Old accounts may have passwords
    // that wouldn't pass our current sign-up policy, so don't lock them
    // out at the boundary. Sign-up: run the full policy locally for
    // instant feedback (auth.js re-runs it as the canonical gate, plus
    // an HIBP breach check the user can't bypass).
    if (isSignIn) {
        if (password.length === 0) {
            showError('Enter your password.');
            passwordEl?.focus();
            return;
        }
    } else {
        const policy = validatePassword(password);
        if (!policy.ok) {
            showError(policy.message);
            passwordEl?.focus();
            return;
        }
    }
    let name = '';
    let username = '';
    if (!isSignIn) {
        name = (nameEl?.value || '').trim();
        if (!name || name.length > 60) {
            showError(name ? 'Name is too long (60 characters max).' : 'Tell us your name.');
            nameEl?.focus();
            return;
        }
        username = normaliseUsername(usernameEl?.value);
        const rawHadValue = !!(usernameEl?.value || '').trim();
        if (rawHadValue && !username) {
            // The user typed something but it sanitised to empty — invalid.
            showError('Username must be 2–30 characters: letters, numbers, dot, underscore or dash.');
            usernameEl?.focus();
            return;
        }
        if (username && !/^[a-z0-9._-]{2,30}$/.test(username)) {
            showError('Username must be 2–30 characters: letters, numbers, dot, underscore or dash.');
            usernameEl?.focus();
            return;
        }
    }
    actionInFlight = true;
    submitEl.disabled = true;
    const original = submitEl.textContent;
    submitEl.textContent = isSignIn ? 'Signing in…' : 'Creating account…';
    try {
        if (isSignIn) {
            await auth.signInWithPassword(email, password);
            closeModal();
        } else {
            const { confirmationRequired } = await auth.signUpWithPassword(
                email, password, { name, username },
            );
            if (confirmationRequired) renderConfirmation(email, 'signup');
            else closeModal();
        }
    } catch (err) {
        // Anti-enumeration: never reveal via the UI whether a sign-up
        // email is already registered. If it is, Supabase returns
        // `already_registered` and (by default) sends nothing. We
        // silently fire a magic-link to the same address so the
        // existing user gets a usable sign-in email, then render the
        // same "check your email" confirmation a fresh sign-up would.
        // From the attacker's side the response is identical for both
        // new and existing emails.
        if (err?.code === 'already_registered' && !isSignIn) {
            try {
                await auth.signInWithMagicLink(email);
            } catch (_) {
                // Best-effort. Rate-limit / network errors are fine —
                // the UI still shows confirmation, and the existing
                // user can fall back to the sign-in form directly.
            }
            renderConfirmation(email, 'signup');
            return;
        }
        showError(humaniseAuthError(err, isSignIn));
        submitEl.disabled = false;
        submitEl.textContent = original;
    } finally {
        actionInFlight = false;
    }
}

/** Send a magic link instead of using a password. */
async function handleMagicLink() {
    if (actionInFlight) return;
    const { emailEl } = readForm();
    const email = (emailEl?.value || '').trim();
    showError(null);
    if (!email || !EMAIL_RE.test(email)) {
        showError('Enter a valid email first.');
        emailEl?.focus();
        return;
    }
    if (isCoolingDown('magic')) {
        showError('We just sent a link. Wait a few seconds before trying again.');
        return;
    }
    actionInFlight = true;
    try {
        await auth.signInWithMagicLink(email);
        markFired('magic');
        renderConfirmation(email, 'magic');
    } catch (err) {
        showError(humaniseAuthError(err));
    } finally {
        actionInFlight = false;
    }
}

/** Send a password-reset email. */
async function handleForgotPassword() {
    if (actionInFlight) return;
    const { emailEl } = readForm();
    const email = (emailEl?.value || '').trim();
    showError(null);
    if (!email || !EMAIL_RE.test(email)) {
        showError('Enter your email first so we know who to reset.');
        emailEl?.focus();
        return;
    }
    if (isCoolingDown('reset')) {
        showError('We just sent a reset email. Wait a few seconds before trying again.');
        return;
    }
    actionInFlight = true;
    try {
        await auth.sendPasswordReset(email);
        markFired('reset');
        renderConfirmation(email, 'reset');
    } catch (err) {
        showError(humaniseAuthError(err));
    } finally {
        actionInFlight = false;
    }
}

/** Map typed error codes (set in auth.js → normaliseError) to friendly
 *  copy. Unknown errors fall back to a generic message — we never
 *  surface the raw Supabase string to the user. */
function humaniseAuthError(err, isSignIn) {
    const code = err?.code || 'unknown';
    switch (code) {
        case 'invalid_credentials':
            // The most common silent footgun: a user signed up with
            // Google then types their email + a guessed password into
            // the sign-in form. Point them at the OAuth button.
            return 'Email or password is incorrect. If you signed up with Google, use “Continue with Google” below.';
        case 'email_not_confirmed':
            return 'Please confirm your email first — check your inbox for the link we sent.';
        case 'already_registered':
            return 'An account with this email already exists. Sign in instead, or use “Continue with Google” if that’s how you signed up.';
        case 'rate_limited':
            return 'Too many attempts. Wait a minute and try again.';
        case 'network':
            return 'Network problem — check your connection and try again.';
        case 'timeout':
            return 'The request took too long. Check your connection and try again.';
        case 'invalid_email':
            return 'That email doesn’t look right.';
        case 'weak_password':
            return err?.message || 'Password must be at least 8 characters.';
        case 'breached_password':
            return err?.message
                || 'This password has appeared in a known data breach — choose a different one.';
        case 'username_taken':
            return err?.message || 'That username is already taken.';
        case 'username_taken_after_signup':
            return err?.message
                || 'Your account was created, but that username was just taken. Pick another.';
        case 'missing_password':
            return 'Enter your password.';
        case 'invalid_provider':
            return 'That sign-in option isn’t available right now.';
        case 'not_configured':
            return 'Sign-in is temporarily unavailable. Try again in a moment.';
        default:
            return isSignIn === false
                ? 'Could not create the account. Try again.'
                : isSignIn === true
                    ? 'Could not sign you in. Try again.'
                    : 'Something went wrong. Try again.';
    }
}

async function handleOAuth(provider) {
    if (actionInFlight) return;
    showError(null);
    actionInFlight = true;
    try {
        await auth.signInWithOAuth(provider);
        // OAuth redirects away — the actionInFlight flag will be reset
        // by the page reload. No further work here.
    } catch (err) {
        showError(humaniseAuthError(err));
        actionInFlight = false;
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
