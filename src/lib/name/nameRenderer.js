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
const MAX_CANVAS_WIDTH = 1024;
const MAX_CANVAS_HEIGHT = 256;

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

function estimateTextWidth(text, fontSize, font) {
  const widthFactor = Number.isFinite(font?.widthFactor)
    ? font.widthFactor
    : 0.56;
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

function getTextMetrics(text, font, width, height, compact, requestedFontSize = 0, inline = false) {
  // NameEffectCanvas is also used inline beside badges and handles. A fixed
  // padding value would consume most of the width of a short name such as
  // "Tjz" and force the renderer down to a tiny fallback size. Keep the
  // breathing room for full-width swatches, but make it proportional for
  // intrinsic inline names.
  const horizontalPadding = inline ? 0 : Math.min(compact ? 8 : 14, width * 0.1);
  const availableWidth = Math.max(1, width - horizontalPadding * 2);
  const maxFontSize = compact ? Math.min(28, height * 0.72) : Math.min(54, height * 0.72);
  const semanticFontSize = finite(requestedFontSize, 0);
  let fontSize = Math.max(compact ? 10 : 12, semanticFontSize > 0 ? semanticFontSize : maxFontSize);
  let measuredWidth = estimateTextWidth(text, fontSize, font);
  if (semanticFontSize <= 0) {
    while (measuredWidth > availableWidth && fontSize > 10) {
      fontSize -= 0.5;
      measuredWidth = estimateTextWidth(text, fontSize, font);
    }
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
  const requestedRendererKey = options.rendererKey;
  const loadout = options.loadout && typeof options.loadout === 'object' ? options.loadout : {};
  const explicitLoadout = {
    fontKey: options.fontKey ?? loadout.fontKey ?? loadout.name_font ?? '',
    materialKey: options.materialKey ?? loadout.materialKey ?? loadout.name_material ?? '',
    motionKey: options.motionKey ?? loadout.motionKey ?? loadout.name_motion ?? ''
  };
  const definition = hasComposableNameInput(explicitLoadout)
    ? resolveNameLoadout(explicitLoadout)
    : resolveNameLoadout({ rendererKey: requestedRendererKey });
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
  const baseColor = normalizeHexColor(options.baseColor, '#FFFFFF');
  const recentColors = normalizeRecentColors(options.recentColors);
  const rawPointer = options.pointer && typeof options.pointer === 'object' ? options.pointer : null;
  const pointer = rawPointer && Number.isFinite(Number(rawPointer.x)) && Number.isFinite(Number(rawPointer.y))
    ? Object.freeze({
        x: clamp(Number(rawPointer.x), 0, width),
        y: clamp(Number(rawPointer.y), 0, height)
      })
    : null;
  const font = getNameFont(definition.font);
  const material = getNameMaterial(definition.material);
  const displayText = definition.smallCaps ? text.toUpperCase() : text;
  const metrics = getTextMetrics(displayText, font, width, height, compact, options.fontSize, options.inline === true);
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
    baseColor,
    pointer,
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
    frame.baseColor,
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

function drawText(ctx, model, fillStyle, alpha = 1, offsetX = 0, offsetY = 0) {
  ctx.save();
  setTextContext(ctx, model);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fillStyle;
  ctx.fillText(model.displayText, model.metrics.x + offsetX, model.metrics.y + offsetY);
  ctx.restore();
}

function drawMaterial(ctx, model) {
  const { material, todayColor, baseColor } = model;
  const colors = material.colors;

  if (material.composable) {
    const { material: drawComposableMaterial } = getCodeOwnedNameRenderers();
    if (drawComposableMaterial) drawComposableMaterial(ctx, model);
    else drawText(ctx, model, material.key === 'plain' ? baseColor : mixColors(colors[0] || '#F7FBFF', todayColor, 0.12));
    return;
  }
  drawText(ctx, model, material.key === 'plain' ? baseColor : mixColors(colors[0] || '#F7FBFF', todayColor, material.usesDailyColor ? 0.12 : 0));
}

function drawMotion(ctx, model) {
  if (model.motion.composable && model.motion.key !== 'none') {
    const { motion: drawComposableMotion } = getCodeOwnedNameRenderers();
    if (drawComposableMotion) return drawComposableMotion(ctx, model, drawMaterial);
    drawMaterial(ctx, model);
    return false;
  }

  drawMaterial(ctx, model);
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

function measureCanvasFrame(ctx, model) {
  if (!ctx || typeof ctx.measureText !== 'function' || !model?.displayText) return model;
  ctx.save();
  setTextContext(ctx, model);
  const measuredWidth = finite(ctx.measureText(model.displayText)?.width, model.metrics.rawWidth);
  ctx.restore();
  if (!measuredWidth || measuredWidth <= 0) return model;
  const availableWidth = model.metrics.availableWidth;
  return {
    ...model,
    metrics: {
      ...model.metrics,
      rawWidth: measuredWidth,
      width: Math.min(measuredWidth, availableWidth),
      scaleX: Math.min(1, availableWidth / Math.max(1, measuredWidth))
    }
  };
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
    const measured = typeof canvas?.getBoundingClientRect === 'function'
      ? canvas.getBoundingClientRect()
      : {};
    const measuredWidth = finite(canvas?.clientWidth, finite(measured.width, width));
    const measuredHeight = finite(canvas?.clientHeight, finite(measured.height, height));
    width = clamp(finite(nextWidth, measuredWidth), 1, MAX_CANVAS_WIDTH);
    height = clamp(finite(nextHeight, measuredHeight), 1, MAX_CANVAS_HEIGHT);
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
    const frame = measureCanvasFrame(context, getNameFrameModel({ ...config, width, height, time }));
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
