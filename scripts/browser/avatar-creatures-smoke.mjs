import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { startVite, startChromium, terminateProcess, findAvailablePort } from './cdp-harness.mjs';
const evidenceDir = join(process.cwd(), 'artifacts/avatar-creatures');
await mkdir(evidenceDir, { recursive: true });
const appPort = await findAvailablePort(5250);
const debugPort = await findAvailablePort(9380);
const server = await startVite({ appPort, evidenceDir });
let browser;
try {
  browser = await startChromium({ appUrl: `http://127.0.0.1:${appPort}/`, debugPort, evidenceDir, width:1100, height:1050 });
  const { page } = browser;
  await page.navigate(`http://127.0.0.1:${appPort}/`);
  await page.evaluate(`(async()=>{
    let fixture;
    for(let attempt=0;attempt<5;attempt++) {
      try { fixture=await import('/scripts/browser/avatar-creatures-fixture.js?attempt='+attempt); break; }
      catch(error) { if(attempt===4 || !String(error).includes('Failed to fetch dynamically imported module')) throw error; await new Promise(r=>setTimeout(r,500)); }
    }
    const {mountCreatureStudy}=fixture;
    document.body.replaceChildren(); mountCreatureStudy(document.body);
    window.pixels=()=>Array.from(document.querySelectorAll('canvas')).map(c=>{
      const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      let hash=0;for(let i=0;i<data.length;i++)hash=Math.imul(hash,31)+data[i]|0;return hash;
    });return true;
  })()`);
  await page.waitFor('document.querySelectorAll("canvas").length===12 && Array.from(document.querySelectorAll("canvas")).every(c=>c.width>100)', 'orbit canvases');
  const first=await page.evaluate('window.pixels()');
  await page.evaluate('new Promise(r=>setTimeout(r,150))');
  assert.notDeepEqual(await page.evaluate('window.pixels()'),first,'live wingbeats move');
  await page.screenshot(join(evidenceDir,'desktop.png'));
  await page.setReducedMotion(true);
  await page.evaluate('new Promise(r=>setTimeout(r,100))');
  const still=await page.evaluate('window.pixels()');
  await page.evaluate(`document.querySelector('[data-avatar-effect]').dispatchEvent(new PointerEvent('pointermove',{clientX:30,clientY:30,pointerType:'mouse'})); new Promise(r=>setTimeout(r,150))`);
  assert.deepEqual(await page.evaluate('window.pixels()'),still,'reduced motion remains static even under pointer');
  await page.screenshot(join(evidenceDir,'reduced-motion.png'));
  await page.command('Emulation.setDeviceMetricsOverride',{width:390,height:1100,deviceScaleFactor:2,mobile:true});
  await page.evaluate('new Promise(r=>setTimeout(r,100))');
  assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'mobile has no horizontal overflow');
  await page.screenshot(join(evidenceDir,'mobile.png'));
  // Export standalone SVG studies from the exact curves used by the renderer.
  const svgs=await page.evaluate(`(async()=>{const {CREATURE_ART}=await import('/src/lib/avatar-effect/avatarCreatures.js');return Object.entries(CREATURE_ART).map(([key,a])=>[key,'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-55 -50 110 100"><g fill="'+a.fill+'" stroke="'+a.edge+'" stroke-width="1.3" stroke-linejoin="round"><path d="'+a.wing+'"/><path transform="scale(-1 1)" d="'+a.wing+'"/></g><g fill="none" stroke="'+a.detail+'" stroke-width="1.1"><path d="'+a.veins+'"/><path transform="scale(-1 1)" d="'+a.veins+'"/></g><path fill="'+a.bodyFill+'" stroke="'+(key==='bat-orbit'?a.edge:a.bodyFill)+'" stroke-width="1.1" d="'+a.body+'"/><path fill="none" stroke="'+a.bodyFill+'" stroke-width="1.8" d="'+a.antenna+'"/></svg>']);})()`);
  for(const [key,svg] of svgs) await writeFile(join(evidenceDir,key+'.svg'),svg);
  assert.equal(page.consoleLog.filter(e=>e.type==='exception').length,0,'no uncaught browser errors');
  await writeFile(join(evidenceDir,'results.json'),JSON.stringify({status:'passed',checks:['production Svelte component','animated pixels','reduced motion and pointer','390px DPR2 overflow','SVG studies']},null,2));
  console.log('Avatar creature browser checks passed. Evidence: '+evidenceDir);
} finally {
  await terminateProcess(browser?.child,'Chromium');
  await terminateProcess(server.child,'Vite');
}
