import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildHomepageFeaturedProfiles,
  getLatestHomepageRoll,
  mergeHomepageDiscoveryProfile
} from '../src/lib/homepageDirectory.js';
import { createDefaultProfileConfig } from '../src/lib/profileConfig.js';

function profileModel({
  username,
  displayName = '',
  isStaff = false,
  profilePath = `/${username.toLowerCase()}`,
  scores = [],
  publishedConfig = null
}) {
  return {
    profilePath,
    discoveryItem: { username, rank: isStaff ? null : 4 },
    context: {
      targetProfile: {
        username,
        display_name: displayName,
        bio: `${username} makes things.`,
        is_staff: isStaff,
        mood_color: '#4433AA',
        equipped_cosmetics: { name_effect: 'name_soft_glow' },
        best_roll_hex: '#112233',
        best_roll_score: 1200,
        best_roll_rarity: 'Common'
      },
      targetScores: scores,
      profileConfig: {
        published: publishedConfig || {
          ...createDefaultProfileConfig('#8B7CF6'),
          signatureColor: '#8B7CF6',
          avatar_path: 'avatars/10000000-0000-4000-8000-000000000001/avatar.webp',
          links: [{ label: 'Site', url: 'https://example.com' }]
        }
      }
    }
  };
}

test('homepage featured profiles use hydrated public identity and latest roll data', () => {
  const models = [
    profileModel({
      username: 'Player',
      scores: [
        { roll_date: '2026-08-01', hex_code: '#111111', score: 100, rarity: 'Common' },
        { roll_date: '2026-08-03', hex_code: '#55CCBB', score: 9876, rarity: 'Rare', identity: 'Electric cyan' }
      ]
    }),
    profileModel({ username: 'Admin', displayName: 'Chromadie', isStaff: true })
  ];

  const featured = buildHomepageFeaturedProfiles(models, 2);

  assert.equal(featured.length, 2);
  assert.equal(featured[0].username, 'Admin');
  assert.equal(featured[0].profilePath, '/admin');
  assert.equal(featured[1].username, 'Player');
  assert.equal(featured[1].hexCode, '#55CCBB');
  assert.equal(featured[1].score, 9876);
  assert.equal(featured[1].identity, 'Electric cyan');
  assert.equal(featured[1].avatarPath, 'avatars/10000000-0000-4000-8000-000000000001/avatar.webp');
  assert.deepEqual(featured[1].equippedCosmetics, { name_effect: 'name_soft_glow' });
});

test('homepage featured profiles reject invalid profile paths and retain best-roll fallbacks', () => {
  const valid = profileModel({ username: 'Valid_User' });
  const invalid = profileModel({ username: '%' });
  const featured = buildHomepageFeaturedProfiles([invalid, valid], 3);

  assert.equal(featured.length, 1);
  assert.equal(featured[0].profilePath, '/valid_user');
  assert.equal(featured[0].hexCode, '#112233');
  assert.equal(featured[0].score, 1200);
  assert.equal(getLatestHomepageRoll(valid.context), null);
});

test('homepage featured profiles project expression media from V2 envelopes', () => {
  const avatarPath = 'avatars/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp';
  const base = { ...createDefaultProfileConfig('#8B7CF6'), avatar_path: avatarPath };
  const featured = buildHomepageFeaturedProfiles([
    profileModel({
      username: 'V2Player',
      publishedConfig: {
        version: 2,
        base,
        links: [],
        identity: {},
        content: {},
        widgets: []
      }
    })
  ], 1);

  assert.equal(featured[0].avatarPath, avatarPath);
});

test('homepage discovery rows recover media from the hydrated public profile', () => {
  const avatarPath = 'avatars/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp';
  const context = profileModel({
    username: 'HydratedPlayer',
    publishedConfig: {
      version: 2,
      base: { ...createDefaultProfileConfig('#8B7CF6'), avatar_path: avatarPath },
      links: [],
      identity: {},
      content: {},
      widgets: []
    }
  }).context;
  const merged = mergeHomepageDiscoveryProfile({ username: 'HydratedPlayer', avatarPath: null }, context);

  assert.equal(merged.avatarPath, avatarPath);
});

test('homepage featured profiles carry the provider-neutral avatar reference', () => {
  const avatarReference = {
    storage_provider: 'r2',
    r2_public_key: 'profiles/10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000002/abc.webp'
  };
  const model = profileModel({
    username: 'R2Player',
    publishedConfig: {
      ...createDefaultProfileConfig('#8B7CF6'),
      avatar_path: null,
      media_references: { avatar: avatarReference }
    }
  });
  const featured = buildHomepageFeaturedProfiles([model], 1);
  assert.deepEqual(featured[0].avatarReference, avatarReference);
});
