import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  clearAllViewState,
  clearViewState,
  getViewStateKey,
  readViewState,
  writeViewState
} from '../src/lib/viewState.js';

test('view state is scoped and survives component remounts in memory', () => {
  clearAllViewState();

  assert.equal(getViewStateKey('profile-editor', 'user/one'), 'chromadie-view-state:profile-editor:user_one');
  writeViewState('profile-editor', 'user-1', { draft: { links: ['https://example.com'] } });

  assert.deepEqual(readViewState('profile-editor', 'user-1'), { draft: { links: ['https://example.com'] } });
  assert.equal(readViewState('profile-editor', 'user-2'), null);

  clearViewState('profile-editor', 'user-1');
  assert.equal(readViewState('profile-editor', 'user-1'), null);
});

test('editable views persist state without making it server authority', async () => {
  const [editor, discovery, shop, stores, settings] = await Promise.all([
    readFile(new URL('../src/lib/ProfileEditor.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/DiscoveryHub.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/Shop.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/stores.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/ProfileSettings.svelte', import.meta.url), 'utf8')
  ]);

  assert.match(editor, /readViewState/);
  assert.match(editor, /writeViewState/);
  assert.match(editor, /clearViewState/);
  assert.doesNotMatch(editor, /save_profile_configuration_section|publish_profile_configuration_section/);
  assert.match(editor, /export function getDraftConfig/);
  assert.doesNotMatch(editor, /save_profile_configuration['"]/);
  assert.match(discovery, /VIEW_STATE_NAMESPACE = 'discovery'/);
  assert.match(shop, /VIEW_STATE_NAMESPACE = 'shop'/);
  assert.match(stores, /clearAllViewState/);
  assert.match(settings, /profileId=\{context\.profileId\}/);
});
