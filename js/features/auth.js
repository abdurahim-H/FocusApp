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
//   signUpWithPassword(email, password)         → Promise<{ confirmationRequired }>
//   signInWithPassword(email, password)         → Promise<void>
//   signInWithMagicLink(email)                  → Promise<void>
//   signInWithOAuth(provider)                   → Promise<void>
//   sendPasswordReset(email)                    → Promise<void>
//   signOut()                                   → Promise<void>
//   onChange(fn)                                → unsubscribe — fn({user, session})
//
// The Supabase JS SDK is loaded lazily from esm.sh on first use so the
// initial page weight isn't paid by users who never sign in.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './auth-config.js';

let client = null;
let clientPromise = null;
let cachedSession = null;
let cachedUser = null;
const subscribers = new Set();

/** True only when both Supabase URL and anon key are real (not placeholders). */
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
        throw new Error('Auth not configured. Fill in js/features/auth-config.js.');
    }
    if (client) return client;
    if (clientPromise) return clientPromise;
    clientPromise = (async () => {
        const mod = await import('https://esm.sh/@supabase/supabase-js@2');
        client = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            },
        });
        // Bridge Supabase's auth events into our subscriber set.
        client.auth.onAuthStateChange((_event, session) => {
            cachedSession = session;
            cachedUser = session?.user ?? null;
            for (const fn of subscribers) {
                try { fn({ user: cachedUser, session: cachedSession }); }
                catch (e) { console.error('[auth] subscriber threw:', e); }
            }
        });
        // Hydrate the initial session on cold start.
        const { data } = await client.auth.getSession();
        cachedSession = data.session ?? null;
        cachedUser = cachedSession?.user ?? null;
        for (const fn of subscribers) {
            try { fn({ user: cachedUser, session: cachedSession }); }
            catch (_) {}
        }
        return client;
    })();
    return clientPromise;
}

/** Eagerly initialise — call once on app boot if you want session restored
 *  before the user clicks the trigger. Safe to call multiple times. */
export async function init() {
    if (!isConfigured()) return;
    try { await getClient(); } catch (e) { console.warn('[auth] init failed:', e); }
}

export function getUser() { return cachedUser; }
export function getSession() { return cachedSession; }

export async function signInWithMagicLink(email) {
    const c = await getClient();
    const { error } = await c.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: `${window.location.origin}/auth/callback.html`,
        },
    });
    if (error) throw error;
}

/** Create a new account with email + password. Sends a confirmation
 *  email if the project requires email verification (default). Returns
 *  { confirmationRequired: bool } so the UI can show the right next
 *  step ("check your inbox" vs "you're signed in"). */
export async function signUpWithPassword(email, password) {
    const c = await getClient();
    const { data, error } = await c.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${window.location.origin}/auth/callback.html`,
        },
    });
    if (error) throw error;
    // If the project has "Confirm email" enabled, signUp returns a
    // user but no session — Supabase signals "please verify" by setting
    // session: null. If confirmation is disabled (dev convenience),
    // the user is auto-signed-in and a session is returned.
    return { confirmationRequired: !data?.session };
}

/** Sign in with email + password. Throws on bad credentials, on
 *  unconfirmed email, etc. — caller catches and surfaces err.message. */
export async function signInWithPassword(email, password) {
    const c = await getClient();
    const { error } = await c.auth.signInWithPassword({ email, password });
    if (error) throw error;
}

/** Send a password-reset email. The reset link lands on
 *  /auth/callback.html with a recovery token; the SDK handles it
 *  via detectSessionInUrl and the user can set a new password via
 *  c.auth.updateUser({ password }) once authenticated. */
export async function sendPasswordReset(email) {
    const c = await getClient();
    const { error } = await c.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback.html`,
    });
    if (error) throw error;
}

export async function signInWithOAuth(provider) {
    const c = await getClient();
    const { error } = await c.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${window.location.origin}/auth/callback.html`,
        },
    });
    if (error) throw error;
}

export async function signOut() {
    const c = await getClient();
    const { error } = await c.auth.signOut();
    if (error) throw error;
    cachedSession = null;
    cachedUser = null;
}

export function onChange(fn) {
    subscribers.add(fn);
    // Fire once with the current state so the subscriber doesn't have to
    // race the initial hydrate.
    queueMicrotask(() => {
        try { fn({ user: cachedUser, session: cachedSession }); } catch (_) {}
    });
    return () => subscribers.delete(fn);
}
