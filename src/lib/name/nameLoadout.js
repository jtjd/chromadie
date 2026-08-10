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

/**
 * Return the progressive fitting-room composition for one name control.
 *
 * Each control owns the layers at or before it: the font control demonstrates
 * the selected font with the plain/still baseline, material adds its selected
 * material, and motion completes the stack. This keeps the three previews
 * comparable while still showing the effect that belongs to each field.
 */
export function getNamePreviewLoadoutForSlot(loadout = {}, slot, slotValue = '', layerValues = {}) {
  /** @type {Record<string, any>} */
  const input = loadout && typeof loadout === 'object' ? loadout : {};
  const next = {
    fontKey: typeof input.fontKey === 'string' ? input.fontKey : (typeof input.name_font === 'string' ? input.name_font : ''),
    materialKey: typeof input.materialKey === 'string' ? input.materialKey : (typeof input.name_material === 'string' ? input.name_material : ''),
    motionKey: typeof input.motionKey === 'string' ? input.motionKey : (typeof input.name_motion === 'string' ? input.name_motion : '')
  };

  // Dashboard loadouts retain shop item keys for equip/publish RPCs. The
  // renderer may need each item's css_value instead (notably the historical
  // Prism Atelier row), so the fitting room can provide those code-owned
  // values at the presentation boundary without changing persisted data.
  const values = /** @type {Record<string, unknown>} */ (
    layerValues && typeof layerValues === 'object' ? layerValues : {}
  );
  if (typeof values.name_font === 'string' && values.name_font.trim()) next.fontKey = values.name_font;
  if (typeof values.name_material === 'string' && values.name_material.trim()) next.materialKey = values.name_material;
  if (typeof values.name_motion === 'string' && values.name_motion.trim()) next.motionKey = values.name_motion;
  if (typeof slotValue === 'string' && slotValue.trim()) {
    if (slot === 'name_font') next.fontKey = slotValue;
    if (slot === 'name_material') next.materialKey = slotValue;
    if (slot === 'name_motion') next.motionKey = slotValue;
  }

  if (slot === 'name_font') {
    return { fontKey: next.fontKey, materialKey: '', motionKey: '' };
  }
  if (slot === 'name_material') {
    return { fontKey: next.fontKey, materialKey: next.materialKey, motionKey: '' };
  }
  if (slot === 'name_motion') return next;
  return next;
}
