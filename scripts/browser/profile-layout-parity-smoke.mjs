import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { startVite, startChromium, findAvailablePort, terminateProcess } from './cdp-harness.mjs';

const evidenceDir = '/tmp/chromadie-layout-parity';
await mkdir(evidenceDir, { recursive: true });
let server;
let browser;
try {
  const appPort = await findAvailablePort(5280);
  server = await startVite({ appPort, evidenceDir });
  browser = await startChromium({ appUrl: `http://127.0.0.1:${appPort}`, debugPort: await findAvailablePort(9410), evidenceDir, width: 1440, height: 1000 });
  const { page } = browser;
  await page.navigate(`http://127.0.0.1:${appPort}`);
  await page.setReducedMotion(true);
  try {
    await page.waitFor('document.querySelector(".profile-example")', 'homepage');
  } catch (error) {
    if (!page.consoleLog.some(entry => entry.text.includes('ERR_NETWORK_CHANGED'))) throw error;
    await page.navigate(`http://127.0.0.1:${appPort}`);
    await page.waitFor('document.querySelector(".profile-example")', 'homepage after network recovery');
  }
  await page.evaluate('document.querySelector(".profile-example").scrollIntoView({block:"center"})');
  await page.waitFor('document.querySelector(".profile-example .name-effect-canvas canvas")', 'homepage name');
  for (const width of [1440, 390, 320]) {
    await page.setViewport(width, 1000);
    for (let scene = 0; scene < 3; scene++) {
      await page.evaluate(`document.querySelectorAll('.profile-example__controls button')[${scene}].click()`);
      const sceneSelector = `.profile-example [data-profile-layout-content][aria-label="${['chm', 'katt', 'meilin'][scene]} profile"]`;
      await page.waitFor(`document.querySelector(${JSON.stringify(sceneSelector)})`, 'scene renderer');
      if (scene < 2) {
        await page.waitFor(`(() => { const card=document.querySelector(${JSON.stringify(sceneSelector)}); return card && getComputedStyle(card).getPropertyValue('--profile-sleek-name-offset').trim() !== ''; })()`, 'Sleek name alignment');
      }
      await page.waitFor(`document.querySelector(${JSON.stringify(sceneSelector)})?.querySelector('[data-name-font-ready=true]')`, 'scene font');
      await page.evaluate('document.querySelector(".profile-example__canvas").scrollIntoView({block:"center"})');
      const aligned = await page.evaluate(`(() => {
        const card=document.querySelector('.profile-example [data-profile-layout-content]');
        const rect=el=>el.getBoundingClientRect();
        const name=rect(card.querySelector('.name-effect-canvas'));
        const bio=rect(card.querySelector('.profile-full-bleed__bio'));
        const avatar=rect(card.querySelector('.profile-full-bleed__avatar-shell'));
        const links=rect(card.querySelector('nav'));
        const center=box=>box.x+box.width/2;
        return card.dataset.profileLayoutContent!=='sleek'||(
          Math.abs(center(name)-center(avatar))<1&&
          Math.abs(bio.x-name.x)<1&&
          Math.abs(links.x-name.x)<1
        );
      })()`);
      assert.equal(aligned, true, 'homepage uses Sleek alignment');
      await page.screenshot(`${evidenceDir}/homepage-${width}-${scene}.png`);
    }
  }
  await page.evaluate(`(async () => {
    window.layoutApi = await import('/scripts/browser/profile-layout-parity-fixture.js');
    document.body.replaceChildren();
    document.body.style.cssText='margin:0;background:#131313;color:#fff';
    window.showLayout = async (layout, variant='normal') => {
      if(window.layoutInstance) await window.layoutApi.unmount(window.layoutInstance);
      document.body.replaceChildren();
      const host=document.createElement('main');
      host.style.cssText='display:block;width:100%;padding:110px 24px 40px;max-width:688px;margin:auto;box-sizing:border-box';
      document.body.append(host);
      const renderer=['compact','framed'].includes(layout)?window.layoutApi.reference:layout==='portfolio'?window.layoutApi.portfolio:window.layoutApi.fullBleed;
      window.layoutInstance=window.layoutApi.mount(renderer,{target:host,props:{
        displayName:variant==='long'?'WWWWiiilllVeryLongChromadieIdentity':'Harper',
        bio:variant==='empty'?'':'Unity Game Developer',
        location:variant==='empty'?'':'San Francisco',
        nameLoadout:{fontKey:'soft-grotesk',materialKey:'plain',motionKey:'none'},
        layoutVariant:layout,presentation:'profile',showAvatar:variant!=='hidden',
        roll:variant==='empty'?null:{hex_code:'#8DDCFF',identity:variant==='long'?'An exceptionally long daily color identity':'Bright Vivid Azure',rarity:'Uncommon'},
        links:variant==='empty'?[]:[{type:'github',url:'https://github.com',label:'GitHub'},{type:'youtube',url:'https://youtube.com',label:'YouTube'}]
      }});
    };
    window.layoutMeasurements = () => {
      const card=document.querySelector('[data-profile-layout-content]');
      const box=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
      const name=card.querySelector('.name-effect-canvas');
      const bio=card.querySelector('[class*="__bio"]');
      const avatar=card.querySelector('[class*="__avatar-shell"]');
      const identityCopy=card.querySelector('[class*="__identity-copy"]');
      const metadata=card.querySelector('[class*="__metadata"]');
      const roll=card.querySelector('[data-profile-roll-slot]');
      const links=card.querySelector('nav');
      const initial=card.querySelector('.profile-avatar-fallback');
      return {card:box(card),name:box(name),bio:box(bio),avatar:box(avatar),identityCopy:box(identityCopy),metadata:box(metadata),roll:box(roll),summary:box(roll?.firstElementChild),links:box(links),initial:box(initial),letter:initial?.textContent.trim(),font:initial?parseFloat(getComputedStyle(initial.firstElementChild).fontSize):0,overflow:document.documentElement.scrollWidth>innerWidth+1};
    };
  })()`);
  let count = 0;
  for (const width of [1440, 390, 320]) {
    await page.setViewport(width, 1000);
    for (const layout of ['compact', 'full-bleed', 'sleek', 'framed', 'portfolio']) {
      for (const variant of ['normal', 'long', 'empty', 'hidden']) {
        await page.evaluate(`window.showLayout(${JSON.stringify(layout)},${JSON.stringify(variant)})`);
        await page.waitFor(`document.querySelector('[data-profile-layout-content="${layout}"]')`, 'layout renderer');
        if (layout === 'sleek' && variant !== 'hidden') {
          await page.waitFor(`(() => { const card=document.querySelector('[data-profile-layout-content="sleek"]'); return card && getComputedStyle(card).getPropertyValue('--profile-sleek-name-offset').trim() !== ''; })()`, 'Sleek name alignment');
        }
        await page.waitFor('document.querySelector("[data-name-font-ready=true]")', 'name font');
        const m = await page.evaluate('window.layoutMeasurements()');
        assert.equal(m.overflow, false, `${width}/${layout}/${variant}: overflow ${JSON.stringify(m)}`);
        if (m.initial) {
          assert.equal(m.letter, variant === 'long' ? 'W' : 'H');
          assert.ok(Math.abs(m.font / m.initial.width - .55) < .01, 'consistent large initial');
        }
        for (const key of ['name', 'bio', 'links', 'roll']) {
          if (m[key]) assert.ok(m[key].x >= m.card.x - 1 && m[key].right <= m.card.right + 1, `${width}/${layout}/${variant}: ${key} containment ${JSON.stringify(m)}`);
        }
        if (layout === 'sleek') {
          if (m.avatar && m.name) assert.ok(Math.abs((m.name.x + m.name.width / 2) - (m.avatar.x + m.avatar.width / 2)) < 1, `Sleek name stays centered on the avatar: ${JSON.stringify(m)}`);
          if (m.name && m.bio) assert.ok(Math.abs(m.name.x - m.bio.x) < 1, 'Sleek bio shares the username left edge');
          if (m.name && m.links) assert.ok(Math.abs(m.name.x - m.links.x) < 1, 'Sleek links remain left aligned');
          if (m.metadata) {
            assert.ok(m.metadata.x + m.metadata.width / 2 > m.card.x + m.card.width / 2, 'Sleek metadata stays in the top-right');
            if (m.roll) assert.ok(m.metadata.bottom <= m.roll.y + 1 || m.metadata.x + m.metadata.width < m.roll.x + 1, 'Sleek metadata does not overlap the roll');
          }
          if (m.roll) assert.ok(m.roll.bottom <= m.name.y + 1, 'widget reserves height above identity');
        } else {
          if (layout === 'framed' && m.avatar && m.identityCopy) {
            assert.ok(Math.abs((m.identityCopy.y + m.identityCopy.height / 2) - (m.avatar.y + m.avatar.height / 2)) < 1, 'Modern identity is vertically centered beside avatar');
          }
        }
        if (layout !== 'sleek' && m.summary) {
          assert.ok(Math.abs(m.summary.x + m.summary.width / 2 - m.card.x - m.card.width / 2) < 1, 'daily color visually centered');
        }
        if (variant === 'normal') await page.screenshot(`${evidenceDir}/${layout}-${width}.png`);
        count++;
      }
    }
  }
  assert.deepEqual(page.consoleLog.filter(entry => entry.type === 'exception'), []);
  console.log(`Passed ${count} layout/viewport/content cases; screenshots: ${evidenceDir}`);
} finally {
  if (browser) await writeFile(`${evidenceDir}/browser-log.json`, JSON.stringify(browser.page.consoleLog, null, 2));
  await browser?.page?.close();
  await terminateProcess(browser?.child, 'Chromium');
  await terminateProcess(server?.child, 'Vite');
}
