import { drawFirefly } from './fireflies.js';
import { drawAvatarCreature, getCreaturePose } from './avatarCreatures.js';

import { createCreatureFlight } from './creatureFlight.js';

const TAU = Math.PI * 2;
const ORBIT_OVERSCAN = 2.1;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const scenes = new WeakMap();

export function drawScene(context, effectKey, width, height, time, pointer, still = false) {
  if (!context || !width || !height) return;
  context.back.clearRect(0, 0, width, height);
  context.front.clearRect(0, 0, width, height);
  if (effectKey === 'bat-orbit') return;
  const centerX = width / 2;
  const centerY = height / 2;
  // The canvases intentionally overscan the avatar slot by 156%. Convert back
  // to the real slot radius so the orbit remains decorative instead of
  // dominating the user's avatar silhouette.
  const scaleFactor = Math.min(width, height) / (ORBIT_OVERSCAN * 2);
  let scene = scenes.get(context.front);
  if (!scene || scene.key !== effectKey) {
    scene = { key: effectKey, flight: createCreatureFlight(effectKey), lastTime: time };
    scenes.set(context.front, scene);
  }
  const elapsed = Math.max(0, (time - scene.lastTime) / 1000);
  scene.lastTime = time;
  const states = still ? createCreatureFlight(effectKey).advance(0) : scene.flight.advance(elapsed);
  states.sort((a, b) => a.depth - b.depth);
  for (const state of states) {
    const target = state.depth < 0 ? context.back : context.front;
    if (effectKey === 'fireflies') {
      drawFirefly(target, { x: centerX + state.x * scaleFactor, y: centerY + state.y * scaleFactor, width: scaleFactor * .85, rotation: state.rotation, time, phase: state.phase, still });
      continue;
    }
    const butterfly = effectKey === 'butterfly-orbit';
    const pose = getCreaturePose(effectKey, still ? 0 : time, still ? 0 : state.phase / TAU);
    drawAvatarCreature(target, effectKey, {
      x: centerX + (state.x + (pointer ? (pointer.x - .5) * .08 : 0)) * scaleFactor,
      y: centerY + (state.y + (pointer ? (pointer.y - .5) * .08 : 0)) * scaleFactor + (still ? 0 : pose.bob * scaleFactor * .015),
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

  let key = effectKey === 'fireflies' ? 'fireflies' : 'butterfly-orbit';
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
      if (next.effectKey === 'butterfly-orbit' || next.effectKey === 'fireflies') key = next.effectKey;
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
