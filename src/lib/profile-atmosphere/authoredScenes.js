/** Finite authored compositions. No remote assets or owner-provided drawing code. */
export const AUTHORED_ATMOSPHERES = Object.freeze(['dust-light', 'snowfall', 'ink-bloom', 'paper-shadow']);
const TAU = Math.PI * 2;
const fract = n => n - Math.floor(n);
const random = n => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const particles = Array.from({ length: 72 }, (_, i) => ({
  x: random(i + 1), y: random(i + 81), z: random(i + 161), phase: random(i + 241) * TAU
}));

function glow(c, x, y, r, color, alpha = 1) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'transparent');
  c.globalAlpha = alpha; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}

function star(c, x, y, r, color, alpha) {
  c.save(); c.translate(x, y); c.globalAlpha = alpha;
  c.fillStyle = color; c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const s = i % 2 ? r * .13 : r;
    c.lineTo(Math.cos(a) * s, Math.sin(a) * s);
  }
  c.closePath(); c.fill(); c.restore();
}

function heartPath(c) {
  c.beginPath(); c.moveTo(0, -.4);
  c.bezierCurveTo(-.75, -1.2, -1.5, -.2, -.72, .5);
  c.bezierCurveTo(-.4, .82, -.12, .96, 0, 1.15);
  c.bezierCurveTo(.12, .96, .4, .82, .72, .5);
  c.bezierCurveTo(1.5, -.2, .75, -1.2, 0, -.4); c.closePath();
}

function loveglass(c, w, h, t) {
  // Rose lens bloom, suspended blown-glass hearts, caustic rims and pin lights.
  glow(c, w * .04, h * .27, w * .46, '#f9299b', .15);
  glow(c, w * .95, h * .75, w * .4, '#ac52ff', .16);
  for (let i = 0; i < 24; i++) {
    const p = particles[i];
    const y = (1.15 - fract(p.y + t * (.013 + p.z * .012)) * 1.4) * h;
    const x = (p.x + Math.sin(t * .25 + p.phase) * .04) * w;
    const s = (9 + p.z * 23) * Math.min(1, w / 620);
    c.save(); c.translate(x, y); c.rotate(Math.sin(t * .35 + p.phase) * .32);
    c.scale(s * (.7 + .3 * Math.cos(t * .4 + p.phase)), s);
    const g = c.createLinearGradient(-1, -.7, .9, .9);
    g.addColorStop(0, '#fff0fa'); g.addColorStop(.12, '#fbb5e9');
    g.addColorStop(.3, '#d53c8655'); g.addColorStop(.55, '#9b44db18');
    g.addColorStop(.79, '#ff85c8aa'); g.addColorStop(.9, '#ffe6ff'); g.addColorStop(1, '#d3319c');
    c.globalAlpha = .35 + p.z * .55; c.fillStyle = g;
    heartPath(c); c.fill(); c.strokeStyle = '#ffd4f4'; c.lineWidth = .035; c.stroke();
    c.clip();
    c.beginPath(); c.ellipse(-.38, -.29, .17, .29, .6, 0, TAU);
    c.fillStyle = '#fff5ff'; c.globalAlpha = .78; c.fill();
    c.beginPath(); c.ellipse(.55, .45, .09, .36, .7, 0, TAU);
    c.fillStyle = '#fff0f9'; c.globalAlpha = .5; c.fill(); c.restore();
  }
  for (let i = 24; i < 64; i++) {
    const p = particles[i];
    const pulse = Math.pow(.5 + .5 * Math.sin(t * .7 + p.phase), 5);
    star(c, p.x * w, fract(p.y - t * .007) * h, 1 + p.z * 5, '#ffe5f8', .12 + pulse * .65);
  }
}

function petal(c, x, y, size, rotation, fold, alpha) {
  c.save(); c.translate(x, y); c.rotate(rotation); c.scale(size * fold, size);
  c.beginPath(); c.moveTo(0, 1);
  c.bezierCurveTo(-1.15, .2, -.9, -1.1, -.15, -.9);
  c.lineTo(0, -.67); c.lineTo(.15, -.9);
  c.bezierCurveTo(.9, -1.1, 1.15, .2, 0, 1);
  const g = c.createLinearGradient(-.8, -.8, .65, 1);
  g.addColorStop(0, '#fff2f9'); g.addColorStop(.45, '#ffadd4'); g.addColorStop(1, '#da377f');
  c.globalAlpha = alpha; c.fillStyle = g; c.fill();
  c.strokeStyle = '#ffc9df'; c.lineWidth = .035; c.beginPath(); c.moveTo(0, .9); c.quadraticCurveTo(-.14, 0, 0, -.6); c.stroke();
  c.restore();
}

function snowfall(c, w, h, t) {
  // Layered flakes: large soft flakes drift slowly while pinpricks move faster,
  // giving the scene depth without covering the identity.
  glow(c, w * .12, h * .1, w * .55, '#b9dcff', .1);
  glow(c, w * .88, h * .78, w * .48, '#8c9dff', .1);
  for (let i = 0; i < 72; i++) {
    const p = particles[i];
    const speed = .006 + p.z * .013;
    const x = fract(p.x + Math.sin(t * .18 + p.phase) * .06 + t * speed * .42) * (w + 48) - 24;
    const y = fract(p.y + t * speed) * (h + 48) - 24;
    const radius = (1 + p.z * 4.5) * Math.min(1, w / 600);
    const alpha = .18 + p.z * .58;
    c.save(); c.translate(x, y); c.rotate(p.phase + t * (.08 + p.z * .2));
    c.globalAlpha = alpha; c.strokeStyle = p.z > .65 ? '#f4fbff' : '#c9e4ff';
    c.fillStyle = c.strokeStyle; c.lineWidth = Math.max(.45, radius * .18);
    if (p.z > .55) {
      c.beginPath();
      for (let arm = 0; arm < 6; arm++) {
        const a = arm * Math.PI / 3;
        c.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
        c.lineTo(Math.cos(a + Math.PI) * radius, Math.sin(a + Math.PI) * radius);
      }
      c.stroke();
    } else {
      c.beginPath(); c.arc(0, 0, radius, 0, TAU); c.fill();
    }
    c.restore();
  }
  for (let i = 0; i < 18; i++) {
    const p = particles[i + 42];
    const x = fract(p.x + t * .004) * w;
    const y = fract(p.y + t * .006) * h;
    glow(c, x, y, 8 + p.z * 14, '#d9edff', .05 + p.z * .08);
  }
}

function crimson(c, w, h, t) {
  // Ink currents form a broken eclipse around the profile rather than a veil.
  const scale = Math.min(w, h), cx = w * .5, cy = h * .49;
  glow(c, cx, cy, scale * .62, '#b70035', .10);
  c.save(); c.translate(cx, cy); c.scale(w / scale, h / scale);
  for (let j = 0; j < 42; j++) {
    const phase = j * .17, r = scale * (.39 + j * .001);
    // Tapered brush bands leave an irregular opening; slow eddies fold the ink.
    const start = -.8 + j * .018;
    const length = Math.PI * (1.55 + Math.sin(j * .7) * .12);
    c.beginPath();
    for (let edge = 0; edge < 2; edge++) {
      for (let k = 0; k <= 100; k++) {
        const u = (edge ? 100 - k : k) / 100;
        const a = start + u * length;
        const ripple = Math.sin(a * 3 + t * .22 + phase) * scale * .026
          + Math.sin(a * 7 - t * .18 + phase) * scale * .012;
        const thickness = Math.pow(Math.sin(u * Math.PI), 1.5) * (5 + 7 * Math.sin(j * .3) ** 2);
        const radius = r + ripple + (edge ? thickness : -thickness);
        const x = Math.cos(a) * radius, y = Math.sin(a) * radius;
        if (!edge && !k) c.moveTo(x, y); else c.lineTo(x, y);
      }
    }
    c.closePath();
    const g = c.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, '#ff235a00'); g.addColorStop(.22, '#5c063c');
    g.addColorStop(.42, '#ef1748'); g.addColorStop(.52, '#1d0a30');
    g.addColorStop(.72, '#b50735'); g.addColorStop(1, '#fd2e6b00');
    c.fillStyle = g; c.globalAlpha = .065; c.fill();
  }
  c.restore();
  // Calligraphic smoke curls stream upward from the bottom corners.
  for (let side = 0; side < 2; side++) {
    for (let j = 0; j < 18; j++) {
      c.beginPath();
      for (let k = 0; k < 65; k++) {
        const u = k / 64;
        const x = (side ? w : 0) + (side ? -1 : 1) * (w * .04 + Math.sin(u * 8 - t * .26 + j * .065) * w * .06 + u * w * .08);
        const y = h * (1.1 - u * .87);
        if (!k) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.globalAlpha = .07; c.strokeStyle = j % 3 ? '#980739' : '#ff4261'; c.lineWidth = 1 + j % 4; c.stroke();
    }
  }
  for (let i = 0; i < 40; i++) {
    const p = particles[i];
    const x = p.x * w, y = fract(p.y - t * .024 * (.3 + p.z)) * h;
    c.globalAlpha = .15 + p.z * .5; c.fillStyle = i % 4 ? '#eb3157' : '#ffd0c9';
    c.fillRect(x, y, 1 + p.z * 2, 2 + p.z * 5);
  }
}

function cyber(c, w, h, t) {
  // Two flowing, folded interference ribbons. Each cross section is shaded
  // separately, giving the surface a metallic front and a violet reverse.
  glow(c, w * .08, h * .55, w * .36, '#7927ff', .16);
  glow(c, w * .92, h * .2, w * .3, '#00dbed', .12);
  for (let side = 0; side < 2; side++) {
    const points = [];
    for (let i = 0; i <= 360; i++) {
      const u = i / 360;
      const phase = u * 9 + t * .25 + side * 2.6;
      const x = w * ((side ? .86 : .13) + Math.sin(phase) * .065);
      const y = u * (h + 100) - 50;
      const twist = Math.sin(phase * 1.3 + t * .17);
      const breadth = Math.min(w * .065, 65) * twist;
      points.push({x, y, breadth, twist});
    }
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const g = c.createLinearGradient(a.x - Math.abs(a.breadth) - 1, a.y, a.x + Math.abs(a.breadth) + 1, a.y);
      g.addColorStop(0, '#512474'); g.addColorStop(.19, '#da9bff');
      g.addColorStop(.3, '#f1e9ff'); g.addColorStop(.39, '#6178a8');
      g.addColorStop(.55, '#19183d'); g.addColorStop(.78, '#69f4ee'); g.addColorStop(1, '#b887ed');
      c.globalAlpha = 1; c.fillStyle = g;
      c.beginPath(); c.moveTo(a.x - a.breadth, a.y); c.lineTo(a.x + a.breadth, a.y);
      c.lineTo(b.x + b.breadth, b.y + 1); c.lineTo(b.x - b.breadth, b.y + 1); c.closePath(); c.fill();
      c.strokeStyle = '#c1ccff'; c.globalAlpha = .7; c.lineWidth = .6;
      c.beginPath(); c.moveTo(a.x + a.breadth, a.y); c.lineTo(b.x + b.breadth, b.y); c.stroke();
    }
  }
  for (let i = 0; i < 26; i++) {
    const p = particles[i], x = p.x * w, y = fract(p.y - t * .009) * h;
    star(c, x, y, 2 + p.z * 7, i % 3 ? '#d7c9ff' : '#a0fff4', .22 + .2 * Math.sin(t * .65 + p.phase));
    if (i % 4 === 0) {
      c.globalAlpha = .2; c.strokeStyle = '#bba5f8'; c.lineWidth = .6;
      c.strokeRect(x - 10, y - 10, 20, 20);
      c.fillStyle = '#d8cbff'; c.fillRect(x + 14, y, 10, 1);
    }
  }
}

const painters = { 'dust-light': loveglass, snowfall, 'ink-bloom': crimson, 'paper-shadow': cyber };
export function drawAuthoredAtmosphere(context, key, width, height, seconds = 0) {
  context.clearRect(0, 0, width, height);
  if (!painters[key] || width <= 0 || height <= 0) return;
  context.save();
  painters[key](context, width, height, Number.isFinite(seconds) ? seconds : 0);
  context.restore();
}
