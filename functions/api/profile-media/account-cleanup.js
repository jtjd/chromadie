import {
  callSupabaseRpc,
  controlPlaneError,
  getR2Config,
  jsonResponse,
  optionsResponse,
  purgePublicMediaKey,
  requestR2Object
} from '../../_profileMediaControl.js';

export function onRequestOptions({ request }) {
  return optionsResponse(request);
}

function isAuthorized(request, env) {
  const expected = String(env?.R2_ACCOUNT_CLEANUP_SECRET || '').trim();
  const header = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  const bearer = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || '';
  const supplied = request.headers.get('x-r2-cleanup-secret') || bearer;
  return Boolean(expected && supplied && supplied === expected);
}

function parseObjectKeys(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(entry => entry && typeof entry === 'object')
    .map(entry => ({ bucket: String(entry.bucket || ''), key: String(entry.key || '').replace(/^\/+/, '') }))
    .filter(entry => ['private', 'public', 'supabase'].includes(entry.bucket)
      && entry.key
      && entry.key.length <= 1024
      && !entry.key.split('/').some(segment => segment === '.' || segment === '..'));
}

export async function onRequestPost({ request, env }) {
  if (!isAuthorized(request, env)) return jsonResponse({ success: false, error: 'Not authorized.' }, 401, request);
  const config = getR2Config(env);
  if (!config) return jsonResponse({ success: false, error: 'R2 cleanup is not configured.' }, 503, request);

  try {
    const jobs = await callSupabaseRpc(env, 'claim_profile_media_account_cleanup_jobs', { p_limit: 10 }, { service: true, rows: true });
    const results = [];
    for (const job of jobs) {
      const failures = [];
      for (const object of parseObjectKeys(job.object_keys)) {
        if (object.bucket === 'supabase') {
          try {
            const legacyCleanup = await callSupabaseRpc(env, 'delete_profile_media_legacy_storage_object', {
              p_storage_path: object.key
            }, { service: true });
            if (!legacyCleanup?.success) {
              failures.push({ operation: 'legacy_storage_delete', key: object.key, error: legacyCleanup?.error || 'Legacy Supabase Storage deletion failed.' });
            }
          } catch (legacyError) {
            failures.push({ operation: 'legacy_storage_delete', key: object.key, error: legacyError.message });
          }
          continue;
        }
        const bucket = object.bucket === 'private' ? config.privateBucket : config.publicBucket;
        const response = await requestR2Object(env, { method: 'DELETE', bucket, key: object.key });
        if (!response.ok && response.status !== 404) failures.push({ bucket: object.bucket, key: object.key, status: response.status });
        if (object.bucket === 'public') {
          try {
            await purgePublicMediaKey(env, object.key);
          } catch (purgeError) {
            failures.push({ operation: 'cache_purge', key: object.key, error: purgeError.message });
          }
        }
      }
      const completion = await callSupabaseRpc(env, 'complete_profile_media_account_cleanup_job', {
        p_job_id: job.id,
        p_success: failures.length === 0,
        p_error: failures.length ? JSON.stringify(failures) : null
      }, { service: true });
      results.push({ job_id: job.id, success: failures.length === 0, completion, failures });
    }
    const orphanAssets = await callSupabaseRpc(env, 'claim_profile_media_orphan_cleanup', { p_limit: 25 }, { service: true, rows: true });
    const orphanResults = [];
    for (const asset of orphanAssets) {
      const response = await requestR2Object(env, { method: 'DELETE', bucket: config.privateBucket, key: asset.r2_private_key });
      const success = response.ok || response.status === 404;
      const completion = await callSupabaseRpc(env, 'complete_profile_media_orphan_cleanup', {
        p_asset_id: asset.id,
        p_success: success,
        p_error: success ? null : `Private R2 orphan cleanup returned ${response.status}.`
      }, { service: true });
      orphanResults.push({ asset_id: asset.id, success, completion });
    }
    const privateCopies = await callSupabaseRpc(env, 'claim_profile_media_private_cleanup', { p_limit: 25 }, { service: true, rows: true });
    const privateResults = [];
    for (const asset of privateCopies) {
      const response = await requestR2Object(env, { method: 'DELETE', bucket: config.privateBucket, key: asset.r2_private_key });
      const success = response.ok || response.status === 404;
      const completion = await callSupabaseRpc(env, 'complete_profile_media_private_cleanup', {
        p_asset_id: asset.id,
        p_success: success,
        p_error: success ? null : `Private R2 cleanup returned ${response.status}.`
      }, { service: true });
      privateResults.push({ asset_id: asset.id, success, completion });
    }
    const deletedAssets = await callSupabaseRpc(env, 'claim_profile_media_deleted_cleanup_v2', { p_limit: 25 }, { service: true, rows: true });
    const deletedResults = [];
    for (const asset of deletedAssets) {
      const keys = [...new Set([asset.r2_private_key, asset.r2_public_key].filter(Boolean))];
      const failures = [];
      for (const key of keys) {
        for (const bucket of [config.privateBucket, config.publicBucket]) {
          const response = await requestR2Object(env, { method: 'DELETE', bucket, key });
          if (!response.ok && response.status !== 404) failures.push({ bucket, key, status: response.status });
        }
      }
      if (asset.storage_path) {
        try {
          const legacyCleanup = await callSupabaseRpc(env, 'delete_profile_media_legacy_storage_object', {
            p_storage_path: asset.storage_path
          }, { service: true });
          if (!legacyCleanup?.success) {
            failures.push({ operation: 'legacy_storage_delete', key: asset.storage_path, error: legacyCleanup?.error || 'Legacy Supabase Storage deletion failed.' });
          }
        } catch (legacyError) {
          failures.push({ operation: 'legacy_storage_delete', key: asset.storage_path, error: legacyError.message });
        }
      }
      let purgeSuccess = !asset.cache_purge_required || asset.cache_purge_status === 'completed';
      if (asset.cache_purge_required && asset.cache_purge_status !== 'completed' && asset.r2_public_key) {
        try {
          await purgePublicMediaKey(env, asset.r2_public_key);
          purgeSuccess = true;
        } catch (purgeError) {
          purgeSuccess = false;
          failures.push({ operation: 'cache_purge', key: asset.r2_public_key, error: purgeError.message });
        }
      }
      const objectDeleteSuccess = failures.every(entry => entry.operation === 'cache_purge');
      const completion = await callSupabaseRpc(env, 'complete_profile_media_deleted_cleanup_v2', {
        p_asset_id: asset.id,
        p_delete_success: objectDeleteSuccess,
        p_purge_success: purgeSuccess,
        p_error: failures.length ? JSON.stringify(failures) : null
      }, { service: true });
      deletedResults.push({ asset_id: asset.id, success: objectDeleteSuccess && purgeSuccess, completion, failures });
    }
    return jsonResponse({
      success: true,
      claimed: jobs.length,
      results,
      orphan_assets_claimed: orphanAssets.length,
      orphan_results: orphanResults,
      private_copies_claimed: privateCopies.length,
      private_results: privateResults,
      deleted_assets_claimed: deletedAssets.length,
      deleted_results: deletedResults
    }, 200, request);
  } catch (error) {
    return controlPlaneError(error, request);
  }
}
