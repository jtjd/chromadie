import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyStripeSignature } from '../_shared/billing-core.js';
import { jsonResponse } from '../_shared/http.ts';

Deno.serve(async request => {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);
  const rawPayload = await request.text();
  const signature = request.headers.get('stripe-signature') || '';
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
  if (!await verifyStripeSignature(rawPayload, signature, webhookSecret)) {
    return jsonResponse({ error: 'Invalid webhook signature.' }, 400);
  }

  try {
    const event = JSON.parse(rawPayload);
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Webhook service is not configured.');
    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await service.rpc('process_stripe_billing_event', { p_event: event });
    if (error) throw error;
    return jsonResponse(data || { success: true });
  } catch (error) {
    console.error('stripe-premium-webhook', error);
    return jsonResponse({ error: 'Webhook processing failed.' }, 500);
  }
});
