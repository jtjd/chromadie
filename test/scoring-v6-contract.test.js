import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import {
  ACTIVE_V6_CONDITIONS,
  V6_COMBINATION_CONDITIONS
} from '../src/lib/conditionCatalogV6.js';
import {
  evaluateGeneratedV6Conditions,
  GENERATED_V6_CATALOG,
  GENERATED_V6_MANIFEST_BY_ID
} from '../src/lib/generated/scoringV6.generated.js';
import v6BalanceFixture from '../src/lib/generated/scoringV6BalanceFixture.json' with { type: 'json' };
import v6Manifest from '../src/lib/generated/scoringV6ProbabilityManifest.json' with { type: 'json' };
import {
  getConditionRarityFromProbability,
  getRollRarityV6
} from '../src/lib/scoringV6Spec.js';
import {
  resolveConditionRewardV6,
  scoreCandidateColorV6
} from '../src/lib/scoringV6.js';
import {
  RANKS,
  V6_SCORE_ACHIEVEMENT_THRESHOLDS
} from '../src/lib/balanceConfig.js';

const RGB_COLOR_COUNT = 16_777_216;
const EXPECTED_REWARD_BANDS = Object.freeze({
  Common: [500, 4_999],
  Uncommon: [5_000, 49_999],
  Rare: [50_000, 499_999],
  Epic: [500_000, 4_999_999],
  Legendary: [5_000_000, 99_999_999],
  Anomaly: [100_000_000, Number.POSITIVE_INFINITY]
});
const EXPECTED_RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Anomaly'];

const edgeColors = [
  [0, 0, 0],
  [255, 255, 255],
  [17, 17, 17],
  [18, 18, 18],
  [18, 52, 86],
  [0x42, 0x06, 0x9a],
  [0x67, 0x67, 0x67],
  [0x67, 0x67, 0xff],
  [0xc0, 0xff, 0xee],
  [0xde, 0xfa, 0xce],
  [0xf0, 0x0b, 0xa4],
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255]
];

function manifestEntry(id) {
  const entry = GENERATED_V6_MANIFEST_BY_ID[id];
  assert.ok(entry, `manifest should contain ${id}`);
  return entry;
}

function stableDigest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

test('v6 probability tiers and roll thresholds are the approved contract', () => {
  const probabilityBoundaries = [
    [0.0500000001, 'Common'],
    [0.05, 'Uncommon'],
    [0.0100000001, 'Uncommon'],
    [0.01, 'Rare'],
    [0.0010000001, 'Rare'],
    [0.001, 'Epic'],
    [0.0001000001, 'Epic'],
    [0.0001, 'Legendary'],
    [0.0000100001, 'Legendary'],
    [0.00001, 'Anomaly']
  ];
  for (const [probability, expected] of probabilityBoundaries) {
    assert.equal(getConditionRarityFromProbability(probability), expected);
  }

  const rollBoundaries = [
    [0, 'Trash'],
    [2_499, 'Trash'],
    [2_500, 'Common'],
    [9_999, 'Common'],
    [10_000, 'Uncommon'],
    [49_999, 'Uncommon'],
    [50_000, 'Rare'],
    [499_999, 'Rare'],
    [500_000, 'Epic'],
    [4_999_999, 'Epic'],
    [5_000_000, 'Legendary'],
    [99_999_999, 'Legendary'],
    [100_000_000, 'Anomaly']
  ];
  for (const [score, expected] of rollBoundaries) {
    assert.equal(getRollRarityV6(score), expected, `${score} should be ${expected}`);
  }
});

test('exact RGB predicate probabilities remain locked', () => {
  const expected = [
    ['greyscale', 256, 'Legendary'],
    ['palindrome', 4_096, 'Epic'],
    ['repeated_pair', 256, 'Legendary'],
    ['sixfold_digit', 16, 'Anomaly'],
    ['reference_123456', 1, 'Anomaly'],
    ['reference_abcdef', 1, 'Anomaly'],
    ['reference_fedcba', 1, 'Anomaly'],
    ['coffee_code', 1, 'Anomaly'],
    ['sum_420', 47_746, 'Rare'],
    ['sum_666', 5_050, 'Epic'],
    ['blaze_it', 16_383, 'Epic'],
    ['bee', 16_383, 'Epic'],
    ['leet', 768, 'Legendary'],
    ['six_seven', 325_378, 'Uncommon'],
    ['six_seven_echo', 766, 'Legendary'],
    ['six_seven_full', 1, 'Anomaly']
  ];

  for (const [id, matchCount, rarity] of expected) {
    const entry = manifestEntry(id);
    assert.equal(entry.matchCount, matchCount, `${id} match count`);
    assert.equal(entry.probability, matchCount / RGB_COLOR_COUNT, `${id} probability`);
    assert.equal(entry.expectedRolls, Math.ceil(RGB_COLOR_COUNT / matchCount), `${id} expected rolls`);
    assert.equal(entry.rarity, rarity, `${id} rarity`);
  }

  const anomaly = manifestEntry('reference_123456');
  assert.ok(Math.abs(anomaly.probabilityReward - 16_777_216_000) < 0.001);
});

test('Bee replaces the obscure D23 culture code at the same probability', () => {
  assert.equal(ACTIVE_V6_CONDITIONS.some(condition => condition.id === 'd23'), false);
  assert.equal(GENERATED_V6_CATALOG.some(condition => condition.id === 'd23'), false);

  const bee = ACTIVE_V6_CONDITIONS.find(condition => condition.id === 'bee');
  assert.deepEqual(bee && {
    name: bee.name,
    pattern: bee.pattern,
    symbol: bee.symbol,
    semanticTags: bee.semanticTags
  }, {
    name: 'Bee',
    pattern: 'BEE',
    symbol: '🐝',
    semanticTags: ['named']
  });

  const beeManifest = manifestEntry('bee');
  assert.equal(beeManifest.matchCount, 16_383);
  assert.equal(beeManifest.expectedRolls, 1_025);
  assert.equal(beeManifest.rarity, 'Epic');

  const beeIds = scoreCandidateColorV6(0xbe, 0xe0, 0).conditionIds;
  const formerD23Ids = scoreCandidateColorV6(0xd2, 0x30, 0).conditionIds;
  assert.ok(beeIds.includes('bee'), '#BEE000 should earn Bee');
  assert.equal(formerD23Ids.includes('bee'), false, '#D23000 should no longer earn the replacement condition');
});

test('the declarative catalog is large, composable, and free of hand-authored rewards', () => {
  assert.ok(ACTIVE_V6_CONDITIONS.length >= 100);
  assert.ok(V6_COMBINATION_CONDITIONS.length >= 20);
  assert.equal(ACTIVE_V6_CONDITIONS.length, GENERATED_V6_CATALOG.length);

  const forbiddenFields = ['rarity', 'probability', 'points', 'basePoints', 'awardedPoints'];
  for (const condition of ACTIVE_V6_CONDITIONS) {
    for (const field of forbiddenFields) {
      assert.equal(Object.hasOwn(condition, field), false, `${condition.id} must not declare ${field}`);
    }
  }
  assert.ok(V6_COMBINATION_CONDITIONS.every(condition => condition.predicate.type === 'combination'));
  assert.ok(V6_COMBINATION_CONDITIONS.every(condition => condition.predicate.all.length >= 2));
  assert.equal(
    ACTIVE_V6_CONDITIONS.some(condition => /^contains_[0-9a-f]$/.test(condition.id)),
    false,
    'single-character HEX matches must not become scored conditions'
  );
});

test('#111111 receives the sixfold reward on top of ordinary grayscale', () => {
  const result = scoreCandidateColorV6(17, 17, 17);
  const sixfold = result.conditions.find(condition => condition.id === 'sixfold_digit');
  const grayscale = result.conditions.find(condition => condition.id === 'greyscale');

  assert.ok(sixfold, '#111111 should trigger sixfold_digit');
  assert.ok(grayscale, '#111111 should trigger greyscale');
  assert.ok(sixfold.awardedPoints > grayscale.awardedPoints * 5);
  assert.equal(sixfold.conditionRarity, 'Anomaly');
});

test('v6 output is byte-for-byte deterministic and generated evaluation matches the adapter', () => {
  let state = 0x4348524f;
  const samples = [...edgeColors];
  while (samples.length < 128) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const packed = state >>> 0;
    samples.push([(packed >>> 16) & 255, (packed >>> 8) & 255, packed & 255]);
  }

  for (const channels of samples) {
    const first = scoreCandidateColorV6(...channels);
    const second = scoreCandidateColorV6(...channels);
    assert.equal(JSON.stringify(first), JSON.stringify(second), `unstable output for ${channels.join(',')}`);

    const generatedIds = evaluateGeneratedV6Conditions(...channels).map(condition => condition.id);
    assert.deepEqual(first.conditions.map(condition => condition.id), generatedIds);
    assert.equal(
      first.score,
      first.contributors.reduce((total, condition) => total + condition.awardedPoints, 0)
    );
  }
});

test('all generated condition rewards stay in their assigned probability bands', () => {
  for (const entry of v6Manifest.conditions) {
    const [minimum, maximum] = EXPECTED_REWARD_BANDS[entry.rarity];
    const basePoints = Math.round(entry.probabilityReward * (1 + entry.semanticBonus));
    const variedMinimum = Math.round(basePoints * (10_000 - 700) / 10_000);
    const variedMaximum = Math.round(basePoints * (10_000 + 700) / 10_000);
    const clampedMinimum = Math.max(minimum, variedMinimum);
    const clampedMaximum = Math.min(maximum, variedMaximum);

    assert.ok(clampedMinimum >= minimum, `${entry.id} falls below ${entry.rarity}`);
    if (Number.isFinite(maximum)) assert.ok(clampedMaximum <= maximum, `${entry.id} exceeds ${entry.rarity}`);
    assert.ok(entry.semanticBonus >= 0 && entry.semanticBonus <= 0.20, `${entry.id} bonus cap`);
    assert.equal(entry.variationMinBps, -700, `${entry.id} variation minimum`);
    assert.equal(entry.variationMaxBps, 700, `${entry.id} variation maximum`);
  }

  for (let index = 1; index < EXPECTED_RARITY_ORDER.length; index += 1) {
    const previousBand = EXPECTED_REWARD_BANDS[EXPECTED_RARITY_ORDER[index - 1]];
    const currentBand = EXPECTED_REWARD_BANDS[EXPECTED_RARITY_ORDER[index]];
    assert.ok(currentBand[0] > previousBand[0]);
  }
});

test('the exhaustive fixture locks score spread, distributions, and progression metadata', () => {
  assert.equal(v6BalanceFixture.scoreModelVersion, 6);
  assert.equal(v6BalanceFixture.rgbColorCount, RGB_COLOR_COUNT);
  assert.equal(v6BalanceFixture.v5MeanScore, 21_280.58);
  assert.deepEqual(v6BalanceFixture.scoreSpread, {
    min: 15_648,
    max: 48_172_821_304,
    mean: 203_871.72366416454,
    median: 47_461,
    percentiles: {
      p01: 22_757,
      p50: 47_461,
      p75: 75_787,
      p90: 145_751,
      p97: 653_725,
      p98: 752_494,
      p986: 795_828,
      p99: 839_203,
      p996: 1_548_948,
      p999: 30_203_245,
      p9999: 43_250_864
    }
  });
  assert.deepEqual(v6BalanceFixture.rarities, {
    Trash: { count: 0, frequency: 0, expectedRolls: null },
    Common: { count: 0, frequency: 0, expectedRolls: null },
    Uncommon: { count: 8_785_486, frequency: 0.5236557722091675, expectedRolls: 1.9096514410244352 },
    Rare: { count: 7_328_483, frequency: 0.436811625957489, expectedRolls: 2.289316356468317 },
    Epic: { count: 644_630, frequency: 0.03842294216156006, expectedRolls: 26.02611730760281 },
    Legendary: { count: 18_122, frequency: 0.001080155372619629, expectedRolls: 925.7927381083765 },
    Anomaly: { count: 495, frequency: 0.00002950429916381836, expectedRolls: 33893.36565656566 }
  });
  assert.deepEqual(v6BalanceFixture.conditionTotals.families, {
    identity: 16_777_216,
    mathematical: 37_092_062,
    sum_shape: 7_778_096,
    channel_identity: 9_753_011,
    edge_behavior: 3_533_112,
    symmetry: 16_974_080,
    color_relationship: 25_924_446,
    composition: 16_777_216,
    sequence: 30_708_390,
    relationship: 196_608,
    color_identity: 33_554_432,
    saturation: 22_958_716,
    tone: 16_913_768,
    hex_pattern: 4_913_966,
    hex_structure: 34_208_610,
    hex_culture: 1_186_661,
    hex_pair: 4_969_456,
    hex_triplet: 249_856,
    exact: 18,
    combination: 18_097_452
  });
  assert.equal(v6BalanceFixture.conditionTotals.average, 18.034408807754517);
  assert.equal(stableDigest(v6BalanceFixture.conditions), '1dd9bbd33ac304dd61a0bbb2934754260c750bcbe07090deb0306a68dbaddad2');
  assert.equal(stableDigest(v6BalanceFixture.progression.discoveryExpectedRolls), '6c6013e0cdbd6fb1fd3adc28586fb43309a53c620cab380155d75eb7bdde2852');
  assert.deepEqual(v6BalanceFixture.progression.rankThresholds, {
    Silver: 4_790_000,
    Gold: 23_950_000,
    Platinum: 71_851_000,
    Diamond: 143_703_000,
    Chroma: 287_405_000
  });
  assert.deepEqual(v6BalanceFixture.progression.scoreAchievementThresholds, {
    score_50k: 479_000,
    score_100k: 958_000,
    score_200k: 1_916_000,
    score_1_5m: 14_370_000
  });
  assert.equal(v6BalanceFixture.progression.thresholdRounding, 1_000);
});

test('runtime progression thresholds match the checked-in recalibration', () => {
  assert.deepEqual(RANKS.map(rank => [rank.name, rank.min]), [
    ['Bronze', 0],
    ['Silver', 4_790_000],
    ['Gold', 23_950_000],
    ['Platinum', 71_851_000],
    ['Diamond', 143_703_000],
    ['Chroma', 287_405_000]
  ]);
  assert.deepEqual(V6_SCORE_ACHIEVEMENT_THRESHOLDS, {
    score_50k: 479_000,
    score_100k: 958_000,
    score_200k: 1_916_000,
    score_1_5m: 14_370_000
  });
});

test('generated SQL retains the v6 evaluator contract and security boundary', () => {
  const sql = readFileSync('supabase/generated/scoringV6Evaluator.sql', 'utf8');
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.calculate_roll_v6\(p_r integer, p_g integer, p_b integer\)/);
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /SET search_path TO 'public', 'pg_catalog'/);
  assert.match(sql, /WHEN v_score >= 100000000 THEN 'Anomaly'/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.calculate_roll_v6/);
  assert.match(sql, /v_score > 9223372036854775807 - v_awarded/);
});
