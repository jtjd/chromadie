import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

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

test('discovery route parsing preserves legacy leaderboard tabs and adds only allow-listed discovery tabs', () => {
  assert.equal(parseRouteLocation('/leaderboard', '?tab=random').leaderboardTab, 'random');
  assert.equal(parseRouteLocation('/leaderboard', '?tab=recent').leaderboardTab, 'recent');
  assert.equal(parseRouteLocation('/leaderboard', '?tab=private').leaderboardTab, 'today');
});

test('discovery implementation uses public RPC projections, profile CTAs, sharing, and reduced motion without raw HTML', async () => {
  const hub = await readFile(new URL('../src/lib/DiscoveryHub.svelte', import.meta.url), 'utf8');
  const card = await readFile(new URL('../src/lib/DiscoveryCard.svelte', import.meta.url), 'utf8');
  const entry = await readFile(new URL('../src/lib/Leaderboard.svelte', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../supabase/migrations/20260725120000_public_discovery.sql', import.meta.url), 'utf8');
  const previewMigration = await readFile(new URL('../supabase/migrations/20260801090000_discovery_profile_preview.sql', import.meta.url), 'utf8');
  const hardeningMigration = await readFile(new URL('../supabase/migrations/20260811130000_discovery_avatar_contract_and_media_cleanup.sql', import.meta.url), 'utf8');
  const r2Migration = await readFile(new URL('../supabase/migrations/20260813140000_profile_media_r2_discovery.sql', import.meta.url), 'utf8');

  assert.match(hub, /get_public_discovery/);
  assert.match(hub, /Load more profiles/);
  assert.match(hub, /Search username/);
  assert.match(hub, /Exceptional/);
  assert.match(hub, /Rising/);
  assert.match(hub, /Random/);
  assert.match(card, /getPublicProfilePath/);
  assert.match(card, /getProfileShareText/);
  assert.match(card, /getProfileMediaUrl/);
  assert.match(card, /CompactRollPreview/);
  assert.match(card, /ProfileBorderEffect/);
  assert.match(card, /getNameRendererLoadout/);
  assert.match(card, /filter\(badge => badge\.symbol !== '❓'\)/);
  assert.match(card, /Color roll/);
  assert.match(card, /Open profile/);
  assert.match(card, /prefers-reduced-motion/);
  assert.doesNotMatch(hub + card, /innerHTML|new Function|eval\s*\(/);
  assert.match(entry, /DiscoveryHub/);
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
  assert.match(hub, /discovery-grid__item/);
  assert.match(hub, /presentation="leaderboard"/);
  assert.doesNotMatch(hub, /<main class="container discovery-hub">/);
  assert.match(card, /discovery-card--leaderboard/);
});
