# Cosmic Focus — Monetization Strategy

A freemium plan with a **narrow** paywall: most of the app stays free; Pro
gates a small set of high-value features. Two SKUs only — Free and Pro.

> **⚠️ Paywall currently OFF.** As of the latest `[Unreleased]` changelog
> entry the paywall is disabled via the `PAYWALL_ENABLED` kill-switch in
> `js/features/billing.js` — every gated feature below is free for everyone.
> The gates and Stripe wiring are untouched; set `PAYWALL_ENABLED = true` to
> re-enable Pro exactly as documented here.

> **TL;DR.** Free covers daily focus work — the timer, tasks, sounds,
> all six scene themes (Black Hole / Sakura / Aurora / Celestial Garden
> / Silent Autumn / Ocean), the cosmos, statistics on Home, the Focus
> and Time sections of the Profile drawer. Pro adds the **Notes app**,
> the **Overview / Tasks / Sounds / Insights** sections of Profile,
> and (when built) **Spotify / YouTube Music / Apple Music
> integrations**. Pricing: **$5/mo or $55/yr**.

---

## 1. Pricing

| Plan | Cost | Notes |
|---|---|---|
| **Free** | $0 forever | No ads, no nag screens, no time-limited features. |
| **Pro Monthly** | **$5** | Recurring monthly. Cancel anytime. |
| **Pro Yearly** | **$55** | Recurring yearly. Saves one month vs. monthly. |

The yearly tier saves a user one month vs. paying monthly all year. It's
not pitched as a deep discount — it's a *commit-and-forget* option for
users who'd rather pay once a year than think about it monthly.

**Pitch on the upgrade screen:**

> *$5/month or $55/year — get a free month when you go yearly.*

---

## 2. What's Free (almost everything)

The whole core app is free, indefinitely, no limits.

- **Timer** — every cycle preset, every duration, auto-start, all goal
  rings, streak counter, personal-best alerts, schedules, daily/weekly
  goals.
- **Tasks** — unlimited tasks, subtasks, due dates, projects, time
  estimates, recurring, drag-reorder, carry-over, bulk actions.
- **Sounds** — full ambient library, unlimited saved constellations,
  per-track EQ + pan, sleep timer, surprise-me, auto-start mix on focus.
- **Themes** — Black Hole, Sakura, Aurora, Celestial Garden, Silent
  Autumn, Ocean, every future scene, all stream themes
  (YouTube/SoundCloud iframes), all advanced visual sliders,
  immersive mode.
- **Statistics on Home** — period tiles (today/week/month), momentum
  trail, 30-day calendar, total focus time, sessions today, tasks done.
- **Profile drawer**: **Focus** + **Time** sections — heatmaps, hour×day
  matrix, 365-day calendar spiral, polar best-hour curve, focus trend
  line, day-of-week split.
- **Wellness reminders** — eye rest, hydration, posture.
- **Account, sync foundation, notifications, settings, help center,
  onboarding, keyboard shortcuts, exports.**

Free Cosmic Focus is genuinely the best free Pomodoro app on the web.
That's the deal.

---

## 3. What's Pro (the narrow paywall)

### A. The Notepad — the entire app

The whole notes surface is Pro:

- Multi-note workspace (the data model is already multi-note)
- Note creation, editing, deletion
- Tags, search, pinned notes
- Templates (daily, weekly, meeting, brainstorm)
- Daily auto-prepend (greeting auto-creates today's note)
- Voice dictation
- Exports (Markdown, HTML, PDF)
- AI summaries (when shipped — these have a real third-party API cost)

For a free user, the `n` keyboard shortcut and the Notes button on the
cosmos toolbar both open the upgrade screen.

### B. Profile drawer — 4 of 6 sections

Free: **Focus**, **Time**.
Pro: **Overview**, **Tasks**, **Sounds**, **Insights**.

The free user sees the Profile drawer rail with all six section icons.
Tapping a free section opens it normally. Tapping a Pro section opens
a small in-place upgrade card — same visual register as the section
itself, with a soft Pro chip and a "Try Pro" button.

The four Pro sections each carry a clear value story:

- **Overview** — identity card + cosmic signature + KPI grid. The
  "your account at a glance" landing surface.
- **Tasks** — per-day task throughput, day-of-week + hour breakdowns,
  efficiency (tasks per hour of focus), tasks-per-session ratio.
- **Sounds** — usage distribution, *which sound actually correlates
  with deeper focus* (Cohen's d on focus-quality score). This is the
  single most surprising number in the whole app.
- **Insights** — plain-English summaries: regression trends,
  week-over-week deltas, anomaly callouts, friction-cost estimate of
  tab-switching during focus.

### C. Third-party music integrations

UI lives inside the Music drawer's Streaming tab (cosmos toolbar →
music note → Streaming). Five services are surfaced: **Spotify,
YouTube Music, Apple Music, YouTube, SoundCloud**. **Spotify is wired
end-to-end** — PKCE OAuth, /me identity fetch, mini-player widget,
Web API control endpoints, and search-and-play via /v1/search +
/me/player/play. The other four still surface a "wiring in progress"
toast until each has its own provider-side dashboard registration.

#### Spotify — current state

- **Status:** live as a Pro feature, **app is in Spotify Development
  Mode** so only the ≤5 emails listed in User Management can connect.
- **Client ID:** stored in `js/core/auth-config.js` (public — PKCE
  doesn't use a client secret).
- **Redirect URIs registered:** both `https://universefocuses.com/auth/callback.html`
  and the `www.` variant — Cloudflare's Worker entry redirects www to
  apex anyway, but registering both means OAuth doesn't break the
  rare case where Cloudflare's edge cache serves the www HTML.
- **Scopes used:** `user-read-email`, `user-read-private`,
  `streaming`, `user-modify-playback-state`, `user-read-playback-state`,
  `user-read-currently-playing`.
- **Where tokens live:** `localStorage` under `fu_spotify_tokens` and
  `fu_spotify_user`. No server-side storage today — Cosmic Focus
  itself never sees the user's tokens. Refresh happens client-side
  through the same PKCE token endpoint.

#### Spotify — Extension Request (going public)

To remove the 5-user cap and let any Spotify user connect, the app
has to graduate from Development Mode by submitting an **Extension
Request**. Spotify reviews it (1–3 weeks turnaround based on
community reports), and on approval the cap goes away forever.

**Submission form draft** — paste these straight into Spotify's form
when you fill it out at `developer.spotify.com` → app → Extension
Request:

> **Application name:** Cosmic Focus
>
> **Application URL:** https://universefocuses.com
>
> **Application description:**
> Cosmic Focus is a browser-based productivity timer (Pomodoro / focus
> sessions / task management) rendered on top of a real-time 3D
> ambient scene. Spotify integration is an optional Pro-tier feature
> that lets paying users connect their Spotify account, see what's
> currently playing, and control playback (play / pause / skip /
> search-and-play) from the focus screen — without leaving the
> productivity surface to switch apps.
>
> **How the app uses Spotify:**
> 1. PKCE OAuth handshake on the `Connect` button. No client secret;
>    no server-side token storage. Tokens land in the user's
>    `localStorage` and are used only by the user's own browser.
> 2. `GET /v1/me` once after connect to display the user's name and
>    detect Premium status (controls are disabled for Free accounts
>    with a Premium-required tooltip).
> 3. `GET /v1/me/player/currently-playing` polled every 10 s while the
>    mini-player widget is mounted, to keep "Now playing" metadata
>    fresh.
> 4. Web Playback SDK (`https://sdk.scdn.co/spotify-player.js`)
>    registers the user's browser as a Spotify Connect device named
>    "Cosmic Focus", so Premium users can use the browser as a
>    speaker.
> 5. `GET /v1/search?type=track` for the search-and-play row; results
>    play via `PUT /v1/me/player/play` with a track URI body.
> 6. `PUT /me/player/pause`, `POST /me/player/next`,
>    `POST /me/player/previous` for transport controls.
>
> **Commercial use:** Yes — Cosmic Focus has a Pro tier (USD $5/mo or
> $55/yr via Stripe). The Spotify integration is gated behind that
> Pro tier. Cosmic Focus does not redistribute, store, copy, or
> modify any Spotify content. The app acts only as a remote-control
> surface for playback the user initiates on their own account.
>
> **Authentication method:** PKCE (Authorization Code + PKCE). No
> client secret on the browser side; no server-side token exchange.
>
> **Data handling:**
> - Access + refresh tokens stored in the user's own browser
>   `localStorage` under `fu_spotify_tokens`.
> - Cached profile (display name, email, product tier) in
>   `fu_spotify_user`.
> - All of the above is wiped when the user disconnects from inside
>   Cosmic Focus or revokes access at spotify.com/account/apps.
> - Cosmic Focus has no server-side database of music data.
>
> **Privacy Policy:** https://universefocuses.com/privacy.html
> **Terms of Service:** https://universefocuses.com/terms.html
> **Estimated daily active users (year 1):** under 1,000.
>
> **Branding compliance:** the Spotify chip in the connect dock uses
> the Spotify mark in its connected state, sized at 22 px, on a
> contrasting glass card. We do not modify the mark, do not use it
> larger than other service marks, and link the user back to Spotify
> for account management (privacy.html section 4 has the
> spotify.com/account/apps link).

**Things to attach to the form**:
- App icon, square ≥512×512 PNG. Recommended: re-use `icon.svg` from
  `public/`, exported at 1024×1024 and downscaled.
- Demo video (15–30 s) or 3–5 screenshots showing: the Connect click
  → Spotify auth screen → returning to the app → mini-player
  populating with a track → search panel returning results.

Spotify reviews against [their developer policy](https://developer.spotify.com/policy)
and [design guidelines](https://developer.spotify.com/documentation/design).
The privacy policy + terms updates already include the disclosures
they look for (data handling, third-party compliance, revocation
path, no-affiliation statement).

#### Spotify — what's still TODO server-side

When MAU justifies it, move token storage to a Supabase Edge Function
+ a `spotify_tokens` table with RLS so server-side Pro enforcement
can gate refresh calls. Today's purely-client-side approach is fine
because we're nowhere near rate limits and no money is at stake on
each token refresh, but it doesn't scale.

#### The other four services

Same shape as Spotify but each has its own dashboard registration:

| Service        | Setup checklist                                                                                                                                                                                                |
|----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| YouTube Music  | No public API. Realistic option: use Google OAuth + the unofficial `ytmusicapi` proxy in an Edge Function. Set expectation that this one is the most fragile.                                                   |
| Apple Music    | Apple Developer Program ($99 / yr). Generate a MusicKit private key + team ID. Surface MusicKit JS on the page (CSP `script-src` allowance), prompt for Apple ID inside MusicKit's flow. No server token exchange — token stays client-side. |
| YouTube        | Google Cloud Console → OAuth consent screen → YouTube Data API v3 scope. Same redirect URI as the YT Music flow; can share the Edge Function.                                                                  |
| SoundCloud     | Already partially live as a backdrop stream. Full-account connect wants `developers.soundcloud.com` → register app → OAuth 2 token exchange in an Edge Function.                                                |

Once a Client ID + Edge Function exists for a provider, the wiring on
the client side is small: fill out the provider's branch of
`onClick(svc)` in `js/ui/music-services.js` (currently a one-line
upgrade-modal-or-toast switch), set the connection bit via the
already-exported `setConnected(serviceId, true)` after the callback
lands.

Why these belong on the Pro side: they require an OAuth handshake with
your server, refresh-token storage, and per-user API quota — *real*
per-user cost. Pro pays for it. Server-side enforcement (Edge
Function checks the caller's `tier='pro'` via the same
`get_my_tier()` RPC the client uses) keeps the gate honest even for
users who flip `isPro()` in devtools.

---

## 4. How the paywall actually gets implemented

This is the system. Five concrete pieces.

### Piece 1 — Payment provider: LemonSqueezy

**Recommendation: LemonSqueezy.** It's the cleanest option for a solo
dev shipping a global SaaS:

- **Merchant of record** — they handle tax / VAT / invoicing in every
  country. Stripe makes you handle that yourself or pay for Stripe
  Tax.
- **Subscription primitives built in** — monthly / yearly plans,
  trials, dunning, upgrades, refunds.
- **Hosted checkout** — a single URL the user lands on. No
  PCI-compliance work on your side.
- **Cost** — ~5% + 50¢ per transaction (vs Stripe's 2.9% + 30¢, but
  Stripe Tax adds +0.5–0.6% and you do tax registration yourself).

Stripe is fine if you want lower fees and don't mind running your own
tax stack. Paddle is the third option, similar shape to LemonSqueezy.

**Setup:**
- Create two products in LemonSqueezy: `pro-monthly` ($5) and
  `pro-yearly` ($55).
- Both as recurring subscriptions, not one-time.
- Enable a 7-day free trial on both.
- Configure a single webhook endpoint pointing at a Supabase Edge
  Function (Piece 4 below).

### Piece 2 — Database: tier flag in Supabase

The truth lives server-side. Add to the existing `usernames` migration
(or a new one in `db/migrations/`):

```sql
-- db/migrations/0002_billing.sql
create table if not exists public.billing (
    user_id uuid primary key references auth.users(id) on delete cascade,
    tier text not null default 'free',           -- 'free' | 'pro'
    ls_customer_id text,                          -- LemonSqueezy customer
    ls_subscription_id text,                      -- LemonSqueezy subscription
    ls_variant_id text,                           -- which plan: monthly/yearly
    status text not null default 'inactive',     -- 'active' | 'past_due' | 'cancelled' | 'expired'
    current_period_end timestamptz,               -- when the current period ends
    trial_ends_at timestamptz,                    -- null after trial ends
    updated_at timestamptz not null default now()
);

-- Read-only to the owner; only service-role (the webhook) writes.
alter table public.billing enable row level security;

create policy "billing readable by owner"
    on public.billing for select
    using (auth.uid() = user_id);

-- No insert/update/delete policies — only the service role (used
-- by the webhook handler) can mutate this table.

-- RPC for the client to check its own tier without hitting the table
-- directly. Keeps the contract narrow.
create or replace function public.get_my_tier()
returns text
language sql security definer
as $$
    select coalesce(
        (select tier from public.billing where user_id = auth.uid()),
        'free'
    )
$$;
```

The `security definer` on `get_my_tier()` lets a logged-in user read
their own tier without us having to expose the whole `billing` table.

### Piece 3 — Client gate: a single helper

Everything client-side reads through one function. Add a new file:

```js
// js/features/billing.js
import { getClient, isConfigured } from './auth.js';
import { signal, effect } from '../core/state.js';

export const tier = signal('free');     // 'free' | 'pro'

const CACHE_KEY = 'fu_tier_cache';
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;  // 5 min — refresh every reload

export async function refreshTier() {
    if (!isConfigured()) return;
    try {
        const c = getClient();
        const { data, error } = await c.rpc('get_my_tier');
        if (error) throw error;
        tier.value = data || 'free';
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            tier: tier.value,
            at: Date.now(),
        }));
    } catch (e) {
        console.warn('[billing] tier refresh failed:', e?.message);
    }
}

// Optimistic load from cache so the UI doesn't flicker.
try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.at < CACHE_MAX_AGE_MS) {
        tier.value = cached.tier;
    }
} catch (_) { /* ignore */ }

export function isPro() {
    return tier.value === 'pro';
}
```

Then in `js/core/app.js` bootstrap, call `refreshTier()` after auth
is wired. The `tier` signal makes every gated UI reactive — toggle
the user's tier in the database, the UI updates without a reload.

### Piece 4 — Webhook: a single Supabase Edge Function

LemonSqueezy fires webhooks for `subscription_created`,
`subscription_updated`, `subscription_cancelled`, `subscription_expired`,
etc. We write one endpoint that handles all of them and updates the
`billing` table.

```ts
// supabase/functions/ls-webhook/index.ts
import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { hmac } from 'https://deno.land/x/hmac/mod.ts';

serve(async (req) => {
    const body = await req.text();
    const sig = req.headers.get('X-Signature') ?? '';
    const secret = Deno.env.get('LS_WEBHOOK_SECRET')!;
    const computed = hmac('sha256', secret, body, 'utf8', 'hex');
    if (computed !== sig) return new Response('bad signature', { status: 401 });

    const evt = JSON.parse(body);
    const eventName = evt.meta?.event_name;
    const customData = evt.meta?.custom_data ?? {};
    const userId = customData.user_id;       // we send this on checkout
    const sub = evt.data?.attributes;
    if (!userId || !sub) return new Response('no payload', { status: 400 });

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,  // service role bypasses RLS
    );

    // Map LemonSqueezy status to our tier.
    const isActive = sub.status === 'active' || sub.status === 'on_trial';
    const tier = isActive ? 'pro' : 'free';

    await supabase.from('billing').upsert({
        user_id: userId,
        tier,
        status: sub.status,
        ls_customer_id: String(sub.customer_id),
        ls_subscription_id: String(evt.data.id),
        ls_variant_id: String(sub.variant_id),
        current_period_end: sub.renews_at,
        trial_ends_at: sub.trial_ends_at,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    return new Response('ok');
});
```

The webhook endpoint URL goes into LemonSqueezy's settings. The
`LS_WEBHOOK_SECRET` env var is set to whatever LemonSqueezy generated.

### Piece 5 — The actual gates (one for each gated feature)

#### a) Notes — block at the entry points

Three entry points: the `n` keyboard shortcut (`js/ui/notepad.js`
`initNotepad`), the toolbar Notes button (`js/ui/ambient-ui.js`
`#deckNotesBtn`), and the public `openNotepad()` export.

```js
// js/ui/notepad.js
import { isPro } from '../features/billing.js';
import { showUpgradeModal } from './upgrade.js';

export function openNotepad() {
    if (!isPro()) {
        showUpgradeModal({ feature: 'notes' });
        return;
    }
    open();   // existing implementation
}
```

The `n` keydown listener already calls `open()`; just route it through
`openNotepad()` which now does the gate. The toolbar button already
does `m.openNotepad?.()`, so it's covered.

#### b) Profile — gate per section

In `js/ui/profile.js`, wrap the section rendering:

```js
const FREE_SECTIONS = new Set(['focus', 'time']);

function renderSection(id) {
    const isPaid = !FREE_SECTIONS.has(id);
    if (isPaid && !isPro()) {
        return renderUpgradeCard(id);   // small in-place upgrade card
    }
    return renderActualSection(id);     // existing implementation
}
```

The rail still shows all six tabs. Clicking a Pro tab swaps the body
to the upgrade card. No surprise dead clicks; the user always lands on
*something*.

#### c) Future audio integrations — gate at the OAuth start

When the Spotify connect button ships:

```js
async function connectSpotify() {
    if (!isPro()) {
        showUpgradeModal({ feature: 'spotify' });
        return;
    }
    window.location = await getSpotifyAuthUrl();
}
```

For these features the gate is also enforced server-side: the OAuth
callback function in Supabase checks `tier='pro'` before storing the
refresh token, so a user can't bypass the client gate via devtools.

### Piece 6 — The upgrade modal

A single shared modal triggered by every gate. Lives in
`js/ui/upgrade.js` (new file). The modal is the same upgrade screen
sketched in §5 below, parameterised on which feature triggered it so
it can lead with the right value statement:

```js
const FEATURES = {
    notes: 'Multi-note workspace with templates, voice, and exports',
    overview: 'Your full account dashboard',
    tasks: 'Deep task analytics — efficiency, day-of-week, peak hours',
    sounds: 'Which sounds actually deepen your focus',
    insights: 'Plain-English insights about your focus patterns',
    spotify: 'Connect Spotify and log what fuels your deepest focus',
};

export function showUpgradeModal({ feature }) {
    // Render the upgrade screen with the matching headline.
}
```

---

## 5. The upgrade screen itself

A single screen, two buttons, no comparison matrix:

```
                Cosmic Focus Pro
       The full cosmos. Without limits.

   ┌──────────────┐    ┌──────────────┐
   │   $5 / mo    │    │   $55 / yr   │
   │  Cancel any  │    │   One free   │
   │     time     │    │  month / yr  │
   └──────────────┘    └──────────────┘

           [ Try free for 7 days ]

   ✓ The full Notes workspace — multi-note,
     templates, search, voice, exports
   ✓ Deep analytics — Overview, Tasks, Sounds,
     Insights with plain-English narratives
   ✓ Spotify, YouTube Music, Apple Music
     integrations (coming)
   ✓ Sync across all your devices (coming)
```

That's the entire pricing surface. No 3-column comparison table, no
"Choose your plan" decision matrix.

---

## 6. Trust contracts (non-negotiable)

These are commitments the app makes to every user. Bake them in.

1. **Free is forever.** No bait-and-switch later. Every feature listed
   under §2 above stays free for the lifetime of the app.

2. **Trial requires no card.** Click "Try free for 7 days" — Pro
   activates, no payment info collected. Day 7, the gates come back.
   Email reminders at day 5 and day 7.

3. **Never strip on downgrade.** When a Pro user lapses, their notes,
   their saved analytics insights, their connected music accounts —
   all stay intact and **read-only**. They lose the *create / advanced*
   layer; they don't lose what they made.

4. **30-day no-questions-asked refund.** Industry standard for solo
   SaaS, dramatically reduces support friction.

5. **Local-first is forever.** Everything that worked offline keeps
   working offline. Pro adds cloud features on top, never replaces
   local with cloud-only.

---

## 7. Implementation order

Concrete shipping plan:

### Phase 1 — Foundation (3–5 days)
- LemonSqueezy account + two products ($5/mo, $55/yr) + webhook URL.
- Supabase migration for the `billing` table + `get_my_tier()` RPC.
- Edge function for webhook handling.
- `js/features/billing.js` with `tier` signal + `refreshTier()` +
  `isPro()`.
- Bootstrap call in `js/core/app.js`.

### Phase 2 — The upgrade modal (2 days)
- `js/ui/upgrade.js` — single shared modal, parameterised by feature.
- Hosted-checkout link generator (LemonSqueezy returns a URL; you
  pass `custom_data.user_id` so the webhook knows who paid).
- Trial activation flow: a button that calls a Supabase edge function
  that flips `tier='pro'` and `trial_ends_at = now() + 7 days`.

### Phase 3 — Notes gate (1 day)
- Wrap `openNotepad()` with the gate.
- Convert the cosmos-toolbar Notes button to show a Pro chip when free.

### Phase 4 — Profile gates (2 days)
- Per-section renderer wrapping in `js/ui/profile.js`.
- Upgrade card design that fits the existing section register.
- Pro chips on the four locked rail tabs.

### Phase 5 — Polish (2 days)
- Settings → Account section: show current tier + manage subscription
  link (LemonSqueezy gives you a per-customer portal URL).
- Email templates for trial-end reminders.
- Help center entries: "How does Pro work?", "How do I cancel?",
  "What happens to my notes if I downgrade?"

### Phase 6 — Future audio integrations
- Each integration ships with the gate built in.
- OAuth callback edge function enforces `tier='pro'` before storing
  refresh tokens.

Phases 1–4 are roughly two working weeks. That's the whole paywall.

---

## 8. Things to watch in production

- **Webhook idempotency.** LemonSqueezy retries failed webhooks. The
  `upsert` in the webhook handler is idempotent by user_id — good.
  But log every event so you can debug if a state ever lands wrong.
- **Trial abuse.** Track trial activations per email. If someone
  signs up with 10 emails and trials each, you'll see it in the
  data. Soft-block at the second trial per email.
- **Lapsed-user recovery emails.** Most lapse-back happens in the
  first 30 days. Send a "we miss you" email at day 14 and day 28
  with a reactivation link.
- **Annual subscriber retention.** Annual users churn at <10%/year if
  the product is loved. If yours churns higher, the issue isn't
  pricing — it's that the Pro features aren't sticky enough.
- **Free → Pro conversion ratio.** Healthy freemium SaaS lands
  between 2% and 5%. Below 1% means the wall is in the wrong place.
  Above 8% means you're under-pricing or under-gating.

---

## 8b. Deployment runbook (Stripe + Supabase)

Concrete checklist when you're ready to flip the paywall on. The
client + edge functions + migrations are already in the repo; this is
just the wiring on the dashboards.

### Stripe dashboard

1. **Activate the account** if you haven't (Settings → Activate).
2. **Create two products** (Products → Add product):
   - "Cosmic Focus Pro — Monthly", recurring **$5.00 USD / month**
   - "Cosmic Focus Pro — Yearly", recurring **$55.00 USD / year**
   For each: enable the **"7-day free trial"** option on the price.
   Note the `price_xxx` IDs — you'll need both.
3. **Customer Portal config** (Settings → Billing → Customer Portal):
   - Allow: cancel subscription, update payment method, view invoices,
     switch plans (between the two products you just made).
   - Cancellation policy: cancel at end of billing period (don't
     immediately revoke — keeps the trust contract).
4. **Webhook endpoint** (Developers → Webhooks → Add endpoint):
   - URL: `https://<your-project>.supabase.co/functions/v1/stripe-webhook`
   - Events to send:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Copy the **Signing secret** (`whsec_...`) — you'll need it.
5. **API keys** (Developers → API keys):
   - Copy the **Secret key** (`sk_live_...` or `sk_test_...`).
   - You don't need the publishable key — the client never talks to
     Stripe directly; it goes through our edge functions.

### Supabase dashboard

1. **Run the migration**: paste `db/migrations/0003_billing.sql` into
   the SQL editor and run it. Idempotent — safe to re-run if you tweak
   anything later.
2. **Deploy the three edge functions** from your local machine:
   ```bash
   supabase functions deploy create-checkout-session
   supabase functions deploy create-portal-session
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
   The `--no-verify-jwt` on the webhook is critical: Stripe doesn't
   send a Supabase JWT, so default JWT enforcement would 401 every
   webhook delivery. The function does its own signature verification
   against `STRIPE_WEBHOOK_SECRET`.
3. **Set the function env vars** (Edge Functions → Manage secrets):
   ```
   STRIPE_SECRET_KEY=sk_live_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   STRIPE_PRICE_MONTHLY=price_xxx
   STRIPE_PRICE_YEARLY=price_xxx
   APP_BASE_URL=https://universefocuses.com
   ```
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
   are auto-injected by Supabase — don't set them yourself.

### Sanity-check the wiring

Before going live, do one end-to-end run with Stripe in **test mode**:

1. Switch Stripe to test mode (toggle top-right of dashboard).
2. Use **test mode** API keys + price IDs in the Supabase env vars.
3. Sign in to the app with a real account.
4. Click Settings → Account → "Upgrade to Pro" → Yearly.
5. Stripe Checkout opens. Pay with the test card `4242 4242 4242 4242`,
   any future expiry, any CVC.
6. Redirect back to the app — within ~5 seconds, the Profile drawer's
   PRO chips should disappear, the Notes app should open, the
   Settings → Account row should flip to "Manage subscription."
7. Click "Manage subscription" → Stripe Customer Portal opens. Cancel
   the test subscription. Within ~5 seconds, the app flips back to
   Free.

If all of that works in test mode, swap to live mode keys, redeploy
the functions, and you're shipping.

---

## 9. Open questions

Things to lock down before going live:

1. **Trial length** — 7 days standard. Worth trying 14?
2. **Trial activation friction** — card-required or no-card? No-card
   converts 3–4× better at the start; lifts churn at trial end. I'd
   start no-card; add card-required later if abuse becomes a problem.
3. **Refund window** — 30 days standard.
4. **Launch promo** — "first 1000 subscribers at $3/mo or $33/yr"
   creates urgency and rewards early adopters. Worth it for the
   launch month.

---

## 10. Final read

The paywall is intentionally narrow — Notes + four Profile sections +
future audio integrations. That's it. Every other feature stays free.

This shape works because:

- The Notes app is genuinely a separate product surface — gating it
  doesn't damage the focus-app experience.
- The four Profile sections are the analytics depth that serious users
  *want*; the casual user is happy with Focus + Time.
- Future audio integrations have real per-user infrastructure cost
  (OAuth tokens, API quota), so paying for them is intuitive.

The user's mental model stays clean:

> *Free Cosmic Focus is a beautiful focus app. Pro adds the notebook,
> the deep analytics, and your music — for the price of a coffee.*

That's the whole story.
