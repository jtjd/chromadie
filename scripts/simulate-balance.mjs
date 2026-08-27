import { scoreColor } from '../src/lib/scoring.js';
import { getConditionRewardBand } from '../src/lib/balanceConfig.js';
import { scoreCandidateColorV6, ACTIVE_SCORE_MODEL_VERSION } from '../src/lib/scoringV6.js';
import v6BalanceFixture from '../src/lib/generated/scoringV6BalanceFixture.json' with { type: 'json' };

const DEFAULT_ROLLS = 1_000_000;
const DEFAULT_SEED = 0x4348524f;
const ACTIVE_RARITY_ORDER = ['Trash', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Anomaly'];
const LEGACY_RARITY_ORDER = ['Trash', 'Common', 'Uncommon', 'Rare', 'Epic', 'Anomaly', 'Mythic'];

function readIntegerFlag(name, fallback) {
  const argument = process.argv.find(value => value.startsWith(`--${name}=`));
  if (!argument) return fallback;
  const parsed = Number(argument.slice(name.length + 3));
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`--${name} must be a positive integer.`);
  }
  return parsed;
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

export function simulateBalance({
  rolls = DEFAULT_ROLLS,
  seed = DEFAULT_SEED,
  legacy = false,
  exhaustive = false
} = {}) {
  if (exhaustive && !legacy) return reportFromExhaustiveFixture(seed);
  if (exhaustive) rolls = 256 ** 3;
  const random = createRandom(seed);
  const scorer = legacy ? scoreColor : scoreCandidateColorV6;
  const rarityOrder = legacy ? LEGACY_RARITY_ORDER : ACTIVE_RARITY_ORDER;
  const rarities = Object.fromEntries(rarityOrder.map(rarity => [rarity, 0]));
  const conditions = new Map();
  const conditionRarities = new Map();
  const conditionSets = exhaustive ? null : new Map();
  const scoreValues = new Uint32Array(rolls);
  let totalScore = 0;
  let totalConditions = 0;
  let f1Rolls = 0;
  let totalContributors = 0;
  let minScore = Number.POSITIVE_INFINITY;
  let maxScore = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < rolls; index += 1) {
    const result = exhaustive
      ? scorer((index >>> 16) & 255, (index >>> 8) & 255, index & 255)
      : scorer(
          Math.floor(random() * 256),
          Math.floor(random() * 256),
          Math.floor(random() * 256)
        );
    scoreValues[index] = result.score;
    rarities[result.rarity] += 1;
    totalScore += result.score;
    minScore = Math.min(minScore, result.score);
    maxScore = Math.max(maxScore, result.score);
    const conditionIds = legacy ? result.badges : result.conditions.map(condition => condition.id);
    totalConditions += conditionIds.length;
    totalContributors += legacy ? result.badges.length : result.contributors.length;
    for (const conditionId of conditionIds) {
      conditions.set(conditionId, (conditions.get(conditionId) || 0) + 1);
    }
    if (!legacy) {
      for (const condition of result.conditions) {
        conditionRarities.set(condition.id, condition.conditionRarity || 'Common');
      }
      for (const contributor of result.contributors) {
        const band = getConditionRewardBand(contributor.conditionRarity);
        if (contributor.awardedPoints < band.minPoints || (band.maxPoints !== null && contributor.awardedPoints > band.maxPoints)) {
          throw new Error(
            `${contributor.id} awarded ${contributor.awardedPoints} outside its ${contributor.conditionRarity} reward band`
          );
        }
      }
    }
    if (conditionSets) {
      const key = conditionIds.join('|');
      if (conditionSets.has(key) || conditionSets.size < 200000) {
        conditionSets.set(key, (conditionSets.get(key) || 0) + 1);
      }
    }
    if (conditionIds.includes('f1')) f1Rolls += 1;
  }

  const conditionDistribution = Object.fromEntries(
    [...conditions.keys()].sort().map(conditionId => {
      const count = conditions.get(conditionId);
      const frequency = count / rolls;
      return [conditionId, {
        count,
        frequency,
        expectedRolls: frequency > 0 ? 1 / frequency : null,
        conditionRarity: conditionRarities.get(conditionId) || null
      }];
    })
  );

  scoreValues.sort();
  const percentile = fraction => scoreValues[Math.min(
    scoreValues.length - 1,
    Math.max(0, Math.floor((scoreValues.length - 1) * fraction))
  )];
  const topConditionSets = conditionSets
    ? [...conditionSets.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 20)
      .map(([key, count]) => ({ key, count, frequency: count / rolls }))
    : [];

  return {
    rolls,
    seed,
    model: legacy ? 'legacy' : 'v6',
    exhaustive,
    minScore,
    maxScore,
    averageScore: totalScore / rolls,
    averageConditions: totalConditions / rolls,
    averageContributors: totalContributors / rolls,
    f1Frequency: f1Rolls / rolls,
    scoreVersion: legacy ? 1 : ACTIVE_SCORE_MODEL_VERSION,
    percentiles: {
      p01: percentile(0.01),
      p50: percentile(0.5),
      p75: percentile(0.75),
      p90: percentile(0.9),
      p97: percentile(0.97),
      p98: percentile(0.98),
      p986: percentile(0.986),
      p99: percentile(0.99),
      p996: percentile(0.996),
      p999: percentile(0.999),
      p9999: percentile(0.9999)
    },
    conditions: conditionDistribution,
    topConditionSets,
    rarities: Object.fromEntries(
      rarityOrder.map(rarity => [rarity, {
        count: rarities[rarity],
        frequency: rarities[rarity] / rolls,
        expectedRolls: rarities[rarity] > 0 ? rolls / rarities[rarity] : null
      }])
    )
  };
}

function reportFromExhaustiveFixture(seed) {
  const rarityOrder = ACTIVE_RARITY_ORDER;
  const conditions = Object.fromEntries(Object.entries(v6BalanceFixture.conditions).map(([id, value]) => [id, {
    count: value.count,
    frequency: value.frequency,
    expectedRolls: value.expectedRolls,
    conditionRarity: value.rarity
  }]));
  return {
    rolls: v6BalanceFixture.rgbColorCount,
    seed,
    model: 'v6',
    exhaustive: true,
    minScore: v6BalanceFixture.scoreSpread.min,
    maxScore: v6BalanceFixture.scoreSpread.max,
    averageScore: v6BalanceFixture.scoreSpread.mean,
    averageConditions: v6BalanceFixture.conditionTotals.average,
    averageContributors: v6BalanceFixture.conditionTotals.average,
    f1Frequency: conditions.f1?.frequency || 0,
    scoreVersion: ACTIVE_SCORE_MODEL_VERSION,
    percentiles: v6BalanceFixture.scoreSpread.percentiles,
    conditions,
    topConditionSets: [],
    rarities: Object.fromEntries(rarityOrder.map(rarity => [rarity, v6BalanceFixture.rarities[rarity]]))
  };
}

function printReport(report) {
  console.log(
    `Balance simulation: ${report.rolls.toLocaleString()} rolls ` +
      `(model ${report.model}, seed ${report.seed})`
  );
  console.log(`Observed score range: ${report.minScore.toLocaleString()} – ${report.maxScore.toLocaleString()}`);
  console.log(`Average score: ${report.averageScore.toFixed(2)} EP`);
  console.log(`Average conditions: ${report.averageConditions.toFixed(3)}`);
  console.log(`Average scoring contributors: ${report.averageContributors.toFixed(3)}`);
  console.log(`F1 frequency: ${(report.f1Frequency * 100).toFixed(3)}%`);
  console.log('Rarity distribution:');
  for (const rarity of Object.keys(report.rarities)) {
    const result = report.rarities[rarity];
    console.log(
      `  ${rarity.padEnd(9)} ${result.count.toLocaleString().padStart(10)} ` +
      `(${(result.frequency * 100).toFixed(3)}%)`
    );
  }
  console.log('Tracked condition frequencies:');
  for (const [conditionId, result] of Object.entries(report.conditions)) {
    if (!['high_contrast', 'greyscale', 'palindrome', 'prime_sum', 'repeated_pair', 'saturation_spike'].includes(conditionId)) continue;
    console.log(
      `  ${conditionId.padEnd(18)} ${result.count.toLocaleString().padStart(10)} ` +
      `(${(result.frequency * 100).toFixed(3)}%; expected ${result.expectedRolls?.toFixed(1) || 'never'} rolls)`
    );
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const report = simulateBalance({
    rolls: readIntegerFlag('rolls', DEFAULT_ROLLS),
    seed: readIntegerFlag('seed', DEFAULT_SEED),
    legacy: process.argv.includes('--legacy'),
    exhaustive: process.argv.includes('--exhaustive')
  });
  if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else printReport(report);
}
