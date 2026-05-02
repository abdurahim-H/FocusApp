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
import { CORS_HEADERS, jsonResponse, preflight } from '../_shared/cors.ts';
import { getPriceIds, getStripe } from '../_shared/stripe.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return preflight();
    if (req.method !== 'POST') {
        return jsonResponse({ error: 'method_not_allowed' }, 405);
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
            return jsonResponse({ error: 'unauthorized' }, 401);
        }

        const body = await req.json().catch(() => ({}));
        const plan = body?.plan;
        if (plan !== 'monthly' && plan !== 'yearly') {
            return jsonResponse({ error: 'invalid_plan' }, 400);
        }

        const stripe = getStripe();
        const { monthly, yearly } = getPriceIds();
        const priceId = plan === 'yearly' ? yearly : monthly;

        // If we already have a Stripe customer for this user, reuse it
        // — that way Stripe shows the user's existing payment methods
        // on subsequent upgrades.
        const serviceClient = createClient(
            supabaseUrl,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        const { data: existing } = await serviceClient
            .from('billing')
            .select('stripe_customer_id')
            .eq('user_id', user.id)
            .maybeSingle();

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
            success_url: successUrl,
            cancel_url: cancelUrl,
            // Allow promotion codes (the launch promo discount).
            allow_promotion_codes: true,
        });

        if (!session.url) {
            return jsonResponse({ error: 'no_session_url' }, 500);
        }
        return jsonResponse({ url: session.url });
    } catch (err) {
        console.error('[create-checkout-session]', err);
        return jsonResponse({ error: 'server_error', detail: String(err) }, 500);
    }
});
