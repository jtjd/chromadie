import { createClient } from 'npm:@supabase/supabase-js@2';
import { getSupabaseKeys, supabaseServerClientOptions } from '../_shared/supabase-keys.ts';
import {
  CHROMADIE_PLUS_AMOUNT,
  CHROMADIE_PLUS_CURRENCY,
  CHROMADIE_PLUS_ENTITLEMENT,
  CHROMADIE_PLUS_TAX_CODE,
  CHROMADIE_STRIPE_API_VERSION,
  stripeRequest
} from '../_shared/billing-core.js';
import { corsHeaders, getBearerToken, getSiteUrl, jsonResponse } from '../_shared/http.ts';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  try {
    const { url: supabaseUrl, publishableKey: anonKey, secretKey: serviceRoleKey } = getSupabaseKeys();
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecret) throw new Error('Billing service is not configured.');
    if (Deno.env.get('PROFILE_MEDIA_R2_READY') !== 'true') {
      return jsonResponse({ error: 'Purchases are temporarily paused while hosted media is being verified.' }, 503);
    }

    const bearerToken = getBearerToken(request);
    if (!bearerToken) return jsonResponse({ error: 'Authentication required.' }, 401);
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearerToken}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(bearerToken);
    if (userError || !userData.user) return jsonResponse({ error: 'Authentication required.' }, 401);

    const service = createClient(supabaseUrl, serviceRoleKey, supabaseServerClientOptions(serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } }));
    const userId = userData.user.id;
    const [{ data: access }, { data: customer }, { data: ownerProfile }] = await Promise.all([
      service.from('billing_premium_access').select('active').eq('user_id', userId).maybeSingle(),
      service.from('billing_customers').select('stripe_customer_id').eq('user_id', userId).maybeSingle(),
      service.from('profiles').select('is_staff').eq('id', userId).maybeSingle()
    ]);
    if (access?.active || ownerProfile?.is_staff) return jsonResponse({ error: 'Chromadie Plus is already active.', code: 'already_active' }, 409);

    const siteUrl = getSiteUrl();
    const body: Record<string, string> = {
      mode: 'payment',
      'managed_payments[enabled]': 'true',
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': CHROMADIE_PLUS_CURRENCY,
      'line_items[0][price_data][unit_amount]': String(CHROMADIE_PLUS_AMOUNT),
      'line_items[0][price_data][product_data][name]': 'Chromadie Plus — Lifetime',
      'line_items[0][price_data][product_data][description]': 'Background video, animated avatar, audio playlists, custom cursors, a custom share preview, and 1 GB of media storage.',
      'line_items[0][price_data][product_data][tax_code]': CHROMADIE_PLUS_TAX_CODE,
      client_reference_id: userId,
      'metadata[user_id]': userId,
      'metadata[entitlement]': CHROMADIE_PLUS_ENTITLEMENT,
      'payment_intent_data[metadata][user_id]': userId,
      'payment_intent_data[metadata][entitlement]': CHROMADIE_PLUS_ENTITLEMENT,
      success_url: `${siteUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing?checkout=cancelled`
    };
    if (customer?.stripe_customer_id) body.customer = customer.stripe_customer_id;
    else body.customer_creation = 'always';

    const checkout = await stripeRequest(stripeSecret, 'checkout/sessions', {
      method: 'POST',
      body,
      stripeVersion: CHROMADIE_STRIPE_API_VERSION
    });
    if (!checkout?.id || !checkout?.url) throw new Error('Stripe did not return a checkout session.');
    const { error: insertError } = await service.from('billing_checkout_sessions').insert({
      stripe_checkout_session_id: checkout.id,
      user_id: userId,
      stripe_customer_id: typeof checkout.customer === 'string' ? checkout.customer : null,
      status: checkout.status || 'open',
      payment_status: checkout.payment_status || 'unpaid',
      amount_total: CHROMADIE_PLUS_AMOUNT,
      currency: CHROMADIE_PLUS_CURRENCY
    });
    if (insertError) {
      await stripeRequest(stripeSecret, `checkout/sessions/${encodeURIComponent(checkout.id)}/expire`, { method: 'POST', body: {} }).catch(() => null);
      throw new Error('Checkout could not be registered. Please try again.');
    }
    return jsonResponse({ checkout_url: checkout.url, session_id: checkout.id });
  } catch (error) {
    console.error('create-premium-checkout', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Checkout could not be created.' }, 500);
  }
});
