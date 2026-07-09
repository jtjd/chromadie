import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const sqlPath = path.join(repoRoot, 'supabase/migrations/20260708230000_rebaseline_live_schema.sql');
const badgeDataPath = path.join(repoRoot, 'src/lib/badgeData.js');

const badgeModule = await import(pathToFileURL(badgeDataPath).href);
const sql = await readFile(sqlPath, 'utf8');

const knownIds = new Set([
  ...Object.keys(badgeModule.BADGES || {}),
  ...Object.keys(badgeModule.ACHIEVEMENTS || {})
]);

const rollFunctionMatch = sql.match(
  /CREATE OR REPLACE FUNCTION "public"\."roll_die"\("p_is_reroll" boolean DEFAULT false\)[\s\S]*?ALTER FUNCTION "public"\."roll_die"\("p_is_reroll" boolean\)/
);

if (!rollFunctionMatch) {
  console.error(`Could not find canonical roll_die(p_is_reroll) in ${path.relative(repoRoot, sqlPath)}.`);
  process.exit(1);
}

const rollFunction = rollFunctionMatch[0];

const badgeIds = new Set([
  ...[...rollFunction.matchAll(/to_jsonb\('([a-z0-9_]+)'::text\)/g)].map(match => match[1])
]);

const achievementBlockMatch = rollFunction.match(
  /INSERT INTO temp_ach_checks VALUES\s+([\s\S]*?);\s*\n\n\s*FOR v_ach_record IN/
);

if (!achievementBlockMatch) {
  console.error(`Could not find achievement check block in ${path.relative(repoRoot, sqlPath)}.`);
  process.exit(1);
}

const achievementBlock = achievementBlockMatch[1];
const achievementIds = new Set(
  [...achievementBlock.matchAll(/\('([a-z0-9_]+)',\s*[^)]+\)/g)].map(match => match[1])
);

const sqlIds = new Set([...badgeIds, ...achievementIds]);
const missing = [...sqlIds].filter(id => !knownIds.has(id)).sort();

if (missing.length > 0) {
  console.error('Badge drift detected: SQL references IDs missing from src/lib/badgeData.js:');
  for (const id of missing) {
    console.error(`  - ${id}`);
  }
  process.exit(1);
}

console.log(`Badge drift check passed: ${sqlIds.size} SQL IDs are covered by the badge registry.`);
