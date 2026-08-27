// Deterministic Probability-Weighted Scoring v6.
//
// This module contains only the model contract. Conditions live in the
// declarative catalog and measured values live in the generated manifest.
// Keeping those concerns separate makes it impossible for a hand-authored
// point literal to quietly become an authority again.

export const SCORE_MODEL_V6_VERSION = 6;
export const ACTIVE_SCORE_MODEL_VERSION = SCORE_MODEL_V6_VERSION;
export const RGB_COLOR_COUNT = 256 ** 3;
export const RGB_SPACE_SIZE = RGB_COLOR_COUNT;

// Probabilities are represented as fractions, not percentages. The boundary
// labels are the approved 5%, 1%, 0.1%, 0.01%, and 0.001% tiers.
export const CONDITION_PROBABILITY_TIERS = Object.freeze([
  Object.freeze({ name: 'Common', upperProbability: 1, lowerProbability: 0.05, displayPercent: 5 }),
  Object.freeze({ name: 'Uncommon', upperProbability: 0.05, lowerProbability: 0.01, displayPercent: 1 }),
  Object.freeze({ name: 'Rare', upperProbability: 0.01, lowerProbability: 0.001, displayPercent: 0.1 }),
  Object.freeze({ name: 'Epic', upperProbability: 0.001, lowerProbability: 0.0001, displayPercent: 0.01 }),
  Object.freeze({ name: 'Legendary', upperProbability: 0.0001, lowerProbability: 0.00001, displayPercent: 0.001 }),
  Object.freeze({ name: 'Anomaly', upperProbability: 0.00001, lowerProbability: 0, displayPercent: 0.0001 })
]);

// This alias is intentionally public: validation scripts and independent
// contract tests should be able to describe the thresholds without reaching
// into implementation details.
export const CONDITION_PROBABILITY_THRESHOLDS = Object.freeze(
  CONDITION_PROBABILITY_TIERS.slice(1).map(tier => tier.upperProbability)
);

// Reward anchors are also the lower edge of each ordinary condition band.
// Ordinary bands end one point before the next anchor. Anomaly is open-ended.
export const CONDITION_REWARD_BANDS = Object.freeze([
  Object.freeze({ name: 'Common', bandMin: 500, bandMax: 4_999, baseReward: 500 }),
  Object.freeze({ name: 'Uncommon', bandMin: 5_000, bandMax: 49_999, baseReward: 5_000 }),
  Object.freeze({ name: 'Rare', bandMin: 50_000, bandMax: 499_999, baseReward: 50_000 }),
  Object.freeze({ name: 'Epic', bandMin: 500_000, bandMax: 4_999_999, baseReward: 500_000 }),
  Object.freeze({ name: 'Legendary', bandMin: 5_000_000, bandMax: 99_999_999, baseReward: 5_000_000 }),
  Object.freeze({ name: 'Anomaly', bandMin: 100_000_000, bandMax: null, baseReward: 100_000_000 })
]);

export const CONDITION_REWARD_ANCHORS = Object.freeze(
  CONDITION_REWARD_BANDS.map(band => band.baseReward)
);

export const ROLL_RARITY_THRESHOLDS = Object.freeze([
  Object.freeze({ name: 'Trash', min: 0 }),
  Object.freeze({ name: 'Common', min: 2_500 }),
  Object.freeze({ name: 'Uncommon', min: 10_000 }),
  Object.freeze({ name: 'Rare', min: 50_000 }),
  Object.freeze({ name: 'Epic', min: 500_000 }),
  Object.freeze({ name: 'Legendary', min: 5_000_000 }),
  Object.freeze({ name: 'Anomaly', min: 100_000_000 })
]);

export const SEMANTIC_BONUS_WEIGHTS = Object.freeze({
  sequence: 0.025,
  named: 0.05,
  meme: 0.075,
  combination: 0.10,
  exact: 0.15
});
export const MAX_SEMANTIC_BONUS = 0.20;

export const VARIATION_MIN_BPS = -700;
export const VARIATION_MAX_BPS = 700;
export const VARIATION_MODULUS = 1_401;
export const VARIATION_SALT = 'chromadie:v6:';

export const MIN_ACTIVE_CONDITIONS = 100;
export const MIN_COMBINATION_CONDITIONS = 20;

export const V5_MEAN_SCORE = 21_280.58;
export const SCORE_THRESHOLD_ROUNDING = 1_000;

const RARITY_BY_DESCENDING_THRESHOLD = Object.freeze([...ROLL_RARITY_THRESHOLDS].sort((a, b) => b.min - a.min));
const COMMON_REWARD_BAND = CONDITION_REWARD_BANDS[0];
const COMMON_PROBABILITY_TIER = CONDITION_PROBABILITY_TIERS[0];

export function getRollRarityV6(score = 0) {
  const safeScore = Math.max(0, Number(score) || 0);
  return RARITY_BY_DESCENDING_THRESHOLD.find(tier => safeScore >= tier.min).name;
}

export function getConditionRarityFromProbability(probability) {
  const safeProbability = Number(probability);
  if (!Number.isFinite(safeProbability) || safeProbability <= 0 || safeProbability > 1) {
    throw new RangeError('Condition probability must be greater than 0 and at most 1.');
  }
  return CONDITION_PROBABILITY_TIERS
    .slice()
    .reverse()
    .find(tier => {
      if (tier.name === 'Anomaly') return safeProbability <= tier.upperProbability;
      return safeProbability <= tier.upperProbability && safeProbability > tier.lowerProbability;
    })?.name || 'Common';
}

export function getConditionRewardBand(rarity = 'Common') {
  return CONDITION_REWARD_BANDS.find(band => band.name === rarity) || COMMON_REWARD_BAND;
}

export function getConditionProbabilityTier(rarity = 'Common') {
  return CONDITION_PROBABILITY_TIERS.find(tier => tier.name === rarity) || COMMON_PROBABILITY_TIER;
}

export function getSemanticBonus(semanticTags = []) {
  const total = [...new Set(Array.isArray(semanticTags) ? semanticTags : [])]
    .reduce((sum, tag) => sum + (SEMANTIC_BONUS_WEIGHTS[tag] || 0), 0);
  return Math.min(MAX_SEMANTIC_BONUS, total);
}

// All v6 identifiers are ASCII. Hashing code units therefore matches UTF-8
// bytes in both JavaScript and the generated PostgreSQL evaluator.
export function hashVariationInput(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function getVariationBps(red, green, blue, conditionId) {
  const input = `${VARIATION_SALT}${red}:${green}:${blue}:${conditionId}`;
  return (hashVariationInput(input) % VARIATION_MODULUS) + VARIATION_MIN_BPS;
}

export function interpolateProbabilityReward(probability, rarity) {
  const band = getConditionRewardBand(rarity);
  if (rarity === 'Anomaly') {
    return CONDITION_REWARD_BANDS.at(-1).baseReward * (0.00001 / probability);
  }
  const tier = getConditionProbabilityTier(rarity);
  const t = Math.log(tier.upperProbability / probability)
    / Math.log(tier.upperProbability / tier.lowerProbability);
  return band.bandMin + t * (band.bandMax - band.bandMin);
}

export function roundToNearest(value, increment = SCORE_THRESHOLD_ROUNDING) {
  return Math.round(value / increment) * increment;
}

export function scaleV5Threshold(v5Threshold, v6Mean) {
  return roundToNearest(Number(v5Threshold) * Number(v6Mean) / V5_MEAN_SCORE);
}

export const V6_SCORE_ACHIEVEMENT_THRESHOLDS_V5 = Object.freeze({
  score_50k: 50_000,
  score_100k: 100_000,
  score_200k: 200_000,
  score_1_5m: 1_500_000
});
