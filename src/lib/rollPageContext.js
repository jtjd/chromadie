import { getRankState } from './ranks.js';
import { getRarityPresentation } from './rarityPresentation.js';

export function createRollPageContext() {
  return {
    phase: 'preroll',
    identity: '',
    hex: '',
    revealHex: '',
    rarity: '',
    score: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalRolls: 0,
    lifetimeEp: 0,
    isAuthenticated: false,
    username: 'You',
    avatarSrc: '',
    newProgressionUnlocks: [],
    weeklyFocusComplete: false
  };
}
export function deriveRollPagePresentation(context, { homepage = false } = {}) {
  const source = context && typeof context === 'object' ? context : createRollPageContext();
  const hasResult = source.phase === 'results' && Boolean(source.identity);
  const rank = getRankState(source.lifetimeEp);
  return {
    hasResult,
    homepagePreroll: homepage && !hasResult,
    homepageRolling: homepage && !hasResult && source.phase !== 'preroll',
    day: Math.max(0, Number(source.totalRolls) || Number(source.currentStreak) || 0),
    rank,
    rankProgress: Math.round(rank.progress * 100),
    rarity: getRarityPresentation(source.rarity || 'Common')
  };
}
