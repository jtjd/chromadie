import { stat, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const distRoot = join(projectRoot, 'dist');
const assetsRoot = join(distRoot, 'assets');
const budgets = {
  javascript: 625 * 1024,
  css: 295 * 1024,
  html: 12 * 1024
};

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

async function totalByExtension(extension) {
  const entries = await readdir(assetsRoot, { withFileTypes: true });
  const files = entries.filter(entry => entry.isFile() && entry.name.endsWith(extension));
  const sizes = await Promise.all(files.map(async entry => ({
    name: entry.name,
    bytes: (await stat(join(assetsRoot, entry.name))).size
  })));
  return {
    total: sizes.reduce((sum, file) => sum + file.bytes, 0),
    largest: sizes.sort((a, b) => b.bytes - a.bytes)[0] || null
  };
}

try {
  const htmlBytes = (await stat(join(distRoot, 'index.html'))).size;
  const javascript = await totalByExtension('.js');
  const css = await totalByExtension('.css');
  const checks = [
    ['JavaScript', javascript.total, budgets.javascript],
    ['CSS', css.total, budgets.css],
    ['HTML shell', htmlBytes, budgets.html]
  ];
  const failures = checks.filter(([, actual, budget]) => actual > budget);

  console.log(
    `Performance budget ${failures.length ? 'failed' : 'passed'}: `
      + checks.map(([label, actual, budget]) => `${label} ${formatBytes(actual)}/${formatBytes(budget)}`).join('; ')
  );
  if (javascript.largest) console.log(`Largest JavaScript asset: ${javascript.largest.name} (${formatBytes(javascript.largest.bytes)}).`);
  if (css.largest) console.log(`Largest CSS asset: ${css.largest.name} (${formatBytes(css.largest.bytes)}).`);

  if (failures.length) {
    console.error(`Exceeded budgets: ${failures.map(([label]) => label).join(', ')}.`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`Performance budget could not run: ${error.message}`);
  process.exitCode = 1;
}
