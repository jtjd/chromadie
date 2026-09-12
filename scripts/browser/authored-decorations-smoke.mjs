import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { startVite, startChromium, terminateProcess, findAvailablePort } from './cdp-harness.mjs';
const anime = process.env.ANIME_DECORATIONS === '1';
const count = anime ? 15 : 9;
const evidenceDir = join(process.cwd(), anime ? 'artifacts/anime-decorations' : 'artifacts/authored-decorations');
await mkdir(evidenceDir, { recursive: true });
const appPort = await findAvailablePort(5270), debugPort = await findAvailablePort(9390);
const server = await startVite({ appPort, evidenceDir });
let browser;
try {
  const url=`http://127.0.0.1:${appPort}/scripts/browser/authored-decorations.html${anime ? '?anime' : ''}`;
  browser = await startChromium({ appUrl:url, debugPort, evidenceDir, width:1100, height:anime ? 2300 : 1250 });
  const { page } = browser;
  await page.navigate(url);
  await page.evaluate(`(async()=>{
    let fixture;
    for(let attempt=0;attempt<5;attempt++) {
      try { fixture=await import('/scripts/browser/authored-decorations-fixture.js?attempt='+attempt);break; }
      catch(error) { if(attempt===4)throw error;await new Promise(r=>setTimeout(r,500)); }
    }
    const {mountDecorationStudy}=fixture;
    document.body.replaceChildren();window.cleanup=mountDecorationStudy(document.body);
    window.pixels=()=>Array.from(document.querySelectorAll('canvas')).map(c=>{
      const gl=c.getContext('webgl'); if(!gl)return null;
      const data=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,data);
      let hash=0;for(const byte of data)hash=Math.imul(hash,31)+byte|0;return hash;
    });
  })()`);
  await page.evaluate('new Promise(r=>setTimeout(r,800))');
  const shaders = await page.evaluate(`(async()=>{
    const {vertexSource,fragmentSource}=await import('/src/lib/avatar-effect/illustratedDecorationRenderer.js');
    const gl=document.createElement('canvas').getContext('webgl');
    const result={ready:document.querySelectorAll('canvas.ready').length, shaders:[[gl.VERTEX_SHADER,vertexSource],[gl.FRAGMENT_SHADER,fragmentSource]].map(([type,text])=>{const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);const log=gl.getShaderInfoLog(s);gl.deleteShader(s);return log;})};
    gl.getExtension('WEBGL_lose_context').loseContext();return result;
  })()`);
  assert.deepEqual(shaders.shaders,['',''],'both production shaders compile');
  await page.screenshot(join(evidenceDir,'initial.png'));
  await page.waitFor(`document.querySelectorAll("canvas.ready").length===${count}`, 'all illustrated effects render with WebGL');
  if(anime) {
    await page.waitFor('document.querySelectorAll(".sakura-petals img").length===27 && Array.from(document.querySelectorAll(".sakura-petals img")).every(i=>i.complete&&i.naturalWidth>0)','all petal sprites load');
    const positions=await page.evaluate('Array.from(document.querySelectorAll(".sakura-petals .drift")).map(p=>getComputedStyle(p).transform)');
    assert.ok(new Set(positions).size>3,'petals start dispersed');
    await page.evaluate('new Promise(r=>setTimeout(r,300))');
    assert.notDeepEqual(await page.evaluate('Array.from(document.querySelectorAll(".sakura-petals .drift")).map(p=>getComputedStyle(p).transform)'),positions,'petals drift immediately');
  }
  const initial = await page.evaluate('pixels()');
  await page.evaluate('new Promise(r=>setTimeout(r,650))');
  const next = await page.evaluate('pixels()');
  initial.forEach((hash,i)=>assert.notEqual(hash,next[i],`sample ${i} animates`));
  await page.screenshot(join(evidenceDir,'desktop.png'));
  await page.evaluate(`window.lostContext=document.querySelector('canvas').getContext('webgl').getExtension('WEBGL_lose_context');window.lostContext.loseContext()`);
  await page.waitFor('!document.querySelector("canvas").classList.contains("ready")','context loss reveals still art');
  await page.evaluate('window.lostContext.restoreContext()');
  await page.waitFor('document.querySelector("canvas").classList.contains("ready")','context restores animation');
  for(let frame=0;frame<4;frame++) {
    await page.evaluate('new Promise(r=>setTimeout(r,1800))');
    await page.screenshot(join(evidenceDir,`motion-${frame}.png`));
  }
  // Compile and sample the actual shaders at the loop boundary and halfway.
  const loop = await page.evaluate(`(async()=>{
    const {vertexSource,fragmentSource}=await import('/src/lib/avatar-effect/illustratedDecorationRenderer.js');
    const image=new Image();image.src='/avatar-decorations/prismatic-fracture-v1.webp';await image.decode();
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true});
    const p=gl.createProgram();
    for(const [type,source] of [[gl.VERTEX_SHADER,vertexSource],[gl.FRAGMENT_SHADER,fragmentSource]]) {
      const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);
    }
    gl.linkProgram(p);gl.useProgram(p);
    const points=[];for(let y=0;y<32;y++)for(let x=0;x<32;x++)for(const [dx,dy] of [[0,0],[1,0],[0,1],[0,1],[1,0],[1,1]])points.push((x+dx)/32,(y+dy)/32);
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(p,'point');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    const out=[];
    for(let kind=0;kind<8;kind++) {
      gl.uniform1f(gl.getUniformLocation(p,'kind'),kind);
      const frames=[];
      for(const time of [0,16,4]) {
        gl.uniform1f(gl.getUniformLocation(p,'time'),time);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,32*32*6);
        const data=new Uint8Array(128*128*4);gl.readPixels(0,0,128,128,gl.RGBA,gl.UNSIGNED_BYTE,data);frames.push(data);
      }
      let seam=0,motion=0;for(let i=0;i<frames[0].length;i++){seam+=Math.abs(frames[0][i]-frames[1][i]);motion+=Math.abs(frames[0][i]-frames[2][i]);}
      out.push({seam:seam/frames[0].length,motion:motion/frames[0].length});
    }
    gl.getExtension('WEBGL_lose_context').loseContext();return out;
  })()`);
  for(const result of loop) { assert.ok(result.seam<.2,'loop has no visible seam');assert.ok(result.motion>.01,'individual choreography changes'); }
  await page.setReducedMotion(true);
  await page.waitFor('document.querySelectorAll("canvas.ready").length===0', 'reduced motion uses still artwork');
  const still = await page.evaluate('pixels()');
  if(anime) {
    assert.equal(await page.evaluate('Array.from(document.querySelectorAll(".sakura-petals .drift, .sakura-petals img")).every(p=>getComputedStyle(p).animationPlayState==="paused")'),true,'reduced motion pauses every petal');
  }
  await page.evaluate('new Promise(r=>setTimeout(r,200))');
  assert.deepEqual(await page.evaluate('pixels()'),still);
  assert.equal(await page.evaluate('Array.from(document.querySelectorAll(".illustrated-decoration img")).every(i=>i.complete&&i.naturalWidth>0&&getComputedStyle(i).visibility==="visible")'),true);
  await page.screenshot(join(evidenceDir,'reduced-motion.png'));
  await page.command('Emulation.setDeviceMetricsOverride',{width:390,height:1600,deviceScaleFactor:2,mobile:true});
  await page.screenshot(join(evidenceDir,'mobile.png'));
  if(anime) for(let section=0;section<6;section++) {
    await page.evaluate(`document.querySelectorAll('section')[${section}].scrollIntoView()`);
    await page.screenshot(join(evidenceDir,`mobile-${section}.png`));
  }
  assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  await page.setReducedMotion(false);
  await page.evaluate('document.body.style.paddingBottom="100vh";document.querySelector("section:last-of-type").scrollIntoView()');
  await page.waitFor('!document.querySelector("canvas").classList.contains("ready")','offscreen animation stops');
  const offscreen=await page.evaluate('pixels()[0]');
  await page.evaluate('new Promise(r=>setTimeout(r,200))');
  assert.equal(await page.evaluate('pixels()[0]'),offscreen,'offscreen pixels stay unchanged');
  await page.screenshot(join(evidenceDir,'mobile-bottom.png'));
  await page.evaluate('document.querySelector("button").click()');
  await page.waitFor('document.querySelectorAll("canvas.ready").length===0','animation toggle stops rendering');
  await page.setReducedMotion(true);
  const fit = await page.evaluate(`(() => {
    const results=[];
    for (const size of [64,86,88,90,96,100,107.2,108,120,136,180,240,320]) {
      for (const avatar of document.querySelectorAll('[data-avatar-effect]')) {
        avatar.parentElement.style.width=size+'px';
        avatar.parentElement.style.height=size+'px';
        const art=avatar.querySelector('.illustrated-decoration');
        if (!art) continue;
        const box=avatar.getBoundingClientRect(), plate=art.getBoundingClientRect();
        const img=art.querySelector('img').getBoundingClientRect();
        const canvas=art.querySelector('canvas').getBoundingClientRect();
        results.push({key:avatar.dataset.avatarEffect,size,
          scale:plate.width/box.width, aspect:plate.width/plate.height,
          x:(plate.x+plate.width/2-box.x-box.width/2)/box.width,
          y:(plate.y+plate.height/2-box.y-box.height/2)/box.height,
          aligned:Math.abs(img.x-canvas.x)+Math.abs(img.y-canvas.y)+Math.abs(img.width-canvas.width)+Math.abs(img.height-canvas.height)});
      }
    }
    return results;
  })()`);
  const baseline=new Map();
  for (const sample of fit) {
    if (!baseline.has(sample.key)) baseline.set(sample.key,sample);
    const expected=baseline.get(sample.key);
    assert.ok(sample.scale>=1.3 && sample.scale<=1.65, 'bounded decorative footprint');
    assert.ok(Math.abs(sample.scale-expected.scale)<.002, JSON.stringify(sample));
    assert.ok(Math.abs(sample.aspect-1)<.002, 'artwork stays square');
    assert.ok(Math.abs(sample.x-expected.x)<.002, 'proportional horizontal fit');
    assert.ok(Math.abs(sample.y-expected.y)<.002, 'proportional vertical fit');
    assert.ok(sample.aligned<.1, 'static and animated artwork share identical placement');
  }
  await page.evaluate('cleanup()');
  assert.equal(await page.evaluate('document.querySelectorAll("canvas").length'),0,'unmount removes canvases');
  assert.equal(page.consoleLog.filter(e=>e.type==='exception').length,0,JSON.stringify(page.consoleLog));
  await writeFile(join(evidenceDir,'results.json'),JSON.stringify({status:'passed',loop},null,2));
  console.log('Authored decoration browser checks passed. '+evidenceDir);
} finally {
  await terminateProcess(browser?.child,'Chromium');
  await terminateProcess(server.child,'Vite');
}
