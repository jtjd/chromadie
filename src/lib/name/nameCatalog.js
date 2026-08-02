import { NAME_LEGACY_PRESETS, LEGACY_NAME_EFFECT_KEYS, getLegacyNamePreset } from './nameLegacyPresets.js';
import { getNameFont } from './nameFonts.js';
import { getNameMaterial } from './nameMaterials.js';
import { getNameMotion } from './nameMotions.js';

const DEFAULT_NAME_RENDERER = Object.freeze({
  key: 'plain',
  kind: 'default',
  font: 'soft-grotesk',
  material: 'plain',
  motion: 'none'
});

export { DEFAULT_NAME_RENDERER, LEGACY_NAME_EFFECT_KEYS, NAME_LEGACY_PRESETS };

export const NAME_RENDERER_CATALOG = Object.freeze({
  plain: DEFAULT_NAME_RENDERER,
  ...NAME_LEGACY_PRESETS
});

export function isNameRendererKey(rendererKey) {
  return typeof rendererKey === 'string' && Object.prototype.hasOwnProperty.call(NAME_RENDERER_CATALOG, rendererKey);
}

export function resolveNameRendererKey(rendererKey) {
  return isNameRendererKey(rendererKey) ? rendererKey : DEFAULT_NAME_RENDERER.key;
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

export function getLegacyNameRenderer(itemKey) {
  return getLegacyNamePreset(itemKey) ? getNameRendererDefinition(itemKey) : null;
}
