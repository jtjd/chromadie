import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { CURSOR_TRAIL_KEYS, getCursorTrailKey } from '../src/lib/cursor-trail/cursorTrails.js';
import { AVATAR_EFFECT_KEYS, AVATAR_EFFECT_DEFINITIONS, isAvatarEffectKey } from '../src/lib/avatar-effect/avatarEffects.js';
import {
  FREE_PROFILE_LAYOUTS,
  PAID_PROFILE_LAYOUT_KEYS,
  getProfileLayoutLabel,
  resolveProfileLayoutVariant
} from '../src/lib/profile-layout/profileLayouts.js';
import { filterShopItems, SHOP_SECTIONS, tryOnShopItem } from '../src/lib/shopCatalog.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('launch renderer registries contain exactly the requested finite keys', () => {
  assert.equal(CURSOR_TRAIL_KEYS.length, 16);
  assert.equal(AVATAR_EFFECT_KEYS.length, 18);
  assert.equal(PAID_PROFILE_LAYOUT_KEYS.length, 5);
  assert.equal(new Set(CURSOR_TRAIL_KEYS).size, 16);
  assert.equal(new Set(AVATAR_EFFECT_KEYS).size, 18);
  assert.equal(new Set(PAID_PROFILE_LAYOUT_KEYS).size, 5);
  assert.deepEqual(FREE_PROFILE_LAYOUTS, ['immersive', 'editorial', 'focus']);
  assert.equal(getCursorTrailKey('cursor_trail_void_lensing'), 'void-lensing');
  assert.equal(isAvatarEffectKey('avatar_effect_color_archive'), true);
  assert.equal(getProfileLayoutLabel('profile_layout_story_stack'), 'Story Stack');
});

test('authored avatar anchor effects resolve their local layers and particle mode', async () => {
  const anchors = [
    ['prism-orbit', ['back', 'front']],
    ['ember-crown', ['back', 'front']],
    ['ghost-double', ['front']]
  ];

  for (const [key, layers] of anchors) {
    const definition = AVATAR_EFFECT_DEFINITIONS[key];
    assert.ok(definition, key);
    for (const layer of layers) {
      const assetPath = definition.assets?.[layer];
      assert.match(assetPath, /^\/avatar-effects\/.+\.svg$/);
      const asset = await read(`public${assetPath}`);
      assert.match(asset, /<svg\b/);
    }
  }

  assert.equal(AVATAR_EFFECT_DEFINITIONS['prism-orbit'].particles, true);
  assert.equal(AVATAR_EFFECT_DEFINITIONS['ember-crown'].particles, true);
  assert.equal(AVATAR_EFFECT_DEFINITIONS['ghost-double'].imageAware, true);
});

test('paid layout resolution preserves the free fallback and supports temporary previews', () => {
  assert.equal(resolveProfileLayoutVariant({}, { layoutVariant: 'editorial' }), 'editorial');
  assert.equal(resolveProfileLayoutVariant({ profile_layout: 'profile_layout_split_signal' }, { layoutVariant: 'editorial' }), 'split-signal');
  assert.equal(resolveProfileLayoutVariant({ profile_layout: 'profile_layout_split_signal' }, { layoutVariant: 'editorial', layoutOverride: 'focus' }), 'focus');
  assert.equal(resolveProfileLayoutVariant({ profile_layout: 'not-real' }, { layoutVariant: 'not-real' }), 'immersive');
});

test('new catalog slots filter independently and fitting-room selection preserves other slots', () => {
  const items = [
    { item_key: 'cursor_trail_signal_trace', slot: 'cursor_trail', cost: 160000, rarity: 'Rare', collection: 'Signal', catalog_status: 'active' },
    { item_key: 'avatar_effect_signal_ring', slot: 'avatar_effect', cost: 180000, rarity: 'Rare', collection: 'Signal', catalog_status: 'active' },
    { item_key: 'profile_layout_split_signal', slot: 'profile_layout', cost: 320000, rarity: 'Rare', collection: 'Signal', catalog_status: 'active' }
  ];
  for (const section of ['avatar', 'cursor', 'layouts']) {
    assert.equal(SHOP_SECTIONS.some(entry => entry.id === section), true);
    assert.equal(filterShopItems(items, { section }).length, 1);
  }
  const next = tryOnShopItem({ name_font: 'name_font_editorial_serif', profile_border: 'border_signal' }, items[0]);
  assert.equal(next.cursor_trail, 'cursor_trail_signal_trace');
  assert.equal(next.name_font, 'name_font_editorial_serif');
  assert.equal(next.profile_border, 'border_signal');
});

test('seed and expansion migration contain the 39 launch products and version bump', async () => {
  const [seed, migration] = await Promise.all([
    read('supabase/seed.sql'),
    read('supabase/migrations/20260804120000_launch_cosmetic_expansion.sql')
  ]);
  assert.equal((seed.match(/'cursor_trail_[a-z0-9_]+'/g) || []).length, 16);
  assert.equal((seed.match(/'avatar_effect_[a-z0-9_]+'/g) || []).length, 18);
  assert.equal((seed.match(/'profile_layout_[a-z0-9_]+'/g) || []).length, 5);
  assert.match(migration, /VALUES \('shop_version', '2026-08-04T12:00:00Z'\)/);
  assert.match(migration, /Expected 114 active catalog rows/);
  assert.match(migration, /cursor_trail.*avatar_effect.*profile_layout/s);
});
