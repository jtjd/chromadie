import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hasProfileMediaRevalidationHash, partitionProfileMediaValidationAssets } from '../src/lib/profileMediaValidation.js';

test('only active, ready R2 rows bypass the library until they pass content policy v1', () => {
  const partitioned = partitionProfileMediaValidationAssets([
    { id: 'current', status: 'active', storage_provider: 'r2', content_validation_version: 1 },
    { id: 'old-ready', status: 'active', delivery_status: 'ready', storage_provider: 'r2', content_validation_version: 0 },
    { id: 'staged', status: 'active', delivery_status: 'staged', storage_provider: 'r2', content_validation_version: 0 },
    { id: 'deleted', status: 'deleted', delivery_status: 'ready', storage_provider: 'r2', content_validation_version: 0 },
    { id: 'legacy', status: 'active', storage_provider: 'supabase' }
  ]);

  assert.deepEqual(partitioned.assets.map(asset => asset.id), ['current', 'legacy']);
  assert.deepEqual(partitioned.unverifiedAssets.map(asset => asset.id), ['old-ready']);
});

test('legacy media revalidation requires the stored SHA-256 digest', () => {
  assert.equal(hasProfileMediaRevalidationHash({ content_hash_sha256: 'a'.repeat(64) }), true);
  assert.equal(hasProfileMediaRevalidationHash({ content_hash_sha256: 'A'.repeat(64) }), true);
  assert.equal(hasProfileMediaRevalidationHash({ content_hash_sha256: 'f'.repeat(63) }), false);
  assert.equal(hasProfileMediaRevalidationHash({ content_hash_sha256: 'x'.repeat(64) }), false);
});

test('both media libraries offer recheck and deletion for hidden legacy assets', async () => {
  const [expression, rich] = await Promise.all([
    readFile(new URL('../src/lib/ProfileExpressionEditor.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/ProfileRichMediaEditor.svelte', import.meta.url), 'utf8')
  ]);
  assert.match(expression, /revalidateProfileMediaR2\(asset\.id, asset\.content_hash_sha256, authorization\)/);
  assert.match(expression, /on:click=\{\(\) => deleteAsset\(asset\)\}>Delete from library/);
  assert.match(rich, /revalidateProfileMediaR2\(asset\.id, asset\.content_hash_sha256, authorization\)/);
  assert.match(rich, /on:click=\{\(\) => removeAsset\(asset\)\}>Delete from library/);
});
