import { createClient } from 'npm:@supabase/supabase-js@2';
import { getSupabaseKeys, supabaseServerClientOptions } from '../_shared/supabase-keys.ts';
import {
  CHROMADIE_PLUS_AMOUNT,
  CHROMADIE_PLUS_CURRENCY,
  CHROMADIE_PLUS_ENTITLEMENT,
  CHROMADIE_PLUS_TAX_CODE,
  CHROMADIE_STRIPE_API_VERSION,
  stripeUnixTimestampToIso,
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
    const [{ data: customer }, { data: ownerProfile }] = await Promise.all([
      service.from('billing_customers').select('stripe_customer_id').eq('user_id', userId).maybeSingle(),
      service.from('profiles').select('is_staff').eq('id', userId).maybeSingle()
    ]);
    if (ownerProfile?.is_staff) return jsonResponse({ error: 'Chromadie Plus is already active.', code: 'already_active' }, 409);

    const reserveClaim = async () => {
      const { data, error } = await service.rpc('reserve_premium_checkout_claim', { p_user_id: userId });
      if (error) {
        if (error.code === 'P0001' || /already active/i.test(error.message || '')) {
          return { error: jsonResponse({ error: 'Chromadie Plus is already active.', code: 'already_active' }, 409) };
        }
        throw error;
      }
      return { claim: data as Record<string, unknown> };
    };

    let reservation = await reserveClaim();
    if (reservation.error) return reservation.error;
    let claim = reservation.claim!;

    if (claim.action === 'creating') {
      const retryAfter = typeof claim.retry_after_seconds === 'number' ? Math.max(1, Math.ceil(claim.retry_after_seconds)) : 1;
      return jsonResponse(
        { error: 'A checkout is already being prepared. Please retry shortly.', code: 'checkout_in_progress', retry_after_seconds: retryAfter },
        409,
        { 'Retry-After': String(retryAfter) }
      );
    }

    if (claim.action === 'reconcile') {
      const sessionId = typeof claim.stripe_checkout_session_id === 'string' ? claim.stripe_checkout_session_id : '';
      if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) throw new Error('Stored checkout claim is invalid.');
      const stripeSession = await stripeRequest(stripeSecret, `checkout/sessions/${encodeURIComponent(sessionId)}`, {
        stripeVersion: CHROMADIE_STRIPE_API_VERSION
      });
      const { data: reconciliation, error: reconciliationError } = await service.rpc('reconcile_premium_checkout_claim', {
        p_claim_id: claim.claim_id,
        p_user_id: userId,
        p_stripe_status: stripeSession.status,
        p_payment_status: stripeSession.payment_status,
        p_stripe_expires_at: stripeUnixTimestampToIso(stripeSession.expires_at)
      });
      if (reconciliationError) throw reconciliationError;
      if (reconciliation?.state === 'open' && typeof stripeSession.url === 'string') {
        return jsonResponse({ checkout_url: stripeSession.url, session_id: sessionId, reused: true });
      }
      if (reconciliation?.state === 'complete') {
        return jsonResponse({ error: 'Payment is being confirmed.', code: 'checkout_processing' }, 409);
      }

      reservation = await reserveClaim();
      if (reservation.error) return reservation.error;
      claim = reservation.claim!;
      if (claim.action === 'creating') {
        return jsonResponse({ error: 'A checkout is already being prepared. Please retry shortly.', code: 'checkout_in_progress' }, 409, { 'Retry-After': '1' });
      }
      if (claim.action !== 'create') throw new Error('Checkout claim could not be renewed.');
    }
    if (claim.action !== 'create' || typeof claim.claim_id !== 'string' || typeof claim.stripe_idempotency_key !== 'string') {
      throw new Error('Checkout claim could not be created.');
    }

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
      stripeVersion: CHROMADIE_STRIPE_API_VERSION,
      idempotencyKey: claim.stripe_idempotency_key
    });
    if (!checkout?.id || !checkout?.url) throw new Error('Stripe did not return a checkout session.');
    const { data: finalized, error: finalizeError } = await service.rpc('finalize_premium_checkout_claim', {
      p_claim_id: claim.claim_id,
      p_stripe_checkout_session_id: checkout.id,
      p_stripe_customer_id: typeof checkout.customer === 'string' ? checkout.customer : null,
      p_stripe_status: checkout.status || 'open',
      p_payment_status: checkout.payment_status || 'unpaid',
      p_stripe_expires_at: stripeUnixTimestampToIso(checkout.expires_at)
    });
    if (finalizeError) throw finalizeError;
    if (finalized?.state === 'complete') return jsonResponse({ error: 'Payment is being confirmed.', code: 'checkout_processing' }, 409);
    if (finalized?.state !== 'open') return jsonResponse({ error: 'Checkout expired before it could be opened. Please try again.', code: 'checkout_expired' }, 409);
    return jsonResponse({ checkout_url: checkout.url, session_id: checkout.id });
  } catch (error) {
    console.error('create-premium-checkout', error);
    return jsonResponse({ error: 'Checkout could not be created. Please try again.', code: 'checkout_unavailable' }, 502);
  }
});
