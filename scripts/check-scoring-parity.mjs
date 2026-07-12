import { spawnSync } from 'node:child_process';
import { scoreCandidateColor } from '../src/lib/scoringCandidate.js';

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
  [255, 215, 0]
];

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
    convert_to(public.calculate_roll_v2(red, green, blue)::text, 'UTF8'),
    'base64'
  ), E'\\n', '')
  FROM samples
  ORDER BY sample_index
) TO STDOUT;
`;

const result = spawnSync(
  'docker',
  ['exec', '-i', container, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', '-q'],
  { input: sql, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
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
  .map(entry => `${entry.id}:${Number(entry.awardedPoints)}`)
  .sort();
const normalizeIds = ids => [...(ids || [])].sort();
const mismatches = [];

for (let index = 0; index < samples.length; index += 1) {
  const channels = samples[index];
  const client = scoreCandidateColor(...channels);
  const server = serverRows.get(index);
  const differences = [];

  if (!server) differences.push('missing server result');
  else {
    if (Number(server.score) !== client.score) differences.push(`score ${server.score} != ${client.score}`);
    if (server.rarity !== client.rarity) differences.push(`rarity ${server.rarity} != ${client.rarity}`);
    if (server.identity !== client.identity) differences.push(`identity ${server.identity} != ${client.identity}`);
    if (JSON.stringify(normalizeIds(server.conditionIds)) !== JSON.stringify(normalizeIds(client.conditions.map(condition => condition.id)))) {
      differences.push('condition IDs differ');
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
