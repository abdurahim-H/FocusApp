-- 0002_sessions.sql
--
-- Per-Pomodoro session record. Every focus block becomes one row,
-- with timing, distraction telemetry, sound state, and a derived
-- focus-quality score. This is the substrate the analytics view +
-- personal-galaxy view + cinematic ritual all sit on top of.
--
-- We deliberately store the *raw signals* (timing, distraction count,
-- sound IDs, completion bool) rather than only the derived score so
-- the score formula can evolve without losing fidelity on past data.
--
-- How to apply: paste into the Supabase SQL editor and run.
-- Idempotent — safe to re-run.

create table if not exists public.sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,

    -- Timing — `started_at` and `ended_at` are wall-clock; the duration
    -- column is what we display so a clock change mid-session can't
    -- corrupt the record.
    started_at timestamptz not null,
    ended_at timestamptz not null,
    duration_seconds integer not null check (duration_seconds >= 0),

    -- The configured target the user committed to at start time. Lets
    -- us tell "ran the full 25 minutes" from "skipped at 12 minutes".
    target_duration_seconds integer not null check (target_duration_seconds > 0),
    completed boolean not null,

    -- 'focus' | 'short_break' | 'long_break'. Today only focus rows are
    -- written, but the column exists so future break-time analytics
    -- don't need a migration.
    kind text not null check (kind in ('focus', 'short_break', 'long_break')),

    -- Attention quality signals. distraction_count = times the tab went
    -- hidden during the session; distraction_seconds = cumulative time
    -- away. focus_quality is the derived 0..100 score.
    distraction_count integer not null default 0 check (distraction_count >= 0),
    distraction_seconds integer not null default 0 check (distraction_seconds >= 0),
    focus_quality smallint check (focus_quality between 0 and 100),

    -- Snapshot of which ambient sound IDs were active when the session
    -- started. Lets us correlate sound choice with focus quality
    -- without needing a separate join table.
    active_sounds text[] not null default '{}',

    -- Tasks-on-the-deck context. We don't have a persistent task model
    -- (tasks today are session-scoped), so we just record counts.
    task_count integer not null default 0 check (task_count >= 0),
    tasks_completed integer not null default 0 check (tasks_completed >= 0),

    created_at timestamptz not null default now()
);

-- Most queries are "this user, recent first".
create index if not exists sessions_user_started_idx
    on public.sessions(user_id, started_at desc);

-- Day-bucket queries (heatmaps, streaks) hit this one.
create index if not exists sessions_user_started_date_idx
    on public.sessions(user_id, (started_at::date));

alter table public.sessions enable row level security;

drop policy if exists "users see their own sessions" on public.sessions;
create policy "users see their own sessions"
    on public.sessions
    for select
    to authenticated
    using (auth.uid() = user_id);

drop policy if exists "users insert their own sessions" on public.sessions;
create policy "users insert their own sessions"
    on public.sessions
    for insert
    to authenticated
    with check (auth.uid() = user_id);

drop policy if exists "users update their own sessions" on public.sessions;
create policy "users update their own sessions"
    on public.sessions
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "users delete their own sessions" on public.sessions;
create policy "users delete their own sessions"
    on public.sessions
    for delete
    to authenticated
    using (auth.uid() = user_id);
