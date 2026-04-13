// settings/data-io.js
//
// Export / import / reset / about helpers used by the Data & About section.

import { exportJSON, importJSON, snapshot, resetAll, resetSection } from './store.js';

const APP_VERSION = '5.3.0';

// ============================================================================
// Export
// ============================================================================

export function downloadSettingsJSON() {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    triggerDownload(blob, `cosmic-focus-settings-${timestamp()}.json`);
}

export async function downloadStatsCSV() {
    const stats = await import('../../features/statistics.js');
    const rows = [
        ['metric', 'value'],
        ['sessionsToday',     stats.sessionsToday.value],
        ['totalFocusSeconds', stats.totalFocusSeconds.value],
        ['tasksCompletedToday', stats.tasksCompletedToday.value],
        ['currentStreak',     stats.currentStreak.value],
        ['lastFocusDate',     stats.lastFocusDate.value],
    ];
    const csv = rows.map(r => r.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    triggerDownload(blob, `cosmic-focus-stats-${timestamp()}.csv`);
}

/** Return a URL with the current settings encoded in the hash. */
export function buildShareLink() {
    try {
        const snap = snapshot();
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(snap))));
        const url = new URL(window.location.href);
        url.hash = `settings=${encoded}`;
        return url.toString();
    } catch (e) {
        console.warn('[data-io] share link failed:', e);
        return window.location.href;
    }
}

/** If the URL already contains a settings hash, return the decoded snapshot. */
export function readShareLinkFromURL() {
    const hash = window.location.hash || '';
    const m = hash.match(/settings=([^&]+)/);
    if (!m) return null;
    try {
        const json = decodeURIComponent(escape(atob(m[1])));
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

// ============================================================================
// Import
// ============================================================================

/** Prompt a file picker, read JSON, import into the store. Returns a Promise<bool>. */
export function pickAndImport() {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.addEventListener('change', () => {
            const f = input.files?.[0];
            if (!f) { resolve(false); return; }
            const reader = new FileReader();
            reader.onload = () => {
                const ok = importJSON(String(reader.result || ''));
                resolve(ok);
            };
            reader.onerror = () => resolve(false);
            reader.readAsText(f);
        });
        input.click();
    });
}

// ============================================================================
// Reset / clear
// ============================================================================

export function resetAllSettings() {
    resetAll();
}

/** Nuclear: wipe settings, profiles, stats, app state. */
export function clearAllData() {
    const keys = [
        'fu_settings_v2',
        'fu_profiles_v1',
        'fu_stats_v1',
        'fu_state_v1',
        'fu_theme',
        'fu_focusLength',
        'fu_shortBreakLength',
        'fu_longBreakLength',
        'fu_soundVolume',
        'fu_greeting',
    ];
    for (const k of keys) localStorage.removeItem(k);
    // Reload so every module re-initialises from clean state.
    window.location.reload();
}

// ============================================================================
// About
// ============================================================================

export function getAboutInfo() {
    const info = {
        version: APP_VERSION,
        gpuTier: 'detecting…',
        engine: 'WebGL',
        fps: '—',
        browser: detectBrowser(),
    };
    // Scene-manager exposes the device profile once init3D has run.
    import('../../graphics/scene/scene-manager.js').then(sm => {
        try {
            const profile = sm.getDeviceProfile?.();
            if (profile?.tier) info.gpuTier = profile.tier;
        } catch (e) { /* ignore */ }
    });
    return info;
}

function detectBrowser() {
    const ua = navigator.userAgent;
    if (/Edg\//.test(ua))     return 'Edge';
    if (/Chrome\//.test(ua))  return 'Chrome';
    if (/Firefox\//.test(ua)) return 'Firefox';
    if (/Safari\//.test(ua))  return 'Safari';
    return 'Unknown';
}

// ============================================================================
// Utilities
// ============================================================================

function csvCell(v) {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function timestamp() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export { resetSection };
