import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { startVite, startChromium, terminateProcess, findAvailablePort } from './cdp-harness.mjs';
import { ATMOSPHERE_STUDY_KEYS } from '../../src/lib/profile-atmosphere/atmosphereStudies.js';
const studies = process.argv.includes('--studies');
const studiedKeys = studies ? ATMOSPHERE_STUDY_KEYS : ['dust-light','snowfall','sakura-afterglow','ink-bloom','paper-shadow'];
const evidenceDir = join(process.cwd(), studies ? 'artifacts/atmosphere-studies' : 'artifacts/profile-atmospheres');
await mkdir(evidenceDir, {recursive:true});
const appPort = await findAvailablePort(5285), debugPort = await findAvailablePort(9405);
const server = await startVite({appPort,evidenceDir});
let browser;
const results = [];
try {
  const url = `http://127.0.0.1:${appPort}/scripts/browser/profile-atmospheres.html`;
  browser = await startChromium({appUrl:url,debugPort,evidenceDir,width:1440,height:900});
  const {page} = browser;
  await page.setViewport(1440,900);
  await page.navigate(url);
  await page.waitFor("document.querySelector('select') && document.querySelector('canvas')", 'shared environment mounted');
  const select = async key => {
    await page.evaluate(`(() => {const s=document.querySelector('select');s.value='${key}';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await page.waitFor(`document.querySelector('[data-atmosphere="${key}"]')`, key);
  };
  const pixels = () => page.evaluate(`document.querySelector('canvas').toDataURL()`);
  const delay = () => page.evaluate('new Promise(r=>setTimeout(r,220))');
  for (const key of studiedKeys) {
    await select(key); await delay();
    const before = await pixels(); await delay(); assert.notEqual(await pixels(),before,`${key} moves`);
    await page.screenshot(join(evidenceDir,`${key}-desktop.png`));
    assert.ok(await page.evaluate(`(() => {const c=document.querySelector('canvas');return c.width*c.height<=1800000;})()`), 'pixel budget');
    await page.evaluate(`document.querySelector('#hide').click()`); await delay();
    assert.equal(await page.evaluate(`document.querySelector('[data-atmosphere]').dataset.atmosphereState`),'poster');
    await page.evaluate(`document.querySelector('#hide').click()`); await delay();
    const resumed = await pixels(); await delay(); assert.notEqual(await pixels(),resumed,`${key} resumes`);
    await page.evaluate(`document.querySelector('#motion').click()`); await delay();
    const paused = await pixels(); await delay(); assert.equal(await pixels(),paused,`${key} pauses`);
    await page.evaluate(`document.querySelector('#motion').click()`);
    await page.setReducedMotion(true); await delay();
    const reduced = await pixels(); await delay(); assert.equal(await pixels(),reduced,`${key} reduced motion`);
    await page.screenshot(join(evidenceDir,`${key}-reduced.png`));
    await page.setReducedMotion(false);
    await page.evaluate(`Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'))`);
    await delay(); const hiddenFrame = await pixels(); await delay(); assert.equal(await pixels(),hiddenFrame);
    await page.evaluate(`delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'))`);
    await page.evaluate(`document.querySelector('main').style.marginTop='2000px'`); await delay();
    assert.equal(await page.evaluate(`document.querySelector('[data-atmosphere]').dataset.atmosphereState`),'poster');
    await page.evaluate(`document.querySelector('main').style.marginTop=''`); await delay();
    await page.evaluate(`document.querySelector('#surface').click()`); await delay();
    const publicFrame = await pixels(); await delay(); assert.notEqual(await pixels(),publicFrame);
    await page.screenshot(join(evidenceDir,`${key}-public.png`));
    await page.evaluate(`document.querySelector('#surface').click()`);
    results.push({key,motion:true,publicSurface:true,hiddenDocument:true,offscreen:true,hideShow:true,pause:true,reducedMotion:true});
  }
  for (const key of studies ? [] : ['rain-window','silk-folds']) {
    await select(key);
    await page.waitFor(`document.querySelector('video')?.currentTime > .1`, 'video starts');
    await page.evaluate(`document.querySelector('video').pause()`);
    await page.waitFor(`document.querySelector('video')?.paused === false`, 'unexpected pause recovers');
    const before = await page.evaluate(`document.querySelector('video').currentTime`);
    await delay(); assert.notEqual(await page.evaluate(`document.querySelector('video').currentTime`),before);
    await page.evaluate(`document.querySelector('#hide').click()`); await delay();
    await page.evaluate(`document.querySelector('#hide').click()`);
    await page.waitFor(`document.querySelector('video')?.paused === false`, 'video restores');
    results.push({key,pauseRecovery:true,hideShow:true});
  }
  await page.setViewport(390,844);
  for (const key of studiedKeys) {
    await select(key); await delay(); await page.screenshot(join(evidenceDir,`${key}-mobile.png`));
    assert.equal(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'),true);
  }
  await page.evaluate(`document.querySelector('#compact').click()`);
  for (const key of studiedKeys) {
    await select(key); await delay();
    const card = await page.evaluate(`document.querySelector('.compact canvas').toDataURL()`);
    await delay(); assert.equal(await page.evaluate(`document.querySelector('.compact canvas').toDataURL()`),card);
    await page.screenshot(join(evidenceDir,`${key}-compact.png`));
  }
  await page.evaluate(`document.querySelector('#compact').click()`);
  await page.evaluate(`document.querySelector('a').focus()`); await page.pressKey('Enter');
  assert.equal(await page.evaluate('location.hash'),'#links');
  assert.equal(await page.evaluate(`performance.getEntriesByType('resource').filter(e=>/dust-light.*webm|ink-bloom.*webm|snowfall.*webm|paper-shadow.*webm/.test(e.name)).length`),0);
  if (studies) {
    assert.equal(await page.evaluate(`performance.getEntriesByType('resource').filter(e=>/\\.(webm|mp4)(?:\\?|$)/.test(e.name)).length`),0);
    const timing = await page.evaluate(`(async () => {
      const {drawAtmosphereStudy,STUDY_PAINTERS}=await import('/src/lib/profile-atmosphere/studyScenes.js');
      const c=document.createElement('canvas');c.width=1440;c.height=900;const ctx=c.getContext('2d');
      return Object.keys(STUDY_PAINTERS).map(key=>{
        const times=[];
        for(let i=0;i<35;i++){const start=performance.now();drawAtmosphereStudy(ctx,key,1440,900,i/30);ctx.getImageData(0,0,1,1);if(i>4)times.push(performance.now()-start);}
        times.sort((a,b)=>a-b);return {key,medianMs:times[15],p95Ms:times[28]};
      });
    })()`);
    results.push({drawingTimings:timing});
    assert.ok(timing.every(row=>row.medianMs<1000/30), 'each scene fits the 30fps drawing budget on this runner');
  }
  assert.deepEqual(page.consoleLog.filter(e => e.type === 'exception'),[]);
  await page.evaluate('window.cleanup()');
  assert.equal(await page.evaluate('document.querySelectorAll("canvas,video").length'),0);
  if (studies) {
    await page.setViewport(1440,1120);
    await page.navigate(`http://127.0.0.1:${appPort}/scripts/browser/atmosphere-studies-gallery.html`);
    await page.waitFor('document.querySelectorAll("canvas").length===10', 'comparison gallery');
    await page.screenshot(join(evidenceDir, 'collection.png'));
  }
  await writeFile(join(evidenceDir,'results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({evidenceDir,results}));
} catch (error) { console.error(JSON.stringify(browser?.page?.consoleLog)); if (browser) console.error(await browser.page.evaluate('document.body.innerHTML.slice(0,2500)')); throw error; } finally { await terminateProcess(browser?.child,'Chromium'); await terminateProcess(server?.child,'Vite'); }
