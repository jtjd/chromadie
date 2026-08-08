import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  PROFILE_RICH_MEDIA_BUCKET,
  PROFILE_RICH_MEDIA_KINDS,
  PROFILE_RICH_MEDIA_MAX_TOTAL_BYTES,
  PROFILE_RICH_MEDIA_RULES,
  buildRichMediaStoragePath,
  getRichMediaStorageRef,
  normalizeRichAudioPlaylist,
  normalizeRichMediaConfig,
  validateRichMediaFile
} from '../src/lib/profileRichMedia.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const userId = '10000000-0000-0000-0000-000000000001';
const assetId = '20000000-0000-0000-0000-000000000002';

test('rich media paths and quotas are exact and bounded', () => {
  const videoPath = buildRichMediaStoragePath('background_video', userId, assetId, 'mp4');
  const audioPath = buildRichMediaStoragePath('audio', userId, assetId, 'mp3');
  const cursorPath = buildRichMediaStoragePath('cursor', userId, assetId, 'webp');
  assert.equal(PROFILE_RICH_MEDIA_BUCKET, 'profile_media');
  assert.deepEqual(PROFILE_RICH_MEDIA_KINDS, ['background_video', 'banner', 'audio', 'cursor', 'pointer_cursor']);
  assert.equal(PROFILE_RICH_MEDIA_MAX_TOTAL_BYTES, 150 * 1024 * 1024);
  assert.equal(PROFILE_RICH_MEDIA_RULES.background_video.maxCount, 3);
  assert.equal(PROFILE_RICH_MEDIA_RULES.background_video.maxInputBytes, 25 * 1024 * 1024);
  assert.equal(PROFILE_RICH_MEDIA_RULES.audio.maxCount, 5);
  assert.equal(PROFILE_RICH_MEDIA_RULES.audio.maxInputBytes, 10 * 1024 * 1024);
  assert.equal(PROFILE_RICH_MEDIA_RULES.cursor.maxOutputBytes, 128 * 1024);
  assert.equal(videoPath, `profile_media/${userId}/${assetId}.mp4`);
  assert.equal(audioPath, `profile_media/${userId}/${assetId}.mp3`);
  assert.deepEqual(getRichMediaStorageRef(cursorPath), { bucket: 'profile_media', objectPath: `${userId}/${assetId}.webp`, extension: 'webp', kind: null });
  assert.equal(buildRichMediaStoragePath('audio', userId, assetId, 'wav'), '');
  assert.equal(getRichMediaStorageRef(`profile_media/${userId}/../../secret.mp3`), null);
});

test('rich media input and config normalization reject unsafe values', () => {
  assert.equal(validateRichMediaFile({ type: 'video/mp4', size: 1024 }, 'background_video'), '');
  assert.match(validateRichMediaFile({ type: 'video/quicktime', size: 1024 }, 'background_video'), /MP4 or WebM/);
  assert.match(validateRichMediaFile({ type: 'audio/mpeg', size: 10 * 1024 * 1024 + 1 }, 'audio'), /10 MB/);
  assert.match(validateRichMediaFile({ type: 'image/svg+xml', size: 1024 }, 'cursor'), /JPEG, PNG, or WebP/);

  const path = `profile_media/${userId}/${assetId}.mp3`;
  assert.deepEqual(normalizeRichAudioPlaylist({
    tracks: [
      { path, label: '<script>', duration_ms: 60000, trim_start_ms: 250, trim_end_ms: 30000, order: 1 },
      { path, label: 'duplicate' }
    ],
    shuffle: true,
    loop: false,
    autoplay: true,
    volume: 2,
    controls: false
  }), {
    tracks: [{ path, label: '<script>', duration_ms: 60000, trim_start_ms: 250, trim_end_ms: 30000, order: 0 }],
    shuffle: true,
    loop: false,
    autoplay: true,
    volume: 1,
    controls: false
  });
  assert.equal(normalizeRichMediaConfig({ banner_path: 'https://evil.test/banner.webp' }).banner_path, null);
});

test('rich media migration and renderer preserve ownership and browser safety boundaries', async () => {
  const migration = await read('supabase/migrations/20260808210000_bounded_rich_profile_media.sql');
  const editor = await read('src/lib/ProfileRichMediaEditor.svelte');
  const shell = await read('src/lib/ProfileShell.svelte');
  const music = await read('src/lib/ProfileMusic.svelte');
  const config = await read('src/lib/profileConfig.js');

  assert.match(migration, /status IN \('staged', 'active', 'abandoned', 'deleted'\)/);
  assert.match(migration, /150 MB|157286400/);
  assert.match(migration, /26214400/);
  assert.match(migration, /10485760/);
  assert.match(migration, /131072/);
  assert.match(migration, /stage_my_profile_media_asset/);
  assert.match(migration, /finalize_my_profile_media_asset/);
  assert.match(migration, /cleanup_staged_profile_media/);
  assert.match(migration, /recovery_until < now\(\)/);
  assert.match(migration, /refund hides rich presentation immediately/);
  assert.match(migration, /profile_rich_media_access/);
  assert.match(migration, /billing_premium_access/);
  assert.match(migration, /COALESCE\(v_object\.metadata->>'mimetype'/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.profile_media_assets/);
  assert.match(migration, /rich_access THEN background_video_path ELSE NULL/);
  assert.match(editor, /stage_my_profile_media_asset/);
  assert.match(editor, /finalize_my_profile_media_asset/);
  assert.match(editor, /delete_my_profile_media_asset/);
  assert.match(editor, /select_my_profile_rich_media/);
  assert.match(editor, /audioTracks/);
  assert.match(editor, /trim_start_ms/);
  assert.match(editor, /audioShuffle/);
  assert.match(shell, /autoplay muted loop playsinline/);
  assert.match(shell, /poster=\{backgroundSrc/);
  assert.match(shell, /prefersReducedMotion/);
  assert.match(shell, /--profile-pointer-cursor/);
  assert.match(music, /Enter profile/);
  assert.match(music, /autoplay=\{false\}/);
  assert.match(music, /MediaTrackNext/);
  assert.doesNotMatch(music, /window\.addEventListener\(['"]pointerdown/);
  assert.match(config, /normalizeRichMediaConfig/);
});
