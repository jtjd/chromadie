import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSupabaseHeaders, getSupabaseCredentials } from '../functions/_supabaseApi.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const seedPath = path.join(repoRoot, 'supabase/seed.sql');
const resetMigrationPath = path.join(repoRoot, 'supabase/migrations/20260802110000_lean_cosmetic_catalog_reset.sql');
const nameMotionCurationMigrationPath = path.join(repoRoot, 'supabase/migrations/20260805120000_curate_name_motion_catalog.sql');
const nameMotionReferenceMigrationPath = path.join(repoRoot, 'supabase/migrations/20260805140000_replace_name_motions_with_haunt_reference_set.sql');
const nameMaterialCurationMigrationPath = path.join(repoRoot, 'supabase/migrations/20260805130000_curate_name_material_catalog.sql');
const expansionMigrationPath = path.join(repoRoot, 'supabase/migrations/20260804120000_launch_cosmetic_expansion.sql');
const atmosphereExpansionMigrationPath = path.join(repoRoot, 'supabase/migrations/20260804210000_atmosphere_expansion.sql');
const atmosphereCurationMigrationPath = path.join(repoRoot, 'supabase/migrations/20260804223000_curate_atmosphere_catalog.sql');
const atmosphereReplacementMigrationPath = path.join(repoRoot, 'supabase/migrations/20260804230000_authored_atmosphere_replacements.sql');
const atelierExpressionMigrationPath = path.join(repoRoot, 'supabase/migrations/20260809000000_atelier_expression_catalog.sql');

function fail(message) {
  console.error(`Catalog drift detected: ${message}`);
  process.exit(1);
}

function splitSqlValues(row, source) {
  const values = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];

    if (character === "'") {
      if (quoted && row[index + 1] === "'") {
        value += "''";
        index += 1;
      } else {
        quoted = !quoted;
        value += character;
      }
    } else if (character === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }

  if (quoted) fail(`unterminated string in ${source}`);
  values.push(value.trim());
  return values;
}

function decodeSqlValue(value, source) {
  if (value.toUpperCase() === 'NULL') return null;
  if (value.toUpperCase() === 'TRUE') return 'true';
  if (value.toUpperCase() === 'FALSE') return 'false';
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  if (/^-?\d+$/.test(value)) return value;
  fail(`unsupported SQL value ${JSON.stringify(value)} in ${source}`);
}

function parseCatalog(sql, source) {
  const inserts = [...sql.matchAll(
    /INSERT INTO public\.shop_items\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?)\nON CONFLICT/g
  )];
  if (!inserts.length) fail(`could not find shop_items insert in ${source}`);

  let columns = [];
  const rows = [];
  for (const insert of inserts) {
    const insertColumns = insert[1].split(',').map(column => column.trim());
    for (const column of insertColumns) {
      if (!columns.includes(column)) columns.push(column);
    }
    const body = insert[2];
    let rowStart = -1;
    let depth = 0;
    let quoted = false;

    for (let index = 0; index < body.length; index += 1) {
      const character = body[index];
      if (character === "'") {
        if (quoted && body[index + 1] === "'") index += 1;
        else quoted = !quoted;
        continue;
      }
      if (quoted) continue;
      if (character === '(') {
        if (depth === 0) rowStart = index + 1;
        depth += 1;
      } else if (character === ')') {
        depth -= 1;
        if (depth === 0) rows.push({ values: body.slice(rowStart, index), columns: insertColumns });
        if (depth < 0) fail(`unbalanced row delimiters in ${source}`);
      }
    }
    if (quoted || depth !== 0) fail(`malformed shop_items insert in ${source}`);
  }

  const catalog = new Map();
  for (const row of rows) {
    const values = splitSqlValues(row.values, source).map(value => decodeSqlValue(value, source));
    if (values.length !== row.columns.length) {
      fail(`expected ${row.columns.length} values but found ${values.length} in ${source}`);
    }
    const item = Object.fromEntries(row.columns.map((column, index) => [column, values[index]]));
    if (!item.item_key) fail(`row without item_key in ${source}`);
    catalog.set(item.item_key, { ...(catalog.get(item.item_key) || {}), ...item });
  }

  return { columns, catalog };
}

function applyCostUpdates(sql, catalog, source) {
  const update = sql.match(/UPDATE public\.shop_items\s+SET cost = CASE item_key([\s\S]*?)END;/);
  if (!update) return;

  for (const match of update[1].matchAll(/WHEN '([^']+)' THEN (\d+)/g)) {
    const [, itemKey, cost] = match;
    const item = catalog.get(itemKey);
    if (!item) fail(`update references missing item_key ${itemKey} in ${source}`);
    item.cost = cost;
  }
}

function applyCatalogStatusUpdates(sql, catalog) {
  const update = sql.match(/UPDATE public\.shop_items\s+SET catalog_status\s*=\s*'([^']+)'\s+WHERE item_key IN\s*\(([^)]+)\);/i);
  if (!update) return;

  const [, status, keys] = update;
  for (const [, itemKey] of keys.matchAll(/'([a-z0-9_]+)'/g)) {
    const item = catalog.get(itemKey);
    if (!item) continue;
    item.catalog_status = status;
  }
}

const DEFAULT_CATALOG_VALUES = Object.freeze({
  stackable: 'false',
  access_tier: 'earned',
  entitlement_key: null,
  catalog_status: 'active'
});

function normalizeItem(item, columns) {
  return Object.fromEntries(
    columns.map(column => {
      const value = item[column] === undefined ? DEFAULT_CATALOG_VALUES[column] : item[column];
      return [column, value === null ? null : String(value)];
    })
  );
}

function compareCatalogs(expected, actual, actualName) {
  const missing = [...expected.catalog.keys()].filter(key => !actual.catalog.has(key)).sort();
  const extra = [...actual.catalog.keys()].filter(key => !expected.catalog.has(key)).sort();
  const changed = [];

  for (const [key, expectedItem] of expected.catalog) {
    const actualItem = actual.catalog.get(key);
    if (!actualItem) continue;
    const expectedNormalized = normalizeItem(expectedItem, expected.columns);
    const actualNormalized = normalizeItem(actualItem, expected.columns);
    for (const column of expected.columns) {
      if (expectedNormalized[column] !== actualNormalized[column]) {
        changed.push(
          `${key}.${column}: expected ${JSON.stringify(expectedNormalized[column])}, ` +
            `found ${JSON.stringify(actualNormalized[column])}`
        );
      }
    }
  }

  if (missing.length || extra.length || changed.length) {
    const details = [
      ...missing.map(key => `missing from ${actualName}: ${key}`),
      ...extra.map(key => `unexpected in ${actualName}: ${key}`),
      ...changed.map(change => `${actualName} changed ${change}`)
    ];
    fail(`snapshot and ${actualName} differ:\n  - ${details.join('\n  - ')}`);
  }
}

async function readLocalCatalog(filePath) {
  const source = path.relative(repoRoot, filePath);
  const sql = await readFile(filePath, 'utf8');
  const parsed = parseCatalog(sql, source);
  applyCostUpdates(sql, parsed.catalog, source);
  applyCatalogStatusUpdates(sql, parsed.catalog);
  return parsed;
}

async function readRemoteCatalog(columns, url, key, projectKeyIsLegacy = false) {
  const endpoint = new URL('/rest/v1/rpc/get_shop_catalog', url);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: createSupabaseHeaders({ apiKey: key, projectKeyIsLegacy, contentType: true }),
    body: '{}'
  });
  if (!response.ok) {
    fail(`remote query failed (${response.status}): ${await response.text()}`);
  }
  const items = (await response.json()).sort((left, right) => left.item_key.localeCompare(right.item_key));
  return {
    columns,
    catalog: new Map(items.map(item => [item.item_key, item]))
  };
}

const seed = await readLocalCatalog(seedPath);
const resetMigration = await readFile(resetMigrationPath, 'utf8');
const nameMotionCurationMigration = await readFile(nameMotionCurationMigrationPath, 'utf8');
const nameMotionReferenceMigration = await readFile(nameMotionReferenceMigrationPath, 'utf8');
const nameMaterialCurationMigration = await readFile(nameMaterialCurationMigrationPath, 'utf8');
const validSlots = new Set([
  'consumable', 'title', 'name_font', 'name_material', 'name_motion', 'profile_border',
  'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere'
]);
const validCatalogStatuses = new Set(['active', 'legacy', 'retired']);
const rendererKeys = Object.freeze({
  name_font: new Set(['editorial-serif', 'condensed-sans', 'wide-geometric', 'mono-compact', 'rounded-mono', 'soft-grotesk', 'humanist-display', 'modern-fraktur', 'pixel-display', 'high-contrast-italic', 'neo-slab', 'reverse-contrast', 'industrial-stencil', 'futurist-extended', 'terminal-bitmap', 'rounded-display', 'marker-tag', 'newspaper-black']),
  name_material: new Set(['glass-emboss', 'carbon-cut', 'neon-tube', 'velvet-ink', 'engraved-stone', 'crt-phosphor', 'blueprint-ink']),
  name_motion: new Set(['haunt-glow', 'letter-shuffle', 'typewriter-name', 'haunt-particles', 'haunt-rainbow', 'haunt-gradient', 'haunt-fuzzy', 'haunt-reveal', 'haunt-split', 'haunt-flash']),
  cursor_trail: new Set(['signal-trace', 'pixel-wake', 'chroma-ribbon', 'glass-shards', 'ember-ash', 'comet-thread', 'ink-drops', 'orbit-dust', 'static-echo', 'rain-trace', 'gold-fleck', 'ghost-tail', 'color-memory', 'marker-stroke', 'solar-sparks', 'void-lensing']),
  avatar_effect: new Set(['signal-ring', 'neon-halo', 'prism-orbit', 'crystal-aperture', 'chroma-arc', 'ember-crown', 'ashfall', 'gold-laurel', 'ink-stamp', 'paper-tear', 'static-offset', 'pixel-satellites', 'crt-scan', 'void-eclipse', 'ghost-double', 'night-frame', 'daily-aura', 'color-archive']),
  profile_layout: new Set(['compact', 'sleek', 'minimal', 'modern', 'portfolio']),
  profile_atmosphere: new Set(['rain-window', 'droplets-glass', 'dust-light', 'ink-bloom', 'snowfall', 'silk-folds', 'glass-caustics', 'cinder-drift', 'night-pollen', 'paper-shadow', 'smoke-spiral', 'lumen-flare'])
});
const expectedCounts = Object.freeze({ name_font: 18, name_material: 7, name_motion: 11, profile_border: 9, cursor_trail: 16, avatar_effect: 18, profile_layout: 5, profile_atmosphere: 13 });
const composableCounts = { name_font: 0, name_material: 0, name_motion: 0, profile_border: 0, cursor_trail: 0, avatar_effect: 0, profile_layout: 0, profile_atmosphere: 0 };
const obsoleteSlots = ['name_effect', 'frame', 'profile_bg', 'orb_shape', 'roll_effect', 'lb_theme'];
for (const item of seed.catalog.values()) {
  if (!validSlots.has(item.slot)) fail(`${item.item_key} has unknown slot ${item.slot}`);
  if (!validCatalogStatuses.has(item.catalog_status || 'active')) fail(`${item.item_key} has unknown catalog_status ${item.catalog_status}`);
  if (!Number.isSafeInteger(Number(item.cost)) || Number(item.cost) < 0) fail(`${item.item_key} has invalid cost ${item.cost}`);
  if (item.css_type === 'renderer') {
    const allowedRendererKeys = item.slot === 'profile_border'
      ? new Set(['celestial', 'chroma', 'crystal', 'glitch', 'gold', 'neon', 'prism', 'void', 'signal'])
      : rendererKeys[item.slot];
    if (!allowedRendererKeys?.has(item.css_value)) fail(`${item.item_key} references an unknown ${item.slot} renderer ${item.css_value}`);
    if (!['name_font', 'name_material', 'name_motion', 'profile_border', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere'].includes(item.slot)) {
      fail(`${item.item_key} uses renderer syntax outside a retained renderer slot`);
    }
    if ((item.catalog_status || 'active') !== 'active') fail(`${item.item_key} renderer row must be active`);
    composableCounts[item.slot] += 1;
  } else if (['name_font', 'name_material', 'name_motion', 'profile_border'].includes(item.slot)) {
    fail(`${item.item_key} must use css_type=renderer`);
  } else if (!['style', 'class', 'text'].includes(item.css_type)) {
    fail(`${item.item_key} has unknown css_type ${item.css_type}`);
  }
}

for (const [slot, count] of Object.entries(expectedCounts)) {
  const actual = seed.catalog.size && [...seed.catalog.values()].filter(item => item.slot === slot && (item.catalog_status || 'active') === 'active').length;
  if (actual !== count) fail(`${slot} expected ${count} active rows, found ${actual}`);
}
if ([...seed.catalog.values()].filter(item => (item.catalog_status || 'active') === 'active').length !== 99) {
  fail(`expected 99 active catalog rows, found ${seed.catalog.size}`);
}
if ([...seed.catalog.values()].some(item => obsoleteSlots.includes(item.slot))) {
  fail('the seed still contains an obsolete cosmetic slot');
}
if (seed.catalog.has('name_material_plain') || seed.catalog.has('name_motion_none')) {
  fail('Plain and Still must not be purchasable catalog rows');
}
const expansionMigration = await readFile(expansionMigrationPath, 'utf8');
if (!expansionMigration.includes("'cursor_trail', 'avatar_effect', 'profile_layout'")) {
  fail('the expansion migration does not declare the new catalog slot allowlist');
}
const atmosphereMigration = await readFile(path.join(repoRoot, 'supabase/migrations/20260804160000_profile_atmosphere_catalog.sql'), 'utf8');
if (!atmosphereMigration.includes("'profile_atmosphere' AND css_value IN ('signal-garden'")) {
  fail('the atmosphere migration does not declare the finite renderer allowlist');
}
const dropletsMigration = await readFile(path.join(repoRoot, 'supabase/migrations/20260804183000_droplets_on_glass_atmosphere.sql'), 'utf8');
if (!dropletsMigration.includes("'droplets-glass'")) fail('the Droplets on Glass migration does not declare its renderer key');
const atmosphereExpansionMigration = await readFile(atmosphereExpansionMigrationPath, 'utf8');
if (!atmosphereExpansionMigration.includes("'dust-light'") || !atmosphereExpansionMigration.includes("'ink-bloom'") || !atmosphereExpansionMigration.includes("'snowfall'")) {
  fail('the atmosphere expansion migration does not declare all new renderer keys');
}
if (!atmosphereExpansionMigration.includes('Expected 126 active catalog rows') || !atmosphereExpansionMigration.includes('Expected 12 active Profile Atmosphere rows')) {
  fail('the atmosphere expansion migration has stale verification counts');
}
const atmosphereCurationMigration = await readFile(atmosphereCurationMigrationPath, 'utf8');
if (!atmosphereCurationMigration.includes("css_value IN ('rain-window', 'droplets-glass', 'dust-light', 'ink-bloom', 'snowfall')")) {
  fail('the atmosphere curation migration does not enforce the authored renderer allowlist');
}
if (!atmosphereCurationMigration.includes('Expected 119 active catalog rows') || !atmosphereCurationMigration.includes('Expected 5 active Profile Atmosphere rows')) {
  fail('the atmosphere curation migration has stale verification counts');
}
const atmosphereReplacementMigration = await readFile(atmosphereReplacementMigrationPath, 'utf8');
if (!atmosphereReplacementMigration.includes("'silk-folds'") || !atmosphereReplacementMigration.includes("'glass-caustics'") || !atmosphereReplacementMigration.includes("'cinder-drift'") || !atmosphereReplacementMigration.includes("'night-pollen'") || !atmosphereReplacementMigration.includes("'paper-shadow'") || !atmosphereReplacementMigration.includes("'smoke-spiral'") || !atmosphereReplacementMigration.includes("'lumen-flare'")) {
  fail('the authored atmosphere replacement migration does not declare all new renderer keys');
}
if (!atmosphereReplacementMigration.includes('Expected 126 active catalog rows') || !atmosphereReplacementMigration.includes('Expected 12 active Profile Atmosphere rows')) {
  fail('the authored atmosphere replacement migration has stale verification counts');
}
if (!resetMigration.includes("DELETE FROM public.shop_items")) fail('the reset migration does not delete obsolete catalog rows');
if (!nameMotionCurationMigration.includes('Expected 112 active catalog rows')) fail('the Name Motion curation migration has a stale active catalog count');
if (!nameMotionCurationMigration.includes('Expected 10 active Name Motion rows')) fail('the Name Motion curation migration has a stale motion count');
if (!nameMotionCurationMigration.includes("catalog_status = 'legacy'")) fail('the Name Motion curation migration does not preserve deprecated rows as legacy');
if (!nameMotionReferenceMigration.includes('Expected 97 active catalog rows')) fail('the Haunt-reference motion migration has a stale active catalog count');
if (!nameMotionReferenceMigration.includes("'haunt-glow'")) fail('the Haunt-reference motion migration does not declare the reference renderer set');
if (!nameMotionReferenceMigration.includes('Expected 27 legacy Name Motion rows')) fail('the Haunt-reference motion migration has a stale legacy motion count');
if (!nameMaterialCurationMigration.includes('Expected 97 active catalog rows')) fail('the Name Material curation migration has a stale active catalog count');
if (!nameMaterialCurationMigration.includes('Expected 7 active Name Material rows')) fail('the Name Material curation migration has a stale material count');
const atelierExpressionMigration = await readFile(atelierExpressionMigrationPath, 'utf8');
if (!atelierExpressionMigration.includes("'name_prism_atelier'") || !atelierExpressionMigration.includes("'bg_prism_atmosphere'")) {
  fail('the Atelier expression migration does not restore both stable expression keys');
}
if (!atelierExpressionMigration.includes("'name_motion'") || !atelierExpressionMigration.includes("'profile_atmosphere'")) {
  fail('the Atelier expression migration does not use modern renderer slots');
}
if (!atelierExpressionMigration.includes("'chromadie_plus'")) fail('the Atelier expression migration does not use the canonical Plus entitlement');
if (!atelierExpressionMigration.includes('Expected 99 active catalog rows')) fail('the Atelier expression migration has a stale active catalog count');

const supabase = getSupabaseCredentials(process.env);
const supabaseUrl = supabase.url;
const supabaseKey = supabase.publishableKey;

if (supabaseUrl && supabaseKey) {
  const remote = await readRemoteCatalog(seed.columns, supabaseUrl, supabaseKey, supabase.publishableKeyIsLegacy);
  compareCatalogs(seed, remote, 'remote shop_items');
  console.log(
    `Catalog drift check passed: seed and remote match (${seed.catalog.size} items; ` +
      `${composableCounts.name_font} Fonts, ${composableCounts.name_material} Materials, ${composableCounts.name_motion} Motions, ${composableCounts.profile_border} Profile Borders, ${composableCounts.cursor_trail} Cursor Trails, ${composableCounts.avatar_effect} Avatar Effects, ${composableCounts.profile_layout} structural Profile Layouts, ${composableCounts.profile_atmosphere} Atmospheres).`
  );
} else {
  console.log(
    `Catalog drift check passed locally: final seed is valid (${seed.catalog.size} items; ` +
      `${composableCounts.name_font} Fonts, ${composableCounts.name_material} Materials, ${composableCounts.name_motion} Motions, ${composableCounts.profile_border} Profile Borders, ${composableCounts.cursor_trail} Cursor Trails, ${composableCounts.avatar_effect} Avatar Effects, ${composableCounts.profile_layout} structural Profile Layouts, ${composableCounts.profile_atmosphere} Atmospheres). ` +
    'Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to include the remote catalog.'
  );
}
