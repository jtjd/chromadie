import { isOwnProfileLookup, mapProfileRecord, mapProfileScores } from './profileContract.js';
import { createDefaultProfileConfig, normalizeProfileConfig } from './profileConfig.js';
import { normalizeProfileStory } from './profileStory.js';
import { createEmptyProgression, loadMyProgression } from './progressionState.js';
import { normalizeUsernameSegment } from './routeContract.js';
import {
  createDefaultProfileSocialSettings,
  createEmptyProfileSocial,
  normalizeProfileSocial,
  normalizeProfileSocialSettings
} from './profileSocial.js';

export const PUBLIC_PROFILE_SELECT = 'id, username, display_name, bio, created_at, current_streak, longest_streak, lifetime_ep, total_rolls, equipped_cosmetics, equipped_badges, mood_color, best_roll_score, best_roll_hex, best_roll_rarity, is_staff';

const INVALID_PROFILE_MESSAGE = 'That profile address is invalid.';
const PROFILE_LOAD_MESSAGE = 'The profile could not be loaded. Please check your connection and retry.';
let achievementsCache = null;
let achievementsRequest = null;

async function normalizeV2Configuration(value, fallbackColor, options) {
  const module = await import('./profileConfigurationV2.js');
  return module.normalizeProfileConfigurationV2(value, fallbackColor, options);
}

async function loadAchievements(supabaseClient) {
  if (achievementsCache) return { data: achievementsCache, error: null };
  if (!achievementsRequest) {
    achievementsRequest = supabaseClient
      .from('achievements')
      .select('*')
      .then(response => {
        if (response.data) achievementsCache = response.data;
        achievementsRequest = null;
        return response;
      });
  }
  return achievementsRequest;
}

async function loadLegacyPublicProfile(supabaseClient, { username, userId }) {
  let profileQuery = supabaseClient
    .from('profiles')
    .select(PUBLIC_PROFILE_SELECT);
  profileQuery = username
    ? profileQuery.ilike('username', username)
    : profileQuery.eq('id', userId);
  return profileQuery.maybeSingle();
}

/**
 * Use the bounded RPC as the public contract. The explicit-column fallback is
 * retained only while an older deployment is rolling forward to Phase 13; it
 * never requests private profile fields.
 */
async function loadPublicProfile(supabaseClient, { username, userId }) {
  const rpcResponse = username
    ? await supabaseClient.rpc('get_public_profile_identity', { p_username: username })
    : await supabaseClient.rpc('get_public_profile_identity_by_id', { p_user_id: userId });

  if (!rpcResponse.error && rpcResponse.data) return rpcResponse;
  if (rpcResponse.error && !['PGRST202', '42883'].includes(rpcResponse.error.code)) return rpcResponse;
  return loadLegacyPublicProfile(supabaseClient, { username, userId });
}

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
    progression: createEmptyProgression(),
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

  if (lookupUsername && !normalizeUsernameSegment(lookupUsername)) {
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
    profileResponse = await loadPublicProfile(supabaseClient, {
      username: lookupUsername,
      userId: lookupId
    });
  }

  const { data: prof, error: profError } = profileResponse;

  const context = emptyProfileContext({
    profileId,
    viewingOwnProfile,
    loadError: profError ? PROFILE_LOAD_MESSAGE : ''
  });
  let profileUnlockedResponse = { data: null, error: null };
  let profileAchievementsResponse = { data: null, error: null };

  if (prof && prof.success !== false) {
    let publicProjection = prof;
    if (viewingOwnProfile && prof.id) {
      const projectionResponse = await supabaseClient.rpc('get_public_profile_identity_by_id', {
        p_user_id: prof.id
      });
      if (projectionResponse.error || !projectionResponse.data) {
        context.dataWarning = 'Public identity details are temporarily unavailable.';
      } else {
        publicProjection = projectionResponse.data;
      }
    }

    context.targetProfile = mapProfileRecord(viewingOwnProfile
      ? { ...prof, ...publicProjection }
      : publicProjection);
    context.profileId = context.targetProfile?.id || lookupId;
    context.totalRolls = Number(context.targetProfile?.total_rolls) || 0;

    const socialRequest = supabaseClient.rpc('get_public_profile_social', {
      p_user_id: context.profileId
    });
    const socialSettingsRequest = viewingOwnProfile
      ? supabaseClient.rpc('get_my_profile_social_settings')
      : Promise.resolve({ data: null, error: null });
    const scoresRequest = supabaseClient.rpc('get_public_profile_scores', {
      p_user_id: context.profileId
    });
    const storyRequest = supabaseClient.rpc('get_public_profile_story', {
      p_user_id: context.profileId
    });
    const configRequest = viewingOwnProfile
      ? supabaseClient.rpc('get_my_profile_configuration')
      : supabaseClient.rpc('get_public_profile_configuration', { p_user_id: context.profileId });
    const achievementsRequestForProfile = loadAchievements(supabaseClient);
    const progressionRequest = viewingOwnProfile
      ? loadMyProgression(supabaseClient, context.profileId)
      : Promise.resolve({ data: createEmptyProgression(), error: null });
    const unlockedRequest = viewingOwnProfile
      ? supabaseClient
        .from('user_achievements')
        .select('achievement_id, count')
        .eq('user_id', context.profileId)
      : Promise.resolve({ data: null, error: null });

    const [
      socialResponse,
      socialSettingsResponse,
      scoresResponse,
      storyResponse,
      configResponse,
      achievementsResponse,
      unlockedResponse,
      progressionResponse
    ] = await Promise.all([
      socialRequest,
      socialSettingsRequest,
      scoresRequest,
      storyRequest,
      configRequest,
      achievementsRequestForProfile,
      unlockedRequest,
      progressionRequest
    ]);
    profileUnlockedResponse = unlockedResponse;
    profileAchievementsResponse = achievementsResponse;
    if (viewingOwnProfile) {
      context.progression = progressionResponse.data || createEmptyProgression();
      if (progressionResponse.error) context.dataWarning = context.dataWarning || 'Progression rewards are temporarily unavailable.';
    }

    const { data: social, error: socialError } = socialResponse;
    if (socialError || social?.success === false) {
      context.dataWarning = 'Profile interactions are temporarily unavailable.';
    } else {
      context.social = normalizeProfileSocial(social);
    }

    if (viewingOwnProfile) {
      const { data: socialSettings, error: socialSettingsError } = socialSettingsResponse;
      if (socialSettingsError || socialSettings?.success === false) {
        context.dataWarning = context.dataWarning || 'Profile privacy settings are temporarily unavailable.';
      } else {
        context.socialSettings = normalizeProfileSocialSettings(socialSettings);
      }
    }

    const { data: scores, error: scoresError } = scoresResponse;
    context.targetScores = mapProfileScores(scores);
    if (scoresError) context.dataWarning = 'Recent roll history is temporarily unavailable.';

    const { data: story, error: storyError } = storyResponse;
    if (storyError) {
      context.dataWarning = context.dataWarning || 'Profile story is temporarily unavailable.';
    } else {
      const normalizedStory = normalizeProfileStory(story);
      context.timelineEvents = normalizedStory.timeline;
      context.collectionItems = normalizedStory.collection;
    }

    const fallbackColor = context.targetProfile?.mood_color || '#8B7CF6';
    if (configResponse.error || (viewingOwnProfile && configResponse.data?.success === false)) {
      context.dataWarning = context.dataWarning || 'Profile customization is temporarily unavailable.';
      const fallback = createDefaultProfileConfig(fallbackColor);
      context.profileConfig = viewingOwnProfile
        ? { draft: fallback, published: fallback, version: 1 }
        : { draft: null, published: fallback, version: 1 };
    } else if (viewingOwnProfile) {
      const v2Draft = configResponse.data?.draft_v2 || configResponse.data?.configuration_v2?.draft || null;
      const v2Published = configResponse.data?.published_v2 || configResponse.data?.configuration_v2?.published || null;
      const normalizedV2Draft = v2Draft ? await normalizeV2Configuration(v2Draft, fallbackColor, { staff: Boolean(context.targetProfile?.is_staff) }) : null;
      const normalizedV2Published = v2Published ? await normalizeV2Configuration(v2Published, fallbackColor, { staff: Boolean(context.targetProfile?.is_staff) }) : null;
      context.profileConfig = {
        version: normalizedV2Draft || normalizedV2Published ? 2 : (Number(configResponse.data?.version) || 1),
        draft: normalizedV2Draft || normalizeProfileConfig(configResponse.data?.draft, fallbackColor),
        published: normalizedV2Published || normalizeProfileConfig(configResponse.data?.published, fallbackColor),
        v2Draft: normalizedV2Draft,
        v2Published: normalizedV2Published,
        updatedAt: configResponse.data?.updated_at || null,
        publishedAt: configResponse.data?.published_at || null
      };
    } else {
      const v2 = configResponse.data?.version === 2 || configResponse.data?.base
        ? await normalizeV2Configuration(configResponse.data, fallbackColor, { staff: Boolean(context.targetProfile?.is_staff) })
        : null;
      context.profileConfig = {
        version: v2 ? 2 : 1,
        draft: null,
        published: v2 || normalizeProfileConfig(configResponse.data, fallbackColor),
        v2Published: v2
      };
    }
  }

  const { data: achievements, error: achievementError } = profileAchievementsResponse;
  if (achievements) context.allAchievements = achievements;
  if (achievementError) context.dataWarning = 'Achievement details are temporarily unavailable.';

  if (viewingOwnProfile && context.profileId) {
    const { data: unlocked, error: unlockedError } = profileUnlockedResponse;
    if (unlocked) {
      context.unlockedAchievements = Object.fromEntries(
        unlocked.map(entry => [entry.achievement_id, entry])
      );
    }
    if (unlockedError) context.dataWarning = 'Achievement progress is temporarily unavailable.';
  }

  return context;
}
