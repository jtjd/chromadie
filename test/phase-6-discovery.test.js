import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

import {
  DISCOVERY_PAGE_SIZE,
  getDiscoverySurface,
  getPublicProfilePath,
  getPublicProfileShareUrl,
  getProfileShareText,
  normalizeDiscoveryItem,
  normalizeDiscoveryResponse,
  normalizeRivalItem
} from '../src/lib/discoveryData.js';
import { parseRouteLocation } from '../src/lib/routes.js';

const publicItem = {
  username: 'NeonUser',
  hexCode: '#abcdef',
  score: 61196,
  rarity: 'Rare',
  rollDate: '2026-07-25',
  identity: '<script>alert(1)</script>',
  displayName: 'Neon User',
  bio: 'Collecting colors and building a public profile.',
  profileAccent: '#8b7cf6',
  avatarPath: 'avatars/10000000-0000-4000-8000-000000000001/avatar.webp',
  currentStreak: 4,
  totalRolls: 12,
  lifetimeEp: 200000,
  equippedCosmetics: { profile_border: 'border_signal', unsafe: 'javascript:alert(1)' },
  equippedBadges: ['launch_edition', '<script>'],
  isStaff: false,
  rank: 1,
  profileCreatedAt: '2026-07-01T12:00:00.000Z',
  kind: 'roll',
  user_id: 'private-internal-id'
};

test('discovery normalization keeps public card fields bounded and drops internal identifiers', () => {
  const item = normalizeDiscoveryItem(publicItem);

  assert.equal(item.username, 'NeonUser');
  assert.equal(item.hexCode, '#ABCDEF');
  assert.equal(item.score, 61196);
  assert.equal(item.identity, '<script>alert(1)</script>');
  assert.equal(item.displayName, 'Neon User');
  assert.equal(item.bio, 'Collecting colors and building a public profile.');
  assert.equal(item.profileAccent, '#8B7CF6');
  assert.equal(item.avatarPath, null);
  assert.equal(item.avatarReference, null);
  assert.deepEqual(item.equippedBadges, ['launch_edition']);
  assert.equal(item.equippedCosmetics.unsafe, undefined);
  assert.equal('user_id' in item, false);
  assert.equal(normalizeDiscoveryItem({ ...publicItem, avatarPath: 'avatars/not-a-user/avatar.webp' }).avatarPath, null);
  assert.equal(
    normalizeDiscoveryItem({
      ...publicItem,
      avatarPath: 'avatars/10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000002.webp'
    }).avatarPath,
    null
  );
  assert.equal(
    normalizeDiscoveryItem({
      ...publicItem,
      avatarPath: 'avatars/10000000-0000-4000-8000-000000000001/not-an-asset.webp'
    }).avatarPath,
    null
  );
  assert.equal(normalizeDiscoveryItem({ username: '%' }), null);
});

test('discovery accepts the provider-neutral R2 avatar reference without trusting an unsafe key', () => {
  const item = normalizeDiscoveryItem({
    ...publicItem,
    avatarPath: null,
    avatarReference: {
      asset_id: '10000000-0000-4000-8000-000000000001',
      storage_provider: 'r2',
      r2_public_key: 'profiles/10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000002/abc.webp',
      mime_type: 'image/webp',
      byte_size: 1200
    }
  });

  assert.equal(item.avatarPath, null);
  assert.equal(item.avatarReference.storage_provider, 'r2');
  assert.match(item.avatarReference.r2_public_key, /^profiles\//);
  assert.equal(normalizeDiscoveryItem({ ...publicItem, avatarReference: { storage_provider: 'r2', r2_public_key: '../private.webp' } }).avatarReference, null);
});

test('discovery response pagination is bounded and surface names stay allow-listed', () => {
  const response = normalizeDiscoveryResponse({
    surface: 'random',
    page: 3,
    limit: 99,
    hasMore: true,
    items: [publicItem, { ...publicItem, username: 'OtherUser', rank: null }]
  });

  assert.equal(response.page, 3);
  assert.equal(response.limit, DISCOVERY_PAGE_SIZE);
  assert.equal(response.hasMore, true);
  assert.equal(response.items.length, 2);
  assert.equal(getDiscoverySurface('roll'), 'all_time');
  assert.equal(getDiscoverySurface('not-a-surface'), 'today');
});

test('every discovery card resolves to a safe public profile route and share text', () => {
  assert.equal(getPublicProfilePath('NeonUser'), '/neonuser');
  assert.equal(getPublicProfilePath('%'), null);
  assert.equal(getPublicProfileShareUrl('NeonUser', 'https://chm.lol'), 'https://chm.lol/neonuser');
  assert.match(getProfileShareText(publicItem, 'https://chm.lol'), /https:\/\/chm\.lol\/neonuser/);
});

test('rivals retain the existing authenticated follow identifier only at the compatibility boundary', () => {
  const rival = normalizeRivalItem({
    ...publicItem,
    user_id: '10000000-0000-4000-8000-000000000001',
    hex_code: '#123456',
    current_streak: 2,
    equipped_cosmetics: {},
    equipped_badges: []
  });

  assert.equal(rival.userId, '10000000-0000-4000-8000-000000000001');
  assert.equal(rival.hexCode, '#123456');
  assert.equal(normalizeRivalItem({ ...publicItem, user_id: 'not-a-uuid' }), null);
});

test('leaderboard route parsing accepts only the active today and monthly periods', () => {
  assert.equal(parseRouteLocation('/leaderboard', '?tab=monthly').leaderboardTab, 'monthly');
  assert.equal(parseRouteLocation('/leaderboard', '?tab=weekly').leaderboardTab, 'today');
  assert.equal(parseRouteLocation('/leaderboard', '?tab=random').leaderboardTab, 'today');
  assert.equal(parseRouteLocation('/leaderboard', '?tab=private').leaderboardTab, 'today');
});

test('leaderboard implementation is a focused podium and score list without raw HTML', async () => {
  const leaderboard = await readFile(new URL('../src/lib/Leaderboard.svelte', import.meta.url), 'utf8');
  const entry = await readFile(new URL('../src/lib/LeaderboardEntry.svelte', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/App.svelte', import.meta.url), 'utf8');
  const siteStyles = await readFile(new URL('../src/styles/site.css', import.meta.url), 'utf8');
  const header = await readFile(new URL('../src/lib/SiteModeHeader.svelte', import.meta.url), 'utf8');
  const background = await stat(new URL('../public/leaderboard/leaderboard-background.webp', import.meta.url));
  const migration = await readFile(new URL('../supabase/migrations/20260725120000_public_discovery.sql', import.meta.url), 'utf8');
  const previewMigration = await readFile(new URL('../supabase/migrations/20260801090000_discovery_profile_preview.sql', import.meta.url), 'utf8');
  const hardeningMigration = await readFile(new URL('../supabase/migrations/20260811130000_discovery_avatar_contract_and_media_cleanup.sql', import.meta.url), 'utf8');
  const r2Migration = await readFile(new URL('../supabase/migrations/20260813140000_profile_media_r2_discovery.sql', import.meta.url), 'utf8');

  assert.match(leaderboard, /get_public_discovery/);
  assert.match(leaderboard, />Leaderboard</);
  assert.doesNotMatch(leaderboard, /Public rankings/);
  assert.match(leaderboard, /Today's top rolls/);
  assert.match(leaderboard, /This month's top rolls/);
  assert.match(leaderboard, /This month/);
  assert.match(leaderboard, /align-items: center; text-align: center/);
  assert.match(leaderboard, /width: min\(980px, calc\(100% - 48px\)\)/);
  assert.match(leaderboard, /roll-leaderboard__featured-list/);
  assert.match(leaderboard, /roll-leaderboard__lower/);
  assert.match(leaderboard, /--leaderboard-bg: var\(--bg, #0e0e10\)/);
  assert.match(leaderboard, /background: transparent/);
  assert.match(app, /class:app-shell--leaderboard=\{leaderboardModeVisible\}/);
  assert.match(app, /isLeaderboardMode=\{leaderboardModeVisible\}/);
  assert.doesNotMatch(siteStyles, /leaderboard\/leaderboard-background\.webp/);
  assert.match(header, /class:site-mode-header--leaderboard=\{isLeaderboardMode\}/);
  assert.match(header, /\.site-mode-header--leaderboard \{[\s\S]*background: transparent !important;/);
  assert.ok(background.size > 1000, 'leaderboard background should be a real local asset');
  assert.match(leaderboard, /color-scheme: dark/);
  assert.match(leaderboard, /items\.slice\(0, 3\)/);
  assert.match(leaderboard, /variant="podium"/);
  assert.match(leaderboard, /variant="list"/);
  assert.doesNotMatch(leaderboard, /roll-leaderboard__table/);
  assert.doesNotMatch(leaderboard, /Search username|Exceptional|Rising|Random|Following|All-time/);
  assert.match(entry, /getPublicProfilePath/);
  assert.match(entry, /getProfileMediaUrl/);
  assert.match(entry, /Score details unavailable/);
  assert.match(entry, /leaderboard-row/);
  assert.match(entry, /var\(--leaderboard-text/);
  assert.match(entry, /prefers-reduced-motion/);
  assert.doesNotMatch(entry, /getProfileShareText|CompactRollPreview|ProfileBorderEffect|NameEffectCanvas|toggleFollow|profile_shared/);
  assert.doesNotMatch(leaderboard + entry, /innerHTML|new Function|eval\s*\(/);
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /LIMIT v_limit \+ 1/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.get_public_discovery/);
  assert.doesNotMatch(migration, /'user_id'\s*,/);
  assert.match(previewMigration, /get_public_discovery_base/);
  assert.match(previewMigration, /'displayName'/);
  assert.match(previewMigration, /'avatarPath'/);
  assert.match(previewMigration, /profile_configurations/);
  assert.match(previewMigration, /REVOKE ALL ON FUNCTION public\.get_public_discovery_base/);
  assert.doesNotMatch(previewMigration, /'email'|'ep_spent'|'reroll_shards'/);
  assert.match(hardeningMigration, /profile_media_assets/);
  assert.match(hardeningMigration, /asset\.status = 'active'/);
  assert.match(hardeningMigration, /name LIKE OLD\.id::text \|\| '\/%'/);
  assert.match(r2Migration, /'avatarReference'/);
  assert.match(r2Migration, /profile_media_public_reference/);
  assert.match(leaderboard, /roll-leaderboard__list-item/);
  assert.match(leaderboard, /LeaderboardEntry/);
  assert.doesNotMatch(leaderboard + entry, /DiscoveryHub|DiscoveryCard|discovery-card|discovery-grid|discovery-hub/);
});
