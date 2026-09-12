/*
 * Font assets stay behind a lazy split point. The name registry remains
 * code-owned, while a selected face loads only its own local Fontsource CSS.
 */

export const NAME_FONT_ASSET_LOADERS = Object.freeze({
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
  'soft-orbit': () => Promise.resolve(),
  'kode-mono': () => import('@fontsource/kode-mono/latin-400.css'),
  'fredoka': () => import('@fontsource/fredoka/latin-600.css'),
  'baloo-2': () => import('@fontsource/baloo-2/latin-700.css'),
  'bubblegum-sans': () => import('@fontsource/bubblegum-sans/latin-400.css'),
  'comic-neue': () => import('@fontsource/comic-neue/latin-700.css'),
  'lilita-one': () => import('@fontsource/lilita-one/latin-400.css')
});
