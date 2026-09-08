// Bounded, code-owned particle art. A particle keeps its birth color instead of
// changing hue whenever its screen coordinates cross an integer boundary.
export const AUTHORED_PARTICLE_KEYS = new Set([
  'pixel-wake', 'glass-shards', 'ember-ash', 'ink-drops', 'orbit-dust',
  'rain-trace', 'gold-fleck', 'color-memory', 'void-lensing'
]);

const palettes = {
  'pixel-wake': ['#00FF66', '#00DFFF', '#FF0099'],
  'glass-shards': ['#00E5FF', '#9900FF', '#FF0080'],
  'ember-ash': ['#FF4500', '#FF9A00', '#FFDD00'],
  'ink-drops': ['#FF007A', '#6600FF', '#00BFFF'],
  'orbit-dust': ['#9900FF', '#00DEFF', '#FFCC00'],
  'rain-trace': ['#00C8FF', '#0055FF', '#00FFAA'],
  'gold-fleck': ['#FFB800', '#FFD600', '#FF8500'],
  'void-lensing': ['#8800FF', '#FF00BB', '#00D9FF']
};

export function createAuthoredParticle(point, kind, colors, random = Math.random) {
  const angle = random() * Math.PI * 2;
  const palette = palettes[kind] || colors;
  return {
    kind, x: point.x, y: point.y, originX: point.x, originY: point.y,
    vx: Math.cos(angle) * (0.5 + random() * 1.7),
    vy: Math.sin(angle) * (0.5 + random() * 1.7),
    size: 4 + random() * 5, rotation: angle, age: 0,
    duration: kind === 'void-lensing' ? 52 : 38 + random() * 25,
    color: palette[Math.floor(random() * palette.length)] || '#FF28C8'
  };
}

export function advanceAuthoredParticle(p, delta) {
  p.age += delta;
  if (p.age >= p.duration) return false;
  if (p.kind === 'ember-ash') {
    p.vy -= 0.035 * delta;
    p.x += (p.vx + Math.sin(p.age * 0.15) * 0.4) * delta;
    p.y += (p.vy - 0.8) * delta;
  } else if (p.kind === 'gold-fleck' || p.kind === 'glass-shards') {
    p.vy += 0.055 * delta;
    p.x += p.vx * delta;
    p.y += p.vy * delta;
    p.rotation += 0.035 * delta;
  } else if (p.kind === 'orbit-dust') {
    const radius = 6 + p.age * 0.65;
    p.x = p.originX + Math.cos(p.rotation + p.age * 0.065) * radius;
    p.y = p.originY + Math.sin(p.rotation + p.age * 0.065) * radius * 0.6;
  } else if (p.kind === 'rain-trace') {
    p.y += (p.age < p.duration * 0.55 ? 2.4 : 0) * delta;
  } else if (p.kind === 'pixel-wake') {
    p.x += p.vx * delta;
    p.y += p.vy * delta;
  }
  return true;
}

function star(ctx, size) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const radius = i % 2 ? size * 0.24 : size;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

export function drawAuthoredParticle(ctx, p) {
  const progress = p.age / p.duration;
  const size = p.size;
  ctx.save();
  ctx.translate(p.x, p.y);
  // Retain chroma through most of the lifetime, then dissolve near the end.
  ctx.globalAlpha = Math.max(0, 1 - progress ** 4);
  ctx.fillStyle = p.color;
  ctx.strokeStyle = p.color;
  ctx.lineWidth = 1.5;
  if (p.kind === 'pixel-wake') {
    const step = Math.max(2, Math.round(size * (1 - progress * 0.6) / 2) * 2);
    ctx.fillRect(-step, -step, step, step);
    ctx.fillRect(0, 0, step, step);
    ctx.fillStyle = '#00FFFF';
    ctx.fillRect(-step, -step, 2, 2);
  } else if (p.kind === 'glass-shards') {
    ctx.rotate(p.rotation);
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.5);
    ctx.lineTo(size * 0.7, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, -size * 1.5); ctx.lineTo(0, size); ctx.stroke();
  } else if (p.kind === 'ember-ash' || p.kind === 'orbit-dust') {
    ctx.rotate(p.rotation);
    ctx.shadowBlur = 8;
    ctx.shadowColor = p.color;
    star(ctx, size * (1 - progress * 0.65));
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath(); ctx.arc(0, 0, 1.3, 0, Math.PI * 2); ctx.fill();
  } else if (p.kind === 'ink-drops') {
    const radius = size * (0.5 + Math.min(progress * 3, 0.7));
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 3; i++) {
      const angle = p.rotation + i * 2.1;
      ctx.beginPath(); ctx.arc(Math.cos(angle) * radius * 1.8, Math.sin(angle) * radius * 1.8, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  } else if (p.kind === 'rain-trace') {
    ctx.beginPath();
    if (progress < 0.55) {
      ctx.moveTo(0, -size); ctx.lineTo(-2, 0);
    } else {
      const radius = 2 + (progress - 0.55) * 38;
      ctx.ellipse(0, 0, radius, radius * 0.35, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
  } else if (p.kind === 'gold-fleck') {
    ctx.rotate(p.rotation);
    ctx.scale(Math.cos(p.age * 0.12), 1);
    ctx.fillRect(-size / 2, -size, size, size * 1.5);
    ctx.fillStyle = '#FFEE00'; ctx.fillRect(-size / 2, -size, 2, size * 1.5);
  } else if (p.kind === 'color-memory') {
    ctx.rotate(p.rotation);
    const radius = size * (0.6 + progress * 0.7);
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.strokeStyle = '#00FFFF'; ctx.strokeRect(-radius + 2, -radius + 2, radius * 2 - 4, radius * 2 - 4);
  } else if (p.kind === 'void-lensing') {
    const radius = 5 + progress * 25;
    ctx.rotate(p.rotation);
    ctx.fillStyle = '#120522';
    ctx.beginPath(); ctx.arc(0, 0, radius * 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 7; ctx.shadowColor = p.color;
    ctx.beginPath(); ctx.ellipse(0, 0, radius, radius * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#FF00EE';
    ctx.beginPath(); ctx.arc(0, 0, radius * 0.65, -Math.PI * 0.8, Math.PI * 0.15); ctx.stroke();
  }
  ctx.restore();
}
