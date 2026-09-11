import test from 'node:test';
import assert from 'node:assert/strict';
import { getCreaturePose, mapCreatureWing } from '../src/lib/avatar-effect/avatarCreatures.js';

for (const key of ['butterfly-orbit', 'bat-orbit']) {
  test(`${key} has a continuous, mirrored wingbeat with a readable folded silhouette`, () => {
    for (let time = 0; time <= 2000; time += 2) {
      const pose = getCreaturePose(key, time);
      const next = getCreaturePose(key, time + 2);
      assert.ok(pose.spread >= .239 && pose.spread <= 1);
      assert.ok(Math.abs(next.spread - pose.spread) < .04);
      const left = mapCreatureWing(40, -20, -1, pose);
      const right = mapCreatureWing(40, -20, 1, pose);
      assert.equal(left[0], -right[0]);
      assert.equal(left[1], right[1], 'both wings lift together, never seesaw');
      assert.deepEqual(mapCreatureWing(0, 0, 1, pose), [0, 0], 'root stays attached');
    }
  });
}
test('bats complete 3.3 wingbeats per second rather than interpreting Hz as radians', () => {
  const period = 1000 / 3.3;
  for (const time of [0, 30, 100, 220]) {
    const a = getCreaturePose('bat-orbit', time);
    const b = getCreaturePose('bat-orbit', time + period);
    assert.ok(Math.abs(a.spread - b.spread) < 1e-10);
    assert.ok(Math.abs(a.lift - b.lift) < 1e-10);
  }
});

test('wandering flights are bounded, continuous, independent, and cross depth layers', async () => {
  const { getCreatureFlight } = await import('../src/lib/avatar-effect/avatarOrbitRenderer.js');
  for (const key of ['butterfly-orbit', 'bat-orbit']) {
    const count = key === 'butterfly-orbit' ? 5 : 6;
    for (let i = 0; i < count; i++) {
      let front = false, back = false, inward = false, outward = false;
      const radii = [];
      for (let time = 0; time < 180000; time += 40) {
        const state = getCreatureFlight(key, i, time);
        const next = getCreatureFlight(key, i, time + 1);
        const radius = Math.hypot(state.x, state.y);
        assert.ok(radius < 1.25, 'geometry stays inside overscan');
        assert.ok(Math.hypot(next.x - state.x, next.y - state.y) < .002, 'no waypoint teleport');
        assert.ok(Number.isFinite(state.rotation) && Number.isFinite(state.bank));
        assert.deepEqual(state, getCreatureFlight(key, i, time), 'deterministic across redraws');
        const nose = { x: Math.sin(state.rotation), y: -Math.cos(state.rotation) };
        assert.ok(nose.x * (next.x - state.x) + nose.y * (next.y - state.y) > -1e-7);
        front ||= state.depth > .1; back ||= state.depth < -.1;
        inward ||= radius < .5; outward ||= radius > 1;
        radii.push(radius);
      }
      assert.ok(front && back && inward && outward, 'wanders across radius and depth instead of circling');
      assert.ok(Math.max(...radii) - Math.min(...radii) > .6);
      assert.notDeepEqual(getCreatureFlight(key, i, 5000), getCreatureFlight(key, i + 1, 5000));
    }
  }
});
