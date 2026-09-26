export const TAU = Math.PI * 2;
export const fract = n => n - Math.floor(n);
export const noise = n => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
export const seeds = Object.freeze(Array.from({ length: 96 }, (_, i) => Object.freeze({
  x: noise(i + 1), y: noise(i + 101), z: noise(i + 201), phase: noise(i + 301) * TAU
})));

export function gradient(c, x0, y0, x1, y1, stops) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([offset, color]) => g.addColorStop(offset, color));
  return g;
}

export function glow(c, x, y, radius, color, alpha = 1) {
  const g = c.createRadialGradient(x, y, 0, x, y, Math.max(.01, radius));
  g.addColorStop(0, color); g.addColorStop(1, 'transparent');
  c.save(); c.globalAlpha *= alpha; c.fillStyle = g;
  c.fillRect(x - radius, y - radius, radius * 2, radius * 2); c.restore();
}

export function ellipse(c, x, y, rx, ry, color, rotation = 0) {
  c.fillStyle = color; c.beginPath(); c.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), rotation, 0, TAU); c.fill();
}

export function stars(c, w, h, t, color = '#c7e5ff', count = 64) {
  c.save();
  for (let i = 0; i < count; i++) {
    const p = seeds[i], x = p.x * w, y = p.y * h;
    c.globalAlpha = .12 + p.z * .35 + .12 * Math.sin(t * .35 + p.phase);
    ellipse(c, x, y, .5 + p.z, .5 + p.z, color);
    if (i % 13 === 0) {
      c.strokeStyle = color; c.lineWidth = .6; c.beginPath();
      c.moveTo(x - 4, y); c.lineTo(x + 4, y); c.moveTo(x, y - 4); c.lineTo(x, y + 4); c.stroke();
    }
  }
  c.restore();
}
