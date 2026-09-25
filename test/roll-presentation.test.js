import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAuthoritativeBadgeIds,
  getDisplayedBaseRollScore,
  sortRollBadgesDescending
} from '../src/lib/rollPresentation.js';

test('restored rolls retain authoritative condition, event, and achievement badges', () => {
  assert.deepEqual(getAuthoritativeBadgeIds({
    badges: ['prime_sum', 'beat_your_best', 'ach_first_roll', 'prime_sum'],
    contributors: [{ id: 'fallback_should_not_replace_server_badges' }]
  }), ['prime_sum', 'beat_your_best', 'ach_first_roll']);
});

test('legacy presentation falls back to validated contributor ids', () => {
  assert.deepEqual(getAuthoritativeBadgeIds({
    contributors: [{ id: 'balanced_tone' }, { id: 'bad id!' }, null]
  }), ['balanced_tone']);
});

test('displayed base score subtracts canonical contributor points and clamps at zero', () => {
  assert.equal(getDisplayedBaseRollScore(1000, 42, [
    { awardedPoints: 120 },
    { points: 50 }
  ]), 830);
  assert.equal(getDisplayedBaseRollScore(0, 100, [
    { awardedPoints: 0, points: 120 }
  ]), 0);
  assert.equal(getDisplayedBaseRollScore(100, 0, [{ points: 125 }]), 0);
});

test('roll badge presentation sorts by canonical points without changing its input', () => {
  const badgeIds = ['channel_span', 'jackpot', 'condition_cascade', 'vivid_contrast', 'condition_supernova'];
  const original = badgeIds.slice();

  assert.deepEqual(sortRollBadgesDescending(badgeIds), [
    'condition_supernova',
    'condition_cascade',
    'vivid_contrast',
    'channel_span',
    'jackpot'
  ]);
  assert.deepEqual(badgeIds, original);
  assert.deepEqual(sortRollBadgesDescending(null), []);
});
