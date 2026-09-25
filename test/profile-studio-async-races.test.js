import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { writeProfileStudioConfiguration } from '../src/lib/profile-studio/configurationWrites.js';

const source = await readFile(new URL('../src/lib/ProfileSettings.svelte', import.meta.url), 'utf8');
// Exercise the shared component mutation lifecycle through both action wrappers.
const handlers = source.slice(source.indexOf('  async function writeDashboardConfiguration(action)'),
  source.indexOf('  async function loadSettings('));

function evaluateHandlers(state) {
  state.loadConfigurationWriteService ||= async () => ({ writeProfileStudioConfiguration });
  vm.createContext(state);
  vm.runInContext(handlers, state);
}

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
        profile: { update: () => { writes++; } },
        applyDashboardConfiguration: () => { writes++; }
      };
      evaluateHandlers(state);
      const pending = vm.runInContext(`${handler}()`, state);
      await new Promise(resolve => setImmediate(resolve));
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
    profile: { update: () => {} },
    applyDashboardConfiguration: () => {}
  };
  evaluateHandlers(state);
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
    applyDashboardConfiguration: () => {}
  };
  evaluateHandlers(state);
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
      profile: { update: () => {} },
      applyDashboardConfiguration: () => {}
    };
    evaluateHandlers(state);
    const older = vm.runInContext(`${handler}()`, state);
    await new Promise(resolve => setImmediate(resolve));

    // Account hydration invalidates the old token and releases its lock. A
    // new mutation may now own the saving state while the old RPC is pending.
    state.requestId = 2;
    state.dashboardMutationToken += 1;
    state.$session = { user: { id: 'b' } };
    state.context = { profileId: 'b', targetProfile: {}, profileConfig: { published: {} } };
    state.dashboardSaving = false;
    const newer = vm.runInContext(`${handler}()`, state);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(resolvers.length, 2);

    resolvers[0]({ data: { success: true, identity: { bio: 'old account bio' } } });
    await older;
    assert.equal(state.dashboardSaving, true);

    resolvers[1]({ data: { success: true, identity: { bio: 'new account bio' } } });
    await newer;
    assert.equal(state.dashboardSaving, false);
  });
}

test('a stale account does not dispatch after the lazy write service loads', async () => {
  let finishServiceLoad;
  let rpcCalls = 0;
  const state = {
    requestId: 1, $session: { user: { id: 'a' } }, dashboardMutationToken: 0,
    context: { profileId: 'a', targetProfile: {}, profileConfig: {} },
    dashboardSaving: false, profileDraftDirty: true, configurationWriteAvailable: true,
    dashboardError: '', dashboardStatus: '', accountUsername: 'alice',
    getDashboardEditor: () => null, getDashboardDraft: () => ({}), getDashboardIdentity: () => ({}),
    buildConfigurationV2: () => ({}), loadConfigurationWriteService: () => new Promise(resolve => {
      finishServiceLoad = () => resolve({ writeProfileStudioConfiguration });
    }),
    supabase: { rpc: async () => { rpcCalls++; return { data: { success: true } }; } },
    profile: { update: () => {} }, applyDashboardConfiguration: () => {}
  };
  evaluateHandlers(state);
  const pending = vm.runInContext('publishDashboard()', state);
  state.requestId++;
  state.$session = { user: { id: 'b' } };
  finishServiceLoad();
  await pending;
  assert.equal(rpcCalls, 0);
  assert.equal(state.dashboardSaving, false);
});

test('the shared write lifecycle preserves publish and reset draft inputs', async () => {
  for (const action of ['publish', 'reset']) {
    const calls = [];
    const publishedDraft = { version: 1, source: 'published' };
    const publishedV2 = { version: 2, source: 'published-v2' };
    const state = {
      requestId: 1, $session: { user: { id: 'a' } }, dashboardMutationToken: 0,
      context: {
        profileId: 'a', targetProfile: { bio: 'saved bio' },
        profileConfig: { published: publishedDraft, v2Published: publishedV2, updatedAt: 'update-token' }
      },
      dashboardSaving: false, profileDraftDirty: true, configurationWriteAvailable: true,
      dashboardError: '', dashboardStatus: '', accountUsername: 'alice',
      getDashboardEditor: () => null,
      getDashboardDraft: () => ({ source: 'current-draft' }),
      getDashboardIdentity: () => ({ bio: 'draft bio' }),
      buildConfigurationV2: (draft, reference) => ({ draft, reference }),
      toEditorProfileConfig: value => ({ editorSource: value }),
      supabase: { rpc: async (...parameters) => {
        calls.push(parameters);
        return { data: { success: true, draft: {}, published: {} }, error: null };
      } },
      profile: { update: () => {} },
      applyDashboardConfiguration: () => {}
    };
    evaluateHandlers(state);
    await vm.runInContext(`writeDashboardConfiguration('${action}')`, state);

    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], action === 'publish' ? 'publish_profile_studio_v2' : 'save_profile_configuration_v2');
    const parameters = JSON.parse(JSON.stringify(calls[0][1]));
    assert.equal(parameters.p_expected_updated_at, 'update-token');
    if (action === 'publish') {
      assert.deepEqual(parameters.p_draft, {
        draft: { source: 'current-draft' }
      });
      assert.equal(parameters.p_display_name, 'alice');
      assert.equal(parameters.p_bio, 'draft bio');
    } else {
      assert.deepEqual(parameters.p_draft, {
        draft: { editorSource: publishedDraft },
        reference: publishedV2
      });
      assert.equal(Object.hasOwn(parameters, 'p_display_name'), false);
      assert.equal(Object.hasOwn(parameters, 'p_bio'), false);
    }
  }
});

test('A to B to A reloads the active account instead of retaining a visited-account set', () => {
  const fn = source.slice(source.indexOf('  function resetAccountScopedState('), source.indexOf('  onMount('));
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

test('switching accounts clears dirty state, previews, and pending navigation', () => {
  const fn = source.slice(source.indexOf('  function resetAccountScopedState('), source.indexOf('  onMount('));
  const state = {
    settingsLoadAccounts: new Set(['a']),
    context: { profileId: 'a' },
    studioDraft: { color: '#112233' },
    studioIdentityDraft: { bio: 'unsaved' },
    cosmeticPreviewLoadout: { title: 'old-account-title' },
    dirtySources: { identity: true },
    preferenceDirty: true,
    pendingNavigation: { type: 'section', value: 'profile-social' },
    showDirtyPrompt: true,
    dirtyPromptComponent: {},
    dirtyPromptReturnFocus: {},
    previewOpen: true,
    dashboardSaving: true,
    dashboardStatus: 'Saving',
    dashboardError: 'old error',
    dashboardMutationToken: 0,
    loadSettings: () => {}
  };
  vm.createContext(state);
  vm.runInContext(fn, state);
  vm.runInContext("ensureSettingsLoaded('b')", state);

  assert.equal(state.context, null);
  assert.equal(state.studioDraft, null);
  assert.equal(state.studioIdentityDraft, null);
  assert.equal(state.cosmeticPreviewLoadout, null);
  assert.deepEqual(JSON.parse(JSON.stringify(state.dirtySources)), {});
  assert.equal(state.preferenceDirty, false);
  assert.equal(state.pendingNavigation, null);
  assert.equal(state.showDirtyPrompt, false);
  assert.equal(state.dirtyPromptReturnFocus, null);
  assert.equal(state.dashboardSaving, false);
});
