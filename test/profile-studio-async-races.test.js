import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../src/lib/ProfileSettings.svelte', import.meta.url), 'utf8');
// Exercise the actual component mutation handlers with a deferred RPC.
const handlers = source.slice(source.indexOf('  async function publishDashboard()'),
  source.indexOf('  async function loadSettings('));

for (const handler of ['publishDashboard', 'resetDashboard']) {
  for (const nextAccount of ['b', null]) {
    test(`${handler} ignores a response after ${nextAccount ? 'account switch' : 'logout'}`, async () => {
      let resolve;
      let writes = 0;
      const state = {
        requestId: 1, $session: { user: { id: 'a' } },
        dashboardMutationToken: 0,
        context: { profileId: 'a', targetProfile: {}, profileConfig: {} },
        dashboardSaving: false, profileDraftDirty: true,
        configurationWriteAvailable: true, dashboardError: '', dashboardStatus: '',
        accountUsername: 'alice', getDashboardEditor: () => null,
        getDashboardDraft: () => ({}), getDashboardIdentity: () => ({}),
        buildConfigurationV2: () => ({}), toEditorProfileConfig: value => value,
        supabase: { rpc: () => new Promise(done => { resolve = done; }) },
        isFailedResponse: () => false,
        profile: { update: () => { writes++; } },
        applyDashboardConfiguration: () => { writes++; }
      };
      vm.createContext(state);
      vm.runInContext(handlers, state);
      const pending = vm.runInContext(`${handler}()`, state);
      state.requestId++;
      state.$session = nextAccount ? { user: { id: nextAccount } } : null;
      const nextContext = { profileId: nextAccount, targetProfile: {}, profileConfig: {} };
      state.context = nextContext;
      resolve({ data: { success: true, identity: { bio: 'old account bio' } } });
      await pending;
      assert.equal(writes, 0);
      assert.equal(state.context, nextContext);
      assert.equal(state.dashboardSaving, false);
    });
  }
}

test('a thrown publish RPC releases the mutation lock and exposes a retryable error', async () => {
  const state = {
    requestId: 1, $session: { user: { id: 'a' } },
    dashboardMutationToken: 0,
    context: { profileId: 'a', targetProfile: {}, profileConfig: {} },
    dashboardSaving: false, profileDraftDirty: true,
    configurationWriteAvailable: true, dashboardError: '', dashboardStatus: '',
    accountUsername: 'alice', getDashboardEditor: () => null,
    getDashboardDraft: () => ({}), getDashboardIdentity: () => ({}),
    buildConfigurationV2: () => ({}), toEditorProfileConfig: value => value,
    supabase: { rpc: async () => { throw new Error('network unavailable'); } },
    isFailedResponse: () => false,
    profile: { update: () => {} },
    applyDashboardConfiguration: () => {}
  };
  vm.createContext(state);
  vm.runInContext(handlers, state);
  await vm.runInContext('publishDashboard()', state);
  assert.equal(state.dashboardSaving, false);
  assert.equal(state.dashboardStatus, '');
  assert.equal(state.dashboardError, 'network unavailable');
});

test('a thrown reset RPC releases the mutation lock and exposes a retryable error', async () => {
  const state = {
    requestId: 1, $session: { user: { id: 'a' } },
    dashboardMutationToken: 0,
    context: { profileId: 'a', targetProfile: {}, profileConfig: { published: {} } },
    dashboardSaving: false, profileDraftDirty: true,
    configurationWriteAvailable: true, dashboardError: '', dashboardStatus: '',
    getDashboardDraft: () => ({}), buildConfigurationV2: () => ({}),
    toEditorProfileConfig: value => value,
    supabase: { rpc: async () => { throw new Error('network unavailable'); } },
    isFailedResponse: () => false,
    applyDashboardConfiguration: () => {}
  };
  vm.createContext(state);
  vm.runInContext(handlers, state);
  await vm.runInContext('resetDashboard()', state);
  assert.equal(state.dashboardSaving, false);
  assert.equal(state.dashboardStatus, '');
  assert.equal(state.dashboardError, 'network unavailable');
});

for (const handler of ['publishDashboard', 'resetDashboard']) {
  test(`${handler} cannot clear a newer mutation lock`, async () => {
    const resolvers = [];
    const state = {
      requestId: 1, dashboardMutationToken: 0, $session: { user: { id: 'a' } },
      context: { profileId: 'a', targetProfile: {}, profileConfig: { published: {} } },
      dashboardSaving: false, profileDraftDirty: true,
      configurationWriteAvailable: true, dashboardError: '', dashboardStatus: '',
      accountUsername: 'alice', getDashboardEditor: () => null,
      getDashboardDraft: () => ({}), getDashboardIdentity: () => ({}),
      buildConfigurationV2: () => ({}), toEditorProfileConfig: value => value,
      supabase: { rpc: () => new Promise(resolve => resolvers.push(resolve)) },
      isFailedResponse: () => false,
      profile: { update: () => {} },
      applyDashboardConfiguration: () => {}
    };
    vm.createContext(state);
    vm.runInContext(handlers, state);
    const older = vm.runInContext(`${handler}()`, state);

    // Account hydration invalidates the old token and releases its lock. A
    // new mutation may now own the saving state while the old RPC is pending.
    state.requestId = 2;
    state.dashboardMutationToken += 1;
    state.$session = { user: { id: 'b' } };
    state.context = { profileId: 'b', targetProfile: {}, profileConfig: { published: {} } };
    state.dashboardSaving = false;
    const newer = vm.runInContext(`${handler}()`, state);
    assert.equal(resolvers.length, 2);

    resolvers[0]({ data: { success: true, identity: { bio: 'old account bio' } } });
    await older;
    assert.equal(state.dashboardSaving, true);

    resolvers[1]({ data: { success: true, identity: { bio: 'new account bio' } } });
    await newer;
    assert.equal(state.dashboardSaving, false);
  });
}

test('A to B to A reloads the active account instead of retaining a visited-account set', () => {
  const fn = source.slice(source.indexOf('  function ensureSettingsLoaded('), source.indexOf('  onMount('));
  const calls = [];
  const state = { settingsLoadAccounts: new Set(), context: null,
    studioDraft: null, studioIdentityDraft: null, dashboardSaving: false,
    dashboardMutationToken: 0,
    loadSettings: id => calls.push(id) };
  vm.createContext(state);
  vm.runInContext(fn, state);
  vm.runInContext("ensureSettingsLoaded('a'); ensureSettingsLoaded('a'); ensureSettingsLoaded('b'); ensureSettingsLoaded('a');", state);
  assert.deepEqual(calls, ['a', 'b', 'a']);
});
