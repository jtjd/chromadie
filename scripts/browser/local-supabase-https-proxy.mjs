#!/usr/bin/env node

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer as createTcpServer } from 'node:net';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const execFileAsync = promisify(execFile);

async function findAvailablePort(start, attempts = 20) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const port = start + offset;
    const available = await new Promise(resolve => {
      const server = createTcpServer();
      server.once('error', () => resolve(false));
      server.listen({ host: '127.0.0.1', port }, () => server.close(() => resolve(true)));
    });
    if (available) return port;
  }
  throw new Error(`Could not find an available HTTPS proxy port from ${start} to ${start + attempts - 1}.`);
}

function closeServer(server) {
  return new Promise(resolve => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });
}

export async function startLocalSupabaseHttpsProxy({ targetUrl, port: requestedPort = 55443 } = {}) {
  const target = new URL(targetUrl);
  if (target.protocol !== 'http:') throw new Error(`The local Supabase proxy expects an HTTP target, received ${target.protocol}`);

  const directory = await mkdtemp(join(tmpdir(), 'chromadie-supabase-https-proxy-'));
  const keyPath = join(directory, 'key.pem');
  const certificatePath = join(directory, 'certificate.pem');
  try {
    await execFileAsync('openssl', [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      keyPath,
      '-out',
      certificatePath,
      '-days',
      '1',
      '-subj',
      '/CN=127.0.0.1',
      '-addext',
      'subjectAltName=IP:127.0.0.1'
    ], { maxBuffer: 1024 * 1024 });
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw new Error(`Could not create the temporary HTTPS certificate for production preview smoke: ${error.message}`, { cause: error });
  }

  const [key, cert] = await Promise.all([readFile(keyPath), readFile(certificatePath)]);
  const server = createHttpsServer({ key, cert }, (request, response) => {
    const upstreamUrl = new URL(request.url || '/', target);
    const headers = { ...request.headers, host: target.host };
    const upstream = httpRequest({
      hostname: target.hostname,
      port: target.port || 80,
      method: request.method,
      path: `${upstreamUrl.pathname}${upstreamUrl.search}`,
      headers
    }, upstreamResponse => {
      response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    });
    upstream.on('error', error => {
      if (!response.headersSent) response.writeHead(502, { 'content-type': 'text/plain' });
      response.end(`Local Supabase proxy error: ${error.message}`);
    });
    request.on('aborted', () => upstream.destroy());
    request.pipe(upstream);
  });
  server.on('clientError', (_error, socket) => socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'));

  const port = await findAvailablePort(requestedPort);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen({ host: '127.0.0.1', port }, resolve);
  });

  return {
    caPath: certificatePath,
    url: `https://127.0.0.1:${port}`,
    close: async () => {
      await closeServer(server);
      await rm(directory, { recursive: true, force: true });
    }
  };
}
