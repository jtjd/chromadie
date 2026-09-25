import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

import { createSocialFollowLifecycle } from '../src/lib/socialFollowLifecycle.js';

const socialStateSource = await readFile(new URL('../src/lib/socialState.js', import.meta.url), 'utf8');
const profileShellSource = await readFile(new URL('../src/lib/ProfileShell.svelte', import.meta.url), 'utf8');
const leaderboardSource = await readFile(new URL('../src/lib/Leaderboard.svelte', import.meta.url), 'utf8');
const profileFollowHandler = profileShellSource.slice(
  profileShellSource.indexOf('  async function handleFollow()'),
  profileShellSource.indexOf('  async function handleSocialChange()')
);
const leaderboardFollowHandler = leaderboardSource.slice(
  leaderboardSource.indexOf('  async function removeRival(event)'),
  leaderboardSource.indexOf('  onMount(() => {', leaderboardSource.indexOf('  async function removeRival(event)'))
);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function createHarness(rpc) {
  let value = [];
  const store = {
    set(next) { value = next; },
    update(project) { value = project(value); },
    get value() { return value; }
  };
  const notifications = [];
  const lifecycle = createSocialFollowLifecycle({
    supabaseClient: { rpc },
    followedUsers: store,
    addToast: (message, type) => notifications.push({ message, type })
  });
  return { lifecycle, store, notifications };
}

test('a follow response from a cleared account cannot update the new account or show stale feedback', async () => {
  const request = deferred();
  const { lifecycle, store, notifications } = createHarness(() => request.promise);

  const oldAccountRequest = lifecycle.toggle('rival-a');
  lifecycle.clear();
  store.set(['rival-b']);
  request.resolve({ data: { success: true, action: 'followed' }, error: null });

  assert.deepEqual(await oldAccountRequest, { success: false, stale: true });
  assert.deepEqual(store.value, ['rival-b']);
  assert.deepEqual(notifications, []);
});

test('a rejected stale follow request cannot show an error for the new account', async () => {
  const request = deferred();
  const { lifecycle, notifications } = createHarness(() => request.promise);

  const oldAccountRequest = lifecycle.toggle('rival-a');
  lifecycle.clear();
  request.reject(new Error('old account network failure'));

  assert.deepEqual(await oldAccountRequest, { success: false, stale: true });
  assert.deepEqual(notifications, []);
});

test('a current successful toggle updates Rivals and shows its confirmation', async () => {
  const { lifecycle, store, notifications } = createHarness(async () => ({
    data: { success: true, action: 'followed' },
    error: null
  }));

  assert.deepEqual(await lifecycle.toggle('rival-a'), { success: true, action: 'followed' });
  assert.deepEqual(store.value, ['rival-a']);
  assert.deepEqual(notifications, [{ message: 'Added to Rivals!', type: 'success' }]);
});

test('a rejected current RPC reports failure without changing followed state', async () => {
  const { lifecycle, store, notifications } = createHarness(async () => {
    throw new Error('network unavailable');
  });
  store.set(['existing-rival']);

  assert.deepEqual(await lifecycle.toggle('new-rival'), { success: false });
  assert.deepEqual(store.value, ['existing-rival']);
  assert.deepEqual(notifications, [{ message: 'Error updating rivals.', type: 'error' }]);
});

test('ProfileShell releases its loading lock when follow fails unexpectedly', async () => {
  const state = {
    previewMode: false,
    targetProfile: { id: 'rival-a' },
    followLoading: false,
    toggleFollow: async () => { throw new Error('unexpected follow failure'); }
  };
  vm.createContext(state);
  vm.runInContext(profileFollowHandler, state);

  await assert.rejects(vm.runInContext('handleFollow()', state), /unexpected follow failure/);
  assert.equal(state.followLoading, false);
});

test('Leaderboard releases its removal lock when follow fails unexpectedly', async () => {
  const state = {
    removingId: '',
    items: [{ userId: 'rival-a' }],
    toggleFollow: async () => { throw new Error('unexpected follow failure'); }
  };
  vm.createContext(state);
  vm.runInContext(leaderboardFollowHandler, state);

  await assert.rejects(vm.runInContext("removeRival({ detail: { item: { userId: 'rival-a' } } })", state), /unexpected follow failure/);
  assert.equal(state.removingId, '');
  assert.deepEqual(state.items, [{ userId: 'rival-a' }]);
});

test('socialState wires account clearing and follow calls through the tested lifecycle', () => {
  assert.match(socialStateSource, /createSocialFollowLifecycle/);
  assert.match(socialStateSource, /function clearSocialState\(\)\s*\{\s*socialFollowLifecycle\.clear\(\);/);
  assert.match(socialStateSource, /function toggleFollow\(targetId\)\s*\{\s*return socialFollowLifecycle\.toggle\(targetId\);/);
});
