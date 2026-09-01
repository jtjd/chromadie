import test from 'node:test';
import assert from 'node:assert/strict';
import { createRollPageContext, deriveRollPagePresentation } from '../src/lib/rollPageContext.js';

test('roll page context derives preroll and confirmed result presentation without owning roll state', () => {
  const initial = createRollPageContext();
  assert.deepEqual(deriveRollPagePresentation(initial, { homepage: true }), {
    hasResult: false,
    homepagePreroll: true,
    homepageRolling: false,
    day: 0,
    rank: deriveRollPagePresentation(initial).rank,
    rankProgress: 0,
    rarity: deriveRollPagePresentation(initial).rarity
  });

  const result = deriveRollPagePresentation({
    ...initial,
    phase: 'results',
    identity: 'Honey Signal',
    rarity: 'Legendary',
    totalRolls: 12,
    currentStreak: 4,
    lifetimeEp: 5000
  }, { homepage: true });
  assert.equal(result.hasResult, true);
  assert.equal(result.homepagePreroll, false);
  assert.equal(result.day, 12);
  assert.equal(result.rarity.name, 'Legendary');
});
