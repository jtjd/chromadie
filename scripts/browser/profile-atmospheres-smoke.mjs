import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { startVite, startChromium, terminateProcess, findAvailablePort } from './cdp-harness.mjs';
const evidenceDir = join(process.cwd(), 'artifacts/profile-atmospheres');
await mkdir(evidenceDir, {recursive:true});
const appPort = await findAvailablePort(5285), debugPort = await findAvailablePort(9405);
const server = await startVite({appPort,evidenceDir});
let browser;
const results = [];
try {
  const url = `http://127.0.0.1:${appPort}/scripts/browser/profile-atmospheres.html`;
  browser = await startChromium({appUrl:url,debugPort,evidenceDir,width:1440,height:900});
  const {page} = browser;
  await page.navigate(url);
  await page.waitFor("document.querySelector('select') && document.querySelector('canvas')", 'shared environment mounted');
  const select = async key => {
    await page.evaluate(`(() => {const s=document.querySelector('select');s.value='${key}';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await page.waitFor(`document.querySelector('[data-atmosphere="${key}"]')`, key);
  };
  const pixels = () => page.evaluate(`document.querySelector('canvas').toDataURL()`);
  const delay = () => page.evaluate('new Promise(r=>setTimeout(r,220))');
  for (const key of ['dust-light','snowfall','ink-bloom','paper-shadow']) {
    await select(key); await delay();
    const before = await pixels(); await delay(); assert.notEqual(await pixels(),before,`${key} moves`);
    await page.screenshot(join(evidenceDir,`${key}-desktop.png`));
    await page.evaluate(`document.querySelector('#hide').click()`); await delay();
    assert.equal(await page.evaluate(`document.querySelector('[data-atmosphere]').dataset.atmosphereState`),'poster');
    await page.evaluate(`document.querySelector('#hide').click()`); await delay();
    const resumed = await pixels(); await delay(); assert.notEqual(await pixels(),resumed,`${key} resumes`);
    await page.evaluate(`document.querySelector('#motion').click()`); await delay();
    const paused = await pixels(); await delay(); assert.equal(await pixels(),paused,`${key} pauses`);
    await page.evaluate(`document.querySelector('#motion').click()`);
    await page.setReducedMotion(true); await delay();
    const reduced = await pixels(); await delay(); assert.equal(await pixels(),reduced,`${key} reduced motion`);
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
  for (const key of ['rain-window','silk-folds']) {
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
  for (const key of ['dust-light','snowfall','ink-bloom','paper-shadow']) {
    await select(key); await delay(); await page.screenshot(join(evidenceDir,`${key}-mobile.png`));
    assert.equal(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'),true);
  }
  await page.evaluate(`document.querySelector('#compact').click()`);
  for (const key of ['dust-light','snowfall','ink-bloom','paper-shadow']) {
    await select(key); await delay();
    const card = await page.evaluate(`document.querySelector('.compact canvas').toDataURL()`);
    await delay(); assert.equal(await page.evaluate(`document.querySelector('.compact canvas').toDataURL()`),card);
  }
  await page.evaluate(`document.querySelector('#compact').click()`);
  await page.evaluate(`document.querySelector('a').focus()`); await page.pressKey('Enter');
  assert.equal(await page.evaluate('location.hash'),'#links');
  assert.equal(await page.evaluate(`performance.getEntriesByType('resource').filter(e=>/dust-light.*webm|ink-bloom.*webm|snowfall.*webm|paper-shadow.*webm/.test(e.name)).length`),0);
  assert.deepEqual(page.consoleLog.filter(e => e.type === 'exception'),[]);
  await page.evaluate('window.cleanup()');
  assert.equal(await page.evaluate('document.querySelectorAll("canvas,video").length'),0);
  await writeFile(join(evidenceDir,'results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({evidenceDir,results}));
} catch (error) { console.error(JSON.stringify(browser?.page?.consoleLog)); if (browser) console.error(await browser.page.evaluate('document.body.innerHTML.slice(0,2500)')); throw error; } finally { await terminateProcess(browser?.child,'Chromium'); await terminateProcess(server?.child,'Vite'); }
