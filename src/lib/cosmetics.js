import { shopItems } from './stores';
import { get } from 'svelte/store';

export function getNameEffect(cosmetics) {
  if (!cosmetics || !cosmetics.name_effect) return { cls: '', style: '' };
  const item = get(shopItems)[cosmetics.name_effect];
  if (!item) return { cls: '', style: '' };
  if (item.css_type === 'class') return { cls: item.css_value, style: '' };
  if (item.css_type === 'style') return { cls: '', style: item.css_value };
  return { cls: '', style: '' };
}

export function getFrameEffect(cosmetics) {
  if (!cosmetics || !cosmetics.frame) return { cls: '', style: '' };
  const item = get(shopItems)[cosmetics.frame];
  if (!item) return { cls: '', style: '' };
  if (item.css_type === 'class') return { cls: item.css_value, style: '' };
  if (item.css_type === 'style') return { cls: '', style: item.css_value };
  return { cls: '', style: '' };
}

export function getTitleText(cosmetics) {
  if (!cosmetics || !cosmetics.title) return '';
  const item = get(shopItems)[cosmetics.title];
  if (!item || item.css_type !== 'text') return '';
  return item.css_value;
}

export function getProfileBg(cosmetics) {
  if (!cosmetics || !cosmetics.profile_bg) return { cls: '', style: '' };
  const item = get(shopItems)[cosmetics.profile_bg];
  if (!item) return { cls: '', style: '' };
  if (item.css_type === 'class') return { cls: item.css_value, style: '' };
  if (item.css_type === 'style') return { cls: '', style: item.css_value };
  return { cls: '', style: '' };
}

export function getRollEffect(cosmetics) {
  if (!cosmetics || !cosmetics.roll_effect) return { cls: '', style: '' };
  const item = get(shopItems)[cosmetics.roll_effect];
  if (!item) return { cls: '', style: '' };
  if (item.css_type === 'class') return { cls: item.css_value, style: '' };
  if (item.css_type === 'style') return { cls: '', style: item.css_value };
  return { cls: '', style: '' };
}

export function getLbTheme(cosmetics) {
  if (!cosmetics || !cosmetics.lb_theme) return { cls: '', style: '' };
  const item = get(shopItems)[cosmetics.lb_theme];
  if (!item) return { cls: '', style: '' };
  if (item.css_type === 'class') return { cls: item.css_value, style: '' };
  if (item.css_type === 'style') return { cls: '', style: item.css_value };
  return { cls: '', style: '' };
}

export function getOrbShape(cosmetics) {
  if (!cosmetics || !cosmetics.orb_shape) return { cls: '', style: '' };
  const item = get(shopItems)[cosmetics.orb_shape];
  if (!item) return { cls: '', style: '' };
  if (item.css_type === 'class') return { cls: item.css_value, style: '' };
  if (item.css_type === 'style') return { cls: '', style: item.css_value };
  return { cls: '', style: '' };
}

// NEW: Profile Border Helper
export function getProfileBorder(cosmetics) {
  if (!cosmetics || !cosmetics.profile_border) return { cls: '', style: '' };
  const item = get(shopItems)[cosmetics.profile_border];
  if (!item) return { cls: '', style: '' };
  if (item.css_type === 'class') return { cls: item.css_value, style: '' };
  if (item.css_type === 'style') return { cls: '', style: item.css_value };
  return { cls: '', style: '' };
}
