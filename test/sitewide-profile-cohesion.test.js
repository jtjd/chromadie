import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('all routes use one cohesive application header', async () => {
  const siteHeader = await read('src/lib/SiteModeHeader.svelte');

  assert.match(siteHeader, /src="\/logo-mark\.svg"/);
  assert.match(siteHeader, /background: transparent/);
  assert.match(siteHeader, /site-mode-header__nav.*\//s);
  assert.match(siteHeader, /\{#if !minimalMode\}\s*<nav class="site-mode-header__nav"/);
  assert.match(siteHeader, /\{#if !minimalMode\}\s*<div class="site-mode-header__mobile-primary"/);
  assert.match(siteHeader, /isProfileMode \? 'Open profile actions' : isHomeMode \? 'Open account actions'/);
  assert.match(siteHeader, /navigate\('home'\)/);
  assert.match(siteHeader, /class:site-mode-header--profile/);
  assert.match(siteHeader, /site-mode-header__context/);
  assert.match(siteHeader, /site-mode-header__mobile-primary/);
  assert.match(siteHeader, /\$: minimalMode = isProfileMode;/);
  assert.match(siteHeader, /--site-header-control-size: 0\.78rem/);
  assert.match(siteHeader, /var\(--font-body-stack\)/);
  assert.doesNotMatch(siteHeader, /var\(--font-mono-stack\)/);
});

test('supporting surfaces consume the profile visual tokens without changing route components', async () => {
  const siteStyles = await read('src/styles/site.css');
  const main = await read('src/main.js');

  assert.match(main, /styles\/site\.css/);
  assert.match(siteStyles, /--site-surface:/);
  assert.match(siteStyles, /\.app-main--site \.game-container/);
  assert.match(siteStyles, /\.app-main--site \.discovery-card/);
  assert.match(siteStyles, /\.app-main--site \.shop-page/);
  assert.match(siteStyles, /prefers-reduced-motion/);
});
