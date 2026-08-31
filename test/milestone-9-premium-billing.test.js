import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  CHROMADIE_PLUS_AMOUNT,
  CHROMADIE_PLUS_CURRENCY,
  CHROMADIE_PLUS_TAX_CODE,
  CHROMADIE_STRIPE_API_VERSION,
  stripeRequest,
  verifyStripeSignature
} from '../supabase/functions/_shared/billing-core.js';
import {
  CHROMADIE_PLUS_ENTITLEMENT_KEY,
  hasChromadiePlus
} from '../src/lib/premiumEntitlements.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

async function sign(payload, secret, timestamp) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`)));
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

test('Chromadie Plus is canonical while atelier holders stay compatible', () => {
  assert.equal(CHROMADIE_PLUS_ENTITLEMENT_KEY, 'chromadie_plus');
  assert.equal(hasChromadiePlus(['chromadie_plus']), true);
  assert.equal(hasChromadiePlus(['atelier_plus']), true);
  assert.equal(hasChromadiePlus(['other']), false);
  assert.equal(CHROMADIE_PLUS_AMOUNT, 799);
  assert.equal(CHROMADIE_PLUS_CURRENCY, 'usd');
  assert.equal(CHROMADIE_PLUS_TAX_CODE, 'txcd_10103000');
  assert.equal(CHROMADIE_STRIPE_API_VERSION, '2025-03-31.basil');
});

test('Stripe signatures reject forgery and stale delivery while accepting retries in tolerance', async () => {
  const payload = JSON.stringify({ id: 'evt_test', type: 'checkout.session.completed' });
  const secret = 'whsec_test_secret';
  const timestamp = 1_800_000_000;
  const signature = await sign(payload, secret, timestamp);
  const forgedSignature = `${signature.slice(0, -1)}${signature.endsWith('0') ? '1' : '0'}`;

  assert.equal(await verifyStripeSignature(payload, `t=${timestamp},v1=${signature}`, secret, { nowSeconds: timestamp + 10 }), true);
  assert.equal(await verifyStripeSignature(payload, `t=${timestamp},v1=${forgedSignature}`, secret, { nowSeconds: timestamp + 10 }), false);
  assert.equal(await verifyStripeSignature(`${payload} `, `t=${timestamp},v1=${signature}`, secret, { nowSeconds: timestamp + 10 }), false);
  assert.equal(await verifyStripeSignature(payload, `t=${timestamp},v1=${signature}`, secret, { nowSeconds: timestamp + 301 }), false);
  assert.equal(await verifyStripeSignature(payload, '', secret, { nowSeconds: timestamp }), false);
});

test('Managed Payments Stripe requests pin the supported API version', async () => {
  let request;
  const result = await stripeRequest('sk_test_example', 'checkout/sessions', {
    stripeVersion: CHROMADIE_STRIPE_API_VERSION,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ id: 'cs_test_example' }), { status: 200 });
    }
  });

  assert.equal(result.id, 'cs_test_example');
  assert.equal(request.options.headers['Stripe-Version'], '2025-03-31.basil');
});

test('billing migration makes webhook processing atomic, replay-safe, and service-owned', async () => {
  const migration = await read('supabase/migrations/20260808200000_lifetime_premium_fulfillment.sql');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.billing_webhook_events/);
  assert.match(migration, /stripe_event_id text PRIMARY KEY/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.process_stripe_billing_event\(p_event jsonb\)/);
  assert.match(migration, /ON CONFLICT \(stripe_event_id\) DO NOTHING/);
  assert.match(migration, /duplicate/);
  assert.match(migration, /checkout\.session\.completed/);
  assert.match(migration, /charge\.refunded/);
  assert.match(migration, /charge\.dispute\.created/);
  assert.match(migration, /refund\.created/);
  assert.match(migration, /chromadie_plus/);
  assert.match(migration, /atelier_plus/);
  assert.match(migration, /interval '30 days'/);
  assert.match(migration, /outcome = 'pending'/);
  assert.match(migration, /Stripe does not guarantee delivery order/);
  assert.match(migration, /get_public_profile_configuration/);
  assert.match(migration, /'templateKey', 'signal'/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.process_stripe_billing_event\(jsonb\) FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.process_stripe_billing_event\(jsonb\) TO service_role/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.billing_/);
});

test('checkout, restore, and webhook endpoints preserve the authority boundary', async () => {
  const [checkout, restore, webhook, pricing, routes, config] = await Promise.all([
    read('supabase/functions/create-premium-checkout/index.ts'),
    read('supabase/functions/restore-premium-checkout/index.ts'),
    read('supabase/functions/stripe-premium-webhook/index.ts'),
    read('src/lib/Pricing.svelte'),
    read('src/lib/routes.js'),
    read('supabase/config.toml')
  ]);

  assert.match(checkout, /auth\.getUser/);
  assert.match(checkout, /unit_amount/);
  assert.match(checkout, /CHROMADIE_PLUS_AMOUNT/);
  assert.match(checkout, /managed_payments\[enabled\]/);
  assert.match(checkout, /CHROMADIE_PLUS_TAX_CODE/);
  assert.match(checkout, /success_url/);
  assert.match(checkout, /PROFILE_MEDIA_R2_READY/);
  assert.doesNotMatch(checkout, /grant_profile_entitlement|process_stripe_billing_event/);
  assert.match(restore, /billing_checkout_sessions/);
  assert.match(restore, /session_id/);
  assert.doesNotMatch(restore, /grant_profile_entitlement|process_stripe_billing_event/);
  assert.match(webhook, /verifyStripeSignature/);
  assert.match(webhook, /process_stripe_billing_event/);
  assert.match(pricing, /\$7\.99/);
  assert.match(pricing, /create-premium-checkout/);
  assert.match(pricing, /restore-premium-checkout/);
  assert.match(pricing, /profileMediaR2/);
  assert.match(pricing, /Background video hosting/);
  assert.match(pricing, /Animated avatar hosting/);
  assert.match(pricing, /Up to 1 GB hosted media/);
  assert.doesNotMatch(pricing, /grant_profile_entitlement|profile_entitlements.*insert/s);
  assert.match(routes, /\/pricing/);
  assert.match(config, /\[functions\.stripe-premium-webhook\][\s\S]*verify_jwt = false/);
});

test('pricing presentation follows the homepage visual language without weakening commerce copy', async () => {
  const [pricing, header] = await Promise.all([
    read('src/lib/Pricing.svelte'),
    read('src/lib/SiteModeHeader.svelte')
  ]);

  assert.match(header, /activeView === 'pricing'/);
  assert.match(header, /prefetch\('pricing'\)/);
  assert.match(pricing, /class="pricing-hero"/);
  assert.match(pricing, /<h1 id="pricing-title">Pick your plan<\/h1>/);
  assert.match(pricing, /A complete profile is free\. Plus adds hosted media for a one-time \$7\.99\./);
  assert.match(pricing, /class="pricing-plans"/);
  assert.match(pricing, /class="pricing-claim"/);
  assert.match(pricing, /class="pricing-faq"/);
  assert.match(pricing, /What is Chromadie Plus\?/);
  assert.doesNotMatch(pricing, /The color stays earned|one identity \/ lifetime access/);
  assert.match(pricing, /prefers-reduced-motion/);
  assert.match(pricing, /aria-label="Free profile and Chromadie Plus comparison"/);
});

test('pricing includes a responsive feature comparison matrix for the current offer', async () => {
  const pricing = await read('src/lib/Pricing.svelte');
  assert.match(pricing, /class="pricing-comparison"/);
  assert.match(pricing, /<table class="pricing-comparison__table" aria-label="Free and Chromadie Plus feature comparison">/);
  assert.match(pricing, /Background video hosting/);
  assert.match(pricing, /Animated avatar hosting/);
  assert.match(pricing, /Profile audio and playlists/);
  assert.match(pricing, /Custom OG\/share image/);
  assert.match(pricing, /Up to 1 GB hosted media/);
  assert.match(pricing, /scope="row"/);
  assert.match(pricing, /pricing-comparison__plan-col \{ width: 6\.4rem; \}/);
  assert.match(pricing, /pricing-card__terms">USD · lifetime access · one identity · up to 1 GB shared media/);
  assert.match(pricing, /Available soon/);
  assert.match(pricing, /How does the media limit work\?/);
  assert.doesNotMatch(pricing, /pricing-comparison__detail|pricing-comparison__chevron/);
});

test('pricing uses stacked section headings and ends with the chm.lol handle claim', async () => {
  const pricing = await read('src/lib/Pricing.svelte');

  assert.match(pricing, /class="pricing-section-heading"/);
  assert.match(pricing, /<h2 id="pricing-plans-title">Plans<\/h2>/);
  assert.match(pricing, /Compare features/);
  assert.match(pricing, /Claim your handle/);
  assert.match(pricing, /<HomepageClaim/);
  assert.match(pricing, /inputId="pricing-claim-username"/);
  assert.match(pricing, /buttonLabel="Claim"/);
  assert.match(pricing, /on:claim={forwardClaim}/);
  assert.doesNotMatch(pricing, /pricing-hero__side/);
  assert.doesNotMatch(pricing, /pricing-comparison__heading/);
  assert.doesNotMatch(pricing, /pricing-page__promise|pricing-page__eyebrow|pricing-hero__signal/);
});
