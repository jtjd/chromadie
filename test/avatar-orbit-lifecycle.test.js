import test from 'node:test';
import assert from 'node:assert/strict';
import { createAvatarOrbitController } from '../src/lib/avatar-effect/avatarOrbitRenderer.js';

test('returning to a visible tab never restarts an offscreen avatar orbit', t => {
  const frames = new Map();
  const listeners = new Map();
  let intersection;
  let frameId = 0;
  const globals = ['window', 'document', 'requestAnimationFrame', 'cancelAnimationFrame', 'IntersectionObserver'];
  const previous = globals.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  t.after(() => globals.forEach((key, index) => {
    if (previous[index]) Object.defineProperty(globalThis, key, previous[index]);
    else delete globalThis[key];
  }));
  globalThis.window = { devicePixelRatio: 3, matchMedia: () => ({ matches: false }) };
  globalThis.document = { visibilityState: 'visible',
    addEventListener: (key, callback) => listeners.set(key, callback),
    removeEventListener: key => listeners.delete(key) };
  globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  globalThis.IntersectionObserver = class {
    constructor(callback) { intersection = callback; }
    observe() {}
    disconnect() {}
  };
  const context = new Proxy({}, { get: (target, key) => key in target ? target[key] : () => context });
  const canvas = () => ({ style: {}, getContext: () => context });
  const backCanvas = canvas();
  const controller = createAvatarOrbitController({
    host: { clientWidth: 100, clientHeight: 100 }, backCanvas, frontCanvas: canvas()
  });
  t.after(() => controller.destroy());
  assert.equal(frames.size, 1);
  assert.equal(backCanvas.width, 420, 'DPR stays capped at two');
  intersection([{ isIntersecting: false, intersectionRatio: 0 }]);
  assert.equal(frames.size, 0);
  document.visibilityState = 'hidden';
  listeners.get('visibilitychange')();
  document.visibilityState = 'visible';
  listeners.get('visibilitychange')();
  assert.equal(frames.size, 0);
  intersection([{ isIntersecting: true, intersectionRatio: 1 }]);
  assert.equal(frames.size, 1);
  controller.update({ enabled: false });
  assert.equal(frames.size, 0, 'disabling cancels an already scheduled animation');
  controller.update({ enabled: true });
  assert.equal(frames.size, 1, 'reenabling starts exactly one animation');
  controller.destroy();
  assert.equal(frames.size, 0);
  assert.equal(listeners.size, 0);
});
