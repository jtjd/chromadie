import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCosmeticChanges } from '../src/lib/profile-studio/cosmeticMutations.js';

test('partial cosmetic application reconciles to the authoritative equipped state after a later slot fails', async () => {
  const serverLoadout = { name_font: 'name_font_default', profile_border: 'border_signal' };
  const calls = [];
  const result = await applyCosmeticChanges({
    changedSlots: ['name_font', 'profile_border'],
    previewLoadout: { name_font: 'name_font_silkscreen', profile_border: 'border_celestial' },
    equippedItems: { name_font: 'name_font_default', profile_border: 'border_signal' },
    getItem: itemKey => ({ item_key: itemKey, name: itemKey }),
    hasEntitlement: () => true,
    rpc: async (name, args) => {
      calls.push([name, args]);
      if (name === 'equip_item' && args.p_item_key === 'name_font_silkscreen') {
        serverLoadout.name_font = args.p_item_key;
        return { data: { success: true }, error: null };
      }
      return { data: { success: false, error: 'second slot failed' }, error: null };
    },
    refresh: async () => ({ equipped_cosmetics: { ...serverLoadout } })
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.appliedSlots, ['name_font']);
  assert.deepEqual(result.loadout, serverLoadout);
  assert.equal(calls.length, 2);
});

test('a successful mutation with a failed reconciliation keeps the known success visible', async () => {
  const result = await applyCosmeticChanges({
    changedSlots: ['profile_border'],
    previewLoadout: { profile_border: 'border_celestial' },
    equippedItems: { profile_border: 'border_signal' },
    getItem: itemKey => ({ item_key: itemKey, name: itemKey }),
    rpc: async () => ({ data: { success: true }, error: null }),
    refresh: async () => { throw new Error('profile refresh unavailable'); }
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.appliedSlots, ['profile_border']);
  assert.deepEqual(result.loadout, { profile_border: 'border_celestial' });
  assert.equal(result.error, 'The change saved, but the profile could not be refreshed.');
});
