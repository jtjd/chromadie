import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { partitionProfileMediaValidationAssets } from '../src/lib/profileMediaValidation.js';

const source = await readFile(new URL('../src/lib/ProfileExpressionEditor.svelte', import.meta.url), 'utf8');
function harness(loadAssets) {
  const context = vm.createContext({
    profileId: 'owner', assetLoadRequestId: 0, assetsLoading: false, assetsError: '',
    avatarAssets: [{ id: 'saved' }], backgroundAssets: [], unverifiedAssets: [],
    $session: { user: { id: 'owner' } },
    supabase: {},
    loadProfileExpressionAssetLibrary: (_client, profileId) => loadAssets(profileId),
    partitionProfileMediaValidationAssets,
    Error
  });
  const start = source.indexOf('  async function loadAssetLibrary()');
  vm.runInContext(source.slice(start, source.indexOf('\n  }', start) + 4), context);
  return context;
}

test('Media library transport failure retains saved assets and supports retry', async () => {
  let fail = true;
  const context = harness(async () => {
    if (fail) throw new Error('Offline');
    return [{ id: 'fresh', kind: 'avatar', status: 'active' }];
  });
  await context.loadAssetLibrary();
  assert.equal(context.assetsLoading, false);
  assert.equal(context.assetsError, 'Offline');
  assert.equal(context.avatarAssets[0].id, 'saved');
  fail = false;
  await context.loadAssetLibrary();
  assert.equal(context.assetsError, '');
  assert.equal(context.avatarAssets[0].id, 'fresh');
});

test('An outdated media-library failure cannot replace a newer successful load', async () => {
  let rejectOld;
  let calls = 0;
  const context = harness(() => ++calls === 1
    ? new Promise((_, reject) => { rejectOld = reject; })
    : Promise.resolve([{ id: 'new', kind: 'background' }]));
  const old = context.loadAssetLibrary();
  await context.loadAssetLibrary();
  rejectOld(new Error('Old failure'));
  await old;
  assert.equal(context.assetsError, '');
  assert.equal(context.assetsLoading, false);
  assert.equal(context.backgroundAssets[0].id, 'new');
});

test('The expression library separates legacy R2 rows from selectable media', async () => {
  const context = harness(async () => [
    { id: 'safe', kind: 'avatar', status: 'active', storage_provider: 'r2', content_validation_version: 1 },
    { id: 'recheck', kind: 'background', status: 'active', delivery_status: 'ready', storage_provider: 'r2', content_validation_version: 0 },
    { id: 'pending', kind: 'avatar', status: 'active', delivery_status: 'staged', storage_provider: 'r2', content_validation_version: 0 },
    { id: 'legacy', kind: 'avatar', status: 'active', storage_provider: 'supabase' }
  ]);
  await context.loadAssetLibrary();
  assert.deepEqual(Array.from(context.avatarAssets, asset => asset.id), ['safe', 'legacy']);
  assert.deepEqual(Array.from(context.backgroundAssets, asset => asset.id), []);
  assert.deepEqual(Array.from(context.unverifiedAssets, asset => asset.id), ['recheck']);
});
