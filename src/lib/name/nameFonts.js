/*
 * Name fonts are code-owned renderer inputs. Active catalog families are
 * finite and explicit; legacy families remain readable for profiles that
 * already have an older equipped key but are never exposed as new choices.
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

export const LEGACY_NAME_FONTS = Object.freeze({
  'editorial-serif': font('editorial-serif', 'Cormorant Garamond', SYSTEM_SERIF, 600, {
    source: 'bundled-fontsource',
    targetFamily: 'Cormorant Garamond',
    substitution: 'Georgia',
    widthFactor: 0.58,
    label: 'Cormorant Garamond', collection: 'Archive', rarity: 'Rare'
  }),
  'condensed-sans': font('condensed-sans', 'Archivo Narrow', SYSTEM_SANS, 700, {
    source: 'bundled-fontsource',
    targetFamily: 'Archivo Narrow',
    substitution: 'Spline Sans',
    widthFactor: 0.44,
    label: 'Archivo Narrow', collection: 'Nocturne', rarity: 'Rare'
  }),
  'wide-geometric': font('wide-geometric', 'Syne', SYSTEM_DISPLAY, 700, {
    source: 'bundled-fontsource',
    targetFamily: 'Syne',
    substitution: 'Spline Sans',
    widthFactor: 0.68,
    letterSpacing: 0.02,
    label: 'Syne', collection: 'Prism', rarity: 'Rare'
  }),
  'mono-compact': font('mono-compact', 'IBM Plex Mono', SYSTEM_MONO, 600, {
    source: 'bundled-fontsource',
    targetFamily: 'IBM Plex Mono',
    widthFactor: 0.64,
    label: 'IBM Plex Mono', collection: 'Signal', rarity: 'Uncommon'
  }),
  'rounded-mono': font('rounded-mono', 'Sono', SYSTEM_MONO, 600, {
    source: 'bundled-fontsource',
    targetFamily: 'Sono',
    substitution: 'IBM Plex Mono',
    widthFactor: 0.62,
    label: 'Sono', collection: 'Static Bloom', rarity: 'Rare'
  }),
  'soft-grotesk': font('soft-grotesk', 'Instrument Sans Variable', SYSTEM_SANS, 650, {
    source: 'bundled-fontsource',
    targetFamily: 'Instrument Sans',
    widthFactor: 0.56,
    label: 'Instrument Sans', collection: 'Nocturne', rarity: 'Uncommon'
  }),
  // Vaults' shipped profile bundle loads Fontshare's Chillax face for
  // profiles that choose it. Keep it readable for imported/historical
  // configurations even though it is not a new catalog row yet.
  'chillax': font('chillax', 'Chillax', SYSTEM_DISPLAY, 600, {
    source: 'fontshare',
    targetFamily: 'Chillax',
    substitution: 'Instrument Sans',
    widthFactor: 0.58,
    label: 'Chillax', collection: 'Prism', rarity: 'Rare'
  }),
  'humanist-display': font('humanist-display', 'Libre Franklin', SYSTEM_SANS, 600, {
    source: 'bundled-fontsource',
    targetFamily: 'Libre Franklin',
    substitution: 'Instrument Sans',
    widthFactor: 0.56,
    label: 'Libre Franklin', collection: 'Archive', rarity: 'Rare'
  }),
  'modern-fraktur': font('modern-fraktur', 'Pirata One', SYSTEM_SERIF, 400, {
    source: 'bundled-fontsource',
    targetFamily: 'Pirata One',
    substitution: 'Georgia',
    widthFactor: 0.58,
    label: 'Pirata One', collection: 'Nocturne', rarity: 'Epic'
  }),
  'pixel-display': font('pixel-display', 'Pixelify Sans', SYSTEM_MONO, 600, {
    source: 'bundled-fontsource',
    targetFamily: 'Pixelify Sans',
    substitution: 'IBM Plex Mono',
    widthFactor: 0.62,
    label: 'Pixelify Sans', collection: 'Static Bloom', rarity: 'Rare'
  }),
  'high-contrast-italic': font('high-contrast-italic', 'DM Serif Display', SYSTEM_SERIF, 400, {
    source: 'bundled-fontsource',
    targetFamily: 'DM Serif Display',
    substitution: 'Georgia italic',
    style: 'italic',
    widthFactor: 0.58,
    label: 'DM Serif Display', collection: 'Archive', rarity: 'Epic'
  }),
  'neo-slab': font('neo-slab', 'Roboto Slab', SYSTEM_SERIF, 700, {
    source: 'bundled-fontsource',
    targetFamily: 'Roboto Slab',
    substitution: 'Georgia',
    widthFactor: 0.59,
    label: 'Roboto Slab', collection: 'Archive', rarity: 'Rare'
  }),
  'reverse-contrast': font('reverse-contrast', 'Abril Fatface', SYSTEM_SERIF, 400, {
    source: 'bundled-fontsource',
    targetFamily: 'Abril Fatface',
    substitution: 'Georgia',
    widthFactor: 0.62,
    label: 'Abril Fatface', collection: 'Archive', rarity: 'Epic'
  }),
  'industrial-stencil': font('industrial-stencil', 'Black Ops One', SYSTEM_DISPLAY, 400, {
    source: 'bundled-fontsource',
    targetFamily: 'Black Ops One',
    substitution: 'Spline Sans',
    widthFactor: 0.57,
    label: 'Black Ops One', collection: 'Signal', rarity: 'Epic'
  }),
  'futurist-extended': font('futurist-extended', 'Michroma', SYSTEM_DISPLAY, 400, {
    source: 'bundled-fontsource',
    targetFamily: 'Michroma',
    substitution: 'Spline Sans',
    widthFactor: 0.63,
    letterSpacing: 0.025,
    label: 'Michroma', collection: 'Prism', rarity: 'Rare'
  }),
  'terminal-bitmap': font('terminal-bitmap', 'VT323', SYSTEM_MONO, 400, {
    source: 'bundled-fontsource',
    targetFamily: 'VT323',
    substitution: 'IBM Plex Mono',
    widthFactor: 0.58,
    label: 'VT323', collection: 'Static Bloom', rarity: 'Rare'
  }),
  'rounded-display': font('rounded-display', 'Fredoka', SYSTEM_DISPLAY, 600, {
    source: 'bundled-fontsource',
    targetFamily: 'Fredoka',
    substitution: 'Spline Sans',
    widthFactor: 0.59,
    label: 'Fredoka', collection: 'Prism', rarity: 'Rare'
  }),
  'marker-tag': font('marker-tag', 'Permanent Marker', 'cursive', 400, {
    source: 'bundled-fontsource',
    targetFamily: 'Permanent Marker',
    substitution: 'system cursive',
    widthFactor: 0.58,
    label: 'Permanent Marker', collection: 'Ember', rarity: 'Epic'
  }),
  'newspaper-black': font('newspaper-black', 'Archivo Black', SYSTEM_DISPLAY, 400, {
    source: 'bundled-fontsource',
    targetFamily: 'Archivo Black',
    substitution: 'Spline Sans',
    widthFactor: 0.61,
    label: 'Archivo Black', collection: 'Archive', rarity: 'Epic'
  })
});
export const DEFAULT_NAME_FONT_KEY = 'soft-grotesk';

const ACTIVE_NAME_FONT_DEFINITIONS = Object.freeze({
  'industrial-stencil': LEGACY_NAME_FONTS['industrial-stencil'],
  'marker-tag': LEGACY_NAME_FONTS['marker-tag'],
  'satoshi': font('satoshi', 'Satoshi', SYSTEM_SANS, 700, {
    source: 'fontshare',
    targetFamily: 'Satoshi',
    substitution: 'Instrument Sans',
    widthFactor: 0.56,
    label: 'Satoshi', collection: 'Nocturne', rarity: 'Uncommon'
  }),
  'fira-code': font('fira-code', 'Fira Code', SYSTEM_MONO, 600, {
    source: 'bundled-fontsource',
    targetFamily: 'Fira Code',
    substitution: 'IBM Plex Mono',
    widthFactor: 0.62,
    label: 'Fira Code', collection: 'Signal', rarity: 'Rare'
  }),
  'poppins': font('poppins', 'Poppins', SYSTEM_SANS, 600, {
    source: 'bundled-fontsource',
    targetFamily: 'Poppins',
    substitution: 'Instrument Sans',
    widthFactor: 0.57,
    label: 'Poppins', collection: 'Prism', rarity: 'Uncommon'
  }),
  'jetbrains-mono': font('jetbrains-mono', 'JetBrains Mono', SYSTEM_MONO, 600, {
    source: 'bundled-fontsource',
    targetFamily: 'JetBrains Mono',
    substitution: 'IBM Plex Mono',
    widthFactor: 0.63,
    label: 'JetBrains Mono', collection: 'Signal', rarity: 'Rare'
  }),
  'array': font('array', 'Array', SYSTEM_MONO, 400, {
    source: 'fontshare',
    targetFamily: 'Array',
    substitution: 'IBM Plex Mono',
    widthFactor: 0.64,
    letterSpacing: 0.02,
    label: 'Array', collection: 'Static Bloom', rarity: 'Epic'
  }),
  'silkscreen': font('silkscreen', 'Silkscreen', SYSTEM_MONO, 400, {
    source: 'bundled-fontsource',
    targetFamily: 'Silkscreen',
    substitution: 'IBM Plex Mono',
    widthFactor: 0.64,
    label: 'Silkscreen', collection: 'Static Bloom', rarity: 'Rare'
  }),
  'velocity': font('velocity', 'Velocity', SYSTEM_DISPLAY, 400, {
    source: 'bundled-local',
    targetFamily: 'Velocity',
    substitution: 'Spline Sans',
    widthFactor: 0.62,
    letterSpacing: 0.01,
    label: 'Velocity', collection: 'Signal', rarity: 'Rare'
  }),
  'outfit': font('outfit', 'Outfit', SYSTEM_SANS, 600, {
    source: 'bundled-fontsource',
    targetFamily: 'Outfit',
    substitution: 'Instrument Sans',
    widthFactor: 0.57,
    label: 'Outfit', collection: 'Nocturne', rarity: 'Uncommon'
  }),
  'kode-mono': font('kode-mono', 'Kode Mono', SYSTEM_MONO, 400, {
    source: 'bundled-fontsource',
    targetFamily: 'Kode Mono',
    substitution: 'IBM Plex Mono',
    widthFactor: 0.62,
    label: 'Code Current', collection: 'Signal', rarity: 'Rare'
  })
});

/**
 * The active registry is the only registry used to build new catalog choices.
 * LEGACY_NAME_FONTS remains available through the read-only resolver below so
 * an existing profile does not silently change its identity after a catalog
 * refresh.
 */
export const NAME_FONTS = ACTIVE_NAME_FONT_DEFINITIONS;
export const NAME_FONT_KEYS = Object.freeze(Object.keys(NAME_FONTS));
export const NAME_PAID_FONT_KEYS = NAME_FONT_KEYS;
export const NAME_COMPOSABLE_FONT_KEYS = Object.freeze([
  DEFAULT_NAME_FONT_KEY,
  ...NAME_FONT_KEYS
]);
export const NAME_FONT_REGISTRY = Object.freeze({
  ...LEGACY_NAME_FONTS,
  ...NAME_FONTS
});

// Keep the expanded reference faces out of the initial route bundle. The
// Canvas asks for the selected face when a Name surface mounts; Vite then
// loads only the matching local @fontsource asset and the renderer redraws
// once that face is available. Fontshare and Velocity are declared by the
// app-owned typography stylesheet, while Instrument Sans and IBM Plex Mono are
// imported by the application shell.
const NAME_FONT_ASSET_LOADERS = Object.freeze({
  'editorial-serif': () => import('@fontsource/cormorant-garamond/latin-600.css'),
  'condensed-sans': () => import('@fontsource/archivo-narrow/latin-700.css'),
  'wide-geometric': () => import('@fontsource/syne/latin-700.css'),
  'mono-compact': () => Promise.resolve(),
  'rounded-mono': () => import('@fontsource/sono/latin-600.css'),
  'soft-grotesk': () => Promise.resolve(),
  'humanist-display': () => import('@fontsource/libre-franklin/latin-600.css'),
  'modern-fraktur': () => import('@fontsource/pirata-one/latin-400.css'),
  'pixel-display': () => import('@fontsource/pixelify-sans/latin-600.css'),
  'high-contrast-italic': () => import('@fontsource/dm-serif-display/latin-400-italic.css'),
  'neo-slab': () => import('@fontsource/roboto-slab/latin-700.css'),
  'reverse-contrast': () => import('@fontsource/abril-fatface/latin-400.css'),
  'industrial-stencil': () => import('@fontsource/black-ops-one/latin-400.css'),
  'futurist-extended': () => import('@fontsource/michroma/latin-400.css'),
  'terminal-bitmap': () => import('@fontsource/vt323/latin-400.css'),
  'rounded-display': () => import('@fontsource/fredoka/latin-600.css'),
  'marker-tag': () => import('@fontsource/permanent-marker/latin-400.css'),
  'newspaper-black': () => import('@fontsource/archivo-black/latin-400.css'),
  'satoshi': () => Promise.resolve(),
  'fira-code': () => import('@fontsource/fira-code/latin-600.css'),
  'poppins': () => import('@fontsource/poppins/latin-600.css'),
  'jetbrains-mono': () => import('@fontsource/jetbrains-mono/latin-600.css'),
  'array': () => Promise.resolve(),
  'silkscreen': () => import('@fontsource/silkscreen/latin-400.css'),
  'velocity': () => Promise.resolve(),
  'outfit': () => import('@fontsource/outfit/latin-600.css'),
  'chillax': () => Promise.resolve(),
  'kode-mono': () => import('@fontsource/kode-mono/latin-400.css')
});

export const NAME_FONT_ASSET_KEYS = Object.freeze(Object.keys(NAME_FONT_ASSET_LOADERS));
const nameFontAssetPromises = new Map();

function canonicalFontKey(fontKey) {
  if (typeof fontKey !== 'string') return DEFAULT_NAME_FONT_KEY;
  const candidate = fontKey.trim();
  if (Object.prototype.hasOwnProperty.call(NAME_FONT_REGISTRY, candidate)) return candidate;
  const prefix = 'name_font_';
  const namespaced = candidate.startsWith(prefix) ? candidate.slice(prefix.length) : '';
  const normalizedNamespaced = namespaced.replaceAll('_', '-');
  return Object.prototype.hasOwnProperty.call(NAME_FONT_REGISTRY, normalizedNamespaced)
    ? normalizedNamespaced
    : DEFAULT_NAME_FONT_KEY;
}

export function resolveNameFontKey(fontKey) {
  return canonicalFontKey(fontKey);
}

export function isCustomNameFontKey(fontKey) {
  const candidate = typeof fontKey === 'string' ? fontKey.trim() : '';
  return Boolean(candidate) && canonicalFontKey(candidate) !== DEFAULT_NAME_FONT_KEY;
}

export function getNameFont(fontKey) {
  return NAME_FONT_REGISTRY[canonicalFontKey(fontKey)];
}

function safeCssFontValue(value, fallback) {
  return String(value || fallback).replace(/[;"\\\r\n{}]/g, '');
}

/**
 * Return the finite, code-owned family stack used by profile-wide typography.
 * Catalog data never contributes to this value; it is resolved through the
 * same renderer registry used by the Canvas name effect.
 */
export function getNameFontCssFamily(fontKey) {
  const definition = getNameFont(fontKey);
  const family = safeCssFontValue(definition.family, 'sans-serif');
  const fallback = safeCssFontValue(definition.fallback, 'sans-serif');
  return `"${family}", ${fallback}`;
}

export function loadNameFontAsset(fontKey) {
  const key = canonicalFontKey(fontKey);
  const loader = NAME_FONT_ASSET_LOADERS[key];
  if (!loader) return Promise.resolve(false);
  if (!nameFontAssetPromises.has(key)) {
    nameFontAssetPromises.set(key, Promise.resolve()
      .then(loader)
      .then(() => true)
      .catch(() => false));
  }
  return nameFontAssetPromises.get(key);
}

export function getNameCanvasFont(fontKey, pixelSize) {
  const fontDefinition = getNameFont(fontKey);
  const size = Number.isFinite(pixelSize) && pixelSize > 0 ? pixelSize : 24;
  return `${fontDefinition.style} ${fontDefinition.weight} ${size}px "${fontDefinition.family}", ${fontDefinition.fallback}`;
}

/**
 * Ask the browser to resolve a code-owned font declaration and confirm that
 * the requested face is available before a canvas hides its semantic fallback.
 */
export function requestNameFontLoad(fontKey, pixelSize = 24, text = 'Chromadie') {
  if (typeof document === 'undefined') return Promise.resolve(false);
  const descriptor = getNameCanvasFont(fontKey, pixelSize);
  const assetPromise = loadNameFontAsset(fontKey);
  if (!document.fonts?.load) return assetPromise;
  return assetPromise.then(assetLoaded => {
    if (!assetLoaded) return false;
    return document.fonts.load(descriptor, String(text || 'Chromadie'))
      .then(() => typeof document.fonts.check !== 'function'
        || document.fonts.check(descriptor, String(text || 'Chromadie')));
  })
    .catch(() => false);
}
