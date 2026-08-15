import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveProfileMediaReference } from '../src/lib/profileMediaResolver.js';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('R2 public media references resolve to stable immutable URLs', () => {
  const reference = {
    storage_provider: 'r2',
    r2_public_key: 'profiles/user-1/asset-1/abc123.webp'
  };
  const first = resolveProfileMediaReference(reference, { publicOrigin: 'https://media.chm.lol' });
  const second = resolveProfileMediaReference(reference, { publicOrigin: 'https://media.chm.lol' });

  assert.equal(first, 'https://media.chm.lol/profiles/user-1/asset-1/abc123.webp');
  assert.equal(second, first);
  assert.doesNotMatch(first, /[?&](?:v|cacheNonce)=/);
});

test('legacy storage references fail closed and cannot be cache-busted into a URL', () => {
  const legacyResolver = () => 'https://storage.example.test/avatars/user/avatar.webp';
  const path = 'avatars/user/avatar.webp';

  assert.equal(resolveProfileMediaReference(path, { legacyResolver }), '');
  assert.equal(resolveProfileMediaReference(path, { legacyResolver, cacheKey: 'preview-1', allowLegacyCacheBust: true }), '');
  assert.equal(resolveProfileMediaReference({ url: 'https://example.supabase.co/storage/v1/object/public/avatars/user/avatar.webp' }), '');
});

test('public ProfileShell no longer cache-busts media or mounts a full image beside active video', async () => {
  const shell = await read('src/lib/ProfileShell.svelte');
  const environment = await read('src/lib/ProfileEnvironmentLayer.svelte');
  assert.doesNotMatch(shell, /mediaCacheKey = String\(Date\.now\(\)\)/);
  assert.match(shell, /ProfileEnvironmentLayer/);
  assert.match(environment, /backgroundSrc && !backgroundVideoActive/);
  assert.match(environment, /backgroundVideoActive\}/);
  assert.doesNotMatch(environment, /poster=\{backgroundSrc/);
});

test('R2 foundation keeps public publication state explicit and Standard-only', async () => {
  const migration = await read('supabase/migrations/20260813100000_profile_media_r2_foundation.sql');
  assert.match(migration, /ever_public boolean NOT NULL DEFAULT false/);
  assert.match(migration, /delivery_status text NOT NULL DEFAULT 'ready'/);
  assert.match(migration, /storage_provider IN \('supabase', 'r2'\)/);
  assert.doesNotMatch(migration, /storage_class|infrequent access/i);
});

test('R2 migration keeps the two-bucket overlap temporary and unequip does not privatize', async () => {
  const foundation = await read('supabase/migrations/20260813100000_profile_media_r2_foundation.sql');
  const projection = await read('supabase/migrations/20260813110000_profile_media_r2_projection_and_selection.sql');
  const cleanup = await read('supabase/migrations/20260813150000_profile_media_r2_account_cleanup.sql');
  assert.match(foundation, /r2_private_key text/);
  assert.match(foundation, /r2_public_key text/);
  assert.match(foundation, /ever_public boolean NOT NULL DEFAULT false/);
  assert.match(projection, /ever_public IS NOT TRUE/);
  assert.match(foundation, /Once true, unequip removes profile selection only/);
  assert.match(cleanup, /enqueue_profile_media_account_cleanup/);
  assert.match(cleanup, /claim_profile_media_account_cleanup_jobs/);
  assert.match(cleanup, /status IN \('pending', 'processing', 'retry', 'completed'\)/);
  const privateCleanup = await read('supabase/migrations/20260813170000_profile_media_r2_private_cleanup.sql');
  assert.match(privateCleanup, /claim_profile_media_private_cleanup/);
  assert.match(privateCleanup, /r2_private_key = NULL/);
  const deleteCleanup = await read('supabase/migrations/20260813180000_profile_media_r2_delete_cleanup.sql');
  assert.match(deleteCleanup, /claim_profile_media_deleted_cleanup/);
  assert.match(deleteCleanup, /complete_profile_media_deleted_cleanup/);
});

test('R2 public URL contract remains stable and migration tooling is idempotent in shape', async () => {
  const resolver = await read('src/lib/profileMediaResolver.js');
  const migrationScript = await read('scripts/migrate-profile-media-to-r2.mjs');
  assert.match(resolver, /immutable/);
  assert.doesNotMatch(resolver, /Date\.now\(\)/);
  assert.match(migrationScript, /dryRun/);
  assert.match(migrationScript, /already public on R2/);
  assert.match(migrationScript, /privateCleanup/);
  assert.match(migrationScript, /r2_private_key: null/);
});

test('latest database media projection and selection are R2-only', async () => {
  const migration = await read('supabase/migrations/20260814020000_profile_media_r2_only_runtime.sql');
  assert.match(migration, /storage_provider = 'r2'/g);
  assert.match(migration, /NULLIF\(v_asset\.r2_public_key, ''\)/);
  assert.doesNotMatch(migration, /storage_provider = 'supabase'/);
  assert.match(migration, /profile_media_public_reference/);
  assert.match(migration, /select_my_profile_expression_assets/);
  assert.match(migration, /select_my_profile_r2_media/);
  assert.match(migration, /select_my_profile_audio_asset/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.register_my_profile_media_asset/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.stage_my_profile_media_asset/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.select_my_profile_rich_media/);
});

test('R2 completion hashes actual private bytes and upload authorization enforces the global safety cap', async () => {
  const complete = await read('functions/api/profile-media/complete.js');
  const control = await read('functions/_profileMediaControl.js');
  const foundation = await read('supabase/migrations/20260813100000_profile_media_r2_foundation.sql');
  assert.match(complete, /objectResponse = await requestR2Object/);
  assert.match(complete, /sha256Hex\(objectBytes\)/);
  assert.match(control, /export async function sha256Hex/);
  assert.match(foundation, /8589934592/);
  assert.match(foundation, /chromadie:r2-profile-media-cap/);
});

test('R2 selection returns provider-neutral playlist and standalone audio references', async () => {
  const selection = await read('supabase/migrations/20260813130000_profile_media_r2_selection.sql');
  const audio = await read('supabase/migrations/20260813160000_profile_media_r2_audio_selection.sql');
  const latest = await read('supabase/migrations/20260814020000_profile_media_r2_only_runtime.sql');
  assert.match(selection, /profile_media_playlist_with_references\(v_playlist\)/);
  assert.match(audio, /select_my_profile_audio_asset/);
  assert.match(audio, /audio_asset_id/);
  assert.match(latest, /storage_provider = 'r2'/);
  assert.doesNotMatch(latest, /storage_provider = 'supabase'/);
});
