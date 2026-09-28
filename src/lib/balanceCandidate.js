import { RANKS, RARITY_THRESHOLDS, getRarity } from './balanceConfig.js';

// Historical export names remain for compatibility; both now reference the
// canonical active launch configuration.
export const CANDIDATE_RARITY_THRESHOLDS = RARITY_THRESHOLDS;

export const CATEGORY_MULTIPLIERS = Object.freeze([1, 0.35, 0.1]);
export const BASE_ROLL_SCORE = 0;

export const CANDIDATE_RANKS = RANKS;

export const getCandidateRarity = getRarity;
