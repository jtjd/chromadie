#!/usr/bin/env node

import { spawn } from 'node:child_process';

const child = spawn('npm', ['run', 'build'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    // Local env files use the loopback Supabase URL, which production-mode
    // builds otherwise reject before the guide can be smoke-tested.
    VITE_LOCAL_INTEGRATION_TEST: 'true'
  },
  stdio: 'inherit'
});

child.once('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
child.once('close', code => {
  process.exitCode = code ?? 1;
});
