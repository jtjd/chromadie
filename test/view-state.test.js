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
import { PROFILE_STUDIO_CUSTOMIZE_SECTION_IDS } from '../src/lib/profile-studio/dashboardContract.js';

test('view state is scoped and survives component remounts in memory', () => {
  clearAllViewState();

  assert.equal(getViewStateKey('profile-editor', 'user/one'), 'chromadie-view-state:profile-editor:user_one');
  writeViewState('profile-editor', 'user-1', { draft: { links: ['https://example.com'] } });

  assert.deepEqual(readViewState('profile-editor', 'user-1'), { draft: { links: ['https://example.com'] } });
  assert.equal(readViewState('profile-editor', 'user-2'), null);

  clearViewState('profile-editor', 'user-1');
  assert.equal(readViewState('profile-editor', 'user-1'), null);
});

test('only UI-only views persist session state; Profile Studio profile data does not', async () => {
  const [links, identity, discovery, stores, settings, customize, contract, workspace] = await Promise.all([
    readFile(new URL('../src/lib/ProfileLinksEditor.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/IdentityEditor.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/DiscoveryHub.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/stores.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/ProfileSettings.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/ProfileCustomizePage.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/profile-studio/dashboardContract.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/ProfileStudioWorkspace.svelte', import.meta.url), 'utf8')
  ]);

  for (const profileEditor of [links, identity]) {
    assert.doesNotMatch(profileEditor, /readViewState|writeViewState|clearViewState/);
    assert.doesNotMatch(profileEditor, /Unsaved (layout|content|widget|identity) restored/);
  }
  assert.doesNotMatch(links, /save_profile_configuration_section|publish_profile_configuration_section/);
  assert.doesNotMatch(links, /export function getDraftConfig/);
  assert.doesNotMatch(links, /save_profile_configuration['"]/);
  assert.match(discovery, /VIEW_STATE_NAMESPACE = 'discovery'/);
  assert.match(stores, /clearAllViewState/);
  assert.match(settings, /function createStudioEditorProfileConfig/);
  assert.match(settings, /return base && studioDraft \? \{ \.\.\.base, draft: studioDraft \} : base/);
  assert.match(customize, /identityDraft\?\.bio/);
  assert.doesNotMatch(customize, /contentComponent|widgetComponent|id="customize-content"|id="customize-widgets"/);
  assert.deepEqual(PROFILE_STUDIO_CUSTOMIZE_SECTION_IDS, ['customize', 'profile-identity', 'profile-media', 'profile-collection', 'profile-layout', 'profile-aliases']);
  assert.match(contract, /PROFILE_STUDIO_CUSTOMIZE_SECTION_IDS/);
  assert.match(workspace, /profileId=\{context\.profileId\}/);
  assert.match(workspace, /studioIdentityDraft/);
});
