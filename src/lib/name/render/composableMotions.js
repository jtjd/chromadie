import { drawCollectionMotion } from './collectionMotions.js';
import {
  createLinearGradient,
  createRadialGradient,
  drawText,
  drawTextSlices,
  easeOut,
  fract,
  lerp,
  mixColors,
  rgba,
  seededNoise,
  setTextContext,
  withTextMask
} from './primitives.js';
import { getPaintedTextSurface, getNameGlyphLayout, drawSurfaceGlyph } from './textSurface.js';
import {
  GUNS_FUZZY_BASE_INTENSITY,
  getGunsFuzzyRowOffset
} from '../../competitor-effects/gunsEffectAlgorithms.js';

import { getScrambleCharacter } from './motionTiming.js';
import { drawAuthoredNameMotion } from './authoredMotions.js';
import { getNameFontRevision } from '../nameFonts.js';

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

function drawSpectrumFlow(ctx, model) {
  // The inspected reference uses a 1400%-wide linear gradient and moves its
  // background position from 0% to 100% over four seconds. On canvas that is
  // a fourteen-frame-width gradient translated by thirteen frame widths.
  const backgroundWidth = model.width * 14;
  const reducedOrStatic = model.reducedMotion || model.staticFrame;
  const progress = reducedOrStatic ? 0 : model.progress;
  const left = -model.width * 13 * progress;
  const gradient = createLinearGradient(
    ctx,
    ['violet', 'indigo', 'blue', 'green', 'yellow', 'orange', 'red'],
    left,
    0,
    left + backgroundWidth,
    0,
    '#F7FBFF'
  );
  drawText(ctx, model, gradient);
}

function withMotionPalette(model, colors) {
  const phase = model.progress * colors.length;
  const palette = model.material.colors.map((original, index) => {
    const position = phase + index;
    const color = mixColors(colors[Math.floor(position) % colors.length], colors[(Math.floor(position) + 1) % colors.length], fract(position));
    // Preserve dark recesses and light facets when a motion changes the hue.
    const channels = original.replace('#', '').match(/../g)?.map(channel => Number.parseInt(channel, 16)) || [255];
    return mixColors('#000000', color, Math.max(...channels) / 255);
  });
  return { ...model, baseColor: palette[0], material: { ...model.material, colors: palette } };
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

function drawGunsFuzzyMotion(ctx, model, drawBase) {
  if (model.staticFrame || model.reducedMotion) {
    drawBase(ctx, model);
    return;
  }
  const buffer = getPaintedTextSurface(ctx, model, drawBase);
  if (!buffer?.canvas || typeof ctx?.drawImage !== 'function') {
    drawBase(ctx, model);
    return;
  }
  // Displace the finished material, including glow and texture, at native DPR.
  // Seed each row by time so repeated rendering of a frame is deterministic.
  const tick = Math.floor(model.time / (1000 / 60));
  ctx.save?.();
  for (let row = 0; row < buffer.height; row += 1) {
    const randomValue = seededNoise(model.seed, tick * 257 + row * 31);
    const strength = Math.min(1, model.metrics.fontSize / 44) * (model.font.weight < 500 ? 0.65 : 1);
    const offset = Math.round(getGunsFuzzyRowOffset(randomValue, GUNS_FUZZY_BASE_INTENSITY) * strength * buffer.ratio) / buffer.ratio;
    const rowHeight = Math.min(1, buffer.height - row);
    ctx.drawImage(buffer.canvas, 0, row * buffer.ratio, buffer.canvas.width, rowHeight * buffer.ratio,
      buffer.left + offset, row, buffer.width, rowHeight);
  }
  ctx.restore?.();
}

function drawScrambleMotion(ctx, model, drawBase) {
  const glyphs = getNameGlyphLayout(ctx, model);
  const replacements = glyphs.map((glyph, index) => getScrambleCharacter(
    glyph.character, index, glyphs.length, model.time, model.seed
  ));
  if (replacements.every((character, index) => character === glyphs[index].character)) {
    drawBase(ctx, model);
    return;
  }
  const buffer = getPaintedTextSurface(ctx, model, drawBase);
  if (!buffer) { drawBase(ctx, model); return; }
  const surfaceLeft = buffer.left;
  const surfaceRight = buffer.left + buffer.width;
  // Draw unchanged glyphs before painting replacements: drawBase reuses the
  // same destination-owned material surface, so interleaving would overwrite
  // the full-name buffer before its remaining glyphs had been copied.
  glyphs.forEach((glyph, index) => {
    if (replacements[index] === glyph.character) {
      drawSurfaceGlyph(ctx, buffer, glyph, 0, 0, index === 0, index === glyphs.length - 1);
    }
  });
  glyphs.forEach((glyph, index) => {
    if (replacements[index] === glyph.character) return;
    // Replacements occupy the original advance: proportional fonts never
    // reflow, and spaces/combining marks remain intact. Paint the chosen
    // material on the replacement rather than cutting holes in the name.
    ctx.save?.();
    ctx.beginPath?.();
    const clipLeft = index === 0 ? surfaceLeft : glyph.left;
    const clipRight = index === glyphs.length - 1 ? surfaceRight : glyph.left + glyph.width;
    ctx.rect?.(clipLeft, 0, clipRight - clipLeft, model.height);
    ctx.clip?.();
    setTextContext(ctx, model);
    const measured = ctx.measureText?.(replacements[index])?.width || glyph.width;
    const scale = Math.min(1, glyph.width / Math.max(1, measured));
    ctx.translate?.(glyph.center, 0);
    ctx.scale?.(scale, 1);
    ctx.translate?.(-glyph.center, 0);
    drawBase(ctx, cloneTextModel(model, replacements[index], {
      ...model.metrics, x: glyph.center, width: measured, rawWidth: measured
    }));
    ctx.restore?.();
  });
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
    model.font.family,
    model.font.weight,
    getNameFontRevision(model.font.key),
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




function drawMagneticType(ctx, model, drawBase) {
  if (model.staticFrame || model.reducedMotion || !model.pointer) {
    drawBase(ctx, model);
    return;
  }
  const surface = getPaintedTextSurface(ctx, model, drawBase);
  const glyphs = getNameGlyphLayout(ctx, model);
  if (!surface || !glyphs.length) { drawBase(ctx, model); return; }
  const time = Number.isFinite(model.time) ? model.time : 0;
  glyphs.forEach((glyph, index) => {
    const dx = glyph.center - model.pointer.x;
    const dy = model.metrics.y - model.pointer.y;
    const distance = Math.hypot(dx, dy);
    const influence = distance < 130 ? 1 - distance / 130 : 0;
    const directionX = distance > 0.001 ? dx / distance : 0;
    const directionY = distance > 0.001 ? dy / distance : 0;
    const breathing = 0.86 + Math.sin(time * 0.002 + index * 0.7) * 0.14;
    const offsetX = directionX * influence * 20 * breathing;
    const offsetY = directionY * influence * 13 * breathing;
    drawSurfaceGlyph(ctx, surface, glyph, offsetX, offsetY, index === 0, index === glyphs.length - 1);
  });
}


function drawRasterSignal(ctx, model, drawBase) {
  if (!ctx?.fillText) {
    drawBase(ctx, model);
    return;
  }
  const { metrics } = model;
  const time = Number.isFinite(model.time) ? model.time : 0;
  const rowHeight = Math.max(1.5, metrics.fontSize * 0.025);
  const materialSurface = getPaintedTextSurface(ctx, model, drawBase);
  const textTop = materialSurface ? 0 : metrics.y - metrics.fontSize * 0.47;
  const textBottom = materialSurface ? model.height : metrics.y + metrics.fontSize * 0.47;
  const rows = Math.min(256, Math.max(8, Math.ceil((textBottom - textTop) / rowHeight)));
  const buffers = getRasterSignalBuffers(ctx, model);
  const visualScale = Math.min(1, Math.max(0.42, metrics.fontSize / 111));

  // Displace the finished face, including a plain custom name color. The
  // raster rhythm and neutral noise supply the signal character without
  // replacing the selected material with a white mask.
  ctx.save?.();
  ctx.globalCompositeOperation = materialSurface ? 'source-over' : 'lighter';
  ctx.globalAlpha = 0.12;
  ctx.filter = `blur(${Math.max(1.25, 3 * visualScale)}px)`;
  if (materialSurface) ctx.drawImage(materialSurface.canvas, materialSurface.left, 0, materialSurface.width, materialSurface.height);
  else if (buffers?.sourceCanvas) ctx.drawImage?.(buffers.sourceCanvas, 0, 0, model.width, model.height);
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
    if (materialSurface) {
      ctx.drawImage(materialSurface.canvas, 0, top * materialSurface.ratio, materialSurface.canvas.width, height * materialSurface.ratio,
        materialSurface.left + offset, top, materialSurface.width, height);
    } else if (buffers?.sourceCanvas && ctx.drawImage) {
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

  if ((model.staticFrame || model.reducedMotion) && !['haunt-rainbow', 'haunt-gradient', 'spectrum-flow'].includes(model.motion.key)) {
    drawBase(ctx, model);
    return true;
  }

  if (drawCollectionMotion(ctx, model, drawBase)) return true;

  if (drawAuthoredNameMotion(ctx, model, drawBase)) return true;

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
      drawScrambleMotion(ctx, model, drawBase);
      return true;
    }
    case 'typewriter-name': {
      const glyphs = getNameGlyphLayout(ctx, model);
      const reveal = 0.42;
      const hold = 0.82;
      const count = progress < reveal
        ? Math.floor((progress / reveal) * glyphs.length)
        : progress < hold
          ? glyphs.length
          : Math.max(0, glyphs.length - Math.floor(((progress - hold) / (1 - hold)) * glyphs.length));
      const shown = glyphs.slice(0, count).map(glyph => glyph.character).join('');
      const visibleWidth = glyphs[count - 1]?.advance || 0;
      const nextModel = cloneTextModel(model, shown, {
        ...metrics,
        x: (glyphs[0]?.left ?? metrics.x) + visibleWidth / 2,
        width: visibleWidth,
        rawWidth: visibleWidth
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
      if (model.material.key !== 'plain') {
        drawBase(ctx, withMotionPalette(model, ['#FF0055', '#FFCC00', '#00FF88', '#00BBFF', '#9900FF']));
        return true;
      }
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
      if (model.material.key !== 'plain') {
        drawBase(ctx, withMotionPalette(model, ['#FF0077', '#8800FF', '#00DDFF']));
        return true;
      }
      drawBase(ctx, model);
      drawColorFill(ctx, model, ['#FF2E78', '#8C4DFF', '#2DD4FF'], -0.42 + Math.sin(phase) * 0.24, 0.94);
      drawLiquidHighlight(ctx, model, progress, phase);
      return true;
    case 'haunt-fuzzy':
      drawGunsFuzzyMotion(ctx, model, drawBase);
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
    case 'magnetic-type':
      drawMagneticType(ctx, model, drawBase);
      return true;
    case 'raster-signal':
      drawRasterSignal(ctx, model, drawBase);
      return true;
    case 'spectrum-flow':
      if (model.material.key !== 'plain') {
        drawBase(ctx, withMotionPalette(model, ['#FF0000', '#FF8800', '#FFFF00', '#00FF00', '#00DDFF', '#5500FF', '#FF00DD']));
        return true;
      }
      drawSpectrumFlow(ctx, model);
      return true;
    default:
      drawBase(ctx, model);
      return false;
  }
}
