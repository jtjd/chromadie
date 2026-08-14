#!/usr/bin/env node

/*
 * Static final-cutover audit. Legacy Supabase URL construction is intentionally
 * retained in the migration resolver and backfill tooling, but normal public
 * render consumers must only consume provider-neutral media references.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const publicConsumers = [
  'src/lib/ProfileShell.svelte',
  'src/lib/ProfileMusic.svelte',
  'src/lib/DiscoveryCard.svelte',
  'src/lib/HomepageProfilePreview.svelte',
  'src/lib/HomeLeaderboard.svelte',
  'src/lib/HomeDailyResult.svelte',
  'src/lib/ShopStudioPreview.svelte'
];
const forbidden = [
  /storage\/v1\/object\/public/,
  /\.storage\.from\(/,
  /getPublicUrl\(/,
  /supabaseStorage\./
];
const findings = [];
for (const relativePath of publicConsumers) {
  const source = await readFile(resolve(root, relativePath), 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(source)) findings.push({ file: relativePath, pattern: pattern.source });
  }
}

const resolver = await readFile(resolve(root, 'src/lib/profileMediaResolver.js'), 'utf8');
const providerNeutral = /r2_public_key|publicOrigin/.test(resolver);
const result = {
  r2_only_public_consumers: findings.length === 0,
  provider_neutral_resolver: providerNeutral,
  compatibility_paths: [
    'src/lib/profileMedia.js',
    'functions/_profilePage.js',
    'scripts/migrate-profile-media-to-r2.mjs'
  ],
  findings
};
console.log(JSON.stringify(result, null, 2));
if (!providerNeutral || findings.length) process.exit(1);
