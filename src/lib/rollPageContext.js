import { getRankState } from './ranks.js';
import { getRarityPresentation } from './rarityPresentation.js';
import { ACCOUNT_STATES } from './authState.js';

export function deriveRollAccountPresentation(accountState, session, profile) {
  const ready = Boolean(session?.user?.id && accountState === ACCOUNT_STATES.AUTHENTICATED && profile?.id === session.user.id);
  return {
    accountKey: session?.user?.id || 'guest',
    signedOut: accountState === ACCOUNT_STATES.SIGNED_OUT,
    isAuthenticated: Boolean(ready),
    currentStreak: ready ? Number(profile.current_streak) || 0 : 0,
    totalRolls: ready ? Number(profile.total_rolls) || 0 : 0,
    lifetimeEp: ready ? Number(profile.lifetime_ep) || 0 : 0,
    username: ready ? profile.username : '',
    avatarSrc: ready ? profile.avatar_url || profile.avatar_path || '' : ''
  };
}

export function acceptRollPageEvent(current, event, accountKey) {
  if (!event || event.accountKey !== accountKey) return current;
  return { ...createRollPageContext(), ...event };
}

export function createRollPageContext() {
  return {
    accountKey: null,
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
