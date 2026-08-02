import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  NAME_COMPOSABLE_COUNTS,
  getComposableNameDefinition,
  resolveNameLoadout
} from '../src/lib/name/nameCatalog.js';
import { applyNamePreviewLayer, getNameRendererLoadout } from '../src/lib/name/nameLoadout.js';

const MIGRATION = new URL('../supabase/migrations/20260802100000_composable_name_catalog_activation.sql', import.meta.url);
const ROW_PATTERN = /^\s*\('(name_(?:font|material|motion)_[a-z0-9_]+)',\s*'([^']+)',\s*'(name_font|name_material|name_motion)',\s*(\d+),\s*'renderer',\s*'([^']+)',\s*NULL,\s*NULL,\s*'([^']+)',\s*'([^']*)',\s*'([^']*)',\s*false,\s*'earned',\s*NULL,\s*'active'\),?$/gm;

const LEGACY_NAME_KEYS = Object.freeze([
  'name_prism_atelier', 'name_drop_shadow', 'name_italic', 'name_glow_blue',
  'name_glow_green', 'name_smallcaps', 'name_glow_purple', 'name_glow_red',
  'name_glow_pink_neon', 'name_glow_gold', 'name_gradient_purple',
  'name_gradient_fire', 'name_ice', 'name_toxic', 'name_slow_pulse',
  'name_signal', 'name_flicker_neon', 'name_matrix_rain', 'name_rainbow',
  'name_diamond_shimmer', 'name_holographic', 'name_pulsing_glow',
  'name_shining_gold', 'name_glitch_effect', 'name_ocean_wave', 'name_inferno',
  'name_sunset_blur', 'name_void', 'name_chroma'
]);

async function getRows() {
  const source = await readFile(MIGRATION, 'utf8');
  return [...source.matchAll(ROW_PATTERN)].map(([, itemKey, name, slot, cost, rendererKey, rarity, description, collection]) => ({
    itemKey,
    name,
    slot,
    cost: Number(cost),
    rendererKey,
    rarity,
    description,
    collection
  }));
}

test('D2 activates exactly 64 paid renderer rows without default purchase rows', async () => {
  const rows = await getRows();
  assert.equal(rows.length, 64);
  assert.deepEqual(
    Object.fromEntries(['name_font', 'name_material', 'name_motion'].map(slot => [slot, rows.filter(row => row.slot === slot).length])),
    { name_font: 18, name_material: 22, name_motion: 24 }
  );
  assert.equal(new Set(rows.map(row => row.itemKey)).size, rows.length);
  assert.equal(rows.some(row => row.itemKey === 'name_material_plain' || row.itemKey === 'name_motion_none'), false);
  rows.forEach(row => {
    assert.match(row.itemKey, /^name_(font|material|motion)_[a-z0-9_]+$/);
    assert.match(row.rendererKey, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(row.name && row.description && row.collection);
    assert.ok(row.cost > 0);
    assert.ok(['Uncommon', 'Rare', 'Epic', 'Anomaly', 'Mythic'].includes(row.rarity));
    const definition = row.slot === 'name_font'
      ? getComposableNameDefinition({ fontKey: row.rendererKey })
      : row.slot === 'name_material'
        ? getComposableNameDefinition({ materialKey: row.rendererKey })
        : getComposableNameDefinition({ motionKey: row.rendererKey });
    const resolved = row.slot === 'name_font' ? definition.font
      : row.slot === 'name_material' ? definition.material : definition.motion;
    assert.equal(resolved, row.rendererKey, row.itemKey);
  });
});

test('the renderer registry counts and activation migration agree', () => {
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

test('composable profile loadouts preserve independent layers and clear legacy state', () => {
  const initial = {
    frame: 'frame_clean',
    name_effect: 'name_void',
    name_font: 'name_font_editorial_serif',
    name_material: 'name_material_copper_press',
    name_motion: 'name_motion_soft_rise'
  };
  const modern = applyNamePreviewLayer(initial, 'name_font', 'name_font_mono_compact');
  assert.equal(modern.name_font, 'name_font_mono_compact');
  assert.equal(modern.name_effect, undefined);
  assert.equal(modern.name_material, initial.name_material);
  assert.equal(modern.name_motion, initial.name_motion);

  const legacy = applyNamePreviewLayer(modern, 'name_effect', 'name_void');
  assert.equal(legacy.name_effect, 'name_void');
  assert.equal(legacy.name_font, undefined);
  assert.equal(legacy.name_material, undefined);
  assert.equal(legacy.name_motion, undefined);
  assert.equal(legacy.frame, initial.frame);
});

test('profile loadout resolution prefers modern layers and safely handles legacy/default data', () => {
  const loadout = getNameRendererLoadout({
    name_font: 'name_font_editorial_serif',
    name_material: 'invalid-material',
    name_motion: 'name_motion_daily_pulse',
    name_effect: 'name_void'
  });
  assert.deepEqual(loadout, {
    fontKey: 'name_font_editorial_serif',
    materialKey: 'invalid-material',
    motionKey: 'name_motion_daily_pulse'
  });
  assert.equal(resolveNameLoadout(loadout).kind, 'composable');
  assert.equal(resolveNameLoadout({ name_effect: 'name_void' }).key, 'name_void');
  assert.equal(resolveNameLoadout({ name_font: 'not-code-owned' }).font, 'soft-grotesk');
});

test('the activation boundary keeps old direct readers compatible and hides retired rows from the shop RPC', async () => {
  const migration = await readFile(MIGRATION, 'utf8');
  assert.match(migration, /CREATE POLICY shop_items_legacy_compatible_read/);
  assert.match(migration, /slot NOT IN \('name_font', 'name_material', 'name_motion'\)/);
  assert.match(migration, /catalog_status IN \('active', 'legacy'\)/);
  assert.match(migration, /catalog_status <> 'active'/);
  assert.match(migration, /v_slot IN \('name_font', 'name_material', 'name_motion'\)/);
});

test('all legacy Name keys remain explicit legacy rows in the activation migration', async () => {
  const migration = await readFile(MIGRATION, 'utf8');
  LEGACY_NAME_KEYS.forEach(key => assert.match(migration, new RegExp(`'${key}'`)));
  assert.match(migration, /SET catalog_status = 'legacy'/);
  assert.equal((migration.match(/'name_[a-z0-9_]+'/g) || []).length > LEGACY_NAME_KEYS.length, true);
});

test('D2 client surfaces use shared loadout plumbing without a second equip path', async () => {
  const sources = await Promise.all([
    readFile(new URL('../src/lib/ShopBrowse.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/ShopCollection.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/ShopStudio.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/ProfileCosmeticsEditor.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/ShopItemPreview.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/IdentityCard.svelte', import.meta.url), 'utf8')
  ]);
  const [browse, collection, studio, settings, card, identity] = sources;
  assert.match(browse, /SHOP_NAME_SUBTYPES/);
  assert.match(browse, /section === 'names'/);
  assert.match(collection, /name_font/);
  assert.match(collection, /Legacy presets/);
  assert.match(studio, /applyNamePreviewLayer/);
  assert.match(studio, /Platform default font/);
  assert.match(studio, /No legacy preset/);
  assert.match(settings, /NAME_COMPOSABLE_SLOTS/);
  assert.match(settings, /applyNamePreviewLayer/);
  assert.match(settings, /supabase\.rpc\('equip_item'/);
  assert.match(card, /nameLayerLoadout/);
  assert.match(card, /loadout=\{nameLayerLoadout\}/);
  assert.match(identity, /nameRendererKey \|\| nameRendererLoadout/);
  assert.doesNotMatch(studio, /supabase\.rpc\('equip_item'/);
});
