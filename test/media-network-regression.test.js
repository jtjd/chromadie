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

test('playable homepage network budget is bounded and avoids profile hydration', async () => {
  const [home, community, smoke] = await Promise.all([
    read('src/lib/HomePage.svelte'),
    read('src/lib/homepage/HomepageCommunity.svelte'),
    read('scripts/browser/homepage-reference-smoke.mjs')
  ]);
  assert.match(home, /import RollPage from '.\/RollPage\.svelte'/);
  assert.match(home, /<RollPage/);
  assert.doesNotMatch(home, /ProfileShell|loadProfileContext|setInterval|HomepageProfileDemo|HomepageShowcase|homepageFixtures/);
  // One bounded owner lookup and one conditional community fallback, never full profiles.
  assert.equal((community.match(/supabase\.rpc\('get_public_discovery',/g) || []).length, 2);
  assert.match(community, /if \(todayRows.length\) \{[\s\S]*?return;[\s\S]*?const fallbackResult/);
  assert.match(community, /p_limit: COMMUNITY_FALLBACK_LIMIT/);
  assert.equal((community.match(/supabase\.rpc\('get_public_discovery_spotlight'/g) || []).length, 1);
  assert.match(smoke, /discoveryCount <= 1/);
  assert.match(smoke, /profileHydrationCount === 0/);
  assert.match(smoke, /storageCount === 0/);
  assert.match(smoke, /document\.documentElement\.scrollWidth/);
  assert.match(smoke, /homepage-roll-first/);
});
