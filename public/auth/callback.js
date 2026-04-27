// callback.js — runs the auth-callback redirect logic.
//
// Supabase puts the session in the URL fragment (#access_token=…) for
// magic-link, or in the search string (?code=…) for the PKCE OAuth
// flow. We MUST preserve both when redirecting back to / — the SDK's
// detectSessionInUrl reads window.location at boot to pick the session
// out, and a bare /-redirect throws the tokens away.
//
// Supabase also appends ?error=…&error_description=… (or the same in
// the hash) when the auth attempt failed — we surface those here
// instead of looping the user back to the app silently.
//
// Externalised from callback.html so the CSP can drop `'unsafe-inline'`
// from script-src.
(function () {
    var qs = new URLSearchParams(window.location.search);
    var hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    var error = qs.get('error') || hashParams.get('error');
    var description =
        qs.get('error_description') || hashParams.get('error_description');

    if (error) {
        var wrap = document.getElementById('wrap');
        wrap.classList.add('error');
        document.getElementById('title').textContent =
            error === 'access_denied' ? 'Sign-in cancelled' : 'Sign-in didn’t work';
        document.getElementById('body').textContent = description
            ? decodeURIComponent(description.replace(/\+/g, ' '))
            : 'The sign-in link may have expired or been used already.';
        var back = document.createElement('a');
        back.href = '/';
        back.textContent = 'Back to Cosmic Focus';
        wrap.appendChild(back);
        return;
    }

    // Happy path — preserve search + hash so the SDK at / can pick up
    // the session. ~500ms gives the loading animation a beat.
    setTimeout(function () {
        var dest = '/' + window.location.search + window.location.hash;
        window.location.replace(dest);
    }, 500);
})();
