/*
 * Name fonts are code-owned renderer inputs. The families below are either
 * bundled by @fontsource in main.js or are stable system fallbacks. Nothing in
 * this module accepts a font family from catalog data or from a profile.
 */

const SYSTEM_SANS = 'ui-sans-serif, system-ui, sans-serif';
const SYSTEM_SERIF = 'Georgia, Times New Roman, serif';
const SYSTEM_MONO = 'ui-monospace, SFMono-Regular, Consolas, monospace';

export const NAME_FONTS = Object.freeze({
  'soft-grotesk': Object.freeze({
    key: 'soft-grotesk',
    family: 'Instrument Sans Variable',
    fallback: SYSTEM_SANS,
    weight: 650,
    style: 'normal'
  }),
  'mono-compact': Object.freeze({
    key: 'mono-compact',
    family: 'IBM Plex Mono',
    fallback: SYSTEM_MONO,
    weight: 600,
    style: 'normal'
  }),
  'editorial-serif': Object.freeze({
    key: 'editorial-serif',
    family: 'Georgia',
    fallback: SYSTEM_SERIF,
    weight: 700,
    style: 'normal'
  }),
  'high-contrast-italic': Object.freeze({
    key: 'high-contrast-italic',
    family: 'Instrument Sans Variable',
    fallback: SYSTEM_SANS,
    weight: 650,
    style: 'italic'
  })
});

export const DEFAULT_NAME_FONT_KEY = 'soft-grotesk';

export function getNameFont(fontKey) {
  return NAME_FONTS[fontKey] || NAME_FONTS[DEFAULT_NAME_FONT_KEY];
}

export function getNameCanvasFont(fontKey, pixelSize) {
  const font = getNameFont(fontKey);
  const size = Number.isFinite(pixelSize) && pixelSize > 0 ? pixelSize : 24;
  return `${font.style} ${font.weight} ${size}px "${font.family}", ${font.fallback}`;
}
