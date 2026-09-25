import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { startVite, startChromium, findAvailablePort, terminateProcess, loadLocalEnvironment, assertLocalSupabaseUrl } from './cdp-harness.mjs';

assertLocalSupabaseUrl((await loadLocalEnvironment()).url);
const evidenceDir = join(process.cwd(), 'artifacts', 'homepage-account-refinement');
const externalAppUrl = String(process.env.HOMEPAGE_SMOKE_URL || '').trim();
await mkdir(evidenceDir, { recursive: true });
let server;
let chromium;
try {
  const debugPort = await findAvailablePort(9250);
  const appPort = externalAppUrl ? null : await findAvailablePort(5193);
  const appUrl = externalAppUrl || `http://127.0.0.1:${appPort}`;
  if (!externalAppUrl) server = await startVite({ appPort, evidenceDir });
  chromium = await startChromium({ appUrl, debugPort, evidenceDir, width: 1440, height: 900 });
  const page = chromium.page;
  await page.waitFor('document.querySelector(".homepage-reference .roll-page")', 'homepage mount');
  await page.setReducedMotion(true);
  await page.evaluate(`(async () => {
    const stores = await import('/src/lib/stores.js');
    const {supabase} = await import('/src/lib/supabase.js');
    window.homepageTest = {stores, calls: [], daily: true, delayed: false, pending: null, boardError: false, boardRows: []};
    supabase.rpc = async (name) => {
      const test = window.homepageTest;
      test.calls.push(name);
      if (name === 'get_my_daily_roll') {
        const response = {data: test.daily ? {hex_code: '#5EBAE3', identity: 'Balanced Vivid Azure', score: 38697, rarity: 'Uncommon', traits: [], contributors: [], badges: []} : null, error: null};
        if (test.delayed) return new Promise(resolve => test.pending = () => resolve(response));
        return response;
      }
      if (name === 'get_score_percentile') return {data:null,error:null};
      if (name === 'get_my_progression') return {data: {success: true}, error:null};
      if (name.startsWith('get_public_discovery')) return test.boardError ? {data:null,error:{message:'Offline'}} : {data: {items: test.boardRows},error:null};
      return {data:null,error:{message:'Unexpected test RPC: '+name}};
    };
    stores.profileReady.set(false); stores.profileLoadFailed.set(false); stores.profile.set(null);
    stores.authInitialized.set(true);
    stores.session.set({user:{id:'11111111-1111-4111-8111-111111111111'}});
  })()`);
  await page.waitFor('document.querySelector(".roll-page__context--result")', 'daily result before profile hydration');
  assert.equal(await page.evaluate('Boolean(document.querySelector(".roll-page__guest-cta, .guest-prompt--preroll"))'), false);
  await page.evaluate(`(() => { const s=window.homepageTest.stores; s.profile.set({id:'11111111-1111-4111-8111-111111111111',username:'TestPlayer',current_streak:2,total_rolls:36,lifetime_ep:2783640});s.profileReady.set(true); })()`);
  await page.waitFor('document.querySelector(".roll-page__streak")?.textContent.includes("2-day streak")', 'account details update without another roll');
  assert.equal(await page.evaluate('Boolean(document.querySelector(".roll-page__guest-cta"))'), false);
  assert.equal(await page.evaluate('document.querySelector(".roll-acquisition-actions .result-action--primary")?.textContent'), 'View your profile');
  assert.equal(await page.evaluate('document.querySelector(".roll-acquisition-actions__next-steps")?.textContent.includes("Customize your profile")'), true);
  assert.equal(await page.evaluate('document.querySelector(".roll-acquisition-actions__next-steps")?.textContent.includes("Explore leaderboard")'), true);
  const dedicatedActionLayout = await page.evaluate(`(() => {
    const summary = document.querySelector('.roll-result-summary')?.getBoundingClientRect();
    const actions = document.querySelector('.roll-acquisition-actions--dedicated');
    const image = actions?.querySelector('[data-roll-action=share-image]')?.getBoundingClientRect();
    const share = [...(actions?.querySelectorAll('button') || [])].find(button => button.textContent.includes('Share result'))?.getBoundingClientRect();
    return {
      summaryBottom: summary?.bottom ?? -1,
      actionsTop: actions?.getBoundingClientRect().top ?? -1,
      imageTop: image?.top ?? -1,
      shareTop: share?.top ?? -1,
      sharedGroup: Boolean(actions?.querySelector('[data-roll-action=share-image]')?.closest('.post-score-actions--dedicated'))
    };
  })()`);
  assert.ok(dedicatedActionLayout.actionsTop >= dedicatedActionLayout.summaryBottom - 1, JSON.stringify(dedicatedActionLayout));
  assert.ok(dedicatedActionLayout.imageTop >= dedicatedActionLayout.summaryBottom - 1 && dedicatedActionLayout.shareTop >= dedicatedActionLayout.summaryBottom - 1, JSON.stringify(dedicatedActionLayout));
  assert.equal(dedicatedActionLayout.sharedGroup, true, JSON.stringify(dedicatedActionLayout));
  console.log('PASS delayed profile hydration updates live account controls');
  await page.click('.roll-result-summary__breakdown', 'full breakdown').catch(async () => {
    await page.evaluate(`([...document.querySelectorAll('button')].find(b => b.textContent.includes('View full breakdown'))).click()`);
  });
  await page.waitFor('document.querySelector("[role=dialog]")', 'score breakdown dialog');
  await page.pressKey('Escape');
  await page.waitFor('!document.querySelector("[role=dialog]")', 'close breakdown with Escape');

  for (const [width,height] of [[2048,1024],[1440,900],[1280,720],[1024,900],[768,1024],[390,844],[320,812]]) {
    await page.setViewport(width,height);
    await page.evaluate('document.fonts.ready');
    const geometry = await page.evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth, action:document.querySelector('.roll-acquisition-actions .result-action--primary')?.getBoundingClientRect().toJSON(), heading:document.querySelector('.roll-page__context h1')?.getBoundingClientRect().toJSON()})`);
    assert.ok(geometry.scroll <= width + 1, JSON.stringify(geometry));
    assert.ok(geometry.action.width > 0 && geometry.action.left >= 0 && geometry.action.right <= width, JSON.stringify(geometry));
    assert.equal(await page.evaluate('document.querySelectorAll(".homepage-content .homepage-section").length'), 0, 'Removed homepage sections must stay unmounted');
    assert.ok(await page.evaluate('(() => { const r=document.querySelector(".roll-page__game").getBoundingClientRect();return Math.abs((r.left+r.right)/2-innerWidth/2)<=1;})()'), 'Result hero stays horizontally centered');
    await page.screenshot(join(evidenceDir, `result-${width}.png`));
  }
  await page.setViewport(1440,900);
  await page.evaluate(`window.homepageTest.stores.session.set({user:{id:'11111111-1111-4111-8111-111111111111'},access_token:'test-renewed'})`);
  await page.waitFor('document.querySelector(".roll-page__streak")', 'same-account refresh');
  assert.equal(await page.evaluate('window.homepageTest.calls.filter(n=>n==="get_my_daily_roll").length'), 1);

  await page.evaluate(`window.homepageTest.stores.profileLoadFailed.set(true)`);
  await page.waitFor('document.querySelector(".roll-page__context [role=alert]")', 'profile error');
  assert.equal(await page.evaluate('Boolean(document.querySelector(".roll-page__guest-cta, .roll-page__streak"))'), false);
  await page.evaluate(`window.homepageTest.stores.profileLoadFailed.set(false)`);
  await page.waitFor('document.querySelector(".roll-page__streak")', 'profile retry recovery');

  await page.evaluate(`(() => {const t=window.homepageTest;t.boardError=true;t.delayed=true;t.stores.profile.set({id:'22222222-2222-4222-8222-222222222222',username:'SecondPlayer',current_streak:4,total_rolls:9,lifetime_ep:9000});t.stores.session.set({user:{id:'22222222-2222-4222-8222-222222222222'}});})()`);
  await page.waitFor('window.homepageTest.pending !== null', 'second-account read held');
  assert.equal(await page.evaluate('Boolean(document.querySelector(".roll-page__context--result"))'), false);
  await page.evaluate('window.homepageTest.pending()');
  await page.waitFor('document.querySelector(".roll-page__context--result") && document.querySelector(".roll-page__streak")?.textContent.includes("4-day streak")', 'profile-before-roll hydration');
  console.log('PASS profile errors, token refresh, and account switch');

  await page.evaluate(`(() => {const t=window.homepageTest;t.delayed=false;t.stores.session.set(null);t.stores.profile.set(null);t.stores.profileReady.set(false);})()`);
  await page.waitFor('document.querySelector(".guest-prompt--preroll")', 'signed-out prompt');
  assert.equal(await page.evaluate('Boolean(document.querySelector(".roll-page__context--result"))'), false);
  assert.equal(await page.evaluate('window.homepageTest.calls.some(n=>/^(roll_die|publish_|save_)/.test(n))'), false);
  console.log('PASS logout clears account result; hydration never performs a roll mutation');

  await page.evaluate(`(() => {const value=JSON.stringify({date:new Date().toISOString().slice(0,10),hex:'#5EBAE3',score:38697,rarity:'Uncommon',identity:'Balanced Vivid Azure',badges:[],contributors:[]});localStorage.setItem('chromadie-roll',value);window.dispatchEvent(new StorageEvent('storage',{key:'chromadie-roll',newValue:value}));})()`);
  await page.waitFor('document.querySelector(".roll-page__guest-cta")', 'restored guest result');
  assert.ok(await page.evaluate('document.querySelector(".roll-page__description").textContent.includes("saved on this device")'));
  assert.equal(await page.evaluate('Boolean(document.querySelector(".roll-page__streak"))'),false);
  assert.equal(await page.evaluate('document.querySelector(".roll-acquisition-actions__next-steps")?.textContent.includes("Browse the leaderboard")'), true);
  await page.screenshot(join(evidenceDir,'guest-result.png'));
  await page.evaluate(`(() => {localStorage.removeItem('chromadie-roll');window.dispatchEvent(new StorageEvent('storage',{key:'chromadie-roll'}));})()`);
  await page.waitFor('document.querySelector(".guest-prompt--preroll")', 'guest return to preroll');
  console.log('PASS restored guest copy never promises account persistence');

  // Feed errors and populated responses use the same bounded public RPC.
  await page.waitFor('document.querySelector(".homepage-best-roll [role=alert] button")', 'public board error retry');
  await page.evaluate(`(() => {const t=window.homepageTest;t.boardError=false;t.boardRows=[{username:'PublicPlayer',display_name:'Public Player',hex_code:'#5EBAE3',score:38697,rarity:'Uncommon',identity:'Balanced Vivid Azure',rank:1,contributors:[]}];})()`);
  await page.click('.homepage-best-roll [role=alert] button','retry public board');
  await page.waitFor('document.querySelector(".homepage-best-roll__identity-name")?.textContent.includes("Public")', 'populated public spotlight');
  await page.screenshot(join(evidenceDir,'populated-preroll.png'));
  console.log('PASS public feed failure/retry and populated spotlight');
  const profileLink = await page.evaluate('document.querySelector(".homepage-best-roll__identity-link")?.getAttribute("href")');
  assert.equal(profileLink, '/publicplayer', 'Top roller must link to the real public profile');
  for (const [width, height] of [[1440, 900], [768, 1024], [390, 844], [320, 812]]) {
    await page.setViewport(width, height);
    await page.evaluate('document.fonts.ready');
    const geometry = await page.evaluate(`(() => {
      const card = document.querySelector('.homepage-best-roll').getBoundingClientRect();
      return { scroll: document.documentElement.scrollWidth, left: card.left, right: card.right, viewport: innerWidth };
    })()`);
    assert.ok(geometry.scroll <= width + 1 && geometry.left >= -1 && geometry.right <= width + 1, JSON.stringify(geometry));
    await page.screenshot(join(evidenceDir, `top-roll-${width}.png`));
  }
  console.log('PASS real top-roll profile link and responsive homepage');
} catch (error) {
  if (chromium?.page) {
    await writeFile(join(evidenceDir, 'failure.json'), JSON.stringify({
      message: error.message,
      page: await chromium.page.evaluate('({path: location.pathname, text: document.body.innerText.slice(0, 4000)})').catch(() => null),
      console: chromium.page.consoleLog,
      requests: chromium.page.requestLog
    }, null, 2));
  }
  throw error;
} finally {
  await chromium?.page?.close();
  await terminateProcess(chromium?.child,'Chromium');
  await terminateProcess(server?.child,'Vite');
}
