import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildProfileStoragePath,
  getProfileStorageRef,
  getSpotifyEmbedUrl,
  normalizeProfileExpression,
  parseSpotifyUrl,
  PROFILE_IMAGE_RULES
} from '../src/lib/profileExpression.js';
import { validateProfileImageFile } from '../src/lib/profileMediaProcessing.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const spotifyId = '1234567890123456789012';
const userId = '10000000-0000-0000-0000-000000000001';

test('Spotify accepts only supported open.spotify.com entities', () => {
  for (const type of ['track', 'playlist', 'album']) {
    assert.deepEqual(parseSpotifyUrl(`https://open.spotify.com/${type}/${spotifyId}?si=test`), { type, id: spotifyId });
    assert.equal(getSpotifyEmbedUrl(type, spotifyId), `https://open.spotify.com/embed/${type}/${spotifyId}?theme=0`);
  }

  for (const value of [
    `http://open.spotify.com/track/${spotifyId}`,
    `https://www.open.spotify.com/track/${spotifyId}`,
    `https://spotify.com/track/${spotifyId}`,
    `https://open.spotify.com/embed/track/${spotifyId}`,
    `https://open.spotify.com/track/not-an-id`,
    `https://open.spotify.com/track/${spotifyId}/extra`,
    `https://open.spotify.com/track/${spotifyId}#fragment`
  ]) assert.equal(parseSpotifyUrl(value), null);
});
test('expression paths are exact, owner-shaped, and bounded', () => {
  const avatarPath = buildProfileStoragePath('avatar', userId);
  const backgroundPath = buildProfileStoragePath('background', userId);
  assert.equal(avatarPath, `avatars/${userId}/avatar.webp`);
  assert.equal(backgroundPath, `backgrounds/${userId}/background.webp`);
  assert.deepEqual(getProfileStorageRef(avatarPath), { bucket: 'avatars', objectPath: `${userId}/avatar.webp` });
  assert.deepEqual(getProfileStorageRef(backgroundPath), { bucket: 'backgrounds', objectPath: `${userId}/background.webp` });
  assert.equal(buildProfileStoragePath('avatar', 'not-a-user'), '');
  assert.equal(getProfileStorageRef(`avatars/${userId}/avatar.svg`), null);
  assert.deepEqual(normalizeProfileExpression({
    avatar_path: avatarPath,
    background_path: backgroundPath,
    spotify_type: 'track',
    spotify_id: spotifyId,
    private_value: 'drop me'
  }), {
    avatar_path: avatarPath,
    background_path: backgroundPath,
    spotify_type: 'track',
    spotify_id: spotifyId
  });
  assert.equal(normalizeProfileExpression({ spotify_type: 'track', spotify_id: 'short' }).spotify_id, null);
});

test('image input rules reject SVG and oversized originals before processing', () => {
  assert.equal(PROFILE_IMAGE_RULES.avatar.maxOutputBytes, 256 * 1024);
  assert.equal(PROFILE_IMAGE_RULES.background.maxOutputBytes, 1024 * 1024);
  assert.equal(validateProfileImageFile({ type: 'image/jpeg', size: 1024 }, 'avatar'), '');
  assert.match(validateProfileImageFile({ type: 'image/svg+xml', size: 1024 }, 'avatar'), /JPEG, PNG, or WebP/);
  assert.match(validateProfileImageFile({ type: 'image/png', size: 5 * 1024 * 1024 + 1 }, 'avatar'), /5 MB/);
  assert.match(validateProfileImageFile({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 }, 'background'), /10 MB/);
});

test('media storage, server validation, and public rendering boundaries are explicit', async () => {
  const migration = await read('supabase/migrations/20260730110000_profile_expression_media.sql');
  const limitsMigration = await read('supabase/migrations/20260730120000_profile_media_size_limits.sql');
  const settings = await read('src/lib/ProfileExpressionEditor.svelte');
  const identity = await read('src/lib/IdentityCard.svelte');
  const atmosphere = await read('src/lib/ProfileAtmosphere.svelte');
  const music = await read('src/lib/ProfileMusic.svelte');

  assert.match(migration, /INSERT INTO storage\.buckets/);
  assert.match(migration, /'avatars', 'avatars', true, 5242880/);
  assert.match(migration, /'backgrounds', 'backgrounds', true, 10485760/);
  assert.match(limitsMigration, /file_size_limit = 262144/);
  assert.match(limitsMigration, /file_size_limit = 1048576/);
  assert.match(migration, /Owners can upload profile expression media/);
  assert.match(migration, /name = auth\.uid\(\)::text \|\| '\/avatar\.webp'/);
  assert.match(migration, /COALESCE\(metadata->>'mimetype', ''\) = 'image\/webp'/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.update_my_profile_expression/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /open\[\.]spotify\[\.]com/);
  assert.match(migration, /DELETE FROM storage\.objects/);
  assert.doesNotMatch(migration, /iframe|innerHTML|CREATE TABLE.*media/i);
  assert.match(settings, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(settings, /processProfileImage\(file, 'avatar'\)/);
  assert.match(settings, /processProfileImage\(file, 'background'\)/);
  assert.match(settings, /update_my_profile_expression/);
  assert.match(identity, /failedAvatarSource/);
  assert.match(identity, /on:error/);
  assert.match(atmosphere, /background-position: center/);
  assert.match(music, /loading="lazy"/);
  assert.doesNotMatch(music, /autoplay\s*=/i);
});
