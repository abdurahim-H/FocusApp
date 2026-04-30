// Theme bootstrap — runs synchronously in <head> so paint never lands
// on the wrong palette. Kept separate from the main module bundle
// because module scripts are deferred and can't beat the first paint.
// Lives in /public/ so the URL stays stable (no content hash) and CSP
// can drop `'unsafe-inline'` for script-src.
(function () {
    var savedTheme = localStorage.getItem('fu_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    // Scene theme uses its own attribute so the chrome palette can scope
    // overrides under `[data-scene-theme="sakura"]` without colliding with
    // the color theme. Read directly from the settings store's localStorage
    // key so first paint matches the saved scene.
    var savedScene = 'blackhole';
    try {
        var raw = localStorage.getItem('fu_settings_v2');
        if (raw) {
            var parsed = JSON.parse(raw);
            if (parsed && typeof parsed['scene.theme'] === 'string') {
                savedScene = parsed['scene.theme'];
            }
        }
    } catch (_) { /* tolerate parse errors — fallback below */ }
    if (savedScene === 'aurora-plain') savedScene = 'blackhole';
    document.documentElement.setAttribute('data-scene-theme', savedScene);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            document.body.setAttribute('data-theme', savedTheme);
            document.body.setAttribute('data-scene-theme', savedScene);
        });
    } else {
        document.body.setAttribute('data-theme', savedTheme);
        document.body.setAttribute('data-scene-theme', savedScene);
    }
})();
