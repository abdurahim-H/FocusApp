-- 0001_usernames.sql
--
-- Reservation table for unique handles (the @username field on the
-- account modal). Lives separate from auth.users so the standard RLS
-- model applies cleanly: the row is owned by user_id, the table is
-- never directly readable by anon, and the public "is this handle
-- taken" probe goes through a SECURITY DEFINER function that returns
-- only a boolean — user_id never leaves the database.
--
-- Why a separate table:
--   • auth.users.raw_user_meta_data is JSONB and we don't want to add
--     a unique partial index there — it touches the Supabase-managed
--     schema and the column shape can change between SDK versions.
--   • A dedicated relation gives us a clean PRIMARY KEY constraint
--     that does the heavy lifting of "two users can't take the same
--     handle" with no application-level race window.
--
-- How to apply: paste this into the Supabase SQL editor and run.
-- Idempotent — safe to re-run.

create table if not exists public.usernames (
    -- Lowercase canonical form. Same character set the client
    -- enforces in sanitiseUsername (auth.js).
    username text primary key
        check (
            length(username) between 2 and 30
            and username ~ '^[a-z0-9._-]+$'
        ),
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

-- One handle per user — prevents a user from racing themselves into
-- two different rows.
create unique index if not exists usernames_user_id_unique
    on public.usernames(user_id);

alter table public.usernames enable row level security;

-- Authed users can read their OWN row (so the client can find out
-- which handle they currently own when switching). Nobody (anon
-- included) can read other users' rows directly. Public availability
-- probes go through is_username_taken() below.
drop policy if exists "anyone can read usernames" on public.usernames;
drop policy if exists "users see their own username row" on public.usernames;
create policy "users see their own username row"
    on public.usernames
    for select
    to authenticated
    using (auth.uid() = user_id);

-- Only an authenticated user can claim a handle, and only for
-- themselves. The PRIMARY KEY on `username` enforces uniqueness.
drop policy if exists "users claim their own username" on public.usernames;
create policy "users claim their own username"
    on public.usernames
    for insert
    to authenticated
    with check (auth.uid() = user_id);

-- A user can release their handle (replacing it with a different
-- one is a delete + insert).
drop policy if exists "users delete their own username" on public.usernames;
create policy "users delete their own username"
    on public.usernames
    for delete
    to authenticated
    using (auth.uid() = user_id);

-- Public availability probe. SECURITY DEFINER so it can read across
-- RLS, but the function only returns a boolean — user_id stays on the
-- server. Locked-down search_path defeats trojan-schema attacks.
create or replace function public.is_username_taken(uname text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1 from public.usernames
        where username = lower(uname)
    );
$$;

revoke all on function public.is_username_taken(text) from public;
grant execute on function public.is_username_taken(text) to anon, authenticated;
