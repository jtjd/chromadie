import { readFile, stat, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const distRoot = join(projectRoot, 'dist');
const assetsRoot = join(distRoot, 'assets');
const manifestPath = join(distRoot, '.vite', 'manifest.json');
const publicMediaRoot = join(projectRoot, 'public');
const atmosphereMediaRoot = join(publicMediaRoot, 'atmospheres');

// Blocking budgets describe payloads a visitor can actually load. Aggregate
// totals remain advisory catalog-growth signals because mutually exclusive
// lazy routes are not downloaded together during a normal page visit.
const budgets = {
  initialJavascript: 300 * 1024,
  lazyJavascript: 100 * 1024,
  initialCss: 100 * 1024,
  lazyCss: 75 * 1024,
  html: 12 * 1024,
  routes: {
    auth: { entries: ['src/lib/Auth.svelte'], javascript: 300 * 1024, css: 90 * 1024 },
    // The reference homepage owns a direct marketing specimen for its hero and
    // photographic showcase, so this route is budgeted as its own shell.
    homepage: { entries: ['src/lib/HomePage.svelte'], javascript: 500 * 1024, css: 220 * 1024 },
    publicProfile: { entries: ['src/lib/ProfileShell.svelte'], javascript: 475 * 1024, css: 200 * 1024 },
    dashboard: {
      entries: ['src/lib/ProfileSettings.svelte', 'src/lib/ProfileShell.svelte', 'src/lib/ProfileStudioOverview.svelte'],
      // The reference workspace keeps preview/device controls and four editor
      // surfaces in the authenticated dashboard route. Keep a tight route
      // ceiling while accounting for that intentional presentation payload.
      javascript: 528 * 1024,
      css: 225 * 1024
    }
  }
};

const advisoryCatalogTargets = {
  javascript: 800 * 1024,
  css: 400 * 1024
};

// Decorative atmosphere media is intentionally outside the compiled asset
// graph, so keep a separate source-media guardrail for the public-profile
// acquisition surface. The per-video limit reflects the largest file a
// visitor can be asked to download; the catalog limit prevents silent growth
// from accumulating across fallback formats and authored scenes.
const mediaBudgets = {
  atmosphereCatalog: 90 * 1024 * 1024,
  largestAtmosphereVideo: 12 * 1024 * 1024
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

async function listFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const filePath = join(root, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(filePath));
    else files.push(filePath);
  }
  return files;
}

async function summarizeAtmosphereMedia() {
  const files = await listFiles(atmosphereMediaRoot);
  const media = await Promise.all(files.map(async filePath => ({
    path: filePath,
    bytes: (await stat(filePath)).size
  })));
  const videos = media.filter(file => /\.(?:webm|mp4)$/i.test(file.path));
  return {
    total: media.reduce((sum, file) => sum + file.bytes, 0),
    largestVideo: videos.sort((left, right) => right.bytes - left.bytes)[0] || null
  };
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

async function summarizeManifestEntries(manifest, entries) {
  const visited = new Set();
  const javascriptFiles = new Set();
  const cssFiles = new Set();

  function resolveManifestKey(key) {
    if (manifest[key]) return key;
    const sourceName = String(key).split('/').pop()?.replace(/\.[^.]+$/, '');
    const candidates = Object.entries(manifest)
      .filter(([, item]) => item?.name === sourceName && item.file?.endsWith('.js'))
      .map(([candidate]) => candidate);
    if (candidates.length === 1) return candidates[0];
    throw new Error(`Performance manifest is missing ${key}`);
  }

  function visit(key) {
    const resolvedKey = resolveManifestKey(key);
    if (visited.has(resolvedKey)) return;
    const item = manifest[resolvedKey];
    visited.add(resolvedKey);
    if (item.file?.endsWith('.js')) javascriptFiles.add(item.file);
    for (const cssFile of item.css || []) cssFiles.add(cssFile);
    for (const importedKey of item.imports || []) visit(importedKey);
  }

  for (const entry of entries) visit(entry);
  const totalSize = async files => {
    const sizes = await Promise.all([...files].map(file => stat(join(distRoot, file))));
    return sizes.reduce((sum, fileStat) => sum + fileStat.size, 0);
  };

  return {
    javascript: await totalSize(javascriptFiles),
    css: await totalSize(cssFiles)
  };
}

try {
  const html = await readFile(join(distRoot, 'index.html'), 'utf8');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const htmlBytes = Buffer.byteLength(html);
  const initialNames = getInitialAssetNames(html);
  const javascript = summarize(await assetsByExtension('.js'), initialNames);
  const css = summarize(await assetsByExtension('.css'), initialNames);
  const atmosphereMedia = await summarizeAtmosphereMedia();
  const routeSummaries = await Promise.all(Object.entries(budgets.routes).map(async ([name, routeBudget]) => ({
    name,
    budget: routeBudget,
    ...(await summarizeManifestEntries(manifest, routeBudget.entries))
  })));
  const checks = [
    ['Initial JavaScript', javascript.initialTotal, budgets.initialJavascript],
    ['Largest lazy JavaScript', javascript.largestLazy?.bytes || 0, budgets.lazyJavascript],
    ['Initial CSS', css.initialTotal, budgets.initialCss],
    ['Largest lazy CSS', css.largestLazy?.bytes || 0, budgets.lazyCss],
    ['HTML shell', htmlBytes, budgets.html],
    ['Atmosphere media catalog', atmosphereMedia.total, mediaBudgets.atmosphereCatalog],
    ['Largest atmosphere video', atmosphereMedia.largestVideo?.bytes || 0, mediaBudgets.largestAtmosphereVideo],
    ...routeSummaries.flatMap(route => [
      [`${route.name} route JavaScript`, route.javascript, route.budget.javascript],
      [`${route.name} route CSS`, route.css, route.budget.css]
    ])
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
  if (atmosphereMedia.largestVideo) {
    console.log(`Largest atmosphere video: ${atmosphereMedia.largestVideo.path.replace(`${projectRoot}/`, '')} (${formatBytes(atmosphereMedia.largestVideo.bytes)}).`);
  }
  const advisoryOverages = [
    ['JavaScript catalog', javascript.total, advisoryCatalogTargets.javascript],
    ['CSS catalog', css.total, advisoryCatalogTargets.css]
  ].filter(([, actual, target]) => actual > target);
  console.log(
    `Advisory asset catalog: JavaScript ${formatBytes(javascript.total)}/${formatBytes(advisoryCatalogTargets.javascript)}; `
      + `CSS ${formatBytes(css.total)}/${formatBytes(advisoryCatalogTargets.css)}.`
  );
  if (advisoryOverages.length) {
    console.warn(`Advisory catalog targets exceeded: ${advisoryOverages.map(([label]) => label).join(', ')}.`);
  }

  if (failures.length) {
    console.error(`Exceeded budgets: ${failures.map(([label]) => label).join(', ')}.`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`Performance budget could not run: ${error.message}`);
  process.exitCode = 1;
}
