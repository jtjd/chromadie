import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const htmlPath = existsSync('dist/index.html') ? 'dist/index.html' : 'index.html';
const html = readFileSync(htmlPath, 'utf8');
const headers = readFileSync('public/_headers', 'utf8');
const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];

if (inlineScripts.length === 0) {
  throw new Error(`No inline JSON-LD script was found in ${htmlPath}.`);
}

for (const [, source] of inlineScripts) {
  const hash = `sha256-${createHash('sha256').update(source).digest('base64')}`;
  if (!headers.includes(`'${hash}'`)) {
    throw new Error(`CSP drift: public/_headers is missing '${hash}' for ${htmlPath}.`);
  }
}

if (/script-src[^;]*'unsafe-inline'/.test(headers)) {
  throw new Error('CSP drift: script-src must not allow unsafe-inline.');
}

console.log(`CSP check passed for ${inlineScripts.length} inline script block(s) in ${htmlPath}.`);
