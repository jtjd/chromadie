import {
  DEFAULT_NAME_FONT_KEY,
  NAME_COMPOSABLE_FONT_KEYS,
  NAME_FONTS,
  NAME_FONT_KEYS,
  NAME_PAID_FONT_KEYS,
  getNameFont
} from './nameFonts.js';
import {
  NAME_COMPOSABLE_MATERIAL_KEYS,
  NAME_MATERIALS,
  NAME_PAID_MATERIAL_KEYS,
  getNameMaterial,
  resolveNameMaterialKey
} from './nameMaterials.js';
import {
  NAME_COMPOSABLE_MOTION_KEYS,
  NAME_MOTIONS,
  NAME_PAID_MOTION_KEYS,
  getNameMotion,
  resolveNameMotionKey
} from './nameMotions.js';

/**
 * @typedef {{ fontKey?: string, materialKey?: string, motionKey?: string }} NameComposableInput
 * @typedef {NameComposableInput & {
 *   name_font?: string,
 *   name_material?: string,
 *   name_motion?: string,
 *   rendererKey?: string
 * }} NameLoadoutInput
 */

const DEFAULT_NAME_RENDERER = Object.freeze({
  key: 'plain',
  kind: 'default',
  font: DEFAULT_NAME_FONT_KEY,
  material: 'plain',
  motion: 'none'
});

export {
  DEFAULT_NAME_RENDERER,
  NAME_COMPOSABLE_FONT_KEYS,
  NAME_FONTS,
  NAME_FONT_KEYS,
  NAME_PAID_FONT_KEYS,
  NAME_MATERIALS,
  NAME_COMPOSABLE_MATERIAL_KEYS,
  NAME_PAID_MATERIAL_KEYS,
  NAME_MOTIONS,
  NAME_COMPOSABLE_MOTION_KEYS,
  NAME_PAID_MOTION_KEYS
};

export const NAME_RENDERER_CATALOG = Object.freeze({
  plain: DEFAULT_NAME_RENDERER
});

export const NAME_COMPOSABLE_COUNTS = Object.freeze({
  fonts: NAME_COMPOSABLE_FONT_KEYS.length,
  materials: NAME_COMPOSABLE_MATERIAL_KEYS.length,
  motions: NAME_COMPOSABLE_MOTION_KEYS.length,
  paidFonts: NAME_PAID_FONT_KEYS.length,
  paidMaterials: NAME_PAID_MATERIAL_KEYS.length,
  paidMotions: NAME_PAID_MOTION_KEYS.length,
  paidTotal: NAME_PAID_FONT_KEYS.length + NAME_PAID_MATERIAL_KEYS.length + NAME_PAID_MOTION_KEYS.length
});

function hasOwn(record, key) {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(record, key);
}

export function isNameRendererKey(rendererKey) {
  return typeof rendererKey === 'string' && hasOwn(NAME_RENDERER_CATALOG, rendererKey);
}

export function resolveNameRendererKey(rendererKey) {
  return isNameRendererKey(rendererKey) ? rendererKey : DEFAULT_NAME_RENDERER.key;
}

function requestedLayerKey(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * A composable definition always resolves all three layers. Invalid or
 * missing values fall back independently to the free baseline for that layer.
 * Namespaced future item keys are accepted only when they map to a known
 * code-owned layer ID (for example name_font_editorial_serif).
 */
/** @param {NameComposableInput} [input] */
export function getComposableNameDefinition(input = {}) {
  const { fontKey, materialKey, motionKey } = input;
  const font = getNameFont(fontKey);
  const material = getNameMaterial(resolveNameMaterialKey(materialKey));
  const motion = getNameMotion(resolveNameMotionKey(motionKey));
  return Object.freeze({
    key: `composable:${font.key}:${material.key}:${motion.key}`,
    kind: 'composable',
    font: font.key,
    material: material.key,
    motion: motion.key,
    requestedFontKey: requestedLayerKey(fontKey),
    requestedMaterialKey: requestedLayerKey(materialKey),
    requestedMotionKey: requestedLayerKey(motionKey),
    fontDefinition: font,
    materialDefinition: material,
    motionDefinition: motion
  });
}

/** @param {NameComposableInput} [input] */
export function hasComposableNameInput(input = {}) {
  const { fontKey, materialKey, motionKey } = input;
  return [fontKey, materialKey, motionKey].some(value => requestedLayerKey(value).length > 0);
}

/**
 * Resolve a future profile/loadout shape without coupling the renderer to
 * Supabase or Svelte stores. New slot values may be canonical layer IDs or
 * their future namespaced item-key forms.
 */
/** @param {NameLoadoutInput} [loadout] */
export function resolveNameLoadout(loadout = {}) {
  const input = /** @type {NameLoadoutInput} */ (loadout && typeof loadout === 'object' ? loadout : {});
  const composable = {
    fontKey: input.fontKey ?? input.name_font ?? '',
    materialKey: input.materialKey ?? input.name_material ?? '',
    motionKey: input.motionKey ?? input.name_motion ?? ''
  };
  if (hasComposableNameInput(composable)) return getComposableNameDefinition(composable);
  return getNameRendererDefinition(input.rendererKey || 'plain');
}

export function getNameRendererDefinition(rendererKey) {
  const resolvedKey = resolveNameRendererKey(rendererKey);
  const definition = NAME_RENDERER_CATALOG[resolvedKey];
  return Object.freeze({
    ...definition,
    requestedKey: typeof rendererKey === 'string' ? rendererKey : '',
    fontDefinition: getNameFont(definition.font),
    materialDefinition: getNameMaterial(definition.material),
    motionDefinition: getNameMotion(definition.motion)
  });
}
