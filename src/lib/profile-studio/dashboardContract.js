/**
 * The Profile Studio route contract lives outside the route adapter so the
 * shell, browser tests, and future dashboard destinations all resolve the
 * same hashes.  Legacy hashes are aliases, not second renderers.
 */

export const PROFILE_STUDIO_FALLBACK_COLOR = '#CDD2FF';

export const PROFILE_STUDIO_CUSTOMIZE_TABS = Object.freeze([
  { id: 'appearance', label: 'Appearance', description: 'Color, identity, and presence' },
  { id: 'media', label: 'Media', description: 'Avatar, background, music, and uploads' },
  { id: 'links', label: 'Links', description: 'Public links, sharing, and aliases' },
  { id: 'layout', label: 'Layout', description: 'Templates and profile structure' }
]);

export const PROFILE_STUDIO_CUSTOMIZE_TAB_IDS = Object.freeze(
  PROFILE_STUDIO_CUSTOMIZE_TABS.map(tab => tab.id)
);

export const PROFILE_STUDIO_CUSTOMIZE_TAB_HASHES = Object.freeze({
  appearance: 'customize-appearance',
  media: 'customize-media',
  links: 'customize-links',
  layout: 'customize-layout'
});

export const PROFILE_STUDIO_CUSTOMIZE_TAB_ALIASES = Object.freeze({
  customize: 'appearance',
  appearance: 'appearance',
  'customize-appearance': 'appearance',
  identity: 'appearance',
  'profile-identity': 'appearance',
  media: 'media',
  expression: 'media',
  'customize-media': 'media',
  'profile-media': 'media',
  links: 'links',
  aliases: 'links',
  'customize-links': 'links',
  'profile-aliases': 'links',
  effects: 'appearance',
  'customize-effects': 'appearance',
  collection: 'appearance',
  'profile-collection': 'appearance',
  content: 'media',
  widgets: 'appearance',
  'customize-content': 'media',
  'customize-widgets': 'appearance',
  layout: 'layout',
  templates: 'layout',
  'customize-layout': 'layout',
  'profile-layout': 'layout'
});

export const PROFILE_STUDIO_SECTIONS = Object.freeze([
  { id: 'overview', label: 'Overview', groupKey: 'primary', groupLabel: 'Customize', icon: 'overview' },
  { id: 'customize', label: 'Customize', groupKey: 'primary', icon: 'customize' },
  { id: 'premium', label: 'Premium', groupKey: 'primary', icon: 'premium' },
  { id: 'profile-insights', label: 'Analytics', groupKey: 'account', groupLabel: 'Account', icon: 'profile-insights' },
  { id: 'profile-notifications', label: 'Notifications', groupKey: 'account', icon: 'profile-notifications' },
  { id: 'profile-social', label: 'Privacy & social', groupKey: 'account', icon: 'profile-social' },
  { id: 'progression', label: 'Badges & progression', groupKey: 'account', icon: 'progression' },
  { id: 'account', label: 'Settings', groupKey: 'account', icon: 'account' }
]);

export const PROFILE_STUDIO_PRIMARY_SECTION_IDS = Object.freeze([
  'overview',
  'customize',
  'premium'
]);

export function getProfileStudioNavigation(sections = PROFILE_STUDIO_SECTIONS) {
  const primaryIds = new Set(PROFILE_STUDIO_PRIMARY_SECTION_IDS);
  return {
    primary: sections.filter(section => primaryIds.has(section.id)),
    more: sections.filter(section => !primaryIds.has(section.id))
  };
}

export const PROFILE_STUDIO_CUSTOMIZE_SECTION_IDS = Object.freeze([
  'customize',
  'profile-identity',
  'profile-media',
  'profile-collection',
  'profile-layout',
  'profile-aliases'
]);

export const PROFILE_STUDIO_LINKS_SECTION_IDS = Object.freeze(['profile-layout', 'profile-aliases']);

export const PROFILE_STUDIO_LEGACY_SECTION_ROUTES = Object.freeze([
  { id: 'profile-identity', redirect: 'customize' },
  { id: 'profile-aliases', redirect: 'customize' },
  { id: 'profile-media', redirect: 'customize' },
  { id: 'profile-content', redirect: 'customize' },
  { id: 'profile-widgets', redirect: 'customize' },
  { id: 'profile-layout', redirect: 'customize' },
  { id: 'profile-collection', redirect: 'customize' }
]);

export const PROFILE_STUDIO_LEGACY_HASH_ALIASES = Object.freeze(
  Object.fromEntries(PROFILE_STUDIO_LEGACY_SECTION_ROUTES.map(route => [route.id, route.redirect]))
);

export const PROFILE_STUDIO_HASH_ALIASES = Object.freeze({
  customize: 'customize',
  appearance: 'customize',
  effects: 'customize',
  'customize-appearance': 'customize',
  'customize-media': 'customize',
  'customize-effects': 'customize',
  'customize-layout': 'customize',
  templates: 'customize',
  ...PROFILE_STUDIO_LEGACY_HASH_ALIASES,
  'profile-social': 'profile-social',
  'profile-insights': 'profile-insights',
  'profile-notifications': 'profile-notifications',
  identity: 'customize',
  links: 'customize',
  aliases: 'customize',
  expression: 'customize',
  media: 'customize',
  content: 'customize',
  widgets: 'customize',
  layout: 'customize',
  social: 'profile-social',
  insights: 'profile-insights',
  notifications: 'profile-notifications',
  collection: 'customize',
  progression: 'progression',
  account: 'account'
});

export const PROFILE_STUDIO_SECTION_FLAGS = Object.freeze({
  'profile-insights': 'expandedAnalytics',
  'profile-notifications': 'socialDepth'
});

export function normalizeDashboardHash(hash) {
  return String(hash || '').replace(/^#/, '').trim().toLowerCase();
}

export function resolveProfileStudioLocation(hash, visibleSections = PROFILE_STUDIO_SECTIONS) {
  const rawHash = normalizeDashboardHash(hash);
  const sectionId = PROFILE_STUDIO_HASH_ALIASES[rawHash] || rawHash;
  const validSection = visibleSections.some(section => section.id === sectionId);
  return {
    rawHash,
    sectionId: validSection ? sectionId : 'customize',
    customizeTab: PROFILE_STUDIO_CUSTOMIZE_TAB_ALIASES[rawHash] || null,
    isLegacyAlias: Boolean(PROFILE_STUDIO_HASH_ALIASES[rawHash] && PROFILE_STUDIO_HASH_ALIASES[rawHash] !== rawHash)
  };
}

export function getProfileStudioHash(sectionId, customizeTab = null) {
  if (sectionId === 'customize' && PROFILE_STUDIO_CUSTOMIZE_TAB_IDS.includes(customizeTab)) {
    return PROFILE_STUDIO_CUSTOMIZE_TAB_HASHES[customizeTab];
  }
  if (sectionId === 'links' || sectionId === 'profile-aliases') return PROFILE_STUDIO_CUSTOMIZE_TAB_HASHES.links;
  if (sectionId === 'profile-layout') return PROFILE_STUDIO_CUSTOMIZE_TAB_HASHES.layout;
  return sectionId || 'customize';
}

export function getVisibleProfileStudioSections(featureFlags = {}, sections = PROFILE_STUDIO_SECTIONS) {
  return sections.filter(section => {
    const flag = PROFILE_STUDIO_SECTION_FLAGS[section.id];
    return !flag || featureFlags[flag];
  });
}

export function isProfileStudioSection(sectionId, sections = PROFILE_STUDIO_SECTIONS) {
  return sections.some(section => section.id === sectionId);
}
