import { isOwnProfileLookup, mapProfileRecord, mapProfileScores } from './profileContract.js';
import { createDefaultProfileConfig, normalizeProfileConfig } from './profileConfig.js';
import { normalizeProfileStory } from './profileStory.js';
import {
  createDefaultProfileSocialSettings,
  createEmptyProfileSocial,
  normalizeProfileSocial,
  normalizeProfileSocialSettings
} from './profileSocial.js';

export const PUBLIC_PROFILE_SELECT = 'id, username, current_streak, longest_streak, lifetime_ep, total_rolls, equipped_cosmetics, equipped_badges, mood_color, best_roll_score, best_roll_hex, best_roll_rarity, is_staff';

const INVALID_PROFILE_MESSAGE = 'That profile address is invalid.';
const PROFILE_LOAD_MESSAGE = 'The profile could not be loaded. Please check your connection and retry.';

function emptyProfileContext(overrides = {}) {
  return {
    profileId: null,
    viewingOwnProfile: false,
    targetProfile: null,
    targetScores: [],
    timelineEvents: [],
    collectionItems: [],
    profileConfig: null,
    social: createEmptyProfileSocial(),
    socialSettings: createDefaultProfileSocialSettings(),
    allAchievements: [],
    unlockedAchievements: {},
    totalRolls: 0,
    loadError: '',
    dataWarning: '',
    ...overrides
  };
}

/**
 * Hydrate the public profile contract used by both the live shell and the
 * temporary legacy renderer. The ownership branch is deliberately kept here
 * so a renderer cannot accidentally broaden a public request into an owner
 * request (or expose owner-only achievement progress to visitors).
 */
export async function loadProfileContext({
  supabaseClient = null,
  isAuthenticated = false,
  sessionUserId = null,
  currentUsername = '',
  profileUsername = null,
  userId = null
} = {}) {
  if (!supabaseClient) {
    return emptyProfileContext({ loadError: PROFILE_LOAD_MESSAGE });
  }

  const lookupUsername = profileUsername?.trim() || '';
  const lookupId = userId || null;

  if (lookupUsername && !/^[A-Za-z0-9_]{3,20}$/.test(lookupUsername)) {
    return emptyProfileContext({ loadError: INVALID_PROFILE_MESSAGE });
  }

  const viewingOwnProfile = isOwnProfileLookup({
    isAuthenticated,
    sessionUserId,
    currentUsername,
    profileUsername: lookupUsername || null,
    userId: lookupId
  });

  let profileId = lookupId;
  let profileResponse;
  if (viewingOwnProfile) {
    profileResponse = await supabaseClient.rpc('get_my_profile');
  } else {
    let profileQuery = supabaseClient
      .from('profiles')
      .select(PUBLIC_PROFILE_SELECT);
    profileQuery = lookupUsername
      ? profileQuery.ilike('username', lookupUsername)
      : profileQuery.eq('id', lookupId);
    profileResponse = await profileQuery.maybeSingle();
  }

  const { data: prof, error: profError } = profileResponse;

  const context = emptyProfileContext({
    profileId,
    viewingOwnProfile,
    loadError: profError ? PROFILE_LOAD_MESSAGE : ''
  });

  if (prof && prof.success !== false) {
    context.targetProfile = mapProfileRecord(prof);
    context.profileId = context.targetProfile?.id || lookupId;
    context.totalRolls = Number(context.targetProfile?.total_rolls) || 0;

    const { data: social, error: socialError } = await supabaseClient.rpc('get_public_profile_social', {
      p_user_id: context.profileId
    });
    if (socialError || social?.success === false) {
      context.dataWarning = 'Profile interactions are temporarily unavailable.';
    } else {
      context.social = normalizeProfileSocial(social);
    }

    if (viewingOwnProfile) {
      const { data: socialSettings, error: socialSettingsError } = await supabaseClient.rpc('get_my_profile_social_settings');
      if (socialSettingsError || socialSettings?.success === false) {
        context.dataWarning = context.dataWarning || 'Profile privacy settings are temporarily unavailable.';
      } else {
        context.socialSettings = normalizeProfileSocialSettings(socialSettings);
      }
    }

    const { data: scores, error: scoresError } = await supabaseClient.rpc('get_public_profile_scores', {
      p_user_id: context.profileId
    });
    context.targetScores = mapProfileScores(scores);
    if (scoresError) context.dataWarning = 'Recent roll history is temporarily unavailable.';

    const { data: story, error: storyError } = await supabaseClient.rpc('get_public_profile_story', {
      p_user_id: context.profileId
    });
    if (storyError) {
      context.dataWarning = context.dataWarning || 'Profile story is temporarily unavailable.';
    } else {
      const normalizedStory = normalizeProfileStory(story);
      context.timelineEvents = normalizedStory.timeline;
      context.collectionItems = normalizedStory.collection;
    }

    const configResponse = viewingOwnProfile
      ? await supabaseClient.rpc('get_my_profile_configuration')
      : await supabaseClient.rpc('get_public_profile_configuration', { p_user_id: context.profileId });
    const fallbackColor = context.targetProfile?.mood_color || '#8B7CF6';
    if (configResponse.error || (viewingOwnProfile && configResponse.data?.success === false)) {
      context.dataWarning = context.dataWarning || 'Profile customization is temporarily unavailable.';
      const fallback = createDefaultProfileConfig(fallbackColor);
      context.profileConfig = viewingOwnProfile
        ? { draft: fallback, published: fallback, version: 1 }
        : { draft: null, published: fallback, version: 1 };
    } else if (viewingOwnProfile) {
      context.profileConfig = {
        version: Number(configResponse.data?.version) || 1,
        draft: normalizeProfileConfig(configResponse.data?.draft, fallbackColor),
        published: normalizeProfileConfig(configResponse.data?.published, fallbackColor),
        updatedAt: configResponse.data?.updated_at || null,
        publishedAt: configResponse.data?.published_at || null
      };
    } else {
      context.profileConfig = {
        version: 1,
        draft: null,
        published: normalizeProfileConfig(configResponse.data, fallbackColor)
      };
    }
  }

  const { data: achievements, error: achievementError } = await supabaseClient
    .from('achievements')
    .select('*');
  if (achievements) context.allAchievements = achievements;
  if (achievementError) context.dataWarning = 'Achievement details are temporarily unavailable.';

  if (viewingOwnProfile && context.profileId) {
    const { data: unlocked, error: unlockedError } = await supabaseClient
      .from('user_achievements')
      .select('achievement_id, count')
      .eq('user_id', context.profileId);
    if (unlocked) {
      context.unlockedAchievements = Object.fromEntries(
        unlocked.map(entry => [entry.achievement_id, entry])
      );
    }
    if (unlockedError) context.dataWarning = 'Achievement progress is temporarily unavailable.';
  }

  return context;
}
