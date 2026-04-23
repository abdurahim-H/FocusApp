// settings/renderer.js
//
// Renders the schema into DOM. Each row type has a small render function.
// Listens to store changes so external updates (preset switch, profile
// activation) refresh the visible controls automatically.

import { SECTIONS, SCHEMA, rowsForSection } from './schema.js';
import { get as getSetting, set as setSetting, subscribe, resetSection as storeResetSection, getDefault } from './store.js';
import { GRAPHICS_PRESETS } from './graphics-presets.js';
import { SHORTCUTS, displayKey, getShortcut } from './shortcuts-registry.js';
import * as profiles from './profiles.js';
import { registerSearchable, clearSearchIndex, applyQuery } from './search.js';
import * as dataIO from './data-io.js';
import { isReducedMotion } from '../../core/motion.js';

// ============================================================================
// Public entry point
// ============================================================================
let rootEl = null;
let activeSection = 'scene';

export function renderSettings(root) {
    rootEl = root;
    root.innerHTML = '';
    clearSearchIndex();
    root.appendChild(renderHeader());
    const body = document.createElement('div');
    body.className = 'settings-body';
    body.appendChild(renderRail());
    body.appendChild(renderContent());
    root.appendChild(body);
    root.appendChild(renderFooter());
    setActiveSection(activeSection);

    // React to any store change → refresh visible controls that depend on
    // keys other than the one the user just touched (e.g. preset → sliders).
    subscribe('*', (key) => refreshControl(key));
    profiles.subscribe(() => refreshProfileList());
}

export function setActiveSection(id) {
    activeSection = id;
    if (!rootEl) return;
    rootEl.querySelectorAll('.settings-rail__item').forEach(el => {
        el.classList.toggle('is-active', el.dataset.section === id);
    });
    rootEl.querySelectorAll('.settings-section').forEach(el => {
        el.classList.toggle('is-active', el.dataset.section === id);
    });
}

// ============================================================================
// Structural chrome
// ============================================================================
function renderHeader() {
    const header = document.createElement('header');
    header.className = 'settings-header-v2';
    header.innerHTML = `
        <div class="settings-title-row">
            <span class="settings-title">Settings</span>
        </div>
        <div class="settings-search">
            <input type="text"
                   class="settings-search__input"
                   placeholder="Search settings…"
                   aria-label="Search settings"
                   autocomplete="off"
                   spellcheck="false">
        </div>
    `;
    const input = header.querySelector('.settings-search__input');
    input.addEventListener('input', () => {
        applyQuery(input.value);
        toggleSearchMode(!!input.value.trim());
    });
    return header;
}

function toggleSearchMode(active) {
    if (!rootEl) return;
    rootEl.classList.toggle('is-searching', active);
}

function renderRail() {
    const rail = document.createElement('nav');
    rail.className = 'settings-rail';
    rail.setAttribute('aria-label', 'Settings sections');
    for (const section of SECTIONS) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'settings-rail__item';
        btn.dataset.section = section.id;
        btn.dataset.tooltip = section.label;
        btn.setAttribute('aria-label', section.label);
        if (section.iconStroke) {
            btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${section.iconSvg}</svg>`;
        } else {
            btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="${section.iconPath}"/></svg>`;
        }
        btn.addEventListener('click', () => setActiveSection(section.id));
        rail.appendChild(btn);
    }
    return rail;
}

function renderContent() {
    const content = document.createElement('div');
    content.className = 'settings-content';
    for (const section of SECTIONS) {
        const sectionEl = document.createElement('section');
        sectionEl.className = 'settings-section';
        sectionEl.dataset.section = section.id;

        const title = document.createElement('h3');
        title.className = 'settings-section__title';
        title.textContent = section.label;
        sectionEl.appendChild(title);

        const rows = rowsForSection(section.id);
        let currentGroup = null;
        for (const row of rows) {
            if (row.type === 'group') {
                currentGroup = renderGroup(row);
                sectionEl.appendChild(currentGroup);
                continue;
            }
            const el = renderRow(row);
            if (!el) continue;
            const target = currentGroup?.querySelector('.settings-group__body') || sectionEl;
            target.appendChild(el);
        }
        content.appendChild(sectionEl);
    }
    return content;
}

function renderFooter() {
    const footer = document.createElement('footer');
    footer.className = 'settings-footer-v2';
    footer.innerHTML = `
        <button class="settings-footer-btn" data-action="reset-section">Reset section</button>
        <span class="settings-footer-hint">Press <kbd>?</kbd> for shortcuts</span>
    `;
    footer.querySelector('[data-action="reset-section"]').addEventListener('click', () => {
        storeResetSection(activeSection);
        flashFooter(footer);
    });
    return footer;
}

function flashFooter(footer) {
    const btn = footer.querySelector('[data-action="reset-section"]');
    if (!btn) return;
    const prev = btn.textContent;
    btn.textContent = 'Reset ✓';
    btn.classList.add('is-confirmed');
    setTimeout(() => {
        btn.textContent = prev;
        btn.classList.remove('is-confirmed');
    }, 1200);
}

// ============================================================================
// Group renderer
// ============================================================================
function renderGroup(row) {
    const group = document.createElement('div');
    group.className = 'settings-group-v2';
    if (row.collapsible) group.classList.add('is-collapsible');
    if (row.collapsed)   group.classList.add('is-collapsed');

    const header = document.createElement('div');
    header.className = 'settings-group__header';
    header.innerHTML = `<span class="settings-group__label">${escapeHtml(row.label)}</span>`;
    if (row.hint) {
        const hint = document.createElement('p');
        hint.className = 'settings-group__hint';
        hint.textContent = row.hint;
        header.appendChild(hint);
    }
    if (row.collapsible) {
        const chev = document.createElement('span');
        chev.className = 'settings-group__chev';
        chev.innerHTML = '▸';
        header.appendChild(chev);
        header.addEventListener('click', () => {
            group.classList.toggle('is-collapsed');
        });
    }
    group.appendChild(header);

    const body = document.createElement('div');
    body.className = 'settings-group__body';
    group.appendChild(body);

    return group;
}

// ============================================================================
// Row renderer dispatch
// ============================================================================
function renderRow(row) {
    switch (row.type) {
        case 'slider':           return renderSlider(row);
        case 'toggle':           return renderToggle(row);
        case 'stepper':          return renderStepper(row);
        case 'segmented':        return renderSegmented(row);
        case 'select':           return renderSegmented(row);  // reuse
        case 'theme-cards':      return renderThemeCards(row);
        case 'text':             return renderTextInput(row);
        case 'button':           return renderButton(row);
        case 'button-row':       return renderButtonRow(row);
        case 'shortcut-list':    return renderShortcutList(row);
        case 'notif-permission': return renderNotifPermission(row);
        case 'profile-list':     return renderProfileList(row);
        case 'schedule-list':    return renderScheduleList(row);
        case 'readonly':         return renderReadonly(row);
        case 'feedback-form':    return renderFeedbackForm(row);
    }
    return null;
}

// ============================================================================
// Individual row types
// ============================================================================
function renderSlider(row) {
    const el = document.createElement('div');
    el.className = 'sr sr-slider';
    el.dataset.key = row.key;
    el.innerHTML = `
        <div class="sr__header">
            <span class="sr__label">${escapeHtml(row.label)}</span>
            <span class="sr__value"><span class="sr__num">${formatNumber(getSetting(row.key))}</span>${row.unit ? `<span class="sr__unit">${row.unit}</span>` : ''}</span>
        </div>
        <input type="range" class="sr__range" min="${row.min}" max="${row.max}" step="${row.step}" value="${getSetting(row.key)}">
        ${row.help ? `<div class="sr__help">${escapeHtml(row.help)}</div>` : ''}
    `;
    const input = el.querySelector('input');
    const num = el.querySelector('.sr__num');
    // Set initial fill percentage for the gradient track
    const updateFill = () => {
        const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
        input.style.setProperty('--fill', `${pct}%`);
    };
    updateFill();
    input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        num.textContent = formatNumber(v);
        setSetting(row.key, v);
        updateFill();
    });
    registerSearchable(el, row.label, row.help, row.key);
    applyShowIf(row, el);
    applyDirtyState(el, row.key);
    return el;
}

function renderToggle(row) {
    const el = document.createElement('div');
    el.className = 'sr sr-toggle';
    el.dataset.key = row.key;
    const current = getSetting(row.key);
    el.innerHTML = `
        <div class="sr__header">
            <span class="sr__label">${escapeHtml(row.label)}</span>
            <button role="switch" aria-checked="${current ? 'true' : 'false'}" class="sr__switch ${current ? 'is-on' : ''}">
                <span class="sr__switch-thumb"></span>
            </button>
        </div>
        ${row.help ? `<div class="sr__help">${escapeHtml(row.help)}</div>` : ''}
    `;
    const sw = el.querySelector('button');
    sw.addEventListener('click', () => {
        const next = !getSetting(row.key);
        setSetting(row.key, next);
    });
    registerSearchable(el, row.label, row.help, row.key);
    applyShowIf(row, el);
    applyDirtyState(el, row.key);
    return el;
}

function renderStepper(row) {
    const el = document.createElement('div');
    el.className = 'sr sr-stepper';
    el.dataset.key = row.key;
    el.innerHTML = `
        <div class="sr__header">
            <span class="sr__label">${escapeHtml(row.label)}</span>
            <div class="sr__stepper">
                <button class="sr__step-btn" data-dir="-1" aria-label="Decrease">−</button>
                <span class="sr__step-value">${getSetting(row.key)}${row.suffix ? ` ${row.suffix}` : ''}</span>
                <button class="sr__step-btn" data-dir="1" aria-label="Increase">+</button>
            </div>
        </div>
    `;
    const val = el.querySelector('.sr__step-value');
    el.querySelectorAll('.sr__step-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const dir = parseInt(btn.dataset.dir);
            let next = getSetting(row.key) + dir * (row.step || 1);
            next = Math.max(row.min, Math.min(row.max, next));
            setSetting(row.key, next);
            val.textContent = `${next}${row.suffix ? ` ${row.suffix}` : ''}`;
        });
    });
    registerSearchable(el, row.label, '', row.key);
    applyDirtyState(el, row.key);
    return el;
}

function renderSegmented(row) {
    const el = document.createElement('div');
    el.className = 'sr sr-segmented';
    el.dataset.key = row.key;
    const current = getSetting(row.key);
    const optionsHtml = row.options.map(o => `
        <button type="button" class="sr__seg-btn ${o.value === current ? 'is-active' : ''}" data-value="${o.value}">${escapeHtml(o.label)}</button>
    `).join('');
    el.innerHTML = `
        <div class="sr__label">${escapeHtml(row.label)}</div>
        <div class="sr__segmented">${optionsHtml}</div>
        ${row.help ? `<div class="sr__help">${escapeHtml(row.help)}</div>` : ''}
    `;
    el.querySelectorAll('.sr__seg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            let v = btn.dataset.value;
            // Preserve number types for numeric select values
            if (typeof row.options[0].value === 'number') v = parseFloat(v);
            setSetting(row.key, v);
        });
    });
    registerSearchable(el, row.label, row.help, row.key);
    applyDirtyState(el, row.key);
    return el;
}

function renderThemeCards(row) {
    const el = document.createElement('div');
    el.className = 'sr sr-theme-cards';
    el.dataset.key = row.key;
    const cards = row.options.map((o, i) => {
        const active = o.value === getSetting(row.key);
        const blackhole = o.value === 'blackhole';
        const disabled = o.disabled ? 'disabled' : '';
        const classes = [
            'theme-card',
            blackhole ? 'theme-card--blackhole' : '',
            o.disabled ? 'theme-card--coming-soon' : '',
            active ? 'active' : '',
        ].filter(Boolean).join(' ');
        return `
            <button type="button" class="${classes}" data-value="${o.value}" ${disabled}>
                ${blackhole ? '' : '<span class="theme-card-preview"><span class="theme-card-dot"></span></span>'}
                <span class="theme-card-name">${escapeHtml(o.label)}</span>
            </button>
        `;
    }).join('');
    el.innerHTML = `<div class="theme-cards">${cards}</div>`;
    el.querySelectorAll('button[data-value]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.hasAttribute('disabled')) return;
            setSetting(row.key, btn.dataset.value);
        });
    });
    registerSearchable(el, 'Theme scene', '', row.key);
    return el;
}

function renderTextInput(row) {
    const el = document.createElement('div');
    el.className = 'sr sr-text';
    el.dataset.key = row.key;
    const current = getSetting(row.key) || '';
    el.innerHTML = `
        <div class="sr__label">${escapeHtml(row.label)}</div>
        <input type="text" class="sr__text-input" value="${escapeHtml(current)}" placeholder="${escapeHtml(row.placeholder || '')}">
        ${row.help ? `<div class="sr__help">${escapeHtml(row.help)}</div>` : ''}
    `;
    const input = el.querySelector('input');
    input.addEventListener('input', () => setSetting(row.key, input.value));
    registerSearchable(el, row.label, row.help, row.key);
    applyDirtyState(el, row.key);
    return el;
}

function renderButton(row) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `sr sr-button ${row.danger ? 'is-danger' : ''}`;
    el.textContent = row.label;
    el.addEventListener('click', () => handleButtonAction(row.id, el));
    registerSearchable(el, row.label, '', row.id);
    return el;
}

function renderButtonRow(row) {
    const el = document.createElement('div');
    el.className = 'sr sr-button-row';
    el.innerHTML = row.items.map(it => `<button type="button" class="sr__btn" data-id="${it.id}">${escapeHtml(it.label)}</button>`).join('');
    el.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => handleButtonAction(btn.dataset.id, btn));
    });
    registerSearchable(el, row.items.map(it => it.label).join(' '), '');
    return el;
}

// ============================================================================
// Feedback form — inline (no modal, no backdrop blur)
// Lives inside the Feedback settings section. User picks bug / feature,
// types a description, then sends via mailto or copies to clipboard.
// Diagnostics are auto-appended by the send/copy helpers in feedback.js.
// ============================================================================
function renderFeedbackForm() {
    const el = document.createElement('div');
    el.className = 'sr sr-feedback';
    el.innerHTML = `
        <p class="sr-feedback__intro">
            Spotted a bug or have an idea? Tell us here — we read every one.
        </p>

        <div class="sr-feedback__type" role="tablist" aria-label="Feedback type">
            <button type="button" class="sr-feedback__type-btn is-active"
                    role="tab" aria-selected="true" data-type="bug">
                <span aria-hidden="true">🐞</span>
                <span>Bug report</span>
            </button>
            <button type="button" class="sr-feedback__type-btn"
                    role="tab" aria-selected="false" data-type="feature">
                <span aria-hidden="true">✦</span>
                <span>Feature request</span>
            </button>
        </div>

        <label class="sr-feedback__label" for="sr-feedback-body"
               data-bug-label="What happened, what did you expect, and what steps triggered it?"
               data-feature-label="What would make Cosmic Focus better for you?">
            What happened, what did you expect, and what steps triggered it?
        </label>
        <textarea id="sr-feedback-body"
                  class="sr-feedback__body"
                  rows="6"
                  maxlength="4000"
                  placeholder="Describe what you saw…"
                  spellcheck="true"></textarea>

        <p class="sr-feedback__small">
            We'll attach your browser, GPU, and viewport automatically so the
            report is reproducible. Nothing else.
        </p>

        <div class="sr-feedback__actions">
            <button type="button" class="sr-feedback__btn sr-feedback__btn--primary"
                    data-action="send" disabled>
                Send report
            </button>
            <button type="button" class="sr-feedback__btn"
                    data-action="copy" disabled>
                Copy as email
            </button>
        </div>

        <p class="sr-feedback__email">
            Goes to <a href="mailto:__EMAIL__">__EMAIL__</a>
        </p>
    `;

    // Lazy-import the helper so the feedback.js bundle stays out of the
    // critical path unless someone opens this section.
    const helpersP = import('../feedback.js');

    // Insert the real email (keeps it in one place in feedback.js).
    helpersP.then(({ SUPPORT_EMAIL }) => {
        el.querySelectorAll('.sr-feedback__email a, .sr-feedback__email').forEach((node) => {
            node.innerHTML = node.innerHTML.replaceAll('__EMAIL__', SUPPORT_EMAIL);
        });
        el.querySelector('.sr-feedback__email a').setAttribute('href', `mailto:${SUPPORT_EMAIL}`);
    });

    let currentType = 'bug';
    const textarea = el.querySelector('.sr-feedback__body');
    const label    = el.querySelector('.sr-feedback__label');
    const sendBtn  = el.querySelector('[data-action="send"]');
    const copyBtn  = el.querySelector('[data-action="copy"]');

    function syncButtons() {
        const empty = textarea.value.trim().length === 0;
        sendBtn.disabled = empty;
        copyBtn.disabled = empty;
        sendBtn.textContent = currentType === 'feature' ? 'Send request' : 'Send report';
    }
    textarea.addEventListener('input', syncButtons);

    el.querySelectorAll('[data-type]').forEach((btn) => {
        btn.addEventListener('click', () => {
            currentType = btn.dataset.type;
            el.querySelectorAll('[data-type]').forEach((b) => {
                const active = b === btn;
                b.classList.toggle('is-active', active);
                b.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            // Swap the label prompt to fit the chosen type.
            label.textContent = currentType === 'feature'
                ? label.dataset.featureLabel
                : label.dataset.bugLabel;
            textarea.setAttribute(
                'placeholder',
                currentType === 'feature' ? 'What would you like us to build…' : 'Describe what you saw…'
            );
            syncButtons();
        });
    });

    sendBtn.addEventListener('click', async () => {
        const body = textarea.value.trim();
        if (!body) return;
        const { sendFeedback } = await helpersP;
        sendFeedback(currentType, body);
        flashButton(sendBtn, 'Opening mail…');
    });
    copyBtn.addEventListener('click', async () => {
        const body = textarea.value.trim();
        if (!body) return;
        const { copyFeedbackToClipboard } = await helpersP;
        await copyFeedbackToClipboard(currentType, body);
        flashButton(copyBtn, 'Copied ✓');
    });

    syncButtons();
    registerSearchable(el, 'feedback bug feature report send email', '');
    return el;
}

function handleButtonAction(id, triggerEl) {
    switch (id) {
        case 'export-json': dataIO.downloadSettingsJSON(); flashButton(triggerEl, 'Downloaded ✓'); break;
        case 'export-csv':  dataIO.downloadStatsCSV();    flashButton(triggerEl, 'Downloaded ✓'); break;
        case 'share-link': {
            const link = dataIO.buildShareLink();
            navigator.clipboard?.writeText(link).then(
                () => flashButton(triggerEl, 'Copied ✓'),
                () => flashButton(triggerEl, 'Copy failed')
            );
            break;
        }
        case 'import-json':
            dataIO.pickAndImport().then(ok => flashButton(triggerEl, ok ? 'Imported ✓' : 'Invalid file'));
            break;
        case 'reset-all':
            confirmAction(triggerEl, 'Reset everything?', () => {
                dataIO.resetAllSettings();
                flashButton(triggerEl, 'Reset ✓');
            });
            break;
        case 'clear-data':
            confirmAction(triggerEl, 'Clear ALL data?', () => dataIO.clearAllData());
            break;
        case 'reset-section':
            storeResetSection(activeSection);
            flashButton(triggerEl, 'Reset ✓');
            break;
        case 'show-tour':
            import('./onboarding.js').then(mod => mod.startTour());
            break;
        case 'open-privacy':
            window.open('/privacy.html', '_blank', 'noopener');
            break;
        case 'open-terms':
            window.open('/terms.html', '_blank', 'noopener');
            break;
    }
}

function flashButton(el, msg) {
    if (!el) return;
    const prev = el.textContent;
    el.textContent = msg;
    el.classList.add('is-confirmed');
    setTimeout(() => {
        el.textContent = prev;
        el.classList.remove('is-confirmed');
    }, 1500);
    showToast(msg);
}

/** Floating toast at the bottom of the viewport for extra visibility. */
function showToast(msg) {
    let container = document.getElementById('settings-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'settings-toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);
    if (isReducedMotion()) {
        toast.classList.add('is-visible');
        setTimeout(() => { toast.remove(); }, 2000);
    } else {
        requestAnimationFrame(() => toast.classList.add('is-visible'));
        setTimeout(() => {
            toast.classList.remove('is-visible');
            setTimeout(() => toast.remove(), 350);
        }, 2000);
    }
}

function confirmAction(el, msg, onConfirm) {
    if (!el) return;
    if (el.dataset.confirming === '1') {
        onConfirm();
        delete el.dataset.confirming;
        return;
    }
    const prev = el.textContent;
    el.textContent = `${msg} Click again`;
    el.dataset.confirming = '1';
    el.classList.add('is-confirming');
    setTimeout(() => {
        if (el.dataset.confirming === '1') {
            el.textContent = prev;
            delete el.dataset.confirming;
            el.classList.remove('is-confirming');
        }
    }, 3000);
}

// ============================================================================
// Shortcut list (Tier 3 — with rebinding)
// ============================================================================
let activeRebind = null;

function renderShortcutList() {
    const el = document.createElement('div');
    el.className = 'sr sr-shortcut-list';
    el.innerHTML = `<div class="sr__help">Click a shortcut to rebind. Press Esc to cancel.</div>`;
    for (const s of SHORTCUTS) {
        const bound = getSetting(s.storeKey) ?? s.defaultKey;
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'shortcut-row';
        row.dataset.id = s.id;
        if (s.locked) row.classList.add('is-locked');
        row.innerHTML = `
            <span class="shortcut-row__label">${escapeHtml(s.label)}</span>
            <kbd class="shortcut-row__key">${escapeHtml(displayKey(bound))}</kbd>
        `;
        row.addEventListener('click', () => beginRebind(s.id, row));
        el.appendChild(row);
        registerSearchable(row, s.label, 'keyboard shortcut', s.id);
    }
    return el;
}

function beginRebind(id, rowEl) {
    const s = getShortcut(id);
    if (!s || s.locked) return;
    // If clicking the same row that's already rebinding, cancel instead
    if (activeRebind && activeRebind.id === id) {
        cancelRebind();
        return;
    }
    if (activeRebind) cancelRebind();
    activeRebind = { id, rowEl };
    rowEl.classList.add('is-rebinding');
    const kbd = rowEl.querySelector('.shortcut-row__key');
    kbd.textContent = 'Press key…';
    document.addEventListener('keydown', captureRebind, { capture: true });
}

function captureRebind(e) {
    if (!activeRebind) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.key === 'Escape') {
        cancelRebind();
        return;
    }
    const s = getShortcut(activeRebind.id);
    if (s) {
        setSetting(s.storeKey, e.key);
    }
    finishRebind();
}

function cancelRebind() {
    if (!activeRebind) return;
    const s = getShortcut(activeRebind.id);
    const kbd = activeRebind.rowEl.querySelector('.shortcut-row__key');
    const bound = getSetting(s.storeKey) ?? s.defaultKey;
    kbd.textContent = displayKey(bound);
    activeRebind.rowEl.classList.remove('is-rebinding');
    activeRebind = null;
    document.removeEventListener('keydown', captureRebind, { capture: true });
}

function finishRebind() {
    if (!activeRebind) return;
    const s = getShortcut(activeRebind.id);
    const kbd = activeRebind.rowEl.querySelector('.shortcut-row__key');
    const bound = getSetting(s.storeKey) ?? s.defaultKey;
    kbd.textContent = displayKey(bound);
    activeRebind.rowEl.classList.remove('is-rebinding');
    activeRebind = null;
    document.removeEventListener('keydown', captureRebind, { capture: true });
}

// ============================================================================
// Notification permission row
// ============================================================================
function renderNotifPermission() {
    const el = document.createElement('div');
    el.className = 'sr sr-notif-permission';
    const permission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
    el.innerHTML = `
        <div class="sr__header">
            <span class="sr__label">Desktop notifications</span>
            <span class="sr__perm-status sr__perm-${permission}">${escapeHtml(permissionLabel(permission))}</span>
        </div>
        <button type="button" class="sr__btn">Enable notifications</button>
    `;
    const btn = el.querySelector('button');
    btn.disabled = (permission === 'denied' || permission === 'granted' || permission === 'unsupported');
    btn.addEventListener('click', async () => {
        const { requestNotificationPermission } = await import('../../utils/notifications.js');
        const ok = await requestNotificationPermission();
        const status = el.querySelector('.sr__perm-status');
        status.textContent = permissionLabel(ok ? 'granted' : 'denied');
        status.className = `sr__perm-status sr__perm-${ok ? 'granted' : 'denied'}`;
        btn.disabled = true;
    });
    registerSearchable(el, 'notifications permission', '', 'notifications.permission');
    return el;
}

function permissionLabel(p) {
    if (p === 'granted') return 'Enabled';
    if (p === 'denied')  return 'Blocked';
    if (p === 'default') return 'Not set';
    return 'Unsupported';
}

// ============================================================================
// Profile list
// ============================================================================
function renderProfileList() {
    const el = document.createElement('div');
    el.className = 'sr sr-profile-list';
    el.dataset.role = 'profile-list';
    el.appendChild(buildProfileListUI());
    registerSearchable(el, 'focus profiles configuration snapshots', '');
    return el;
}

function buildProfileListUI() {
    const wrap = document.createElement('div');
    wrap.className = 'profile-list';
    for (const p of profiles.list()) {
        const row = document.createElement('div');
        row.className = 'profile-row';
        if (profiles.getActive() === p.id) row.classList.add('is-active');
        row.innerHTML = `
            <button type="button" class="profile-row__activate">${escapeHtml(p.name)}</button>
            ${p.builtin ? '<span class="profile-row__badge">built-in</span>' : `
                <button type="button" class="profile-row__save" title="Overwrite with current">save</button>
                <button type="button" class="profile-row__del" title="Delete">✕</button>
            `}
        `;
        row.querySelector('.profile-row__activate').addEventListener('click', () => profiles.activate(p.id));
        if (!p.builtin) {
            row.querySelector('.profile-row__save').addEventListener('click', () => profiles.overwriteWithCurrent(p.id));
            row.querySelector('.profile-row__del').addEventListener('click', () => {
                if (confirm(`Delete profile "${safeDialogText(p.name)}"?`)) profiles.remove(p.id);
            });
        }
        wrap.appendChild(row);
    }
    const addRow = document.createElement('div');
    addRow.className = 'profile-row profile-row--add';
    addRow.innerHTML = `
        <input type="text" placeholder="New profile name…" class="profile-row__new">
        <button type="button" class="profile-row__create">Create from current</button>
    `;
    const input = addRow.querySelector('input');
    addRow.querySelector('button').addEventListener('click', () => {
        const name = input.value.trim();
        if (!name) return;
        profiles.createFromCurrent(name);
        input.value = '';
    });
    wrap.appendChild(addRow);
    return wrap;
}

function refreshProfileList() {
    if (!rootEl) return;
    const container = rootEl.querySelector('[data-role="profile-list"]');
    if (!container) return;
    container.innerHTML = '';
    container.appendChild(buildProfileListUI());
}

// ============================================================================
// Schedule list
// ============================================================================
function renderScheduleList(row) {
    const el = document.createElement('div');
    el.className = 'sr sr-schedule-list';
    el.dataset.key = row.key;
    el.appendChild(buildScheduleListUI(row.key));
    registerSearchable(el, 'schedules automation', '', row.key);
    return el;
}

function buildScheduleListUI(key) {
    const wrap = document.createElement('div');
    wrap.className = 'schedule-list';
    const schedules = getSetting(key) || [];
    if (schedules.length === 0) {
        wrap.innerHTML = '<div class="sr__help">No schedules yet. Add one below.</div>';
    }
    for (const s of schedules) {
        const row = document.createElement('div');
        row.className = 'schedule-row';
        row.innerHTML = `
            <button type="button" class="schedule-row__toggle ${s.enabled ? 'is-on' : ''}" aria-label="Enable"></button>
            <span class="schedule-row__time">${escapeHtml(s.time)}</span>
            <span class="schedule-row__action">${escapeHtml(actionLabel(s.action))}</span>
            <button type="button" class="schedule-row__del" aria-label="Delete">✕</button>
        `;
        row.querySelector('.schedule-row__toggle').addEventListener('click', () => {
            const list = [...getSetting(key)];
            const idx = list.findIndex(x => x.id === s.id);
            if (idx >= 0) { list[idx] = { ...list[idx], enabled: !list[idx].enabled }; }
            setSetting(key, list);
            refreshScheduleList(key);
        });
        row.querySelector('.schedule-row__del').addEventListener('click', () => {
            setSetting(key, (getSetting(key) || []).filter(x => x.id !== s.id));
            refreshScheduleList(key);
        });
        wrap.appendChild(row);
    }
    // Add-new row
    const addRow = document.createElement('div');
    addRow.className = 'schedule-row schedule-row--add';
    addRow.innerHTML = `
        <input type="time" class="schedule-row__input-time" value="09:00">
        <select class="schedule-row__input-action">
            <option value="focus.start">Start focus</option>
            <option value="focus.switch">Switch to focus</option>
            <option value="ambient.switch">Switch to ambient</option>
            <option value="home.switch">Switch to home</option>
        </select>
        <button type="button" class="schedule-row__add">Add</button>
    `;
    addRow.querySelector('.schedule-row__add').addEventListener('click', () => {
        const time = addRow.querySelector('.schedule-row__input-time').value;
        const action = addRow.querySelector('.schedule-row__input-action').value;
        if (!time) return;
        const list = [...(getSetting(key) || [])];
        list.push({
            id: `s-${Date.now()}`,
            enabled: true,
            time,
            days: [1, 2, 3, 4, 5], // Mon-Fri default
            action,
        });
        setSetting(key, list);
        refreshScheduleList(key);
    });
    wrap.appendChild(addRow);
    return wrap;
}

function refreshScheduleList(key) {
    if (!rootEl) return;
    const container = rootEl.querySelector(`.sr-schedule-list[data-key="${key}"]`);
    if (!container) return;
    container.innerHTML = '';
    container.appendChild(buildScheduleListUI(key));
}

function actionLabel(a) {
    const map = {
        'focus.start': 'Start focus',
        'focus.switch': 'Focus mode',
        'ambient.switch': 'Ambient mode',
        'home.switch': 'Home mode',
    };
    return map[a] || a;
}

// ============================================================================
// Readonly (About)
// ============================================================================
const liveReadonlyRefs = new Map();

function renderReadonly(row) {
    const el = document.createElement('div');
    el.className = 'sr sr-readonly';
    el.dataset.key = row.key;
    el.innerHTML = `
        <span class="sr__label">${escapeHtml(row.label)}</span>
        <span class="sr__value sr__ro-value">—</span>
    `;
    const valueEl = el.querySelector('.sr__ro-value');
    liveReadonlyRefs.set(row.key, valueEl);
    updateReadonlyValue(row.key, valueEl);
    registerSearchable(el, row.label, '', row.key);
    return el;
}

function updateReadonlyValue(key, el) {
    const info = dataIO.getAboutInfo();
    switch (key) {
        case 'about.version': el.textContent = info.version; break;
        case 'about.gpuTier': el.textContent = info.gpuTier; break;
        case 'about.engine':  el.textContent = info.engine;  break;
        case 'about.browser': el.textContent = info.browser; break;
        case 'about.fps': {
            import('../../graphics/scene/scene-manager.js').then(sm => {
                const fps = sm.getFPS?.();
                el.textContent = fps != null ? `${fps}` : '—';
            });
            break;
        }
    }
}

// Live refresh for the FPS readonly — ticks every 800ms while panel is visible.
let liveTick = null;
export function startLiveReadonlyTicker(isVisibleFn) {
    if (liveTick) return;
    liveTick = setInterval(() => {
        if (!isVisibleFn()) return;
        const el = liveReadonlyRefs.get('about.fps');
        if (el) updateReadonlyValue('about.fps', el);
        const gpuEl = liveReadonlyRefs.get('about.gpuTier');
        if (gpuEl && gpuEl.textContent === 'detecting…') updateReadonlyValue('about.gpuTier', gpuEl);
    }, 800);
}

// ============================================================================
// Reactivity
// ============================================================================
function refreshControl(key) {
    if (!rootEl) return;
    // Sliders
    const slider = rootEl.querySelector(`.sr-slider[data-key="${cssEscape(key)}"]`);
    if (slider) {
        const range = slider.querySelector('input');
        const num = slider.querySelector('.sr__num');
        const v = getSetting(key);
        if (range && parseFloat(range.value) !== v) {
            range.value = v;
            const pct = ((v - range.min) / (range.max - range.min)) * 100;
            range.style.setProperty('--fill', `${pct}%`);
        }
        if (num) num.textContent = formatNumber(v);
    }
    // Toggles
    const toggle = rootEl.querySelector(`.sr-toggle[data-key="${cssEscape(key)}"] .sr__switch`);
    if (toggle) {
        const v = !!getSetting(key);
        toggle.classList.toggle('is-on', v);
        toggle.setAttribute('aria-checked', v ? 'true' : 'false');
    }
    // Segmented
    rootEl.querySelectorAll(`.sr-segmented[data-key="${cssEscape(key)}"] .sr__seg-btn`).forEach(btn => {
        const v = String(getSetting(key));
        btn.classList.toggle('is-active', btn.dataset.value === v);
    });
    // Stepper
    const stepper = rootEl.querySelector(`.sr-stepper[data-key="${cssEscape(key)}"] .sr__step-value`);
    if (stepper) {
        const row = SCHEMA.find(r => r.key === key);
        const v = getSetting(key);
        stepper.textContent = `${v}${row?.suffix ? ` ${row.suffix}` : ''}`;
    }
    // Theme cards
    rootEl.querySelectorAll(`.sr-theme-cards[data-key="${cssEscape(key)}"] button[data-value]`).forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === getSetting(key));
    });
    // Text
    const txt = rootEl.querySelector(`.sr-text[data-key="${cssEscape(key)}"] input`);
    if (txt && txt.value !== getSetting(key)) txt.value = getSetting(key) || '';

    // Schedules (list refresh)
    if (key.startsWith('timer.schedules')) refreshScheduleList('timer.schedules');
    // Shortcuts (refresh the specific row's kbd display)
    if (key.startsWith('shortcuts.')) refreshShortcutRow(key);

    // Dirty indicator — refresh for any row with this key.
    const dirtyEl = rootEl.querySelector(`.sr[data-key="${cssEscape(key)}"]`);
    if (dirtyEl) applyDirtyState(dirtyEl, key);

    // showIf dependencies — re-apply every row that declares a showIf.
    // Cheap: only affects the timer section, maybe a few rows.
    if (key === 'timer.autoStart') {
        rootEl.querySelectorAll('.sr[data-key="timer.autoStartDelay"]').forEach(el => {
            applyShowIf(SCHEMA.find(r => r.key === 'timer.autoStartDelay'), el);
        });
    }
}

function refreshShortcutRow(storeKey) {
    if (!rootEl) return;
    const shortcut = SHORTCUTS.find(s => s.storeKey === storeKey);
    if (!shortcut) return;
    const row = rootEl.querySelector(`.shortcut-row[data-id="${cssEscape(shortcut.id)}"] .shortcut-row__key`);
    if (row) row.textContent = displayKey(getSetting(storeKey));
}

// ============================================================================
// showIf
// ============================================================================
function applyShowIf(row, el) {
    if (!row || typeof row.showIf !== 'function') return;
    const storeApi = { get: getSetting };
    const visible = !!row.showIf(storeApi);
    el.classList.toggle('sr--hidden-by-condition', !visible);
}

// ============================================================================
// Utilities
// ============================================================================
function formatNumber(v) {
    if (typeof v !== 'number') return v;
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// Strip control chars + cap length for user-provided strings that end up
// in prompt()/confirm() dialogs. Not XSS (those dialogs don't render HTML)
// but prevents a malicious name with newlines from spoofing dialog text.
function safeDialogText(s, max = 60) {
    let out = String(s ?? '').replace(/[\r\n\t\x00-\x1F\x7F]/g, '');
    if (out.length > max) out = out.slice(0, max - 1) + '…';
    return out;
}

function cssEscape(s) {
    // Minimal CSS.escape polyfill for our use (dot-separated keys).
    return String(s).replace(/[^a-zA-Z0-9_-]/g, c => `\\${c}`);
}

/** Mark a settings row as dirty (value != default) or clean. */
function applyDirtyState(el, key) {
    if (!el || !key) return;
    const current = getSetting(key);
    const def = getDefault(key);
    const isDirty = current !== def;
    el.classList.toggle('is-dirty', isDirty);
}
