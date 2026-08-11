#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { loadLocalEnvironment, assertLocalSupabaseUrl } from './cdp-harness.mjs';
import { startLocalSupabaseHttpsProxy } from './local-supabase-https-proxy.mjs';

function run(command, args, environment) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: environment,
      stdio: 'inherit'
    });
    child.once('error', reject);
    child.once('close', code => resolve(code ?? 1));
  });
}

const environment = await loadLocalEnvironment();
if (!environment.url || !environment.key) {
  throw new Error('Production preview smoke requires VITE_SUPABASE_URL and VITE_SUPABASE_KEY (normally provided by .env.local).');
}
const localSupabaseUrl = assertLocalSupabaseUrl(environment.url);
const proxy = await startLocalSupabaseHttpsProxy({ targetUrl: localSupabaseUrl.origin });
const smokeEnvironment = {
  ...process.env,
  PROFILE_STUDIO_SMOKE_MODE: 'preview',
  VITE_SUPABASE_URL: proxy.url,
  VITE_SUPABASE_KEY: environment.key,
  VITE_CLOUDFLARE_SITE_KEY: '1x00000000000000000000AA',
  NODE_EXTRA_CA_CERTS: proxy.caPath
};

let exitCode;
try {
  exitCode = await run('npm', ['run', 'build'], smokeEnvironment);
  if (exitCode === 0) {
    exitCode = await run('node', ['scripts/browser/profile-studio-smoke.mjs'], smokeEnvironment);
  }
} finally {
  await proxy.close();
}

process.exitCode = exitCode;
