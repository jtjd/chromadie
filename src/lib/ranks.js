import { RANKS } from './balanceConfig.js';

export function getRank(ep = 0) {
  let currentRank = RANKS[0];
  for (let i = 0; i < RANKS.length; i++) {
    if (ep >= RANKS[i].min) {
      currentRank = RANKS[i];
    }
  }
  return currentRank;
}

export function getRankState(ep = 0) {
  const safeEp = Math.max(0, Number(ep) || 0);
  let currentIndex = 0;

  for (let i = 0; i < RANKS.length; i += 1) {
    if (safeEp >= RANKS[i].min) {
      currentIndex = i;
    }
  }

  const current = RANKS[currentIndex];
  const next = RANKS[currentIndex + 1] || null;
  const progress = next
    ? Math.min(1, Math.max(0, (safeEp - current.min) / (next.min - current.min)))
    : 1;

  return {
    current,
    next,
    progress,
    lifetimeEp: safeEp
  };
}

export { RANKS };
