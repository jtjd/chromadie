import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startVite, startChromium, findAvailablePort, terminateProcess } from './cdp-harness.mjs';

const evidenceDir = await mkdtemp(join(tmpdir(), 'chromadie-homepage-atmosphere-'));
console.log(`Browser evidence: ${evidenceDir}`);
let server;
let chromium;
try {
  const appPort = await findAvailablePort(5194);
  server = await startVite({ appPort, evidenceDir });
  chromium = await startChromium({ appUrl: `http://127.0.0.1:${appPort}`, debugPort: await findAvailablePort(9255), evidenceDir, width: 1440, height: 900 });
  const page = chromium.page;
  await page.waitFor('document.querySelector(".homepage-start")', 'homepage sections');
  await page.evaluate(`(async () => {
    const background = new Image();
    background.src = '/homepage/homepage-lower-continuous-v4.webp';
    await background.decode();
    if (!background.naturalWidth) throw new Error('Lower homepage background must load');
  })()`);
  assert.equal(await page.evaluate('getComputedStyle(document.querySelector(".homepage-content"), "::before").zIndex'), '0', 'artwork sits above the opaque canvas');
  assert.equal(await page.evaluate('getComputedStyle(document.querySelector(".homepage-content"), "::before").opacity'), '1', 'background retains visible pigment');
  assert.equal(await page.evaluate('getComputedStyle(document.querySelector(".profile-example")).zIndex'), '1', 'content sits above artwork');
  assert.equal(await page.evaluate('getComputedStyle(document.querySelector(".homepage-content"), "::before").backgroundRepeat'), 'no-repeat', 'one continuous background without tiling');
  assert.equal(await page.evaluate('getComputedStyle(document.querySelector(".homepage-content"), "::before").filter'), 'none', 'artwork renders at authored contrast');
  assert.equal(await page.evaluate('getComputedStyle(document.querySelector(".homepage-content")).backgroundColor'), 'rgba(0, 0, 0, 0)', 'no opaque seam at the hero boundary');
  await page.setReducedMotion(true);
  await page.evaluate(`(async () => {
    const stores = await import('/src/lib/stores.js');
    const {supabase} = await import('/src/lib/supabase.js');
    window.presentationTest = { stores, error: false, rows: [
      {username:'TestAzure',displayName:'Azure',bio:'Test profile with links and color collections.',hexCode:'#5EBAE3',profileAccent:'#5EBAE3',rarity:'Uncommon',identity:'Balanced Vivid Azure',score:38697,rank:1,rollDate:'2026-09-07'},
      {username:'TestPink',displayName:'Pink',hexCode:'#FA3979',profileAccent:'#FA3979',rarity:'Common',identity:'Pink',score:2000,rank:2},
      {username:'TestGreen',displayName:'LongNameForMobileLayout',hexCode:'#67D99B',profileAccent:'#67D99B',rarity:'Common',identity:'Green',score:1000,rank:3}
    ]};
    supabase.rpc = async name => name.startsWith('get_public_discovery')
      ? window.presentationTest.error ? {data:null,error:{message:'Offline'}} : {data:{items:window.presentationTest.rows},error:null}
      : {data:null,error:null};
    stores.authInitialized.set(true); stores.profileLoadFailed.set(false);
    stores.session.set({user:{id:'11111111-1111-4111-8111-111111111111'}});
    stores.profile.set(null); stores.profileReady.set(false);
  })()`);
  await page.waitFor('document.querySelector(".homepage-start [role=status]")', 'loading CTA');
  assert.equal(await page.evaluate('Boolean(document.querySelector(".homepage-start a"))'), false);
  await page.evaluate('window.presentationTest.stores.profileLoadFailed.set(true)');
  await page.waitFor('document.querySelector(".homepage-start [role=alert]")', 'account failure CTA');
  assert.equal(await page.evaluate('Boolean(document.querySelector(".homepage-start a"))'), false);
  await page.evaluate(`(() => {const s=window.presentationTest.stores;s.profileLoadFailed.set(false);s.profile.set({id:'11111111-1111-4111-8111-111111111111',username:'Owner'});s.profileReady.set(true);})()`);
  await page.waitFor('document.querySelector(".homepage-start a")?.getAttribute("href") === "/profile/settings"', 'owner customize CTA');
  await page.waitFor('document.querySelectorAll(".homepage-player").length === 3', 'bounded public gallery');
  await page.evaluate('window.presentationTest.stores.session.set(null);window.presentationTest.stores.profile.set(null);window.presentationTest.stores.profileReady.set(false)');
  await page.waitFor('document.querySelector(".homepage-start__claim-button")', 'guest signup CTA');

  for (const width of [1440, 768, 390, 320]) {
    await page.setViewport(width, 900);
    await page.evaluate('scrollTo(0,0)');
    await page.evaluate('scrollTo(0, Math.max(0, document.querySelector(".homepage-content").getBoundingClientRect().top + scrollY - 360))');
    await page.screenshot(join(evidenceDir, `hero-transition-${width}.png`));
    await page.evaluate('scrollTo(0,0)');
    if (width >= 1000) assert.ok(await page.evaluate('document.querySelector(".profile-example").getBoundingClientRect().top >= innerHeight - 1'));
    for (const selector of ['.profile-example', '.homepage-collection', '.homepage-pricing', '.homepage-community', '.homepage-start', '.homepage-questions', '.site-footer--home']) {
      await page.evaluate(`document.querySelector('${selector}').scrollIntoView({block:'center'})`);
      if (selector === '.profile-example') await page.waitFor('document.querySelector(".profile-example__frame")', 'real profile renderer');
      assert.equal(await page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'), false, `${selector} overflow at ${width}`);
      if (selector === '.homepage-pricing') {
        await page.waitFor('document.querySelector(".homepage-pricing__card")', 'lazy pricing');
        assert.equal(await page.evaluate('document.querySelector(".homepage-pricing").getBoundingClientRect().left === document.querySelector(".homepage-collection").getBoundingClientRect().left'), true, 'lazy pricing shares section alignment');
      }
      if (selector === '.profile-example') {
        assert.equal(await page.evaluate('Boolean(document.querySelector(".profile-example__browser-bar"))'), false);
        if (width === 1440 || width === 390) {
          for (const scene of [0, 1, 2]) {
            await page.evaluate(`document.querySelectorAll('.profile-example__controls button')[${scene}].focus()`);
            await page.pressKey('Enter');
            await page.waitFor(`document.querySelectorAll('.profile-example__controls button')[${scene}].getAttribute('aria-pressed') === 'true'`, 'selected profile scene');
            await page.screenshot(join(evidenceDir, `profile-scene-${scene}-${width}.png`));
          }
        }
        await page.evaluate('document.querySelectorAll(".profile-example__controls button")[2].focus()');
        await page.pressKey('Enter');
        await page.waitFor('document.querySelectorAll(".profile-example__controls button")[2].getAttribute("aria-pressed") === "true"', 'keyboard scene selection');
      }
      if (selector === '.homepage-collection') {
        await page.waitFor('Array.from(document.querySelectorAll(".homepage-collection__art")).length === 3 && Array.from(document.querySelectorAll(".homepage-collection__art")).every(img => img.naturalWidth > 0)', 'three separate collection illustrations');
        if (width >= 768) assert.equal(await page.evaluate('Array.from(document.querySelectorAll(".homepage-collection__specimens article")).every(article => {const a = article.getBoundingClientRect(); const i = article.querySelector("img").getBoundingClientRect(); return Math.abs((a.left + a.width / 2) - (i.left + i.width / 2)) < 1})'), true, 'each emblem aligns with its own label');
        assert.equal(await page.evaluate('Boolean(document.querySelector(".homepage-collection__slots"))'), false, 'no fabricated collection progress');
        assert.equal(await page.evaluate('document.querySelector(".homepage-collection__reward figcaption").textContent.includes("Free name motion")'), true);
      }
      if (selector === '.homepage-start') {
        assert.equal(await page.evaluate('getComputedStyle(document.querySelector(".homepage-start .homepage-button")).color'), 'rgb(8, 8, 10)', 'CTA text must contrast with the light button');
      }
      await page.screenshot(join(evidenceDir, `${selector.slice(1)}-${width}.png`));
    }
  }
  await page.setViewport(1440, 900);
  await page.evaluate('scrollTo(0,0)');
  const capture = await page.command('Page.captureScreenshot', {format:'png', captureBeyondViewport:true, clip:{x:0,y:0,width:1440,height:await page.evaluate('document.documentElement.scrollHeight'),scale:1}});
  await writeFile(join(evidenceDir, 'homepage-full-desktop.png'), Buffer.from(capture.data, 'base64'));
  await page.evaluate('document.querySelector(".homepage-questions summary").focus()');
  await page.pressKey('Enter');
  assert.equal(await page.evaluate('document.querySelector(".homepage-questions details").open'), true);
  console.log('PASS desktop/mobile geometry, actual profile renderer, keyboard FAQ, reduced motion, guest/owner/loading/error CTAs');

  await page.evaluate(`window.presentationTest.error=true; window.presentationTest.stores.session.set({user:{id:'22222222-2222-4222-8222-222222222222'}});window.presentationTest.stores.profile.set({id:'22222222-2222-4222-8222-222222222222',username:'RetryOwner'});window.presentationTest.stores.profileReady.set(true)`);
  await page.waitFor('document.querySelector(".homepage-community [role=alert]")', 'gallery failure');
  await page.evaluate('window.presentationTest.error=false;window.presentationTest.rows=[]');
  await page.click('.homepage-community button', 'retry gallery');
  await page.waitFor('!document.querySelector(".homepage-community")', 'honest empty gallery');
  assert.equal(await page.evaluate('document.querySelectorAll(".homepage-player").length'), 0);
  console.log('PASS gallery failure, retry, and empty state');
  await page.evaluate('window.presentationTest.stores.session.set(null);window.presentationTest.stores.profile.set(null)');
  await page.waitFor('document.querySelector(".homepage-start__claim-button")', 'signup available');
  await page.evaluate('document.querySelector(".homepage-start input").value = "CloudPlayer"; document.querySelector(".homepage-start input").dispatchEvent(new Event("input", {bubbles:true}))');
  await page.click('.homepage-start__claim-button', 'create profile');
  await page.waitFor('location.pathname === "/signup"', 'signup route');
  assert.equal(await page.evaluate('new URLSearchParams(location.search).get("next")'), '/profile/settings');
  console.log('PASS signup returns to profile customization');
} catch (error) {
  if (chromium?.page) {
    await chromium.page.screenshot(join(evidenceDir, 'failure.png')).catch(() => {});
    console.error(await chromium.page.evaluate('({path:location.pathname, preview:document.querySelector(".profile-example")?.innerText})').catch(() => null));
  }
  throw error;
} finally {
  await chromium?.page?.close();
  await terminateProcess(chromium?.child, 'Chromium');
  await terminateProcess(server?.child, 'Vite');
}
