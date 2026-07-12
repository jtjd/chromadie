import test from 'node:test';
import assert from 'node:assert/strict';
import { getAuthoritativeBadgeIds } from '../src/lib/rollPresentation.js';

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
