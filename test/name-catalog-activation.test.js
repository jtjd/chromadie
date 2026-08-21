import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { NAME_COMPOSABLE_COUNTS, resolveNameLoadout } from '../src/lib/name/nameCatalog.js';
import { applyNamePreviewLayer } from '../src/lib/name/nameLoadout.js';
import { NAME_FONTS, NAME_FONT_ASSET_KEYS, NAME_FONT_REGISTRY, getNameFont } from '../src/lib/name/nameFonts.js';
import { NAME_MATERIALS } from '../src/lib/name/nameMaterials.js';
import { NAME_MOTIONS } from '../src/lib/name/nameMotions.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the curated catalog keeps the approved active Name rows and ten Profile Border rows', async () => {
  const seed = await read('supabase/seed.sql');
  assert.equal((seed.match(/^\s*\('name_font_[a-z0-9_]+'/gm) || []).length, 10);
  assert.equal((seed.match(/^\s*\('name_material_[a-z0-9_]+'/gm) || []).length, 7);
  assert.equal((seed.match(/^\s*\('name_motion_[a-z0-9_]+'/gm) || []).length, 14);
  assert.equal((seed.match(/^\s*\('border_(?:celestial|chroma|crystal|glitch|gold|neon|prism|void|signal|elastic)'/gm) || []).length, 10);
  assert.doesNotMatch(seed, /name_material_plain|name_motion_none/);
  assert.deepEqual(NAME_COMPOSABLE_COUNTS, {
    fonts: 11,
    materials: 8,
    motions: 15,
    paidFonts: 10,
    paidMaterials: 7,
    paidMotions: 14,
    paidTotal: 31
  });
  assert.deepEqual(Object.keys(NAME_FONTS), [
    'industrial-stencil', 'marker-tag', 'satoshi', 'fira-code', 'poppins',
    'jetbrains-mono', 'array', 'silkscreen', 'velocity', 'outfit'
  ]);
  assert.equal(NAME_FONTS['soft-grotesk'], undefined);
  assert.equal(NAME_FONTS['editorial-serif'], undefined);
  assert.deepEqual(Object.keys(NAME_MOTIONS).filter(key => key !== 'none'), [
    'haunt-glow', 'letter-shuffle', 'typewriter-name', 'haunt-particles',
    'haunt-rainbow', 'haunt-gradient', 'haunt-fuzzy', 'haunt-reveal',
    'haunt-split', 'haunt-flash', 'kinetic-echo', 'magnetic-type',
    'neon-particle', 'raster-signal'
  ]);
});

test('the active Name catalog uses distinctive labels synchronized with each renderer registry', async () => {
  const [seed, labelMigration, fontLabelMigration, motionCurationMigration, fontRefreshMigration, silkscreenFontMigration, approvedEffectsMigration] = await Promise.all([
    read('supabase/seed.sql'),
    read('supabase/migrations/20260803120000_refresh_name_catalog_labels.sql'),
    read('supabase/migrations/20260803130000_use_reference_font_family_names.sql'),
    read('supabase/migrations/20260805140000_replace_name_motions_with_haunt_reference_set.sql'),
    read('supabase/migrations/20260816110000_name_font_catalog_refresh.sql'),
    read('supabase/migrations/20260816120000_add_silkscreen_name_font.sql'),
    read('supabase/migrations/20260821090000_approved_cosmetic_effects.sql')
  ]);
  const rows = [...seed.matchAll(
    /^\s*\('([^']+)',\s*'([^']+)',\s*'(name_font|name_material|name_motion)'[^\n]*?'renderer',\s*'([^']+)'/gm
  )].map(([, itemKey, name, slot, rendererKey]) => ({ itemKey, name, slot, rendererKey }))
    .filter(row => row.itemKey !== 'name_prism_atelier');

  assert.equal(rows.length, 31);
  assert.equal(new Set(rows.map(row => row.name)).size, rows.length);

  const registries = {
    name_font: NAME_FONTS,
    name_material: NAME_MATERIALS,
    name_motion: NAME_MOTIONS
  };
  for (const row of rows) {
    const definition = registries[row.slot][row.rendererKey];
    assert.ok(definition, `${row.itemKey} must resolve to a code-owned renderer`);
    assert.equal(definition.label, row.name, `${row.itemKey} label drifted from its renderer`);
    assert.equal(
      [labelMigration, fontLabelMigration, motionCurationMigration, fontRefreshMigration, silkscreenFontMigration, approvedEffectsMigration].some(migration => migration.includes(`'${row.itemKey}', '${row.name}'`)),
      true,
      `${row.itemKey} label is missing from the production migrations`
    );
  }

  for (const blandLabel of [
    'Editorial Serif', 'Condensed Sans', 'Wide Geometric', 'Polished Chrome',
    'Liquid Mercury', 'Velvet Sweep', 'Daily Pulse', 'Keyed In'
  ]) {
    assert.equal(rows.some(row => row.name === blandLabel), false, `stale label remains: ${blandLabel}`);
  }

  for (const inventedFontLabel of [
    'Velvet Antiqua', 'Narrowcast', 'Monument', 'Fixed Point', 'Soft Circuit',
    'Lowlight', 'Paper Lantern', 'Black Cathedral', 'Raster Bloom', 'Razor Script',
    'Foundry Slab', 'Split Serif', 'Cutline', 'Longwave', 'Greenroom',
    'Soft Orbit', 'Handstamp', 'Front Page'
  ]) {
    assert.equal(rows.some(row => row.name === inventedFontLabel), false, `invented font label remains: ${inventedFontLabel}`);
  }
});

test('active Font families are real assets and legacy families remain readable', async () => {
  const [fontsSource, stylesSource, assetReadme] = await Promise.all([
    read('src/lib/name/nameFonts.js'),
    read('src/styles/fonts.css'),
    read('src/assets/fonts/README.md')
  ]);
  assert.deepEqual([...NAME_FONT_ASSET_KEYS].sort(), Object.keys(NAME_FONT_REGISTRY).sort());
  for (const definition of Object.values(NAME_FONTS)) {
    assert.equal(definition.label, definition.targetFamily);
    assert.ok(['bundled-fontsource', 'fontshare', 'bundled-local'].includes(definition.source));
  }
  assert.equal(getNameFont('name_font_editorial_serif').family, 'Cormorant Garamond');
  assert.equal(getNameFont('name_font_soft_grotesk').family, 'Instrument Sans Variable');
  assert.match(stylesSource, /font-family: 'Array'/);
  assert.match(stylesSource, /font-family: 'Velocity'/);
  assert.match(assetReadme, /dafont\.com\/velocity\.font/);

  for (const familyImport of [
    '@fontsource/cormorant-garamond/latin-600.css',
    '@fontsource/archivo-narrow/latin-700.css',
    '@fontsource/syne/latin-700.css',
    '@fontsource/sono/latin-600.css',
    '@fontsource/libre-franklin/latin-600.css',
    '@fontsource/pirata-one/latin-400.css',
    '@fontsource/pixelify-sans/latin-600.css',
    '@fontsource/dm-serif-display/latin-400-italic.css',
    '@fontsource/roboto-slab/latin-700.css',
    '@fontsource/abril-fatface/latin-400.css',
    '@fontsource/black-ops-one/latin-400.css',
    '@fontsource/michroma/latin-400.css',
    '@fontsource/vt323/latin-400.css',
    '@fontsource/fredoka/latin-600.css',
    '@fontsource/permanent-marker/latin-400.css',
    '@fontsource/archivo-black/latin-400.css',
    '@fontsource/fira-code/latin-600.css',
    '@fontsource/poppins/latin-600.css',
    '@fontsource/jetbrains-mono/latin-600.css',
    '@fontsource/silkscreen/latin-400.css',
    '@fontsource/outfit/latin-600.css'
  ]) {
    assert.match(fontsSource, new RegExp(familyImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('modern Name layers remain independent in temporary fitting-room state', () => {
  const initial = {
    name_font: 'name_font_editorial_serif',
    name_material: 'name_material_velvet_ink',
    name_motion: 'name_motion_haunt_glow',
    profile_border: 'border_signal'
  };
  const next = applyNamePreviewLayer(initial, 'name_font', 'name_font_mono_compact');
  assert.equal(next.name_font, 'name_font_mono_compact');
  assert.equal(next.name_material, initial.name_material);
  assert.equal(next.name_motion, initial.name_motion);
  assert.equal(next.profile_border, initial.profile_border);
  const cleared = applyNamePreviewLayer(next, 'name_material');
  assert.equal(cleared.name_material, undefined);
  assert.equal(cleared.name_font, next.name_font);
  assert.equal(cleared.name_motion, next.name_motion);
});

test('loadout resolution uses safe defaults for absent or malformed layers', () => {
  const definition = resolveNameLoadout({
    name_font: 'name_font_editorial_serif',
    name_material: 'not-a-real-material',
    name_motion: 'name_motion_daily_pulse'
  });
  assert.equal(definition.kind, 'composable');
  assert.equal(definition.font, 'editorial-serif');
  assert.equal(definition.material, 'plain');
  assert.equal(definition.motion, 'haunt-glow');
  assert.equal(resolveNameLoadout({}).kind, 'default');
});

test('deprecated motion keys resolve to curated replacements without entering the active registry', () => {
  assert.equal(NAME_MOTIONS['daily-pulse'], undefined);
  assert.equal(resolveNameLoadout({ name_motion: 'name_motion_daily_pulse' }).motion, 'haunt-glow');
  assert.equal(resolveNameLoadout({ name_motion: 'name_motion_ghost_offset' }).motion, 'haunt-fuzzy');
});

test('deprecated material keys resolve to curated surfaces without entering the active registry', () => {
  assert.equal(NAME_MATERIALS['liquid-mercury'], undefined);
  assert.equal(resolveNameLoadout({ name_material: 'name_material_liquid_mercury' }).material, 'glass-emboss');
  assert.equal(resolveNameLoadout({ name_material: 'name_material_chroma_glass' }).material, 'neon-tube');
});

test('the forward-only migration removes obsolete catalog and equipped references', async () => {
  const migration = await read('supabase/migrations/20260802110000_lean_cosmetic_catalog_reset.sql');
  assert.match(migration, /DELETE FROM public\.inventory/);
  assert.match(migration, /DELETE FROM public\.shop_items/);
  assert.match(migration, /equipped_cosmetics/);
  assert.match(migration, /shop_version/);
  assert.match(migration, /Expected 64 active modern Name rows/);
  assert.match(migration, /Expected 9 active Profile Border rows/);
  assert.match(migration, /name_font.*name_material.*name_motion.*profile_border/s);
});

test('obsolete catalog slots are absent from the production seed and active client catalog', async () => {
  const [seed, catalog, stores] = await Promise.all([
    read('supabase/seed.sql'),
    read('src/lib/shopCatalog.js'),
    read('src/lib/stores.js')
  ]);
  for (const slot of ['name_effect', 'frame', 'profile_bg', 'orb_shape', 'roll_effect', 'lb_theme']) {
    assert.doesNotMatch(seed, new RegExp(`'${slot}'`));
    assert.doesNotMatch(catalog, new RegExp(`['"]${slot}['"]`));
    assert.doesNotMatch(stores, new RegExp(`['"]${slot}['"]`));
  }
});
