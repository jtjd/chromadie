import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { startVite, startChromium, findAvailablePort, terminateProcess } from './cdp-harness.mjs';

const evidenceDir = join(process.cwd(), 'artifacts', 'homepage-presentation');
await mkdir(evidenceDir, { recursive: true });
let server;
let chromium;
try {
  const appPort = await findAvailablePort(5194);
  server = await startVite({ appPort, evidenceDir });
  chromium = await startChromium({ appUrl: `http://127.0.0.1:${appPort}`, debugPort: await findAvailablePort(9255), evidenceDir, width: 1440, height: 900 });
  const page = chromium.page;
  await page.waitFor('document.querySelector(".homepage-start")', 'homepage sections');
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
  await page.waitFor('document.querySelector(".homepage-start a")?.getAttribute("href").startsWith("/signup")', 'guest signup CTA');

  for (const width of [1440, 768, 390, 320]) {
    await page.setViewport(width, 900);
    await page.evaluate('scrollTo(0,0)');
    if (width >= 1000) assert.ok(await page.evaluate('document.querySelector(".profile-example").getBoundingClientRect().top >= innerHeight - 1'));
    for (const selector of ['.profile-example', '.homepage-collection', '.homepage-community', '.homepage-start', '.homepage-questions']) {
      await page.evaluate(`document.querySelector('${selector}').scrollIntoView({block:'center'})`);
      if (selector === '.profile-example') await page.waitFor('document.querySelector(".profile-example [data-profile-layout-content=sleek]")', 'real profile renderer');
      assert.equal(await page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'), false, `${selector} overflow at ${width}`);
      if (selector === '.homepage-start') {
        assert.equal(await page.evaluate('getComputedStyle(document.querySelector(".homepage-start .homepage-button")).color'), 'rgb(8, 8, 10)', 'CTA text must contrast with the light button');
      }
      await page.screenshot(join(evidenceDir, `${selector.slice(1)}-${width}.png`));
    }
  }
  await page.evaluate('document.querySelector(".homepage-questions summary").focus()');
  await page.pressKey('Enter');
  assert.equal(await page.evaluate('document.querySelector(".homepage-questions details").open'), true);
  console.log('PASS desktop/mobile geometry, actual profile renderer, keyboard FAQ, reduced motion, guest/owner/loading/error CTAs');

  await page.evaluate(`window.presentationTest.error=true; window.presentationTest.stores.session.set({user:{id:'22222222-2222-4222-8222-222222222222'}});window.presentationTest.stores.profile.set({id:'22222222-2222-4222-8222-222222222222',username:'RetryOwner'});window.presentationTest.stores.profileReady.set(true)`);
  await page.waitFor('document.querySelector(".homepage-community [role=alert]")', 'gallery failure');
  await page.evaluate('window.presentationTest.error=false;window.presentationTest.rows=[]');
  await page.click('.homepage-community button', 'retry gallery');
  await page.waitFor('document.querySelector(".homepage-community--empty")', 'honest empty gallery');
  assert.equal(await page.evaluate('document.querySelectorAll(".homepage-player").length'), 0);
  console.log('PASS gallery failure, retry, and empty state');
  await page.evaluate('window.presentationTest.stores.session.set(null);window.presentationTest.stores.profile.set(null)');
  await page.waitFor('document.querySelector(".homepage-start a")?.getAttribute("href").startsWith("/signup")', 'signup available');
  await page.click('.homepage-start a[href^="/signup"]', 'create profile');
  await page.waitFor('location.pathname === "/signup"', 'signup route');
  assert.equal(await page.evaluate('new URLSearchParams(location.search).get("next")'), '/profile/settings');
  console.log('PASS signup returns to profile customization');
} finally {
  await chromium?.page?.close();
  await terminateProcess(chromium?.child, 'Chromium');
  await terminateProcess(server?.child, 'Vite');
}
