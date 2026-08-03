import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearShopSlot,
  createFittingRoom,
  filterShopItems,
  getShopContextForSlot,
  requiresPurchaseConfirmation,
  tryOnShopItem
} from '../src/lib/shopCatalog.js';

const items = [
  { item_key: 'name_font_editorial_serif', name: 'Cormorant Garamond', slot: 'name_font', cost: 180000, rarity: 'Rare', collection: 'Archive', description: 'A serif.' },
  { item_key: 'name_material_liquid_mercury', name: 'Quicksilver', slot: 'name_material', cost: 560000, rarity: 'Anomaly', collection: 'Nocturne', description: 'A reflective face.' },
  { item_key: 'name_motion_soft_rise', name: 'Lift Off', slot: 'name_motion', cost: 150000, rarity: 'Uncommon', collection: 'Ember', description: 'A subtle entrance.' },
  { item_key: 'border_signal', name: 'Signal Border', slot: 'profile_border', cost: 160000, rarity: 'Rare', collection: 'Signal', description: 'A quiet edge.' },
  { item_key: 'streak_freeze', name: 'Streak Freeze', slot: 'consumable', cost: 50000, rarity: 'Rare', description: 'Protection.' }
];

test('retained shop preview context follows the profile surface', () => {
  assert.equal(getShopContextForSlot('name_font'), 'profile');
  assert.equal(getShopContextForSlot('name_material'), 'profile');
  assert.equal(getShopContextForSlot('name_motion'), 'profile');
  assert.equal(getShopContextForSlot('profile_border'), 'profile');
  assert.equal(getShopContextForSlot('consumable'), null);
});

test('purchase confirmation protects expensive and consumable purchases', () => {
  assert.equal(requiresPurchaseConfirmation(items[1]), true);
  assert.equal(requiresPurchaseConfirmation(items[0]), true);
  assert.equal(requiresPurchaseConfirmation(items[4]), true);
});

test('the fitting room changes only the selected retained slot', () => {
  const fittingRoom = createFittingRoom({
    walletBalance: 400000,
    userInventory: ['border_signal'],
    equippedItems: { profile_border: 'border_signal', name_material: 'name_material_liquid_mercury' }
  });
  const next = tryOnShopItem(fittingRoom.loadout, items[0]);
  assert.deepEqual(fittingRoom.inventoryCounts, { border_signal: 1 });
  assert.equal(next.profile_border, 'border_signal');
  assert.equal(next.name_font, 'name_font_editorial_serif');
  assert.equal(next.name_material, 'name_material_liquid_mercury');
  assert.deepEqual(clearShopSlot(next, 'profile_border'), {
    name_font: 'name_font_editorial_serif',
    name_material: 'name_material_liquid_mercury'
  });
});

test('catalog filtering combines retained sections, ownership, affordability, and sorting', () => {
  const fittingRoom = createFittingRoom({ walletBalance: 170000, userInventory: ['border_signal'] });
  assert.deepEqual(
    filterShopItems(items, { section: 'names', subslot: 'name_motion', sortMode: 'price_asc' }, fittingRoom).map(item => item.item_key),
    ['name_motion_soft_rise']
  );
  assert.deepEqual(
    filterShopItems(items, { section: 'owned' }, fittingRoom).map(item => item.item_key),
    ['border_signal']
  );
  assert.deepEqual(
    filterShopItems(items, { section: 'overview', affordableOnly: true, rarity: 'Rare' }, fittingRoom).map(item => item.item_key),
    ['border_signal']
  );
});
