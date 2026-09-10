import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../src/lib/ProfileSettings.svelte', import.meta.url), 'utf8');
const handlerSource = source.slice(
  source.indexOf('  function updateCosmeticPreview('),
  source.indexOf('  function handleSocialChange(')
);

test('cosmetic fitting-room previews participate in Customize dirty state until applied', () => {
  const state = {
    $equippedItems: { profile_border: 'border_signal' },
    dirtySources: {},
    dashboardError: 'old error',
    dashboardStatus: 'old status',
    updateDirtySource(sources, sourceName, dirty) {
      const next = { ...sources };
      if (dirty) next[sourceName] = true;
      else delete next[sourceName];
      return next;
    }
  };
  vm.createContext(state);
  vm.runInContext(handlerSource, state);

  vm.runInContext("updateCosmeticPreview({ detail: { loadout: { profile_border: 'border_celestial' } } })", state);
  assert.equal(JSON.stringify(state.cosmeticPreviewLoadout), JSON.stringify({ profile_border: 'border_celestial' }));
  assert.equal(JSON.stringify(state.dirtySources), JSON.stringify({ 'customize:cosmetics': true }));
  assert.equal(state.dashboardError, '');
  assert.equal(state.dashboardStatus, '');

  vm.runInContext("updateCosmeticPreview({ detail: { loadout: { profile_border: 'border_signal' } } })", state);
  assert.equal(JSON.stringify(state.dirtySources), JSON.stringify({}));
});
