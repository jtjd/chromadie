import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const distRoot = join(projectRoot, 'dist');

async function collectCssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectCssFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.css')) files.push(path);
  }
  return files;
}

function hasResponsiveQuery(css, pattern) {
  return pattern.test(css);
}

try {
  const distStats = await stat(distRoot);
  if (!distStats.isDirectory()) throw new Error('dist is not a directory. Run npm run build first.');

  const cssFiles = await collectCssFiles(distRoot);
  if (!cssFiles.length) throw new Error('No compiled CSS assets were found in dist.');

  const css = (await Promise.all(cssFiles.map(file => readFile(file, 'utf8')))).join('\n');
  const mediaQueries = [...css.matchAll(/@media\s*\(([^)]*)\)/g)].map(match => match[1]);
  const responsiveQueries = mediaQueries.filter(query => /(?:max|min)-(?:width|height)|(?:width|height)\s*(?:<=|>=|<|>)/i.test(query));
  const requiredQueries = [
    ['48rem width', /@media\s*\([^)]*(?:max-width\s*:\s*48rem|width\s*<=\s*48rem)/i],
    ['36rem width', /@media\s*\([^)]*(?:max-width\s*:\s*36rem|width\s*<=\s*36rem)/i],
    ['600px width', /@media\s*\([^)]*(?:max-width\s*:\s*600px|width\s*<=\s*600px)/i],
    ['32rem height', /@media\s*\([^)]*(?:max-height\s*:\s*32rem|height\s*<=\s*32rem)/i]
  ];
  const missingQueries = requiredQueries.filter(([, pattern]) => !hasResponsiveQuery(css, pattern)).map(([label]) => label);

  console.log(`Compiled responsive CSS: ${responsiveQueries.length} width/height media queries across ${cssFiles.length} CSS assets.`);
  if (missingQueries.length) {
    console.error(`Missing required compiled responsive queries: ${missingQueries.join(', ')}.`);
    process.exitCode = 1;
  } else if (responsiveQueries.length < 100) {
    console.error(`Compiled responsive CSS count ${responsiveQueries.length} is below the safety floor of 100.`);
    process.exitCode = 1;
  } else {
    console.log('Compiled responsive CSS gate passed.');
  }
} catch (error) {
  console.error(`Compiled responsive CSS gate could not run: ${error.message}`);
  process.exitCode = 1;
}
