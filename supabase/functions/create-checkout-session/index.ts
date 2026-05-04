// create-checkout-session
//
// Browser-invoked. Authed user clicks "Upgrade to Pro" with a chosen
// plan ('monthly' | 'yearly'). We create a Stripe Checkout Session
// and return its URL. The browser redirects there; Stripe handles
// the payment UX; on success the user comes back to APP_BASE_URL?checkout=success
// and the webhook (separate function) flips their tier to 'pro'.
//
// We attach the user_id as client_reference_id AND in metadata, so the
// webhook can map the resulting subscription back to our users table
// without ambiguity.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { getPriceIds, getStripe } from '../_shared/stripe.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return preflight(req);
    if (req.method !== 'POST') {
        return jsonResponse(req, { error: 'method_not_allowed' }, 405);
    }

    try {
        // Authenticate the caller. We use the *anon* client + the user's
        // JWT (forwarded as the Authorization header by supabase-js's
        // functions.invoke). This validates the JWT and gives us the
        // user_id without trusting client-supplied IDs.
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
        if (!supabaseUrl || !anonKey) {
            throw new Error('Supabase env vars missing');
        }
        const userClient = createClient(supabaseUrl, anonKey, {
            global: {
                headers: { Authorization: req.headers.get('Authorization') ?? '' },
            },
        });
        const { data: userData } = await userClient.auth.getUser();
        const user = userData?.user;
        if (!user) {
            return jsonResponse(req, { error: 'unauthorized' }, 401);
        }

        const body = await req.json().catch(() => ({}));
        const plan = body?.plan;
        if (plan !== 'monthly' && plan !== 'yearly') {
            return jsonResponse(req, { error: 'invalid_plan' }, 400);
        }

        const stripe = getStripe();
        const { monthly, yearly } = getPriceIds();
        const priceId = plan === 'yearly' ? yearly : monthly;

        // Read existing billing row — both for customer reuse and for
        // duplicate-subscription guard below.
        const serviceClient = createClient(
            supabaseUrl,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        const { data: existing } = await serviceClient
            .from('billing')
            .select('stripe_customer_id, stripe_subscription_id, status, tier')
            .eq('user_id', user.id)
            .maybeSingle();

        // Duplicate-subscription guard. If the user already has an
        // active / trialing / past_due subscription, sending them
        // through Checkout again would either create a SECOND
        // subscription (double billing) or 400 in obscure ways. Far
        // better to redirect them to the Customer Portal where they
        // can manage what they have. We re-verify against Stripe in
        // case our local row is stale.
        if (existing?.stripe_subscription_id) {
            try {
                const sub = await stripe.subscriptions.retrieve(
                    existing.stripe_subscription_id,
                );
                const blocking = new Set(['active', 'trialing', 'past_due']);
                if (blocking.has(sub.status)) {
                    return jsonResponse(req, {
                        error: 'subscription_exists',
                        status: sub.status,
                        // Caller (upgrade.js) can detect this code and
                        // pivot to the Customer Portal instead of
                        // throwing a generic error in the user's face.
                        action: 'open_portal',
                        message: 'You already have an active or trialing Pro subscription. Use Settings → Account → Manage subscription to make changes.',
                    }, 409);
                }
            } catch (e) {
                // Subscription not found (deleted in Stripe) → fall
                // through and let Checkout create a fresh one.
                console.warn('[create-checkout-session] stale subscription_id, ignoring:', e);
            }
        }

        const baseUrl = Deno.env.get('APP_BASE_URL') ?? 'https://universefocuses.com';
        const successUrl = `${baseUrl}/?checkout=success`;
        const cancelUrl = `${baseUrl}/?checkout=cancel`;

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            // Reuse customer if we have one; otherwise let Stripe create
            // and email-prefill from the user's auth email.
            customer: existing?.stripe_customer_id ?? undefined,
            customer_email: existing?.stripe_customer_id ? undefined : user.email,
            // The webhook reads this to know which user to upgrade.
            client_reference_id: user.id,
            metadata: { user_id: user.id, plan },
            subscription_data: {
                metadata: { user_id: user.id, plan },
                // 7-day trial — no card collected upfront would be ideal
                // but Stripe Checkout requires payment-method collection
                // for trials. trial_period_days still gives them 7 free
                // days before the first charge.
                trial_period_days: 7,
            },
            // ─── EU / Germany VAT compliance ────────────────────────
            //
            // automatic_tax computes the correct VAT for the customer's
            // billing country using Stripe Tax. Requires Stripe Tax to
            // be enabled in the Stripe dashboard (Tax → Settings) and
            // the product to have a tax_code (txcd_10000000 for SaaS /
            // digital services is the right starting point).
            //
            // tax_id_collection lets EU B2B customers enter their
            // VAT-IdNr at checkout for reverse-charge handling where
            // eligible.
            //
            // billing_address_collection: 'required' is mandatory for
            // automatic_tax to determine the right rate.
            //
            // customer_update: 'auto' keeps the Stripe Customer's
            // address + name in sync with what the user types at
            // checkout, so subsequent invoices use the latest.
            automatic_tax: { enabled: true },
            tax_id_collection: { enabled: true },
            billing_address_collection: 'required',
            customer_update: existing?.stripe_customer_id
                ? { address: 'auto', name: 'auto' }
                : undefined,
            // ─── Consumer-rights wording on the Stripe page ─────────
            //
            // For digital subscriptions in the EU, §356(5) BGB requires
            // the consumer's express consent to immediate performance +
            // acknowledgement that the right of withdrawal is
            // extinguished as soon as performance begins. Stripe
            // surfaces this as the consent_collection.terms_of_service
            // tickbox, which we explicitly require.
            consent_collection: { terms_of_service: 'required' },
            success_url: successUrl,
            cancel_url: cancelUrl,
            // Allow promotion codes (the launch promo discount).
            allow_promotion_codes: true,
        });

        if (!session.url) {
            return jsonResponse(req, { error: 'no_session_url' }, 500);
        }
        return jsonResponse(req, { url: session.url });
    } catch (err) {
        console.error('[create-checkout-session]', err);
        return jsonResponse(req, { error: 'server_error', detail: String(err) }, 500);
    }
});
