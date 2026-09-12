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
  browser = await startChromium({ appUrl: `http://127.0.0.1:${appPort}/scripts/browser/authored-decorations.html`, debugPort, evidenceDir, width:1100, height:1050 });
  const { page } = browser;
  await page.navigate(`http://127.0.0.1:${appPort}/scripts/browser/authored-decorations.html`);
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
  assert.equal(await page.evaluate('document.querySelectorAll("section:last-child canvas").length'),0,'disabled bats mount no animation');
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
  await page.command('Emulation.setDeviceMetricsOverride',{width:1100,height:520,deviceScaleFactor:1,mobile:false});
  await page.evaluate(`(async()=>{
    const {createCreatureFlight}=await import('/src/lib/avatar-effect/creatureFlight.js');
    const {drawAvatarCreature,getCreaturePose}=await import('/src/lib/avatar-effect/avatarCreatures.js');
    document.body.replaceChildren();
    const canvas=document.createElement('canvas');canvas.width=1100;canvas.height=520;document.body.append(canvas);
    const c=canvas.getContext('2d');c.fillStyle='#171420';c.fillRect(0,0,1100,520);
    for(const [row,key] of ['butterfly-orbit','bat-orbit'].entries()) {
      const flight=createCreatureFlight(key);
      for(let col=0;col<6;col++) {
        let states=flight.advance(0);
        if(col)for(let frame=0;frame<300;frame++)states=flight.advance(1/60);
        const cx=90+col*180,cy=140+row*250;
        const draw=a=>drawAvatarCreature(c,key,{x:cx+a.x*43,y:cy+a.y*43,width:43*(row?.58:.52)*a.scale,rotation:a.rotation,bank:a.bank,pose:getCreaturePose(key,col*5000,a.phase/(Math.PI*2))});
        states.filter(a=>a.depth<0).forEach(draw);
        c.fillStyle='#8756b1';c.beginPath();c.arc(cx,cy,43,0,Math.PI*2);c.fill();
        states.filter(a=>a.depth>=0).forEach(draw);
        c.fillStyle='white';c.font='13px sans-serif';c.fillText(col*5+'s',cx-8,cy-105);
      }
    }
    return true;
  })()`);
  await page.screenshot(join(evidenceDir,'separated-flight.png'));
  await writeFile(join(evidenceDir,'results.json'),JSON.stringify({status:'passed',checks:['production Svelte component','animated pixels','reduced motion and pointer','390px DPR2 overflow','SVG studies']},null,2));
  console.log('Avatar creature browser checks passed. Evidence: '+evidenceDir);
} catch (error) {
  console.error(browser?.page?.requestLog.filter(r => r.failed || r.status >= 400));
  console.error(browser?.page?.consoleLog.filter(r => r.type === 'exception'));
  throw error;
} finally {
  await terminateProcess(browser?.child,'Chromium');
  await terminateProcess(server.child,'Vite');
}
