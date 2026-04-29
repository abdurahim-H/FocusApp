// date-picker.js
//
// Custom calendar popover. Replaces native <input type="date"> for
// task due dates so the picker matches the rest of the app's warm-
// gold aesthetic instead of the bare browser-default surface.
//
// Usage:
//   import { openDatePicker } from '../ui/date-picker.js';
//   openDatePicker({
//       anchor:  triggerButtonEl,            // for positioning
//       value:   '2026-04-29' | null,        // ISO YYYY-MM-DD
//       onChange: (iso | null) => { ... },   // null = cleared
//       onClose: () => { ... },              // optional
//   });
//
// One picker is open at a time. Calling open() again closes the
// previous one cleanly. Esc, scrim click, and outside click all
// close. Tab cycles inside; arrow keys move the day cursor.

import { createFocusTrap } from './focus-trap.js';

let active = null;
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

function todayLocal() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function toISO(d) {
    // Local-time ISO. Avoids timezone drift that toISOString().slice(0,10)
    // introduces when the user's local date differs from UTC.
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function fromISO(iso) {
    if (!iso) return null;
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    d.setHours(0, 0, 0, 0);
    return d;
}

function sameDay(a, b) {
    return a && b
        && a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

/** Build the 6×7 grid of dates for the given month. Always 42 cells
 *  starting from the most-recent Monday on or before the 1st, so
 *  every layout has the same height and the bottom never jumps. */
function gridForMonth(year, month) {
    const first = new Date(year, month, 1);
    // Mon-first offset: getDay() is Sun=0..Sat=6; we want Mon=0..Sun=6.
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - offset);
    const cells = [];
    for (let i = 0; i < 42; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        d.setHours(0, 0, 0, 0);
        cells.push(d);
    }
    return cells;
}

/** Position the popover next to its anchor. Tries below first; if
 *  that would clip the viewport bottom, flips above. Same logic
 *  horizontally — prefers left-align with the anchor, flips to
 *  right-align if it would overflow. */
function positionPopover(popover, anchor) {
    const rect = anchor.getBoundingClientRect();
    const pop = popover.getBoundingClientRect();
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = rect.bottom + margin;
    if (top + pop.height + margin > vh) {
        // Flip above
        top = Math.max(margin, rect.top - pop.height - margin);
    }

    let left = rect.left;
    if (left + pop.width + margin > vw) {
        left = Math.max(margin, vw - pop.width - margin);
    }

    popover.style.top = `${Math.round(top)}px`;
    popover.style.left = `${Math.round(left)}px`;
}

export function openDatePicker({ anchor, value, onChange, onClose }) {
    // Replace any previously open picker.
    if (active) active.close();

    const initial = fromISO(value) || todayLocal();
    let cursor = new Date(initial);
    cursor.setDate(1);
    let selected = fromISO(value);

    const root = document.createElement('div');
    root.className = 'date-picker';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Pick a date');
    document.body.appendChild(root);

    function paint() {
        const today = todayLocal();
        const cells = gridForMonth(cursor.getFullYear(), cursor.getMonth());
        const heading = `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`;

        const headerHTML = `
            <div class="date-picker__head">
                <div class="date-picker__title">${heading}</div>
                <div class="date-picker__nav">
                    <button type="button" class="date-picker__nav-btn"
                            data-action="prev" aria-label="Previous month">
                        <svg viewBox="0 0 24 24" width="14" height="14"
                             fill="none" stroke="currentColor" stroke-width="2"
                             stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="15 18 9 12 15 6"/>
                        </svg>
                    </button>
                    <button type="button" class="date-picker__nav-btn"
                            data-action="next" aria-label="Next month">
                        <svg viewBox="0 0 24 24" width="14" height="14"
                             fill="none" stroke="currentColor" stroke-width="2"
                             stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        const weekdayHTML = `
            <div class="date-picker__weekdays" aria-hidden="true">
                ${WEEKDAYS.map((w) => `<span>${w}</span>`).join('')}
            </div>
        `;

        const gridHTML = cells.map((d) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = sameDay(d, today);
            const isSelected = sameDay(d, selected);
            const cls = ['date-picker__day'];
            if (!inMonth) cls.push('is-outside');
            if (isToday) cls.push('is-today');
            if (isSelected) cls.push('is-selected');
            return `
                <button type="button" class="${cls.join(' ')}"
                        data-iso="${toISO(d)}"
                        aria-label="${d.toLocaleDateString(undefined, {
                            weekday: 'long', year: 'numeric',
                            month: 'long', day: 'numeric',
                        })}"
                        ${isSelected ? 'aria-current="true"' : ''}>
                    ${d.getDate()}
                </button>
            `;
        }).join('');

        const footerHTML = `
            <div class="date-picker__foot">
                <button type="button" class="date-picker__foot-btn date-picker__foot-btn--ghost"
                        data-action="clear">Clear</button>
                <button type="button" class="date-picker__foot-btn"
                        data-action="today">Today</button>
            </div>
        `;

        root.innerHTML = `
            ${headerHTML}
            ${weekdayHTML}
            <div class="date-picker__grid">${gridHTML}</div>
            ${footerHTML}
        `;
        positionPopover(root, anchor);
    }

    function commit(iso) {
        if (typeof onChange === 'function') onChange(iso);
        close();
    }

    function close() {
        if (active !== api) return;
        active = null;
        document.removeEventListener('click', onOutside, true);
        document.removeEventListener('keydown', onKey, true);
        window.removeEventListener('resize', reposition);
        window.removeEventListener('scroll', reposition, true);
        trap.deactivate();
        root.remove();
        if (typeof onClose === 'function') onClose();
    }

    function onOutside(e) {
        if (root.contains(e.target)) return;
        if (e.target === anchor || (anchor && anchor.contains(e.target))) return;
        close();
    }

    function onKey(e) {
        if (e.key === 'Escape') {
            e.stopPropagation();
            close();
            return;
        }
        // Arrow keys move the day cursor — only when focus is on a day.
        const focused = document.activeElement;
        if (!focused || !focused.classList.contains('date-picker__day')) return;
        const iso = focused.dataset.iso;
        const d = fromISO(iso);
        if (!d) return;
        let target = null;
        if (e.key === 'ArrowLeft') target = new Date(d.getTime() - 86_400_000);
        else if (e.key === 'ArrowRight') target = new Date(d.getTime() + 86_400_000);
        else if (e.key === 'ArrowUp') target = new Date(d.getTime() - 7 * 86_400_000);
        else if (e.key === 'ArrowDown') target = new Date(d.getTime() + 7 * 86_400_000);
        if (!target) return;
        e.preventDefault();
        target.setHours(0, 0, 0, 0);
        // If we walked off the visible month, repaint with the new cursor.
        if (target.getMonth() !== cursor.getMonth()
            || target.getFullYear() !== cursor.getFullYear()) {
            cursor = new Date(target.getFullYear(), target.getMonth(), 1);
            paint();
        }
        const next = root.querySelector(`[data-iso="${toISO(target)}"]`);
        if (next) next.focus();
    }

    function reposition() {
        if (root && document.body.contains(root)) {
            positionPopover(root, anchor);
        }
    }

    // Click handler — single delegate for all popover actions.
    root.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]');
        if (action) {
            const what = action.dataset.action;
            if (what === 'prev') {
                cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
                paint();
            } else if (what === 'next') {
                cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
                paint();
            } else if (what === 'clear') {
                commit(null);
            } else if (what === 'today') {
                commit(toISO(todayLocal()));
            }
            return;
        }
        const day = e.target.closest('.date-picker__day');
        if (day) {
            commit(day.dataset.iso);
        }
    });

    paint();

    const trap = createFocusTrap(root);
    trap.activate(anchor);

    document.addEventListener('click', onOutside, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);

    // Auto-focus the selected day (if any) or today, so keyboard
    // navigation has somewhere to start.
    requestAnimationFrame(() => {
        const target = selected || todayLocal();
        const cell = root.querySelector(`[data-iso="${toISO(target)}"]`);
        if (cell) cell.focus();
        else {
            const first = root.querySelector('.date-picker__day:not(.is-outside)');
            if (first) first.focus();
        }
    });

    const api = { close };
    active = api;
    return api;
}
