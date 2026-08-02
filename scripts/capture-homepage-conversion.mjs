import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(root, 'artifacts/homepage-candidate-5-11');
const chromium = process.env.CHROMIUM_BIN || '/usr/bin/chromium';
const appPort = Number(process.env.CAPTURE_PORT || 5174);
const captures = [
  { name: 'homepage-reference-1907x942', width: 1907, height: 942, scroll: 0 },
  { name: 'homepage-wide-1920x1080', width: 1920, height: 1080, scroll: 0 },
  { name: 'homepage-wide-1600x900', width: 1600, height: 900, scroll: 0 },
  { name: 'homepage-desktop-1440x900', width: 1440, height: 900, scroll: 0 },
  { name: 'homepage-desktop-1366x768', width: 1366, height: 768, scroll: 0 },
  { name: 'homepage-compact-1280x720', width: 1280, height: 720, scroll: 0 },
  { name: 'homepage-tablet-1024x768', width: 1024, height: 768, scroll: 0 },
  { name: 'homepage-tablet-768x1024', width: 768, height: 1024, scroll: 0 },
  { name: 'homepage-mobile-430x932', width: 430, height: 932, scroll: 0 },
  { name: 'homepage-mobile-390x844', width: 390, height: 844, scroll: 0 },
  { name: 'homepage-mobile-360x800', width: 360, height: 800, scroll: 0 },
  { name: 'product-desktop-1440x900', width: 1440, height: 900, scroll: 'product' },
  { name: 'how-desktop-1440x900', width: 1440, height: 900, scroll: 'how' },
  { name: 'leaderboard-mobile-390x844', width: 390, height: 844, scroll: 'leaderboard' },
  { name: 'claim-mobile-390x844', width: 390, height: 844, scroll: 'claim' }
];

await mkdir(output, { recursive: true });

async function pageTarget(port) {
  for (let i = 0; i < 100; i += 1) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = pages.find(item => item.type === 'page');
      if (page) return page;
    } catch {
      // Keep polling while Chromium starts.
    }
    await delay(100);
  }
  throw new Error('Chromium page target unavailable');
}

function command(ws, id, method, params = {}) {
  return new Promise((resolveCommand, rejectCommand) => {
    const listener = event => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      ws.removeEventListener('message', listener);
      if (message.error) rejectCommand(new Error(message.error.message));
      else resolveCommand(message.result);
    };
    ws.addEventListener('message', listener);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluateEventually(run, expression, params = {}) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      return await run('Runtime.evaluate', { expression, ...params });
    } catch (error) {
      if (!error.message.includes('Execution context was destroyed')) throw error;
      await delay(100);
    }
  }
  throw new Error('Homepage did not finish loading');
}

async function capture(item, index) {
  const port = 9500 + index;
    const browser = spawn(chromium, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/chromadie-homepage-${process.pid}-${index}`, `--window-size=${item.width},${item.height}`, `http://127.0.0.1:${appPort}/`], { stdio: 'ignore' });
  let ws;
  try {
    const target = await pageTarget(port);
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(resolveOpen => ws.addEventListener('open', resolveOpen, { once: true }));
    let id = 0;
    const run = (method, params) => command(ws, ++id, method, params);
    await run('Page.enable');
    await run('Emulation.setDeviceMetricsOverride', { width: item.width, height: item.height, deviceScaleFactor: 1, mobile: false });
    await evaluateEventually(run, `new Promise(resolve => { const start = Date.now(); const wait = () => { if (document.querySelector('.home-page') || Date.now() - start > 12000) resolve(true); else setTimeout(wait, 100); }; wait(); })`, { awaitPromise: true });
    await delay(250);
    await run('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await run('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    if (item.scroll) {
      const scrollSelector = item.scroll === 'product'
        ? '#showcase'
        : item.scroll === 'how'
          ? '#how-it-works'
          : item.scroll === 'leaderboard'
            ? '#home-leaderboard'
            : item.scroll === 'claim'
              ? '#claim'
              : '.home-page';
      await evaluateEventually(run, `new Promise(resolve => { const start = Date.now(); const wait = () => { const target = document.querySelector(${JSON.stringify(scrollSelector)}); if (target) { target.scrollIntoView({ block: 'start' }); resolve(true); } else if (Date.now() - start > 12000) resolve(false); else setTimeout(wait, 100); }; wait(); })`, { awaitPromise: true });
      await delay(350);
    }
    const screenshot = await run('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    const path = resolve(output, `${item.name}.png`);
    await writeFile(path, Buffer.from(screenshot.data, 'base64'));
    console.log(path);
  } finally {
    ws?.close();
    browser.kill('SIGTERM');
  }
}

for (const [index, item] of captures.entries()) await capture(item, index);
