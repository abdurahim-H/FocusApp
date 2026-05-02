-- 0003_billing.sql
--
-- Subscription state for the Pro tier. One row per user. Truth lives
-- here, not in the client — the client reads its own tier through the
-- get_my_tier() RPC below; only the Stripe webhook (running with the
-- service-role key) writes.
--
-- Why a separate table (vs. dropping a column on auth.users):
--   • auth.users is Supabase-managed; we don't add columns there.
--   • RLS lives cleanly on a public table.
--   • Stripe identifiers (customer_id, subscription_id) belong in our
--     schema, not in auth metadata.
--
-- How to apply: paste into the Supabase SQL editor and run.
-- Idempotent — safe to re-run.

create table if not exists public.billing (
    user_id uuid primary key references auth.users(id) on delete cascade,

    -- Tier flag — what every isPro() check ultimately resolves to.
    -- We deliberately don't trust the Stripe subscription status as
    -- the gate; we collapse Stripe's many statuses ('active', 'trialing',
    -- 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired')
    -- into our own two-state tier: 'free' or 'pro'. The webhook owns
    -- that mapping (see js side / edge function).
    tier text not null default 'free'
        check (tier in ('free', 'pro')),

    -- Stripe identifiers. Nullable for free users. Stored as text so
    -- the schema doesn't pin to Stripe's id format if it ever changes.
    stripe_customer_id text,
    stripe_subscription_id text,
    stripe_price_id text,

    -- Raw status from Stripe ('active', 'trialing', 'past_due', etc.).
    -- Useful for debugging and for rendering the Settings → Account
    -- row ("Trial — 4 days left", "Past due — update your payment").
    status text not null default 'inactive',

    -- Period end (renews_at in Stripe terms). When tier='pro' and now()
    -- exceeds this without a webhook flipping us back to 'pro' on the
    -- next cycle, something has gone wrong — log it.
    current_period_end timestamptz,

    -- Trial expiry. Null after the trial converts (or expires).
    trial_ends_at timestamptz,

    -- Bookkeeping for debugging webhook order-of-operations issues.
    updated_at timestamptz not null default now()
);

create index if not exists billing_stripe_customer_idx
    on public.billing(stripe_customer_id);
create index if not exists billing_stripe_subscription_idx
    on public.billing(stripe_subscription_id);

alter table public.billing enable row level security;

-- The user can read their OWN row directly (so the client could fetch
-- it for debug if needed) — but the canonical client path is the RPC
-- below, which returns only the tier string and dodges the rest of
-- the row entirely.
drop policy if exists "user reads own billing" on public.billing;
create policy "user reads own billing"
    on public.billing
    for select
    to authenticated
    using (auth.uid() = user_id);

-- No insert/update/delete policies. The Stripe webhook runs with the
-- service-role key, which bypasses RLS entirely; that's the only path
-- that mutates this table. Anonymous users have zero access.

-- ============================================================================
-- get_my_tier() — what the client actually calls.
--
-- Returns 'free' or 'pro' for the calling authed user. Defaults to
-- 'free' for users with no billing row yet (the common case before
-- their first checkout). SECURITY DEFINER so we can read the row
-- without exposing a SELECT policy that returns more than the tier.
-- ============================================================================
create or replace function public.get_my_tier()
returns text
language sql
security definer
set search_path = public
as $$
    select coalesce(
        (select tier from public.billing where user_id = auth.uid()),
        'free'
    )
$$;

-- Allow authed users to invoke the RPC. Anon callers get nothing — we
-- want every billing-relevant action to be tied to a logged-in identity.
revoke all on function public.get_my_tier() from public, anon;
grant execute on function public.get_my_tier() to authenticated;

-- ============================================================================
-- updated_at trigger — keep the bookkeeping column honest so support
-- queries can answer "when did this user's tier last change?"
-- ============================================================================
create or replace function public.billing_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists billing_touch_updated_at on public.billing;
create trigger billing_touch_updated_at
    before update on public.billing
    for each row
    execute function public.billing_touch_updated_at();
