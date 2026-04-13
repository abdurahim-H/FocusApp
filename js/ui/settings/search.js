// settings/search.js
//
// Very small fuzzy-match filter that hides setting rows whose label/help/key
// doesn't contain the query. Works by toggling a `.sr-hidden` class on each
// row's DOM element (which the renderer tags with `data-search-index`).

let searchIndex = []; // [{ el, haystack }]

export function registerSearchable(el, label, help = '', key = '') {
    const haystack = `${label} ${help} ${key}`.toLowerCase();
    el.dataset.searchIndex = String(searchIndex.length);
    searchIndex.push({ el, haystack });
}

export function clearSearchIndex() {
    searchIndex = [];
}

export function applyQuery(q) {
    const query = (q || '').trim().toLowerCase();
    if (!query) {
        for (const item of searchIndex) item.el.classList.remove('sr-hidden');
        return searchIndex.length;
    }
    // Simple substring match on each whitespace-separated token — all tokens
    // must be present in the haystack.
    const tokens = query.split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const item of searchIndex) {
        const match = tokens.every(t => item.haystack.includes(t));
        item.el.classList.toggle('sr-hidden', !match);
        if (match) visible++;
    }
    return visible;
}
