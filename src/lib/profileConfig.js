import { normalizeProfileExpression } from './profileExpression.js';
import { createDefaultRichMediaConfig, normalizeRichMediaConfig } from './profileRichMedia.js';
import { createDefaultProfileContent, normalizeProfileContent } from './profileContentLegacy.js';
import { normalizeProfileWidgets } from './profileWidgetsLegacy.js';
import { inferProfileTemplateKey, normalizeProfileTemplateKey } from './profileTemplates.js';
import { normalizeProfileLayoutKey, PROFILE_LAYOUT_KEYS } from './profile-layout/profileLayouts.js';
import { PROFILE_LINK_TYPES, isProfileLinkUrlValid, isProfileSocialLink } from './profileLinkTypes.js';

export const PROFILE_CONFIG_VERSION = 1;

export const PROFILE_LAYOUT_VARIANTS = PROFILE_LAYOUT_KEYS;
export const PROFILE_MODULE_IDS = Object.freeze([
  'roll',
  'stats',
  'signature',
  'links',
  'recent',
  'achievements',
  'boundary',
  'explore'
]);
export const PROFILE_MODULE_SIZES = Object.freeze(['wide', 'medium', 'narrow']);
export const PROFILE_LINK_LIMITS = Object.freeze({ freeLinks: 6, maxLinks: 25, openingLinks: 6 });
export const PROFILE_LINK_ALIGNMENTS = Object.freeze(['left', 'center', 'right']);

export const PROFILE_APPEARANCE_DEFAULTS = Object.freeze({
  colors: Object.freeze({
    text: '#F4F6FB',
    secondaryText: '#AEB6C4',
    username: '#FFFFFF',
    description: '#CBD1DC',
    background: '#07080B',
    surface: '#11141B',
    accent: '#CDD2FF',
    highlight: '#FFFFFF'
  }),
  surface: Object.freeze({ opacity: 64, blur: 20 }),
  background: Object.freeze({ blur: 0, imageOpacity: 100, overlayColor: '#000000', overlayOpacity: 0 }),
  gradient: Object.freeze({ enabled: false, primary: '#07080B', secondary: '#171A22', angle: 135 }),
  border: Object.freeze({ enabled: true, color: '#FFFFFF', width: 1, radius: 24, opacity: 11 })
});

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const HTTPS_URL_PATTERN = /^https:\/\/[^\s<>"']+$/;

function safeColor(value, fallback = '#8B7CF6') {
  const candidate = String(value || '').trim();
  return HEX_COLOR_PATTERN.test(candidate) ? candidate.toUpperCase() : fallback;
}

function safeInteger(value, fallback, minimum, maximum) {
  const candidate = Number(value);
  if (!Number.isInteger(candidate)) return fallback;
  return Math.min(maximum, Math.max(minimum, candidate));
}

/** @param {any} value @param {string} [fallbackAccent] */
function normalizeAppearance(value, fallbackAccent = String(PROFILE_APPEARANCE_DEFAULTS.colors.accent)) {
  const input = value && typeof value === 'object' ? value : {};
  const colors = input.colors && typeof input.colors === 'object' ? input.colors : {};
  const surface = input.surface && typeof input.surface === 'object' ? input.surface : {};
  const background = input.background && typeof input.background === 'object' ? input.background : {};
  const gradient = input.gradient && typeof input.gradient === 'object' ? input.gradient : {};
  const border = input.border && typeof input.border === 'object' ? input.border : {};
  const defaults = PROFILE_APPEARANCE_DEFAULTS;
  return {
    version: 1,
    colors: {
      text: safeColor(colors.text, defaults.colors.text),
      secondaryText: safeColor(colors.secondaryText, defaults.colors.secondaryText),
      username: safeColor(colors.username, defaults.colors.username),
      description: safeColor(colors.description, defaults.colors.description),
      background: safeColor(colors.background, defaults.colors.background),
      surface: safeColor(colors.surface, defaults.colors.surface),
      accent: safeColor(colors.accent, safeColor(input.signatureColor, fallbackAccent)),
      highlight: safeColor(colors.highlight, defaults.colors.highlight)
    },
    surface: {
      opacity: safeInteger(surface.opacity, defaults.surface.opacity, 0, 100),
      blur: safeInteger(surface.blur, defaults.surface.blur, 0, 40)
    },
    background: {
      blur: safeInteger(background.blur, defaults.background.blur, 0, 40),
      imageOpacity: safeInteger(background.imageOpacity, defaults.background.imageOpacity, 0, 100),
      overlayColor: safeColor(background.overlayColor, defaults.background.overlayColor),
      overlayOpacity: safeInteger(background.overlayOpacity, defaults.background.overlayOpacity, 0, 100)
    },
    gradient: {
      enabled: gradient.enabled === true,
      primary: safeColor(gradient.primary, defaults.gradient.primary),
      secondary: safeColor(gradient.secondary, defaults.gradient.secondary),
      angle: safeInteger(gradient.angle, defaults.gradient.angle, 0, 360)
    },
    border: {
      enabled: border.enabled !== false,
      color: safeColor(border.color, defaults.border.color),
      width: safeInteger(border.width, defaults.border.width, 0, 4),
      radius: safeInteger(border.radius, defaults.border.radius, 0, 48),
      opacity: safeInteger(border.opacity, defaults.border.opacity, 0, 100)
    }
  };
}

function hasControlCharacters(value) {
  return [...String(value || '')].some(character => {
    const code = character.codePointAt(0);
    return code < 32 || code === 127;
  });
}

function defaultModules() {
  return [
    { id: 'roll', visible: true, order: 0, size: 'wide' },
    { id: 'stats', visible: true, order: 1, size: 'wide' },
    { id: 'signature', visible: true, order: 2, size: 'medium' },
    { id: 'links', visible: true, order: 3, size: 'medium' },
    { id: 'recent', visible: true, order: 4, size: 'medium' },
    { id: 'achievements', visible: true, order: 5, size: 'medium' },
    { id: 'boundary', visible: true, order: 6, size: 'medium' },
    { id: 'explore', visible: true, order: 7, size: 'wide' }
  ];
}

/** @param {string} [signatureColor] */
export function createDefaultProfileConfig(signatureColor = PROFILE_APPEARANCE_DEFAULTS.colors.accent) {
  const appearance = normalizeAppearance({}, PROFILE_APPEARANCE_DEFAULTS.colors.accent);
  return {
    version: PROFILE_CONFIG_VERSION,
    signatureColor: safeColor(signatureColor),
    templateKey: 'compact',
    colorEffectsEnabled: false,
    appearance,
    // Compact is the small, background-first default. Existing saved
    // configurations are mapped to the new catalog during normalization and
    // by the additive database migration.
    layoutVariant: 'compact',
    storyVisible: false,
    modules: defaultModules(),
    links: [],
    content: createDefaultProfileContent(),
    widgets: [],
    avatar_path: null,
    background_path: null,
    audio_path: null,
    spotify_type: null,
    spotify_id: null,
    ...createDefaultRichMediaConfig()
  };
}

function normalizeModule(value) {
  if (!value || typeof value !== 'object') return null;
  const id = String(value.id || '');
  const order = Number(value.order);
  const size = PROFILE_MODULE_SIZES.includes(value.size) ? value.size : null;
  if (!PROFILE_MODULE_IDS.includes(id) || !Number.isInteger(order) || order < 0 || order > 7 || !size) return null;
  return {
    id,
    visible: value.visible !== false,
    order,
    size
  };
}

function stableLinkKey(value, fallbackOrder) {
  const text = `${value?.label || ''}|${value?.url || ''}|${fallbackOrder}`;
  let hash = 2166136261;
  for (const character of text) hash = Math.imul(hash ^ character.codePointAt(0), 16777619);
  return `l${(hash >>> 0).toString(36)}`;
}

function normalizeLink(value, fallbackOrder, extended = false) {
  if (!value || typeof value !== 'object') return null;
  const type = PROFILE_LINK_TYPES.includes(value.type) ? value.type : 'other';
  const label = String(value.label || '').trim();
  const url = String(value.url || '').trim();
  const order = Number.isInteger(Number(value.order)) ? Number(value.order) : fallbackOrder;
  if (!label || label.length > 40 || hasControlCharacters(label)) return null;
  if (!HTTPS_URL_PATTERN.test(url) || url.length > 2048) return null;
  if (order < 0 || order > (extended ? PROFILE_LINK_LIMITS.maxLinks - 1 : PROFILE_LINK_LIMITS.freeLinks - 1)) return null;
  if (!extended && !value.key && !value.alignment && !Object.prototype.hasOwnProperty.call(value, 'monochrome')) {
    return { type, label, url, visible: value.visible !== false, order };
  }
  const keyCandidate = String(value.key || '').trim().toLowerCase();
  return {
    key: /^[a-z0-9][a-z0-9_-]{0,31}$/.test(keyCandidate) ? keyCandidate : stableLinkKey(value, fallbackOrder),
    type,
    label,
    url,
    visible: value.visible !== false,
    order,
    alignment: PROFILE_LINK_ALIGNMENTS.includes(value.alignment) ? value.alignment : 'left',
    monochrome: value.monochrome === true,
    size: safeInteger(value.size, 1, 0, 2),
    glow: safeInteger(value.glow, 0, 0, 2)
  };
}

/**
 * Produce a safe render model. Server RPCs are the write authority; this
 * fallback keeps a malformed or stale public payload from breaking a profile.
 */
export function normalizeProfileConfig(value, fallbackColor = '#8B7CF6') {
  const fallback = createDefaultProfileConfig(fallbackColor);
  if (value && typeof value === 'object' && Number(value.version) === 2) {
    const base = value.base && typeof value.base === 'object' ? value.base : value;
    return normalizeProfileConfig({
      ...base,
      version: 1,
      links: value.links || base.links,
      content: value.content || base.content,
      widgets: value.widgets || base.widgets,
      identityPresentation: value.identity || base.identityPresentation,
      metadata: value.metadata || base.metadata,
      linkStyle: value.linkStyle || base.linkStyle,
      configurationVersion: 2
    }, fallbackColor);
  }
  if (!value || typeof value !== 'object' || Number(value.version || 1) !== PROFILE_CONFIG_VERSION) return fallback;

  const modules = Array.isArray(value.modules)
    ? value.modules.map(normalizeModule).filter(Boolean)
    : [];
  const moduleIds = new Set(modules.map(module => module.id));
  const hasCompleteModuleSet = modules.length === PROFILE_MODULE_IDS.length
    && moduleIds.size === PROFILE_MODULE_IDS.length;
  if (!hasCompleteModuleSet) return fallback;

  const extendedLinks = Number(value.configurationVersion || value.schemaVersion || value.version) === 2
    || (Array.isArray(value.links) && value.links.some(link => link && typeof link === 'object' && (link.key || link.alignment || Object.prototype.hasOwnProperty.call(link, 'monochrome'))));
  const links = Array.isArray(value.links)
    ? value.links.map((link, index) => normalizeLink(link, index, extendedLinks)).filter(Boolean).slice(0, extendedLinks ? PROFILE_LINK_LIMITS.maxLinks : PROFILE_LINK_LIMITS.freeLinks)
    : [];

  /** @type {Record<string, any>} */
  const normalizedAppearance = normalizeAppearance(value.appearance, value.signatureColor || fallback.signatureColor);
  const normalizedLayoutVariant = normalizeProfileLayoutKey(value.layoutVariant, fallback.layoutVariant);
  /** @type {any} */
  const normalized = {
    version: PROFILE_CONFIG_VERSION,
    signatureColor: safeColor(value.signatureColor, fallback.signatureColor),
    templateKey: normalizeProfileTemplateKey(value.templateKey, inferProfileTemplateKey(normalizedLayoutVariant)),
    colorEffectsEnabled: value.colorEffectsEnabled === true,
    appearance: normalizedAppearance,
    layoutVariant: normalizedLayoutVariant,
    modules: modules.sort((left, right) => left.order - right.order),
    links: links.sort((left, right) => left.order - right.order),
    content: normalizeProfileContent(value.content),
    ...normalizeProfileExpression(value),
    ...normalizeRichMediaConfig(value),
    widgets: normalizeProfileWidgets(value.widgets, value)
  };
  normalized.signatureColor = normalized.appearance.colors.accent;
  if (typeof value.storyVisible === 'boolean') normalized.storyVisible = value.storyVisible;
  // Identity and structured preview metadata have their own bounded
  // normalizers at the V2/RPC boundary. Preserve the validated projection
  // here without pulling those optional editor modules into public profiles.
  if (value.identity || value.identityPresentation) normalized.identityPresentation = value.identity || value.identityPresentation;
  if (value.metadata || value.profileMetadata) normalized.metadata = value.metadata || value.profileMetadata;
  if (value.linkStyle && typeof value.linkStyle === 'object') {
    normalized.linkStyle = {
      alignment: PROFILE_LINK_ALIGNMENTS.includes(value.linkStyle.alignment) ? value.linkStyle.alignment : 'left',
      monochrome: value.linkStyle.monochrome === true,
      size: safeInteger(value.linkStyle.size, 1, 0, 2),
      glow: safeInteger(value.linkStyle.glow, 0, 0, 2)
    };
  }
  return normalized;
}

export function normalizeProfileAppearance(value, fallbackAccent) {
  return normalizeAppearance(value, fallbackAccent);
}

export function withProfileAppearance(config, appearance) {
  const normalized = normalizeProfileConfig(config);
  const nextAppearance = normalizeAppearance(appearance, normalized.signatureColor);
  return {
    ...normalized,
    signatureColor: nextAppearance.colors.accent,
    appearance: nextAppearance
  };
}

export function getProfileModule(config, id) {
  return normalizeProfileConfig(config).modules.find(module => module.id === id) || null;
}

export { PROFILE_LINK_TYPES, isProfileLinkUrlValid };

export function getProfileRollVisible(config) {
  return getProfileModule(config, 'roll')?.visible !== false;
}

export function setProfileRollVisible(config, visible) {
  const normalized = normalizeProfileConfig(config);
  return {
    ...normalized,
    modules: normalized.modules.map(module => module.id === 'roll'
      ? { ...module, visible: Boolean(visible) }
      : module)
  };
}

/**
 * The current profile configuration RPC predates an explicit storyVisible
 * field. The approved composition does not render the `explore` module, so
 * its visibility is used as a backwards-compatible storage bit until the
 * linked database baseline can accept a new additive field.
 */
export function getProfileStoryVisible(config) {
  const normalized = normalizeProfileConfig(config);
  return typeof normalized.storyVisible === 'boolean'
    ? normalized.storyVisible
    : normalized.modules.find(module => module.id === 'explore')?.visible === false;
}

export function setProfileStoryVisible(config, visible) {
  const normalized = normalizeProfileConfig(config);
  return {
    ...normalized,
    storyVisible: Boolean(visible),
    modules: normalized.modules.map(module => module.id === 'explore'
      ? { ...module, visible: !visible }
      : module)
  };
}

export function getVisibleProfileModules(config, isOwner = false) {
  return normalizeProfileConfig(config).modules.filter(module => module.visible && (isOwner || module.id !== 'roll'));
}

export function getVisibleProfileLinks(config) {
  return normalizeProfileConfig(config).links.filter(link => link.visible);
}

export function getProfileOpeningLinks(config) {
  return getVisibleProfileLinks(config).slice(0, PROFILE_LINK_LIMITS.openingLinks);
}

export function getProfileContinuationLinks(config) {
  return getVisibleProfileLinks(config).slice(PROFILE_LINK_LIMITS.openingLinks);
}

/**
 * Keep the opening identity surface compact without changing the stored link
 * order. Social services remain in the opening; custom destinations continue
 * below it except for Minimal, which can show two labeled destinations beside
 * its intentionally sparse identity treatment.
 */
export function getProfileLayoutLinkPartitions(config, layoutVariant = 'compact') {
  const visibleLinks = getVisibleProfileLinks(config);
  const normalizedLayout = normalizeProfileLayoutKey(layoutVariant, 'compact');
  const openingSocial = visibleLinks
    .filter(link => isProfileSocialLink(link.type))
    .slice(0, PROFILE_LINK_LIMITS.openingLinks);
  const customOpeningLimit = normalizedLayout === 'minimal' ? 2 : 0;
  const customOpeningSlots = Math.max(0, PROFILE_LINK_LIMITS.openingLinks - openingSocial.length);
  const customOpening = visibleLinks
    .filter(link => !isProfileSocialLink(link.type))
    .slice(0, Math.min(customOpeningLimit, customOpeningSlots));
  const openingSelection = new Set([
    ...openingSocial,
    ...customOpening
  ]);

  return {
    opening: visibleLinks.filter(link => openingSelection.has(link)),
    continuation: visibleLinks.filter(link => !openingSelection.has(link))
  };
}

export function areProfileConfigsEqual(left, right) {
  return JSON.stringify(normalizeProfileConfig(left)) === JSON.stringify(normalizeProfileConfig(right));
}

export function hasProfileMoreContent({ continuationCount = 0, hasBelowFoldRoll = false, showLowerExpression = false, hasProfileStory = false } = {}) {
  return Number(continuationCount) > 0 || Boolean(hasBelowFoldRoll || showLowerExpression || hasProfileStory);
}
