const TAU = Math.PI * 2;
const STEP = 1 / 60;
const limit = (x, y, max) => { const s = Math.min(1, max / (Math.hypot(x, y) || 1)); return [x * s, y * s]; };

// Persistent agents steer toward independent destinations. Depth is a lane,
// not random noise: change lanes only beyond the complete avatar silhouette.
export function createCreatureFlight(effectKey) {
  const bat = effectKey === 'bat-orbit';
  const count = effectKey === 'fireflies' ? 8 : bat ? 6 : 5;
  let seed = bat ? 1741 : 3571;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const agents = Array.from({ length: count }, (_, i) => {
    const angle = i / count * TAU;
    return { x: Math.cos(angle) * 1.35, y: Math.sin(angle) * 1.35,
      vx: -Math.sin(angle) * .2, vy: Math.cos(angle) * .2, rotation: angle + Math.PI,
      tx: 0, ty: 0, age: 10, depth: .4, desiredDepth: .4, phase: random() * TAU, bank: 0, scale: 1.048 };
  });
  let accumulator = 0;
  function step() {
    const forces = agents.map((a, index) => {
      a.age += STEP;
      if (a.age > 5 || Math.hypot(a.tx - a.x, a.ty - a.y) < .18) {
        const angle = random() * TAU;
        const radius = 1.48 + random() * .1;
        a.tx = Math.cos(angle) * radius; a.ty = Math.sin(angle) * radius;
        a.age = 0; a.desiredDepth = random() < .3 ? -.4 : .4;
      }
      const [dx, dy] = limit(a.tx - a.x, a.ty - a.y, bat ? .48 : .35);
      let fx = (dx - a.vx) * 1.4, fy = (dy - a.vy) * 1.4;
      for (let j = 0; j < agents.length; j++) {
        if (index === j) continue;
        const b = agents[j];
        // Anticipate contact, then steer before silhouettes touch.
        let sx = a.x - b.x + (a.vx - b.vx) * .45;
        let sy = a.y - b.y + (a.vy - b.vy) * .45;
        const distance = Math.hypot(sx, sy);
        if (distance < 1.05) {
          if (distance < .001) { sx = Math.cos(index / count * TAU) * .01; sy = Math.sin(index / count * TAU) * .01; }
          const strength = ((1.05 - distance) / 1.05) ** 2 * 7;
          fx += sx / (Math.hypot(sx, sy) || 1) * strength;
          fy += sy / (Math.hypot(sx, sy) || 1) * strength;
        }
      }
      const radius = Math.hypot(a.x, a.y);
      if (radius > 1.6) { fx -= a.x * (radius - 1.6) * 8; fy -= a.y * (radius - 1.6) * 8; }
      return limit(fx, fy, 2.0);
    });
    agents.forEach((a, i) => {
      const previous = a.rotation;
      [a.vx, a.vy] = limit(a.vx + forces[i][0] * STEP, a.vy + forces[i][1] * STEP, bat ? .52 : .4);
      a.x += a.vx * STEP; a.y += a.vy * STEP;
      if (Math.hypot(a.vx, a.vy) > .025) {
        const target = Math.atan2(a.vy, a.vx) + Math.PI / 2;
        const delta = Math.atan2(Math.sin(target - previous), Math.cos(target - previous));
        a.rotation += delta * .12;
        a.bank += (Math.max(-.5, Math.min(.5, delta * 2)) - a.bank) * .08;
      }
      // Radius 1 = avatar edge. .4 covers wings, glow, and pointer offset.
      if (Math.hypot(a.x, a.y) > 1.4) a.depth = a.desiredDepth;
    });
  }
  return {
    advance(seconds) {
      accumulator += Math.max(0, Math.min(seconds, .1));
      while (accumulator >= STEP) { step(); accumulator -= STEP; }
      return agents.map(a => ({ ...a }));
    }
  };
}
