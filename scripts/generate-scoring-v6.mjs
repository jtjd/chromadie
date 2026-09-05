import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';

import {
  ACTIVE_V6_CONDITIONS,
  V6_COMBINATION_CONDITIONS
} from '../src/lib/conditionCatalogV6.js';
import {
  evaluateCatalogConditionIndexes
} from '../src/lib/scoringV6Engine.js';
import {
  CONDITION_REWARD_BANDS,
  CONDITION_PROBABILITY_TIERS,
  RGB_COLOR_COUNT,
  SCORE_MODEL_V6_VERSION,
  getConditionRarityFromProbability,
  getSemanticBonus,
  interpolateProbabilityReward
} from '../src/lib/scoringV6Spec.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const generatedClientPath = path.join(repoRoot, 'src/lib/generated/scoringV6.generated.js');
const generatedPresentationPath = path.join(repoRoot, 'src/lib/generated/scoringV6Presentation.generated.js');
const generatedManifestPath = path.join(repoRoot, 'src/lib/generated/scoringV6ProbabilityManifest.json');
const generatedSqlPath = path.join(repoRoot, 'supabase/generated/scoringV6Evaluator.sql');
// The original v6 migration is deployed history. Later catalog changes are
// emitted as forward-only replacements so stored roll outcomes keep their
// original interpretation.
const generatedMigrationPath = path.join(repoRoot, 'supabase/migrations/20260831110000_score_model_v6_bee_catalog.sql');

const hasCheckFlag = process.argv.includes('--check');
const hasJsonFlag = process.argv.includes('--json');
const shouldPrintProgress = !hasJsonFlag && process.env.CI !== 'true';

function fail(message) {
  throw new Error(`Scoring v6 generation failed: ${message}`);
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function jsonNumber(value) {
  if (!Number.isFinite(value)) fail(`non-finite generated number ${value}`);
  return Number(value.toPrecision(17));
}

function compareSql(expression, op, value) {
  if (Array.isArray(value)) {
    if (op === 'gtLt') return `(${expression} > ${value[0]} AND ${expression} < ${value[1]})`;
    if (op === 'gteLt') return `(${expression} >= ${value[0]} AND ${expression} < ${value[1]})`;
  }
  const operator = {
    eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<='
  }[op];
  if (!operator) fail(`unsupported SQL comparison ${op}`);
  return `${expression} ${operator} ${Array.isArray(value) ? value.join(',') : value}`;
}

function channelSql(channel) {
  return ({ r: 'p_r', g: 'p_g', b: 'p_b' })[channel] || fail(`unknown channel ${channel}`);
}

function channelOperationSql(channel, predicate) {
  const value = channelSql(channel);
  switch (predicate.operation) {
    case 'parity': return predicate.value === 'even' ? `${value} % 2 = 0` : `${value} % 2 <> 0`;
    case 'divisibleBy': return `${value} % ${predicate.value} = 0`;
    case 'inSet': return `(${predicate.values.map(item => `${value} = ${item}`).join(' OR ')})`;
    case 'equals': return `${value} = ${predicate.value}`;
    case 'edge': return `(${value} <= 8 OR ${value} >= 247)`;
    case 'gte': return `${value} >= ${predicate.value}`;
    case 'lte': return `${value} <= ${predicate.value}`;
    case 'gt': return `${value} > ${predicate.value}`;
    case 'lt': return `${value} < ${predicate.value}`;
    case 'inRange': return `${value} BETWEEN ${predicate.min} AND ${predicate.max}`;
    default: return fail(`unsupported SQL channel operation ${predicate.operation}`);
  }
}

function hexPosition(index) {
  return `strpos('0123456789ABCDEF', substr(p_hex, ${index}, 1))`;
}

function hexRunSql(length) {
  const parts = [];
  for (let start = 1; start <= 7 - length; start += 1) {
    parts.push(`substr(p_hex, ${start}, ${length}) = repeat(substr(p_hex, ${start}, 1), ${length})`);
  }
  return `(${parts.join(' OR ')})`;
}

function hexMonotonicSql(direction, step = null) {
  const comparisons = [];
  for (let index = 2; index <= 6; index += 1) {
    const difference = `(${hexPosition(index)} - ${hexPosition(index - 1)})`;
    comparisons.push(step === null
      ? `${difference} ${direction === 'ascending' ? '>' : '<'} 0`
      : `${difference} = ${step}`);
  }
  return `(${comparisons.join(' AND ')})`;
}

function hslSql(predicate) {
  const expression = predicate.field === 'hue' ? 'p_hue' : predicate.field === 'saturation' ? 'p_saturation' : 'p_lightness';
  return compareSql(expression, predicate.op, predicate.value);
}

function predicateToSql(predicate) {
  switch (predicate.type) {
    case 'always': return 'true';
    case 'all': return `(${predicate.checks.map(predicateToSql).join(' AND ')})`;
    case 'any': return `(${predicate.checks.map(predicateToSql).join(' OR ')})`;
    case 'not': return `(NOT (${predicateToSql(predicate.check)}))`;
    case 'sumModulo': return `(p_sum % ${predicate.divisor} = ${predicate.remainder})`;
    case 'sumEquals': return `(p_sum = ${predicate.value})`;
    case 'sumBetween': return `(p_sum BETWEEN ${predicate.min} AND ${predicate.max})`;
    case 'sumSet': return `(${predicate.values.map(value => `p_sum = ${value}`).join(' OR ')})`;
    case 'sumPrime': return 'public.chromadie_v6_is_prime(p_sum)';
    case 'sumSquare': return 'public.chromadie_v6_is_square(p_sum)';
    case 'sumTriangular': return 'public.chromadie_v6_is_triangular(p_sum)';
    case 'sumFibonacci': return 'public.chromadie_v6_is_fibonacci(p_sum)';
    case 'channelsAll': return `(${['r', 'g', 'b'].map(channel => channelOperationSql(channel, predicate)).join(' AND ')})`;
    case 'channelsAny': return `(${['r', 'g', 'b'].map(channel => channelOperationSql(channel, predicate)).join(' OR ')})`;
    case 'channelCount': {
      const count = `(${['r', 'g', 'b'].map(channel => `(CASE WHEN ${channelOperationSql(channel, predicate)} THEN 1 ELSE 0 END)`).join(' + ')})`;
      return `(${compareSql(count, predicate.op, predicate.value)})`;
    }
    case 'channelExact': return `(p_r = ${predicate.red} AND p_g = ${predicate.green} AND p_b = ${predicate.blue})`;
    case 'channelRelation':
      if (predicate.relation === 'allEqual') return '(p_r = p_g AND p_g = p_b)';
      if (predicate.relation === 'hasEqualPair') return '(p_r = p_g OR p_g = p_b OR p_r = p_b)';
      if (predicate.relation === 'allDistinct') return '(p_r <> p_g AND p_g <> p_b AND p_r <> p_b)';
      if (predicate.relation === 'redGreenEqual') return '(p_r = p_g)';
      if (predicate.relation === 'greenBlueEqual') return '(p_g = p_b)';
      if (predicate.relation === 'redBlueEqual') return '(p_r = p_b)';
      if (predicate.relation === 'noUniqueDominant') return '(NOT (p_r > greatest(p_g, p_b) OR p_g > greatest(p_r, p_b) OR p_b > greatest(p_r, p_g)))';
      return fail(`unsupported SQL channel relation ${predicate.relation}`);
    case 'rangeCompare': return compareSql('p_range', predicate.op, predicate.value);
    case 'hslCompare': return hslSql(predicate);
    case 'hslAny': return `(${predicate.checks.map(hslSql).join(' OR ')})`;
    case 'hueFamily': return `(p_hue_family = ${sqlString(predicate.value)})`;
    case 'temperature':
      if (predicate.value === 'neutral') return '(p_r = p_g AND p_g = p_b)';
      if (predicate.value === 'warm') return '(NOT (p_r = p_g AND p_g = p_b) AND p_r >= p_b)';
      return '(NOT (p_r = p_g AND p_g = p_b) AND p_r < p_b)';
    case 'channelDominant': {
      const channel = channelSql(predicate.channel);
      const others = ['r', 'g', 'b'].filter(value => value !== predicate.channel).map(channelSql);
      return `(${channel} = greatest(p_r, p_g, p_b) AND ${channel} > ${others[0]} AND ${channel} > ${others[1]})`;
    }
    case 'channelOrder': {
      const values = predicate.order.map(channelSql);
      const comparisons = values.slice(1).map((value, index) => {
        const previous = values[index];
        const ascending = predicate.direction === 'ascending' || predicate.direction === 'nonDecreasing';
        const descending = predicate.direction === 'descending' || predicate.direction === 'nonIncreasing';
        if (!ascending && !descending) fail(`unsupported SQL channel direction ${predicate.direction}`);
        const operator = ascending ? '<' : '>';
        const inclusive = predicate.direction === 'nonDecreasing' || predicate.direction === 'nonIncreasing';
        return `${previous} ${operator}${inclusive ? '=' : ''} ${value}`;
      });
      return `(${comparisons.join(' AND ')})`;
    }
    case 'arithmeticProgression': return '((greatest(p_r, p_g, p_b) - least(p_r, p_g, p_b)) = 2 * (greatest(p_r, p_g, p_b) - (p_r + p_g + p_b - least(p_r, p_g, p_b) - greatest(p_r, p_g, p_b))))';
    case 'channelComplement': return `(${channelSql(predicate.first)} + ${channelSql(predicate.second)} = ${predicate.sum})`;
    case 'parityPattern': return `(${[...predicate.value].map((value, index) => `p_${['r', 'g', 'b'][index]} % 2 ${value === 'E' ? '=' : '<>'} 0`).join(' AND ')})`;
    case 'hexContains': return `(strpos(p_hex, ${sqlString(predicate.value)}) > 0)`;
    case 'hexContainsAll': return `(${predicate.values.map(value => `strpos(p_hex, ${sqlString(value)}) > 0`).join(' AND ')})`;
    case 'hexExact': return `(p_hex = ${sqlString(predicate.value)})`;
    case 'hexPalindrome': return '(p_hex = reverse(p_hex))';
    case 'hexByteEquality': return '(substr(p_hex, 1, 2) = substr(p_hex, 3, 2) AND substr(p_hex, 3, 2) = substr(p_hex, 5, 2))';
    case 'hexAllSame': return '(p_hex = repeat(substr(p_hex, 1, 1), 6))';
    case 'hexRun': return hexRunSql(predicate.length);
    case 'hexCharacterCount': return compareSql(predicate.class === 'letter' ? 'p_hex_letter_count' : 'p_hex_digit_count', predicate.op, predicate.value);
    case 'hexDigitSumPrime': return 'public.chromadie_v6_is_prime(p_hex_digit_sum)';
    case 'hexDigitSumSquare': return 'public.chromadie_v6_is_square(p_hex_digit_sum)';
    case 'hexBookends': return '(substr(p_hex, 1, 1) = substr(p_hex, 6, 1))';
    case 'byteBookends': return '(substr(p_hex, 1, 2) = substr(p_hex, 5, 2))';
    case 'hexMonotonic': return hexMonotonicSql(predicate.direction);
    case 'hexStep': return hexMonotonicSql(null, predicate.step);
    case 'hexUniqueCount': return compareSql('p_hex_unique_count', predicate.op, predicate.value);
    case 'combination': return `(${predicate.all.map(id => `(p_matched_ids ? ${sqlString(id)})`).join(' AND ')})`;
    default: return fail(`unsupported SQL predicate type ${predicate.type}`);
  }
}

function serializeCatalogEntry(entry) {
  return {
    id: entry.id,
    name: entry.name,
    category: entry.category,
    predicate: entry.predicate,
    semanticTags: entry.semanticTags,
    symbol: entry.symbol,
    description: entry.description,
    active: entry.active,
    ...(entry.exclusiveGroup ? { exclusiveGroup: entry.exclusiveGroup } : {}),
    ...(entry.exclusiveRank !== undefined ? { exclusiveRank: entry.exclusiveRank } : {}),
    ...(entry.pattern ? { pattern: entry.pattern } : {})
  };
}

function validateCatalog() {
  const ids = new Set();
  for (const entry of ACTIVE_V6_CONDITIONS) {
    if (ids.has(entry.id)) fail(`duplicate active condition id ${entry.id}`);
    ids.add(entry.id);
    for (const forbidden of ['rarity', 'probability', 'points', 'basePoints', 'awardedPoints']) {
      if (Object.hasOwn(entry, forbidden)) fail(`catalog entry ${entry.id} declares forbidden ${forbidden}`);
    }
  }
  if (ACTIVE_V6_CONDITIONS.length < 100) fail(`only ${ACTIVE_V6_CONDITIONS.length} active conditions (need 100)`);
  if (V6_COMBINATION_CONDITIONS.length < 20) fail(`only ${V6_COMBINATION_CONDITIONS.length} combination conditions (need 20)`);
  for (const entry of V6_COMBINATION_CONDITIONS) {
    for (const component of entry.predicate.all) if (!ids.has(component)) fail(`${entry.id} references missing ${component}`);
  }
}

function enumerateExactMatches() {
  if (!isMainThread) return enumerateExactMatchesRange(workerData.start, workerData.end);

  const requestedWorkers = Number.parseInt(process.env.SCORING_V6_WORKERS || '', 10);
  const workerCount = Number.isSafeInteger(requestedWorkers) && requestedWorkers > 0
    ? requestedWorkers
    : Math.min(8, availableParallelism());
  if (workerCount <= 1) return enumerateExactMatchesRange(0, RGB_COLOR_COUNT, true);

  const ranges = [];
  const chunkSize = Math.ceil(RGB_COLOR_COUNT / workerCount);
  for (let start = 0; start < RGB_COLOR_COUNT; start += chunkSize) {
    ranges.push({ start, end: Math.min(RGB_COLOR_COUNT, start + chunkSize) });
  }

  return Promise.all(ranges.map(range => new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./generate-scoring-v6.mjs', import.meta.url), { workerData: range });
    worker.once('message', message => resolve(new Uint32Array(message)));
    worker.once('error', reject);
    worker.once('exit', code => {
      if (code !== 0) reject(new Error(`v6 enumeration worker exited with code ${code}`));
    });
  }))).then(workerCounts => {
    const counts = new Uint32Array(ACTIVE_V6_CONDITIONS.length);
    for (const workerCountValues of workerCounts) {
      for (let index = 0; index < counts.length; index += 1) counts[index] += workerCountValues[index];
    }
    return counts;
  });
}

function enumerateExactMatchesRange(start, end, reportProgress = false) {
  const counts = new Uint32Array(ACTIVE_V6_CONDITIONS.length);
  const progressStep = 2_000_000;
  const startedAt = Date.now();
  for (let packed = start; packed < end; packed += 1) {
    const red = (packed >>> 16) & 255;
    const green = (packed >>> 8) & 255;
    const blue = packed & 255;
    for (const index of evaluateCatalogConditionIndexes(red, green, blue, ACTIVE_V6_CONDITIONS)) counts[index] += 1;
    if (reportProgress && shouldPrintProgress && packed > 0 && packed % progressStep === 0) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.error(`v6 exhaustive enumeration: ${packed.toLocaleString()} / ${RGB_COLOR_COUNT.toLocaleString()} (${elapsed}s)`);
    }
  }
  return counts;
}

function buildManifest(counts) {
  return ACTIVE_V6_CONDITIONS.map((entry, index) => {
    const matchCount = counts[index];
    const probability = matchCount / RGB_COLOR_COUNT;
    if (matchCount <= 0) fail(`active condition ${entry.id} never matches`);
    const rarity = getConditionRarityFromProbability(probability);
    return {
      id: entry.id,
      matchCount,
      probability: jsonNumber(probability),
      expectedRolls: Math.ceil(1 / probability),
      rarity,
      probabilityReward: jsonNumber(interpolateProbabilityReward(probability, rarity)),
      semanticBonus: jsonNumber(getSemanticBonus(entry.semanticTags)),
      variationMinBps: -700,
      variationMaxBps: 700
    };
  });
}

function buildClientArtifact(manifest) {
  const catalog = ACTIVE_V6_CONDITIONS.map(serializeCatalogEntry);
  const manifestLiteral = javascriptManifestLiteral(manifest);
  return `// GENERATED FILE. Run npm run check:scoring-spec after changing the v6 catalog or model.\nimport { evaluateCatalogConditions } from '../scoringV6Engine.js';\n\nexport const GENERATED_SCORE_MODEL_V6_VERSION = ${SCORE_MODEL_V6_VERSION};\nexport const GENERATED_V6_CATALOG = Object.freeze(${JSON.stringify(catalog, null, 2)});\nexport const GENERATED_V6_PROBABILITY_MANIFEST = Object.freeze(${manifestLiteral});\nexport const GENERATED_V6_MANIFEST_BY_ID = Object.freeze(Object.fromEntries(GENERATED_V6_PROBABILITY_MANIFEST.map(entry => [entry.id, entry])));\n\nexport function evaluateGeneratedV6Conditions(red, green, blue) {\n  return evaluateCatalogConditions(red, green, blue, GENERATED_V6_CATALOG);\n}\n`;
}

function buildPresentationArtifact(manifest) {
  const rarityById = new Map(manifest.map(entry => [entry.id, entry.rarity]));
  const presentation = Object.fromEntries(ACTIVE_V6_CONDITIONS.map(condition => [condition.id, {
    name: condition.name,
    symbol: condition.symbol,
    desc: condition.description,
    rarity: rarityById.get(condition.id) || 'Common'
  }]));
  return `// GENERATED FILE. Run npm run check:scoring-spec after changing the v6 catalog or model.\nexport const GENERATED_V6_PRESENTATION_BY_ID = Object.freeze(${JSON.stringify(presentation, null, 2)});\n`;
}

function buildSqlHelperBody() {
  const cases = ACTIVE_V6_CONDITIONS
    .map(entry => `    WHEN ${sqlString(entry.id)} THEN ${predicateToSql(entry.predicate)}`)
    .join('\n');

  return `-- GENERATED v6 predicate evaluator. Do not edit by hand.\n\nCREATE OR REPLACE FUNCTION public.chromadie_v6_is_prime(p_value integer)\nRETURNS boolean LANGUAGE plpgsql IMMUTABLE STRICT SET search_path TO 'pg_catalog' AS $function$\nDECLARE v_divisor integer;\nBEGIN\n  IF p_value < 2 THEN RETURN false; END IF;\n  IF p_value = 2 THEN RETURN true; END IF;\n  IF p_value % 2 = 0 THEN RETURN false; END IF;\n  v_divisor := 3;\n  WHILE v_divisor * v_divisor <= p_value LOOP\n    IF p_value % v_divisor = 0 THEN RETURN false; END IF;\n    v_divisor := v_divisor + 2;\n  END LOOP;\n  RETURN true;\nEND;\n$function$;\n\nCREATE OR REPLACE FUNCTION public.chromadie_v6_is_square(p_value integer)\nRETURNS boolean LANGUAGE sql IMMUTABLE STRICT SET search_path TO 'pg_catalog' AS $function$\n  SELECT p_value >= 0 AND floor(sqrt(p_value::numeric)) ^ 2 = p_value;\n$function$;\n\nCREATE OR REPLACE FUNCTION public.chromadie_v6_is_triangular(p_value integer)\nRETURNS boolean LANGUAGE sql IMMUTABLE STRICT SET search_path TO 'pg_catalog' AS $function$\n  SELECT p_value >= 0 AND floor((sqrt(8 * p_value + 1) - 1) / 2) * (floor((sqrt(8 * p_value + 1) - 1) / 2) + 1) / 2 = p_value;\n$function$;\n\nCREATE OR REPLACE FUNCTION public.chromadie_v6_is_fibonacci(p_value integer)\nRETURNS boolean LANGUAGE sql IMMUTABLE STRICT SET search_path TO 'pg_catalog' AS $function$\n  SELECT p_value IN (0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765);\n$function$;\n\nCREATE OR REPLACE FUNCTION public.chromadie_v6_hash_text(p_value text)\nRETURNS bigint LANGUAGE plpgsql IMMUTABLE STRICT SET search_path TO 'pg_catalog' AS $function$\nDECLARE\n  v_hash bigint := 2166136261;\n  v_bytes bytea := convert_to(p_value, 'UTF8');\n  v_index integer;\nBEGIN\n  FOR v_index IN 0..length(v_bytes) - 1 LOOP\n    v_hash := mod((v_hash # get_byte(v_bytes, v_index)) * 16777619, 4294967296);\n  END LOOP;\n  RETURN v_hash;\nEND;\n$function$;\n\nCREATE OR REPLACE FUNCTION public.chromadie_v6_variation_bps(p_r integer, p_g integer, p_b integer, p_condition_id text)\nRETURNS bigint LANGUAGE sql IMMUTABLE STRICT SET search_path TO 'public', 'pg_catalog' AS $function$\n  SELECT mod(public.chromadie_v6_hash_text(format('chromadie:v6:%s:%s:%s:%s', p_r, p_g, p_b, p_condition_id)), 1401) - 700;\n$function$;\n\nCREATE OR REPLACE FUNCTION public.chromadie_v6_condition_matches(\n  p_id text, p_r integer, p_g integer, p_b integer, p_sum integer, p_range integer, p_hex text,\n  p_hue numeric, p_saturation numeric, p_lightness numeric, p_hue_family text,\n  p_hex_letter_count integer, p_hex_digit_count integer, p_hex_digit_sum integer,\n  p_hex_unique_count integer, p_matched_ids jsonb\n)\nRETURNS boolean LANGUAGE plpgsql IMMUTABLE STRICT SET search_path TO 'public', 'pg_catalog' AS $function$\nBEGIN\n  RETURN CASE p_id\n${cases}\n    ELSE false\n  END;\nEND;\n$function$;\n`;
}

function buildSqlHelper() {
  return `${buildSqlHelperBody()}
REVOKE ALL ON FUNCTION public.chromadie_v6_is_prime(integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.chromadie_v6_is_square(integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.chromadie_v6_is_triangular(integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.chromadie_v6_is_fibonacci(integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.chromadie_v6_hash_text(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.chromadie_v6_variation_bps(integer, integer, integer, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.chromadie_v6_condition_matches(text, integer, integer, integer, integer, integer, text, numeric, numeric, numeric, text, integer, integer, integer, integer, jsonb) FROM PUBLIC, anon, authenticated, service_role;
`.replace(
    "RETURNS bigint LANGUAGE plpgsql IMMUTABLE STRICT SET search_path TO 'pg_catalog'",
    "RETURNS bigint LANGUAGE plpgsql STABLE STRICT SET search_path TO 'pg_catalog'"
  ).replace(
    "RETURNS bigint LANGUAGE sql IMMUTABLE STRICT SET search_path TO 'public', 'pg_catalog'",
    "RETURNS bigint LANGUAGE sql STABLE STRICT SET search_path TO 'public', 'pg_catalog'"
  ).replace(
    "RETURNS boolean LANGUAGE plpgsql IMMUTABLE STRICT SET search_path TO 'public', 'pg_catalog'",
    "RETURNS boolean LANGUAGE plpgsql STABLE STRICT SET search_path TO 'public', 'pg_catalog'"
  ).replace(
    "  v_bytes bytea := convert_to(p_value, 'UTF8');\n  v_index integer;\nBEGIN",
    "  v_bytes bytea := convert_to(p_value, 'UTF8');\nBEGIN"
  ).replace(
    'AS $function$\nBEGIN\n  RETURN CASE p_id',
    'AS $function$\nBEGIN\n  IF p_hue IS NULL THEN RETURN false; END IF;\n  RETURN CASE p_id'
  );
}

function buildSqlEvaluatorBody(manifest) {
  const manifestById = new Map(manifest.map(entry => [entry.id, entry]));
  const sqlCatalog = ACTIVE_V6_CONDITIONS.map(entry => ({
    ...serializeCatalogEntry(entry),
    ...manifestById.get(entry.id)
  }));
  const catalogLiteral = sqlString(JSON.stringify(sqlCatalog));

  return `-- GENERATED v6 scoring evaluator. Do not edit by hand.\n-- The catalog and exact RGB-universe measurements below are generated from\n-- src/lib/conditionCatalogV6.js and src/lib/scoringV6Spec.js.\n\nCREATE OR REPLACE FUNCTION public.calculate_roll_v6(p_r integer, p_g integer, p_b integer)\nRETURNS jsonb\nLANGUAGE plpgsql\nIMMUTABLE\nSECURITY DEFINER\nSET search_path TO 'public', 'pg_catalog'\nAS $function$\nDECLARE\n  v_catalog jsonb := ${catalogLiteral}::jsonb;\n  v_entry jsonb;\n  v_resolved jsonb;\n  v_raw_ids jsonb := '[]'::jsonb;\n  v_selected_ids jsonb := '[]'::jsonb;\n  v_winner_ids jsonb := '{}'::jsonb;\n  v_winner_ranks jsonb := '{}'::jsonb;\n  v_conditions jsonb := '[]'::jsonb;\n  v_contributors jsonb := '[]'::jsonb;\n  v_sorted_contributors jsonb := '[]'::jsonb;\n  v_condition_rarity_map jsonb := '{}'::jsonb;\n  v_base_points_map jsonb := '{}'::jsonb;\n  v_awarded_points_map jsonb := '{}'::jsonb;\n  v_id text;\n  v_group text;\n  v_condition_rarity text;\n  v_rank integer;\n  v_hex text;\n  v_sum integer;\n  v_max integer;\n  v_min integer;\n  v_range integer;\n  v_hex_letter_count integer;\n  v_hex_digit_count integer;\n  v_hex_digit_sum integer := 0;\n  v_hex_unique_count integer;\n  v_hue numeric := 0;\n  v_saturation numeric := 0;\n  v_lightness numeric := 0;\n  v_delta numeric;\n  v_rn numeric;\n  v_gn numeric;\n  v_bn numeric;\n  v_maxn numeric;\n  v_minn numeric;\n  v_family text;\n  v_saturation_label text;\n  v_lightness_label text;\n  v_temperature text;\n  v_structure text;\n  v_probability numeric;\n  v_probability_reward numeric;\n  v_semantic_bonus numeric;\n  v_reward_strength numeric;\n  v_band_min bigint;\n  v_band_max bigint;\n  v_base_points bigint;\n  v_awarded bigint;\n  v_variation_bps bigint;\n  v_score bigint := 0;\n  v_rarity text;\n  v_traits jsonb;\nBEGIN\n  IF p_r IS NULL OR p_g IS NULL OR p_b IS NULL\n     OR p_r NOT BETWEEN 0 AND 255\n     OR p_g NOT BETWEEN 0 AND 255\n     OR p_b NOT BETWEEN 0 AND 255 THEN\n    RAISE EXCEPTION 'RGB channels must be integers from 0 to 255';\n  END IF;\n\n  v_sum := p_r + p_g + p_b;\n  v_max := greatest(p_r, p_g, p_b);\n  v_min := least(p_r, p_g, p_b);\n  v_range := v_max - v_min;\n  v_hex := upper(lpad(to_hex(p_r), 2, '0') || lpad(to_hex(p_g), 2, '0') || lpad(to_hex(p_b), 2, '0'));\n  v_hex_letter_count := length(regexp_replace(v_hex, '[^A-F]', '', 'g'));\n  v_hex_digit_count := length(regexp_replace(v_hex, '[^0-9]', '', 'g'));\n  SELECT COALESCE(sum(strpos('0123456789ABCDEF', character) - 1), 0)\n  INTO v_hex_digit_sum\n  FROM regexp_split_to_table(v_hex, '') AS character;\n  SELECT count(DISTINCT character)\n  INTO v_hex_unique_count\n  FROM regexp_split_to_table(v_hex, '') AS character;\n\n  v_rn := p_r::numeric / 255;\n  v_gn := p_g::numeric / 255;\n  v_bn := p_b::numeric / 255;\n  v_maxn := greatest(v_rn, v_gn, v_bn);\n  v_minn := least(v_rn, v_gn, v_bn);\n  v_delta := v_maxn - v_minn;\n  v_lightness := round(((v_maxn + v_minn) / 2) * 100, 12);\n  IF v_delta <> 0 THEN\n    IF v_maxn = v_rn THEN\n      v_hue := 60 * mod((v_gn - v_bn) / v_delta, 6);\n    ELSIF v_maxn = v_gn THEN\n      v_hue := 60 * (((v_bn - v_rn) / v_delta) + 2);\n    ELSE\n      v_hue := 60 * (((v_rn - v_gn) / v_delta) + 4);\n    END IF;\n    IF v_hue < 0 THEN v_hue := v_hue + 360; END IF;\n    v_saturation := v_delta / (1 - abs(2 * ((v_maxn + v_minn) / 2) - 1)) * 100;\n  END IF;\n  v_hue := round(v_hue, 12);\n  v_saturation := round(v_saturation, 12);\n\n  v_family := CASE\n    WHEN v_saturation < 8 THEN 'Neutral'\n    WHEN v_hue < 15 OR v_hue >= 345 THEN 'Crimson'\n    WHEN v_hue < 45 THEN 'Amber'\n    WHEN v_hue < 75 THEN 'Gold'\n    WHEN v_hue < 105 THEN 'Lime'\n    WHEN v_hue < 165 THEN 'Emerald'\n    WHEN v_hue < 195 THEN 'Cyan'\n    WHEN v_hue < 225 THEN 'Azure'\n    WHEN v_hue < 255 THEN 'Blue'\n    WHEN v_hue < 285 THEN 'Violet'\n    WHEN v_hue < 315 THEN 'Magenta'\n    ELSE 'Rose'\n  END;\n  v_saturation_label := CASE\n    WHEN v_saturation >= 95 THEN 'Electric'\n    WHEN v_saturation >= 70 THEN 'Vivid'\n    WHEN v_saturation >= 40 THEN 'Rich'\n    WHEN v_saturation >= 15 THEN 'Muted'\n    ELSE 'Soft'\n  END;\n  v_lightness_label := CASE\n    WHEN v_lightness < 15 THEN 'Shadow'\n    WHEN v_lightness < 35 THEN 'Deep'\n    WHEN v_lightness < 65 THEN 'Balanced'\n    WHEN v_lightness < 85 THEN 'Bright'\n    ELSE 'Luminous'\n  END;\n  v_temperature := CASE\n    WHEN p_r = p_g AND p_g = p_b THEN 'Neutral'\n    WHEN p_r >= p_b THEN 'Warm'\n    ELSE 'Cool'\n  END;\n  v_structure := CASE\n    WHEN v_range <= 20 THEN 'Smooth'\n    WHEN v_range >= 205 THEN 'Polarized'\n    ELSE 'Layered'\n  END;\n\n  -- First collect every matching non-combination predicate and identify the\n  -- strongest member of each explicitly mutually-exclusive group.\n  FOR v_entry IN\n    SELECT value\n    FROM jsonb_array_elements(v_catalog) AS item(value)\n    WHERE COALESCE((value->>'active')::boolean, true)\n      AND value->'predicate'->>'type' <> 'combination'\n  LOOP\n    IF public.chromadie_v6_condition_matches(\n      v_entry->>'id', p_r, p_g, p_b, v_sum, v_range, v_hex,\n      v_hue, v_saturation, v_lightness, v_family,\n      v_hex_letter_count, v_hex_digit_count, v_hex_digit_sum,\n      v_hex_unique_count, v_raw_ids\n    ) THEN\n      v_id := v_entry->>'id';\n      v_raw_ids := v_raw_ids || jsonb_build_array(v_id);\n      v_group := v_entry->>'exclusiveGroup';\n      IF v_group IS NOT NULL THEN\n        v_rank := COALESCE((v_entry->>'exclusiveRank')::integer, 0);\n        IF NOT (v_winner_ranks ? v_group)\n           OR v_rank > COALESCE((v_winner_ranks->>v_group)::integer, 0) THEN\n          v_winner_ids := jsonb_set(v_winner_ids, ARRAY[v_group], to_jsonb(v_id), true);\n          v_winner_ranks := jsonb_set(v_winner_ranks, ARRAY[v_group], to_jsonb(v_rank), true);\n        END IF;\n      END IF;\n    END IF;\n  END LOOP;\n\n  FOR v_entry IN\n    SELECT value\n    FROM jsonb_array_elements(v_catalog) AS item(value)\n    WHERE COALESCE((value->>'active')::boolean, true)\n      AND value->'predicate'->>'type' <> 'combination'\n  LOOP\n    v_id := v_entry->>'id';\n    v_group := v_entry->>'exclusiveGroup';\n    IF (v_raw_ids ? v_id)\n       AND (v_group IS NULL OR v_winner_ids->>v_group = v_id) THEN\n      v_selected_ids := v_selected_ids || jsonb_build_array(v_id);\n    END IF;\n  END LOOP;\n\n  -- Combination predicates intentionally see the selected component set and\n  -- stack with it. They are evaluated in catalog order for deterministic IDs.\n  FOR v_entry IN\n    SELECT value\n    FROM jsonb_array_elements(v_catalog) AS item(value)\n    WHERE COALESCE((value->>'active')::boolean, true)\n      AND value->'predicate'->>'type' = 'combination'\n  LOOP\n    IF public.chromadie_v6_condition_matches(\n      v_entry->>'id', p_r, p_g, p_b, v_sum, v_range, v_hex,\n      v_hue, v_saturation, v_lightness, v_family,\n      v_hex_letter_count, v_hex_digit_count, v_hex_digit_sum,\n      v_hex_unique_count, v_selected_ids\n    ) THEN\n      v_selected_ids := v_selected_ids || jsonb_build_array(v_entry->>'id');\n    END IF;\n  END LOOP;\n\n  FOR v_entry IN\n    SELECT value\n    FROM jsonb_array_elements(v_catalog) AS item(value)\n    WHERE COALESCE((value->>'active')::boolean, true)\n      AND (v_selected_ids ? (value->>'id'))\n  LOOP\n    v_id := v_entry->>'id';\n    v_condition_rarity := v_entry->>'rarity';\n    v_probability := (v_entry->>'probability')::numeric;\n    v_probability_reward := CASE\n      WHEN v_condition_rarity = 'Anomaly'\n        THEN 100000000::numeric * (0.00001::numeric / v_probability)\n      ELSE (v_entry->>'probabilityReward')::numeric\n    END;\n    v_semantic_bonus := (v_entry->>'semanticBonus')::numeric;\n    v_reward_strength := 1 + v_semantic_bonus;\n    v_band_min := CASE v_condition_rarity\n      WHEN 'Common' THEN 500\n      WHEN 'Uncommon' THEN 5000\n      WHEN 'Rare' THEN 50000\n      WHEN 'Epic' THEN 500000\n      WHEN 'Legendary' THEN 5000000\n      ELSE 100000000\n    END;\n    v_band_max := CASE v_condition_rarity\n      WHEN 'Common' THEN 4999\n      WHEN 'Uncommon' THEN 49999\n      WHEN 'Rare' THEN 499999\n      WHEN 'Epic' THEN 4999999\n      WHEN 'Legendary' THEN 99999999\n      ELSE NULL\n    END;\n    v_base_points := greatest(1, round(v_probability_reward * v_reward_strength)::bigint);\n    v_variation_bps := public.chromadie_v6_variation_bps(p_r, p_g, p_b, v_id);\n    v_awarded := round(v_base_points::numeric * (10000 + v_variation_bps)::numeric / 10000)::bigint;\n    v_awarded := greatest(v_band_min, v_awarded);\n    IF v_band_max IS NOT NULL THEN v_awarded := least(v_band_max, v_awarded); END IF;\n\n    v_resolved := (v_entry - ARRAY[\n      'predicate', 'active', 'exclusiveGroup', 'exclusiveRank',\n      'matchCount', 'probability', 'expectedRolls', 'rarity',\n      'probabilityReward', 'semanticBonus'\n    ]::text[]) || jsonb_build_object(\n      'conditionRarity', v_condition_rarity,\n      'matchCount', (v_entry->>'matchCount')::bigint,\n      'probability', v_probability,\n      'expectedRolls', (v_entry->>'expectedRolls')::bigint,\n      'probabilityReward', v_probability_reward,\n      'semanticBonus', v_semantic_bonus,\n      'points', v_base_points,\n      'basePoints', v_base_points,\n      'awardedPoints', v_awarded,\n      'rewardStrength', v_reward_strength,\n      'multiplier', 1,\n      'variationBps', v_variation_bps\n    );\n    v_conditions := v_conditions || jsonb_build_array(v_resolved);\n    v_contributors := v_contributors || jsonb_build_array(v_resolved);\n    v_condition_rarity_map := v_condition_rarity_map || jsonb_build_object(v_id, v_condition_rarity);\n    v_base_points_map := v_base_points_map || jsonb_build_object(v_id, v_base_points);\n    v_awarded_points_map := v_awarded_points_map || jsonb_build_object(v_id, v_awarded);\n    v_score := v_score + v_awarded;\n  END LOOP;\n\n  SELECT COALESCE(\n    jsonb_agg(value ORDER BY (value->>'awardedPoints')::bigint DESC, value->>'id' ASC),\n    '[]'::jsonb\n  )\n  INTO v_sorted_contributors\n  FROM jsonb_array_elements(v_contributors) AS contributor(value);\n\n  v_rarity := CASE\n    WHEN v_score >= 100000000 THEN 'Anomaly'\n    WHEN v_score >= 5000000 THEN 'Legendary'\n    WHEN v_score >= 500000 THEN 'Epic'\n    WHEN v_score >= 50000 THEN 'Rare'\n    WHEN v_score >= 10000 THEN 'Uncommon'\n    WHEN v_score >= 2500 THEN 'Common'\n    ELSE 'Trash'\n  END;\n\n  v_traits := jsonb_build_array(\n    jsonb_build_object('id', 'hue_' || lower(v_family), 'label', v_family || ' Hue', 'group', 'hue'),\n    jsonb_build_object('id', 'saturation_' || lower(v_saturation_label), 'label', v_saturation_label || ' Saturation', 'group', 'saturation'),\n    jsonb_build_object('id', 'lightness_' || lower(v_lightness_label), 'label', v_lightness_label || ' Lightness', 'group', 'lightness'),\n    jsonb_build_object('id', 'temperature_' || lower(v_temperature), 'label', v_temperature || ' Temperature', 'group', 'temperature'),\n    jsonb_build_object('id', 'structure_' || lower(v_structure), 'label', v_structure || ' Structure', 'group', 'structure')\n  );\n\n  RETURN jsonb_build_object(\n    'scoreVersion', 6,\n    'score_version', 6,\n    'red', p_r,\n    'green', p_g,\n    'blue', p_b,\n    'hex', '#' || v_hex,\n    'hsl', jsonb_build_object('hue', v_hue, 'saturation', v_saturation, 'lightness', v_lightness),\n    'identity', v_lightness_label || ' ' || v_saturation_label || ' ' || v_family,\n    'score', v_score,\n    'rarity', v_rarity,\n    'conditions', v_conditions,\n    'conditionIds', v_selected_ids,\n    'conditionRarity', v_condition_rarity_map,\n    'basePoints', v_base_points_map,\n    'awardedPoints', v_awarded_points_map,\n    'contributors', v_sorted_contributors,\n    'traits', v_traits\n  );\nEND;\n$function$;\n\nREVOKE ALL ON FUNCTION public.calculate_roll_v6(integer, integer, integer) FROM PUBLIC, anon, authenticated, service_role;\n`;
}

function buildSqlEvaluator(manifest) {
  return buildSqlEvaluatorBody(manifest).replace(
    '    v_score := v_score + v_awarded;',
    "    IF v_score > 9223372036854775807 - v_awarded THEN RAISE EXCEPTION 'v6 score exceeds bigint capacity'; END IF;\n    v_score := v_score + v_awarded;"
  ).replace('\nIMMUTABLE\nSECURITY DEFINER', '\nSTABLE\nSECURITY DEFINER');
}

function buildMigration(sqlEvaluator) {
  return `-- Replace the live v6 condition catalog without rewriting its deployment history.\n-- GENERATED evaluator sections are produced by scripts/generate-scoring-v6.mjs.\nBEGIN;\n\n${sqlEvaluator}\n\nCOMMIT;\n`;
}

function buildManifestFile(manifest) {
  return JSON.stringify({
    scoreModelVersion: SCORE_MODEL_V6_VERSION,
    rgbColorCount: RGB_COLOR_COUNT,
    probabilityTiers: CONDITION_PROBABILITY_TIERS,
    rewardBands: CONDITION_REWARD_BANDS,
    conditions: manifest
  }, null, 2) + '\n';
}

function javascriptManifestLiteral(manifest) {
  const marker = '__SCORING_V6_NUMBER__';
  const serialized = JSON.stringify(manifest, (key, value) => (
    key === 'probability' ? `${marker}${value}` : value
  ), 2);
  return serialized.replace(new RegExp(`"${marker}([^"]+)"`, 'g'), 'Number("$1")');
}

async function writeOrCheck(filePath, content) {
  let existing = null;
  try {
    existing = await readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  if (hasCheckFlag) {
    if (existing !== content) fail(path.relative(repoRoot, filePath) + ' is stale; run node scripts/generate-scoring-v6.mjs');
    return;
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
}

async function main() {
  validateCatalog();
  const counts = await enumerateExactMatches();
  const manifest = buildManifest(counts);
  const generatedSql = buildSqlHelper() + '\n' + buildSqlEvaluator(manifest);

  await writeOrCheck(generatedClientPath, buildClientArtifact(manifest));
  await writeOrCheck(generatedPresentationPath, buildPresentationArtifact(manifest));
  await writeOrCheck(generatedManifestPath, buildManifestFile(manifest));
  await writeOrCheck(generatedSqlPath, generatedSql);
  await writeOrCheck(generatedMigrationPath, buildMigration(generatedSql));

  const rarityCounts = Object.fromEntries(CONDITION_PROBABILITY_TIERS.map(tier => [tier.name, 0]));
  for (const entry of manifest) rarityCounts[entry.rarity] += 1;
  const summary = ACTIVE_V6_CONDITIONS.length + ' conditions, ' + V6_COMBINATION_CONDITIONS.length
    + ' combinations, ' + JSON.stringify(rarityCounts) + ', generated from '
    + RGB_COLOR_COUNT.toLocaleString() + ' RGB colors';
  if (hasJsonFlag) console.log(JSON.stringify({ summary, manifest }));
  else console.log('Scoring v6 artifacts ' + (hasCheckFlag ? 'are current' : 'generated') + ': ' + summary + '.');
}

if (!isMainThread) {
  const counts = enumerateExactMatchesRange(workerData.start, workerData.end);
  parentPort.postMessage(counts.buffer, [counts.buffer]);
} else {
  main().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
