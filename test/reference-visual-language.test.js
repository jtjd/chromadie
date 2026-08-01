import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('reference typography is a shared, non-Google font contract', async () => {
  const [fonts, tokens, index, main] = await Promise.all([
    read('src/styles/fonts.css'),
    read('src/styles/tokens.css'),
    read('index.html'),
    read('src/main.js')
  ]);

  assert.match(tokens, /--font-body-stack: 'Spline Sans Variable'/);
  assert.match(tokens, /--font-display-stack: 'Spline Sans Variable'/);
  assert.match(tokens, /--font-mono-stack: 'IBM Plex Mono'/);
  assert.match(tokens, /--color-accent: #dbe7ef/);
  assert.match(tokens, /--color-accent-cyan: #8ddcff/);
  assert.match(tokens, /--color-accent-roll: #b7fd4d/);
  assert.match(main, /@fontsource-variable\/instrument-sans/);
  assert.match(main, /@fontsource-variable\/spline-sans/);
  assert.match(main, /@fontsource\/ibm-plex-mono/);
  assert.match(fonts, /font-family: 'Satoshi'/);
  assert.doesNotMatch(index, /fonts\.googleapis|fonts\.gstatic/);
});

test('quiet reference surfaces and reduced-motion behavior are encoded', async () => {
  const [header, home, directory, showcase, atmosphere, site] = await Promise.all([
    read('src/lib/SiteModeHeader.svelte'),
    read('src/lib/HomePage.svelte'),
    read('src/lib/HomepageProfileDirectory.svelte'),
    read('src/lib/HomepageScreenshotShowcase.svelte'),
    read('src/lib/ProfileAtmosphere.svelte'),
    read('src/styles/site.css')
  ]);

  assert.match(header, /background: rgba\(7, 8, 11, 0\.52\)/);
  assert.match(header, /class:site-mode-header--home=\{isHomeMode\}/);
  assert.match(header, /\.site-mode-header--home \{[\s\S]*position: sticky;/);
  assert.match(header, /--site-header-font: 'Satoshi'/);
  assert.match(header, /font: 600 0\.72rem \/ 1 var\(--site-header-font\)/);
  assert.match(header, /color: var\(--color-accent-cyan\)/);
  assert.match(home, /--home-canvas: #080908/);
  assert.match(home, /--home-font: 'Instrument Sans Variable'/);
  assert.match(home, /--home-mono: 'IBM Plex Mono'/);
  assert.doesNotMatch(home, /rgba\(139,124,246|radial-gradient\(circle at 85%/);
  assert.match(directory, /HomepageLiveTicker/);
  assert.match(directory, /grid-template-columns: minmax\(22rem/);
  assert.match(showcase, /grid-template-columns: minmax\(8rem/);
  assert.match(showcase, /prefers-reduced-motion/);
  assert.doesNotMatch(directory, /ProfileAtmosphere|ProfileMusic|IdentityCard/);
  assert.match(atmosphere, /background: #07080b/);
  assert.match(atmosphere, /prefers-reduced-motion/);
  assert.match(site, /background-color: var\(--color-canvas\)/);
  assert.match(site, /--site-accent: var\(--color-accent\)/);
});
