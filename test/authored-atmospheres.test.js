import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTHORED_ATMOSPHERES, drawAuthoredAtmosphere } from '../src/lib/profile-atmosphere/authoredScenes.js';
import { getAtmosphereDefinition } from '../src/lib/profile-atmosphere/atmospheres.js';
import { createAtmosphereRecovery } from '../src/lib/profile-atmosphere/atmosphereRecovery.js';

test('authored scenes preserve owned IDs and draw distinct finite compositions', () => {
  const signatures = [];
  for (const key of AUTHORED_ATMOSPHERES) {
    assert.equal(getAtmosphereDefinition(`profile_atmosphere_${key.replaceAll('-', '_')}`).key, key);
    const calls = [];
    const c = new Proxy({}, { set(target, name, value) { target[name] = value; return true; }, get(target, name) {
      if (name.startsWith('create')) return () => ({ addColorStop() {} });
      return (...args) => { assert.ok(args.every(a => typeof a !== 'number' || Number.isFinite(a))); calls.push([name, ...args]); };
    } });
    drawAuthoredAtmosphere(c, key, 390, 844, 4);
    signatures.push(JSON.stringify(calls));
    assert.ok(calls.length > 200);
  }
  assert.equal(new Set(signatures).size, 5);
});

test('video recovery is bounded and teardown invalidates queued work and rejected plays', async () => {
  const previous = globalThis.window;
  let id = 0, plays = 0, rejectPlay, fallback = false, allowed = true;
  const tasks = new Map();
  globalThis.window = {
    setTimeout: fn => { tasks.set(++id, fn); return id; }, clearTimeout: key => tasks.delete(key),
    requestAnimationFrame: fn => { tasks.set(++id, fn); return id; }, cancelAnimationFrame: key => tasks.delete(key)
  };
  const flush = () => { const entries = [...tasks.values()]; tasks.clear(); entries.forEach(fn => fn()); };
  try {
    const recovery = createAtmosphereRecovery({ canRecover: () => allowed,
      getVideo: () => ({ play: () => { plays++; return new Promise((resolve, reject) => { rejectPlay = reject; }); }, load() {} }),
      setPosterFallback: value => { fallback = value; } });
    recovery.recover(); recovery.recover(); assert.equal(tasks.size, 1);
    allowed = false; flush(); assert.equal(plays, 0);
    allowed = true;
    for (let i = 0; i < 4; i++) { recovery.stalled(); flush(); flush(); }
    assert.equal(plays, 3); assert.equal(fallback, true);
    recovery.ready(); recovery.recover(); flush();
    recovery.destroy(); rejectPlay(new Error('late')); await Promise.resolve();
    assert.equal(tasks.size, 0);
    recovery.recover(); assert.equal(tasks.size, 0);
  } finally { globalThis.window = previous; }
});
