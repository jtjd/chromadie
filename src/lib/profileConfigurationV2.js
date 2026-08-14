import { createDefaultProfileConfig, normalizeProfileConfig } from './profileConfig.js';
import { normalizeProfileContent } from './profileContent.js';
import { normalizeProfileIdentityPresentation } from './profileIdentityPresentation.js';
import { normalizeProfileMetadata } from './profileMetadata.js';
import { normalizeProfileWidgets } from './profileWidgets.js';

export const PROFILE_CONFIGURATION_V2_VERSION = 2;
export const PROFILE_CONFIGURATION_V2_LIMITS = Object.freeze({ maxLinks: 25, freeProjects: 4, premiumProjects: 10, freeWidgets: 2, premiumWidgets: 4 });

function safeKey(value, fallback) {
  const key = String(value ?? '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,31}$/.test(key) ? key : fallback;
}

function stableKey(value, index) {
  const text = `${value?.label || ''}|${value?.url || ''}|${index}`;
  let hash = 2166136261;
  for (const character of text) hash = Math.imul(hash ^ character.codePointAt(0), 16777619);
  return `l${(hash >>> 0).toString(36)}`;
}

function normalizeV2Link(value, index) {
  if (!value || typeof value !== 'object') return null;
  const url = String(value.url || '').trim();
  const label = [...String(value.label || '')].filter(character => {
    const code = character.codePointAt(0);
    return code >= 32 && (code < 127 || code > 159);
  }).join('').trim().slice(0, 40);
  if (!label || !/^https:\/\/[^\s<>"']+$/.test(url) || url.length > 2048) return null;
  return {
    key: safeKey(value.key, stableKey(value, index)),
    type: String(value.type || 'other').trim().toLowerCase().slice(0, 24) || 'other',
    label,
    url,
    visible: value.visible !== false,
    order: Math.min(24, Math.max(0, Number.isInteger(Number(value.order)) ? Number(value.order) : index))
  };
}

export function createDefaultProfileConfigurationV2(signatureColor = '#CDD2FF') {
  const base = createDefaultProfileConfig(signatureColor);
  return {
    version: PROFILE_CONFIGURATION_V2_VERSION,
    base,
    links: [],
    identity: normalizeProfileIdentityPresentation(),
    content: normalizeProfileContent({ version: 2 }),
    widgets: [],
    metadata: normalizeProfileMetadata(),
    sharing: { qrEnabled: true, previewEnabled: true }
  };
}

/**
 * V2 is an additive envelope. V1 payloads are upgraded without changing the
 * V1 render model, while V2 fields are independently normalized and bounded.
 */
export function normalizeProfileConfigurationV2(value, fallbackColor = '#CDD2FF', { premium = false, staff = false } = {}) {
  const input = value && typeof value === 'object' ? value : {};
  const source = Number(input.version) === PROFILE_CONFIGURATION_V2_VERSION
    ? input
    : { ...createDefaultProfileConfigurationV2(fallbackColor), base: input };
  const baseInput = source.base && typeof source.base === 'object' ? source.base : source;
  // Expression media is historically stored in dedicated columns and older
  // V2 RPC responses may expose those columns at the envelope level. Merge
  // both representations before normalizing so a profile cannot lose its
  // persisted avatar/background merely because the V2 envelope was returned.
  const expressionFields = [
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
    'banner_path',
    'banner_asset_id',
    'cursor_path',
    'cursor_asset_id',
    'pointer_cursor_path',
    'pointer_cursor_asset_id',
    'audio_playlist'
  ];
  const envelopeExpression = Object.fromEntries(
    expressionFields
      .filter(field => Object.prototype.hasOwnProperty.call(source, field))
      .map(field => [field, source[field]])
  );
  const base = normalizeProfileConfig({ ...baseInput, ...envelopeExpression, version: 1 }, fallbackColor);
  const rawLinks = Array.isArray(source.links) ? source.links : base.links;
  const links = rawLinks.map(normalizeV2Link).filter(Boolean).sort((left, right) => left.order - right.order).slice(0, PROFILE_CONFIGURATION_V2_LIMITS.maxLinks).map((link, index) => ({ ...link, order: index }));
  const maxProjects = premium || staff ? PROFILE_CONFIGURATION_V2_LIMITS.premiumProjects : PROFILE_CONFIGURATION_V2_LIMITS.freeProjects;
  const content = normalizeProfileContent({ ...(source.content || {}), version: Number(source.content?.version) === 2 ? 2 : 1 });
  content.projects = content.projects.slice(0, maxProjects).map((project, index) => ({ ...project, order: index }));
  const maxWidgets = premium || staff ? PROFILE_CONFIGURATION_V2_LIMITS.premiumWidgets : PROFILE_CONFIGURATION_V2_LIMITS.freeWidgets;
  const widgets = normalizeProfileWidgets(source.widgets ?? base.widgets, base, { maxWidgets });
  return {
    version: PROFILE_CONFIGURATION_V2_VERSION,
    base: { ...base, links: links.slice(0, 6), content, widgets: widgets.slice(0, maxWidgets) },
    links,
    identity: normalizeProfileIdentityPresentation(source.identity),
    content,
    widgets,
    metadata: normalizeProfileMetadata(source.metadata),
    sharing: {
      qrEnabled: source.sharing?.qrEnabled !== false,
      previewEnabled: source.sharing?.previewEnabled !== false
    }
  };
}

export function upgradeProfileConfigurationV1(value, fallbackColor = '#CDD2FF', options = {}) {
  return normalizeProfileConfigurationV2({ version: 2, base: value, links: value?.links, content: value?.content, widgets: value?.widgets }, fallbackColor, options);
}
