import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getProfileRollRevealTiming,
  getRevealHex,
  getRollRevealTiming,
  PROFILE_ROLL_REVEAL_PACE,
  ROLL_REVEAL_STEPS
} from '../src/lib/rollReveal.js';

test('the roll reveal locks canonical hex channels in truthful beats', () => {
  assert.equal(getRevealHex('#abcdef', 0), '#------');
  assert.equal(getRevealHex('#abcdef', 1), '#AB----');
  assert.equal(getRevealHex('#abcdef', 2), '#ABCD--');
  assert.equal(getRevealHex('#abcdef', 3), '#ABCDEF');
  assert.equal(getRevealHex('not-a-color', 3), '#------');
});

test('the reveal has bounded dedicated and embedded timing', () => {
  assert.deepEqual(ROLL_REVEAL_STEPS.map(step => step.progress), [12, 38, 64, 88, 100]);
  assert.deepEqual(getRollRevealTiming({ dedicated: true }), {
    warmup: 240,
    channel: 220,
    condition: 180,
    settle: 140
  });
  assert.deepEqual(getRollRevealTiming({ dedicated: false }), {
    warmup: 360,
    channel: 300,
    condition: 240,
    settle: 180
  });
  assert.deepEqual(getRollRevealTiming({ reducedMotion: true }), {
    warmup: 0,
    channel: 0,
    condition: 0,
    settle: 0
  });
});

test('the integrated profile reveal stays meaningful without a long forced wait', () => {
  assert.equal(PROFILE_ROLL_REVEAL_PACE, 1);
  assert.deepEqual(getProfileRollRevealTiming(), {
    spectrum: 1505,
    lock: 480,
    score: 540,
    total: 2525
  });
  assert.deepEqual(getProfileRollRevealTiming({ reducedMotion: true }), {
    spectrum: 0,
    lock: 0,
    score: 0,
    total: 0
  });
  assert.deepEqual(getProfileRollRevealTiming({ skipped: true }), {
    spectrum: 0,
    lock: 0,
    score: 0,
    total: 0
  });
});
