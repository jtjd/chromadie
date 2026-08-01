import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the homepage uses a static screenshot manifest and keeps live profile rendering out of the collage', async () => {
  const [showcase, directory, config] = await Promise.all([
    read('src/lib/HomepageScreenshotShowcase.svelte'),
    read('src/lib/HomepageProfileDirectory.svelte'),
    read('src/lib/homepageShowcase.js')
  ]);

  assert.match(showcase, /HOMEPAGE_SHOWCASE_PROFILES/);
  assert.match(showcase, /<img/);
  assert.match(showcase, /profileUrl/);
  assert.match(showcase, /Open profile/);
  assert.doesNotMatch(showcase, /Capture placeholder|Approved public-profile capture pending/);
  assert.match(config, /phase-owner-profile\.webp/);
  assert.match(config, /visualtest-profile\.webp/);
  assert.match(config, /anzul-profile\.webp/);
  assert.match(config, /codex-settings-profile\.webp/);
  assert.doesNotMatch(directory, /HomepageProfilePreview|HomepageRollSummary/);
});
