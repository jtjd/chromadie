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
export const GUNS_BUBBLE_LIFE_MIN = 60;
export const GUNS_BUBBLE_LIFE_SPAN = 60;
export const GUNS_BUBBLE_BASE_DIMENSION = 4;
export const GUNS_CHARACTER_LIFE_MIN = 80;
export const GUNS_CHARACTER_LIFE_SPAN = 60;
export const GUNS_CHARACTER_MAX_VELOCITY = 5;
export const GUNS_EMOJI_LIFE_MIN = 80;
export const GUNS_EMOJI_LIFE_SPAN = 60;
export const GUNS_EMOJI_GRAVITY = 0.05;
export const GUNS_FOLLOWING_DOT_RADIUS = 10;
export const GUNS_FOLLOWING_DOT_LAG = 10;
export const GUNS_TEXT_FLAG_GAP = 14;
export const GUNS_TEXT_FLAG_LAG = 5;
export const GUNS_TEXT_FLAG_PHASE_STEP = 0.15;
export const GUNS_TEXT_FLAG_WAVE_X = 2;
export const GUNS_TEXT_FLAG_WAVE_Y = 5;
export const GUNS_SPRINGY_EMOJI_NODES = 7;
export const GUNS_SPRINGY_EMOJI_SEPARATION = 10;
export const GUNS_SPRINGY_EMOJI_STIFFNESS = 0.01;
export const GUNS_SPRINGY_EMOJI_DAMPING = 10;
export const GUNS_SPRINGY_EMOJI_GRAVITY = 50;

function randomLife(random, minimum, span) {
  const sample = typeof random === 'function' ? random : Math.random;
  return Math.floor(minimum + sample() * span);
}

function signedRandom(random, magnitude) {
  const sample = typeof random === 'function' ? random : Math.random;
  return (sample() < 0.5 ? -1 : 1) * sample() * magnitude;
}

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

/** Values copied from cursor-effects' BubbleCursor particle controller. */
export function createGunsBubbleParticle(x, y, random = Math.random) {
  const initialLifeSpan = randomLife(random, GUNS_BUBBLE_LIFE_MIN, GUNS_BUBBLE_LIFE_SPAN);
  return {
    x: Number(x) || 0,
    y: Number(y) || 0,
    initialLifeSpan,
    lifeSpan: initialLifeSpan,
    velocity: {
      x: signedRandom(random, 0.1),
      y: -1 * (typeof random === 'function' ? random() : Math.random()) - 0.4
    },
    baseDimension: GUNS_BUBBLE_BASE_DIMENSION,
    scale: 0.2
  };
}

export function advanceGunsBubbleParticle(particle, multiplier = 1, random = Math.random) {
  if (!particle || typeof particle !== 'object') return null;
  const step = Math.max(0, Number(multiplier) || 0);
  const sample = typeof random === 'function' ? random : Math.random;
  particle.x += particle.velocity.x * step;
  particle.y += particle.velocity.y * step;
  particle.velocity.x += 2 * (sample() < 0.5 ? -1 : 1) / 75 * step;
  particle.velocity.y -= sample() / 600 * step;
  particle.lifeSpan -= step;
  particle.scale = 0.2 + (particle.initialLifeSpan - particle.lifeSpan) / Math.max(1, particle.initialLifeSpan);
  return particle;
}

/** Values copied from cursor-effects' CharacterCursor particle controller. */
export function createGunsCharacterParticle(x, y, random = Math.random, character = 'h', sprite = null) {
  const sample = typeof random === 'function' ? random : Math.random;
  const initialLifeSpan = randomLife(sample, GUNS_CHARACTER_LIFE_MIN, GUNS_CHARACTER_LIFE_SPAN);
  return {
    x: (Number(x) || 0),
    y: (Number(y) || 0),
    character,
    sprite,
    rotationSign: sample() < 0.5 ? -1 : 1,
    age: 0,
    initialLifeSpan,
    lifeSpan: initialLifeSpan,
    velocity: {
      x: signedRandom(sample, GUNS_CHARACTER_MAX_VELOCITY),
      y: signedRandom(sample, GUNS_CHARACTER_MAX_VELOCITY)
    },
    scale: 2,
    rotation: 0
  };
}

export function advanceGunsCharacterParticle(particle, multiplier = 1, random = Math.random) {
  if (!particle || typeof particle !== 'object') return null;
  const step = Math.max(0, Number(multiplier) || 0);
  const sample = typeof random === 'function' ? random : Math.random;
  particle.x += particle.velocity.x * step;
  particle.y += particle.velocity.y * step;
  particle.lifeSpan -= step;
  particle.age += step;
  particle.velocity.x += (sample() < 0.5 ? -1 : 1) / 30 * step;
  particle.velocity.y += (sample() < 0.5 ? -1 : 1) / 15 * step;
  particle.scale = Math.max((particle.initialLifeSpan - particle.age) / particle.initialLifeSpan * 2, 0);
  particle.rotation = 0.0174533 * (particle.rotationSign * ((particle.initialLifeSpan - particle.age) / 5));
  return particle;
}

/** Values copied from cursor-effects' EmojiCursor particle controller. */
export function createGunsEmojiParticle(x, y, random = Math.random, emoji = '😀', sprite = null) {
  const sample = typeof random === 'function' ? random : Math.random;
  const initialLifeSpan = randomLife(sample, GUNS_EMOJI_LIFE_MIN, GUNS_EMOJI_LIFE_SPAN);
  return {
    x: Number(x) || 0,
    y: Number(y) || 0,
    emoji,
    sprite,
    initialLifeSpan,
    lifeSpan: initialLifeSpan,
    velocity: {
      x: signedRandom(sample, 0.5),
      y: 0.4 * sample() + 0.8
    },
    scale: 1
  };
}

export function advanceGunsEmojiParticle(particle, multiplier = 1) {
  if (!particle || typeof particle !== 'object') return null;
  const step = Math.max(0, Number(multiplier) || 0);
  particle.x += particle.velocity.x * step;
  particle.y += particle.velocity.y * step;
  particle.lifeSpan -= step;
  particle.velocity.y += GUNS_EMOJI_GRAVITY * step;
  particle.scale = Math.max(particle.lifeSpan / Math.max(1, particle.initialLifeSpan), 0);
  return particle;
}

/** The cursor-effects FollowingDot controller uses a fixed radius and lag. */
export function createGunsFollowingDot(point = { x: 0, y: 0 }) {
  return {
    x: Number(point?.x) || 0,
    y: Number(point?.y) || 0
  };
}

export function advanceGunsFollowingDot(dot, point, lag = GUNS_FOLLOWING_DOT_LAG) {
  if (!dot || !point) return dot;
  const followLag = Number.isFinite(Number(lag)) && Number(lag) > 0
    ? Number(lag)
    : GUNS_FOLLOWING_DOT_LAG;
  dot.x += ((Number(point.x) || 0) - dot.x) / followLag;
  dot.y += ((Number(point.y) || 0) - dot.y) / followLag;
  return dot;
}

/** The TextFlag controller's fixed gap, lag, and sinusoidal head wobble. */
export function createGunsTextFlagNodes(text = ' Chromadie', point = { x: 0, y: 0 }) {
  return Array.from(String(text), letter => ({
    letter,
    x: Number(point?.x) || 0,
    y: Number(point?.y) || 0
  }));
}

export function advanceGunsTextFlag(nodes, point, phase = 0, options = {}) {
  if (!Array.isArray(nodes) || !nodes.length || !point) return phase;
  const gap = Number.isFinite(Number(options.gap)) ? Number(options.gap) : GUNS_TEXT_FLAG_GAP;
  const lag = Number.isFinite(Number(options.lag)) && Number(options.lag) > 0
    ? Number(options.lag)
    : GUNS_TEXT_FLAG_LAG;
  const nextPhase = phase + GUNS_TEXT_FLAG_PHASE_STEP;
  for (let index = nodes.length - 1; index > 0; index -= 1) {
    nodes[index].x = nodes[index - 1].x + gap;
    nodes[index].y = nodes[index - 1].y;
  }
  nodes[0].x += ((Number(point.x) || 0) - nodes[0].x) / lag + GUNS_TEXT_FLAG_WAVE_X * Math.cos(nextPhase) + 2;
  nodes[0].y += ((Number(point.y) || 0) - nodes[0].y) / lag + GUNS_TEXT_FLAG_WAVE_Y * Math.sin(nextPhase);
  return nextPhase;
}

/** Spring/constraint helpers copied from cursor-effects' SpringyEmojiCursor. */
export function createGunsSpringyEmojiNodes(point = { x: 0, y: 0 }, count = GUNS_SPRINGY_EMOJI_NODES) {
  const x = Number(point?.x) || 0;
  const y = Number(point?.y) || 0;
  return Array.from({ length: Math.max(1, Math.floor(Number(count) || GUNS_SPRINGY_EMOJI_NODES)) }, () => ({
    x,
    y,
    velocityX: 0,
    velocityY: 0
  }));
}

export function applyGunsSpringyEmojiConstraint(first, second, force) {
  if (!first || !second || !force) return force;
  const distanceX = first.x - second.x;
  const distanceY = first.y - second.y;
  const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
  if (distance > GUNS_SPRINGY_EMOJI_SEPARATION) {
    const tension = GUNS_SPRINGY_EMOJI_SEPARATION * (distance - GUNS_SPRINGY_EMOJI_SEPARATION);
    force.x += distanceX / distance * tension;
    force.y += distanceY / distance * tension;
  }
  return force;
}

export function advanceGunsSpringyEmojiNodes(nodes, point, width, height, multiplier = 1) {
  if (!Array.isArray(nodes) || !nodes.length || !point) return nodes;
  const step = Math.max(0, Number(multiplier) || 0);
  const boundaryWidth = Math.max(1, Number(width) || 1);
  const boundaryHeight = Math.max(1, Number(height) || 1);
  nodes[0].x = Number(point.x) || 0;
  nodes[0].y = Number(point.y) || 0;
  for (let index = 1; index < nodes.length; index += 1) {
    const force = { x: 0, y: 0 };
    applyGunsSpringyEmojiConstraint(nodes[index - 1], nodes[index], force);
    if (index < nodes.length - 1) applyGunsSpringyEmojiConstraint(nodes[index + 1], nodes[index], force);
    const accelerationX = force.x - GUNS_SPRINGY_EMOJI_DAMPING * nodes[index].velocityX;
    const accelerationY = force.y - GUNS_SPRINGY_EMOJI_DAMPING * nodes[index].velocityY + GUNS_SPRINGY_EMOJI_GRAVITY;
    nodes[index].velocityX += GUNS_SPRINGY_EMOJI_STIFFNESS * accelerationX * step;
    nodes[index].velocityY += GUNS_SPRINGY_EMOJI_STIFFNESS * accelerationY * step;
    if (Math.abs(nodes[index].velocityX) < 0.1 && Math.abs(nodes[index].velocityY) < 0.1 && Math.abs(accelerationX) < 0.1 && Math.abs(accelerationY) < 0.1) {
      nodes[index].velocityX = 0;
      nodes[index].velocityY = 0;
    }
    nodes[index].x += nodes[index].velocityX * step;
    nodes[index].y += nodes[index].velocityY * step;
    if (nodes[index].y >= boundaryHeight - 12) {
      if (nodes[index].velocityY > 0) nodes[index].velocityY = 0.7 * -nodes[index].velocityY;
      nodes[index].y = boundaryHeight - 12;
    }
    if (nodes[index].x >= boundaryWidth - 11) {
      if (nodes[index].velocityX > 0) nodes[index].velocityX = 0.7 * -nodes[index].velocityX;
      nodes[index].x = boundaryWidth - 12;
    }
    if (nodes[index].x < 0) {
      if (nodes[index].velocityX < 0) nodes[index].velocityX = 0.7 * -nodes[index].velocityX;
      nodes[index].x = 0;
    }
  }
  return nodes;
}
