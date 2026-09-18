import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { startVite, startChromium, terminateProcess, findAvailablePort } from './cdp-harness.mjs';

const evidenceDir = join(process.cwd(), 'artifacts/profile-borders');
await mkdir(evidenceDir, { recursive: true });
const appPort = await findAvailablePort(5275);
const debugPort = await findAvailablePort(9395);
const server = await startVite({ appPort, evidenceDir });
let browser;
try {
  const url = `http://127.0.0.1:${appPort}/scripts/browser/profile-borders.html`;
  browser = await startChromium({ appUrl: url, debugPort, evidenceDir, width: 1320, height: 2100 });
  const { page } = browser;
  await page.navigate(url);
  await page.waitFor('document.querySelectorAll("[data-sample]").length === 10', 'ten authored border designs');
  await page.waitFor('document.querySelectorAll("[data-sample] .border-art").length === 20', 'all profile and compact illustrations load');
  await page.evaluate('document.fonts.ready');
  await page.screenshot(join(evidenceDir, 'desktop.png'));

  // Every design must visibly animate while leaving the content box untouched.
  const animation = await page.evaluate(`(async () => {
    const rows = [];
    for (const section of document.querySelectorAll('[data-sample]')) {
      section.scrollIntoView({block:'center'});
      await new Promise(r => setTimeout(r, 100));
      const art = section.querySelector('.border-art');
      const identity = section.querySelector('.identity');
      const sample = () => Array.from(art.querySelectorAll('*')).map(el => {
        const css = getComputedStyle(el);
        return [css.display, css.animationName, css.backgroundPosition, css.transform, css.opacity].join('|');
      });
      const before = sample();
      const box = identity.getBoundingClientRect().toJSON();
      // Seek the intentionally intermittent ink and heart accents into motion.
      for (const a of art.getAnimations({subtree:true})) {
        if (a.animationName.includes('ink-impact')) a.currentTime = 7100;
        if (a.animationName.includes('heart-beat')) a.currentTime = 3800;
      }
      await new Promise(r => setTimeout(r, 240));
      rows.push({key:section.dataset.sample, changed:JSON.stringify(before)!==JSON.stringify(sample()),
        stable:JSON.stringify(box)===JSON.stringify(identity.getBoundingClientRect().toJSON()),
        mask:getComputedStyle(art.querySelector('.rim')).maskComposite,
        pointerEvents:getComputedStyle(art).pointerEvents});
    }
    return rows;
  })()`);
  for (const row of animation) {
    assert.ok(row.changed, `${row.key} animates`);
    assert.ok(row.stable, `${row.key} never moves profile content`);
    assert.ok(row.mask.split(', ').every(value => value === 'exclude'));
    assert.equal(row.pointerEvents, 'none');
  }
  await page.evaluate('scrollTo(0,0)');
  await page.screenshot(join(evidenceDir, 'desktop-motion.png'));

  await page.evaluate('document.querySelector(".profile-link").click()');
  assert.equal(await page.evaluate('document.querySelector("output").textContent'), '1');
  await page.evaluate('document.querySelector(".profile-link").focus()');
  await page.pressKey('Enter');
  assert.equal(await page.evaluate('document.querySelector("output").textContent'), '2', 'border leaves keyboard actions usable');
  await page.evaluate('document.querySelector("#toggle").click()');
  assert.equal(await page.evaluate('Array.from(document.querySelectorAll("[data-sample] .border-art")).every(a=>a.classList.contains("paused"))'), true);
  await page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  const still = await page.evaluate('Array.from(document.querySelectorAll("[data-sample] .border-art .illustration, [data-sample] .border-art .mote")).map(e=>getComputedStyle(e).transform + getComputedStyle(e).opacity)');
  await page.evaluate('new Promise(r=>setTimeout(r,200))');
  assert.deepEqual(await page.evaluate('Array.from(document.querySelectorAll("[data-sample] .border-art .illustration, [data-sample] .border-art .mote")).map(e=>getComputedStyle(e).transform + getComputedStyle(e).opacity)'), still);
  await page.setReducedMotion(true);
  await page.screenshot(join(evidenceDir, 'reduced-motion.png'));
  assert.equal(await page.evaluate('Array.from(document.querySelectorAll(".border-art")).every(a=>a.getAnimations({subtree:true}).length===0)'), true);
  const compactFit = await page.evaluate(`Array.from(document.querySelectorAll('.mini-row')).map(row => {
    const clip = row.querySelector('.shop-preview-area').getBoundingClientRect();
    return { key:row.closest('[data-sample]').dataset.sample, fits:Array.from(row.querySelectorAll('.ornament path')).every(path => {
      const box=path.getBoundingClientRect();
      return !box.width || (box.left >= clip.left-1 && box.right <= clip.right+1 && box.top >= clip.top-1 && box.bottom <= clip.bottom+1);
    })};
  })`);
  for (const row of compactFit) assert.ok(row.fits, `${row.key} ornaments fit the real catalog preview`);

  // Exercise the actual public profile card, both retained effects, custom
  // corner radii, and a light surface rather than only isolated illustrations.
  for (const key of ['chroma','glitch','gold','neon','prism','void','signal','elastic','shimmer-track','aurora','celestial','crystal']) {
    await page.evaluate(`(() => { const select=document.querySelector('select'); select.value=${JSON.stringify(key)}; select.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('.actual').scrollIntoView({block:'center'}); })()`);
    await page.waitFor(`document.querySelector('.actual [data-profile-border="${key}"]')`, 'production profile applies border');
    await page.screenshot(join(evidenceDir, `profile-${key}.png`));
  }
  await page.evaluate(`document.querySelector('.actual [data-profile-border]').style.setProperty('--profile-border-radius','0px')`);
  await page.screenshot(join(evidenceDir, 'square-radius.png'));
  await page.evaluate(`(() => {
    const select=document.querySelector('select'); select.value='aurora'; select.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await page.waitFor('document.querySelector(".actual [data-border-style=bloom]")', 'light-surface specimen');
  await page.evaluate(`(() => {
    const surface=document.querySelector('.actual [data-profile-border]');
    surface.style.setProperty('--profile-border-radius','40px');
    const card=surface.querySelector('[data-profile-reference-card]');
    card.style.setProperty('--profile-border-radius','40px');
    card.style.setProperty('--profile-surface-fill','#eee8df');
    card.style.setProperty('--profile-username','#242029');
    card.style.setProperty('--profile-description','#5b5362');
    card.style.setProperty('--profile-secondary-text','#5b5362');
  })()`);
  await page.screenshot(join(evidenceDir, 'light-surface.png'));
  await page.command('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
  for (const key of ['chroma','glitch','gold','neon','prism','void','signal','elastic','shimmer-track','aurora']) {
    await page.evaluate(`document.querySelector('[data-sample="${key}"]').scrollIntoView({block:'center'})`);
    await page.screenshot(join(evidenceDir, `mobile-${key}.png`));
    assert.equal(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'),true,'no horizontal overflow');
  }
  await page.evaluate('document.querySelector(".actual").scrollIntoView({block:"center"})');
  await page.screenshot(join(evidenceDir, 'mobile-profile.png'));
  await page.setReducedMotion(false);
  await page.evaluate('document.querySelector("#toggle").click()');
  await page.waitFor('document.querySelector("[data-sample] .border-art").classList.contains("paused")', 'offscreen motion pauses');
  await page.evaluate('scrollTo(0,0)');
  await page.waitFor('!document.querySelector("[data-sample] .border-art").classList.contains("paused")', 'visible motion resumes');
  await page.evaluate('Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"))');
  await page.waitFor('Array.from(document.querySelectorAll(".border-art")).every(a=>a.classList.contains("paused"))', 'hidden documents pause decoration');
  await page.evaluate('delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))');
  await page.waitFor('!document.querySelector("[data-sample] .border-art").classList.contains("paused")', 'foreground motion resumes');
  const errors = page.consoleLog.filter(e => e.type === 'exception');
  assert.deepEqual(errors, []);
  await page.evaluate('cleanup()');
  assert.equal(await page.evaluate('document.querySelectorAll(".border-art").length'),0);
  await writeFile(join(evidenceDir, 'results.json'), JSON.stringify({status:'passed', animation, compactFit}, null, 2));
  console.log(`Profile border browser checks passed. ${evidenceDir}`);
} finally {
  await terminateProcess(browser?.child, 'Chromium');
  await terminateProcess(server.child, 'Vite');
}
