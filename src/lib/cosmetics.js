import { shopItems } from './stores';
import { get } from 'svelte/store';
import { sanitizeCosmeticClass, sanitizeCosmeticStyle } from './cosmeticSafety';

export { sanitizeCosmeticClass, sanitizeCosmeticStyle } from './cosmeticSafety';

export function getCosmeticEffect(cosmetics, slot) {
  const itemKey = cosmetics?.[slot];
  if (!itemKey) return { cls: '', style: '' };
  const item = get(shopItems)[itemKey];
  if (!item) return { cls: '', style: '' };
  if (item.css_type === 'class') {
    return { cls: sanitizeCosmeticClass(item.css_value), style: '' };
  }
  if (item.css_type === 'style') return { cls: '', style: sanitizeCosmeticStyle(item.css_value) };
  return { cls: '', style: '' };
}

export const getNameEffect = cosmetics => getCosmeticEffect(cosmetics, 'name_effect');
export const getFrameEffect = cosmetics => getCosmeticEffect(cosmetics, 'frame');
export const getProfileBg = cosmetics => getCosmeticEffect(cosmetics, 'profile_bg');
const PROFILE_ATMOSPHERE_EFFECTS = Object.freeze({
  bg_rain: 'rain',
  bg_snow: 'snow',
  bg_fireflies: 'fireflies',
  bg_scanlines: 'scanlines'
});

/** Return only a curated, code-owned atmosphere effect name. */
export function getProfileAtmosphereEffect(cosmetics) {
  return PROFILE_ATMOSPHERE_EFFECTS[cosmetics?.profile_bg] || '';
}
export const getRollEffect = cosmetics => getCosmeticEffect(cosmetics, 'roll_effect');
export const getLbTheme = cosmetics => getCosmeticEffect(cosmetics, 'lb_theme');
export const getOrbShape = cosmetics => getCosmeticEffect(cosmetics, 'orb_shape');
export const getProfileBorder = cosmetics => getCosmeticEffect(cosmetics, 'profile_border');

export function getTitleText(cosmetics) {
  if (!cosmetics || !cosmetics.title) return '';
  // Reserved titles are not loaded into the public shop catalog, but still need
  // to render when an administrator grants and equips one.
  if (cosmetics.title === 'title_founder') return '✦ FOUNDER ✦';
  const item = get(shopItems)[cosmetics.title];
  if (!item || item.css_type !== 'text') return '';
  return typeof item.css_value === 'string'
    && item.css_value.length <= 80
    && ![...item.css_value].some(character => character.codePointAt(0) < 32)
    ? item.css_value
    : '';
}

export function getStaffTitleText(isStaff) {
  return isStaff ? 'Staff' : '';
}
