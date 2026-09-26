import test from 'node:test';
import assert from 'node:assert/strict';
import { ATMOSPHERE_STUDIES, ATMOSPHERE_STUDY_KEYS } from '../src/lib/profile-atmosphere/atmosphereStudies.js';
import { STUDY_PAINTERS, drawAtmosphereStudy } from '../src/lib/profile-atmosphere/studyScenes.js';
import { getAtmosphereDefinition, PROFILE_ATMOSPHERE_KEYS, PROFILE_ATMOSPHERE_DEFINITIONS } from '../src/lib/profile-atmosphere/atmospheres.js';
import { isAtmosphereKey } from '../src/lib/profile-atmosphere/atmosphereKeys.js';

function recordScene(key, w, h, t) {
  const calls = []; let depth = 0;
  const c = new Proxy({ globalAlpha: 1 }, {
    set(target, name, value) { calls.push([name, value]); target[name] = value; return true; },
    get(target, name) {
      if (Object.hasOwn(target, name)) return target[name];
      if (name.startsWith('create')) return (...args) => {
        calls.push([name, ...args]);
        return { addColorStop(...args) { calls.push(['stop', ...args]); } };
      };
      return (...args) => {
        assert.ok(args.every(a => typeof a !== 'number' || Number.isFinite(a)), `${key}: ${name}`);
        if (name === 'save') depth++;
        if (name === 'restore') assert.ok(--depth >= 0);
        calls.push([name, ...args]);
      };
    }
  });
  drawAtmosphereStudy(c, key, w, h, t);
  assert.equal(depth, 0, 'canvas state restored');
  return JSON.stringify(calls);
}

test('ten new studies have finite public IDs without replacing existing scenes', () => {
  assert.equal(ATMOSPHERE_STUDIES.length, 10);
  assert.equal(new Set(ATMOSPHERE_STUDY_KEYS).size, 10);
  assert.equal(PROFILE_ATMOSPHERE_KEYS.length, 24);
  assert.deepEqual([...PROFILE_ATMOSPHERE_KEYS].sort(), Object.keys(PROFILE_ATMOSPHERE_DEFINITIONS).sort());
  assert.deepEqual(Object.keys(STUDY_PAINTERS), ATMOSPHERE_STUDY_KEYS);
  for (const d of ATMOSPHERE_STUDIES) {
    assert.equal(getAtmosphereDefinition(`profile_atmosphere_${d.key.replaceAll('-', '_')}`).label, d.label);
    assert.equal(isAtmosphereKey(`profile_atmosphere_${d.key.replaceAll('-', '_')}`), true);
    assert.ok(d.description.length > 40);
  }
  assert.equal(getAtmosphereDefinition('bg_prism_atmosphere').key, 'silk-folds');
  assert.equal(getAtmosphereDefinition('https://arbitrary.example/effect'), null);
  for (const value of ['constructor', '__proto__', {}, null]) assert.equal(isAtmosphereKey(value), false);
});

test('all studies compose deterministic, moving, distinct scenes at portrait, landscape and card sizes', () => {
  for (const [w, h] of [[1440, 900], [390, 844], [220, 150]]) {
    const signatures = new Set();
    for (const key of ATMOSPHERE_STUDY_KEYS) {
      const still = recordScene(key, w, h, 0);
      assert.equal(recordScene(key, w, h, 0), still);
      assert.notEqual(recordScene(key, w, h, 7.5), still, `${key} moves`);
      assert.equal(recordScene(key, w, h, NaN), still);
      signatures.add(still);
    }
    assert.equal(signatures.size, 10);
  }
});

test('invalid scene and empty bounds only clear the canvas', () => {
  for (const key of ['unknown', 'constructor', '__proto__']) assert.equal(recordScene(key, 390, 844, 0), '[["clearRect",0,0,390,844]]');
  assert.equal(recordScene('aurora-veil', 0, 0, 0), '[["clearRect",0,0,0,0]]');
});
