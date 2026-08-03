/**
 * Shared boundary between profile-shaped cosmetic JSON and the Name renderer.
 *
 * The database stores stable item keys. The renderer accepts either canonical
 * layer IDs or the namespaced item-key form, so this module deliberately does
 * not need a catalog query or a Svelte store.
 */

export const NAME_COMPOSABLE_SLOTS = Object.freeze([
  'name_font',
  'name_material',
  'name_motion'
]);

export const NAME_DEFAULT_SLOTS = Object.freeze({
  name_font: '',
  name_material: '',
  name_motion: ''
});

export function hasNameComposableLoadout(cosmetics = {}) {
  return NAME_COMPOSABLE_SLOTS.some(slot => typeof cosmetics?.[slot] === 'string' && cosmetics[slot].trim());
}

export function getNameRendererLoadout(cosmetics = {}) {
  if (!hasNameComposableLoadout(cosmetics)) return null;
  return {
    fontKey: typeof cosmetics?.name_font === 'string' ? cosmetics.name_font : '',
    materialKey: typeof cosmetics?.name_material === 'string' ? cosmetics.name_material : '',
    motionKey: typeof cosmetics?.name_motion === 'string' ? cosmetics.name_motion : ''
  };
}

export function getNameRendererProps(cosmetics = {}) {
  const loadout = getNameRendererLoadout(cosmetics);
  return {
    rendererKey: '',
    loadout
  };
}

export function applyNamePreviewLayer(loadout = {}, slot, itemKey = '') {
  const next = /** @type {Record<string, string>} */ ({ ...(loadout || {}) });
  if (!NAME_COMPOSABLE_SLOTS.includes(slot)) return next;

  if (itemKey) next[slot] = itemKey;
  else delete next[slot];

  return next;
}

export function getNameItemPreviewLoadout(item, baseLoadout = {}) {
  if (!item || !NAME_COMPOSABLE_SLOTS.includes(item.slot)) {
    return { ...(baseLoadout || {}) };
  }
  return applyNamePreviewLayer(baseLoadout, item.slot, item.css_value || item.item_key);
}
