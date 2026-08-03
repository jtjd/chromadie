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
const d2NameCatalogMigrationPath = path.join(repoRoot, 'supabase/migrations/20260802100000_composable_name_catalog_activation.sql');
const profileBordersPath = path.join(repoRoot, 'src/lib/profile-border/profileBorders.js');

const badgeModule = await import(pathToFileURL(badgeDataPath).href);
const balanceConfig = await import(pathToFileURL(balanceConfigPath).href);
const profileBorders = await import(pathToFileURL(profileBordersPath).href);
const baseScoringSql = await readFile(baseScoringSqlPath, 'utf8');
const finalScoringSql = await readFile(finalScoringSqlPath, 'utf8');
const scoringSql = `${baseScoringSql}\n${finalScoringSql}`;
const rollSql = await readFile(rollSqlPath, 'utf8');
const seed = await readFile(seedPath, 'utf8');
const d2NameCatalogMigration = await readFile(d2NameCatalogMigrationPath, 'utf8');

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

const d2NameCatalogRows = [...d2NameCatalogMigration.matchAll(
  /^\s*\('(name_(?:font|material|motion)_[a-z0-9_]+)',\s*'([^']+)',\s*'(name_font|name_material|name_motion)',\s*(\d+),\s*'renderer',\s*'([^']+)',\s*NULL,\s*NULL,\s*'([^']+)',\s*'([^']*)',\s*'([^']*)',\s*false,\s*'earned',\s*NULL,\s*'active'\),?$/gm
)].map(([, itemKey, name, slot, cost, rendererKey, rarity, description, collection]) => ({
  itemKey,
  name,
  slot,
  cost: Number(cost),
  rendererKey,
  rarity,
  description,
  collection
}));

const expectedNameSlotCounts = { name_font: 18, name_material: 22, name_motion: 24 };
const expectedNameRarities = new Set(['Uncommon', 'Rare', 'Epic', 'Anomaly', 'Mythic']);
const d2NameKeyPattern = /^name_(font|material|motion)_[a-z0-9_]+$/;
const d2NameRendererPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const d2NameDuplicateKeys = d2NameCatalogRows.length - new Set(d2NameCatalogRows.map(row => row.itemKey)).size;
const d2NameInvalidRows = d2NameCatalogRows.filter(row => (
  !d2NameKeyPattern.test(row.itemKey)
    || !d2NameRendererPattern.test(row.rendererKey)
    || !expectedNameRarities.has(row.rarity)
    || !row.description.trim()
    || !row.collection.trim()
));
const d2NameSlotCounts = Object.fromEntries(Object.entries(expectedNameSlotCounts).map(([slot]) => [
  slot,
  d2NameCatalogRows.filter(row => row.slot === slot).length
]));
if (
  d2NameCatalogRows.length !== 64
    || d2NameDuplicateKeys > 0
    || d2NameInvalidRows.length > 0
    || JSON.stringify(d2NameSlotCounts) !== JSON.stringify(expectedNameSlotCounts)
    || d2NameCatalogRows.some(row => row.itemKey === 'name_material_plain' || row.itemKey === 'name_motion_none')
) {
  console.error('D2 Name catalog balance/drift check failed.');
  console.error(JSON.stringify({
    rowCount: d2NameCatalogRows.length,
    duplicateKeys: d2NameDuplicateKeys,
    invalidRows: d2NameInvalidRows.map(row => row.itemKey),
    slotCounts: d2NameSlotCounts
  }, null, 2));
  process.exit(1);
}

const d2NameTotalCost = d2NameCatalogRows.reduce((total, row) => total + row.cost, 0);
const d2NameBySlot = Object.fromEntries(Object.keys(expectedNameSlotCounts).map(slot => {
  const rows = d2NameCatalogRows.filter(row => row.slot === slot);
  return [slot, { count: rows.length, total: rows.reduce((total, row) => total + row.cost, 0) }];
}));
const d2NameByRarity = Object.fromEntries([...expectedNameRarities].map(rarity => {
  const rows = d2NameCatalogRows.filter(row => row.rarity === rarity);
  return [rarity, { count: rows.length, total: rows.reduce((total, row) => total + row.cost, 0) }];
}));
const cheapestD2Name = d2NameCatalogRows.reduce((lowest, row) => row.cost < lowest.cost ? row : lowest);
const mostExpensiveD2Name = d2NameCatalogRows.reduce((highest, row) => row.cost > highest.cost ? row : highest);
const borderRows = [...seed.matchAll(
  /^\('(border_[a-z0-9_]+)',\s*'([^']+)',\s*'profile_border',\s*(\d+),\s*'renderer',\s*'([^']+)',\s*NULL,\s*NULL,\s*'([^']+)',\s*'([^']*)',\s*'([^']*)'\),?$/gm
)].map(([, itemKey, name, cost, rendererKey, rarity, description, collection]) => ({
  itemKey,
  name,
  cost: Number(cost),
  rendererKey,
  rarity,
  description,
  collection
}));
const expectedBorderPrices = Object.freeze({
  border_celestial: 600000,
  border_chroma: 450000,
  border_crystal: 450000,
  border_glitch: 500000,
  border_gold: 350000,
  border_neon: 180000,
  border_prism: 300000,
  border_void: 550000,
  border_signal: 160000
});
const expectedBorderKeys = new Set(Object.values(profileBorders.PROFILE_BORDER_DEFINITIONS).map(definition => definition.itemKey));
const borderKeySet = new Set(borderRows.map(row => row.itemKey));
const borderInvalidRows = borderRows.filter(row => (
  !expectedBorderKeys.has(row.itemKey)
    || expectedBorderPrices[row.itemKey] !== row.cost
    || !profileBorders.isProfileBorderKey(row.rendererKey)
    || !expectedNameRarities.has(row.rarity)
    || !row.description.trim()
    || !row.collection.trim()
));
if (borderRows.length !== 9 || borderKeySet.size !== 9 || borderInvalidRows.length > 0) {
  console.error('Profile Border balance/drift check failed.');
  console.error(JSON.stringify({
    rowCount: borderRows.length,
    duplicateKeys: borderRows.length - borderKeySet.size,
    invalidRows: borderInvalidRows.map(row => row.itemKey)
  }, null, 2));
  process.exit(1);
}
const borderTotalCost = borderRows.reduce((total, row) => total + row.cost, 0);
const cheapestBorder = borderRows.reduce((lowest, row) => row.cost < lowest.cost ? row : lowest);
const mostExpensiveBorder = borderRows.reduce((highest, row) => row.cost > highest.cost ? row : highest);
const documentedAverageDailyEp = 54182;
const daysFor = cost => Math.ceil(cost / documentedAverageDailyEp);
console.log(
  `Balance drift check passed: ${scoringEntries.length} v2 score conditions, ` +
    `${sqlRarities.length} rarity tiers, ${achievementChecks.size} achievement checks, ` +
    `${seededAchievementRewards.size} seeded achievements.\n` +
    `D2 Name catalog: ${d2NameCatalogRows.length} rows / ${d2NameTotalCost.toLocaleString()} EP; ` +
    `Font ${d2NameBySlot.name_font.total.toLocaleString()}, ` +
    `Material ${d2NameBySlot.name_material.total.toLocaleString()}, ` +
    `Motion ${d2NameBySlot.name_motion.total.toLocaleString()}; ` +
    `average-roll pacing ${daysFor(d2NameTotalCost)} days for the full set.\n` +
    `Lean Profile Borders: ${borderRows.length} rows / ${borderTotalCost.toLocaleString()} EP; ` +
    `cheapest ${cheapestBorder.itemKey} ${daysFor(cheapestBorder.cost)} days, ` +
    `highest ${mostExpensiveBorder.itemKey} ${daysFor(mostExpensiveBorder.cost)} days; ` +
    `the complete border set is ${daysFor(borderTotalCost)} days.`
);
