import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AUTHORED_PROFILE_BORDER_KEYS, PROFILE_BORDER_KEYS, getProfileBorderDefinition, getProfileBorderKey } from '../src/lib/profile-border/profileBorders.js';
import { BORDER_MOTIFS, BORDER_ORNAMENTS } from '../src/lib/profile-border/borderOrnaments.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('ten authored designs plus the two retained borders resolve from equipped item IDs', () => {
  assert.equal(AUTHORED_PROFILE_BORDER_KEYS.length, 10);
  assert.equal(PROFILE_BORDER_KEYS.length, 12);
  assert.equal(new Set(AUTHORED_PROFILE_BORDER_KEYS.map(key => getProfileBorderDefinition(key).label)).size, 10);
  for (const key of PROFILE_BORDER_KEYS) {
    const definition = getProfileBorderDefinition(key);
    assert.equal(getProfileBorderKey(definition.itemKey), key);
  }
  assert.equal(getProfileBorderDefinition('border_celestial').label, 'Celestial');
  assert.equal(getProfileBorderDefinition('border_crystal').label, 'Crystal');
  for (const unsafe of [null, {}, 'constructor', '__proto__', '<svg>', 'border_unknown', 'url(https://example.com)']) {
    assert.equal(getProfileBorderKey(unsafe), '');
    assert.equal(getProfileBorderDefinition(unsafe), null);
  }
});

test('the collection covers five tastes with distinct authored silhouettes', () => {
  const categories = {};
  const drawings = new Set();
  for (const key of AUTHORED_PROFILE_BORDER_KEYS) {
    const { taste } = getProfileBorderDefinition(key);
    categories[taste] = (categories[taste] || 0) + 1;
    const paths = BORDER_ORNAMENTS[BORDER_MOTIFS[key]];
    assert.ok(paths.length >= 4);
    assert.ok(paths.every(path => typeof path.d === 'string' && !/url\(|https:|<|>/.test(path.d)));
    drawings.add(JSON.stringify(paths));
  }
  assert.equal(drawings.size, 10);
  assert.deepEqual(Object.values(categories), [2, 2, 2, 2, 2]);
});

test('catalog migration and fresh seed use the authored names and descriptions', async () => {
  const [migration, seed] = await Promise.all([
    read('supabase/migrations/20260918140000_authored_profile_borders.sql'), read('supabase/seed.sql')
  ]);
  for (const key of AUTHORED_PROFILE_BORDER_KEYS) {
    const definition = getProfileBorderDefinition(key);
    assert.ok(migration.includes(`'${definition.label}'`));
    assert.ok(seed.includes(`'${definition.label}'`));
    assert.ok(migration.includes(`'${definition.itemKey}'`));
    if (key !== 'aurora') {
      const update = migration.match(new RegExp(`SET name = '${definition.label}', description = '([^']+)' WHERE item_key = '${definition.itemKey}'`));
      assert.ok(update);
      const row = seed.split('\n').find(line => line.startsWith(`('${definition.itemKey}'`));
      assert.ok(row.includes(update[1]));
    }
  }
  assert.match(migration, /'shop_version', '2026-09-18T14:00:00Z'/);
  assert.doesNotMatch(migration, /DELETE FROM|UPDATE public\.profiles|DISABLE ROW LEVEL SECURITY/);
});

test('schema extension changes only the finite profile border renderer list', async () => {
  const [prior, next] = await Promise.all([
    read('supabase/migrations/20260912120000_authored_name_motions.sql'),
    read('supabase/migrations/20260918140000_authored_profile_borders.sql')
  ]);
  const constraint = sql => sql.slice(sql.indexOf('ALTER TABLE'), sql.indexOf('\n);') + 3);
  assert.equal(constraint(next), constraint(prior).replace("'shimmer-track'))", "'shimmer-track', 'aurora'))"));
});

test('effects remain separate from content, bounded, and motion-aware', async () => {
  const [host, art] = await Promise.all([
    read('src/lib/profile-border/ProfileBorderEffect.svelte'), read('src/lib/profile-border/AuthoredBorderLayers.svelte')
  ]);
  assert.match(host, /document\.addEventListener\('visibilitychange'/);
  assert.match(host, /document\.removeEventListener\('visibilitychange'/);
  assert.match(host, /observer\?\.disconnect\(\)/);
  assert.match(art, /aria-hidden="true"/);
  assert.match(art, /pointer-events: none/);
  assert.match(art, /mask-composite: exclude/);
  assert.match(art, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(host + art, /\{@html|requestAnimationFrame|addEventListener\('pointermove'/);
});
