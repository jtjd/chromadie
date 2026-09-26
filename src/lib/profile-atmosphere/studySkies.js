import { TAU, fract, seeds, gradient, glow, ellipse, stars } from './studyPrimitives.js';

export function aurora(c, w, h, t) {
  stars(c, w, h, t);
  glow(c, w * .2, h * .05, w * .65, '#00c59e', .14);
  // Adjacent translucent filaments build folded curtains, not a flat sine wave.
  for (let band = 0; band < 3; band++) {
    for (let i = 0; i < 160; i++) {
      const u = i / 160, x = Math.round(u * w);
      const fold = Math.sin(u * 9 + band * 1.7 + t * .13);
      const y = h * (.11 + band * .055 + .07 * fold + .028 * Math.sin(u * 22 - t * .21));
      const length = h * (.13 + .09 * Math.sin(u * 7 + band + t * .15) ** 2);
      c.fillStyle = gradient(c, x, y - length * .35, x, y + length, [
        [0, '#702dff00'], [.3, '#825dff30'], [.62, band === 1 ? '#38ffc772' : '#51e8ed60'], [.88, '#91ffc41c'], [1, '#30ef9b00']
      ]);
      c.globalAlpha = .45 + .4 * Math.sin(u * Math.PI);
      c.fillRect(x, y - length * .35, Math.round((i + 1) * w / 160) - x, length * 1.35);
    }
  }
  c.globalAlpha = 1;
  // A second low ribbon keeps the composition alive on tall portrait profiles.
  for (let j = 0; j < 16; j++) {
    c.beginPath();
    for (let i = 0; i <= 70; i++) {
      const u = i / 70, x = u * w, y = h * (.93 + .035 * Math.sin(u * 8 + t * .13 + j * .08)) + j * 1.4;
      if (!i) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.strokeStyle = j % 3 ? '#31dea417' : '#8670ff30'; c.lineWidth = 1.5; c.stroke();
  }
}

export function orbit(c, w, h, t) {
  stars(c, w, h, t, '#bfd8ff', 96);
  const r = Math.min(w * .16, h * .23), x = w * .8, y = h * .2;
  glow(c, x, y, r * 2.3, '#3966ff', .24);
  c.save(); c.translate(x, y); c.rotate(-.36);
  // Rear ring, shaded sphere, then foreground ring: genuine occlusion.
  const rings = front => {
    for (let j = 0; j < 28; j++) {
      c.strokeStyle = j % 5 ? '#a1bffb' : '#f2daff'; c.globalAlpha = .08 + .18 * Math.sin(j / 28 * Math.PI);
      c.lineWidth = Math.max(.6, r * .009); c.beginPath();
      c.ellipse(0, 0, r * (1.35 + j * .018), r * (.34 + j * .0045), 0, front ? 0 : Math.PI, front ? Math.PI : TAU); c.stroke();
    }
  };
  rings(false);
  c.globalAlpha = 1;
  const planet = c.createRadialGradient(-r * .42, -r * .5, 0, 0, 0, r);
  planet.addColorStop(0, '#acdedf'); planet.addColorStop(.35, '#4888ce'); planet.addColorStop(.7, '#233779'); planet.addColorStop(1, '#080d29');
  ellipse(c, 0, 0, r, r, planet);
  c.save(); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.clip();
  for (let j = 0; j < 30; j++) {
    const py = -r + j * r / 15;
    c.beginPath(); c.moveTo(-r, py);
    c.bezierCurveTo(-r * .4, py + Math.sin(j + t * .06) * r * .15, r * .4, py + r * .12, r, py - r * .04);
    c.strokeStyle = j % 3 ? '#8bdada22' : '#19114b44'; c.lineWidth = r * .035; c.stroke();
  }
  c.restore(); rings(true); c.restore();
  c.strokeStyle = '#adc7f51b'; c.lineWidth = .8;
  for (let j = 0; j < 3; j++) {
    c.beginPath(); c.ellipse(w * .5, h * .52, w * (.48 + j * .07), h * (.4 + j * .035), -.15, 0, TAU); c.stroke();
  }
  const a = t * .045 + 2.2, mx = w * .5 + Math.cos(a) * w * .48, my = h * .52 + Math.sin(a) * h * .4;
  glow(c, mx, my, 14, '#b8dcff', .45); ellipse(c, mx, my, 2.5, 2.5, '#dcf1ff');
}

export function lanterns(c, w, h, t) {
  glow(c, w * .1, h * .85, Math.min(w, h) * .7, '#f66a1b', .13);
  stars(c, w, h, t, '#ffd694', 42);
  for (let i = 0; i < 19; i++) {
    const p = seeds[i], side = i % 2;
    const x = w * (side ? .79 + p.x * .18 : .03 + p.x * .18) + Math.sin(t * .22 + p.phase) * w * .012;
    const y = (1.18 - fract(p.y + t * (.008 + p.z * .006)) * 1.4) * h;
    const s = (12 + p.z * 24) * Math.min(1, w / 650);
    glow(c, x, y + s * .6, s * 2.7, '#ff9b3b', .13 + p.z * .14);
    c.save(); c.translate(x, y); c.rotate(Math.sin(t * .28 + p.phase) * .1);
    c.globalAlpha = .4 + p.z * .55;
    c.fillStyle = gradient(c, -s, 0, s, 0, [[0, '#8a241e'], [.23, '#ed6835'], [.52, '#ffba65'], [.8, '#ef642d'], [1, '#8a241e']]);
    c.beginPath(); c.moveTo(-s * .65, -s); c.quadraticCurveTo(0, -s * 1.17, s * .65, -s);
    c.quadraticCurveTo(s * .85, 0, s * .5, s); c.quadraticCurveTo(0, s * 1.18, -s * .5, s); c.quadraticCurveTo(-s * .85, 0, -s * .65, -s); c.fill();
    c.strokeStyle = '#ffd69e55'; c.lineWidth = .7;
    for (const rib of [-.4, 0, .4]) {
      c.beginPath(); c.moveTo(s * rib, -s); c.quadraticCurveTo(s * rib * 1.35, 0, s * rib * .75, s); c.stroke();
    }
    ellipse(c, 0, s, s * .5, s * .13, '#ffdb97');
    glow(c, 0, s * .75, s * .65, '#fff2ba', .7);
    c.restore();
  }
}

export function retro(c, w, h, t) {
  const x = w * .5, y = h * .17, r = Math.min(w * .24, h * .145);
  glow(c, x, y, r * 2.2, '#ff3265', .25);
  c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip();
  c.fillStyle = gradient(c, x, y - r, x, y + r, [[0, '#ffd76a'], [.45, '#ff7848'], [.8, '#ff277c'], [1, '#b538cc']]);
  c.fillRect(x - r, y - r, r * 2, r * .82);
  for (let j = 0; j < 9; j++) c.fillRect(x - r, y - r * .12 + j * r * .14, r * 2, r * (.11 - j * .008));
  c.restore();
  const horizon = h * .83;
  c.fillStyle = gradient(c, 0, horizon - 80, 0, h, [[0, '#5b208a00'], [.4, '#36155488'], [1, '#060a1a30']]);
  c.beginPath(); c.moveTo(0, horizon);
  for (let i = 0; i <= 24; i++) c.lineTo(i * w / 24, horizon - (12 + seeds[i].z * 45) * Math.abs(i / 12 - 1));
  c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
  c.strokeStyle = '#f641c349'; c.lineWidth = .8;
  for (let j = -12; j <= 12; j++) {
    c.beginPath(); c.moveTo(w * .5 + j * 8, horizon); c.lineTo(w * .5 + j * w * .13, h); c.stroke();
  }
  for (let i = 0; i < 16; i++) {
    const z = fract(i / 16 + t * .015), py = horizon + z ** 2 * (h - horizon);
    c.globalAlpha = z; c.beginPath(); c.moveTo(0, py); c.lineTo(w, py); c.stroke();
  }
  c.globalAlpha = 1; stars(c, w, h * .7, t, '#cfa4ff', 32);
}
