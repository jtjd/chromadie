import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { getPercentileTier } from '../src/lib/rollPresentation.js';
import {
  clearRerollLock,
  getRerollLockKey,
  hasActiveRerollLock,
  requestRoll,
  setRerollLock
} from '../src/lib/rollService.js';

function createStorage() {
  const values = new Map();
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

test('profile roll request calls the secure RPC and exposes only canonical server presentation', async () => {
  const calls = [];
  const serverResult = {
    success: true,
    hex: '#ABCDEF',
    score: 61196,
    rarity: 'Rare',
    badges: ['prime_sum'],
    traits: [{ id: 'cool', label: 'Cool' }],
    contributors: [{ id: 'prime_sum', awardedPoints: 1234 }],
    identity: 'A clear blue signal',
    new_achievements: [{ id: 'first_roll', name: 'First Steps', ep_reward: 1000 }],
    client_score: 999999,
    client_reward: 999999
  };
  const supabase = {
    async rpc(name, args) {
      calls.push({ name, args });
      return { data: serverResult, error: null };
    }
  };

  const response = await requestRoll(supabase, true);
  assert.deepEqual(calls, [{ name: 'roll_die', args: { p_is_reroll: true } }]);
  assert.equal(response.success, true);
  assert.equal(response.canonical.hex, '#ABCDEF');
  assert.equal(response.canonical.score, 61196);
  assert.equal(response.canonical.rarity, 'Rare');
  assert.deepEqual(response.canonical.badges, ['prime_sum']);
  assert.equal(response.canonical.client_score, undefined);
  assert.equal(response.canonical.client_reward, undefined);
  assert.equal(response.data.client_reward, 999999);
});

test('profile roll request preserves server failures without inventing a result', async () => {
  const rpcError = new Error('RPC unavailable');
  const failed = await requestRoll({
    async rpc() {
      return { data: { success: false, error: 'No roll available.' }, error: null };
    }
  });
  assert.equal(failed.success, false);
  assert.equal(failed.data, null);
  assert.equal(failed.canonical, null);
  assert.equal(failed.error.message, 'No roll available.');

  const thrown = await requestRoll({
    async rpc() {
      throw rpcError;
    }
  });
  assert.equal(thrown.success, false);
  assert.equal(thrown.error, rpcError);
});

test('reroll lock is a short duplicate-click guard and expires deterministically', () => {
  const storage = createStorage();
  const key = getRerollLockKey();
  setRerollLock(storage, 1000);
  assert.equal(storage.getItem(key), '11000');
  assert.equal(hasActiveRerollLock(storage, 5000), true);
  assert.equal(hasActiveRerollLock(storage, 11000), false);
  assert.equal(storage.getItem(key), null);
  clearRerollLock(storage);
});

test('percentile presentation retains the existing rank tiers', () => {
  assert.deepEqual(getPercentileTier(100, 1), {
    text: '🏆 First roll of the day!',
    color: '#f1c40f',
    total: 1
  });
  assert.equal(getPercentileTier(99, 100).text, '🔥 Top 1% today');
  assert.equal(getPercentileTier(90, 100).text, '🚀 Top 10% today');
  assert.equal(getPercentileTier(50, 100).text, '📊 Above average today');
  assert.equal(getPercentileTier(0, 100).text, '💀 Bottom 5% today');
});

test('owner profile roll integration stays server-authoritative and visitor-safe', async () => {
  const profileRoll = await readFile(new URL('../src/lib/ProfileRoll.svelte', import.meta.url), 'utf8');
  const profileShell = await readFile(new URL('../src/lib/ProfileShell.svelte', import.meta.url), 'utf8');
  const game = await readFile(new URL('../src/lib/Game.svelte', import.meta.url), 'utf8');

  assert.match(game, /requestRoll/);
  assert.match(game, /normalizeCanonicalRoll/);
  assert.doesNotMatch(profileRoll, /calculate_roll_v2|Math\.random\(\)|purchase\s*\(/);
  assert.match(profileRoll, /get_my_daily_roll/);
  assert.match(profileRoll, /get_score_percentile/);
  assert.match(profileRoll, /refreshProfileState/);
  assert.match(profileRoll, /fetchInventoryState/);
  assert.match(profileRoll, /fetchWalletBalance/);
  assert.match(profileRoll, /rollcomplete/);
  assert.match(profileRoll, /prefers-reduced-motion/);
  assert.match(profileShell, /ProfileRoll/);
  assert.doesNotMatch(profileRoll, /localStorage/);
});
