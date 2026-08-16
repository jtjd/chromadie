import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('all routes use one cohesive application header', async () => {
  const siteHeader = await read('src/lib/SiteModeHeader.svelte');

  assert.match(siteHeader, /site-mode-header__wordmark/);
  assert.match(siteHeader, /background: transparent/);
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
  assert.match(siteHeader, />Customize</);
  assert.doesNotMatch(siteHeader, />Shop</);
  assert.match(siteHeader, /class:site-mode-header--home=\{isHomeMode \|\| isHomepageStyle\}/);
  assert.match(siteHeader, /--site-header-control-size: 0\.84rem/);
  assert.match(siteHeader, /--site-header-font: 'Inter'/);
  assert.match(siteHeader, /--site-header-display: 'Clash Display'/);
  assert.match(siteHeader, /site-mode-header__brand-mark/);
  assert.match(siteHeader, /data-site-chrome="header"/);
  assert.match(siteHeader, /height: 88px/);
  assert.match(siteHeader, /width: min\(1480px, calc\(100% - 64px\)\)/);
  assert.match(siteHeader, /Claim handle/);
  assert.doesNotMatch(siteHeader, /Satoshi|IBM Plex Mono|text-transform: lowercase/);
});

test('homepage, application, and auth routes share one footer chrome', async () => {
  const [homepage, app, auth, footer] = await Promise.all([
    read('src/lib/HomePage.svelte'),
    read('src/App.svelte'),
    read('src/lib/AuthPage.svelte'),
    read('src/lib/SiteFooter.svelte')
  ]);

  assert.match(homepage, /SiteFooter/);
  assert.match(app, /import SiteFooter from ['"]\.\/lib\/SiteFooter\.svelte['"]/);
  assert.match(auth, /SiteFooter/);
  assert.match(footer, /data-site-chrome="footer"/);
  assert.match(footer, /width: min\(1160px, calc\(100% - 48px\)\)/);
  assert.match(footer, /padding: 28px 0 36px/);
  assert.match(footer, /@media \(max-width: 780px\)/);
  assert.doesNotMatch(homepage, /homepage-footer/);
  assert.doesNotMatch(app, /site-footer-inner/);
  assert.doesNotMatch(auth, /auth-page__footer/);
});

test('authentication lifecycle pages keep the same site chrome while status is pending', async () => {
  const [callback, reset] = await Promise.all([
    read('src/lib/AuthCallback.svelte'),
    read('src/lib/ResetPassword.svelte')
  ]);

  for (const source of [callback, reset]) {
    assert.match(source, /SiteModeHeader/);
    assert.match(source, /SiteFooter/);
    assert.match(source, /isHomepageStyle=\{true\}/);
  }
});

test('supporting surfaces consume the profile visual tokens without changing route components', async () => {
  const siteStyles = await read('src/styles/site.css');
  const main = await read('src/main.js');
  const siteHeader = await read('src/lib/SiteModeHeader.svelte');

  assert.match(main, /styles\/site\.css/);
  assert.match(siteStyles, /--site-surface:/);
  assert.match(siteStyles, /\.app-main--site \.game-container/);
  assert.doesNotMatch(siteStyles, /\.app-main--site \.discovery-card/);
  assert.doesNotMatch(siteStyles, /\.app-main--site \.shop-page|\.shop-heading|\.shop-item/);
  assert.match(siteStyles, /--site-font: 'Inter'/);
  assert.match(siteStyles, /--font-display-stack: 'Clash Display'/);
  assert.match(siteStyles, /--font-body-stack: 'Inter'/);
  assert.match(siteStyles, /--site-accent: #00ffb3/);
  assert.doesNotMatch(siteStyles, /site-mode-header:not\(\.site-mode-header--home\):not\(\.site-mode-header--profile\)/);
  assert.match(siteHeader, /\.site-mode-header__brand-mark/);
  assert.match(siteStyles, /Homepage baseline for supporting routes/);
  assert.match(siteStyles, /prefers-reduced-motion/);
});

test('profile mode keeps the new header transparent and account-only', async () => {
  const siteHeader = await read('src/lib/SiteModeHeader.svelte');
  const profileShell = await read('src/lib/ProfileShell.svelte');
  const profileCard = await read('src/lib/ProfileReferenceCard.svelte');
  const environment = await read('src/lib/ProfileEnvironmentLayer.svelte');

  assert.match(siteHeader, /\.site-mode-header--profile \{/);
  assert.match(siteHeader, /\.site-mode-header--profile \.site-mode-header__right \{[\s\S]*background: transparent;[\s\S]*box-shadow: none;/);
  assert.match(siteHeader, /\.site-mode-header--profile \{[\s\S]*background: transparent !important;[\s\S]*backdrop-filter: none !important;/);
  assert.match(siteHeader, /\.site-mode-header--profile \.site-mode-header__nav-space \{ display: none; \}/);
  assert.match(siteHeader, /\.site-mode-header--profile \.site-mode-header__mobile-menu \{ display: none; \}/);
  assert.match(siteHeader, /\{#if isHomeMode \|\| isHomepageStyle\}<button[\s\S]*?Sign up<\/button>\{\/if\}/);
  assert.match(profileShell, /ProfileEnvironmentLayer/);
  assert.match(environment, /profile-environment--public/);
  assert.match(profileShell, /mode=\{previewMode \? 'preview' : 'public'\}/);
  assert.match(profileShell, /ProfileReferenceCard/);
  assert.match(environment, /<img class="profile-environment__image" src=\{backgroundSrc\}/);
  assert.match(environment, /\.profile-environment__image,[\s\S]*\.profile-environment__video/);
  assert.doesNotMatch(environment, /profile-shell__media-background/);
  assert.match(profileCard, /<ProfileBorderEffect/);
  assert.doesNotMatch(profileShell, /profile-shell__surface-backdrop/);
  assert.doesNotMatch(profileShell, /\.profile-shell__card-media-background \{ position: absolute;/);
});

test('leaderboard owns a new Profile Studio-inspired presentation contract', async () => {
  const siteStyles = await read('src/styles/site.css');
  const leaderboard = await read('src/lib/Leaderboard.svelte');
  const leaderboardEntry = await read('src/lib/LeaderboardEntry.svelte');
  const privacy = await read('src/lib/PrivacyPolicy.svelte');
  const terms = await read('src/lib/TermsOfService.svelte');

  assert.match(leaderboard, /<main class="leaderboard-studio"/);
  assert.match(leaderboard, /leaderboard-studio__module/);
  assert.match(leaderboard, /leaderboard-studio__tab-rail/);
  assert.match(leaderboardEntry, /leaderboard-entry/);
  assert.match(leaderboard, /--studio-accent: #00ffb3/);
  assert.match(leaderboard, /Clash Display/);
  assert.doesNotMatch(siteStyles, /discovery-(?:hub|card|grid|tabs|empty|your-rank)/);
  assert.match(privacy, /class="container site-document legal-page"/);
  assert.match(terms, /class="site-document terms"/);
  assert.match(siteStyles, /Privacy and Terms are the same kind of quiet product document/);
  assert.match(siteStyles, /\.app-main--site \.site-document :is\(\.legal-section, \.terms__section\)/);
  assert.doesNotMatch(siteStyles, /\.app-main--profile \{/);
});
