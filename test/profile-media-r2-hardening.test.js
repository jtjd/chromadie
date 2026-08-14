import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildSignature,
  createPresignedUrl,
  purgePublicMediaUrl,
  validateProfileMediaSignature
} from '../functions/_profileMediaControl.js';
import { selectedRows } from '../scripts/profile-media-migration-model.mjs';
import { triggerProfileMediaCleanup } from '../workers/profile-media-cleanup-scheduler/index.js';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const config = {
  accountId: '123456789012',
  accessKeyId: 'AKIDEXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
  privateBucket: 'private',
  publicBucket: 'public',
  endpoint: 'https://123456789012.r2.cloudflarestorage.com',
  publicOrigin: 'https://media.chm.lol'
};
const emptyHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const fixedDate = new Date('2013-05-24T00:00:00.000Z');

test('R2 header signatures use canonical sorted headers including x-amz-date', async () => {
  const signed = await buildSignature({
    config,
    method: 'GET',
    bucket: 'examplebucket',
    key: 'test.txt',
    headers: {
      Range: 'bytes=0-9',
      'x-amz-content-sha256': emptyHash,
      'x-amz-date': '20130524T000000Z'
    },
    payloadHash: emptyHash,
    date: fixedDate
  });
  assert.equal(signed.signedHeaders, 'host;range;x-amz-content-sha256;x-amz-date');
  assert.equal(signed.signature, '4d863731ed21981db5b611b5e778b01fa33707f7df973b2497a4ba7bb779db45');
});

test('R2 presigned PUT derives SignedHeaders instead of hard-coding their order', async () => {
  const url = await createPresignedUrl({
    R2_ACCOUNT_ID: config.accountId,
    R2_ACCESS_KEY_ID: config.accessKeyId,
    R2_SECRET_ACCESS_KEY: config.secretAccessKey,
    R2_PRIVATE_BUCKET: config.privateBucket,
    R2_PUBLIC_BUCKET: config.publicBucket
  }, {
    method: 'PUT',
    bucket: config.privateBucket,
    key: 'profiles/u/a/hash.webp',
    contentType: 'image/webp',
    contentLength: 123,
    metadataHash: 'a'.repeat(64),
    date: fixedDate
  });
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('X-Amz-SignedHeaders'), 'content-length;content-type;host;x-amz-meta-sha256');
  assert.equal(parsed.searchParams.get('X-Amz-Signature'), '9e031194eee0569d033104c2451fb2435287b14acdf49fb9f1e520898eb65f35');
});

test('server-side media signatures accept supported containers and reject mismatches', () => {
  const webp = new Uint8Array([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP')]);
  const ani = new Uint8Array([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('ACON')]);
  const mp4 = new Uint8Array([...new Uint8Array([0, 0, 0, 20]), ...Buffer.from('ftypisom')]);
  const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, ...Buffer.from('webm')]);
  const mp3 = new Uint8Array([...Buffer.from('ID3'), 4, 0, 0, 0, 0, 0, 0]);
  assert.equal(validateProfileMediaSignature({ bytes: webp, kind: 'avatar', extension: 'webp', mimeType: 'image/webp' }), true);
  assert.equal(validateProfileMediaSignature({ bytes: ani, kind: 'cursor', extension: 'ani', mimeType: 'application/x-navi-animation' }), true);
  assert.equal(validateProfileMediaSignature({ bytes: mp4, kind: 'background_video', extension: 'mp4', mimeType: 'video/mp4' }), true);
  assert.equal(validateProfileMediaSignature({ bytes: webm, kind: 'background_video', extension: 'webm', mimeType: 'video/webm' }), true);
  assert.equal(validateProfileMediaSignature({ bytes: mp3, kind: 'audio', extension: 'mp3', mimeType: 'audio/mpeg' }), true);
  assert.equal(validateProfileMediaSignature({ bytes: new TextEncoder().encode('not a webp'), kind: 'avatar', extension: 'webp', mimeType: 'image/webp' }), false);
  assert.equal(validateProfileMediaSignature({ bytes: webp, kind: 'avatar', extension: 'zip', mimeType: 'image/webp' }), false);
});

test('exact public media purge is scoped to the immutable media URL', async () => {
  const previousFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    await purgePublicMediaUrl({ CLOUDFLARE_ZONE_ID: 'zone-1', CLOUDFLARE_API_TOKEN: 'token-1', MEDIA_PUBLIC_ORIGIN: 'https://media.chm.lol' }, 'https://media.chm.lol/profiles/u/a.webp');
    assert.equal(requests.length, 1);
    assert.match(requests[0].url, /zones\/zone-1\/purge_cache$/);
    assert.deepEqual(JSON.parse(requests[0].options.body), { files: ['https://media.chm.lol/profiles/u/a.webp'] });
    await assert.rejects(
      purgePublicMediaUrl({ CLOUDFLARE_ZONE_ID: 'zone-1', CLOUDFLARE_API_TOKEN: 'token-1', MEDIA_PUBLIC_ORIGIN: 'https://media.chm.lol' }, 'https://media.chm.lol/profiles/u/a.webp?cache=1'),
      /exact media\.chm\.lol URL/
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('R2 hardening keeps audio migration targets distinct and cleanup retryable', async () => {
  const migration = await read('scripts/migrate-profile-media-to-r2.mjs');
  const migrationModel = await read('scripts/profile-media-migration-model.mjs');
  const selection = await read('supabase/migrations/20260813210000_profile_media_r2_deletion_and_selection.sql');
  const hardening = await read('supabase/migrations/20260813200000_profile_media_r2_hardening.sql');
  const promotion = await read('supabase/migrations/20260813220000_profile_media_r2_promotion_hardening.sql');
  assert.match(migrationModel, /playlist_track/);
  assert.match(migration, /migrate_profile_media_selection/);
  assert.doesNotMatch(migration, /profile_configurations\?user_id=eq/);
  assert.match(selection, /p_target text DEFAULT 'standalone'/);
  assert.match(selection, /jsonb_build_object\('asset_id', p_asset_id\)/);
  assert.match(selection, /audio_asset_id = CASE WHEN v_kind = 'audio'/);
  assert.match(selection, /complete_profile_media_deleted_cleanup_v2/);
  assert.match(hardening, /claim_profile_media_orphan_cleanup/);
  assert.match(hardening, /lease_expires_at/);
  assert.match(hardening, /lease_expires_at IS NULL/);
  assert.match(hardening, /8589934592/);
  assert.match(hardening, /WHEN 'background_video' THEN 3/);
  assert.match(hardening, /WHEN 'audio' THEN 5/);
  assert.match(hardening, /WHEN 'banner' THEN 1/);
  assert.match(promotion, /r2_public_key = coalesce\(r2_public_key, r2_private_key\)/);
});

test('audio migration keeps standalone and playlist references independent', () => {
  const userId = '10000000-0000-0000-0000-000000000001';
  const standalone = '20000000-0000-0000-0000-000000000001';
  const trackB = '20000000-0000-0000-0000-000000000002';
  const trackC = '20000000-0000-0000-0000-000000000003';
  const configuration = {
    user_id: userId,
    audio_asset_id: standalone,
    audio_playlist: { tracks: [
      { asset_id: trackB, path: 'b.mp3', label: 'B', order: 0 },
      { asset_id: trackC, path: 'c.mp3', label: 'C', order: 1 }
    ] }
  };
  const rows = selectedRows([configuration]);
  const byId = new Map(rows.map(row => [row.assetId, row]));
  assert.deepEqual(byId.get(standalone).references.map(reference => reference.target), ['standalone']);
  assert.deepEqual(byId.get(trackB).references.map(reference => reference.target), ['playlist_track']);
  assert.deepEqual(byId.get(trackC).references.map(reference => reference.target), ['playlist_track']);

  const playlistOnly = selectedRows([{
    user_id: userId,
    audio_playlist: { tracks: [{ asset_id: trackB, path: 'b.mp3' }, { asset_id: trackC, path: 'c.mp3' }] }
  }]);
  assert.equal(playlistOnly.some(row => row.references.some(reference => reference.target === 'standalone')), false);

  const shared = selectedRows([{
    user_id: userId,
    audio_asset_id: standalone,
    audio_playlist: { tracks: [{ asset_id: standalone, path: 'a.mp3' }] }
  }]).find(row => row.assetId === standalone);
  assert.deepEqual(shared.references.map(reference => reference.target).sort(), ['playlist_track', 'standalone']);
  assert.deepEqual(selectedRows([configuration]), selectedRows([configuration]));
});

test('R2 control plane does not expose private object keys to browser responses', async () => {
  const upload = await read('functions/api/profile-media/upload-intent.js');
  const complete = await read('functions/api/profile-media/complete.js');
  const control = await read('functions/_profileMediaControl.js');
  assert.doesNotMatch(upload, /r2_private_key:\s*prepared\.r2_private_key/);
  assert.match(complete, /publicMediaAssetPayload/);
  assert.match(control, /function publicMediaAssetPayload/);
});

test('R2 final correctness keeps deletion operation state and scheduler control-plane-only', async () => {
  const deletion = await read('functions/api/profile-media/delete.js');
  const lifecycle = await read('supabase/migrations/20260813230000_profile_media_r2_final_correctness.sql');
  const legacyCleanup = await read('supabase/migrations/20260813235900_profile_media_r2_legacy_storage_cleanup.sql');
  const accountCleanup = await read('functions/api/profile-media/account-cleanup.js');
  const completion = await read('functions/api/profile-media/complete.js');
  const promotion = await read('functions/api/profile-media/promote.js');
  const scheduler = await read('workers/profile-media-cleanup-scheduler/index.js');
  const schedulerConfig = await read('workers/profile-media-cleanup-scheduler/wrangler.toml');
  assert.match(deletion, /configuration_changed/);
  assert.match(deletion, /cleared_reference/);
  assert.match(deletion, /updated_at/);
  assert.match(lifecycle, /v_asset\.storage_path IS NOT NULL AND v_config\.avatar_path = v_asset\.storage_path/);
  assert.doesNotMatch(lifecycle, /v_config\.avatar_path IS NOT DISTINCT FROM v_asset\.storage_path/);
  assert.match(promotion, /complete_profile_media_private_cleanup/);
  assert.match(completion, /already_ready/);
  assert.match(promotion, /asset\.r2_public_key \|\| asset\.r2_private_key/);
  assert.match(promotion, /status === 404/);
  assert.match(lifecycle, /already_public/);
  assert.match(deletion, /delete_profile_media_legacy_storage_object/);
  assert.match(deletion, /asset\.storage_path/);
  assert.match(legacyCleanup, /storage\.objects/);
  assert.match(legacyCleanup, /v_bucket NOT IN \('avatars', 'backgrounds', 'profile_audio', 'profile_media'\)/);
  assert.match(legacyCleanup, /storage_path text/);
  assert.match(legacyCleanup, /'supabase'::text AS bucket/);
  assert.match(accountCleanup, /\['private', 'public', 'supabase'\]/);
  assert.match(accountCleanup, /delete_profile_media_legacy_storage_object/);
  assert.match(scheduler, /R2_ACCOUNT_CLEANUP_SECRET/);
  assert.match(scheduler, /Authorization: `Bearer \$\{secret\}`/);
  assert.match(scheduler, /CLEANUP_ENDPOINT_URL/);
  assert.match(schedulerConfig, /\*\/15 \* \* \* \*/);
  assert.doesNotMatch(scheduler, /media\.chm\.lol/);
});

test('permanent R2 library deletion stays on the provider control plane after rollback', async () => {
  const expressionEditor = await read('src/lib/ProfileExpressionEditor.svelte');
  const richMediaEditor = await read('src/lib/ProfileRichMediaEditor.svelte');
  assert.match(expressionEditor, /const data = isR2MediaAsset\(asset\)\s*\n\s*\? await deleteProfileMediaR2\(asset\.id\)/);
  assert.match(richMediaEditor, /const data = isR2MediaAsset\(asset\)\s*\n\s*\? await deleteProfileMediaR2\(asset\.id\)/);
  assert.match(expressionEditor, /Avatar unequipped\.[\s\S]*saved asset remains in your library/);
  assert.match(expressionEditor, /Background unequipped\.[\s\S]*saved asset remains in your library/);
  assert.match(expressionEditor, /profile-expression-editor__compact-library/);
  assert.match(expressionEditor, /compact-library-delete[\s\S]*Delete from library/);
  assert.match(expressionEditor, /Delete from library/);
  assert.match(richMediaEditor, /deleted from your library/);
});

test('legacy Supabase media cleanup is exact-path, retryable, and NULL-safe', async () => {
  const migration = await read('supabase/migrations/20260813235900_profile_media_r2_legacy_storage_cleanup.sql');
  const sqlTests = await read('supabase/tests/launch_security.sql');
  const deletion = await read('functions/api/profile-media/delete.js');
  const cleanup = await read('functions/api/profile-media/account-cleanup.js');
  assert.match(migration, /v_storage_path text := NULLIF\(p_storage_path, ''\)/);
  assert.match(migration, /v_object_path ~/);
  assert.match(migration, /DELETE FROM storage\.objects[\s\S]*WHERE bucket_id = v_bucket[\s\S]*AND name = v_object_path/);
  assert.match(migration, /asset\.storage_path/);
  assert.match(sqlTests, /r2_delete_migrated_avatar/);
  assert.match(sqlTests, /legacy_avatar_cleanup/);
  assert.match(sqlTests, /account deletion did not durably capture the retained legacy Supabase path/);
  assert.match(deletion, /p_storage_path: asset\.storage_path/);
  assert.match(cleanup, /p_storage_path: object\.key/);
  assert.match(cleanup, /p_storage_path: asset\.storage_path/);
  assert.match(cleanup, /const objectDeleteSuccess = failures\.every\(entry => entry\.operation === 'cache_purge'\)/);
});

test('cleanup scheduler authenticates the control-plane trigger and summarizes all cleanup groups', async () => {
  const requests = [];
  const summary = await triggerProfileMediaCleanup({
    R2_ACCOUNT_CLEANUP_SECRET: 'scheduler-secret',
    CLEANUP_ENDPOINT_URL: 'https://chm.lol/api/profile-media/account-cleanup'
  }, async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({
      success: true,
      claimed: 2,
      orphan_assets_claimed: 3,
      deleted_assets_claimed: 4,
      results: [{ success: true }],
      orphan_results: [{ success: false }],
      private_results: [{ success: false }],
      deleted_results: [{ success: true }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  assert.equal(summary.ok, true);
  assert.equal(summary.retried, 2);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://chm.lol/api/profile-media/account-cleanup');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer scheduler-secret');
  await assert.rejects(
    triggerProfileMediaCleanup({
      R2_ACCOUNT_CLEANUP_SECRET: 'scheduler-secret',
      CLEANUP_ENDPOINT_URL: 'http://chm.lol/api/profile-media/account-cleanup'
    }, async () => new Response('{}', { status: 200 })),
    /HTTPS URL/
  );
});
