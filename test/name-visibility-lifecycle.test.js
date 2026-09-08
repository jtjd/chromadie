import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('name canvas resize and tab return cannot restart an offscreen animation', async () => {
  const source = await readFile(new URL('../src/lib/name/NameEffectCanvas.svelte', import.meta.url), 'utf8');
  const functions = source.slice(source.indexOf('  function updateVisibility('), source.indexOf('  function updateReducedMotion('));
  const state = { visible: true, inViewport: false, hasArea: true,
    document: { visibilityState: 'visible' },
    host: { getBoundingClientRect: () => ({ width: 120, height: 40 }) },
    syncAnimationLoop() {} };
  vm.createContext(state);
  vm.runInContext(functions, state);
  vm.runInContext('updateHostVisibility()', state);
  assert.equal(state.visible, false, 'resizing preserves intersection state');
  state.document.visibilityState = 'hidden';
  state.inViewport = true;
  vm.runInContext('updateVisibility()', state);
  assert.equal(state.visible, false, 'hidden documents unregister animation');
  state.document.visibilityState = 'visible';
  vm.runInContext('updateVisibility()', state);
  assert.equal(state.visible, true);
  state.inViewport = false;
  vm.runInContext('updateVisibility()', state);
  assert.equal(state.visible, false);
  assert.match(source, /document.addEventListener\('visibilitychange', updateVisibility\)/);
  assert.match(source, /document.removeEventListener\('visibilitychange', updateVisibility\)/);
});
