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
  const top = metrics.y - metrics.fontSize * 0.52;
  const colors = ['#00EFFF', '#6E5CFF', '#FF4AD4'];

  // The reference is a text-bound energy system: a soft ghost sits behind the
  // glyphs, while the color field, particles, and glints are all clipped to
  // the actual name. Keep the base material only as the mask foundation.
  drawBaseVariant(ctx, model, drawBase, {
    alpha: 0.12,
    blur: 3,
    shadowColor: '#00EFFF'
  });
  drawBase(ctx, model);

  const field = createLinearGradient(ctx,
    ['rgba(0,220,255,.26)', 'rgba(55,110,255,.12)', 'rgba(255,45,215,.26)'],
    left,
    0,
    left + metrics.width,
    0,
    '#B6F7FF');
  withTextMask(ctx, model, target => {
    target.fillStyle = field;
    target.globalAlpha = 0.9;
    target.fillRect?.(0, 0, model.width, model.height);
    // Moving plasma bands are the internal energy, not an exterior gradient.
    for (let index = 0; index < 13; index += 1) {
      const seed = seededNoise(model.seed, index + 201);
      const streakPhase = time * (0.00006 + seed * 0.000025) + index * 0.12;
      const bandX = left + metrics.width * fract(streakPhase);
      const band = createLinearGradient(target,
        ['rgba(0,0,0,0)', 'rgba(40,225,255,.14)', index % 2 ? 'rgba(255,60,230,.18)' : 'rgba(80,100,255,.16)', 'rgba(255,255,255,.11)', 'rgba(0,0,0,0)'],
        bandX - metrics.fontSize * 1.2,
        0,
        bandX + metrics.fontSize * 1.2,
        0,
        'rgba(255,255,255,.1)');
      target.fillStyle = band;
      target.globalAlpha = 0.72;
      target.fillRect?.(bandX - metrics.fontSize * 1.35,
        top - metrics.fontSize * 0.2 + Math.sin(time * 0.0012 + index) * 2,
        metrics.fontSize * 2.7,
        metrics.fontSize * 1.25);
    }
  });

  // Dense micro-particles make the field read as energized text instead of a
  // smooth color fill. Their home positions are deterministic, so compact
  // previews do not reshuffle every time they redraw.
  withTextMask(ctx, model, target => {
    const particleCount = Math.min(680, Math.max(110, Math.round(metrics.width * metrics.fontSize * 0.045)));
    for (let index = 0; index < particleCount; index += 1) {
      const seed = seededNoise(model.seed, index + 281);
      const particlePhase = fract(time * (0.00012 + seededNoise(model.seed, index + 301) * 0.00014) + seed);
      const x = left + seededNoise(model.seed, index + 321) * metrics.width
        + Math.sin(particlePhase * Math.PI * 2 + index) * 1.6;
      const y = top + seededNoise(model.seed, index + 341) * metrics.fontSize
        + Math.cos(particlePhase * Math.PI * 2) * 1.6;
      const size = 0.45 + seededNoise(model.seed, index + 361) * 1.25;
      const pulse = 0.5 + Math.sin(particlePhase * Math.PI) * 0.5;
      const color = index % 9 === 0 ? '#FFFFFF' : colors[index % colors.length];
      target.globalAlpha = (index % 9 === 0 ? 0.8 : 0.35 + pulse * 0.5);
      target.fillStyle = color;
      if (target.beginPath && target.arc && target.fill) {
        target.beginPath();
        target.arc(x, y, size, 0, Math.PI * 2);
        target.fill();
      } else {
        target.fillRect?.(x, y, size, size);
      }
    }
  });

  // Edge emission lives just beyond the glyph bounds. The outline and the
  // small escaping particles create the bright perimeter behavior from the
  // reference while staying bounded in the name canvas bleed.
  const outline = createLinearGradient(
    ctx,
    ['rgba(0,236,255,.62)', 'rgba(255,255,255,.4)', 'rgba(255,80,214,.62)'],
    left,
    0,
    left + metrics.width,
    0,
    '#F7FBFF'
  );
  strokeText(ctx, model, outline, Math.max(1.2, metrics.fontSize * 0.01), 0.75);

  for (let index = 0; index < 34; index += 1) {
    const seed = seededNoise(model.seed, index + 401);
    const phase = fract(time * (0.00018 + seed * 0.00018) + seed);
    const side = index % 4;
    const x = side === 0
      ? left - 2 - seed * metrics.fontSize * 0.16
      : side === 1
        ? left + metrics.width + 2 + seed * metrics.fontSize * 0.16
        : left + seed * metrics.width;
    const y = side === 2
      ? top - 2 - seed * metrics.fontSize * 0.16
      : side === 3
        ? top + metrics.fontSize + 2 + seed * metrics.fontSize * 0.16
        : top + seed * metrics.fontSize;
    const size = 0.45 + seededNoise(model.seed, index + 421) * 1.35;
    ctx.save?.();
    ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.72;
    ctx.fillStyle = index % 7 === 0 ? '#FFFFFF' : colors[index % colors.length];
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 3;
    if (ctx.beginPath && ctx.arc && ctx.fill) {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    } else ctx.fillRect?.(x, y, size, size);
    if (index % 8 === 0 && ctx.moveTo && ctx.lineTo && ctx.stroke) {
      ctx.strokeStyle = '#F7FBFF';
      ctx.lineWidth = 0.65;
      ctx.beginPath?.();
      ctx.moveTo(x - size * 3, y);
      ctx.lineTo(x + size * 3, y);
      ctx.moveTo(x, y - size * 3);
      ctx.lineTo(x, y + size * 3);
      ctx.stroke();
    }
    ctx.restore?.();
  }
}

function drawRasterSignal(ctx, model, drawBase) {
  const { metrics } = model;
  const time = Number.isFinite(model.time) ? model.time : 0;
  const rowHeight = Math.max(1.5, metrics.fontSize * 0.025);
  const textTop = metrics.y - metrics.fontSize * 0.47;
  const textBottom = metrics.y + metrics.fontSize * 0.47;
  const rows = Math.min(64, Math.max(8, Math.ceil((textBottom - textTop) / rowHeight)));

  drawBaseVariant(ctx, model, drawBase, {
    alpha: 0.12,
    offsetX: Math.sin(time * 0.0012) * 1.7,
    blur: 3,
    shadowColor: '#F7FBFF'
  });

  // Render actual horizontal glyph rows instead of repeatedly stacking full
  // text copies. This keeps the word white, dense, and signal-like at compact
  // preview sizes while allowing each row to drift independently.
  for (let index = 0; index < rows; index += 1) {
    const seed = seededNoise(model.seed, index + 501);
    const cluster = Math.sin(time * 0.0017 + index * 0.78) * (1.1 + seed * 2.9);
    const fine = Math.sin(time * 0.008 + index * 2.7) * 0.9;
    const jump = index % 11 === Math.floor((time * 0.002) % 11) ? (seed - 0.5) * 8 : 0;
    const top = textTop + index * rowHeight;
    const height = Math.min(rowHeight + 0.4, textBottom - top);
    if (height <= 0) continue;
    ctx.save?.();
    ctx.globalAlpha = 0.82 + seed * 0.1;
    if (ctx.beginPath && ctx.rect && ctx.clip) {
      ctx.beginPath();
      ctx.rect(0, top, model.width, height);
      ctx.clip();
    }
    ctx.translate?.(cluster + fine + jump, 0);
    drawBase(ctx, model);
    ctx.restore?.();
  }

  withTextMask(ctx, model, target => {
    target.fillStyle = '#08090D';
    target.globalAlpha = 0.16;
    for (let y = textTop; y < textBottom; y += rowHeight * 2.05) {
      target.fillRect?.(metrics.x - metrics.width / 2, y, metrics.width, Math.max(0.6, rowHeight * 0.32));
    }

    // Sparse bright pixels and fine grain keep the raster surface textured
    // without introducing frame-to-frame random reshuffling.
    target.fillStyle = '#FFFFFF';
    const pixelCount = Math.min(120, Math.max(28, Math.round(metrics.width * 0.24)));
    for (let index = 0; index < pixelCount; index += 1) {
      const seed = seededNoise(model.seed, index + 551);
      if (seed < 0.58) continue;
      const x = metrics.x - metrics.width / 2 + seededNoise(model.seed, index + 571) * metrics.width;
      const y = textTop + seededNoise(model.seed, index + 591) * (textBottom - textTop);
      target.globalAlpha = 0.18 + seed * 0.56;
      target.fillRect?.(x, y, 0.45 + seed * 1.05, Math.max(0.7, rowHeight * 0.34));
    }
  });
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
