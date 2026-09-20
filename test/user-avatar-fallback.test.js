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

test('authenticated account chrome renders uploaded avatar media before the fallback', async () => {
  const header = await read('src/lib/SiteModeHeader.svelte');
  const app = await read('src/App.svelte');
  const migration = await read('supabase/migrations/20260920100000_authenticated_avatar_projection.sql');

  assert.match(header, /export let avatarSrc = ''/);
  assert.match(header, /import \{ profile \} from '\.\/stores'/);
  assert.match(header, /accountAvatarReference = \$profile\?\.avatar_reference/);
  assert.match(header, /resolvedAvatarSource = accountAvatarReference \? getProfileMediaUrl\(accountAvatarReference\) : avatarSrc/);
  assert.match(header, /class="site-mode-header__avatar-image"/);
  assert.match(header, /on:error=\{handleAvatarError\}/);
  assert.match(header, /UserAvatarFallback initial=\{username \|\| 'C'\}/);
  assert.doesNotMatch(app, /headerAvatarReference|headerAvatarSrc|refreshHeaderAvatar/);
  assert.match(migration, /'avatar_reference', public\.profile_media_public_reference\(c\.avatar_asset_id, c\.avatar_path\)/);
  assert.match(migration, /LEFT JOIN public\.profile_configurations c ON c\.user_id = p\.id/);
});

test('avatar selection and removal update authenticated chrome state without a reload', async () => {
  const settings = await read('src/lib/ProfileSettings.svelte');

  assert.match(settings, /const mediaReferences = fields\.media_references/);
  assert.match(settings, /Object\.prototype\.hasOwnProperty\.call\(mediaReferences, 'avatar'\)/);
  assert.match(settings, /profile\.update\(currentProfile => currentProfile && currentProfile\.id === context\.profileId/);
  assert.match(settings, /avatar_reference: nextAvatarReference/);
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
