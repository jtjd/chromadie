import { readProgressionManifest, progressionRowValue } from './progression-manifest.mjs';
import { simulateBalance } from './simulate-balance.mjs';

const LONG_TERM_GOALS = Object.freeze({
  journey_roll_730: 730,
  journey_roll_1095: 1095
});

const DISCOVERY_BALANCE = Object.freeze({
  rarity_rare: { type: 'rarity', key: 'Rare' },
  roll_prime: { type: 'condition', key: 'prime_sum' },
  rarity_epic: { type: 'rarity', key: 'Epic' },
  high_contrast: { type: 'condition', key: 'high_contrast' },
  mythic_roll: { type: 'rarity', key: 'Mythic' },
  rarity_anomaly: { type: 'rarity', key: 'Anomaly' },
  roll_palindrome: { type: 'condition', key: 'palindrome' },
  greyscale: { type: 'condition', key: 'greyscale' }
});

const PACE_BANDS = new Set(['days', 'weeks', 'months', 'years']);
const MAX_PUBLISHED_EXPECTED_ROLLS = 10_000;

function fail(message) {
  console.error(`Progression balance drift detected: ${message}`);
  process.exit(1);
}

function numberValue(row, key) {
  const value = progressionRowValue(row, key);
  return value === null || value === undefined || value === '' ? null : Number(value);
}

function isPublished(row) {
  return progressionRowValue(row, 'published', true) !== false;
}

function expectedRollsForGoal(report, achievementId) {
  const balance = DISCOVERY_BALANCE[achievementId];
  if (!balance) return null;
  const result = balance.type === 'rarity'
    ? report.rarities[balance.key]
    : report.conditions[balance.key];
  return result?.expectedRolls || null;
}

function compareNumbers(left, right, tolerance = 0.25) {
  if (!Number.isFinite(left) || !Number.isFinite(right) || right <= 0) return false;
  return Math.abs(left - right) / right <= tolerance;
}

const manifest = await readProgressionManifest();
const byId = new Map(manifest.map(row => [row.id, row]));
const failures = [];

for (const [id, target] of Object.entries(LONG_TERM_GOALS)) {
  const goal = byId.get(id);
  if (!goal) {
    failures.push(`${id} is missing`);
    continue;
  }
  if (!isPublished(goal)) failures.push(`${id} must remain published`);
  if (goal.track !== 'ritual') failures.push(`${id} must use the ritual track`);
  if (goal.metric !== 'achievement') failures.push(`${id} must use achievement eligibility`);
  if (goal.achievement_id !== null) {
    failures.push(`${id} must not depend on an achievement row`);
  }
  if (goal.progress_source !== 'total_rolls') failures.push(`${id} must use total_rolls progress`);
  if (numberValue(goal, 'progress_target') !== target) failures.push(`${id} must target ${target} total rolls`);
}

const greyscale = byId.get('journey_greyscale');
if (!greyscale) failures.push('journey_greyscale must remain in the manifest as a historical goal');
else if (isPublished(greyscale)) failures.push('journey_greyscale must be retired from the published journey');

const publishedRitual = manifest
  .filter(row => row.track === 'ritual' && isPublished(row))
  .sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0));
const deterministicTargets = publishedRitual
  .filter(row => ['total_rolls', 'longest_streak'].includes(row.progress_source));
for (let index = 1; index < deterministicTargets.length; index += 1) {
  const previous = numberValue(deterministicTargets[index - 1], 'progress_target');
  const current = numberValue(deterministicTargets[index], 'progress_target');
  if (previous === null || current === null || current < previous) {
    failures.push(
      `ritual order must follow deterministic time targets: ${deterministicTargets[index - 1]?.id} -> ${deterministicTargets[index]?.id}`
    );
    break;
  }
}
if (publishedRitual.some(row => row.progress_source === 'current_streak')) {
  failures.push('published ritual goals must use longest_streak instead of resettable current_streak');
}

const report = simulateBalance({ exhaustive: true });
const publishedDiscovery = manifest
  .filter(row => row.track === 'discovery' && isPublished(row))
  .sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0));
const measuredDiscovery = [];

for (const goal of publishedDiscovery) {
  const achievementId = progressionRowValue(goal, 'achievement_id');
  const expected = expectedRollsForGoal(report, achievementId);
  if (!expected) {
    failures.push(`${goal.id} has no measurable balance condition for ${achievementId}`);
    continue;
  }

  const declared = numberValue(goal, 'expected_rolls');
  if (!Number.isFinite(declared) || declared <= 0) {
    failures.push(`${goal.id} must declare positive expected_rolls metadata`);
  } else {
    if (!compareNumbers(declared, expected)) {
      failures.push(`${goal.id} declares ${declared} expected rolls; exhaustive model measures ${expected.toFixed(2)}`);
    }
    if (declared > MAX_PUBLISHED_EXPECTED_ROLLS) {
      failures.push(`${goal.id} is outside the published discovery pacing ceiling (${declared} > ${MAX_PUBLISHED_EXPECTED_ROLLS})`);
    }
  }

  const paceBand = progressionRowValue(goal, 'pace_band');
  if (paceBand !== undefined && paceBand !== null && !PACE_BANDS.has(paceBand)) {
    failures.push(`${goal.id} uses unknown pace_band ${JSON.stringify(paceBand)}`);
  }
  measuredDiscovery.push({ goal, expected });
}

for (let index = 1; index < measuredDiscovery.length; index += 1) {
  if (measuredDiscovery[index].expected < measuredDiscovery[index - 1].expected) {
    failures.push(
      `Discovery order is not probability-aware: ${measuredDiscovery[index - 1].goal.id} must follow ${measuredDiscovery[index].goal.id}`
    );
  }
}

const mythicIndex = publishedDiscovery.findIndex(row => row.achievement_id === 'mythic_roll');
const anomalyIndex = publishedDiscovery.findIndex(row => row.achievement_id === 'rarity_anomaly');
if (mythicIndex === -1 || anomalyIndex === -1 || mythicIndex >= anomalyIndex) {
  failures.push('Mythic must precede Anomaly in the published Discovery journey');
}

if (failures.length) {
  console.error(failures.map(message => `  - ${message}`).join('\n'));
  console.error(
    `Measured Discovery model: ${measuredDiscovery.map(({ goal, expected }) => `${goal.id}=${expected.toFixed(2)}`).join(', ') || 'none'}`
  );
  fail('the authored journey no longer matches the exhaustive color model');
}

console.log(
  `Progression balance check passed: ${publishedRitual.length} published Ritual goals, ` +
  `${publishedDiscovery.length} published Discovery goals, ` +
  `Mythic before Anomaly, Greyscale retired, and long-term goals at 730/1,095 rolls.`
);
console.log(
  `Discovery expected rolls: ${measuredDiscovery.map(({ goal, expected }) => `${goal.id} ${expected.toFixed(2)}`).join('; ')}`
);
