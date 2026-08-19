import test from 'node:test';
import assert from 'node:assert/strict';
import { getRarityPresentation, RARITY_PRESENTATION } from '../src/lib/rarityPresentation.js';

test('rarity presentation keeps the result icon and color vocabulary canonical', () => {
  const expected = {
    Trash: ['◇', '#aaa9b8'],
    Common: ['○', '#dedce8'],
    Uncommon: ['✦', '#6ee2a4'],
    Rare: ['✧', '#84aaff'],
    Epic: ['✹', '#d8a6ff'],
    Anomaly: ['⚠', '#ff9a66'],
    Mythic: ['✺', '#f4cd76']
  };

  assert.deepEqual(Object.keys(RARITY_PRESENTATION), Object.keys(expected));
  for (const [rarity, [icon, color]] of Object.entries(expected)) {
    assert.equal(getRarityPresentation(rarity).icon, icon);
    assert.equal(getRarityPresentation(rarity).color, color);
    assert.equal(getRarityPresentation(rarity).name, rarity);
  }
  assert.equal(getRarityPresentation('not-a-rarity'), RARITY_PRESENTATION.Common);
});
