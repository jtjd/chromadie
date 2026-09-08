import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { startVite, startChromium, terminateProcess, findAvailablePort } from './cdp-harness.mjs';

const evidenceDir = '/tmp/chromadie-cursor-trails';
await mkdir(evidenceDir, { recursive: true });
const appPort = await findAvailablePort(5240);
const debugPort = await findAvailablePort(9370);
const vite = await startVite({ appPort, evidenceDir });
let browser;
try {
  browser = await startChromium({ appUrl: `http://127.0.0.1:${appPort}`, debugPort, evidenceDir, width: 1440, height: 1050 });
  const { page } = browser;
  await page.navigate(`http://127.0.0.1:${appPort}`);
  await page.evaluate(`(async () => {
    // Vite can invalidate its first dependency bundle during a cold start.
    let fixture;
    for (let attempt=0; attempt<5; attempt++) {
      try { fixture = await import('/scripts/browser/cursor-trails-fixture.js?attempt='+attempt); break; }
      catch (error) {
        if (attempt===4 || !String(error).includes('Failed to fetch dynamically imported module')) throw error;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    const { mount, unmount, Trail, Environment } = fixture;
    const catalog = await import('/src/lib/cursor-trail/cursorTrails.js');
    document.body.replaceChildren();
    document.body.style.cssText = 'margin:0;background:#090812;color:white;font:14px sans-serif';
    const grid = document.createElement('main');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:16px';
    document.body.append(grid);
    window.trailMounts = [];
    window.mountStudioEnvironment = () => window.trailMounts.push(mount(Environment, {
      target: grid, props: { mode:'studio', snapshot:{ environment:{ cursorTrailKey:'ink-drops' } } }
    }));
    window.mountTrail = (key, mode='demo') => {
      const card = document.createElement('section');
      card.style.cssText = 'height:220px;position:relative;background:linear-gradient(140deg,#1b1235,#0a1620);border:1px solid #343044;border-radius:12px;overflow:hidden';
      const label = document.createElement('span'); label.textContent = catalog.getCursorTrailDefinition(key).label;
      label.style.cssText = 'position:absolute;top:14px;left:16px'; card.append(label); grid.append(card);
      window.trailMounts.push(mount(Trail, { target:card, props:{ trailKey:key, inputMode:mode, recentColors:['#FF198C','#00D5FF','#A0FF16'] } }));
    };
    window.clearTrails = async () => { for (const instance of window.trailMounts) await unmount(instance); window.trailMounts = []; grid.replaceChildren(); };
    catalog.CURSOR_TRAIL_KEYS.filter(catalog.isCuratedCursorTrail).forEach(key => window.mountTrail(key));
    window.pixelCounts = () => [...document.querySelectorAll('canvas')].map(canvas => {
      const data = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let count=0; for(let i=3;i<data.length;i+=4) if(data[i]) count++;
      return count;
    });
  })()`);
  await new Promise(resolve => setTimeout(resolve, 1800));
  const shot = await page.command('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${evidenceDir}/desktop.png`, Buffer.from(shot.data, 'base64'));
  console.log(await page.evaluate(`([...document.querySelectorAll('[data-trail-key]')].map((el,i) => [el.dataset.trailKey, window.pixelCounts()[i]]))`));
  assert.ok((await page.evaluate('window.pixelCounts()')).every(count => count > 0));
  await page.evaluate(`(async () => { await window.clearTrails(); window.mountStudioEnvironment(); })()`);
  await page.waitFor(`document.querySelector('.profile-environment--studio [data-input-mode="window"] canvas')`, 'Customize pointer trail');
  await new Promise(resolve => setTimeout(resolve, 250));
  assert.equal((await page.evaluate('window.pixelCounts()'))[0], 0, 'Customize does not animate before pointer movement');
  for (let x = 50; x < 260; x += 12) {
    await page.command('Input.dispatchMouseEvent', { type:'mouseMoved', x, y:130 });
    await new Promise(resolve => setTimeout(resolve, 32));
  }
  assert.ok((await page.evaluate('window.pixelCounts()'))[0] > 0);
  await new Promise(resolve => setTimeout(resolve, 1700));
  assert.equal((await page.evaluate('window.pixelCounts()'))[0], 0, 'idle canvas clears');
  await page.evaluate(`(() => { const ctx=document.querySelector('canvas').getContext('2d'); window.idleDraws=0; const clear=ctx.clearRect.bind(ctx); ctx.clearRect=(...args) => { window.idleDraws++; clear(...args); }; })()`);
  await new Promise(resolve => setTimeout(resolve, 200));
  assert.equal(await page.evaluate('window.idleDraws'), 0, 'idle renderer stops scheduling draws');
  await page.command('Emulation.setEmulatedMedia', { features:[{name:'prefers-reduced-motion',value:'reduce'}] });
  await page.command('Input.dispatchMouseEvent', { type:'mouseMoved', x:120, y:110 });
  assert.equal((await page.evaluate('window.pixelCounts()'))[0], 0, 'reduced motion pointer does not emit');
  await page.command('Emulation.setDeviceMetricsOverride', { width:390, height:844, deviceScaleFactor:2, mobile:true });
  await page.evaluate(`(async () => { await window.clearTrails(); document.querySelector('main').style.gridTemplateColumns='1fr'; window.mountTrail('glass-shards'); window.mountTrail('emoji-bloom'); window.mountTrail('bubble-wake'); })()`);
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.ok((await page.evaluate('window.pixelCounts()')).every(count => count > 0));
  const staticCounts = await page.evaluate('window.pixelCounts()');
  await new Promise(resolve => setTimeout(resolve, 200));
  assert.deepEqual(await page.evaluate('window.pixelCounts()'), staticCounts, 'reduced-motion previews stay static');
  const mobile = await page.command('Page.captureScreenshot', { format:'png' });
  await writeFile(`${evidenceDir}/mobile-reduced.png`, Buffer.from(mobile.data, 'base64'));
  const exceptions = page.consoleLog.filter(entry => entry.type === 'exception');
  assert.deepEqual(exceptions, []);
  console.log(`Cursor trail browser checks passed; screenshots: ${evidenceDir}`);
} finally {
  if (browser) { browser.page.ws?.close(); await terminateProcess(browser.child, 'Chromium'); }
  await terminateProcess(vite.child, 'Vite');
}
