import { drawText, strokeText, withTextMask, rgba, seededNoise } from './primitives.js';
import { getNameGlyphLayout } from './textSurface.js';

const TAU = Math.PI * 2;

// Avalanche the coordinates independently: neighboring FNV inputs otherwise
// correlate x/y and accidentally arrange the glitter along a diagonal.
function sample(seed, index) {
  let n = seed ^ Math.imul(index + 1, 0x9e3779b9);
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function bounds(model) {
  const { x, y, rawWidth, fontSize } = model.metrics;
  return { x, y, w: rawWidth, s: fontSize, l: x - rawWidth / 2, t: y - fontSize * .52 };
}

function gradient(ctx, colors, x1, y1, x2, y2) {
  const fill = ctx.createLinearGradient?.(x1, y1, x2, y2);
  if (!fill) return colors[0];
  colors.forEach((color, i) => fill.addColorStop(i / (colors.length - 1), color));
  return fill;
}

function face(ctx, model, colors) {
  const b = bounds(model);
  drawText(ctx, model, gradient(ctx, colors, b.l, b.t, b.l, b.t + b.s));
}

// Bloom is painted behind the finished face, never mixed into its texture mask.
function bloom(ctx, model, color, radius, opacity = .65) {
  ctx.save?.();
  ctx.globalCompositeOperation = 'destination-over';
  ctx.shadowColor = color;
  ctx.shadowBlur = radius * bounds(model).s;
  drawText(ctx, model, color, opacity);
  ctx.restore?.();
}

function pool(ctx, x, y, rx, ry, color, opacity = 1) {
  ctx.save?.();
  ctx.translate?.(x, y);
  ctx.scale?.(rx, ry);
  const fill = ctx.createRadialGradient?.(0, 0, 0, 0, 0, 1);
  if (fill) {
    fill.addColorStop(0, rgba(color, opacity));
    fill.addColorStop(.38, rgba(color, opacity * .6));
    fill.addColorStop(1, rgba(color, 0));
  }
  ctx.fillStyle = fill || rgba(color, opacity);
  ctx.fillRect?.(-1, -1, 2, 2);
  ctx.restore?.();
}

function light(ctx, model, p, color, width = .3, opacity = .65, offset = 0) {
  const b = bounds(model);
  withTextMask(ctx, model, c => pool(c,
    b.x + Math.sin(p * TAU + offset) * b.w * .38,
    b.y - b.s * .12, Math.max(b.s, b.w * width), b.s * .8, color, opacity));
}

function star(ctx, x, y, radius, color, alpha) {
  ctx.save?.();
  ctx.globalAlpha = (ctx.globalAlpha ?? 1) * alpha;
  ctx.fillStyle = color;
  ctx.beginPath?.();
  ctx.moveTo?.(x, y - radius);
  ctx.quadraticCurveTo?.(x + radius * .16, y - radius * .16, x + radius, y);
  ctx.quadraticCurveTo?.(x + radius * .16, y + radius * .16, x, y + radius);
  ctx.quadraticCurveTo?.(x - radius * .16, y + radius * .16, x - radius, y);
  ctx.quadraticCurveTo?.(x - radius * .16, y - radius * .16, x, y - radius);
  ctx.fill?.();
  ctx.restore?.();
}

// Seeded points stay fixed to the lettering. Only their light changes; there is
// no particle spray, name movement, random flicker, or frame-dependent spawning.
function specks(ctx, model, p, { count = 90, color = '#FFFFFF', radius = .65, strength = .85, stars = false, seed = 0 } = {}) {
  const b = bounds(model);
  withTextMask(ctx, model, c => {
    for (let i = 0; i < count; i++) {
      const n = index => sample(model.seed + seed, i * 7 + index);
      const x = b.l + n(0) * b.w;
      const y = b.t + n(1) * b.s;
      const pulse = Math.pow(.5 + .5 * Math.sin(p * TAU * 2 + n(2) * TAU), 3);
      const alpha = strength * (.16 + .84 * pulse);
      const r = radius * (.6 + n(3)) * b.s / 38;
      if (stars && i % 4 === 0) star(c, x, y, r * 2.4, color, alpha);
      else {
        c.fillStyle = rgba(color, alpha);
        c.beginPath?.();c.arc?.(x, y, Math.max(.3, r), 0, TAU);c.fill?.();
      }
    }
  });
}

function rim(ctx, model, color, width = .65) {
  strokeText(ctx, model, color, Math.max(.45, bounds(model).s / 38 * width));
}

function glints(ctx, model, p, color, count = 3, round = false) {
  const b = bounds(model);
  for (let i = 0; i < count; i++) {
    const x = b.l + b.w * (.14 + i * .71 / Math.max(1, count - 1));
    const y = b.y + b.s * (i % 2 ? .34 : -.44);
    const pulse = Math.pow(.5 + .5 * Math.sin(p * TAU * 2 + i * 2.3), 4);
    const r = (1.5 + pulse * 4.5) * Math.max(.8, b.s / 38);
    pool(ctx, x, y, r * 2.3, r * 2.3, color, pulse * .35);
    if (round) {
      ctx.fillStyle = rgba('#FFFFFF', pulse * .9);
      ctx.beginPath?.();ctx.arc?.(x, y, r * .4, 0, TAU);ctx.fill?.();
    } else star(ctx, x, y, r, '#FFFFFF', pulse * .92);
  }
}

function dewdrop(ctx, model, p) {
  face(ctx, model, ['#E8FFFF', '#58CBD8', '#B8FFF1']);
  light(ctx, model, p, '#FFFFFF', .16, .9);
  rim(ctx, model, '#73D5EF', .7);
  // A very small upper highlight gives the glass a rounded, wet edge.
  strokeText(ctx, model, 'rgba(239,255,255,.72)', .55, 1, 0, -.55);
  glints(ctx, model, p, '#CFFFF6', 2, true);
  bloom(ctx, model, '#13E9D0', .16, .45);
}

function velvetLight(ctx, model, p) {
  face(ctx, model, ['#E9CEFF', '#B578FF', '#F0ADFF']);
  light(ctx, model, p, '#FFB1F3', .38, .65);
  // Colored soft edges, with no outline or hard specular band.
  bloom(ctx, model, '#A02BFF', .37, .85);
  bloom(ctx, model, '#EB72FF', .1, .55);
}

function neonRose(ctx, model, p) {
  const s = bounds(model).s;
  drawText(ctx, model, '#D749A3');
  strokeText(ctx, model, '#FF53C8', s * .072);
  strokeText(ctx, model, '#FFE4F6', Math.max(.65, s * .025));
  light(ctx, model, p, '#FFF5FF', .13, .65);
  bloom(ctx, model, '#FF169F', .32, .66 + .13 * Math.sin(p * TAU));
}

function rosewater(ctx, model, p) {
  face(ctx, model, ['#FFD4EA', '#EC639C', '#FFACD0']);
  light(ctx, model, p, '#FFEDE3', .4, .7, 1);
  specks(ctx, model, p, { count: 260, color: '#FFF4EE', radius: .9, strength: 1 });
  bloom(ctx, model, '#FF619B', .17, .55);
}

function sunshine(ctx, model, p) {
  face(ctx, model, ['#FFFFDF', '#FFE35C', '#FFB765']);
  light(ctx, model, p, '#FFFFF1', .22, .95, .7);
  specks(ctx, model, p, { count: 35, color: '#FFFFFF', stars: true, radius: 1.1 });
  glints(ctx, model, p, '#FFF2AB', 3);
  bloom(ctx, model, '#FFB82E', .27, .68);
}

function blueFlame(ctx, model, p) {
  const b = bounds(model);
  face(ctx, model, ['#B4D7FF', '#75A5FF', '#B5BDFF']);
  // A soft cascade lights whole letters, without a scanner line or moving text.
  const glyphs = getNameGlyphLayout(ctx, model);
  withTextMask(ctx, model, c => {
    for (let i = 0; i < glyphs.length; i++) {
      const glyph = glyphs[i];
      const pulse = Math.pow(.5 + .5 * Math.sin(p * TAU - i * .65), 2);
      pool(c, glyph.center, b.y, Math.max(2, glyph.width * .8), b.s * .7, '#FFFFFF', .9 * pulse);
    }
  });
  rim(ctx, model, '#5A8EFF', 1.2);
  bloom(ctx, model, '#165DFF', .32, .9);
  bloom(ctx, model, '#51C7FF', .08, .75);
}

function silverdust(ctx, model, p) {
  face(ctx, model, ['#FFFFFF', '#D8E3FF', '#F7F5FF']);
  specks(ctx, model, p, { count: 125, color: '#728DEB', radius: .52, strength: .5 });
  specks(ctx, model, p, { count: 70, color: '#FFFFFF', radius: 1.3, stars: true, seed: 419 });
  glints(ctx, model, p, '#DCE5FF', 4);
  rim(ctx, model, '#ACBDEB', .55);
  bloom(ctx, model, '#C2D4FF', .19, .55);
}

function pixie(ctx, model, p) {
  face(ctx, model, ['#F5FFD0', '#BDF778', '#6BEBB2']);
  specks(ctx, model, p, { count: 230, color: '#F9FFE7', radius: .95, strength: 1 });
  glints(ctx, model, p, '#D1FFB0', 5, true);
  light(ctx, model, p, '#F6FFB2', .16, .65);
  bloom(ctx, model, '#96FF58', .19, .58);
}

function opaline(ctx, model, p) {
  const b = bounds(model), a = p * TAU;
  face(ctx, model, ['#FEF5FF', '#DACBFF', '#D5FFFF']);
  withTextMask(ctx, model, c => {
    pool(c, b.l + b.w * (.3 + .2 * Math.sin(a)), b.y, b.w * .38, b.s, '#FF8FD9', .78);
    pool(c, b.l + b.w * (.65 + .18 * Math.cos(a)), b.y, b.w * .32, b.s, '#68FFE4', .76);
    pool(c, b.l + b.w * (.5 + .17 * Math.sin(a + 2)), b.y - b.s * .3, b.w * .22, b.s * .4, '#FFFFFF', .85);
  });
  rim(ctx, model, '#DBCFFF', .6);
  bloom(ctx, model, '#B79EFF', .15, .4);
}

function spectrum(ctx, model, p) {
  const b = bounds(model), a = p * TAU;
  // Broad, softly blended colors. The rainbow rolls through the face without
  // moving a stripe or a dividing line across the letters.
  const colors = Array.from({ length: 9 }, (_, i) => `hsl(${(i * 43 + Math.sin(a) * 50 + 300) % 360} 96% 76%)`);
  drawText(ctx, model, gradient(ctx, colors, b.l, b.t, b.l + b.w, b.t + b.s * .35));
  light(ctx, model, p, '#FFFFFF', .17, .38, .5);
  bloom(ctx, model, '#DC8CFF', .12, .38);
}

function aurora(ctx, model, p) {
  const b = bounds(model), a = p * TAU;
  face(ctx, model, ['#B9FFDC', '#42DFAE', '#9AA8FF']);
  withTextMask(ctx, model, c => {
    for (let i = 0; i < 5; i++) {
      const x = b.l + b.w * (i / 4 + Math.sin(a + i) * .08);
      pool(c, x, b.y + Math.sin(a + i * 2) * b.s * .22, b.w * .17, b.s * .7,
        i % 2 ? '#93B8FF' : '#D7FFE4', .65);
    }
  });
  bloom(ctx, model, '#2CE7AA', .2, .65);
}

function peachFizz(ctx, model, p) {
  const b = bounds(model), a = p * TAU;
  face(ctx, model, ['#FFE5B4', '#FF9A91', '#F573AE']);
  withTextMask(ctx, model, c => {
    for (let i = 0; i < 45; i++) {
      const x = b.l + sample(model.seed, i + 600) * b.w;
      const y = b.t + sample(model.seed, i + 660) * b.s + Math.sin(a + i) * b.s * .08;
      const r = b.s * (.025 + sample(model.seed, i + 710) * .04);
      c.strokeStyle = rgba('#FFF7DB', .32 + .6 * (.5 + .5 * Math.sin(a + i * 2)));
      c.lineWidth = .7;c.beginPath?.();c.arc?.(x, y, r, 0, TAU);c.stroke?.();
    }
  });
  bloom(ctx, model, '#FF9D91', .17, .5);
}

function lagoon(ctx, model, p) {
  const b = bounds(model), a = p * TAU;
  face(ctx, model, ['#91F5EB', '#27BCD5', '#65A4FF']);
  withTextMask(ctx, model, c => {
    for (let i = 0; i < 12; i++) {
      const x = b.l + b.w * (i / 11 + Math.sin(a + i * 2) * .035);
      const y = b.y + Math.cos(a + i * 1.7) * b.s * .23;
      pool(c, x, y, b.s * .27, b.s * .24, '#E1FFFF', .95);
    }
  });
  rim(ctx, model, '#80E9F9', .6);
  bloom(ctx, model, '#14CDFF', .13, .55);
}

function frost(ctx, model, p) {
  face(ctx, model, ['#FFFFFF', '#D4FAFF', '#91E2FF']);
  rim(ctx, model, '#5DBEEB', .85);
  specks(ctx, model, p, { count: 280, color: '#538DDF', radius: .7, strength: .65 });
  specks(ctx, model, p, { count: 80, color: '#FFFFFF', radius: 1.1, stars: true, seed: 99 });
  strokeText(ctx, model, '#EDFFFF', .65, .8, 0, -.6);
  glints(ctx, model, p, '#BDFBFF', 2);
  bloom(ctx, model, '#66DFFF', .1, .52);
}

function sugar(ctx, model, p) {
  const b = bounds(model);
  strokeText(ctx, model, '#DA67B0', b.s * .07, .9, 0, b.s * .025);
  face(ctx, model, ['#FFF1FA', '#FFB9E2', '#F383C8', '#FFD3E9']);
  light(ctx, model, p, '#FFFFFF', .18, .78);
  strokeText(ctx, model, 'rgba(255,246,253,.65)', .65, 1, 0, -.55);
  bloom(ctx, model, '#FF8BD7', .12, .5);
}

function cosmic(ctx, model, p) {
  const b = bounds(model), a = p * TAU;
  face(ctx, model, ['#B3A0FF', '#7966D3', '#A4BDFF']);
  withTextMask(ctx, model, c => {
    pool(c, b.x + Math.sin(a) * b.w * .28, b.y, b.w * .28, b.s * .65, '#FF8FE5', .72);
    pool(c, b.x + Math.cos(a) * b.w * .25, b.y, b.w * .2, b.s * .6, '#71ECFF', .7);
  });
  specks(ctx, model, p, { count: 88, color: '#FFFFFF', radius: .9, stars: true });
  glints(ctx, model, p, '#C5B8FF', 4);
  bloom(ctx, model, '#9465FF', .25, .7);
}

function moonstone(ctx, model, p) {
  face(ctx, model, ['#FFFFFF', '#E4E0FF', '#BCBAF2', '#F4ECFF']);
  light(ctx, model, p, '#FFFFFF', .4, .85);
  rim(ctx, model, '#B3AFE4', .7);
  // A quiet pearlescent edge has a different silhouette from the broad blooms.
  strokeText(ctx, model, 'rgba(250,248,255,.9)', .6, 1, -.35, -.6);
  bloom(ctx, model, '#B9ACFF', .085, .48);
}

function jelly(ctx, model, p) {
  const b = bounds(model), a = p * TAU;
  // Two colored light sources frame a white face. This is a soft optical halo,
  // distinct from the solid colored blooms and the outlined neon treatment.
  face(ctx, model, ['#FFFFFF', '#F8ECFF', '#FFFFFF']);
  ctx.save?.();
  ctx.globalCompositeOperation = 'destination-over';
  ctx.shadowBlur = b.s * .2;
  ctx.shadowColor = '#FF76D1';
  drawText(ctx, model, '#FF94DB', .7, -b.s * (.024 + .008 * Math.sin(a)), 0);
  ctx.shadowColor = '#6DDFFF';
  drawText(ctx, model, '#8BE6FF', .7, b.s * (.024 + .008 * Math.cos(a)), 0);
  ctx.restore?.();
}

const finishes = {
  'glass-emboss': dewdrop, 'carbon-cut': velvetLight, 'neon-tube': neonRose,
  'velvet-ink': rosewater, 'engraved-stone': sunshine, 'blueprint-ink': blueFlame,
  'mercury-polish': silverdust, 'gilded-leaf': pixie, 'opal-lustre': opaline,
  'prism-dispersion': spectrum, 'aurora-weave': aurora, 'ember-enamel': peachFizz,
  'ocean-caustic': lagoon, 'glacier-cut': frost, 'rose-satin': sugar,
  'stardust-ink': cosmic, 'porcelain-lacquer': moonstone, 'candy-shell': jelly
};

export function drawLuminousMaterial(ctx, model) {
  const finish = finishes[model.material.key];
  if (!finish) return false;
  // Motion has its own seed. Material grain must not reshuffle when a motion
  // starts, ends, or changes; quiet motion frames must equal Still exactly.
  const seed = Math.round(seededNoise(`${model.font.key}:${model.material.key}:${model.displayText}`) * 4294967295);
  ctx.save?.();
  finish(ctx, { ...model, seed }, model.materialProgress ?? .32);
  // A fractional keyline keeps pale faces readable on light profile surfaces.
  // It sits beneath the artwork; it never darkens a face or masks a sparkle.
  ctx.globalCompositeOperation = 'destination-over';
  strokeText(ctx, model, 'rgba(44,37,75,.6)', Math.max(.65, model.metrics.fontSize * .03));
  ctx.restore?.();
  return true;
}
