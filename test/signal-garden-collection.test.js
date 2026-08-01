import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the homepage profile example is backed by a complete shop collection', async () => {
  const [showcase, catalog, seed, migration, drift, cosmetics] = await Promise.all([
    read('src/lib/HomeRollShowcase.svelte'),
    read('src/lib/shopCatalog.js'),
    read('supabase/seed.sql'),
    read('supabase/migrations/20260801120000_signal_garden_catalog.sql'),
    read('scripts/check-catalog-drift.mjs'),
    read('src/styles/cosmetics.css')
  ]);

  const items = [
    ['bg_signal_garden', 'bg-signal-garden'],
    ['border_signal', 'border-signal-anim'],
    ['frame_signal', 'frame-signal-anim'],
    ['name_signal', 'name-signal-anim'],
    ['orb_signal', 'orb-shape-signal'],
    ['roll_signal', 'roll-signal-anim']
  ];

  for (const [itemKey, cssClass] of items) {
    assert.match(showcase, new RegExp(itemKey));
    assert.match(catalog, new RegExp(itemKey));
    assert.match(seed, new RegExp(`'${itemKey}'`));
    assert.match(migration, new RegExp(`'${itemKey}'`));
    assert.match(cosmetics, new RegExp('\\.' + cssClass + '\\b'));
  }

  assert.match(showcase, /classFallback/);
  assert.match(catalog, /Signal Garden/);
  assert.match(migration, /ON CONFLICT \(item_key\) DO UPDATE/);
  assert.match(drift, /20260801120000_signal_garden_catalog\.sql/);
});
