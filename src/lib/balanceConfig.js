export const RARITY_THRESHOLDS = Object.freeze([
  Object.freeze({ name: 'Mythic', min: 1500000 }),
  Object.freeze({ name: 'Anomaly', min: 200000 }),
  Object.freeze({ name: 'Epic', min: 85000 }),
  Object.freeze({ name: 'Rare', min: 50000 }),
  Object.freeze({ name: 'Uncommon', min: 35000 }),
  Object.freeze({ name: 'Common', min: 25000 }),
  Object.freeze({ name: 'Trash', min: 0 })
]);

export const RANKS = Object.freeze([
  Object.freeze({ name: 'Bronze', min: 0, color: '#cd7f32' }),
  Object.freeze({ name: 'Silver', min: 500000, color: '#c0c0c0' }),
  Object.freeze({ name: 'Gold', min: 2500000, color: '#ffd700' }),
  Object.freeze({ name: 'Platinum', min: 7500000, color: '#e5e4e2' }),
  Object.freeze({ name: 'Diamond', min: 15000000, color: '#b9f2ff' }),
  Object.freeze({ name: 'Chroma', min: 30000000, color: 'var(--spectrum)' })
]);

export function getRarity(score = 0) {
  const safeScore = Math.max(0, Number(score) || 0);
  return RARITY_THRESHOLDS.find(tier => safeScore >= tier.min).name;
}
