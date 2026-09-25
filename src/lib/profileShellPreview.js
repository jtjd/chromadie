import { createDefaultProfileConfig, normalizeProfileConfig } from './profileConfig.js';
import { createDefaultProfileSocialSettings, createEmptyProfileSocial } from './profileSocial.js';

const PREVIEW_FALLBACK_COLOR = '#CDD2FF';

/**
 * Resolve the Studio source profile and configuration with the same precedence
 * as the render snapshot, while returning the renderer remount key separately.
 * Staged configuration is excluded from the key so editing controls update the
 * existing shell instead of resetting its mounted effects.
 *
 * @param {{previewProfile?: any, previewProfileConfig?: any, profileRenderSnapshot?: any, previewScores?: any[], previewTimelineEvents?: any[], previewCollectionItems?: any[], previewAllAchievements?: any[]}} options
 */
export function resolveProfileShellPreviewContext({
  previewProfile,
  previewProfileConfig,
  profileRenderSnapshot,
  previewScores,
  previewTimelineEvents,
  previewCollectionItems,
  previewAllAchievements
} = {}) {
  return {
    key: 'profile-preview:' + JSON.stringify({
      profile: previewProfile,
      scores: previewScores,
      timeline: previewTimelineEvents,
      collection: previewCollectionItems,
      achievements: previewAllAchievements
    }),
    sourceProfile: previewProfile || profileRenderSnapshot?.profile || null,
    configuration: previewProfileConfig || profileRenderSnapshot?.configuration
  };
}

/**
 * Project Studio preview inputs into the profile-shell state shape. The caller
 * supplies an already resolved profile so the explicit preview profile can
 * retain precedence over the render-snapshot fallback.
 *
 * @param {{sourceProfile?: any, configuration?: any, previewScores?: any[], previewTimelineEvents?: any[], previewCollectionItems?: any[], previewAllAchievements?: any[]}} options
 */
export function createProfileShellPreviewState({
  sourceProfile = null,
  configuration = null,
  previewScores = [],
  previewTimelineEvents = [],
  previewCollectionItems = [],
  previewAllAchievements = []
} = {}) {
  if (!sourceProfile) return null;

  const color = sourceProfile.mood_color || PREVIEW_FALLBACK_COLOR;
  const targetProfile = {
    ...sourceProfile,
    id: sourceProfile.id || 'profile-studio-preview',
    username: sourceProfile.username || 'Chromanaut',
    display_name: sourceProfile.display_name ?? null,
    bio: sourceProfile.bio ?? null,
    current_streak: Number(sourceProfile.current_streak) || 0,
    longest_streak: Number(sourceProfile.longest_streak) || 0,
    lifetime_ep: Number(sourceProfile.lifetime_ep) || 0,
    total_rolls: Number(sourceProfile.total_rolls) || 0,
    is_staff: Boolean(sourceProfile.is_staff),
    equipped_cosmetics: sourceProfile.equipped_cosmetics || {},
    equipped_badges: Array.isArray(sourceProfile.equipped_badges) ? sourceProfile.equipped_badges : [],
    mood_color: color,
    best_roll_score: sourceProfile.best_roll_score ?? null,
    best_roll_hex: sourceProfile.best_roll_hex ?? null,
    best_roll_rarity: sourceProfile.best_roll_rarity ?? null
  };
  const normalizedConfig = normalizeProfileConfig(
    configuration || createDefaultProfileConfig(),
    color
  );

  return {
    targetProfile,
    targetScores: Array.isArray(previewScores) ? previewScores : [],
    timelineEvents: Array.isArray(previewTimelineEvents) ? previewTimelineEvents : [],
    collectionItems: Array.isArray(previewCollectionItems) ? previewCollectionItems : [],
    progressionProof: { completedCount: 0, recentUnlocks: [] },
    profileConfig: { draft: null, published: normalizedConfig },
    social: createEmptyProfileSocial(),
    socialSettings: createDefaultProfileSocialSettings(),
    allAchievements: Array.isArray(previewAllAchievements) ? previewAllAchievements : [],
    loading: false
  };
}
