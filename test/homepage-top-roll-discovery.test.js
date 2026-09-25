import test from 'node:test';
import assert from 'node:assert/strict';
import { loadHomepageTopRolls } from '../src/lib/homepage/topRollDiscovery.js';

const roll = (username, rank) => ({
  username,
  displayName: username,
  hexCode: '#58A6FF',
  score: 1000 - rank,
  rank,
  rarity: 'Common',
  identity: 'Bright blue'
});

test('homepage top-roll feed reads the spotlight and returns canonical profile paths', async () => {
  let request;
  const state = await loadHomepageTopRolls(async (...args) => {
    request = args;
    return { data: { items: [roll('TopPlayer', 1)] }, error: null };
  });

  assert.deepEqual(request, ['get_public_discovery_spotlight', { p_limit: 5 }]);
  assert.equal(state.loading, false);
  assert.equal(state.error, '');
  assert.equal(state.rows[0].profilePath, '/topplayer');
  assert.equal(state.rows[0].displayRank, 1);
});

test('homepage top-roll feed is bounded and omits invalid profile names', async () => {
  const state = await loadHomepageTopRolls(async () => ({
    data: { items: [...Array.from({ length: 7 }, (_, index) => roll(`Player${index + 1}`, index + 1)), roll('invalid/name', 8)] },
    error: null
  }));

  assert.equal(state.rows.length, 5);
  assert.equal(state.rows[0].username, 'Player1');
  assert.equal(state.rows[4].username, 'Player5');
  assert.equal(state.rows.every(row => row.profilePath.startsWith('/')), true);
});

test('homepage top-roll feed returns a clean empty state when no player is public today', async () => {
  const state = await loadHomepageTopRolls(async () => ({ data: { items: [] }, error: null }));

  assert.deepEqual(state, { rows: [], loading: false, error: '' });
});

test('homepage top-roll feed reports RPC and transport failures', async () => {
  const rpcError = await loadHomepageTopRolls(async () => ({ data: null, error: new Error('offline') }));
  const thrownError = await loadHomepageTopRolls(async () => { throw new Error('offline'); });

  for (const state of [rpcError, thrownError]) {
    assert.deepEqual(state.rows, []);
    assert.equal(state.loading, false);
    assert.equal(state.error, 'Public profiles could not be loaded right now.');
  }
});
