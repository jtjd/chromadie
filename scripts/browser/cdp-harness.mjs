#!/usr/bin/env node

import { mkdtemp, readFile, unlink, writeFile } from 'node:fs/promises';
import { createWriteStream as createStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const chromiumPath = process.env.CHROMIUM_BIN || '/usr/bin/chromium';
const defaultAppPort = Number(process.env.PROFILE_STUDIO_SMOKE_PORT || 5190);
const defaultDebugPort = Number(process.env.PROFILE_STUDIO_SMOKE_DEBUG_PORT || 9330);

function parseEnvText(text) {
  const values = {};
  for (const line of String(text || '').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

export async function loadLocalEnvironment() {
  const values = {};
  for (const filename of ['.env', '.env.local']) {
    try {
      Object.assign(values, parseEnvText(await readFile(join(projectRoot, filename), 'utf8')));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  const get = key => process.env[key] ?? values[key] ?? '';
  return {
    url: get('VITE_SUPABASE_URL'),
    key: get('VITE_SUPABASE_PUBLISHABLE_KEY') || get('VITE_SUPABASE_KEY') || get('VITE_SUPABASE_ANON_KEY'),
    siteUrl: get('VITE_SITE_URL')
  };
}

function isLocalHostname(hostname) {
  const normalized = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  return normalized === 'localhost'
    || normalized === '127.0.0.1'
    || normalized === '::1'
    || normalized.endsWith('.localhost')
    || normalized.endsWith('.local');
}

export function assertLocalSupabaseUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`VITE_SUPABASE_URL must be a valid local URL; received ${value || '<empty>'}.`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || !isLocalHostname(parsed.hostname)) {
    throw new Error(`Refusing to run against non-local Supabase URL ${parsed.origin}. Use .env.local with localhost or 127.0.0.1.`);
  }
  return parsed;
}

export async function findAvailablePort(start, attempts = 20) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const port = start + offset;
    const available = await new Promise(resolvePort => {
      const server = createServer();
      server.once('error', () => resolvePort(false));
      server.listen({ host: '127.0.0.1', port }, () => server.close(() => resolvePort(true)));
    });
    if (available) return port;
  }
  throw new Error(`Could not find an available fixed localhost port from ${start} to ${start + attempts - 1}.`);
}

export async function waitForHttp(url, timeoutMs = 20000) {
  const started = Date.now();
  let lastError = 'no response';
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status >= 200 && response.status < 500) return response;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}.`);
}

async function terminateProcess(child, label) {
  if (!child || child.exitCode !== null) return;
  const pid = child.pid;
  const signal = (name) => {
    try {
      if (pid) process.kill(-pid, name);
      else child.kill(name);
    } catch {
      try { child.kill(name); } catch { /* already exited */ }
    }
  };
  signal('SIGTERM');
  const deadline = Date.now() + 3500;
  while (child.exitCode === null && Date.now() < deadline) await delay(100);
  if (child.exitCode === null) {
    signal('SIGKILL');
    await delay(150);
  }
  if (child.exitCode === null) console.warn(`Could not confirm ${label} exited; sent SIGKILL to process group ${pid || '<unknown>'}.`);
}

function captureProcessOutput(child, output) {
  for (const stream of [child.stdout, child.stderr]) {
    stream?.on('data', chunk => output.write(chunk));
  }
  child.once('close', () => output.end());
}

export class CdpPage {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.ws = null;
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = new Map();
    this.requestLog = [];
    this.requestEntries = new Map();
    this.consoleLog = [];
  }

  async connect() {
    if (typeof WebSocket !== 'function') throw new Error('This Node runtime does not provide WebSocket, required for CDP.');
    this.ws = new WebSocket(this.webSocketUrl);
    await new Promise((resolveOpen, rejectOpen) => {
      const onOpen = () => { this.ws.removeEventListener('error', onError); resolveOpen(); };
      const onError = event => { this.ws.removeEventListener('open', onOpen); rejectOpen(new Error(`Could not connect to Chromium CDP: ${event?.message || 'WebSocket error'}.`)); };
      this.ws.addEventListener('open', onOpen, { once: true });
      this.ws.addEventListener('error', onError, { once: true });
    });
    this.ws.addEventListener('message', event => this.#handleMessage(event.data));
    this.ws.addEventListener('close', () => {
      for (const { reject } of this.pending.values()) reject(new Error('Chromium CDP connection closed.'));
      this.pending.clear();
    });
    await this.command('Runtime.enable');
    await this.command('Page.enable');
    await this.command('Network.enable');
    await this.command('Log.enable');
    this.on('Network.requestWillBeSent', event => {
      if (!event.request?.url) return;
      const entry = { requestId: event.requestId, method: event.request.method, url: event.request.url };
      this.requestLog.push(entry);
      this.requestEntries.set(event.requestId, entry);
    });
    this.on('Network.responseReceived', event => {
      const entry = this.requestEntries.get(event.requestId);
      if (!entry) return;
      entry.status = event.response?.status;
      entry.mimeType = event.response?.mimeType || '';
    });
    this.on('Network.loadingFailed', event => {
      const entry = this.requestEntries.get(event.requestId);
      if (!entry) return;
      entry.failed = true;
      entry.errorText = event.errorText || 'Network request failed';
    });
    this.on('Runtime.consoleAPICalled', event => {
      const text = (event.args || []).map(arg => arg.value ?? arg.description ?? '').join(' ');
      this.consoleLog.push({ type: event.type, text });
    });
    this.on('Runtime.exceptionThrown', event => {
      const details = event.exceptionDetails || {};
      this.consoleLog.push({ type: 'exception', text: details.text || details.exception?.description || 'Uncaught page exception' });
    });
    this.on('Log.entryAdded', event => {
      const entry = event.entry || {};
      if (entry.level === 'error') this.consoleLog.push({ type: 'log-error', text: entry.text || 'Browser log error' });
    });
    this.on('Page.javascriptDialogOpening', () => {
      void this.command('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    });
    return this;
  }

  #handleMessage(raw) {
    let message;
    try { message = JSON.parse(String(raw)); } catch { return; }
    if (message.id !== undefined) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(message.error.message || 'CDP command failed.'));
      else pending.resolve(message.result || {});
      return;
    }
    for (const listener of this.listeners.get(message.method) || []) listener(message.params || {});
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  command(method, params = {}, timeoutMs = 15000) {
    if (!this.ws) return Promise.reject(new Error(`CDP is not connected for ${method}.`));
    const id = ++this.nextId;
    return new Promise((resolveCommand, rejectCommand) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        rejectCommand(new Error(`Timed out waiting for CDP ${method}.`));
      }, timeoutMs);
      this.pending.set(id, { resolve: resolveCommand, reject: rejectCommand, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression, options = {}) {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      try {
        const result = await this.command('Runtime.evaluate', {
          expression,
          awaitPromise: options.awaitPromise ?? true,
          returnByValue: true,
          userGesture: true,
          ...options
        });
        if (result.exceptionDetails) {
          throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Page evaluation failed.');
        }
        return result.result?.value;
      } catch (error) {
        if (!/context was destroyed|execution context|CDP connection closed/i.test(error.message) || attempt === 79) throw error;
        await delay(100);
      }
    }
    throw new Error('Page evaluation did not complete.');
  }

  async waitFor(expression, description, timeoutMs = 20000) {
    const started = Date.now();
    let lastError = '';
    while (Date.now() - started < timeoutMs) {
      try {
        const value = await this.evaluate(expression);
        if (value) return value;
      } catch (error) {
        lastError = error.message;
      }
      await delay(100);
    }
    const suffix = lastError ? ` Last error: ${lastError}` : '';
    throw new Error(`Timed out waiting for ${description}.${suffix}`);
  }

  async navigate(url, description = url) {
    await this.command('Page.navigate', { url });
    await this.waitFor(`document.readyState === 'complete' && location.href.startsWith(${JSON.stringify(url.split('#')[0])})`, `navigation to ${description}`);
  }

  async setViewport(width, height) {
    await this.command('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: width,
      screenHeight: height
    });
    await delay(150);
  }

  async setReducedMotion(reduce) {
    await this.command('Emulation.setEmulatedMedia', {
      media: '',
      features: [{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }]
    });
    await delay(100);
  }

  async clickText(text, { exact = true, description = text } = {}) {
    const clicked = await this.evaluate(`(() => {
      const wanted = ${JSON.stringify(text)};
      const exact = ${JSON.stringify(exact)};
      const nodes = [...document.querySelectorAll('button, a, summary, [role="button"]')];
      const element = nodes.find(node => {
        const label = (node.innerText || node.textContent || '').trim().replace(/\\s+/g, ' ');
        return exact ? label === wanted : label.includes(wanted);
      });
      if (!element) return false;
      element.scrollIntoView({ block: 'center', inline: 'nearest' });
      element.click();
      return true;
    })()`);
    if (!clicked) throw new Error(`Could not find clickable text ${JSON.stringify(text)} for ${description}.`);
  }

  async click(selector, description = selector) {
    const clicked = await this.evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return false;
      element.scrollIntoView({ block: 'center', inline: 'nearest' });
      element.click();
      return true;
    })()`);
    if (!clicked) throw new Error(`Could not find clickable ${selector} for ${description}.`);
  }

  async setInputValue(selector, value, events = ['input']) {
    const changed = await this.evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return false;
      element.focus();
      const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (!setter) return false;
      setter.call(element, ${JSON.stringify(String(value))});
      for (const type of ${JSON.stringify(events)}) element.dispatchEvent(new Event(type, { bubbles: true }));
      return true;
    })()`);
    if (!changed) throw new Error(`Could not set input ${selector}.`);
  }

  async pressKey(key) {
    const keyInfo = {
      Escape: { key: 'Escape', code: 'Escape', virtualKeyCode: 27 },
      Tab: { key: 'Tab', code: 'Tab', virtualKeyCode: 9 },
      Enter: { key: 'Enter', code: 'Enter', virtualKeyCode: 13, text: '\r' },
      Space: { key: ' ', code: 'Space', virtualKeyCode: 32, text: ' ' },
      ' ': { key: ' ', code: 'Space', virtualKeyCode: 32, text: ' ' }
    }[key] || { key, code: key };
    const event = {
      key: keyInfo.key,
      code: keyInfo.code,
      ...(keyInfo.virtualKeyCode ? { windowsVirtualKeyCode: keyInfo.virtualKeyCode, nativeVirtualKeyCode: keyInfo.virtualKeyCode } : {}),
      ...(keyInfo.text ? { text: keyInfo.text, unmodifiedText: keyInfo.text } : {})
    };
    await this.command('Input.dispatchKeyEvent', { type: 'keyDown', ...event });
    await this.command('Input.dispatchKeyEvent', { type: 'keyUp', ...event });
    await delay(100);
  }

  async screenshot(path) {
    const result = await this.command('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    await writeFile(path, Buffer.from(result.data, 'base64'));
  }

  async close() {
    try { this.ws?.close(); } catch { /* already closed */ }
    this.ws = null;
  }
}

export async function startChromium({ appUrl, debugPort, evidenceDir, width = 1440, height = 1000, ignoreCertificateErrors = false }) {
  const userDataDir = await mkdtemp(join(evidenceDir, 'chromium-profile-'));
  const logPath = join(evidenceDir, 'chromium.log');
  const output = createStream(logPath, { flags: 'a' });
  const chromiumArguments = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=${width},${height}`,
    ...(ignoreCertificateErrors ? ['--ignore-certificate-errors'] : []),
    appUrl
  ];
  const child = spawn(chromiumPath, chromiumArguments, { detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  captureProcessOutput(child, output);
  try {
    const started = Date.now();
    let target;
    while (Date.now() - started < 20000) {
      try {
        const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
        const pages = await response.json();
        target = pages.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
        if (target) break;
      } catch {
        // Chromium is still booting.
      }
      if (child.exitCode !== null) throw new Error(`Chromium exited before exposing CDP. See ${logPath}.`);
      await delay(100);
    }
    if (!target) throw new Error(`Chromium did not expose a page target on CDP port ${debugPort}. See ${logPath}.`);
    const page = await new CdpPage(target.webSocketDebuggerUrl).connect();
    return { child, page, logPath, userDataDir };
  } catch (error) {
    await terminateProcess(child, 'Chromium');
    throw error;
  }
}

export async function startVite({ appPort, environment = null, evidenceDir }) {
  const logPath = join(evidenceDir, 'vite.log');
  const output = createStream(logPath, { flags: 'a' });
  const environmentOverrides = environment
    ? {
        VITE_SUPABASE_URL: environment.url,
        VITE_SUPABASE_PUBLISHABLE_KEY: environment.key
      }
    : {};
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(appPort), '--strictPort'], {
    cwd: projectRoot,
    detached: true,
    env: {
      ...process.env,
      ...environmentOverrides,
      VITE_CACHE_DIR: join(evidenceDir, 'vite-cache'),
      VITE_SITE_URL: `http://127.0.0.1:${appPort}`
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  captureProcessOutput(child, output);
  try {
    await waitForHttp(`http://127.0.0.1:${appPort}/`, 30000);
  } catch (error) {
    await terminateProcess(child, 'Vite');
    throw new Error(`${error.message} See ${logPath}.`, { cause: error });
  }
  return { child, logPath };
}

export async function startVitePreview({ appPort, evidenceDir }) {
  const logPath = join(evidenceDir, 'vite-preview.log');
  const output = createStream(logPath, { flags: 'a' });
  const child = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(appPort), '--strictPort'], {
    cwd: projectRoot,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  captureProcessOutput(child, output);
  try {
    await waitForHttp(`http://127.0.0.1:${appPort}/`, 30000);
  } catch (error) {
    await terminateProcess(child, 'Vite preview');
    throw new Error(`${error.message} See ${logPath}.`, { cause: error });
  }
  return { child, logPath };
}

export async function startPagesDev({ appPort, evidenceDir, envFile = '.env.r2-test.local' }) {
  const logPath = join(evidenceDir, 'pages-dev.log');
  const output = createStream(logPath, { flags: 'a' });
  const persistPath = join(evidenceDir, 'wrangler-state');
  const devVarsPath = join(projectRoot, '.dev.vars');
  const bindingKeys = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_PRIVATE_BUCKET',
    'R2_PUBLIC_BUCKET',
    'MEDIA_PUBLIC_ORIGIN',
    'R2_ACCOUNT_CLEANUP_SECRET',
    'CLOUDFLARE_ZONE_ID',
    'CLOUDFLARE_API_TOKEN',
    'PREVIEW_PROTECTION',
    'PREVIEW_PASSWORD'
  ];
  let envFileExists = true;
  let fileValues = {};
  try {
    fileValues = parseEnvText(await readFile(join(projectRoot, envFile), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    envFileExists = false;
  }
  let originalDevVars = null;
  try {
    originalDevVars = { exists: true, content: await readFile(devVarsPath, 'utf8') };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    originalDevVars = { exists: false, content: '' };
  }
  const devVars = bindingKeys
    .map(key => `${key}=${JSON.stringify(String(process.env[key] ?? fileValues[key] ?? ''))}`)
    .concat('PREVIEW_PROTECTION="off"')
    .join('\n') + '\n';
  await writeFile(devVarsPath, devVars, 'utf8');
  let restored = false;
  const restoreDevVars = async () => {
    if (restored) return;
    restored = true;
    if (originalDevVars.exists) await writeFile(devVarsPath, originalDevVars.content, 'utf8');
    else await unlink(devVarsPath).catch(error => { if (error.code !== 'ENOENT') throw error; });
  };
  const pagesDevArgs = [
    '--yes',
    'wrangler',
    'pages',
    'dev',
    'dist',
    '--ip',
    '127.0.0.1',
    '--port',
    String(appPort),
    '--persist-to',
    persistPath,
    '--log-level',
    'error'
  ];
  if (envFileExists) {
    const persistFlagIndex = pagesDevArgs.indexOf('--persist-to');
    pagesDevArgs.splice(persistFlagIndex, 0, '--env-file', envFile);
  }
  const child = spawn('npx', pagesDevArgs, {
    cwd: projectRoot,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  captureProcessOutput(child, output);
  child.once('close', () => { void restoreDevVars(); });
  try {
    await waitForHttp(`http://127.0.0.1:${appPort}/`, 45000);
  } catch (error) {
    await terminateProcess(child, 'Pages Functions');
    await restoreDevVars();
    throw new Error(`${error.message} See ${logPath}.`, { cause: error });
  }
  return { child, logPath };
}

export { projectRoot, chromiumPath, defaultAppPort, defaultDebugPort, terminateProcess };
