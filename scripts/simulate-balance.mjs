import { scoreColor } from '../src/lib/scoring.js';
import { scoreCandidateColor } from '../src/lib/scoringCandidate.js';

const DEFAULT_ROLLS = 1_000_000;
const DEFAULT_SEED = 0x4348524f;
const rarityOrder = ['Trash', 'Common', 'Uncommon', 'Rare', 'Epic', 'Anomaly', 'Mythic'];

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
  if (exhaustive) rolls = 256 ** 3;
  const random = createRandom(seed);
  const scorer = legacy ? scoreColor : scoreCandidateColor;
  const rarities = Object.fromEntries(rarityOrder.map(rarity => [rarity, 0]));
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
    rarities[result.rarity] += 1;
    totalScore += result.score;
    minScore = Math.min(minScore, result.score);
    maxScore = Math.max(maxScore, result.score);
    const conditionIds = legacy ? result.badges : result.conditions.map(condition => condition.id);
    totalConditions += conditionIds.length;
    totalContributors += legacy ? result.badges.length : result.contributors.length;
    if (conditionIds.includes('f1')) f1Rolls += 1;
  }

  return {
    rolls,
    seed,
    model: legacy ? 'legacy' : 'current',
    exhaustive,
    minScore,
    maxScore,
    averageScore: totalScore / rolls,
    averageConditions: totalConditions / rolls,
    averageContributors: totalContributors / rolls,
    f1Frequency: f1Rolls / rolls,
    rarities: Object.fromEntries(
      rarityOrder.map(rarity => [rarity, {
        count: rarities[rarity],
        frequency: rarities[rarity] / rolls
      }])
    )
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
  for (const rarity of rarityOrder) {
    const result = report.rarities[rarity];
    console.log(
      `  ${rarity.padEnd(9)} ${result.count.toLocaleString().padStart(10)} ` +
        `(${(result.frequency * 100).toFixed(3)}%)`
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
