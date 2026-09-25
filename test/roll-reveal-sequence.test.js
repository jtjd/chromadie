import test from 'node:test';
import assert from 'node:assert/strict';

import { playRollRevealSequence } from '../src/lib/rollRevealSequence.js';

function createHarness(overrides = {}) {
  const state = {};
  const waits = [];
  const dispatched = [];
  const scrolls = [];
  const countUps = [];
  const options = {
    isCurrent: () => true,
    isSkipped: () => false,
    reducedMotion: false,
    applyState: patch => Object.assign(state, patch),
    dispatchRollState: () => dispatched.push({ ...state }),
    tick: async () => {},
    scrollRevealList: behavior => scrolls.push(behavior),
    animateScoreCountUp: async (score, isCurrent, duration, reducedMotion, onProgress) => {
      countUps.push({ score, duration, reducedMotion });
      onProgress?.(1);
      return true;
    },
    wait: async duration => waits.push(duration),
    ...overrides
  };

  return { state, waits, dispatched, scrolls, countUps, options };
}

const serverRoll = {
  hex: '#A1B2C3',
  score: 12345,
  rarity: 'Rare',
  badges: ['prime_sum'],
  traits: [{ id: 'cool', label: 'Cool signal' }],
  contributors: [
    { id: 'rare_condition', name: 'Rare condition', points: 500, conditionRarity: 'Rare' },
    { id: 'common_condition', name: 'Common condition', points: 100, conditionRarity: 'Common' }
  ],
  identity: 'A bright signal'
};

test('reduced motion applies the canonical result without reveal beats', async () => {
  const harness = createHarness({ reducedMotion: true });
  const result = await playRollRevealSequence(serverRoll, harness.options);

  assert.equal(result.hex, serverRoll.hex);
  assert.equal(harness.state.score, serverRoll.score);
  assert.equal(harness.state.displayScore, serverRoll.score);
  assert.equal(harness.state.displayColor, serverRoll.hex);
  assert.equal(harness.state.identity, serverRoll.identity);
  assert.equal(harness.state.revealDetail, '2 conditions · 12,345 score confirmed');
  assert.deepEqual(harness.waits, []);
  assert.deepEqual(harness.dispatched, []);
  assert.deepEqual(harness.countUps, []);
});

test('staged reveal updates the signal, reveals sorted conditions, then confirms score', async () => {
  const harness = createHarness();
  const result = await playRollRevealSequence(serverRoll, harness.options);

  assert.equal(result.score, serverRoll.score);
  assert.deepEqual(harness.state.revealConditions.map(item => item.label), [
    'Common condition',
    'Rare condition'
  ]);
  assert.equal(harness.state.revealItemTotal, 2);
  assert.equal(harness.state.displayHex, serverRoll.hex);
  assert.equal(harness.state.displayScore, serverRoll.score);
  assert.equal(harness.state.scanProgress, 100);
  assert.equal(harness.countUps.length, 1);
  assert.equal(harness.countUps[0].score, serverRoll.score);
  assert.equal(harness.countUps[0].reducedMotion, false);
  assert.equal(harness.dispatched.length, 8);
  assert.deepEqual(harness.scrolls, ['smooth', 'smooth']);
  assert.ok(harness.waits.length > 0);
});

test('skip completes the already-confirmed server result immediately', async () => {
  const harness = createHarness({ isSkipped: () => true });
  const result = await playRollRevealSequence(serverRoll, harness.options);

  assert.equal(result.score, serverRoll.score);
  assert.equal(harness.state.displayColor, serverRoll.hex);
  assert.equal(harness.state.displayScore, serverRoll.score);
  assert.equal(harness.state.revealStep, 3);
  assert.deepEqual(harness.waits, []);
  assert.deepEqual(harness.countUps, []);
});

test('stale requests stop before dispatching or animating a result', async () => {
  const harness = createHarness({ isCurrent: () => false });
  const result = await playRollRevealSequence(serverRoll, harness.options);

  assert.equal(result, null);
  assert.deepEqual(harness.state, {});
  assert.deepEqual(harness.dispatched, []);
  assert.deepEqual(harness.waits, []);
  assert.deepEqual(harness.countUps, []);
});

test('a request invalidated during a reveal does not progress into later stages', async () => {
  let current = true;
  const harness = createHarness({
    isCurrent: () => current,
    wait: async () => { current = false; }
  });
  const result = await playRollRevealSequence(serverRoll, harness.options);

  assert.equal(result, null);
  assert.equal(harness.dispatched.length, 1);
  assert.equal(harness.state.revealConditions.length, 0);
  assert.deepEqual(harness.countUps, []);
});
