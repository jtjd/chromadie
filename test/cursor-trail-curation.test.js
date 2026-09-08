import test from 'node:test';
import assert from 'node:assert/strict';
import { CURSOR_TRAIL_KEYS, CURSOR_TRAIL_REPLACEMENTS, getCursorTrailKey, getCursorTrailRendererKey, isCuratedCursorTrail } from '../src/lib/cursor-trail/cursorTrails.js';
import { AUTHORED_PARTICLE_KEYS, createAuthoredParticle, advanceAuthoredParticle } from '../src/lib/cursor-trail/authoredParticles.js';

test('default particle palettes use fully saturated colors while Color Memory preserves rolled colors', () => {
  for (const kind of AUTHORED_PARTICLE_KEYS) {
    for (const sample of [0, 0.4, 0.8]) {
      const { color } = createAuthoredParticle({ x: 0, y: 0 }, kind, ['#AABBCC'], () => sample);
      if (kind === 'color-memory') {
        assert.equal(color, '#AABBCC');
      } else {
        const channels = color.slice(1).match(/../g).map(value => parseInt(value, 16));
        assert.equal(Math.min(...channels), 0, `${kind} has no gray component`);
        assert.equal(Math.max(...channels), 255, `${kind} uses a bright saturated palette`);
      }
    }
  }
});

test('sixteen curated trails preserve all historical IDs without changing catalog authority', () => {
  assert.equal(CURSOR_TRAIL_KEYS.filter(isCuratedCursorTrail).length, 16);
  for (const key of CURSOR_TRAIL_KEYS) {
    assert.equal(getCursorTrailKey(`cursor_trail_${key.replaceAll('-', '_')}`), key);
    assert.ok(isCuratedCursorTrail(getCursorTrailRendererKey(key)));
  }
  for (const [oldKey, replacement] of Object.entries(CURSOR_TRAIL_REPLACEMENTS)) {
    assert.equal(getCursorTrailRendererKey(oldKey), replacement);
    assert.equal(isCuratedCursorTrail(oldKey), false);
  }
  assert.equal(getCursorTrailRendererKey('<script>'), '');
});

test('authored particles retain their color and expire at both slow and fast refresh rates', () => {
  for (const kind of AUTHORED_PARTICLE_KEYS) {
    for (const delta of [0.5, 1, 2.4]) {
      const particle = createAuthoredParticle({ x: 100, y: 100 }, kind, ['#123456'], () => 0.4);
      const color = particle.color;
      let frames = 0;
      while (advanceAuthoredParticle(particle, delta)) {
        assert.equal(particle.color, color);
        assert.ok(Number.isFinite(particle.x) && Number.isFinite(particle.y));
        assert.ok(++frames < 160);
      }
      assert.ok(particle.age >= particle.duration);
    }
  }
});
