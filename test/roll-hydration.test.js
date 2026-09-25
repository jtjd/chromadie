import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  loadAuthenticatedRollSnapshot,
  loadGuestRollSnapshot
} from '../src/lib/rollHydration.js';
import {
  clearGuestRoll,
  getSavedGuestRoll,
  saveGuestRoll
} from '../src/lib/rollStorage.js';
import { GUEST_ROLL_STORAGE_KEY, REROLL_LOCK_PREFIX } from '../src/lib/rollStorage.js';

function createStorage(initial = []) {
  const values = new Map(initial);
  return {
    values,
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

const guestRoll = Object.freeze({
  date: '2026-09-22',
  hex: '#123456',
  score: 42,
  rarity: 'Common',
  badges: [],
  traits: [],
  contributors: [],
  identity: 'A blue signal'
});

test('guest-roll storage owns one key and safely serializes, reads, and clears it', () => {
  const storage = createStorage();
  saveGuestRoll(guestRoll, storage);
  assert.equal(storage.getItem(GUEST_ROLL_STORAGE_KEY), JSON.stringify(guestRoll));
  assert.deepEqual(JSON.parse(getSavedGuestRoll(storage)), guestRoll);
  clearGuestRoll(storage);
  assert.equal(getSavedGuestRoll(storage), null);

  const unavailable = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); }
  };
  assert.equal(getSavedGuestRoll(unavailable), null);
  assert.doesNotThrow(() => saveGuestRoll(guestRoll, unavailable));
  assert.doesNotThrow(() => clearGuestRoll(unavailable));
});

test('account cleanup clears the guest-roll key and all reroll-lock records', async () => {
  const stores = await readFile(new URL('../src/lib/stores.js', import.meta.url), 'utf8');
  assert.match(stores, /const keysToRemove = \['chromadie-roll'\]/);
  assert.match(stores, /key\.startsWith\('chromadie-reroll-lock:'\)/);
  assert.equal(GUEST_ROLL_STORAGE_KEY, 'chromadie-roll');
  assert.equal(REROLL_LOCK_PREFIX, 'chromadie-reroll-lock:');
});

test('authenticated hydration reads the server roll then optional percentile data', async () => {
  const roll = { score: 61196, hex_code: '#ABCDEF', rarity: 'Rare', badges: ['prime_sum'] };
  const calls = [];
  const supabase = {
    async rpc(name) {
      calls.push(name);
      return { data: roll, error: null };
    }
  };
  const snapshot = await loadAuthenticatedRollSnapshot(supabase, {
    requestPercentile: async (client, score) => {
      assert.equal(client, supabase);
      assert.equal(score, roll.score);
      return { percentile: 99, total_rollers: 100 };
    }
  });

  assert.deepEqual(calls, ['get_my_daily_roll']);
  assert.deepEqual(snapshot, {
    isCurrent: true,
    roll,
    error: null,
    percentileData: { percentile: 99, total_rollers: 100 }
  });
});

test('an account switch after the daily read skips optional ranking work', async () => {
  let percentileCalls = 0;
  const snapshot = await loadAuthenticatedRollSnapshot({
    async rpc() {
      return { data: { score: 42 }, error: null };
    }
  }, {
    isCurrent: () => false,
    requestPercentile: async () => {
      percentileCalls += 1;
      return null;
    }
  });

  assert.deepEqual(snapshot, { isCurrent: false });
  assert.equal(percentileCalls, 0);
});

test('valid guest hydration survives an optional percentile failure', async () => {
  const storage = createStorage([[GUEST_ROLL_STORAGE_KEY, JSON.stringify(guestRoll)]]);
  const savedBefore = storage.getItem(GUEST_ROLL_STORAGE_KEY);
  const snapshot = await loadGuestRollSnapshot({
    supabaseClient: {},
    storage,
    today: guestRoll.date,
    requestPercentile: async () => { throw new Error('percentile offline'); }
  });

  assert.equal(snapshot.isCurrent, true);
  assert.deepEqual(snapshot.roll, guestRoll);
  assert.equal(snapshot.percentileData, null);
  assert.equal(storage.getItem(GUEST_ROLL_STORAGE_KEY), savedBefore);
});

test('stale and invalid guest snapshots are cleared without ranking reads', async () => {
  const invalidValues = [
    '{broken json',
    JSON.stringify({ ...guestRoll, date: '2026-09-21' }),
    JSON.stringify({ ...guestRoll, hex: 'nope' }),
    JSON.stringify({ ...guestRoll, score: 100000001 }),
    JSON.stringify({ ...guestRoll, rarity: 'Unknown' })
  ];

  for (const saved of invalidValues) {
    const storage = createStorage([[GUEST_ROLL_STORAGE_KEY, saved]]);
    let percentileCalls = 0;
    const snapshot = await loadGuestRollSnapshot({
      supabaseClient: {},
      storage,
      today: guestRoll.date,
      requestPercentile: async () => {
        percentileCalls += 1;
        return null;
      }
    });

    assert.deepEqual(snapshot, { isCurrent: true, roll: null, percentileData: null });
    assert.equal(storage.getItem(GUEST_ROLL_STORAGE_KEY), null);
    assert.equal(percentileCalls, 0);
  }

  const storage = createStorage([[GUEST_ROLL_STORAGE_KEY, JSON.stringify(guestRoll)]]);
  const stale = await loadGuestRollSnapshot({
    supabaseClient: {},
    storage,
    today: guestRoll.date,
    isCurrent: () => false
  });
  assert.deepEqual(stale, { isCurrent: false });
  assert.equal(storage.getItem(GUEST_ROLL_STORAGE_KEY), JSON.stringify(guestRoll));
});
