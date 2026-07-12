export const CANDIDATE_RARITY_THRESHOLDS = Object.freeze([
  Object.freeze({ name: 'Mythic', min: 1000000 }),
  Object.freeze({ name: 'Anomaly', min: 500000 }),
  Object.freeze({ name: 'Epic', min: 85000 }),
  Object.freeze({ name: 'Rare', min: 49500 }),
  Object.freeze({ name: 'Uncommon', min: 34500 }),
  Object.freeze({ name: 'Common', min: 25000 }),
  Object.freeze({ name: 'Trash', min: 0 })
]);

export const CATEGORY_MULTIPLIERS = Object.freeze([1, 0.35, 0.1]);
export const BASE_ROLL_SCORE = 0;

export const CANDIDATE_RANKS = Object.freeze([
  Object.freeze({ name: 'Bronze', min: 0, color: '#cd7f32' }),
  Object.freeze({ name: 'Silver', min: 500000, color: '#c0c0c0' }),
  Object.freeze({ name: 'Gold', min: 2500000, color: '#ffd700' }),
  Object.freeze({ name: 'Platinum', min: 7500000, color: '#e5e4e2' }),
  Object.freeze({ name: 'Diamond', min: 15000000, color: '#b9f2ff' }),
  Object.freeze({ name: 'Chroma', min: 30000000, color: 'var(--spectrum)' })
]);

export const SHOP_PRICE_BANDS = Object.freeze({
  Uncommon: Object.freeze({ min: 15000, max: 35000 }),
  Rare: Object.freeze({ min: 30000, max: 100000 }),
  Epic: Object.freeze({ min: 75000, max: 300000 }),
  Mythic: Object.freeze({ min: 175000, max: 1150000 })
});

export const STREAK_FREEZE_PRICE = 50000;
export const PRESTIGE_ITEM_PRICE = 1250000;
export const PRESTIGE_ITEM_KEYS = Object.freeze(['bg_god_rays', 'lb_chroma', 'name_chroma']);

export function getCandidateRarity(score = 0) {
  const safeScore = Math.max(0, Number(score) || 0);
  return CANDIDATE_RARITY_THRESHOLDS.find(tier => safeScore >= tier.min).name;
}
