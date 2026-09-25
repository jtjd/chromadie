import {
  TAU,
  clamp,
  easeInOut,
  easeOut,
  phase,
  smoothstep,
  noise,
  rgba,
  createLinearGradient,
  createRadialGradient,
  fill,
  stroke,
  oval,
  dot,
  polygon,
  glint,
  glow
} from './collectionArt.js';

const spanFor = width => clamp(width, 48, 300);
const smooth = value => smoothstep(clamp(value));

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function cubicPoint(t, a, b, c, d) {
  const inverse = 1 - t;
  return [
    inverse ** 3 * a[0] + 3 * inverse ** 2 * t * b[0] + 3 * inverse * t ** 2 * c[0] + t ** 3 * d[0],
    inverse ** 3 * a[1] + 3 * inverse ** 2 * t * b[1] + 3 * inverse * t ** 2 * c[1] + t ** 3 * d[1]
  ];
}

function cubicTangent(t, a, b, c, d) {
  const inverse = 1 - t;
  return [
    3 * inverse ** 2 * (b[0] - a[0]) + 6 * inverse * t * (c[0] - b[0]) + 3 * t ** 2 * (d[0] - c[0]),
    3 * inverse ** 2 * (b[1] - a[1]) + 6 * inverse * t * (c[1] - b[1]) + 3 * t ** 2 * (d[1] - c[1])
  ];
}

function swordPath(t, width) {
  const points = [
    [-width * 0.42, 13],
    [-width * 0.19, -12],
    [width * 0.17, -17],
    [width * 0.42, -18]
  ];
  return { points, position: cubicPoint(t, ...points), tangent: cubicTangent(t, ...points) };
}

function drawSword(ctx, x, y, angle, width, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // A cast-steel blade with a bright cutting edge and a raised central ridge.
  const blade = createLinearGradient(ctx, ['#D6F6FF', '#FFFFFF', '#65CBEA', '#EAFBFF'], -1, -3, 1, 3, '#EAFBFF');
  fill(ctx, blade, alpha, c => {
    c.moveTo(-3, -3.6); c.lineTo(18, -2.3); c.lineTo(29, 0);
    c.lineTo(18, 2.3); c.lineTo(-3, 3.6); c.closePath();
  });
  stroke(ctx, '#FFFFFF', 0.95, alpha * 0.9, c => {
    c.moveTo(-1, -2.7); c.lineTo(18, -1.7); c.lineTo(26, 0);
  });
  stroke(ctx, '#399CC4', 0.8, alpha * 0.62, c => {
    c.moveTo(-1, 2.7); c.lineTo(18, 1.7); c.lineTo(26, 0);
  });

  // Brass guard, leather-wrapped grip, and pommel keep the object legible as a sword.
  stroke(ctx, '#FFDA71', 3.2, alpha, c => { c.moveTo(-4, -7); c.quadraticCurveTo(-1, 0, -4, 7); });
  stroke(ctx, '#FFF3BE', 0.9, alpha * 0.88, c => { c.moveTo(-4, -6); c.quadraticCurveTo(-2, 0, -4, 6); });
  stroke(ctx, '#8F4B39', 4.1, alpha, c => { c.moveTo(-17, 0); c.lineTo(-5, 0); });
  stroke(ctx, '#F3A16B', 1.1, alpha * 0.92, c => {
    for (let index = 0; index < 4; index += 1) {
      const x = -15 + index * 2.7;
      c.moveTo(x - 1, -1.5); c.lineTo(x + 1, 1.5);
    }
  });
  fill(ctx, '#FFD978', alpha, c => c.arc(-19, 0, 2.5, 0, TAU));
  fill(ctx, '#FFF0AD', alpha * 0.9, c => c.arc(-19.4, -0.7, 0.8, 0, TAU));
  ctx.restore();
}

export function swordFlourish(ctx, model, width) {
  const w = spanFor(width);
  const p = clamp(model?.progress ?? 0);
  const travel = easeInOut(phase(p, 0.18, 0.38));
  const { points, position, tangent } = swordPath(travel, w);
  const angle = Math.atan2(tangent[1], tangent[0]);
  const trailAlpha = 1 - smooth(phase(p, 0.39, 0.62));

  if (p > 0.055 && p < 0.62) {
    const count = Math.max(2, Math.ceil(travel * 28));
    stroke(ctx, rgba('#FFC65A', 0.72), 7.5, trailAlpha * 0.28, c => {
      for (let index = 0; index <= count; index += 1) {
        const t = travel * index / count;
        const [x, y] = cubicPoint(t, ...points);
        if (index) c.lineTo(x, y); else c.moveTo(x, y);
      }
    });
    stroke(ctx, '#FFF0BA', 1.8, trailAlpha * 0.76, c => {
      for (let index = 0; index <= count; index += 1) {
        const t = travel * index / count;
        const [x, y] = cubicPoint(t, ...points);
        if (index) c.lineTo(x, y); else c.moveTo(x, y);
      }
    });
  }

  if (p >= 0.07 && p <= 0.54) {
    const settle = smooth(phase(p, 0.4, 0.52));
    drawSword(ctx, position[0], position[1], angle * (1 - settle) - 0.08 * settle, w, (1 - settle * 0.3) * smooth(phase(p, .07, .13)) * (1 - smooth(phase(p, .44, .54))));
  }

  const impact = phase(p, 0.37, 0.54);
  if (impact > 0 && impact < 1) {
    const [x, y] = swordPath(1, w).position;
    const pulse = Math.sin(impact * Math.PI);
    stroke(ctx, '#FFD16C', 1.25, pulse * 0.9, c => c.ellipse(x, y, 3 + impact * 13, 1.6 + impact * 5.5, -0.18, 0, TAU));
    for (let index = 0; index < 7; index += 1) {
      const angle = index * TAU / 7 - 0.45;
      const inner = 4 + impact * 2;
      const outer = 8 + impact * (8 + (index % 3) * 2);
      stroke(ctx, index % 2 ? '#B5F7FF' : '#FFD56C', 1.35, pulse * 0.92, c => {
        c.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
        c.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
      });
    }
    if (impact > 0.25 && impact < 0.88) glint(ctx, x, y, 3.2 * pulse, '#FFFFFF', pulse * 0.95);
  }
}

function scallopPath(ctx, radius) {
  const scallops = 9;
  const valleyRadius = radius * 0.84;
  const point = (index, r) => {
    const angle = -Math.PI / 2 + index * TAU / scallops;
    return [Math.cos(angle) * r, Math.sin(angle) * r];
  };
  const first = point(0, valleyRadius);
  ctx.moveTo(first[0], first[1]);
  for (let index = 0; index < scallops; index += 1) {
    const peak = point(index + 0.5, radius);
    const next = point(index + 1, valleyRadius);
    ctx.quadraticCurveTo(peak[0], peak[1], next[0], next[1]);
  }
  ctx.closePath();
}

function starPath(ctx, radius) {
  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    const length = index % 2 ? radius * 0.42 : radius;
    const x = Math.cos(angle) * length;
    const y = Math.sin(angle) * length;
    if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

export function waxSeal(ctx, model, width) {
  const w = spanFor(width);
  const p = clamp(model?.progress ?? 0);
  const x = Math.min(w * 0.29, w * 0.5 - 14);
  const drop = easeOut(phase(p, 0.055, 0.24));
  const press = phase(p, 0.19, 0.3);
  const bounce = Math.sin(press * Math.PI) * 1.6;
  const y = -26 + drop * 3 - bounce * .62;
  const radius = 10 + Math.sin(press * Math.PI) * 1.4;
  const squashX = 1 + Math.sin(press * Math.PI) * .22;
  const squashY = 1 - Math.sin(press * Math.PI) * .24;
  const rotation = 0.18 * (1 - easeOut(drop));

  if (press > 0 && press < 1) {
    const pulse = Math.sin(press * Math.PI);
    stroke(ctx, '#FFBF64', 1.4, pulse * 0.72, c => c.ellipse(x, -19, 13 + press * 12, 3.5 + press * 3, 0, 0, TAU));
    oval(ctx, x - 8 - press * 3, -7, 2.6 + press, 1.9, -0.25, '#E75B52', pulse * 0.8);
    oval(ctx, x + 8 + press * 3, -8, 2.2 + press, 1.6, 0.2, '#FF9471', pulse * 0.75);
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(squashX, squashY);
  glow(ctx, -2, -2, 17, '#FF7355', 0.32);
  fill(ctx, createRadialGradient(ctx, ['#FF9B76', '#EA4358', '#9F1D52'], -3, -5, 1, 2, 3, 16, '#DB3C59'), 1, c => scallopPath(c, radius));
  stroke(ctx, '#7E2048', 1.35, 0.92, c => scallopPath(c, radius));
  stroke(ctx, '#FFC49A', 1.05, 0.88, c => c.arc(-1.2, -1.5, radius * 0.69, Math.PI * 1.08, Math.PI * 1.82));
  stroke(ctx, '#A3224D', 0.7, 0.82, c => c.arc(1, 1, radius * 0.68, -0.02, Math.PI * 0.92));

  // The pressed device is inset in the wax; a fine rim and engraved star catch light.
  stroke(ctx, '#F97868', 0.75, 0.92, c => c.arc(0, 0.3, radius * 0.53, 0, TAU));
  fill(ctx, createRadialGradient(ctx, ['#FFD982', '#F5AE4B', '#C85B42'], -1, -3, 0, 0, 1, 6, '#F5AE4B'), 1, c => starPath(c, 5.2));
  stroke(ctx, '#FFF0BC', 0.65, 0.96, c => { c.moveTo(0, -3.2); c.lineTo(0, 3.2); });
  glint(ctx, -4.9, -7.2, 1.8, '#FFF2C1', 0.92);
  ctx.restore();
}

function spadePath(ctx, size) {
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * 0.24, -size * 0.55, size, -size * 0.08, size * 0.84, size * 0.34);
  ctx.bezierCurveTo(size * 0.68, size * 0.72, size * 0.22, size * 0.66, 0, size * 0.34);
  ctx.bezierCurveTo(-size * 0.22, size * 0.66, -size * 0.68, size * 0.72, -size * 0.84, size * 0.34);
  ctx.bezierCurveTo(-size, -size * 0.08, -size * 0.24, -size * 0.55, 0, -size);
  ctx.closePath();
  ctx.moveTo(-size * 0.16, size * 0.35);
  ctx.lineTo(0, size * 0.8);
  ctx.lineTo(size * 0.17, size * 0.35);
  ctx.closePath();
}

function drawAceCard(ctx, x, y, rotation, flipAngle, width, alpha) {
  const cardWidth = 18;
  const cardHeight = 24;
  const faceIsBack = Math.cos(flipAngle) < 0;
  const apparentWidth = Math.max(0.075, Math.abs(Math.cos(flipAngle)));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(apparentWidth, 1);

  glow(ctx, -1.5, 2, 20, '#FF657B', 0.15 * alpha);
  fill(ctx, '#412C54', alpha * 0.46, c => roundedRect(c, -cardWidth / 2 + 1.2, -cardHeight / 2 + 2.5, cardWidth, cardHeight, 3));
  fill(ctx, faceIsBack
    ? createLinearGradient(ctx, ['#282653', '#515DA6', '#202044'], -cardWidth / 2, 0, cardWidth / 2, 0, '#343464')
    : createLinearGradient(ctx, ['#FFF6D8', '#FFFFFF', '#E9E5D8'], -cardWidth / 2, 0, cardWidth / 2, 0, '#FFFFFF'),
  alpha, c => roundedRect(c, -cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 3));
  stroke(ctx, faceIsBack ? '#D8C681' : '#C7B9A2', 0.9, alpha * 0.96, c => roundedRect(c, -cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 3));

  if (faceIsBack) {
    ctx.save();
    ctx.beginPath();
    roundedRect(ctx, -cardWidth / 2 + 2, -cardHeight / 2 + 2, cardWidth - 4, cardHeight - 4, 2);
    ctx.clip();
    stroke(ctx, '#F7D56F', 0.85, alpha * 0.9, c => {
      c.moveTo(-8, -11); c.lineTo(8, 11);
      c.moveTo(-8, 11); c.lineTo(8, -11);
      c.moveTo(-9, -2); c.lineTo(9, -2);
      c.moveTo(-9, 3); c.lineTo(9, 3);
    });
    stroke(ctx, '#A8D8F3', 0.5, alpha * 0.8, c => roundedRect(c, -cardWidth / 2 + 4, -cardHeight / 2 + 4, cardWidth - 8, cardHeight - 8, 1.5));
    ctx.restore();
  } else {
    const ink = '#B6294D';
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 6px Georgia, serif';
    ctx.fillText?.('A', -6.8, -7.5);
    ctx.restore();
    fill(ctx, ink, alpha, c => spadePath(c, 3.8));
    ctx.save();
    ctx.translate(5.4, 8.4);
    ctx.rotate(Math.PI);
    fill(ctx, ink, alpha * 0.9, c => spadePath(c, 1.7));
    ctx.restore();
    stroke(ctx, '#D8CDB8', 0.55, alpha * 0.76, c => { c.moveTo(-5.2, -2.1); c.lineTo(-2.4, -2.1); });
  }
  ctx.restore();
}

export function fallingAce(ctx, model, width) {
  const w = spanFor(width);
  const p = clamp(model?.progress ?? 0);
  const cardWidth = 18;
  const maxX = Math.max(10, w * 0.5 - cardWidth * 0.72);
  const flight = easeInOut(phase(p, 0.065, 0.74));
  const x = -maxX + flight * maxX * 1.86;
  const y = -19 + flight * 5 + flight * flight * 5;
  const rotation = -0.13 + flight * 0.33;
  const flipAngle = flight * TAU;
  let exitX = x;
  let exitY = y;
  let exitAlpha = 1;
  if (p > 0.74) {
    const flick = easeOut(phase(p, 0.74, 0.93));
    exitX = Math.min(maxX, x + flick * (w * 0.16));
    exitY = y + flick * 27;
    exitAlpha = 1 - smooth(phase(p, 0.82, 0.94));
  }
  if (p < 0.05 || p > 0.96) return;

  if (p > 0.07 && p < 0.91) {
    stroke(ctx, '#F9C869', 1.1, 0.24 * exitAlpha, c => {
      c.moveTo(-maxX - 7, -25);
      c.quadraticCurveTo(-w * 0.08, -31, exitX - 11, exitY - 4);
    });
    glint(ctx, -maxX - 6, -24, 2.3, '#FFF0B3', (1 - smooth(phase(p, 0.07, 0.22))) * 0.85);
  }
  drawAceCard(ctx, exitX, exitY, rotation, flipAngle, w, exitAlpha * smooth(phase(p, .05, .12)));
}

function crownPath(ctx, width, y) {
  ctx.moveTo(-width / 2, y + 8);
  ctx.lineTo(-width * 0.43, y - 4);
  ctx.lineTo(-width * 0.2, y + 1);
  ctx.lineTo(0, y - 13);
  ctx.lineTo(width * 0.2, y + 1);
  ctx.lineTo(width * 0.43, y - 4);
  ctx.lineTo(width / 2, y + 8);
  ctx.quadraticCurveTo(width * 0.49, y + 11, width * 0.44, y + 11);
  ctx.lineTo(-width * 0.44, y + 11);
  ctx.quadraticCurveTo(-width * 0.49, y + 11, -width / 2, y + 8);
  ctx.closePath();
}

export function crownGlint(ctx, model, width) {
  const w = spanFor(width);
  const p = clamp(model?.progress ?? 0);
  const crownWidth = Math.min(42, Math.max(25, w * 0.2));
  const settle = easeOut(phase(p, 0.06, 0.26));
  const bounce = Math.sin(phase(p, 0.24, 0.39) * Math.PI) * 1.6;
  const y = -16.5 - settle * 0.4 - bounce;
  const tilt = (0.17 * (1 - settle)) + Math.sin(phase(p, 0.24, 0.39) * Math.PI) * 0.035;

  ctx.save();
  ctx.rotate(tilt);
  glow(ctx, 0, y + 4, crownWidth * 0.72, '#FFB52D', 0.2);
  fill(ctx, createLinearGradient(ctx, ['#9A4F19', '#FFBA35', '#FFF2A5', '#D98323'], 0, y - 12, 0, y + 11, '#EFA32F'), 1, c => crownPath(c, crownWidth, y));
  // Faceted side panels and raised central ridge give the band a metal volume.
  polygon(ctx, [[-crownWidth * 0.45, y + 8], [-crownWidth * 0.2, y + 1], [-crownWidth * 0.28, y + 10]], '#C56C20', 0.7);
  polygon(ctx, [[crownWidth * 0.45, y + 8], [crownWidth * 0.2, y + 1], [crownWidth * 0.28, y + 10]], '#9D511E', 0.68);
  stroke(ctx, '#FFF0A3', 1, 0.95, c => {
    c.moveTo(-crownWidth * 0.42, y - 3); c.lineTo(-crownWidth * 0.2, y + 2);
    c.lineTo(0, y - 10); c.lineTo(crownWidth * 0.2, y + 2); c.lineTo(crownWidth * 0.42, y - 3);
  });
  fill(ctx, createLinearGradient(ctx, ['#FFE99A', '#D97E20'], 0, y + 8, 0, y + 12, '#F1AC31'), 1, c => {
    c.moveTo(-crownWidth / 2, y + 7.3); c.lineTo(crownWidth / 2, y + 7.3);
    c.lineTo(crownWidth * 0.44, y + 11.2); c.lineTo(-crownWidth * 0.44, y + 11.2); c.closePath();
  });
  stroke(ctx, '#FFF3C2', 0.7, 0.84, c => { c.moveTo(-crownWidth * 0.41, y + 8); c.lineTo(crownWidth * 0.4, y + 8); });

  // Ruby center and two cool side stones create a readable jewel setting.
  fill(ctx, createLinearGradient(ctx, ['#FFAAC4', '#E83268', '#8B183E'], -3, y - 3, 3, y + 4, '#E83268'), 1, c => {
    c.moveTo(0, y - 4.5); c.lineTo(3.1, y - 1.2); c.lineTo(0, y + 3.1); c.lineTo(-3.1, y - 1.2); c.closePath();
  });
  stroke(ctx, '#FFE2AB', 0.65, 0.98, c => { c.moveTo(-1.6, y - 1.3); c.lineTo(0, y - 3.3); c.lineTo(1.6, y - 1.3); });
  for (const side of [-1, 1]) {
    oval(ctx, side * crownWidth * 0.29, y + 4.3, 1.45, 1.9, side * 0.2, '#5FD8EA', 0.98);
    dot(ctx, side * crownWidth * 0.29 - 0.35, y + 3.8, 0.45, '#D9FFFF', 0.94);
  }

  // The specular streak is clipped to the crown silhouette and follows its facets.
  const shine = phase(p, 0.42, 0.7);
  if (shine > 0 && shine < 1) {
    const shineX = -crownWidth * 0.62 + shine * crownWidth * 1.24;
    ctx.save();
    ctx.beginPath();
    crownPath(ctx, crownWidth, y);
    ctx.clip();
    const specular = createLinearGradient(ctx, [rgba('#FFFFFF', 0), '#FFFCE0', rgba('#7CEEFF', 0.52), rgba('#FFFFFF', 0)], shineX - 5, y, shineX + 5, y, '#FFFFFF');
    fill(ctx, specular, 0.94, c => c.rect(shineX - 5, y - 18, 10, 32));
    ctx.restore();
    const flash = Math.sin(shine * Math.PI);
    if (flash > 0.15) glint(ctx, shineX, y - 5, 3.8 * flash, '#FFFFFF', flash * 0.9);
  }
  ctx.restore();
}

function planePath(t, width) {
  const points = [
    [-width * 0.4, 16],
    [-width * 0.34, -31],
    [width * 0.29, -31],
    [width * 0.4, 16]
  ];
  return { points, position: cubicPoint(t, ...points), tangent: cubicTangent(t, ...points) };
}

function drawPaperPlane(ctx, x, y, angle, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // Folded wings are separate planes, with a shaded underside and a long crease.
  polygon(ctx, [[15, 0], [-12, -8], [-5, 0], [-12, 8]], '#385B91', alpha * 0.48);
  polygon(ctx, [[15, 0], [-12, -8], [-5, 0], [5, -1]], createLinearGradient(ctx, ['#F5FBFF', '#A8DEFF', '#74B7F1'], 0, -8, 0, 1, '#B8E6FF'), alpha);
  polygon(ctx, [[15, 0], [-5, 0], [-12, 8]], createLinearGradient(ctx, ['#FFEECE', '#F7A58C', '#EA6D85'], 0, 0, 0, 8, '#E98791'), alpha);
  stroke(ctx, '#FFFFFF', 0.9, alpha * 0.98, c => { c.moveTo(-12, -8); c.lineTo(15, 0); c.lineTo(-12, 8); });
  stroke(ctx, '#3F6E9B', 0.8, alpha * 0.86, c => { c.moveTo(-5, 0); c.lineTo(15, 0); });
  stroke(ctx, '#FFFFFF', 0.7, alpha * 0.88, c => { c.moveTo(-8, -6); c.lineTo(-4, -0.2); });
  ctx.restore();
}

export function paperPlane(ctx, model, width) {
  const w = spanFor(width);
  const p = clamp(model?.progress ?? 0);
  const flight = easeInOut(phase(p, .09, .62));
  const { points, position, tangent } = planePath(flight, w);
  const angle = Math.atan2(tangent[1], tangent[0]);
  const tailAlpha = 1 - smooth(phase(p, .62, .82));

  if (p > 0.09 && p < .82) {
    const count = Math.max(2, Math.ceil(flight * 34));
    stroke(ctx, '#8BE9FF', 1.6, tailAlpha * 0.22, c => {
      for (let index = 0; index <= count; index += 1) {
        const t = flight * index / count;
        const [x, y] = cubicPoint(t, ...points);
        if (index) c.lineTo(x, y); else c.moveTo(x, y);
      }
    });
    stroke(ctx, '#C8F5FF', 0.72, tailAlpha * 0.68, c => {
      for (let index = 0; index <= count; index += 1) {
        const t = flight * index / count;
        const [x, y] = cubicPoint(t, ...points);
        if (index) c.lineTo(x, y); else c.moveTo(x, y);
      }
    });
  }

  if (p < .82) drawPaperPlane(ctx, position[0], position[1], angle, 1 - smooth(phase(p, .62, .78)));
}

function pawHeart(ctx) {
  ctx.moveTo(0, 4.4);
  ctx.bezierCurveTo(-1.1, 3.8, -4.6, 1.9, -4.6, -0.5);
  ctx.bezierCurveTo(-4.6, -2.5, -2, -3.5, 0, -1.4);
  ctx.bezierCurveTo(2, -3.5, 4.6, -2.5, 4.6, -0.5);
  ctx.bezierCurveTo(4.6, 1.9, 1.1, 3.8, 0, 4.4);
  ctx.closePath();
}

function drawPaw(ctx, x, y, rotation, scale, index, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale * 0.93, scale);
  const pad = index % 2 ? '#E9487B' : '#F26991';
  const toe = index % 2 ? '#FFB2C7' : '#FFD0DB';
  fill(ctx, pad, alpha, c => pawHeart(c));
  glow(ctx, -1.3, -1.4, 5.6, '#FF9AB5', alpha * 0.36);
  const toes = [
    [-4.5, -4.1, -0.3], [-1.55, -5.2, -0.08], [1.55, -5.2, 0.08], [4.5, -4.1, 0.3]
  ];
  for (const [tx, ty, angle] of toes) {
    oval(ctx, tx, ty, 1.75, 2.35, angle, toe, alpha * 0.98);
    oval(ctx, tx - 0.35, ty - 0.7, 0.55, 0.8, angle, '#FFF1F4', alpha * 0.8);
  }
  stroke(ctx, '#FFEAF0', 0.65, alpha * 0.8, c => { c.moveTo(-2.5, 0.1); c.quadraticCurveTo(-1, -1, 0, 0.3); });
  ctx.restore();
}

export function kittenPaws(ctx, model, width) {
  const w = spanFor(width);
  const p = clamp(model?.progress ?? 0);
  const prints = 7;
  for (let index = 0; index < prints; index += 1) {
    const start = 0.07 + index * 0.087;
    if (p < start) continue;
    const stamp = easeOut(phase(p, start, start + 0.07));
    const fade = smooth(phase(p, 0.82, 0.96));
    const alpha = (1 - fade) * stamp;
    const x = -w * 0.34 + index * (w * 0.68 / (prints - 1));
    const y = 21 + (index % 2 ? -3 : 4) + Math.sin(index*.8)*1.3;
    const scale = 0.64 + stamp * 0.36;
    const rotation = (index % 2 ? 0.16 : -0.16) + (index % 3 - 1) * 0.035;
    drawPaw(ctx, x, y, rotation, scale, index, alpha);
  }
}

function bubblePath(ctx, radius) {
  ctx.arc(0, 0, radius, 0, TAU);
}

function drawBubble(ctx, x, y, radius, wobble, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wobble * 0.12);
  ctx.scale(1 + wobble * 0.1, 1 - wobble * 0.08);
  const fillStyle = createRadialGradient(ctx, [rgba('#FFFFFF', 0.7), rgba('#A5F5FF', 0.18), rgba('#70C9FF', 0.08), rgba('#47A8E9', 0.22)], -radius * 0.34, -radius * 0.4, 0, 0, 0, radius, rgba('#65CCF2', 0.08));
  fill(ctx, fillStyle, alpha, c => bubblePath(c, radius));
  stroke(ctx, createLinearGradient(ctx, ['#FFFFFF', '#8FEAFF', '#C98EFF'], -radius, -radius, radius, radius, '#A7EDFF'), 1.3, alpha * 0.95, c => bubblePath(c, radius));
  stroke(ctx, '#F7FFFF', 1.05, alpha * 0.92, c => c.arc(-radius * 0.08, -radius * 0.08, radius * 0.68, Math.PI * 1.1, Math.PI * 1.72));
  oval(ctx, -radius * 0.34, -radius * 0.42, Math.max(0.8, radius * 0.16), Math.max(0.7, radius * 0.11), -0.35, '#FFFFFF', alpha * 0.98);
  dot(ctx, radius * 0.42, radius * 0.28, Math.max(0.45, radius * 0.06), '#FFFFFF', alpha * 0.78);
  ctx.restore();
}

function drawBubblePop(ctx, x, y, radius, t, alpha) {
  const burst = easeOut(t);
  const fade = 1 - smooth(t);
  stroke(ctx, '#FFFFFF', 1.45, alpha * fade * 0.94, c => c.arc(x, y, radius * (0.85 + burst * 0.72), -0.22, Math.PI * 1.36));
  stroke(ctx, '#92EDFF', 0.95, alpha * fade * 0.9, c => c.arc(x, y, radius * (0.76 + burst * 0.52), Math.PI * 1.44, Math.PI * 1.94));
  for (let index = 0; index < 7; index += 1) {
    const angle = index * TAU / 7 - Math.PI / 2;
    const distance = radius * (0.35 + burst * 1.14);
    const bead = 0.65 + noise(3107, index) * 0.9;
    dot(ctx, x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, bead * fade, index % 2 ? '#FFFFFF' : '#A8F4FF', alpha * fade * 0.92);
  }
}

export function bubbleBath(ctx, model, width) {
  const w = spanFor(width);
  const p = clamp(model?.progress ?? 0);
  const bubbles = 5;
  for (let index = 0; index < bubbles; index += 1) {
    const start = 0.035 + index * 0.105;
    const riseDuration = 0.35 + noise(model?.seed ?? 0, index + 12) * 0.045;
    const popStart = start + riseDuration + 0.075;
    const popDuration = 0.105;
    const finish = popStart + popDuration;
    if (p < start || p > finish) continue;

    const rise = smooth(phase(p, start, start + riseDuration));
    const popChosen = index === 1 || index === 4;
    const isPopping = popChosen && p >= popStart;
    const popProgress = isPopping ? phase(p, popStart, finish) : 0;
    const baseX = -w * 0.37 + index * (w * 0.185);
    const breeze = noise(model?.seed ?? 0, index + 73) * 2 - 1;
    const drift = Math.sin(rise * Math.PI * 0.8 + index * 0.7) * 2.2 + breeze * rise * 2;
    const x = baseX + drift;
    const y = 26 - rise * (43 + noise(model?.seed ?? 0, index + 143) * 4);
    const radius = 5.5 + noise(model?.seed ?? 0, index + 211) * 3.5;
    const wobble = Math.sin(rise * TAU * 1.2 + index * 0.83);
    const hold = smooth(phase(p, start + riseDuration, start + riseDuration + 0.07));

    if (isPopping) {
      drawBubblePop(ctx, x, y, radius, popProgress, 1);
    } else {
      const fade = popChosen ? 1 : 1 - smooth(phase(p, finish - 0.1, finish));
      const alpha = fade * (0.88 + hold * 0.12) * smooth(phase(p,start,start+.05));
      glow(ctx, x, y, radius * 1.9, '#5DDCF4', 0.12 * alpha);
      drawBubble(ctx, x, y, radius, wobble, alpha);
    }
  }
}
