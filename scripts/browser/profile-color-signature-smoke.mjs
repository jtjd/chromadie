import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { startVite, startChromium, findAvailablePort, terminateProcess } from './cdp-harness.mjs';

const evidenceDir = join(process.cwd(), 'artifacts', 'profile-color-signature');
await mkdir(evidenceDir, { recursive: true });
let server;
let chromium;
try {
  const appPort = await findAvailablePort(5198);
  server = await startVite({ appPort, evidenceDir });
  chromium = await startChromium({ appUrl: `http://127.0.0.1:${appPort}`, debugPort: await findAvailablePort(9260), evidenceDir, width: 1440, height: 900 });
  const page = chromium.page;
  await page.waitFor('document.querySelector(".profile-example")', 'example mount');
  await page.setReducedMotion(true);
  await page.evaluate('document.querySelector(".profile-example").scrollIntoView({block:"center"})');
  await page.waitFor('document.querySelector(".profile-example .profile-roll-summary")', 'shared profile signature');
  for (const width of [1440, 390, 320]) {
    await page.setViewport(width, 900);
    await page.evaluate('document.querySelector(".profile-example__canvas").scrollIntoView({block:"center"})');
    const style = await page.evaluate(`(() => {
      const el=document.querySelector('.profile-example .profile-roll-summary');
      const css=getComputedStyle(el);
      const swatch=getComputedStyle(el.querySelector('.profile-roll-summary__swatch'));
      return {background:css.backgroundColor,shadow:css.boxShadow,color:css.color,parent:getComputedStyle(el.parentElement).color,swatch:swatch.backgroundColor,overflow:document.documentElement.scrollWidth>innerWidth+1};
    })()`);
    assert.equal(style.background, 'rgba(0, 0, 0, 0)');
    assert.equal(style.shadow, 'none');
    assert.equal(style.color, style.parent);
    assert.equal(style.swatch, 'rgb(94, 186, 227)');
    assert.equal(style.overflow, false);
    await page.evaluate('document.querySelector(".profile-example summary").focus()');
    await page.pressKey('Space');
    await page.waitFor('document.querySelector(".profile-example details").open', 'keyboard disclosure');
    assert.ok(await page.evaluate('document.querySelector(".profile-example details").textContent.includes("38,697")'));
    await page.screenshot(join(evidenceDir, `signature-open-${width}.png`));
    await page.pressKey('Space');
    await page.waitFor('!document.querySelector(".profile-example details").open', 'keyboard collapse');
    await page.screenshot(join(evidenceDir, `signature-${width}.png`));
  }
  console.log('PASS inherited appearance, exact swatch, keyboard disclosure, reduced motion and desktop/mobile geometry');
} finally {
  await chromium?.page?.close();
  await terminateProcess(chromium?.child, 'Chromium');
  await terminateProcess(server?.child, 'Vite');
}
