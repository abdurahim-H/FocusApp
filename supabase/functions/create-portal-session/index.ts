// create-portal-session
//
// Browser-invoked. Authed Pro user clicks "Manage subscription" in
// Settings → Account. We create a Stripe Customer Portal session and
// return its URL; Stripe hosts the cancel / update-card / view-invoices
// UX from there.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse, preflight } from '../_shared/cors.ts';
import { getStripe } from '../_shared/stripe.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return preflight(req);
    if (req.method !== 'POST') {
        return jsonResponse(req, { error: 'method_not_allowed' }, 405);
    }

    try {
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
        if (!user) return jsonResponse(req, { error: 'unauthorized' }, 401);

        // Look up the user's Stripe customer id. If they've never paid,
        // there's no portal to open — surface a friendly error.
        const serviceClient = createClient(
            supabaseUrl,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        const { data: row } = await serviceClient
            .from('billing')
            .select('stripe_customer_id')
            .eq('user_id', user.id)
            .maybeSingle();

        const customerId = row?.stripe_customer_id;
        if (!customerId) {
            return jsonResponse(req, { error: 'no_customer' }, 404);
        }

        const stripe = getStripe();
        const baseUrl = Deno.env.get('APP_BASE_URL') ?? 'https://universefocuses.com';
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: baseUrl,
        });

        return jsonResponse(req, { url: session.url });
    } catch (err) {
        console.error('[create-portal-session]', err);
        return jsonResponse(req, { error: 'server_error', detail: String(err) }, 500);
    }
});
