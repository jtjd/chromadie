import {
  CONDITION_REWARD_BANDS as V6_CONDITION_REWARD_BANDS,
  V6_SCORE_ACHIEVEMENT_THRESHOLDS_V5,
  ROLL_RARITY_THRESHOLDS,
  getRollRarityV6,
  scaleV5Threshold
} from './scoringV6Spec.js';
import v6BalanceFixture from './generated/scoringV6BalanceFixture.json' with { type: 'json' };

export { RANKS } from './rankConfig.js';

// The active balance surface is the v6 contract. Keep this compatibility
// shape for existing UI and progression modules while the v6 scorer consumes
// the model spec directly.
export const RARITY_THRESHOLDS = Object.freeze(
  [...ROLL_RARITY_THRESHOLDS]
    .sort((left, right) => right.min - left.min)
    .map(tier => Object.freeze({ name: tier.name, min: tier.min }))
);

export const V6_RARITY_THRESHOLDS = RARITY_THRESHOLDS;

export const V5_RARITY_THRESHOLDS = Object.freeze([
  Object.freeze({ name: 'Anomaly', min: 104204 }),
  Object.freeze({ name: 'Legendary', min: 86417 }),
  Object.freeze({ name: 'Epic', min: 28177 }),
  Object.freeze({ name: 'Rare', min: 23589 }),
  Object.freeze({ name: 'Uncommon', min: 19701 }),
  Object.freeze({ name: 'Common', min: 10786 }),
  Object.freeze({ name: 'Trash', min: 0 })
]);

export const V4_RARITY_THRESHOLDS = Object.freeze([
  Object.freeze({ name: 'Anomaly', min: 315419 }),
  Object.freeze({ name: 'Legendary', min: 213155 }),
  Object.freeze({ name: 'Epic', min: 73744 }),
  Object.freeze({ name: 'Rare', min: 47916 }),
  Object.freeze({ name: 'Uncommon', min: 35871 }),
  Object.freeze({ name: 'Common', min: 11013 }),
  Object.freeze({ name: 'Trash', min: 0 })
]);

export const V3_RARITY_THRESHOLDS = Object.freeze([
  Object.freeze({ name: 'Anomaly', min: 313230 }),
  Object.freeze({ name: 'Legendary', min: 212130 }),
  Object.freeze({ name: 'Epic', min: 73530 }),
  Object.freeze({ name: 'Rare', min: 47530 }),
  Object.freeze({ name: 'Uncommon', min: 35930 }),
  Object.freeze({ name: 'Common', min: 11130 }),
  Object.freeze({ name: 'Trash', min: 0 })
]);

export const CONDITION_REWARD_BANDS = Object.freeze(
  V6_CONDITION_REWARD_BANDS.map(band => Object.freeze({
    name: band.name,
    basePoints: band.baseReward,
    minPoints: band.bandMin,
    maxPoints: band.bandMax,
    maxStrength: null
  }))
);

// v5's fixed reward bands remain available for historical replay. They must
// not be replaced by the active v6 bands, because that would reinterpret old
// score_version = 5 results.
export const HISTORICAL_CONDITION_REWARD_BANDS_V5 = Object.freeze([
  Object.freeze({ name: 'Anomaly', basePoints: 500000, minPoints: 500000, maxPoints: null, maxStrength: null }),
  Object.freeze({ name: 'Legendary', basePoints: 150000, minPoints: 100000, maxPoints: 499999, maxStrength: 2.8 }),
  Object.freeze({ name: 'Epic', basePoints: 40000, minPoints: 25000, maxPoints: 99999, maxStrength: 2.2 }),
  Object.freeze({ name: 'Rare', basePoints: 12000, minPoints: 7500, maxPoints: 24999, maxStrength: 1.8 }),
  Object.freeze({ name: 'Uncommon', basePoints: 4000, minPoints: 2500, maxPoints: 7499, maxStrength: 1.7 }),
  Object.freeze({ name: 'Common', basePoints: 1000, minPoints: 0, maxPoints: 2499, maxStrength: 1.4 })
]);

export const CONDITION_REWARD_STRENGTH_BY_CATEGORY = Object.freeze({
  rare_event: 1.5,
  hex_culture: 1.5,
  hex_pattern: 1.25,
  structure: 1.5,
  cascade: 1.25
});

// These values are retained solely so scoreCandidateColorV5 continues to
// replay its historical reward calculation. v6 uses semantic tags and never
// reads per-condition point or strength overrides.
export const HISTORICAL_CONDITION_REWARD_STRENGTH_BY_ID = Object.freeze({
  pure_black: 200,
  pure_white: 200,
  pure_red: 36,
  pure_green: 36,
  pure_blue: 36,
  pure_cyan: 32,
  pure_magenta: 32,
  pure_yellow: 32,
  pure_gold: 60,
  streamer_purple: 40,
  audio_stream_green: 40,
  classic_cola_red: 40,
  reference_123456: 60,
  reference_abcdef: 60,
  reference_fedcba: 60
});

// Compatibility export for older tooling; it is explicitly historical and
// is not part of the declarative v6 catalog.
export const CONDITION_REWARD_STRENGTH_BY_ID = HISTORICAL_CONDITION_REWARD_STRENGTH_BY_ID;

// This mean is checked in as part of the exhaustive v6 balance fixture. Rank
// and score-achievement thresholds are scaled from their v5 values using this
// value, keeping expected roll pacing stable after the score-model change.
export const V6_MEAN_SCORE = v6BalanceFixture.scoreSpread.mean;

export const V6_SCORE_ACHIEVEMENT_THRESHOLDS = Object.freeze(
  Object.fromEntries(Object.entries(V6_SCORE_ACHIEVEMENT_THRESHOLDS_V5).map(([id, threshold]) => [
    id,
    scaleV5Threshold(threshold, V6_MEAN_SCORE)
  ]))
);

export function getRarity(score = 0) {
  const safeScore = Math.max(0, Number(score) || 0);
  return RARITY_THRESHOLDS.find(tier => safeScore >= tier.min).name;
}

export function getRarityV6(score = 0) {
  return getRollRarityV6(score);
}

export function getRarityV4(score = 0) {
  const safeScore = Math.max(0, Number(score) || 0);
  return V4_RARITY_THRESHOLDS.find(tier => safeScore >= tier.min).name;
}

export function getRarityV5(score = 0) {
  const safeScore = Math.max(0, Number(score) || 0);
  return V5_RARITY_THRESHOLDS.find(tier => safeScore >= tier.min).name;
}

export function getRarityV3(score = 0) {
  const safeScore = Math.max(0, Number(score) || 0);
  return V3_RARITY_THRESHOLDS.find(tier => safeScore >= tier.min).name;
}

export function getConditionRewardBand(rarity = 'Common') {
  return CONDITION_REWARD_BANDS.find(tier => tier.name === rarity) || CONDITION_REWARD_BANDS[0];
}

export function getHistoricalConditionRewardBandV5(rarity = 'Common') {
  return HISTORICAL_CONDITION_REWARD_BANDS_V5.find(tier => tier.name === rarity)
    || HISTORICAL_CONDITION_REWARD_BANDS_V5.at(-1);
}

export function getConditionRewardStrength(condition = {}) {
  return CONDITION_REWARD_STRENGTH_BY_ID[condition.id]
    || CONDITION_REWARD_STRENGTH_BY_CATEGORY[condition.category]
    || 1;
}
