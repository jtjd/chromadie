import { drawAvatarCreature, getCreaturePose } from './avatarCreatures.js';

const TAU = Math.PI * 2;
const ORBIT_OVERSCAN = 1.56;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Seeded waypoints give each creature its own wandering route without random
// frame-to-frame jitter. Cubic B-splines keep position/velocity/acceleration
// continuous at waypoint boundaries and inside the canvas's safe flight box.
function flightRandom(seed) {
  let value = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function flightPoint(effectKey, index, time) {
  const bat = effectKey === 'bat-orbit';
  const seed = index * 7919 + (bat ? 1741 : 3571);
  const duration = (bat ? 2100 : 2900) + flightRandom(seed) * 1700;
  const clock = time / duration + flightRandom(seed + 1) * 20;
  const segment = Math.floor(clock);
  const t = clock - segment;
  const weights = [(1 - t) ** 3 / 6, (3 * t ** 3 - 6 * t * t + 4) / 6,
    (-3 * t ** 3 + 3 * t * t + 3 * t + 1) / 6, t ** 3 / 6];
  let x = 0, y = 0, depth = 0;
  for (let i = 0; i < 4; i++) {
    const waypoint = seed + (segment + i) * 1013;
    const angle = flightRandom(waypoint) * TAU;
    // Waypoints near the outside create wide sweeps; interpolation allows
    // occasional crossings over the avatar rather than enforcing a ring.
    const radius = 1.08 + flightRandom(waypoint + 17) * .16;
    x += Math.cos(angle) * radius * weights[i];
    y += Math.sin(angle) * radius * weights[i];
    depth += (flightRandom(waypoint + 31) * 2 - 1) * weights[i];
  }
  return { x, y, depth };
}

export function getCreatureFlight(effectKey, index, time, pointer = null) {
  const position = flightPoint(effectKey, index, time);
  const before = flightPoint(effectKey, index, time - 40);
  const next = flightPoint(effectKey, index, time + 40);
  const dx = next.x - before.x, dy = next.y - before.y;
  const rotation = Math.atan2(dy, dx) + Math.PI / 2;
  const ax = next.x - 2 * position.x + before.x;
  const ay = next.y - 2 * position.y + before.y;
  const turn = (dx * ay - dy * ax) / Math.max(.00001, dx * dx + dy * dy);
  return {
    ...position,
    x: position.x + (pointer ? (pointer.x - .5) * .08 : 0),
    y: position.y + (pointer ? (pointer.y - .5) * .08 : 0),
    rotation, phase: flightRandom(index * 7919 + 51) * TAU,
    bank: clamp(turn * 14, -.55, .55), scale: 1 + position.depth * .12
  };
}

export function drawScene(context, effectKey, width, height, time, pointer, still = false) {
  if (!context || !width || !height) return;
  context.back.clearRect(0, 0, width, height);
  context.front.clearRect(0, 0, width, height);
  const centerX = width / 2;
  const centerY = height / 2;
  // The canvases intentionally overscan the avatar slot by 156%. Convert back
  // to the real slot radius so the orbit remains decorative instead of
  // dominating the user's avatar silhouette.
  const scaleFactor = Math.min(width, height) * 0.32;
  const states = [];
  const count = effectKey === 'butterfly-orbit' ? 5 : 6;
  for (let index = 0; index < count; index++) states.push(getCreatureFlight(effectKey, index, time, pointer));
  states.sort((a, b) => a.depth - b.depth);
  for (const state of states) {
    const target = state.depth < 0 ? context.back : context.front;
    const butterfly = effectKey === 'butterfly-orbit';
    const pose = getCreaturePose(effectKey, still ? 0 : time, still ? 0 : state.phase / TAU);
    drawAvatarCreature(target, effectKey, {
      x: centerX + state.x * scaleFactor,
      y: centerY + state.y * scaleFactor + (still ? 0 : pose.bob * scaleFactor * .015),
      width: scaleFactor * (butterfly ? .52 : .58) * state.scale,
      rotation: state.rotation, bank: state.bank,
      alpha: clamp(.94 + state.depth * .12, .85, 1), pose
    });
  }
}

/** @param {any} options */
export function createAvatarOrbitController({ host, backCanvas, frontCanvas, effectKey, enabled = true } = {}) {
  const back = backCanvas?.getContext?.('2d', { alpha: true });
  const front = frontCanvas?.getContext?.('2d', { alpha: true });
  if (!host || !back || !front) return Object.freeze({ update() {}, destroy() {} });

  let key = effectKey === 'bat-orbit' ? 'bat-orbit' : 'butterfly-orbit';
  let active = enabled === true;
  let inViewport = true;
  let visible = document.visibilityState === 'visible';
  let reduced = false;
  let destroyed = false;
  let frame = 0;
  let width = 1;
  let height = 1;
  let dpr = 1;
  const pointer = { x: .5, y: .5, width: 1, height: 1 };
  let pointerTarget = { x: .5, y: .5 };
  let lastDraw = 0;
  let mediaQuery;
  let resizeObserver;
  let intersectionObserver;

  const clear = () => {
    back.clearRect(0, 0, width, height);
    front.clearRect(0, 0, width, height);
  };

  const resize = () => {
    const rect = host.getBoundingClientRect?.() || {};
    const hostWidth = Math.max(1, Number(host.clientWidth) || Number(rect.width) || 1);
    const hostHeight = Math.max(1, Number(host.clientHeight) || Number(rect.height) || 1);
    width = hostWidth * ORBIT_OVERSCAN;
    height = hostHeight * ORBIT_OVERSCAN;
    const offsetX = (hostWidth - width) / 2;
    const offsetY = (hostHeight - height) / 2;
    dpr = Math.min(2, Math.max(1, Number(window.devicePixelRatio) || 1));
    [backCanvas, frontCanvas].forEach(canvas => {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.style.left = `${offsetX}px`;
      canvas.style.top = `${offsetY}px`;
      canvas.style.right = 'auto';
      canvas.style.bottom = 'auto';
    });
    back.setTransform(dpr, 0, 0, dpr, 0, 0);
    front.setTransform(dpr, 0, 0, dpr, 0, 0);
    clear();
    draw(performance.now());
  };

  const draw = time => {
    if (destroyed) return;
    const dt = Math.min(64, Math.max(0, time - lastDraw));
    lastDraw = time;
    const easing = 1 - Math.exp(-dt / 150);
    if (reduced || !active) {
      pointer.x = pointer.y = .5;
    } else {
      pointer.x += (pointerTarget.x - pointer.x) * easing;
      pointer.y += (pointerTarget.y - pointer.y) * easing;
    }
    const scene = { back, front };
    drawScene(scene, key, width, height, reduced || !active ? 0 : time, pointer, reduced || !active);
  };

  const schedule = () => {
    if (frame || destroyed || !active || reduced || !visible) return;
    frame = requestAnimationFrame(timestamp => {
      frame = 0;
      draw(timestamp);
      schedule();
    });
  };

  const pointerMove = event => {
    if (event.pointerType === 'touch' || reduced || !active) return;
    const rect = host.getBoundingClientRect?.();
    if (!rect || !rect.width || !rect.height) return;
    pointerTarget = {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1)
    };
  };
  const pointerLeave = () => {
    pointerTarget = { x: .5, y: .5 };
  };
  const visibilityChange = () => {
    visible = inViewport && document.visibilityState === 'visible';
    if (!visible) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      clear();
    } else {
      draw(reduced || !active ? 0 : performance.now());
      schedule();
    }
  };
  const reducedChange = event => {
    reduced = Boolean(event?.matches);
    if (reduced && frame) cancelAnimationFrame(frame);
    frame = 0;
    draw(0);
    if (!reduced) schedule();
  };

  host.addEventListener?.('pointermove', pointerMove, { passive: true });
  host.addEventListener?.('pointerleave', pointerLeave, { passive: true });
  document.addEventListener?.('visibilitychange', visibilityChange);
  mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  reduced = Boolean(mediaQuery?.matches);
  mediaQuery?.addEventListener?.('change', reducedChange);
  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
  }
  if (typeof IntersectionObserver === 'function') {
    intersectionObserver = new IntersectionObserver(entries => {
      inViewport = entries.some(entry => entry.isIntersecting && entry.intersectionRatio > 0);
      visible = inViewport && document.visibilityState === 'visible';
      if (!visible) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        clear();
      } else {
        resize();
        schedule();
      }
    }, { rootMargin: '120px' });
    intersectionObserver.observe(host);
  }
  resize();
  schedule();

  return Object.freeze({
    update(next = {}) {
      if (destroyed) return;
      if (next.effectKey === 'butterfly-orbit' || next.effectKey === 'bat-orbit') key = next.effectKey;
      if (Object.prototype.hasOwnProperty.call(next, 'enabled')) active = next.enabled === true;
      draw(reduced || !active ? 0 : performance.now());
      if (!active && frame) { cancelAnimationFrame(frame); frame = 0; }
      if (active) schedule();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      host.removeEventListener?.('pointermove', pointerMove);
      host.removeEventListener?.('pointerleave', pointerLeave);
      document.removeEventListener?.('visibilitychange', visibilityChange);
      mediaQuery?.removeEventListener?.('change', reducedChange);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      clear();
    }
  });
}
