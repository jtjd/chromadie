import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const chromium = process.env.CHROMIUM_BIN || '/usr/bin/chromium';
const baseUrl = process.env.PROFILE_SCREENSHOT_URL || 'http://127.0.0.1:5180/u/Anzul';
const outputRoot = resolve(projectRoot, process.env.PROFILE_SCREENSHOT_OUTPUT || 'artifacts/phase-10-2/visitor');
const portBase = Number(process.env.PROFILE_SCREENSHOT_DEBUG_PORT || 9500);
const reducedMotion = process.env.PROFILE_REDUCED_MOTION === '1';
const waitForIdentity = process.env.PROFILE_WAIT_FOR_IDENTITY !== '0';
const viewports = [
  { name: '1920x1080', width: 1920, height: 1080 },
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
    '--force-device-scale-factor=1',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=/tmp/chromadie-phase-10-2-screenshots-${process.pid}-${index}`,
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
    await command('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await command('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }]
    });
    await evaluateEventually(command, {
      expression: `new Promise(resolve => { const started = Date.now(); const check = () => { if (document.querySelector('${waitForIdentity ? '[data-profile-reference-card], [data-profile-layout-content="full-bleed"]' : 'header'}, .profile-shell__hero, [data-profile-region]') || Date.now() - started > 14000) resolve(true); else setTimeout(check, 100); }; check(); })`,
      awaitPromise: true,
      returnByValue: true
    });
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
        const surfaces = ['.profile-roll', '.profile-roll__result', '.profile-roll__result-head', '.profile-roll__story', '.profile-roll__details']
          .map(selector => {
            const element = document.querySelector(selector);
            if (!element) return null;
            const rect = element.getBoundingClientRect();
            const styles = getComputedStyle(element);
            return {
              selector,
              top: Math.round(rect.top + scrollY),
              bottom: Math.round(rect.bottom + scrollY),
              height: Math.round(rect.height),
              padding: styles.padding,
              border: styles.border
            };
          })
          .filter(Boolean);
        return {
          viewport: { width: innerWidth, height: innerHeight },
          scale: {
            devicePixelRatio,
            visualViewportScale: visualViewport?.scale ?? null,
            documentZoom: getComputedStyle(document.documentElement).zoom,
            bodyZoom: getComputedStyle(document.body).zoom
          },
          scrollHeight: document.documentElement.scrollHeight,
          bodyScrollHeight: document.body.scrollHeight,
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
          primaryBottom: Math.max(...regions.filter(region => region.name !== 'identity').map(region => region.bottom), 0),
          regions,
          surfaces
        };
      })()`,
      returnByValue: true
    });
    const screenshotResult = await command('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false
    });
    const outputPath = resolve(outputRoot, `${viewport.name}${reducedMotion ? '-reduced-motion' : ''}.png`);
    await writeFile(outputPath, Buffer.from(screenshotResult.data, 'base64'));
    return { ...metricsResult.result.value, outputPath, reducedMotion };
  } finally {
    ws?.close();
    browser.kill('SIGTERM');
  }
}

const metrics = [];
for (const [index, viewport] of viewports.entries()) {
  const result = await captureViewport(viewport, index);
  metrics.push(result);
  console.log(`Captured ${viewport.name}: ${result.outputPath}`);
}

await writeFile(resolve(outputRoot, `metrics${reducedMotion ? '-reduced-motion' : ''}.json`), JSON.stringify(metrics, null, 2) + '\n');
