// settings/store.js
//
// Central settings store. Schema-driven, persistent, observable.
//
// Design:
//   - A single flat key-value map backed by localStorage (`fu_settings_v2`).
//   - Defaults are derived from SCHEMA — this module doesn't hardcode them.
//   - set() fires subscribers AND calls the apply hook for that key (if any),
//     so runtime effects (timer, scene, notifications) react immediately.
//   - Legacy keys (fu_focusLength, fu_theme, ...) are mirrored on write and
//     read as fallbacks on first init, so nothing reading them directly breaks.
//
// Public API:
//   get(key), set(key, v), has(key), subscribe(key|'*', fn) → unsub,
//   getAll(), resetKey(k), resetSection(id), resetAll(),
//   exportJSON(), importJSON(json), snapshot(), restore(snapshot)

import { SCHEMA } from './schema.js';
import { SHORTCUTS } from './shortcuts-registry.js';

const STORAGE_KEY = 'fu_settings_v2';

// Settings keys that mirror to legacy single-value localStorage keys for
// backward compatibility. Anything reading these raw keys directly still sees
// fresh values.
//
// `scene.theme` is intentionally NOT mirrored because the legacy values
// ('dark', 'cosmos', 'auto') don't match the new theme ids ('blackhole') —
// inheriting the legacy value would leave the Black Hole card unselected.
const LEGACY_MIRROR = {
    'timer.focusDuration': 'fu_focusLength',
    'timer.shortBreakDuration': 'fu_shortBreakLength',
    'timer.longBreakDuration': 'fu_longBreakLength',
    'sounds.masterVolume': 'fu_soundVolume',
    'greeting.text': 'fu_greeting',
};

// ============================================================================
// Defaults — built once from SCHEMA
// ============================================================================
function buildDefaults() {
    const out = {};
    for (const row of SCHEMA) {
        if (row.key !== undefined && row.default !== undefined) {
            out[row.key] = row.default;
        }
    }
    // Shortcut keybindings live in SHORTCUTS registry, not SCHEMA rows.
    // Include them so resetSection('shortcuts') and resetAll() restore defaults.
    for (const s of SHORTCUTS) {
        out[s.storeKey] = s.defaultKey;
    }
    return out;
}

const DEFAULTS = buildDefaults();

// ============================================================================
// State
// ============================================================================
const state = { ...DEFAULTS };
const subscribers = new Map(); // key → Set<fn>
const globalSubs = new Set(); // fired on every change (key, value, old)

// ============================================================================
// Persistence
// ============================================================================
function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                // Only accept keys that exist in the schema — protects against
                // stale entries from a prior schema version.
                for (const k of Object.keys(DEFAULTS)) {
                    if (k in parsed) state[k] = parsed[k];
                }
            }
        }
    } catch (e) {
        console.warn('[settings/store] failed to parse v2 blob:', e);
    }

    // Fallback: read legacy keys for anything not in v2. One-time migration.
    for (const [storeKey, legacyKey] of Object.entries(LEGACY_MIRROR)) {
        if (state[storeKey] === DEFAULTS[storeKey]) {
            // Not set in v2 yet — try legacy
            const raw = localStorage.getItem(legacyKey);
            if (raw == null) continue;
            const def = DEFAULTS[storeKey];
            if (typeof def === 'number') {
                const n = parseFloat(raw);
                if (!Number.isNaN(n)) state[storeKey] = n;
            } else {
                state[storeKey] = raw;
            }
        }
    }
}

let persistScheduled = false;
function schedulePersist() {
    if (persistScheduled) return;
    persistScheduled = true;
    // Batch writes within a frame — avoids localStorage thrashing when a
    // slider drags and fires 60 input events per second.
    requestAnimationFrame(() => {
        persistScheduled = false;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('[settings/store] persist failed:', e);
        }
    });
}

function writeLegacyMirror(key, value) {
    const legacyKey = LEGACY_MIRROR[key];
    if (!legacyKey) return;
    try {
        localStorage.setItem(legacyKey, String(value));
    } catch (e) {
        /* ignore */
    }
}

// ============================================================================
// Apply-hook integration (lazy import to avoid a circular dependency)
// ============================================================================
let applyHooks = null;
function lazyLoadApplyHooks() {
    if (applyHooks !== null) return applyHooks;
    // apply.js imports from here too, so we resolve it lazily after module init.
    import('./apply.js')
        .then((mod) => {
            applyHooks = mod.APPLY_HOOKS || {};
        })
        .catch((e) => {
            console.warn('[settings/store] apply hooks unavailable:', e);
            applyHooks = {};
        });
    return null;
}

function runApplyHook(key, value) {
    if (applyHooks === null) {
        lazyLoadApplyHooks();
        return;
    }
    const fn = applyHooks[key];
    if (typeof fn === 'function') {
        try {
            fn(value);
        } catch (e) {
            console.warn(`[settings/apply] hook for ${key} threw:`, e);
        }
    }
}

// ============================================================================
// Public API
// ============================================================================
export function get(key) {
    return key in state ? state[key] : DEFAULTS[key];
}

export function has(key) {
    return key in state;
}

export function getAll() {
    return { ...state };
}

export function getDefault(key) {
    return DEFAULTS[key];
}

export function set(key, value) {
    const old = state[key];
    if (old === value) return;
    state[key] = value;
    schedulePersist();
    writeLegacyMirror(key, value);
    runApplyHook(key, value);
    notify(key, value, old);
}

/** Set multiple keys at once. Used by profile activation and preset switches. */
export function setMany(entries) {
    for (const [k, v] of Object.entries(entries)) {
        set(k, v);
    }
}

export function subscribe(key, fn) {
    if (key === '*') {
        globalSubs.add(fn);
        return () => globalSubs.delete(fn);
    }
    if (!subscribers.has(key)) subscribers.set(key, new Set());
    subscribers.get(key).add(fn);
    return () => {
        const set_ = subscribers.get(key);
        if (set_) set_.delete(fn);
    };
}

function notify(key, value, old) {
    const set_ = subscribers.get(key);
    if (set_) {
        for (const fn of set_) {
            try {
                fn(value, old, key);
            } catch (e) {
                console.warn(e);
            }
        }
    }
    for (const fn of globalSubs) {
        try {
            fn(key, value, old);
        } catch (e) {
            console.warn(e);
        }
    }
}

export function resetKey(key) {
    if (key in DEFAULTS) {
        set(key, DEFAULTS[key]);
    }
}

/** Reset every key that belongs to the given section. */
export function resetSection(sectionId) {
    for (const row of SCHEMA) {
        if (row.section === sectionId && row.key !== undefined) {
            if (row.key in DEFAULTS) set(row.key, DEFAULTS[row.key]);
        }
    }
    // Shortcut keybindings aren't SCHEMA rows but belong to 'shortcuts' section
    if (sectionId === 'shortcuts') {
        for (const s of SHORTCUTS) {
            if (s.storeKey in DEFAULTS) set(s.storeKey, DEFAULTS[s.storeKey]);
        }
    }
}

export function resetAll() {
    for (const [k, v] of Object.entries(DEFAULTS)) {
        set(k, v);
    }
}

/** Snapshot the current store for profile save or export. */
export function snapshot() {
    return { ...state };
}

/** Restore a snapshot, firing apply hooks and subscribers for each changed key. */
export function restore(snap) {
    if (!snap || typeof snap !== 'object') return;
    for (const [k, v] of Object.entries(snap)) {
        if (k in DEFAULTS) set(k, v);
    }
}

export function exportJSON() {
    return JSON.stringify({ version: 2, settings: state }, null, 2);
}

export function importJSON(text) {
    try {
        const parsed = JSON.parse(text);
        const settings = parsed?.settings ?? parsed;
        if (settings && typeof settings === 'object') {
            restore(settings);
            return true;
        }
    } catch (e) {
        console.warn('[settings/store] import failed:', e);
    }
    return false;
}

// ============================================================================
// Init
// ============================================================================
loadFromStorage();

// Kick off the lazy apply-hooks import so it's ready by the time a user
// touches a control. Don't block on it.
lazyLoadApplyHooks();
