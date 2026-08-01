import { normalizeProfileExpression } from './profileExpression.js';

export const PROFILE_CONFIG_VERSION = 1;

export const PROFILE_LAYOUT_VARIANTS = Object.freeze(['immersive', 'editorial', 'focus']);
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
export const PROFILE_LINK_TYPES = Object.freeze([
  'website',
  'youtube',
  'twitch',
  'github',
  'discord',
  'twitter',
  'instagram',
  'tiktok',
  'other'
]);

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const HTTPS_URL_PATTERN = /^https:\/\/[^\s<>"']+$/;

function safeColor(value, fallback = '#8B7CF6') {
  const candidate = String(value || '').trim();
  return HEX_COLOR_PATTERN.test(candidate) ? candidate.toUpperCase() : fallback;
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

export function createDefaultProfileConfig(signatureColor = '#8B7CF6') {
  return {
    version: PROFILE_CONFIG_VERSION,
    signatureColor: safeColor(signatureColor),
    colorEffectsEnabled: false,
    layoutVariant: 'immersive',
    storyVisible: false,
    modules: defaultModules(),
    links: [],
    avatar_path: null,
    background_path: null,
    audio_path: null,
    spotify_type: null,
    spotify_id: null
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

function normalizeLink(value, fallbackOrder) {
  if (!value || typeof value !== 'object') return null;
  const type = PROFILE_LINK_TYPES.includes(value.type) ? value.type : 'other';
  const label = String(value.label || '').trim();
  const url = String(value.url || '').trim();
  const order = Number.isInteger(Number(value.order)) ? Number(value.order) : fallbackOrder;
  if (!label || label.length > 40 || hasControlCharacters(label)) return null;
  if (!HTTPS_URL_PATTERN.test(url) || url.length > 2048) return null;
  if (order < 0 || order > 5) return null;
  return { type, label, url, visible: value.visible !== false, order };
}

/**
 * Produce a safe render model. Server RPCs are the write authority; this
 * fallback keeps a malformed or stale public payload from breaking a profile.
 */
export function normalizeProfileConfig(value, fallbackColor = '#8B7CF6') {
  const fallback = createDefaultProfileConfig(fallbackColor);
  if (!value || typeof value !== 'object' || Number(value.version || 1) !== PROFILE_CONFIG_VERSION) return fallback;

  const modules = Array.isArray(value.modules)
    ? value.modules.map(normalizeModule).filter(Boolean)
    : [];
  const moduleIds = new Set(modules.map(module => module.id));
  const hasCompleteModuleSet = modules.length === PROFILE_MODULE_IDS.length
    && moduleIds.size === PROFILE_MODULE_IDS.length;
  if (!hasCompleteModuleSet) return fallback;

  const links = Array.isArray(value.links)
    ? value.links.map((link, index) => normalizeLink(link, index)).filter(Boolean).slice(0, 6)
    : [];

  /** @type {Record<string, any>} */
  const normalized = {
    version: PROFILE_CONFIG_VERSION,
    signatureColor: safeColor(value.signatureColor, fallback.signatureColor),
    colorEffectsEnabled: value.colorEffectsEnabled === true,
    layoutVariant: PROFILE_LAYOUT_VARIANTS.includes(value.layoutVariant) ? value.layoutVariant : fallback.layoutVariant,
    modules: modules.sort((left, right) => left.order - right.order),
    links: links.sort((left, right) => left.order - right.order),
    ...normalizeProfileExpression(value)
  };
  if (typeof value.storyVisible === 'boolean') normalized.storyVisible = value.storyVisible;
  return normalized;
}

export function getProfileModule(config, id) {
  return normalizeProfileConfig(config).modules.find(module => module.id === id) || null;
}

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
