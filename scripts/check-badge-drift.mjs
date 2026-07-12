import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const baseScoringSqlPath = path.join(repoRoot, 'supabase/migrations/20260710200000_candidate_score_model.sql');
const finalScoringSqlPath = path.join(repoRoot, 'supabase/migrations/20260712180000_richer_roll_conditions.sql');
const rollSqlPath = path.join(repoRoot, 'supabase/migrations/20260710202000_roll_v2_transaction.sql');
const badgeDataPath = path.join(repoRoot, 'src/lib/badgeData.js');
const balanceConfigPath = path.join(repoRoot, 'src/lib/balanceConfig.js');
const seedPath = path.join(repoRoot, 'supabase/seed.sql');

const badgeModule = await import(pathToFileURL(badgeDataPath).href);
const balanceConfig = await import(pathToFileURL(balanceConfigPath).href);
const baseScoringSql = await readFile(baseScoringSqlPath, 'utf8');
const finalScoringSql = await readFile(finalScoringSqlPath, 'utf8');
const scoringSql = `${baseScoringSql}\n${finalScoringSql}`;
const rollSql = await readFile(rollSqlPath, 'utf8');
const seed = await readFile(seedPath, 'utf8');

const knownBadgeIds = new Set([
  ...Object.keys(badgeModule.BADGES || {}),
  ...Object.keys(badgeModule.CANDIDATE_BADGES || {})
]);
const knownAchievementIds = new Set([
  ...Object.keys(badgeModule.ACHIEVEMENTS || {}),
  ...Object.keys(badgeModule.CANDIDATE_ACHIEVEMENTS || {})
]);

const scoringEntryMap = new Map(
  [...scoringSql.matchAll(
    /jsonb_build_object\(\s*'id'\s*,\s*'([a-z0-9_]+)'[\s\S]{0,350}?'points'\s*,\s*(\d+)/g
  )].map(([, id, points]) => [id, Number(points)])
);
const scoringEntries = [...scoringEntryMap]
  .filter(([id]) => id !== 'structure_')
  .map(([id, points]) => ({ id, points }));

if (scoringEntries.length === 0) {
  console.error(`Could not find v2 scoring condition entries in ${path.relative(repoRoot, finalScoringSqlPath)}.`);
  process.exit(1);
}

const missingScoreIds = scoringEntries
  .map(({ id }) => id)
  .filter(id => {
    if (knownBadgeIds.has(id)) return false;
    const meta = badgeModule.getBadgeMeta?.(id);
    return !meta || meta.name === id;
  })
  .sort();

if (missingScoreIds.length > 0) {
  console.error('Badge drift detected: calculate_roll_v2 references IDs missing from badgeData.js:');
  for (const id of missingScoreIds) console.error(`  - ${id}`);
  process.exit(1);
}

const pointMismatches = scoringEntries.filter(({ id, points }) => {
  const badge = badgeModule.CANDIDATE_BADGES?.[id] || badgeModule.BADGES?.[id] || badgeModule.getBadgeMeta?.(id);
  return !badge || badge.points !== points;
});

if (pointMismatches.length > 0) {
  console.error('Score drift detected between calculate_roll_v2 and badgeData.js:');
  for (const { id, points } of pointMismatches) {
    const badge = badgeModule.CANDIDATE_BADGES?.[id] || badgeModule.BADGES?.[id] || badgeModule.getBadgeMeta?.(id);
    console.error(`  - ${id}: SQL=${points}, registry=${badge?.points ?? 'missing'}`);
  }
  process.exit(1);
}

const rarityCaseMatch = finalScoringSql.match(/v_rarity := CASE\s+([\s\S]*?)\s+END;/);
if (!rarityCaseMatch) {
  console.error(`Could not find v2 rarity CASE in ${path.relative(repoRoot, finalScoringSqlPath)}.`);
  process.exit(1);
}

const sqlRarities = [...rarityCaseMatch[1].matchAll(
  /WHEN v_score >= (\d+) THEN '([A-Za-z]+)'/g
)].map(([, min, name]) => ({ name, min: Number(min) }));
sqlRarities.push({ name: 'Trash', min: 0 });

const configuredRarities = balanceConfig.RARITY_THRESHOLDS.map(({ name, min }) => ({ name, min }));
if (JSON.stringify(sqlRarities) !== JSON.stringify(configuredRarities)) {
  console.error('Rarity drift detected between calculate_roll_v2 and balanceConfig.js.');
  console.error(`  SQL: ${JSON.stringify(sqlRarities)}`);
  console.error(`  Config: ${JSON.stringify(configuredRarities)}`);
  process.exit(1);
}

const achievementBlockMatch = rollSql.match(
  /INSERT INTO temp_ach_checks VALUES\s+([\s\S]*?);\s*\n\n\s*SELECT/
);
if (!achievementBlockMatch) {
  console.error(`Could not find v2 achievement check block in ${path.relative(repoRoot, rollSqlPath)}.`);
  process.exit(1);
}

const achievementChecks = new Set(
  [...achievementBlockMatch[1].matchAll(/\('([a-z0-9_]+)',\s*[^)]+\)/g)].map(match => match[1])
);
const missingAchievementChecks = [...achievementChecks]
  .filter(id => !knownAchievementIds.has(id))
  .sort();

if (missingAchievementChecks.length > 0) {
  console.error('Achievement drift detected: roll_die_impl checks IDs missing from badgeData.js:');
  for (const id of missingAchievementChecks) console.error(`  - ${id}`);
  process.exit(1);
}

const achievementInsert = seed.match(
  /INSERT INTO public\.achievements\s*\([^)]+\)\s*VALUES\s*([\s\S]*?)\nON CONFLICT/
);
if (!achievementInsert) {
  console.error('Could not find canonical achievement rewards in supabase/seed.sql.');
  process.exit(1);
}

const seededAchievementRewards = new Map(
  [...achievementInsert[1].matchAll(/^\('([a-z0-9_]+)',.*?,\s*(\d+),\s*'[A-Za-z]+'\)[,;]?$/gm)]
    .map(([, id, points]) => [id, Number(points)])
);
const achievementRewardMismatches = [...seededAchievementRewards].filter(
  ([id, points]) => (badgeModule.CANDIDATE_ACHIEVEMENTS?.[id] || badgeModule.ACHIEVEMENTS?.[id])?.points !== points
);

if (achievementRewardMismatches.length > 0) {
  console.error('Achievement reward drift detected between seed.sql and badgeData.js:');
  for (const [id, points] of achievementRewardMismatches) {
    const achievement = badgeModule.CANDIDATE_ACHIEVEMENTS?.[id] || badgeModule.ACHIEVEMENTS?.[id];
    console.error(`  - ${id}: seed=${points}, registry=${achievement?.points ?? 'missing'}`);
  }
  process.exit(1);
}

console.log(
  `Balance drift check passed: ${scoringEntries.length} v2 score conditions, ` +
    `${sqlRarities.length} rarity tiers, ${achievementChecks.size} achievement checks, ` +
    `${seededAchievementRewards.size} seeded achievements.`
);
