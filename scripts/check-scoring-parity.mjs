import { spawnSync } from 'node:child_process';
import { scoreCandidateColorV6, ACTIVE_SCORE_MODEL_VERSION } from '../src/lib/scoringV6.js';
import { V6_CULTURE_CONDITIONS } from '../src/lib/conditionCatalogV6.js';

const container = process.env.SUPABASE_DB_CONTAINER || 'supabase_db_Chromadie';
const sampleCount = Number.parseInt(process.env.SCORING_PARITY_SAMPLES || '5000', 10);

if (!Number.isSafeInteger(sampleCount) || sampleCount < 1 || sampleCount > 100000) {
  throw new Error('SCORING_PARITY_SAMPLES must be an integer from 1 to 100000.');
}

const samples = [
  [187, 51, 33],
  [160, 136, 234],
  [0, 0, 0],
  [255, 255, 255],
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 215, 0],
  [0x42, 0x06, 0x9a],
  [0x67, 0x67, 0x67],
  [0x67, 0x67, 0xff],
  [0xc0, 0xff, 0xee],
  [0xa2, 0x4f, 0xf7],
  [0xde, 0xfa, 0xce],
  [0xf0, 0x0b, 0xa4]
];

for (const condition of V6_CULTURE_CONDITIONS) {
  const pattern = condition.pattern
    || (['hexExact', 'hexContains', 'hexContainsAll'].includes(condition.predicate.type)
      ? condition.predicate.value || condition.predicate.values?.join('')
      : null);
  if (!pattern) continue;
  const hex = pattern.padEnd(6, '0').slice(0, 6).toUpperCase();
  samples.push([
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16)
  ]);
}

let state = 0x4348524f;
while (samples.length < sampleCount) {
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  const packed = state >>> 0;
  samples.push([(packed >>> 16) & 255, (packed >>> 8) & 255, packed & 255]);
}

const values = samples
  .map(([red, green, blue], index) => `(${index},${red},${green},${blue})`)
  .join(',');
const sql = `
COPY (
  WITH samples(sample_index, red, green, blue) AS (VALUES ${values})
  SELECT sample_index::text || '|' || replace(encode(
    convert_to(public.calculate_roll_v6(red, green, blue)::text, 'UTF8'),
    'base64'
  ), E'\\n', '')
  FROM samples
  ORDER BY sample_index
) TO STDOUT;
`;

const result = spawnSync(
  'docker',
  ['exec', '-i', container, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', '-q'],
  // The v6 response intentionally carries the full resolved condition
  // presentation. Five thousand rows therefore exceed Node's default-sized
  // child-process buffer even though the database query itself is healthy.
  { input: sql, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }
);

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || 'Could not query the local Supabase database.\n');
  process.exit(result.status || 1);
}

const serverRows = new Map(
  result.stdout.trim().split('\n').filter(Boolean).map(line => {
    const separator = line.indexOf('|');
    const index = Number.parseInt(line.slice(0, separator), 10);
    const payload = JSON.parse(Buffer.from(line.slice(separator + 1), 'base64').toString('utf8'));
    return [index, payload];
  })
);

const normalizeContributors = contributors => (contributors || [])
  .map(entry => `${entry.id}:${Number(entry.basePoints)}:${Number(entry.awardedPoints)}:${Number(entry.rewardStrength)}:${Number(entry.variationBps)}:${entry.conditionRarity || 'Common'}`)
  .sort();
const normalizeConditions = conditions => (conditions || [])
  .map(entry => `${entry.id}:${Number(entry.points)}:${Number(entry.basePoints)}:${Number(entry.awardedPoints)}:${Number(entry.rewardStrength)}:${Number(entry.variationBps)}:${entry.conditionRarity || 'Common'}`)
  .sort();
const normalizeIds = ids => [...(ids || [])].sort();
const mismatches = [];

for (let index = 0; index < samples.length; index += 1) {
  const channels = samples[index];
  const client = scoreCandidateColorV6(...channels);
  const server = serverRows.get(index);
  const differences = [];

  if (!server) differences.push('missing server result');
  else {
    if (Number(server.score) !== client.score) differences.push(`score ${server.score} != ${client.score}`);
    if (server.rarity !== client.rarity) differences.push(`rarity ${server.rarity} != ${client.rarity}`);
    if (server.identity !== client.identity) differences.push(`identity ${server.identity} != ${client.identity}`);
    if (Number(server.scoreVersion) !== ACTIVE_SCORE_MODEL_VERSION) differences.push(`server score version ${server.scoreVersion} != ${ACTIVE_SCORE_MODEL_VERSION}`);
    if (Number(server.score_version) !== ACTIVE_SCORE_MODEL_VERSION) differences.push(`server snake-case score version ${server.score_version} != ${ACTIVE_SCORE_MODEL_VERSION}`);
    if (JSON.stringify(normalizeIds(server.conditionIds)) !== JSON.stringify(normalizeIds(client.conditions.map(condition => condition.id)))) {
      differences.push('condition IDs differ');
    }
    if (JSON.stringify(normalizeConditions(server.conditions)) !== JSON.stringify(normalizeConditions(client.conditions))) {
      differences.push('resolved conditions differ');
    }
    if (JSON.stringify(normalizeContributors(server.contributors)) !== JSON.stringify(normalizeContributors(client.contributors))) {
      differences.push('contributors differ');
    }
  }

  if (differences.length > 0) mismatches.push({ channels, differences });
}

if (mismatches.length > 0) {
  console.error(`Scoring parity failed for ${mismatches.length}/${samples.length} RGB samples.`);
  for (const mismatch of mismatches.slice(0, 20)) {
    console.error(`  RGB(${mismatch.channels.join(', ')}): ${mismatch.differences.join('; ')}`);
  }
  process.exit(1);
}

console.log(`Scoring parity passed for ${samples.length} deterministic RGB samples.`);
