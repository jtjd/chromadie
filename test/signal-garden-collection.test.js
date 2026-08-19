import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the homepage showcase uses local photographic fixtures and the direct profile specimen', async () => {
  const [hero, demo, showcase, fixtures, community] = await Promise.all([
    read('src/lib/homepage/HomepageHero.svelte'),
    read('src/lib/homepage/HomepageProfileDemo.svelte'),
    read('src/lib/homepage/HomepageShowcase.svelte'),
    read('src/lib/homepage/homepageFixtures.js'),
    read('src/lib/homepage/HomepageCommunity.svelte')
  ]);

  assert.match(hero, /HomepageProfileDemo/);
  assert.match(hero, /homepage-profile-stage/);
  assert.match(demo, /ProfileReferenceCard/);
  assert.match(showcase, /getHomepageShowcaseFixtures/);
  assert.match(showcase, /homepage-showcase-card/);
  assert.doesNotMatch(`${hero}${demo}${showcase}`, /ProfileShell|HomepageProfileRenderer|profile-shell/);
  assert.match(fixtures, /\/homepage\/fixtures\/.*background\.(?:png|webp)/);
  assert.match(fixtures, /condition_ids/);
  assert.doesNotMatch(fixtures, /supabase|KNOWN_STAFF_SHOWCASE_USERNAMES/);
  assert.match(community, /get_public_discovery/);
});
