import { clamp, smoothstep, seededNoise } from './primitives.js';
export { clamp, easeOut, easeInOut, smoothstep, mixColors, rgba, createLinearGradient, createRadialGradient } from './primitives.js';

export const TAU = Math.PI * 2;
export const phase = (p, start, end) => clamp((p - start) / Math.max(.001, end - start));
export const envelope = (p, start = 0, end = 1, edge = .12) =>
  smoothstep(phase(p, start, start + edge)) * (1 - smoothstep(phase(p, end - edge, end)));
export const noise = (seed, index) => seededNoise(seed, index * 7919 + 104729);

// All paint operations inherit the scene's lifecycle opacity.
export function fill(ctx, color, alpha, path) {
  ctx.save(); ctx.fillStyle = color; ctx.globalAlpha *= clamp(alpha);
  ctx.beginPath(); path(ctx); ctx.fill(); ctx.restore();
}
export function stroke(ctx, color, weight, alpha, path) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = Math.max(.25, weight);
  ctx.globalAlpha *= clamp(alpha); ctx.beginPath(); path(ctx); ctx.stroke(); ctx.restore();
}
export function oval(ctx, x, y, rx, ry, angle, color, alpha = 1) {
  if (rx <= 0 || ry <= 0) return;
  fill(ctx, color, alpha, c => c.ellipse(x, y, rx, ry, angle, 0, TAU));
}
export function dot(ctx, x, y, radius, color, alpha = 1) {
  if (radius <= 0) return;
  fill(ctx, color, alpha, c => c.arc(x, y, radius, 0, TAU));
}
export function polygon(ctx, points, color, alpha = 1) {
  fill(ctx, color, alpha, c => {
    points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
  });
}
export function glint(ctx, x, y, size, color, alpha = 1) {
  polygon(ctx, [[x, y-size], [x+size*.15,y-size*.15], [x+size,y], [x+size*.15,y+size*.15], [x,y+size], [x-size*.15,y+size*.15], [x-size,y], [x-size*.15,y-size*.15]], color, alpha);
}
export function glow(ctx, x, y, radius, color, alpha = .3) {
  if (!ctx.createRadialGradient || radius <= 0) return;
  const g = ctx.createRadialGradient(x,y,0,x,y,radius);
  g.addColorStop(0,color); g.addColorStop(1,'transparent');
  fill(ctx,g,alpha,c=>c.arc(x,y,radius,0,TAU));
}
