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
  { item_key: 'name_void', name: 'Void Name', slot: 'name_effect', cost: 900000, rarity: 'Mythic', collection: 'Voidwalker', description: 'Cold light.' },
  { item_key: 'frame_clean', name: 'Clean Frame', slot: 'frame', cost: 15000, rarity: 'Uncommon', description: 'Minimal.' },
  { item_key: 'orb_star', name: 'Radiant Star', slot: 'orb_shape', cost: 350000, rarity: 'Mythic', collection: 'Geometric', description: 'Stellar.' },
  { item_key: 'streak_freeze', name: 'Streak Freeze', slot: 'consumable', cost: 50000, rarity: 'Rare', description: 'Protection.' },
  { item_key: 'frame_30_day', name: 'Monthly Grinder', slot: 'frame', cost: 0, rarity: 'Mythic', description: 'Milestone.' }
];

test('shop preview context follows the surface where a cosmetic renders', () => {
  assert.equal(getShopContextForSlot('name_effect'), 'profile');
  assert.equal(getShopContextForSlot('orb_shape'), 'roll');
  assert.equal(getShopContextForSlot('lb_theme'), 'leaderboard');
  assert.equal(getShopContextForSlot('consumable'), null);
});

test('purchase confirmation protects expensive and consumable purchases', () => {
  assert.equal(requiresPurchaseConfirmation(items[0]), true);
  assert.equal(requiresPurchaseConfirmation(items[1]), false);
  assert.equal(requiresPurchaseConfirmation(items[3]), true);
});

test('the fitting room copies account state and changes only the selected slot', () => {
  const fittingRoom = createFittingRoom({
    walletBalance: 400000,
    userInventory: ['frame_clean'],
    equippedItems: { frame: 'frame_clean', name_effect: 'name_old' }
  });
  const next = tryOnShopItem(fittingRoom.loadout, items[0]);

  assert.deepEqual(fittingRoom.inventoryCounts, { frame_clean: 1 });
  assert.equal(next.frame, 'frame_clean');
  assert.equal(next.name_effect, 'name_void');
  assert.deepEqual(clearShopSlot(next, 'frame'), { name_effect: 'name_void' });
});

test('catalog filtering combines section, query, ownership, affordability, rarity, and sorting', () => {
  const fittingRoom = createFittingRoom({
    walletBalance: 100000,
    userInventory: ['frame_clean']
  });

  assert.deepEqual(
    filterShopItems(items, { section: 'profile', subslot: 'frame', sortMode: 'price_asc' }, fittingRoom).map(item => item.item_key),
    ['frame_30_day', 'frame_clean']
  );
  assert.deepEqual(
    filterShopItems(items, { section: 'owned', query: 'clean' }, fittingRoom).map(item => item.item_key),
    ['frame_clean']
  );
  assert.deepEqual(
    filterShopItems(items, { section: 'overview', affordableOnly: true, rarity: 'Uncommon' }, fittingRoom).map(item => item.item_key),
    ['frame_clean']
  );
});

test('catalog filtering supports collection and explicit ownership states', () => {
  const fittingRoom = createFittingRoom({ userInventory: ['frame_clean'] });

  assert.deepEqual(
    filterShopItems(items, { collection: 'Voidwalker', ownership: 'owned' }, fittingRoom).map(item => item.item_key),
    []
  );
  assert.deepEqual(
    filterShopItems(items, { collection: 'Voidwalker', ownership: 'unowned' }, fittingRoom).map(item => item.item_key),
    ['name_void']
  );
  assert.deepEqual(
    filterShopItems(items, { collection: 'Geometric' }, fittingRoom).map(item => item.item_key),
    ['orb_star']
  );
});
