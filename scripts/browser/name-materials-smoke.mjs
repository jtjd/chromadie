import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { startVite, startChromium, terminateProcess, findAvailablePort } from './cdp-harness.mjs';

const evidenceDir = '/tmp/chromadie-name-materials';
await mkdir(evidenceDir, { recursive:true });
const appPort = await findAvailablePort(5250);
const debugPort = await findAvailablePort(9380);
const vite = await startVite({ appPort, evidenceDir });
let browser;
try {
  browser = await startChromium({ appUrl:`http://127.0.0.1:${appPort}`, debugPort, evidenceDir, width:1440, height:1060 });
  const { page } = browser;
  await page.navigate(`http://127.0.0.1:${appPort}`);
  await page.evaluate(`(async () => {
    let api;
    for(let attempt=0;attempt<5;attempt++) {
      try { api=await import('/scripts/browser/name-materials-fixture.js?attempt='+attempt); break; }
      catch(error) { if(attempt===4 || !String(error).includes('Failed to fetch dynamically imported module')) throw error; await new Promise(resolve=>setTimeout(resolve,500)); }
    }
    await api.loadCodeOwnedNameRenderers();
    window.nameApi=api;
    const fonts=await Promise.all(api.NAME_COMPOSABLE_FONT_KEYS.map(async key=>[key,await api.requestNameFontLoad(key,36,'Chromadie Wi Égj')]));
    if(fonts.some(([,ready])=>!ready)) throw new Error('Font loading failed: '+JSON.stringify(fonts));
    document.body.replaceChildren();
    document.body.style.cssText='margin:0;background:#0a0910;color:#eee;font:13px sans-serif';
    window.gallery = (motions=['none','haunt-fuzzy'], fontKey='soft-orbit', width=340, fontSize=36) => {
      document.body.replaceChildren();
      const grid=document.createElement('main');
      grid.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:16px';
      document.body.append(grid);
      for(const materialKey of Object.keys(api.NAME_MATERIALS).filter(key=>key!=='plain')) {
        const card=document.createElement('section');
        card.style.cssText='background:linear-gradient(135deg,#161223,#0c1620);border:1px solid #343044;border-radius:12px;padding:12px 0;overflow:hidden';
        const title=document.createElement('div'); title.textContent=api.NAME_MATERIALS[materialKey].label; title.style.cssText='padding:0 14px 8px';card.append(title);
        for(const motionKey of motions) {
          const label=document.createElement('div');label.textContent=api.NAME_MOTIONS[motionKey].label;label.style.cssText='font-size:11px;color:#9690aa;padding-left:14px';card.append(label);
          const canvas=document.createElement('canvas');canvas.style.cssText='display:block;width:100%;height:94px';card.append(canvas);
          const renderer=api.createNameCanvasRenderer(canvas,{text:'Chromadie',fontKey,materialKey,motionKey,fontSize,baseColor:'#FFFFFF',todayColor:'#EF00B8'});
          renderer.resize({width,height:94,dpr:2});renderer.draw(1700);
        }
        grid.append(card);
      }
    };
    window.gallery();
    window.namePixels = canvas => {
      const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let hash=2166136261, visible=0, chromatic=0;
      for(let i=0;i<data.length;i+=4) {
        hash=Math.imul(hash^data[i],16777619); hash=Math.imul(hash^data[i+1],16777619);
        hash=Math.imul(hash^data[i+2],16777619); hash=Math.imul(hash^data[i+3],16777619);
        if(data[i+3]>64) {
          visible++;
          if(Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])>65) chromatic++;
        }
      }
      return {hash:hash>>>0,visible,chromatic};
    };
    window.testNameFont = fontKey => {
      let frames=0;
      const failures=[];
      const canvas=document.createElement('canvas');
      const renderer=api.createNameCanvasRenderer(canvas,{text:'Wi Chromadie',fontKey,baseColor:'#FFFFFF',todayColor:'#EF00B8'});
      for(const compact of [false,true]) {
        const width=compact?248:440,height=compact?78:108,fontSize=compact?22:42;
        renderer.resize({width,height,dpr:compact?2:1});
        renderer.setOptions({fontSize,compact,mode:'animated'});
        for(const motionKey of Object.keys(api.NAME_MOTIONS)) {
          const fingerprints=[];
          for(const materialKey of Object.keys(api.NAME_MATERIALS)) {
            renderer.setOptions({materialKey,motionKey,mode:'animated',pointer:motionKey==='magnetic-type'?{x:width/2,y:height/2}:null});
            renderer.draw(1700);
            const animated=window.namePixels(canvas);frames++;
            if(animated.visible<8) failures.push([fontKey,materialKey,motionKey,compact,'empty animated']);
            fingerprints.push(animated.hash);
            renderer.draw(1700);
            if(window.namePixels(canvas).hash!==animated.hash) failures.push([fontKey,materialKey,motionKey,compact,'nondeterministic']);
            renderer.setOptions({mode:'reduced-motion'});
            renderer.draw(1700);const still=window.namePixels(canvas);frames++;
            renderer.draw(2700);
            if(window.namePixels(canvas).hash!==still.hash) failures.push([fontKey,materialKey,motionKey,compact,'reduced animation']);
            if(still.visible<8) failures.push([fontKey,materialKey,motionKey,compact,'empty reduced']);
          }
          if(new Set(fingerprints).size!==fingerprints.length) failures.push([fontKey,motionKey,compact,'material override']);
        }
      }
      renderer.destroy();
      return {frames,failures};
    };
    window.testNameEdits = () => {
      const canvas=document.createElement('canvas');
      const options={text:'Wi Égj',fontKey:'soft-orbit',materialKey:'glass-emboss',motionKey:'haunt-fuzzy',fontSize:36,width:360,height:96};
      const renderer=api.createNameCanvasRenderer(canvas,options);
      renderer.resize({width:360,height:96,dpr:2});
      renderer.draw(1700);const initial=window.namePixels(canvas).hash;
      renderer.setOptions({materialKey:'crt-phosphor'});renderer.draw(1700);const changed=window.namePixels(canvas).hash;
      renderer.setOptions({materialKey:'glass-emboss'});renderer.draw(1700);const restored=window.namePixels(canvas).hash;
      renderer.resize({width:240,height:72,dpr:1});renderer.setOptions({text:'WWWWiiilllVeryLongChromadieIdentity',fontSize:32});
      renderer.draw(1700);const long=window.namePixels(canvas);
      renderer.resize({width:360,height:96,dpr:2});renderer.setOptions({...options,motionKey:'magnetic-type',pointer:null});renderer.draw(1700);const neutral=window.namePixels(canvas).hash;
      renderer.setOptions({pointer:{x:180,y:48}});renderer.draw(1700);const moved=window.namePixels(canvas).hash;
      renderer.setOptions({mode:'reduced-motion'});renderer.draw(1700);const reduced=window.namePixels(canvas).hash;
      renderer.destroy();
      return {initial,changed,restored,long,neutral,moved,reduced};
    };
  })()`);
  const shot=await page.command('Page.captureScreenshot',{format:'png'});
  await writeFile(`${evidenceDir}/${process.env.NAME_MATERIAL_BASELINE ? 'before' : 'after'}.png`,Buffer.from(shot.data,'base64'));
  if(!process.env.NAME_MATERIAL_BASELINE) {
    const fontKeys=await page.evaluate('window.nameApi.NAME_COMPOSABLE_FONT_KEYS');
    let frames=0;
    for(const key of fontKeys) {
      const result=await page.evaluate(`window.testNameFont(${JSON.stringify(key)})`);
      frames+=result.frames;
      assert.deepEqual(result.failures,[],JSON.stringify(result.failures));
      console.log(`${key}: ${result.frames} material/motion frames passed`);
    }
    const edits=await page.evaluate('window.testNameEdits()');
    assert.notEqual(edits.initial,edits.changed,'Fuzzy responds to material edits');
    assert.equal(edits.initial,edits.restored,'Fuzzy restores the selected material');
    assert.ok(edits.long.visible>8,'long names survive resize');
    assert.notEqual(edits.neutral,edits.moved,'Magnetic Type responds to pointer');
    assert.equal(edits.neutral,edits.reduced,'reduced motion restores the full material');
    await page.evaluate(`window.gallery(['none','letter-shuffle','magnetic-type','haunt-gradient'],'marker-tag')`);
    const motions=await page.command('Page.captureScreenshot',{format:'png'});
    await writeFile(`${evidenceDir}/motion-combinations.png`,Buffer.from(motions.data,'base64'));
    await page.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
    await page.evaluate(`window.gallery(['none','haunt-fuzzy'],'kode-mono',350,25);document.querySelector('main').style.gridTemplateColumns='1fr'`);
    const mobile=await page.command('Page.captureScreenshot',{format:'png'});
    await writeFile(`${evidenceDir}/mobile.png`,Buffer.from(mobile.data,'base64'));
    await page.evaluate(`(() => {
      document.body.replaceChildren();
      window.componentNames=[];
      for(const [fontKey,materialKey,motionKey,text] of [
        ['array','crt-phosphor','haunt-fuzzy','Chromadie'],
        ['marker-tag','glass-emboss','letter-shuffle','Wi Égj'],
        ['kode-mono','halo-edge','kinetic-echo','Chromadie'],
        ['soft-orbit','velvet-ink','magnetic-type','VeryLongChromadieIdentityName']
      ]) {
        const card=document.createElement('section');card.style.cssText='margin:16px;padding:28px 18px;background:#141221;border-radius:12px';document.body.append(card);
        const label=document.createElement('p');label.textContent=fontKey+' · '+materialKey+' · '+motionKey;label.style.cssText='font-size:11px;color:#aaa;margin:0 0 20px';card.append(label);
        window.componentNames.push(window.nameApi.mount(window.nameApi.NameEffectCanvas,{target:card,props:{text,fontKey,materialKey,motionKey,semanticTag:'h1',semanticClass:'profile-reference-card__name'}}));
      }
    })()`);
    await page.waitFor(`document.querySelectorAll('[data-name-font-ready="true"]').length===4`, 'mounted font/material/motion readiness');
    await page.command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await new Promise(resolve=>setTimeout(resolve,180));
    const staticComponents=await page.evaluate(`[...document.querySelectorAll('.name-effect-canvas canvas')].map(window.namePixels)`);
    assert.ok(staticComponents.every(result=>result.visible>8));
    await new Promise(resolve=>setTimeout(resolve,180));
    assert.deepEqual(await page.evaluate(`[...document.querySelectorAll('.name-effect-canvas canvas')].map(window.namePixels)`),staticComponents,'mounted reduced-motion names stay static');
    const components=await page.command('Page.captureScreenshot',{format:'png'});
    await writeFile(`${evidenceDir}/mobile-components-reduced.png`,Buffer.from(components.data,'base64'));
    await page.evaluate(`Promise.all(window.componentNames.map(instance=>window.nameApi.unmount(instance)))`);
    await writeFile(`${evidenceDir}/validation.json`,JSON.stringify({frames,fonts:fontKeys.length,materials:9,motions:16,edits},null,2));
    console.log(`Passed ${frames} frames plus edit, resize, pointer and reduced-motion checks.`);
  }
  assert.deepEqual(page.consoleLog.filter(entry=>entry.type==='exception'),[]);
  console.log(`Name material gallery: ${evidenceDir}`);
} finally {
  if(browser) {
    await writeFile(`${evidenceDir}/browser-log.json`,JSON.stringify(browser.page.consoleLog,null,2));
    browser.page.ws?.close();await terminateProcess(browser.child,'Chromium');
  }
  await terminateProcess(vite.child,'Vite');
}
