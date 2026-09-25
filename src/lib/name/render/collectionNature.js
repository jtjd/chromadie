import {
  TAU,
  clamp,
  createLinearGradient,
  dot,
  easeInOut,
  easeOut,
  fill,
  glow,
  mixColors,
  oval,
  phase,
  rgba,
  stroke
} from './collectionArt.js';

const smooth = value => value * value * (3 - 2 * value);
const mix = (start, end, amount) => start + (end - start) * amount;
const visible = (p, start, end, edge = 0.07) =>
  smooth(clamp((p - start) / edge)) * (1 - smooth(clamp((p - end) / edge)));

function petal(ctx, width, length, colors, alpha = 1) {
  const shade = createLinearGradient(ctx, [
    rgba(colors[0], 0.94), rgba(colors[1], 1), rgba(colors[2], 0.88)
  ], -width, length * 0.15, width, -length * 0.45, colors[1]);
  fill(ctx, shade, alpha, c => {
    c.moveTo(0, length * 0.46);
    c.bezierCurveTo(-width * 0.42, length * 0.28, -width, -length * 0.1, -width * 0.89, -length * 0.58);
    c.bezierCurveTo(-width * 0.79, -length * 0.92, -width * 0.22, -length * 0.96, 0, -length * 0.69);
    c.bezierCurveTo(width * 0.2, -length * 0.99, width * 0.82, -length * 0.87, width * 0.9, -length * 0.48);
    c.bezierCurveTo(width, -length * 0.03, width * 0.42, length * 0.34, 0, length * 0.46);
    c.closePath();
  });
  stroke(ctx, rgba(colors[2], 0.62), 0.65, alpha * 0.78, c => {
    c.moveTo(0, length * 0.35);
    c.quadraticCurveTo(-width * 0.06, -length * 0.02, 0, -length * 0.66);
  });
  stroke(ctx, rgba('#FFFFFF', 0.76), 0.72, alpha * 0.7, c => {
    c.moveTo(-width * 0.07, -length * 0.28);
    c.quadraticCurveTo(-width * 0.38, -length * 0.64, -width * 0.55, -length * 0.64);
  });
}

function leaf(ctx, length, breadth, colors, alpha = 1) {
  const shade = createLinearGradient(ctx, [
    rgba(colors[0], 0.94), rgba(colors[1], 1), rgba(colors[2], 0.92)
  ], 0, -breadth, length, breadth, colors[1]);
  fill(ctx, shade, alpha, c => {
    c.moveTo(0, 0);
    c.bezierCurveTo(length * 0.19, -breadth * 0.94, length * 0.59, -breadth * 1.14, length, 0);
    c.bezierCurveTo(length * 0.66, breadth * 0.85, length * 0.24, breadth * 0.58, 0, 0);
    c.closePath();
  });
  stroke(ctx, rgba(colors[2], 0.82), 0.72, alpha * 0.9, c => {
    c.moveTo(1, 0); c.quadraticCurveTo(length * 0.43, -breadth * 0.08, length * 0.93, -breadth * 0.02);
  });
  stroke(ctx, rgba('#E6FFD1', 0.76), 0.6, alpha * 0.78, c => {
    c.moveTo(length * 0.38, 0); c.quadraticCurveTo(length * 0.48, -breadth * 0.42, length * 0.65, -breadth * 0.6);
    c.moveTo(length * 0.58, 0); c.quadraticCurveTo(length * 0.69, breadth * 0.34, length * 0.81, breadth * 0.4);
  });
}

function sakuraBranch(ctx, width, growth, p) {
  const reach = easeOut(growth);
  const breeze = Math.sin(p * TAU * .8) * .6;
  stroke(ctx, '#75424E', 2.2, reach, c => {
    c.moveTo(-width * .5, 29);
    c.bezierCurveTo(-width * .39, 23, -width * .26, 26, -width * .1, 18 + breeze);
  });
  stroke(ctx, '#D69395', .6, reach * .9, c => {
    c.moveTo(-width * .5, 28); c.quadraticCurveTo(-width * .27, 23, -width * .1, 17.5 + breeze);
  });
  stroke(ctx, '#98606A', 1.1, reach, c => {
    c.moveTo(-width * .32, 25); c.quadraticCurveTo(-width * .35, 22, -width * .34, 17);
    c.moveTo(-width * .22, 22); c.quadraticCurveTo(-width * .16, 26, -width * .09, 25);
  });
  ctx.save(); ctx.translate(-width * .34, 17); ctx.rotate(-.3);
  petal(ctx, 3.8, 6, ['#B93665','#FFC9DA','#F881A4'], reach); ctx.restore();
  return reach;
}

function driftingPetal(ctx, width, p, design) {
  const q = phase(p, design.start, design.end);
  const arrive = easeInOut(q);
  const alpha = visible(p, design.start, design.end + 0.035, 0.075);
  if (alpha <= 0.01) return;
  const x = mix(design.fromX * width, design.toX * width, arrive)
    + Math.sin(q * Math.PI) * design.side;
  const y = mix(design.fromY, design.toY, arrive)
    - Math.sin(q * Math.PI) * design.lift;
  const flutter = Math.sin(q * TAU * design.flutters + design.offset) * (0.42 * (1 - q) + 0.07);
  const angle = design.angle + flutter + q * design.turn;
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(design.squash, 1);
  petal(ctx, design.width, design.length, design.colors, alpha);
  ctx.restore();
}

export function cherryBlossom(ctx, model, width) {
  const p = clamp(model.progress);
  const growth = clamp((p - 0.03) / 0.31);
  const branch = sakuraBranch(ctx, width, growth, p);
  const bloomX = -width * 0.19;
  const bloomY = 20.3;
  const breath = 1 + Math.sin(p * TAU * 1.15) * 0.035;

  // One small attached cluster: the petals overlap like a blossom caught on the branch.
  ctx.save(); ctx.translate(bloomX, bloomY); ctx.scale(breath, breath);
  const attached = [
    [-3.2, -2.3, -0.6, 1], [3.1, -2, 0.62, .96], [3.3, 2.5, 2, .9], [-2.8, 3, -2, .9], [0, 0, .12, .7]
  ];
  attached.forEach(([x, y, angle, scale], index) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
    petal(ctx, 5.1, 7.3, index === 1 ? ['#DF4C79', '#FFADC6', '#F2789A'] : ['#E8688D', '#FFE1E8', '#F18FA8'], branch * 0.96);
    ctx.restore();
  });
  dot(ctx, 0.2, -0.2, 1.25, '#F4B54E', branch * 0.94);
  stroke(ctx, '#FFE8A5', 0.62, branch * 0.85, c => {
    c.moveTo(0, -0.5); c.lineTo(2.5, -2.3); c.moveTo(0, -0.2); c.lineTo(-2.2, -2.1);
  });
  ctx.restore();

  const scattered = [
    { start: 0.1, end: 0.65, fromX: -0.44, toX: 0.29, fromY: 22, toY: 23, side: 5.5, lift: 4.2, flutters: 0.82, offset: 0.4, angle: -0.4, turn: 5.7, squash: 1, width: 4.1, length: 6.4, colors: ['#DD4B7A', '#FFD4E1', '#F283A1'] },
    { start: 0.22, end: 0.76, fromX: -0.18, toX: 0.43, fromY: 20, toY: 24, side: -4.5, lift: 3.4, flutters: 1.05, offset: 2, angle: 0.9, turn: -5.2, squash: 0.88, width: 4.4, length: 6.7, colors: ['#CB3B69', '#FFC0D2', '#EF7395'] },
    { start: 0.34, end: 0.79, fromX: 0.2, toX: -0.16, fromY: 17, toY: 22, side: 6.2, lift: 2.5, flutters: 1.2, offset: 4.1, angle: 0.25, turn: 6.1, squash: 1.05, width: 3.6, length: 5.9, colors: ['#E95A84', '#FFF0F1', '#F58AA5'] }
  ];
  scattered.forEach(item => driftingPetal(ctx, width, p, item));
}

function butterflyWing(ctx, upper, palette, flap) {
  const span = upper ? 1 : 0.74;
  ctx.save();
  ctx.scale(.22 + .78 * Math.abs(Math.cos(flap)), 1);
  const wing = createLinearGradient(ctx, [
    rgba(palette[0], 0.92), rgba(palette[1], 0.98), rgba(palette[2], 0.92)
  ], -17 * span, -10, 1, 9, palette[1]);
  fill(ctx, wing, 0.98, c => {
    c.moveTo(0, 0);
    if (upper) {
      c.bezierCurveTo(-3, -6, -5, -14, -11, -13.5);
      c.bezierCurveTo(-19, -13, -17, -4, -11, 1);
      c.bezierCurveTo(-7, 4, -3, 3, 0, 1);
    } else {
      c.bezierCurveTo(-4, 0, -7, 3, -10, 4);
      c.bezierCurveTo(-14, 7, -12, 11, -7, 10);
      c.bezierCurveTo(-2, 9, -1, 5, 0, 1);
    }
    c.closePath();
  });
  stroke(ctx, rgba(palette[3], 0.86), 0.76, 0.94, c => {
    c.moveTo(-1, 1);
    if (upper) {
      c.quadraticCurveTo(-8, -5, -14, -10);
      c.moveTo(-3, 1); c.quadraticCurveTo(-9, -1, -16, -5);
      c.moveTo(-4, 1); c.quadraticCurveTo(-8, -7, -9, -12);
    } else {
      c.quadraticCurveTo(-7, 5, -10, 9);
      c.moveTo(-3, 2); c.quadraticCurveTo(-7, 4, -12, 6);
    }
  });
  dot(ctx, -8 * span, upper ? -6 : 8, upper ? 1.3 : 1.05, rgba(palette[3], 0.88), 0.95);
  ctx.restore();
}

function butterfly(ctx, x, y, angle, flap, scale) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
  ctx.save(); butterflyWing(ctx, true, ['#7D3CC4', '#FC71C7', '#EAFDFF', '#7CF3E6'], flap); ctx.restore();
  ctx.save(); ctx.scale(-1, 1); butterflyWing(ctx, true, ['#7D3CC4', '#FC71C7', '#EAFDFF', '#7CF3E6'], flap * 0.94); ctx.restore();
  ctx.save(); butterflyWing(ctx, false, ['#5A42B7', '#FFAD65', '#FFEDC3', '#A8FFF1'], flap * 0.86); ctx.restore();
  ctx.save(); ctx.scale(-1, 1); butterflyWing(ctx, false, ['#5A42B7', '#FFAD65', '#FFEDC3', '#A8FFF1'], flap * 0.9); ctx.restore();
  stroke(ctx, '#321D52', 2.4, 0.98, c => { c.moveTo(0, -5); c.quadraticCurveTo(1.3, 1, 0, 8); });
  stroke(ctx, '#F9F4D9', 0.72, 0.9, c => { c.moveTo(-0.4, -4); c.lineTo(-0.8, 5); });
  stroke(ctx, '#39214F', 0.72, 0.96, c => {
    c.moveTo(0, -4); c.quadraticCurveTo(-3, -9, -5.5, -10);
    c.moveTo(0, -4); c.quadraticCurveTo(3, -9, 5.5, -10);
  });
  dot(ctx, 0, -2.5, 1.45, '#FCE9B0', 0.98);
  ctx.restore();
}

function butterflyPath(t, width) {
  const q = clamp(t);
  const x = -width * 0.47 + width * 0.91 * q + Math.sin(q * TAU * 1.35) * 7 * Math.sin(Math.PI * q);
  const y = -20.4 - Math.sin(q * Math.PI) * 2 + Math.sin(q * TAU * 2.15) * 0.6;
  return [x, y];
}

export function butterflyKiss(ctx, model, width) {
  const p = clamp(model.progress);
  const q = p < .38 ? easeInOut(phase(p, .08, .38)) * .55
    : p < .56 ? .55 : .55 + easeInOut(phase(p, .56, .85)) * .45;
  const [x, y] = butterflyPath(q, width);
  const settled = visible(p, .33, .53, .05);
  const facing = Math.atan2(butterflyPath(Math.min(1, q + 0.012), width)[1] - y,
    butterflyPath(Math.min(1, q + 0.012), width)[0] - x);
  const flap = 0.12 + (1 - settled) * (0.18 + Math.abs(Math.sin(p * TAU * 5.4)) * 0.8);
  ctx.save(); ctx.globalAlpha *= visible(p, .04, .86, .07);
  butterfly(ctx, x, y, facing * 0.56, flap, 0.58 + settled * 0.03);
  ctx.restore();

  // The butterfly holds at one nectar point; a quiet pulse marks the landing.
  const landing = visible(p, .36, .55, .06);
  const [nectarX, nectarY] = butterflyPath(.55, width);
  glow(ctx, nectarX, nectarY, 6.2, '#91F1DE', landing * 0.5);
  dot(ctx, nectarX, nectarY, 1.55, '#FFE9B0', landing * (0.64 + 0.24 * Math.sin(p * TAU * 0.7)));
  stroke(ctx, '#FFF2CB', 0.68, landing * 0.75, c => {
    c.moveTo(nectarX - 2.2, nectarY - 0.3); c.lineTo(nectarX + 2, nectarY - 0.3);
    c.moveTo(nectarX, nectarY - 2.1); c.lineTo(nectarX, nectarY + 1.7);
  });
}

function pappus(ctx, size, alpha = 1, tone = '#FFF3C7') {
  const gold = '#DDAE54';
  const tips = [
    [-6.8, -2.4], [-5.7, -6.3], [-2.3, -8.2], [1.4, -7.5],
    [5.1, -5.1], [7.1, -1.1], [4.3, 0.4], [0.5, 1.2], [-3.5, 0.3]
  ];
  stroke(ctx, rgba(tone, 0.94), Math.max(0.48, size * 0.12), alpha * 0.9, c => {
    tips.forEach(([x, y], index) => {
      const sx = x * size * 0.54;
      const sy = y * size * 0.54;
      c.moveTo(0, 0);
      c.quadraticCurveTo(sx * 0.48 + (index % 2 ? 0.5 : -0.6), sy * 0.48 - 1, sx, sy);
    });
  });
  tips.slice(1, 6).forEach(([x, y], index) => {
    const sx = x * size * 0.54;
    const sy = y * size * 0.54;
    stroke(ctx, rgba('#FFFBEA', 0.75), 0.5, alpha * 0.72, c => {
      c.moveTo(sx * 0.68, sy * 0.72); c.lineTo(sx + (index - 2) * 0.72, sy - 1.8);
    });
  });
  stroke(ctx, gold, Math.max(0.6, size * 0.15), alpha, c => {
    c.moveTo(0, 0); c.quadraticCurveTo(1.5 * size, 1.2 * size, 1.2 * size, 4.2 * size);
  });
  dot(ctx, 1.2 * size, 4.2 * size, Math.max(0.8, size * 0.66), '#C98D37', alpha);
  dot(ctx, 0.6 * size, 4 * size, Math.max(0.35, size * 0.28), '#FFE29B', alpha * 0.9);
}

function dandelionHead(ctx, x, y, fullness, sway) {
  const seeds = [
    [-10, -2, 0.74], [-8, -8, 0.82], [-3.5, -11, 0.82], [2, -9.8, 0.72],
    [7.5, -7.6, 0.8], [10, -1.5, 0.75], [5.4, 2.3, 0.64], [-2, 3.5, 0.74], [-7, 1.8, 0.68]
  ];
  seeds.forEach(([dx, dy, scale], index) => {
    const gone = index === 4 ? 1 - fullness * 0.82 : 1;
    const a = clamp(gone * fullness);
    if (a < 0.02) return;
    ctx.save(); ctx.translate(x + dx + sway * (dy / 16), y + dy); ctx.rotate((dx + dy) * 0.025);
    pappus(ctx, scale, a, index % 3 === 0 ? '#FFF9DE' : '#F7E9B7');
    ctx.restore();
  });
  dot(ctx, x, y + 1.3, 2.25, '#B98635', fullness * 0.94);
}

export function dandelionWish(ctx, model, width) {
  const p = clamp(model.progress);
  const headX = -width * 0.38;
  const headY = -19;
  const stem = easeOut(clamp((p - 0.01) / 0.3));
  const wind = Math.sin(p * TAU * 0.8) * 1.4;
  stroke(ctx, '#507B43', 4.1, 0.28 * stem, c => {
    c.moveTo(headX - 2, headY + 1); c.bezierCurveTo(headX - 5, -1, headX - width * 0.06, 11, headX - 4, 28);
  });
  stroke(ctx, '#8AC56F', 1.8, 0.94 * stem, c => {
    c.moveTo(headX - 1, headY + 1); c.bezierCurveTo(headX - 3, -1, headX - width * 0.04, 11, headX - 4, 28);
  });
  stroke(ctx, '#C6E88E', 0.68, 0.72 * stem, c => {
    c.moveTo(headX + 0.2, headY + 3); c.quadraticCurveTo(headX - 1, 5, headX - 3, 23);
  });
  ctx.save(); ctx.translate(headX - width * 0.04, 17); ctx.rotate(-0.3 + wind * 0.05);
  leaf(ctx, 11, 3.1, ['#397B51', '#A9D96D', '#D9EF9B'], stem * 0.92);
  ctx.restore();

  const travel = easeInOut(phase(p, 0.2, 0.82));
  const trailAlpha = visible(p, 0.18, 0.87, 0.09);
  const heroX = mix(headX + 2, width * 0.45, travel) + Math.sin(travel * Math.PI * 1.5) * 4.4;
  const heroY = mix(headY - 3, -24, travel) - Math.sin(travel * Math.PI) * 2 + Math.sin(travel * TAU) * 0.8;
  const spin = travel * 2.2 + Math.sin(p * TAU * 2.4) * 0.12;
  ctx.save(); ctx.translate(heroX, heroY); ctx.rotate(spin); ctx.scale(0.8, 0.8);
  pappus(ctx, 0.78, trailAlpha, '#FFF2BF');
  ctx.restore();

  const support = [
    { start: 0.37, end: 0.8, x0: -0.36, x1: -0.03, y0: -17, y1: -23, arch: 1.8, spin: -1.9, size: 0.53 },
    { start: 0.49, end: 0.83, x0: -0.36, x1: 0.25, y0: -19, y1: -21, arch: 2.1, spin: 2.8, size: 0.46 }
  ];
  support.forEach((seed, index) => {
    const q = easeInOut(phase(p, seed.start, seed.end));
    const alpha = visible(p, seed.start, seed.end + 0.025, 0.075);
    if (alpha < 0.02) return;
    const x = mix(seed.x0 * width, seed.x1 * width, q) + Math.sin(q * Math.PI) * (index ? 5 : -4);
    const y = mix(seed.y0, seed.y1, q) - Math.sin(q * Math.PI) * seed.arch;
    ctx.save(); ctx.translate(x, y); ctx.rotate(q * seed.spin);
    pappus(ctx, seed.size, alpha, '#FFF6D4');
    ctx.restore();
  });
  dandelionHead(ctx, headX + wind, headY + wind * 0.28, 1 - travel * 0.34, wind);
}

function roseLeaf(ctx, length, breadth, angle, palette, alpha) {
  ctx.save(); ctx.rotate(angle); leaf(ctx, length, breadth, palette, alpha); ctx.restore();
}

function roseBloom(ctx, openness, palette, breathe) {
  ctx.save(); ctx.scale(0.94 + breathe * 0.06, 0.94 + breathe * 0.06);
  const fade = openness;
  const back = createLinearGradient(ctx, [rgba(palette[0], 0.95), rgba(palette[1], 0.98), rgba(palette[2], 0.9)], -14, -9, 12, 8, palette[1]);
  fill(ctx, back, fade, c => {
    c.moveTo(-2, 7);
    c.bezierCurveTo(-12, 8, -18, 0, -14, -6);
    c.bezierCurveTo(-13, -12, -6, -12, -3, -7);
    c.bezierCurveTo(1, -16, 10, -13, 8, -6);
    c.bezierCurveTo(17, -8, 19, 0, 12, 5);
    c.bezierCurveTo(7, 10, 2, 8, -2, 7); c.closePath();
  });
  stroke(ctx, rgba('#78234A', 0.66), 0.9, fade * 0.85, c => {
    c.moveTo(-13, -4); c.quadraticCurveTo(-8, 1, -3, 4);
    c.moveTo(9, -6); c.quadraticCurveTo(5, 1, 1, 5);
  });
  const lobes = [
    { x: -7, y: -1, a: -0.58, sx: 0.88, sy: 0.77, c: palette[0] },
    { x: 5.6, y: 0.1, a: 0.55, sx: 0.92, sy: 0.8, c: palette[1] },
    { x: -0.8, y: -4.2, a: -0.06, sx: 0.78, sy: 0.93, c: palette[2] }
  ];
  lobes.forEach((lobe, index) => {
    const unfold = easeOut(clamp((openness - index * 0.13) / 0.65));
    ctx.save(); ctx.translate(lobe.x * unfold, lobe.y * unfold); ctx.rotate(lobe.a);
    ctx.scale(lobe.sx * unfold, lobe.sy * unfold);
    fill(ctx, createLinearGradient(ctx, [rgba(palette[0], 0.9), rgba(lobe.c, 1), rgba(palette[1], 0.88)], -8, 1, 6, -9, lobe.c), fade, c => {
      c.moveTo(-1, 7);
      c.bezierCurveTo(-10, 4, -10, -3, -5, -8);
      c.bezierCurveTo(-1, -12, 4, -7, 4, -3);
      c.bezierCurveTo(8, -6, 12, 0, 7, 5);
      c.bezierCurveTo(4, 8, 1, 8, -1, 7); c.closePath();
    });
    stroke(ctx, rgba('#FFE9C6', 0.84), 0.72, fade * 0.74, c => {
      c.moveTo(-6, -3); c.quadraticCurveTo(-1, -7, 3, -5);
    });
    ctx.restore();
  });
  stroke(ctx, '#FFE1AE', 0.68, fade * 0.86, c => {
    c.moveTo(-1.5, 2.1); c.quadraticCurveTo(-3, -3, 1, -6.2); c.quadraticCurveTo(4, -8, 6, -4);
  });
  dot(ctx, -0.5, 3.2, 1.7, '#FFDB80', fade * 0.96);
  ctx.restore();
}

export function roseRomance(ctx, model, width) {
  const p = clamp(model.progress);
  const grow = easeOut(phase(p, 0.04, 0.62));
  const sway = Math.sin(p * TAU * 0.82) * 1.5;
  const stemEnd = mix(-width * 0.52, width * 0.38, grow);
  const palette = ['#A91D50', '#FF587B', '#FFC0A6'];

  stroke(ctx, '#3E693E', 4.4, 0.3 * grow, c => {
    c.moveTo(-width * 0.54, 28); c.bezierCurveTo(-width * 0.3, 14, -width * 0.06, 31, stemEnd, 14 + sway);
  });
  stroke(ctx, '#62A95D', 1.9, 0.98 * grow, c => {
    c.moveTo(-width * 0.54, 27); c.bezierCurveTo(-width * 0.3, 13, -width * 0.06, 30, stemEnd, 13.2 + sway);
  });
  stroke(ctx, '#B8E583', 0.68, 0.78 * grow, c => {
    c.moveTo(-width * 0.5, 25.6); c.quadraticCurveTo(-width * 0.16, 25, stemEnd - 4, 13.5 + sway);
  });

  const leaves = [
    { x: -0.39, y: 20, angle: -0.86, length: 14.5, breadth: 4, t: 0.13, color: ['#317549', '#93D378', '#D1EC9D'] },
    { x: -0.13, y: 23, angle: 0.44, length: 12.5, breadth: 3.6, t: 0.29, color: ['#36794D', '#83CB72', '#D2E999'] },
    { x: 0.1, y: 20, angle: -0.98, length: 13.4, breadth: 4, t: 0.49, color: ['#2E7048', '#A0D979', '#D9EFA8'] }
  ];
  leaves.forEach((item, index) => {
    const reveal = easeOut(clamp((grow - item.t) / 0.19));
    if (reveal < 0.02) return;
    const x = item.x * width;
    const y = item.y + sway * (0.3 + index * 0.16);
    ctx.save(); ctx.translate(x, y); ctx.scale(reveal, reveal); roseLeaf(ctx, item.length, item.breadth, item.angle, item.color, reveal * 0.97); ctx.restore();
    if (index === 0 || index === 2) {
      stroke(ctx, '#E6B685', 0.7, reveal * 0.88, c => {
        c.moveTo(x - 2.1, y + 1); c.lineTo(x - 0.1, y - 3.2);
      });
    }
  });

  const thornPoints = [[-0.27, 20, -1], [0.01, 23, 1], [0.23, 17, -1]];
  thornPoints.forEach(([at, y, dir], index) => {
    const reveal = easeOut(clamp((grow - 0.2 - index * 0.1) / 0.2));
    const x = at * width;
    stroke(ctx, '#537E4A', 1.2, reveal * 0.85, c => {
      c.moveTo(x, y); c.quadraticCurveTo(x + dir * 1.5, y - 1.4, x + dir * 3.2, y - 4.4);
    });
  });

  const bloomX = width * 0.4;
  const bloomY = -18.2 + sway * 0.48;
  const rise = easeOut(phase(p, 0.1, 0.45));
  stroke(ctx, '#5C9B58', 2.2, 0.94 * rise, c => {
    c.moveTo(width * 0.31, 15 + sway); c.bezierCurveTo(width * 0.45, 5, width * 0.35, -12, bloomX, bloomY + 7);
  });
  // Sepals lift first; the cupped petals open in overlapping planes instead of a radial ring.
  const open = easeOut(phase(p, 0.2, 0.67));
  const sepalAlpha = rise * (1 - open * 0.18);
  const sepals = [
    [-6, 4, -0.72], [-1, 6.1, -0.15], [4.7, 4.8, 0.56], [8, 2, 0.92]
  ];
  sepals.forEach(([x, y, angle], index) => {
    ctx.save(); ctx.translate(bloomX + x, bloomY + y); ctx.rotate(angle);
    leaf(ctx, 7.5 + index * 0.3, 2.15, ['#3A814D', '#82C46A', '#C8E895'], sepalAlpha);
    ctx.restore();
  });
  const breathe = 0.5 + 0.5 * Math.sin(p * TAU * 0.72 + 0.4);
  ctx.save(); ctx.translate(bloomX, bloomY); ctx.rotate(0.08 + sway * 0.018);
  roseBloom(ctx, rise * open, palette, breathe);
  ctx.restore();
}

function featherShape(ctx, scale, alpha) {
  const length = 29 * scale;
  const breadth = 11 * scale;
  const body = createLinearGradient(ctx, [
    rgba('#19172F', 0.98), rgba('#55388B', 0.98), rgba('#168F91', 0.96), rgba('#252B59', 0.98)
  ], -length, -breadth, length, breadth, '#304B80');
  fill(ctx, body, alpha, c => {
    c.moveTo(-length, 0);
    c.bezierCurveTo(-length * 0.54, -breadth * 0.83, length * 0.3, -breadth * 1.38, length, -1.2 * scale);
    c.bezierCurveTo(length * 0.55, breadth * 0.72, -length * 0.14, breadth * 1.17, -length, 0);
    c.closePath();
  });
  const barbs = [
    [-0.72, 0.34, 1], [-0.55, 0.53, -1], [-0.38, 0.72, 1], [-0.2, 0.9, -1],
    [-0.03, 0.99, 1], [0.14, 0.96, -1], [0.31, 0.86, 1], [0.48, 0.7, -1],
    [0.64, 0.52, 1], [0.79, 0.3, -1]
  ];
  barbs.forEach(([t, reach, side], index) => {
    const x = t * length;
    const w = breadth * reach;
    const color = index % 3 === 0 ? '#54AAA7' : index % 3 === 1 ? '#8573B1' : '#377F85';
    stroke(ctx, color, 0.76 * scale, alpha * (0.58 + (index % 2) * 0.14), c => {
      c.moveTo(x, 0);
      c.quadraticCurveTo(x - side * w * 0.3, side * w * 0.4, x - side * w * 0.88, side * w);
    });
    if (index === 2 || index === 6 || index === 8) {
      stroke(ctx, '#C5FFF0', 0.48 * scale, alpha * 0.6, c => {
        c.moveTo(x - side * w * 0.42, side * w * 0.52);
        c.lineTo(x - side * w * 0.73, side * w * 0.71);
      });
    }
  });
  stroke(ctx, '#B5C7CF', .7 * scale, alpha, c => {
    c.moveTo(-length * 0.98, 0.3 * scale);
    c.bezierCurveTo(-length * 0.32, -0.2 * scale, length * 0.42, -0.6 * scale, length * 0.98, -1.15 * scale);
  });
  stroke(ctx, '#211A3B', 0.8 * scale, alpha * 0.8, c => {
    c.moveTo(-length * 0.99, 1.1 * scale); c.quadraticCurveTo(-length * 0.68, 2.5 * scale, -length * 0.42, 2.2 * scale);
  });
  stroke(ctx, '#9CDBCC', 0.65 * scale, alpha * 0.7, c => {
    c.moveTo(length * 0.76, -1.5 * scale); c.quadraticCurveTo(length * 0.95, -1.55 * scale, length * 1.04, -1.2 * scale);
  });
}

export function ravenFeather(ctx, model, width) {
  const p = clamp(model.progress);
  const q = easeInOut(phase(p, 0.1, 0.78));
  const x = mix(-width * 0.49, width * 0.36, q) + Math.sin(q * TAU * 1.1) * 5;
  const y = -19 + Math.sin(q * Math.PI) * 2.5 + Math.sin(p * TAU * 0.8) * 0.3;
  const bank = -.16 + Math.sin(q * TAU * .8) * .2;
  const scale = clamp(width / 128, 0.55, 1.08);
  const alpha = visible(p, 0.08, 0.94, 0.09);

  ctx.save(); ctx.translate(x, y); ctx.rotate(bank); featherShape(ctx, scale, alpha); ctx.restore();

  const glints = [
    { x: -0.2, y: -30, a: 0.2, s: 1.9 },
    { x: 0.22, y: -17, a: 0.84, s: 1.5 },
    { x: 0.46, y: -27, a: 0.62, s: 1.15 }
  ];
  glints.forEach((item, index) => {
    const gleam = Math.max(0, Math.sin((p * 0.8 + item.a) * Math.PI * 2)) * alpha;
    const gx = item.x * width;
    glow(ctx, gx, item.y, 5.5 + index * 0.5, '#65E6D3', gleam * 0.25);
    dot(ctx, gx, item.y, item.s, index === 1 ? '#B9A8FF' : '#B6FFF0', gleam * 0.88);
  });
}

export function laurelGrow(ctx, model, width) {
  const p = clamp(model.progress);
  const growth = easeOut(phase(p, .05, .74));
  const gold = smooth(phase(p, .66, .86));
  const tones = ['#23684D', '#6BCE83', '#CEF0A0'].map((color, i) =>
    mixColors(color, ['#996022', '#EABB4C', '#FFF0AD'][i], gold));
  for (const side of [-1, 1]) {
    const point = t => [side * width * .49 * Math.sin(t * Math.PI * .5), 27 - 47 * t];
    stroke(ctx, tones[0], 2.2, .92, c => {
      for (let i=0;i<=28;i++) { const [x,y]=point(growth*i/28); if(i) c.lineTo(x,y); else c.moveTo(x,y); }
    });
    stroke(ctx, tones[2], .65, .7, c => {
      for (let i=0;i<=28;i++) { const [x,y]=point(growth*i/28); if(i) c.lineTo(x,y-.5); else c.moveTo(x,y-.5); }
    });
    for (let i=0;i<6;i++) {
      const t = .14 + i * .145 + (side===1 ? .025 : 0);
      const unfold = easeOut(phase(growth, t, t+.12));
      if (!unfold) continue;
      const [x,y]=point(t);
      const angle = side===1 ? -.35-i*.15 : Math.PI+.35+i*.15;
      ctx.save(); ctx.translate(x,y); ctx.rotate(angle); ctx.scale(unfold,unfold);
      leaf(ctx, 10+(i%3)*1.4, 3.8, tones, .96); ctx.restore();
      if(i%2===0) {
        ctx.save(); ctx.translate(x,y-1); ctx.rotate(side===1 ? -2.2 : -1);
        ctx.scale(unfold*.8,unfold*.8); leaf(ctx,10,3.5,tones,.92); ctx.restore();
      }
    }
  }
  stroke(ctx, mixColors('#91DA93','#FFE49C',gold), 1.2, growth, c => {
    c.moveTo(-5,28); c.quadraticCurveTo(0,22,5,28);
  });
}

function firefly(ctx, x, y, heading, pulse, size = 1) {
  const glowSize = (4.5 + pulse * 1.2) * size;
  glow(ctx, x, y + 1, glowSize * 1.3, '#63DA8D', 0.15 + pulse * 0.22);
  glow(ctx, x, y + 1, glowSize * 0.72, '#FFE477', 0.2 + pulse * 0.3);
  ctx.save(); ctx.translate(x, y); ctx.rotate(heading); ctx.scale(size, size);
  // The paired wings beat off the thorax while the abdomen flashes beneath it.
  const wingLift = 2.2 + pulse * 2.1;
  fill(ctx, rgba('#8CEBD0', 0.78), 0.66, c => {
    c.moveTo(-1, -1); c.quadraticCurveTo(-4, -wingLift - 2, -8, -wingLift - 1);
    c.quadraticCurveTo(-7, -1, -2, 2); c.closePath();
    c.moveTo(1, -1); c.quadraticCurveTo(4, -wingLift - 2, 8, -wingLift - 1);
    c.quadraticCurveTo(7, -1, 2, 2); c.closePath();
  });
  stroke(ctx, '#C5FFF0', 0.62, 0.82, c => {
    c.moveTo(-1, 1); c.quadraticCurveTo(-5, -wingLift, -7, -wingLift - 1);
    c.moveTo(1, 1); c.quadraticCurveTo(5, -wingLift, 7, -wingLift - 1);
  });
  oval(ctx, -0.1, 0, 3.2, 1.55, 0, '#264C42', 0.96);
  dot(ctx, -1.35, -0.3, 1.15, '#BFF3BB', 0.98);
  oval(ctx, 2.4, 1, 2.65, 2.15, 0, '#FFE978', 0.78 + pulse * 0.22);
  dot(ctx, 2.55, 0.45, 1.1, '#FFFBE1', 0.92 * pulse);
  stroke(ctx, '#E4C95C', 0.58, 0.78, c => {
    c.moveTo(3, 2.7); c.quadraticCurveTo(1.2, 5, -1, 5.2);
  });
  ctx.restore();
}

function flightPath(which, t, width) {
  const q = clamp(t);
  if (which === 0) {
    return [
      -width * 0.45 + width * 0.85 * q + Math.sin(q * TAU * 1.35) * 5 * Math.sin(q * Math.PI),
      -20.3 + Math.sin(q * TAU * 1.4) * 1.6 - Math.sin(q * Math.PI) * 1.3
    ];
  }
  if (which === 1) {
    return [
      -width * 0.16 + width * 0.39 * q + Math.sin(q * Math.PI * 1.8) * 4,
      23.8 - Math.sin(q * Math.PI) * 6.4 + q * 1.6
    ];
  }
    return [
      width * 0.41 - width * 0.29 * q + Math.sin(q * TAU * 0.9) * 3,
      20 + Math.sin(q * TAU * 0.85) * 2.6 - Math.sin(q * Math.PI) * 1.4
    ];
}

export function fireflyDance(ctx, model, width) {
  const p = clamp(model.progress);
  const choreography = [
    { index: 0, start: 0.1, end: 0.84, size: 0.9, pace: 5.3, phase: 0.3 },
    { index: 1, start: 0.28, end: 0.82, size: 0.72, pace: 4.3, phase: 2.2 },
    { index: 2, start: 0.39, end: 0.86, size: 0.63, pace: 4.8, phase: 4.4 }
  ];
  choreography.forEach((flyer, index) => {
    const q = phase(p, flyer.start, flyer.end);
    const parameter = easeInOut(q);
    const [x, y] = flightPath(flyer.index, parameter, width);
    const settle = smooth(clamp((q - 0.77) / 0.2));
    const alpha = visible(p, flyer.start - 0.03, flyer.end + 0.05, 0.08);
    const pulseWave = Math.sin(p * TAU * flyer.pace + flyer.phase);
    const pulse = 0.16 + 0.84 * Math.pow(Math.max(0, pulseWave), 1.4);
    const nextParameter = easeInOut(Math.min(1, q + 0.015));
    const [nextX, nextY] = flightPath(flyer.index, nextParameter, width);
    const heading = Math.atan2(nextY - y, nextX - x);

    if (index === 0) {
      stroke(ctx, '#A6EF9F', 2.8, 0.12 * alpha, c => {
        for (let step = 0; step <= 32; step += 1) {
          const t = Math.max(0, parameter - .1) + Math.min(parameter, .1) * step / 32;
          const [px, py] = flightPath(flyer.index, t, width);
          if (step === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
      });
      stroke(ctx, '#CBEDA4', 0.72, 0.54 * alpha, c => {
        for (let step = 0; step <= 32; step += 1) {
          const t = Math.max(0, parameter - .1) + Math.min(parameter, .1) * step / 32;
          const [px, py] = flightPath(flyer.index, t, width);
          if (step === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
      });
    } else if (index === 1) {
      stroke(ctx, '#BDE9A0', 0.62, 0.38 * alpha, c => {
        const [priorX, priorY] = flightPath(flyer.index, Math.max(0, q - 0.2), width);
        c.moveTo(priorX, priorY); c.quadraticCurveTo(priorX + 3, priorY - 4, x, y);
      });
    }
    firefly(ctx, x, y, heading * 0.42, pulse * alpha, flyer.size * (1 - settle * 0.04));
  });
  // The quiet glow above the final resting light breathes after the flight ends.
  const hush = smooth(clamp((p - 0.82) / 0.12));
  const hushX = width * 0.4;
  glow(ctx, hushX, -23, 12, '#FFE477', hush * (0.08 + 0.06 * Math.sin(p * TAU * 0.7)));
}
