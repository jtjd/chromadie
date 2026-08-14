#!/usr/bin/env node

/*
 * Idempotent active-profile migration.
 *
 * This is deliberately an operator script, not a request-path handler. It
 * copies selected legacy bytes to private R2, verifies the copy, promotes it
 * to the public Standard bucket, verifies public delivery, removes the
 * temporary private copy, and only then switches the metadata/configuration
 * provider. A failure therefore leaves the old Supabase URL usable.
 */
import { createHash, randomUUID } from 'node:crypto';
import { getProfileStorageRef } from '../src/lib/profileExpression.js';
import { getRichMediaStorageRef } from '../src/lib/profileRichMedia.js';
import { copyR2Object, getR2Config, requestR2Object } from '../functions/_profileMediaControl.js';
import { createSupabaseHeaders, getSupabaseCredentials } from '../functions/_supabaseApi.js';
import { selectedRows } from './profile-media-migration-model.mjs';

const env = process.env;
const supabase = getSupabaseCredentials(env);
const supabaseUrl = supabase.url;
const serviceKey = supabase.secretKey;
const r2 = getR2Config(env);
const dryRun = !['1', 'true', 'yes'].includes(String(env.R2_MIGRATION_APPLY || '').toLowerCase());

if (!supabaseUrl || !serviceKey || !r2) {
  console.error('Required environment: SUPABASE_URL, SUPABASE_SECRET_KEY, R2_* control-plane secrets.');
  process.exit(2);
}

const headers = createSupabaseHeaders({
  apiKey: serviceKey,
  projectKeyIsLegacy: supabase.secretKeyIsLegacy,
  contentType: true
});

async function rest(path, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path}: ${payload?.message || response.statusText}`);
  return payload;
}

function sourceReference(path) {
  return getProfileStorageRef(path) || getRichMediaStorageRef(path);
}

function extensionFromPath(path, mimeType = '') {
  const extension = String(path || '').match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (extension) return extension;
  return String(mimeType).split('/')[1]?.replace('mpeg', 'mp3') || 'bin';
}

function publicStorageUrl(path) {
  const reference = sourceReference(path);
  if (!reference) return '';
  return `${supabaseUrl}/storage/v1/object/public/${reference.bucket}/${reference.objectPath}`;
}

function verifiedHead(response, expectedSize, expectedMime, expectedHash) {
  if (!response?.ok || Number(response.headers.get('content-length')) !== expectedSize) return false;
  const actualMime = String(response.headers.get('content-type') || '').toLowerCase().split(';')[0].trim();
  const actualHash = String(response.headers.get('x-amz-meta-sha256') || '').toLowerCase().trim();
  return (!actualMime || !expectedMime || actualMime === expectedMime)
    && (!actualHash || !expectedHash || actualHash === expectedHash);
}

async function ensureAsset(row, selection) {
  if (row) return row;
  if (!selection.storagePath) return null;
  const created = {
    id: selection.assetId || randomUUID(),
    user_id: selection.userId,
    kind: selection.kind,
    storage_path: selection.storagePath,
    storage_provider: 'supabase',
    status: 'active',
    delivery_status: 'ready',
    label: '',
    byte_size: 0,
    metadata: {}
  };
  if (dryRun) return created;
  const inserted = await rest('profile_media_assets', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(created)
  });
  return inserted?.[0] || created;
}

async function migrateAsset(asset, selection) {
  if (!asset?.storage_path && !selection.storagePath) return { skipped: true, reason: 'no legacy path' };
  if (asset.storage_provider === 'r2' && asset.r2_public_key && asset.ever_public) {
    for (const reference of selection.references) await patchSelection(asset, reference);
    return { skipped: true, reason: 'already public on R2', assetId: asset.id };
  }
  const legacyPath = asset.storage_path || selection.storagePath;
  const sourceUrl = publicStorageUrl(legacyPath);
  if (!sourceUrl) return { skipped: true, reason: 'unsupported legacy path' };
  const sourceResponse = await fetch(sourceUrl);
  if (!sourceResponse.ok) throw new Error(`Legacy media read failed (${sourceResponse.status}) for ${legacyPath}`);
  const bytes = new Uint8Array(await sourceResponse.arrayBuffer());
  const hash = createHash('sha256').update(bytes).digest('hex');
  const extension = extensionFromPath(legacyPath, asset.mime_type);
  const key = asset.r2_private_key || `profiles/${asset.user_id}/${asset.id}/${hash}.${extension}`;
  const mimeType = asset.mime_type || sourceResponse.headers.get('content-type')?.split(';')[0] || 'application/octet-stream';

  if (dryRun) return { dryRun: true, assetId: asset.id, legacyPath, key, bytes: bytes.length };

  const put = await requestR2Object(env, {
    method: 'PUT',
    bucket: r2.privateBucket,
    key,
    headers: { 'content-type': mimeType, 'x-amz-meta-sha256': hash },
    body: bytes
  });
  if (!put.ok) throw new Error(`Private R2 upload failed (${put.status}) for ${legacyPath}`);
  const privateHead = await requestR2Object(env, { method: 'HEAD', bucket: r2.privateBucket, key });
  if (!verifiedHead(privateHead, bytes.length, mimeType, hash)) throw new Error(`Private R2 verification failed for ${legacyPath}`);

  const copy = await copyR2Object(env, {
    sourceBucket: r2.privateBucket,
    sourceKey: key,
    destinationBucket: r2.publicBucket,
    destinationKey: key,
    contentType: mimeType,
    metadataHash: hash
  });
  if (!copy.ok) throw new Error(`Public R2 promotion failed (${copy.status}) for ${legacyPath}`);
  const publicHead = await requestR2Object(env, { method: 'HEAD', bucket: r2.publicBucket, key });
  if (!verifiedHead(publicHead, bytes.length, mimeType, hash)) throw new Error(`Public R2 verification failed for ${legacyPath}`);
  const privateDelete = await requestR2Object(env, { method: 'DELETE', bucket: r2.privateBucket, key });
  const privateCleanup = privateDelete.ok || privateDelete.status === 404
    ? { pending: false }
    : { pending: true, status: privateDelete.status };
  if (privateCleanup.pending) throw new Error(`Temporary private R2 cleanup failed for ${legacyPath}`);

  await rest(`profile_media_assets?id=eq.${asset.id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      storage_provider: 'r2',
      r2_private_key: null,
      r2_public_key: key,
      content_hash_sha256: hash,
      mime_type: mimeType,
      byte_size: bytes.length,
      delivery_status: 'ready',
      verified_at: new Date().toISOString(),
      public_ready_at: new Date().toISOString(),
      ever_public: true,
      last_error: null
    })
  });
  const migratedAsset = {
    ...asset,
    storage_provider: 'r2',
    r2_private_key: null,
    r2_public_key: key,
    delivery_status: 'ready',
    ever_public: true
  };
  for (const reference of selection.references) await patchSelection(migratedAsset, reference);
  return { migrated: true, assetId: asset.id, legacyPath, key, bytes: bytes.length, privateCleanup };
}

async function patchSelection(asset, selection) {
  if (dryRun) return;
  const result = await rest('rpc/migrate_profile_media_selection', {
    method: 'POST',
    body: JSON.stringify({
      p_user_id: selection.userId,
      p_asset_id: asset.id,
      p_kind: selection.kind,
      p_legacy_path: selection.storagePath || null,
      p_target: selection.target
    })
  });
  if (!result?.success) throw new Error(result?.error || `Could not update the ${selection.target} ${selection.kind} selection.`);
}

const [configurations, assets] = await Promise.all([
  rest('profile_configurations?select=*'),
  rest('profile_media_assets?select=*&status=eq.active&order=created_at.asc')
]);
const byId = new Map((assets || []).map(asset => [asset.id, asset]));
const byPath = new Map((assets || []).filter(asset => asset.storage_path).map(asset => [asset.storage_path, asset]));
const report = [];
for (const selection of selectedRows(configurations || [])) {
  let asset = (selection.assetId && byId.get(selection.assetId)) || byPath.get(selection.storagePath);
  asset = await ensureAsset(asset, selection);
  if (!asset) continue;
  const result = await migrateAsset(asset, selection);
  report.push(result);
}

console.log(JSON.stringify({ dryRun, selected: report.length, report }, null, 2));
