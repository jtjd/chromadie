import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildProfileStoragePath,
  getProfileStorageRef,
  isProfileMediaPathForKind,
  normalizeProfileExpression
} from '../src/lib/profileExpression.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const userId = '10000000-0000-0000-0000-000000000001';
const assetId = '20000000-0000-0000-0000-000000000002';

test('reusable profile assets keep the same bounded bucket/path contract', () => {
  const avatarPath = buildProfileStoragePath('avatar', userId, assetId);
  const backgroundPath = buildProfileStoragePath('background', userId, assetId);
  assert.equal(avatarPath, `avatars/${userId}/${assetId}.webp`);
  assert.equal(backgroundPath, `backgrounds/${userId}/${assetId}.webp`);
  assert.deepEqual(getProfileStorageRef(avatarPath), { bucket: 'avatars', objectPath: `${userId}/${assetId}.webp` });
  assert.deepEqual(getProfileStorageRef(backgroundPath), { bucket: 'backgrounds', objectPath: `${userId}/${assetId}.webp` });
  assert.equal(isProfileMediaPathForKind(avatarPath, 'avatar'), true);
  assert.equal(isProfileMediaPathForKind(`avatars/${userId}/avatar.webp`, 'avatar'), true);
  assert.equal(isProfileMediaPathForKind(backgroundPath, 'avatar'), false);
  assert.equal(normalizeProfileExpression({ avatar_path: avatarPath, background_path: backgroundPath }).avatar_path, avatarPath);
  assert.equal(normalizeProfileExpression({ avatar_path: 'avatars/other-user/not-an-asset.webp' }).avatar_path, null);
});

test('media library migration keeps registration and deletion owner-scoped', async () => {
  const migration = await read('supabase/migrations/20260808130000_profile_media_library.sql');
  const editor = await read('src/lib/ProfileExpressionEditor.svelte');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.profile_media_assets/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.profile_media_assets FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /register_my_profile_media_asset/);
  assert.match(migration, /delete_my_profile_media_asset/);
  assert.match(migration, /storage\.objects/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /COALESCE\(v_object\.metadata->>'mimetype', ''\) <> 'image\/webp'/);
  assert.match(editor, /profile_media_assets/);
  assert.match(editor, /register_my_profile_media_asset/);
  assert.match(editor, /delete_my_profile_media_asset/);
  const avatarRemove = editor.match(/async function removeAvatar\(\)[\s\S]*?(?=\n  async function)/)?.[0] || '';
  const backgroundRemove = editor.match(/async function removeBackground\(\)[\s\S]*?(?=\n  async function)/)?.[0] || '';
  assert.doesNotMatch(avatarRemove, /storage\.from\(reference\.bucket\)\.remove/);
  assert.doesNotMatch(backgroundRemove, /storage\.from\(reference\.bucket\)\.remove/);
  assert.match(editor, /verifyPersistedImage/);
  assert.match(editor, /cleanupFailedImageUpload/);
  assert.match(editor, /Saved avatars/);
  assert.match(editor, /Saved backgrounds/);
});

test('compact avatar previews render inside a fixed circular frame', async () => {
  const [editor, workspace] = await Promise.all([
    read('src/lib/ProfileExpressionEditor.svelte'),
    read('src/lib/ProfileMediaWorkspace.svelte')
  ]);

  assert.match(editor, /profile-expression-editor__compact-avatar-frame/);
  assert.match(editor, /\.profile-expression-editor__compact-avatar-frame \{[\s\S]*width: 5\.5rem;[\s\S]*height: 5\.5rem;[\s\S]*border-radius: 50%;/);
  assert.match(editor, /compact-avatar-frame \.foundation-media[\s\S]*width: 100% !important;[\s\S]*height: 100% !important;[\s\S]*border-radius: 50% !important/);
  assert.match(editor, /compact-avatar-frame \.foundation-media img[\s\S]*object-fit: cover/);
  assert.doesNotMatch(editor, /compact-preview--avatar \.foundation-media[\s\S]*4\.6rem/);
  assert.doesNotMatch(workspace, /compact-preview--avatar \.foundation-media[\s\S]*max-width/);
});

test('appearance picker keeps its palette inside the visible panel', async () => {
  const editor = await read('src/lib/ProfileAppearanceEditor.svelte');

  assert.match(editor, /\.appearance-editor__picker \{ box-sizing: border-box; height: auto; min-height: 14rem; overflow: visible;/);
});

test('cursor uploads refresh the owner library before choosing the staging boundary', async () => {
  const [editor, recovery] = await Promise.all([
    read('src/lib/ProfileRichMediaEditor.svelte'),
    read('supabase/migrations/20260810130000_cursor_upload_recovery.sql')
  ]);

  assert.match(editor, /await clearExpiredStagedAssets\(\);[\s\S]*await loadAssets\(\);[\s\S]*replacementAssetId\(kind\)/);
  assert.match(editor, /cleanup_my_profile_staged_media/);
  assert.match(editor, /return \(kind === 'cursor' \? cursorAssets : pointerCursorAssets\)\[0\]\?\.id \|\| null/);
  assert.match(recovery, /CREATE OR REPLACE FUNCTION public\.cleanup_my_profile_staged_media\(\)/);
  assert.match(recovery, /status = 'staged'[\s\S]*cleanup_at IS NOT NULL[\s\S]*cleanup_at < now\(\)/);
  assert.match(recovery, /v_selected_path IS NOT NULL AND v_selected_path IS DISTINCT FROM v_old\.storage_path/);
});

test('media second-row controls stay compact and keep treatment copy concise', async () => {
  const [workspace, treatment] = await Promise.all([
    read('src/lib/ProfileMediaWorkspace.svelte'),
    read('src/lib/ProfileBackgroundTreatment.svelte')
  ]);

  assert.match(workspace, /rich-media-editor__compact-card--cursor[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.match(workspace, /rich-media-editor__compact-card--cursor \.rich-media-editor__compact-preview[\s\S]*min-height: 4rem;[\s\S]*height: 4rem/);
  assert.match(workspace, /rich-media-editor__compact-card--cursor\.rich-media-editor__compact-card--locked[\s\S]*height: auto;[\s\S]*min-height: 4\.75rem/);
  assert.match(workspace, /profile-background-treatment[\s\S]*grid-row: 2;[\s\S]*align-self: start/);
  assert.match(treatment, /<h3 id="profile-background-treatment-title">Background options<\/h3>/);
  assert.doesNotMatch(treatment, /Shape the uploaded atmosphere|MEDIA \/ 02/);
});
