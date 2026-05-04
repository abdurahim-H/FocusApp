// stripe-webhook
//
// Stripe-invoked. Verifies the signature, then upserts the user's
// billing row to match Stripe's truth. This is the ONLY thing that
// writes public.billing — uses the service-role key, bypasses RLS.
//
// Events we handle:
//   • checkout.session.completed       — first subscription created
//   • customer.subscription.created    — same, in case checkout fires before
//   • customer.subscription.updated    — plan changed, renewed, paused
//   • customer.subscription.deleted    — fully cancelled / period ended
//   • invoice.payment_failed           — keep tier=pro for grace, mark status
//
// Mapping rule: tier='pro' iff Stripe status ∈ {active, trialing,
// past_due}. The `past_due` inclusion is deliberate — it implements
// a grace period during Stripe's smart-retry window, so a single
// failed renewal payment doesn't immediately revoke Pro features.
// Stripe transitions past_due → unpaid (or canceled, per the
// dashboard's failed-payment policy) once retries are exhausted,
// and neither of those is in the Pro set so the user does
// eventually downgrade. The webhook comment + Terms § 5.5 + the
// audit all agree on this policy.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@17.6.0?target=deno';
import { getStripe } from '../_shared/stripe.ts';

const PRO_STATUSES = new Set(['active', 'trialing', 'past_due']);

Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response('method not allowed', { status: 405 });
    }

    const stripe = getStripe();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET missing');
        return new Response('config error', { status: 500 });
    }

    const sig = req.headers.get('stripe-signature') ?? '';
    const body = await req.text();

    let event: Stripe.Event;
    try {
        // constructEventAsync uses Web Crypto APIs; required on Deno.
        event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } catch (err) {
        console.error('[stripe-webhook] signature verification failed:', err);
        return new Response('invalid signature', { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const db = createClient(supabaseUrl, serviceRoleKey);

    try {
        await handleEvent(event, stripe, db);
        return new Response('ok', { status: 200 });
    } catch (err) {
        // Log and return 500 so Stripe retries — better than silently
        // dropping a tier change.
        console.error('[stripe-webhook] handler error:', event.type, err);
        return new Response('handler error', { status: 500 });
    }
});

// ============================================================================
// Event handler
// ============================================================================

async function handleEvent(
    event: Stripe.Event,
    stripe: Stripe,
    // deno-lint-ignore no-explicit-any
    db: any
): Promise<void> {
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.metadata?.user_id ?? session.client_reference_id;
            if (!userId || !session.subscription) return;
            // Pull the full subscription so we have status + period end.
            const sub = await stripe.subscriptions.retrieve(
                session.subscription as string
            );
            await upsertBilling(db, userId, sub);
            return;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
            const sub = event.data.object as Stripe.Subscription;
            const userId = sub.metadata?.user_id ?? (await lookupUserIdByCustomer(db, sub.customer));
            if (!userId) {
                console.warn('[stripe-webhook] could not resolve user_id for subscription', sub.id);
                return;
            }
            await upsertBilling(db, userId, sub);
            return;
        }

        case 'invoice.payment_failed': {
            // Don't downgrade immediately — Stripe handles dunning and
            // the past_due → grace mapping in PRO_STATUSES keeps tier
            // = 'pro' for the duration of Stripe's retry window. Once
            // retries are exhausted, Stripe will transition the
            // subscription to unpaid or canceled and fire a separate
            // customer.subscription.updated / .deleted event that
            // flips tier to 'free'.
            const invoice = event.data.object as Stripe.Invoice;
            if (!invoice.subscription) return;
            const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
            const userId = sub.metadata?.user_id ?? (await lookupUserIdByCustomer(db, sub.customer));
            if (!userId) return;
            await upsertBilling(db, userId, sub);
            return;
        }

        default:
            // Unknown event type — log and ack to keep Stripe from retrying.
            return;
    }
}

// ============================================================================
// Helpers
// ============================================================================

async function upsertBilling(
    // deno-lint-ignore no-explicit-any
    db: any,
    userId: string,
    sub: Stripe.Subscription
): Promise<void> {
    const tier = PRO_STATUSES.has(sub.status) ? 'pro' : 'free';
    const priceId = sub.items.data[0]?.price?.id ?? null;

    const payload = {
        user_id: userId,
        tier,
        status: sub.status,
        stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
        stripe_subscription_id: sub.id,
        stripe_price_id: priceId,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    };

    const { error } = await db.from('billing').upsert(payload, { onConflict: 'user_id' });
    if (error) {
        throw new Error(`billing upsert failed: ${error.message}`);
    }
}

/** Fallback for events whose subscription metadata doesn't carry the
 *  user_id (mostly old subscriptions or manual dashboard creates). */
async function lookupUserIdByCustomer(
    // deno-lint-ignore no-explicit-any
    db: any,
    customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): Promise<string | null> {
    if (!customer) return null;
    const customerId = typeof customer === 'string' ? customer : customer.id;
    const { data } = await db
        .from('billing')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();
    return data?.user_id ?? null;
}
