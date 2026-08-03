import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { NAME_COMPOSABLE_COUNTS, resolveNameLoadout } from '../src/lib/name/nameCatalog.js';
import { applyNamePreviewLayer } from '../src/lib/name/nameLoadout.js';
import { NAME_FONTS } from '../src/lib/name/nameFonts.js';
import { NAME_MATERIALS } from '../src/lib/name/nameMaterials.js';
import { NAME_MOTIONS } from '../src/lib/name/nameMotions.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the reset keeps exactly 64 modern Name rows and nine Profile Border rows', async () => {
  const seed = await read('supabase/seed.sql');
  assert.equal((seed.match(/'name_font_[a-z0-9_]+'/g) || []).length, 18);
  assert.equal((seed.match(/'name_material_[a-z0-9_]+'/g) || []).length, 22);
  assert.equal((seed.match(/'name_motion_[a-z0-9_]+'/g) || []).length, 24);
  assert.equal((seed.match(/'border_(?:celestial|chroma|crystal|glitch|gold|neon|prism|void|signal)'/g) || []).length, 9);
  assert.doesNotMatch(seed, /name_material_plain|name_motion_none/);
  assert.deepEqual(NAME_COMPOSABLE_COUNTS, {
    fonts: 18,
    materials: 23,
    motions: 25,
    paidFonts: 18,
    paidMaterials: 22,
    paidMotions: 24,
    paidTotal: 64
  });
});

test('the paid Name catalog uses distinctive labels synchronized with each renderer registry', async () => {
  const [seed, labelMigration] = await Promise.all([
    read('supabase/seed.sql'),
    read('supabase/migrations/20260803120000_refresh_name_catalog_labels.sql')
  ]);
  const rows = [...seed.matchAll(
    /^\s*\('([^']+)',\s*'([^']+)',\s*'(name_font|name_material|name_motion)'[^\n]*?'renderer',\s*'([^']+)'/gm
  )].map(([, itemKey, name, slot, rendererKey]) => ({ itemKey, name, slot, rendererKey }));

  assert.equal(rows.length, 64);
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
    assert.match(labelMigration, new RegExp(`\\('${row.itemKey}', '${row.name}'\\)`));
  }

  for (const blandLabel of [
    'Editorial Serif', 'Condensed Sans', 'Wide Geometric', 'Polished Chrome',
    'Liquid Mercury', 'Velvet Sweep', 'Daily Pulse'
  ]) {
    assert.equal(rows.some(row => row.name === blandLabel), false, `stale label remains: ${blandLabel}`);
  }
});

test('modern Name layers remain independent in temporary fitting-room state', () => {
  const initial = {
    name_font: 'name_font_editorial_serif',
    name_material: 'name_material_copper_press',
    name_motion: 'name_motion_soft_rise',
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
  assert.equal(definition.motion, 'daily-pulse');
  assert.equal(resolveNameLoadout({}).kind, 'default');
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
  for (const slot of ['name_effect', 'frame', 'profile_bg', 'profile_atmosphere', 'orb_shape', 'roll_effect', 'lb_theme']) {
    assert.doesNotMatch(seed, new RegExp(`'${slot}'`));
    assert.doesNotMatch(catalog, new RegExp(`['"]${slot}['"]`));
    assert.doesNotMatch(stores, new RegExp(`['"]${slot}['"]`));
  }
});
