import test from 'node:test';
import assert from 'node:assert/strict';

import { getRarity, RANKS, RARITY_THRESHOLDS } from '../src/lib/balanceConfig.js';
import { getRank, getRankState } from '../src/lib/ranks.js';
import { scoreColor } from '../src/lib/scoring.js';
import { ACHIEVEMENTS } from '../src/lib/badgeData.js';
import { simulateBalance } from '../scripts/simulate-balance.mjs';
import {
  CANDIDATE_RANKS,
  PRESTIGE_ITEM_KEYS,
  PRESTIGE_ITEM_PRICE,
  SHOP_PRICE_BANDS,
  STREAK_FREEZE_PRICE
} from '../src/lib/balanceCandidate.js';
import {
  CANDIDATE_ACHIEVEMENT_REWARDS,
  CANDIDATE_ACHIEVEMENT_TOTAL,
  RETIRED_ACHIEVEMENT_IDS
} from '../src/lib/achievementCandidate.js';

test('active launch rarity boundaries remain explicit', () => {
  const boundaries = [
    [0, 'Trash'],
    [24999, 'Trash'],
    [25000, 'Common'],
    [34499, 'Common'],
    [34500, 'Uncommon'],
    [49499, 'Uncommon'],
    [49500, 'Rare'],
    [84999, 'Rare'],
    [85000, 'Epic'],
    [199999, 'Epic'],
    [200000, 'Anomaly'],
    [1499999, 'Anomaly'],
    [1500000, 'Mythic']
  ];

  for (const [score, expected] of boundaries) {
    assert.equal(getRarity(score), expected, `${score} should be ${expected}`);
  }
  assert.deepEqual(
    RARITY_THRESHOLDS.map(({ name, min }) => [name, min]),
    [
      ['Mythic', 1500000],
      ['Anomaly', 200000],
      ['Epic', 85000],
      ['Rare', 49500],
      ['Uncommon', 34500],
      ['Common', 25000],
      ['Trash', 0]
    ]
  );
});

test('active launch rank boundaries remain explicit', () => {
  const boundaries = [
    [0, 'Bronze'],
    [499999, 'Bronze'],
    [500000, 'Silver'],
    [2499999, 'Silver'],
    [2500000, 'Gold'],
    [7499999, 'Gold'],
    [7500000, 'Platinum'],
    [14999999, 'Platinum'],
    [15000000, 'Diamond'],
    [29999999, 'Diamond'],
    [30000000, 'Chroma']
  ];

  for (const [ep, expected] of boundaries) {
    assert.equal(getRank(ep).name, expected, `${ep} EP should be ${expected}`);
  }
  assert.deepEqual(RANKS.map(({ name, min }) => [name, min]), [
    ['Bronze', 0],
    ['Silver', 500000],
    ['Gold', 2500000],
    ['Platinum', 7500000],
    ['Diamond', 15000000],
    ['Chroma', 30000000]
  ]);
});

test('rank progress is clamped and reaches one at Chroma', () => {
  assert.equal(getRankState(-100).lifetimeEp, 0);
  assert.equal(getRankState(250000).progress, 0.5);
  assert.equal(getRankState(30000000).progress, 1);
  assert.equal(getRankState(30000000).next, null);
});

test('deterministic score calculations preserve active condition stacking', () => {
  const spectrum = scoreColor(18, 52, 86);
  assert.equal(spectrum.hex, '#123456');
  assert.equal(spectrum.score, 61196);
  assert.equal(spectrum.rarity, 'Rare');
  assert.deepEqual(spectrum.badges, [
    'base_spectrum', 'sum_even', 'sum_div3', 'all_even', 'mod_contrast',
    'dark_red', 'dark_green', 'dark_blue', 'cool_tone', 'ascending',
    'contains_1', 'contains_2', 'contains_3', 'contains_4', 'contains_5', 'contains_6'
  ]);
});

test('F1 remains a one-million-point substring condition', () => {
  const result = scoreColor(241, 0, 0);
  assert.equal(result.hex, '#F10000');
  assert.equal(result.score, 1548775);
  assert.equal(result.rarity, 'Anomaly');
  assert.ok(result.badges.includes('f1'));
});

test('exact special colors retain their score and achievement rewards', () => {
  const streamerPurple = scoreColor(145, 70, 255);
  assert.equal(streamerPurple.score, 1063386);
  assert.ok(streamerPurple.badges.includes('streamer_purple'));
  assert.equal(ACHIEVEMENTS.streamer_purple.points, 2000000);
  assert.equal(ACHIEVEMENTS.roll_black.points, 5000000);
  assert.equal(ACHIEVEMENTS.roll_white.points, 5000000);
});

test('score model rejects impossible channels', () => {
  assert.throws(() => scoreColor(-1, 0, 0), RangeError);
  assert.throws(() => scoreColor(0, 0, 256), RangeError);
  assert.throws(() => scoreColor(1.5, 0, 0), RangeError);
});

test('seeded distribution remains measurable before balance changes', () => {
  const report = simulateBalance({ rolls: 100000, seed: 0x4348524f });
  assert.equal(report.averageScore, 167057.43291);
  assert.equal(report.averageConditions, 13.60182);
  assert.equal(report.f1Frequency, 0.01926);
  assert.deepEqual(
    Object.fromEntries(Object.entries(report.rarities).map(([rarity, result]) => [rarity, result.count])),
    { Trash: 0, Common: 0, Uncommon: 27604, Rare: 45229, Epic: 25238, Anomaly: 1929, Mythic: 0 }
  );
});

test('richer candidate balance distribution is locked', () => {
  const report = simulateBalance({ rolls: 100000, seed: 0x4348524f, candidate: true });
  assert.equal(report.averageScore, 54177.69084);
  assert.equal(report.averageConditions, 10.67035);
  assert.equal(report.averageContributors, 10.67035);
  assert.deepEqual(
    Object.fromEntries(Object.entries(report.rarities).map(([rarity, result]) => [rarity, result.count])),
    { Trash: 25023, Common: 14852, Uncommon: 29243, Rare: 17073, Epic: 13654, Anomaly: 87, Mythic: 68 }
  );
});

test('candidate economy pacing remains explicit', () => {
  assert.deepEqual(CANDIDATE_RANKS.map(({ name, min }) => [name, min]), [
    ['Bronze', 0], ['Silver', 500000], ['Gold', 2500000],
    ['Platinum', 7500000], ['Diamond', 15000000], ['Chroma', 30000000]
  ]);
  assert.deepEqual(SHOP_PRICE_BANDS.Mythic, { min: 175000, max: 1150000 });
  assert.equal(STREAK_FREEZE_PRICE, 50000);
  assert.equal(PRESTIGE_ITEM_PRICE, 1250000);
  assert.deepEqual(PRESTIGE_ITEM_KEYS, ['bg_god_rays', 'lb_chroma', 'name_chroma']);
  assert.equal(Object.keys(CANDIDATE_ACHIEVEMENT_REWARDS).length, 42);
  assert.equal(CANDIDATE_ACHIEVEMENT_TOTAL, 8820000);
  assert.ok(RETIRED_ACHIEVEMENT_IDS.includes('launch_adopter'));
});
