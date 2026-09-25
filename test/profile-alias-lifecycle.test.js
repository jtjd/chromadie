import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

import { createProfileAliasLifecycle } from '../src/lib/profileAliasLifecycle.js';

const appSource = await readFile(new URL('../src/App.svelte', import.meta.url), 'utf8');
const appAliasLoadSource = appSource.slice(
  appSource.indexOf('async function loadProfileAlias('),
  appSource.indexOf('function invalidateChallengeLoad()')
);

function createAppAliasState(overrides = {}) {
  const state = {
    aliasResolutionGeneration: 1,
    aliasResolving: true,
    routeMode: 'app',
    view: 'profile',
    selectedProfileUsername: null,
    profileRouteKind: 'alias',
    legacyProfile: false,
    challengeData: null,
    selectedUserId: { set() {} },
    window: {
      location: { search: '?campaign=summer', hash: '#colors' },
      history: { replaceState(_state, _title, path) { state.replacedPath = path; } }
    },
    getProfileAliasLifecycle: async () => ({
      load: async () => ({ status: 'resolved', canonicalPath: '/NeonUser' })
    }),
    parseRoute() { state.parseRouteCalls = (state.parseRouteCalls || 0) + 1; },
    trackCurrentRoute() { state.trackRouteCalls = (state.trackRouteCalls || 0) + 1; },
    ...overrides
  };
  return state;
}

test('a current alias lookup projects its canonical profile path', async () => {
  const client = { name: 'supabase-client' };
  const calls = [];
  const lifecycle = createProfileAliasLifecycle({
    supabaseClient: client,
    resolveAlias: async (...args) => {
      calls.push(args);
      return { profile: { username: 'NeonUser' }, error: '' };
    },
    getCanonicalPath: username => `/${username}`
  });

  assert.deepEqual(await lifecycle.load('neon_home'), {
    status: 'resolved',
    canonicalPath: '/NeonUser'
  });
  assert.deepEqual(calls, [[client, 'neon_home']]);
});

test('missing profiles and lookup errors project to the existing not-found route', async () => {
  for (const resolveAlias of [
    async () => ({ profile: null, error: '' }),
    async () => ({ profile: { username: 'NeonUser' }, error: 'Offline' }),
    async () => { throw new Error('Offline'); }
  ]) {
    const lifecycle = createProfileAliasLifecycle({
      resolveAlias,
      getCanonicalPath: username => username ? `/${username}` : null
    });
    assert.deepEqual(await lifecycle.load('unknown_alias'), { status: 'not-found' });
  }
});

test('invalidating an alias route discards its pending result', async () => {
  let finishLookup;
  const lifecycle = createProfileAliasLifecycle({
    resolveAlias: () => new Promise(resolve => { finishLookup = resolve; }),
    getCanonicalPath: username => username ? `/${username}` : null
  });

  const pending = lifecycle.load('first_alias');
  lifecycle.invalidate();
  finishLookup({ profile: { username: 'OldProfile' }, error: '' });

  assert.deepEqual(await pending, { status: 'stale' });
});

test('a superseded alias lookup cannot replace the newer lookup result', async () => {
  const pendingLookups = [];
  const lifecycle = createProfileAliasLifecycle({
    resolveAlias: (_client, alias) => new Promise(resolve => pendingLookups.push({ alias, resolve })),
    getCanonicalPath: username => username ? `/${username}` : null
  });

  const first = lifecycle.load('first_alias');
  const second = lifecycle.load('second_alias');
  pendingLookups[1].resolve({ profile: { username: 'CurrentProfile' }, error: '' });
  assert.deepEqual(await second, { status: 'resolved', canonicalPath: '/CurrentProfile' });
  pendingLookups[0].resolve({ profile: { username: 'StaleProfile' }, error: '' });
  assert.deepEqual(await first, { status: 'stale' });
});

test('App preserves alias query and hash when replacing the route with its canonical profile', async () => {
  const state = createAppAliasState();
  vm.createContext(state);
  vm.runInContext(appAliasLoadSource, state);

  await vm.runInContext("loadProfileAlias('neon_home')", state);

  assert.equal(state.replacedPath, '/NeonUser?campaign=summer#colors');
  assert.equal(state.parseRouteCalls, 1);
  assert.equal(state.aliasResolving, false);
});

test('App ignores an alias lifecycle that finishes importing after navigation', async () => {
  let finishImport;
  let lookupCalls = 0;
  const state = createAppAliasState({
    getProfileAliasLifecycle: () => new Promise(resolve => { finishImport = resolve; })
  });
  vm.createContext(state);
  vm.runInContext(appAliasLoadSource, state);

  const pending = vm.runInContext("loadProfileAlias('stale_alias')", state);
  state.aliasResolutionGeneration += 1;
  state.view = 'pricing';
  state.aliasResolving = false;
  finishImport({ load: async () => { lookupCalls += 1; return { status: 'resolved', canonicalPath: '/OldProfile' }; } });
  await pending;

  assert.equal(lookupCalls, 0);
  assert.equal(state.replacedPath, undefined);
  assert.equal(state.view, 'pricing');
  assert.equal(state.aliasResolving, false);
});

test('App ignores an alias import failure after navigation', async () => {
  let failImport;
  const state = createAppAliasState({
    getProfileAliasLifecycle: () => new Promise((_resolve, reject) => { failImport = reject; })
  });
  vm.createContext(state);
  vm.runInContext(appAliasLoadSource, state);

  const pending = vm.runInContext("loadProfileAlias('stale_alias')", state);
  state.aliasResolutionGeneration += 1;
  state.view = 'game';
  state.aliasResolving = false;
  failImport(new Error('Chunk unavailable'));
  await pending;

  assert.equal(state.routeMode, 'app');
  assert.equal(state.view, 'game');
  assert.equal(state.aliasResolving, false);
  assert.equal(state.trackRouteCalls, undefined);
});
