// billing.js
//
// Single source of truth for the user's Pro tier on the client.
//
// Public API:
//   tier                          → signal('free' | 'pro')
//   isPro()                       → bool, synchronous
//   refreshTier()                 → re-fetch from server
//   startCheckout(plan)           → 'monthly' | 'yearly' → redirects to Stripe
//   openCustomerPortal()          → redirects to Stripe Customer Portal
//
// Architecture notes:
//   • Truth lives in Supabase public.billing.tier. Webhook (running
//     with the service-role key) writes; client only reads via the
//     get_my_tier() RPC.
//   • The client trusts a cached value optimistically (so the UI
//     doesn't flicker on page load) but verifies on every navigation
//     that signed-in state changed, on tab focus, and on demand from
//     the upgrade modal's success callback.
//   • isPro() is the *only* gate other modules should call. They must
//     never read `tier.value` directly — keeping the surface narrow
//     means a future provider swap (Stripe → LemonSqueezy / Paddle)
//     edits this file and nothing else.

import { signal } from '../core/state.js';
import {
    callRpc,
    invokeFunction,
    isConfigured,
    onChange as onAuthChange,
    getUser,
} from './auth.js';

// ────────────────────────────────────────────────────────────────────────────
// Public state
// ────────────────────────────────────────────────────────────────────────────

/** Current tier signal — 'free' or 'pro'. Defaults to 'free'.
 *  UI consumers read this via isPro() rather than touching the signal
 *  directly so there's a single grep'able call site for every gate. */
export const tier = signal('free');

const CACHE_KEY = 'fu_tier_cache';
const CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 min

// Paywall kill-switch. While false, every feature is free for everyone —
// signed-in or not, current or future — because isPro() short-circuits to
// true and the settings account card drops its upgrade CTA. Flip back to
// true to restore the Pro gates; nothing else needs to change. The real
// tier signal keeps tracking the server underneath so genuine subscribers
// still see "Manage subscription".
export const PAYWALL_ENABLED = false;

// ────────────────────────────────────────────────────────────────────────────
// Cache (optimistic-load on import)
// ────────────────────────────────────────────────────────────────────────────

(function loadCachedTier() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return;
        const cached = JSON.parse(raw);
        if (
            cached
            && (cached.tier === 'free' || cached.tier === 'pro')
            && Number.isFinite(cached.at)
            && Date.now() - cached.at < CACHE_MAX_AGE_MS
        ) {
            tier.value = cached.tier;
        }
    } catch (_) {
        /* ignore — corrupt cache, just leave default */
    }
})();

function writeCache(value) {
    try {
        localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ tier: value, at: Date.now() })
        );
    } catch (_) {
        /* localStorage full / privacy mode — fine, we just won't cache */
    }
}

function clearCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch (_) {}
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/** Synchronous gate. Use this everywhere. */
export function isPro() {
    if (!PAYWALL_ENABLED) return true; // paywall off — all features free
    return tier.value === 'pro';
}

/** Force a re-fetch from the server. Called on bootstrap, on auth
 *  state change, on tab focus, and after a successful checkout. */
export async function refreshTier() {
    if (!isConfigured()) {
        // Self-hosted / no auth provider — everyone is free, no checkout
        // path. Keep the signal at 'free' and bail.
        if (tier.value !== 'free') tier.value = 'free';
        clearCache();
        return 'free';
    }
    if (!getUser()) {
        // Not signed in — Pro requires an account, so a logged-out
        // user is always free.
        if (tier.value !== 'free') tier.value = 'free';
        clearCache();
        return 'free';
    }
    try {
        const result = await callRpc('get_my_tier');
        const next = result === 'pro' ? 'pro' : 'free';
        if (tier.value !== next) tier.value = next;
        writeCache(next);
        return next;
    } catch (e) {
        // Network failure / RLS error — keep whatever we last cached.
        // The user's Pro state shouldn't downgrade just because one
        // RPC call failed.
        console.warn('[billing] tier refresh failed:', e?.message || e);
        return tier.value;
    }
}

/** Kick off Stripe Checkout for the chosen plan. The edge function
 *  creates a Checkout Session server-side and returns its URL; we
 *  redirect the browser to it.
 *
 *  @param {'monthly'|'yearly'} plan
 */
export async function startCheckout(plan) {
    if (!isConfigured()) {
        throw new Error('Auth not configured — cannot start checkout');
    }
    if (!getUser()) {
        throw new Error('Sign in before upgrading');
    }
    if (plan !== 'monthly' && plan !== 'yearly') {
        throw new Error(`Unknown plan: ${plan}`);
    }
    const data = await invokeFunction('create-checkout-session', { plan });
    if (!data?.url) {
        throw new Error('Checkout session response missing URL');
    }
    window.location.assign(data.url);
}

/** Open Stripe's hosted Customer Portal so the user can manage /
 *  cancel / update payment method on their subscription. */
export async function openCustomerPortal() {
    if (!getUser()) {
        throw new Error('Sign in to manage your subscription');
    }
    const data = await invokeFunction('create-portal-session', {});
    if (!data?.url) {
        throw new Error('Portal session response missing URL');
    }
    window.location.assign(data.url);
}

// ────────────────────────────────────────────────────────────────────────────
// Reactivity wiring
// ────────────────────────────────────────────────────────────────────────────

/** Bootstrap entry — call once from app.js after auth.init() runs. */
export async function initBilling() {
    // Initial fetch.
    refreshTier();

    // Re-check whenever auth state changes (sign-in, sign-out, refresh).
    if (onAuthChange) {
        onAuthChange(() => refreshTier());
    }

    // Re-check when the tab becomes visible — handles the "user paid
    // on another tab" case.
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') refreshTier();
    });

    // If we redirect back from Stripe with a `?checkout=success` query,
    // refresh aggressively for ~10s in case the webhook hasn't landed
    // yet (Stripe webhooks are fast but not instant). Clear the query
    // afterwards so a refresh doesn't re-trigger the loop.
    try {
        const url = new URL(window.location.href);
        if (url.searchParams.get('checkout') === 'success') {
            url.searchParams.delete('checkout');
            history.replaceState(null, '', url.toString());
            await pollForProUpgrade();
        }
    } catch (_) { /* tolerate */ }
}

/** Poll the server every 1s for up to 10s, looking for the tier to
 *  flip to 'pro'. Used right after Stripe Checkout success because
 *  the webhook may take a moment to land. */
async function pollForProUpgrade() {
    for (let i = 0; i < 10; i++) {
        const t = await refreshTier();
        if (t === 'pro') return;
        await new Promise((r) => setTimeout(r, 1000));
    }
    // 10 seconds without a webhook is unusual but not fatal — leave
    // the tier where the cache says it is. The next page load or
    // visibility-change will catch up.
}
