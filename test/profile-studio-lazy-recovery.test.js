import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../src/lib/ProfileSettings.svelte', import.meta.url), 'utf8');
const loaderSource = source.slice(
  source.indexOf('  function loadSectionComponent('),
  source.indexOf('  async function loadPreviewComponent(')
);

test('a failed lazy section load clears on retry and mounts without a page reload', async () => {
  let attempts = 0;
  const state = {
    SECTION_LOADERS: {
      'profile-content': async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('temporary chunk failure');
        return { default: 'LoadedContentSection' };
      }
    },
    sectionComponents: {},
    sectionErrors: {},
    sectionLoadPromises: new Map(),
    sectionLoading: false
  };
  vm.createContext(state);
  vm.runInContext(loaderSource, state);

  await vm.runInContext("loadSectionComponent('profile-content')", state);
  assert.equal(state.sectionComponents['profile-content'], undefined);
  assert.equal(state.sectionErrors['profile-content'], 'temporary chunk failure');
  assert.equal(state.sectionLoading, false);

  await vm.runInContext("loadSectionComponent('profile-content', { force: true })", state);
  assert.equal(state.sectionComponents['profile-content'], 'LoadedContentSection');
  assert.equal(state.sectionErrors['profile-content'], '');
  assert.equal(state.sectionLoading, false);
});
