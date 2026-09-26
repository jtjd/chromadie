import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearLegacyProfileExpressionAudio,
  deleteProfileExpressionAsset,
  uploadAndSelectProfileAudioAsset,
  uploadAndSelectProfileImageAsset,
  loadProfileExpressionAssetLibrary,
  saveProfileExpression,
  selectProfileExpressionAsset,
  uploadProfileAudioAsset,
  uploadProfileImageAsset
} from '../src/lib/profile-studio/expressionMediaActions.js';

test('profile media deletions use the starting authorization and discard stale completions', async () => {
  const authorization = { userId: 'account-a', accessToken: 'account-a-token' };
  for (const [name, action, id, overrideKey, expectedCall] of [
    ['R2 library deletion', deleteProfileExpressionAsset, 'asset-a', 'deleteAsset', ['asset-a', authorization]],
    ['legacy staff-audio removal', clearLegacyProfileExpressionAudio, 'profile_audio/account-a/profile.mp3', 'deleteLegacyAudio', ['profile_audio/account-a/profile.mp3', authorization]]
  ]) {
    let current = true;
    let finishRequest;
    const calls = [];
    const request = action(id, { authorization, isCurrent: () => current }, {
      [overrideKey]: (...args) => {
        calls.push(args);
        return new Promise(resolve => { finishRequest = resolve; });
      }
    });

    await Promise.resolve();
    assert.deepEqual(calls, [expectedCall], `${name} should use the captured account token`);
    current = false;
    finishRequest({ success: true });
    await assert.rejects(request, /active account changed/, `${name} should ignore a stale result`);
  }
});

test('profile media deletion actions stop before dispatch when their account is already stale', async () => {
  const calls = [];
  for (const action of [deleteProfileExpressionAsset, clearLegacyProfileExpressionAudio]) {
    await assert.rejects(action('asset-a', {
      authorization: { userId: 'account-a', accessToken: 'account-a-token' },
      isCurrent: () => false
    }, {
      deleteAsset: async (...args) => calls.push(['asset', ...args]),
      deleteLegacyAudio: async (...args) => calls.push(['audio', ...args])
    }), /active account changed/);
  }
  assert.deepEqual(calls, []);
});

test('expression media library query stays owner-scoped and ordered by recency', async () => {
  const calls = [];
  const rows = [{ id: 'asset-1', kind: 'avatar' }];
  const builder = {
    select(columns) { calls.push(['select', columns]); return this; },
    eq(field, value) { calls.push(['eq', field, value]); return this; },
    order(field, options) {
      calls.push(['order', field, options]);
      return Promise.resolve({ data: rows, error: null });
    }
  };
  const client = { from: table => { calls.push(['from', table]); return builder; } };

  assert.deepEqual(await loadProfileExpressionAssetLibrary(client, 'owner-1'), rows);
  assert.deepEqual(calls, [
    ['from', 'profile_media_assets'],
    ['select', 'id, kind, storage_path, storage_provider, r2_public_key, content_validation_version, content_hash_sha256, label, created_at, status, delivery_status, ever_public'],
    ['eq', 'user_id', 'owner-1'],
    ['eq', 'status', 'active'],
    ['order', 'created_at', { ascending: false }]
  ]);
  assert.deepEqual(await loadProfileExpressionAssetLibrary(client, null), []);
  assert.equal(calls.length, 5);

  const failedClient = {
    from: () => ({
      select() { return this; },
      eq() { return this; },
      order: async () => ({ data: null, error: { message: 'Library unavailable' } })
    })
  };
  await assert.rejects(loadProfileExpressionAssetLibrary(failedClient, 'owner-1'), /Library unavailable/);
});

test('expression selection actions preserve the existing avatar, background, and audio RPC contracts', async () => {
  const calls = [];
  const client = {
    rpc: async (name, args) => { calls.push([name, args]); return { data: { success: true }, error: null }; }
  };

  await selectProfileExpressionAsset(client, 'avatar', 'avatar-2', {
    avatarAssetId: 'avatar-1', backgroundAssetId: 'background-1'
  });
  await selectProfileExpressionAsset(client, 'background', null, {
    clear: true, avatarAssetId: 'avatar-2', backgroundAssetId: 'background-1'
  });
  await selectProfileExpressionAsset(client, 'audio', 'audio-1');

  assert.deepEqual(calls, [
    ['select_my_profile_expression_assets', {
      p_avatar_id: 'avatar-2', p_background_id: null, p_clear_avatar: false, p_clear_background: false
    }],
    ['select_my_profile_expression_assets', {
      p_avatar_id: null, p_background_id: null, p_clear_avatar: false, p_clear_background: true
    }],
    ['select_my_profile_audio_asset', { p_audio_id: 'audio-1', p_clear_audio: false }]
  ]);
});

test('expression selection action reports server and RPC failures without masking their messages', async () => {
  await assert.rejects(
    selectProfileExpressionAsset({ rpc: async () => ({ data: { success: false, error: 'Owner check failed' } }) }, 'avatar', 'asset-1'),
    /Owner check failed/
  );
  await assert.rejects(
    selectProfileExpressionAsset({ rpc: async () => ({ error: { message: 'RPC unavailable' } }) }, 'audio', 'asset-1'),
    /RPC unavailable/
  );
  await assert.rejects(
    selectProfileExpressionAsset({ rpc: async () => ({ data: { success: true } }) }, 'video', 'asset-1'),
    /Unsupported profile expression asset kind/
  );
});

test('expression write action sends only normalized profile fields through its existing RPC', async () => {
  let call;
  const saved = { success: true, updated_at: 'now' };
  const client = { rpc: async (name, args) => { call = [name, args]; return { data: saved, error: null }; } };

  assert.equal(await saveProfileExpression(client, {
    avatar_path: 'avatars/owner/avatar.webp',
    background_path: null,
    spotify_type: 'track',
    spotify_id: 'private-extra-is-not-sent'
  }, 'https://open.spotify.com/track/123'), saved);
  assert.deepEqual(call, ['update_my_profile_expression', {
    p_avatar_path: 'avatars/owner/avatar.webp',
    p_background_path: null,
    p_spotify_url: 'https://open.spotify.com/track/123'
  }]);
  await assert.rejects(
    saveProfileExpression({ rpc: async () => ({ data: { success: false, error: 'Save denied' } }) }, {}, ''),
    /Save denied/
  );
});

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

test('media processing stops before obtaining upload credentials after an account switch', async () => {
  let resolveProcessing;
  let active = true;
  const calls = [];
  const request = uploadProfileImageAsset({
    file: { name: 'avatar.png' },
    kind: 'avatar',
    authorization: { userId: 'account-a', accessToken: 'account-a-token' },
    isCurrent: () => active
  }, {
    processImage: () => new Promise(resolve => { resolveProcessing = resolve; }),
    upload: async options => { calls.push(['upload', options]); return { asset_id: 'asset-1' }; },
    promote: async () => { calls.push(['promote']); return { r2_public_key: 'key' }; },
    deleteAsset: async () => { calls.push(['delete']); }
  });
  await Promise.resolve();
  active = false;
  resolveProcessing({ size: 64 });
  await assert.rejects(request, /active account changed/);
  assert.deepEqual(calls, []);
});

test('media upload and promotion retain the originating authorization snapshot', async () => {
  const authorization = { userId: 'account-a', accessToken: 'account-a-token' };
  const calls = [];
  await uploadProfileImageAsset({
    file: { name: 'avatar.png' },
    kind: 'avatar',
    authorization
  }, {
    processImage: async () => ({ size: 64 }),
    upload: async options => { calls.push(['upload', options.authorization]); return { asset_id: 'asset-1' }; },
    promote: async (_assetId, auth) => { calls.push(['promote', auth]); return { r2_public_key: 'key' }; },
    getMediaUrl: () => 'https://media.example/key',
    deleteAsset: async () => {}
  });
  assert.deepEqual(calls, [['upload', authorization], ['promote', authorization]]);
});

test('profile image lifecycle selects the promoted asset before returning it', async () => {
  const events = [];
  const blob = { size: 512 };
  const result = await uploadAndSelectProfileImageAsset({
    file: { name: 'background.png' },
    kind: 'background',
    onPrepared: value => events.push(['preview', value]),
    selectUploadedAsset: async uploaded => events.push(['select', uploaded.assetId, uploaded.publicKey])
  }, {
    processImage: async () => blob,
    upload: async () => ({ asset_id: 'background-1' }),
    promote: async () => ({ r2_public_key: 'profiles/background.webp' }),
    getMediaUrl: value => `https://media.test/${value.r2_public_key}`,
    deleteAsset: async () => assert.fail('successful selection must retain the library asset')
  });

  assert.equal(result.assetId, 'background-1');
  assert.equal(result.publicUrl, 'https://media.test/profiles/background.webp');
  assert.deepEqual(events, [
    ['preview', blob],
    ['select', 'background-1', 'profiles/background.webp']
  ]);
});

test('profile image lifecycle deletes the promoted asset when server selection fails', async () => {
  const deleted = [];
  await assert.rejects(uploadAndSelectProfileImageAsset({
    file: { name: 'avatar.png' },
    kind: 'avatar',
    selectUploadedAsset: async () => { throw Object.assign(new Error('Selection failed'), { selectionRejected: true }); }
  }, {
    processImage: async () => ({ size: 256 }),
    upload: async () => ({ asset_id: 'avatar-staged' }),
    promote: async () => ({ r2_public_key: 'profiles/avatar.webp' }),
    getMediaUrl: value => `https://media.test/${value.r2_public_key}`,
    deleteAsset: async assetId => { deleted.push(assetId); }
  }), /Selection failed/);
  assert.deepEqual(deleted, ['avatar-staged']);
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

test('profile audio lifecycle validates, prepares, uploads, promotes, then selects the asset', async () => {
  const events = [];
  const blob = { size: 512 };
  const result = await uploadAndSelectProfileAudioAsset({
    file: { name: 'track.mp3' },
    onPrepared: value => events.push(['preview', value]),
    selectUploadedAsset: async uploaded => events.push(['select', uploaded.assetId, uploaded.publicKey])
  }, {
    validateAudio: file => { events.push(['validate', file.name]); return ''; },
    prepareAudio: async () => { events.push(['prepare']); return blob; },
    upload: async request => {
      events.push(['upload', request.kind, request.mimeType]);
      return { asset_id: 'audio-2' };
    },
    promote: async () => { events.push(['promote']); return { r2_public_key: 'profiles/audio.mp3' }; },
    getMediaUrl: value => `https://media.test/${value.r2_public_key}`,
    deleteAsset: async () => assert.fail('successful selection must retain the library asset')
  });

  assert.equal(result.assetId, 'audio-2');
  assert.equal(result.publicUrl, 'https://media.test/profiles/audio.mp3');
  assert.deepEqual(events, [
    ['validate', 'track.mp3'],
    ['prepare'],
    ['preview', blob],
    ['upload', 'audio', 'audio/mpeg'],
    ['promote'],
    ['select', 'audio-2', 'profiles/audio.mp3']
  ]);
});

test('profile audio lifecycle deletes a promoted asset when selection fails and preserves the selection error', async () => {
  const deleted = [];
  await assert.rejects(uploadAndSelectProfileAudioAsset({
    file: { name: 'track.mp3' },
    selectUploadedAsset: async () => { throw new Error('Audio selection failed'); }
  }, {
    validateAudio: () => '',
    prepareAudio: async () => ({ size: 256 }),
    upload: async () => ({ asset_id: 'audio-staged' }),
    promote: async () => ({ r2_public_key: 'profiles/audio.mp3' }),
    getMediaUrl: value => `https://media.test/${value.r2_public_key}`,
    deleteAsset: async assetId => {
      deleted.push(assetId);
      throw new Error('Cleanup failed');
    }
  }), /Audio selection failed/);
  assert.deepEqual(deleted, ['audio-staged']);
});

test('profile audio validation failure does not prepare, select, or delete', async () => {
  await assert.rejects(uploadAndSelectProfileAudioAsset({
    file: { name: 'unsafe.ogg' },
    selectUploadedAsset: async () => assert.fail('invalid audio must not be selected')
  }, {
    validateAudio: () => 'MP3 files only.',
    prepareAudio: async () => assert.fail('invalid audio must not be prepared'),
    upload: async () => assert.fail('invalid audio must not be uploaded'),
    deleteAsset: async () => assert.fail('invalid audio has no staged asset')
  }), /MP3 files only/);
});


test('committed replacement cleans only server-retired IDs and survives cleanup failure', async () => {
  const calls = [];
  const authorization = { userId: 'owner' };
  const client = { rpc: async () => ({ data: { success: true, avatar_asset_id: 'new', retired_asset_ids: ['old', 'older'] } }) };
  const result = await selectProfileExpressionAsset(client, 'avatar', 'new', { authorization }, {
    deleteAsset: async (id, auth) => {
      calls.push([id, auth]);
      if (id === 'old') throw new Error('Offline; worker will retry');
      return { success: true };
    }
  });
  assert.equal(result.avatar_asset_id, 'new');
  assert.equal(result.cleanup_pending, true);
  assert.deepEqual(calls, [['old', authorization], ['older', authorization]]);
});

test('failed selection never starts retiring files', async () => {
  const calls = [];
  await assert.rejects(selectProfileExpressionAsset({rpc: async () => ({data: {success: false, error: 'Selection rejected', retired_asset_ids: ['old']}})}, 'avatar', 'new', {}, {
    deleteAsset: async id => calls.push(id)
  }), /Selection rejected/);
  assert.deepEqual(calls, []);
});


test('an uncertain image-selection response never deletes the potentially equipped replacement', async () => {
  const deleted = [];
  await assert.rejects(uploadAndSelectProfileImageAsset({
    file: { name: 'avatar.png' }, kind: 'avatar',
    selectUploadedAsset: async () => { throw new Error('Connection lost after commit'); }
  }, {
    processImage: async () => ({ size: 256 }),
    upload: async () => ({ asset_id: 'new-avatar' }),
    promote: async () => ({ r2_public_key: 'profiles/new-avatar.webp' }),
    getMediaUrl: () => 'https://media.test/avatar.webp',
    deleteAsset: async id => deleted.push(id)
  }), /Connection lost/);
  assert.deepEqual(deleted, []);
});
