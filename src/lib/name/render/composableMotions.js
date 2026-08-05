import {
  createLinearGradient,
  createRadialGradient,
  drawDeterministicParticles,
  drawText,
  drawTextBand,
  drawTextSlices,
  dailyPalette,
  easeInOut,
  easeOut,
  lerp,
  mixColors,
  rgba,
  seededNoise,
  smoothstep,
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

function drawBaseVariant(ctx, model, drawBase, { alpha = 1, offsetX = 0, offsetY = 0, blur = 0 } = {}) {
  ctx.save?.();
  ctx.globalAlpha = alpha;
  if (blur > 0) {
    ctx.shadowColor = rgba(model.todayColor, 0.34);
    ctx.shadowBlur = blur;
  }
  if (offsetX || offsetY) {
    ctx.translate?.(offsetX, offsetY);
  }
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

function drawStrokedPath(ctx, points, color, { alpha = 1, width = 1, blur = 0 } = {}) {
  if (!ctx?.beginPath || !ctx?.moveTo || !ctx?.lineTo || !ctx?.stroke) return;
  ctx.save?.();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore?.();
}

function drawVoltagePath(ctx, model, offset = 0) {
  const points = [];
  const segments = 11;
  const left = model.metrics.x - model.metrics.width * 0.62;
  const width = model.metrics.width * 1.24;
  const center = model.metrics.y - model.metrics.fontSize * 0.4 + offset;
  for (let index = 0; index <= segments; index += 1) {
    const x = left + (index / segments) * width;
    const noise = seededNoise(model.seed, index + Math.floor(model.progress * 24) * 19);
    points.push([x, center + (noise - 0.5) * model.metrics.fontSize * 0.8]);
  }
  return points;
}

export function drawComposableMotion(ctx, model, drawBase) {
  const { progress, metrics } = model;
  const phase = progress * Math.PI * 2;

  switch (model.motion.key) {
    case 'fuzzy-signal':
      drawBase(ctx, model);
      drawSliceMotion(ctx, model, (target, nextModel) => drawText(target, nextModel, '#45E8FF'), 8, index => (seededNoise(model.seed, index + Math.floor(progress * 30) * 7) - 0.5) * 16, 0.42);
      drawSliceMotion(ctx, model, (target, nextModel) => drawText(target, nextModel, '#FF4FA3'), 8, index => (seededNoise(model.seed, index + 61 + Math.floor(progress * 21) * 5) - 0.5) * 11, 0.32);
      if (ctx.fillRect) {
        ctx.fillStyle = '#090B0F';
        ctx.globalAlpha = 0.48;
        ctx.fillRect(0, (Math.floor(progress * 18) % 7) / 7 * model.height, model.width, 1.5);
      }
      return true;
    case 'particle-drift': {
      drawBase(ctx, model);
      drawDeterministicParticles(ctx, model, 30, { colorA: model.todayColor, colorB: '#F7FBFF', spread: 1.55 });
      drawDeterministicParticles(ctx, model, 18, { colorA: '#FF5BBE', colorB: '#45E8FF', spread: 0.72 });
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
      const nextModel = cloneTextModel(model, shown, { ...metrics, width: metrics.width * (count / Math.max(1, model.displayText.length)) });
      drawBase(ctx, nextModel);
      if (ctx.fillRect && progress < hold && Math.floor(progress * 18) % 2 === 0) {
        ctx.fillStyle = '#CDD2FF';
        ctx.fillRect(metrics.x + metrics.width / 2 + 2, metrics.y - metrics.fontSize * 0.45, 2, metrics.fontSize * 0.9);
      }
      return true;
    }
    case 'chromatic-ripple':
      drawSliceMotion(ctx, model, (target, nextModel) => drawText(target, nextModel, '#FF4FA3'), 12, index => Math.sin(phase + index * 0.7 + 1.2) * 8 - 3, 0.32);
      drawSliceMotion(ctx, model, (target, nextModel) => drawText(target, nextModel, '#45E8FF'), 12, index => Math.sin(phase + index * 0.7) * 5 + 3, 0.62);
      drawBase(ctx, model);
      return true;
    case 'filament-trace': {
      const sweep = easeInOut(progress);
      const left = lerp(metrics.x - metrics.width * 0.9, metrics.x + metrics.width * 0.9, sweep);
      drawBaseVariant(ctx, model, drawBase, { alpha: 0.62, offsetX: Math.sin(phase) * 1.2 });
      drawBase(ctx, model);
      drawTextBand(ctx, model, left, metrics.width * 0.18, '#45E8FF', { blur: 8, alpha: 0.92, slant: 0.38 });
      drawTextBand(ctx, model, left + metrics.width * 0.035, metrics.width * 0.055, '#FFFFFF', { blur: 2, alpha: 1, slant: 0.38 });
      const traceY = metrics.y - metrics.fontSize * 0.58;
      drawStrokedPath(ctx, [
        [metrics.x - metrics.width * 0.64, traceY + Math.sin(phase) * 2],
        [metrics.x - metrics.width * 0.2, traceY - metrics.fontSize * 0.12],
        [metrics.x + metrics.width * 0.18, traceY + metrics.fontSize * 0.1],
        [metrics.x + metrics.width * 0.64, traceY - Math.sin(phase) * 2]
      ], '#FF4FA3', { alpha: 0.62, width: 1.1, blur: 5 });
      return true;
    }
    case 'prism-fracture': {
      drawBase(ctx, model);
      const fracture = progress < 0.52 ? smoothstep(progress / 0.52) : smoothstep((1 - progress) / 0.48);
      const palette = ['#45E8FF', '#FF4FA3', '#FFD166', '#9B7CFF'];
      drawTextSlices(ctx, model, index => {
        const angle = (seededNoise(model.seed, index + 20) - 0.5) * fracture * 0.12;
        const offsetX = (seededNoise(model.seed, index + 30) - 0.5) * fracture * 24;
        const offsetY = (seededNoise(model.seed, index + 40) - 0.5) * fracture * 12;
        ctx.save?.();
        ctx.translate?.(metrics.x + offsetX, metrics.y + offsetY);
        ctx.rotate?.(angle);
        ctx.translate?.(-metrics.x, -metrics.y);
        drawText(ctx, model, palette[index % palette.length], 0.3 + fracture * 0.4);
        ctx.restore?.();
      }, 12);
      const spectral = createLinearGradient(ctx, palette, metrics.x - metrics.width, 0, metrics.x + metrics.width, 0, model.todayColor);
      withTextMask(ctx, model, target => {
        target.fillStyle = spectral;
        target.globalAlpha = 0.22 + fracture * 0.18;
        target.fillRect?.(0, 0, model.width, model.height);
      });
      return true;
    }
    case 'molten-rise': {
      const rise = easeOut(Math.min(1, progress / 0.66));
      const top = model.height * (1 - rise);
      drawBaseVariant(ctx, model, drawBase, { alpha: 0.28, blur: 2 });
      const liquid = createLinearGradient(ctx, ['#FFF5D6', '#FFB347', model.todayColor, '#E83F83', '#43134D'], 0, top, 0, model.height, model.todayColor);
      withTextMask(ctx, model, target => {
        target.fillStyle = liquid;
        target.globalAlpha = 0.98;
        target.fillRect?.(0, top, model.width, model.height - top);
      });
      const edge = createLinearGradient(ctx, ['rgba(255,255,255,0)', '#FFF5D6', '#FF6B9E', 'rgba(255,107,158,0)'], metrics.x - metrics.width * 0.5, 0, metrics.x + metrics.width * 0.5, 0, '#FFF5D6');
      ctx.fillStyle = edge;
      ctx.globalAlpha = 0.95;
      ctx.shadowColor = '#FF6B9E';
      ctx.shadowBlur = 8;
      ctx.fillRect?.(metrics.x - metrics.width / 2, top, metrics.width, 2.5);
      drawDeterministicParticles(ctx, model, 16, { colorA: '#FFD166', colorB: '#FF4FA3', spread: 0.9 });
      return true;
    }
    case 'voltage-arc': {
      drawText(ctx, model, '#45E8FF', 0.4, Math.sin(phase) * 3, -1);
      drawText(ctx, model, '#FF4FA3', 0.3, -Math.sin(phase) * 3, 1);
      drawBase(ctx, model);
      drawStrokedPath(ctx, drawVoltagePath(ctx, model, -metrics.fontSize * 0.38), '#45E8FF', { alpha: 0.88, width: 1.6, blur: 7 });
      drawStrokedPath(ctx, drawVoltagePath(ctx, model, metrics.fontSize * 0.42), '#9B7CFF', { alpha: 0.56, width: 0.9, blur: 4 });
      const sparkX = metrics.x + Math.sin(phase * 1.7) * metrics.width * 0.54;
      const sparkY = metrics.y - metrics.fontSize * 0.4;
      const spark = createRadialGradient(ctx, ['#FFFFFF', '#45E8FF', 'rgba(69,232,255,0)'], sparkX, sparkY, 0, sparkX, sparkY, 10, '#45E8FF');
      ctx.fillStyle = spark;
      ctx.beginPath?.();
      ctx.arc?.(sparkX, sparkY, 9, 0, Math.PI * 2);
      ctx.fill?.();
      return true;
    }
    case 'archive-bloom': {
      const palette = dailyPalette(model, ['#45E8FF', '#FF4FA3', '#FFD166']);
      drawBase(ctx, model);
      withTextMask(ctx, model, target => {
        palette.slice(0, 4).forEach((color, index) => {
          const bloom = (progress + index * 0.22) % 1;
          const centerX = metrics.x + Math.sin(phase + index * 1.7) * metrics.width * 0.38;
          const radius = metrics.fontSize * (0.8 + bloom * 2.8);
          const gradient = createRadialGradient(target, ['#FFFFFF', color, rgba(color, 0)], centerX, metrics.y, 0, centerX, metrics.y, radius, color);
          target.fillStyle = gradient;
          target.globalAlpha = 0.18 + Math.sin(bloom * Math.PI) * 0.3;
          target.fillRect?.(0, 0, model.width, model.height);
        });
      });
      drawTextBand(ctx, model, lerp(metrics.x - metrics.width, metrics.x + metrics.width, easeInOut(progress)), metrics.width * 0.12, '#FFFFFF', { blur: 5, alpha: 0.7, slant: 0.24 });
      return true;
    }
    default:
      drawBase(ctx, model);
      return false;
  }
}
