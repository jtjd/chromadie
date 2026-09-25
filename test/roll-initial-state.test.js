import test from 'node:test';
import assert from 'node:assert/strict';
import { runInitialRollHydration } from '../src/lib/rollInitialState.js';

const snapshot = {
  isCurrent: true,
  roll: { score: 42, hex: '#123456', rarity: 'Common' },
  percentileData: null
};

test('initial hydration selects the authenticated snapshot and applies it before finishing', async () => {
  const events = [];
  const result = await runInitialRollHydration({
    userId: 'account-a',
    isRequestCurrent: () => true,
    isSnapshotCurrent: () => true,
    loadAuthenticated: async (userId, isCurrent) => {
      events.push(['authenticated', userId, isCurrent()]);
      return snapshot;
    },
    loadGuest: async () => assert.fail('authenticated accounts must not use guest hydration'),
    applySnapshot: (value, mode) => events.push(['apply', value, mode]),
    onFinally: () => events.push('finally')
  });

  assert.deepEqual(result, { status: 'loaded', snapshot });
  assert.deepEqual(events, [
    ['authenticated', 'account-a', true],
    ['apply', snapshot, 'authenticated'],
    'finally'
  ]);
});

test('initial hydration selects and applies guest state without an account ID', async () => {
  const events = [];
  const result = await runInitialRollHydration({
    userId: null,
    isRequestCurrent: () => true,
    isSnapshotCurrent: () => true,
    loadAuthenticated: async () => assert.fail('guest sessions must not use authenticated hydration'),
    loadGuest: async isCurrent => {
      events.push(['guest', isCurrent()]);
      return snapshot;
    },
    applySnapshot: (value, mode) => events.push(['apply', value, mode]),
    onFinally: () => events.push('finally')
  });

  assert.deepEqual(result, { status: 'loaded', snapshot });
  assert.deepEqual(events, [
    ['guest', true],
    ['apply', snapshot, 'guest'],
    'finally'
  ]);
});

test('a stale snapshot is ignored while its current request still finishes loading', async () => {
  const events = [];
  const result = await runInitialRollHydration({
    userId: 'account-a',
    isRequestCurrent: () => true,
    isSnapshotCurrent: () => false,
    loadAuthenticated: async (_userId, isCurrent) => {
      assert.equal(isCurrent(), false);
      return { isCurrent: false };
    },
    applySnapshot: () => events.push('apply'),
    onError: () => events.push('error'),
    onFinally: () => events.push('finally')
  });

  assert.deepEqual(result, { status: 'stale' });
  assert.deepEqual(events, ['finally']);
});

test('a snapshot without an explicit current marker fails closed', async () => {
  const events = [];
  const result = await runInitialRollHydration({
    userId: 'account-a',
    isRequestCurrent: () => true,
    isSnapshotCurrent: () => true,
    loadAuthenticated: async () => ({ roll: null }),
    applySnapshot: () => events.push('apply'),
    onFinally: () => events.push('finally')
  });

  assert.deepEqual(result, { status: 'stale' });
  assert.deepEqual(events, ['finally']);
});

test('a superseded request neither applies data nor releases the newer request loading state', async () => {
  let finishLoad;
  let current = true;
  const events = [];
  const pending = runInitialRollHydration({
    userId: 'account-a',
    isRequestCurrent: () => current,
    isSnapshotCurrent: () => current,
    loadAuthenticated: () => new Promise(resolve => { finishLoad = resolve; }),
    applySnapshot: () => events.push('apply'),
    onError: () => events.push('error'),
    onFinally: () => events.push('finally')
  });

  current = false;
  finishLoad(snapshot);
  assert.deepEqual(await pending, { status: 'stale' });
  assert.deepEqual(events, []);
});

test('a current snapshot failure reports an error and completes loading', async () => {
  const failure = new Error('Network unavailable.');
  const events = [];
  const result = await runInitialRollHydration({
    userId: 'account-a',
    isRequestCurrent: () => true,
    isSnapshotCurrent: () => true,
    loadAuthenticated: async () => { throw failure; },
    applySnapshot: () => events.push('apply'),
    onError: error => events.push(['error', error]),
    onFinally: () => events.push('finally')
  });

  assert.deepEqual(result, { status: 'failed', error: failure });
  assert.deepEqual(events, [['error', failure], 'finally']);
});

test('a stale thrown request cannot replace the error owned by a newer request', async () => {
  let current = false;
  const events = [];
  const failure = new Error('Old request failed.');
  const result = await runInitialRollHydration({
    userId: 'account-a',
    isRequestCurrent: () => current,
    isSnapshotCurrent: () => current,
    loadAuthenticated: async () => { throw failure; },
    onError: () => events.push('error'),
    onFinally: () => events.push('finally')
  });

  assert.deepEqual(result, { status: 'stale' });
  assert.deepEqual(events, []);
});
