import {
  callSupabaseRpc,
  controlPlaneError,
  getR2Config,
  getSupabaseAsset,
  jsonResponse,
  optionsResponse,
  parseJsonRequest,
  purgePublicMediaKey,
  publicMediaAssetPayload,
  requestR2Object,
  requireUser
} from '../../_profileMediaControl.js';

export function onRequestOptions({ request }) {
  return optionsResponse(request);
}

export async function onRequestPost({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return auth.error;
  const body = await parseJsonRequest(request);
  const assetId = String(body?.asset_id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(assetId)) return jsonResponse({ success: false, error: 'The media asset is invalid.' }, 400, request);

  try {
    const asset = await getSupabaseAsset(env, auth.user.id, assetId);
    if (!asset) return jsonResponse({ success: false, error: 'Media asset not found.' }, 404, request);
    if (asset.storage_provider !== 'r2') {
      const result = await callSupabaseRpc(env, 'delete_my_profile_media_asset', { p_asset_id: asset.id }, { token: auth.token });
      return jsonResponse(result || { success: false, error: 'The media asset could not be removed.' }, 200, request);
    }

    const result = await callSupabaseRpc(env, 'delete_my_profile_media_asset', { p_asset_id: asset.id }, { token: auth.token });
    if (!result?.success) return jsonResponse(result || { success: false, error: 'The media asset could not be removed.' }, 422, request);
    const config = getR2Config(env);
    if (!config) return jsonResponse({ success: false, error: 'R2 media deletion is not configured.' }, 503, request);
    const keys = [...new Set([asset.r2_private_key, asset.r2_public_key].filter(Boolean))];
    const cleanup = [];
    for (const key of keys) {
      for (const bucket of [config.privateBucket, config.publicBucket]) {
        const response = await requestR2Object(env, { method: 'DELETE', bucket, key });
        if (!response.ok && response.status !== 404) cleanup.push({ bucket, key, status: response.status });
      }
    }
    if (asset.storage_path) {
      try {
        const legacyCleanup = await callSupabaseRpc(env, 'delete_profile_media_legacy_storage_object', {
          p_storage_path: asset.storage_path
        }, { service: true });
        if (!legacyCleanup?.success) {
          cleanup.push({ operation: 'legacy_storage_delete', storage_path: asset.storage_path, error: legacyCleanup?.error || 'Legacy Supabase Storage deletion failed.' });
        }
      } catch (legacyError) {
        cleanup.push({ operation: 'legacy_storage_delete', storage_path: asset.storage_path, error: legacyError.message });
      }
    }
    let purgeSuccess = true;
    if (asset.ever_public && asset.r2_public_key) {
      try {
        await purgePublicMediaKey(env, asset.r2_public_key);
      } catch (purgeError) {
        purgeSuccess = false;
        cleanup.push({ operation: 'cache_purge', key: asset.r2_public_key, error: purgeError.message });
      }
    }
    const objectDeleteSuccess = cleanup.every(entry => entry.operation === 'cache_purge');
    const completion = await callSupabaseRpc(env, 'complete_profile_media_deleted_cleanup_v2', {
      p_asset_id: asset.id,
      p_delete_success: objectDeleteSuccess,
      p_purge_success: purgeSuccess,
      p_error: cleanup.length ? JSON.stringify(cleanup) : null
    }, { service: true });
    const safeResult = publicMediaAssetPayload({ ...asset, ...result });
    const operationState = {
      configuration_changed: result.configuration_changed === true,
      cleared_reference: result.cleared_reference || null,
      updated_at: result.updated_at || null
    };
    if (!objectDeleteSuccess || !purgeSuccess || !completion?.completed) {
      return jsonResponse({ ...safeResult, ...operationState, success: true, cleanup_pending: true, cleanup }, 200, request);
    }
    return jsonResponse({ ...safeResult, ...operationState, ...(completion || {}), success: true, cleanup_pending: false }, 200, request);
  } catch (error) {
    return controlPlaneError(error, request);
  }
}
