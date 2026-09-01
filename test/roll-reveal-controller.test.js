import test from 'node:test';
import assert from 'node:assert/strict';
import { createScoreCountUpController } from '../src/lib/rollRevealController.js';

test('score reveal resolves immediately for reduced motion', async () => {
  const values = [];
  const progress = [];
  const controller = createScoreCountUpController();
  const completed = await controller.animate({
    targetScore: 4200,
    isCurrent: () => true,
    duration: 500,
    reducedMotion: true,
    onValue: value => values.push(value),
    onProgress: value => progress.push(value)
  });
  assert.equal(completed, true);
  assert.deepEqual(values, [4200]);
  assert.deepEqual(progress, [1]);
});
test('score reveal cancellation settles the pending animation as stale', async () => {
  let callback;
  const cancelled = [];
  const controller = createScoreCountUpController({
    windowRef: {
      requestAnimationFrame(next) { callback = next; return 7; },
      cancelAnimationFrame(frame) { cancelled.push(frame); }
    },
    now: () => 0
  });
  const pending = controller.animate({ targetScore: 100, isCurrent: () => true, duration: 100 });
  assert.equal(typeof callback, 'function');
  controller.cancel();
  assert.equal(await pending, false);
  assert.deepEqual(cancelled, [7]);
});
