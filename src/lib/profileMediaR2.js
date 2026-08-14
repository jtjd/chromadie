import { supabase } from './supabase.js';

function controlPlaneOrigin() {
  const configured = String(import.meta.env?.VITE_PROFILE_MEDIA_CONTROL_ORIGIN || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
}

async function accessToken() {
  const result = await supabase?.auth?.getSession?.();
  return result?.data?.session?.access_token || '';
}

async function requestControlPlane(path, options = {}) {
  const origin = controlPlaneOrigin();
  const token = await accessToken();
  if (!origin || !token) throw new Error('Your session could not authorize this media action.');
  const response = await fetch(`${origin}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || 'The profile media service is unavailable.');
  }
  return payload;
}

export async function sha256Blob(blob) {
  if (!blob || typeof blob.arrayBuffer !== 'function' || !globalThis.crypto?.subtle) {
    throw new Error('This browser cannot verify the selected media.');
  }
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Upload bytes directly to the private R2 bucket. The browser receives only
 * a short-lived, object-scoped PUT URL; R2 credentials never enter the client.
 * @param {{kind?: string, blob?: Blob, extension?: string, mimeType?: string, label?: string, metadata?: any, replaceAssetId?: string|null}} options
 */
export async function uploadProfileMediaToR2({ kind, blob, extension, mimeType, label = '', metadata = {}, replaceAssetId = null } = {}) {
  if (!blob || !kind || !extension || !mimeType) throw new Error('The media upload is incomplete.');
  const contentHash = await sha256Blob(blob);
  const intent = await requestControlPlane('/api/profile-media/upload-intent', {
    method: 'POST',
    body: JSON.stringify({
      kind,
      extension,
      mime_type: mimeType,
      byte_size: blob.size,
      content_hash_sha256: contentHash,
      label,
      metadata,
      ...(replaceAssetId ? { replace_asset_id: replaceAssetId } : {})
    })
  });

  const uploadResponse = await fetch(intent.upload_url, {
    method: 'PUT',
    headers: {
      ...(intent.upload_headers || {}),
      'Content-Type': mimeType,
      'x-amz-meta-sha256': contentHash
    },
    // Content-Length is part of the signed PUT contract. Browsers reject
    // script-written Content-Length, so fetch supplies the Blob's exact byte
    // length on the wire while the server binds it in the presigned URL.
    body: blob
  });
  if (!uploadResponse.ok) throw new Error('The media bytes could not be uploaded to R2.');

  return requestControlPlane('/api/profile-media/complete', {
    method: 'POST',
    body: JSON.stringify({ asset_id: intent.asset_id, content_hash_sha256: contentHash })
  });
}

export function promoteProfileMediaR2(assetId) {
  return requestControlPlane('/api/profile-media/promote', {
    method: 'POST',
    body: JSON.stringify({ asset_id: assetId })
  });
}

export function deleteProfileMediaR2(assetId) {
  return requestControlPlane('/api/profile-media/delete', {
    method: 'POST',
    body: JSON.stringify({ asset_id: assetId })
  });
}

export function isR2MediaAsset(asset) {
  return String(asset?.storage_provider || '').toLowerCase() === 'r2';
}
