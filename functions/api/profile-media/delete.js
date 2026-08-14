import {
  callSupabaseRpc,
  controlPlaneError,
  deleteSupabaseStorageObject,
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
    const result = await callSupabaseRpc(env, 'delete_my_profile_media_asset', { p_asset_id: asset.id }, { token: auth.token });
    if (!result?.success) return jsonResponse(result || { success: false, error: 'The media asset could not be removed.' }, 422, request);
    const provider = result.storage_provider || asset.storage_provider || 'supabase';
    const config = provider === 'r2' ? getR2Config(env) : null;
    if (provider === 'r2' && !config) return jsonResponse({ success: false, error: 'R2 media deletion is not configured.' }, 503, request);
    const keys = [...new Set([result.r2_private_key || asset.r2_private_key, result.r2_public_key || asset.r2_public_key].filter(Boolean))];
    const cleanup = [];
    if (provider === 'r2') {
      for (const key of keys) {
        for (const bucket of [config.privateBucket, config.publicBucket]) {
          const response = await requestR2Object(env, { method: 'DELETE', bucket, key });
          if (!response.ok && response.status !== 404) cleanup.push({ bucket, key, status: response.status });
        }
      }
    }
    const storagePath = result.storage_path || asset.storage_path;
    if (storagePath) {
      try {
        await deleteSupabaseStorageObject(env, storagePath);
      } catch (legacyError) {
        cleanup.push({ operation: 'legacy_storage_delete', storage_path: storagePath, error: legacyError.message });
      }
    }
    let purgeSuccess = true;
    const publicKey = result.r2_public_key || asset.r2_public_key;
    if (provider === 'r2' && (result.ever_public ?? asset.ever_public) && publicKey) {
      try {
        await purgePublicMediaKey(env, publicKey);
      } catch (purgeError) {
        purgeSuccess = false;
        cleanup.push({ operation: 'cache_purge', key: publicKey, error: purgeError.message });
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
