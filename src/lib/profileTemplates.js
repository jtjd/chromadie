import { CHROMADIE_PLUS_ENTITLEMENT_KEY, hasChromadiePlus } from './premiumEntitlements.js';

export const PROFILE_TEMPLATE_KEYS = Object.freeze(['signal', 'editorial', 'archive', 'atelier', 'custom']);
export const FREE_PROFILE_TEMPLATE_KEYS = Object.freeze(['signal', 'editorial', 'archive']);
export const PREMIUM_PROFILE_TEMPLATE_KEYS = Object.freeze(['atelier']);
export const PREMIUM_EXPRESSION_ENTITLEMENT_KEY = CHROMADIE_PLUS_ENTITLEMENT_KEY;

function freezeModules(modules) {
  return Object.freeze(modules.map(module => Object.freeze({ ...module })));
}

const TEMPLATE_DEFINITIONS = {
  signal: {
    key: 'signal',
    label: 'Signal Garden',
    tier: 'free',
    layoutVariant: 'immersive',
    description: 'The polished default: roll first, then a quiet trail of identity and story.',
    modules: freezeModules([
      { id: 'roll', visible: true, order: 0, size: 'wide' },
      { id: 'stats', visible: true, order: 1, size: 'wide' },
      { id: 'signature', visible: true, order: 2, size: 'medium' },
      { id: 'links', visible: true, order: 3, size: 'medium' },
      { id: 'recent', visible: true, order: 4, size: 'medium' },
      { id: 'achievements', visible: true, order: 5, size: 'medium' },
      { id: 'boundary', visible: true, order: 6, size: 'medium' },
      { id: 'explore', visible: true, order: 7, size: 'wide' }
    ])
  },
  editorial: {
    key: 'editorial',
    label: 'Editorial',
    tier: 'free',
    layoutVariant: 'editorial',
    description: 'A calmer reading order that lets links, voice, and selected work lead.',
    modules: freezeModules([
      { id: 'roll', visible: true, order: 0, size: 'wide' },
      { id: 'signature', visible: true, order: 1, size: 'wide' },
      { id: 'links', visible: true, order: 2, size: 'medium' },
      { id: 'recent', visible: true, order: 3, size: 'medium' },
      { id: 'achievements', visible: true, order: 4, size: 'wide' },
      { id: 'stats', visible: true, order: 5, size: 'medium' },
      { id: 'boundary', visible: true, order: 6, size: 'medium' },
      { id: 'explore', visible: true, order: 7, size: 'wide' }
    ])
  },
  archive: {
    key: 'archive',
    label: 'Color Archive',
    tier: 'free',
    layoutVariant: 'focus',
    description: 'A history-forward composition for players whose rolls tell the story.',
    modules: freezeModules([
      { id: 'roll', visible: true, order: 0, size: 'wide' },
      { id: 'recent', visible: true, order: 1, size: 'wide' },
      { id: 'achievements', visible: true, order: 2, size: 'wide' },
      { id: 'signature', visible: true, order: 3, size: 'medium' },
      { id: 'stats', visible: true, order: 4, size: 'medium' },
      { id: 'links', visible: true, order: 5, size: 'medium' },
      { id: 'boundary', visible: true, order: 6, size: 'medium' },
      { id: 'explore', visible: true, order: 7, size: 'wide' }
    ])
  },
  atelier: {
    key: 'atelier',
    label: 'Atelier',
    tier: 'premium',
    requiresEntitlement: PREMIUM_EXPRESSION_ENTITLEMENT_KEY,
    layoutVariant: 'editorial',
    description: 'A premium expression preset with a more authored, exhibition-like rhythm.',
    modules: freezeModules([
      { id: 'roll', visible: true, order: 0, size: 'wide' },
      { id: 'signature', visible: true, order: 1, size: 'wide' },
      { id: 'achievements', visible: true, order: 2, size: 'wide' },
      { id: 'links', visible: true, order: 3, size: 'medium' },
      { id: 'recent', visible: true, order: 4, size: 'medium' },
      { id: 'stats', visible: true, order: 5, size: 'medium' },
      { id: 'boundary', visible: true, order: 6, size: 'medium' },
      { id: 'explore', visible: true, order: 7, size: 'wide' }
    ])
  }
};

export const PROFILE_TEMPLATE_DEFINITIONS = Object.freeze(
  Object.fromEntries(Object.entries(TEMPLATE_DEFINITIONS).map(([key, definition]) => [key, Object.freeze(definition)]))
);

export function getProfileTemplateDefinition(value) {
  return PROFILE_TEMPLATE_DEFINITIONS[String(value || '').trim()] || null;
}

export function normalizeProfileTemplateKey(value, fallback = 'signal') {
  const candidate = value === 'custom' ? 'custom' : getProfileTemplateDefinition(value)?.key;
  if (candidate) return candidate;
  if (fallback === 'custom') return 'custom';
  return getProfileTemplateDefinition(fallback)?.key || 'signal';
}

export function inferProfileTemplateKey(layoutVariant) {
  if (layoutVariant === 'editorial') return 'editorial';
  if (layoutVariant === 'focus') return 'archive';
  return 'signal';
}

export function isPremiumProfileTemplate(value) {
  return getProfileTemplateDefinition(value)?.tier === 'premium';
}

export function isPremiumExpressionUnlocked(entitlements = []) {
  return hasChromadiePlus(entitlements);
}

export function createProfileTemplatePatch(value) {
  const definition = getProfileTemplateDefinition(value);
  if (!definition || definition.key === 'custom') return null;
  return {
    templateKey: definition.key,
    layoutVariant: definition.layoutVariant,
    modules: definition.modules.map(module => ({ ...module }))
  };
}
