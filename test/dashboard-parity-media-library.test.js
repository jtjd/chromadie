import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildProfileStoragePath,
  getProfileStorageRef,
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
  assert.match(editor, /Saved avatars/);
  assert.match(editor, /Saved backgrounds/);
});

test('compact avatar previews render inside a fixed circular frame', async () => {
  const editor = await read('src/lib/ProfileExpressionEditor.svelte');

  assert.match(editor, /profile-expression-editor__compact-avatar-frame/);
  assert.match(editor, /\.profile-expression-editor__compact-avatar-frame \{[\s\S]*width: 4\.6rem;[\s\S]*height: 4\.6rem;[\s\S]*border-radius: 50%;/);
  assert.match(editor, /compact-avatar-frame \.foundation-media[\s\S]*width: 100% !important;[\s\S]*height: 100% !important;[\s\S]*border-radius: 50% !important/);
  assert.match(editor, /compact-avatar-frame \.foundation-media img[\s\S]*object-fit: cover/);
});

test('appearance picker keeps its palette inside the visible panel', async () => {
  const editor = await read('src/lib/ProfileAppearanceEditor.svelte');

  assert.match(editor, /\.appearance-editor__picker \{ box-sizing: border-box; height: auto; min-height: 14rem; overflow: visible;/);
});
