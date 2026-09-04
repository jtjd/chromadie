import { cosmeticCatalogItems } from './catalogState.js';
import { get } from 'svelte/store';

/**
 * Titles are profile identity metadata rather than a visual effect. Keep this
 * small resolver for the retained Founder title while all visual cosmetics
 * use their shared renderer components directly.
 */
export function getTitleText(cosmetics) {
  if (!cosmetics || !cosmetics.title) return '';
  if (cosmetics.title === 'title_founder') return '✦ FOUNDER ✦';
  const item = get(cosmeticCatalogItems)[cosmetics.title];
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
