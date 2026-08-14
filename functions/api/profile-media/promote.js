import {
  callSupabaseRpc,
  controlPlaneError,
  copyR2Object,
  getPublicMediaUrl,
  getR2Config,
  getSupabaseAsset,
  jsonResponse,
  optionsResponse,
  parseJsonRequest,
  requestR2Object,
  requireUser
} from '../../_profileMediaControl.js';

export function onRequestOptions({ request }) {
  return optionsResponse(request);
}

function publicObjectMatches(head, asset) {
  if (!head?.ok) return false;
  const expectedSize = Number(asset.byte_size);
  const actualSize = Number(head.headers.get('content-length'));
  const expectedMime = String(asset.mime_type || '').toLowerCase();
  const actualMime = String(head.headers.get('content-type') || '').toLowerCase().split(';')[0].trim();
  const actualHash = String(head.headers.get('x-amz-meta-sha256') || '').toLowerCase().trim();
  if (!Number.isSafeInteger(actualSize) || actualSize !== expectedSize) return false;
  if (actualMime && expectedMime && actualMime !== expectedMime) return false;
  if (actualHash && asset.content_hash_sha256 && actualHash !== String(asset.content_hash_sha256).toLowerCase()) return false;
  return true;
}

export async function onRequestPost({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return auth.error;
  const body = await parseJsonRequest(request);
  const assetId = String(body?.asset_id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(assetId)) return jsonResponse({ success: false, error: 'The media asset is invalid.' }, 400, request);

  try {
    const config = getR2Config(env);
    if (!config) return jsonResponse({ success: false, error: 'R2 media delivery is not configured.' }, 503, request);
    const asset = await getSupabaseAsset(env, auth.user.id, assetId);
    if (!asset || asset.storage_provider !== 'r2' || asset.status !== 'active' || asset.delivery_status !== 'ready') {
      return jsonResponse({ success: false, error: 'Only verified R2 assets can be published.' }, 422, request);
    }
    const publicKey = asset.r2_public_key || asset.r2_private_key;
    if (!publicKey) return jsonResponse({ success: false, error: 'The R2 asset keys are incomplete.' }, 422, request);

    let publicHead = await requestR2Object(env, { method: 'HEAD', bucket: config.publicBucket, key: publicKey });
    if (!publicHead.ok) {
      // A previously published asset may have already discarded its private
      // source key. It cannot be re-created if the immutable public object is
      // missing, so fail loudly instead of attempting an invalid copy.
      if (!asset.r2_private_key) {
        return jsonResponse({ success: false, error: 'The published R2 object could not be found.' }, 502, request);
      }
      const copyResponse = await copyR2Object(env, {
        sourceBucket: config.privateBucket,
        sourceKey: asset.r2_private_key,
        destinationBucket: config.publicBucket,
        destinationKey: publicKey,
        contentType: asset.mime_type,
        metadataHash: asset.content_hash_sha256
      });
      if (!copyResponse.ok) return jsonResponse({ success: false, error: 'The media asset could not be promoted to public delivery.' }, 502, request);
      publicHead = await requestR2Object(env, { method: 'HEAD', bucket: config.publicBucket, key: publicKey });
    }
    if (!publicObjectMatches(publicHead, asset)) {
      return jsonResponse({ success: false, error: 'The public R2 object did not match the verified source.' }, 502, request);
    }

    const marked = await callSupabaseRpc(env, 'mark_my_profile_media_public', {
      p_user_id: auth.user.id,
      p_asset_id: asset.id
    }, { service: true });
    if (!marked?.success) return jsonResponse({ success: false, error: marked?.error || 'The public media state could not be recorded.' }, 502, request);

    let privateCleanupPending = false;
    if (asset.r2_private_key) {
      const privateDelete = await requestR2Object(env, { method: 'DELETE', bucket: config.privateBucket, key: asset.r2_private_key });
      const privateDeleteSucceeded = privateDelete.ok || privateDelete.status === 404;
      if (privateDeleteSucceeded) {
        const finalized = await callSupabaseRpc(env, 'complete_profile_media_private_cleanup', {
          p_asset_id: asset.id,
          p_success: true
        }, { service: true }).catch(() => null);
        privateCleanupPending = finalized?.completed !== true;
      } else {
        privateCleanupPending = true;
        await callSupabaseRpc(env, 'mark_profile_media_private_cleanup_pending', {
          p_user_id: auth.user.id,
          p_asset_id: asset.id,
          p_error: `Private R2 cleanup returned ${privateDelete.status}.`
        }, { service: true }).catch(() => {});
      }
    }

    const recordedPublicKey = marked.r2_public_key || publicKey;

    return jsonResponse({
      success: true,
      asset_id: asset.id,
      storage_provider: 'r2',
      r2_public_key: recordedPublicKey,
      public_url: getPublicMediaUrl(env, recordedPublicKey),
      ever_public: true,
      private_cleanup_pending: privateCleanupPending
    }, 200, request);
  } catch (error) {
    return controlPlaneError(error, request);
  }
}
