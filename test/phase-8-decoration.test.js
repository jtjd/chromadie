import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  createFittingRoom,
  filterShopItems,
  getShopAccessLabel,
  hasShopEntitlement
} from '../src/lib/shopCatalog.js';

const items = [
  {
    item_key: 'baseline_frame',
    name: 'Baseline Frame',
    slot: 'frame',
    cost: 0,
    access_tier: 'free',
    rarity: 'Common',
    description: 'Included.'
  },
  {
    item_key: 'earned_frame',
    name: 'Earned Frame',
    slot: 'frame',
    cost: 15000,
    access_tier: 'earned',
    rarity: 'Uncommon',
    description: 'Earned.'
  },
  {
    item_key: 'premium_frame',
    name: 'Premium Frame',
    slot: 'frame',
    cost: 0,
    access_tier: 'premium',
    entitlement_key: 'atelier_plus',
    rarity: 'Mythic',
    description: 'Expression.'
  }
];

test('decoration access labels distinguish free, earned, and premium expression', () => {
  assert.equal(getShopAccessLabel(items[0]), 'Free baseline');
  assert.equal(getShopAccessLabel(items[1]), 'Earned with EP');
  assert.equal(getShopAccessLabel({ ...items[1], cost: 0 }), 'Earned milestone');
  assert.equal(getShopAccessLabel(items[2]), 'Premium expression');
});

test('premium entitlement access is separate from inventory ownership', () => {
  const locked = createFittingRoom({ userInventory: ['earned_frame'] });
  const unlocked = createFittingRoom({
    userInventory: ['earned_frame'],
    entitlements: ['atelier_plus']
  });

  assert.equal(hasShopEntitlement(items[0], locked), true);
  assert.equal(hasShopEntitlement(items[1], locked), true);
  assert.equal(hasShopEntitlement(items[1], unlocked), true);
  assert.equal(hasShopEntitlement(items[2], locked), false);
  assert.equal(hasShopEntitlement(items[2], unlocked), true);
  assert.deepEqual(locked.entitlements, []);
  assert.deepEqual(unlocked.entitlements, ['atelier_plus']);
});

test('owned catalog includes entitled expression without treating it as an EP purchase', () => {
  const fittingRoom = createFittingRoom({ entitlements: ['atelier_plus'] });
  assert.deepEqual(
    filterShopItems(items, { section: 'owned', sortMode: 'price_asc' }, fittingRoom).map(item => item.item_key),
    ['baseline_frame', 'premium_frame']
  );
});

test('decoration studio previews the live profile canvas in an isolated mode', async () => {
  const studio = await readFile(new URL('../src/lib/DecorationStudio.svelte', import.meta.url), 'utf8');
  const preview = await readFile(new URL('../src/lib/ShopStudioPreview.svelte', import.meta.url), 'utf8');
  const shell = await readFile(new URL('../src/lib/ProfileShell.svelte', import.meta.url), 'utf8');

  assert.match(studio, /Decoration studio/);
  assert.match(studio, /Free foundations stay beautiful/);
  assert.match(preview, /ProfileShell/);
  assert.match(preview, /previewMode=\{true\}/);
  assert.match(shell, /previewMode/);
  assert.match(shell, /profile-shell-page--preview/);
  assert.doesNotMatch(studio + preview, /innerHTML|new Function|eval\s*\(/);
});

test('premium entitlement writes stay behind fixed server RPC boundaries', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260725140000_decoration_entitlements.sql', import.meta.url), 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.profile_entitlements/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /get_my_profile_entitlements/);
  assert.match(migration, /grant_profile_entitlement/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.grant_profile_entitlement\(uuid, text, text\) TO service_role/);
  assert.match(migration, /Premium expression is unlocked through an entitlement/);
  assert.match(migration, /Premium expression requires an entitlement/);
  assert.match(migration, /entitlements_deleted/);
});
