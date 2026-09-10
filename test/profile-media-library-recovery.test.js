import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../src/lib/ProfileExpressionEditor.svelte', import.meta.url), 'utf8');
function harness(request) {
  const builder = { select() { return this; }, eq() { return this; }, order: request };
  const context = vm.createContext({
    profileId: 'owner', assetLoadRequestId: 0, assetsLoading: false, assetsError: '',
    avatarAssets: [{ id: 'saved' }], backgroundAssets: [],
    supabase: { from: () => builder }, Error
  });
  const start = source.indexOf('  async function loadAssetLibrary()');
  vm.runInContext(source.slice(start, source.indexOf('\n  }', start) + 4), context);
  return context;
}

test('Media library transport failure retains saved assets and supports retry', async () => {
  let fail = true;
  const context = harness(async () => {
    if (fail) throw new Error('Offline');
    return { data: [{ id: 'fresh', kind: 'avatar', status: 'active' }] };
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
    : Promise.resolve({ data: [{ id: 'new', kind: 'background' }] }));
  const old = context.loadAssetLibrary();
  await context.loadAssetLibrary();
  rejectOld(new Error('Old failure'));
  await old;
  assert.equal(context.assetsError, '');
  assert.equal(context.assetsLoading, false);
  assert.equal(context.backgroundAssets[0].id, 'new');
});
