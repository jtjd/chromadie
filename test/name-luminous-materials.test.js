import test from 'node:test';
import assert from 'node:assert/strict';
import { drawLuminousMaterial } from '../src/lib/name/render/luminousMaterials.js';
import { NAME_MATERIALS } from '../src/lib/name/nameMaterials.js';
import { getNameFrameModel } from '../src/lib/name/nameRenderer.js';

function recorder() {
  const calls = [], stack = [];
  const stateKeys = ['globalAlpha', 'globalCompositeOperation', 'fillStyle', 'strokeStyle',
    'shadowColor', 'shadowBlur', 'font', 'textAlign', 'textBaseline', 'lineJoin', 'lineCap', 'lineWidth'];
  const ctx = { globalAlpha: .4, globalCompositeOperation: 'source-over', shadowBlur: 0 };
  const state = () => Object.fromEntries(stateKeys.map(key => [key, ctx[key]]));
  ctx.save = () => stack.push(state());
  ctx.restore = () => Object.assign(ctx, stack.pop());
  for (const method of ['translate', 'scale', 'fillRect', 'moveTo', 'quadraticCurveTo', 'arc', 'beginPath', 'fill', 'stroke']) {
    ctx[method] = (...args) => {
      for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value), method);
      calls.push([method, args, ctx.globalAlpha, ctx.fillStyle, ctx.strokeStyle]);
    };
  }
  for (const method of ['fillText', 'strokeText']) ctx[method] = (...args) => {
    assert.ok(ctx.globalAlpha <= .4, 'a material must respect inherited motion opacity');
    calls.push([method, args, ctx.globalAlpha, ctx.fillStyle, ctx.strokeStyle]);
  };
  for (const method of ['createLinearGradient', 'createRadialGradient']) ctx[method] = (...args) => {
    const stops = [];
    return { args, stops, addColorStop: (at, color) => stops.push([at, color]) };
  };
  ctx.measureText = text => ({ width: [...text].length * 18 });
  return { ctx, calls, state, stack };
}

test('all eighteen replacements are deterministic, animate, and restore compositor state', () => {
  const keys = Object.keys(NAME_MATERIALS).filter(key => NAME_MATERIALS[key].animated);
  assert.equal(keys.length, 18);
  const render = (key, time, motionKey = 'none') => {
    const { ctx, calls, state, stack } = recorder();
    const original = state();
    assert.equal(drawLuminousMaterial(ctx, getNameFrameModel({ text: 'Wi Égj', materialKey: key, time, motionKey })), true);
    assert.deepEqual(state(), original, key);
    assert.equal(stack.length, 0, key);
    return JSON.stringify(calls);
  };
  for (const key of keys) {
    assert.equal(render(key, 0), render(key, 0), key);
    assert.equal(render(key, 0), render(key, 12000), key);
    assert.equal(render(key, 3100), render(key, 3100, 'cherry-blossom'), key);
    assert.equal(render(key, 3100), render(key, 3100, 'letterpress'), key);
    assert.notEqual(render(key, 0), render(key, 3100), key);
  }
});

test('the replacement renderer leaves Plain and both approved materials to their original renderer', () => {
  for (const materialKey of ['plain', 'halo-edge', 'crt-phosphor']) {
    const { ctx, calls } = recorder();
    assert.equal(drawLuminousMaterial(ctx, getNameFrameModel({ text: 'Chromadie', materialKey })), false);
    assert.equal(calls.length, 0);
  }
});
