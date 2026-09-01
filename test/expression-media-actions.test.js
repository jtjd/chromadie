import test from 'node:test';
import assert from 'node:assert/strict';
import { uploadProfileAudioAsset, uploadProfileImageAsset } from '../src/lib/profile-studio/expressionMediaActions.js';

test('profile image action processes, uploads, promotes, and resolves one R2 asset', async () => {
  const calls = [];
  const blob = { size: 128 };
  const result = await uploadProfileImageAsset({ file: { name: 'avatar.png' }, kind: 'avatar' }, {
    processImage: async () => blob,
    upload: async request => { calls.push(request); return { asset_id: 'asset-1' }; },
    promote: async () => ({ r2_public_key: 'profiles/avatar.webp' }),
    getMediaUrl: value => `https://media.test/${value.r2_public_key}`,
    deleteAsset: async () => {}
  });
  assert.equal(calls[0].kind, 'avatar');
  assert.equal(result.assetId, 'asset-1');
  assert.equal(result.publicUrl, 'https://media.test/profiles/avatar.webp');
});
test('profile media action deletes a staged asset when promotion fails', async () => {
  const deleted = [];
  await assert.rejects(uploadProfileAudioAsset({ file: { name: 'audio.mp3' } }, {
    validateAudio: () => '',
    prepareAudio: async () => ({ size: 256 }),
    upload: async () => ({ asset_id: 'audio-1' }),
    promote: async () => { throw new Error('promotion failed'); },
    deleteAsset: async assetId => { deleted.push(assetId); }
  }), /promotion failed/);
  assert.deepEqual(deleted, ['audio-1']);
});
