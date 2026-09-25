import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

import { loadProfileContext } from '../src/lib/profileData.js';

const source = await readFile(new URL('../src/lib/Profile.svelte', import.meta.url), 'utf8');
const loadStart = source.indexOf('  async function loadProfileData() {');
const loadEnd = source.indexOf('\n\n  $: rank', loadStart);
const loadSource = source.slice(loadStart, loadEnd);

const expectedError = 'The profile could not be loaded. Please check your connection and retry.';

function createRejectedClient() {
  return {
    rpc() {
      return Promise.reject(new Error('private transport diagnostic'));
    }
  };
}

test('profile context converts a rejected transport into a generic retryable error', async () => {
  const context = await loadProfileContext({
    supabaseClient: createRejectedClient(),
    profileUsername: 'visitor',
    currentUsername: ''
  });

  assert.equal(context.loadError, expectedError);
  assert.equal(context.targetProfile, null);
  assert.doesNotMatch(context.loadError, /private transport diagnostic/);
});

test('legacy Profile releases loading and exposes retry after a rejected profile read', async () => {
  assert.notEqual(loadStart, -1);
  const state = {
    loadRequestId: 0,
    loading: false,
    loadError: '',
    dataWarning: '',
    targetProfile: null,
    targetScores: [],
    allAchievements: [],
    unlockedAchievements: {},
    totalRolls: 0,
    loadProfileContext,
    supabase: createRejectedClient(),
    $profile: null,
    $authUser: null,
    $isAuthenticated: false,
    $session: null,
    profileUsername: 'visitor',
    userId: null
  };
  vm.createContext(state);
  vm.runInContext(loadSource, state);

  await vm.runInContext('loadProfileData()', state);

  assert.equal(state.loading, false);
  assert.equal(state.loadError, expectedError);
  assert.equal(state.targetProfile, null);
});
