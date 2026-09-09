import { getNameFontRevision } from '../nameFonts.js';

// One reusable painted surface per destination context; weak ownership releases
// both canvases on unmount. Edits replace the entry rather than growing a cache.
const surfaces = new WeakMap();

export function getPaintedTextSurface(ctx, model, paint) {
  const owner = ctx?.canvas?.ownerDocument || globalThis.document;
  if (!owner?.createElement || !ctx?.drawImage) return null;
  const ratio = Math.min(2, Math.max(1, model.pixelRatio || 1));
  // Preserve long/italic source glyphs before the destination fits their width.
  const width = Math.min(4096, Math.ceil(Math.max(model.width, model.metrics.rawWidth + 48)));
  const height = Math.min(1024, Math.ceil(model.height));
  const left = (model.width - width) / 2;
  const descriptor = `${model.font.style} ${model.font.weight} ${model.metrics.fontSize}px "${model.font.family}"`;
  const fontReady = owner.fonts?.check?.(descriptor, model.displayText) ?? true;
  const key = JSON.stringify([
    model.displayText, model.font.key, model.font.family, model.font.weight, model.font.style,
    fontReady, getNameFontRevision(model.font.key), model.metrics, model.material.key, model.material.colors,
    model.baseColor, model.todayColor, model.width, model.height, ratio
  ]);
  let state = surfaces.get(ctx);
  if (state?.key === key && state.paint === paint) return state;
  if (!state) {
    const canvas = owner.createElement('canvas');
    const context = canvas.getContext?.('2d');
    if (!context) return null;
    state = { canvas, context };
    surfaces.set(ctx, state);
  }
  const pixelWidth = Math.ceil(width * ratio);
  const pixelHeight = Math.ceil(height * ratio);
  if (state.canvas.width !== pixelWidth || state.canvas.height !== pixelHeight) {
    state.canvas.width = pixelWidth;
    state.canvas.height = pixelHeight;
  }
  const target = state.context;
  target.setTransform(1, 0, 0, 1, 0, 0);
  target.clearRect(0, 0, pixelWidth, pixelHeight);
  target.save();
  target.setTransform(ratio, 0, 0, ratio, -left * ratio, 0);
  paint(target, model);
  target.restore();
  Object.assign(state, { key, paint, width, height, left, ratio });
  return state;
}

// Prefix advances preserve kerning and proportional widths. Grapheme segments
// keep combining marks and emoji together during character motions.
export function getNameGlyphLayout(ctx, model) {
  const text = model.displayText || '';
  const characters = typeof Intl.Segmenter === 'function'
    ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map(part => part.segment)
    : Array.from(text);
  if (!characters.length) return [];
  ctx.save?.();
  ctx.font = `${model.font.style} ${model.font.weight} ${model.metrics.fontSize}px "${model.font.family}", ${model.font.fallback}`;
  const measure = value => {
    const width = ctx.measureText?.(value)?.width;
    return Number.isFinite(width) ? width : value.length * model.metrics.fontSize * 0.56;
  };
  const total = measure(text);
  let prefix = '';
  let previous = 0;
  const start = model.metrics.x - total / 2;
  const glyphs = characters.map(character => {
    prefix += character;
    const end = measure(prefix);
    const width = Math.max(0, end - previous);
    const glyph = { character, width, left: start + previous, center: start + previous + width / 2, advance: end };
    previous = end;
    return glyph;
  });
  ctx.restore?.();
  return glyphs;
}

export function drawSurfaceGlyph(ctx, surface, glyph, offsetX = 0, offsetY = 0, first = false, last = false) {
  const left = first ? surface.left : glyph.left;
  const right = last ? surface.left + surface.width : glyph.left + glyph.width;
  const width = Math.max(0, right - left);
  if (!width) return;
  ctx.drawImage(surface.canvas,
    (left - surface.left) * surface.ratio, 0, width * surface.ratio, surface.canvas.height,
    left + offsetX, offsetY, width, surface.height);
}
