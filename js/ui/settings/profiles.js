// settings/profiles.js
//
// Focus profiles — named snapshots of the settings store. Switching profiles
// replays every setting through the store (firing apply hooks), so the timer,
// scene, sounds all react in sync.

import { snapshot, restore, set as setSetting, get as getSetting } from './store.js';

const KEY = 'fu_profiles_v1';

const BUILTIN = {
    'default': {
        id: 'default',
        name: 'Default',
        builtin: true,
        settings: {}, // empty = use store defaults
    },
};

let state = {
    active: 'default',
    profiles: { ...BUILTIN },
};

const subscribers = new Set();

// ============================================================================
// Persistence
// ============================================================================
function load() {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                state.active = parsed.active || 'default';
                state.profiles = { ...BUILTIN, ...(parsed.profiles || {}) };
            }
        }
    } catch (e) {
        console.warn('[profiles] load failed:', e);
    }
}

function persist() {
    try {
        localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
        console.warn('[profiles] persist failed:', e);
    }
}

function notify() {
    for (const fn of subscribers) {
        try { fn(state); } catch (e) { console.warn(e); }
    }
}

// ============================================================================
// Public API
// ============================================================================

export function list() {
    return Object.values(state.profiles);
}

export function getActive() {
    return state.active;
}

export function subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
}

/** Save the current store state as a new profile. */
export function createFromCurrent(name) {
    const id = slugify(name) || `profile-${Date.now()}`;
    state.profiles[id] = {
        id,
        name,
        builtin: false,
        settings: snapshot(),
    };
    persist();
    notify();
    return id;
}

export function rename(id, name) {
    if (!state.profiles[id] || state.profiles[id].builtin) return false;
    state.profiles[id].name = name;
    persist();
    notify();
    return true;
}

export function remove(id) {
    if (!state.profiles[id] || state.profiles[id].builtin) return false;
    delete state.profiles[id];
    if (state.active === id) state.active = 'default';
    persist();
    notify();
    return true;
}

/** Activate a profile: replay its settings through the store. */
export function activate(id) {
    const profile = state.profiles[id];
    if (!profile) return false;
    state.active = id;
    if (Object.keys(profile.settings).length > 0) {
        restore(profile.settings);
    }
    persist();
    notify();
    return true;
}

/** Overwrite an existing profile with the current store state. */
export function overwriteWithCurrent(id) {
    const profile = state.profiles[id];
    if (!profile || profile.builtin) return false;
    profile.settings = snapshot();
    persist();
    notify();
    return true;
}

function slugify(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

// ============================================================================
// Init
// ============================================================================
load();
