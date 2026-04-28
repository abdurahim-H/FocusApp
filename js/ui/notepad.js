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

// ============================================================================
// Templates — pre-filled note bodies for common workflows. Each template
// creates a fresh note with a populated body; the user can edit freely
// from there. Adding a new template = one more entry in this array.
// ============================================================================
const TEMPLATES = [
    {
        id: 'daily',
        label: 'Daily note',
        title: () => todayDailyTitle(),
        body: () => [
            `# ${todayDailyTitle()}`,
            '',
            '## Top three for today',
            '- ',
            '- ',
            '- ',
            '',
            '## Notes',
            '',
        ].join('\n'),
    },
    {
        id: 'weekly',
        label: 'Weekly review',
        title: () => `Weekly review — ${weekIso()}`,
        body: () => [
            `# Weekly review — ${weekIso()}`,
            '',
            '## What went well',
            '- ',
            '',
            '## What to change',
            '- ',
            '',
            '## Next week\'s focus',
            '- ',
            '',
        ].join('\n'),
    },
    {
        id: 'meeting',
        label: 'Meeting notes',
        title: () => 'Meeting — ',
        body: () => [
            '# Meeting — ',
            '',
            '## Attendees',
            '- ',
            '',
            '## Agenda',
            '- ',
            '',
            '## Decisions',
            '- ',
            '',
            '## Action items',
            '- [ ] ',
            '',
        ].join('\n'),
    },
    {
        id: 'brainstorm',
        label: 'Brainstorm',
        title: () => 'Brainstorm — ',
        body: () => [
            '# Brainstorm — ',
            '',
            '## The question',
            '> ',
            '',
            '## Ideas (no filter)',
            '- ',
            '',
            '## Promising directions',
            '- ',
            '',
        ].join('\n'),
    },
];

function weekIso() {
    // Return a "YYYY week NN" label using ISO 8601 week numbers — Monday-
    // first weeks, week 1 contains Jan 4. Compact but unambiguous.
    const d = new Date();
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);
    target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
    const week1 = new Date(target.getFullYear(), 0, 4);
    const weekNo = 1 + Math.round(
        ((target - week1) / 86_400_000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    );
    return `${target.getFullYear()} week ${String(weekNo).padStart(2, '0')}`;
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
                <button class="notepad__head-btn" type="button"
                        id="notepadDictate"
                        aria-label="Dictate with voice"
                        title="Dictate with voice"
                        aria-pressed="false">
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <rect x="6" y="2" width="4" height="8" rx="2"/>
                        <path d="M3.5 7.5a4.5 4.5 0 0 0 9 0M8 12v2.5M5.5 14.5h5"/>
                    </svg>
                </button>
                <button class="notepad__head-btn" type="button"
                        id="notepadExport"
                        aria-label="Export this note"
                        title="Export this note">
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M8 2.5v8.5M5 6l3-3 3 3"/>
                        <path d="M2.5 12.5h11"/>
                    </svg>
                </button>
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
                        <div class="notepad__new-wrap" id="notepadNewWrap">
                            <button class="notepad__new-btn"
                                    type="button"
                                    id="notepadNewBtn"
                                    aria-label="Create a new note">+ New</button>
                            <button class="notepad__new-menu-btn"
                                    type="button"
                                    id="notepadNewMenuBtn"
                                    aria-label="Choose a template"
                                    aria-haspopup="menu"
                                    aria-expanded="false">▾</button>
                            <ul class="notepad__new-menu hidden" id="notepadNewMenu" role="menu"></ul>
                        </div>
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
    const newMenuBtn = panel.querySelector('#notepadNewMenuBtn');
    const newMenu = panel.querySelector('#notepadNewMenu');
    const newWrap = panel.querySelector('#notepadNewWrap');
    const listEl = panel.querySelector('#notepadList');
    const tagsEl = panel.querySelector('#notepadTags');

    searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value;
        paintSidebar();
    });
    newBtn.addEventListener('click', () => {
        createBlankNote();
    });

    // Template chooser. Click ▾ → menu; pick → fresh note from template.
    newMenu.innerHTML = TEMPLATES.map(
        (t) => `<li role="menuitem"><button type="button" data-template="${t.id}">${esc(t.label)}</button></li>`
    ).join('');
    const closeTemplateMenu = () => {
        newMenu.classList.add('hidden');
        newMenuBtn.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', onTemplateOutside, true);
    };
    function onTemplateOutside(e) {
        if (!newWrap.contains(e.target)) closeTemplateMenu();
    }
    newMenuBtn.addEventListener('click', () => {
        const open = !newMenu.classList.contains('hidden');
        if (open) {
            closeTemplateMenu();
        } else {
            newMenu.classList.remove('hidden');
            newMenuBtn.setAttribute('aria-expanded', 'true');
            // Defer outside-click binding so this very click doesn't fire it.
            setTimeout(() => document.addEventListener('click', onTemplateOutside, true));
        }
    });
    newMenu.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-template]');
        if (!btn) return;
        const id = btn.dataset.template;
        const tpl = TEMPLATES.find((t) => t.id === id);
        if (!tpl) return;
        createNoteFromTemplate(tpl);
        closeTemplateMenu();
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

    // Voice dictation (Web Speech API). Transcribed text is appended
    // at the editor's current cursor position. Browser support: all
    // Chromium-based, plus Safari since 14.1; Firefox is the holdout
    // — we hide the button when the API isn't available.
    const dictateBtn = panel.querySelector('#notepadDictate');
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
        let recognizer = null;
        let active = false;
        const stop = () => {
            if (recognizer) {
                try { recognizer.stop(); } catch (_) {}
            }
            active = false;
            dictateBtn.classList.remove('is-on');
            dictateBtn.setAttribute('aria-pressed', 'false');
        };
        dictateBtn.addEventListener('click', () => {
            if (active) {
                stop();
                return;
            }
            try {
                recognizer = new SR();
                recognizer.continuous = true;
                recognizer.interimResults = false;
                recognizer.lang = navigator.language || 'en-US';
                recognizer.onresult = (event) => {
                    // Only append final results — interim flicker is
                    // distracting and gets corrected anyway.
                    let text = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        if (event.results[i].isFinal) {
                            text += event.results[i][0].transcript;
                        }
                    }
                    if (!text) return;
                    insertAtCursor(editorEl, text);
                    updateActiveNote({
                        body: editorEl.value,
                        tags: extractTags(editorEl.value),
                    });
                    renderStats(editorEl.value);
                    showSavedFlash();
                };
                recognizer.onerror = (e) => {
                    console.warn('[notepad] dictation error:', e?.error);
                    stop();
                };
                recognizer.onend = () => stop();
                recognizer.start();
                active = true;
                dictateBtn.classList.add('is-on');
                dictateBtn.setAttribute('aria-pressed', 'true');
                editorEl.focus();
            } catch (e) {
                console.warn('[notepad] dictation unavailable:', e);
            }
        });
    } else if (dictateBtn) {
        dictateBtn.classList.add('is-unavailable');
        dictateBtn.title = 'Voice dictation isn\'t supported in this browser';
        dictateBtn.disabled = true;
    }

    // Export menu — Markdown / HTML / PDF (the latter via the print
    // dialog, which is the cheapest and most universal option).
    const exportBtn = panel.querySelector('#notepadExport');
    exportBtn.addEventListener('click', () => {
        const note = getActiveNote();
        if (!note) return;
        // Inline ad-hoc menu rendered just under the trigger button.
        const existing = panel.querySelector('.notepad__export-menu');
        if (existing) {
            existing.remove();
            return;
        }
        const menu = document.createElement('ul');
        menu.className = 'notepad__export-menu';
        menu.setAttribute('role', 'menu');
        menu.innerHTML = `
            <li><button type="button" data-export="md">Markdown (.md)</button></li>
            <li><button type="button" data-export="html">HTML (.html)</button></li>
            <li><button type="button" data-export="pdf">PDF (via print)</button></li>
        `;
        const close = () => {
            menu.remove();
            document.removeEventListener('click', onOutside, true);
        };
        function onOutside(e) {
            if (!menu.contains(e.target) && e.target !== exportBtn) close();
        }
        menu.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-export]');
            if (!btn) return;
            exportNote(note, btn.dataset.export);
            close();
        });
        // Position relative to the export button.
        const rect = exportBtn.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom + 6}px`;
        menu.style.left = `${rect.right - 180}px`;
        document.body.appendChild(menu);
        setTimeout(() => document.addEventListener('click', onOutside, true));
    });

    // Re-paint when notes change (sidebar / editor reflect every
    // external edit — auto-prepend, signal-driven imports, etc.).
    effect(() => {
        notes.value;
        activeNoteId.value;
        if (isOpen) paint();
    });

    // Pomodoro auto-prepend hook (3.9). When a focus session starts,
    // prepend a "## H:MM AM — focus session N" header to today's
    // daily note. The note's id is found-or-created lazily; if the
    // panel is closed we still mutate via the same `notes` signal.
    document.addEventListener('focus-timer:start', onFocusTimerStart);
}

function onFocusTimerStart(e) {
    const detail = e.detail || {};
    if (detail.isBreak) return;
    const dailyNote = findOrCreateTodayDailyNote();
    if (!dailyNote) return;
    const now = new Date();
    const hh = now.getHours();
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const h = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
    // Count how many "## *focus session*" headers already exist today
    // so we number incrementally without parsing the timer state.
    const sessionsSoFar = (dailyNote.body.match(/^## \d{1,2}:\d{2} [AP]M — focus session/gm) || []).length;
    const stamp = `## ${h}:${mm} ${ampm} — focus session ${sessionsSoFar + 1}\n\n`;
    notes.value = notes.value.map((n) =>
        n.id === dailyNote.id
            ? { ...n, body: dailyNote.body + (dailyNote.body.endsWith('\n') ? '' : '\n') + stamp, updatedAt: Date.now() }
            : n
    );
}

function findOrCreateTodayDailyNote() {
    const todayTitle = todayDailyTitle();
    let n = notes.value.find((x) => x.title === todayTitle);
    if (!n) {
        n = newNote({ title: todayTitle });
        notes.value = [n, ...notes.value];
    }
    return n;
}

function createBlankNote() {
    const n = newNote({ title: 'Untitled note' });
    notes.value = [n, ...notes.value];
    activeNoteId.value = n.id;
    setTimeout(() => titleEl?.focus(), 60);
}

function createNoteFromTemplate(tpl) {
    const n = newNote({ title: tpl.title(), body: tpl.body() });
    notes.value = [n, ...notes.value];
    activeNoteId.value = n.id;
    setTimeout(() => editorEl?.focus(), 60);
}

function insertAtCursor(el, text) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    // Add a leading space when we're not at a natural word boundary
    // so dictation chunks merge cleanly into prose.
    const needsLead = start > 0 && !/\s/.test(el.value[start - 1]);
    const insertion = (needsLead ? ' ' : '') + text;
    el.value = el.value.slice(0, start) + insertion + el.value.slice(end);
    const cursor = start + insertion.length;
    el.setSelectionRange(cursor, cursor);
}

/** Trigger a download for the active note in the requested format. */
function exportNote(note, format) {
    const safeTitle = (note.title || 'note').replace(/[^a-z0-9-_]+/gi, '-').slice(0, 80);
    const today = new Date().toISOString().slice(0, 10);
    const filename = `${safeTitle}-${today}`;
    if (format === 'md') {
        downloadBlob(note.body, `${filename}.md`, 'text/markdown');
    } else if (format === 'html') {
        const html = wrapHtml(note);
        downloadBlob(html, `${filename}.html`, 'text/html');
    } else if (format === 'pdf') {
        printNote(note);
    }
}

function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Minimal HTML wrapper using <pre> so the markdown source renders
 *  visibly without a markdown parser. Preserves whitespace + newlines
 *  verbatim. */
function wrapHtml(note) {
    const title = esc(note.title || 'Note');
    const body = esc(note.body || '');
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; max-width: 720px; margin: 40px auto; padding: 0 16px; color: #222; line-height: 1.6; }
        h1 { font-weight: 350; letter-spacing: -0.01em; }
        pre { white-space: pre-wrap; word-wrap: break-word; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; font-size: 15px; }
        .meta { color: #888; font-size: 13px; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <p class="meta">Exported ${new Date().toLocaleString()}</p>
    <pre>${body}</pre>
</body>
</html>`;
}

/** Open a printable window for the active note. The browser's print
 *  dialog handles the actual PDF generation — universal across OSes
 *  without bundling a PDF library. */
function printNote(note) {
    const w = window.open('', '_blank', 'width=720,height=900');
    if (!w) {
        // Pop-up blocked — fall back to HTML download.
        downloadBlob(wrapHtml(note), `${(note.title || 'note').replace(/[^a-z0-9-_]+/gi, '-')}.html`, 'text/html');
        return;
    }
    w.document.write(wrapHtml(note));
    w.document.close();
    setTimeout(() => {
        try { w.focus(); w.print(); } catch (_) {}
    }, 250);
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
