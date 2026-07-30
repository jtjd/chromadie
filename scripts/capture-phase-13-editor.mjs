import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const chromium = process.env.CHROMIUM_BIN || '/usr/bin/chromium';
const baseUrl = process.env.PROFILE_EDITOR_SCREENSHOT_URL || 'http://127.0.0.1:5180/PhaseOwner';
const outputRoot = resolve(projectRoot, process.env.PROFILE_EDITOR_SCREENSHOT_OUTPUT || 'artifacts/phase-13/editor');
const port = Number(process.env.PROFILE_EDITOR_SCREENSHOT_DEBUG_PORT || 10400);
const viewport = { width: 390, height: 844 };

await mkdir(outputRoot, { recursive: true });

async function waitForPageTarget() {
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

async function evaluate(command, expression, awaitPromise = false) {
  const result = await command('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed.');
  return result.result?.value;
}

async function waitFor(command, selector, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(command, `Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${selector}.`);
}

async function setInput(command, selector, value) {
  const ok = await evaluate(command, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(element, ${JSON.stringify(value)});
    element.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  if (!ok) throw new Error(`Could not set ${selector}.`);
}

async function clickText(command, text) {
  const clicked = await evaluate(command, `(() => {
    const wanted = ${JSON.stringify(text)};
    const element = [...document.querySelectorAll('button, a')]
      .find(candidate => candidate.textContent?.trim() === wanted);
    if (!element) return false;
    element.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Could not click ${text}.`);
}

async function clickSelector(command, selector) {
  const clicked = await evaluate(command, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return false;
    element.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Could not click ${selector}.`);
}

const browser = spawn(chromium, [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-extensions',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=/tmp/chromadie-phase-13-editor-${process.pid}`,
  `--window-size=${viewport.width},${viewport.height}`,
  baseUrl
], { stdio: 'ignore' });

let ws;
try {
  const page = await waitForPageTarget();
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

  await waitFor(command, '.app-shell');
  await clickText(command, 'Sign in');
  await waitFor(command, '#email-input');
  await setInput(command, '#email-input', 'phase13-owner@example.test');
  await setInput(command, '#password-input', 'Phase13-local-test-123!');
  await clickSelector(command, '.auth-submit');
  await delay(1200);
  await command('Page.navigate', { url: 'http://127.0.0.1:5180/profile/settings' });
  await waitFor(command, '.identity-editor');
  await delay(600);

  const metrics = await evaluate(command, `(() => ({
    viewport: { width: innerWidth, height: innerHeight },
    devicePixelRatio,
    documentZoom: getComputedStyle(document.documentElement).zoom,
    scrollHeight: document.documentElement.scrollHeight,
    editor: Boolean(document.querySelector('.identity-editor')),
    labels: [...document.querySelectorAll('.identity-editor label')].map(label => label.textContent.trim())
  }))`);
  const screenshot = await command('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false
  });
  await writeFile(resolve(outputRoot, '390x844.png'), Buffer.from(screenshot.data, 'base64'));
  await writeFile(resolve(outputRoot, 'metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
  console.log(`Captured ${resolve(outputRoot, '390x844.png')}`);
} finally {
  ws?.close();
  browser.kill('SIGTERM');
}
