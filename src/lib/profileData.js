import { isOwnProfileLookup, mapProfileRecord, mapProfileScores } from './profileContract.js';
import { createDefaultProfileConfig, normalizeProfileConfig } from './profileConfig.js';
import { normalizeProfileStory } from './profileStory.js';
import { createEmptyProgression, loadMyProgression } from './progressionState.js';
import { normalizeUsernameSegment } from './routeContract.js';
import { isProfileFeatureEnabled } from './profileFeatureFlags.js';
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

function isV2ConfigurationPayload(value) {
  return Boolean(value
    && typeof value === 'object'
    && Number(value.version) === 2
    && value.base
    && typeof value.base === 'object');
}

function getV2ConfigurationPayload(value, key) {
  const source = value && typeof value === 'object' ? value : null;
  if (!source) return null;
  const candidates = [
    source[`${key}_v2`],
    source.configuration_v2?.[key],
    source[key],
    source
  ];
  return candidates.find(isV2ConfigurationPayload) || null;
}

function isValidV2ConfigurationResponse(response) {
  const value = response?.data;
  if (response?.error || !value || typeof value !== 'object' || value.success === false) return false;
  return Boolean(getV2ConfigurationPayload(value, 'draft') || getV2ConfigurationPayload(value, 'published'));
}

/**
 * V2 owns the expression-aware read contract. Keep the legacy read as a
 * compatibility fallback while older deployments finish applying the additive
 * RPC migration; this prevents a partial rollout from turning a valid avatar
 * into the initials fallback.
 */
async function loadProfileConfiguration(supabaseClient, { viewingOwnProfile, profileId, useV2 }) {
  const legacyName = viewingOwnProfile
    ? 'get_my_profile_configuration'
    : 'get_public_profile_configuration';
  const legacyArgs = viewingOwnProfile ? {} : { p_user_id: profileId };
  if (!useV2) return supabaseClient.rpc(legacyName, legacyArgs);

  const v2Response = await supabaseClient.rpc(
    viewingOwnProfile ? 'get_my_profile_configuration_v2' : 'get_public_profile_configuration_v2',
    legacyArgs
  );
  if (isValidV2ConfigurationResponse(v2Response)) return v2Response;
  return supabaseClient.rpc(legacyName, legacyArgs);
}

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
    progressionProof: { completedCount: 0, recentUnlocks: [] },
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
 * The Studio already has the authenticated profile in the account store. Its
 * first paint only needs the owner configuration that drives the editor and
 * live card; it should not pay for the public-profile hydration contract used
 * by the public route. Keep this intentionally narrow so adding another
 * editor control cannot accidentally reintroduce the full profile fan-out.
 */
export async function loadProfileStudioContext({
  supabaseClient = null,
  profileRecord = null,
  sessionUserId = null
} = {}) {
  if (!supabaseClient) return emptyProfileContext({ loadError: PROFILE_LOAD_MESSAGE });

  const targetProfile = profileRecord && typeof profileRecord === 'object'
    ? mapProfileRecord(profileRecord)
    : null;
  const profileId = targetProfile?.id || sessionUserId || null;
  if (!profileId) return emptyProfileContext({ loadError: PROFILE_LOAD_MESSAGE });

  const context = emptyProfileContext({
    profileId,
    viewingOwnProfile: true,
    targetProfile,
    totalRolls: Number(targetProfile?.total_rolls) || 0
  });
  const fallbackColor = targetProfile?.mood_color || '#CDD2FF';
  const useV2 = isProfileFeatureEnabled('profileConfigurationV2', {
    userId: profileId,
    isStaff: Boolean(targetProfile?.is_staff)
  });
  const configResponse = await loadProfileConfiguration(supabaseClient, {
    viewingOwnProfile: true,
    profileId,
    useV2
  });

  if (configResponse.error || configResponse.data?.success === false) {
    context.dataWarning = 'Profile customization is temporarily unavailable.';
    const fallback = createDefaultProfileConfig(fallbackColor);
    context.profileConfig = { draft: fallback, published: fallback, version: 1 };
    return context;
  }

  const v2Draft = useV2
    ? configResponse.data?.draft_v2
      || configResponse.data?.configuration_v2?.draft
      || (Number(configResponse.data?.draft?.version) === 2 ? configResponse.data.draft : null)
    : null;
  const v2Published = useV2
    ? configResponse.data?.published_v2
      || configResponse.data?.configuration_v2?.published
      || (Number(configResponse.data?.published?.version) === 2 ? configResponse.data.published : null)
    : null;
  const normalizedV2Draft = v2Draft
    ? await normalizeV2Configuration(v2Draft, fallbackColor, { staff: Boolean(targetProfile?.is_staff) })
    : null;
  const normalizedV2Published = v2Published
    ? await normalizeV2Configuration(v2Published, fallbackColor, { staff: Boolean(targetProfile?.is_staff) })
    : null;
  context.profileConfig = {
    version: normalizedV2Draft || normalizedV2Published ? 2 : (Number(configResponse.data?.version) || 1),
    draft: normalizedV2Draft || normalizeProfileConfig(configResponse.data?.draft, fallbackColor),
    published: normalizedV2Published || normalizeProfileConfig(configResponse.data?.published, fallbackColor),
    v2Draft: normalizedV2Draft,
    v2Published: normalizedV2Published,
    updatedAt: configResponse.data?.updated_at || null,
    publishedAt: configResponse.data?.published_at || null
  };
  return context;
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
    const configRequest = loadProfileConfiguration(supabaseClient, {
      viewingOwnProfile,
      profileId: context.profileId,
      useV2: isProfileFeatureEnabled('profileConfigurationV2', {
        userId: context.profileId,
        isStaff: Boolean(context.targetProfile?.is_staff)
      })
    });
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
      context.progressionProof = normalizedStory.progressionProof;
    }

    const fallbackColor = context.targetProfile?.mood_color || '#8B7CF6';
    const profileConfigurationV2Enabled = isProfileFeatureEnabled('profileConfigurationV2', {
      userId: context.profileId,
      isStaff: Boolean(context.targetProfile?.is_staff)
    });
    if (configResponse.error || (viewingOwnProfile && configResponse.data?.success === false)) {
      context.dataWarning = context.dataWarning || 'Profile customization is temporarily unavailable.';
      const fallback = createDefaultProfileConfig(fallbackColor);
      context.profileConfig = viewingOwnProfile
        ? { draft: fallback, published: fallback, version: 1 }
        : { draft: null, published: fallback, version: 1 };
    } else if (viewingOwnProfile) {
      const v2Draft = profileConfigurationV2Enabled
        ? getV2ConfigurationPayload(configResponse.data, 'draft')
        : null;
      const v2Published = profileConfigurationV2Enabled
        ? getV2ConfigurationPayload(configResponse.data, 'published')
        : null;
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
      const publicV2 = profileConfigurationV2Enabled
        ? getV2ConfigurationPayload(configResponse.data, 'published')
        : null;
      const v2 = publicV2
        ? await normalizeV2Configuration(publicV2, fallbackColor, { staff: Boolean(context.targetProfile?.is_staff) })
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
