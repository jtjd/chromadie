import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

import { createRollImageCopyFreshness, runRollImageCopy } from '../src/lib/rollImageCopy.js';

const dialog = await readFile(new URL('../src/lib/RollShareImageDialog.svelte', import.meta.url), 'utf8');

function createEffects(overrides = {}) {
  const events = [];
  return {
    events,
    effects: {
      result: { score: 42, rarity: 'Rare', color: '#12ABEF' },
      isCurrent: () => true,
      buildCanvas: async result => { events.push(['canvas', result]); return { width: 1200 }; },
      canvasToBlob: async canvas => { events.push(['blob', canvas]); return { type: 'image/png' }; },
      writeClipboard: async blob => { events.push(['clipboard', blob]); },
      onCopied: () => events.push(['copied']),
      onError: error => events.push(['logged', error]),
      onFailure: () => events.push(['failure']),
      ...overrides
    }
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

test('the dialog delegates copy sequencing and guards copied feedback timers', () => {
  assert.match(dialog, /runRollImageCopy/);
  assert.match(dialog, /await runRollImageCopy\(\{/);
  assert.match(dialog, /writeClipboard: blob => \{/);
  assert.match(dialog, /createRollImageCopyFreshness/);
  assert.match(dialog, /const isCurrent = imageCopyFreshness\.begin\(isResultCurrent\)/);
  const open = dialog.slice(dialog.indexOf('export async function open'), dialog.indexOf('async function copyImageToClipboard'));
  const close = dialog.slice(dialog.indexOf('export async function close'), dialog.indexOf('function handleImageModalKeydown'));
  const destroy = dialog.slice(dialog.indexOf('onDestroy(() => {'));
  assert.match(open, /imageCopyFreshness\.invalidate\(\)/);
  assert.match(close, /imageCopyFreshness\.invalidate\(\)/);
  assert.match(destroy, /imageCopyFreshness\.invalidate\(\)/);
  assert.match(dialog, /const feedbackVersion = \+\+imageCopiedFeedbackVersion/);
  assert.match(dialog, /if \(feedbackVersion === imageCopiedFeedbackVersion\) imageCopied = false/);
});

test('an older image-copy timer cannot clear newer copied feedback', () => {
  const callback = dialog.slice(dialog.indexOf('onCopied: () => {'), dialog.indexOf('onError: err =>'));
  const timers = [];
  const toasts = [];
  const state = {
    imageCopiedFeedbackVersion: 0,
    imageCopied: false,
    addToast: (...args) => toasts.push(args),
    setTimeout: (callback, delay) => timers.push({ callback, delay })
  };
  vm.createContext(state);
  vm.runInContext(`const { onCopied } = ({ ${callback} }); onCopied(); onCopied();`, state);

  assert.equal(state.imageCopied, true);
  assert.equal(timers[0].delay, 2000);
  assert.equal(timers[1].delay, 2000);
  timers[0].callback();
  assert.equal(state.imageCopied, true);
  timers[1].callback();
  assert.equal(state.imageCopied, false);
  assert.equal(toasts.length, 2);
});

test('a current copy builds the confirmed result image, writes it, then applies success', async () => {
  const harness = createEffects();

  assert.deepEqual(await runRollImageCopy(harness.effects), { status: 'copied' });
  assert.deepEqual(harness.events, [
    ['canvas', { score: 42, rarity: 'Rare', color: '#12ABEF' }],
    ['blob', { width: 1200 }],
    ['clipboard', { type: 'image/png' }],
    ['copied']
  ]);
});

test('a stale clipboard success cannot update copied state', async () => {
  let current = true;
  const clipboard = deferred();
  const clipboardStarted = deferred();
  const harness = createEffects({
    isCurrent: () => current,
    writeClipboard: blob => {
      harness.events.push(['clipboard', blob]);
      clipboardStarted.resolve();
      return clipboard.promise;
    }
  });

  const pending = runRollImageCopy(harness.effects);
  await clipboardStarted.promise;
  current = false;
  clipboard.resolve();

  assert.deepEqual(await pending, { status: 'stale' });
  assert.equal(harness.events.some(([type]) => type === 'copied'), false);
  assert.equal(harness.events.some(([type]) => type === 'failure' || type === 'logged'), false);
});

test('a stale clipboard rejection does not log, toast, or reset replacement feedback', async () => {
  let current = true;
  const clipboard = deferred();
  const clipboardStarted = deferred();
  const harness = createEffects({
    isCurrent: () => current,
    writeClipboard: blob => {
      harness.events.push(['clipboard', blob]);
      clipboardStarted.resolve();
      return clipboard.promise;
    }
  });

  const pending = runRollImageCopy(harness.effects);
  await clipboardStarted.promise;
  current = false;
  clipboard.reject(new Error('clipboard unavailable'));

  assert.deepEqual(await pending, { status: 'stale' });
  assert.equal(harness.events.some(([type]) => type === 'failure' || type === 'logged' || type === 'copied'), false);
});

test('an older same-result copy rejection cannot override the newer copy success', async () => {
  const freshness = createRollImageCopyFreshness();
  const result = { score: 42, rarity: 'Rare', color: '#12ABEF' };
  const olderIsCurrent = freshness.begin(() => true);
  const olderClipboard = deferred();
  const olderClipboardStarted = deferred();
  const older = createEffects({
    result,
    isCurrent: olderIsCurrent,
    writeClipboard: blob => {
      olderClipboardStarted.resolve();
      return olderClipboard.promise;
    }
  });

  const olderCopy = runRollImageCopy(older.effects);
  await olderClipboardStarted.promise;

  const newerIsCurrent = freshness.begin(() => true);
  const newer = createEffects({
    result,
    isCurrent: newerIsCurrent
  });
  assert.deepEqual(await runRollImageCopy(newer.effects), { status: 'copied' });

  olderClipboard.reject(new Error('older clipboard attempt failed'));
  assert.deepEqual(await olderCopy, { status: 'stale' });
  assert.deepEqual(newer.events.slice(-1), [['copied']]);
  assert.equal(older.events.some(([type]) => type === 'failure' || type === 'logged' || type === 'copied'), false);
});

test('an older same-result copy success cannot publish stale copied feedback', async () => {
  const freshness = createRollImageCopyFreshness();
  const result = { score: 42, rarity: 'Rare', color: '#12ABEF' };
  const olderClipboard = deferred();
  const olderClipboardStarted = deferred();
  const older = createEffects({
    result,
    isCurrent: freshness.begin(() => true),
    writeClipboard: () => {
      olderClipboardStarted.resolve();
      return olderClipboard.promise;
    }
  });

  const olderCopy = runRollImageCopy(older.effects);
  await olderClipboardStarted.promise;

  const newer = createEffects({ result, isCurrent: freshness.begin(() => true) });
  assert.deepEqual(await runRollImageCopy(newer.effects), { status: 'copied' });

  olderClipboard.resolve();
  assert.deepEqual(await olderCopy, { status: 'stale' });
  assert.deepEqual(newer.events.slice(-1), [['copied']]);
  assert.equal(older.events.some(([type]) => type === 'failure' || type === 'logged' || type === 'copied'), false);
});

test('dialog freshness invalidation suppresses a pending copy after close or replacement', async () => {
  const freshness = createRollImageCopyFreshness();
  const clipboard = deferred();
  const clipboardStarted = deferred();
  const harness = createEffects({
    isCurrent: freshness.begin(() => true),
    writeClipboard: () => {
      clipboardStarted.resolve();
      return clipboard.promise;
    }
  });
  const pendingCopy = runRollImageCopy(harness.effects);
  await clipboardStarted.promise;

  freshness.invalidate();
  clipboard.resolve();

  assert.deepEqual(await pendingCopy, { status: 'stale' });
  assert.equal(harness.events.some(([type]) => type === 'failure' || type === 'logged' || type === 'copied'), false);
});

test('a current clipboard failure reports the existing error and applies failure once', async () => {
  const error = new Error('clipboard unavailable');
  const harness = createEffects({
    writeClipboard: async () => { throw error; }
  });

  assert.deepEqual(await runRollImageCopy(harness.effects), { status: 'failed', error });
  assert.deepEqual(harness.events.slice(-2), [['logged', error], ['failure']]);
});

test('missing canvas or PNG blob keeps the current silent no-op behavior', async () => {
  const noCanvas = createEffects({ buildCanvas: async () => null });
  assert.deepEqual(await runRollImageCopy(noCanvas.effects), { status: 'unavailable' });
  assert.equal(noCanvas.events.some(([type]) => type === 'blob' || type === 'clipboard'), false);

  const noBlob = createEffects({ canvasToBlob: async () => null });
  assert.deepEqual(await runRollImageCopy(noBlob.effects), { status: 'unavailable' });
  assert.equal(noBlob.events.some(([type]) => type === 'clipboard'), false);
});

test('a stale result does not start image export work', async () => {
  const harness = createEffects({ isCurrent: () => false });

  assert.deepEqual(await runRollImageCopy(harness.effects), { status: 'stale' });
  assert.deepEqual(harness.events, []);
});
