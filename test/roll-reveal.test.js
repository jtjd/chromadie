import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getRevealHex,
  getRollRevealItems,
  getRollRevealTimeline,
  ROLL_REVEAL_SIGNAL_COLORS,
  ROLL_REVEAL_STEPS
} from '../src/lib/rollReveal.js';

test('the roll reveal locks canonical hex channels in truthful beats', () => {
  assert.equal(getRevealHex('#abcdef', 0), '#------');
  assert.equal(getRevealHex('#abcdef', 1), '#AB----');
  assert.equal(getRevealHex('#abcdef', 2), '#ABCD--');
  assert.equal(getRevealHex('#abcdef', 3), '#ABCDEF');
  assert.equal(getRevealHex('not-a-color', 3), '#------');
});

test('the shared reveal timeline exposes six meaningful stages', () => {
  assert.deepEqual(ROLL_REVEAL_STEPS.map(step => step.progress), [8, 28, 54, 72, 94, 100]);
  assert.equal(ROLL_REVEAL_STEPS.length, 6);
  assert.equal(ROLL_REVEAL_SIGNAL_COLORS.length, 8);
  assert.ok(ROLL_REVEAL_SIGNAL_COLORS.every(color => /^#[0-9A-F]{6}$/i.test(color)));
});

test('ordinary rolls spend about sixteen seconds across distinct discovery beats', () => {
  const timeline = getRollRevealTimeline({ rarity: 'Common', score: 30000, conditionCount: 10 });

  assert.deepEqual(timeline, {
    signal: 2400,
    channel: 900,
    conditionIntro: 600,
    conditionBeat: 600,
    conditionSettle: 600,
    rarity: 2000,
    score: 3000,
    settle: 700,
    conditionRevealCount: 6,
    total: 15600
  });
});

test('stronger outcomes earn longer rarity and score assessment', () => {
  const epic = getRollRevealTimeline({ rarity: 'Epic', score: 100000, conditionCount: 10 });
  const mythic = getRollRevealTimeline({ rarity: 'Mythic', score: 10000000, conditionCount: 17 });

  assert.equal(epic.total, 18000);
  assert.equal(mythic.conditionRevealCount, 8);
  assert.equal(mythic.total, 23000);
  assert.ok(mythic.total > epic.total);
  assert.ok(epic.rarity > getRollRevealTimeline({ rarity: 'Common' }).rarity);
  assert.ok(mythic.score > epic.score);
});

test('condition discovery is data-backed and fills remaining beats with named scans', () => {
  const items = getRollRevealItems({
    contributors: [{ id: 'pair', name: 'Pair', awardedPoints: 1200 }],
    traits: [{ id: 'warm', label: 'Warm signal' }]
  }, 6);

  assert.equal(items.length, 6);
  assert.deepEqual(items.slice(0, 2).map(item => item.label), ['Pair', 'Warm signal']);
  assert.equal(items[0].points, 1200);
  assert.equal(items[0].kind, 'condition');
  assert.equal(items[1].kind, 'trait');
  assert.equal(items[2].kind, 'scan');
  assert.equal(items[2].label, 'Hue relationship');
});

test('reduced motion and explicit skipping preserve an immediate canonical path', () => {
  const reducedMotion = getRollRevealTimeline({ reducedMotion: true });
  const skipped = getRollRevealTimeline({ rarity: 'Mythic', score: 10000000, skipped: true });

  assert.equal(reducedMotion.total, 0);
  assert.equal(reducedMotion.conditionRevealCount, 0);
  assert.equal(skipped.total, 0);
  assert.equal(skipped.conditionRevealCount, 0);
});
