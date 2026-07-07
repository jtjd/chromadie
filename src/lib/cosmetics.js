import { shopItems } from './stores';
import { get } from 'svelte/store';

// Returns { cls: string, style: string } for the name effect
export function getNameEffect(cosmetics) {
  if (!cosmetics || !cosmetics.name_effect) return { cls: '', style: '' };
  const item = get(shopItems)[cosmetics.name_effect];
  if (!item) return { cls: '', style: '' };

  if (item.css_type === 'class') return { cls: item.css_value, style: '' };
  if (item.css_type === 'style') return { cls: '', style: item.css_value };
  return { cls: '', style: '' };
}

// Returns { cls: string, style: string } for the frame
export function getFrameEffect(cosmetics) {
  if (!cosmetics || !cosmetics.frame) return { cls: '', style: '' };
  const item = get(shopItems)[cosmetics.frame];
  if (!item) return { cls: '', style: '' };

  if (item.css_type === 'class') return { cls: item.css_value, style: '' };
  if (item.css_type === 'style') return { cls: '', style: item.css_value };
  return { cls: '', style: '' };
}

// Returns the title text
export function getTitleText(cosmetics) {
  if (!cosmetics || !cosmetics.title) return '';
  const item = get(shopItems)[cosmetics.title];
  if (!item || item.css_type !== 'text') return '';
  return item.css_value;
}
