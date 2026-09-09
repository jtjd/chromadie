import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { startVite, startChromium, findAvailablePort, terminateProcess } from './cdp-harness.mjs';

const evidenceDir = '/tmp/chromadie-portfolio-pages';
await mkdir(evidenceDir, { recursive: true });
let server;
let browser;

try {
  const appPort = await findAvailablePort(5310);
  server = await startVite({ appPort, evidenceDir });
  browser = await startChromium({ appUrl: `http://127.0.0.1:${appPort}`, debugPort: await findAvailablePort(9440), evidenceDir, width: 1440, height: 900 });
  const { page } = browser;
  await page.navigate(`http://127.0.0.1:${appPort}`);
  await page.setReducedMotion(true);
  await page.evaluate(`(async () => {
    let api;
    for (let attempt = 0; attempt < 20 && !api; attempt += 1) {
      try {
        api = await import('/scripts/browser/profile-layout-parity-fixture.js?portfolio=' + attempt);
      } catch (error) {
        if (attempt === 19) throw error;
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }
    const { createDefaultProfileConfig } = await import('/src/lib/profileConfig.js');
    const config = createDefaultProfileConfig('#8B7CF6');
    config.layoutVariant = 'portfolio';
    config.storyVisible = true;
    config.content = {
      ...config.content,
      about: { ...config.content.about, visible: true, heading: 'About Harper', body: 'A profile with a little more room to tell its story.' }
    };
    document.body.replaceChildren();
    document.body.style.cssText = 'margin:0;background:#07080b;color:#fff';
    const host = document.createElement('div');
    host.style.cssText = 'height:900px';
    document.body.append(host);
    window.portfolioApi = api;
    window.portfolioShell = api.mount(api.profileShell, { target: host, props: {
      previewMode: true,
      renderContext: 'profile',
      renderEnvironment: false,
      previewDevice: 'desktop',
      previewProfile: { username: 'harper', display_name: 'Harper', bio: 'A profile with a little more room.' },
      previewProfileConfig: config
    }});
    window.portfolioMusic = null;
    window.portfolioHost = host;
  })()`);
  await page.waitFor('document.querySelector(".profile-shell-page--portfolio[aria-busy=\\"false\\"]")', 'portfolio shell');
  await page.waitFor('document.querySelectorAll("[data-profile-portfolio-page]").length === 3', 'portfolio page sections');

  const initial = await page.evaluate(`(() => {
    const main = document.querySelector('.profile-shell-page');
    const pages = [...document.querySelectorAll('[data-profile-portfolio-page]')];
    return {
      pageCount: pages.length,
      dotCount: document.querySelectorAll('.profile-shell__portfolio-pagination button').length,
      scrollHeight: main?.scrollHeight || 0,
      clientHeight: main?.clientHeight || 0,
      overflow: document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1
    };
  })()`);
  assert.equal(initial.pageCount, 3, 'portfolio renders one section per visible page');
  assert.equal(initial.dotCount, 3, 'portfolio pagination matches rendered sections');
  assert.ok(initial.scrollHeight > initial.clientHeight, `portfolio sections create a scrollable page: ${JSON.stringify(initial)}`);
  assert.equal(initial.overflow, false, 'portfolio does not overflow horizontally');
  await page.screenshot(`${evidenceDir}/hero.png`);

  await page.evaluate('document.querySelector(".profile-shell-page").dispatchEvent(new WheelEvent("wheel", {deltaY:80,bubbles:true,cancelable:true}))');
  await page.waitFor('document.querySelectorAll(".profile-shell__portfolio-pagination button")[1].classList.contains("active") && document.querySelector(".profile-shell-page").scrollTop > 100', 'portfolio page navigation');
  const navigated = await page.evaluate(`(() => {
    const main = document.querySelector('.profile-shell-page');
    const content = document.querySelector('[data-profile-portfolio-page="content"]');
    return { scrollTop: main?.scrollTop || 0, contentTop: content?.getBoundingClientRect().top || 0, viewportTop: main?.getBoundingClientRect().top || 0 };
  })()`);
  assert.ok(Math.abs(navigated.contentTop - navigated.viewportTop) < 3, `portfolio navigation aligns the page: ${JSON.stringify(navigated)}`);
  await page.screenshot(`${evidenceDir}/about.png`);

  await page.evaluate(`(async () => {
    await window.portfolioApi.unmount(window.portfolioShell);
    document.body.replaceChildren();
    const host = document.createElement('div');
    document.body.append(host);
    window.portfolioMusic = window.portfolioApi.mount(window.portfolioApi.music, { target: host, props: {
      placement: 'floating',
      audioSrc: 'data:audio/mpeg;base64,AA==',
      audioPlaylist: { tracks: [], controls: true },
      deferMedia: true,
      accentColor: '#8B7CF6'
    }});
  })()`);
  await page.waitFor('document.querySelector(".profile-audio-control")', 'audio progress control');
  const audio = await page.evaluate(`(() => {
    const control = document.querySelector('.profile-audio-control');
    const box = control?.getBoundingClientRect();
    return {
      hasProgress: Boolean(document.querySelector('.profile-audio-control')),
      hasVolume: Boolean(document.querySelector('.profile-audio-control__volume')),
      legacySkip: Boolean(document.querySelector('.profile-music__skip')),
      width: box?.width || 0,
      viewport: innerWidth,
      overflow: document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1
    };
  })()`);
  assert.equal(audio.hasProgress, true, 'audio exposes a styled progress control');
  assert.equal(audio.hasVolume, true, 'audio exposes a styled volume control');
  assert.equal(audio.legacySkip, false, 'audio no longer renders the legacy split skip controls');
  assert.ok(audio.width <= audio.viewport, 'inline audio control fits the viewport');
  assert.equal(audio.overflow, false, 'inline audio control does not overflow');
  assert.equal(await page.evaluate('Math.round(document.querySelector(".profile-audio-control").getBoundingClientRect().width)'), 52);
  await page.screenshot(`${evidenceDir}/audio.png`);
  await page.evaluate('document.querySelector(".profile-audio-control button").focus()');
  await page.waitFor('document.querySelector(".profile-audio-control").getBoundingClientRect().width >= 165', 'expanded volume');
  await page.screenshot(`${evidenceDir}/audio-expanded.png`);
} catch (error) {
  console.error(error);
  console.error(browser?.page?.consoleLog || []);
  throw error;
} finally {
  await browser?.page?.close();
  await terminateProcess(browser?.child, 'Chromium');
  await terminateProcess(server?.child, 'Vite');
}

console.log(`Portfolio page smoke passed; screenshots: ${evidenceDir}`);
