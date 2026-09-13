import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { startVite, startChromium, terminateProcess, findAvailablePort } from './cdp-harness.mjs';

const evidenceDir = '/tmp/chromadie-name-motion-quality';
await mkdir(evidenceDir, { recursive: true });
const appPort = await findAvailablePort(5250);
const debugPort = await findAvailablePort(9380);
const vite = await startVite({ appPort, evidenceDir });
let browser;
try {
  browser = await startChromium({ appUrl: `http://127.0.0.1:${appPort}`, debugPort, evidenceDir, width: 1440, height: 1400 });
  const { page } = browser;
  await page.navigate(`http://127.0.0.1:${appPort}`);
  const results = await page.evaluate(`(async () => {
    const api = await import('/scripts/browser/name-materials-fixture.js');
    for(let attempt=0;attempt<5;attempt++) {
      try { await api.loadCodeOwnedNameRenderers(); break; }
      catch(error) { if(attempt===4) throw error; await new Promise(resolve=>setTimeout(resolve,400)); }
    }
    await api.requestNameFontLoad('soft-orbit', 36, 'Chromadie Wi');
    document.body.replaceChildren();
    document.body.style.cssText='margin:0;background:#090b12;color:#eee;font:14px sans-serif';
    const pixels = canvas => {
      const bytes=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let hash=2166136261, visible=0, green=0;
      for(let i=0;i<bytes.length;i+=4) {
        for(let c=0;c<4;c++) hash=Math.imul(hash^bytes[i+c],16777619);
        if(bytes[i+3]>64) { visible++; if(bytes[i+1]>bytes[i]*1.3 && bytes[i+1]>bytes[i+2]*1.3) green++; }
      }
      return {hash:hash>>>0,visible,green};
    };
    const canvas=document.createElement('canvas');
    const renderer=api.createNameCanvasRenderer(canvas,{text:'Chromadie Wi',fontKey:'soft-orbit',fontSize:36,baseColor:'#FFFFFF'});
    renderer.resize({width:360,height:96,dpr:2});
    const failures=[];
    let frames=0;
    for(const materialKey of Object.keys(api.NAME_MATERIALS)) {
      renderer.setOptions({materialKey,motionKey:'none',mode:'animated'}); renderer.draw(0);
      const still=pixels(canvas);
      renderer.setOptions({motionKey:'letter-shuffle'});
      const hashes=[];
      for(const time of [0,2700,2800,3000,3140,3450,3700,4800]) {
        renderer.draw(time); const result=pixels(canvas);frames++;
        if(result.visible<still.visible*0.35) failures.push([materialKey,time,'disappearing name']);
        if([0,3700,4800].includes(time) && result.hash!==still.hash) failures.push([materialKey,time,'does not resolve']);
        hashes.push(result.hash);
      }
      if(new Set(hashes).size<4) failures.push([materialKey,'does not scramble']);
      renderer.setOptions({mode:'reduced-motion'});renderer.draw(3000);
      if(pixels(canvas).hash!==still.hash) failures.push([materialKey,'reduced differs from Still']);
    }
    renderer.setOptions({motionKey:'raster-signal',materialKey:'plain',mode:'animated',baseColor:'#20FF60'});
    renderer.draw(1700);const raster=pixels(canvas);
    if(raster.green<raster.visible*0.6) failures.push(['raster','ignores name color']);
    for(const compact of [false,true]) {
      renderer.resize({width:compact?240:360,height:compact?64:96,dpr:2});
      renderer.setOptions({fontSize:compact?24:36,compact,baseColor:'#FFFFFF'});
      for(const motionKey of ['star-companions','heart-pop','ion-sweep','phase-fracture','letterpress']) {
        for(const materialKey of Object.keys(api.NAME_MATERIALS)) {
          renderer.setOptions({materialKey,motionKey,mode:'animated'});
          const hashes=[];
          for(const time of [0,900,1700,2250,2850,3400,4100,5000]) {
            renderer.draw(time);const result=pixels(canvas);hashes.push(result.hash);frames++;
            if(result.visible<12) failures.push([motionKey,materialKey,compact,time,'empty']);
            renderer.draw(time);
            if(pixels(canvas).hash!==result.hash) failures.push([motionKey,materialKey,'nondeterministic']);
          }
          if(new Set(hashes).size<3) failures.push([motionKey,materialKey,'not animated']);
          renderer.setOptions({mode:'reduced-motion'});renderer.draw(2250);const reduced=pixels(canvas).hash;
          renderer.draw(2850);if(pixels(canvas).hash!==reduced) failures.push([motionKey,'reduced animates']);
          renderer.setOptions({motionKey:'none'});renderer.draw(0);
          if(pixels(canvas).hash!==reduced) failures.push([motionKey,materialKey,'reduced changes material']);
        }
      }
    }
    renderer.resize({width:240,height:72,dpr:2});
    for(const text of ['W', 'i', 'É é 👩‍💻', 'WWWWiiilllVeryLongChromadieIdentity']) {
      renderer.setOptions({text,materialKey:'glass-emboss',motionKey:'letter-shuffle',mode:'animated'});
      for(const time of [0,2800,3000,3450,3700]) {
        renderer.draw(time);frames++;
        if(pixels(canvas).visible<8) failures.push([text,time,'empty short/long name']);
      }
    }
    renderer.destroy();
    window.nameMotionApi=api;
    window.nameMotionPixels=pixels;
    window.motionGallery=(mobile=false)=>{
      document.body.replaceChildren();
      const grid=document.createElement('main');
      grid.style.cssText='padding:20px;display:grid;gap:16px;grid-template-columns:repeat('+ (mobile?1:3) +',1fr)';document.body.append(grid);
      for(const motionKey of ['star-companions','heart-pop','ion-sweep','phase-fracture','letterpress','raster-signal','haunt-fuzzy','kinetic-echo','neon-particle','letter-shuffle']) {
        const card=document.createElement('section');card.style.cssText='padding:16px 0;background:#141625;border-radius:14px';grid.append(card);
        const title=document.createElement('div');title.textContent=api.NAME_MOTIONS[motionKey].label;title.style.cssText='padding:0 16px 12px';card.append(title);
        for(const materialKey of ['plain','glass-emboss','crt-phosphor']) {
          const c=document.createElement('canvas');c.style.cssText='width:100%;height:82px;display:block';card.append(c);
          const r=api.createNameCanvasRenderer(c,{text:'Chromadie',fontKey:'soft-orbit',fontSize:mobile?30:36,materialKey,motionKey,baseColor:'#FFFFFF',todayColor:'#EF00B8'});
          r.resize({width:mobile?350:440,height:82,dpr:2});r.draw(motionKey==='letter-shuffle'?3000:motionKey==='phase-fracture'?2850:motionKey==='ion-sweep'?2250:motionKey==='letterpress'?2700:1700);
        }
      }
    };
    window.motionGallery();
    return {frames,failures,raster};
  })()`);
  assert.deepEqual(results.failures, []);
  let shot=await page.command('Page.captureScreenshot',{format:'png'});
  await writeFile(`${evidenceDir}/desktop.png`,Buffer.from(shot.data,'base64'));
  await page.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
  await page.evaluate('window.motionGallery(true)');
  shot=await page.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
  await writeFile(`${evidenceDir}/mobile.png`,Buffer.from(shot.data,'base64'));
  await page.evaluate(`(() => {
    document.body.replaceChildren();window.mountedMotionNames=[];
    for(const motionKey of ['star-companions','heart-pop','ion-sweep','phase-fracture','letterpress']) {
      const card=document.createElement('section');card.style.cssText='margin:16px;padding:30px 18px;background:#141625;border-radius:14px';document.body.append(card);
      const label=document.createElement('div');label.textContent=motionKey;label.style.cssText='font-size:12px;color:#aaa;margin-bottom:20px';card.append(label);
      window.mountedMotionNames.push(window.nameMotionApi.mount(window.nameMotionApi.NameEffectCanvas,{target:card,props:{text:'Chromadie',fontKey:'soft-orbit',materialKey:'glass-emboss',motionKey,semanticTag:'h1',semanticClass:'profile-reference-card__name'}}));
    }
  })()`);
  await page.waitFor(`document.querySelectorAll('[data-name-font-ready="true"]').length===5`, 'five mounted motion names');
  await page.command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await new Promise(resolve=>setTimeout(resolve,180));
  const mounted=await page.evaluate(`[...document.querySelectorAll('.name-effect-canvas canvas')].map(window.nameMotionPixels)`);
  assert.equal(mounted.length,5);
  assert.ok(mounted.every(frame=>frame.visible>12));
  await new Promise(resolve=>setTimeout(resolve,180));
  assert.deepEqual(await page.evaluate(`[...document.querySelectorAll('.name-effect-canvas canvas')].map(window.nameMotionPixels)`),mounted);
  shot=await page.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
  await writeFile(`${evidenceDir}/mounted-mobile-reduced.png`,Buffer.from(shot.data,'base64'));
  await page.evaluate('Promise.all(window.mountedMotionNames.map(instance=>window.nameMotionApi.unmount(instance)))');
  assert.deepEqual(page.consoleLog.filter(entry=>entry.type==='exception'),[]);
  await writeFile(`${evidenceDir}/validation.json`,JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
} finally {
  if(browser) { browser.page.ws?.close(); await terminateProcess(browser.child,'Chromium'); }
  await terminateProcess(vite.child,'Vite');
}
