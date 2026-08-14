#!/usr/bin/env node

/*
 * Runtime boundary guard. Historical migrations and one-time migration tools
 * may describe the retired provider, but shipped application code may not
 * expose a Supabase Storage API, URL, or media cache-busting path.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const runtimeRoots = ['src', 'functions', 'workers'];
const forbidden = [
  /supabase\s*\.\s*storage\b/,
  /\.storage\s*\.\s*from\s*\(/,
  /getPublicUrl\s*\(/,
  /\/storage\/v1(?:\/object)?/,
  /object\/public\//,
  /(?:mediaCacheKey|media_cache_key|verify-\$\{Date\.now|cacheKey\s*=\s*String\(Date\.now)/
];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (/\.(?:js|mjs|svelte|ts)$/.test(entry.name)) files.push(path);
  }
  return files;
}

const findings = [];
for (const runtimeRoot of runtimeRoots) {
  for (const path of await sourceFiles(resolve(root, runtimeRoot))) {
    const source = await readFile(path, 'utf8');
    for (const pattern of forbidden) {
      if (pattern.test(source)) findings.push({ file: relative(root, path), pattern: pattern.source });
    }
  }
}

const resolver = await readFile(resolve(root, 'src/lib/profileMediaResolver.js'), 'utf8');
const result = {
  r2_only_runtime: findings.length === 0,
  provider_aware_resolver: /r2_public_key|publicOrigin/.test(resolver),
  legacy_references_fail_closed: /Legacy storage paths intentionally fail closed|return ''/.test(resolver),
  historical_compatibility_sources: [
    'supabase/migrations/',
    'scripts/migrate-profile-media-to-r2.mjs',
    'scripts/browser/'
  ],
  findings
};
console.log(JSON.stringify(result, null, 2));
if (!result.r2_only_runtime || !result.provider_aware_resolver || !result.legacy_references_fail_closed) process.exit(1);
