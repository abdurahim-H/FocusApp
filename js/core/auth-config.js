// auth-config.js — Supabase project credentials.
//
// Both values are PUBLIC. The publishable / anon key is meant to ship
// in the client; Row Level Security on the Supabase database is what
// protects user data, not key secrecy. Do NOT put a `service_role`
// or `sb_secret_*` key here — those are admin keys and must stay
// server-side only.
//
// While these are placeholders, isConfigured() returns false and the
// auth modal shows a "not yet configured" notice instead of a broken
// flow. With real values plugged in, magic-link sign-in is live.

export const SUPABASE_URL = 'https://gctgnctloknqbbqxcewu.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_JRlgFJRGSQvU1B-As8hOrw_vNKSUrt7';

// Spotify Web API + Web Playback SDK Client ID. Public by design —
// PKCE auth flow doesn't use a client secret on the browser side, so
// shipping this in source is safe. The two registered redirect URIs
// (`https://universefocuses.com/auth/callback.html` and the `www.`
// variant) are the only places Spotify will redirect back to.
export const SPOTIFY_CLIENT_ID = '0a4c5843ff964ec78878fa8155689d01';
