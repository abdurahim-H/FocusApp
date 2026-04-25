// help-center.js
//
// In-app help center overlay. Replaces the old shortcuts cheatsheet with a
// richer searchable panel covering every feature in the app.
//
// Entry points:
//   - The ? button (bottom-left of screen)
//   - The ? keyboard shortcut
//   - Programmatic: openHelpCenter() / closeHelpCenter()

import { createFocusTrap } from './focus-trap.js';
import { HELP_CATEGORIES } from './help-content.js';

let overlay = null;
let isOpen = false;
let activeCategory = null;
let helpTrap = null;

// ============================================================================
// Public API
// ============================================================================

export function openHelpCenter() {
    if (isOpen) return;
    ensureDOM();
    isOpen = true;
    overlay.classList.remove('hc-hidden');
    overlay.classList.add('hc-visible');
    const catcher = document.getElementById('hcClickCatcher');
    if (catcher) catcher.classList.add('active');
    if (helpTrap) helpTrap.activate(document.activeElement);
    const searchInput = overlay.querySelector('.hc-search__input');
    if (searchInput) setTimeout(() => searchInput.focus(), 80);
}

export function closeHelpCenter() {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove('hc-visible');
    overlay.classList.add('hc-hidden');
    const catcher = document.getElementById('hcClickCatcher');
    if (catcher) catcher.classList.remove('active');
    if (helpTrap) helpTrap.deactivate();
    activeCategory = null;
    // Reset to category grid view
    const grid = overlay.querySelector('.hc-categories');
    const detail = overlay.querySelector('.hc-detail');
    const backBtn = overlay.querySelector('.hc-back');
    if (grid) grid.style.display = '';
    if (detail) {
        detail.style.display = 'none';
        detail.innerHTML = '';
    }
    if (backBtn) backBtn.style.display = 'none';
    // Clear search
    const input = overlay.querySelector('.hc-search__input');
    if (input) {
        input.value = '';
        applySearch('');
    }
}

export function toggleHelpCenter() {
    if (isOpen) closeHelpCenter();
    else openHelpCenter();
}

export function isHelpCenterOpen() {
    return isOpen;
}

// ============================================================================
// DOM construction (once)
// ============================================================================

function ensureDOM() {
    if (overlay) return;

    // Click-catcher overlay (transparent, like settings)
    const clickCatcher = document.createElement('div');
    clickCatcher.className = 'hc-click-catcher';
    clickCatcher.id = 'hcClickCatcher';
    clickCatcher.addEventListener('click', closeHelpCenter);
    document.body.appendChild(clickCatcher);

    // Panel (fixed, no scrim — same pattern as settings)
    overlay = document.createElement('div');
    overlay.className = 'hc-panel';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Help Center');
    overlay.innerHTML = `
        <div class="hc-panel__header">
            <button class="hc-back" aria-label="Back to categories" style="display:none">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h2 class="hc-title">Help Center</h2>
            <button class="hc-close" aria-label="Close help center">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </div>
        <div class="hc-search">
            <svg class="hc-search__icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="hc-search__input" placeholder="Search help..." autocomplete="off" spellcheck="false">
        </div>
        <div class="hc-body">
            <div class="hc-categories"></div>
            <div class="hc-detail" style="display:none"></div>
            <div class="hc-search-results" style="display:none"></div>
        </div>
        <div class="hc-panel__footer">
            Press <kbd>?</kbd> or <kbd>Esc</kbd> to close
        </div>
    `;

    // Render category grid
    const grid = overlay.querySelector('.hc-categories');
    for (const cat of HELP_CATEGORIES) {
        const card = document.createElement('button');
        card.className = 'hc-cat-card';
        card.dataset.catId = cat.id;
        card.innerHTML = `
            <svg class="hc-cat-card__icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${cat.iconSvg}</svg>
            <span class="hc-cat-card__label">${cat.label}</span>
            <span class="hc-cat-card__count">${cat.entries.length} topics</span>
        `;
        card.addEventListener('click', () => showCategory(cat.id));
        grid.appendChild(card);
    }

    // Event listeners
    overlay.querySelector('.hc-close').addEventListener('click', closeHelpCenter);
    overlay.querySelector('.hc-back').addEventListener('click', showCategoryGrid);

    const searchInput = overlay.querySelector('.hc-search__input');
    searchInput.addEventListener('input', () => applySearch(searchInput.value));

    // Escape key
    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            closeHelpCenter();
        }
    });

    // Stop click propagation so clicking inside panel doesn't close it
    overlay.addEventListener('click', (e) => e.stopPropagation());

    document.body.appendChild(overlay);
    helpTrap = createFocusTrap(overlay);
}

// ============================================================================
// Category navigation
// ============================================================================

function showCategory(catId) {
    const cat = HELP_CATEGORIES.find((c) => c.id === catId);
    if (!cat) return;
    activeCategory = catId;

    const grid = overlay.querySelector('.hc-categories');
    const detail = overlay.querySelector('.hc-detail');
    const searchResults = overlay.querySelector('.hc-search-results');
    const backBtn = overlay.querySelector('.hc-back');

    grid.style.display = 'none';
    searchResults.style.display = 'none';
    detail.style.display = '';
    backBtn.style.display = '';

    detail.innerHTML = `<h3 class="hc-detail__title">${cat.label}</h3>`;
    for (const entry of cat.entries) {
        detail.appendChild(createEntryEl(entry, null, cat.iconSvg));
    }
}

function showCategoryGrid() {
    activeCategory = null;
    const grid = overlay.querySelector('.hc-categories');
    const detail = overlay.querySelector('.hc-detail');
    const searchResults = overlay.querySelector('.hc-search-results');
    const backBtn = overlay.querySelector('.hc-back');

    grid.style.display = '';
    detail.style.display = 'none';
    searchResults.style.display = 'none';
    backBtn.style.display = 'none';
}

// ============================================================================
// Search
// ============================================================================

function applySearch(query) {
    const q = query.trim().toLowerCase();
    const grid = overlay.querySelector('.hc-categories');
    const detail = overlay.querySelector('.hc-detail');
    const searchResults = overlay.querySelector('.hc-search-results');
    const backBtn = overlay.querySelector('.hc-back');

    if (!q) {
        // Restore previous view
        searchResults.style.display = 'none';
        if (activeCategory) {
            grid.style.display = 'none';
            detail.style.display = '';
            backBtn.style.display = '';
        } else {
            grid.style.display = '';
            detail.style.display = 'none';
            backBtn.style.display = 'none';
        }
        return;
    }

    // Hide other views, show search results
    grid.style.display = 'none';
    detail.style.display = 'none';
    backBtn.style.display = 'none';
    searchResults.style.display = '';
    searchResults.innerHTML = '';

    const tokens = q.split(/\s+/);
    let matchCount = 0;

    for (const cat of HELP_CATEGORIES) {
        for (const entry of cat.entries) {
            const haystack = (entry.q + ' ' + stripHtml(entry.a) + ' ' + cat.label).toLowerCase();
            const matches = tokens.every((t) => haystack.includes(t));
            if (matches) {
                const el = createEntryEl(entry, cat.label, cat.iconSvg);
                searchResults.appendChild(el);
                matchCount++;
            }
        }
    }

    if (matchCount === 0) {
        searchResults.innerHTML = `<div class="hc-no-results">No results for "${escapeHtml(query)}"</div>`;
    }
}

// ============================================================================
// Entry rendering
// ============================================================================

function createEntryEl(entry, categoryLabel, categoryIconSvg) {
    const el = document.createElement('div');
    el.className = 'hc-entry';
    // XSS safety contract: entry.q and entry.a come from help-content.js which
    // is static, author-written HTML (intentional <strong>, <kbd>, <table>).
    // If you ever load entries from user input or an external API, escape both.
    const iconHtml = categoryIconSvg
        ? `<svg class="hc-entry__icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${categoryIconSvg}</svg>`
        : '';
    el.innerHTML = `
        <button class="hc-entry__header" aria-expanded="false">
            ${iconHtml}
            <span class="hc-entry__q">${entry.q}</span>
            ${categoryLabel ? `<span class="hc-entry__cat">${categoryLabel}</span>` : ''}
            <svg class="hc-entry__chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="hc-entry__body">${entry.a}</div>
    `;
    const header = el.querySelector('.hc-entry__header');
    header.addEventListener('click', () => {
        const expanded = el.classList.toggle('is-expanded');
        header.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
    return el;
}

// ============================================================================
// Helpers
// ============================================================================

function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || '';
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================================
// ? button setup (call once from app.js)
// ============================================================================

export function setupHelpButton() {
    const btn = document.getElementById('helpBtn');
    if (btn) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleHelpCenter();
        });
    }
}
