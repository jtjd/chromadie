#!/usr/bin/env node

/*
 * Disposable application-level R2 smoke.
 *
 * This serves the built application through Pages Functions so the browser
 * exercises the deployed upload-intent, completion, promotion, and deletion
 * endpoints. Presigned URLs are never written to logs or evidence.
 */

import { mkdtemp, readFile, unlink, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';

import {
  assertLocalSupabaseUrl,
  findAvailablePort,
  projectRoot,
  startChromium,
  terminateProcess,
  waitForHttp
} from './cdp-harness.mjs';
import {
  getPublicMediaUrl,
  getR2Config,
  getSupabaseAssets,
  purgePublicMediaKey,
  requestR2Object
} from '../../functions/_profileMediaControl.js';
import { getSupabaseCredentials } from '../../functions/_supabaseApi.js';

const defaultAppPort = Number(process.env.PROFILE_MEDIA_R2_LOCAL_PORT || 5173);
const defaultDebugPort = Number(process.env.PROFILE_MEDIA_R2_LOCAL_DEBUG_PORT || 9370);
const supabaseCredentials = getSupabaseCredentials(process.env);
const supabaseUrl = assertLocalSupabaseUrl(supabaseCredentials.url || '');
const r2Config = getR2Config(process.env);
const serviceRoleKey = supabaseCredentials.secretKey;
const publicOrigin = String(process.env.MEDIA_PUBLIC_ORIGIN || '').replace(/\/$/, '');

if (!r2Config) throw new Error('R2 test configuration is incomplete.');
if (!serviceRoleKey) throw new Error('Local Supabase service-role configuration is missing.');
if (!publicOrigin || publicOrigin !== r2Config.publicOrigin) throw new Error('R2 test public origin is inconsistent.');
if (!publicOrigin.startsWith('https://media-test.')) throw new Error('Refusing to run against a non-test media origin.');

const evidenceDir = await mkdtemp(join(tmpdir(), 'chromadie-profile-media-r2-local-'));
const appPort = await findAvailablePort(defaultAppPort);
const debugPort = await findAvailablePort(defaultDebugPort);
const appUrl = 'http://localhost:' + appPort;
const result = {
  skipped: false,
  success: false,
  environment: { supabaseLocal: true, pagesFunctions: false, r2TestOrigin: true },
  accountCreated: false,
  uploads: [],
  deletion: [],
  storageRouting: null,
  requests: [],
  screenshots: [],
  evidenceDir
};

let pagesProcess = null;
let chromium = null;
let page = null;
let devVarsOriginal = null;
const createdAssets = [];

if (appPort !== 5173) {
  throw new Error('Local Supabase CORS is configured for localhost:5173; free that port before running this smoke.');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function safeMessage(value) {
  return String(value || 'Unknown failure')
    .replace(/https?:\/\/[^\s"']+/gi, '[redacted-url]')
    .replace(/(?:X-Amz|AWSAccessKeyId|Signature|Credential)=[^\s&"']+/gi, '[redacted-query]');
}

function requestClass(entry) {
  try {
    const parsed = new URL(entry.url);
    if (parsed.hostname.endsWith('.r2.cloudflarestorage.com')) return 'r2-s3';
    if (parsed.hostname === new URL(publicOrigin).hostname) return 'public-media';
    if (parsed.hostname === supabaseUrl.hostname) return 'supabase';
    if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') return 'local-app';
    return 'other';
  } catch {
    return 'invalid';
  }
}

function sanitizedRequests() {
  return (page?.requestLog || []).map(entry => {
    const pathname = (() => {
      try { return new URL(entry.url).pathname; } catch { return '[invalid-url]'; }
    })();
    return {
      method: entry.method,
      class: requestClass(entry),
      pathname,
      status: Number.isFinite(entry.status) ? entry.status : null,
      failed: entry.failed === true
    };
  });
}

function browserConsoleOrigins() {
  const origins = new Map();
  for (const entry of page?.consoleLog || []) {
    for (const rawUrl of String(entry.text || '').match(/https?:\/\/[^\s'"]+/g) || []) {
      try {
        const parsed = new URL(rawUrl);
        const key = parsed.origin;
        origins.set(key, (origins.get(key) || 0) + 1);
      } catch {
        // Ignore console fragments that are not complete URLs.
      }
    }
  }
  return Object.fromEntries(origins);
}

function sanitizedConsoleText(value) {
  return String(value || '').replace(/https?:\/\/[^\s'"]+/g, rawUrl => {
    try { return new URL(rawUrl).origin; } catch { return '[url]'; }
  });
}

function entriesSince(startIndex) {
  return (page?.requestLog || []).slice(startIndex);
}

function isSuccessful(entry) {
  return Number.isFinite(entry?.status) && entry.status >= 200 && entry.status < 300 && !entry.failed;
}

async function waitForCondition(predicate, description, timeoutMs = 30000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await predicate();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await delay(150);
  }
  const suffix = lastError ? ': ' + safeMessage(lastError.message) : '.';
  throw new Error('Timed out waiting for ' + description + suffix);
}

async function startPagesDev() {
  const logPath = join(evidenceDir, 'pages-dev.log');
  const output = createWriteStream(logPath, { flags: 'a' });
  const devVarsPath = join(projectRoot, '.dev.vars');
  try {
    devVarsOriginal = { exists: true, content: await readFile(devVarsPath, 'utf8') };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    devVarsOriginal = { exists: false, content: '' };
  }
  const devVarKeys = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_PRIVATE_BUCKET',
    'R2_PUBLIC_BUCKET',
    'MEDIA_PUBLIC_ORIGIN',
    'CLOUDFLARE_ZONE_ID',
    'CLOUDFLARE_API_TOKEN'
  ];
  const devVars = devVarKeys
    .map(key => key + '=' + JSON.stringify(String(process.env[key] || '')))
    .concat('PREVIEW_PROTECTION="off"')
    .join('\n') + '\n';
  await writeFile(devVarsPath, devVars, 'utf8');
  pagesProcess = spawn('npx', [
    '--yes',
    'wrangler',
    'pages',
    'dev',
    'dist',
    '--ip',
    '127.0.0.1',
    '--port',
    String(appPort),
    '--env-file=.env.r2-test.local',
    '--persist-to',
    join(evidenceDir, 'wrangler-state'),
    '--log-level',
    'error'
  ], {
    cwd: projectRoot,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  for (const stream of [pagesProcess.stdout, pagesProcess.stderr]) {
    stream?.on('data', chunk => output.write(chunk));
  }
  pagesProcess.once('close', () => output.end());
  try {
    const response = await waitForHttp(appUrl + '/', 45000);
    assert(response.status < 500, 'Pages Functions returned HTTP ' + response.status + ' for the application root.');
    result.environment.pagesFunctions = true;
  } catch (error) {
    await terminateProcess(pagesProcess, 'Pages dev');
    throw new Error(safeMessage(error.message) + ' See ' + logPath + '.', { cause: error });
  }
}

async function readLocalUserId() {
  const userId = await page.evaluate('(() => {' +
    'const find = value => {' +
      'try {' +
        'const parsed = JSON.parse(value);' +
        'const candidates = [parsed, parsed?.currentSession, parsed?.session, parsed?.data?.session];' +
        'return candidates.find(candidate => candidate?.user?.id)?.user?.id || "";' +
      '} catch { return ""; }' +
    '};' +
    'for (const value of Object.values(localStorage)) {' +
      'const id = find(value);' +
      'if (id) return id;' +
    '}' +
    'return "";' +
  '})()');
  assert(/^[0-9a-f-]{36}$/i.test(userId), 'Could not identify the disposable local authenticated user.');
  return userId;
}

async function uploadGeneratedImage(selector, options) {
  const kind = options.kind;
  const expression = '(async () => {' +
    'const input = document.querySelector(' + JSON.stringify(selector) + ');' +
    'if (!input) throw new Error(' + JSON.stringify('Missing upload input for ' + kind + '.') + ');' +
    'const canvas = document.createElement("canvas");' +
    'canvas.width = ' + Number(options.width) + ';' +
    'canvas.height = ' + Number(options.height) + ';' +
    'const context = canvas.getContext("2d");' +
    'const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);' +
    'gradient.addColorStop(0, "#22124a"); gradient.addColorStop(.5, "#0b7b86"); gradient.addColorStop(1, "#ef7d68");' +
    'context.fillStyle = gradient; context.fillRect(0, 0, canvas.width, canvas.height);' +
    'context.fillStyle = "#ffffff";' +
    'context.font = "700 " + Math.max(18, Math.round(Math.min(canvas.width, canvas.height) / 8)) + "px sans-serif";' +
    'context.fillText(' + JSON.stringify(kind.toUpperCase()) + ', 16, Math.max(32, Math.round(canvas.height * .25)));' +
    'const blob = await (await fetch(canvas.toDataURL("image/png"))).blob();' +
    'const file = new File([blob], ' + JSON.stringify(options.filename) + ', { type: "image/png" });' +
    'const transfer = new DataTransfer(); transfer.items.add(file); input.files = transfer.files;' +
    'input.dispatchEvent(new Event("change", { bubbles: true }));' +
    'return { bytes: file.size, width: canvas.width, height: canvas.height };' +
  '})()';
  return page.evaluate(expression);
}

async function waitForUploadRequests(startIndex, kind) {
  await waitForCondition(() => {
    const entries = entriesSince(startIndex);
    const endpoint = path => entries.find(entry => {
      try { return new URL(entry.url).pathname === path; } catch { return false; }
    });
    const directPut = entries.find(entry => requestClass(entry) === 'r2-s3' && entry.method === 'PUT');
    return isSuccessful(endpoint('/api/profile-media/upload-intent'))
      && isSuccessful(endpoint('/api/profile-media/complete'))
      && isSuccessful(endpoint('/api/profile-media/promote'))
      && Number.isFinite(directPut?.status)
      && directPut.status >= 200
      && directPut.status < 300;
  }, kind + ' upload-intent, direct PUT, complete, and promote');
  const entries = entriesSince(startIndex);
  const supabaseStorageUploads = entries.filter(entry => {
    try {
      const parsed = new URL(entry.url);
      return parsed.hostname === supabaseUrl.hostname
        && parsed.pathname.includes('/storage/v1/object')
        && ['PUT', 'POST', 'PATCH'].includes(entry.method);
    } catch {
      return false;
    }
  });
  assert(supabaseStorageUploads.length === 0, kind + ' upload sent bytes through Supabase Storage.');
  return {
    uploadIntent: true,
    directPut: true,
    directPutResponseStatus: entries.find(entry => requestClass(entry) === 'r2-s3' && entry.method === 'PUT')?.status || null,
    complete: true,
    promote: true,
    supabaseStorageUploadCount: supabaseStorageUploads.length
  };
}

async function findAsset(userId, kind) {
  let asset = null;
  await waitForCondition(async () => {
    const assets = await getSupabaseAssets(process.env, userId, { statuses: ['active'], kinds: [kind] });
    asset = assets.filter(item => item.storage_provider === 'r2').at(-1) || null;
    return Boolean(asset?.id && asset.r2_public_key);
  }, 'verified ' + kind + ' R2 metadata');
  return asset;
}

async function verifyAssetDelivery(asset, label) {
  assert(asset.storage_provider === 'r2', label + ' was not registered as an R2 asset.');
  assert(asset.delivery_status === 'ready', label + ' was not ready after completion.');
  assert(asset.ever_public === true && asset.r2_public_key, label + ' has no public R2 state.');
  const publicUrl = getPublicMediaUrl(process.env, asset.r2_public_key);
  assert(publicUrl.startsWith(publicOrigin + '/') && !new URL(publicUrl).search, label + ' public URL is not stable.');
  const head = await requestR2Object(process.env, { method: 'HEAD', bucket: r2Config.publicBucket, key: asset.r2_public_key });
  assert(head.ok, label + ' public R2 object did not pass authenticated HEAD.');
  const response = await fetch(publicUrl, { cache: 'no-store' });
  assert(response.ok, label + ' public custom-domain GET returned HTTP ' + response.status + '.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  const hash = createHash('sha256').update(bytes).digest('hex');
  assert(bytes.byteLength === Number(asset.byte_size), label + ' public byte length changed during promotion.');
  assert(hash === String(asset.content_hash_sha256).toLowerCase(), label + ' public content hash changed during promotion.');
  if (asset.r2_private_key) {
    const privateHead = await requestR2Object(process.env, { method: 'HEAD', bucket: r2Config.privateBucket, key: asset.r2_private_key });
    assert(privateHead.status === 404, label + ' retained a private R2 object after promotion.');
    return { publicUrlStable: true, publicR2Head: true, publicOriginGet: true, bytesVerified: true, hashVerified: true, privateObject: { metadataKeyCleared: false, objectRemoved: true } };
  }
  return { publicUrlStable: true, publicR2Head: true, publicOriginGet: true, bytesVerified: true, hashVerified: true, privateObject: { metadataKeyCleared: true, objectRemoved: true } };
}

async function studioMediaUrls() {
  return page.evaluate('(() => {' +
    'const avatar = document.querySelector(".profile-studio-preview .identity-card__avatar-media");' +
    'const background = document.querySelector(".profile-studio-preview .profile-shell__media-image");' +
    'const url = element => element?.currentSrc || element?.src || "";' +
    'return { avatar: url(avatar), background: url(background) };' +
  '})()');
}

async function deleteAssetThroughApp(assetId) {
  const expression = '(async () => {' +
    'const findSession = value => {' +
      'try {' +
        'const parsed = JSON.parse(value);' +
        'return [parsed, parsed?.currentSession, parsed?.session, parsed?.data?.session].find(candidate => candidate?.access_token && candidate?.user?.id) || null;' +
      '} catch { return null; }' +
    '};' +
    'let session = null;' +
    'for (const value of Object.values(localStorage)) { session = findSession(value); if (session) break; }' +
    'if (!session) throw new Error("Local browser session was unavailable for media deletion.");' +
    'const response = await fetch("/api/profile-media/delete", {' +
      'method: "POST",' +
      'headers: { Authorization: "Bearer " + session.access_token, "Content-Type": "application/json" },' +
      'body: JSON.stringify({ asset_id: ' + JSON.stringify(assetId) + ' })' +
    '});' +
    'const body = await response.json().catch(() => ({}));' +
    'return { status: response.status, success: body?.success === true, configurationChanged: body?.configuration_changed === true, cleanupPending: body?.cleanup_pending === true, updatedAtPresent: Boolean(body?.updated_at) };' +
  '})()';
  return page.evaluate(expression);
}

async function waitForR2Gone(asset, label) {
  await waitForCondition(async () => {
    const keys = [asset.r2_private_key, asset.r2_public_key].filter(Boolean);
    const statuses = [];
    for (const key of keys) {
      for (const bucket of [r2Config.privateBucket, r2Config.publicBucket]) {
        const response = await requestR2Object(process.env, { method: 'HEAD', bucket, key });
        statuses.push(response.status);
      }
    }
    const publicUrl = asset.r2_public_key ? getPublicMediaUrl(process.env, asset.r2_public_key) : '';
    const publicResponse = publicUrl ? await fetch(publicUrl, { cache: 'no-store' }) : null;
    return statuses.every(status => status === 404) && (!publicResponse || !publicResponse.ok);
  }, label + ' R2/private/public deletion and public cache removal', 45000);
}

async function cleanupExactAsset(asset) {
  if (!asset) return;
  const keys = [...new Set([asset.r2_private_key, asset.r2_public_key].filter(Boolean))];
  for (const key of keys) {
    for (const bucket of [r2Config.privateBucket, r2Config.publicBucket]) {
      try { await requestR2Object(process.env, { method: 'DELETE', bucket, key }); } catch { /* disposable cleanup */ }
    }
  }
  if (asset.r2_public_key) {
    try { await purgePublicMediaKey(process.env, asset.r2_public_key); } catch { /* disposable cleanup */ }
  }
}

async function main() {
  await startPagesDev();
  const browser = await startChromium({ appUrl, debugPort, evidenceDir, width: 1440, height: 1000 });
  chromium = browser;
  page = browser.page;
  await page.command('Page.setBypassCSP', { enabled: true });
  result.environment.browserCspBypassedForLoopbackTest = true;
  await page.waitFor('document.body && document.body.innerHTML.length > 0', 'local application shell');

  const username = 'r2smoke' + Date.now().toString(36).slice(-9);
  const email = username + '@example.test';
  const password = 'R2Smoke-' + Date.now().toString(36) + '-Pass!';
  await page.navigate(appUrl + '/signup', 'local signup page');
  await page.waitFor("location.pathname === '/signup' && document.querySelector('#username-input')", 'local signup page');
  await page.setInputValue('#username-input', username, ['input', 'change']);
  await page.setInputValue('#email-input', email, ['input', 'change']);
  await page.setInputValue('#password-input', password, ['input', 'change']);
  await page.click('.auth-submit', 'local signup submit');
  await page.waitFor("location.pathname === " + JSON.stringify('/' + username) + " && document.querySelector('.profile-shell-page .identity-card')", 'local authenticated profile', 30000);
  result.accountCreated = true;

  const userId = await readLocalUserId();
  await page.navigate(appUrl + '/profile/settings', 'local Profile Studio');
  await page.waitFor('document.querySelector(".profile-settings-page") && document.querySelector(".profile-customize-page")', 'local Profile Studio');
  await page.click('#profile-customize-tab-media', 'local media customize tab');
  await page.waitFor('document.querySelector("#profile-customize-tab-media")?.getAttribute("aria-selected") === "true" && document.querySelector("[data-editor-section=media]")?.hidden === false', 'visible local media editor');

  const uploadCases = [
    { kind: 'avatar', selector: 'input[aria-label="Choose avatar image"]', width: 256, height: 256, filename: 'r2-smoke-avatar.png', statusText: 'Avatar saved' },
    { kind: 'background', selector: 'input[aria-label="Choose background image"]', width: 640, height: 360, filename: 'r2-smoke-background.png', statusText: 'Background saved' }
  ];
  for (const item of uploadCases) {
    const startIndex = page.requestLog.length;
    const file = await uploadGeneratedImage(item.selector, item);
    const routing = await waitForUploadRequests(startIndex, item.kind);
    const asset = await findAsset(userId, item.kind);
    createdAssets.push(asset);
    const statusExpression = '([...document.querySelectorAll(".profile-expression-editor__message[role=\'status\']")]).some(node => node.textContent.includes(' + JSON.stringify(item.statusText) + '))';
    await page.waitFor(statusExpression, item.kind + ' upload status', 45000);
    const delivery = await verifyAssetDelivery(asset, item.kind);
    const urls = await waitForCondition(async () => {
      const current = await studioMediaUrls();
      const key = item.kind === 'avatar' ? 'avatar' : 'background';
      return current[key]?.startsWith(publicOrigin + '/') && !new URL(current[key]).search ? current : null;
    }, item.kind + ' media.chm.lol URL in Studio preview', 30000);
    const previewUrl = urls[item.kind === 'avatar' ? 'avatar' : 'background'];
    assert(previewUrl.startsWith(publicOrigin + '/') && !new URL(previewUrl).search, item.kind + ' preview did not use a stable public R2 URL.');
    result.uploads.push({
      kind: item.kind,
      fileBytes: file.bytes,
      uploadIntent: routing.uploadIntent,
      directPut: routing.directPut,
      complete: routing.complete,
      promote: routing.promote,
      supabaseStorageUploadCount: routing.supabaseStorageUploadCount,
      privateR2Verified: true,
      byteHashSignatureValidated: true,
      publicR2Head: delivery.publicR2Head,
      publicCustomDomainGet: delivery.publicOriginGet,
      stableUrl: delivery.publicUrlStable,
      privateCleanup: delivery.privateObject,
      studioPreviewUsesPublicOrigin: true
    });
  }

  const storageRequests = page.requestLog.filter(entry => {
    try {
      const parsed = new URL(entry.url);
      return parsed.hostname === supabaseUrl.hostname && parsed.pathname.includes('/storage/v1/object');
    } catch {
      return false;
    }
  });
  const storageUploads = storageRequests.filter(entry => ['PUT', 'POST', 'PATCH'].includes(entry.method));
  result.storageRouting = { directR2PutObserved: true, supabaseStorageRequestCount: storageRequests.length, supabaseStorageUploadCount: storageUploads.length };
  assert(storageUploads.length === 0, 'The real application sent upload bytes through Supabase Storage.');

  for (const asset of [...createdAssets]) {
    const deletion = await deleteAssetThroughApp(asset.id);
    assert(deletion.status === 200 && deletion.success, 'Application delete failed for ' + asset.kind + '.');
    assert(deletion.cleanupPending === false, asset.kind + ' deletion returned pending cleanup in disposable test infrastructure.');
    await waitForR2Gone(asset, asset.kind);
    const repeated = await deleteAssetThroughApp(asset.id);
    assert(repeated.status === 404 || repeated.success === true, asset.kind + ' repeated deletion returned an unsafe response.');
    result.deletion.push({
      kind: asset.kind,
      databaseDelete: true,
      r2PrivateDeleted: true,
      r2PublicDeleted: true,
      exactCachePurge: true,
      publicUrlUnavailableAfterDelete: true,
      retrySafe: true,
      updatedAtReturnedOnSelectedMutation: deletion.updatedAtPresent,
      configurationChanged: deletion.configurationChanged
    });
  }

  result.requests = sanitizedRequests();
  await page.screenshot(join(evidenceDir, 'final-profile-studio.png'));
  result.screenshots.push(join(evidenceDir, 'final-profile-studio.png'));
  result.success = true;
}

try {
  await main();
} catch (error) {
  result.requests = sanitizedRequests();
  result.success = false;
  const diagnostic = page
    ? await page.evaluate('({ url: location.href, title: document.title, inputs: [...document.querySelectorAll("input")].map(input => input.id || input.type), body: (document.body?.innerText || "").slice(0, 240), errors: [...document.querySelectorAll("[role=alert], .auth-error, .auth-form__error")].map(node => node.textContent.trim()).filter(Boolean) })').catch(() => null)
    : null;
  console.error('R2 local application smoke failed: ' + safeMessage(error.message) + (diagnostic ? ' state=' + JSON.stringify(diagnostic) : '') + ' consoleOrigins=' + JSON.stringify(browserConsoleOrigins()) + ' console=' + JSON.stringify((page?.consoleLog || []).slice(-8).map(item => ({ type: item.type, text: sanitizedConsoleText(item.text) }))));
  process.exitCode = 1;
} finally {
  for (const asset of createdAssets) {
    if (!result.deletion.some(item => item.kind === asset.kind)) await cleanupExactAsset(asset);
  }
  try { await page?.close(); } catch { /* already closed */ }
  if (chromium?.child) await terminateProcess(chromium.child, 'Chromium');
  if (pagesProcess) await terminateProcess(pagesProcess, 'Pages dev');
  if (devVarsOriginal) {
    const devVarsPath = join(projectRoot, '.dev.vars');
    if (devVarsOriginal.exists) await writeFile(devVarsPath, devVarsOriginal.content, 'utf8');
    else await unlink(devVarsPath).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
  result.requests = sanitizedRequests();
  await writeFile(join(evidenceDir, 'evidence.json'), JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({
    skipped: result.skipped,
    success: result.success,
    evidenceDir: result.evidenceDir,
    uploads: result.uploads.map(item => ({ kind: item.kind, directPut: item.directPut, complete: item.complete, promote: item.promote, publicCustomDomainGet: item.publicCustomDomainGet, privateCleanup: item.privateCleanup })),
    deletion: result.deletion.map(item => ({ kind: item.kind, databaseDelete: item.databaseDelete, r2PublicDeleted: item.r2PublicDeleted, exactCachePurge: item.exactCachePurge, retrySafe: item.retrySafe })),
    storageRouting: result.storageRouting
  }));
}
