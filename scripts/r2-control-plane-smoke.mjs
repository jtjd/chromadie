#!/usr/bin/env node

/*
 * Optional live R2 control-plane smoke. It is deliberately separate from the
 * unit suite: no credentials are required for normal CI, but a rollout must
 * run this against a disposable test object before enabling uploads.
 */
import { randomUUID } from 'node:crypto';
import {
  copyR2Object,
  createPresignedUrl,
  getPublicMediaUrl,
  getR2Config,
  purgePublicMediaKey,
  requestR2Object
} from '../functions/_profileMediaControl.js';

const env = process.env;
const config = getR2Config(env);
const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];
if (!config || required.some(name => !String(env[name] || '').trim())) {
  console.log(JSON.stringify({ skipped: true, reason: 'R2 control-plane credentials are not configured.' }));
  process.exit(0);
}

const key = `smoke/${randomUUID()}/probe.webp`;
const destinationKey = `${key}.copy`;
const oversizedKey = `${key}.oversized`;
const undersizedKey = `${key}.undersized`;
const bytes = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x0a, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
  0x02, 0x00, 0x00, 0x00, 0x00, 0x00
]);
const hash = [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes))]
  .map(value => value.toString(16).padStart(2, '0')).join('');
const headers = {
  'Content-Length': String(bytes.byteLength),
  'Content-Type': 'image/webp',
  'x-amz-meta-sha256': hash
};

async function assertSizeMismatch(url, body, label, keyToClean) {
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Length': String(body.byteLength),
      'Content-Type': 'image/webp',
      'x-amz-meta-sha256': hash
    },
    body
  });
  if (response.ok) throw new Error(`${label} unexpectedly succeeded.`);
  // A rejected signed request must not leave an object behind. The cleanup
  // list still includes the key in case an R2 implementation accepts the
  // request despite the signature mismatch.
  return keyToClean;
}

async function assertOk(response, label) {
  if (!response.ok) throw new Error(`${label} failed with ${response.status}`);
}

try {
  const uploadUrl = await createPresignedUrl(env, {
    method: 'PUT',
    bucket: config.privateBucket,
    key,
    contentType: 'image/webp',
    contentLength: bytes.byteLength,
    metadataHash: hash,
    date: new Date()
  });
  await assertOk(await fetch(uploadUrl, { method: 'PUT', headers, body: bytes }), 'presigned PUT');

  const oversized = new Uint8Array([...bytes, 0x00]);
  const oversizedUrl = await createPresignedUrl(env, {
    method: 'PUT',
    bucket: config.privateBucket,
    key: oversizedKey,
    contentType: 'image/webp',
    contentLength: bytes.byteLength,
    metadataHash: hash,
    date: new Date()
  });
  await assertSizeMismatch(oversizedUrl, oversized, 'oversized signed PUT', oversizedKey);

  const undersized = bytes.subarray(0, bytes.length - 1);
  const undersizedUrl = await createPresignedUrl(env, {
    method: 'PUT',
    bucket: config.privateBucket,
    key: undersizedKey,
    contentType: 'image/webp',
    contentLength: bytes.byteLength,
    metadataHash: hash,
    date: new Date()
  });
  await assertSizeMismatch(undersizedUrl, undersized, 'undersized signed PUT', undersizedKey);

  const head = await requestR2Object(env, { method: 'HEAD', bucket: config.privateBucket, key });
  await assertOk(head, 'private HEAD');
  if (Number(head.headers.get('content-length')) !== bytes.byteLength) throw new Error('Private HEAD size mismatch.');

  const get = await requestR2Object(env, { method: 'GET', bucket: config.privateBucket, key });
  await assertOk(get, 'private GET');
  const returned = new Uint8Array(await get.arrayBuffer());
  if (returned.length !== bytes.length || returned.some((value, index) => value !== bytes[index])) throw new Error('Private GET bytes mismatch.');

  await assertOk(await copyR2Object(env, {
    sourceBucket: config.privateBucket,
    sourceKey: key,
    destinationBucket: config.publicBucket,
    destinationKey,
    contentType: 'image/webp',
    metadataHash: hash
  }), 'public promotion copy');
  await assertOk(await requestR2Object(env, { method: 'HEAD', bucket: config.publicBucket, key: destinationKey }), 'public HEAD');

  let publicOriginVerified = false;
  if (['1', 'true', 'yes'].includes(String(env.R2_SMOKE_VERIFY_PUBLIC || '').toLowerCase())) {
    const publicResponse = await fetch(getPublicMediaUrl(env, destinationKey));
    await assertOk(publicResponse, 'media.chm.lol public GET');
    const publicBytes = new Uint8Array(await publicResponse.arrayBuffer());
    if (publicBytes.length !== bytes.length || publicBytes.some((value, index) => value !== bytes[index])) {
      throw new Error('Public media bytes mismatch.');
    }
    publicOriginVerified = true;
  }

  await assertOk(await requestR2Object(env, { method: 'DELETE', bucket: config.privateBucket, key }), 'private DELETE');
  await assertOk(await requestR2Object(env, { method: 'DELETE', bucket: config.publicBucket, key: destinationKey }), 'public DELETE');

  let cachePurged = false;
  if (String(env.CLOUDFLARE_ZONE_ID || '').trim() && String(env.CLOUDFLARE_API_TOKEN || '').trim()) {
    await purgePublicMediaKey(env, destinationKey);
    cachePurged = true;
  }

  console.log(JSON.stringify({
    skipped: false,
    success: true,
    key,
    destinationKey,
    exactContentLengthEnforced: true,
    publicOriginVerified,
    cachePurged
  }));
} catch (error) {
  try {
    await requestR2Object(env, { method: 'DELETE', bucket: config.privateBucket, key });
    await requestR2Object(env, { method: 'DELETE', bucket: config.publicBucket, key: destinationKey });
    await requestR2Object(env, { method: 'DELETE', bucket: config.privateBucket, key: oversizedKey });
    await requestR2Object(env, { method: 'DELETE', bucket: config.privateBucket, key: undersizedKey });
  } catch {
    // The original error is more useful to the operator; cleanup is retried by
    // the disposable-bucket procedure if the smoke itself fails.
  }
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
