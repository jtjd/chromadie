import { getProfileMediaUrl } from '../profileMedia.js';
import { deleteProfileMediaAsset, promoteProfileMediaR2, uploadProfileMediaToR2 } from '../profileMediaR2.js';
import { prepareProfileAudioFile, processProfileImage, validateProfileAudioFile } from '../profileMediaProcessing.js';

function resolveServices(overrides = {}) {
  return {
    deleteAsset: deleteProfileMediaAsset,
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

async function cleanFailedAsset(assetId, services) {
  if (!assetId) return;
  await services.deleteAsset(assetId).catch(() => {});
}

export async function uploadProfileImageAsset({ file, kind, onPrepared = value => value }, overrides) {
  const services = resolveServices(overrides);
  let assetId = '';
  try {
    const blob = await services.processImage(file, kind);
    onPrepared(blob);
    const uploaded = await services.upload({ kind, blob, extension: 'webp', mimeType: 'image/webp', label: file.name });
    assetId = requireAssetId(uploaded, kind);
    const promoted = await services.promote(assetId);
    return {
      assetId,
      blob,
      publicKey: promoted.r2_public_key,
      publicUrl: services.getMediaUrl({ r2_public_key: promoted.r2_public_key })
    };
  } catch (error) {
    await cleanFailedAsset(assetId, services);
    throw error;
  }
}

export async function uploadProfileAudioAsset({ file, onPrepared = value => value }, overrides) {
  const services = resolveServices(overrides);
  const validationError = services.validateAudio(file);
  if (validationError) throw new Error(validationError);
  let assetId = '';
  try {
    const blob = await services.prepareAudio(file);
    onPrepared(blob);
    const uploaded = await services.upload({ kind: 'audio', blob, extension: 'mp3', mimeType: 'audio/mpeg', label: file.name });
    assetId = requireAssetId(uploaded, 'audio');
    const promoted = await services.promote(assetId);
    return {
      assetId,
      blob,
      publicKey: promoted.r2_public_key,
      publicUrl: services.getMediaUrl({ r2_public_key: promoted.r2_public_key })
    };
  } catch (error) {
    await cleanFailedAsset(assetId, services);
    throw error;
  }
}
