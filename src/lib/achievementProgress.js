import { V6_SCORE_ACHIEVEMENT_THRESHOLDS } from './balanceConfig.js';

export const NON_PINNABLE_BADGE_IDS = new Set(['launch_edition']);

export function isPinnableAchievement(id) {
  return typeof id === 'string' && !NON_PINNABLE_BADGE_IDS.has(id);
}

export function resolveAchievementProgress(id, {
  totalRolls = 0,
  longestStreak = 0,
  bestScore = 0
} = {}) {
  if (/^roll_\d+$/.test(id || '')) {
    return { current: Math.max(0, Number(totalRolls) || 0), target: Number(id.slice(5)) };
  }
  if (/^streak_\d+$/.test(id || '')) {
    return { current: Math.max(0, Number(longestStreak) || 0), target: Number(id.slice(7)) };
  }
  if (V6_SCORE_ACHIEVEMENT_THRESHOLDS[id]) {
    return {
      current: Math.max(0, Number(bestScore) || 0),
      target: V6_SCORE_ACHIEVEMENT_THRESHOLDS[id]
    };
  }
  return null;
}
