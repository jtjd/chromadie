import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the shared no-avatar identity is restrained and independent of player color', async () => {
  const fallback = await read('src/lib/UserAvatarFallback.svelte');

  assert.match(fallback, /text-transform: lowercase/);
  assert.match(fallback, /background: rgba\(8, 9, 12, 0\.72\)/);
  assert.match(fallback, /color: rgba\(248, 248, 248, 0\.94\)/);
  assert.match(fallback, /border-radius: 50%/);
  assert.doesNotMatch(fallback, /gradient|color-mix|box-shadow|profile-highlight|accent/i);
});

test('site-owned user identity surfaces share the same no-avatar component', async () => {
  const paths = [
    'src/lib/SiteModeHeader.svelte',
    'src/lib/homepage/HomepageBestRoll.svelte',
    'src/lib/homepage/HomepagePlayerCard.svelte',
    'src/lib/LeaderboardEntry.svelte',
    'src/lib/RivalRow.svelte',
    'src/lib/ProfileReferenceCard.svelte',
    'src/lib/profile-layout/ProfileFullBleedLayout.svelte',
    'src/lib/profile-layout/ProfilePortfolioLayout.svelte',
    'src/lib/ProfileExpressionEditor.svelte',
    'src/lib/ShopItemPreview.svelte'
  ];
  const sources = await Promise.all(paths.map(read));

  for (const source of sources) {
    assert.match(source, /UserAvatarFallback/);
  }
});

test('top roll fallback no longer derives its presentation from the roll or profile accent', async () => {
  const topRoll = await read('src/lib/homepage/HomepageBestRoll.svelte');

  assert.match(topRoll, /<UserAvatarFallback initial=\{displayName\}/);
  assert.doesNotMatch(topRoll, /avatarInitials|getAvatarInitials|avatarAccent|best-roll-avatar-accent/);
  const avatarRule = topRoll.match(/\.homepage-best-roll__avatar \{([^}]+)\}/)?.[1] || '';
  assert.doesNotMatch(avatarRule, /color-mix|box-shadow|background/);
});

test('avatar initials stay bounded without a container-query context', async () => {
  const source = await read('src/lib/UserAvatarFallback.svelte');
  assert.match(source, /font:\s*600 clamp\(1\.5rem, 34px, 3rem\)/);
  assert.doesNotMatch(source, /font:[^;]*34cqi/);
});
