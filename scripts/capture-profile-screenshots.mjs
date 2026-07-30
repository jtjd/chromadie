import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const chromium = process.env.CHROMIUM_BIN || '/usr/bin/chromium';
const baseUrl = process.env.PROFILE_SCREENSHOT_URL || 'http://127.0.0.1:5174/u/Anzul';
const outputRoot = resolve(projectRoot, process.env.PROFILE_SCREENSHOT_OUTPUT || 'artifacts/phase-10/after');
const portBase = Number(process.env.PROFILE_SCREENSHOT_DEBUG_PORT || 9400);
const viewports = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1280x720', width: 1280, height: 720 },
  { name: '390x844', width: 390, height: 844 }
];

await mkdir(outputRoot, { recursive: true });

async function waitForPageTarget(port) {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = pages.find(item => item.type === 'page');
      if (page) return page;
    } catch {
      // Chromium is still starting.
    }
    await delay(100);
  }
  throw new Error(`Chromium did not expose a page target on port ${port}.`);
}

function connectWebSocket(url) {
  return new Promise((resolveConnection, rejectConnection) => {
    const ws = new WebSocket(url);
    ws.addEventListener('open', () => resolveConnection(ws), { once: true });
    ws.addEventListener('error', rejectConnection, { once: true });
  });
}

function sendCommand(ws, id, method, params = {}) {
  return new Promise((resolveCommand, rejectCommand) => {
    const handleMessage = event => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      ws.removeEventListener('message', handleMessage);
      if (message.error) rejectCommand(new Error(message.error.message));
      else resolveCommand(message.result);
    };
    ws.addEventListener('message', handleMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluateEventually(command, params) {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      return await command('Runtime.evaluate', params);
    } catch (error) {
      if (!error.message.includes('context was destroyed')) throw error;
      await delay(100);
    }
  }
  throw new Error('Chromium page did not finish navigation.');
}

async function captureViewport(viewport, index) {
  const port = portBase + index;
  const browser = spawn(chromium, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-extensions',
    '--hide-scrollbars',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=/tmp/chromadie-phase10-screenshots-${process.pid}-${index}`,
    `--window-size=${viewport.width},${viewport.height}`,
    baseUrl
  ], { stdio: 'ignore' });

  let ws;
  try {
    const page = await waitForPageTarget(port);
    ws = await connectWebSocket(page.webSocketDebuggerUrl);
    let commandId = 0;
    const command = (method, params) => sendCommand(ws, ++commandId, method, params);

    await command('Page.enable');
    await command('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: false
    });
    await evaluateEventually(command, {
      expression: `new Promise(resolve => { const started = Date.now(); const check = () => { if (document.querySelector('.profile-shell__hero, [data-profile-region]') || Date.now() - started > 14000) resolve(true); else setTimeout(check, 100); }; check(); })`,
      awaitPromise: true,
      returnByValue: true
    });
    await command('Page.getLayoutMetrics');
    await delay(1000);

    const metricsResult = await evaluateEventually(command, {
      expression: `(() => {
        const regionElements = [...document.querySelectorAll('[data-profile-region]')];
        if (!regionElements.length) {
          const hero = document.querySelector('.profile-shell__hero');
          if (hero) regionElements.push(hero);
        }
        const regions = regionElements.map(element => {
          const rect = element.getBoundingClientRect();
          return {
            name: element.dataset.profileRegion || 'identity',
            top: Math.round(rect.top + scrollY),
            bottom: Math.round(rect.bottom + scrollY),
            height: Math.round(rect.height)
          };
        });
        return {
          viewport: { width: innerWidth, height: innerHeight },
          scrollHeight: document.documentElement.scrollHeight,
          bodyScrollHeight: document.body.scrollHeight,
          primaryBottom: Math.max(...regions.filter(region => region.name !== 'identity').map(region => region.bottom), 0),
          regions
        };
      })()`,
      returnByValue: true
    });
    const screenshotResult = await command('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false
    });
    const outputPath = resolve(outputRoot, `${viewport.name}.png`);
    await writeFile(outputPath, Buffer.from(screenshotResult.data, 'base64'));
    return { ...metricsResult.result.value, outputPath };
  } finally {
    ws?.close();
    browser.kill('SIGTERM');
  }
}

const metrics = [];
for (const [index, viewport] of viewports.entries()) {
  const outputPath = resolve(outputRoot, `${viewport.name}.png`);
  const result = await captureViewport(viewport, index);
  metrics.push(result);
  console.log(`Captured ${viewport.name}: ${outputPath}`);
}

await writeFile(resolve(outputRoot, 'metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
