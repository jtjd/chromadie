import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { startVite, startChromium, terminateProcess, findAvailablePort } from './cdp-harness.mjs';

const evidenceDir=process.env.MATERIAL_EVIDENCE_DIR || '/tmp/chromadie-authored-materials';
await mkdir(evidenceDir,{recursive:true});
const appPort=await findAvailablePort(5250),debugPort=await findAvailablePort(9380);
const vite=await startVite({appPort,evidenceDir});let browser;
try {
  browser=await startChromium({appUrl:`http://127.0.0.1:${appPort}`,debugPort,evidenceDir,width:1440,height:1100});
  const {page}=browser;const command=page.command.bind(page);
  page.command=(method,params,timeout)=>command(method,params,timeout??(method==='Runtime.evaluate'?90000:15000));
  await page.navigate(`http://127.0.0.1:${appPort}`);
  await page.evaluate(`(async()=>{
    let api;
    for(let attempt=0;attempt<5;attempt++) {
      try {api=await import('/scripts/browser/name-materials-fixture.js?attempt='+attempt);break;}
      catch(error) {if(attempt===4) throw error;await new Promise(r=>setTimeout(r,500));}
    }
    await api.loadCodeOwnedNameRenderers();
    for(const font of api.NAME_COMPOSABLE_FONT_KEYS) await api.requestNameFontLoad(font,36,'Chromadie Wi Égj');
    window.api=api;window.materialKeys=Object.keys(api.NAME_MATERIALS).filter(k=>k!=='plain');
    document.body.replaceChildren();document.body.style.cssText='margin:0;background:#090b12;color:#eee;font:14px sans-serif';
    window.pixels=canvas=>{
      const bytes=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let hash=2166136261,visible=0;
      for(let i=0;i<bytes.length;i+=4) {for(let j=0;j<4;j++)hash=Math.imul(hash^bytes[i+j],16777619);if(bytes[i+3]>64)visible++;}
      return {hash:hash>>>0,visible};
    };
    window.verifyMaterial=key=>{
      const failures=[];let frames=0;
      const c=document.createElement('canvas');const r=api.createNameCanvasRenderer(c,{text:'Chromadie Wi',fontKey:'soft-orbit',fontSize:36,materialKey:key,motionKey:'none'});
      r.resize({width:340,height:92,dpr:1});
      const hashes=[];
      for(const time of [0,1000,3000,5000,7500,10000,11999,12000,12001]) {
        r.draw(time);const first=pixels(c);frames++;hashes.push(first.hash);
        if(first.visible<60)failures.push(['empty',key,time]);
        r.draw(time);if(pixels(c).hash!==first.hash)failures.push(['nondeterministic',key,time]);
      }
      if(api.NAME_MATERIALS[key].animated && new Set(hashes).size<5)failures.push(['material does not animate',key]);
      if(!api.NAME_MATERIALS[key].animated && new Set(hashes).size!==1)failures.push(['approved material changed',key]);
      if(hashes[0]!==hashes[7] || hashes[0]!==hashes[8])failures.push(['period mismatch',key]);
      r.draw(11999);const before=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      r.draw(12000);const after=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      let seamError=0,seamChannels=0;
      for(let i=0;i<before.length;i+=4) {
        if(Math.max(before[i+3],after[i+3])<32)continue;
        for(let j=0;j<3;j++)seamError+=Math.abs(before[i+j]*before[i+3]/255-after[i+j]*after[i+3]/255);
        seamChannels+=3;
      }
      const seamMean=seamError/Math.max(1,seamChannels);
      if(seamMean>5)failures.push(['visible loop seam',key,seamMean]);
      r.setOptions({mode:'reduced-motion'});r.draw(0);const reduced=pixels(c).hash;
      r.draw(7000);if(pixels(c).hash!==reduced)failures.push(['reduced-motion moves',key]);
      for(const fontKey of api.NAME_COMPOSABLE_FONT_KEYS) {
        for(const compact of [false,true]) {
          r.resize({width:compact?230:340,height:compact?68:92,dpr:1});r.setOptions({fontKey,fontSize:compact?24:36,compact,mode:'animated',motionKey:'none'});
          r.draw(3800);frames++;if(pixels(c).visible<20)failures.push(['empty font',key,fontKey,compact]);
        }
      }
      for(const motionKey of Object.keys(api.NAME_MOTIONS)) {
        r.setOptions({fontKey:'soft-orbit',motionKey,mode:'animated'});r.draw(1800);frames++;
        if(pixels(c).visible<12)failures.push(['empty motion',key,motionKey]);
        r.setOptions({mode:'reduced-motion'});r.draw(1800);const still=pixels(c).hash;
        r.draw(7000);if(pixels(c).hash!==still)failures.push(['motion reduced changes',key,motionKey]);
      }
      for(const text of ['W','i','É é 👩‍💻','WWWWiiilllVeryLongChromadieIdentity']) {
        r.resize({width:text.length<2?76:250,height:72,dpr:2});
        r.setOptions({text,fontSize:28,motionKey:'none',mode:'animated'});r.draw(3700);frames++;
        if(pixels(c).visible<8)failures.push(['empty name',key,text]);
      }
      r.destroy();return {frames,failures,seamMean};
    };
    window.materialAtlas=(offset=0,light=false,compact=false)=>{
      const atlas=document.createElement('canvas');atlas.width=1440;atlas.height=1060;const ctx=atlas.getContext('2d');
      ctx.fillStyle=light?'#ebeef5':'#090b12';ctx.fillRect(0,0,1440,1060);
      materialKeys.slice(offset,offset+5).forEach((key,row)=>{
        const y=row*212;ctx.fillStyle=light?'#fff':'#151626';ctx.fillRect(12,y+8,1416,196);
        ctx.fillStyle=light?'#29334b':'#eef2ff';ctx.font='15px sans-serif';ctx.fillText(api.NAME_MATERIALS[key].label,26,y+31);
        [0,2000,4000,6000,8000,10000].forEach((time,col)=>{
          const c=document.createElement('canvas');const r=api.createNameCanvasRenderer(c,{text:'Chromadie',fontKey:'soft-orbit',fontSize:compact?24:38,materialKey:key,motionKey:'none'});
          r.resize({width:232,height:110,dpr:2});r.draw(time);ctx.drawImage(c,16+col*236,y+39,232,110);r.destroy();
          ctx.font='11px sans-serif';ctx.fillStyle=light?'#667086':'#9399ad';ctx.fillText(time/1000+'s',120+col*236,y+169);
        });
      });return atlas.toDataURL('image/png').split(',')[1];
    };
  })()`);
  const keys=await page.evaluate('window.materialKeys');assert.equal(keys.length,20);
  let frames=0;const failures=[];const seams={};
  for(const key of keys) {
    const result=await page.evaluate(`window.verifyMaterial(${JSON.stringify(key)})`);frames+=result.frames;failures.push(...result.failures);
    seams[key]=result.seamMean;
    console.log(`${key}: ${result.frames} frames, ${result.failures.length} failures`);
  }
  for(const offset of [0,5,10,15]) for(const [variant,light,compact] of [['desktop',false,false],['compact',false,true],['light',true,false]]) {
    const data=await page.evaluate(`window.materialAtlas(${offset},${light},${compact})`);
    await writeFile(`${evidenceDir}/${variant}-${offset}.png`,Buffer.from(data,'base64'));
  }
  const overview=await page.evaluate(`(()=>{
    const sheet=document.createElement('canvas');sheet.width=1360;sheet.height=780;
    const c=sheet.getContext('2d');c.fillStyle='#090b12';c.fillRect(0,0,sheet.width,sheet.height);
    materialKeys.forEach((key,i)=>{
      const x=i%4*340,y=Math.floor(i/4)*156;
      c.fillStyle='#151626';c.fillRect(x+8,y+8,324,140);
      c.fillStyle='#c9c9dc';c.font='13px sans-serif';c.fillText(api.NAME_MATERIALS[key].label,x+24,y+33);
      const canvas=document.createElement('canvas');
      const r=api.createNameCanvasRenderer(canvas,{text:'Chromadie',fontKey:'soft-orbit',fontSize:38,materialKey:key,motionKey:'none'});
      r.resize({width:310,height:100,dpr:2});r.draw(2000);c.drawImage(canvas,x+15,y+42,310,100);r.destroy();
    });return sheet.toDataURL('image/png').split(',')[1];
  })()`);
  await writeFile(`${evidenceDir}/collection.png`,Buffer.from(overview,'base64'));
  await page.evaluate(`(()=>{
    document.body.replaceChildren();const grid=document.createElement('main');grid.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:20px';document.body.append(grid);
    window.instances=[];
    for(const materialKey of materialKeys) {
      const card=document.createElement('section');card.style.cssText='height:128px;padding:16px;background:#151626';grid.append(card);
      const label=document.createElement('p');label.textContent=api.NAME_MATERIALS[materialKey].label;card.append(label);
      instances.push(api.mount(api.NameEffectCanvas,{target:card,props:{text:'Chromadie',fontKey:'soft-orbit',materialKey,motionKey:'none',semanticTag:'h2'}}));
    }
  })()`);
  await page.waitFor(`document.querySelectorAll('[data-name-font-ready="true"]').length===20`,'twenty material canvases');
  const activeFirst=await page.evaluate(`[...document.querySelectorAll('.name-effect-canvas canvas')].map(pixels)`);
  await new Promise(r=>setTimeout(r,600));
  const activeLater=await page.evaluate(`[...document.querySelectorAll('.name-effect-canvas canvas')].map(pixels)`);
  const definitions=await page.evaluate('api.NAME_MATERIALS');
  for(let i=0;i<keys.length;i++) if(definitions[keys[i]].animated && activeFirst[i].hash===activeLater[i].hash) failures.push(['mounted Still material not animating',keys[i]]);
  await page.command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await new Promise(r=>setTimeout(r,200));
  const reduced=await page.evaluate(`[...document.querySelectorAll('.name-effect-canvas canvas')].map(pixels)`);
  await new Promise(r=>setTimeout(r,300));assert.deepEqual(await page.evaluate(`[...document.querySelectorAll('.name-effect-canvas canvas')].map(pixels)`),reduced);
  await page.evaluate('Promise.all(instances.map(instance=>api.unmount(instance)))');
  assert.deepEqual(page.consoleLog.filter(entry=>entry.type==='exception'),[]);
  await writeFile(`${evidenceDir}/validation.json`,JSON.stringify({frames,materials:keys.length,seams,failures},null,2));
  assert.deepEqual(failures,[]);console.log(`Passed ${frames} frames, 20 mounted materials, reduced motion and animation checks.`);
} finally {
  if(browser){browser.page.ws?.close();await terminateProcess(browser.child,'Chromium');}
  await terminateProcess(vite.child,'Vite');
}
