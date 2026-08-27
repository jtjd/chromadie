import {
  GENERATED_SCORE_MODEL_V6_VERSION,
  GENERATED_V6_MANIFEST_BY_ID,
  evaluateGeneratedV6Conditions
} from './generated/scoringV6.generated.js';
import { createColorFeatures } from './scoringV6Engine.js';
import {
  getConditionRewardBand,
  getRollRarityV6,
  interpolateProbabilityReward,
  getVariationBps
} from './scoringV6Spec.js';

export const ACTIVE_SCORE_MODEL_VERSION = GENERATED_SCORE_MODEL_V6_VERSION;

function clampAwardedPoints(points, band) {
  const minimum = band.bandMin;
  const maximum = band.bandMax === null ? Number.POSITIVE_INFINITY : band.bandMax;
  return Math.min(maximum, Math.max(minimum, points));
}

function stripCatalogOnlyFields(condition) {
  const presentation = { ...condition };
  delete presentation.predicate;
  delete presentation.active;
  delete presentation.exclusiveGroup;
  delete presentation.exclusiveRank;
  return presentation;
}

export function getV6ManifestEntry(conditionId) {
  return GENERATED_V6_MANIFEST_BY_ID[conditionId] || null;
}

export function resolveConditionRewardV6(condition, red, green, blue) {
  const measured = getV6ManifestEntry(condition.id);
  if (!measured) throw new Error(`Unknown v6 condition: ${condition.id}`);

  const conditionRarity = measured.rarity;
  const band = getConditionRewardBand(conditionRarity);
  const probability = Number(measured.probability);
  const probabilityReward = Number(measured.probabilityReward)
    || interpolateProbabilityReward(probability, conditionRarity);
  const semanticBonus = Number(measured.semanticBonus);
  const rewardStrength = 1 + semanticBonus;
  const basePoints = Math.max(1, Math.round(probabilityReward * rewardStrength));
  const variationBps = getVariationBps(red, green, blue, condition.id);
  const variedPoints = Math.round(basePoints * (10000 + variationBps) / 10000);
  const awardedPoints = clampAwardedPoints(variedPoints, band);

  return {
    ...stripCatalogOnlyFields(condition),
    conditionRarity,
    matchCount: measured.matchCount,
    probability,
    expectedRolls: measured.expectedRolls,
    probabilityReward,
    semanticBonus,
    points: basePoints,
    basePoints,
    awardedPoints,
    rewardStrength,
    multiplier: 1,
    variationBps
  };
}

function saturationLabel(saturation) {
  if (saturation >= 95) return 'Electric';
  if (saturation >= 70) return 'Vivid';
  if (saturation >= 40) return 'Rich';
  if (saturation >= 15) return 'Muted';
  return 'Soft';
}

function lightnessLabel(lightness) {
  if (lightness < 15) return 'Shadow';
  if (lightness < 35) return 'Deep';
  if (lightness < 65) return 'Balanced';
  if (lightness < 85) return 'Bright';
  return 'Luminous';
}

function buildTraits(features) {
  const family = features.hueFamily;
  const saturation = saturationLabel(features.hsl.saturation);
  const lightness = lightnessLabel(features.hsl.lightness);
  const temperature = features.red === features.green && features.green === features.blue
    ? 'Neutral'
    : features.red >= features.blue ? 'Warm' : 'Cool';
  const structure = features.range <= 20
    ? 'Smooth'
    : features.range >= 205 ? 'Polarized' : 'Layered';

  return [
    { id: `hue_${family.toLowerCase()}`, label: `${family} Hue`, group: 'hue' },
    { id: `saturation_${saturation.toLowerCase()}`, label: `${saturation} Saturation`, group: 'saturation' },
    { id: `lightness_${lightness.toLowerCase()}`, label: `${lightness} Lightness`, group: 'lightness' },
    {
      id: `temperature_${temperature.toLowerCase()}`,
      label: `${temperature} Temperature`,
      group: 'temperature'
    },
    {
      id: `structure_${structure.toLowerCase()}`,
      label: `${structure} Structure`,
      group: 'structure'
    }
  ];
}

export function scoreCandidateColorV6(red, green, blue) {
  const features = createColorFeatures(red, green, blue);
  const conditions = evaluateGeneratedV6Conditions(red, green, blue)
    .map(condition => resolveConditionRewardV6(condition, red, green, blue));
  const contributors = [...conditions]
    .sort((left, right) => right.awardedPoints - left.awardedPoints || left.id.localeCompare(right.id));
  const score = contributors.reduce((total, condition) => total + condition.awardedPoints, 0);
  const conditionRarity = Object.fromEntries(conditions.map(condition => [condition.id, condition.conditionRarity]));
  const basePoints = Object.fromEntries(conditions.map(condition => [condition.id, condition.basePoints]));
  const awardedPoints = Object.fromEntries(conditions.map(condition => [condition.id, condition.awardedPoints]));

  return {
    scoreVersion: ACTIVE_SCORE_MODEL_VERSION,
    score_version: ACTIVE_SCORE_MODEL_VERSION,
    red,
    green,
    blue,
    hex: `#${features.hex}`,
    hsl: features.hsl,
    identity: `${lightnessLabel(features.hsl.lightness)} ${saturationLabel(features.hsl.saturation)} ${features.hueFamily}`,
    score,
    rarity: getRollRarityV6(score),
    conditions,
    conditionIds: conditions.map(condition => condition.id),
    conditionRarity,
    basePoints,
    awardedPoints,
    contributors,
    traits: buildTraits(features)
  };
}

export const resolveConditionReward = resolveConditionRewardV6;
