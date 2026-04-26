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
