// auth.js — single point of contact with the auth provider.
//
// IMPORTANT: this is the ONLY file in the codebase allowed to import
// from `@supabase/supabase-js`. Everything else calls the thin API
// exposed below. If we ever swap providers, this file is the only one
// that changes.
//
// Public surface:
//   isConfigured()                              → bool
//   getUser()                                   → user | null
//   getSession()                                → session | null
//   signUpWithPassword(email, password, meta)   → Promise<{ confirmationRequired }>
//   signInWithPassword(email, password)         → Promise<void>
//   signInWithMagicLink(email)                  → Promise<void>
//   signInWithOAuth(provider)                   → Promise<void>
//   sendPasswordReset(email)                    → Promise<void>
//   signOut()                                   → Promise<void>     (idempotent)
//   onChange(fn)                                → unsubscribe — fn({user, session})
//
// All network-bound calls are wrapped with a 20-second timeout so a
// stalled request can't hang the UI forever. The Supabase JS SDK is
// bundled from node_modules and lazy-loaded on first use, so the
// initial page weight isn't paid by users who never sign in.
//
// SECURITY NOTES:
//   • We sanitise user-controlled metadata at the boundary (length caps,
//     character restrictions) so a malformed value can't poison
//     downstream consumers. Server-side validation is still required;
//     this is a safety net, not the gate.
//   • Errors from Supabase are normalised — internal messages aren't
//     surfaced verbatim. account.js translates the typed `code`
//     property into user-facing copy.
//   • Multi-tab sync works automatically via Supabase's storage-event
//     bridge: when one tab signs in/out, others receive an
//     onAuthStateChange event. Our `onChange` subscribers see it.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './auth-config.js';
import { validatePassword, isPasswordBreached } from './password-policy.js';

let client = null;
let clientPromise = null;
let cachedSession = null;
let cachedUser = null;
const subscribers = new Set();

const REQUEST_TIMEOUT_MS = 20_000;

// ───────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────

/** Wrap a promise so it rejects after `ms` if it hasn't settled yet. */
function withTimeout(promise, ms = REQUEST_TIMEOUT_MS, label = 'auth') {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
            const err = new Error('The request took too long. Check your connection and try again.');
            err.code = 'timeout';
            err.label = label;
            reject(err);
        }, ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Cap a string and trim it. Returns '' for empty input. */
function clampString(value, maxLen) {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
}

/** True for a syntactically reasonable email. Not a full RFC validator
 *  — that's the server's job — just enough to reject obvious garbage. */
function isPlausibleEmail(email) {
    if (typeof email !== 'string') return false;
    if (email.length < 3 || email.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

// ───────────────────────────────────────────────────────────────────────
// Configuration / lazy SDK init
// ───────────────────────────────────────────────────────────────────────

/** True only when both Supabase URL and key are real (not placeholders). */
export function isConfigured() {
    return Boolean(
        SUPABASE_URL &&
            SUPABASE_ANON_KEY &&
            !SUPABASE_URL.includes('YOUR_SUPABASE') &&
            !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE')
    );
}

/** Lazily import supabase-js and create the client on first use. */
async function getClient() {
    if (!isConfigured()) {
        const err = new Error('Auth not configured. Fill in js/features/auth-config.js.');
        err.code = 'not_configured';
        throw err;
    }
    if (client) return client;
    if (clientPromise) return clientPromise;
    clientPromise = (async () => {
        // Bundled by Vite from node_modules — served from our origin so
        // CSP can stay tight (`script-src 'self'`) and there's no
        // third-party CDN in the auth path. Vite chunk-splits dynamic
        // imports, so the SDK is still lazy.
        const mod = await import('@supabase/supabase-js');
        client = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            },
        });
        // Bridge Supabase's auth events into our subscriber set. This
        // also bridges multi-tab sync — Supabase fires this event when
        // another tab changes the persisted session.
        client.auth.onAuthStateChange((event, session) => {
            cachedSession = session;
            cachedUser = session?.user ?? null;
            notifySubscribers();
            // Deferred username claim. The signup-confirmation case
            // can't claim at signup time (no JWT until verification)
            // so we retry on every sign-in. Idempotent — calling it
            // for an already-claimed handle is a no-op.
            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && cachedUser) {
                tryClaimMetadataUsername().catch(() => {});
            }
        });
        // Hydrate the initial session on cold start.
        try {
            const { data } = await client.auth.getSession();
            cachedSession = data?.session ?? null;
            cachedUser = cachedSession?.user ?? null;
            notifySubscribers();
            if (cachedUser) tryClaimMetadataUsername().catch(() => {});
        } catch (e) {
            // Hydrate failure shouldn't kill the client — the user can
            // still try to sign in fresh. Log and continue.
            console.warn('[auth] initial session hydrate failed:', e?.message || e);
        }
        return client;
    })();
    return clientPromise;
}

function notifySubscribers() {
    for (const fn of subscribers) {
        try { fn({ user: cachedUser, session: cachedSession }); }
        catch (e) { console.error('[auth] subscriber threw:', e); }
    }
}

/** Eagerly initialise — call once on app boot if you want session restored
 *  before the user clicks the trigger. Safe to call multiple times. */
export async function init() {
    if (!isConfigured()) return;
    try { await getClient(); } catch (e) { console.warn('[auth] init failed:', e?.message || e); }
}

export function getUser() { return cachedUser; }
export function getSession() { return cachedSession; }

// ───────────────────────────────────────────────────────────────────────
// Auth flows
// ───────────────────────────────────────────────────────────────────────

export async function signInWithMagicLink(email) {
    if (!isPlausibleEmail(email)) throwTyped('invalid_email', 'That email doesn’t look right.');
    const c = await getClient();
    const { error } = await withTimeout(
        c.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback.html` },
        }),
        REQUEST_TIMEOUT_MS,
        'magic-link'
    );
    if (error) throw normaliseError(error);
}

/** Create a new account with email + password. Optionally attaches
 *  display name + username to the user's metadata, both length-capped
 *  and (for username) character-restricted at the boundary so we never
 *  store unbounded user-supplied strings. */
export async function signUpWithPassword(email, password, { name, username } = {}) {
    if (!isPlausibleEmail(email)) throwTyped('invalid_email', 'That email doesn’t look right.');
    const policy = validatePassword(password);
    if (!policy.ok) throwTyped('weak_password', policy.message);
    // HIBP k-anonymity check — the password itself never leaves the browser.
    // Network failures inside isPasswordBreached resolve to false so a
    // flaky API can't gate sign-up; the policy + common-password checks
    // above are still enforced.
    if (await isPasswordBreached(password)) {
        throwTyped(
            'breached_password',
            'This password has appeared in a known data breach — choose a different one for safety.'
        );
    }
    const cleanName = clampString(name, 60);
    const cleanUsername = sanitiseUsername(username);
    // Pre-check the handle so we don't burn a sign-up attempt only to
    // discover the handle is taken. The post-signup claim is the
    // authoritative gate (it's the one that races against PRIMARY KEY)
    // — this just saves a round-trip in the common case.
    if (cleanUsername) {
        const free = await isUsernameAvailable(cleanUsername);
        if (free === false) {
            throwTyped('username_taken',
                `“${cleanUsername}” is already taken. Pick another.`);
        }
    }
    const c = await getClient();
    const data = {};
    if (cleanName) data.name = cleanName;
    if (cleanUsername) data.username = cleanUsername;
    const { data: result, error } = await withTimeout(
        c.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback.html`,
                data,
            },
        }),
        REQUEST_TIMEOUT_MS,
        'signup'
    );
    if (error) throw normaliseError(error);
    // If a session came back (email confirmation off), claim the
    // handle right away. With confirmation on we can't claim yet — RLS
    // requires an authed JWT, and the user has none until they verify.
    // The onAuthStateChange handler picks up the deferred claim on
    // first sign-in.
    if (cleanUsername && result?.session) {
        const status = await claimUsername(cleanUsername);
        if (status === 'taken') {
            throwTyped('username_taken_after_signup',
                `Your account was created, but “${cleanUsername}” was just taken. Choose another username from your profile.`);
        }
    }
    return { confirmationRequired: !result?.session };
}

/** Cheap availability probe for the sign-up form's live validation.
 *  Calls the SECURITY DEFINER `public.is_username_taken(text)` RPC so
 *  unauthenticated users can probe without us exposing the
 *  username → user_id mapping. Returns:
 *    true   — handle is free
 *    false  — handle is taken
 *    null   — couldn't check (offline, RPC missing, RLS issue) —
 *             caller should show no signal rather than block. */
export async function isUsernameAvailable(username) {
    const cleaned = sanitiseUsername(username);
    if (!cleaned) return false;
    if (!isConfigured()) return null;
    try {
        const c = await getClient();
        const { data, error } = await withTimeout(
            c.rpc('is_username_taken', { uname: cleaned }),
            REQUEST_TIMEOUT_MS,
            'username-check'
        );
        if (error) return null;
        // The RPC returns a boolean; coerce defensively.
        return data === false;
    } catch (_) {
        return null;
    }
}

/** Claim a handle for the current user. Idempotent — calling with a
 *  handle the user already owns is a no-op success. Switching handles
 *  is allowed (existing row is released first). Returns:
 *    true        — claim succeeded
 *    'taken'     — somebody else owns this handle
 *    'invalid'   — handle didn't pass character / length check
 *    'no-auth'   — no current user session (claim is deferred until sign-in)
 *    'network'   — couldn't reach Supabase or unknown DB error
 *  Also mirrors the handle into user_metadata.username so the rest of
 *  the UI (tooltip, dropdown) sees it without a separate query. */
export async function claimUsername(username) {
    const cleaned = sanitiseUsername(username);
    if (!cleaned) return 'invalid';
    if (!cachedUser) return 'no-auth';
    try {
        const c = await getClient();
        // What does this user currently own?
        const { data: mine, error: lookupErr } = await c
            .from('usernames')
            .select('username')
            .eq('user_id', cachedUser.id)
            .maybeSingle();
        if (lookupErr) return 'network';
        if (mine?.username === cleaned) {
            // Already mine. Make sure user_metadata is in sync.
            await c.auth.updateUser({ data: { username: cleaned } }).catch(() => {});
            return true;
        }
        if (mine?.username) {
            // Switching handles — release the old reservation first.
            const { error: delErr } = await c
                .from('usernames')
                .delete()
                .eq('user_id', cachedUser.id);
            if (delErr) return 'network';
        }
        const { error: insErr } = await c
            .from('usernames')
            .insert({ username: cleaned, user_id: cachedUser.id });
        if (!insErr) {
            await c.auth.updateUser({ data: { username: cleaned } }).catch(() => {});
            return true;
        }
        // 23505 = unique_violation in Postgres. Some Supabase-PostgREST
        // shapes surface this on `error.code` and others on
        // `error.details`; check both for robustness.
        if (insErr.code === '23505' || /duplicate key|already exists/i.test(insErr.message || '')) {
            return 'taken';
        }
        return 'network';
    } catch (_) {
        return 'network';
    }
}

// ───────────────────────────────────────────────────────────────────────
// Sessions data layer
// ───────────────────────────────────────────────────────────────────────
//
// Auth.js stays the single point of contact with Supabase. Anything
// that needs to read or write app-owned tables goes through one of
// these typed helpers, so a future provider swap only edits this file.

/** Persist a focus-session record to public.sessions. Returns the
 *  inserted row's id on success, null on any failure (offline, RLS,
 *  not signed in). The caller already has a local copy; this is just
 *  the cloud mirror. */
export async function recordSessionRemote(record) {
    if (!cachedUser) return null;
    try {
        const c = await getClient();
        const { data, error } = await withTimeout(
            c.from('sessions')
                .insert({
                    user_id: cachedUser.id,
                    started_at: new Date(record.startedAt).toISOString(),
                    ended_at: new Date(record.endedAt).toISOString(),
                    duration_seconds: record.durationSeconds,
                    target_duration_seconds: record.targetDurationSeconds,
                    completed: record.completed,
                    kind: record.kind,
                    distraction_count: record.distractionCount,
                    distraction_seconds: record.distractionSeconds,
                    focus_quality: record.focusQuality,
                    active_sounds: record.activeSounds,
                    task_count: record.taskCount,
                    tasks_completed: record.tasksCompleted,
                })
                .select('id')
                .single(),
            REQUEST_TIMEOUT_MS,
            'session-record'
        );
        if (error) return null;
        return data?.id ?? null;
    } catch (_) {
        return null;
    }
}

/** Pull recent session rows from cloud — used to hydrate the local
 *  cache on first sign-in or when the local data is older than cloud.
 *  Returns the rows newest-first, or null on any failure. */
export async function fetchRecentSessionsRemote({ limit = 1000 } = {}) {
    if (!cachedUser) return null;
    try {
        const c = await getClient();
        const { data, error } = await withTimeout(
            c.from('sessions')
                .select('*')
                .order('started_at', { ascending: false })
                .limit(limit),
            REQUEST_TIMEOUT_MS,
            'sessions-fetch'
        );
        if (error) return null;
        return data || [];
    } catch (_) {
        return null;
    }
}

/** Best-effort: when a user signs in, sync their user_metadata.username
 *  with the public.usernames reservation. Handles the
 *  email-confirmation case where the original sign-up couldn't claim
 *  (no JWT yet). Silent on every failure mode — the user still has an
 *  account and a tooltip handle even if the row never lands. */
async function tryClaimMetadataUsername() {
    const handle = cachedUser?.user_metadata?.username;
    if (!handle) return;
    const status = await claimUsername(handle);
    if (status === 'taken') {
        // Their preferred handle was taken in the gap between signup
        // and first sign-in. Strip it from metadata so the UI doesn't
        // imply they own a unique handle they don't.
        try {
            const c = await getClient();
            await c.auth.updateUser({ data: { username: null } });
        } catch (_) {}
    }
}

/** Sign in with email + password. */
export async function signInWithPassword(email, password) {
    if (!isPlausibleEmail(email)) throwTyped('invalid_email', 'That email doesn’t look right.');
    if (typeof password !== 'string' || password.length === 0) {
        throwTyped('missing_password', 'Enter your password.');
    }
    const c = await getClient();
    const { error } = await withTimeout(
        c.auth.signInWithPassword({ email, password }),
        REQUEST_TIMEOUT_MS,
        'signin'
    );
    if (error) throw normaliseError(error);
}

/** Send a password-reset email. */
export async function sendPasswordReset(email) {
    if (!isPlausibleEmail(email)) throwTyped('invalid_email', 'That email doesn’t look right.');
    const c = await getClient();
    const { error } = await withTimeout(
        c.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback.html`,
        }),
        REQUEST_TIMEOUT_MS,
        'reset'
    );
    if (error) throw normaliseError(error);
}

export async function signInWithOAuth(provider) {
    if (provider !== 'google' && provider !== 'apple') {
        throwTyped('invalid_provider', 'Unknown sign-in provider.');
    }
    const c = await getClient();
    const { error } = await withTimeout(
        c.auth.signInWithOAuth({
            provider,
            options: { redirectTo: `${window.location.origin}/auth/callback.html` },
        }),
        REQUEST_TIMEOUT_MS,
        'oauth'
    );
    if (error) throw normaliseError(error);
}

/** Idempotent sign-out — even if the server call fails (token already
 *  invalid, network down), we clear the local session. The intent is
 *  "leave"; we honour it locally regardless of server outcome. */
export async function signOut() {
    const wasConfigured = isConfigured();
    let serverErr = null;
    if (wasConfigured) {
        try {
            const c = await getClient();
            const { error } = await withTimeout(c.auth.signOut(), REQUEST_TIMEOUT_MS, 'signout');
            serverErr = error || null;
        } catch (e) {
            serverErr = e;
        }
    }
    cachedSession = null;
    cachedUser = null;
    notifySubscribers();
    if (serverErr) {
        console.warn('[auth] signOut server call failed (signed out locally anyway):',
            serverErr?.message || serverErr);
    }
}

export function onChange(fn) {
    subscribers.add(fn);
    // Fire once with the current state so the subscriber doesn't have
    // to race the initial hydrate.
    queueMicrotask(() => {
        try { fn({ user: cachedUser, session: cachedSession }); } catch (_) {}
    });
    return () => subscribers.delete(fn);
}

// ───────────────────────────────────────────────────────────────────────
// Sanitisation + error normalisation
// ───────────────────────────────────────────────────────────────────────

/** Normalise a username at the boundary: lowercase, strip leading @,
 *  drop any character outside [a-z0-9._-], cap to 30 chars. Returns ''
 *  if the cleaned result is shorter than 2. */
function sanitiseUsername(raw) {
    if (typeof raw !== 'string') return '';
    let s = raw.trim().replace(/^@+/, '').toLowerCase();
    s = s.replace(/[^a-z0-9._-]/g, '');
    if (s.length < 2) return '';
    return s.slice(0, 30);
}

/** Throw an Error with a typed `code` property. Lets the UI translate
 *  to friendly copy without parsing message strings. */
function throwTyped(code, message) {
    const err = new Error(message);
    err.code = code;
    throw err;
}

/** Map Supabase / SDK errors to typed errors with safe messages. The
 *  raw message is kept on `.rawMessage` for debug logging only — it
 *  never reaches the UI verbatim unless the UI explicitly chooses
 *  to. */
function normaliseError(err) {
    const raw = String(err?.message || err || '');
    const out = new Error(raw);
    out.rawMessage = raw;
    out.status = err?.status;
    if (/invalid login credentials/i.test(raw)) {
        out.code = 'invalid_credentials';
    } else if (/email not confirmed/i.test(raw)) {
        out.code = 'email_not_confirmed';
    } else if (/already registered|user already exists|already exists/i.test(raw)) {
        out.code = 'already_registered';
    } else if (/rate limit|too many requests/i.test(raw)) {
        out.code = 'rate_limited';
    } else if (/email rate limit exceeded/i.test(raw)) {
        out.code = 'rate_limited';
    } else if (/network|failed to fetch|connection/i.test(raw)) {
        out.code = 'network';
    } else if (err?.code === 'timeout') {
        out.code = 'timeout';
    } else {
        out.code = 'unknown';
    }
    return out;
}
