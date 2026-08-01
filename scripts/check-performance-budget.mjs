import { readFile, stat, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const distRoot = join(projectRoot, 'dist');
const assetsRoot = join(distRoot, 'assets');

// Initial budgets describe what a visitor needs for the first route. Lazy
// budgets keep any one destination from becoming a second monolith. Total
// budgets are transitional regression caps for the complete catalog of chunks;
// they do not replace the initial and per-route checks.
const budgets = {
  initialJavascript: 450 * 1024,
  lazyJavascript: 100 * 1024,
  totalJavascript: 700 * 1024,
  initialCss: 200 * 1024,
  lazyCss: 75 * 1024,
  totalCss: 380 * 1024,
  html: 12 * 1024
};

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

async function assetsByExtension(extension) {
  const entries = await readdir(assetsRoot, { withFileTypes: true });
  const files = entries.filter(entry => entry.isFile() && entry.name.endsWith(extension));
  return Promise.all(files.map(async entry => ({
    name: entry.name,
    bytes: (await stat(join(assetsRoot, entry.name))).size
  })));
}

function assetNameFromUrl(value) {
  const pathname = String(value || '').split('?')[0];
  return pathname.slice(pathname.lastIndexOf('/') + 1);
}

function getInitialAssetNames(html) {
  const initial = new Set();
  for (const match of html.matchAll(/<(?:script|link)\b[^>]+(?:src|href)="([^"]+)"/g)) {
    const name = assetNameFromUrl(match[1]);
    if (name.endsWith('.js') || name.endsWith('.css')) initial.add(name);
  }
  return initial;
}

function summarize(files, initialNames) {
  const initial = files.filter(file => initialNames.has(file.name));
  const lazy = files.filter(file => !initialNames.has(file.name));
  const total = files.reduce((sum, file) => sum + file.bytes, 0);
  const initialTotal = initial.reduce((sum, file) => sum + file.bytes, 0);
  const largestLazy = lazy.sort((a, b) => b.bytes - a.bytes)[0] || null;
  const largest = files.sort((a, b) => b.bytes - a.bytes)[0] || null;

  return { total, initialTotal, largestLazy, largest };
}

try {
  const html = await readFile(join(distRoot, 'index.html'), 'utf8');
  const htmlBytes = Buffer.byteLength(html);
  const initialNames = getInitialAssetNames(html);
  const javascript = summarize(await assetsByExtension('.js'), initialNames);
  const css = summarize(await assetsByExtension('.css'), initialNames);
  const checks = [
    ['Initial JavaScript', javascript.initialTotal, budgets.initialJavascript],
    ['Largest lazy JavaScript', javascript.largestLazy?.bytes || 0, budgets.lazyJavascript],
    ['Total JavaScript', javascript.total, budgets.totalJavascript],
    ['Initial CSS', css.initialTotal, budgets.initialCss],
    ['Largest lazy CSS', css.largestLazy?.bytes || 0, budgets.lazyCss],
    ['Total CSS', css.total, budgets.totalCss],
    ['HTML shell', htmlBytes, budgets.html]
  ];
  const failures = checks.filter(([, actual, budget]) => actual > budget);

  console.log(
    `Performance budget ${failures.length ? 'failed' : 'passed'}: `
      + checks.map(([label, actual, budget]) => `${label} ${formatBytes(actual)}/${formatBytes(budget)}`).join('; ')
  );
  if (javascript.largest) console.log(`Largest JavaScript asset: ${javascript.largest.name} (${formatBytes(javascript.largest.bytes)}).`);
  if (javascript.largestLazy) console.log(`Largest lazy JavaScript asset: ${javascript.largestLazy.name} (${formatBytes(javascript.largestLazy.bytes)}).`);
  if (css.largest) console.log(`Largest CSS asset: ${css.largest.name} (${formatBytes(css.largest.bytes)}).`);
  if (css.largestLazy) console.log(`Largest lazy CSS asset: ${css.largestLazy.name} (${formatBytes(css.largestLazy.bytes)}).`);

  if (failures.length) {
    console.error(`Exceeded budgets: ${failures.map(([label]) => label).join(', ')}.`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`Performance budget could not run: ${error.message}`);
  process.exitCode = 1;
}
