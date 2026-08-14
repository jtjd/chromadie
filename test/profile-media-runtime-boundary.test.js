import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveProfileMediaReference } from '../src/lib/profileMediaResolver.js';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('production runtime has no Supabase Storage capability', async () => {
  const sources = await Promise.all([
    read('src/lib/profileMedia.js'),
    read('src/lib/profileMediaResolver.js'),
    read('src/lib/supabase.js'),
    read('src/lib/supabaseTransport.js'),
    read('src/lib/ProfileExpressionEditor.svelte'),
    read('src/lib/ProfileRichMediaEditor.svelte'),
    read('src/lib/ProfileMusic.svelte'),
    read('functions/_profilePage.js'),
    read('functions/_profileMediaControl.js'),
    read('functions/_publicPage.js'),
    read('functions/api/profile-media/delete.js'),
    read('functions/api/profile-media/account-cleanup.js'),
    read('functions/api/profile-media/delete-legacy-audio.js')
  ]);
  const runtime = sources.join('\n');
  assert.doesNotMatch(runtime, /supabase\s*\.\s*storage\b/);
  assert.doesNotMatch(runtime, /\.storage\s*\.\s*from\s*\(/);
  assert.doesNotMatch(runtime, /getPublicUrl\s*\(/);
  assert.doesNotMatch(runtime, /\/storage\/v1(?:\/object)?/);
  assert.doesNotMatch(runtime, /object\/public\//);
  assert.doesNotMatch(runtime, /(?:img-src|media-src)[^\n]*supabase\.co/);
  assert.doesNotMatch(runtime, /mediaCacheKey|verify-\$\{Date\.now|cacheKey\s*=\s*String\(Date\.now/);
});

test('shared media elements reject Supabase Storage-shaped URLs', async () => {
  const mediaSafety = await read('src/lib/mediaSafety.js');
  assert.match(mediaSafety, /storage\\\/v1/);
  assert.doesNotMatch(mediaSafety, /supabaseStorage|from\s*\(/);
});

test('R2 media identity is the complete stable URL contract', () => {
  const reference = {
    storage_provider: 'r2',
    r2_public_key: 'profiles/user/asset/immutable.webp'
  };
  const urls = Array.from({ length: 5 }, () => resolveProfileMediaReference(reference));
  assert.deepEqual(new Set(urls), new Set(['https://media.chm.lol/profiles/user/asset/immutable.webp']));
  assert.ok(urls.every(url => !/[?&](?:v|cache|nonce)=/i.test(url)));
});

test('legacy media references and Supabase URLs fail closed', () => {
  assert.equal(resolveProfileMediaReference('avatars/user/avatar.webp'), '');
  assert.equal(resolveProfileMediaReference({ storage_provider: 'supabase', storage_path: 'avatars/user/avatar.webp' }), '');
  assert.equal(resolveProfileMediaReference({ url: 'https://project.supabase.co/storage/v1/object/public/avatars/user/avatar.webp' }), '');
});

test('profile media deletion paths are R2/control-plane-only', async () => {
  const [deleteRoute, cleanupRoute, legacyRoute] = await Promise.all([
    read('functions/api/profile-media/delete.js'),
    read('functions/api/profile-media/account-cleanup.js'),
    read('functions/api/profile-media/delete-legacy-audio.js')
  ]);
  assert.match(deleteRoute, /requestR2Object/);
  assert.match(cleanupRoute, /requestR2Object/);
  assert.match(legacyRoute, /clear_my_legacy_profile_audio/);
  assert.doesNotMatch(`${deleteRoute}\n${cleanupRoute}\n${legacyRoute}`, /deleteSupabaseStorageObject|storage\/v1/);
});

test('latest database lockdown leaves no active public function touching Storage objects', async () => {
  const migration = await read('supabase/migrations/20260814030000_profile_media_storage_runtime_lockdown.sql');
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.delete_profile_expression_media/);
  assert.match(migration, /RETURN OLD/);
  assert.match(migration, /profile_media_account_cleanup_enqueue_internal/);
  assert.match(migration, /'private'::text AS bucket/);
  assert.match(migration, /'public'::text AS bucket/);
  assert.doesNotMatch(migration, /storage\.objects/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.cleanup_staged_profile_media/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.delete_profile_media_legacy_storage_object/);
});

test('the active database disables the historical Supabase profile-media buckets', async () => {
  const migration = await read('supabase/migrations/20260814040000_disable_legacy_profile_storage.sql');

  assert.match(migration, /SET public = false/);
  for (const bucket of ['avatars', 'backgrounds', 'profile_audio', 'profile_media']) {
    assert.match(migration, new RegExp(`'${bucket}'`));
  }
  assert.doesNotMatch(migration, /INSERT INTO\s+storage\.buckets/i);
  assert.match(migration, /DROP POLICY IF EXISTS/);
});
