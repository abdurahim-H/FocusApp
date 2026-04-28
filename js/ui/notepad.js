// notepad.js — a focused-writing surface for Cosmic Focus.
//
// Drops down from below the nav cluster — same animation pattern as
// Settings / Help Center / Profile / Tasks expand / Task detail.
//
// Wave 3.1 / 3.2 / 3.3 land here:
//   - Panel scaffold with scrim, sheet, focus trap, Esc to close.
//   - Single-note plain-text editor (markdown later via 3.2 v2).
//   - Live word + character count + reading-time footer.
//
// Multi-note (3.4), auto-save debounce (3.5), tags (3.6), search (3.7),
// dictation (3.8), AI summaries (3.10), exports (3.11), templates
// (3.12) all bolt onto this same module in subsequent commits — the
// data shape is already designed to support them.

import { effect, signal } from '../core/state.js';
import { isReducedMotion } from '../core/motion.js';
import { createFocusTrap } from './focus-trap.js';

// ───────────────────────────────────────────────────────────────────────
// State — a single signal carrying every note. Persisted to its own
// localStorage key (`fu_notes_v1`) rather than piggy-backing on the
// app's main state blob so a future cloud-sync pass can target the
// notes table without untangling state.js.
// ───────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'fu_notes_v1';
export const notes = signal([]);
// The note currently shown in the editor. Used by the multi-note
// sidebar that lands in 3.4 — for now, always the only note.
export const activeNoteId = signal(null);

function loadNotes() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (Array.isArray(data?.notes)) notes.value = data.notes;
        if (Number.isFinite(data?.activeNoteId)) activeNoteId.value = data.activeNoteId;
    } catch (e) {
        console.warn('[notepad] failed to load notes:', e);
    }
}

let persistScheduled = false;
function persistNotes() {
    if (persistScheduled) return;
    persistScheduled = true;
    requestAnimationFrame(() => {
        persistScheduled = false;
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ notes: notes.value, activeNoteId: activeNoteId.value })
            );
        } catch (e) {
            console.warn('[notepad] failed to persist notes:', e);
        }
    });
}

loadNotes();

let persistInitialised = false;
effect(() => {
    notes.value;
    activeNoteId.value;
    if (!persistInitialised) {
        persistInitialised = true;
        return;
    }
    persistNotes();
});

// ───────────────────────────────────────────────────────────────────────
// Note operations
// ───────────────────────────────────────────────────────────────────────

function newNote(meta = {}) {
    const now = Date.now();
    return {
        id: now,
        title: meta.title || todayDailyTitle(),
        body: meta.body || '',
        createdAt: now,
        updatedAt: now,
        pinned: false,
        tags: [],
    };
}

function todayDailyTitle() {
    const d = new Date();
    return `Daily — ${d.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })}`;
}

function getActiveNote() {
    const list = notes.value;
    if (list.length === 0) return null;
    if (activeNoteId.value != null) {
        const found = list.find((n) => n.id === activeNoteId.value);
        if (found) return found;
    }
    return list[0];
}

function ensureFirstNote() {
    if (notes.value.length === 0) {
        const n = newNote();
        notes.value = [n];
        activeNoteId.value = n.id;
        return n;
    }
    if (activeNoteId.value == null) {
        activeNoteId.value = notes.value[0].id;
    }
    return getActiveNote();
}

function updateActiveNote(patch) {
    const id = activeNoteId.value ?? notes.value[0]?.id;
    if (id == null) return;
    notes.value = notes.value.map((n) =>
        n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n
    );
}

// ───────────────────────────────────────────────────────────────────────
// Panel
// ───────────────────────────────────────────────────────────────────────

let initialised = false;
let panel = null;
let trap = null;
let isOpen = false;
let editorEl = null;
let titleEl = null;
let savedFlash = null;

export function initNotepad() {
    if (initialised) return;
    initialised = true;
    // Keyboard shortcut: 'n' opens the notepad. Mirrors the same
    // gating pattern profile.js uses for the 'i' key — we don't fire
    // when the user is typing into a field or another modal owns the
    // keyboard, otherwise N becomes "type the letter n" everywhere.
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) {
            e.preventDefault();
            close();
            return;
        }
        if (e.key !== 'n' && e.key !== 'N') return;
        if (isOpen) return;
        const a = document.activeElement;
        if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
        if (
            document.querySelector(
                '.auth-modal.is-open, .help-center-overlay.is-open, #settingsPanel.is-open, .profile.is-open, .task-detail.is-open, .tasks-expand.is-open'
            )
        ) return;
        e.preventDefault();
        open();
    });
}

/** Public API — used by the account dropdown's "Open notes" row. */
export function openNotepad() {
    open();
}

function open() {
    if (!panel) buildPanel();
    isOpen = true;
    panel.setAttribute('aria-hidden', 'false');
    panel.classList.add('is-open');
    if (!trap) trap = createFocusTrap(panel);
    trap.activate(document.activeElement);
    ensureFirstNote();
    paint();
    setTimeout(() => editorEl?.focus(), isReducedMotion() ? 0 : 240);
}

function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    trap?.deactivate();
}

// Sidebar state. Search query + active tag filter live here so they
// don't pollute the persisted note shape.
let searchQuery = '';
let activeTag = null;

function buildPanel() {
    panel = document.createElement('div');
    panel.className = 'notepad';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Notepad');
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = `
        <div class="notepad__scrim" data-notepad-close></div>
        <div class="notepad__sheet">
            <header class="notepad__head">
                <span class="notepad__eyebrow">NOTES</span>
                <input type="text" class="notepad__title-input"
                       id="notepadTitle"
                       maxlength="120"
                       aria-label="Note title"
                       placeholder="Note title">
                <span class="notepad__saved" id="notepadSaved" aria-live="polite"></span>
                <button class="notepad__close" type="button"
                        aria-label="Close notepad"
                        data-notepad-close>×</button>
            </header>
            <div class="notepad__body">
                <aside class="notepad__sidebar" id="notepadSidebar">
                    <div class="notepad__sidebar-toolbar">
                        <input type="search"
                               class="notepad__search"
                               id="notepadSearch"
                               placeholder="Search notes…"
                               aria-label="Search notes">
                        <button class="notepad__new-btn"
                                type="button"
                                id="notepadNewBtn"
                                aria-label="Create a new note">+ New</button>
                    </div>
                    <div class="notepad__tags" id="notepadTags" role="group" aria-label="Tag filters"></div>
                    <ul class="notepad__list" id="notepadList" role="list"></ul>
                </aside>
                <div class="notepad__editor-wrap">
                    <textarea class="notepad__editor"
                              id="notepadEditor"
                              aria-label="Note body"
                              placeholder="Start writing… Markdown supported (bold *italic* &amp; co.). Tag a note with #project. Press Esc to close."
                              spellcheck="true"></textarea>
                </div>
            </div>
            <footer class="notepad__foot">
                <span class="notepad__stats" id="notepadStats">0 words · 0 characters · &lt;1 min read</span>
                <span class="notepad__hint">your notes live in this browser · sync arrives in a future release</span>
            </footer>
        </div>
    `;
    document.body.appendChild(panel);

    panel.querySelectorAll('[data-notepad-close]').forEach((el) =>
        el.addEventListener('click', close)
    );

    editorEl = panel.querySelector('#notepadEditor');
    titleEl = panel.querySelector('#notepadTitle');
    savedFlash = panel.querySelector('#notepadSaved');

    titleEl.addEventListener('input', () => {
        updateActiveNote({ title: titleEl.value });
        showSavedFlash();
    });
    editorEl.addEventListener('input', () => {
        updateActiveNote({ body: editorEl.value, tags: extractTags(editorEl.value) });
        renderStats(editorEl.value);
        showSavedFlash();
    });
    editorEl.addEventListener('keydown', (e) => {
        if (!(e.metaKey || e.ctrlKey)) return;
        let wrap = null;
        if (e.key === 'b' || e.key === 'B') wrap = '**';
        else if (e.key === 'i' || e.key === 'I') wrap = '*';
        if (!wrap) return;
        e.preventDefault();
        wrapSelection(editorEl, wrap);
        updateActiveNote({ body: editorEl.value, tags: extractTags(editorEl.value) });
        renderStats(editorEl.value);
        showSavedFlash();
    });

    // Sidebar wiring.
    const searchInput = panel.querySelector('#notepadSearch');
    const newBtn = panel.querySelector('#notepadNewBtn');
    const listEl = panel.querySelector('#notepadList');
    const tagsEl = panel.querySelector('#notepadTags');

    searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value;
        paintSidebar();
    });
    newBtn.addEventListener('click', () => {
        const n = newNote({ title: 'Untitled note' });
        notes.value = [n, ...notes.value];
        activeNoteId.value = n.id;
        // Focus the title field so the user can name the note immediately.
        setTimeout(() => titleEl?.focus(), 60);
    });
    listEl.addEventListener('click', (e) => {
        const open = e.target.closest('[data-note-id]');
        if (open) {
            const id = Number(open.dataset.noteId);
            activeNoteId.value = id;
            return;
        }
        const del = e.target.closest('[data-note-delete]');
        if (del) {
            e.preventDefault();
            e.stopPropagation();
            deleteNoteById(Number(del.dataset.noteDelete));
        }
    });
    tagsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-tag]');
        if (!btn) return;
        const tag = btn.dataset.tag || null;
        activeTag = activeTag === tag ? null : (tag || null);
        paintSidebar();
    });

    // Re-paint when notes change (sidebar reflects every external edit).
    effect(() => {
        notes.value;
        activeNoteId.value;
        if (isOpen) paint();
    });
}

/** Pull `#tag` tokens out of the body — first 12 unique, lowercase,
 *  preserves order. Used to populate the tag filter strip and to
 *  store the per-note tag list for search. */
function extractTags(body) {
    if (!body) return [];
    const found = new Set();
    const re = /(^|\s)#([a-zA-Z0-9_-]{1,32})/g;
    let m;
    while ((m = re.exec(body))) {
        found.add(m[2].toLowerCase());
        if (found.size >= 12) break;
    }
    return [...found];
}

function deleteNoteById(id) {
    const list = notes.value;
    if (!list.length) return;
    const idx = list.findIndex((n) => n.id === id);
    if (idx < 0) return;
    const next = list.slice();
    next.splice(idx, 1);
    notes.value = next;
    if (activeNoteId.value === id) {
        activeNoteId.value = next[0]?.id ?? null;
        if (next.length === 0) ensureFirstNote();
    }
}

function paint() {
    if (!panel) return;
    const note = getActiveNote();
    if (!note) return;
    if (titleEl && document.activeElement !== titleEl && titleEl.value !== note.title) {
        titleEl.value = note.title || '';
    }
    if (editorEl && document.activeElement !== editorEl && editorEl.value !== note.body) {
        editorEl.value = note.body || '';
    }
    renderStats(note.body || '');
    paintSidebar();
}

function paintSidebar() {
    const listEl = panel?.querySelector('#notepadList');
    const tagsEl = panel?.querySelector('#notepadTags');
    if (!listEl || !tagsEl) return;

    const all = notes.value;
    const lowerQ = searchQuery.trim().toLowerCase();
    const filtered = all.filter((n) => {
        if (activeTag && !(n.tags || []).includes(activeTag)) return false;
        if (!lowerQ) return true;
        return (
            (n.title || '').toLowerCase().includes(lowerQ) ||
            (n.body || '').toLowerCase().includes(lowerQ)
        );
    });
    const activeId = activeNoteId.value;

    // Render tag pills from the union of every note's tag list. Active
    // tag highlighted; click toggles it off when reselected.
    const tagSet = new Set();
    for (const n of all) for (const t of n.tags || []) tagSet.add(t);
    const tags = [...tagSet].sort();
    tagsEl.innerHTML = tags.length === 0
        ? '<span class="notepad__tags-empty">tag a note with <code>#project</code> to filter</span>'
        : tags
              .map(
                  (t) => `<button class="notepad__tag ${activeTag === t ? 'is-on' : ''}"
                                  type="button" data-tag="${esc(t)}">#${esc(t)}</button>`
              )
              .join('');

    if (filtered.length === 0) {
        listEl.innerHTML = `
            <li class="notepad__list-empty">
                ${all.length === 0 ? 'No notes yet — start typing on the right.' : 'No matches.'}
            </li>
        `;
        return;
    }

    listEl.innerHTML = filtered
        .map((n) => {
            const isActive = n.id === activeId;
            const updated = n.updatedAt
                ? new Date(n.updatedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                  })
                : '';
            const preview = (n.body || '').replace(/\s+/g, ' ').trim().slice(0, 80);
            return `
                <li class="notepad__list-item ${isActive ? 'is-active' : ''}"
                    data-note-id="${n.id}">
                    <div class="notepad__list-row">
                        <span class="notepad__list-title">${esc(n.title || 'Untitled')}</span>
                        <button class="notepad__list-delete"
                                type="button"
                                data-note-delete="${n.id}"
                                aria-label="Delete this note">×</button>
                    </div>
                    <span class="notepad__list-preview">${esc(preview)}</span>
                    <span class="notepad__list-meta">
                        ${updated ? esc(updated) : ''}
                        ${(n.tags || [])
                            .slice(0, 3)
                            .map((t) => `<span class="notepad__list-tag">#${esc(t)}</span>`)
                            .join('')}
                    </span>
                </li>
            `;
        })
        .join('');
}

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function renderStats(text) {
    const stats = panel?.querySelector('#notepadStats');
    if (!stats) return;
    const trimmed = (text || '').trim();
    const words = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
    const chars = (text || '').length;
    // Average reading speed ~ 200 wpm. Round up; show "<1 min" for
    // anything less than a minute so the user never sees "0 min read".
    const readMin = words > 0 ? Math.max(1, Math.ceil(words / 200)) : 0;
    const readText = words === 0
        ? '<1 min read'
        : readMin === 1
            ? '1 min read'
            : `${readMin} min read`;
    stats.innerHTML = `${words.toLocaleString()} words · ${chars.toLocaleString()} characters · ${readText}`;
}

let savedTimer = null;
function showSavedFlash() {
    if (!savedFlash) return;
    savedFlash.textContent = 'saved';
    savedFlash.classList.add('is-on');
    if (savedTimer) clearTimeout(savedTimer);
    savedTimer = setTimeout(() => {
        savedFlash.classList.remove('is-on');
    }, 1100);
}

/** Insert `wrap` on either side of the textarea's current selection. */
function wrapSelection(el, wrap) {
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = el.value.slice(0, start);
    const sel = el.value.slice(start, end);
    const after = el.value.slice(end);
    const next = `${before}${wrap}${sel}${wrap}${after}`;
    el.value = next;
    // Reposition the cursor inside the wrap on no-selection inserts;
    // otherwise keep the original selection wrapped.
    if (start === end) {
        const pos = start + wrap.length;
        el.setSelectionRange(pos, pos);
    } else {
        el.setSelectionRange(start + wrap.length, end + wrap.length);
    }
}
