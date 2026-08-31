import { normalizeRichMediaConfig } from '../profileRichMedia.js';
import { createDefaultProfileConfig, normalizeProfileConfig } from '../profileConfig.js';
import { buildProfileRenderSnapshot } from '../profileRenderModel.js';

export const PROFILE_STUDIO_FALLBACK_COLOR = '#CDD2FF';

const PROFILE_EXPRESSION_FIELDS = Object.freeze([
  'avatar_path',
  'background_path',
  'avatar_asset_id',
  'background_asset_id',
  'audio_path',
  'audio_asset_id',
  'spotify_type',
  'spotify_id',
  'background_video_path',
  'background_video_asset_id',
  'animated_avatar_path',
  'animated_avatar_asset_id',
  'share_image_path',
  'share_image_asset_id',
  'banner_path',
  'banner_asset_id',
  'cursor_path',
  'cursor_asset_id',
  'pointer_cursor_path',
  'pointer_cursor_asset_id',
  'audio_playlist',
  'media_references'
]);

const PROFILE_LAYOUT_DRAFT_FIELDS = Object.freeze([
  'templateKey',
  'layoutVariant',
  'modules'
]);

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value || {}, key);
}

function scopedConfig(detail) {
  return detail?.config && typeof detail.config === 'object' ? detail.config : {};
}

function pickFields(source, fields) {
  return Object.fromEntries(fields
    .filter(field => hasOwn(source, field))
    .map(field => [field, source[field]]));
}

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
  const preserved = {
    ...next,
    avatar_path: current.avatar_path ?? next.avatar_path ?? null,
    background_path: current.background_path ?? next.background_path ?? null,
    avatar_asset_id: current.avatar_asset_id ?? next.avatar_asset_id ?? null,
    background_asset_id: current.background_asset_id ?? next.background_asset_id ?? null,
    audio_path: current.audio_path ?? next.audio_path ?? null,
    audio_asset_id: current.audio_asset_id ?? next.audio_asset_id ?? null,
    spotify_type: current.spotify_type ?? next.spotify_type ?? null,
    spotify_id: current.spotify_id ?? next.spotify_id ?? null,
    background_video_path: Object.prototype.hasOwnProperty.call(next, 'background_video_path') ? nextRich.background_video_path : currentRich.background_video_path,
    background_video_asset_id: Object.prototype.hasOwnProperty.call(next, 'background_video_asset_id') ? nextRich.background_video_asset_id : currentRich.background_video_asset_id,
    animated_avatar_path: Object.prototype.hasOwnProperty.call(next, 'animated_avatar_path') ? nextRich.animated_avatar_path : currentRich.animated_avatar_path,
    animated_avatar_asset_id: Object.prototype.hasOwnProperty.call(next, 'animated_avatar_asset_id') ? nextRich.animated_avatar_asset_id : currentRich.animated_avatar_asset_id,
    share_image_path: Object.prototype.hasOwnProperty.call(next, 'share_image_path') ? nextRich.share_image_path : currentRich.share_image_path,
    share_image_asset_id: Object.prototype.hasOwnProperty.call(next, 'share_image_asset_id') ? nextRich.share_image_asset_id : currentRich.share_image_asset_id,
    banner_path: Object.prototype.hasOwnProperty.call(next, 'banner_path') ? nextRich.banner_path : currentRich.banner_path,
    banner_asset_id: Object.prototype.hasOwnProperty.call(next, 'banner_asset_id') ? nextRich.banner_asset_id : currentRich.banner_asset_id,
    cursor_path: Object.prototype.hasOwnProperty.call(next, 'cursor_path') ? nextRich.cursor_path : currentRich.cursor_path,
    cursor_asset_id: Object.prototype.hasOwnProperty.call(next, 'cursor_asset_id') ? nextRich.cursor_asset_id : currentRich.cursor_asset_id,
    pointer_cursor_path: Object.prototype.hasOwnProperty.call(next, 'pointer_cursor_path') ? nextRich.pointer_cursor_path : currentRich.pointer_cursor_path,
    pointer_cursor_asset_id: Object.prototype.hasOwnProperty.call(next, 'pointer_cursor_asset_id') ? nextRich.pointer_cursor_asset_id : currentRich.pointer_cursor_asset_id,
    audio_playlist: Object.prototype.hasOwnProperty.call(next, 'audio_playlist') ? nextRich.audio_playlist : currentRich.audio_playlist
  };
  for (const field of [
    'avatar_asset_id',
    'background_asset_id',
    'audio_asset_id',
    'background_video_asset_id',
    'animated_avatar_asset_id',
    'share_image_asset_id',
    'banner_asset_id',
    'cursor_asset_id',
    'pointer_cursor_asset_id'
  ]) {
    if (!Object.prototype.hasOwnProperty.call(next, field) && !Object.prototype.hasOwnProperty.call(current, field)) {
      delete preserved[field];
    }
  }
  return preserved;
}

export function hasServerDraftChanges(value) {
  if (!value?.draft || !value?.published) return false;
  return JSON.stringify(toEditorProfileConfig(value.draft)) !== JSON.stringify(toEditorProfileConfig(value.published));
}

export function buildConfigurationV2(editorConfig, reference = null, fallbackColor = PROFILE_STUDIO_FALLBACK_COLOR) {
  const normalizedBase = toEditorProfileConfig(editorConfig, fallbackColor);
  const base = normalizeProfileConfig({
    ...normalizedBase,
    templateKey: normalizedBase.layoutVariant,
    layoutVariant: normalizedBase.layoutVariant
  }, fallbackColor);
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
 * Apply one editor-owned patch to the complete Studio draft.  Editors may
 * retain their own input/cache state, but they only contribute the fields
 * named by their scope.  This prevents a hidden editor's stale normalized
 * config from replacing appearance, media, identity, or another editor's
 * current draft.
 */
/** @param {any} currentConfig @param {{scope?: string, detail?: any}} patch */
export function applyProfileStudioDraftPatch(currentConfig, patch = {}, fallbackColor = PROFILE_STUDIO_FALLBACK_COLOR) {
  const { scope, detail } = patch;
  const current = toEditorProfileConfig(currentConfig, fallbackColor);
  const payload = detail && typeof detail === 'object' ? detail : {};
  const config = scopedConfig(payload);

  if (scope === 'appearance' && payload.appearance) {
    const currentAppearance = current.appearance;
    const incomingAppearance = payload.appearance;
    return normalizeProfileConfig({
      ...current,
      appearance: {
        ...currentAppearance,
        ...incomingAppearance,
        colors: { ...currentAppearance.colors, ...incomingAppearance.colors },
        surface: { ...currentAppearance.surface, ...incomingAppearance.surface },
        gradient: { ...currentAppearance.gradient, ...incomingAppearance.gradient },
        border: { ...currentAppearance.border, ...incomingAppearance.border },
        // Background treatment is a separate mounted editor and patch scope.
        // Never let the appearance editor's cached complete object replace it.
        background: currentAppearance.background
      },
      signatureColor: incomingAppearance.colors?.accent || current.signatureColor
    }, fallbackColor);
  }

  if (scope === 'appearance-background' && payload.background) {
    return normalizeProfileConfig({
      ...current,
      appearance: {
        ...current.appearance,
        background: payload.background
      }
    }, fallbackColor);
  }

  if (scope === 'media') {
    const mediaFields = pickFields(payload, PROFILE_EXPRESSION_FIELDS);
    return Object.keys(mediaFields).length
      ? normalizeProfileConfig({ ...current, ...mediaFields }, fallbackColor)
      : current;
  }

  if (scope === 'layout') {
    const next = {
      ...current,
      ...pickFields(config, PROFILE_LAYOUT_DRAFT_FIELDS),
    };
    return normalizeProfileConfig(next, fallbackColor);
  }

  if (scope === 'links') {
    return normalizeProfileConfig({
      ...current,
      ...pickFields(config, ['links', 'linkStyle', 'metadata'])
    }, fallbackColor);
  }

  if (scope === 'content' && hasOwn(config, 'content')) {
    return normalizeProfileConfig({ ...current, content: config.content }, fallbackColor);
  }

  if (scope === 'widgets' && hasOwn(config, 'widgets')) {
    return normalizeProfileConfig({ ...current, widgets: config.widgets }, fallbackColor);
  }

  return current;
}

export function applyProfileStudioIdentityPatch(currentIdentity = {}, detail = {}) {
  const current = /** @type {any} */ (currentIdentity);
  const payload = /** @type {any} */ (detail && typeof detail === 'object' ? detail : {});
  return {
    ...(current && typeof current === 'object' ? current : {}),
    ...(hasOwn(payload, 'bio') ? { bio: payload.bio } : {}),
    ...(hasOwn(payload, 'identityPresentation') ? { identityPresentation: payload.identityPresentation } : {})
  };
}

/**
 * Compose the one internal preview model. Child editors may retain local
 * editing/cache state, but only the complete Studio draft and identity draft
 * reach this function. The renderer never receives editor-owned whole-config
 * replacements.
 */
/** @param {any} options */
export function createProfileStudioPreviewModel(options = {}) {
  const {
    targetProfile,
    profileConfig,
    equippedCosmetics,
    studioDraft = null,
    studioIdentityDraft = null,
    cosmeticPreviewLoadout = null,
    fallbackColor = PROFILE_STUDIO_FALLBACK_COLOR,
    previewDevice = 'desktop',
    featureFlags = null
  } = options;
  const previewProfileConfigBase = studioDraft || toEditorProfileConfig(profileConfig?.draft, fallbackColor);
  const previewProfileConfig = studioIdentityDraft?.identityPresentation
    ? { ...previewProfileConfigBase, identityPresentation: studioIdentityDraft.identityPresentation }
    : previewProfileConfigBase;
  const previewProfile = targetProfile
    ? {
        ...targetProfile,
        bio: studioIdentityDraft && Object.prototype.hasOwnProperty.call(studioIdentityDraft, 'bio') ? studioIdentityDraft.bio : targetProfile.bio,
        equipped_cosmetics: cosmeticPreviewLoadout || equippedCosmetics || {}
      }
      : null;

  const snapshot = buildProfileRenderSnapshot({
    profile: targetProfile,
    profileConfig,
    studioDraft,
    studioIdentityDraft,
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
    identity: studioIdentityDraft,
    cosmetics: snapshot.cosmetics?.loadout || {},
    configuration: previewProfileConfig,
    snapshot
  });
}

/** @param {any} options */
export function createProfileStudioDraftState({ profileConfig, targetProfile, equippedCosmetics } = /** @type {any} */ ({})) {
  const editorProfileConfig = createEditorProfileConfig(profileConfig) || createEmptyEditorProfileConfig();
  return {
    profileConfig: editorProfileConfig,
    targetProfile: targetProfile || {},
    equippedCosmetics: equippedCosmetics || {},
    studioDraft: toEditorProfileConfig(editorProfileConfig.draft),
    studioIdentityDraft: {
      bio: targetProfile?.bio || '',
      identityPresentation: toEditorProfileConfig(editorProfileConfig.draft).identityPresentation
    },
    cosmeticPreviewLoadout: null
  };
}
