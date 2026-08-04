import {
  createLinearGradient,
  createRadialGradient,
  drawCharacterLayers,
  drawDeterministicParticles,
  drawPixelFragments,
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

function drawColorMemory(ctx, model) {
  const history = model.recentColors?.length ? model.recentColors : [model.todayColor, mixColors(model.todayColor, '#CDD2FF', 0.5)];
  const palette = [...history, ...history];
  const offset = (model.progress - 0.5) * model.width * 1.8;
  const gradient = createLinearGradient(ctx, palette, -model.width + offset, 0, model.width + offset, 0, model.todayColor);
  withTextMask(ctx, model, target => {
    target.fillStyle = gradient;
    target.fillRect?.(0, 0, model.width, model.height);
  });
}

function drawDailyPulse(ctx, model) {
  const radius = Math.max(1, lerp(0, model.width * 0.78, easeOut(model.progress)));
  const gradient = createRadialGradient(
    ctx,
    ['rgba(255,235,245,.98)', model.todayColor, 'rgba(216,75,142,0)'],
    model.metrics.x,
    model.metrics.y - model.metrics.fontSize * 0.35,
    0,
    model.metrics.x,
    model.metrics.y - model.metrics.fontSize * 0.35,
    radius,
    rgba(model.todayColor, 0.55)
  );
  withTextMask(ctx, model, target => {
    target.fillStyle = gradient;
    target.globalAlpha = 0.8;
    target.fillRect?.(0, 0, model.width, model.height);
  });
}

function drawReveal(ctx, model, drawBase, vertical = false) {
  const reveal = easeOut(model.progress < 0.4 ? model.progress / 0.4 : model.progress > 0.88 ? 1 - ((model.progress - 0.88) / 0.12) : 1);
  ctx.save?.();
  if (ctx.beginPath && ctx.rect && ctx.clip) {
    ctx.beginPath();
    if (vertical) ctx.rect(0, model.height * (1 - reveal), model.width, model.height * reveal);
    else ctx.rect(model.metrics.x - model.metrics.width / 2, 0, model.metrics.width * reveal, model.height);
    ctx.clip();
  }
  drawBase(ctx, model);
  ctx.restore?.();
  return reveal;
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

export function drawComposableMotion(ctx, model, drawBase) {
  const { progress, metrics } = model;
  const phase = progress * Math.PI * 2;

  switch (model.motion.key) {
    case 'velvet-sweep': {
      drawBase(ctx, model);
      const left = lerp(metrics.x - metrics.width * 0.82, metrics.x + metrics.width * 0.82, easeInOut(progress));
      drawTextBand(ctx, model, left, metrics.width * 0.24, 'rgba(255,238,247,.98)', { blur: 5, alpha: 0.95, slant: 0.22 });
      drawTextBand(ctx, model, left + metrics.width * 0.055, metrics.width * 0.07, '#FFFFFF', { blur: 1.5 });
      return true;
    }
    case 'refraction-sweep': {
      drawBase(ctx, model);
      const left = lerp(metrics.x - metrics.width * 0.86, metrics.x + metrics.width * 0.86, easeInOut(progress));
      drawTextBand(ctx, model, left, metrics.width * 0.22, '#4EDEFF', { blur: 3, offsetX: 3, alpha: 0.9 });
      drawTextBand(ctx, model, left - 4, metrics.width * 0.22, '#FF63B5', { blur: 3, offsetX: -3, alpha: 0.82 });
      return true;
    }
    case 'ghost-offset':
      drawText(ctx, model, '#4DDAFF', 0.42, 4 + Math.sin(phase) * 3, -1);
      drawText(ctx, model, '#FF5BAE', 0.4, -4 - Math.sin(phase) * 3, 1.5);
      drawBase(ctx, model);
      return true;
    case 'focus-resolve': {
      const focus = progress < 0.28 ? progress / 0.28 : progress > 0.84 ? (1 - progress) / 0.16 : 1;
      drawBaseVariant(ctx, model, drawBase, {
        alpha: lerp(0.36, 1, focus),
        blur: lerp(5, 0, focus)
      });
      return true;
    }
    case 'mask-reveal':
      drawReveal(ctx, model, drawBase, false);
      return true;
    case 'quiet-afterimage': {
      const distance = 1 + 3 * Math.sin(progress * Math.PI) ** 2;
      drawBaseVariant(ctx, model, drawBase, { alpha: 0.2, offsetX: distance, offsetY: 1.5 });
      drawBase(ctx, model);
      return true;
    }
    case 'soft-rise': {
      const rise = progress < 0.28 ? easeOut(progress / 0.28) : progress > 0.87 ? 1 - ((progress - 0.87) / 0.13) : 1;
      drawBaseVariant(ctx, model, drawBase, {
        alpha: Math.max(0, Math.min(1, rise)),
        offsetY: lerp(9, 0, rise)
      });
      return true;
    }
    case 'scanline-reveal': {
      const reveal = drawReveal(ctx, model, drawBase, true);
      if (progress < 0.48) {
        const y = model.height * (1 - easeOut(progress / 0.48));
        const gradient = createLinearGradient(ctx, ['rgba(205,210,255,0)', '#CDD2FF', 'rgba(205,210,255,0)'], 0, 0, model.width, 0, '#CDD2FF');
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.9;
        ctx.fillRect?.(0, y - 1, model.width, 2);
      }
      return reveal >= 0;
    }
    case 'particle-drift':
      drawBase(ctx, model);
      drawDeterministicParticles(ctx, model, 12, { colorA: model.todayColor, colorB: '#CDD2FF', spread: 0.9 });
      return true;
    case 'letter-shuffle': {
      const text = Array.from(model.displayText || '');
      const locked = Math.floor((Math.min(progress, 0.42) / 0.42) * text.length);
      const tail = text.slice(locked);
      const shift = tail.length > 1 ? Math.floor(progress * 40) % tail.length : 0;
      const shuffled = progress < 0.42
        ? text.slice(0, locked).concat(tail.slice(shift), tail.slice(0, shift)).join('')
        : model.displayText;
      const nextModel = cloneTextModel(model, shuffled, { ...metrics, width: metrics.width });
      drawBase(ctx, nextModel);
      return true;
    }
    case 'fuzzy-signal':
      drawBase(ctx, model);
      drawSliceMotion(ctx, model, drawBase, 8, index => (seededNoise(model.seed, index + Math.floor(progress * 30) * 7) - 0.5) * 12, 0.52);
      if (ctx.fillRect) {
        ctx.fillStyle = '#090B0F';
        ctx.globalAlpha = 0.48;
        ctx.fillRect(0, (Math.floor(progress * 18) % 7) / 7 * model.height, model.width, 1.5);
      }
      return true;
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
      drawSliceMotion(ctx, model, drawBase, 12, index => Math.sin(phase + index * 0.7) * 4, 0.95);
      drawSliceMotion(ctx, model, drawBase, 12, index => Math.sin(phase + index * 0.7 + 1.2) * 7, 0.22);
      return true;
    case 'liquid-fill': {
      drawBaseVariant(ctx, model, drawBase, { alpha: 0.2 });
      const rise = progress < 0.65 ? easeOut(progress / 0.65) : 1;
      const top = model.height * (1 - rise);
      const liquid = createLinearGradient(ctx, ['#FFD9EA', model.todayColor, '#5B1537'], 0, top, 0, model.height, model.todayColor);
      withTextMask(ctx, model, target => {
        target.save?.();
        if (target.beginPath && target.rect && target.clip) {
          target.beginPath();
          target.rect(0, top, model.width, model.height - top);
          target.clip();
        }
        target.fillStyle = liquid;
        target.fillRect?.(0, top, model.width, model.height - top);
        target.restore?.();
      });
      ctx.fillStyle = 'rgba(255,221,236,.75)';
      ctx.fillRect?.(metrics.x - metrics.width / 2, top, metrics.width, 1.5);
      return true;
    }
    case 'pixel-dissolve':
      drawBase(ctx, model);
      drawPixelFragments(ctx, model, { threshold: progress < 0.55 ? progress / 0.55 : 1, color: model.todayColor });
      return true;
    case 'echo-collapse': {
      const settle = easeOut(Math.min(1, progress / 0.58));
      for (let index = 4; index >= 1; index -= 1) {
        const spread = (1 - settle) * index * 8;
        drawBaseVariant(ctx, model, drawBase, {
          alpha: 0.1 + index * 0.035,
          offsetX: (index % 2 ? 1 : -1) * spread,
          offsetY: (index - 2) * 1.5
        });
      }
      drawBase(ctx, model);
      return true;
    }
    case 'heat-shimmer':
      drawSliceMotion(ctx, model, drawBase, 14, index => Math.sin(index * 0.85 + progress * Math.PI * 4) * 3.5, 0.98);
      return true;
    case 'signal-lock': {
      const lock = easeOut(Math.min(1, progress / 0.42));
      drawSliceMotion(ctx, model, drawBase, 9, index => (seededNoise(model.seed, index + Math.floor(progress * 18) * 3) - 0.5) * 18 * (1 - lock), 1);
      return true;
    }
    case 'letter-cascade': {
      const cascadeColor = getReadableMotionColor(model.todayColor);
      drawCharacterLayers(ctx, model, (character, index, x, local, characterWidth) => {
        const offsetY = lerp(-metrics.fontSize * 0.9, 0, easeOut(local));
        const alpha = Math.min(1, local * 1.7);
        drawText(ctx, {
          ...model,
          displayText: character,
          metrics: { ...metrics, x, width: characterWidth }
        }, cascadeColor, alpha, 0, offsetY);
      });
      return true;
    }
    case 'orbiting-spark': {
      drawBase(ctx, model);
      const angle = phase;
      const x = metrics.x + Math.cos(angle) * metrics.width * 0.58;
      const y = metrics.y - metrics.fontSize * 0.38 + Math.sin(angle) * metrics.fontSize * 0.64;
      const spark = createRadialGradient(ctx, ['#FFFFFF', '#CDD2FF', 'rgba(205,210,255,0)'], x, y, 0, x, y, 8, '#CDD2FF');
      ctx.fillStyle = spark;
      ctx.beginPath?.();
      ctx.arc?.(x, y, 8, 0, Math.PI * 2);
      ctx.fill?.();
      return true;
    }
    case 'color-memory':
      drawBase(ctx, model);
      drawColorMemory(ctx, model);
      return true;
    case 'daily-pulse':
      drawBase(ctx, model);
      drawDailyPulse(ctx, model);
      return true;
    case 'prism-shatter': {
      drawBase(ctx, model);
      const columns = 8;
      const rows = 4;
      const phaseValue = progress < 0.5 ? easeOut(progress / 0.5) : easeOut((1 - progress) / 0.5);
      const scatter = (1 - phaseValue) * 18;
      drawTextSlices(ctx, model, index => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        ctx.save?.();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.globalAlpha = 0.12 + seededNoise(model.seed, index + 90) * 0.3;
        ctx.fillStyle = index % 2 ? '#CDD2FF' : model.todayColor;
        ctx.translate?.((seededNoise(model.seed, index + 30) - 0.5) * scatter, (seededNoise(model.seed, index + 60) - 0.5) * scatter);
        ctx.fillRect?.(column / columns * model.width, row / rows * model.height, model.width / columns, model.height / rows);
        ctx.restore?.();
      }, columns * rows);
      return true;
    }
    case 'ink-spread': {
      const spread = 1 - easeOut(Math.min(1, progress / 0.58));
      for (let index = 5; index >= 1; index -= 1) {
        drawBaseVariant(ctx, model, drawBase, {
          alpha: 0.05 + index * 0.035,
          offsetX: 0,
          offsetY: spread * (index - 3) * 1.6,
          blur: spread * index * 1.2
        });
      }
      drawBaseVariant(ctx, model, drawBase, { alpha: 1 - spread * 0.25 });
      return true;
    }
    default:
      drawBase(ctx, model);
      return false;
  }
}
