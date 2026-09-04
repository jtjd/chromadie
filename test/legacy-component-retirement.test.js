import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const retiredComponents = Object.freeze([
  'src/lib/CompactRollPreview.svelte',
  'src/lib/HomeReferenceRollGlyph.svelte',
  'src/lib/ProfileExpression.svelte',
  'src/lib/ProfileFeatured.svelte',
  'src/lib/ProfileModeHeader.svelte',
  'src/lib/ProfileShareDialog.svelte',
  'src/lib/TodayColor.svelte',
  'src/lib/avatar-effect/AvatarParticles.svelte',
  'src/lib/homepage/HomepageHero.svelte',
  'src/lib/homepage/HomepageProfileDemo.svelte',
  'src/lib/homepage/HomepageShowcase.svelte',
  'src/lib/homepage/homepageFixtures.js',
  'src/lib/name/NameComposableCatalogHarness.svelte'
]);

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('obsolete presentation components are removed from the source tree', async () => {
  for (const component of retiredComponents) {
    await assert.rejects(
      access(new URL(`../${component}`, import.meta.url)),
      error => error?.code === 'ENOENT',
      `${component} should no longer be present`
    );
  }
});

test('active routes do not reference retired presentation components', async () => {
  const [home, loaders, shell] = await Promise.all([
    read('src/lib/HomePage.svelte'),
    read('src/lib/routeLoaders.js'),
    read('src/lib/ProfileShell.svelte')
  ]);
  const activeSources = `${home}\n${loaders}\n${shell}`;

  const retiredImportNames = [
    'CompactRollPreview',
    'HomeReferenceRollGlyph',
    'ProfileExpression',
    'ProfileFeatured',
    'ProfileModeHeader',
    'ProfileShareDialog',
    'TodayColor',
    'AvatarParticles',
    'HomepageHero',
    'HomepageProfileDemo',
    'HomepageShowcase',
    'homepageFixtures',
    'NameComposableCatalogHarness'
  ];
  for (const component of retiredImportNames) {
    assert.doesNotMatch(activeSources, new RegExp(`(?:import|export)[^;]*['\"](?:[^'\"]*[/])?${component}(?:\\.svelte|\\.js)?['\"]`));
  }
});

test('the legacy profile renderer remains an explicit compatibility boundary', async () => {
  const [app, loaders] = await Promise.all([
    read('src/App.svelte'),
    read('src/lib/routeLoaders.js')
  ]);

  assert.match(app, /currentLegacyProfile \? 'profileLegacy' : 'profileShell'/);
  assert.match(loaders, /profileLegacy: \(\) => import\('\.\/Profile\.svelte'\)/);
});
