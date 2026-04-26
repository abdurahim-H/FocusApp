// auth-config.js — Supabase project credentials.
//
// Replace the two placeholder strings below with your real Supabase
// project URL and anon (public) key from
// Supabase dashboard → Project Settings → API.
//
// Both values are PUBLIC — the anon key is meant to ship in the client.
// Row Level Security on Supabase is what protects your data, not key
// secrecy. Do NOT put your service-role key here.
//
// While these remain placeholders, isConfigured() returns false and the
// auth modal shows a "not yet configured" notice instead of a broken
// flow. This keeps the build green even without a Supabase project.

export const SUPABASE_URL = 'YOUR_SUPABASE_URL';
export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
