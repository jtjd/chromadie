import {
  createLinearGradient,
  createRadialGradient,
  drawDeterministicParticles,
  drawText,
  drawTextBand,
  drawTextSlices,
  easeInOut,
  easeOut,
  lerp,
  mixColors,
  rgba,
  seededNoise,
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

function drawFuzzyMotion(ctx, model, drawBase) {
  const { progress, metrics } = model;
  const phase = progress * Math.PI * 2;
  drawBase(ctx, model);
  drawSliceMotion(ctx, model, (target, nextModel) => drawText(target, nextModel, '#45E8FF'), 9,
    index => (seededNoise(model.seed, index + Math.floor(progress * 24) * 7) - 0.5) * 11, 0.45);
  drawSliceMotion(ctx, model, (target, nextModel) => drawText(target, nextModel, '#FF4FA3'), 9,
    index => (seededNoise(model.seed, index + 61 + Math.floor(progress * 19) * 5) - 0.5) * 8, 0.3);
  drawTextBand(ctx, model,
    lerp(metrics.x - metrics.width * 0.72, metrics.x + metrics.width * 0.72, easeInOut(progress)),
    metrics.width * 0.08, '#FFFFFF', { blur: 4, alpha: 0.58, slant: 0.1, offsetY: Math.sin(phase) * 0.4 });
  if (ctx.fillRect) {
    ctx.save?.();
    ctx.fillStyle = '#090B0F';
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, (Math.floor(progress * 16) % 6) / 6 * model.height, model.width, 1);
    ctx.restore?.();
  }
}

export function drawComposableMotion(ctx, model, drawBase) {
  const { progress, metrics } = model;
  const phase = progress * Math.PI * 2;

  switch (model.motion.key) {
    case 'haunt-glow': {
      const pulse = 0.65 + Math.sin(phase * 1.5 - 0.8) * 0.18;
      drawBaseVariant(ctx, model, drawBase, {
        alpha: 0.78,
        blur: 15 * pulse,
        shadowColor: model.todayColor
      });
      drawBaseVariant(ctx, model, drawBase, {
        alpha: 0.92,
        blur: 4,
        shadowColor: '#FFFFFF'
      });
      drawTextBand(ctx, model,
        lerp(metrics.x - metrics.width, metrics.x + metrics.width, easeInOut(progress)),
        metrics.width * 0.1, '#FFFFFF', { blur: 5, alpha: 0.62, slant: 0.12 });
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
    case 'haunt-particles':
      drawBaseVariant(ctx, model, drawBase, { alpha: 0.82, blur: 3, shadowColor: model.todayColor });
      drawBase(ctx, model);
      drawDeterministicParticles(ctx, model, 32, { colorA: model.todayColor, colorB: '#FFFFFF', spread: 1.6 });
      drawDeterministicParticles(ctx, model, 14, { colorA: '#FF4FA3', colorB: '#45E8FF', spread: 0.86 });
      return true;
    case 'haunt-rainbow':
      drawBase(ctx, model);
      drawColorFill(ctx, model,
        ['#FF2458', '#FF9D00', '#FFE600', '#39FF88', '#00D9FF', '#7357FF', '#FF2458'],
        phase * 0.14 - progress * Math.PI * 1.6, 0.98);
      drawTextBand(ctx, model,
        lerp(metrics.x - metrics.width * 1.1, metrics.x + metrics.width * 1.1, progress),
        metrics.width * 0.06, '#FFFFFF', { blur: 3, alpha: 0.5, slant: 0.08 });
      return true;
    case 'haunt-gradient':
      drawBase(ctx, model);
      drawColorFill(ctx, model, ['#FF2E78', '#8C4DFF', '#2DD4FF'], -0.2 + Math.sin(phase) * 0.2, 0.96);
      drawTextBand(ctx, model,
        lerp(metrics.x - metrics.width, metrics.x + metrics.width, easeInOut(progress)),
        metrics.width * 0.045, '#FFFFFF', { blur: 2, alpha: 0.72, slant: 0.12 });
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
      drawTextBand(ctx, model, left + metrics.width * reveal - metrics.width * 0.025,
        metrics.width * 0.07, '#FFFFFF', { blur: 5, alpha: 0.9, slant: 0.1 });
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
      drawTextBand(ctx, model,
        lerp(metrics.x - metrics.width, metrics.x + metrics.width, settle),
        metrics.width * 0.05, '#FFFFFF', { blur: 4, alpha: 0.7, slant: 0.08 });
      return true;
    }
    case 'haunt-flash': {
      const exposure = Math.exp(-((progress - 0.42) ** 2) / 0.018);
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
      drawTextBand(ctx, model,
        lerp(metrics.x - metrics.width * 1.2, metrics.x + metrics.width * 1.2, easeInOut(progress)),
        metrics.width * 0.08, '#FFFFFF', { blur: 4, alpha: 0.72, slant: 0.1 });
      return true;
    }
    default:
      drawBase(ctx, model);
      return false;
  }
}
