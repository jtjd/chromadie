import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {startVite,startChromium,findAvailablePort,terminateProcess} from './cdp-harness.mjs';
const evidenceDir=process.env.FIT_EVIDENCE || '/tmp/chromadie-avatar-fit';
await mkdir(evidenceDir,{recursive:true});
let server,browser;
try {
  const port=await findAvailablePort(5290);
  const url=`http://127.0.0.1:${port}/scripts/browser/authored-decorations.html`;
  server=await startVite({appPort:port,evidenceDir});
  browser=await startChromium({appUrl:url,debugPort:await findAvailablePort(9430),evidenceDir,width:1440,height:700});
  const {page}=browser;
  await page.navigate(url);
  await page.setReducedMotion(true);
  await page.evaluate(`(async()=>{
    window.api=await import('/scripts/browser/profile-layout-parity-fixture.js');
    document.body.style.cssText='margin:0;background:#17131e;color:white;font-family:sans-serif';
    window.showFit=async(layout,key)=>{
      if(window.instance)await api.unmount(instance);
      document.body.replaceChildren();
      const host=document.createElement('main');
      host.style.cssText='box-sizing:border-box;width:100%;max-width:688px;padding:64px 24px 32px;margin:auto';
      document.body.append(host);
      const renderer=['compact','framed'].includes(layout)?api.reference:layout==='portfolio'?api.portfolio:api.fullBleed;
      window.instance=api.mount(renderer,{target:host,props:{displayName:'Harper',bio:'Color collector',avatarSrc:'/homepage/fixtures/compact-avatar.png',avatarEffectKey:key,layoutVariant:layout,presentation:'profile',nameLoadout:{fontKey:'soft-grotesk',materialKey:'plain',motionKey:'none'}}});
    };
    window.measureFit=()=>{
      const avatar=document.querySelector('[data-avatar-effect]');
      const plate=avatar.querySelector('.illustrated-decoration');
      const box=avatar.getBoundingClientRect();
      const name=document.querySelector('.name-effect-canvas').getBoundingClientRect();
      if(!plate){
        const emitter=avatar.querySelector('.sakura-petals').getBoundingClientRect();
        const overlap=emitter.left<name.right&&emitter.right>name.left&&emitter.top<name.bottom&&emitter.bottom>name.top;
        return {petals:true,nameHits:overlap?1:0,overflow:document.documentElement.scrollWidth>innerWidth};
      }
      const bounds=plate.getBoundingClientRect(),img=plate.querySelector('img');
      const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
      const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
      const data=ctx.getImageData(0,0,c.width,c.height).data;
      const clips=[];
      for(let parent=plate.parentElement;parent;parent=parent.parentElement){
        const style=getComputedStyle(parent);
        if(/hidden|clip|scroll|auto/.test(style.overflowX+' '+style.overflowY))clips.push({rect:parent.getBoundingClientRect(),x:style.overflowX!=='visible',y:style.overflowY!=='visible'});
      }
      let nameHits=0,clipped=0,visibleBottom=-Infinity;
      for(let y=0;y<c.height;y+=3)for(let x=0;x<c.width;x+=3){
        if(data[(y*c.width+x)*4+3]<128)continue;
        const px=bounds.x+x/c.width*bounds.width,py=bounds.y+y/c.height*bounds.height;
        visibleBottom=Math.max(visibleBottom,py);
        if(px>=name.x&&px<=name.right&&py>=name.y&&py<=name.bottom)nameHits++;
        if(px<0||px>innerWidth||py<0||clips.some(c=>(c.x&&(px<c.rect.left||px>c.rect.right))||(c.y&&(py<c.rect.top||py>c.rect.bottom))))clipped++;
      }
      return {size:box.width,nameHits,clipped,decorationGap:visibleBottom===-Infinity?null:name.y-visibleBottom,overflow:document.documentElement.scrollWidth>innerWidth};
    };
  })()`);
  const results=[];
  for(const width of [1440,997,390,320]) {
    await page.setViewport(width,700);
    for(const layout of ['compact','framed','full-bleed','sleek','portfolio']) {
      for(const key of ['moonlit-clouds','enchanted-garden','prismatic-fracture','sakura-neko','cloud-bunny','crimson-ronin','midnight-oni','koi-current','sakura-petals']) {
        await page.evaluate(`showFit(${JSON.stringify(layout)},${JSON.stringify(key)})`);
        await page.waitFor(key==='sakura-petals'?'document.querySelector(".sakura-petals img")?.complete':'document.querySelector(".illustrated-decoration img")?.naturalWidth>0','decoration loaded');
        await page.waitFor('document.querySelector("[data-name-font-ready=true]")','name ready');
        const measurement=await page.evaluate('measureFit()');
        results.push({width,layout,key,...measurement});
        if(layout==='full-bleed' && key!=='sakura-petals') {
          assert.ok(measurement.decorationGap >= 6 && measurement.decorationGap <= 22, `${width}/${layout}/${key}: avatar-to-name gap ${measurement.decorationGap}px is outside the fitted range`);
        }
        await page.screenshot(`${evidenceDir}/${width}-${layout}-${key}.png`);
      }
    }
    console.log(`Captured layouts at ${width}px`);
  }
  await writeFile(`${evidenceDir}/results.json`,JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.filter(r=>r.nameHits||r.clipped||r.overflow),null,2));
  if(process.env.FIT_AUDIT!=='1') {
    assert.ok(results.every(r=>!r.nameHits&&!r.clipped&&!r.overflow),'visible decoration stays clear of name and viewport');
    assert.deepEqual(page.consoleLog.filter(e=>e.type==='exception'),[]);
  }
}finally{
  await terminateProcess(browser?.child,'Chromium');
  await terminateProcess(server?.child,'Vite');
}
