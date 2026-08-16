import { CHROMADIE_PLUS_ENTITLEMENT_KEY, hasChromadiePlus } from './premiumEntitlements.js';
import { PROFILE_LAYOUT_DEFINITIONS, PROFILE_LAYOUT_KEYS, normalizeProfileLayoutKey } from './profile-layout/profileLayouts.js';

/**
 * Templates are the Studio-facing names for the structural layout
 * renderers. They do not carry a theme or cosmetic loadout.
 */
export const PROFILE_TEMPLATE_KEYS = PROFILE_LAYOUT_KEYS;
export const FREE_PROFILE_TEMPLATE_KEYS = PROFILE_LAYOUT_KEYS;
export const PREMIUM_PROFILE_TEMPLATE_KEYS = Object.freeze([]);
// Kept for callers that still import the old expression entitlement constant;
// no layout is gated behind it.
export const PREMIUM_EXPRESSION_ENTITLEMENT_KEY = CHROMADIE_PLUS_ENTITLEMENT_KEY;

function freezeModules(modules) {
  return Object.freeze(modules.map(module => Object.freeze({ ...module })));
}

const MODULE_ORDER = Object.freeze({
  compact: ['roll', 'stats', 'links', 'signature', 'recent', 'achievements', 'boundary', 'explore'],
  'full-bleed': ['roll', 'links', 'signature', 'recent', 'achievements', 'stats', 'boundary', 'explore']
});

const MODULE_SIZES = Object.freeze({
  roll: 'wide',
  stats: 'medium',
  signature: 'medium',
  links: 'medium',
  recent: 'wide',
  achievements: 'wide',
  boundary: 'medium',
  explore: 'wide'
});

function modulesFor(key) {
  return freezeModules((MODULE_ORDER[key] || MODULE_ORDER.compact).map((id, order) => ({
    id,
    visible: true,
    order,
    size: MODULE_SIZES[id] || 'medium'
  })));
}

const TEMPLATE_DEFINITIONS = Object.fromEntries(
  PROFILE_LAYOUT_KEYS.map(key => {
    const layout = PROFILE_LAYOUT_DEFINITIONS[key];
    return [key, {
      key,
      label: layout.label,
      tier: 'free',
      layoutVariant: key,
      description: layout.description,
      modules: modulesFor(key)
    }];
  })
);

export const PROFILE_TEMPLATE_DEFINITIONS = Object.freeze(
  Object.fromEntries(Object.entries(TEMPLATE_DEFINITIONS).map(([key, definition]) => [key, Object.freeze(definition)]))
);

export function getProfileTemplateDefinition(value) {
  return PROFILE_TEMPLATE_DEFINITIONS[String(value || '').trim().toLowerCase()] || null;
}

export function normalizeProfileTemplateKey(value, fallback = 'compact') {
  const candidate = String(value || '').trim().toLowerCase();
  if (getProfileTemplateDefinition(candidate)) return candidate;

  return normalizeProfileLayoutKey(candidate, normalizeProfileLayoutKey(fallback, 'compact'));
}

export function inferProfileTemplateKey(layoutVariant) {
  return normalizeProfileLayoutKey(layoutVariant, 'compact');
}

export function isPremiumProfileTemplate(value) {
  return Boolean(getProfileTemplateDefinition(value)?.tier === 'premium');
}

export function isPremiumExpressionUnlocked(entitlements = []) {
  return hasChromadiePlus(entitlements);
}

export function createProfileTemplatePatch(value) {
  const normalizedKey = normalizeProfileTemplateKey(value, 'compact');
  const definition = getProfileTemplateDefinition(normalizedKey);
  if (!definition) return null;
  return {
    templateKey: definition.key,
    layoutVariant: definition.layoutVariant,
    modules: definition.modules.map(module => ({ ...module }))
  };
}
