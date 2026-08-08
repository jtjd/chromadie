import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  HARD_RESERVED_USERNAMES,
  MANUAL_RELEASE_USERNAMES,
  USERNAME_POLICY_SNAPSHOT,
  isUsernameShapeValid
} from '../src/lib/usernamePolicy.js';
import { RESERVED_ROUTE_SEGMENTS } from '../src/lib/routeContract.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationPaths = [
  'supabase/migrations/20260730100000_username_reservation_policy.sql',
  'supabase/migrations/20260808120000_short_usernames.sql'
].map(relativePath => path.join(repoRoot, relativePath));
const localContainer = process.env.SUPABASE_DB_CONTAINER || 'supabase_db_Chromadie';

function fail(message) {
  console.error(`Username policy drift detected: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const expected = new Map();
for (const entry of USERNAME_POLICY_SNAPSHOT) {
  assert(isUsernameShapeValid(entry.username), `invalid snapshot username ${entry.username}`);
  assert(!expected.has(entry.username), `duplicate snapshot username ${entry.username}`);
  expected.set(entry.username, entry);
}

assert(expected.size === HARD_RESERVED_USERNAMES.length + MANUAL_RELEASE_USERNAMES.length, 'snapshot count does not match policy arrays');

for (const route of RESERVED_ROUTE_SEGMENTS) {
  if (!isUsernameShapeValid(route)) continue;
  const entry = expected.get(route.toLowerCase());
  assert(entry, `valid route segment is not protected: ${route}`);
  assert(entry.releasePolicy === 'never', `route segment is not hard-reserved: ${route}`);
}

const seeded = new Map();
const rowPattern = /\('([a-z0-9_]{1,20})',\s*'([^']+)',\s*'[^']*',\s*'(never|manual)'\)/g;
for (const migrationPath of migrationPaths) {
  const migration = await readFile(migrationPath, 'utf8');
  for (const match of migration.matchAll(rowPattern)) {
    const [, username, category, releasePolicy] = match;
    assert(!seeded.has(username), `duplicate SQL seed row ${username}`);
    seeded.set(username, { category, releasePolicy });
  }
}

assert(seeded.size === expected.size, `SQL seed has ${seeded.size} rows; snapshot has ${expected.size}`);
for (const [username, entry] of expected) {
  const sqlEntry = seeded.get(username);
  assert(sqlEntry, `SQL seed is missing ${username}`);
  assert(sqlEntry.category === entry.category, `${username} category differs between JS and SQL`);
  assert(sqlEntry.releasePolicy === entry.releasePolicy, `${username} release policy differs between JS and SQL`);
}

function runLocalQuery(sql) {
  const result = spawnSync(
    'docker',
    ['exec', '-i', localContainer, 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-F', '|', '-c', sql],
    { encoding: 'utf8', timeout: 30_000, maxBuffer: 4 * 1024 * 1024 }
  );

  if (result.error?.code === 'ENOENT') {
    fail('Docker is unavailable; start the linked local Supabase database before running this check');
  }
  if (result.status !== 0) {
    fail(`local database query failed: ${(result.stderr || result.stdout || 'unknown error').trim()}`);
  }
  return result.stdout.trim();
}

function compareDatabaseRows(output, label) {
  const rows = output ? output.split('\n').filter(Boolean).map(line => line.split('|')) : [];
  const actual = new Map();
  for (const [username, category, releasePolicy, enabled] of rows) {
    assert(username && category && releasePolicy && enabled, `${label} returned a malformed reservation row`);
    assert(!actual.has(username), `${label} returned duplicate ${username}`);
    assert(enabled === 't', `${label} contains disabled reservation ${username}; update the policy snapshot intentionally`);
    actual.set(username, { category, releasePolicy });
  }

  assert(actual.size === expected.size, `${label} has ${actual.size} rows; expected ${expected.size}`);
  for (const [username, entry] of expected) {
    const actualEntry = actual.get(username);
    assert(actualEntry, `${label} is missing ${username}`);
    assert(actualEntry.category === entry.category, `${label} category differs for ${username}`);
    assert(actualEntry.releasePolicy === entry.releasePolicy, `${label} release policy differs for ${username}`);
  }
}

const localRows = runLocalQuery(
  'SELECT username_key, category, release_policy, enabled FROM public.reserved_usernames ORDER BY username_key;'
);
compareDatabaseRows(localRows, 'local database');

const rls = runLocalQuery(
  "SELECT relrowsecurity::text FROM pg_class WHERE oid = 'public.reserved_usernames'::regclass;"
);
assert(rls === 'true', 'reserved_usernames must have RLS enabled');

const linked = process.argv.includes('--linked');
if (linked) {
  if (!process.env.SUPABASE_DB_PASSWORD) {
    fail('remote mode requires SUPABASE_DB_PASSWORD in the current shell; no remote check was attempted');
  }

  const query = 'SELECT username_key, category, release_policy, enabled FROM public.reserved_usernames ORDER BY username_key;';
  const result = spawnSync(
    'supabase',
    ['db', 'query', '--linked', '--output-format', 'json', query],
    { encoding: 'utf8', timeout: 45_000, maxBuffer: 4 * 1024 * 1024, env: process.env }
  );
  if (result.error || result.status !== 0) {
    fail(`remote database query failed: ${(result.stderr || result.stdout || result.error?.message || 'unknown error').trim()}`);
  }

  let payload;
  try {
    payload = JSON.parse(result.stdout);
  } catch {
    fail('remote database query did not return JSON; no remote result was accepted');
  }
  const remoteRows = Array.isArray(payload) ? payload : payload.rows || payload.data || [];
  compareDatabaseRows(remoteRows.map(row => [row.username_key, row.category, row.release_policy, row.enabled ? 't' : 'f'].join('|')).join('\n'), 'linked database');
}

console.log(`Username policy drift check passed: ${expected.size} reservations, ${RESERVED_ROUTE_SEGMENTS.filter(isUsernameShapeValid).length} valid route segments, local RLS enabled${linked ? ', linked database verified' : ''}.`);
