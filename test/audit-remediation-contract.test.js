import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getProfileInsightVisitorDigest, onRequestPost as recordProfileInsightAtEdge } from '../functions/analytics/profile.js';
import { stripeRequest } from '../supabase/functions/_shared/billing-core.js';
import {
  cloudflarePagesProjectUrl,
  extractPagesEnvironmentValue,
  verifyCloudflareProductionRelease
} from '../scripts/check-release-configuration.mjs';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('CI workflow limits the default GitHub token to repository read access', async () => {
  const workflow = await read('.github/workflows/ci.yml');
  assert.match(workflow, /^permissions:\s+contents: read$/m);
});

test('QA cosmetic inventory is granted only to the named staff account', async () => {
  const migration = await read('supabase/migrations/20260919150000_grant_tjz_cosmetic_test_access.sql');
  assert.match(migration, /WHERE lower\(COALESCE\(p\.username_key, p\.username\)\) = 'tjz'[\s\S]*AND p\.is_staff IS TRUE/);
  assert.match(migration, /IF target_user IS NULL THEN[\s\S]*RETURN;/);
});

test('R2 media references require byte validation and legacy ready assets are rechecked', async () => {
  const [migration, complete, promote, control] = await Promise.all([
    read('supabase/migrations/20260924150000_profile_media_content_validation_version.sql'),
    read('functions/api/profile-media/complete.js'),
    read('functions/api/profile-media/promote.js'),
    read('functions/_profileMediaControl.js')
  ]);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS content_validation_version smallint NOT NULL DEFAULT 0/);
  assert.match(migration, /content_validation_version <> 1/);
  assert.match(migration, /content_validation_version = 1/);
  assert.match(migration, /mark_my_profile_media_content_validated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.mark_my_profile_media_content_validated[\s\S]*TO service_role/);
  assert.match(complete, /Rows created before content policy v1 are re-read and revalidated/);
  assert.match(complete, /if \(!verified\.success && publicObject && asset\.r2_private_key\)/);
  assert.match(complete, /purgePublicMediaKey\(env, asset\.r2_public_key\)/);
  assert.match(complete, /verifyStoredProfileMediaObject/);
  assert.match(promote, /verifyStoredProfileMediaObject/);
  assert.match(control, /expectedSize > maximumSize/);
  assert.match(control, /readResponseBytesBounded/);
  assert.match(control, /actualHash !== expectedHash/);
  assert.doesNotMatch(migration, /IF FOUND AND v_asset\.storage_provider = 'supabase'/);
});

test('edge-derived profile insight digests are opaque, daily, and request-bound', async () => {
  const request = new Request('https://chm.lol/analytics/profile', {
    headers: { 'cf-connecting-ip': '203.0.113.9', 'user-agent': 'Chromadie audit test' }
  });
  const sameDay = new Date('2026-09-03T12:00:00Z');
  const first = await getProfileInsightVisitorDigest(request, 'private-test-salt', sameDay);
  const second = await getProfileInsightVisitorDigest(request, 'private-test-salt', sameDay);
  const nextDay = await getProfileInsightVisitorDigest(request, 'private-test-salt', new Date('2026-09-04T12:00:00Z'));

  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first, second);
  assert.notEqual(first, nextDay);
  assert.equal(first.includes('203.0.113.9'), false);
  assert.equal(await getProfileInsightVisitorDigest(request, '', sameDay), '');
  const alteredUserAgent = new Request('https://chm.lol/analytics/profile', {
    headers: { 'cf-connecting-ip': '203.0.113.9', 'user-agent': 'Rotated attacker user agent' }
  });
  assert.equal(await getProfileInsightVisitorDigest(alteredUserAgent, 'private-test-salt', sameDay), first);
});

test('profile insight edge handler sends only an opaque digest to the service recorder', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response(JSON.stringify({ success: true, recorded: true }), { status: 200 });
  };

  try {
    const request = new Request('https://chm.lol/analytics/profile', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'cf-connecting-ip': '203.0.113.9',
        'user-agent': 'Chromadie audit test'
      },
      body: JSON.stringify({ username: 'ada', metric: 'click', entryKey: 'portfolio' })
    });
    const response = await recordProfileInsightAtEdge({
      request,
      env: {
        VITE_SUPABASE_URL: 'https://example.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'public-test-key',
        SUPABASE_SECRET_KEY: 'secret-test-key',
        PROFILE_ANALYTICS_VISITOR_SALT: 'analytics-test-salt'
      }
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, recorded: true });
    assert.equal(requests.length, 1);
    assert.match(requests[0].url, /record_profile_insight_from_edge$/);
    const payload = JSON.parse(requests[0].options.body);
    assert.match(payload.p_visitor_digest, /^[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(payload).includes('203.0.113.9'), false);
    assert.equal(payload.p_metric, 'click');
    assert.equal(payload.p_entry_key, 'portfolio');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('audit remediations keep browser catalog/insight writes fail-closed', async () => {
  const [stores, legacyView, edge, migration, capMigration, canonical, seed, releaseWorkflow, releaseScript, content, rolesMigration] = await Promise.all([
    read('src/lib/stores.js'),
    read('src/lib/profileViewAnalytics.js'),
    read('functions/analytics/profile.js'),
    read('supabase/migrations/20260903110000_profile_insight_edge_deduplication.sql'),
    read('supabase/migrations/20260924100000_profile_insight_daily_cap_serialization.sql'),
    read('supabase/migrations/20260903120000_canonical_authoritative_functions.sql'),
    read('supabase/seed.sql'),
    read('.github/workflows/release-preflight.yml'),
    read('scripts/check-release-configuration.mjs'),
    read('src/lib/ProfileContent.svelte'),
    read('supabase/migrations/20260903100000_progression_discovery_roles.sql')
  ]);

  assert.doesNotMatch(stores, /\.from\('shop_items'\)/);
  assert.match(legacyView, /edge_required/);
  assert.doesNotMatch(legacyView, /record_public_profile_view/);
  assert.match(edge, /getSupabaseSecretHeaders/);
  assert.match(edge, /record_profile_insight_from_edge/);
  assert.match(migration, /profile_insight_visitor_daily/);
  assert.match(migration, /profile_insight_entry_is_published/);
  assert.match(migration, /ON CONFLICT DO NOTHING/);
  assert.match(migration, /visitor_rate_limited/);
  assert.match(migration, /pg_advisory_xact_lock\(hashtext\(v_digest\)/);
  assert.doesNotMatch(migration, /click_rate_limited/);
  const sharedDimensionLock = capMigration.indexOf("'profile-insight-dimensions:' || v_profile_id::text || ':' || v_today::text");
  const dimensionCount = capMigration.indexOf('SELECT count(*) INTO v_dimension_count');
  assert.ok(sharedDimensionLock >= 0 && sharedDimensionLock < dimensionCount);
  assert.match(capMigration, /pg_advisory_xact_lock\(hashtextextended\(/);
  assert.match(capMigration, /GRANT EXECUTE ON FUNCTION public\.record_profile_insight_from_edge[\s\S]*TO service_role/);
  assert.match(capMigration, /REVOKE ALL ON FUNCTION public\.record_profile_insight_from_edge[\s\S]*FROM PUBLIC, anon, authenticated/);
  assert.match(canonical, /CREATE OR REPLACE FUNCTION public\.calculate_roll_v6/);
  assert.match(canonical, /CREATE OR REPLACE FUNCTION public\.roll_die_impl_pre_audit/);
  assert.match(canonical, /CREATE OR REPLACE FUNCTION public\.roll_die_impl_progression_base/);
  assert.doesNotMatch(canonical, /SELECT pg_get_functiondef/);
  assert.doesNotMatch(canonical, /EXECUTE v_definition/);
  assert.match(seed, /'rarity_anomaly', 'Legendary Detected'/);
  assert.match(seed, /'mythic_roll', 'Anomaly Touch'/);
  assert.match(releaseWorkflow, /CLOUDFLARE_API_TOKEN/);
  assert.match(releaseWorkflow, /check:release-config:cloudflare/);
  assert.doesNotMatch(releaseWorkflow, /vars\.PREVIEW_PROTECTION/);
  assert.match(releaseScript, /deployment_configs/);
  assert.match(releaseScript, /Cloudflare Pages production PREVIEW_PROTECTION/);
  assert.match(content, /project-\$\{project\.order\}/);
  assert.match(rolesMigration, /progression_milestones_discovery_role_check/);
  assert.match(rolesMigration, /track = 'discovery' AND presentation_role = 'objective'/);
});

test('Stripe provider failures return a stable error instead of provider detail', async () => {
  await assert.rejects(
    stripeRequest('sk_test_example', 'checkout/sessions', {
      fetchImpl: async () => new Response(JSON.stringify({ error: { type: 'invalid_request_error', message: 'internal provider detail' } }), { status: 400 })
    }),
    error => error?.message === 'Billing provider unavailable.' && error?.code === 'billing_provider_unavailable'
  );
});

test('release verification reads the live Cloudflare Pages production setting', async () => {
  const requests = [];
  const fetcher = async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response(JSON.stringify({
      success: true,
      result: {
        deployment_configs: {
          production: {
            env_vars: [{ key: 'PREVIEW_PROTECTION', type: 'plain_text', value: 'off' }]
          }
        }
      }
    }), { status: 200 });
  };
  assert.equal(await verifyCloudflareProductionRelease({
    env: {
      CLOUDFLARE_ACCOUNT_ID: 'account-id',
      CLOUDFLARE_PAGES_PROJECT: 'chromadie',
      CLOUDFLARE_API_TOKEN: 'token'
    },
    fetchImpl: fetcher
  }), 'off');
  assert.equal(requests[0].url, cloudflarePagesProjectUrl({
    accountId: 'account-id',
    projectName: 'chromadie'
  }));
  assert.equal(requests[0].options.headers.authorization, 'Bearer token');
  assert.equal(extractPagesEnvironmentValue({
    deployment_configs: { production: { env_vars: { PREVIEW_PROTECTION: { value: 'on' } } } }
  }, 'PREVIEW_PROTECTION'), 'on');
  assert.equal(extractPagesEnvironmentValue({
    deployment_configs: { production: { env_vars: { preview_protection: 'off' } } }
  }, 'PREVIEW_PROTECTION'), 'off');
  await assert.rejects(
    verifyCloudflareProductionRelease({
      env: {
        CLOUDFLARE_ACCOUNT_ID: 'account-id',
        CLOUDFLARE_PAGES_PROJECT: 'chromadie',
        CLOUDFLARE_API_TOKEN: 'token'
      },
      fetchImpl: async () => new Response(JSON.stringify({
        success: true,
        result: { deployment_configs: { production: { env_vars: { PREVIEW_PROTECTION: { value: 'on' } } } } }
      }), { status: 200 })
    }),
    /production PREVIEW_PROTECTION.*off/
  );
});
