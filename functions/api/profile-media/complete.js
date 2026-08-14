import {
  callSupabaseRpc,
  controlPlaneError,
  getR2Config,
  getSupabaseAsset,
  jsonResponse,
  optionsResponse,
  parseJsonRequest,
  publicMediaAssetPayload,
  requestR2Object,
  requireUser,
  sha256Hex,
  validateProfileMediaSignature
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
    // Completion is intentionally idempotent. Promotion removes the private
    // source key after the public object is verified, so a browser retry must
    // still succeed against the already-ready metadata row.
    if (asset.delivery_status === 'ready') {
      return jsonResponse({ success: true, asset: publicMediaAssetPayload(asset), already_ready: true }, 200, request);
    }
    if (!asset.r2_private_key) {
      return jsonResponse({ success: false, error: 'The pending R2 upload was not found.' }, 404, request);
    }
    if (asset.content_hash_sha256 !== suppliedHash) {
      await markVerificationFailed(env, auth.user.id, asset.id, 'The uploaded media hash does not match the authorization.');
      return jsonResponse({ success: false, error: 'The uploaded media hash does not match the authorization.' }, 422, request);
    }
    if (asset.delivery_status === 'ready') return jsonResponse({ success: true, asset: publicMediaAssetPayload(asset) }, 200, request);
    if (asset.status !== 'staged' || (asset.upload_expires_at && new Date(asset.upload_expires_at).getTime() <= Date.now())) {
      await markVerificationFailed(env, auth.user.id, asset.id, 'The upload authorization has expired.');
      return jsonResponse({ success: false, error: 'The upload authorization has expired.' }, 422, request);
    }

    const head = await requestR2Object(env, {
      method: 'HEAD',
      bucket: r2Config.privateBucket,
      key: asset.r2_private_key
    });
    if (!head.ok) {
      await markVerificationFailed(env, auth.user.id, asset.id, 'The uploaded R2 object could not be verified.');
      return jsonResponse({ success: false, error: 'The uploaded R2 object could not be verified.' }, 422, request);
    }
    const actualSize = Number(head.headers.get('content-length'));
    const actualMime = String(head.headers.get('content-type') || '').toLowerCase().split(';')[0].trim();
    if (!Number.isSafeInteger(actualSize) || actualSize !== Number(asset.byte_size)
      || actualMime !== String(asset.mime_type || '').toLowerCase()) {
      await markVerificationFailed(env, auth.user.id, asset.id, 'The uploaded object metadata did not match the authorized media.');
      return jsonResponse({ success: false, error: 'The uploaded object metadata did not match the authorized media.' }, 422, request);
    }

    // The signed metadata header binds the intended hash, but it is still
    // supplied by the uploader. Read the bounded private object once in the
    // control plane and hash the actual bytes before the asset can become
    // selectable. Public delivery is never proxied through this path.
    const objectResponse = await requestR2Object(env, {
      method: 'GET',
      bucket: r2Config.privateBucket,
      key: asset.r2_private_key
    });
    if (!objectResponse.ok) {
      await markVerificationFailed(env, auth.user.id, asset.id, 'The uploaded R2 object could not be read for verification.');
      return jsonResponse({ success: false, error: 'The uploaded R2 object could not be read for verification.' }, 422, request);
    }
    const objectBytes = new Uint8Array(await objectResponse.arrayBuffer());
    const actualHash = await sha256Hex(objectBytes);
    if (objectBytes.byteLength !== actualSize || actualHash !== suppliedHash) {
      await markVerificationFailed(env, auth.user.id, asset.id, 'The uploaded object content did not match the authorized media.');
      return jsonResponse({ success: false, error: 'The uploaded object content did not match the authorized media.' }, 422, request);
    }
    const extension = String(asset.r2_private_key || '').match(/\.([a-z0-9]+)$/i)?.[1] || '';
    if (!validateProfileMediaSignature({
      bytes: objectBytes,
      kind: asset.kind,
      extension,
      mimeType: actualMime
    })) {
      await markVerificationFailed(env, auth.user.id, asset.id, 'The uploaded object signature did not match its declared media type.');
      return jsonResponse({ success: false, error: 'The uploaded object is not a valid file for this media type.' }, 422, request);
    }

    const completed = await callSupabaseRpc(env, 'complete_my_profile_media_upload', {
      p_user_id: auth.user.id,
      p_asset_id: asset.id,
      p_byte_size: actualSize,
      p_mime_type: actualMime,
      p_content_hash_sha256: actualHash
    }, { service: true });
    if (!completed?.success) return jsonResponse({ success: false, error: completed?.error || 'The media upload could not be completed.' }, 422, request);
    return jsonResponse({ success: true, asset: publicMediaAssetPayload({ ...asset, ...completed }) }, 200, request);
  } catch (error) {
    return controlPlaneError(error, request);
  }
}
