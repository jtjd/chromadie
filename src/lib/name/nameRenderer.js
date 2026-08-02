import { DISPLAY_NAME_MAX_LENGTH } from '../profileIdentity.js';
import { getNameCanvasFont, getNameFont } from './nameFonts.js';
import { getNameMaterial } from './nameMaterials.js';
import { getNameMotion } from './nameMotions.js';
import { hasComposableNameInput, resolveNameLoadout } from './nameCatalog.js';
import { getCodeOwnedNameRenderers } from './nameComposableRenderer.js';

export const NAME_MAX_RENDER_LENGTH = DISPLAY_NAME_MAX_LENGTH;
export const NAME_RENDER_CONTEXTS = Object.freeze({ card: 'card', profile: 'profile' });
export const NAME_RENDER_MODES = Object.freeze({
  animated: 'animated',
  paused: 'paused',
  static: 'static',
  staticSignature: 'static-signature',
  reducedMotion: 'reduced-motion'
});

const DEFAULT_TODAY_COLOR = '#8B7CF6';
const MAX_RECENT_COLORS = 8;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function finite(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export function normalizeNameText(value) {
  return Array.from(String(value ?? ''))
    .filter(character => {
      const codePoint = character.codePointAt(0);
      return codePoint > 0x1f && !(codePoint >= 0x7f && codePoint <= 0x9f);
    })
    .slice(0, NAME_MAX_RENDER_LENGTH)
    .join('');
}

export function normalizeHexColor(value, fallback = DEFAULT_TODAY_COLOR) {
  const candidate = String(value ?? '').trim();
  if (/^#[0-9a-f]{3}$/i.test(candidate)) {
    return '#' + [...candidate.slice(1)].map(character => character + character).join('').toUpperCase();
  }
  if (/^#[0-9a-f]{6}$/i.test(candidate)) return candidate.toUpperCase();
  return fallback.toUpperCase();
}

function normalizeRecentColors(colors) {
  if (!Array.isArray(colors)) return [];
  return [...new Set(colors.map(color => normalizeHexColor(color, '')).filter(Boolean))].slice(0, MAX_RECENT_COLORS);
}

export function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value ?? '')) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededNoise(seed, index = 0) {
  const value = hashString(`${seed}:${index}`);
  return value / 4294967295;
}

function hexToRgb(value) {
  const color = normalizeHexColor(value);
  return {
    r: Number.parseInt(color.slice(1, 3), 16),
    g: Number.parseInt(color.slice(3, 5), 16),
    b: Number.parseInt(color.slice(5, 7), 16)
  };
}

function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b]
    .map(channel => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function mixColors(first, second, amount) {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  const t = clamp(amount, 0, 1);
  return rgbToHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t
  });
}

function rgba(color, alpha) {
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

function estimateTextWidth(text, fontSize, font) {
  const widthFactor = Number.isFinite(font?.widthFactor)
    ? font.widthFactor
    : font?.key === 'mono-compact' ? 0.64 : font?.key === 'editorial-serif' ? 0.58 : 0.56;
  const letterSpacing = Number.isFinite(font?.letterSpacing) ? font.letterSpacing * fontSize : 0;
  const measured = Array.from(text).reduce((total, character) => {
    if (character === ' ') return total + fontSize * 0.32;
    if ('ilI.,:;!|'.includes(character)) return total + fontSize * 0.27;
    if ('MW@#%&'.includes(character)) return total + fontSize * (widthFactor + 0.16);
    return total + fontSize * widthFactor;
  }, 0);
  return measured + Math.max(0, Array.from(text).length - 1) * letterSpacing;
}

function getCanvasSize(options, compact) {
  const fallbackWidth = compact ? 220 : 360;
  const fallbackHeight = compact ? 44 : 72;
  return {
    width: clamp(finite(options.width, fallbackWidth), 1, 4096),
    height: clamp(finite(options.height, fallbackHeight), 1, 1024)
  };
}

function getTextMetrics(text, font, width, height, compact) {
  const horizontalPadding = compact ? 8 : 14;
  const availableWidth = Math.max(1, width - horizontalPadding * 2);
  const maxFontSize = compact ? Math.min(28, height * 0.72) : Math.min(54, height * 0.72);
  let fontSize = Math.max(compact ? 10 : 12, maxFontSize);
  let measuredWidth = estimateTextWidth(text, fontSize, font);
  while (measuredWidth > availableWidth && fontSize > 10) {
    fontSize -= 0.5;
    measuredWidth = estimateTextWidth(text, fontSize, font);
  }
  return Object.freeze({
    fontSize,
    rawWidth: measuredWidth,
    width: Math.min(measuredWidth, availableWidth),
    scaleX: Math.min(1, availableWidth / Math.max(1, measuredWidth)),
    availableWidth,
    x: width / 2,
    y: height / 2,
    lineHeight: fontSize * 1.05
  });
}

function isStaticMode(mode, reducedMotion) {
  return reducedMotion
    || mode === NAME_RENDER_MODES.reducedMotion
    || mode === NAME_RENDER_MODES.static
    || mode === NAME_RENDER_MODES.staticSignature
    || mode === NAME_RENDER_MODES.paused;
}

/** @param {{ visible?: boolean, mode?: string, reducedMotion?: boolean }} [options] */
export function shouldAnimateNameFrame({ visible = true, mode = NAME_RENDER_MODES.animated, reducedMotion = false } = {}) {
  return Boolean(visible) && !reducedMotion && mode === NAME_RENDER_MODES.animated;
}

export function getNameFrameModel(options = {}) {
  const requestedRendererKey = options.rendererKey || options.legacyKey;
  const loadout = options.loadout && typeof options.loadout === 'object' ? options.loadout : {};
  const explicitLoadout = {
    fontKey: options.fontKey ?? loadout.fontKey ?? loadout.name_font ?? '',
    materialKey: options.materialKey ?? loadout.materialKey ?? loadout.name_material ?? '',
    motionKey: options.motionKey ?? loadout.motionKey ?? loadout.name_motion ?? ''
  };
  const definition = hasComposableNameInput(explicitLoadout)
    ? resolveNameLoadout(explicitLoadout)
    : resolveNameLoadout({
      rendererKey: requestedRendererKey,
      legacyKey: options.legacyKey,
      name_effect: loadout.name_effect
    });
  const rendererKey = definition.key;
  const text = normalizeNameText(options.text);
  const compact = Boolean(options.compact || options.context === NAME_RENDER_CONTEXTS.card || options.size === 'compact');
  const { width, height } = getCanvasSize(options, compact);
  const mode = Object.values(NAME_RENDER_MODES).includes(options.mode) ? options.mode : NAME_RENDER_MODES.animated;
  const reducedMotion = Boolean(options.reducedMotion);
  const motion = getNameMotion(definition.motion);
  const staticFrame = isStaticMode(mode, reducedMotion);
  const requestedPause = finite(options.pauseAt, 0.5);
  const time = staticFrame ? 0 : finite(options.time, 0);
  const progress = staticFrame
    ? clamp(requestedPause, 0, 1)
    : ((time % motion.durationMs) + motion.durationMs) % motion.durationMs / motion.durationMs;
  const todayColor = normalizeHexColor(options.todayColor, DEFAULT_TODAY_COLOR);
  const recentColors = normalizeRecentColors(options.recentColors);
  const font = getNameFont(definition.font);
  const material = getNameMaterial(definition.material);
  const displayText = definition.smallCaps ? text.toUpperCase() : text;
  const metrics = getTextMetrics(displayText, font, width, height, compact);
  const seed = hashString(`${rendererKey}:${text}:${todayColor}:${recentColors.join(',')}`);

  return Object.freeze({
    rendererKey,
    requestedRendererKey: definition.requestedKey || requestedRendererKey || '',
    composable: definition.kind === 'composable',
    layerKeys: Object.freeze({
      font: definition.font,
      material: definition.material,
      motion: definition.motion
    }),
    text,
    displayText,
    context: compact ? NAME_RENDER_CONTEXTS.card : NAME_RENDER_CONTEXTS.profile,
    compact,
    width,
    height,
    mode,
    reducedMotion: reducedMotion || mode === NAME_RENDER_MODES.reducedMotion,
    staticFrame,
    time,
    progress,
    todayColor,
    recentColors: Object.freeze(recentColors),
    font,
    material,
    motion,
    metrics,
    seed,
    noise: Object.freeze({
      first: seededNoise(seed, 0),
      second: seededNoise(seed, 1),
      third: seededNoise(seed, 2)
    })
  });
}

export function getNameFrameSignature(model) {
  const frame = model || getNameFrameModel();
  return [
    frame.rendererKey,
    frame.text,
    frame.width,
    frame.height,
    frame.progress.toFixed(6),
    frame.todayColor,
    frame.recentColors.join(',')
  ].join('|');
}

function setTextContext(ctx, model) {
  ctx.font = getNameCanvasFont(model.font.key, model.metrics.fontSize);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

function gradientFor(ctx, colors, width, progress, vertical = false) {
  const offset = (progress - 0.5) * width * 1.6;
  const gradient = vertical
    ? ctx.createLinearGradient(0, -width, 0, width)
    : ctx.createLinearGradient(-width + offset, 0, width + offset, 0);
  colors.forEach((color, index) => gradient.addColorStop(index / Math.max(1, colors.length - 1), color));
  return gradient;
}

function drawText(ctx, model, fillStyle, alpha = 1, offsetX = 0, offsetY = 0) {
  ctx.save();
  setTextContext(ctx, model);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fillStyle;
  ctx.fillText(model.displayText, model.metrics.x + offsetX, model.metrics.y + offsetY);
  ctx.restore();
}

function drawMaterial(ctx, model) {
  const { material, metrics, progress, todayColor } = model;
  const textWidth = Math.max(metrics.availableWidth, metrics.width + 24);
  const colors = material.colors;

  if (material.composable) {
    const { material: drawComposableMaterial } = getCodeOwnedNameRenderers();
    if (drawComposableMaterial) drawComposableMaterial(ctx, model);
    else drawText(ctx, model, mixColors(colors[0] || '#F7FBFF', todayColor, 0.12));
    return;
  }

  if (material.kind === 'void') {
    ctx.save();
    setTextContext(ctx, model);
    ctx.fillStyle = colors[0];
    ctx.fillText(model.displayText, metrics.x, metrics.y);
    ctx.strokeStyle = rgba(colors[1], 0.98);
    ctx.lineWidth = Math.max(0.7, model.metrics.fontSize * 0.025);
    ctx.strokeText(model.displayText, metrics.x, metrics.y);
    ctx.shadowColor = rgba(colors[2], 0.7);
    ctx.shadowBlur = model.metrics.fontSize * (0.42 + model.progress * 0.24);
    ctx.strokeStyle = rgba(colors[2], 0.65);
    ctx.strokeText(model.displayText, metrics.x, metrics.y);
    ctx.restore();
    return;
  }

  if (material.kind === 'matrix') {
    const matrixGradient = ctx.createLinearGradient(0, -model.height, 0, model.height);
    colors.forEach((color, index) => matrixGradient.addColorStop(index / Math.max(1, colors.length - 1), color));
    ctx.save();
    setTextContext(ctx, model);
    ctx.fillStyle = matrixGradient;
    ctx.shadowColor = rgba('#00ff50', 0.65);
    ctx.shadowBlur = 4;
    ctx.fillText(model.displayText, metrics.x, metrics.y);
    ctx.strokeStyle = rgba('#91ffaa', 0.34);
    ctx.lineWidth = 0.5;
    ctx.strokeText(model.displayText, metrics.x, metrics.y);
    ctx.restore();
    return;
  }

  if (material.kind === 'gradient') {
    drawText(ctx, model, gradientFor(ctx, colors, textWidth, progress));
    return;
  }

  if (material.kind === 'glow') {
    ctx.save();
    setTextContext(ctx, model);
    ctx.shadowColor = rgba(colors[1] || todayColor, 0.82);
    ctx.shadowBlur = model.metrics.fontSize * 0.42;
    ctx.fillStyle = colors[0];
    ctx.fillText(model.displayText, metrics.x, metrics.y);
    ctx.shadowColor = rgba(colors[2] || colors[1] || todayColor, 0.52);
    ctx.shadowBlur = model.metrics.fontSize * 0.82;
    ctx.fillText(model.displayText, metrics.x, metrics.y);
    ctx.restore();
    return;
  }

  const baseColor = material.shadow ? colors[0] : material.usesDailyColor ? mixColors(colors[0], todayColor, 0.12) : colors[0];
  ctx.save();
  setTextContext(ctx, model);
  if (material.shadow) {
    ctx.shadowColor = rgba(material.shadow, 0.8);
    ctx.shadowBlur = model.metrics.fontSize * 0.28;
    ctx.shadowOffsetY = model.metrics.fontSize * 0.16;
  }
  ctx.fillStyle = baseColor;
  ctx.fillText(model.displayText, metrics.x, metrics.y);
  ctx.restore();
}

function drawShimmer(ctx, model, colors = ['#ffffff', '#b9fcff']) {
  const sweep = ((model.progress * 2.2) - 0.6) * model.width;
  ctx.save();
  setTextContext(ctx, model);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = gradientFor(ctx, ['rgba(255,255,255,0)', colors[0], colors[1], 'rgba(255,255,255,0)'], model.width, model.progress);
  ctx.globalAlpha = 0.78;
  ctx.fillRect(sweep - model.width * 0.18, 0, model.width * 0.36, model.height);
  ctx.restore();
}

function drawMotion(ctx, model) {
  if (model.motion.composable && model.motion.key !== 'none') {
    const { motion: drawComposableMotion } = getCodeOwnedNameRenderers();
    if (drawComposableMotion) return drawComposableMotion(ctx, model, drawMaterial);
    drawMaterial(ctx, model);
    return false;
  }

  const kind = model.motion.kind;
  const { metrics, fontSize } = { metrics: model.metrics, fontSize: model.metrics.fontSize };
  const phase = model.progress * Math.PI * 2;

  if (kind === 'shimmer') {
    drawShimmer(ctx, model, model.material.colors);
  } else if (kind === 'flicker') {
    const flicker = 0.7 + seededNoise(model.seed, Math.floor(model.progress * 18)) * 0.3;
    drawText(ctx, model, '#ffffff', flicker * 0.35);
  } else if (kind === 'pulse') {
    const pulse = 0.5 + 0.5 * Math.sin(phase);
    ctx.save();
    setTextContext(ctx, model);
    ctx.shadowColor = rgba(model.todayColor, 0.16 + pulse * 0.36);
    ctx.shadowBlur = fontSize * (0.25 + pulse * 0.55);
    ctx.globalAlpha = 0.24 + pulse * 0.24;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(model.displayText, metrics.x, metrics.y);
    ctx.restore();
  } else if (kind === 'matrix') {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    for (let index = 0; index < 8; index += 1) {
      const x = ((seededNoise(model.seed, index) + model.progress * 0.42) % 1) * model.width;
      const y = ((seededNoise(model.seed, index + 20) + model.progress) % 1) * model.height;
      ctx.fillStyle = rgba(index % 2 ? '#00ff66' : '#e8ffe8', 0.2 + seededNoise(model.seed, index + 40) * 0.3);
      ctx.fillRect(x, y, Math.max(1, fontSize * 0.035), Math.max(2, fontSize * 0.22));
    }
    ctx.restore();
  } else if (kind === 'rainbow' || kind === 'chroma') {
    drawShimmer(ctx, model, model.material.colors.slice(0, 4));
  } else if (kind === 'glitch') {
    const glitchWindow = model.staticFrame ? 0 : seededNoise(model.seed, Math.floor(model.progress * 16));
    if (glitchWindow > 0.6) {
      drawText(ctx, model, '#00e7ff', 0.72, -fontSize * 0.09, fontSize * 0.02);
      drawText(ctx, model, '#ff335f', 0.72, fontSize * 0.09, -fontSize * 0.02);
    } else {
      drawText(ctx, model, '#ffffff', 0.34);
    }
  } else if (kind === 'wave') {
    const yOffset = Math.sin(phase) * Math.min(1.4, fontSize * 0.045);
    drawText(ctx, model, '#b9fbff', 0.3, 0, yOffset);
  } else if (kind === 'inferno') {
    ctx.save();
    setTextContext(ctx, model);
    ctx.shadowColor = rgba('#ff4500', 0.74);
    ctx.shadowBlur = fontSize * (0.55 + seededNoise(model.seed, Math.floor(model.progress * 12)) * 0.35);
    ctx.shadowOffsetY = -fontSize * 0.24;
    ctx.fillStyle = '#fff6c4';
    ctx.globalAlpha = 0.6;
    ctx.fillText(model.displayText, metrics.x, metrics.y);
    ctx.restore();
  } else if (kind === 'sunset') {
    ctx.save();
    ctx.translate(metrics.x, metrics.y);
    ctx.transform(1, 0, Math.sin(phase) * 0.018, 1, 0, 0);
    ctx.translate(-metrics.x, -metrics.y);
    drawText(ctx, model, '#ffd36a', 0.2, 0, 1);
    ctx.restore();
  } else if (kind === 'void') {
    const sweep = (model.progress * 2.6 - 1.3) * model.width;
    ctx.save();
    setTextContext(ctx, model);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = gradientFor(ctx, ['rgba(139,92,255,0)', '#8b5cff', '#f5f1ff', '#6ee7ff', 'rgba(110,231,255,0)'], model.width, model.progress);
    ctx.globalAlpha = 0.9;
    ctx.fillRect(sweep, 0, model.width * 0.22, model.height);
    ctx.restore();
  } else if (kind === 'signal') {
    drawShimmer(ctx, model, ['#f4f8ea', '#ffb86b']);
  } else if (kind === 'atelier') {
    drawShimmer(ctx, model, ['#ffffff', '#ff9ee9']);
    drawText(ctx, model, '#9ce4ff', 0.15, -fontSize * 0.05, 0);
  }
}

export function drawNameFrame(ctx, model) {
  if (!ctx || !model || !model.displayText) return;
  ctx.clearRect(0, 0, model.width, model.height);
  ctx.save();
  if (model.metrics.scaleX < 1) {
    ctx.translate(model.metrics.x, model.metrics.y);
    ctx.scale(model.metrics.scaleX, 1);
    ctx.translate(-model.metrics.x, -model.metrics.y);
  }
  const composableMotion = model.motion.composable && model.motion.key !== 'none';
  if (!composableMotion) drawMaterial(ctx, model);
  drawMotion(ctx, model);
  ctx.restore();
}

export function createNameCanvasRenderer(canvas, options = {}) {
  const context = canvas?.getContext?.('2d') || null;
  if (!context) {
    return Object.freeze({
      supported: false,
      resize: () => {},
      setOptions: () => {},
      draw: () => null,
      destroy: () => {},
      getLastFrameModel: () => null
    });
  }

  let destroyed = false;
  let config = { ...options };
  let width = finite(options.width, 360);
  let height = finite(options.height, 72);
  let dpr = 1;
  let lastFrameModel = null;

  /** @param {{ width?: number, height?: number, dpr?: number }} [size] */
  function resize({ width: nextWidth, height: nextHeight, dpr: nextDpr } = {}) {
    if (destroyed) return;
    const measured = canvas.getBoundingClientRect?.() || {};
    width = clamp(finite(nextWidth, finite(measured.width, width)), 1, 4096);
    height = clamp(finite(nextHeight, finite(measured.height, height)), 1, 1024);
    const browserRatio = typeof globalThis !== 'undefined' ? finite(globalThis.devicePixelRatio, 1) : 1;
    const deviceRatio = finite(nextDpr, browserRatio);
    dpr = clamp(deviceRatio, 1, 2);
    canvas.width = Math.max(1, Math.ceil(width * dpr));
    canvas.height = Math.max(1, Math.ceil(height * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function setOptions(nextOptions = {}) {
    if (destroyed) return;
    config = { ...config, ...nextOptions };
  }

  function draw(time = 0) {
    if (destroyed) return null;
    const frame = getNameFrameModel({ ...config, width, height, time });
    drawNameFrame(context, frame);
    lastFrameModel = frame;
    return frame;
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    context.clearRect(0, 0, width, height);
    lastFrameModel = null;
  }

  resize();
  return Object.freeze({
    supported: true,
    resize,
    setOptions,
    draw,
    destroy,
    getLastFrameModel: () => lastFrameModel
  });
}
