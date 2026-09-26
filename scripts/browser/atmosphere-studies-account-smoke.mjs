import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { ATMOSPHERE_STUDY_KEYS } from '../../src/lib/profile-atmosphere/atmosphereKeys.js';
import { assertLocalSupabaseUrl, findAvailablePort, startVite, startChromium, terminateProcess } from './cdp-harness.mjs';

// A disposable local account exercises the real select -> equip RPC -> anonymous
// public route. Never use the project's possibly remote .env for this mutation.
const local = JSON.parse(execFileSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
assertLocalSupabaseUrl(local.API_URL);
const admin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const client = createClient(local.API_URL, local.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const username = `atmo${Date.now().toString(36)}`;
const email = `${username}@example.test`, password = randomUUID();
const evidenceDir = join(process.cwd(), 'artifacts/atmosphere-studies/account');
await mkdir(evidenceDir, { recursive: true });
let userId, server, owner, visitor;
const results = [];
const networkRetries = [];
async function navigateReady(page, url, condition, label) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const start = page.requestLog.length;
    await page.navigate('about:blank');
    await page.navigate(url);
    try { await page.waitFor(condition, label, 15000); return; }
    catch (error) {
      const interrupted = page.requestLog.slice(start).filter(r => r.errorText === 'net::ERR_NETWORK_CHANGED' && r.url.startsWith(new URL(url).origin));
      if (!interrupted.length || attempt === 3) throw error;
      networkRetries.push({ label, requests: interrupted.map(r => new URL(r.url).pathname) });
    }
  }
}
try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username } });
  assert.ifError(created.error); userId = created.data.user.id;
  const signed = await client.auth.signInWithPassword({ email, password }); assert.ifError(signed.error);
  const appPort = await findAvailablePort(5320), debugPort = await findAvailablePort(9460);
  server = await startVite({ appPort, evidenceDir, environment: { url: local.API_URL, key: local.ANON_KEY } });
  const base = `http://127.0.0.1:${appPort}`;
  owner = await startChromium({ appUrl: 'about:blank', debugPort, evidenceDir });
  const page = owner.page;
  await page.setViewport(1440, 900);
  await navigateReady(page, base, `document.querySelector('.homepage-reference .roll-page')`, 'homepage hydrated');
  await page.evaluate(`(async()=>{const {supabase}=await import('/src/lib/supabase.js');const r=await supabase.auth.setSession(${JSON.stringify({ access_token: signed.data.session.access_token, refresh_token: signed.data.session.refresh_token })});if(r.error)throw new Error(r.error.message);})()`);
  await navigateReady(page, `${base}/profile/settings#customize-appearance`, `document.querySelector('#cosmetic-studio-profile_atmosphere')`, 'real atmosphere picker');
  const visitorPort = await findAvailablePort(debugPort + 1);
  visitor = await startChromium({ appUrl: 'about:blank', debugPort: visitorPort, evidenceDir });
  for (const key of ATMOSPHERE_STUDY_KEYS) {
    const itemKey = `profile_atmosphere_${key.replaceAll('-', '_')}`;
    assert.equal(await page.evaluate(`(() => {const s=document.querySelector('#cosmetic-studio-profile_atmosphere');const o=[...s.options].find(o=>o.value===${JSON.stringify(itemKey)});return Boolean(o&&!o.disabled)})()`), true, `${key} selectable for new free account`);
    await page.evaluate(`(() => {const s=document.querySelector('#cosmetic-studio-profile_atmosphere');s.value=${JSON.stringify(itemKey)};s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await page.waitFor(`document.querySelector('.profile-environment--studio [data-atmosphere="${key}"] canvas')`, `${key} Studio preview`);
    await page.screenshot(join(evidenceDir, `${key}-studio.png`));
    await page.click('.profile-cosmetics-apply:not(:disabled)', 'Update equipped effects');
    await page.waitFor(`document.querySelector('.profile-cosmetics-apply')?.disabled && document.querySelector('.profile-cosmetics-apply')?.textContent.trim() === 'Update equipped effects' && !document.querySelector('.profile-cosmetics-status.error-message')`, 'equip reconciled');
    const profile = await client.rpc('get_my_profile'); assert.ifError(profile.error);
    const row = Array.isArray(profile.data) ? profile.data[0] : profile.data;
    assert.equal(row.equipped_cosmetics.profile_atmosphere, itemKey, 'server persisted selected atmosphere');
    const publicPage = visitor.page;
    await publicPage.setViewport(1440, 900);
    await navigateReady(publicPage, `${base}/${username}`, `document.querySelector('.profile-environment--public [data-atmosphere="${key}"] canvas')`, `${key} anonymous public profile`);
    await publicPage.screenshot(join(evidenceDir, `${key}-public-desktop.png`));
    await publicPage.setViewport(390, 844);
    await publicPage.screenshot(join(evidenceDir, `${key}-public-mobile.png`));
    assert.ok(await publicPage.evaluate('document.documentElement.scrollWidth<=innerWidth'), `${key} no mobile overflow`);
    results.push({ key, selectable: true, studio: true, persisted: true, anonymousPublic: true, mobile: true });
  }
  assert.deepEqual([...owner.page.consoleLog, ...visitor.page.consoleLog].filter(e => e.type === 'exception'), []);
  await writeFile(join(evidenceDir, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ evidenceDir, results, networkRetries }));
} catch (error) {
  if (visitor) {
    await visitor.page.screenshot(join(evidenceDir, 'failure-visitor.png'));
    console.error('Visitor:', await visitor.page.evaluate('document.body.innerText.slice(0,1800)'));
    console.error('Visitor errors:', visitor.page.consoleLog.filter(e=>e.type==='exception'));
    console.error('Failed requests:', visitor.page.requestLog.filter(e=>e.failed||e.status>=400).map(e=>({url:e.url,status:e.status,failed:e.failed})));
  }
  if (owner) {
    await owner.page.screenshot(join(evidenceDir, 'failure-owner.png'));
    console.error(await owner.page.evaluate('document.body.innerText.slice(-2000)'));
    console.error('Owner errors:', owner.page.consoleLog);
    console.error('Owner failed requests:', owner.page.requestLog.filter(e=>e.failed||e.status>=400).map(e=>({url:e.url,status:e.status,failed:e.failed})));
  }
  throw error;
} finally {
  await terminateProcess(owner?.child, 'owner Chromium');
  await terminateProcess(visitor?.child, 'visitor Chromium');
  await terminateProcess(server?.child, 'Vite');
  if (userId) { const deleted = await admin.auth.admin.deleteUser(userId); assert.ifError(deleted.error); }
}
