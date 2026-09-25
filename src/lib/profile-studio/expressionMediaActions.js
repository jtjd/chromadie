import { getProfileMediaUrl } from '../profileMedia.js';
import {
  deleteLegacyProfileAudio,
  deleteProfileMediaAsset,
  promoteProfileMediaR2,
  uploadProfileMediaToR2
} from '../profileMediaR2.js';
import { prepareProfileAudioFile, processProfileImage, validateProfileAudioFile } from '../profileMediaProcessing.js';
import { rpcWithAccessToken } from '../rpcWithAccessToken.js';

const EXPRESSION_ASSET_LIBRARY_COLUMNS = 'id, kind, storage_path, storage_provider, r2_public_key, content_validation_version, content_hash_sha256, label, created_at, status, delivery_status, ever_public';

export async function loadProfileExpressionAssetLibrary(supabaseClient, profileId) {
  if (!profileId) return [];
  const { data, error } = await supabaseClient
    .from('profile_media_assets')
    .select(EXPRESSION_ASSET_LIBRARY_COLUMNS)
    .eq('user_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message || 'The media library could not be loaded.');
  return data || [];
}

export async function selectProfileExpressionAsset(
  supabaseClient,
  kind,
  assetId,
  { clear = false, avatarAssetId = null, backgroundAssetId = null, authorization = null } = {}
) {
  const rpc = authorization?.accessToken
    ? (name, args) => rpcWithAccessToken(supabaseClient, name, args, authorization.accessToken)
    : (name, args) => supabaseClient.rpc(name, args);
  let response;
  if (kind === 'audio') {
    response = await rpc('select_my_profile_audio_asset', {
      p_audio_id: clear ? null : assetId,
      p_clear_audio: clear
    });
  } else if (kind === 'avatar' || kind === 'background') {
    response = await rpc('select_my_profile_expression_assets', {
      p_avatar_id: kind === 'avatar' ? (clear ? null : assetId) : avatarAssetId,
      p_background_id: kind === 'background' ? (clear ? null : assetId) : backgroundAssetId,
      p_clear_avatar: kind === 'avatar' && clear,
      p_clear_background: kind === 'background' && clear
    });
  } else {
    throw new Error('Unsupported profile expression asset kind.');
  }

  const { data, error } = response || {};
  if (error || !data?.success) {
    const fallback = kind === 'audio'
      ? 'The profile audio selection could not be saved.'
      : 'The profile media selection could not be saved.';
    throw new Error(error?.message || data?.error || fallback);
  }
  return data;
}

export async function deleteProfileExpressionAsset(
  assetId,
  { authorization = null, isCurrent = () => Boolean(true) } = {},
  overrides
) {
  if (!assetId) throw new Error('The media asset is invalid.');
  assertCurrent(isCurrent);
  const services = resolveServices(overrides);
  const data = await services.deleteAsset(assetId, authorization);
  assertCurrent(isCurrent);
  if (!data?.success) throw new Error(data?.error || 'The media asset could not be removed.');
  return data;
}

export async function clearLegacyProfileExpressionAudio(
  storagePath,
  { authorization = null, isCurrent = () => Boolean(true) } = {},
  overrides
) {
  if (!storagePath) throw new Error('The legacy profile audio path is invalid.');
  assertCurrent(isCurrent);
  const services = resolveServices(overrides);
  const data = await services.deleteLegacyAudio(storagePath, authorization);
  assertCurrent(isCurrent);
  if (!data?.success) throw new Error(data?.error || 'The legacy profile audio could not be removed.');
  return data;
}

export async function saveProfileExpression(supabaseClient, expression, spotifyUrl, authorization = null, isCurrent = () => true) {
  if (!isCurrent()) throw new Error('The media action was canceled because the active account changed.');
  const response = authorization?.accessToken
    ? await rpcWithAccessToken(supabaseClient, 'update_my_profile_expression', {
      p_avatar_path: expression.avatar_path,
      p_background_path: expression.background_path,
      p_spotify_url: spotifyUrl || null
    }, authorization.accessToken)
    : await supabaseClient.rpc('update_my_profile_expression', {
    p_avatar_path: expression.avatar_path,
    p_background_path: expression.background_path,
    p_spotify_url: spotifyUrl || null
  });
  if (!isCurrent()) throw new Error('The media action was canceled because the active account changed.');
  const { data, error } = response || {};
  if (error || !data?.success) {
    throw new Error(error?.message || data?.error || 'The profile cosmetics could not be saved.');
  }
  return data;
}

function resolveServices(overrides = {}) {
  return {
    deleteAsset: deleteProfileMediaAsset,
    deleteLegacyAudio: deleteLegacyProfileAudio,
    getMediaUrl: getProfileMediaUrl,
    prepareAudio: prepareProfileAudioFile,
    processImage: processProfileImage,
    promote: promoteProfileMediaR2,
    upload: uploadProfileMediaToR2,
    validateAudio: validateProfileAudioFile,
    ...overrides
  };
}

function requireAssetId(uploaded, label) {
  const assetId = uploaded?.asset_id || uploaded?.asset?.id;
  if (!assetId) throw new Error(`The R2 ${label} upload did not return a media asset.`);
  return assetId;
}

function assertCurrent(isCurrent) {
  if (typeof isCurrent === 'function' && !isCurrent()) {
    throw new Error('The media action was canceled because the active account changed.');
  }
}

async function cleanFailedAsset(assetId, services, authorization) {
  if (!assetId) return;
  await services.deleteAsset(assetId, authorization).catch(() => {});
}

export async function uploadProfileImageAsset({ file, kind, onPrepared = value => value, authorization = null, isCurrent = () => true }, overrides) {
  const services = resolveServices(overrides);
  let assetId = '';
  try {
    const blob = await services.processImage(file, kind);
    assertCurrent(isCurrent);
    onPrepared(blob);
    const uploaded = await services.upload({ kind, blob, extension: 'webp', mimeType: 'image/webp', label: file.name, authorization });
    assetId = requireAssetId(uploaded, kind);
    assertCurrent(isCurrent);
    const promoted = await services.promote(assetId, authorization);
    assertCurrent(isCurrent);
    return {
      assetId,
      blob,
      publicKey: promoted.r2_public_key,
      publicUrl: services.getMediaUrl({ r2_public_key: promoted.r2_public_key })
    };
  } catch (error) {
    await cleanFailedAsset(assetId, services, authorization);
    throw error;
  }
}

export async function uploadAndSelectProfileImageAsset({
  file,
  kind,
  onPrepared = value => value,
  selectUploadedAsset,
  authorization = null,
  isCurrent = () => true
}, overrides) {
  if (typeof selectUploadedAsset !== 'function') {
    throw new TypeError('A profile image selection action is required.');
  }
  const services = resolveServices(overrides);
  const uploaded = await uploadProfileImageAsset({ file, kind, onPrepared, authorization, isCurrent }, services);
  try {
    assertCurrent(isCurrent);
    await selectUploadedAsset(uploaded, authorization);
    assertCurrent(isCurrent);
    return uploaded;
  } catch (error) {
    await cleanFailedAsset(uploaded.assetId, services, authorization);
    throw error;
  }
}

export async function uploadProfileAudioAsset({ file, onPrepared = value => value, authorization = null, isCurrent = () => true }, overrides) {
  const services = resolveServices(overrides);
  const validationError = services.validateAudio(file);
  if (validationError) throw new Error(validationError);
  let assetId = '';
  try {
    const blob = await services.prepareAudio(file);
    assertCurrent(isCurrent);
    onPrepared(blob);
    const uploaded = await services.upload({ kind: 'audio', blob, extension: 'mp3', mimeType: 'audio/mpeg', label: file.name, authorization });
    assetId = requireAssetId(uploaded, 'audio');
    assertCurrent(isCurrent);
    const promoted = await services.promote(assetId, authorization);
    assertCurrent(isCurrent);
    return {
      assetId,
      blob,
      publicKey: promoted.r2_public_key,
      publicUrl: services.getMediaUrl({ r2_public_key: promoted.r2_public_key })
    };
  } catch (error) {
    await cleanFailedAsset(assetId, services, authorization);
    throw error;
  }
}

export async function uploadAndSelectProfileAudioAsset({
  file,
  onPrepared = value => value,
  selectUploadedAsset,
  authorization = null,
  isCurrent = () => true
}, overrides) {
  if (typeof selectUploadedAsset !== 'function') {
    throw new TypeError('A profile audio selection action is required.');
  }
  const services = resolveServices(overrides);
  const uploaded = await uploadProfileAudioAsset({ file, onPrepared, authorization, isCurrent }, services);
  try {
    assertCurrent(isCurrent);
    await selectUploadedAsset(uploaded, authorization);
    assertCurrent(isCurrent);
    return uploaded;
  } catch (error) {
    await cleanFailedAsset(uploaded.assetId, services, authorization);
    throw error;
  }
}
