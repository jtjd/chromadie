import {
  PROFILE_STUDIO_CUSTOMIZE_SECTION_IDS,
  PROFILE_STUDIO_LINKS_SECTION_IDS,
  PROFILE_STUDIO_SECTIONS
} from './dashboardContract.js';

/**
 * Dashboard destinations register their loader and ownership here. The route
 * adapter owns when a destination is loaded; the workspace owns how the
 * registered destination is laid out. Keeping those concerns in one small
 * registry prevents a new section from growing an unrelated hash table,
 * loader map, and CSS/event chain.
 */
export const PROFILE_STUDIO_SECTION_REGISTRY = Object.freeze([
  { id: 'customize', destination: 'customize', owner: 'customize-workspace', loader: () => import('../ProfileCustomizePage.svelte') },
  { id: 'overview', destination: 'overview', owner: 'overview-destination', loader: () => import('../ProfileStudioOverview.svelte') },
  { id: 'profile-identity', destination: 'legacy-editor', owner: 'legacy-editor', loader: () => import('../IdentityEditor.svelte') },
  { id: 'profile-aliases', destination: 'links', owner: 'links-destination', loader: () => import('../ProfileAliasesEditor.svelte') },
  { id: 'profile-media', destination: 'legacy-editor', owner: 'legacy-editor', loader: () => import('../ProfileExpressionEditor.svelte') },
  { id: 'profile-content', destination: 'legacy-editor', owner: 'legacy-editor', loader: () => import('../ProfileContentEditor.svelte') },
  { id: 'profile-widgets', destination: 'legacy-editor', owner: 'legacy-editor', loader: () => import('../ProfileWidgetEditor.svelte') },
  { id: 'profile-collection', destination: 'legacy-editor', owner: 'legacy-editor', loader: () => import('../ProfileCosmeticsEditor.svelte') },
  { id: 'profile-layout', destination: 'links-or-legacy', owner: 'links-destination', loader: () => import('../ProfileEditor.svelte') },
  { id: 'links', destination: 'links', owner: 'links-destination', loader: () => import('../ProfileEditor.svelte') },
  { id: 'premium', destination: 'premium', owner: 'premium-destination', loader: () => import('../ProfilePremiumPage.svelte') },
  { id: 'profile-social', destination: 'account', owner: 'account-destination', loader: () => import('../ProfileSocial.svelte') },
  { id: 'profile-insights', destination: 'account', owner: 'account-destination', loader: () => import('../ProfileInsights.svelte') },
  { id: 'profile-notifications', destination: 'account', owner: 'account-destination', loader: () => import('../ProfileNotifications.svelte') },
  { id: 'progression', destination: 'account', owner: 'account-destination', loader: () => import('../ProfileProgression.svelte') },
  { id: 'account', destination: 'account', owner: 'account-destination', loader: () => import('../ProfileAccountSettings.svelte') }
]);

export const PROFILE_STUDIO_SECTION_REGISTRY_BY_ID = Object.freeze(
  Object.fromEntries(PROFILE_STUDIO_SECTION_REGISTRY.map(section => [section.id, section]))
);

export const PROFILE_STUDIO_SECTION_LOADERS = Object.freeze(
  Object.fromEntries(
    PROFILE_STUDIO_SECTION_REGISTRY
      .filter(section => typeof section.loader === 'function')
      .map(section => [section.id, section.loader])
  )
);

export const PROFILE_STUDIO_REGISTERED_SECTION_IDS = Object.freeze(
  PROFILE_STUDIO_SECTIONS.map(section => section.id)
);

export const PROFILE_STUDIO_REGISTERED_EDITOR_IDS = Object.freeze([
  ...PROFILE_STUDIO_CUSTOMIZE_SECTION_IDS,
  ...PROFILE_STUDIO_LINKS_SECTION_IDS.filter(id => id !== 'profile-layout')
]);

export function getProfileStudioSectionRegistration(sectionId) {
  return PROFILE_STUDIO_SECTION_REGISTRY_BY_ID[sectionId] || null;
}

export function getProfileStudioSectionLoader(sectionId) {
  return PROFILE_STUDIO_SECTION_LOADERS[sectionId] || null;
}
