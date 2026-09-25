import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { createProfileRivalLifecycle } from '../src/lib/profileRivalLifecycle.js';

const source = await readFile(new URL('../src/lib/Profile.svelte', import.meta.url), 'utf8');

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

function createSupabaseClient(resolveQuery) {
  const calls = [];
  const query = {
    select(value) { calls.push(['select', value]); return this; },
    eq(field, value) { calls.push(['eq', field, value]); return this; },
    in(field, value) { calls.push(['in', field, value]); return this; },
    order(field, options) { calls.push(['order', field, options]); return this; },
    then(resolve, reject) { return resolveQuery().then(resolve, reject); }
  };
  return {
    calls,
    client: {
      from(table) { calls.push(['from', table]); return query; }
    }
  };
}

test('the legacy Profile wires Rivals freshness to profile scope and component teardown', () => {
  assert.match(source, /createProfileRivalLifecycle/);
  assert.match(source, /profileRivalLifecycle\.sync\(/);
  assert.match(source, /profileRivalLifecycle\.invalidate\(\)/);
  assert.match(source, /onDestroy\(\(\) => \{[\s\S]*?invalidateProfileContextLoad\(\)[\s\S]*?profileRivalLifecycle\.dispose\(\);[\s\S]*?\}\)/);
});

test('non-owners and empty follow lists clear Rivals without querying and invalidate pending reads', async () => {
  const pending = deferred();
  const rows = [];
  const { client, calls } = createSupabaseClient(() => pending.promise);
  const lifecycle = createProfileRivalLifecycle({
    supabaseClient: client,
    getTodayString: () => '2026-09-23',
    onRows: value => rows.splice(0, rows.length, ...value),
    onError: () => {}
  });

  const oldRead = lifecycle.sync({ profileKey: 'self:owner', isOwner: true, followedIds: ['followed-a'] });
  assert.deepEqual(rows, []);

  assert.deepEqual(await lifecycle.sync({ profileKey: 'self:owner', isOwner: true, followedIds: [] }), { status: 'cleared' });
  pending.resolve({ data: [{ user_id: 'followed-a' }], error: null });
  assert.deepEqual(await oldRead, { status: 'stale' });
  assert.deepEqual(rows, []);

  assert.deepEqual(await lifecycle.sync({ profileKey: 'self:owner', isOwner: false, followedIds: ['followed-b'] }), { status: 'cleared' });
  assert.equal(calls.filter(([name]) => name === 'from').length, 1);
});

test('an older followed-user result cannot replace the newest Rivals rows', async () => {
  const pending = [];
  const rows = [];
  const { client } = createSupabaseClient(() => {
    const request = deferred();
    pending.push(request);
    return request.promise;
  });
  const lifecycle = createProfileRivalLifecycle({
    supabaseClient: client,
    getTodayString: () => '2026-09-23',
    onRows: value => rows.splice(0, rows.length, ...value),
    onError: () => {}
  });

  const oldRead = lifecycle.sync({ profileKey: 'self:owner', isOwner: true, followedIds: ['followed-a'] });
  const currentRead = lifecycle.sync({ profileKey: 'self:owner', isOwner: true, followedIds: ['followed-b'] });
  await flushMicrotasks();
  pending[1].resolve({ data: [{ user_id: 'followed-b' }], error: null });
  assert.deepEqual(await currentRead, { status: 'loaded', rows: [{ user_id: 'followed-b' }] });
  pending[0].resolve({ data: [{ user_id: 'followed-a' }], error: null });

  assert.deepEqual(await oldRead, { status: 'stale' });
  assert.deepEqual(rows, [{ user_id: 'followed-b' }]);
});

test('a profile-scope change invalidates an otherwise identical follow-list query', async () => {
  const pending = [];
  const rows = [];
  const { client } = createSupabaseClient(() => {
    const request = deferred();
    pending.push(request);
    return request.promise;
  });
  const lifecycle = createProfileRivalLifecycle({
    supabaseClient: client,
    getTodayString: () => '2026-09-23',
    onRows: value => rows.splice(0, rows.length, ...value),
    onError: () => {}
  });

  const oldRead = lifecycle.sync({ profileKey: 'self:old-owner', isOwner: true, followedIds: ['followed-a'] });
  const currentRead = lifecycle.sync({ profileKey: 'self:new-owner', isOwner: true, followedIds: ['followed-a'] });
  await flushMicrotasks();
  pending[1].resolve({ data: [{ user_id: 'current' }], error: null });
  await currentRead;
  pending[0].resolve({ data: [{ user_id: 'stale' }], error: null });

  assert.deepEqual(await oldRead, { status: 'stale' });
  assert.deepEqual(rows, [{ user_id: 'current' }]);
});

test('same profile and follow signatures do not issue duplicate reads', async () => {
  const { client, calls } = createSupabaseClient(async () => ({ data: [{ user_id: 'followed-a' }], error: null }));
  const lifecycle = createProfileRivalLifecycle({
    supabaseClient: client,
    getTodayString: () => '2026-09-23',
    onRows: () => {},
    onError: () => {}
  });
  const input = { profileKey: 'self:owner', isOwner: true, followedIds: ['followed-a'] };

  await lifecycle.sync(input);
  assert.deepEqual(await lifecycle.sync(input), { status: 'unchanged' });
  assert.equal(calls.filter(([name]) => name === 'from').length, 1);
});

test('the query preserves the public leaderboard projection, today filter, ID filter, and stable ordering', async () => {
  const { client, calls } = createSupabaseClient(async () => ({ data: [{ user_id: 'followed-a' }], error: null }));
  const lifecycle = createProfileRivalLifecycle({
    supabaseClient: client,
    getTodayString: () => '2026-09-23',
    onRows: () => {},
    onError: () => {}
  });

  await lifecycle.sync({ profileKey: 'self:owner', isOwner: true, followedIds: ['followed-a', 'followed-b'] });

  assert.deepEqual(calls, [
    ['from', 'leaderboard_view'],
    ['select', 'user_id, hex_code, score, rarity, username, current_streak, equipped_cosmetics, equipped_badges, is_staff, rank'],
    ['eq', 'roll_date', '2026-09-23'],
    ['in', 'user_id', ['followed-a', 'followed-b']],
    ['order', 'score', { ascending: false }],
    ['order', 'user_id', { ascending: true }]
  ]);
});

test('query errors keep the existing log message and missing data clears to an empty list', async () => {
  const error = new Error('offline');
  const logged = [];
  const rows = [];
  const { client } = createSupabaseClient(async () => ({ data: null, error }));
  const lifecycle = createProfileRivalLifecycle({
    supabaseClient: client,
    getTodayString: () => '2026-09-23',
    onRows: value => rows.splice(0, rows.length, ...value),
    onError: (...args) => logged.push(args)
  });

  assert.deepEqual(await lifecycle.sync({ profileKey: 'self:owner', isOwner: true, followedIds: ['followed-a'] }), { status: 'loaded', rows: [] });
  assert.deepEqual(logged, [['Error fetching rivals:', error]]);
  assert.deepEqual(rows, []);
});

test('disposing the legacy profile rejects an in-flight Rivals result', async () => {
  const pending = deferred();
  const rows = [];
  const { client } = createSupabaseClient(() => pending.promise);
  const lifecycle = createProfileRivalLifecycle({
    supabaseClient: client,
    getTodayString: () => '2026-09-23',
    onRows: value => rows.splice(0, rows.length, ...value),
    onError: () => {}
  });

  const request = lifecycle.sync({ profileKey: 'self:owner', isOwner: true, followedIds: ['followed-a'] });
  lifecycle.dispose();
  pending.resolve({ data: [{ user_id: 'followed-a' }], error: null });

  assert.deepEqual(await request, { status: 'stale' });
  assert.deepEqual(rows, []);
});
