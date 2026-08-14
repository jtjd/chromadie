import { createSupabaseHeaders, getSupabaseCredentials } from './_supabaseApi.js';

const encoder = new TextEncoder();

function hex(value) {
  return [...new Uint8Array(value)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(value) {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value;
  return hex(await crypto.subtle.digest('SHA-256', bytes));
}

export async function sha256Hex(value) {
  return sha256(value);
}

async function hmac(key, value) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(value)));
}

function awsEncode(value) {
  return encodeURIComponent(String(value))
    .replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function canonicalPath(bucket, key) {
  return `/${awsEncode(bucket)}/${String(key || '').split('/').map(awsEncode).join('/')}`;
}

function canonicalQuery(values) {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [awsEncode(key), awsEncode(value)])
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey !== rightKey) return leftKey < rightKey ? -1 : 1;
      if (leftValue === rightValue) return 0;
      return leftValue < rightValue ? -1 : 1;
    })
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

function canonicalHeaders(headers) {
  return Object.entries(headers)
    .map(([key, value]) => [key.toLowerCase().trim(), String(value).trim().replace(/\s+/g, ' ')])
    .sort(([left], [right]) => left.localeCompare(right));
}

function formatAmzDate(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function getR2Config(env) {
  const accountId = String(env?.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = String(env?.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = String(env?.R2_SECRET_ACCESS_KEY || '').trim();
  const privateBucket = String(env?.R2_PRIVATE_BUCKET || 'chm-profile-media-private').trim();
  const publicBucket = String(env?.R2_PUBLIC_BUCKET || 'chm-profile-media-public').trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !privateBucket || !publicBucket) return null;
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    privateBucket,
    publicBucket,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    publicOrigin: String(env?.MEDIA_PUBLIC_ORIGIN || 'https://media.chm.lol').replace(/\/$/, '')
  };
}

function getSupabaseConfig(env) {
  const credentials = getSupabaseCredentials(env);
  return credentials.url && (credentials.publishableKey || credentials.secretKey) ? credentials : null;
}

function bearerToken(request) {
  const header = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

export function jsonResponse(body, status = 200, request = null) {
  const headers = {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=UTF-8'
  };
  const origin = request?.headers?.get('Origin') || '';
  if (origin && /^https:\/\/(?:www\.)?(?:chm\.lol|chromadie\.com)$/.test(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }
  return new Response(JSON.stringify(body), { status, headers });
}

export function optionsResponse(request) {
  const origin = request.headers.get('Origin') || '';
  const headers = {
    'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Max-Age': '600'
  };
  if (/^https:\/\/(?:www\.)?(?:chm\.lol|chromadie\.com)$/.test(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }
  return new Response(null, { status: 204, headers });
}

export async function requireUser(request, env) {
  const token = bearerToken(request);
  const supabase = getSupabaseConfig(env);
  if (!token || !supabase?.publishableKey) return { error: jsonResponse({ success: false, error: 'Not authenticated.' }, 401, request) };

  const response = await fetch(`${supabase.url}/auth/v1/user`, {
    headers: createSupabaseHeaders({ apiKey: supabase.publishableKey, accessToken: token })
  });
  const user = await response.json().catch(() => null);
  if (!response.ok || !user?.id) return { error: jsonResponse({ success: false, error: 'Not authenticated.' }, 401, request) };
  return { token, user, supabase };
}

export async function callSupabaseRpc(env, functionName, body, { token = '', service = false, rows = false } = {}) {
  const config = getSupabaseConfig(env);
  const apiKey = service ? config?.secretKey : config?.publishableKey;
  if (!config || !apiKey || (!service && !token)) throw new Error('Supabase control-plane configuration is missing.');
  const headers = service
    ? createSupabaseHeaders({ apiKey, projectKeyIsLegacy: config.secretKeyIsLegacy })
    : createSupabaseHeaders({ apiKey, accessToken: token });
  headers['Content-Type'] = 'application/json';
  const response = await fetch(`${config.url}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body || {})
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || payload?.error || 'Supabase control-plane request failed.';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  if (rows) return Array.isArray(payload) ? payload : [];
  return Array.isArray(payload) ? payload[0] || null : payload;
}

export async function getSupabaseAsset(env, userId, assetId) {
  const config = getSupabaseConfig(env);
  if (!config?.secretKey) throw new Error('Supabase service configuration is missing.');
  const query = new URLSearchParams({
    select: 'id,user_id,kind,status,storage_provider,storage_path,r2_private_key,r2_public_key,content_hash_sha256,delivery_status,ever_public,mime_type,byte_size,label,metadata,upload_expires_at,cleanup_at',
    id: `eq.${assetId}`,
    user_id: `eq.${userId}`,
    limit: '1'
  });
  const response = await fetch(`${config.url}/rest/v1/profile_media_assets?${query}`, {
    headers: createSupabaseHeaders({ apiKey: config.secretKey, projectKeyIsLegacy: config.secretKeyIsLegacy })
  });
  const payload = await response.json().catch(() => []);
  if (!response.ok) throw new Error('Could not read the media asset.');
  return Array.isArray(payload) ? payload[0] || null : null;
}

export async function getSupabaseAssets(env, userId, { statuses = [], kinds = [] } = {}) {
  const config = getSupabaseConfig(env);
  if (!config?.secretKey) throw new Error('Supabase service configuration is missing.');
  const query = new URLSearchParams({
    select: 'id,user_id,kind,status,storage_provider,storage_path,r2_private_key,r2_public_key,content_hash_sha256,delivery_status,ever_public,mime_type,byte_size,label,metadata,upload_expires_at,cleanup_at',
    user_id: `eq.${userId}`,
    order: 'created_at.asc'
  });
  if (statuses.length) query.set('status', `in.(${statuses.map(value => `"${String(value).replaceAll('"', '')}"`).join(',')})`);
  if (kinds.length) query.set('kind', `in.(${kinds.map(value => `"${String(value).replaceAll('"', '')}"`).join(',')})`);
  const response = await fetch(`${config.url}/rest/v1/profile_media_assets?${query}`, {
    headers: createSupabaseHeaders({ apiKey: config.secretKey, projectKeyIsLegacy: config.secretKeyIsLegacy })
  });
  const payload = await response.json().catch(() => []);
  if (!response.ok) throw new Error('Could not read the media assets.');
  return Array.isArray(payload) ? payload : [];
}

const LEGACY_PROFILE_MEDIA_BUCKETS = new Set(['avatars', 'backgrounds', 'profile_audio', 'profile_media']);

export function parseLegacyProfileMediaPath(value) {
  const storagePath = String(value || '').trim().replace(/^\/+/, '');
  const separator = storagePath.indexOf('/');
  if (separator <= 0) return null;
  const bucket = storagePath.slice(0, separator);
  const objectPath = storagePath.slice(separator + 1);
  if (!LEGACY_PROFILE_MEDIA_BUCKETS.has(bucket) || !objectPath || objectPath.length > 1024) return null;
  if (objectPath.split('/').some(segment => !segment || segment === '.' || segment === '..')) return null;
  return { bucket, objectPath, storagePath: `${bucket}/${objectPath}` };
}

/**
 * Remove one exact legacy Supabase Storage object through Storage's supported
 * API. Database metadata is deliberately not modified here; callers retain
 * the path until this operation succeeds and then finalize the tombstone.
 */
export async function deleteSupabaseStorageObject(env, storagePath) {
  const reference = parseLegacyProfileMediaPath(storagePath);
  if (!reference) throw new Error('The legacy profile media path is invalid.');
  const credentials = getSupabaseCredentials(env);
  if (!credentials.url || !credentials.secretKey) throw new Error('Supabase Storage cleanup is not configured.');

  const response = await fetch(`${credentials.url}/storage/v1/object/${encodeURIComponent(reference.bucket)}`, {
    method: 'POST',
    headers: {
      ...createSupabaseHeaders({ apiKey: credentials.secretKey, projectKeyIsLegacy: credentials.secretKeyIsLegacy }),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prefixes: [reference.objectPath] })
  });
  const payload = await response.json().catch(() => null);
  if (response.ok || response.status === 404) {
    return { success: true, deleted: response.ok, storage_path: reference.storagePath };
  }
  const error = new Error(payload?.message || payload?.error || 'The legacy Supabase Storage object could not be deleted.');
  error.status = response.status;
  throw error;
}

async function signingKey(secret, dateStamp, region = 'auto', service = 's3') {
  const dateKey = await hmac(encoder.encode(`AWS4${secret}`), dateStamp);
  const regionKey = await hmac(dateKey, region);
  const serviceKey = await hmac(regionKey, service);
  return hmac(serviceKey, 'aws4_request');
}

export async function buildSignature({ config, method, bucket, key, headers = {}, query = {}, payloadHash = 'UNSIGNED-PAYLOAD', date = new Date() }) {
  const amzDate = formatAmzDate(date);
  const dateStamp = amzDate.slice(0, 8);
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const normalizedHeaders = canonicalHeaders({ host, ...headers });
  const signedHeaders = normalizedHeaders.map(([name]) => name).join(';');
  const headerBlock = normalizedHeaders.map(([name, value]) => `${name}:${value}\n`).join('');
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const canonicalRequest = [
    method.toUpperCase(),
    canonicalPath(bucket, key),
    canonicalQuery(query),
    headerBlock,
    signedHeaders,
    payloadHash
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    await sha256(canonicalRequest)
  ].join('\n');
  const signature = hex(await hmac(await signingKey(config.secretAccessKey, dateStamp), stringToSign));
  return { amzDate, signedHeaders, signature, scope, host };
}

export async function createPresignedUrl(env, options = {}) {
  const {
    method = 'PUT',
    bucket,
    key,
    contentType = '',
    contentLength = null,
    metadataHash = '',
    expires = 900,
    date = new Date()
  } = options;
  const config = getR2Config(env);
  if (!config) throw new Error('R2 control-plane configuration is missing.');
  const amzDate = formatAmzDate(date);
  const dateStamp = amzDate.slice(0, 8);
  const signedHeaders = {
    ...(contentType ? { 'content-type': contentType } : {}),
    ...(Number.isSafeInteger(contentLength) && contentLength >= 0
      ? { 'content-length': String(contentLength) }
      : {}),
    ...(metadataHash ? { 'x-amz-meta-sha256': metadataHash } : {})
  };
  const query = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${config.accessKeyId}/${dateStamp}/auto/s3/aws4_request`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': Math.min(900, Math.max(1, Number(expires) || 900)),
  };
  const signed = await buildSignature({ config, method, bucket, key, headers: signedHeaders, query, date });
  query['X-Amz-SignedHeaders'] = signed.signedHeaders;
  // The SignedHeaders value is part of the canonical query string. Rebuild
  // the signature after adding it rather than relying on a hand-maintained
  // header ordering.
  const resigned = await buildSignature({ config, method, bucket, key, headers: signedHeaders, query, date });
  return `${config.endpoint}${canonicalPath(bucket, key)}?${canonicalQuery({ ...query, 'X-Amz-Signature': resigned.signature })}`;
}

export async function requestR2Object(env, { method, bucket, key, headers = {}, body = null } = {}) {
  const config = getR2Config(env);
  if (!config) throw new Error('R2 control-plane configuration is missing.');
  const payloadHash = body ? await sha256(body) : await sha256(new Uint8Array());
  const date = new Date();
  const requestHeaders = { ...headers, 'x-amz-content-sha256': payloadHash, 'x-amz-date': formatAmzDate(date) };
  const signed = await buildSignature({ config, method, bucket, key, headers: requestHeaders, payloadHash, date });
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${signed.scope}, SignedHeaders=${signed.signedHeaders}, Signature=${signed.signature}`;
  const outgoingHeaders = Object.fromEntries(canonicalHeaders(requestHeaders));
  // Host is part of the signature, but Fetch supplies it from the URL and
  // some runtimes reject an explicit Host header.
  delete outgoingHeaders.host;
  return fetch(`${config.endpoint}${canonicalPath(bucket, key)}`, {
    method,
    headers: {
      ...outgoingHeaders,
      Authorization: authorization
    },
    body
  });
}

export async function copyR2Object(env, { sourceBucket, sourceKey, destinationBucket, destinationKey, contentType = '', metadataHash = '' } = {}) {
  if (!sourceBucket || !sourceKey || !destinationBucket || !destinationKey) {
    throw new Error('The R2 copy request is incomplete.');
  }
  const source = `/${String(sourceBucket).replace(/^\/+/, '')}/${String(sourceKey).replace(/^\/+/, '')}`;
  const headers = {
    'x-amz-copy-source': source,
    ...(contentType ? { 'content-type': contentType } : {}),
    ...(metadataHash ? { 'x-amz-meta-sha256': metadataHash } : {})
  };
  return requestR2Object(env, {
    method: 'PUT',
    bucket: destinationBucket,
    key: destinationKey,
    headers,
    body: null
  });
}

export function parseJsonRequest(request) {
  return request.json().catch(() => null);
}

export function controlPlaneError(error, request) {
  const status = Number.isInteger(error?.status) ? error.status : 502;
  return jsonResponse({ success: false, error: error?.message || 'Profile media control-plane request failed.' }, status, request);
}

export function getPublicMediaUrl(env, key) {
  const config = getR2Config(env);
  const normalized = String(key || '').replace(/^\/+/, '');
  if (!config || !normalized) return '';
  return `${config.publicOrigin}/${normalized.split('/').map(segment => encodeURIComponent(segment)).join('/')}`;
}

export function getCloudflareCacheConfig(env) {
  const zoneId = String(env?.CLOUDFLARE_ZONE_ID || env?.CF_ZONE_ID || '').trim();
  const apiToken = String(env?.CLOUDFLARE_API_TOKEN || env?.CF_API_TOKEN || '').trim();
  const publicOrigin = String(env?.MEDIA_PUBLIC_ORIGIN || 'https://media.chm.lol').replace(/\/$/, '');
  if (!zoneId || !apiToken || !publicOrigin) return null;
  return { zoneId, apiToken, publicOrigin };
}

export async function purgePublicMediaUrl(env, url) {
  const config = getCloudflareCacheConfig(env);
  if (!config) throw new Error('Cloudflare cache purge is not configured.');
  let parsed;
  try {
    parsed = new URL(String(url || ''));
  } catch {
    throw new Error('The public media URL is invalid.');
  }
  if (parsed.origin !== config.publicOrigin || !parsed.pathname || parsed.search || parsed.hash) {
    throw new Error('Only an exact media.chm.lol URL may be purged.');
  }
  const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(config.zoneId)}/purge_cache`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ files: [parsed.toString()] })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success !== true) {
    const message = payload?.errors?.[0]?.message || `Cloudflare cache purge failed (${response.status}).`;
    const error = new Error(message);
    error.status = response.status || 502;
    throw error;
  }
  return { success: true, url: parsed.toString() };
}

export async function purgePublicMediaKey(env, key) {
  const url = getPublicMediaUrl(env, key);
  if (!url) throw new Error('The public media key is invalid.');
  return purgePublicMediaUrl(env, url);
}

export function publicMediaAssetPayload(asset) {
  if (!asset || typeof asset !== 'object') return null;
  const {
    id,
    user_id: userId,
    kind,
    status,
    storage_provider: storageProvider,
    storage_path: storagePath,
    r2_public_key: r2PublicKey,
    content_hash_sha256: contentHash,
    delivery_status: deliveryStatus,
    ever_public: everPublic,
    mime_type: mimeType,
    byte_size: byteSize,
    label,
    metadata,
    upload_expires_at: uploadExpiresAt,
    verified_at: verifiedAt,
    public_ready_at: publicReadyAt
  } = asset;
  return {
    id,
    user_id: userId,
    kind,
    status,
    storage_provider: storageProvider,
    storage_path: storagePath,
    r2_public_key: r2PublicKey,
    content_hash_sha256: contentHash,
    delivery_status: deliveryStatus,
    ever_public: everPublic,
    mime_type: mimeType,
    byte_size: byteSize,
    label,
    metadata,
    upload_expires_at: uploadExpiresAt,
    verified_at: verifiedAt,
    public_ready_at: publicReadyAt
  };
}

function hasAscii(bytes, value, offset = 0) {
  if (bytes.length < offset + value.length) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (bytes[offset + index] !== value.charCodeAt(index)) return false;
  }
  return true;
}

function hasMpegFrame(bytes) {
  const limit = Math.min(bytes.length - 1, 512);
  for (let index = 0; index < limit; index += 1) {
    if (bytes[index] !== 0xff || (bytes[index + 1] & 0xe0) !== 0xe0) continue;
    const version = (bytes[index + 1] >> 3) & 0x03;
    const layer = (bytes[index + 1] >> 1) & 0x03;
    const bitrate = (bytes[index + 2] >> 4) & 0x0f;
    const sampleRate = (bytes[index + 2] >> 2) & 0x03;
    if (version !== 1 && layer !== 0 && bitrate !== 0 && bitrate !== 0x0f && sampleRate !== 3) return true;
  }
  return false;
}

/**
 * Validate the small container signatures that correspond to the allowlisted
 * upload contract. This runs after the actual R2 bytes have been hashed; it
 * never trusts browser MIME, extension, or hash claims by themselves.
 */
export function validateProfileMediaSignature({ bytes, kind, extension, mimeType } = {}) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  const normalizedKind = String(kind || '').toLowerCase();
  const normalizedExtension = String(extension || '').toLowerCase().replace(/^\./, '');
  const normalizedMime = String(mimeType || '').toLowerCase().split(';')[0].trim();
  const expected = {
    avatar: ['webp', 'image/webp'],
    background: ['webp', 'image/webp'],
    banner: ['webp', 'image/webp'],
    cursor: ['webp|ani', 'image/webp|application/x-navi-animation|application/octet-stream|application/x-ani|image/x-ani|application/vnd.microsoft.ani'],
    pointer_cursor: ['webp|ani', 'image/webp|application/x-navi-animation|application/octet-stream|application/x-ani|image/x-ani|application/vnd.microsoft.ani'],
    background_video: ['mp4|webm', 'video/mp4|video/webm'],
    audio: ['mp3', 'audio/mpeg']
  }[normalizedKind];
  if (!expected || !new RegExp(`^(?:${expected[0]})$`).test(normalizedExtension)
    || !new RegExp(`^(?:${expected[1]})$`).test(normalizedMime)) return false;

  if (normalizedExtension === 'webp') return hasAscii(data, 'RIFF') && hasAscii(data, 'WEBP', 8);
  if (normalizedExtension === 'ani') return hasAscii(data, 'RIFF') && hasAscii(data, 'ACON', 8);
  if (normalizedExtension === 'mp4') return data.length >= 12 && hasAscii(data, 'ftyp', 4);
  if (normalizedExtension === 'webm') {
    const header = data.subarray(0, Math.min(data.length, 512));
    return hasAscii(data, '\x1a\x45\xdf\xa3') && [...header].some((_, index) => hasAscii(header, 'webm', index));
  }
  if (normalizedExtension === 'mp3') return hasAscii(data, 'ID3') || hasMpegFrame(data);
  return false;
}

export { getR2Config };
