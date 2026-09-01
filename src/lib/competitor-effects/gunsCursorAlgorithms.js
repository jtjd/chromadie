/*
 * Values and state transitions copied from the behavior of the cursor-effects
 * controllers loaded by Guns.lol. Rendering stays in Chromadie's bounded
 * canvas layer; these helpers only describe the observed motion.
 */

export const GUNS_TRAILING_CURSOR_PARTICLES = 15;
export const GUNS_TRAILING_CURSOR_RATE = 0.6;
export const GUNS_FAIRY_DUST_LIFE_MIN = 60;
export const GUNS_FAIRY_DUST_LIFE_MAX = 90;
export const GUNS_FAIRY_DUST_GRAVITY = 0.02;

export function createGunsTrailingCursorNodes(point, count = GUNS_TRAILING_CURSOR_PARTICLES) {
  const x = Number(point?.x) || 0;
  const y = Number(point?.y) || 0;
  return Array.from({ length: Math.max(1, Math.floor(Number(count) || GUNS_TRAILING_CURSOR_PARTICLES)) }, () => ({ x, y }));
}

/**
 * The upstream trailingCursor loop assigns the head to the pointer, then
 * advances the next target by `(next.position - current.position) * rate`.
 * Mutating in order is important: each following node reads the prior frame's
 * next node, exactly as the shipped controller does.
 */
export function advanceGunsTrailingCursorNodes(nodes, point, rate = GUNS_TRAILING_CURSOR_RATE) {
  if (!Array.isArray(nodes) || !nodes.length) return [];
  let targetX = Number(point?.x) || 0;
  let targetY = Number(point?.y) || 0;
  const followRate = Number.isFinite(Number(rate)) ? Number(rate) : GUNS_TRAILING_CURSOR_RATE;

  nodes.forEach((node, index) => {
    const next = nodes[index + 1] || nodes[0];
    node.x = targetX;
    node.y = targetY;
    targetX += (next.x - node.x) * followRate;
    targetY += (next.y - node.y) * followRate;
  });
  return nodes;
}

export function createGunsFairyDustParticle(x, y, random = Math.random) {
  const sample = typeof random === 'function' ? random : Math.random;
  const initialLifeSpan = Math.floor(
    GUNS_FAIRY_DUST_LIFE_MIN
      + sample() * (GUNS_FAIRY_DUST_LIFE_MAX - GUNS_FAIRY_DUST_LIFE_MIN)
  );
  return {
    x: Number(x) || 0,
    y: Number(y) || 0,
    initialLifeSpan,
    lifeSpan: initialLifeSpan,
    velocity: {
      x: (sample() < 0.5 ? -1 : 1) * (sample() / 2),
      y: 0.7 * sample() + 0.9
    },
    scale: 1
  };
}

export function advanceGunsFairyDustParticle(particle, multiplier = 1) {
  if (!particle || typeof particle !== 'object') return null;
  const step = Math.max(0, Number(multiplier) || 0);
  particle.x += particle.velocity.x * step;
  particle.y += particle.velocity.y * step;
  particle.lifeSpan -= step;
  particle.velocity.y += GUNS_FAIRY_DUST_GRAVITY * step;
  particle.scale = Math.max(particle.lifeSpan / Math.max(1, particle.initialLifeSpan), 0);
  return particle;
}
