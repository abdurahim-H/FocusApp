// Theme bootstrap — runs synchronously in <head> so paint never lands
// on the wrong palette. Kept separate from the main module bundle
// because module scripts are deferred and can't beat the first paint.
// Lives in /public/ so the URL stays stable (no content hash) and CSP
// can drop `'unsafe-inline'` for script-src.
(function () {
    var savedTheme = localStorage.getItem('fu_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            document.body.setAttribute('data-theme', savedTheme);
        });
    } else {
        document.body.setAttribute('data-theme', savedTheme);
    }
})();
