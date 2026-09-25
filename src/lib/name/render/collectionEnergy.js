import {
  TAU,
  clamp,
  createLinearGradient,
  dot,
  easeInOut,
  easeOut,
  envelope,
  fill,
  glint,
  glow,
  noise,
  oval,
  phase,
  polygon,
  rgba,
  stroke
} from './collectionArt.js';

const widthOf = value => clamp(Number(value), 48, 300);
const progressOf = model => clamp(Number(model?.progress));
const seeded = (model, index) => noise(model?.seed ?? 0, index);
const mix = (first, second, amount) => first + (second - first) * clamp(amount);
const eventPulse = (progress, start, end, edge = 0.08) => envelope(progress, start, end, edge);

function drawBand(ctx, top, bottom, color, alpha) {
  if (!top.length || !bottom.length) return;
  fill(ctx, color, alpha, c => {
    c.moveTo(top[0][0], top[0][1]);
    for (let index = 1; index < top.length; index += 1) c.lineTo(top[index][0], top[index][1]);
    for (let index = bottom.length - 1; index >= 0; index -= 1) c.lineTo(bottom[index][0], bottom[index][1]);
    c.closePath();
  });
}

function sampledPath(ctx, color, weight, alpha, points) {
  if (!points.length) return;
  stroke(ctx, color, weight, alpha, c => {
    c.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length; index += 1) c.lineTo(points[index][0], points[index][1]);
  });
}

/** A loose, shaded silk ribbon that unspools, rolls through two folds, then settles. */
export function ribbonWaltz(ctx, model, width) {
  ctx.save(); ctx.translate(0, 21);
  const w = widthOf(width);
  const p = progressOf(model);
  const travel = easeInOut(phase(p, 0.1, 0.77));
  const settle = easeOut(phase(p, 0.69, 0.94));
  const startX = -w * 0.56;
  const span = w * 1.12;
  const palette = {
    shadow: '#501653',
    deep: '#9C1D70',
    silk: '#F53691',
    light: '#FFC6E5',
    glint: '#FFF2FA'
  };

  const spool = eventPulse(p, 0.01, 0.23, 0.08);
  if (spool > 0.01) {
    const radius = 2.2 + 5.8 * (1 - easeOut(phase(p, 0.12, 0.22)));
    const x = startX + 5 + (1 - spool) * 2;
    oval(ctx, x, 2, radius, radius * 0.48, -0.24, palette.deep, 0.88 * spool);
    stroke(ctx, palette.light, 1.35, 0.82 * spool, c => {
      c.moveTo(x - radius, 2);
      c.bezierCurveTo(x - radius * 0.7, -radius * 1.15, x + radius, -radius * 0.8, x + radius * 0.48, 1);
      c.bezierCurveTo(x + radius * 0.2, radius * 0.84, x - radius * 0.7, radius * 0.7, x - radius * 0.34, 2);
    });
  }

  if (travel > 0.015) {
    const count = 42;
    const top = [];
    const bottom = [];
    const sheen = [];
    const lowerFold = [];
    for (let index = 0; index <= count; index += 1) {
      const u = travel * index / count;
      const t = u / Math.max(0.001, travel);
      const wave = Math.sin(u * TAU * 1.38 - p * 2.2 + 0.42) * (4.9 - settle * 2.3)
        + Math.sin(u * TAU * 2.55 - p * 1.1) * (1.15 - settle * 0.55);
      const centerY = -1 + wave;
      const pleat = Math.cos(u * TAU * 2.12 - p * 2.6 + 0.7);
      const half = 4.1 + pleat * 1.05;
      const x = startX + span * u;
      top.push([x, centerY - half]);
      bottom.push([x, centerY + half]);
      sheen.push([x, centerY - half * 0.34 - 0.5]);
      lowerFold.push([x, centerY + half * 0.62]);
      // A handful of crosswise creases makes the band read as folded fabric.
      if (index > 0 && index % 11 === 0) {
        const creaseAlpha = (0.32 + 0.14 * Math.sin(t * Math.PI)) * (1 - settle * 0.35);
        const creaseX = x;
        const creaseY = centerY;
        stroke(ctx, palette.glint, 0.72, creaseAlpha, c => {
          c.moveTo(creaseX - 1.2, creaseY - half * 0.68);
          c.quadraticCurveTo(creaseX + 1.1, creaseY, creaseX - 0.8, creaseY + half * 0.66);
        });
      }
    }

    const silkGradient = createLinearGradient(ctx, [
      rgba(palette.deep, 0.96), rgba(palette.silk, 0.98), rgba('#FF78B8', 0.98), rgba(palette.deep, 0.96)
    ], startX, -8, startX + span * travel, 9, palette.silk);
    drawBand(ctx, top, bottom, silkGradient, 0.97);
    sampledPath(ctx, palette.shadow, 1.5, 0.74 * (1 - settle * 0.18), bottom);
    sampledPath(ctx, palette.glint, 0.72, 0.82, sheen);
    sampledPath(ctx, palette.deep, 0.86, 0.53, lowerFold);
    sampledPath(ctx, palette.light, 1.08, 0.77, top.map(([x, y]) => [x, y + 1.1]));

    const headX = startX + span * travel;
    const headY = -1
      + Math.sin(travel * TAU * 1.38 - p * 2.2 + 0.42) * (4.9 - settle * 2.3)
      + Math.sin(travel * TAU * 2.55 - p * 1.1) * (1.15 - settle * 0.55);
    const curl = eventPulse(p, 0.2, 0.88, 0.12);
    stroke(ctx, palette.deep, 2.5, curl * (1 - settle * 0.38), c => {
      c.moveTo(headX - 8, headY + 1);
      c.bezierCurveTo(headX + 3, headY - 6, headX + 9, headY + 5, headX + 1, headY + 5);
      c.bezierCurveTo(headX - 3, headY + 4, headX - 1, headY - 1, headX + 4, headY - 2);
    });
    stroke(ctx, palette.glint, 0.9, curl * 0.9, c => {
      c.moveTo(headX - 6, headY - 1);
      c.bezierCurveTo(headX + 1, headY - 5, headX + 5, headY + 2, headX + 1, headY + 3);
    });

    const settleGlint = eventPulse(p, 0.79, 0.99, 0.08);
    if (settleGlint > 0.02) glint(ctx, headX, headY - 8, 3.1, palette.glint, settleGlint * 0.8);
  }
  ctx.restore();
}

/** One ember catches, runs down a fuse, and leaves a short trail of cooling tongues. */
export function firebrand(ctx, model, width) {
  const w = widthOf(width);
  const p = progressOf(model);
  const startX = -w * 0.56;
  const endX = w * 0.56;
  const q = easeInOut(phase(p, .15, .58));
  const headX = mix(startX, endX, q);
  const headY = 16 + Math.sin(q * Math.PI * 2.1) * 1.3;
  const palette = {
    soot: '#6B1B21',
    ember: '#F04428',
    flame: '#FF762B',
    gold: '#FFC64A',
    core: '#FFF1A8'
  };

  const sparkUp = eventPulse(p, 0.02, 0.2, 0.06);
  if (sparkUp > 0.01) {
    const x = startX + 2 + easeOut(phase(p, 0.1, 0.19)) * 4;
    glow(ctx, x, 15, 10 + sparkUp * 4, palette.flame, 0.42 * sparkUp);
    stroke(ctx, palette.gold, 1.1, 0.7 * sparkUp, c => {
      c.moveTo(x - 11, 18);
      c.quadraticCurveTo(x - 5, 12, x + 2, 17);
    });
    glint(ctx, x, 11, 2.3 + sparkUp * 1.2, palette.core, sparkUp * 0.92);
  }

  if (q > 0.015) {
    const cooling = easeOut(phase(p, 0.77, 0.96));
    stroke(ctx, palette.soot, 11.5, 0.34 * (1 - cooling * 0.55), c => {
      c.moveTo(startX, 19);
      c.bezierCurveTo(startX + w * 0.32, 16, headX - w * 0.18, 21, headX, headY);
    });
    stroke(ctx, palette.ember, 6.6, 0.94 * (1 - cooling * 0.48), c => {
      c.moveTo(startX, 18);
      c.bezierCurveTo(startX + w * 0.31, 15, headX - w * 0.14, 20, headX, headY);
    });
    stroke(ctx, palette.gold, 1.45, 0.96 * (1 - cooling * 0.56), c => {
      c.moveTo(startX + 2, 17.5);
      c.bezierCurveTo(startX + w * 0.24, 15.1, headX - w * 0.15, 19, headX - 1, headY - 1.2);
    });

    // Each tapered tongue catches once as the ignition front reaches its fixed station.
    const stations = [-0.39, -0.14, 0.13, 0.37];
    stations.forEach((station, index) => {
      const stationT = (station + 0.56) / 1.12;
      const age = q - stationT;
      const rise = easeOut(phase(age, 0, 0.09));
      const decay = 1 - easeOut(phase(age, 0.16, 0.39));
      const life = clamp(rise * decay);
      if (life <= 0.01) return;
      const x = station * w;
      const h = 10 + seeded(model, index + 18) * 12;
      const lean = (seeded(model, index + 27) - 0.5) * 7;
      const baseY = 18;
      const tipY = baseY - h * life;
      fill(ctx, palette.ember, 0.72 * life, c => {
        c.moveTo(x - 4.3 * life, baseY);
        c.bezierCurveTo(x - 5.1 * life, baseY - h * 0.24, x + lean - 2.7 * life, tipY + h * 0.35, x + lean, tipY);
        c.bezierCurveTo(x + lean + 4.5 * life, tipY + h * 0.54, x + 5.2 * life, baseY - h * 0.22, x + 4.1 * life, baseY);
        c.closePath();
      });
      fill(ctx, palette.gold, 0.88 * life, c => {
        c.moveTo(x - 1.4 * life, baseY - 1);
        c.bezierCurveTo(x - 2 * life, baseY - h * 0.22, x + lean, tipY + h * 0.42, x + lean + 0.4, tipY + 3 * life);
        c.bezierCurveTo(x + 3 * life, baseY - h * 0.18, x + 2.1 * life, baseY - 3 * life, x + 1.6 * life, baseY - 1);
        c.closePath();
      });
    });

    // The leading ignition is a single taper, not a row of matching flames.
    const frontPulse = eventPulse(p, 0.17, 0.91, 0.12);
    if (frontPulse > 0.01) {
      const frontHeight = 17 + 5 * Math.sin(q * Math.PI);
      const lean = Math.sin(p * 8.2) * 3.1;
      glow(ctx, headX, headY - 5, 14, palette.flame, 0.43 * frontPulse);
      fill(ctx, palette.flame, 0.94 * frontPulse, c => {
        c.moveTo(headX - 7, headY + 3);
        c.bezierCurveTo(headX - 10, headY - 4, headX + lean - 4, headY - frontHeight * 0.62, headX + lean, headY - frontHeight);
        c.bezierCurveTo(headX + lean + 9, headY - frontHeight * 0.55, headX + 8, headY - 4, headX + 7, headY + 3);
        c.closePath();
      });
      fill(ctx, palette.core, 0.91 * frontPulse, c => {
        c.moveTo(headX - 2.6, headY + 1);
        c.bezierCurveTo(headX - 3.5, headY - 5, headX + lean, headY - frontHeight * 0.62, headX + lean + 1.2, headY - frontHeight * 0.75);
        c.bezierCurveTo(headX + 5, headY - frontHeight * 0.38, headX + 3.2, headY - 3, headX + 2.8, headY + 1);
        c.closePath();
      });
    }
  }

  // Ballistic embers have fixed launch times and fade without respawning.
  for (let index = 0; index < 7; index += 1) {
    const launch = 0.25 + seeded(model, index + 60) * 0.48;
    if (p < launch) continue;
    const age = phase(p, launch, .83);
    const t = age * 0.48;
    const station = 0.12 + seeded(model, index + 70) * 0.74;
    const x0 = mix(startX, endX, station);
    const y0 = 14 + Math.sin(station * Math.PI * 2.1) * 1.1;
    const vx = (seeded(model, index + 80) - 0.48) * 18;
    const vy = -10 - seeded(model, index + 90) * 12;
    const x = clamp(x0 + vx * t, -w * 0.62, w * 0.62);
    const y = clamp(y0 + vy * t + 27 * t * t, -29, 24);
    const alpha = (1 - easeOut(age)) * eventPulse(p, launch, 1, 0.04);
    if (alpha > 0.01) {
      glow(ctx, x, y, 4.2, palette.flame, 0.25 * alpha);
      dot(ctx, x, y, 1.05 + seeded(model, index + 100) * 0.85, index % 2 ? palette.gold : palette.core, alpha);
    }
  }
}

/** A scarlet pressure brush sweeps once, then releases a controlled ink splatter. */
export function inkImpact(ctx, model, width) {
  const w = widthOf(width);
  const p = progressOf(model);
  const startX = -w * 0.57;
  const endX = w * 0.56;
  const q = easeInOut(phase(p, .14, .38));
  const headX = mix(startX, endX, q);
  const headY = 19 + Math.sin(q * Math.PI * 1.15) * 3.6;
  const palette = {
    shadow: '#671023',
    deep: '#A3132B',
    scarlet: '#F1263D',
    vermilion: '#FF5A4B',
    glaze: '#FFB0A6',
    bead: '#FF304B'
  };

  const poised = eventPulse(p, 0.01, 0.2, 0.07);
  if (poised > 0.01) {
    const x = startX + 3;
    glow(ctx, x, headY - 4, 9, palette.scarlet, 0.2 * poised);
    oval(ctx, x, headY - 5, 1.8 + poised * 1.2, 3.1 + poised * 1.8, -0.2, palette.bead, 0.82 * poised);
    stroke(ctx, palette.glaze, 1.1, 0.72 * poised, c => {
      c.moveTo(x - 7, headY + 7);
      c.quadraticCurveTo(x - 2, headY + 2, x + 1, headY + 6);
    });
  }

  if (q > 0.012) {
    const count = 48;
    const top = [];
    const bottom = [];
    const innerRidge = [];
    const dryLine = [];
    for (let index = 0; index <= count; index += 1) {
      const t = q * index / count;
      const local = t / Math.max(0.001, q);
      const x = startX + (endX - startX) * t;
      const center = 19
        + Math.sin(t * Math.PI * 1.18 + 0.2) * 3.4
        + Math.sin(t * Math.PI * 3.2 + 1.4) * 0.8;
      const pressure = 0.58 + 0.42 * Math.sin(local * Math.PI) ** 0.7;
      const grain = Math.sin(t * TAU * 8.1 + 0.35) * 0.6;
      const half = (2.1 + pressure * 4.4 + grain) * (0.72 + easeOut(phase(p, 0.11, 0.37)) * 0.28);
      top.push([x, center - half]);
      bottom.push([x, center + half]);
      innerRidge.push([x, center - half * 0.15 - 0.6]);
      dryLine.push([x, center + half * 0.42]);
    }

    const fade = 1 - easeOut(phase(p, 0.88, 1));
    const shadowAlpha = 0.44 * Math.max(0.58, fade);
    sampledPath(ctx, palette.shadow, 12.8, shadowAlpha, top.map(([x, y], index) => [x, (y + bottom[index][1]) * 0.5 + 2.6]));
    const inkGradient = createLinearGradient(ctx, [
      rgba(palette.deep, 0.96), rgba(palette.scarlet, 0.98), rgba(palette.vermilion, 0.94), rgba('#D8133D', 0.96)
    ], startX, -1, endX, 11, palette.scarlet);
    drawBand(ctx, top, bottom, inkGradient, 0.98);
    sampledPath(ctx, palette.deep, 1.1, 0.74, bottom);
    sampledPath(ctx, palette.glaze, 0.85, 0.74, innerRidge);
    sampledPath(ctx, palette.vermilion, 0.7, 0.65, dryLine);

    // A short bristle wedge records the pressure release at the moving brush tip.
    const brushAlpha = eventPulse(p, 0.12, 0.86, 0.12);
    if (brushAlpha > 0.01) {
      const angle = -0.14 + Math.sin(p * 5) * 0.09;
      ctx.save();
      ctx.translate(headX, headY);
      ctx.rotate(angle);
      polygon(ctx, [[-2, -4], [6, -2.6], [9, 0], [6, 2.8], [-2, 4]], palette.deep, brushAlpha * 0.94);
      polygon(ctx, [[-1, -2], [6, -1.4], [7, 0], [6, 1.4], [-1, 2]], palette.glaze, brushAlpha * 0.83);
      ctx.restore();
    }
  }

  // A single late impact sends a few drops outward; every drop follows one bounded arc.
  for (let index = 0; index < 9; index += 1) {
    const launch = .37 + seeded(model, index + 120) * .1;
    if (p < launch) continue;
    const age = phase(p, launch, .83);
    const t = age * 0.56;
    const direction = seeded(model, index + 130) * TAU;
    const speed = 13 + seeded(model, index + 140) * 27;
    const x = clamp(endX - 4 + Math.cos(direction) * speed * t, -w * 0.62, w * 0.62);
    const y = clamp(headY + Math.sin(direction) * speed * t + 26 * t * t, -27, 28);
    const radius = 0.75 + seeded(model, index + 150) * 1.45;
    const alpha = 0.88 * (1 - easeOut(age * 0.82));
    if (alpha > 0.015) {
      glow(ctx, x, y, radius * 3.3, palette.vermilion, 0.2 * alpha);
      oval(ctx, x, y, radius, radius * (0.7 + seeded(model, index + 160) * 0.85), direction, index % 3 ? palette.scarlet : palette.glaze, alpha);
    }
  }

  const splash = eventPulse(p, .37, .57, .06);
  if (splash > 0.01) {
    const radius = 4 + easeOut(phase(p, .37, .51)) * 12;
    stroke(ctx, palette.vermilion, 1.05, splash * 0.72, c => c.ellipse(endX - 4, headY + 1, radius, radius * 0.34, -0.12, 0, TAU));
    dot(ctx, endX - 4, headY + 1, 1.7 * (1 - easeOut(phase(p, .4, .57))), palette.glaze, splash * 0.92);
  }
}

function meteorPoint(segment, t) {
  const clamped = clamp(t);
  const x = mix(segment.x0, segment.x1, clamped);
  const y = segment.y0 + (segment.y1 - segment.y0) * clamped - 4 * segment.height * clamped * (1 - clamped);
  return [x, clamp(y, -30, 28)];
}

/** Three golden skips arc forward with progressively smaller hops and impact rings. */
export function meteorSkip(ctx, model, width) {
  const w = widthOf(width);
  const p = progressOf(model);
  const palette = {
    trail: '#A64B16',
    gold: '#FFB52E',
    light: '#FFE36A',
    core: '#FFF6C3',
    flare: '#FFF0A2'
  };
  const segments = [
    { start: 0.13, end: 0.34, x0: -w * 0.54, x1: -w * 0.14, y0: -9, y1: 14, height: 19 },
    { start: 0.34, end: 0.52, x0: -w * 0.14, x1: w * 0.19, y0: 14, y1: 17, height: 14 },
    { start: 0.52, end: 0.68, x0: w * 0.19, x1: w * 0.48, y0: 17, y1: 20, height: 9 }
  ];

  const anticipation = eventPulse(p, 0.02, 0.16, 0.06);
  if (anticipation > 0.01) {
    const [x, y] = meteorPoint(segments[0], 0);
    glow(ctx, x, y, 12, palette.gold, 0.35 * anticipation);
    glint(ctx, x, y, 3.4, palette.core, anticipation * 0.92);
    stroke(ctx, palette.light, 0.95, 0.66 * anticipation, c => {
      c.moveTo(x + 4, y + 4);
      c.lineTo(x + 16, y + 8);
    });
  }

  segments.forEach((segment, index) => {
    if (p < segment.start) return;
    const active = p <= segment.end;
    const t = active ? phase(p, segment.start, segment.end) : 1;
    const trailAge = active ? 0 : phase(p, segment.end, segment.end + 0.25);
    const trailAlpha = active ? 0.78 : 0.6 * (1 - easeOut(trailAge));
    if (trailAlpha > 0.015) {
      const points = [];
      const count = 20;
      for (let sample = 0; sample <= count; sample += 1) {
        const local = t * sample / count;
        points.push(meteorPoint(segment, local));
      }
      sampledPath(ctx, palette.trail, 5.2 - index * 0.95, trailAlpha * 0.67, points);
      sampledPath(ctx, index === 0 ? palette.gold : palette.light, 1.65 - index * 0.22, trailAlpha, points);
    }

    if (active) {
      const [x, y] = meteorPoint(segment, t);
      const [tailX, tailY] = meteorPoint(segment, Math.max(0, t - 0.14));
      glow(ctx, x, y, 13 - index * 1.7, palette.gold, 0.65 - index * 0.09);
      stroke(ctx, palette.light, 4.5 - index * 0.75, 0.84, c => {
        c.moveTo(tailX, tailY);
        c.lineTo(x, y);
      });
      stroke(ctx, palette.core, 1.45, 0.98, c => {
        c.moveTo(tailX + 1, tailY - 1);
        c.lineTo(x, y - 1);
      });
      oval(ctx, x, y, 3.8 - index * 0.55, 2.6 - index * 0.3, -0.18, palette.core, 0.98);
    }

    if (p >= segment.end) {
      const ringAge = phase(p, segment.end, Math.min(1, segment.end + 0.2));
      const settle = 1 - easeOut(ringAge);
      if (settle > 0.015) {
        const ringX = segment.x1;
        const ringY = segment.y1 + 2;
        const base = 3.5 - index * 0.55;
        const radiusX = base + easeOut(ringAge) * (12 - index * 2.2);
        const radiusY = 1.5 + easeOut(ringAge) * (4.2 - index * 0.8);
        stroke(ctx, palette.gold, 1.8 - index * 0.18, settle * 0.86, c => c.ellipse(ringX, ringY, radiusX, radiusY, 0, 0, TAU));
        stroke(ctx, palette.light, 0.7, settle * 0.68, c => c.ellipse(ringX, ringY, radiusX * 0.58, radiusY * 0.63, 0, 0, TAU));
        if (ringAge < 0.32) glint(ctx, ringX, ringY - 2, 2.3 - index * 0.35, palette.flare, settle * 0.65);
      }
    }
  });
}

/** A turquoise crest crosses an irregular pool and resolves into spaced ripples. */
export function tidePool(ctx, model, width) {
  const w = widthOf(width);
  const p = progressOf(model);
  const palette = {
    deep: '#064C70',
    pool: '#087D9A',
    water: '#12BFD0',
    crest: '#85FFF0',
    foam: '#D9FFF6'
  };
  const travel = easeInOut(phase(p, 0.16, 0.77));
  const fadeCrest = 1 - easeOut(phase(p, 0.76, 0.95));
  const crestPosition = -0.78 + travel * 1.56;
  const seedPhase = seeded(model, 204) * 1.8;
  const squeeze = eventPulse(p, 0.01, 0.2, 0.08);

  // The pool is a single luminous basin, not a stack of repeated horizontal waves.
  ctx.save(); ctx.translate(0, 20); ctx.scale(1, 0.12);
  glow(ctx, 0, 0, w * 0.47, palette.water, 0.14 + 0.17 * fadeCrest);
  ctx.restore();
  oval(ctx, 0, 20, w * 0.52, 7.4, 0, palette.deep, 0.72);
  oval(ctx, -w * 0.04, 19, w * 0.43, 5.8, -0.025, palette.pool, 0.74);
  stroke(ctx, palette.water, 1.1, 0.55, c => c.ellipse(-w * 0.02, 19.2, w * 0.45, 6.1, -0.025, Math.PI * 1.02, Math.PI * 1.95));

  if (squeeze > 0.01) {
    const radiusX = 7 + (1 - squeeze) * 11;
    const radiusY = 1.7 + (1 - squeeze) * 1.2;
    stroke(ctx, palette.crest, 1.15, squeeze * 0.78, c => c.ellipse(-2, 17, radiusX, radiusY, -0.08, 0, TAU));
    dot(ctx, -2, 15.3, 1.2, palette.foam, squeeze * 0.72);
  }

  const waveTop = [];
  const waveFoam = [];
  const waveUnder = [];
  const count = 44;
  const pulseFade = fadeCrest;
  for (let index = 0; index <= count; index += 1) {
    const t = index / count;
    const x = -w * 0.58 + t * w * 1.16;
    const uneven = Math.sin(t * TAU * 1.12 + p * 1.5 + seedPhase) * 2.8
      + Math.sin(t * TAU * 2.31 - p * 2.3 + 0.8) * 1.45
      + Math.sin(t * TAU * 4.2 + seedPhase * 1.6) * 0.62;
    const distance = (t - (crestPosition + 0.78) / 1.56) / (0.16 + (1 - pulseFade) * 0.08);
    const crest = Math.exp(-distance * distance) * 8.8 * pulseFade;
    const y = 6.2 + uneven - crest;
    waveTop.push([x, clamp(y, -17, 16)]);
    waveFoam.push([x, clamp(y - 2.2 - Math.max(0, crest) * 0.12, -18, 14)]);
    waveUnder.push([x, clamp(y + 5.1 + Math.sin(t * TAU * 1.9 + p) * 1.2, -10, 20)]);
  }

  const waterGradient = createLinearGradient(ctx, [
    rgba(palette.water, 0.78), rgba(palette.pool, 0.82), rgba(palette.deep, 0.86)
  ], 0, -9, 0, 28, palette.pool);
  fill(ctx, waterGradient, 0.82, c => {
    c.moveTo(waveTop[0][0], waveTop[0][1]);
    for (let index = 1; index < waveTop.length; index += 1) c.lineTo(waveTop[index][0], waveTop[index][1]);
    c.bezierCurveTo(w*.52, 29, -w*.43, 31, -w*.58, waveTop[0][1]);
    c.closePath();
  });
  sampledPath(ctx, palette.deep, 2.2, 0.7, waveUnder);
  sampledPath(ctx, palette.water, 3.5, 0.86, waveTop);
  sampledPath(ctx, palette.foam, 0.92, 0.8 * (0.58 + pulseFade * 0.42), waveFoam);

  if (fadeCrest > 0.02) {
    const crestX = -w * 0.58 + travel * w * 1.16;
    const crestY = 6.2 + Math.sin((travel * 1.12) * TAU + p * 1.5 + seedPhase) * 2.8
      + Math.sin((travel * 1.12) * TAU * 2.31 - p * 2.3 + 0.8) * 1.45
      - 8.8 * fadeCrest;
    glow(ctx, crestX, clamp(crestY, -16, 15), 16, palette.water, 0.42 * fadeCrest);
    glint(ctx, crestX, clamp(crestY - 1, -18, 13), 2.4, palette.foam, fadeCrest * 0.88);
  }

  const ripples = [
    { x: -w * 0.31, y: 17.2, start: 0.64, scale: 1 },
    { x: w * 0.1, y: 14.1, start: 0.71, scale: 0.82 },
    { x: w * 0.37, y: 19.5, start: 0.77, scale: 0.68 }
  ];
  ripples.forEach((ripple, index) => {
    if (p < ripple.start) return;
    const age = phase(p, ripple.start, 1);
    const radiusX = (4 + easeOut(age) * 13) * ripple.scale;
    const radiusY = (1.3 + easeOut(age) * 3.2) * ripple.scale;
    const alpha = (1 - easeOut(age)) * 0.78;
    stroke(ctx, index % 2 ? palette.water : palette.crest, 1.2 - index * 0.12, alpha, c => {
      c.ellipse(ripple.x, ripple.y, radiusX, radiusY, (index - 1) * 0.04, 0, TAU);
    });
    if (age < 0.48) {
      stroke(ctx, palette.foam, 0.62, alpha * 0.75, c => {
        c.ellipse(ripple.x, ripple.y, radiusX * 0.58, radiusY * 0.56, 0, 0, TAU);
      });
    }
  });
}

function drawConfettiPiece(ctx, shape, color, size, alpha) {
  if (shape === 0) {
    fill(ctx, color, alpha, c => c.rect(-size * 0.82, -size * 0.26, size * 1.64, size * 0.52));
    stroke(ctx, '#FFF5C6', 0.55, alpha * 0.6, c => {
      c.moveTo(-size * 0.6, -size * 0.08);
      c.lineTo(size * 0.55, -size * 0.08);
    });
  } else if (shape === 1) {
    polygon(ctx, [[-size * 0.6, size * 0.45], [-size * 0.15, -size * 0.58], [size * 0.7, size * 0.24]], color, alpha);
    stroke(ctx, '#FFFFFF', 0.48, alpha * 0.48, c => {
      c.moveTo(-size * 0.15, -size * 0.58);
      c.lineTo(size * 0.05, size * 0.15);
    });
  } else if (shape === 2) {
    fill(ctx, color, alpha, c => {
      c.moveTo(-size, -size * 0.18);
      c.quadraticCurveTo(-size * 0.18, -size * 0.75, size * 0.6, -size * 0.12);
      c.quadraticCurveTo(size * 1.15, size * 0.27, size * 0.28, size * 0.4);
      c.quadraticCurveTo(-size * 0.55, size * 0.56, -size, -size * 0.18);
      c.closePath();
    });
  } else {
    polygon(ctx, [[-size * 0.7, -size * 0.2], [size * 0.35, -size * 0.52], [size * 0.72, size * 0.2], [-size * 0.34, size * 0.52]], color, alpha);
    stroke(ctx, '#FFF5C6', 0.52, alpha * 0.55, c => {
      c.moveTo(-size * 0.35, size * 0.34);
      c.lineTo(size * 0.38, -size * 0.34);
    });
  }
}

/** A single confetti burst spreads varied, tumbling pieces before they drift to rest. */
export function confettiParade(ctx, model, width) {
  const w = widthOf(width);
  const p = progressOf(model);
  const palette = ['#FF3E75', '#FFC52F', '#28D7A1', '#8E62FF', '#FF7544', '#37C7EF', '#FA6BD4'];
  const pre = eventPulse(p, 0.02, 0.25, 0.08);
  if (pre > 0.01) {
    const pinch = 1 - easeOut(phase(p, 0.04, 0.2));
    const radius = 7 + pinch * 8;
    glow(ctx, 0, 1, radius * 1.8, '#FFCA52', 0.18 * pre);
    for (let index = 0; index < 5; index += 1) {
      const angle = -Math.PI / 2 + index * TAU / 5;
      const reach = radius * (0.58 + seeded(model, index + 220) * 0.28);
      stroke(ctx, palette[index], 1.1, pre * 0.74, c => {
        c.moveTo(Math.cos(angle) * reach, Math.sin(angle) * reach);
        c.lineTo(Math.cos(angle) * (reach + 4), Math.sin(angle) * (reach + 4));
      });
      dot(ctx, Math.cos(angle) * reach, Math.sin(angle) * reach, 1.1, palette[index], pre * 0.88);
    }
  }

  const burst = eventPulse(p, 0.17, 0.46, 0.12);
  if (burst > 0.01) {
    const age = easeOut(phase(p, 0.17, 0.44));
    const radius = 4 + age * 22;
    stroke(ctx, '#FFE87A', 1.5, burst * 0.82, c => c.ellipse(0, 1, radius, radius * 0.47, -0.12, 0, TAU));
    stroke(ctx, '#FFFFFF', 0.7, burst * 0.65, c => c.ellipse(0, 1, radius * 0.63, radius * 0.32, -0.12, 0, TAU));
    if (age < 0.72) glint(ctx, 0, 1, 4.8 * (1 - age * 0.48), '#FFF8C8', burst * 0.9);
  }

  for (let index = 0; index < 22; index += 1) {
    const n0 = seeded(model, index + 300);
    const n1 = seeded(model, index + 330);
    const n2 = seeded(model, index + 360);
    const n3 = seeded(model, index + 390);
    const launch = 0.12 + n0 * 0.13;
    if (p < launch) continue;
    const age = phase(p, launch, 1);
    const initialAngle = (n1 - 0.5) * TAU + index * 0.37;
    const radialSpeed = 8 + n2 * 15;
    const originX = (n3 - 0.5) * 11;
    const originY = 23 + (n2 - 0.5) * 3;
    const vx = Math.cos(initialAngle) * radialSpeed + (n3 - 0.5) * w * 1.6;
    const vy = -155 - n1 * 35 + Math.sin(initialAngle) * 7;
    const gravity = 330 + n2 * 25;
    const x = clamp(originX + vx * age, -w * 0.61, w * 0.61);
    const y = clamp(originY + vy * age + 0.5 * gravity * age * age, -30, 30);
    const size = 2.2 + n3 * 4.1;
    const spin = (n0 - 0.5) * 13 + (index % 2 ? 3.2 : -2.6);
    const alpha = .94 * easeOut(phase(p,launch,launch+.035)) * (1 - easeOut(phase(p, .76, .94)));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((n1 * TAU) + spin * age);
    drawConfettiPiece(ctx, index % 4, palette[index % palette.length], size, alpha);
    ctx.restore();
  }

  const settling = eventPulse(p, 0.83, 1, 0.1);
  if (settling > 0.01) {
    glint(ctx, -w * 0.42, 16, 2.6, '#FFE87A', settling * 0.72);
    glint(ctx, w * 0.36, 19, 2.1, '#8AF8E2', settling * 0.72);
  }
}
