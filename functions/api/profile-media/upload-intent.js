import {
  callSupabaseRpc,
  controlPlaneError,
  createPresignedUrl,
  getR2Config,
  jsonResponse,
  optionsResponse,
  parseJsonRequest,
  requireUser
} from '../../_profileMediaControl.js';

export function onRequestOptions({ request }) {
  return optionsResponse(request);
}

export async function onRequestPost({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return auth.error;
  if (!getR2Config(env)) return jsonResponse({ success: false, error: 'R2 media uploads are not configured.' }, 503, request);

  const body = await parseJsonRequest(request);
  const kind = String(body?.kind || '').trim().toLowerCase();
  const extension = String(body?.extension || '').trim().toLowerCase().replace(/^\./, '');
  const mimeType = String(body?.mime_type || '').trim().toLowerCase();
  const byteSize = Number(body?.byte_size);
  const hash = String(body?.content_hash_sha256 || '').trim().toLowerCase();
  const label = String(body?.label || '').trim().slice(0, 80);
  const replaceAssetId = body?.replace_asset_id ? String(body.replace_asset_id).trim() : null;
  const metadata = body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {};
  if (!['avatar', 'background', 'background_video', 'banner', 'audio', 'cursor', 'pointer_cursor'].includes(kind)
    || !/^[a-z0-9]{1,8}$/.test(extension)
    || !mimeType
    || !Number.isSafeInteger(byteSize)
    || byteSize <= 0
    || !/^[0-9a-f]{64}$/.test(hash)
    || (replaceAssetId !== null && !/^[0-9a-f-]{36}$/i.test(replaceAssetId))) {
    return jsonResponse({ success: false, error: 'The media upload metadata is invalid.' }, 400, request);
  }

  try {
    const prepared = await callSupabaseRpc(env, 'prepare_my_profile_media_upload_r2', {
      p_kind: kind,
      p_extension: extension,
      p_mime_type: mimeType,
      p_byte_size: byteSize,
      p_content_hash_sha256: hash,
      p_label: label,
      p_metadata: metadata,
      p_replace_asset_id: replaceAssetId
    }, { token: auth.token });
    if (!prepared?.success || !prepared.asset_id || !prepared.r2_private_key) {
      return jsonResponse({ success: false, error: prepared?.error || 'The upload could not be authorized.' }, 422, request);
    }
    const uploadUrl = await createPresignedUrl(env, {
      method: 'PUT',
      bucket: prepared.private_bucket || getR2Config(env).privateBucket,
      key: prepared.r2_private_key,
      contentType: mimeType,
      contentLength: byteSize,
      metadataHash: hash,
      expires: 900
    });
    return jsonResponse({
      success: true,
      asset_id: prepared.asset_id,
      storage_provider: 'r2',
      r2_public_key: prepared.r2_public_key,
      content_hash_sha256: hash,
      mime_type: mimeType,
      byte_size: byteSize,
      expires_at: prepared.expires_at,
      upload_url: uploadUrl,
      upload_headers: {
        'Content-Type': mimeType,
        'x-amz-meta-sha256': hash
      }
    }, 200, request);
  } catch (error) {
    return controlPlaneError(error, request);
  }
}
