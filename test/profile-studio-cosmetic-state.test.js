import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { hasDirtySources } from '../src/lib/profile-studio/dirtyState.js';
import { applyCosmeticChanges } from '../src/lib/profile-studio/cosmeticMutations.js';

const source = await readFile(new URL('../src/lib/ProfileSettings.svelte', import.meta.url), 'utf8');
const cosmetics = await readFile(new URL('../src/lib/ProfileCosmeticsEditor.svelte', import.meta.url), 'utf8');
const declarations = source.slice(source.indexOf('  $: profileDraftDirty ='), source.indexOf('  $: configurationWriteAvailable'));
const handlers = source.slice(source.indexOf('  function applyDashboardConfiguration('), source.indexOf('  async function loadSettings('));
function setup() {
  const state = {
    dirtySources: {}, cosmeticPreviewLoadout: { profile_border: 'new' },
    $equippedItems: { profile_border: 'old' },
    context: { profileId: 'a', targetProfile: {}, profileConfig: {} },
    hasDirtySources, hasServerDraftChanges: () => false,
    dashboardSaving: false, profileDraftDirty: false, dashboardMutationToken: 0,
    configurationWriteAvailable: true, requestId: 1, $session: { user: { id: 'a' } },
    asConfigurationV2: value => value, toEditorProfileConfig: value => value,
    getDashboardEditor: () => null, getDashboardDraft: () => ({}), getDashboardIdentity: () => ({}),
    buildConfigurationV2: value => value, accountUsername: 'alice',
    profile: { update: () => {} }, workspace: { acceptSaved: () => {} }
  };
  vm.createContext(state);
  vm.runInContext(handlers, state);
  return state;
}
function recompute(state) { vm.runInContext(declarations, state); }

test('cosmetic-only previews warn but cannot publish or reset the profile draft', async () => {
  const state = setup();
  state.supabase = { rpc: () => assert.fail('cosmetic-only state must not write profile configuration') };
  recompute(state);
  assert.equal(state.dashboardDirty, true);
  assert.equal(state.profileDraftDirty, false);
  await vm.runInContext('publishDashboard()', state);
  await vm.runInContext('resetDashboard()', state);
  assert.equal(state.cosmeticPreviewLoadout.profile_border, 'new');
  assert.match(source, /navigationDirty = dashboardDirty \|\| preferenceDirty/);
  assert.match(source, /mobileDirty=\{profileDraftDirty\}/);
  assert.match(source, /dirty=\{profileDraftDirty\}/);
  assert.match(source, /dirty=\{dashboardDirty\}/);
});

for (const handler of ['publishDashboard', 'resetDashboard']) {
  test(`${handler} clears profile changes while preserving mixed cosmetic previews`, async () => {
    const state = setup();
    state.dirtySources = { 'customize:appearance': true };
    const calls = [];
    state.supabase = { rpc: async name => { calls.push(name); return { data: { success: true, draft: {}, published: {} } }; } };
    recompute(state);
    assert.equal(state.profileDraftDirty, true);
    await vm.runInContext(`${handler}()`, state);
    recompute(state);
    assert.equal(state.profileDraftDirty, false);
    assert.equal(state.dashboardDirty, true);
    assert.equal(state.cosmeticPreviewLoadout.profile_border, 'new');
    assert.deepEqual(calls, [handler === 'publishDashboard' ? 'publish_profile_studio_v2' : 'save_profile_configuration_v2']);
  });
}

for (const failsRefresh of [false, true]) {
  test(`cosmetic Apply clears preview dirtiness with ${failsRefresh ? 'known RPC fallback' : 'authoritative refresh'}`, async () => {
    const state = setup();
    Object.assign(state, {
      loadingSlot: '', hasPendingChanges: true, COSMETIC_SLOTS: ['profile_border'],
      previewLoadout: state.cosmeticPreviewLoadout, applyCosmeticChanges,
      $cosmeticCatalogItems: { new: { item_key: 'new' } }, fittingRoom: {},
      hasShopEntitlement: () => true,
      supabase: { rpc: async () => ({ data: { success: true } }) },
      refreshProfileState: async () => { if (failsRefresh) throw new Error('offline'); return { equipped_cosmetics: { profile_border: 'new' } }; },
      equippedItems: { set: value => { state.$equippedItems = value; } },
      dispatch: (name, detail) => { if (name === 'cosmeticpreview') state.cosmeticPreviewLoadout = detail.loadout; },
      trackProductEvent: () => {}, addToast: () => {}
    });
    vm.runInContext(cosmetics.slice(cosmetics.indexOf('  async function applyChanges()'), cosmetics.indexOf('</script>')), state);
    await vm.runInContext('applyChanges()', state);
    recompute(state);
    assert.equal(state.$equippedItems.profile_border, 'new');
    assert.equal(state.cosmeticPreviewDirty, false);
    assert.equal(state.dashboardDirty, false);
  });
}
