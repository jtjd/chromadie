import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const snapshotPath = path.join(
  repoRoot,
  'supabase/migrations/20260710190000_snapshot_live_shop_catalog.sql'
);
const seedPath = path.join(repoRoot, 'supabase/seed.sql');

function fail(message) {
  console.error(`Catalog drift detected: ${message}`);
  process.exit(1);
}

function splitSqlValues(row, source) {
  const values = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];

    if (character === "'") {
      if (quoted && row[index + 1] === "'") {
        value += "''";
        index += 1;
      } else {
        quoted = !quoted;
        value += character;
      }
    } else if (character === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }

  if (quoted) fail(`unterminated string in ${source}`);
  values.push(value.trim());
  return values;
}

function decodeSqlValue(value, source) {
  if (value.toUpperCase() === 'NULL') return null;
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  if (/^-?\d+$/.test(value)) return value;
  fail(`unsupported SQL value ${JSON.stringify(value)} in ${source}`);
}

function parseCatalog(sql, source) {
  const insert = sql.match(
    /INSERT INTO public\.shop_items\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?)\nON CONFLICT/
  );
  if (!insert) fail(`could not find shop_items insert in ${source}`);

  const columns = insert[1].split(',').map(column => column.trim());
  const rows = [];
  let rowStart = -1;
  let depth = 0;
  let quoted = false;
  const body = insert[2];

  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (character === "'") {
      if (quoted && body[index + 1] === "'") index += 1;
      else quoted = !quoted;
      continue;
    }
    if (quoted) continue;
    if (character === '(') {
      if (depth === 0) rowStart = index + 1;
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
      if (depth === 0) rows.push(body.slice(rowStart, index));
      if (depth < 0) fail(`unbalanced row delimiters in ${source}`);
    }
  }

  if (quoted || depth !== 0) fail(`malformed shop_items insert in ${source}`);

  const catalog = new Map();
  for (const row of rows) {
    const values = splitSqlValues(row, source).map(value => decodeSqlValue(value, source));
    if (values.length !== columns.length) {
      fail(`expected ${columns.length} values but found ${values.length} in ${source}`);
    }
    const item = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
    if (!item.item_key) fail(`row without item_key in ${source}`);
    if (catalog.has(item.item_key)) fail(`duplicate key ${item.item_key} in ${source}`);
    catalog.set(item.item_key, item);
  }

  return { columns, catalog };
}

function applyCostUpdates(sql, catalog, source) {
  const update = sql.match(/UPDATE public\.shop_items\s+SET cost = CASE item_key([\s\S]*?)END;/);
  if (!update) return;

  for (const match of update[1].matchAll(/WHEN '([^']+)' THEN (\d+)/g)) {
    const [, itemKey, cost] = match;
    const item = catalog.get(itemKey);
    if (!item) fail(`update references missing item_key ${itemKey} in ${source}`);
    item.cost = cost;
  }
}

function normalizeItem(item, columns) {
  return Object.fromEntries(
    columns.map(column => [column, item[column] === null ? null : String(item[column])])
  );
}

function compareCatalogs(expected, actual, actualName) {
  const missing = [...expected.catalog.keys()].filter(key => !actual.catalog.has(key)).sort();
  const extra = [...actual.catalog.keys()].filter(key => !expected.catalog.has(key)).sort();
  const changed = [];

  for (const [key, expectedItem] of expected.catalog) {
    const actualItem = actual.catalog.get(key);
    if (!actualItem) continue;
    const expectedNormalized = normalizeItem(expectedItem, expected.columns);
    const actualNormalized = normalizeItem(actualItem, expected.columns);
    for (const column of expected.columns) {
      if (expectedNormalized[column] !== actualNormalized[column]) {
        changed.push(
          `${key}.${column}: expected ${JSON.stringify(expectedNormalized[column])}, ` +
            `found ${JSON.stringify(actualNormalized[column])}`
        );
      }
    }
  }

  if (missing.length || extra.length || changed.length) {
    const details = [
      ...missing.map(key => `missing from ${actualName}: ${key}`),
      ...extra.map(key => `unexpected in ${actualName}: ${key}`),
      ...changed.map(change => `${actualName} changed ${change}`)
    ];
    fail(`snapshot and ${actualName} differ:\n  - ${details.join('\n  - ')}`);
  }
}

async function readLocalCatalog(filePath) {
  const source = path.relative(repoRoot, filePath);
  const sql = await readFile(filePath, 'utf8');
  const parsed = parseCatalog(sql, source);
  applyCostUpdates(sql, parsed.catalog, source);
  return parsed;
}

async function readRemoteCatalog(columns, url, key) {
  const endpoint = new URL('/rest/v1/shop_items', url);
  endpoint.searchParams.set('select', columns.join(','));
  endpoint.searchParams.set('order', 'item_key.asc');
  const response = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!response.ok) {
    fail(`remote query failed (${response.status}): ${await response.text()}`);
  }
  const items = await response.json();
  return {
    columns,
    catalog: new Map(items.map(item => [item.item_key, item]))
  };
}

const snapshot = await readLocalCatalog(snapshotPath);
const seed = await readLocalCatalog(seedPath);
compareCatalogs(snapshot, seed, 'supabase/seed.sql');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY;

if (supabaseUrl && supabaseKey) {
  const remote = await readRemoteCatalog(snapshot.columns, supabaseUrl, supabaseKey);
  compareCatalogs(snapshot, remote, 'remote shop_items');
  console.log(
    `Catalog drift check passed: snapshot, seed, and remote match (${snapshot.catalog.size} items).`
  );
} else {
  console.log(
    `Catalog drift check passed locally: snapshot and seed match (${snapshot.catalog.size} items). ` +
      'Set SUPABASE_URL and SUPABASE_ANON_KEY to include the remote catalog.'
  );
}
