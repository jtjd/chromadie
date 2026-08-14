import { createClient } from 'npm:@supabase/supabase-js@2';
import { getSupabaseKeys, supabaseServerClientOptions } from '../_shared/supabase-keys.ts';
import { CHROMADIE_STRIPE_API_VERSION, stripeRequest } from '../_shared/billing-core.js';
import { corsHeaders, getBearerToken, jsonResponse } from '../_shared/http.ts';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  try {
    const { url: supabaseUrl, publishableKey: anonKey, secretKey: serviceRoleKey } = getSupabaseKeys();
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecret) throw new Error('Billing service is not configured.');
    const bearerToken = getBearerToken(request);
    if (!bearerToken) return jsonResponse({ error: 'Authentication required.' }, 401);

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearerToken}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(bearerToken);
    if (userError || !userData.user) return jsonResponse({ error: 'Authentication required.' }, 401);

    const body = await request.json().catch(() => ({}));
    const sessionId = typeof body?.session_id === 'string' ? body.session_id : '';
    if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) return jsonResponse({ error: 'A valid checkout session is required.', code: 'missing_session' }, 400);

    const service = createClient(supabaseUrl, serviceRoleKey, supabaseServerClientOptions(serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } }));
    const { data: storedSession, error: storedError } = await service
      .from('billing_checkout_sessions')
      .select('stripe_checkout_session_id, status, payment_status')
      .eq('stripe_checkout_session_id', sessionId)
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (storedError) throw storedError;
    if (!storedSession) return jsonResponse({ error: 'Checkout session not found.', code: 'missing_session' }, 404);

    const [stripeSession, accessResult] = await Promise.all([
      stripeRequest(stripeSecret, `checkout/sessions/${encodeURIComponent(sessionId)}`, { stripeVersion: CHROMADIE_STRIPE_API_VERSION }),
      service.from('billing_premium_access').select('active, recovery_until').eq('user_id', userData.user.id).maybeSingle()
    ]);
    const active = accessResult.data?.active === true;
    const paid = ['paid', 'no_payment_required'].includes(stripeSession.payment_status);
    return jsonResponse({
      session_id: sessionId,
      checkout_status: stripeSession.status || storedSession.status,
      payment_status: stripeSession.payment_status || storedSession.payment_status,
      entitlement_status: active ? 'active' : paid ? 'processing' : 'inactive',
      active
    });
  } catch (error) {
    console.error('restore-premium-checkout', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Checkout status could not be restored.' }, 500);
  }
});
