/*
 * Small Canvas 2D operations shared by composable Name materials and motions.
 * Every operation is bounded by the frame model and uses only renderer-owned
 * values. The guards keep deterministic unit tests and unsupported Canvas
 * environments on the semantic-text fallback path.
 */

const WHITE = '#F7FBFF';
const BLACK = '#090B0F';

export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

export function lerp(first, second, amount) {
  return first + (second - first) * clamp(amount);
}

export function easeOut(value) {
  const t = clamp(value);
  return 1 - ((1 - t) ** 3);
}

export function easeInOut(value) {
  const t = clamp(value);
  return t < 0.5 ? 2 * t * t : 1 - (((-2 * t + 2) ** 2) / 2);
}

export function smoothstep(value) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

export function fract(value) {
  return value - Math.floor(value);
}

export function seededNoise(seed, index = 0) {
  const input = `${seed}:${index}`;
  let hash = 2166136261;
  for (const character of input) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function parseHex(color, fallback = '#8B7CF6') {
  const candidate = String(color || '').trim();
  const normalized = /^#[0-9a-f]{3}$/i.test(candidate)
    ? '#' + [...candidate.slice(1)].map(value => value + value).join('')
    : candidate;
  if (!/^#[0-9a-f]{6}$/i.test(normalized)) return parseHex(fallback, '#8B7CF6');
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16)
  };
}

export function normalizeHex(color, fallback = '#8B7CF6') {
  const { r, g, b } = parseHex(color, fallback);
  return '#' + [r, g, b].map(channel => channel.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function mixColors(first, second, amount = 0.5) {
  const a = parseHex(first);
  const b = parseHex(second);
  const t = clamp(amount);
  return '#' + [a.r, a.g, a.b]
    .map((channel, index) => Math.round(channel + ([b.r, b.g, b.b][index] - channel) * t)
      .toString(16).padStart(2, '0'))
    .join('').toUpperCase();
}

export function rgba(color, alpha = 1) {
  const { r, g, b } = parseHex(color);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha)})`;
}

export function luminance(color) {
  const { r, g, b } = parseHex(color);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function setTextContext(ctx, model) {
  if (!ctx) return;
  ctx.font = `${model.font.style} ${model.font.weight} ${model.metrics.fontSize}px "${model.font.family}", ${model.font.fallback}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

export function drawText(ctx, model, fillStyle = WHITE, alpha = 1, offsetX = 0, offsetY = 0, text = model.displayText) {
  if (!ctx?.fillText || !text) return;
  ctx.save?.();
  setTextContext(ctx, model);
  ctx.globalAlpha = clamp(alpha);
  ctx.fillStyle = fillStyle;
  ctx.fillText(text, model.metrics.x + offsetX, model.metrics.y + offsetY);
  ctx.restore?.();
}

export function strokeText(ctx, model, strokeStyle = WHITE, lineWidth = 1, alpha = 1, offsetX = 0, offsetY = 0, text = model.displayText) {
  if (!ctx?.strokeText || !text) return;
  ctx.save?.();
  setTextContext(ctx, model);
  ctx.globalAlpha = clamp(alpha);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = Math.max(0.25, lineWidth);
  ctx.strokeText(text, model.metrics.x + offsetX, model.metrics.y + offsetY);
  ctx.restore?.();
}

export function createLinearGradient(ctx, colors, startX, startY, endX, endY, fallback = WHITE) {
  if (!ctx?.createLinearGradient || !Array.isArray(colors) || !colors.length) return fallback;
  const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
  colors.forEach((color, index) => gradient.addColorStop?.(index / Math.max(1, colors.length - 1), color));
  return gradient;
}

export function createRadialGradient(ctx, colors, startX, startY, startRadius, endX, endY, endRadius, fallback = WHITE) {
  if (!ctx?.createRadialGradient || !Array.isArray(colors) || !colors.length) return fallback;
  const gradient = ctx.createRadialGradient(startX, startY, startRadius, endX, endY, endRadius);
  colors.forEach((color, index) => gradient.addColorStop?.(index / Math.max(1, colors.length - 1), color));
  return gradient;
}

export function drawTextBand(ctx, model, left, width, color, options = {}) {
  if (!ctx?.fillText) return;
  const {
    blur = 0,
    offsetX = 0,
    offsetY = 0,
    alpha = 1,
    slant = 0.16,
    text = model.displayText
  } = options;
  const safeWidth = Math.max(1, width);
  const skew = safeWidth * slant;
  ctx.save?.();
  if (ctx.beginPath && ctx.moveTo && ctx.lineTo && ctx.closePath && ctx.clip) {
    ctx.beginPath();
    ctx.moveTo(left + skew, 0);
    ctx.lineTo(left + safeWidth + skew, 0);
    ctx.lineTo(left + safeWidth - skew, model.height);
    ctx.lineTo(left - skew, model.height);
    ctx.closePath();
    ctx.clip();
  }
  setTextContext(ctx, model);
  ctx.globalAlpha = clamp(alpha);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = Math.max(0, blur);
  ctx.fillText(text, model.metrics.x + offsetX, model.metrics.y + offsetY);
  ctx.restore?.();
}

export function drawTextSlices(ctx, model, drawSlice, count = 8) {
  const safeCount = Math.max(1, Math.min(32, Math.floor(count)));
  for (let index = 0; index < safeCount; index += 1) {
    const top = (index / safeCount) * model.height;
    const height = model.height / safeCount + 1;
    ctx.save?.();
    if (ctx.beginPath && ctx.rect && ctx.clip) {
      ctx.beginPath();
      ctx.rect(0, top, model.width, height);
      ctx.clip();
    }
    drawSlice(index, top, height);
    ctx.restore?.();
  }
}

export function drawTextOverlay(ctx, model, fillStyle, alpha = 1, top = 0, height = model.height) {
  if (!ctx?.fillRect) return;
  ctx.save?.();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = clamp(alpha);
  ctx.fillStyle = fillStyle;
  ctx.fillRect(0, top, model.width, Math.max(0, height));
  ctx.restore?.();
}

export function drawDeterministicParticles(ctx, model, count = 12, options = {}) {
  if (!ctx?.fillRect && !ctx?.arc) return;
  const safeCount = Math.max(1, Math.min(48, Math.floor(count)));
  const colorA = options.colorA || model.todayColor;
  const colorB = options.colorB || '#CDD2FF';
  const spread = Number.isFinite(options.spread) ? options.spread : 0.9;
  for (let index = 0; index < safeCount; index += 1) {
    const seed = seededNoise(model.seed, index + 11);
    const phase = fract(model.progress + seededNoise(model.seed, index + 31));
    const x = model.metrics.x - model.metrics.width / 2 + model.metrics.width * seededNoise(model.seed, index + 47);
    const y = model.metrics.y + model.metrics.fontSize * 0.32 - phase * model.metrics.fontSize * spread;
    const size = 0.7 + seededNoise(model.seed, index + 71) * 1.7;
    ctx.save?.();
    ctx.globalAlpha = Math.sin(phase * Math.PI) * (0.35 + seed * 0.5);
    ctx.fillStyle = index % 2 ? colorA : colorB;
    if (ctx.beginPath && ctx.arc && ctx.fill) {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    } else if (ctx.fillRect) {
      ctx.fillRect(x, y, size, size);
    }
    ctx.restore?.();
  }
}

export function drawPixelFragments(ctx, model, options = {}) {
  if (!ctx?.fillRect) return;
  const block = Math.max(2, Math.round(model.metrics.fontSize / 7));
  const threshold = clamp(options.threshold ?? model.progress);
  const color = options.color || model.todayColor;
  ctx.save?.();
  ctx.globalCompositeOperation = options.composite || 'source-atop';
  ctx.fillStyle = color;
  for (let y = 0; y < model.height; y += block) {
    for (let x = 0; x < model.width; x += block) {
      const noise = seededNoise(model.seed, Math.round(x * 0.17 + y * 0.31));
      if (noise <= threshold) {
        const drift = (1 - threshold) * (noise - 0.5) * 14;
        ctx.globalAlpha = 0.2 + seededNoise(model.seed, Math.round(x + y + 101)) * 0.7;
        ctx.fillRect(x + drift, y - drift * 0.35, block, block);
      }
    }
  }
  ctx.restore?.();
}

export function drawCharacterLayers(ctx, model, drawCharacter, options = {}) {
  const characters = Array.from(model.displayText || '');
  if (!characters.length) return;
  const totalWidth = Math.max(1, model.metrics.width);
  const characterWidth = totalWidth / characters.length;
  let x = model.metrics.x - totalWidth / 2 + characterWidth / 2;
  characters.forEach((character, index) => {
    const local = clamp((model.progress * (options.speed || 1.45)) - index * (options.stagger || 0.08));
    drawCharacter(character, index, x, local, characterWidth);
    x += characterWidth;
  });
}

export function withTextMask(ctx, model, draw) {
  // source-atop applies a bounded effect only over pixels already drawn by the
  // base material. It avoids allocating a temporary Canvas on every frame.
  ctx.save?.();
  ctx.globalCompositeOperation = 'source-atop';
  draw(ctx, model);
  ctx.restore?.();
}

export function dailyPalette(model, fallback = ['#F7FBFF', '#CDD2FF']) {
  const history = Array.isArray(model.recentColors) && model.recentColors.length
    ? model.recentColors
    : [model.todayColor];
  const colors = [...history, model.todayColor].map(color => normalizeHex(color, model.todayColor));
  return colors.length >= 2 ? colors : fallback;
}

export function contrastColor(color) {
  return luminance(color) > 0.62 ? BLACK : WHITE;
}

export { BLACK, WHITE };
