import { createLinearGradient } from './primitives.js';
import { getParticleEnvelope } from './motionTiming.js';

const TAU = Math.PI * 2;


function star(ctx, x, y, radius, rotation, alpha, pink = false) {
  ctx.save?.();
  ctx.translate?.(x, y);
  ctx.rotate?.(rotation);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = createLinearGradient(ctx, pink ? ['#FFF0FB', '#FF64CB', '#D33CAE'] : ['#FFFACB', '#FFD448', '#FF922C'], 0, -radius, 0, radius, '#FFD448');
  ctx.shadowColor = pink ? '#FF65C5' : '#FFC349';
  ctx.shadowBlur = radius * 0.65;
  ctx.beginPath?.();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const r = i % 2 ? radius * 0.48 : radius;
    if (i === 0) ctx.moveTo?.(Math.cos(angle) * r, Math.sin(angle) * r);
    else ctx.lineTo?.(Math.cos(angle) * r, Math.sin(angle) * r);
  }
  ctx.closePath?.();
  ctx.fill?.();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#FFF6D5';
  ctx.lineWidth = 0.6;
  ctx.stroke?.();
  // A tiny paired highlight gives the larger companion a friendly face.
  if (radius > 3.8) {
    ctx.fillStyle = '#7D431F';
    ctx.fillRect?.(-radius * 0.27, -radius * 0.08, 0.85, 1.4);
    ctx.fillRect?.(radius * 0.18, -radius * 0.08, 0.85, 1.4);
  }
  ctx.restore?.();
}

function drawStarCompanions(ctx, model, drawBase) {
  drawBase(ctx, model);
  const p = model.progress;
  if (p > 0.72) return;
  const travel = p / 0.72;
  const { metrics: m } = model;
  const scale = Math.min(1.2, m.fontSize / 38);
  const alpha = getParticleEnvelope(travel);
  for (let companion = 1; companion >= 0; companion--) {
    const q = Math.max(0, Math.min(1, travel - companion * 0.11));
    const x = m.x - m.width * 0.48 + q * m.width * 0.96;
    const hop = Math.abs(Math.sin(q * Math.PI * 4));
    const y = m.y - m.fontSize * 0.34 - (3 + hop * 11) * scale;
    for (let trail = 3; trail > 0; trail--) {
      star(ctx, x - trail * 5 * scale, y + trail * 1.2 * scale, (1.4 - trail * 0.18) * scale, q * TAU, alpha * (0.45 - trail * 0.08), companion === 1);
    }
    star(ctx, x, y, (companion ? 4.1 : 5.8) * scale, Math.sin(q * TAU * 2) * 0.28, alpha, companion === 1);
  }
}

function heart(ctx, x, y, size, angle, alpha) {
  if (!ctx.bezierCurveTo) return;
  ctx.save?.();
  ctx.translate?.(x, y);
  ctx.rotate?.(angle);
  ctx.scale?.(size, size);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = createLinearGradient(ctx, ['#FFE1FA', '#FF58B6', '#F32E78'], 0, -1, 0, 1, '#FF58B6');
  ctx.shadowColor = '#FF398C';
  ctx.shadowBlur = 0.65;
  ctx.beginPath();
  ctx.moveTo(0, 0.95);
  ctx.bezierCurveTo(-0.35, 0.62, -1.15, 0.08, -0.95, -0.5);
  ctx.bezierCurveTo(-0.78, -1.06, -0.2, -1.04, 0, -0.48);
  ctx.bezierCurveTo(0.2, -1.04, 0.78, -1.06, 0.95, -0.5);
  ctx.bezierCurveTo(1.15, 0.08, 0.35, 0.62, 0, 0.95);
  ctx.fill?.();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#FFF1FB';
  ctx.lineWidth = 0.09;
  ctx.beginPath();
  ctx.moveTo(-0.69, -0.27);
  ctx.bezierCurveTo(-0.8, -0.61, -0.49, -0.74, -0.32, -0.57);
  ctx.stroke?.();
  ctx.restore?.();
}

function drawHeartPop(ctx, model, drawBase) {
  drawBase(ctx, model);
  const p = model.progress;
  const { metrics: m } = model;
  const scale = Math.min(1.15, m.fontSize / 38);
  // A deliberate three-heart phrase, followed by a quiet hold.
  for (let i = 0; i < 3; i++) {
    const life = (p - 0.08 - i * 0.13) / 0.38;
    if (life <= 0 || life >= 1) continue;
    const anchor = [0.28, 0.68, 0.48][i];
    const x = m.x + (anchor - 0.5) * m.width + Math.sin(life * Math.PI * 1.5 + i) * 5 * scale;
    const y = m.y - m.fontSize * 0.2 - life * 24 * scale;
    const pop = Math.min(1, life / 0.14);
    const size = (i === 1 ? 5.8 : 4.7) * scale * (0.65 + Math.sin(pop * Math.PI / 2) * 0.35);
    heart(ctx, x, y, size, Math.sin(life * Math.PI * 2 + i) * 0.18, getParticleEnvelope(life));
  }
}

export function drawAuthoredNameMotion(ctx, model, drawBase) {
  switch (model.motion.key) {
    case 'star-companions': drawStarCompanions(ctx, model, drawBase); return true;
    case 'heart-pop': drawHeartPop(ctx, model, drawBase); return true;
    default: return false;
  }
}
