// settings/cheatsheet.js
//
// Floating overlay showing every keyboard shortcut. Triggered by pressing `?`
// (the shortcut itself — `help.show`). A second `?` or Escape closes it.

import { displayKey, SHORTCUTS } from './shortcuts-registry.js';
import { get as getSetting } from './store.js';

let overlayEl = null;
let visible = false;

function ensureOverlay() {
    if (overlayEl) return overlayEl;
    overlayEl = document.createElement('div');
    overlayEl.className = 'shortcut-cheatsheet hidden';
    overlayEl.setAttribute('role', 'dialog');
    overlayEl.setAttribute('aria-label', 'Keyboard shortcuts');
    overlayEl.innerHTML = `
        <div class="shortcut-cheatsheet__scrim" data-close="1"></div>
        <div class="shortcut-cheatsheet__panel">
            <header class="shortcut-cheatsheet__header">
                <span class="shortcut-cheatsheet__title">Keyboard shortcuts</span>
                <button class="shortcut-cheatsheet__close" data-close="1" aria-label="Close">✕</button>
            </header>
            <div class="shortcut-cheatsheet__grid"></div>
            <footer class="shortcut-cheatsheet__footer">Press <kbd>?</kbd> or <kbd>Esc</kbd> to close</footer>
        </div>
    `;
    document.body.appendChild(overlayEl);
    overlayEl.addEventListener('click', (e) => {
        if (e.target instanceof HTMLElement && e.target.dataset.close) hide();
    });
    renderGrid();
    return overlayEl;
}

function renderGrid() {
    if (!overlayEl) return;
    const grid = overlayEl.querySelector('.shortcut-cheatsheet__grid');
    grid.innerHTML = '';
    for (const s of SHORTCUTS) {
        const bound = getSetting(s.storeKey) ?? s.defaultKey;
        const row = document.createElement('div');
        row.className = 'shortcut-cheatsheet__row';
        row.innerHTML = `
            <kbd class="shortcut-cheatsheet__key">${escapeHtml(displayKey(bound))}</kbd>
            <span class="shortcut-cheatsheet__label">${escapeHtml(s.label)}</span>
        `;
        grid.appendChild(row);
    }
}

export function show() {
    ensureOverlay();
    renderGrid();
    overlayEl.classList.remove('hidden');
    visible = true;
}

export function hide() {
    if (!overlayEl) return;
    overlayEl.classList.add('hidden');
    visible = false;
}

export function toggle() {
    visible ? hide() : show();
}

export function isVisible() {
    return visible;
}

function escapeHtml(s) {
    return String(s).replace(
        /[&<>"']/g,
        (c) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
            })[c]
    );
}
