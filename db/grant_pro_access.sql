-- Comp a user to the Pro tier without going through Stripe.
-- Paste this into the Supabase SQL editor and run.
-- Change the email below for future grants.

insert into public.billing (user_id, tier, status)
select id, 'pro', 'active'
from auth.users
where email = 'alex.di.master@gmail.com'
on conflict (user_id) do update
  set tier       = 'pro',
      status     = 'active',
      updated_at = now();

-- Verify it took. Should return one row: pro / active / <email>.
select b.tier, b.status, u.email
from public.billing b
join auth.users u on u.id = b.user_id
where u.email = 'alex.di.master@gmail.com';
