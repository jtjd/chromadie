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

test('persistent flight keeps lane changes outside the avatar and steers creatures apart', async () => {
  const { createCreatureFlight } = await import('../src/lib/avatar-effect/creatureFlight.js');
  for (const key of ['butterfly-orbit', 'bat-orbit', 'fireflies']) {
    const flight = createCreatureFlight(key);
    let previous = flight.advance(0), changes = 0;
    for (let frame = 0; frame < 10800; frame++) {
      const states = flight.advance(1 / 60);
      for (const [i, a] of states.entries()) {
        assert.ok(Math.hypot(a.x, a.y) < 1.85, 'inside padded canvas');
        assert.ok(Math.hypot(a.x - previous[i].x, a.y - previous[i].y) < .01, 'bounded frame displacement');
        if (a.depth !== previous[i].depth) {
          changes++;
          assert.ok(Math.hypot(a.x, a.y) > 1.4, 'whole creature clear before lane swap');
        }
        for (const b of states.slice(i + 1)) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > .42, 'silhouettes do not clump');
      }
      previous = states;
    }
    assert.ok(changes > 0, 'still supports behind-avatar flight');
  }
});

test('fireflies resolve independently and bats are retained but disabled', async () => {
  const { getAvatarEffectDefinition } = await import('../src/lib/avatar-effect/avatarEffects.js');
  const { getCatalogStatus } = await import('../src/lib/shopCatalog.js');
  assert.equal(getAvatarEffectDefinition('avatar_effect_fireflies').key, 'fireflies');
  assert.equal(getAvatarEffectDefinition('bat-orbit').disabled, true);
  assert.equal(getCatalogStatus({ item_key: 'avatar_effect_bat_orbit', catalog_status: 'active' }), 'retired', 'old cached catalogs cannot reenable bats');
});
