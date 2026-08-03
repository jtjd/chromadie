import { RANKS, RARITY_THRESHOLDS, getRarity } from './balanceConfig.js';

// Historical export names remain for compatibility; both now reference the
// canonical active launch configuration.
export const CANDIDATE_RARITY_THRESHOLDS = RARITY_THRESHOLDS;

export const CATEGORY_MULTIPLIERS = Object.freeze([1, 0.35, 0.1]);
export const BASE_ROLL_SCORE = 0;

export const CANDIDATE_RANKS = RANKS;

export const SHOP_PRICE_BANDS = Object.freeze({
  Uncommon: Object.freeze({ min: 15000, max: 35000 }),
  Rare: Object.freeze({ min: 30000, max: 100000 }),
  Epic: Object.freeze({ min: 75000, max: 300000 }),
  Mythic: Object.freeze({ min: 175000, max: 1150000 })
});

export const STREAK_FREEZE_PRICE = 50000;
export const PRESTIGE_ITEM_PRICE = 1250000;

export const getCandidateRarity = getRarity;
