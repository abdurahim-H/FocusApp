// Shared Stripe-client setup. Both the checkout-session and portal-session
// functions need an authed Stripe client; the webhook function uses its
// own with the webhook secret, separate from the API secret.

import Stripe from 'https://esm.sh/stripe@17.6.0?target=deno';

/** Construct a Stripe client. Reads STRIPE_SECRET_KEY from the function's
 *  env. Throws when missing — that's a deploy-time misconfiguration, not
 *  a runtime branch we want to silently degrade. */
export function getStripe(): Stripe {
    const key = Deno.env.get('STRIPE_SECRET_KEY');
    if (!key) {
        throw new Error('STRIPE_SECRET_KEY env var is required');
    }
    return new Stripe(key, {
        apiVersion: '2024-11-20.acacia',
        // Critical on Deno: the default fetch httpClient ships with Deno;
        // tells the SDK to use Web Fetch APIs rather than Node's http.
        httpClient: Stripe.createFetchHttpClient(),
    });
}

/** Pull the Stripe price IDs for the two plans from env vars.
 *  Set these in Supabase function env after creating the products in
 *  the Stripe dashboard. */
export function getPriceIds(): { monthly: string; yearly: string } {
    const monthly = Deno.env.get('STRIPE_PRICE_MONTHLY');
    const yearly = Deno.env.get('STRIPE_PRICE_YEARLY');
    if (!monthly || !yearly) {
        throw new Error(
            'STRIPE_PRICE_MONTHLY and STRIPE_PRICE_YEARLY env vars are required'
        );
    }
    return { monthly, yearly };
}
