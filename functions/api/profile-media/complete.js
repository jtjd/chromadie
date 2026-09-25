import {
  callSupabaseRpc,
  controlPlaneError,
  copyR2Object,
  getR2Config,
  getSupabaseAsset,
  jsonResponse,
  optionsResponse,
  parseJsonRequest,
  publicMediaAssetPayload,
  purgePublicMediaKey,
  requireUser,
  verifyStoredProfileMediaObject
} from '../../_profileMediaControl.js';

export function onRequestOptions({ request }) {
  return optionsResponse(request);
}

async function markVerificationFailed(env, userId, assetId, message) {
  await callSupabaseRpc(env, 'fail_my_profile_media_upload', {
    p_user_id: userId,
    p_asset_id: assetId,
    p_error: message
  }, { service: true }).catch(() => {});
}

export async function onRequestPost({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return auth.error;
  const body = await parseJsonRequest(request);
  const assetId = String(body?.asset_id || '').trim();
  const suppliedHash = String(body?.content_hash_sha256 || '').trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(assetId) || !/^[0-9a-f]{64}$/.test(suppliedHash)) {
    return jsonResponse({ success: false, error: 'The media verification request is invalid.' }, 400, request);
  }

  try {
    const r2Config = getR2Config(env);
    if (!r2Config) return jsonResponse({ success: false, error: 'R2 media verification is not configured.' }, 503, request);
    const asset = await getSupabaseAsset(env, auth.user.id, assetId);
    if (!asset || asset.storage_provider !== 'r2') {
      return jsonResponse({ success: false, error: 'The pending R2 upload was not found.' }, 404, request);
    }
    if (String(asset.content_hash_sha256 || '').toLowerCase() !== suppliedHash) {
      if (asset.delivery_status !== 'ready') {
        await markVerificationFailed(env, auth.user.id, asset.id, 'The uploaded media hash does not match the authorization.');
      }
      return jsonResponse({ success: false, error: 'The uploaded media hash does not match the authorization.' }, 422, request);
    }

    // Rows created before content policy v1 are re-read and revalidated from
    // R2 before their public references can be restored. A ready bit alone is
    // not evidence that the original object passed current bounds checks.
    if (asset.delivery_status === 'ready') {
      if (asset.status !== 'active') return jsonResponse({ success: false, error: 'The media asset is not active.' }, 422, request);
      if (Number(asset.content_validation_version) === 1) {
        return jsonResponse({ success: true, asset: publicMediaAssetPayload(asset), already_ready: true }, 200, request);
      }
      const publicObject = asset.ever_public === true && Boolean(asset.r2_public_key);
      const objectKey = publicObject ? asset.r2_public_key : asset.r2_private_key;
      if (!objectKey) return jsonResponse({ success: false, error: 'The media asset needs to be uploaded again.' }, 422, request);
      let verified = await verifyStoredProfileMediaObject(env, {
        bucket: publicObject ? r2Config.publicBucket : r2Config.privateBucket,
        key: objectKey,
        asset
      });
      if (!verified.success && publicObject && asset.r2_private_key) {
        const verifiedPrivate = await verifyStoredProfileMediaObject(env, {
          bucket: r2Config.privateBucket,
          key: asset.r2_private_key,
          asset
        });
        if (verifiedPrivate.success) {
          const copied = await copyR2Object(env, {
            sourceBucket: r2Config.privateBucket,
            sourceKey: asset.r2_private_key,
            destinationBucket: r2Config.publicBucket,
            destinationKey: asset.r2_public_key,
            contentType: asset.mime_type,
            metadataHash: verifiedPrivate.contentHash
          });
          if (!copied.ok) return jsonResponse({ success: false, error: 'The saved media could not be restored for profile use.' }, 502, request);
          verified = await verifyStoredProfileMediaObject(env, {
            bucket: r2Config.publicBucket,
            key: asset.r2_public_key,
            asset
          });
          if (verified.success) await purgePublicMediaKey(env, asset.r2_public_key);
        }
      }
      if (!verified.success) {
        return jsonResponse({ success: false, error: 'This saved media file needs to be uploaded again before it can be used.' }, 422, request);
      }
      const marked = await callSupabaseRpc(env, 'mark_my_profile_media_content_validated', {
        p_user_id: auth.user.id,
        p_asset_id: asset.id,
        p_content_hash_sha256: verified.contentHash,
        p_validation_policy_version: 1
      }, { service: true });
      if (!marked?.success) return jsonResponse({ success: false, error: marked?.error || 'The media asset could not be revalidated.' }, 422, request);
      return jsonResponse({
        success: true,
        asset: publicMediaAssetPayload({ ...asset, content_validation_version: 1 }),
        already_ready: true
      }, 200, request);
    }

    if (!asset.r2_private_key) {
      return jsonResponse({ success: false, error: 'The pending R2 upload was not found.' }, 404, request);
    }
    if (asset.status !== 'staged' || (asset.upload_expires_at && new Date(asset.upload_expires_at).getTime() <= Date.now())) {
      await markVerificationFailed(env, auth.user.id, asset.id, 'The upload authorization has expired.');
      return jsonResponse({ success: false, error: 'The upload authorization has expired.' }, 422, request);
    }

    const verified = await verifyStoredProfileMediaObject(env, {
      bucket: r2Config.privateBucket,
      key: asset.r2_private_key,
      asset
    });
    if (!verified.success || verified.contentHash !== suppliedHash) {
      await markVerificationFailed(env, auth.user.id, asset.id, 'The uploaded object did not pass content verification.');
      return jsonResponse({ success: false, error: 'The uploaded object did not pass media verification.' }, 422, request);
    }

    const completed = await callSupabaseRpc(env, 'complete_my_profile_media_upload', {
      p_user_id: auth.user.id,
      p_asset_id: asset.id,
      p_byte_size: verified.byteSize,
      p_mime_type: verified.mimeType,
      p_content_hash_sha256: verified.contentHash
    }, { service: true });
    if (!completed?.success) return jsonResponse({ success: false, error: completed?.error || 'The media upload could not be completed.' }, 422, request);
    return jsonResponse({ success: true, asset: publicMediaAssetPayload({ ...asset, ...completed }) }, 200, request);
  } catch (error) {
    return controlPlaneError(error, request);
  }
}
