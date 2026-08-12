import { getRank, getRankState } from './ranks.js';
import { getBadgeMeta } from './badgeData.js';
import { getProfileMediaUrl } from './profileMedia.js';
import { getProfileStoryUnlocks } from './profileStory.js';
import { getProfileComposition } from './profileComposition.js';
import {
  getProfileLayoutLinkPartitions,
  getProfileRollVisible,
  getProfileStoryVisible,
  getVisibleProfileLinks,
  hasProfileMoreContent,
  normalizeProfileConfig
} from './profileConfig.js';
import { resolveProfileLayoutVariant } from './profile-layout/profileLayouts.js';
import { getCursorTrailKey } from './cursor-trail/cursorTrails.js';
import { getNameRendererLoadout } from './name/nameLoadout.js';
import { getProfileAppearanceStyle, getProfileCanvasStyle } from './profileAppearanceStyle.js';
import { getVisibleProfileContent } from './profileContentLegacy.js';
import { getVisibleProfileWidgets } from './profileWidgetsLegacy.js';
import { normalizeRichMediaConfig } from './profileRichMedia.js';
import { PROFILE_MUSIC_ENABLED } from './profileFeatures.js';
import { resolveProfileFeatureFlags } from './profileFeatureFlags.js';
import { isProfileSocialLink } from './profileLinkTypes.js';

const DEFAULT_COLOR = '#CDD2FF';
const EXPRESSION_FIELDS = Object.freeze([
  'avatar_path',
  'background_path',
  'audio_path',
  'spotify_type',
  'spotify_id',
  'background_video_path',
  'banner_path',
  'cursor_path',
  'pointer_cursor_path',
  'audio_playlist'
]);

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value || {}, key);
}

function hasExpressionField(value, field) {
  const source = asObject(value);
  return hasOwn(source, field) || hasOwn(source.base, field);
}

function readExpressionField(value, field) {
  const source = asObject(value);
  if (hasOwn(source, field)) return source[field];
  if (hasOwn(source.base, field)) return source.base[field];
  return undefined;
}

function pickConfigurationSource(input) {
  const profileConfig = asObject(input.profileConfig);
  const studio = Boolean(input.previewMode || input.mode === 'studio');
  if (studio) {
    return input.studioDraft
      || input.draft
      || profileConfig.draft
      || profileConfig.published
      || input.configuration
      || profileConfig
      || null;
  }
  return input.configuration
    || profileConfig.published
    || profileConfig.draft
    || profileConfig
    || null;
}

function mergeExpressionFields(value, ...fallbacks) {
  const source = asObject(value);
  const merged = { ...source };
  const base = asObject(source.base);
  let mergedBase = base;
  for (const field of EXPRESSION_FIELDS) {
    if (hasOwn(merged, field)) {
      if (source.base && !hasOwn(base, field)) mergedBase = { ...mergedBase, [field]: merged[field] };
      continue;
    }
    if (hasOwn(base, field)) continue;
    for (const fallback of fallbacks) {
      if (!hasExpressionField(fallback, field)) continue;
      const nextValue = readExpressionField(fallback, field);
      if (source.base) mergedBase = { ...mergedBase, [field]: nextValue };
      else merged[field] = nextValue;
      break;
    }
  }
  if (source.base) merged.base = mergedBase;
  return merged;
}

function applyExpressionOverrides(value, ...overrides) {
  const source = asObject(value);
  const merged = { ...source };
  const hasBase = source.base && typeof source.base === 'object';
  let mergedBase = asObject(source.base);
  for (const field of EXPRESSION_FIELDS) {
    const override = overrides.find(candidate => hasExpressionField(candidate, field));
    if (!override) continue;
    const nextValue = readExpressionField(override, field);
    if (hasBase) {
      mergedBase = { ...mergedBase, [field]: nextValue };
      merged[field] = nextValue;
    } else {
      merged[field] = nextValue;
    }
  }
  if (hasBase) merged.base = mergedBase;
  return merged;
}

function resolveMediaUrl(path, input) {
  if (!path) return '';
  if (typeof input.mediaResolver === 'function') return input.mediaResolver(path, input.mediaCacheKey || '');
  return getProfileMediaUrl(path, input.mediaCacheKey || '');
}

function resolveBadges(profile, allAchievements) {
  const records = Array.isArray(allAchievements) ? allAchievements : [];
  return (Array.isArray(profile?.equipped_badges) ? profile.equipped_badges : [])
    .map(id => {
      const safeId = String(id || '');
      if (safeId === 'launch_edition') {
        return {
          id: safeId,
          name: 'Launch Edition',
          icon: '✦',
          description: 'A founding color identity from the launch window.'
        };
      }
      const record = records.find(achievement => achievement.id === safeId);
      const fallback = getBadgeMeta(safeId);
      return {
        id: safeId,
        name: record?.name || fallback.name || safeId,
        icon: record?.icon || fallback.symbol || '✦',
        description: record?.description || fallback.desc || 'A pinned color achievement.'
      };
    });
}

function latestScore(scores) {
  return (Array.isArray(scores) ? scores : [])
    .slice()
    .sort((left, right) => String(right?.roll_date || '').localeCompare(String(left?.roll_date || '')))[0] || null;
}

function bestScore(scores, profile) {
  const profileBest = profile?.best_roll_score !== null && profile?.best_roll_score !== undefined
    ? {
        score: profile.best_roll_score,
        hex_code: profile.best_roll_hex,
        rarity: profile.best_roll_rarity
      }
    : null;
  const computed = (Array.isArray(scores) ? scores : []).length
    ? scores.reduce((max, score) => Number(score?.score) > Number(max?.score) ? score : max, scores[0])
    : null;
  return { profileBest, computed, display: profileBest || computed };
}

/**
 * Resolve all profile inputs before they reach the renderer.
 *
 * Precedence is intentionally kept here, and nowhere in ProfileShell:
 *
 * Studio configuration: studioDraft -> draft -> published -> defaults.
 * Studio identity: studioIdentityDraft -> profile identity.
 * Studio cosmetics: cosmeticPreviewLoadout -> equipped cosmetics.
 * Expression media: an explicit current field -> the selected configuration
 * field -> the persisted configuration field. Explicit nulls are preserved.
 * Public rendering uses published configuration, persisted expression fields,
 * and equipped cosmetics. The `isOwner` permission is supplied by the host.
 *
 * @param {any} input
 */
export function buildProfileRenderSnapshot(input = {}) {
  const sourceProfile = input.profile && typeof input.profile === 'object' ? input.profile : null;
  const profileConfig = asObject(input.profileConfig);
  const fallbackColor = sourceProfile?.mood_color || input.fallbackColor || DEFAULT_COLOR;
  const selectedConfiguration = pickConfigurationSource(input);
  const configurationWithExpressions = applyExpressionOverrides(
    mergeExpressionFields(
      selectedConfiguration,
      profileConfig.draft,
      profileConfig.published,
      input.configuration,
      profileConfig
    ),
    input.expression,
    input.media
  );
  const identityDraft = asObject(input.studioIdentityDraft);
  const configurationInput = {
    ...configurationWithExpressions,
    ...(identityDraft.identityPresentation ? { identityPresentation: identityDraft.identityPresentation } : {})
  };
  const configuration = normalizeProfileConfig(configurationInput, fallbackColor);

  const cosmeticPreviewLoadout = input.cosmeticPreviewLoadout;
  const equippedCosmetics = cosmeticPreviewLoadout !== null && cosmeticPreviewLoadout !== undefined
    ? cosmeticPreviewLoadout
    : input.cosmetics !== null && input.cosmetics !== undefined
      ? input.cosmetics
      : sourceProfile?.equipped_cosmetics || {};
  const profile = sourceProfile
    ? {
        ...sourceProfile,
        bio: hasOwn(identityDraft, 'bio') ? identityDraft.bio : sourceProfile.bio,
        equipped_cosmetics: equippedCosmetics
      }
    : null;

  const featureFlags = input.featureFlags || resolveProfileFeatureFlags({
    userId: profile?.id,
    isStaff: Boolean(profile?.is_staff)
  });
  const richMedia = featureFlags.richMedia !== false
    ? normalizeRichMediaConfig(configuration)
    : normalizeRichMediaConfig({});
  const layoutVariant = resolveProfileLayoutVariant(configuration);
  const scores = Array.isArray(input.scores) ? input.scores : [];
  const latestRoll = latestScore(scores);
  const best = bestScore(scores, profile);
  const appearance = configuration.appearance;
  const cosmetics = asObject(equippedCosmetics);
  const identityPresentation = configuration.identityPresentation || {};
  const isOwner = Boolean(input.permissions?.isOwner ?? input.isOwner ?? false);
  const previewMode = Boolean(input.previewMode || input.mode === 'studio');
  const visibleLinks = getVisibleProfileLinks(configuration);
  const layoutLinkPartitions = getProfileLayoutLinkPartitions(configuration, layoutVariant);
  const continuationLinks = layoutLinkPartitions.continuation;
  const continuationSocialLinks = continuationLinks.filter(link => isProfileSocialLink(link.type));
  const continuationNavigationLinks = continuationLinks.filter(link => !isProfileSocialLink(link.type));
  const pinnedAchievements = resolveBadges(profile, input.allAchievements);
  const profileContent = configuration.content;
  const visibleContent = getVisibleProfileContent(profileContent);
  const profileWidgets = getVisibleProfileWidgets(configuration.widgets, configuration);
  const hasSpotifyWidget = profileWidgets.some(widget => widget.provider === 'spotify');
  const media = {
    avatarPath: configuration.avatar_path,
    avatarUrl: resolveMediaUrl(configuration.avatar_path, input),
    backgroundPath: configuration.background_path,
    backgroundUrl: resolveMediaUrl(configuration.background_path, input),
    backgroundVideoPath: richMedia.background_video_path,
    backgroundVideoUrl: resolveMediaUrl(richMedia.background_video_path, input),
    audioPath: configuration.audio_path,
    audioUrl: resolveMediaUrl(configuration.audio_path, input),
    bannerPath: richMedia.banner_path,
    bannerUrl: resolveMediaUrl(richMedia.banner_path, input),
    cursorPath: richMedia.cursor_path,
    cursorUrl: resolveMediaUrl(richMedia.cursor_path, input),
    pointerCursorPath: richMedia.pointer_cursor_path,
    pointerCursorUrl: resolveMediaUrl(richMedia.pointer_cursor_path, input),
    playlist: richMedia.audio_playlist
  };
  const hasProfileMusic = Boolean(media.audioUrl || media.audioPath)
    || media.playlist.tracks.length > 0
    || Boolean(configuration.spotify_type && configuration.spotify_id)
    || Boolean(input.dev && input.visualFixture === 'music');
  // ProfileContent intentionally suppresses the default empty About heading.
  // Mirror that rendered-content contract here so the snapshot cannot create
  // a continuation section for a surface that will render no content.
  const hasProfileContent = Boolean(
    (visibleContent.about && (visibleContent.about.body || visibleContent.about.markdown || visibleContent.about.ast?.length))
    || visibleContent.projects.length
  );
  const hasLowerExpression = hasProfileMusic
    || PROFILE_MUSIC_ENABLED
    || profileWidgets.length > 0
    || hasProfileContent;
  const composition = getProfileComposition(configuration, {
    isOwner,
    hasLinks: visibleLinks.length > 0,
    hasPinnedAchievements: pinnedAchievements.length > 0,
    hasCollection: (Array.isArray(input.collectionItems) ? input.collectionItems : []).length > 0,
    hasTimeline: (Array.isArray(input.timelineEvents) ? input.timelineEvents : []).length > 0
  });
  const storyModules = composition.secondaryModules.filter(module => module.id !== 'links');
  const showRoll = getProfileRollVisible(configuration);
  const showLowerExpression = hasLowerExpression
    && (layoutVariant !== 'sleek' || profileWidgets.length > 0 || hasProfileContent);
  const hasBelowFoldRoll = showRoll && layoutVariant === 'portfolio';
  const storyUnlocks = getProfileStoryUnlocks(profile);
  const rank = profile ? getRank(profile.lifetime_ep || 0) : null;
  const rankState = profile ? getRankState(profile.lifetime_ep || 0) : null;
  const hasProfileStory = getProfileStoryVisible(configuration)
    && Boolean((rank && rankState) || storyModules.length);
  const hasProfileMore = hasProfileMoreContent({
    continuationCount: continuationLinks.length,
    hasBelowFoldRoll,
    showLowerExpression,
    hasProfileStory
  });
  const cacheKey = input.mediaCacheKey || '';
  const pageStyle = [
    getProfileCanvasStyle(configuration),
    media.cursorUrl ? `cursor:url("${media.cursorUrl}") 16 16, auto` : '',
    media.pointerCursorUrl ? `--profile-pointer-cursor:url("${media.pointerCursorUrl}")` : ''
  ].filter(Boolean).join(';');
  const isPreviewMobile = input.previewDevice === 'mobile';
  const profileName = profile?.username || 'Unknown Player';
  const profileDisplayName = profile?.display_name || profileName;
  const profileBio = typeof profile?.bio === 'string' ? profile.bio.trim().slice(0, 160) : '';
  const joinedLabel = profile?.created_at
    ? new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(new Date(profile.created_at))
    : '';
  const cursorTrailKey = getCursorTrailKey(cosmetics.cursor_trail);
  const nameRendererRecentColors = scores.slice(0, 6).map(score => score?.hex_code).filter(Boolean);
  const signatureColor = appearance.colors.accent;
  const nameRendererTodayColor = latestRoll?.hex_code || '#8B7CF6';
  const renderProfile = profile
    ? {
        ...profile,
        bio: profileBio,
        display_name: profileDisplayName
      }
    : null;

  return Object.freeze({
    version: 1,
    mode: previewMode ? 'studio' : 'public',
    previewDevice: isPreviewMobile ? 'mobile' : 'desktop',
    profile: renderProfile,
    configuration,
    featureFlags,
    identity: {
      username: profileName,
      displayName: profileDisplayName,
      bio: profileBio,
      avatarPath: media.avatarPath,
      avatarUrl: media.avatarUrl,
      presentation: identityPresentation,
      badges: pinnedAchievements,
      staff: Boolean(profile?.is_staff),
      founder: Boolean(profile?.equipped_badges?.includes('launch_edition')),
      location: identityPresentation.location || '',
      timezone: identityPresentation.timezone || '',
      joinedLabel,
      showJoinDate: identityPresentation.showJoinDate,
      showAvatar: identityPresentation.showAvatar,
      descriptionMode: identityPresentation.descriptionMode,
      entryAnimation: identityPresentation.entryAnimation
    },
    layout: {
      variant: layoutVariant,
      linkAlignment: configuration.linkStyle?.alignment || 'left',
      presentation: layoutVariant
    },
    appearance,
    surface: {
      color: appearance.colors.surface,
      opacity: appearance.surface.opacity,
      blur: appearance.surface.blur,
      radius: appearance.border.radius,
      borderColor: appearance.border.color,
      borderWidth: appearance.border.enabled ? appearance.border.width : 0,
      borderOpacity: appearance.border.opacity,
      style: getProfileAppearanceStyle(configuration)
    },
    environment: {
      backgroundColor: appearance.colors.background,
      backgroundImagePath: media.backgroundPath,
      backgroundImageUrl: media.backgroundUrl,
      backgroundVideoPath: media.backgroundVideoPath,
      backgroundVideoUrl: media.backgroundVideoUrl,
      backgroundImageOpacity: appearance.background.imageOpacity,
      backgroundBlur: appearance.background.blur,
      atmosphereKey: cosmetics.profile_atmosphere || '',
      cursorTrailKey,
      cursorUrl: media.cursorUrl,
      pointerCursorUrl: media.pointerCursorUrl,
      pageStyle,
      cacheKey
    },
    media,
    cosmetics: {
      loadout: cosmetics,
      name: getNameRendererLoadout(cosmetics),
      avatarEffectKey: cosmetics.avatar_effect || '',
      borderKey: cosmetics.profile_border || '',
      atmosphereKey: cosmetics.profile_atmosphere || '',
      cursorTrailKey
    },
    links: {
      visible: visibleLinks,
      opening: layoutLinkPartitions.opening,
      continuation: continuationLinks,
      continuationSocial: continuationSocialLinks,
      continuationNavigation: continuationNavigationLinks
    },
    modules: {
      content: profileContent,
      visibleContent,
      widgets: profileWidgets,
      hasContent: hasProfileContent,
      hasMusic: hasProfileMusic,
      hasSpotifyWidget,
      showLowerExpression,
      hasProfileStory,
      storyModules,
      composition
    },
    roll: {
      show: showRoll,
      latest: latestRoll,
      best: best.display,
      state: input.rollState || 'idle',
      owner: isOwner,
      presentation: layoutVariant,
      hasBelowFold: hasBelowFoldRoll
    },
    story: {
      unlocks: storyUnlocks,
      rank,
      rankState,
      recentScores: scores.slice(0, 6),
      timelineEvents: Array.isArray(input.timelineEvents) ? input.timelineEvents : [],
      collectionItems: Array.isArray(input.collectionItems) ? input.collectionItems : []
    },
    permissions: {
      isOwner,
      isVisitor: !isOwner,
      previewMode,
      ownerActions: isOwner && !previewMode
    },
    visibility: {
      hasProfileMore,
      renderProfileMore: hasProfileMore
    },
    colors: {
      signature: signatureColor,
      nameBase: appearance.colors.username,
      nameToday: nameRendererTodayColor,
      nameRecent: nameRendererRecentColors,
      colorEffectsEnabled: configuration.colorEffectsEnabled === true
    },
    styles: {
      page: pageStyle,
      surface: getProfileAppearanceStyle(configuration)
    }
  });
}
