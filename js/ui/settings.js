// settings.js
//
// Thin wrapper. The real logic lives in js/ui/settings/{schema,store,renderer,...}.
// This file keeps the old export surface (`setupSettingsModal`,
// `setupSettingsControls`, `loadSettings`) so app.js' init sequence is
// untouched.
//
// Responsibilities:
//   - Wire the star trigger to open/close the panel (+ proximity glow)
//   - First-time render of the schema into #settingsPanel
//   - Reapply loaded settings to the runtime (fires apply hooks for every key)
//   - Bind the `?` key to the shortcut cheatsheet
//   - Start schedules watcher

import { renderSettings, startLiveReadonlyTicker } from './settings/renderer.js';
import * as store from './settings/store.js';
import { APPLY_HOOKS } from './settings/apply.js';
import * as cheatsheet from './settings/cheatsheet.js';
import { initSchedules } from './settings/schedules.js';
import { SHORTCUTS } from './settings/shortcuts-registry.js';
import { readShareLinkFromURL } from './settings/data-io.js';
import { isReducedMotion } from '../core/motion.js';
import { createFocusTrap } from './focus-trap.js';

let rendered = false;
let panelVisible = false;
let settingsTrap = null;

// ============================================================================
// Open / close
// ============================================================================
function closeSettings() {
    const panel = document.getElementById('settingsPanel');
    const overlay = document.getElementById('settingsModalOverlay');
    const star = document.getElementById('settingsBtn');
    if (overlay) overlay.classList.remove('active');
    if (panel) {
        panel.classList.remove('visible');
        panel.classList.add('hidden');
    }
    if (star) star.classList.remove('open');
    if (settingsTrap) settingsTrap.deactivate();
    panelVisible = false;
}

function openSettings() {
    const panel = document.getElementById('settingsPanel');
    const overlay = document.getElementById('settingsModalOverlay');
    const star = document.getElementById('settingsBtn');
    if (!panel) return;

    if (!rendered) {
        renderSettings(panel);
        rendered = true;
        startLiveReadonlyTicker(() => panelVisible);
        settingsTrap = createFocusTrap(panel);
    }

    if (overlay) overlay.classList.add('active');
    panel.classList.remove('hidden');
    panel.classList.add('visible');
    if (star) star.classList.add('open');
    panelVisible = true;
    if (settingsTrap) settingsTrap.activate(star);

    // Focus the search input for keyboard users
    const searchInput = panel.querySelector('.settings-search__input');
    if (searchInput) setTimeout(() => searchInput.focus(), 100);
}

function toggleSettings() {
    panelVisible ? closeSettings() : openSettings();
}

// ============================================================================
// setupSettingsModal — called from app.js
// ============================================================================
export function setupSettingsModal() {
    setTimeout(() => {
        const star = document.getElementById('settingsBtn');
        const overlay = document.getElementById('settingsModalOverlay');
        const panel = document.getElementById('settingsPanel');
        if (!star || !overlay || !panel) {
            console.error('[settings] trigger/overlay/panel missing');
            return;
        }

        star.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSettings();
        });

        overlay.addEventListener('click', () => closeSettings());
        panel.addEventListener('click', (e) => e.stopPropagation());

        // Legacy Esc handler (keyboard.js) looks up this global.
        window._closeSettings = closeSettings;

        setupProximityGlow(star);

        // Cheatsheet `?` key is now handled by keyboard.js → help-center.js.
        // Legacy cheatsheet Esc handler kept for backward compat if cheatsheet
        // was opened via some other codepath.
        document.addEventListener('keydown', (e) => {
            if (cheatsheet.isVisible() && e.key === 'Escape') {
                cheatsheet.hide();
                e.preventDefault();
            }
        });
    }, 100);
}

// ============================================================================
// setupSettingsControls — no-op now, everything is schema-driven
// ============================================================================
export function setupSettingsControls() {
    // Intentionally empty. Kept as an export for app.js compatibility.
}

// ============================================================================
// loadSettings — replay every stored value through its apply hook,
// so the runtime reflects the saved preferences after page reload.
// ============================================================================
export function loadSettings() {
    // Optional: if the URL has a ?settings=... share link, offer import.
    const shared = readShareLinkFromURL();
    if (shared) {
        store.restore(shared);
    }

    // Replay every key with a known apply hook. Also run showIf-dependent
    // side effects by touching each configured key once.
    const all = store.getAll();
    for (const key of Object.keys(all)) {
        const fn = APPLY_HOOKS[key];
        if (typeof fn === 'function') {
            try { fn(all[key]); } catch (e) { /* tolerate */ }
        }
    }

    // Start schedules loop
    initSchedules();
}

// ============================================================================
// Proximity glow — unchanged from Phase 5C
// ============================================================================
function setupProximityGlow(btn) {
    const OUTER_RADIUS = 200;
    let rafId = null;
    let mouseX = -9999;
    let mouseY = -9999;

    function updateGlow() {
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
        const glow = t * t;
        btn.style.setProperty('--glow', glow.toFixed(3));
        rafId = null;
    }

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (!rafId) rafId = requestAnimationFrame(updateGlow);
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
        mouseX = -9999;
        mouseY = -9999;
        btn.style.setProperty('--glow', '0');
    });
}
