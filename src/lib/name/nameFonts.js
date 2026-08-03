/*
 * Name fonts are code-owned renderer inputs. The requested display families
 * come from the approved catalog reference, but only the locally bundled
 * families are treated as faithful production assets. Every other face has a
 * deliberate system fallback so a missing optional font can never make a
 * username disappear or inject a catalog-provided font declaration.
 */

const SYSTEM_SANS = 'ui-sans-serif, system-ui, sans-serif';
const SYSTEM_SERIF = 'Georgia, Times New Roman, serif';
const SYSTEM_MONO = 'ui-monospace, SFMono-Regular, Consolas, monospace';
const SYSTEM_DISPLAY = 'ui-sans-serif, system-ui, sans-serif';

function font(key, family, fallback, weight, extra = {}) {
  return Object.freeze({
    key,
    family,
    fallback,
    weight,
    style: 'normal',
    widthFactor: 0.56,
    source: 'system-fallback',
    targetFamily: family,
    ...extra
  });
}

export const NAME_FONTS = Object.freeze({
  'editorial-serif': font('editorial-serif', 'Cormorant Garamond', SYSTEM_SERIF, 600, {
    targetFamily: 'Cormorant Garamond',
    substitution: 'Georgia',
    widthFactor: 0.58,
    label: 'Velvet Antiqua', collection: 'Archive', rarity: 'Rare'
  }),
  'condensed-sans': font('condensed-sans', 'Archivo Narrow', SYSTEM_SANS, 700, {
    targetFamily: 'Archivo Narrow',
    substitution: 'system sans',
    widthFactor: 0.44,
    label: 'Narrowcast', collection: 'Nocturne', rarity: 'Rare'
  }),
  'wide-geometric': font('wide-geometric', 'Syne', SYSTEM_DISPLAY, 700, {
    targetFamily: 'Syne',
    substitution: 'Spline Sans',
    widthFactor: 0.68,
    letterSpacing: 0.02,
    label: 'Monument', collection: 'Prism', rarity: 'Rare'
  }),
  'mono-compact': font('mono-compact', 'IBM Plex Mono', SYSTEM_MONO, 600, {
    source: 'bundled-fontsource',
    targetFamily: 'IBM Plex Mono',
    widthFactor: 0.64,
    label: 'Fixed Point', collection: 'Signal', rarity: 'Uncommon'
  }),
  'rounded-mono': font('rounded-mono', 'Sono', SYSTEM_MONO, 600, {
    targetFamily: 'Sono',
    substitution: 'IBM Plex Mono',
    widthFactor: 0.62,
    label: 'Soft Circuit', collection: 'Static Bloom', rarity: 'Rare'
  }),
  'soft-grotesk': font('soft-grotesk', 'Instrument Sans Variable', SYSTEM_SANS, 650, {
    source: 'bundled-fontsource',
    targetFamily: 'Instrument Sans',
    widthFactor: 0.56,
    label: 'Lowlight', collection: 'Nocturne', rarity: 'Uncommon'
  }),
  'humanist-display': font('humanist-display', 'Libre Franklin', SYSTEM_SANS, 600, {
    targetFamily: 'Libre Franklin',
    substitution: 'Instrument Sans',
    widthFactor: 0.56,
    label: 'Paper Lantern', collection: 'Archive', rarity: 'Rare'
  }),
  'modern-fraktur': font('modern-fraktur', 'Pirata One', SYSTEM_SERIF, 400, {
    targetFamily: 'Pirata One',
    substitution: 'Georgia',
    widthFactor: 0.58,
    label: 'Black Cathedral', collection: 'Nocturne', rarity: 'Epic'
  }),
  'pixel-display': font('pixel-display', 'Pixelify Sans', SYSTEM_MONO, 600, {
    targetFamily: 'Pixelify Sans',
    substitution: 'IBM Plex Mono',
    widthFactor: 0.62,
    label: 'Raster Bloom', collection: 'Static Bloom', rarity: 'Rare'
  }),
  'high-contrast-italic': font('high-contrast-italic', 'DM Serif Display', SYSTEM_SERIF, 400, {
    targetFamily: 'DM Serif Display',
    substitution: 'Georgia italic',
    style: 'italic',
    widthFactor: 0.58,
    label: 'Razor Script', collection: 'Archive', rarity: 'Epic'
  }),
  'neo-slab': font('neo-slab', 'Roboto Slab', SYSTEM_SERIF, 700, {
    targetFamily: 'Roboto Slab',
    substitution: 'Georgia',
    widthFactor: 0.59,
    label: 'Foundry Slab', collection: 'Archive', rarity: 'Rare'
  }),
  'reverse-contrast': font('reverse-contrast', 'Abril Fatface', SYSTEM_SERIF, 400, {
    targetFamily: 'Abril Fatface',
    substitution: 'Georgia',
    widthFactor: 0.62,
    label: 'Split Serif', collection: 'Archive', rarity: 'Epic'
  }),
  'industrial-stencil': font('industrial-stencil', 'Black Ops One', SYSTEM_DISPLAY, 400, {
    targetFamily: 'Black Ops One',
    substitution: 'Spline Sans',
    widthFactor: 0.57,
    label: 'Cutline', collection: 'Signal', rarity: 'Epic'
  }),
  'futurist-extended': font('futurist-extended', 'Michroma', SYSTEM_DISPLAY, 400, {
    targetFamily: 'Michroma',
    substitution: 'Spline Sans',
    widthFactor: 0.63,
    letterSpacing: 0.025,
    label: 'Longwave', collection: 'Prism', rarity: 'Rare'
  }),
  'terminal-bitmap': font('terminal-bitmap', 'VT323', SYSTEM_MONO, 400, {
    targetFamily: 'VT323',
    substitution: 'IBM Plex Mono',
    widthFactor: 0.58,
    label: 'Greenroom', collection: 'Static Bloom', rarity: 'Rare'
  }),
  'rounded-display': font('rounded-display', 'Fredoka', SYSTEM_DISPLAY, 600, {
    targetFamily: 'Fredoka',
    substitution: 'Spline Sans',
    widthFactor: 0.59,
    label: 'Soft Orbit', collection: 'Prism', rarity: 'Rare'
  }),
  'marker-tag': font('marker-tag', 'Permanent Marker', 'cursive', 400, {
    targetFamily: 'Permanent Marker',
    substitution: 'system cursive',
    widthFactor: 0.58,
    label: 'Handstamp', collection: 'Ember', rarity: 'Epic'
  }),
  'newspaper-black': font('newspaper-black', 'Archivo Black', SYSTEM_DISPLAY, 400, {
    targetFamily: 'Archivo Black',
    substitution: 'Spline Sans',
    widthFactor: 0.61,
    label: 'Front Page', collection: 'Archive', rarity: 'Epic'
  })
});

export const NAME_FONT_KEYS = Object.freeze(Object.keys(NAME_FONTS));
export const NAME_PAID_FONT_KEYS = NAME_FONT_KEYS;
export const DEFAULT_NAME_FONT_KEY = 'soft-grotesk';

function canonicalFontKey(fontKey) {
  if (typeof fontKey !== 'string') return DEFAULT_NAME_FONT_KEY;
  const candidate = fontKey.trim();
  if (Object.prototype.hasOwnProperty.call(NAME_FONTS, candidate)) return candidate;
  const prefix = 'name_font_';
  const namespaced = candidate.startsWith(prefix) ? candidate.slice(prefix.length) : '';
  const normalizedNamespaced = namespaced.replaceAll('_', '-');
  return Object.prototype.hasOwnProperty.call(NAME_FONTS, normalizedNamespaced)
    ? normalizedNamespaced
    : DEFAULT_NAME_FONT_KEY;
}

export function resolveNameFontKey(fontKey) {
  return canonicalFontKey(fontKey);
}

export function getNameFont(fontKey) {
  return NAME_FONTS[canonicalFontKey(fontKey)];
}

export function getNameCanvasFont(fontKey, pixelSize) {
  const fontDefinition = getNameFont(fontKey);
  const size = Number.isFinite(pixelSize) && pixelSize > 0 ? pixelSize : 24;
  return `${fontDefinition.style} ${fontDefinition.weight} ${size}px "${fontDefinition.family}", ${fontDefinition.fallback}`;
}

/**
 * Ask the browser to resolve a code-owned font declaration. This is a best
 * effort request: the renderer remains valid when FontFaceSet is unavailable
 * or the optional family cannot be found locally.
 */
export function requestNameFontLoad(fontKey, pixelSize = 24, text = 'Chromadie') {
  if (typeof document === 'undefined' || !document.fonts?.load) return Promise.resolve(false);
  const descriptor = getNameCanvasFont(fontKey, pixelSize);
  return document.fonts.load(descriptor, String(text || 'Chromadie'))
    .then(() => true)
    .catch(() => false);
}
