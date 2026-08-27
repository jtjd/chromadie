import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getRevealHex,
  getRevealHexCharacters,
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

test('the homepage reveal can unlock the HEX string one character at a time', () => {
  assert.equal(getRevealHexCharacters('#abcdef', 0), '#??????');
  assert.equal(getRevealHexCharacters('#abcdef', 1), '#A?????');
  assert.equal(getRevealHexCharacters('#abcdef', 3), '#ABC???');
  assert.equal(getRevealHexCharacters('#abcdef', 6), '#ABCDEF');
  assert.equal(getRevealHexCharacters('not-a-color', 6), '#??????');
});

test('the shared reveal timeline exposes four meaningful stages', () => {
  assert.deepEqual(ROLL_REVEAL_STEPS.map(step => step.progress), [18, 72, 94, 100]);
  assert.equal(ROLL_REVEAL_STEPS.length, 4);
  assert.equal(ROLL_REVEAL_SIGNAL_COLORS.length, 8);
  assert.ok(ROLL_REVEAL_SIGNAL_COLORS.every(color => /^#[0-9A-F]{6}$/i.test(color)));
});

test('ordinary rolls leave room for a readable staged reveal', () => {
  const timeline = getRollRevealTimeline({ rarity: 'Common', score: 30000, conditionCount: 10 });

  assert.deepEqual(timeline, {
    color: 900,
    channel: 340,
    conditionIntro: 650,
    conditionBeat: 520,
    conditionSettle: 650,
    score: 1700,
    settle: 700,
    conditionRevealCount: 10,
    total: 11840
  });
  assert.ok(timeline.total >= 10000);
});

test('stronger outcomes earn longer score assessment', () => {
  const epic = getRollRevealTimeline({ rarity: 'Epic', score: 100000, conditionCount: 10 });
  const mythic = getRollRevealTimeline({ rarity: 'Anomaly', score: 10000000, conditionCount: 17 });

  assert.equal(epic.score, 1980);
  assert.equal(epic.total, 12120);
  assert.equal(mythic.conditionRevealCount, 17);
  assert.equal(mythic.total, 16380);
  assert.ok(mythic.total > epic.total);
  assert.ok(epic.score > getRollRevealTimeline({ rarity: 'Common' }).score);
  assert.ok(mythic.score > epic.score);
});

test('condition discovery only reveals scored server contributors', () => {
  const items = getRollRevealItems({
    contributors: [{ id: 'pair', name: 'Pair', awardedPoints: 1200, category: 'symmetry', conditionRarity: 'Uncommon' }],
    traits: [{ id: 'warm', label: 'Warm signal' }]
  }, 6);

  assert.equal(items.length, 1);
  assert.deepEqual(items.map(item => item.label), ['Pair']);
  assert.equal(items[0].points, 1200);
  assert.equal(items[0].category, 'symmetry');
  assert.equal(items[0].conditionRarity, 'Uncommon');
  assert.equal(items[0].kind, 'condition');
  assert.deepEqual(getRollRevealItems({ traits: [{ id: 'warm', label: 'Warm signal' }] }), []);
});

test('condition discovery climbs from common scores to the rarest final beat', () => {
  const items = getRollRevealItems({
    contributors: [
      { id: 'legend', name: 'Legend', awardedPoints: 5_000_000, conditionRarity: 'Legendary' },
      { id: 'common-high', name: 'Common High', awardedPoints: 4_000, conditionRarity: 'Common' },
      { id: 'rare', name: 'Rare', awardedPoints: 50_000, conditionRarity: 'Rare' },
      { id: 'common-low', name: 'Common Low', awardedPoints: 500, conditionRarity: 'Common' }
    ]
  });

  assert.deepEqual(items.map(item => item.id), [
    'condition-common-low',
    'condition-common-high',
    'condition-rare',
    'condition-legend'
  ]);
  assert.equal(items.at(-1).conditionRarity, 'Legendary');

  const limited = getRollRevealItems({ contributors: [
    { id: 'common', name: 'Common', awardedPoints: 500, conditionRarity: 'Common' },
    { id: 'epic', name: 'Epic', awardedPoints: 500_000, conditionRarity: 'Epic' },
    { id: 'anomaly', name: 'Anomaly', awardedPoints: 100_000_000, conditionRarity: 'Anomaly' }
  ] }, 2);
  assert.deepEqual(limited.map(item => item.id), ['condition-epic', 'condition-anomaly']);
});

test('reduced motion and explicit skipping preserve an immediate canonical path', () => {
  const reducedMotion = getRollRevealTimeline({ reducedMotion: true });
  const skipped = getRollRevealTimeline({ rarity: 'Anomaly', score: 10000000, skipped: true });

  assert.equal(reducedMotion.total, 0);
  assert.equal(reducedMotion.conditionRevealCount, 0);
  assert.equal(skipped.total, 0);
  assert.equal(skipped.conditionRevealCount, 0);
});
