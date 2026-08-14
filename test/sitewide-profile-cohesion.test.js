import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('all routes use one cohesive application header', async () => {
  const siteHeader = await read('src/lib/SiteModeHeader.svelte');

  assert.match(siteHeader, /site-mode-header__wordmark/);
  assert.match(siteHeader, /background: transparent/);
  assert.match(siteHeader, /site-mode-header__nav.*\//s);
  assert.match(siteHeader, /\{#if !minimalMode\}\s*<nav class="site-mode-header__nav"/);
  assert.match(siteHeader, /\{#if !minimalMode\}\s*<div class="site-mode-header__mobile-primary"/);
  assert.match(siteHeader, /isProfileMode \? 'Open profile actions' : isHomeMode \|\| isHomepageStyle \? 'Open account actions'/);
  assert.match(siteHeader, /navigate\('home'\)/);
  assert.match(siteHeader, /class:site-mode-header--profile/);
  assert.match(siteHeader, /class:site-mode-header--profile-settings/);
  assert.match(siteHeader, /\(isHomeMode \|\| isHomepageStyle \|\| isProfileMode\) && !isAuthenticated/);
  assert.match(siteHeader, /width: 100%;/);
  assert.doesNotMatch(siteHeader, /width: min\(100%, 92rem\)/);
  assert.match(siteHeader, /site-mode-header__context/);
  assert.match(siteHeader, /site-mode-header__mobile-primary/);
  assert.match(siteHeader, /\$: minimalMode = isProfileMode;/);
  assert.match(siteHeader, /activeView === 'leaderboard'[\s\S]*>Leaderboard</);
  assert.match(siteHeader, /activeView === 'pricing'[\s\S]*>Pricing</);
  assert.match(siteHeader, /site-mode-header__mobile-primary"[\s\S]*activeView === 'pricing'/);
  assert.doesNotMatch(siteHeader, /Explore|How it works|scrollToHomeSection/);
  assert.doesNotMatch(siteHeader, />Profile</);
  assert.match(siteHeader, />Studio</);
  assert.doesNotMatch(siteHeader, />Shop</);
  assert.match(siteHeader, /class:site-mode-header--home=\{isHomeMode \|\| isHomepageStyle\}/);
  assert.match(siteHeader, /--site-header-control-size: 0\.78rem/);
  assert.match(siteHeader, /--site-header-font: 'Satoshi'/);
  assert.doesNotMatch(siteHeader, /var\(--font-mono-stack\)/);
});

test('supporting surfaces consume the profile visual tokens without changing route components', async () => {
  const siteStyles = await read('src/styles/site.css');
  const main = await read('src/main.js');
  const siteHeader = await read('src/lib/SiteModeHeader.svelte');

  assert.match(main, /styles\/site\.css/);
  assert.match(siteStyles, /--site-surface:/);
  assert.match(siteStyles, /\.app-main--site \.game-container/);
  assert.match(siteStyles, /\.app-main--site \.discovery-card/);
  assert.match(siteStyles, /\.app-main--site \.shop-page/);
  assert.match(siteStyles, /--site-font: 'Instrument Sans Variable'/);
  assert.match(siteStyles, /--font-display-stack: 'Clash Display'/);
  assert.match(siteStyles, /--font-body-stack: 'Inter'/);
  assert.match(siteStyles, /--site-accent: #cdd2ff/);
  assert.doesNotMatch(siteStyles, /site-mode-header:not\(\.site-mode-header--home\):not\(\.site-mode-header--profile\)/);
  assert.match(siteHeader, /\.site-mode-header--home \.site-mode-header__brand[\s\S]*font-size: 0\.75rem/);
  assert.match(siteStyles, /Homepage baseline for supporting routes/);
  assert.match(siteStyles, /prefers-reduced-motion/);
});

test('profile mode keeps the new header transparent and account-only', async () => {
  const siteHeader = await read('src/lib/SiteModeHeader.svelte');
  const profileShell = await read('src/lib/ProfileShell.svelte');

  assert.match(siteHeader, /\.site-mode-header--profile \{/);
  assert.match(siteHeader, /\.site-mode-header--profile \.site-mode-header__right \{[\s\S]*background: transparent;[\s\S]*box-shadow: none;/);
  assert.match(siteHeader, /\.site-mode-header--profile \{[\s\S]*background: transparent !important;[\s\S]*backdrop-filter: none !important;/);
  assert.match(siteHeader, /\.site-mode-header--profile \.site-mode-header__nav-space \{ display: none; \}/);
  assert.match(siteHeader, /\.site-mode-header--profile \.site-mode-header__mobile-menu \{ display: none; \}/);
  assert.match(siteHeader, /\.site-mode-header--profile \.site-mode-header__wordmark > span \{ color: #cdd2ff; \}/);
  assert.match(siteHeader, /\{#if isHomeMode \|\| isHomepageStyle\}<button[\s\S]*?Sign up<\/button>\{\/if\}/);
  assert.match(profileShell, /:global\(\.profile-atmosphere\.profile-shell__page-atmosphere-layer\) \{ position: fixed;/);
  assert.match(profileShell, /:global\(\.cursor-trail-layer\.profile-shell__page-cursor-layer\) \{ position: fixed;/);
  assert.match(profileShell, /profile-shell-page--preview \.profile-atmosphere\.profile-shell__page-atmosphere-layer/);
  assert.match(profileShell, /profile-shell-page--preview \.cursor-trail-layer\.profile-shell__page-cursor-layer/);
  assert.match(profileShell, /profile-border-effect\.profile-shell__identity-boundary\) \{ isolation: auto;/);
  assert.match(profileShell, /<img class="profile-shell__media-image" src=\{backgroundSrc\}/);
  assert.match(profileShell, /\.profile-shell__media-image,[\s\S]*\.profile-shell__media-video/);
  assert.doesNotMatch(profileShell, /profile-shell__media-background/);
  assert.match(profileShell, /<ProfileBorderEffect/);
  assert.doesNotMatch(profileShell, /profile-shell__surface-backdrop/);
  assert.doesNotMatch(profileShell, /\.profile-shell__card-media-background \{ position: absolute;/);
});

test('leaderboard and legal routes share the homepage presentation contract', async () => {
  const siteStyles = await read('src/styles/site.css');
  const discoveryHub = await read('src/lib/DiscoveryHub.svelte');
  const privacy = await read('src/lib/PrivacyPolicy.svelte');
  const terms = await read('src/lib/TermsOfService.svelte');

  assert.match(discoveryHub, /<div class="discovery-grid">/);
  assert.match(discoveryHub, /discovery-grid__item/);
  assert.match(discoveryHub, /presentation="leaderboard"/);
  assert.match(siteStyles, /\.app-main--site \.discovery-hub \{/);
  assert.match(siteStyles, /\.app-main--site \.discovery-card/);
  assert.doesNotMatch(siteStyles, /\.app-main--site \.discovery-grid > \.discovery-card/);
  assert.doesNotMatch(siteStyles, /\.app-main--site \.discovery-card__main \{/);
  assert.match(privacy, /class="container site-document legal-page"/);
  assert.match(terms, /class="site-document terms"/);
  assert.match(siteStyles, /Privacy and Terms are the same kind of quiet product document/);
  assert.match(siteStyles, /\.app-main--site \.site-document :is\(\.legal-section, \.terms__section\)/);
  assert.doesNotMatch(siteStyles, /\.app-main--profile \{/);
});
