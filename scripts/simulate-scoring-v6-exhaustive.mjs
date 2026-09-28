import { availableParallelism } from 'node:os';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';

import { ACTIVE_V6_CONDITIONS } from '../src/lib/conditionCatalogV6.js';
import { RANKS } from '../src/lib/rankConfig.js';
import { rollScoreToEp } from '../src/lib/rollEp.js';
import { evaluateCatalogConditionIndexes } from '../src/lib/scoringV6Engine.js';
import { GENERATED_V6_MANIFEST_BY_ID } from '../src/lib/generated/scoringV6.generated.js';
import {
  CONDITION_REWARD_BANDS,
  RGB_COLOR_COUNT,
  ROLL_RARITY_THRESHOLDS,
  SCORE_MODEL_V6_VERSION,
  SCORE_THRESHOLD_ROUNDING,
  V5_MEAN_SCORE,
  getRollRarityV6,
  scaleV5Threshold
} from '../src/lib/scoringV6Spec.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const fixturePath = path.join(repoRoot, 'src/lib/generated/scoringV6BalanceFixture.json');
const hasCheckFlag = process.argv.includes('--check');

const V5_SCORE_ACHIEVEMENT_THRESHOLDS = Object.freeze({
  score_50k: 50_000,
  score_100k: 100_000,
  score_200k: 200_000,
  score_1_5m: 1_500_000
});

const manifestById = GENERATED_V6_MANIFEST_BY_ID;
const rewardBandByName = new Map(CONDITION_REWARD_BANDS.map(band => [band.name, band]));
const resolvedMetadata = ACTIVE_V6_CONDITIONS.map(condition => {
  const manifest = manifestById[condition.id];
  if (!manifest) throw new Error(`Missing generated v6 manifest entry for ${condition.id}`);
  const band = rewardBandByName.get(manifest.rarity);
  const basePoints = Math.max(1, Math.round(manifest.probabilityReward * (1 + manifest.semanticBonus)));
  return { condition, manifest, band, basePoints };
});

function fnvAppend(hash, value) {
  let current = hash;
  for (let index = 0; index < value.length; index += 1) {
    current ^= value.charCodeAt(index);
    current = Math.imul(current, 0x01000193) >>> 0;
  }
  return current >>> 0;
}

function colorVariationPrefix(red, green, blue) {
  return fnvAppend(0x811c9dc5, `chromadie:v6:${red}:${green}:${blue}:`);
}

function variationFromPrefix(prefixHash, conditionId) {
  return (fnvAppend(prefixHash, conditionId) % 1_401) - 700;
}

function scoreRange(start, end) {
  const scores = new Float64Array(end - start);
  const conditionCounts = new Uint32Array(ACTIVE_V6_CONDITIONS.length);

  for (let packed = start; packed < end; packed += 1) {
    const red = (packed >>> 16) & 255;
    const green = (packed >>> 8) & 255;
    const blue = packed & 255;
    const prefixHash = colorVariationPrefix(red, green, blue);
    const selectedIndexes = evaluateCatalogConditionIndexes(red, green, blue, ACTIVE_V6_CONDITIONS);
    let score = 0;

    for (const index of selectedIndexes) {
      const { manifest, band, basePoints } = resolvedMetadata[index];
      const variationBps = variationFromPrefix(prefixHash, manifest.id);
      const variedPoints = Math.round(basePoints * (10000 + variationBps) / 10000);
      const awardedPoints = band.bandMax === null
        ? Math.max(band.bandMin, variedPoints)
        : Math.min(band.bandMax, Math.max(band.bandMin, variedPoints));
      if (score > Number.MAX_SAFE_INTEGER - awardedPoints) {
        throw new Error(`v6 score overflow at RGB(${red},${green},${blue})`);
      }
      score += awardedPoints;
      conditionCounts[index] += 1;
    }
    scores[packed - start] = score;
  }

  return { scores, conditionCounts };
}

function workerCount() {
  const requested = Number.parseInt(process.env.SCORING_V6_WORKERS || '', 10);
  return Number.isSafeInteger(requested) && requested > 0
    ? requested
    : Math.min(8, availableParallelism());
}

async function enumerateScores() {
  if (!isMainThread) return scoreRange(workerData.start, workerData.end);
  const count = workerCount();
  if (count <= 1) return scoreRange(0, RGB_COLOR_COUNT);

  const chunkSize = Math.ceil(RGB_COLOR_COUNT / count);
  const ranges = [];
  for (let start = 0; start < RGB_COLOR_COUNT; start += chunkSize) {
    ranges.push({ start, end: Math.min(RGB_COLOR_COUNT, start + chunkSize) });
  }

  const results = await Promise.all(ranges.map(range => new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./simulate-scoring-v6-exhaustive.mjs', import.meta.url), { workerData: range });
    worker.once('message', message => resolve({
      scores: new Float64Array(message.scores),
      conditionCounts: new Uint32Array(message.conditionCounts)
    }));
    worker.once('error', reject);
    worker.once('exit', code => {
      if (code !== 0) reject(new Error(`v6 balance worker exited with code ${code}`));
    });
  })));

  const scores = new Float64Array(RGB_COLOR_COUNT);
  const conditionCounts = new Uint32Array(ACTIVE_V6_CONDITIONS.length);
  let offset = 0;
  for (const result of results) {
    scores.set(result.scores, offset);
    offset += result.scores.length;
    for (let index = 0; index < conditionCounts.length; index += 1) {
      conditionCounts[index] += result.conditionCounts[index];
    }
  }
  return { scores, conditionCounts };
}

function percentile(sortedScores, fraction) {
  return sortedScores[Math.min(
    sortedScores.length - 1,
    Math.max(0, Math.floor((sortedScores.length - 1) * fraction))
  )];
}

function buildFixture({ scores, conditionCounts }) {
  scores.sort();
  let totalScore = 0;
  let totalRollEp = 0;
  const rarities = Object.fromEntries(ROLL_RARITY_THRESHOLDS.map(tier => [tier.name, 0]));
  for (const score of scores) {
    totalScore += score;
    totalRollEp += rollScoreToEp(score);
    rarities[getRollRarityV6(score)] += 1;
  }

  const conditionFamilies = {};
  const conditions = Object.fromEntries(resolvedMetadata.map(({ condition, manifest }, index) => {
    const count = conditionCounts[index];
    conditionFamilies[condition.category] = (conditionFamilies[condition.category] || 0) + count;
    return [condition.id, {
      count,
      frequency: count / RGB_COLOR_COUNT,
      expectedRolls: manifest.expectedRolls,
      rarity: manifest.rarity,
      family: condition.category
    }];
  }));

  const mean = totalScore / RGB_COLOR_COUNT;
  const scoreAchievementThresholds = Object.fromEntries(
    Object.entries(V5_SCORE_ACHIEVEMENT_THRESHOLDS).map(([id, threshold]) => [id, scaleV5Threshold(threshold, mean)])
  );
  const rankThresholds = Object.fromEntries(RANKS.slice(1).map(({ name, min }) => [name, min]));
  const rollEpMean = totalRollEp / RGB_COLOR_COUNT;
  const epAt = fraction => rollScoreToEp(percentile(scores, fraction));
  // Fixed-seed whole-journey samples retain the heavy tail that a mean-only
  // pacing estimate hides. Sample roll-only and bonus-aware journeys separately.
  let randomState = 0x6c6f6c;
  const rankSamples = Object.fromEntries(RANKS.slice(1).map(rank => [rank.name, []]));
  for (let journey = 0; journey < 10_000; journey += 1) {
    let ep = 0;
    let day = 0;
    for (const rank of RANKS.slice(1)) {
      while (ep < rank.min) {
        randomState ^= randomState << 13;
        randomState ^= randomState >>> 17;
        randomState ^= randomState << 5;
        ep += rollScoreToEp(scores[randomState >>> 8 & 0xffffff]);
        day += 1;
      }
      rankSamples[rank.name].push(day);
    }
  }
  const rankDailyRolls = Object.fromEntries(Object.entries(rankSamples).map(([name, days]) => {
    days.sort((a, b) => a - b);
    return [name, { p10: percentile(days, 0.1), median: percentile(days, 0.5), p90: percentile(days, 0.9) }];
  }));
  const bonusRankSamples = Object.fromEntries(RANKS.slice(1).map(rank => [rank.name, []]));
  randomState = 0x626f6e75;
  const nextRandom = () => {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return randomState >>> 0;
  };
  for (let journey = 0; journey < 10_000; journey += 1) {
    let ep = 0;
    let day = 0;
    let best = 0;
    const awarded = new Set();
    for (const rank of RANKS.slice(1)) {
      while (ep < rank.min) {
        const score = scores[(nextRandom() >>> 8) & 0xffffff];
        day += 1;
        ep += rollScoreToEp(score);
        if (score > best) { ep += 50_000; best = score; }
        if (day % 7 === 0) ep += 50_000;
        if (nextRandom() / 0x100000000 < 0.0312) ep += 50_000;
        for (const [at, award] of [[1, 5_000], [10, 25_000], [50, 100_000], [100, 250_000], [365, 1_000_000]]) {
          if (day === at) ep += award;
        }
        for (const [at, award] of [[7, 50_000], [14, 100_000], [30, 250_000], [100, 750_000]]) {
          if (day === at) ep += award;
        }
        const rarity = getRollRarityV6(score);
        for (const [name, award] of [['Rare', 25_000], ['Epic', 100_000], ['Legendary', 250_000], ['Anomaly', 500_000]]) {
          if (rarity === name && !awarded.has(`rarity:${name}`)) {
            ep += award;
            awarded.add(`rarity:${name}`);
          }
        }
        for (const [id, award] of [['score_50k', 25_000], ['score_100k', 100_000], ['score_200k', 250_000], ['score_1_5m', 500_000]]) {
          if (score >= scoreAchievementThresholds[id] && !awarded.has(id)) {
            ep += award;
            awarded.add(id);
          }
        }
      }
      bonusRankSamples[rank.name].push(day);
    }
  }
  const rankDailyRollsWithBonuses = Object.fromEntries(Object.entries(bonusRankSamples).map(([name, days]) => {
    days.sort((a, b) => a - b);
    return [name, { p10: percentile(days, 0.1), median: percentile(days, 0.5), p90: percentile(days, 0.9) }];
  }));

  return {
    scoreModelVersion: SCORE_MODEL_V6_VERSION,
    rgbColorCount: RGB_COLOR_COUNT,
    v5MeanScore: V5_MEAN_SCORE,
    scoreSpread: {
      min: scores[0],
      max: scores.at(-1),
      mean,
      median: percentile(scores, 0.5),
      percentiles: {
        p01: percentile(scores, 0.01),
        p50: percentile(scores, 0.5),
        p75: percentile(scores, 0.75),
        p90: percentile(scores, 0.90),
        p97: percentile(scores, 0.97),
        p98: percentile(scores, 0.98),
        p986: percentile(scores, 0.986),
        p99: percentile(scores, 0.99),
        p996: percentile(scores, 0.996),
        p999: percentile(scores, 0.999),
        p9999: percentile(scores, 0.9999)
      }
    },
    rollEpSpread: {
      min: rollScoreToEp(scores[0]),
      max: rollScoreToEp(scores.at(-1)),
      mean: rollEpMean,
      median: epAt(0.5),
      percentiles: {
        p75: epAt(0.75), p90: epAt(0.90), p97: epAt(0.97),
        p99: epAt(0.99), p999: epAt(0.999), p9999: epAt(0.9999)
      }
    },
    conditionTotals: {
      average: Object.values(conditionCounts).reduce((total, count) => total + count, 0) / RGB_COLOR_COUNT,
      families: conditionFamilies
    },
    rarities: Object.fromEntries(Object.entries(rarities).map(([name, count]) => [name, {
      count,
      frequency: count / RGB_COLOR_COUNT,
      expectedRolls: count > 0 ? RGB_COLOR_COUNT / count : null
    }])),
    conditions,
    progression: {
      rankThresholds,
      rankDailyRolls,
      rankDailyRollsWithBonuses,
      scoreAchievementThresholds,
      discoveryExpectedRolls: Object.fromEntries(
        resolvedMetadata
          .filter(({ manifest }) => manifest.expectedRolls <= 1_000_000_000)
          .map(({ condition, manifest }) => [condition.id, manifest.expectedRolls])
      ),
      thresholdRounding: SCORE_THRESHOLD_ROUNDING
    }
  };
}

async function main() {
  const result = await enumerateScores();
  if (!isMainThread) {
    parentPort.postMessage({
      scores: result.scores.buffer,
      conditionCounts: result.conditionCounts.buffer
    }, [result.scores.buffer, result.conditionCounts.buffer]);
    return;
  }

  const fixture = JSON.stringify(buildFixture(result), null, 2) + '\n';
  if (hasCheckFlag) {
    const existing = await readFile(fixturePath, 'utf8').catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (existing !== fixture) throw new Error(`${path.relative(repoRoot, fixturePath)} is stale; regenerate the exhaustive fixture`);
    console.log(`Scoring v6 exhaustive balance fixture is current (${RGB_COLOR_COUNT.toLocaleString()} colors).`);
    return;
  }
  await writeFile(fixturePath, fixture, 'utf8');
  console.log(`Scoring v6 exhaustive balance fixture generated (${RGB_COLOR_COUNT.toLocaleString()} colors).`);
  console.log(JSON.stringify(fixtureSummary(fixture), null, 2));
}

function fixtureSummary(serialized) {
  const fixture = JSON.parse(serialized);
  return {
    mean: fixture.scoreSpread.mean,
    rollEpSpread: fixture.rollEpSpread,
    min: fixture.scoreSpread.min,
    max: fixture.scoreSpread.max,
    percentiles: fixture.scoreSpread.percentiles,
    rarities: fixture.rarities,
    rankThresholds: fixture.progression.rankThresholds,
    rankDailyRolls: fixture.progression.rankDailyRolls,
    rankDailyRollsWithBonuses: fixture.progression.rankDailyRollsWithBonuses,
    scoreAchievementThresholds: fixture.progression.scoreAchievementThresholds
  };
}

if (!isMainThread) {
  main().catch(error => {
    parentPort.postMessage({ error: error.stack || error.message || String(error) });
    process.exitCode = 1;
  });
} else if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}

export { buildFixture, scoreRange };
