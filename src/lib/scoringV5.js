import {
  getHistoricalConditionRewardBandV5,
  getConditionRewardStrength,
  getRarityV5
} from './balanceConfig.js';
import {
  getConditionVariationBps,
  scoreCandidateColorV3
} from './scoringV3.js';

export const ACTIVE_SCORE_MODEL_VERSION = 5;

function clampAwardedPoints(points, band) {
  const minimum = Math.max(1, band.minPoints);
  const maximum = band.maxPoints === null ? Number.POSITIVE_INFINITY : band.maxPoints;
  return Math.min(maximum, Math.max(minimum, points));
}

export function resolveConditionReward(condition, red, green, blue, conditionIndex) {
  const band = getHistoricalConditionRewardBandV5(condition.conditionRarity);
  const configuredStrength = getConditionRewardStrength(condition);
  const rewardStrength = band.maxStrength === null
    ? configuredStrength
    : Math.min(configuredStrength, band.maxStrength);
  const basePoints = Math.max(1, Math.round(band.basePoints * rewardStrength));
  const variationBps = getConditionVariationBps(
    red,
    green,
    blue,
    conditionIndex,
    condition.id
  );
  const variedPoints = Math.round(basePoints * (10000 + variationBps) / 10000);
  const awardedPoints = clampAwardedPoints(variedPoints, band);

  return {
    ...condition,
    points: basePoints,
    basePoints,
    awardedPoints,
    rewardStrength,
    multiplier: 1,
    variationBps
  };
}

export function scoreCandidateColorV5(red, green, blue) {
  const base = scoreCandidateColorV3(red, green, blue);
  const conditions = base.conditions.map((condition, conditionIndex) => resolveConditionReward(
    condition,
    red,
    green,
    blue,
    conditionIndex
  ));
  const contributors = [...conditions]
    .sort((left, right) => right.awardedPoints - left.awardedPoints || left.id.localeCompare(right.id));
  const score = contributors.reduce((total, condition) => total + condition.awardedPoints, 0);

  return {
    ...base,
    scoreVersion: ACTIVE_SCORE_MODEL_VERSION,
    score,
    rarity: getRarityV5(score),
    conditions,
    contributors
  };
}
