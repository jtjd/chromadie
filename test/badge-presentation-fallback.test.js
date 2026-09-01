import test from 'node:test';
import assert from 'node:assert/strict';
import { getBadgePresentationFallback } from '../src/lib/badgePresentationFallback.js';

test('read-only badge presentation prefers bounded server fields', () => {
  assert.deepEqual(getBadgePresentationFallback({
    id: 'bee',
    name: 'BEE',
    symbol: '🐝',
    description: 'Three matching hex pairs.',
    rarity: 'Legendary'
  }), {
    id: 'bee',
    name: 'BEE',
    symbol: '🐝',
    description: 'Three matching hex pairs.',
    rarity: 'Legendary'
  });
});
test('historical identifiers remain legible without importing scoring data', () => {
  assert.deepEqual(getBadgePresentationFallback({}, 'legacy_color_signal'), {
    id: 'legacy_color_signal',
    name: 'Legacy Color Signal',
    symbol: '✦',
    description: 'A server-reported score condition.',
    rarity: 'Common'
  });
});
