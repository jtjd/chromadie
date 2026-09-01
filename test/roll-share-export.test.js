import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRollShareCardCanvas, canvasToPngBlob } from '../src/lib/rollShareExport.js';

function createCanvasFixture() {
  const text = [];
  const gradient = { addColorStop() {} };
  const context = new Proxy({
    fillText(value) { text.push(value); },
    createLinearGradient() { return gradient; },
    createRadialGradient() { return gradient; }
  }, {
    get(target, property) {
      if (property in target) return target[property];
      return () => {};
    }
  });
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toBlob: callback => callback({ type: 'image/png' })
  };
  return { canvas, text };
}

test('roll share export keeps the canonical card dimensions and confirmed values', async () => {
  const fixture = createCanvasFixture();
  const canvas = await buildRollShareCardCanvas({
    score: 12345,
    rarity: 'Legendary',
    color: '#abcdef',
    origin: 'https://chm.lol',
    documentRef: {
      fonts: { ready: Promise.resolve() },
      createElement: () => fixture.canvas
    }
  });

  assert.equal(canvas.width, 1200);
  assert.equal(canvas.height, 630);
  assert.ok(fixture.text.includes('12,345'));
  assert.ok(fixture.text.includes('#ABCDEF'));
  assert.ok(fixture.text.includes('LEGENDARY'));
  assert.ok(fixture.text.includes('chm.lol'));
  assert.deepEqual(await canvasToPngBlob(canvas), { type: 'image/png' });
});
test('roll share export fails closed without DOM or canvas support', async () => {
  assert.equal(await buildRollShareCardCanvas({ documentRef: null }), null);
  assert.equal(await canvasToPngBlob(null), null);
});
