import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getHistoricalConditionRewardBandV5,
  getRarity,
  RANKS,
  RARITY_THRESHOLDS
} from '../src/lib/balanceConfig.js';
import { getRank, getRankState } from '../src/lib/ranks.js';
import { scoreColor } from '../src/lib/scoring.js';
import { scoreCandidateColor } from '../src/lib/scoringCandidate.js';
import {
  scoreCandidateColorV3,
  scoreCandidateColorV4,
  HISTORICAL_SCORE_MODEL_VERSION
} from '../src/lib/scoringV3.js';
import { ACTIVE_SCORE_MODEL_VERSION as SCORE_MODEL_V5, scoreCandidateColorV5 } from '../src/lib/scoringV5.js';
import { ACTIVE_SCORE_MODEL_VERSION, scoreCandidateColorV6 } from '../src/lib/scoringV6.js';
import { getBadgeMeta } from '../src/lib/badgeData.js';
import { ACHIEVEMENTS } from '../src/lib/badgeData.js';
import { getConditionRarityV6, V6_CULTURE_CONDITIONS } from '../src/lib/conditionCatalogV6.js';
import { simulateBalance } from '../scripts/simulate-balance.mjs';
import {
  CANDIDATE_RANKS,
  PRESTIGE_ITEM_PRICE,
  SHOP_PRICE_BANDS,
  STREAK_FREEZE_PRICE
} from '../src/lib/balanceCandidate.js';
import {
  CANDIDATE_ACHIEVEMENT_REWARDS,
  CANDIDATE_ACHIEVEMENT_TOTAL,
  RETIRED_ACHIEVEMENT_IDS
} from '../src/lib/achievementCandidate.js';

test('active v6 rarity boundaries remain explicit', () => {
  const boundaries = [
    [0, 'Trash'],
    [2499, 'Trash'],
    [2500, 'Common'],
    [9999, 'Common'],
    [10000, 'Uncommon'],
    [49999, 'Uncommon'],
    [50000, 'Rare'],
    [499999, 'Rare'],
    [500000, 'Epic'],
    [4999999, 'Epic'],
    [5000000, 'Legendary'],
    [99999999, 'Legendary'],
    [100000000, 'Anomaly']
  ];

  for (const [score, expected] of boundaries) {
    assert.equal(getRarity(score), expected, `${score} should be ${expected}`);
  }
  assert.deepEqual(
    RARITY_THRESHOLDS.map(({ name, min }) => [name, min]),
    [
      ['Anomaly', 100000000],
      ['Legendary', 5000000],
      ['Epic', 500000],
      ['Rare', 50000],
      ['Uncommon', 10000],
      ['Common', 2500],
      ['Trash', 0]
    ]
  );
});

test('active launch rank boundaries remain explicit', () => {
  const boundaries = [
    [0, 'Bronze'],
    [4789999, 'Bronze'],
    [4790000, 'Silver'],
    [23949999, 'Silver'],
    [23950000, 'Gold'],
    [71850999, 'Gold'],
    [71851000, 'Platinum'],
    [143702999, 'Platinum'],
    [143703000, 'Diamond'],
    [287404999, 'Diamond'],
    [287405000, 'Chroma']
  ];

  for (const [ep, expected] of boundaries) {
    assert.equal(getRank(ep).name, expected, `${ep} EP should be ${expected}`);
  }
  assert.deepEqual(RANKS.map(({ name, min }) => [name, min]), [
    ['Bronze', 0],
    ['Silver', 4790000],
    ['Gold', 23950000],
    ['Platinum', 71851000],
    ['Diamond', 143703000],
    ['Chroma', 287405000]
  ]);
});

test('rank progress is clamped and reaches one at Chroma', () => {
  assert.equal(getRankState(-100).lifetimeEp, 0);
  assert.equal(getRankState(2395000).progress, 0.5);
  assert.equal(getRankState(287405000).progress, 1);
  assert.equal(getRankState(287405000).next, null);
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

test('legacy distribution remains available only when explicitly requested', () => {
  const report = simulateBalance({ rolls: 100000, seed: 0x4348524f, legacy: true });
  assert.equal(report.averageScore, 167057.43291);
  assert.equal(report.averageConditions, 13.60182);
  assert.equal(report.f1Frequency, 0.01926);
  assert.deepEqual(
    Object.fromEntries(Object.entries(report.rarities).map(([rarity, result]) => [rarity, result.count])),
    { Trash: 0, Common: 0, Uncommon: 27604, Rare: 45229, Epic: 25238, Anomaly: 1929, Mythic: 0 }
  );
});

test('v6 balance distribution is locked to the measured sample', () => {
  const report = simulateBalance({ rolls: 100000, seed: 0x4348524f });
  assert.equal(report.scoreVersion, ACTIVE_SCORE_MODEL_VERSION);
  assert.equal(report.minScore, 16099);
  assert.equal(report.maxScore, 3921260535);
  assert.equal(report.averageScore, 196913.76147);
  assert.equal(report.averageConditions, 18.03539);
  assert.equal(report.averageContributors, 18.03539);
  assert.deepEqual(
    Object.fromEntries(Object.entries(report.rarities).map(([rarity, result]) => [rarity, result.count])),
    { Trash: 0, Common: 0, Uncommon: 52523, Rare: 43525, Epic: 3839, Legendary: 109, Anomaly: 4 }
  );
});

test('v5 rarity drives reward bands while preserving full additive scoring', () => {
  const result = scoreCandidateColorV5(187, 51, 33);
  const contributorTotal = result.contributors.reduce((total, contributor) => total + contributor.awardedPoints, 0);

  assert.equal(result.scoreVersion, SCORE_MODEL_V5);
  assert.equal(result.score, contributorTotal);
  assert.ok(result.conditions.length >= 14);
  assert.ok(result.conditions.every(condition => {
    const band = getHistoricalConditionRewardBandV5(condition.conditionRarity);
    return condition.points > 0
      && condition.conditionRarity
      && condition.awardedPoints >= band.minPoints
      && (band.maxPoints === null || condition.awardedPoints <= band.maxPoints);
  }));
  assert.ok(result.conditions.some(condition => condition.id === 'condition_cascade'));
  assert.equal(result.conditions.find(condition => condition.id === 'prime_sum').conditionRarity, 'Common');
  const common = result.contributors.find(contributor => contributor.id === 'sum_odd');
  const uncommon = result.contributors.find(contributor => contributor.id === 'hue_family_crimson');
  assert.ok(uncommon.awardedPoints > common.awardedPoints);
  assert.ok(result.contributors.some(contributor => contributor.variationBps !== 0));
});

test('v4 remains available as a historical score model', () => {
  const result = scoreCandidateColorV4(187, 51, 33);
  assert.equal(result.scoreVersion, 4);
  assert.equal(result.score, 64170);
});

test('v6 culture conditions are deterministic, probability-aware, and fully presented', () => {
  assert.equal(ACTIVE_SCORE_MODEL_VERSION, 6);
  assert.equal(getConditionRarityV6({ id: 'six_seven' }), 'Uncommon');
  assert.equal(getConditionRarityV6({ id: 'six_seven_echo' }), 'Legendary');
  assert.equal(getConditionRarityV6({ id: 'six_seven_full' }), 'Anomaly');
  assert.equal(getConditionRarityV6({ id: 'edge_pair' }), 'Uncommon');
  assert.equal(getConditionRarityV6({ id: 'extreme_span' }), 'Uncommon');
  assert.equal(getConditionRarityV6({ id: 'a24' }), 'Epic');

  const baseSixSeven = scoreCandidateColorV6(0x67, 0x00, 0x00);
  assert.ok(baseSixSeven.conditions.some(condition => condition.id === 'six_seven'));

  const echo = scoreCandidateColorV6(0x67, 0x67, 0xff);
  assert.ok(echo.conditions.some(condition => condition.id === 'six_seven_echo'));
  assert.ok(!echo.conditions.some(condition => condition.id === 'six_seven'));

  const full = scoreCandidateColorV6(0x67, 0x67, 0x67);
  assert.ok(full.conditions.some(condition => condition.id === 'six_seven_full'));
  assert.ok(!full.conditions.some(condition => ['six_seven', 'six_seven_echo'].includes(condition.id)));
  assert.ok(full.score > echo.score);

  const nested = scoreCandidateColorV6(0x42, 0x06, 0x9a);
  assert.ok(nested.conditions.some(condition => condition.id === 'blaze_nice'));
  assert.ok(nested.conditions.some(condition => ['blaze_it', 'nice'].includes(condition.id)));
  assert.ok(nested.conditions.find(condition => condition.id === 'blaze_nice').awardedPoints >= 500000);

  for (const condition of V6_CULTURE_CONDITIONS) {
    const meta = getBadgeMeta(condition.id);
    assert.notEqual(meta.symbol, '❓', `${condition.id} should have an icon`);
    assert.equal(meta.name, condition.name);
    assert.ok(meta.desc && meta.rarity, `${condition.id} should have complete metadata`);
  }
});

test('v4 conditions have explicit presentation metadata', () => {
  for (const id of ['hex_digit_run', 'shadow_saturation', 'all_channels_even', 'condition_constellation', 'pure_cyan', 'reference_123456']) {
    const meta = getBadgeMeta(id);
    assert.notEqual(meta.symbol, '❓', `${id} should have an icon`);
    assert.ok(meta.name && meta.desc && meta.rarity, `${id} should have complete metadata`);
  }
});

test('the rare supernova condition creates the requested multi-million ceiling', () => {
  const result = scoreCandidateColor(0, 0, 0);
  const supernova = result.contributors.find(contributor => contributor.id === 'condition_supernova');

  assert.equal(result.score, 12321090);
  assert.equal(result.rarity, 'Mythic');
  assert.equal(supernova.awardedPoints, 10000013);
  assert.ok(result.score >= 10000000);
});

test('v5 exact memorable colors occupy the Anomaly tail', () => {
  const result = scoreCandidateColorV5(0, 0, 0);
  assert.equal(result.rarity, 'Anomaly');
  assert.equal(result.score, 100973598);
  const voidCondition = result.contributors.find(contributor => contributor.id === 'pure_black');
  assert.equal(voidCondition.awardedPoints, 100000000);
  assert.equal(voidCondition.variationBps, 0);
  assert.equal(voidCondition.conditionRarity, 'Anomaly');
});

test('v3 historical scores remain available for replay', () => {
  const result = scoreCandidateColorV3(0, 0, 0);
  assert.equal(result.scoreVersion, HISTORICAL_SCORE_MODEL_VERSION);
  assert.equal(result.score, 100526130);
  assert.equal(result.rarity, 'Anomaly');
});

test('known SQL numeric boundary colors retain authoritative classifications', () => {
  const cases = [
    [187, 51, 33, 58782, 'Rare', 'Balanced Vivid Crimson'],
    [160, 136, 234, 38540, 'Uncommon', 'Bright Vivid Blue']
  ];
  for (const [red, green, blue, score, rarity, identity] of cases) {
    const result = scoreCandidateColor(red, green, blue);
    assert.equal(result.score, score);
    assert.equal(result.rarity, rarity);
    assert.equal(result.identity, identity);
  }
});

test('candidate economy pacing remains explicit', () => {
  assert.deepEqual(CANDIDATE_RANKS.map(({ name, min }) => [name, min]), [
    ['Bronze', 0], ['Silver', 4790000], ['Gold', 23950000],
    ['Platinum', 71851000], ['Diamond', 143703000], ['Chroma', 287405000]
  ]);
  assert.deepEqual(SHOP_PRICE_BANDS.Mythic, { min: 175000, max: 1150000 });
  assert.equal(STREAK_FREEZE_PRICE, 50000);
  assert.equal(PRESTIGE_ITEM_PRICE, 1250000);
  assert.equal(Object.keys(CANDIDATE_ACHIEVEMENT_REWARDS).length, 42);
  assert.equal(CANDIDATE_ACHIEVEMENT_TOTAL, 8820000);
  assert.ok(RETIRED_ACHIEVEMENT_IDS.includes('launch_adopter'));
});
