import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('a delayed motion renderer cannot install after its component is destroyed', async () => {
  const source = await readFile(new URL('../src/lib/profile-motion/ProfileMotionEffect.svelte', import.meta.url), 'utf8');
  const sync = source.slice(source.indexOf('  function syncController()'), source.indexOf('  onMount('));
  const cleanup = source.match(/onDestroy\(\(\) => \{([\s\S]*?)\n {2}\}\);/)[1];
  let resolve;
  let installed = 0;
  const pending = new Promise(done => { resolve = done; });
  const state = {
    mounted: true, motionTargetElement: {}, motionElement: {}, effectEnabled: true,
    controller: null, controllerSignature: '', nextSignature: 'halo-offset:true:viewport',
    controllerSurfaceElement: null, surfaceElement: null, controllerTargetElement: null,
    rendererKey: 'halo-offset', effectHost: {}, motionEffectsLoadVersion: 0,
    motionEffectsModule: null, motionEffectsPromise: pending,
    haloShellOne: {}, haloShellTwo: {}, haloShellThree: {}
  };
  vm.createContext(state);
  vm.runInContext(sync, state);
  vm.runInContext('syncController()', state);
  vm.runInContext(cleanup, state);
  resolve({ createHaloOffsetController() { installed++; return { destroy() {} }; } });
  await pending;
  await Promise.resolve();
  assert.equal(installed, 0);
  assert.equal(state.controller, null);
});
