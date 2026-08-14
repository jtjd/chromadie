import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildProfileStoragePath,
  getProfileStorageRef,
  getSpotifyEmbedUrl,
  normalizeProfileExpression,
  parseSpotifyUrl,
  PROFILE_AUDIO_RULES,
  PROFILE_IMAGE_RULES
} from '../src/lib/profileExpression.js';
import { prepareProfileAudioFile, validateProfileAudioFile, validateProfileImageFile } from '../src/lib/profileMediaProcessing.js';

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
  const audioPath = buildProfileStoragePath('audio', userId);
  const animatedCursorPath = `profile_media/${userId}/20000000-0000-0000-0000-000000000002.ani`;
  assert.equal(avatarPath, `avatars/${userId}/avatar.webp`);
  assert.equal(backgroundPath, `backgrounds/${userId}/background.webp`);
  assert.equal(audioPath, `profile_audio/${userId}/profile.mp3`);
  assert.deepEqual(getProfileStorageRef(avatarPath), { bucket: 'avatars', objectPath: `${userId}/avatar.webp` });
  assert.deepEqual(getProfileStorageRef(backgroundPath), { bucket: 'backgrounds', objectPath: `${userId}/background.webp` });
  assert.deepEqual(getProfileStorageRef(audioPath), { bucket: 'profile_audio', objectPath: `${userId}/profile.mp3` });
  assert.deepEqual(getProfileStorageRef(animatedCursorPath), { bucket: 'profile_media', objectPath: `${userId}/20000000-0000-0000-0000-000000000002.ani` });
  assert.equal(buildProfileStoragePath('avatar', 'not-a-user'), '');
  assert.equal(getProfileStorageRef(`avatars/${userId}/avatar.svg`), null);
  assert.deepEqual(normalizeProfileExpression({
    avatar_path: avatarPath,
    background_path: backgroundPath,
    audio_path: audioPath,
    spotify_type: 'track',
    spotify_id: spotifyId,
    private_value: 'drop me'
  }), {
    avatar_path: avatarPath,
    background_path: backgroundPath,
    audio_path: audioPath,
    spotify_type: 'track',
    spotify_id: spotifyId
  });
  assert.equal(normalizeProfileExpression({ spotify_type: 'track', spotify_id: 'short' }).spotify_id, null);
});

test('image input rules reject SVG and oversized originals before processing', () => {
  assert.equal(PROFILE_IMAGE_RULES.avatar.maxOutputBytes, 256 * 1024);
  assert.equal(PROFILE_IMAGE_RULES.background.maxOutputBytes, 4 * 1024 * 1024);
  assert.equal(PROFILE_IMAGE_RULES.background.outputLabel, '4 MB');
  assert.equal(validateProfileImageFile({ type: 'image/jpeg', size: 1024 }, 'avatar'), '');
  assert.match(validateProfileImageFile({ type: 'image/svg+xml', size: 1024 }, 'avatar'), /JPEG, PNG, or WebP/);
  assert.match(validateProfileImageFile({ type: 'image/png', size: 5 * 1024 * 1024 + 1 }, 'avatar'), /5 MB/);
  assert.match(validateProfileImageFile({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 }, 'background'), /10 MB/);
});

test('staff audio input rules stay bounded', () => {
  assert.equal(PROFILE_AUDIO_RULES.maxInputBytes, 5 * 1024 * 1024);
  assert.equal(validateProfileAudioFile({ type: 'audio/mpeg', size: 1024 }), '');
  assert.match(validateProfileAudioFile({ type: 'audio/ogg', size: 1024 }), /MP3/);
  assert.match(validateProfileAudioFile({ type: 'audio/mpeg', size: 5 * 1024 * 1024 + 1 }), /5 MB/);
});

test('staff audio preparation strips incompatible ID3v2 wrappers', async () => {
  const bytes = new Uint8Array(20);
  bytes.set([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x05]);
  bytes.set([0xff, 0xfb, 0x90, 0x64, 0x11], 15);
  const prepared = await prepareProfileAudioFile({
    type: 'audio/mpeg',
    size: bytes.length,
    arrayBuffer: async () => bytes.buffer
  });
  assert.equal(prepared.type, 'audio/mpeg');
  assert.deepEqual(new Uint8Array(await prepared.arrayBuffer()), bytes.slice(15));
});

test('media storage, server validation, and public rendering boundaries are explicit', async () => {
  const migration = await read('supabase/migrations/20260730110000_profile_expression_media.sql');
  const limitsMigration = await read('supabase/migrations/20260730120500_profile_media_size_limits.sql');
  const qualityMigration = await read('supabase/migrations/20260801150000_increase_profile_background_quality.sql');
  const audioMigration = await read('supabase/migrations/20260730150000_staff_profile_audio.sql');
  const audioLimitMigration = await read('supabase/migrations/20260730160000_increase_staff_profile_audio_limit.sql');
  const settings = await read('src/lib/ProfileExpressionEditor.svelte');
  const identity = await read('src/lib/IdentityCard.svelte');
  const music = await read('src/lib/ProfileMusic.svelte');
  const instagramIcon = await read('public/link-icons/instagram.svg');
  const tiktokIcon = await read('public/link-icons/tiktok.svg');
  const twitchIcon = await read('public/link-icons/twitch.svg');

  assert.match(migration, /INSERT INTO storage\.buckets/);
  assert.match(migration, /'avatars', 'avatars', true, 5242880/);
  assert.match(migration, /'backgrounds', 'backgrounds', true, 10485760/);
  assert.match(limitsMigration, /file_size_limit = 262144/);
  assert.match(limitsMigration, /file_size_limit = 1048576/);
  assert.match(qualityMigration, /file_size_limit = 4194304/);
  assert.match(qualityMigration, /background/);
  assert.match(await read('src/lib/profileMediaProcessing.js'), /let quality = kind === 'avatar' \? 0\.86 : 0\.9/);
  assert.match(await read('src/lib/profileMediaProcessing.js'), /const maxDimension = 3200/);
  assert.match(migration, /Owners can upload profile expression media/);
  assert.match(migration, /name = auth\.uid\(\)::text \|\| '\/avatar\.webp'/);
  assert.match(migration, /COALESCE\(metadata->>'mimetype', ''\) = 'image\/webp'/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.update_my_profile_expression/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /open\[\.]spotify\[\.]com/);
  assert.match(migration, /DELETE FROM storage\.objects/);
  assert.match(audioMigration, /profile_audio/);
  assert.match(audioMigration, /is_staff = true/);
  assert.match(audioMigration, /CREATE OR REPLACE FUNCTION public\.update_my_profile_audio/);
  assert.match(audioMigration, /audio\/mpeg/);
  assert.match(audioLimitMigration, /file_size_limit = 5242880/);
  assert.match(audioMigration, /profile_audio\/.*profile[.]mp3/);
  assert.match(settings, /export let staff = false/);
  assert.match(identity, /slice\(0, 6\)/);
  assert.match(identity, /getProfileLinkDefinition/);
  assert.match(await read('src/lib/profileLinkTypes.js'), /instagram.*instagram/);
  assert.match(await read('src/lib/profileLinkTypes.js'), /tiktok.*tiktok/);
  assert.match(await read('src/lib/profileLinkTypes.js'), /twitch.*twitch/);
  assert.match(instagramIcon, /<svg/);
  assert.match(instagramIcon, /currentColor/);
  assert.match(tiktokIcon, /<svg/);
  assert.match(tiktokIcon, /currentColor/);
  assert.match(twitchIcon, /<svg/);
  assert.match(twitchIcon, /currentColor/);
  assert.match(settings, /deleteLegacyProfileAudio/);
  assert.match(await read('supabase/migrations/20260814010000_profile_audio_legacy_delete_order.sql'), /clear_my_legacy_profile_audio/);
  assert.doesNotMatch(migration, /iframe|innerHTML|CREATE TABLE.*media/i);
  assert.match(settings, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(settings, /stored as WebP up to/);
  assert.match(settings, /avatarRules\.maxInputBytes/);
  assert.match(settings, /backgroundRules\.maxInputBytes/);
  assert.match(settings, /formatStoredSize\(blob\.size\)/);
  assert.match(settings, /processProfileImage\(file, 'avatar'\)/);
  assert.match(settings, /processProfileImage\(file, 'background'\)/);
  assert.match(settings, /update_my_profile_expression/);
  assert.match(settings, /profile-expression-editor__audio-player/);
  assert.match(settings, /toggleAudio/);
  assert.match(settings, /Seek profile audio/);
  assert.match(identity, /failedAvatarSource/);
  assert.match(identity, /on:error/);
  assert.match(music, /loading="lazy"/);
  assert.match(music, /autoplay/);
  assert.match(music, /loop/);
});
