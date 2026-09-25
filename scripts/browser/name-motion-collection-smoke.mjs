import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { startVite, startChromium, terminateProcess, findAvailablePort } from './cdp-harness.mjs';

const evidenceDir = process.env.MOTION_EVIDENCE_DIR || '/tmp/chromadie-name-motion-collection-final';
await mkdir(evidenceDir, { recursive: true });
const appPort = await findAvailablePort(5250);
const debugPort = await findAvailablePort(9380);
const vite = await startVite({ appPort, evidenceDir });
let browser;
try {
  browser = await startChromium({ appUrl: `http://127.0.0.1:${appPort}`, debugPort, evidenceDir, width: 1440, height: 1400 });
  const { page } = browser;
  // The all-material pixel matrix intentionally does thousands of readbacks.
  const command=page.command.bind(page);
  page.command=(method,params,timeout)=>command(method,params,timeout ?? (method==='Runtime.evaluate'?90000:15000));
  await page.navigate(`http://127.0.0.1:${appPort}`);
  const results = await page.evaluate(`(async () => {
    let api;
    for(let attempt=0;attempt<5;attempt++) {
      try { api=await import('/scripts/browser/name-materials-fixture.js?attempt='+attempt); break; }
      catch(error) { if(attempt===4) throw error; await new Promise(resolve=>setTimeout(resolve,500)); }
    }
    const {NAME_MOTION_COLLECTION}=await import('/src/lib/name/nameMotionCollection.js');
    window.collectionKeys=Object.keys(NAME_MOTION_COLLECTION);
    for(let attempt=0;attempt<5;attempt++) {
      try { await api.loadCodeOwnedNameRenderers(); break; }
      catch(error) { if(attempt===4) throw error; await new Promise(resolve=>setTimeout(resolve,400)); }
    }
    await api.requestNameFontLoad('soft-orbit', 36, 'Chromadie Wi');
    document.body.replaceChildren();
    document.body.style.cssText='margin:0;background:#090b12;color:#eee;font:14px sans-serif';
    const pixelBytes = canvas => new Uint8ClampedArray(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data);
    const pixelDifference = (first,second) => {
      let changed=0;
      for(let i=0;i<first.length;i+=4) {
        const colorChange=Math.abs(first[i]-second[i])+Math.abs(first[i+1]-second[i+1])+Math.abs(first[i+2]-second[i+2]);
        if(colorChange>48 || Math.abs(first[i+3]-second[i+3])>32) changed++;
      }
      return changed;
    };
    const missingBasePixels = (base,active) => {
      let basePixels=0,missing=0;
      for(let i=3;i<base.length;i+=4) {
        if(base[i]>96) { basePixels++; if(active[i]+48<base[i]) missing++; }
      }
      return basePixels ? missing/basePixels : 0;
    };
    const pixels = canvas => {
      const bytes=pixelBytes(canvas);
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
    let minimumMotionChange=Infinity;
    let maximumNameCoverageLoss=0;
    for(const materialKey of Object.keys(api.NAME_MATERIALS)) {
      renderer.setOptions({materialKey,motionKey:'none',mode:'animated'}); renderer.draw(0);
      const still=pixels(canvas);
      renderer.setOptions({motionKey:'letter-shuffle'});
      const hashes=[];
      for(const time of [0,2700,2800,3000,3140,3450,3700,4800]) {
        renderer.setOptions({motionKey:'none'});renderer.draw(time);const expected=pixels(canvas);
        renderer.setOptions({motionKey:'letter-shuffle'});renderer.draw(time); const result=pixels(canvas);frames++;
        if(result.visible<still.visible*0.35) failures.push([materialKey,time,'disappearing name']);
        if([0,3700,4800].includes(time) && result.hash!==expected.hash) failures.push([materialKey,time,'does not resolve']);
        hashes.push(result.hash);
      }
      if(new Set(hashes).size<4) failures.push([materialKey,'does not scramble']);
      renderer.setOptions({mode:'reduced-motion'});renderer.draw(3000);
      const reducedHash=pixels(canvas).hash;renderer.setOptions({motionKey:'none'});renderer.draw(3000);
      if(pixels(canvas).hash!==reducedHash) failures.push([materialKey,'reduced differs from Still']);
    }
    renderer.setOptions({motionKey:'raster-signal',materialKey:'plain',mode:'animated',baseColor:'#20FF60'});
    renderer.draw(1700);const raster=pixels(canvas);
    if(raster.green<raster.visible*0.6) failures.push(['raster','ignores name color']);
    for(const compact of [false,true]) {
      renderer.resize({width:compact?240:360,height:compact?64:96,dpr:2});
      renderer.setOptions({fontSize:compact?24:36,compact,baseColor:'#FFFFFF'});
      for(const motionKey of window.collectionKeys) {
        for(const materialKey of Object.keys(api.NAME_MATERIALS)) {
          renderer.setOptions({materialKey,motionKey:'none',mode:'animated'});
          renderer.setOptions({materialKey,motionKey,mode:'animated'});
          const hashes=[];
          const duration=api.NAME_MOTIONS[motionKey].durationMs;
          const phaseTimes=[.22,.44,.65].map(fraction=>duration*fraction);
          const motionChanges=[];
          for(const time of [0,900,1700,2250,2850,3400,4100,5000,...phaseTimes]) {
            // The material animates independently. Compare motion coverage to
            // the same material phase, not the texture/glow from time zero.
            renderer.setOptions({motionKey:'none'});renderer.draw(time);
            const stillFrame=pixelBytes(canvas);
            renderer.setOptions({motionKey});
            renderer.draw(time);const activeBytes=pixelBytes(canvas);const result=pixels(canvas);hashes.push(result.hash);frames++;
            if(result.visible<12) failures.push([motionKey,materialKey,compact,time,'empty']);
            const coverageLoss=missingBasePixels(stillFrame,activeBytes);
            maximumNameCoverageLoss=Math.max(maximumNameCoverageLoss,coverageLoss);
            if(coverageLoss>0.025) failures.push([motionKey,materialKey,compact,'name geometry shifts',coverageLoss]);
            if(!compact && phaseTimes.includes(time)) motionChanges.push(pixelDifference(stillFrame,activeBytes));
            renderer.draw(time);
            if(pixels(canvas).hash!==result.hash) failures.push([motionKey,materialKey,'nondeterministic']);
          }
          if(new Set(hashes).size<3) failures.push([motionKey,materialKey,'not animated']);
          if(!compact) {
            const strongestChange=Math.max(...motionChanges);
            minimumMotionChange=Math.min(minimumMotionChange,strongestChange);
            if(strongestChange<180) failures.push([motionKey,materialKey,'motion is too subtle',strongestChange]);
          }
          renderer.setOptions({mode:'reduced-motion'});renderer.draw(2250);const reduced=pixels(canvas).hash;
          renderer.draw(2850);if(pixels(canvas).hash!==reduced) failures.push([motionKey,'reduced animates']);
          renderer.setOptions({motionKey:'none'});renderer.draw(0);
          if(pixels(canvas).hash!==reduced) failures.push([motionKey,materialKey,'reduced changes material']);
        }
      }
    }
    for(const text of ['W', 'i', 'É é 👩‍💻', 'WWWWiiilllVeryLongChromadieIdentity']) {
      renderer.resize({width:text.length<2?76:240,height:72,dpr:2});
      for (const motionKey of window.collectionKeys) {
        renderer.setOptions({text,fontSize:24,materialKey:'glass-emboss',motionKey,mode:'animated'});
        renderer.setOptions({motionKey:'none'});renderer.draw(0);
        const baseline=pixelBytes(canvas);
        renderer.setOptions({motionKey});
        for(const fraction of [0,.12,.3,.48,.66,.84,.999]) {
          renderer.draw(api.NAME_MOTIONS[motionKey].durationMs*fraction);frames++;
          if(pixels(canvas).visible<8) failures.push([text,motionKey,fraction,'empty short/long name']);
          const active=pixelBytes(canvas);
          let clipped=0;
          for(let y=0;y<canvas.height;y++) for(let x=0;x<canvas.width;x++) {
            if(x>1 && x<canvas.width-2 && y>1 && y<canvas.height-2) continue;
            const i=(y*canvas.width+x)*4+3;
            if(active[i]>baseline[i]+24) clipped++;
          }
          if(clipped>2) failures.push([text,motionKey,fraction,'scene touches canvas edge',clipped]);
        }
      }
    }
    // Both sides of the shared clock wrap must resolve exactly to the material.
    renderer.resize({width:360,height:96,dpr:2});
    renderer.setOptions({text:'Chromadie',fontSize:36,compact:false});
    for(const materialKey of Object.keys(api.NAME_MATERIALS)) {
      renderer.setOptions({materialKey,motionKey:'none',mode:'animated'});renderer.draw(0);
      for(const motionKey of window.collectionKeys) {
        renderer.setOptions({motionKey});
        const duration=api.NAME_MOTIONS[motionKey].durationMs;
        for(const time of [0,16,duration-16,duration,duration+16]) {
          renderer.setOptions({motionKey:'none'});renderer.draw(time);const baseline=pixels(canvas).hash;
          renderer.setOptions({motionKey});renderer.draw(time);frames++;
          if(pixels(canvas).hash!==baseline) failures.push([motionKey,materialKey,time,'visible loop reset']);
        }
      }
    }
    renderer.destroy();
    window.nameMotionApi=api;
    window.nameMotionPixels=pixels;
    window.motionGallery=(mobile=false,offset=0)=>{
      document.body.replaceChildren();
      const grid=document.createElement('main');
      grid.style.cssText='padding:20px;display:grid;gap:16px;grid-template-columns:repeat('+ (mobile?1:2) +',1fr)';document.body.append(grid);
      for(const motionKey of window.collectionKeys.slice(offset,offset+5)) {
        const card=document.createElement('section');card.style.cssText='padding:16px 0;background:#141625;border-radius:14px';grid.append(card);
        const title=document.createElement('div');title.textContent=api.NAME_MOTIONS[motionKey].label;title.style.cssText='padding:0 16px 12px';card.append(title);
        for(const fraction of [.22,.44,.65]) {
          const c=document.createElement('canvas');c.style.cssText='width:100%;height:82px;display:block';card.append(c);
          const r=api.createNameCanvasRenderer(c,{text:'Chromadie',fontKey:'soft-orbit',fontSize:mobile?30:36,materialKey:fraction===.44?'glass-emboss':'plain',motionKey,baseColor:'#FFFFFF',todayColor:'#EF00B8'});
          r.resize({width:card.clientWidth,height:82,dpr:2});r.draw(api.NAME_MOTIONS[motionKey].durationMs*fraction);
        }
      }
    };
    window.motionStrip=(offset=0)=>{
      document.body.replaceChildren();
      const atlas=document.createElement('canvas');atlas.width=1440;atlas.height=1350;document.body.append(atlas);
      const ctx=atlas.getContext('2d');ctx.fillStyle='#090b12';ctx.fillRect(0,0,1440,1350);
      window.collectionKeys.slice(offset,offset+5).forEach((motionKey,row)=>{
        const top=row*270;ctx.fillStyle='#141625';ctx.fillRect(12,top+8,1416,254);
        ctx.fillStyle='#eee';ctx.font='14px sans-serif';ctx.fillText(api.NAME_MOTIONS[motionKey].label,22,top+29);
        [.04,.11,.18,.25,.32,.39,.46,.53,.60,.69,.79,.90].forEach((fraction,index)=>{
          const c=document.createElement('canvas');
          const r=api.createNameCanvasRenderer(c,{text:'Chromadie',fontKey:'soft-orbit',fontSize:26,materialKey:'plain',motionKey,baseColor:'#FFFFFF'});
          r.resize({width:232,height:92,dpr:2});r.draw(api.NAME_MOTIONS[motionKey].durationMs*fraction);
          const x=22+(index%6)*234;const y=top+34+Math.floor(index/6)*110;
          ctx.drawImage(c,x,y,232,92);r.destroy();
          ctx.fillStyle='#9b9daf';ctx.font='11px sans-serif';ctx.fillText(Math.round(fraction*100)+'%',x+106,y+101);
        });
      });
      return atlas.toDataURL('image/png').split(',')[1];
    };
    window.motionGallery();
    return {frames,failures,raster,minimumMotionChange,maximumNameCoverageLoss};
  })()`);
  for (const offset of [0,5,10,15]) {
    await page.evaluate('window.motionGallery(false,'+offset+')');
    await page.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const capture=await page.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
    await writeFile(`${evidenceDir}/desktop-${offset}.png`,Buffer.from(capture.data,'base64'));
  }
  for (const offset of [0,5,10,15]) {
    const capture=await page.evaluate('window.motionStrip('+offset+')');
    await writeFile(`${evidenceDir}/sequence-${offset}.png`,Buffer.from(capture,'base64'));
  }
  let shot=await page.command('Page.captureScreenshot',{format:'png'});
  await writeFile(`${evidenceDir}/desktop.png`,Buffer.from(shot.data,'base64'));
  await page.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
  for (const offset of [0,5,10,15]) {
    await page.evaluate('window.motionGallery(true,'+offset+')');
    await page.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const capture=await page.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
    await writeFile(`${evidenceDir}/mobile-${offset}.png`,Buffer.from(capture.data,'base64'));
  }
  shot=await page.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
  await writeFile(`${evidenceDir}/mobile.png`,Buffer.from(shot.data,'base64'));
  await page.evaluate(`(() => {
    document.body.replaceChildren();window.mountedMotionNames=[];
    for(const motionKey of window.collectionKeys) {
      const card=document.createElement('section');card.style.cssText='margin:16px;padding:30px 18px;background:#141625;border-radius:14px';document.body.append(card);
      const label=document.createElement('div');label.textContent=motionKey;label.style.cssText='font-size:12px;color:#aaa;margin-bottom:20px';card.append(label);
      window.mountedMotionNames.push(window.nameMotionApi.mount(window.nameMotionApi.NameEffectCanvas,{target:card,props:{text:'Chromadie',fontKey:'soft-orbit',materialKey:'glass-emboss',motionKey,semanticTag:'h1',semanticClass:'profile-reference-card__name'}}));
    }
  })()`);
  await page.waitFor(`document.querySelectorAll('[data-name-font-ready="true"]').length===20`, 'twenty mounted motion names');
  shot=await page.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
  await writeFile(`${evidenceDir}/mounted-mobile-active.png`,Buffer.from(shot.data,'base64'));
  await page.command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await new Promise(resolve=>setTimeout(resolve,180));
  const mounted=await page.evaluate(`[...document.querySelectorAll('.name-effect-canvas canvas')].map(window.nameMotionPixels)`);
  assert.equal(mounted.length,20);
  assert.ok(mounted.every(frame=>frame.visible>12));
  await new Promise(resolve=>setTimeout(resolve,180));
  assert.deepEqual(await page.evaluate(`[...document.querySelectorAll('.name-effect-canvas canvas')].map(window.nameMotionPixels)`),mounted);
  shot=await page.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
  await writeFile(`${evidenceDir}/mounted-mobile-reduced.png`,Buffer.from(shot.data,'base64'));
  await page.evaluate('Promise.all(window.mountedMotionNames.map(instance=>window.nameMotionApi.unmount(instance)))');
  assert.deepEqual(page.consoleLog.filter(entry=>entry.type==='exception'),[]);
  await writeFile(`${evidenceDir}/validation.json`,JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
  assert.deepEqual(results.failures, []);
} finally {
  if(browser) { browser.page.ws?.close(); await terminateProcess(browser.child,'Chromium'); }
  await terminateProcess(vite.child,'Vite');
}
