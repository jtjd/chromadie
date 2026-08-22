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

const REFERENCE_EFFECT_STATES = new WeakMap();

const REFERENCE_RASTER_DISTORTION = 1;
const REFERENCE_RASTER_TEXTURE = 1;

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

function referenceRandom(seed, index, min, max) {
  return min + seededNoise(seed, index) * (max - min);
}

function setReferenceTextContext(target, model, fontSize, weight) {
  if (!target) return;
  const family = model?.font?.family || 'Arial';
  const fallback = model?.font?.fallback || 'Arial, sans-serif';
  const style = model?.font?.style || 'normal';
  target.font = `${style} ${weight} ${fontSize}px "${family}", ${fallback}`;
  target.textAlign = 'center';
  target.textBaseline = 'middle';
}

function getReferenceStateKey(kind, model) {
  return [
    kind,
    model.displayText,
    Math.round(model.width),
    Math.round(model.height),
    model.font?.key || '',
    model.font?.family || '',
    model.metrics.fontSize,
    model.seed
  ].join('|');
}

function getReferenceFrameStep(state, time, active) {
  if (!active) return 0;
  if (!Number.isFinite(state.lastTime)) {
    state.lastTime = time;
    return 1;
  }
  const delta = Math.max(0, Math.min(50, time - state.lastTime));
  state.lastTime = time;
  return Math.max(0, Math.min(3, delta / 16.67));
}

function buildReferenceMaskState(ctx, model) {
  const width = Math.max(2, Math.round(model.width));
  const height = Math.max(2, Math.round(model.height));
  const maskCanvas = createReferenceCanvas(ctx, width, height);
  const maskContext = maskCanvas?.getContext?.('2d');
  const fieldCanvas = createReferenceCanvas(ctx, width, height);
  const fieldContext = fieldCanvas?.getContext?.('2d');
  if (!maskCanvas || !maskContext?.getImageData || !maskContext?.fillText
    || !fieldCanvas || !fieldContext?.createRadialGradient) return null;

  const fontSize = Math.max(1, model.metrics.fontSize);
  const x = width / 2;
  const y = height / 2;
  maskCanvas.width = width;
  maskCanvas.height = height;
  maskContext.clearRect(0, 0, width, height);
  setReferenceTextContext(maskContext, model, fontSize, 900);
  const metrics = maskContext.measureText?.(model.displayText) || { width: model.metrics.width };
  maskContext.fillStyle = '#fff';
  maskContext.fillText(model.displayText, x, y);
  maskContext.lineWidth = Math.max(2, fontSize * 0.018);
  maskContext.strokeStyle = '#fff';
  maskContext.strokeText?.(model.displayText, x, y);

  const bounds = {
    x: x - metrics.width / 2 - fontSize * 0.08,
    y: y - fontSize * 0.43,
    w: metrics.width + fontSize * 0.16,
    h: fontSize * 0.86,
    fontSize
  };

  let pixels;
  try {
    pixels = maskContext.getImageData(0, 0, width, height).data;
  } catch {
    return null;
  }
  const alphaAt = (pixelX, pixelY) => {
    if (pixelX < 0 || pixelY < 0 || pixelX >= width || pixelY >= height) return 0;
    return pixels[(pixelY * width + pixelX) * 4 + 3] || 0;
  };
  const solidPoints = [];
  const edgePoints = [];
  for (let pixelY = Math.max(0, Math.floor(bounds.y)); pixelY < Math.min(height, Math.ceil(bounds.y + bounds.h)); pixelY += 2) {
    for (let pixelX = Math.max(0, Math.floor(bounds.x)); pixelX < Math.min(width, Math.ceil(bounds.x + bounds.w)); pixelX += 2) {
      const alpha = alphaAt(pixelX, pixelY);
      if (alpha <= 20) continue;
      solidPoints.push({ x: pixelX, y: pixelY });
      const neighbors = alphaAt(pixelX - 2, pixelY) < 20
        || alphaAt(pixelX + 2, pixelY) < 20
        || alphaAt(pixelX, pixelY - 2) < 20
        || alphaAt(pixelX, pixelY + 2) < 20;
      if (neighbors) edgePoints.push({ x: pixelX, y: pixelY });
    }
  }
  if (!solidPoints.length) return null;

  const textParticles = [];
  const edgeParticles = [];
  const solidSampleCount = Math.min(680, solidPoints.length);
  const edgeSampleCount = Math.min(240, edgePoints.length);
  for (let index = 0; index < solidSampleCount; index += 1) {
    const point = solidPoints[Math.floor(seededNoise(model.seed, 1000 + index * 7) * solidPoints.length) % solidPoints.length];
    textParticles.push({
      x: point.x + referenceRandom(model.seed, 1100 + index * 7, -1.5, 1.5),
      y: point.y + referenceRandom(model.seed, 1101 + index * 7, -1.5, 1.5),
      homeX: point.x,
      homeY: point.y,
      vx: referenceRandom(model.seed, 1102 + index * 7, -0.25, 0.25),
      vy: referenceRandom(model.seed, 1103 + index * 7, -0.25, 0.25),
      size: referenceRandom(model.seed, 1104 + index * 7, 0.9, 2.4),
      tw: referenceRandom(model.seed, 1105 + index * 7, 0, Math.PI * 2),
      hot: seededNoise(model.seed, 1106 + index * 7) < 0.18
    });
  }
  for (let index = 0; index < edgeSampleCount; index += 1) {
    const point = edgePoints[Math.floor(seededNoise(model.seed, 1300 + index * 7) * edgePoints.length) % edgePoints.length];
    edgeParticles.push({
      x: point.x,
      y: point.y,
      vx: referenceRandom(model.seed, 1301 + index * 7, -0.9, 0.9),
      vy: referenceRandom(model.seed, 1302 + index * 7, -0.9, 0.9),
      life: referenceRandom(model.seed, 1303 + index * 7, 0.1, 1),
      maxLife: referenceRandom(model.seed, 1304 + index * 7, 0.5, 1.4),
      size: referenceRandom(model.seed, 1305 + index * 7, 1, 2.6),
      respawns: 0
    });
  }

  return {
    kind: 'neon',
    key: getReferenceStateKey('neon', model),
    width,
    height,
    maskCanvas,
    maskContext,
    fieldCanvas,
    fieldContext,
    bounds,
    solidPoints,
    edgePoints,
    textParticles,
    edgeParticles,
    glints: [],
    pointer: { x: width / 2, y: height / 2 },
    lastTime: null,
    frame: 0
  };
}

function buildReferenceRasterState(ctx, model) {
  const width = Math.max(2, Math.round(model.width));
  const height = Math.max(2, Math.round(model.height));
  const sourceCanvas = createReferenceCanvas(ctx, width, height);
  const sourceContext = sourceCanvas?.getContext?.('2d');
  const noiseCanvas = createReferenceCanvas(ctx, 128, 128);
  const noiseContext = noiseCanvas?.getContext?.('2d');
  if (!sourceCanvas || !sourceContext?.fillText || !sourceContext?.measureText) return null;

  const fontSize = Math.max(1, model.metrics.fontSize);
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  sourceContext.clearRect(0, 0, width, height);
  setReferenceTextContext(sourceContext, model, fontSize, 800);
  sourceContext.fillStyle = '#fff';
  sourceContext.shadowColor = 'rgba(255,255,255,.42)';
  sourceContext.shadowBlur = 2;
  sourceContext.fillText(model.displayText, width / 2, height / 2);
  const metrics = sourceContext.measureText(model.displayText);
  const bounds = {
    x: width / 2 - metrics.width / 2 - fontSize * 0.03,
    y: height / 2 - fontSize * 0.47,
    w: metrics.width + fontSize * 0.06,
    h: fontSize * 0.94
  };

  if (noiseCanvas && noiseContext?.createImageData && noiseContext.putImageData) {
    noiseCanvas.width = 128;
    noiseCanvas.height = 128;
    const image = noiseContext.createImageData(128, 128);
    for (let index = 0; index < image.data.length; index += 4) {
      const pixel = index / 4;
      const value = Math.floor(seededNoise(`${model.seed}:raster-noise`, pixel) * 255) | 0;
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = seededNoise(`${model.seed}:raster-alpha`, pixel) < 0.62 ? 255 : 0;
    }
    noiseContext.putImageData(image, 0, 0);
  }

  return {
    kind: 'raster',
    key: getReferenceStateKey('raster', model),
    width,
    height,
    sourceCanvas,
    sourceContext,
    noiseCanvas,
    noiseContext,
    bounds,
    fontSize,
    lastTime: null,
    frame: 0
  };
}

function getReferenceState(ctx, model, kind) {
  if (!ctx || (typeof ctx !== 'object' && typeof ctx !== 'function')) return null;
  const key = getReferenceStateKey(kind, model);
  const cached = REFERENCE_EFFECT_STATES.get(ctx);
  if (cached?.key === key) return cached;
  const state = kind === 'neon'
    ? buildReferenceMaskState(ctx, model)
    : buildReferenceRasterState(ctx, model);
  if (state) REFERENCE_EFFECT_STATES.set(ctx, state);
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
  // This is only for non-Canvas test/fallback environments. Supported browser
  // canvases always use the source-faithful offscreen implementation above.
  drawBase(ctx, model);
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
  const state = getReferenceState(ctx, model, 'neon');
  if (!state?.fieldCanvas || !state.fieldContext || !state.maskCanvas) {
    drawNeonParticleFallback(ctx, model, drawBase);
    return;
  }

  const time = Number.isFinite(model.time) ? model.time : 0;
  const active = !model.staticFrame && !model.reducedMotion;
  const step = getReferenceFrameStep(state, time, active);
  if (step > 0) state.frame += 1;
  const { width, height, bounds } = state;
  const fieldCanvas = state.fieldCanvas;
  const fieldContext = state.fieldContext;
  ctx.save?.();
  ctx.globalCompositeOperation = 'source-over';
  for (let index = 0; index < 22; index += 1) {
    drawReferenceCircle(
      ctx,
      seededNoise(model.seed, 9000 + index * 3) * width,
      seededNoise(model.seed, 9001 + index * 3) * height,
      referenceRandom(model.seed, 9002 + index * 3, 0.4, 1.4),
      '#ffffff',
      referenceRandom(model.seed, 9003 + index * 3, 0.02, 0.14)
    );
  }
  ctx.restore?.();
  fieldCanvas.width = width;
  fieldCanvas.height = height;
  fieldContext.clearRect(0, 0, width, height);

  const atmosphereA = fieldContext.createRadialGradient(
    bounds.x + bounds.w * 0.25,
    bounds.y + bounds.h * 0.35,
    0,
    bounds.x + bounds.w * 0.25,
    bounds.y + bounds.h * 0.35,
    bounds.h * 0.8
  );
  atmosphereA.addColorStop(0, 'rgba(0,220,255,.26)');
  atmosphereA.addColorStop(0.5, 'rgba(55,110,255,.12)');
  atmosphereA.addColorStop(1, 'rgba(0,0,0,0)');
  fieldContext.fillStyle = atmosphereA;
  fieldContext.fillRect(bounds.x - 40, bounds.y - 40, bounds.w + 80, bounds.h + 80);

  const atmosphereB = fieldContext.createRadialGradient(
    bounds.x + bounds.w * 0.74,
    bounds.y + bounds.h * 0.48,
    0,
    bounds.x + bounds.w * 0.74,
    bounds.y + bounds.h * 0.48,
    bounds.h * 0.9
  );
  atmosphereB.addColorStop(0, 'rgba(255,45,215,.26)');
  atmosphereB.addColorStop(0.5, 'rgba(148,40,255,.12)');
  atmosphereB.addColorStop(1, 'rgba(0,0,0,0)');
  fieldContext.fillStyle = atmosphereB;
  fieldContext.fillRect(bounds.x - 40, bounds.y - 40, bounds.w + 80, bounds.h + 80);

  fieldContext.save();
  fieldContext.globalCompositeOperation = 'lighter';
  for (let index = 0; index < 13; index += 1) {
    const progress = fract(time * 0.00006 + index * 0.12);
    const bandX = bounds.x + bounds.w * progress;
    const gradient = fieldContext.createLinearGradient(bandX - 70, 0, bandX + 70, 0);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.2, 'rgba(40,225,255,.14)');
    gradient.addColorStop(0.5, index % 2 ? 'rgba(255,60,230,.18)' : 'rgba(80,100,255,.16)');
    gradient.addColorStop(0.8, 'rgba(255,255,255,.11)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    fieldContext.fillStyle = gradient;
    const waveY = Math.sin(time * 0.0012 + index) * 8;
    fieldContext.fillRect(bandX - 80, bounds.y - 12 + waveY, 160, bounds.h + 24);
  }
  fieldContext.restore();

  fieldContext.globalCompositeOperation = 'destination-in';
  fieldContext.drawImage(state.maskCanvas, 0, 0);
  fieldContext.globalCompositeOperation = 'source-over';

  ctx.save?.();
  ctx.shadowColor = 'rgba(95,130,255,.34)';
  ctx.shadowBlur = 24;
  ctx.drawImage?.(fieldCanvas, 0, 0, width, height);
  ctx.restore?.();

  ctx.save?.();
  ctx.globalAlpha = 0.16;
  ctx.drawImage?.(state.maskCanvas, 0, 0, width, height);
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = 'blur(7px)';
  ctx.globalAlpha = 0.55;
  ctx.drawImage?.(state.maskCanvas, 0, 0, width, height);
  ctx.restore?.();

  const targetX = Number.isFinite(model.pointer?.x) ? model.pointer.x : width / 2;
  const targetY = Number.isFinite(model.pointer?.y) ? model.pointer.y : height / 2;
  state.pointer.x = lerp(state.pointer.x, targetX, 0.08);
  state.pointer.y = lerp(state.pointer.y, targetY, 0.08);
  const pointerActive = active && Boolean(model.pointer);
  const px = state.pointer.x;
  const py = state.pointer.y;

  ctx.save?.();
  ctx.globalCompositeOperation = 'lighter';
  state.textParticles.forEach((particle, index) => {
    if (step > 0) {
      particle.tw += 0.025 * step;
      const dx = px - particle.x;
      const dy = py - particle.y;
      const distance = Math.hypot(dx, dy) || 1;
      const force = pointerActive && distance < 90 ? (1 - distance / 90) * 0.12 : 0;
      particle.vx += (particle.homeX - particle.x) * 0.006 * step
        + Math.cos(particle.tw + index) * 0.010 * step
        - dx / distance * force;
      particle.vy += (particle.homeY - particle.y) * 0.006 * step
        + Math.sin(particle.tw * 1.2 + index) * 0.010 * step
        - dy / distance * force;
      particle.vx *= 0.92 ** step;
      particle.vy *= 0.92 ** step;
      particle.x += particle.vx * step;
      particle.y += particle.vy * step;
    }
    const pulse = (Math.sin(particle.tw * 1.4 + index) + 1) / 2;
    const color = particle.hot
      ? '#ffffff'
      : (index % 3 === 0 ? '#00EFFF' : (index % 3 === 1 ? '#6E5CFF' : '#FF4AD4'));
    drawReferenceCircle(ctx, particle.x, particle.y, particle.size * 3.6, color, 0.04 * (0.5 + pulse * 0.5));
    drawReferenceCircle(ctx, particle.x, particle.y, particle.size, color, (particle.hot ? 0.88 : 0.52) * (0.5 + pulse * 0.5));
    if (particle.hot) drawReferenceCircle(ctx, particle.x, particle.y, particle.size * 0.35, '#ffffff', 0.98 * (0.6 + pulse * 0.4));
  });

  state.edgeParticles.forEach((particle, index) => {
    if (step > 0) {
      particle.life -= 0.010 * step;
      if (particle.life <= 0 && state.edgePoints.length) {
        particle.respawns += 1;
        const point = state.edgePoints[Math.floor(seededNoise(model.seed, 1500 + index * 11 + particle.respawns * 17) * state.edgePoints.length) % state.edgePoints.length];
        particle.x = point.x;
        particle.y = point.y;
        particle.vx = referenceRandom(model.seed, 1501 + index * 11 + particle.respawns * 17, -0.8, 0.8);
        particle.vy = referenceRandom(model.seed, 1502 + index * 11 + particle.respawns * 17, -0.8, 0.8);
        particle.life = 1;
        particle.maxLife = referenceRandom(model.seed, 1503 + index * 11 + particle.respawns * 17, 0.45, 1.3);
        particle.size = referenceRandom(model.seed, 1504 + index * 11 + particle.respawns * 17, 0.9, 2.4);
      }
      particle.x += particle.vx * step;
      particle.y += particle.vy * step;
      particle.vx *= 0.985 ** step;
      particle.vy *= 0.985 ** step;
    }
    const alpha = particle.life * 0.55;
    drawReferenceCircle(ctx, particle.x, particle.y, particle.size * 2.5, '#00EFFF', alpha * 0.08);
    drawReferenceCircle(ctx, particle.x, particle.y, particle.size, '#FF4FD7', alpha * 0.22);
    drawReferenceCircle(ctx, particle.x, particle.y, particle.size * 0.55, '#ffffff', alpha * 0.6);
  });

  if (step > 0 && state.edgePoints.length && seededNoise(model.seed, 8000 + state.frame) < 0.10) {
    const point = state.edgePoints[Math.floor(seededNoise(model.seed, 8001 + state.frame) * state.edgePoints.length) % state.edgePoints.length];
    state.glints.push({
      x: point.x,
      y: point.y,
      life: 1,
      maxLife: referenceRandom(model.seed, 8002 + state.frame, 0.18, 0.45),
      size: referenceRandom(model.seed, 8003 + state.frame, 4, 9)
    });
  }
  for (let index = state.glints.length - 1; index >= 0; index -= 1) {
    const glint = state.glints[index];
    if (step > 0) glint.life -= 0.045 * step;
    if (glint.life <= 0) {
      state.glints.splice(index, 1);
      continue;
    }
    const alpha = glint.life;
    drawReferenceCircle(ctx, glint.x, glint.y, glint.size * 1.8, '#ffffff', 0.08 * alpha);
    ctx.strokeStyle = `rgba(255,255,255,${0.75 * alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(glint.x - glint.size, glint.y);
    ctx.lineTo?.(glint.x + glint.size, glint.y);
    ctx.moveTo?.(glint.x, glint.y - glint.size);
    ctx.lineTo?.(glint.x, glint.y + glint.size);
    ctx.stroke?.();
    ctx.strokeStyle = `rgba(0,238,255,${0.30 * alpha})`;
    ctx.beginPath?.();
    ctx.moveTo?.(glint.x - glint.size * 1.6, glint.y);
    ctx.lineTo?.(glint.x + glint.size * 1.6, glint.y);
    ctx.moveTo?.(glint.x, glint.y - glint.size * 1.6);
    ctx.lineTo?.(glint.x, glint.y + glint.size * 1.6);
    ctx.stroke?.();
  }
  ctx.restore?.();

  ctx.save?.();
  setReferenceTextContext(ctx, model, bounds.fontSize, 900);
  const outline = ctx.createLinearGradient(bounds.x, 0, bounds.x + bounds.w, 0);
  outline.addColorStop(0, 'rgba(0,236,255,.62)');
  outline.addColorStop(0.5, 'rgba(255,255,255,.40)');
  outline.addColorStop(1, 'rgba(255,80,214,.62)');
  ctx.lineWidth = Math.max(1.2, bounds.fontSize * 0.010);
  ctx.strokeStyle = outline;
  ctx.globalAlpha = 0.75;
  ctx.strokeText?.(model.displayText, width / 2, height / 2);
  ctx.restore?.();
}

function drawRasterSignal(ctx, model, drawBase) {
  const state = getReferenceState(ctx, model, 'raster');
  if (!state?.sourceCanvas || !state.sourceContext) {
    drawBase(ctx, model);
    return;
  }
  const time = Number.isFinite(model.time) ? model.time : 0;
  const active = !model.staticFrame && !model.reducedMotion;
  const step = getReferenceFrameStep(state, time, active);
  if (step > 0) state.frame += 1;
  const rowHeight = Math.max(1.5, state.fontSize * 0.025);
  const textTop = state.bounds.y;
  const textBottom = state.bounds.y + state.bounds.h;
  const { width, height } = state;

  ctx.save?.();
  // SignalText paints its noise over the fully opaque reference stage. The
  // production name surface stays transparent so it can sit on any profile,
  // but the same deterministic noise field must still occupy the full effect
  // surface rather than being clipped to the glyph alpha.
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.08 * REFERENCE_RASTER_TEXTURE;
  if (state.noiseCanvas) {
    const ambientOffsetX = (time * 0.025) % 128;
    const ambientOffsetY = (time * 0.011) % 128;
    for (let x = -128 + ambientOffsetX; x < width; x += 128) {
      for (let y = -128 + ambientOffsetY; y < height; y += 128) {
        ctx.drawImage?.(state.noiseCanvas, x, y);
      }
    }
  }
  ctx.restore?.();

  ctx.save?.();
  ctx.shadowColor = 'rgba(255,255,255,.42)';
  ctx.shadowBlur = 2;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.12;
  ctx.drawImage?.(state.sourceCanvas, 0, 0, width, height);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  for (let sourceY = textTop, row = 0; sourceY < textBottom; sourceY += rowHeight, row += 1) {
    const sliceHeight = Math.min(rowHeight, textBottom - sourceY);
    const slow = Math.sin(time * 0.004 + row * 0.64) * 1.7;
    const fine = Math.sin(time * 0.011 + row * 1.83) * 0.55;
    const cluster = Math.sin(row * 0.29 + time * 0.0015) * 1.15;
    const jump = ((row + Math.floor(time / 170)) % 17 === 0 ? Math.sin(time * 0.05 + row) * 2.2 : 0);
    const offset = (slow + fine + cluster + jump) * REFERENCE_RASTER_DISTORTION;
    ctx.globalAlpha = 0.82 + Math.sin(time * 0.0027 + row * 0.43) * 0.1;
    ctx.drawImage?.(state.sourceCanvas, 0, sourceY, width, sliceHeight, offset, sourceY, width, sliceHeight);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  ctx.save?.();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.globalAlpha = 0.16 * REFERENCE_RASTER_TEXTURE;
  ctx.fillStyle = '#000000';
  for (let y = state.bounds.y; y < state.bounds.y + state.bounds.h; y += rowHeight * 2.05) {
    ctx.fillRect?.(state.bounds.x, y, state.bounds.w, Math.max(0.6, rowHeight * 0.32));
  }
  ctx.restore?.();

  ctx.save?.();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = 0.08 * REFERENCE_RASTER_TEXTURE;
  if (state.noiseCanvas) {
    const offsetX = (time * 0.025) % 128;
    const offsetY = (time * 0.011) % 128;
    for (let x = -128 + offsetX; x < width; x += 128) {
      for (let y = -128 + offsetY; y < height; y += 128) {
        ctx.drawImage?.(state.noiseCanvas, x, y);
      }
    }
  }
  ctx.restore?.();

  ctx.save?.();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = '#FFFFFF';
  const brightPixelCount = Math.floor(55 * REFERENCE_RASTER_TEXTURE);
  const pixelFrame = model.staticFrame ? 0 : state.frame;
  for (let index = 0; index < brightPixelCount; index += 1) {
    const randomIndex = pixelFrame * 97 + index * 5;
    const x = state.bounds.x + seededNoise(`${model.seed}:raster-pixels`, randomIndex) * state.bounds.w;
    const y = state.bounds.y + seededNoise(`${model.seed}:raster-pixels`, randomIndex + 1) * state.bounds.h;
    ctx.globalAlpha = seededNoise(`${model.seed}:raster-pixels`, randomIndex + 2) * 0.18 * REFERENCE_RASTER_TEXTURE;
    ctx.fillRect?.(
      x,
      y,
      seededNoise(`${model.seed}:raster-pixels`, randomIndex + 3) * 1.4 + 0.4,
      seededNoise(`${model.seed}:raster-pixels`, randomIndex + 4) * 1.4 + 0.4
    );
  }
  ctx.restore?.();
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
