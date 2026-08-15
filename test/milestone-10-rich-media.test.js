import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  PROFILE_RICH_MEDIA_BUCKET,
  PROFILE_ANIMATED_CURSOR_MIME,
  PROFILE_RICH_MEDIA_KINDS,
  PROFILE_RICH_MEDIA_MAX_TOTAL_BYTES,
  PROFILE_RICH_MEDIA_RULES,
  buildRichMediaStoragePath,
  extensionForRichMedia,
  getRichMediaStorageRef,
  isAnimatedCursorFile,
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
  assert.equal(PROFILE_ANIMATED_CURSOR_MIME, 'application/x-navi-animation');
  assert.deepEqual(PROFILE_RICH_MEDIA_RULES.cursor.extensions, ['webp', 'ani']);
  assert.equal(videoPath, `profile_media/${userId}/${assetId}.mp4`);
  assert.equal(audioPath, `profile_media/${userId}/${assetId}.mp3`);
  assert.deepEqual(getRichMediaStorageRef(cursorPath), { bucket: 'profile_media', objectPath: `${userId}/${assetId}.webp`, extension: 'webp', kind: null });
  assert.equal(buildRichMediaStoragePath('audio', userId, assetId, 'wav'), '');
  const aniPath = buildRichMediaStoragePath('cursor', userId, assetId, 'ani');
  assert.equal(extensionForRichMedia('cursor', { name: 'cursor.ani', type: 'application/octet-stream' }), 'ani');
  assert.equal(isAnimatedCursorFile({ name: 'cursor.ani', type: 'application/octet-stream' }), true);
  assert.equal(isAnimatedCursorFile({ name: 'cursor.bin', type: 'application/octet-stream' }), false);
  assert.equal(validateRichMediaFile({ name: 'cursor.ani', type: 'application/x-navi-animation', size: 1024 }, 'cursor'), '');
  assert.equal(validateRichMediaFile({ name: 'cursor.ani', type: 'image/x-ani', size: 1024 }, 'cursor'), '');
  assert.match(validateRichMediaFile({ name: 'cursor.ani', type: 'application/x-navi-animation', size: 131073 }, 'cursor'), /128 KB/);
  assert.deepEqual(getRichMediaStorageRef(aniPath), { bucket: 'profile_media', objectPath: `${userId}/${assetId}.ani`, extension: 'ani', kind: null });
  assert.equal(getRichMediaStorageRef(`profile_media/${userId}/../../secret.mp3`), null);
});

test('rich media input and config normalization reject unsafe values', () => {
  assert.equal(validateRichMediaFile({ type: 'video/mp4', size: 1024 }, 'background_video'), '');
  assert.match(validateRichMediaFile({ type: 'video/quicktime', size: 1024 }, 'background_video'), /MP4 or WebM/);
  assert.match(validateRichMediaFile({ type: 'audio/mpeg', size: 10 * 1024 * 1024 + 1 }, 'audio'), /10 MB/);
  assert.match(validateRichMediaFile({ type: 'image/svg+xml', size: 1024 }, 'cursor'), /JPEG, PNG, WebP, or ANI/);

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
  assert.equal(normalizeRichMediaConfig({ banner_path: `profile_media/${userId}/${assetId}.ani` }).banner_path, null);
});

test('rich media migration and renderer preserve ownership and browser safety boundaries', async () => {
  const migration = await read('supabase/migrations/20260808210000_bounded_rich_profile_media.sql');
  const rlsFix = await read('supabase/migrations/20260809010000_fix_rich_media_storage_rls.sql');
  const editor = await read('src/lib/ProfileRichMediaEditor.svelte');
  const [shell, environment] = await Promise.all([
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileEnvironmentLayer.svelte')
  ]);
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
  const animatedMigration = await read('supabase/migrations/20260810100000_animated_profile_cursors.sql');
  assert.match(animatedMigration, /application\/x-navi-animation/);
  assert.match(animatedMigration, /\(webp\|ani\)/);
  assert.match(animatedMigration, /stage_my_profile_media_asset/);
  assert.match(migration, /billing_premium_access/);
  assert.match(migration, /COALESCE\(v_object\.metadata->>'mimetype'/);
  assert.match(rlsFix, /COALESCE\(storage\.objects\.metadata->>'mimetype', ''\) = a\.mime_type/);
  assert.match(rlsFix, /a\.storage_path = 'profile_media\/' \|\| name/);
  assert.doesNotMatch(rlsFix, /a\.storage_path = 'profile_media\/' \|\| auth\.uid\(\)::text \|\| '\/' \|\| name/);
  assert.doesNotMatch(rlsFix, /COALESCE\(metadata->>'mimetype'/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.profile_media_assets/);
  assert.match(migration, /rich_access THEN background_video_path ELSE NULL/);
  assert.match(editor, /uploadProfileMediaToR2/);
  assert.match(editor, /deleteProfileMediaAsset/);
  assert.doesNotMatch(editor, /stage_my_profile_media_asset|stage_my_profile_media_replacement|finalize_my_profile_media_asset/);
  assert.doesNotMatch(editor, /supabase\.storage[\s\S]*\.upload/);
  assert.match(editor, /select_my_profile_r2_media/);
  assert.match(editor, /application\/x-navi-animation/);
  assert.match(editor, /\.ani/);
  assert.match(editor, /PROFILE_ANIMATED_CURSOR_MIME/);
  assert.match(editor, /audioTracks/);
  assert.match(editor, /trim_start_ms/);
  assert.match(editor, /audioShuffle/);
  assert.match(editor, /rich-media-editor__upload-card/);
  assert.match(editor, /Active profile banner/);
  assert.match(editor, /Active profile audio/);
  assert.match(editor, /Replace video/);
  assert.match(editor, /Replace banner/);
  assert.match(editor, /controls preload="metadata"/);
  assert.match(environment, /autoplay muted loop playsinline/);
  assert.doesNotMatch(environment, /poster=\{backgroundSrc/);
  assert.match(shell, /ProfileEnvironmentLayer/);
  assert.match(shell, /prefersReducedMotion/);
  assert.match(shell, /--profile-pointer-cursor/);
  assert.match(music, /Enter profile/);
  assert.match(music, /autoplay=\{false\}/);
  assert.match(music, /MediaTrackNext/);
  assert.doesNotMatch(music, /window\.addEventListener\(['"]pointerdown/);
  assert.match(config, /normalizeRichMediaConfig/);
});
