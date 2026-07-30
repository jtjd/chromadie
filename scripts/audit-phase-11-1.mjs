import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const chromium = process.env.CHROMIUM_BIN || '/usr/bin/chromium';
const outputRoot = resolve(projectRoot, process.env.PHASE_AUDIT_OUTPUT || 'artifacts/phase-11-1/baseline');
const productionUrl = process.env.PHASE_AUDIT_PRODUCTION_URL || 'http://127.0.0.1:5181/u/Anzul';
const referenceUrl = process.env.PHASE_AUDIT_REFERENCE_URL || 'http://127.0.0.1:5190';
const portBase = Number(process.env.PHASE_AUDIT_DEBUG_PORT || 9600);
const viewports = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900', width: 1440, height: 900 }
];

await mkdir(outputRoot, { recursive: true });

const targets = [
  {
    name: 'production',
    url: productionUrl,
    selectors: {
      card: '.identity-card',
      name: '.identity-card__name',
      body: '.identity-card__bio',
      metadata: '.identity-card__handle',
      essentialSmall: '.identity-card__label, .identity-card__handle, .profile-mode-header__nav',
      music: '.profile-music',
      atmosphere: '.profile-atmosphere'
    }
  },
  {
    name: 'reference',
    url: referenceUrl,
    selectors: {
      card: 'main > div.relative.z-10 .rounded-3xl',
      name: 'main > div.relative.z-10 h1',
      body: 'main > div.relative.z-10 p.text-sm',
      metadata: 'main > div.relative.z-10 .text-\\[11px\\]',
      essentialSmall: 'main > div.relative.z-10 .text-\\[11px\\], main > div.relative.z-10 button',
      music: 'main > footer .rounded-2xl',
      atmosphere: 'main > div[aria-hidden="true"]'
    }
  }
];

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

async function measureTarget(target, viewport, index) {
  const port = portBase + index;
  const browser = spawn(chromium, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-extensions',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=/tmp/chromadie-phase-11-1-audit-${process.pid}-${index}`,
    `--window-size=${viewport.width},${viewport.height}`,
    target.url
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
      features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }]
    });

    const waitSelector = target.name === 'reference' ? target.selectors.card : '.identity-card';
    await evaluateEventually(command, {
      expression: `new Promise(resolve => { const started = Date.now(); const check = () => { if (document.querySelector(${JSON.stringify(waitSelector)}) || Date.now() - started > 14000) resolve(true); else setTimeout(check, 100); }; check(); })`,
      awaitPromise: true,
      returnByValue: true
    });
    await delay(700);

    const selectors = JSON.stringify(target.selectors);
    const metricsResult = await evaluateEventually(command, {
      expression: `(() => {
        const selectors = ${selectors};
        const rect = selector => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const box = element.getBoundingClientRect();
          return {
            x: Math.round(box.x * 100) / 100,
            y: Math.round(box.y * 100) / 100,
            top: Math.round(box.top * 100) / 100,
            right: Math.round(box.right * 100) / 100,
            bottom: Math.round(box.bottom * 100) / 100,
            width: Math.round(box.width * 100) / 100,
            height: Math.round(box.height * 100) / 100
          };
        };
        const style = selector => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const computed = getComputedStyle(element);
          return {
            fontSize: computed.fontSize,
            lineHeight: computed.lineHeight,
            fontWeight: computed.fontWeight,
            letterSpacing: computed.letterSpacing,
            opacity: computed.opacity,
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            padding: computed.padding,
            border: computed.border
          };
        };
        const firstExisting = selectorList => selectorList.split(',').map(item => item.trim()).find(item => document.querySelector(item)) || null;
        const essentialSmallSelector = firstExisting(selectors.essentialSmall);
        const card = rect(selectors.card);
        const music = rect(selectors.music);
        const atmosphere = rect(selectors.atmosphere);
        const body = rect(selectors.body);
        const name = rect(selectors.name);
        const viewport = { width: innerWidth, height: innerHeight };
        return {
          target: ${JSON.stringify(target.name)},
          viewport,
          scale: {
            devicePixelRatio,
            visualViewportScale: visualViewport?.scale ?? null,
            documentZoom: getComputedStyle(document.documentElement).zoom,
            bodyZoom: getComputedStyle(document.body).zoom
          },
          card,
          cardCenter: card ? Math.round((card.x + card.width / 2) * 100) / 100 : null,
          music,
          musicBottomOffset: music ? Math.round((innerHeight - music.bottom) * 100) / 100 : null,
          name,
          body,
          metadata: rect(selectors.metadata),
          smallestEssential: essentialSmallSelector ? {
            selector: essentialSmallSelector,
            rect: rect(essentialSmallSelector),
            style: style(essentialSmallSelector)
          } : null,
          styles: {
            card: style(selectors.card),
            name: style(selectors.name),
            body: style(selectors.body),
            metadata: style(selectors.metadata),
            music: style(selectors.music),
            atmosphere: style(selectors.atmosphere)
          },
          atmosphereBounds: atmosphere,
          primaryBottom: Math.max(card?.bottom || 0, music?.bottom || 0),
          documentScrollHeight: document.documentElement.scrollHeight,
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth
        };
      })()`,
      returnByValue: true
    });
    const screenshotResult = await command('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false
    });
    const screenshotPath = resolve(outputRoot, `${target.name}-${viewport.name}.png`);
    await writeFile(screenshotPath, Buffer.from(screenshotResult.data, 'base64'));
    return { ...metricsResult.result.value, screenshotPath };
  } finally {
    ws?.close();
    browser.kill('SIGTERM');
  }
}

const results = [];
for (const [targetIndex, target] of targets.entries()) {
  for (const [viewportIndex, viewport] of viewports.entries()) {
    const result = await measureTarget(target, viewport, targetIndex * viewports.length + viewportIndex);
    results.push(result);
    console.log(`Measured ${target.name} ${viewport.name}: ${result.screenshotPath}`);
  }
}

await writeFile(resolve(outputRoot, 'metrics.json'), JSON.stringify({
  captureContract: {
    browserZoom: '100%',
    deviceScaleFactor: 1,
    pageScaleFactor: 1,
    reducedMotion: false
  },
  results
}, null, 2) + '\n');
