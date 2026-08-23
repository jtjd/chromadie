import {
  createLinearGradient,
  createRadialGradient,
  drawText,
  drawTextSlices,
  easeInOut,
  easeOut,
  fract,
  lerp,
  mixColors,
  rgba,
  seededNoise,
  setTextContext,
  strokeText,
  withTextMask
} from './primitives.js';

const MOTION_TEXT_LIGHT = '#F7FBFF';

// Daily colors can be near-black. Motion layers still need a readable frame
// while retaining a visible relationship to the roll color.
export function getReadableMotionColor(color) {
  return mixColors(color, MOTION_TEXT_LIGHT, 0.72);
}

function cloneTextModel(model, text, metrics = model.metrics) {
  return {
    ...model,
    displayText: text,
    metrics: { ...metrics }
  };
}

function drawBaseVariant(ctx, model, drawBase, {
  alpha = 1,
  offsetX = 0,
  offsetY = 0,
  blur = 0,
  shadowColor = rgba(model.todayColor, 0.34)
} = {}) {
  ctx.save?.();
  ctx.globalAlpha = alpha;
  if (blur > 0) {
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = blur;
  }
  if (offsetX || offsetY) ctx.translate?.(offsetX, offsetY);
  drawBase(ctx, model);
  ctx.restore?.();
}

function drawSliceMotion(ctx, model, drawBase, count, offsetFor, alpha = 1) {
  drawTextSlices(ctx, model, index => {
    ctx.save?.();
    ctx.globalAlpha = alpha;
    ctx.translate?.(offsetFor(index), 0);
    drawBase(ctx, model);
    ctx.restore?.();
  }, count);
}

function drawClippedBase(ctx, model, drawBase, {
  x = 0,
  y = 0,
  width = model.width,
  height = model.height,
  offsetX = 0,
  offsetY = 0,
  alpha = 1
} = {}) {
  ctx.save?.();
  ctx.globalAlpha = alpha;
  if (ctx.beginPath && ctx.rect && ctx.clip) {
    ctx.beginPath();
    ctx.rect(x, y, Math.max(0, width), Math.max(0, height));
    ctx.clip();
  }
  ctx.translate?.(offsetX, offsetY);
  drawBase(ctx, model);
  ctx.restore?.();
}

function drawColorFill(ctx, model, colors, angle, alpha = 0.96) {
  const radius = Math.max(model.width, model.height);
  const startX = model.metrics.x + Math.cos(angle) * radius;
  const startY = model.metrics.y + Math.sin(angle) * radius;
  const endX = model.metrics.x - Math.cos(angle) * radius;
  const endY = model.metrics.y - Math.sin(angle) * radius;
  const gradient = createLinearGradient(ctx, colors, startX, startY, endX, endY, MOTION_TEXT_LIGHT);
  withTextMask(ctx, model, target => {
    target.fillStyle = gradient;
    target.globalAlpha = alpha;
    target.fillRect?.(0, 0, model.width, model.height);
  });
}

function drawMaskedRect(ctx, model, left, top, width, height, fillStyle, alpha = 1) {
  if (!ctx?.fillRect) return;
  withTextMask(ctx, model, target => {
    target.fillStyle = fillStyle;
    target.globalAlpha = alpha;
    target.fillRect(left, top, Math.max(0, width), Math.max(0, height));
  });
}

function drawMaskedPulse(ctx, model, centerX, centerY, radius, colors, alpha = 1) {
  const gradient = createRadialGradient(
    ctx,
    colors,
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    Math.max(1, radius),
    colors[colors.length - 1] || 'rgba(255,255,255,0)'
  );
  drawMaskedRect(ctx, model, 0, 0, model.width, model.height, gradient, alpha);
}

function drawPrismSlices(ctx, model, colors, phase) {
  const offset = Math.floor(phase * colors.length * 1.5);
  drawTextSlices(ctx, model, index => {
    const color = colors[(index + offset) % colors.length];
    const jitter = Math.sin(phase * Math.PI * 2 + index * 0.8) * 1.2;
    drawText(ctx, model, color, 0.88, jitter);
  }, colors.length);
}

function drawLiquidHighlight(ctx, model, progress, phase) {
  const width = Math.max(8, model.width * 0.3);
  const left = model.width * (progress * 1.25 - 0.2) + Math.sin(phase) * model.width * 0.08;
  const highlight = createLinearGradient(
    ctx,
    ['rgba(255,255,255,0)', 'rgba(255,255,255,.34)', 'rgba(255,255,255,0)'],
    left,
    0,
    left + width,
    0,
    'rgba(255,255,255,.16)'
  );
  drawMaskedRect(ctx, model, left, 0, width, model.height, highlight, 0.78);
}

function drawParticleTrail(ctx, model, count = 32) {
  if (!ctx?.fillRect && !ctx?.arc) return;
  const { metrics, progress } = model;
  const left = metrics.x - metrics.width / 2;
  const colors = [getReadableMotionColor(model.todayColor), '#45E8FF', '#FF4FA3'];
  for (let index = 0; index < count; index += 1) {
    const anchor = seededNoise(model.seed, index + 47);
    const localPhase = fract(
      progress * (0.78 + seededNoise(model.seed, index + 31) * 0.42)
        + seededNoise(model.seed, index + 11)
    );
    const baseline = metrics.y + metrics.fontSize * (0.28 + seededNoise(model.seed, index + 71) * 0.12);
    const lift = metrics.fontSize * (0.52 + seededNoise(model.seed, index + 83) * 1.08);
    const size = 0.7 + seededNoise(model.seed, index + 101) * 1.7;
    const x = left + metrics.width * anchor
      + Math.sin(localPhase * Math.PI * 2 + index) * metrics.fontSize * 0.08;
    const y = baseline - localPhase * lift;
    const alpha = Math.sin(localPhase * Math.PI) * (0.28 + seededNoise(model.seed, index + 127) * 0.56);
    const color = colors[index % colors.length];
    ctx.save?.();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.5, size * 0.7);
    if (ctx.beginPath && ctx.moveTo && ctx.lineTo && ctx.stroke) {
      ctx.beginPath();
      ctx.moveTo(x, y + size * 2.8);
      ctx.lineTo(x, y + size * 0.6);
      ctx.stroke();
    }
    if (ctx.beginPath && ctx.arc && ctx.fill) {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    } else if (ctx.fillRect) {
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
    }
    ctx.restore?.();
  }
}

const REFERENCE_TEXT_MASKS = new WeakMap();
const RASTER_SIGNAL_BUFFERS = new WeakMap();

function createReferenceCanvas(ctx, width, height) {
  const ownerDocument = ctx?.canvas?.ownerDocument
    || (typeof document !== 'undefined' ? document : null);
  if (ownerDocument?.createElement) {
    const canvas = ownerDocument.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      return new OffscreenCanvas(width, height);
    } catch {
      return null;
    }
  }
  return null;
}

function getReferenceTextMask(ctx, model) {
  if (!ctx || (typeof ctx !== 'object' && typeof ctx !== 'function')) return null;
  const key = [
    model.displayText,
    model.width,
    model.height,
    model.font.key,
    model.metrics.fontSize,
    model.metrics.width,
    model.metrics.x,
    model.metrics.y
  ].join('|');
  const cached = REFERENCE_TEXT_MASKS.get(ctx);
  if (cached?.key === key) return cached;

  const width = Math.max(1, Math.round(model.width));
  const height = Math.max(1, Math.round(model.height));
  const maskCanvas = createReferenceCanvas(ctx, width, height);
  const maskContext = maskCanvas?.getContext?.('2d');
  if (!maskCanvas || !maskContext?.getImageData || !maskContext.fillText) return null;

  maskContext.clearRect(0, 0, width, height);
  setTextContext(maskContext, model);
  maskContext.fillStyle = '#FFFFFF';
  maskContext.fillText(model.displayText, model.metrics.x, model.metrics.y);
  maskContext.lineWidth = Math.max(2, model.metrics.fontSize * 0.018);
  maskContext.strokeStyle = '#FFFFFF';
  maskContext.strokeText?.(model.displayText, model.metrics.x, model.metrics.y);

  let pixels;
  try {
    pixels = maskContext.getImageData(0, 0, width, height).data;
  } catch {
    return null;
  }

  const left = Math.max(0, Math.floor(model.metrics.x - model.metrics.width / 2 - model.metrics.fontSize * 0.12));
  const right = Math.min(width, Math.ceil(model.metrics.x + model.metrics.width / 2 + model.metrics.fontSize * 0.12));
  const top = Math.max(0, Math.floor(model.metrics.y - model.metrics.fontSize * 0.54));
  const bottom = Math.min(height, Math.ceil(model.metrics.y + model.metrics.fontSize * 0.54));
  const alphaAt = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return 0;
    return pixels[(y * width + x) * 4 + 3] || 0;
  };
  const solidPoints = [];
  const edgePoints = [];
  // The reference samples the glyph on a bounded two-pixel grid. Keep that
  // density across profile and compact surfaces so a small name stays
  // granular without turning into a noisy block after downsampling.
  const sampleStep = 2;
  for (let y = top; y < bottom; y += sampleStep) {
    for (let x = left; x < right; x += sampleStep) {
      if (alphaAt(x, y) <= 20) continue;
      const leftAlpha = alphaAt(x - sampleStep, y);
      const rightAlpha = alphaAt(x + sampleStep, y);
      const topAlpha = alphaAt(x, y - sampleStep);
      const bottomAlpha = alphaAt(x, y + sampleStep);
      const edge = leftAlpha <= 20 || rightAlpha <= 20 || topAlpha <= 20 || bottomAlpha <= 20;
      const normalLength = Math.hypot(leftAlpha - rightAlpha, topAlpha - bottomAlpha) || 1;
      const point = {
        x,
        y,
        nx: (leftAlpha - rightAlpha) / normalLength,
        ny: (topAlpha - bottomAlpha) / normalLength
      };
      solidPoints.push(point);
      if (edge) edgePoints.push(point);
    }
  }
  if (!solidPoints.length) return null;

  const fieldCanvas = createReferenceCanvas(ctx, width, height);
  const fieldContext = fieldCanvas?.getContext?.('2d') || null;
  const state = { key, canvas: maskCanvas, solidPoints, edgePoints, fieldCanvas, fieldContext };
  REFERENCE_TEXT_MASKS.set(ctx, state);
  return state;
}

function getRasterSignalBuffers(ctx, model) {
  if (!ctx || (typeof ctx !== 'object' && typeof ctx !== 'function')) return null;
  const width = Math.max(1, Math.round(model.width));
  const height = Math.max(1, Math.round(model.height));
  const key = [
    model.displayText,
    width,
    height,
    model.font.key,
    model.metrics.fontSize,
    model.metrics.x,
    model.metrics.y,
    model.seed
  ].join('|');
  const cached = RASTER_SIGNAL_BUFFERS.get(ctx);
  if (cached?.key === key) return cached;

  const sourceCanvas = createReferenceCanvas(ctx, width, height);
  const sourceContext = sourceCanvas?.getContext?.('2d');
  const noiseCanvas = createReferenceCanvas(ctx, 128, 128);
  const noiseContext = noiseCanvas?.getContext?.('2d');
  if (!sourceCanvas || !sourceContext?.fillText || !noiseCanvas || !noiseContext?.createImageData || !noiseContext?.putImageData) {
    return null;
  }

  sourceContext.clearRect(0, 0, width, height);
  setTextContext(sourceContext, model);
  sourceContext.fillStyle = '#FFFFFF';
  sourceContext.shadowColor = 'rgba(255,255,255,.42)';
  const visualScale = Math.min(1, Math.max(0.42, model.metrics.fontSize / 111));
  sourceContext.shadowBlur = Math.max(0.85, 2 * visualScale);
  sourceContext.fillText(model.displayText, model.metrics.x, model.metrics.y);

  const image = noiseContext.createImageData(128, 128);
  for (let pixel = 0; pixel < 128 * 128; pixel += 1) {
    const offset = pixel * 4;
    const value = Math.floor(seededNoise(model.seed, pixel * 17 + 701) * 255);
    image.data[offset] = value;
    image.data[offset + 1] = value;
    image.data[offset + 2] = value;
    image.data[offset + 3] = seededNoise(model.seed, pixel * 19 + 709) < 0.62 ? 255 : 0;
  }
  noiseContext.putImageData(image, 0, 0);

  const state = { key, sourceCanvas, noiseCanvas };
  RASTER_SIGNAL_BUFFERS.set(ctx, state);
  return state;
}

function drawReferenceCircle(ctx, x, y, radius, color, alpha) {
  if (ctx?.beginPath && ctx.arc && ctx.fill) {
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.1, radius), 0, Math.PI * 2);
    ctx.fill();
  } else if (ctx?.fillRect) {
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = color;
    ctx.fillRect(x - radius / 2, y - radius / 2, Math.max(0.5, radius), Math.max(0.5, radius));
  }
}

function drawNeonParticleFallback(ctx, model, drawBase) {
  const { metrics } = model;
  const left = metrics.x - metrics.width / 2;
  const top = metrics.y - metrics.fontSize * 0.52;
  const field = createLinearGradient(ctx,
    ['rgba(0,220,255,.26)', 'rgba(55,110,255,.12)', 'rgba(255,45,215,.26)'],
    left,
    0,
    left + metrics.width,
    0,
    '#B6F7FF');
  drawBaseVariant(ctx, model, drawBase, { alpha: 0.16, blur: 3, shadowColor: '#5F82FF' });
  drawBase(ctx, model);
  withTextMask(ctx, model, target => {
    target.fillStyle = field;
    target.globalAlpha = 0.86;
    target.fillRect?.(0, 0, model.width, model.height);
  });
  strokeText(ctx, model, field, Math.max(1.2, metrics.fontSize * 0.01), 0.75);
  const particleCount = Math.min(680, Math.max(110, Math.round(metrics.width * metrics.fontSize * 0.045)));
  withTextMask(ctx, model, target => {
    for (let index = 0; index < particleCount; index += 1) {
      const seed = seededNoise(model.seed, index + 281);
      const x = left + seededNoise(model.seed, index + 321) * metrics.width;
      const y = top + seededNoise(model.seed, index + 341) * metrics.fontSize;
      drawReferenceCircle(target, x, y, 0.45 + seed * 1.25, index % 9 === 0 ? '#FFFFFF' : '#00EFFF', 0.35 + seed * 0.45);
    }
  });
}

function drawFuzzyMotion(ctx, model, drawBase) {
  const { progress, metrics } = model;
  drawBase(ctx, model);
  drawSliceMotion(ctx, model, (target, nextModel) => drawText(target, nextModel, '#45E8FF'), 9,
    index => (seededNoise(model.seed, index + Math.floor(progress * 24) * 7) - 0.5) * 11, 0.45);
  drawSliceMotion(ctx, model, (target, nextModel) => drawText(target, nextModel, '#FF4FA3'), 9,
    index => (seededNoise(model.seed, index + 61 + Math.floor(progress * 19) * 5) - 0.5) * 8, 0.3);
  drawMaskedRect(ctx, model,
    lerp(metrics.x - metrics.width * 0.72, metrics.x + metrics.width * 0.72, easeInOut(progress)),
    0,
    Math.max(3, metrics.width * 0.07),
    model.height,
    '#FFFFFF',
    0.48);
  drawMaskedRect(ctx, model,
    0,
    (Math.floor(progress * 16) % 6) / 6 * model.height,
    model.width,
    1,
    '#090B0F',
    0.28);
}

function drawKineticEcho(ctx, model, drawBase) {
  const time = Number.isFinite(model.time) ? model.time : 0;
  const angle = time * 0.0014;
  // The rear echo is deliberately slower and wider than the nearer echo. The
  // two controlled afterimages stay attached to the name instead of becoming
  // a generic blur field.
  drawBaseVariant(ctx, model, drawBase, {
    alpha: 0.34,
    offsetX: Math.cos(angle * 0.82) * 15,
    offsetY: Math.sin(angle * 1.3) * 2.4,
    blur: 1.2,
    shadowColor: '#B78BFF'
  });
  drawBaseVariant(ctx, model, drawBase, {
    alpha: 0.48,
    offsetX: Math.sin(angle) * 9,
    offsetY: Math.cos(angle * 1.15) * 1.5,
    blur: 0.8,
    shadowColor: model.todayColor
  });
  drawBase(ctx, model);
}

function drawMagneticType(ctx, model) {
  if (!ctx?.fillText) return;
  const characters = Array.from(model.displayText || '');
  if (!characters.length) return;
  const { metrics } = model;
  const characterWidth = metrics.width / Math.max(1, characters.length);
  const pointer = model.pointer && Number.isFinite(model.pointer.x) && Number.isFinite(model.pointer.y)
    ? model.pointer
    : null;
  const time = Number.isFinite(model.time) ? model.time : 0;

  ctx.save?.();
  setTextContext(ctx, model);
  ctx.fillStyle = getReadableMotionColor(model.todayColor);
  ctx.shadowColor = rgba(model.todayColor, 0.42);
  ctx.shadowBlur = 3;
  characters.forEach((character, index) => {
    const homeX = metrics.x - metrics.width / 2 + characterWidth * (index + 0.5);
    const homeY = metrics.y;
    const dx = pointer ? homeX - pointer.x : 0;
    const dy = pointer ? homeY - pointer.y : 0;
    const distance = Math.hypot(dx, dy);
    const influence = pointer && distance < 130 ? 1 - distance / 130 : 0;
    const directionX = distance > 0.001 ? dx / distance : 0;
    const directionY = distance > 0.001 ? dy / distance : 0;
    const breathing = 0.86 + Math.sin(time * 0.002 + index * 0.7) * 0.14;
    const offsetX = directionX * influence * 20 * breathing;
    const offsetY = directionY * influence * 13 * breathing;
    ctx.globalAlpha = 0.82 + influence * 0.18;
    ctx.fillText(character, homeX + offsetX, homeY + offsetY);
  });
  ctx.restore?.();
}

function drawNeonParticleName(ctx, model, drawBase) {
  const { metrics } = model;
  const time = Number.isFinite(model.time) ? model.time : 0;
  const left = metrics.x - metrics.width / 2;
  const colors = ['#31E6FF', '#8176FF', '#FF6ED8'];

  const mask = getReferenceTextMask(ctx, model);
  if (!mask?.fieldCanvas || !mask.fieldContext || !mask.canvas) {
    drawNeonParticleFallback(ctx, model, drawBase);
    return;
  }

  // The reference is white type first. Color appears as a restrained edge
  // atmosphere and isolated particles, never as broad bands across the name.
  const fieldContext = mask.fieldContext;
  const fieldCanvas = mask.fieldCanvas;
  fieldContext.clearRect(0, 0, model.width, model.height);
  fieldContext.fillStyle = createLinearGradient(
    fieldContext,
    ['rgba(28,226,255,.72)', 'rgba(255,255,255,.08)', 'rgba(126,108,255,.26)', 'rgba(255,91,214,.68)'],
    left,
    0,
    left + metrics.width,
    0,
    '#FFFFFF'
  );
  fieldContext.fillRect(0, 0, model.width, model.height);
  fieldContext.globalCompositeOperation = 'destination-in';
  fieldContext.drawImage(mask.canvas, 0, 0);
  fieldContext.globalCompositeOperation = 'source-over';

  // Two close, low-energy color shadows provide the cyan-left/pink-right
  // perimeter in the source without sacrificing the letter silhouette.
  ctx.save?.();
  ctx.globalAlpha = 0.44;
  ctx.shadowColor = 'rgba(38,218,255,.7)';
  ctx.shadowBlur = Math.max(6, metrics.fontSize * 0.16);
  ctx.translate?.(-Math.max(0.35, metrics.fontSize * 0.009), 0);
  ctx.drawImage?.(fieldCanvas, 0, 0, model.width, model.height);
  ctx.restore?.();

  ctx.save?.();
  ctx.globalAlpha = 0.34;
  ctx.shadowColor = 'rgba(255,76,210,.62)';
  ctx.shadowBlur = Math.max(6, metrics.fontSize * 0.14);
  ctx.translate?.(Math.max(0.35, metrics.fontSize * 0.009), metrics.fontSize * 0.003);
  ctx.drawImage?.(fieldCanvas, 0, 0, model.width, model.height);
  ctx.restore?.();

  ctx.save?.();
  ctx.filter = `blur(${Math.max(3, metrics.fontSize * 0.09)}px)`;
  ctx.globalAlpha = 0.16;
  ctx.drawImage?.(fieldCanvas, 0, 0, model.width, model.height);
  ctx.restore?.();

  ctx.save?.();
  ctx.globalAlpha = 0.18;
  ctx.shadowColor = 'rgba(116,132,255,.82)';
  ctx.shadowBlur = Math.max(6, metrics.fontSize * 0.18);
  ctx.drawImage?.(mask.canvas, 0, 0, model.width, model.height);
  ctx.restore?.();

  ctx.save?.();
  ctx.filter = `blur(${Math.max(2, metrics.fontSize * 0.055)}px)`;
  ctx.globalAlpha = 0.44;
  ctx.shadowColor = 'rgba(80,108,255,.68)';
  ctx.shadowBlur = Math.max(6, metrics.fontSize * 0.12);
  ctx.drawImage?.(mask.canvas, 0, 0, model.width, model.height);
  ctx.restore?.();

  const perimeter = createLinearGradient(
    ctx,
    ['#43ECFF', '#F8FDFF', '#8E84FF', '#FF73D9'],
    left,
    0,
    left + metrics.width,
    0,
    '#F8FDFF'
  );
  ctx.save?.();
  setTextContext(ctx, model);
  ctx.globalAlpha = 0.52;
  ctx.strokeStyle = perimeter;
  ctx.lineWidth = Math.max(1.05, metrics.fontSize * 0.018);
  ctx.shadowColor = 'rgba(105,126,255,.86)';
  ctx.shadowBlur = Math.max(6, metrics.fontSize * 0.11);
  ctx.strokeText?.(model.displayText, metrics.x, metrics.y);
  ctx.restore?.();

  // The clean white face is the dominant layer in the supplied reference.
  ctx.save?.();
  ctx.globalAlpha = 0.94;
  ctx.drawImage?.(mask.canvas, 0, 0, model.width, model.height);
  ctx.globalAlpha = 0.17;
  ctx.drawImage?.(fieldCanvas, 0, 0, model.width, model.height);
  ctx.restore?.();

  const solidPoints = mask.solidPoints;
  const compactParticles = model.compact || metrics.fontSize < 36;
  const particleCount = Math.min(
    solidPoints.length,
    compactParticles ? 42 : 320,
    Math.max(compactParticles ? 14 : 96, Math.round(metrics.width * metrics.fontSize * 0.0115))
  );
  const particleScale = Math.min(1.35, Math.max(0.42, metrics.fontSize / 74));
  ctx.save?.();
  for (let index = 0; index < particleCount; index += 1) {
    const edgeBiased = index % 3 === 0 && mask.edgePoints.length;
    const points = edgeBiased ? mask.edgePoints : solidPoints;
    const sample = points[Math.floor(seededNoise(model.seed, index * 73 + 281) * points.length) % points.length];
    const tw = time * 0.0015 + seededNoise(model.seed, index * 79 + 301) * Math.PI * 2;
    const sizeNoise = seededNoise(model.seed, index * 83 + 361);
    const size = (0.5 + sizeNoise * sizeNoise * 1.55) * particleScale;
    const hot = seededNoise(model.seed, index * 89 + 371) > 0.91;
    let x = sample.x + Math.sin(tw + index) * 0.32 * particleScale;
    let y = sample.y + Math.cos(tw * 1.2 + index) * 0.32 * particleScale;
    if (model.pointer && Number.isFinite(model.pointer.x) && Number.isFinite(model.pointer.y)) {
      const dx = model.pointer.x - x;
      const dy = model.pointer.y - y;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance < 90) {
        const force = (1 - distance / 90) * 0.12;
        x += dx * force;
        y += dy * force;
      }
    }
    const pulse = (Math.sin(tw * 1.4 + index) + 1) / 2;
    const colorIndex = Math.floor(seededNoise(model.seed, index * 97 + 391) * colors.length) % colors.length;
    const color = hot ? '#FFFFFF' : colors[colorIndex];
    drawReferenceCircle(ctx, x, y, size * 2.25, color, 0.085 * (0.65 + pulse * 0.35));
    drawReferenceCircle(ctx, x, y, size, color, (hot ? 0.72 : 0.54) * (0.76 + pulse * 0.24));
    if (hot) drawReferenceCircle(ctx, x, y, size * 0.34, '#FFFFFF', 0.92);
  }

  const edgeCount = Math.min(
    mask.edgePoints.length,
    compactParticles ? 34 : 160,
    Math.max(compactParticles ? 16 : 72, Math.round(metrics.width * 0.5))
  );
  for (let index = 0; index < edgeCount; index += 1) {
    const seed = seededNoise(model.seed, index * 131 + 401);
    const edge = mask.edgePoints[
      Math.floor(seededNoise(model.seed, index * 137 + 411) * mask.edgePoints.length) % mask.edgePoints.length
    ];
    const life = fract(seed + time * 0.00045);
    const tangent = (seededNoise(model.seed, index * 149 + 421) - 0.5) * 1.8;
    const distance = life * (3.5 + 8.5 * particleScale);
    const x = edge.x + edge.nx * distance - edge.ny * tangent;
    const y = edge.y + edge.ny * distance + edge.nx * tangent;
    const size = (0.55 + seededNoise(model.seed, index * 157 + 441) * 1.25) * particleScale;
    const alpha = 0.14 + Math.sin(life * Math.PI) * 0.68;
    const color = colors[Math.floor(seededNoise(model.seed, index * 163 + 446) * colors.length) % colors.length];
    drawReferenceCircle(ctx, x, y, size * 2.5, color, alpha * 0.11);
    drawReferenceCircle(ctx, x, y, size, color, alpha * 0.64);
    if (seededNoise(model.seed, index * 167 + 447) > 0.66) {
      drawReferenceCircle(ctx, x, y, size * 0.42, '#FFFFFF', alpha * 0.82);
    }
  }

  // Tiny edge glints punctuate the particles without producing the long
  // horizontal streak that obscured compact names.
  const glintCount = compactParticles ? 3 : 8;
  for (let index = 0; index < glintCount; index += 1) {
    const phase = fract(time * 0.00025 + seededNoise(model.seed, index + 451));
    if (phase > 0.16 || !mask.edgePoints.length) continue;
    const edge = mask.edgePoints[Math.floor(seededNoise(model.seed, index + 461) * mask.edgePoints.length) % mask.edgePoints.length];
    const size = (1.8 + seededNoise(model.seed, index + 471) * 2.8) * particleScale;
    const alpha = (0.16 - phase) / 0.16;
    ctx.globalAlpha = alpha * 0.82;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(0.55, particleScale * 0.65);
    ctx.beginPath?.();
    ctx.moveTo?.(edge.x - size, edge.y);
    ctx.lineTo?.(edge.x + size, edge.y);
    ctx.moveTo?.(edge.x, edge.y - size);
    ctx.lineTo?.(edge.x, edge.y + size);
    ctx.stroke?.();
  }
  ctx.restore?.();

  const outline = createLinearGradient(
    ctx,
    ['rgba(0,236,255,.62)', 'rgba(255,255,255,.4)', 'rgba(255,80,214,.62)'],
    left,
    0,
    left + metrics.width,
    0,
    '#F7FBFF'
  );
  strokeText(ctx, model, outline, Math.max(0.6, metrics.fontSize * 0.009), 0.56);
}

function drawRasterSignal(ctx, model, drawBase) {
  if (!ctx?.fillText) {
    drawBase(ctx, model);
    return;
  }
  const { metrics } = model;
  const time = Number.isFinite(model.time) ? model.time : 0;
  const rowHeight = Math.max(1.5, metrics.fontSize * 0.025);
  const textTop = metrics.y - metrics.fontSize * 0.47;
  const textBottom = metrics.y + metrics.fontSize * 0.47;
  const rows = Math.min(96, Math.max(8, Math.ceil((textBottom - textTop) / rowHeight)));
  const buffers = getRasterSignalBuffers(ctx, model);
  const visualScale = Math.min(1, Math.max(0.42, metrics.fontSize / 111));

  // Raster Signal is intentionally monochrome. It constructs the name from
  // white glyph rows, so a vivid material cannot collapse it into Neon's
  // colored energy fill.
  ctx.save?.();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.12;
  ctx.filter = `blur(${Math.max(1.25, 3 * visualScale)}px)`;
  if (buffers?.sourceCanvas) ctx.drawImage?.(buffers.sourceCanvas, 0, 0, model.width, model.height);
  else drawText(ctx, model, MOTION_TEXT_LIGHT, 1);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;

  for (let index = 0; index < rows; index += 1) {
    const slow = Math.sin(time * 0.004 + index * 0.64) * 1.7;
    const fine = Math.sin(time * 0.011 + index * 1.83) * 0.55;
    const cluster = Math.sin(index * 0.29 + time * 0.0015) * 1.15;
    const jump = ((index + Math.floor(time / 170)) % 17 === 0 ? Math.sin(time * 0.05 + index) * 2.2 : 0);
    const offset = (slow + fine + cluster + jump) * visualScale;
    const top = textTop + index * rowHeight;
    const height = Math.min(rowHeight + 0.4, textBottom - top);
    if (height <= 0) continue;
    ctx.globalAlpha = 0.82 + Math.sin(time * 0.0027 + index * 0.43) * 0.1;
    if (buffers?.sourceCanvas && ctx.drawImage) {
      ctx.drawImage(buffers.sourceCanvas, 0, top, model.width, height, offset, top, model.width, height);
    } else {
      ctx.save?.();
      if (ctx.beginPath && ctx.rect && ctx.clip) {
        ctx.beginPath();
        ctx.rect(0, top, model.width, height);
        ctx.clip();
      }
      ctx.translate?.(offset, 0);
      drawText(ctx, model, MOTION_TEXT_LIGHT, 1);
      ctx.restore?.();
    }
  }
  ctx.restore?.();

  // Cut horizontal signal gaps through the assembled rows. Destination-out
  // keeps the effect transparent around the name in real profile canvases.
  ctx.save?.();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#000000';
  for (let y = textTop; y < textBottom; y += rowHeight * 2.05) {
    ctx.fillRect?.(metrics.x - metrics.width / 2, y, metrics.width, Math.max(0.6, rowHeight * 0.32));
  }
  ctx.restore?.();

  // Tile the source's 128px monochrome texture across only pixels already
  // occupied by the name. The reference page applies this texture to its
  // stage background too; public profiles deliberately keep that background
  // transparent and retain only the text treatment requested here.
  if (buffers?.noiseCanvas && ctx.drawImage) {
    ctx.save?.();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = 0.08;
    const tileSize = 128 * visualScale;
    const offsetX = (time * 0.025 * visualScale) % tileSize;
    const offsetY = (time * 0.011 * visualScale) % tileSize;
    for (let x = -tileSize + offsetX; x < model.width; x += tileSize) {
      for (let y = -tileSize + offsetY; y < model.height; y += tileSize) {
        ctx.drawImage(buffers.noiseCanvas, x, y, tileSize, tileSize);
      }
    }
    ctx.restore?.();
  }

  const pixelCount = model.compact
    ? Math.min(55, Math.max(20, Math.round(metrics.width * 0.2)))
    : 55;
  const frame = Math.floor(time / (1000 / 60));
  ctx.save?.();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = '#FFFFFF';
  for (let index = 0; index < pixelCount; index += 1) {
    const x = metrics.x - metrics.width / 2 + seededNoise(model.seed, frame * 4099 + index * 31 + 611) * metrics.width;
    const y = textTop + seededNoise(model.seed, frame * 4127 + index * 37 + 631) * (textBottom - textTop);
    const alpha = seededNoise(model.seed, frame * 4153 + index * 41 + 641);
    const width = (0.4 + seededNoise(model.seed, frame * 4177 + index * 43 + 651) * 1.4) * visualScale;
    const height = (0.4 + seededNoise(model.seed, frame * 4201 + index * 47 + 661) * 1.4) * visualScale;
    ctx.globalAlpha = alpha * 0.18;
    ctx.fillRect?.(x, y, width, height);
  }
  ctx.restore?.();
}

export function drawComposableMotion(ctx, model, drawBase) {
  const { progress, metrics } = model;
  const phase = progress * Math.PI * 2;

  switch (model.motion.key) {
    case 'haunt-glow': {
      const pulse = 0.65 + Math.sin(phase * 1.5 - 0.8) * 0.18;
      drawBaseVariant(ctx, model, drawBase, {
        alpha: 0.68,
        blur: 17 * pulse,
        shadowColor: model.todayColor
      });
      drawBaseVariant(ctx, model, drawBase, {
        alpha: 0.76,
        offsetX: Math.sin(phase * 0.5) * 0.7,
        blur: 2.5,
        shadowColor: '#FFFFFF'
      });
      drawBase(ctx, model);
      drawMaskedPulse(
        ctx,
        model,
        metrics.x + Math.sin(phase) * metrics.width * 0.32,
        metrics.y,
        metrics.width * (0.56 + pulse * 0.2),
        [rgba(model.todayColor, 0.7), 'rgba(255,255,255,.28)', 'rgba(255,255,255,0)'],
        0.42
      );
      return true;
    }
    case 'letter-shuffle': {
      const text = Array.from(model.displayText || '');
      const locked = Math.floor((Math.min(progress, 0.42) / 0.42) * text.length);
      const tail = text.slice(locked);
      const shift = tail.length > 1 ? Math.floor(progress * 40) % tail.length : 0;
      const scrambledGlyphs = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789*+×<>/';
      const scrambledTail = tail.map((character, index) => {
        if (progress >= 0.42 || !character.trim()) return character;
        const glyphIndex = Math.floor(seededNoise(model.seed, index + shift * 17 + Math.floor(progress * 31) * 3) * scrambledGlyphs.length);
        return scrambledGlyphs[glyphIndex];
      });
      const shuffled = progress < 0.42
        ? text.slice(0, locked).concat(scrambledTail).join('')
        : model.displayText;
      const nextModel = cloneTextModel(model, shuffled, { ...metrics, width: metrics.width });
      drawBaseVariant(ctx, nextModel, drawBase, { alpha: progress < 0.42 ? 0.56 : 1, offsetX: Math.sin(phase) * 1.5 });
      drawBase(ctx, nextModel);
      return true;
    }
    case 'typewriter-name': {
      const reveal = 0.42;
      const hold = 0.82;
      const count = progress < reveal
        ? Math.floor((progress / reveal) * model.displayText.length)
        : progress < hold
          ? model.displayText.length
          : Math.max(0, model.displayText.length - Math.floor(((progress - hold) / (1 - hold)) * model.displayText.length));
      const shown = model.displayText.slice(0, count);
      const visibleWidth = metrics.width * (count / Math.max(1, model.displayText.length));
      const nextModel = cloneTextModel(model, shown, {
        ...metrics,
        x: metrics.x - (metrics.width - visibleWidth) / 2,
        width: visibleWidth
      });
      drawBase(ctx, nextModel);
      if (ctx.fillRect && progress < hold && Math.floor(progress * 18) % 2 === 0) {
        ctx.fillStyle = '#CDD2FF';
        ctx.fillRect(nextModel.metrics.x + visibleWidth / 2 + 3, metrics.y - metrics.fontSize * 0.45, 2, metrics.fontSize * 0.9);
      }
      return true;
    }
    case 'haunt-particles':
      drawParticleTrail(ctx, model, 32);
      drawBaseVariant(ctx, model, drawBase, { alpha: 0.82, blur: 3, shadowColor: model.todayColor });
      drawBase(ctx, model);
      return true;
    case 'haunt-rainbow':
      drawBase(ctx, model);
      drawPrismSlices(ctx, model,
        ['#FF2458', '#FF9D00', '#FFE600', '#39FF88', '#00D9FF', '#7357FF', '#FF2458'],
        progress);
      drawMaskedRect(ctx, model,
        lerp(0, model.width, progress) - model.width * 0.035,
        0,
        model.width * 0.07,
        model.height,
        '#FFFFFF',
        0.42);
      return true;
    case 'haunt-gradient':
      drawBase(ctx, model);
      drawColorFill(ctx, model, ['#FF2E78', '#8C4DFF', '#2DD4FF'], -0.42 + Math.sin(phase) * 0.24, 0.94);
      drawLiquidHighlight(ctx, model, progress, phase);
      return true;
    case 'haunt-fuzzy':
      drawFuzzyMotion(ctx, model, drawBase);
      return true;
    case 'haunt-reveal': {
      const reveal = easeOut(Math.min(1, progress / 0.72));
      const left = metrics.x - metrics.width / 2;
      drawBaseVariant(ctx, model, drawBase, {
        alpha: 0.16 + reveal * 0.16,
        offsetX: (1 - reveal) * -metrics.width * 0.28,
        blur: 5,
        shadowColor: model.todayColor
      });
      drawClippedBase(ctx, model, drawBase, {
        x: left,
        width: metrics.width * reveal,
        offsetX: (1 - reveal) * -metrics.width * 0.16,
        alpha: 1
      });
      drawMaskedRect(ctx, model,
        left + metrics.width * reveal - metrics.width * 0.018,
        0,
        Math.max(2, metrics.width * 0.036),
        model.height,
        '#FFFFFF',
        0.84);
      return true;
    }
    case 'haunt-split': {
      const settle = easeOut(Math.min(1, progress / 0.78));
      const drift = (1 - settle) * metrics.width * 0.34;
      drawBaseVariant(ctx, model, drawBase, { alpha: 0.14, blur: 4, shadowColor: model.todayColor });
      drawClippedBase(ctx, model, drawBase, {
        y: 0,
        height: model.height / 2 + 1,
        offsetX: -drift,
        offsetY: (1 - settle) * -metrics.fontSize * 0.16,
        alpha: 1
      });
      drawClippedBase(ctx, model, drawBase, {
        y: model.height / 2,
        height: model.height / 2 + 1,
        offsetX: drift,
        offsetY: (1 - settle) * metrics.fontSize * 0.16,
        alpha: 1
      });
      const seam = Math.max(1, drift * 0.12);
      drawMaskedRect(ctx, model, metrics.x - seam, 0, 1.5, model.height, '#45E8FF', 0.22 + (1 - settle) * 0.34);
      drawMaskedRect(ctx, model, metrics.x + seam - 1.5, 0, 1.5, model.height, '#FF4FA3', 0.22 + (1 - settle) * 0.34);
      return true;
    }
    case 'haunt-flash': {
      const exposure = Math.exp(-((progress - 0.42) ** 2) / 0.018);
      drawBaseVariant(ctx, model, drawBase, {
        alpha: exposure * 0.34,
        offsetX: -exposure * 3,
        blur: 2,
        shadowColor: '#45E8FF'
      });
      drawBaseVariant(ctx, model, drawBase, {
        alpha: exposure * 0.26,
        offsetX: exposure * 3,
        blur: 2,
        shadowColor: '#FF4FA3'
      });
      drawBaseVariant(ctx, model, drawBase, {
        alpha: 0.78 + exposure * 0.2,
        blur: 7 + exposure * 8,
        shadowColor: '#FFFFFF'
      });
      drawBase(ctx, model);
      if (exposure > 0.02) {
        const flash = createRadialGradient(ctx,
          ['rgba(255,255,255,0.92)', rgba(model.todayColor, 0.34), 'rgba(255,255,255,0)'],
          metrics.x, metrics.y, 0, metrics.x, metrics.y, metrics.width * 0.72, '#FFFFFF');
        withTextMask(ctx, model, target => {
          target.fillStyle = flash;
          target.globalAlpha = exposure;
          target.fillRect?.(0, 0, model.width, model.height);
        });
      }
      return true;
    }
    case 'kinetic-echo':
      drawKineticEcho(ctx, model, drawBase);
      return true;
    case 'magnetic-type':
      drawMagneticType(ctx, model);
      return true;
    case 'neon-particle':
      drawNeonParticleName(ctx, model, drawBase);
      return true;
    case 'raster-signal':
      drawRasterSignal(ctx, model, drawBase);
      return true;
    default:
      drawBase(ctx, model);
      return false;
  }
}
