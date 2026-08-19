import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('persistent Profile Studio preview owns no independent profile/media fetch loop', async () => {
  const [shell, renderModel, preview, music, expression, richMedia, browserSmoke] = await Promise.all([
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/profileRenderModel.js'),
    read('src/lib/ProfileStudioPreview.svelte'),
    read('src/lib/ProfileMusic.svelte'),
    read('src/lib/ProfileExpressionEditor.svelte'),
    read('src/lib/ProfileRichMediaEditor.svelte'),
    read('scripts/browser/profile-studio-smoke.mjs')
  ]);
  assert.match(shell, /if \(previewMode\) return;/);
  assert.match(shell, /if \(previewMode\) \{/);
  assert.match(preview, /ProfileReferenceCard/);
  assert.doesNotMatch(preview, /ProfileShell|previewMode=\{true\}/);
  assert.doesNotMatch(`${shell}\n${renderModel}\n${expression}\n${richMedia}`, /mediaCacheKey|previewCacheKey|String\(Date\.now\(\)|verify-\$\{Date\.now/);
  assert.doesNotMatch(renderModel, /cacheKey/);
  assert.match(music, /getProfileMediaUrl\(activeTrack\.media_reference\)/);
  assert.match(music, /\{#key activeTrackSrc\}/);
  assert.match(browserSmoke, /requestLog/);
});

test('homepage network budget is bounded and fixture changes stay local', async () => {
  const [home, hero, demo, showcase, community, fixtures, smoke] = await Promise.all([
    read('src/lib/HomePage.svelte'),
    read('src/lib/homepage/HomepageHero.svelte'),
    read('src/lib/homepage/HomepageProfileDemo.svelte'),
    read('src/lib/homepage/HomepageShowcase.svelte'),
    read('src/lib/homepage/HomepageCommunity.svelte'),
    read('src/lib/homepage/homepageFixtures.js'),
    read('scripts/browser/homepage-reference-smoke.mjs')
  ]);
  const marketing = `${home}\n${hero}\n${demo}\n${showcase}\n${fixtures}`;
  assert.doesNotMatch(marketing, /ProfileShell|loadProfileContext|setInterval|\/get_public_profile_/);
  assert.doesNotMatch(`${demo}\n${showcase}`, /<audio|<video|media\.chm\.lol|r2\.cloudflarestorage\.com/);
  assert.equal((community.match(/supabase\.rpc\('get_public_discovery'/g) || []).length, 2);
  assert.doesNotMatch(fixtures, /Date\.now\(|Math\.random\(|supabase|loadProfileContext/);
  assert.match(smoke, /discoveryCount <= 1/);
  assert.match(smoke, /profileHydrationCount === 0/);
  assert.match(smoke, /storageCount === 0/);
  assert.match(smoke, /remoteMediaCount <= 3/);
  assert.match(smoke, /homepageIdleWaitMs/);
  assert.match(smoke, /61000/);
});
