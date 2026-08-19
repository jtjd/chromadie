import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const baseScoringSqlPath = path.join(repoRoot, 'supabase/migrations/20260710200000_candidate_score_model.sql');
const finalScoringSqlPath = path.join(repoRoot, 'supabase/migrations/20260712180000_richer_roll_conditions.sql');
const scoreTuningSqlPath = path.join(repoRoot, 'supabase/migrations/20260819150000_supernova_score_ceiling.sql');
const rollSqlPath = path.join(repoRoot, 'supabase/migrations/20260710202000_roll_v2_transaction.sql');
const badgeDataPath = path.join(repoRoot, 'src/lib/badgeData.js');
const balanceConfigPath = path.join(repoRoot, 'src/lib/balanceConfig.js');
const seedPath = path.join(repoRoot, 'supabase/seed.sql');
const d2NameCatalogMigrationPath = path.join(repoRoot, 'supabase/migrations/20260802100000_composable_name_catalog_activation.sql');
const profileBordersPath = path.join(repoRoot, 'src/lib/profile-border/profileBorders.js');
const cursorTrailsPath = path.join(repoRoot, 'src/lib/cursor-trail/cursorTrails.js');
const avatarEffectsPath = path.join(repoRoot, 'src/lib/avatar-effect/avatarEffects.js');
const profileLayoutsPath = path.join(repoRoot, 'src/lib/profile-layout/profileLayouts.js');
const profileAtmospheresPath = path.join(repoRoot, 'src/lib/profile-atmosphere/atmospheres.js');

const badgeModule = await import(pathToFileURL(badgeDataPath).href);
const balanceConfig = await import(pathToFileURL(balanceConfigPath).href);
const profileBorders = await import(pathToFileURL(profileBordersPath).href);
const cursorTrails = await import(pathToFileURL(cursorTrailsPath).href);
const avatarEffects = await import(pathToFileURL(avatarEffectsPath).href);
const profileLayouts = await import(pathToFileURL(profileLayoutsPath).href);
const profileAtmospheres = await import(pathToFileURL(profileAtmospheresPath).href);
const baseScoringSql = await readFile(baseScoringSqlPath, 'utf8');
const finalScoringSql = await readFile(finalScoringSqlPath, 'utf8');
const scoreTuningSql = await readFile(scoreTuningSqlPath, 'utf8');
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

const scoreOverrides = [...scoreTuningSql.matchAll(
  /^\s*--\s*ACTIVE_SCORE_OVERRIDE\s+([a-z0-9_]+)=(\d+)\s*$/gm
)].map(([, id, points]) => [id, Number(points)]);
if (scoreOverrides.length === 0) {
  console.error(`Could not find active score overrides in ${path.relative(repoRoot, scoreTuningSqlPath)}.`);
  process.exit(1);
}
for (const [id, points] of scoreOverrides) scoringEntryMap.set(id, points);

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
const borderRows = [...seed.matchAll(
  /^\('(border_[a-z0-9_]+)',\s*'([^']+)',\s*'profile_border',\s*(\d+),\s*'renderer',\s*'([^']+)',\s*NULL,\s*NULL,\s*'([^']+)',\s*'([^']*)',\s*'([^']*)'(?:,\s*(?:true|false))?\),?$/gm
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
const launchRows = [...seed.matchAll(
  /^\s*\('((?:cursor_trail|avatar_effect|profile_layout|profile_atmosphere|profile_motion)_[a-z0-9_]+)',\s*'[^']+',\s*'(cursor_trail|avatar_effect|profile_layout|profile_atmosphere|profile_motion)',\s*(\d+),\s*'renderer',\s*'([^']+)',\s*NULL,\s*NULL,\s*'([^']+)',\s*'([^']*)',\s*'([^']*)',\s*false,\s*'(earned|free)',\s*NULL,\s*'active'\),?$/gm
)].map(([, itemKey, slot, cost, rendererKey, rarity, description, collection, accessTier]) => ({
  itemKey,
  slot,
  cost: Number(cost),
  rendererKey,
  rarity,
  description,
  collection,
  accessTier
}));
const launchExpectedCosts = Object.freeze({
  cursor_trail_signal_trace: 160000, cursor_trail_pixel_wake: 180000, cursor_trail_chroma_ribbon: 340000,
  cursor_trail_glass_shards: 360000, cursor_trail_ember_ash: 210000, cursor_trail_comet_thread: 330000,
  cursor_trail_ink_drops: 220000, cursor_trail_orbit_dust: 350000, cursor_trail_static_echo: 320000,
  cursor_trail_rain_trace: 230000, cursor_trail_gold_fleck: 370000, cursor_trail_ghost_tail: 320000,
  cursor_trail_color_memory: 540000, cursor_trail_marker_stroke: 360000, cursor_trail_solar_sparks: 520000,
  cursor_trail_void_lensing: 700000, avatar_effect_3d_parallax: 350000, avatar_effect_glitch_slicer: 340000,
  avatar_effect_liquid_blob: 380000, avatar_effect_cyber_hud: 520000, profile_layout_compact: 0,
  profile_layout_full_bleed: 0, profile_layout_framed: 0,
  profile_motion_perspective_tilt: 0,
  profile_atmosphere_rain_window: 260000, profile_atmosphere_droplets_glass: 240000,
  profile_atmosphere_dust_light: 280000, profile_atmosphere_ink_bloom: 520000,
  profile_atmosphere_snowfall: 300000, profile_atmosphere_silk_folds: 320000,
  profile_atmosphere_glass_caustics: 460000, profile_atmosphere_cinder_drift: 430000,
  profile_atmosphere_night_pollen: 340000, profile_atmosphere_paper_shadow: 300000,
  profile_atmosphere_smoke_spiral: 580000, profile_atmosphere_lumen_flare: 640000
});
const launchExpectedRenderers = new Set([
  ...cursorTrails.CURSOR_TRAIL_KEYS.map(key => `cursor_trail_${key.replaceAll('-', '_')}`),
  ...avatarEffects.AVATAR_EFFECT_KEYS.map(key => `avatar_effect_${key.replaceAll('-', '_')}`),
  ...profileLayouts.PROFILE_LAYOUT_KEYS.map(key => `profile_layout_${key.replaceAll('-', '_')}`),
  ...profileAtmospheres.PROFILE_ATMOSPHERE_KEYS.map(key => `profile_atmosphere_${key.replaceAll('-', '_')}`),
  'profile_motion_perspective_tilt'
]);
const launchInvalidRows = launchRows.filter(row => (
  !launchExpectedRenderers.has(row.itemKey)
  || launchExpectedCosts[row.itemKey] !== row.cost
  || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.rendererKey)
  || !expectedNameRarities.has(row.rarity)
  || !row.description.trim()
  || !row.collection.trim()
  || row.accessTier !== (row.slot === 'profile_layout' || row.slot === 'profile_motion' ? 'free' : 'earned')
));
const launchCounts = Object.fromEntries(['cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere', 'profile_motion'].map(slot => [
  slot,
  launchRows.filter(row => row.slot === slot).length
]));
if (
    launchRows.length !== 36
    || new Set(launchRows.map(row => row.itemKey)).size !== 36
    || launchInvalidRows.length > 0
    || JSON.stringify(launchCounts) !== JSON.stringify({ cursor_trail: 16, avatar_effect: 4, profile_layout: 3, profile_atmosphere: 12, profile_motion: 1 })
) {
  console.error('Launch cosmetic catalog balance/drift check failed.');
  console.error(JSON.stringify({
    rowCount: launchRows.length,
    duplicateKeys: launchRows.length - new Set(launchRows.map(row => row.itemKey)).size,
    invalidRows: launchInvalidRows.map(row => row.itemKey),
    slotCounts: launchCounts
  }, null, 2));
  process.exit(1);
}
const launchTotalCost = launchRows.reduce((total, row) => total + row.cost, 0);
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
    `the complete border set is ${daysFor(borderTotalCost)} days.\n` +
    `Launch cosmetics: ${launchRows.length} rows / ${launchTotalCost.toLocaleString()} EP; ` +
    `Cursor ${launchCounts.cursor_trail}, Avatar ${launchCounts.avatar_effect}, ` +
    `structural Layout ${launchCounts.profile_layout}, Atmosphere ${launchCounts.profile_atmosphere}.`
);
