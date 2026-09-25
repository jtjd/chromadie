import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/lib/Profile.svelte', import.meta.url), 'utf8');
const invalidateStart = source.indexOf('  function invalidateProfileContextLoad() {');
const invalidateEnd = source.indexOf('\n  }', invalidateStart) + 4;
const invalidateSource = invalidateStart >= 0 ? source.slice(invalidateStart, invalidateEnd) : '';
const resetStart = source.indexOf('  function resetProfileState() {');
const resetEnd = source.indexOf('\n\n  function handleReusableAccountDeleted', resetStart);
const resetSource = source.slice(resetStart, resetEnd);
const loadStart = source.indexOf('  async function loadProfileData() {');
const loadEnd = source.indexOf('\n\n  $: rank', loadStart);
const loadSource = source.slice(loadStart, loadEnd);

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('legacy Profile invalidates a pending context read when its state resets', async () => {
  assert.notEqual(invalidateStart, -1, 'Profile should own a context-read invalidation helper');
  assert.match(resetSource, /invalidateProfileContextLoad\(\)/);
  assert.match(source, /onDestroy\(\(\) => \{[\s\S]*?invalidateProfileContextLoad\(\)[\s\S]*?profileRivalLifecycle\.dispose\(\)/);

  const pendingContext = deferred();
  const state = {
    loadRequestId: 0,
    loading: false,
    loadError: '',
    dataWarning: '',
    targetProfile: { id: 'old-profile' },
    targetScores: [{ roll_date: '2026-09-22', score: 12 }],
    allAchievements: [{ id: 'old-achievement' }],
    unlockedAchievements: { old: true },
    totalRolls: 1,
    rivalsData: [{ user_id: 'old-rival' }],
    selectedBadges: ['old-badge'],
    editMode: true,
    moodColorInput: '#112233',
    profileRivalLifecycle: { invalidate() {} },
    loadProfileContext: () => pendingContext.promise,
    supabase: {},
    $profile: { username: 'current-user' },
    $authUser: null,
    $isAuthenticated: true,
    $session: { user: { id: 'owner-id' } },
    profileUsername: null,
    userId: null
  };
  vm.createContext(state);
  vm.runInContext(`${invalidateSource}\n${resetSource}\n${loadSource}`, state);

  const pendingRead = vm.runInContext('loadProfileData()', state);
  assert.equal(state.loading, true);
  vm.runInContext('resetProfileState()', state);
  pendingContext.resolve({
    targetProfile: { id: 'stale-profile' },
    targetScores: [{ roll_date: '2026-09-23', score: 99 }],
    allAchievements: [],
    unlockedAchievements: {},
    totalRolls: 2,
    loadError: '',
    dataWarning: ''
  });
  await pendingRead;

  assert.equal(state.targetProfile, null);
  assert.deepEqual(Array.from(state.targetScores), []);
  assert.equal(state.loading, false);
  assert.equal(state.loadRequestId, 2);
});
