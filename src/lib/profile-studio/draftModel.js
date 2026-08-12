import { normalizeRichMediaConfig } from '../profileRichMedia.js';
import { createDefaultProfileConfig, normalizeProfileConfig } from '../profileConfig.js';
import { buildProfileRenderSnapshot } from '../profileRenderModel.js';

export const PROFILE_STUDIO_FALLBACK_COLOR = '#CDD2FF';

const PROFILE_EXPRESSION_FIELDS = Object.freeze([
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

/**
 * Convert both the original V1 editor shape and the V2 envelope into the
 * bounded shape consumed by the existing editors.  V2 remains the server
 * contract; this projection is only an editor/preview convenience.
 */
export function toEditorProfileConfig(value, fallbackColor = PROFILE_STUDIO_FALLBACK_COLOR) {
  const source = value && typeof value === 'object' ? value : {};
  if (Number(source.version) === 2) {
    const base = source.base && typeof source.base === 'object' ? source.base : source;
    return normalizeProfileConfig({
      ...base,
      version: 1,
      configurationVersion: 2,
      links: source.links || base.links,
      content: source.content || base.content,
      widgets: source.widgets || base.widgets,
      identityPresentation: source.identity || base.identityPresentation,
      metadata: source.metadata || base.metadata,
      linkStyle: source.linkStyle || base.linkStyle
    }, fallbackColor);
  }
  return normalizeProfileConfig(source, fallbackColor);
}

export function createEditorProfileConfig(value, fallbackColor = PROFILE_STUDIO_FALLBACK_COLOR) {
  if (!value) return null;
  return {
    ...value,
    draft: toEditorProfileConfig(value.draft, fallbackColor),
    published: toEditorProfileConfig(value.published, fallbackColor)
  };
}

export function createEmptyEditorProfileConfig(fallbackColor = PROFILE_STUDIO_FALLBACK_COLOR) {
  const defaults = createDefaultProfileConfig(fallbackColor);
  return { version: 1, draft: defaults, published: defaults };
}

export function preserveExpressionFields(nextConfig, currentConfig) {
  const next = nextConfig || {};
  const current = currentConfig || {};
  const nextRich = normalizeRichMediaConfig(next);
  const currentRich = normalizeRichMediaConfig(current);
  return {
    ...next,
    avatar_path: current.avatar_path ?? next.avatar_path ?? null,
    background_path: current.background_path ?? next.background_path ?? null,
    audio_path: current.audio_path ?? next.audio_path ?? null,
    spotify_type: current.spotify_type ?? next.spotify_type ?? null,
    spotify_id: current.spotify_id ?? next.spotify_id ?? null,
    background_video_path: Object.prototype.hasOwnProperty.call(next, 'background_video_path') ? nextRich.background_video_path : currentRich.background_video_path,
    banner_path: Object.prototype.hasOwnProperty.call(next, 'banner_path') ? nextRich.banner_path : currentRich.banner_path,
    cursor_path: Object.prototype.hasOwnProperty.call(next, 'cursor_path') ? nextRich.cursor_path : currentRich.cursor_path,
    pointer_cursor_path: Object.prototype.hasOwnProperty.call(next, 'pointer_cursor_path') ? nextRich.pointer_cursor_path : currentRich.pointer_cursor_path,
    audio_playlist: Object.prototype.hasOwnProperty.call(next, 'audio_playlist') ? nextRich.audio_playlist : currentRich.audio_playlist
  };
}

export function hasServerDraftChanges(value) {
  if (!value?.draft || !value?.published) return false;
  return JSON.stringify(toEditorProfileConfig(value.draft)) !== JSON.stringify(toEditorProfileConfig(value.published));
}

export function buildConfigurationV2(editorConfig, reference = null, fallbackColor = PROFILE_STUDIO_FALLBACK_COLOR) {
  const base = toEditorProfileConfig(editorConfig, fallbackColor);
  const source = reference && Number(reference.version) === 2 ? reference : {};
  return {
    version: 2,
    base,
    links: base.links,
    identity: base.identityPresentation || source.identity,
    content: base.content,
    widgets: base.widgets,
    metadata: base.metadata || source.metadata,
    sharing: source.sharing || { qrEnabled: true, previewEnabled: true }
  };
}

/**
 * Older publish boundaries returned the structured V2 envelope without the
 * dedicated expression columns. Keep the client safe while those deployments
 * are still possible, but preserve explicit nulls from a complete response.
 */
export function mergeConfigurationV2ExpressionFields(value, fallback = null) {
  if (!value || Number(value.version) !== 2 || !fallback || Number(fallback.version) !== 2) return value;
  const valueBase = value.base && typeof value.base === 'object' ? value.base : {};
  const fallbackBase = fallback.base && typeof fallback.base === 'object' ? fallback.base : {};
  const base = { ...fallbackBase, ...valueBase };
  const next = { ...fallback, ...value, base };
  for (const field of PROFILE_EXPRESSION_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(valueBase, field) && Object.prototype.hasOwnProperty.call(value, field)) {
      base[field] = value[field];
    }
    if (!Object.prototype.hasOwnProperty.call(base, field) && Object.prototype.hasOwnProperty.call(fallback, field)) {
      base[field] = fallback[field];
    }
    if (!Object.prototype.hasOwnProperty.call(base, field)) continue;
    if (!Object.prototype.hasOwnProperty.call(next, field)) next[field] = base[field];
  }
  return next;
}

export function asConfigurationV2(value, fallback = null, fallbackColor = PROFILE_STUDIO_FALLBACK_COLOR) {
  if (value && Number(value.version) === 2) return mergeConfigurationV2ExpressionFields(value, fallback);
  if (fallback && Number(fallback.version) === 2) return fallback;
  return buildConfigurationV2(value || createDefaultProfileConfig(fallbackColor), fallback, fallbackColor);
}

export function mergeDraftConfig(currentConfig, nextConfig, fallbackColor = PROFILE_STUDIO_FALLBACK_COLOR) {
  return normalizeProfileConfig({
    ...toEditorProfileConfig(currentConfig, fallbackColor),
    ...preserveExpressionFields(nextConfig, toEditorProfileConfig(currentConfig, fallbackColor))
  }, fallbackColor);
}

/**
 * Compose the one internal preview model.  Child editors can continue to emit
 * their legacy event payloads; the adapter turns each payload into this one
 * projection before it reaches the live renderer.
 */
/** @param {any} options */
export function createProfileStudioPreviewModel(options = {}) {
  const {
    targetProfile,
    profileConfig,
    equippedCosmetics,
    configurationPreview = null,
    identityPreview = null,
    cosmeticPreviewLoadout = null,
    fallbackColor = PROFILE_STUDIO_FALLBACK_COLOR,
    previewDevice = 'desktop',
    featureFlags = null
  } = options;
  const previewProfileConfigBase = configurationPreview || toEditorProfileConfig(profileConfig?.draft, fallbackColor);
  const previewProfileConfig = identityPreview?.identityPresentation
    ? { ...previewProfileConfigBase, identityPresentation: identityPreview.identityPresentation }
    : previewProfileConfigBase;
  const previewProfile = targetProfile
    ? {
        ...targetProfile,
        bio: identityPreview ? identityPreview.bio : targetProfile.bio,
        equipped_cosmetics: cosmeticPreviewLoadout || equippedCosmetics || {}
      }
      : null;

  const snapshot = buildProfileRenderSnapshot({
    profile: targetProfile,
    profileConfig,
    configurationPreview,
    identityPreview,
    equippedCosmetics,
    cosmeticPreviewLoadout,
    scores: options.previewScores || [],
    timelineEvents: options.previewTimelineEvents || [],
    collectionItems: options.previewCollectionItems || [],
    allAchievements: options.previewAllAchievements || [],
    fallbackColor,
    featureFlags,
    previewDevice,
    previewMode: true,
    mode: 'studio',
    isOwner: false,
    dev: options.dev === true,
    visualFixture: options.visualFixture || ''
  });

  return Object.freeze({
    profile: previewProfile,
    profileConfig: previewProfileConfig,
    identity: identityPreview,
    cosmetics: cosmeticPreviewLoadout,
    configuration: configurationPreview,
    snapshot
  });
}

/** @param {any} options */
export function createProfileStudioDraftState({ profileConfig, targetProfile, equippedCosmetics } = /** @type {any} */ ({})) {
  return {
    profileConfig: createEditorProfileConfig(profileConfig) || createEmptyEditorProfileConfig(),
    targetProfile: targetProfile || {},
    equippedCosmetics: equippedCosmetics || {},
    configurationPreview: null,
    identityPreview: null,
    cosmeticPreviewLoadout: null
  };
}
