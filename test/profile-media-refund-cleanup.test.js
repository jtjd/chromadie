import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost as runAccountCleanup } from '../functions/api/profile-media/account-cleanup.js';
import { triggerProfileMediaCleanup } from '../workers/profile-media-cleanup-scheduler/index.js';

const fakeEnv = {
  R2_ACCOUNT_CLEANUP_SECRET: 'local-cleanup-test-secret',
  R2_ACCOUNT_ID: '123456789012',
  R2_ACCESS_KEY_ID: 'AKIDEXAMPLE',
  R2_SECRET_ACCESS_KEY: 'local-test-signing-key-only',
  R2_PRIVATE_BUCKET: 'private-test',
  R2_PUBLIC_BUCKET: 'public-test',
  CF_ZONE_ID: 'local-test-zone',
  CF_API_TOKEN: 'local-test-purge-token-only',
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fake_example',
  SUPABASE_SECRET_KEY: 'sb_secret_fake_example',
  MEDIA_PUBLIC_ORIGIN: 'https://media.example.test'
};

const paidAsset = {
  id: 'a1500000-0000-4000-8000-000000000010',
  storage_provider: 'r2',
  r2_private_key: 'profiles/user/asset/private.webp',
  r2_public_key: 'profiles/user/asset/public.webp',
  cache_purge_required: true,
  cache_purge_status: 'processing'
};

function cleanupRequest() {
  return new Request('https://chm.lol/api/profile-media/account-cleanup', {
    method: 'POST',
    headers: { Authorization: 'Bearer local-cleanup-test-secret' }
  });
}

function withMockedControlPlane(t, { deleteStatus = 204, purgeStatus = 200 } = {}) {
  const previousFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    requests.push({ url, options });

    if (url.hostname === 'example.supabase.co') {
      const rpc = url.pathname.split('/').at(-1);
      if (rpc === 'claim_profile_media_plus_expiry_cleanup') {
        return Response.json([{
          processed_job_id: 'a1500000-0000-4000-8000-000000000099',
          outcome: 'tombstoned',
          tombstoned_asset_count: 1
        }]);
      }
      if (rpc === 'claim_profile_media_deleted_cleanup_v2') return Response.json([paidAsset]);
      if (rpc === 'complete_profile_media_deleted_cleanup_v2') return Response.json({ success: true, completed: false });
      return Response.json([]);
    }
    if (url.hostname.endsWith('.r2.cloudflarestorage.com')) return new Response(null, { status: deleteStatus });
    if (url.hostname === 'api.cloudflare.com') {
      return Response.json({ success: purgeStatus === 200 }, { status: purgeStatus });
    }
    throw new Error(`Unexpected local test request to ${url.hostname}.`);
  };
  t.after(() => {
    globalThis.fetch = previousFetch;
  });
  return requests;
}

test('refund expiry tombstones enter the current R2 delete and CDN purge worker path', async t => {
  const requests = withMockedControlPlane(t);
  const response = await runAccountCleanup({ request: cleanupRequest(), env: fakeEnv });
  const payload = await response.json();
  const rpcNames = requests
    .filter(({ url }) => url.hostname === 'example.supabase.co')
    .map(({ url }) => url.pathname.split('/').at(-1));
  const r2Deletes = requests.filter(({ url, options }) => url.hostname.endsWith('.r2.cloudflarestorage.com') && options.method === 'DELETE');
  const purges = requests.filter(({ url }) => url.hostname === 'api.cloudflare.com');
  const completion = requests.find(({ url }) => url.pathname.endsWith('/complete_profile_media_deleted_cleanup_v2'));

  assert.equal(response.status, 200);
  assert.equal(payload.plus_expiry_jobs_claimed, 1);
  assert.equal(payload.deleted_assets_claimed, 1);
  assert.ok(rpcNames.indexOf('claim_profile_media_plus_expiry_cleanup') < rpcNames.indexOf('claim_profile_media_deleted_cleanup_v2'));
  assert.equal(r2Deletes.length, 4);
  assert.equal(purges.length, 1);
  assert.equal(JSON.parse(completion.options.body).p_delete_success, true);
  assert.equal(JSON.parse(completion.options.body).p_purge_success, true);
  assert.equal(payload.deleted_results[0].success, true);
});

test('R2 or cache-purge failure is reported to the scheduler for durable retry', async t => {
  const requests = withMockedControlPlane(t, { deleteStatus: 503, purgeStatus: 503 });
  const response = await runAccountCleanup({ request: cleanupRequest(), env: fakeEnv });
  const payload = await response.json();
  const completion = requests.find(({ url }) => url.pathname.endsWith('/complete_profile_media_deleted_cleanup_v2'));
  const completionBody = JSON.parse(completion.options.body);

  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.deleted_results[0].success, false);
  assert.equal(completionBody.p_delete_success, false);
  assert.equal(completionBody.p_purge_success, false);
  assert.match(completionBody.p_error, /503/);

  const previousLog = console.log;
  console.log = () => {};
  try {
    const scheduler = await triggerProfileMediaCleanup({
      R2_ACCOUNT_CLEANUP_SECRET: 'local-cleanup-test-secret',
      CLEANUP_ENDPOINT_URL: 'https://chm.lol/api/profile-media/account-cleanup'
    }, async () => Response.json(payload));
    assert.equal(scheduler.retried, 1);
  } finally {
    console.log = previousLog;
  }
});

test('cleanup scheduler summary includes refund-expiry work in its structured run record', async () => {
  const previousLog = console.log;
  let runRecord = null;
  console.log = value => { runRecord = JSON.parse(value); };
  try {
    const summary = await triggerProfileMediaCleanup({
      R2_ACCOUNT_CLEANUP_SECRET: 'local-cleanup-test-secret',
      CLEANUP_ENDPOINT_URL: 'https://chm.lol/api/profile-media/account-cleanup'
    }, async () => Response.json({ success: true, plus_expiry_jobs_claimed: 2 }));
    assert.equal(summary.ok, true);
    assert.equal(summary.plusExpiryJobsClaimed, 2);
    assert.equal(runRecord.plusExpiryJobsClaimed, 2);
  } finally {
    console.log = previousLog;
  }
});
