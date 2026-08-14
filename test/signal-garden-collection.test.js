import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the homepage showcase uses local fixture environments and the production profile renderer', async () => {
  const [hero, renderer, showcase, fixtures, community] = await Promise.all([
    read('src/lib/homepage/HomepageHero.svelte'),
    read('src/lib/homepage/HomepageProfileRenderer.svelte'),
    read('src/lib/homepage/HomepageShowcase.svelte'),
    read('src/lib/homepage/homepageFixtures.js'),
    read('src/lib/homepage/HomepageCommunity.svelte')
  ]);

  assert.match(hero, /homepage-hero-background/);
  assert.match(hero, /HomepageProfileRenderer/);
  assert.match(renderer, /ProfileShell/);
  assert.match(renderer, /previewProfileConfig/);
  assert.match(showcase, /getHomepageShowcaseFixtures/);
  assert.match(showcase, /homepage-profile-renderer--showcase/);
  assert.match(fixtures, /\/homepage\/fixtures\/.*background\.png/);
  assert.doesNotMatch(fixtures, /supabase|KNOWN_STAFF_SHOWCASE_USERNAMES/);
  assert.match(community, /get_public_discovery/);
});
