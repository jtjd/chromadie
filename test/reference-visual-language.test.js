import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('reference typography is a shared, non-Google font contract', async () => {
  const [fonts, tokens, index] = await Promise.all([
    read('src/styles/fonts.css'),
    read('src/styles/tokens.css'),
    read('index.html')
  ]);

  assert.match(fonts, /font-family: 'Satoshi'/);
  assert.match(fonts, /font-family: 'Cabinet Grotesk'/);
  assert.match(fonts, /font-family: 'Geist Mono'/);
  assert.match(tokens, /--font-body-stack: 'Satoshi'/);
  assert.match(tokens, /--font-display-stack: 'Cabinet Grotesk'/);
  assert.match(tokens, /--font-mono-stack: 'Geist Mono'/);
  assert.doesNotMatch(index, /fonts\.googleapis|fonts\.gstatic/);
});

test('quiet reference surfaces and reduced-motion behavior are encoded', async () => {
  const [header, home, showcase, atmosphere, site] = await Promise.all([
    read('src/lib/SiteModeHeader.svelte'),
    read('src/lib/HomePage.svelte'),
    read('src/lib/HomeRollShowcase.svelte'),
    read('src/lib/ProfileAtmosphere.svelte'),
    read('src/styles/site.css')
  ]);

  assert.match(header, /border-radius: var\(--radius-pill\)/);
  assert.match(header, /background: rgba\(7, 8, 11, 0\.52\)/);
  assert.match(home, /--home-canvas: #080908/);
  assert.match(home, /--home-font: 'Spline Sans Variable'/);
  assert.match(home, /--home-mono: 'IBM Plex Mono'/);
  assert.doesNotMatch(home, /rgba\(139,124,246|radial-gradient\(circle at 85%/);
  assert.doesNotMatch(showcase, /border-prism-anim|frame-diamond-anim|name-spectrum-anim|roll-sparkles-anim|orb-shape-diamond/);
  assert.match(atmosphere, /background: #07080b/);
  assert.match(atmosphere, /prefers-reduced-motion/);
  assert.match(site, /background: rgba\(9, 11, 15, 0\.76\)/);
});
