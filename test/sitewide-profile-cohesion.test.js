import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('all routes use one cohesive application header', async () => {
  const siteHeader = await read('src/lib/SiteModeHeader.svelte');

  assert.match(siteHeader, /site-mode-header__brand-logo/);
  assert.match(siteHeader, /background: transparent/);
  assert.match(siteHeader, /\{#if !isProfileMode\}\s*<nav class="site-mode-header__nav"/);
  assert.match(siteHeader, /\{#if !isProfileMode\}\s*<div class="site-mode-header__mobile-primary"/);
  assert.match(siteHeader, /isProfileMode \? 'Open profile actions' : isHomeMode \|\| isHomepageStyle \? 'Open account actions'/);
  assert.match(siteHeader, /navigate\('home'\)/);
  assert.match(siteHeader, /class:site-mode-header--profile/);
  assert.match(siteHeader, /class:site-mode-header--profile-settings/);
  assert.match(siteHeader, /\{:else if !isAuthenticated\}/);
  assert.match(siteHeader, /width: 100%;/);
  assert.doesNotMatch(siteHeader, /width: min\(100%, 92rem\)/);
  assert.match(siteHeader, /site-mode-header__context/);
  assert.match(siteHeader, /site-mode-header__mobile-primary/);
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
  assert.match(siteHeader, /--site-header-display: 'Manrope Variable'/);
  assert.match(siteHeader, /src="\/brand\/am-mark-v1\.webp"/);
  assert.match(siteHeader, /\.site-mode-header:not\(\.site-mode-header--profile\) \.site-mode-header__nav button/);
  assert.match(siteHeader, /color: rgba\(255, 255, 255, 0\.9\) !important/);
  assert.match(siteHeader, /data-site-chrome="header"/);
  assert.match(siteHeader, /height: 54px/);
  assert.match(siteHeader, /width: min\(968px, calc\(100% - 48px\)\)/);
  assert.match(siteHeader, /grid-template-columns: minmax\(0, 1fr\) auto minmax\(0, 1fr\)/);
  assert.match(siteHeader, /background: rgba\(13, 14, 17, 0\.76\)/);
  assert.match(siteHeader, />Login</);
  assert.match(siteHeader, />Create profile</);
  assert.match(siteHeader, /site-mode-header__account-menu/);
  assert.match(siteHeader, /site-mode-header__avatar/);
  assert.match(siteHeader, /background: rgba\(8, 9, 12, 0\.72\)/);
  assert.doesNotMatch(siteHeader, /linear-gradient\(145deg, #69616f/);
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
  assert.match(footer, /padding: 30px 0 38px/);
  assert.match(footer, /@media \(max-width: 780px\)/);
  assert.match(homepage, /<SiteFooter \{isAuthenticated\} variant="home" \/>/);
  assert.match(homepage, /homepage-footer/);
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
  const [siteStyles, atmosphereStyles, main, app, siteHeader] = await Promise.all([
    read('src/styles/site.css'),
    read('src/styles/site-atmosphere.css'),
    read('src/main.js'),
    read('src/App.svelte'),
    read('src/lib/SiteModeHeader.svelte')
  ]);

  assert.match(main, /styles\/site\.css/);
  assert.match(siteStyles, /--site-surface:/);
  assert.match(siteStyles, /\.app-main--site \.game-container/);
  assert.doesNotMatch(siteStyles, /\.app-main--site \.discovery-card/);
  assert.doesNotMatch(siteStyles, /\.app-main--site \.shop-page|\.shop-heading|\.shop-item/);
  assert.match(siteStyles, /--site-font: 'Inter'/);
  assert.match(siteStyles, /--font-display-stack: 'Manrope Variable'/);
  assert.match(siteStyles, /--font-body-stack: 'Inter'/);
  assert.match(siteStyles, /--site-accent: var\(--white\)/);
  assert.match(atmosphereStyles, /--site-homepage-hero-image: url\('\/homepage\/homepage-hero-atmosphere-anime-v1\.png'\)/);
  assert.match(atmosphereStyles, /--site-homepage-hero-image-mobile: url\('\/homepage\/homepage-hero-atmosphere-anime-mobile-v1\.png'\)/);
  assert.match(atmosphereStyles, /--site-homepage-lower-image: url\('\/homepage\/homepage-lower-continuous-v4\.webp'\)/);
  assert.match(atmosphereStyles, /\.site-atmosphere-page::before,[\s\S]*background-image:[\s\S]*var\(--site-homepage-hero-image\)/);
  assert.match(atmosphereStyles, /\.site-atmosphere-page::after,[\s\S]*background: var\(--site-homepage-lower-image\)/);
  assert.doesNotMatch(siteStyles, /site-atmosphere-(?:image|veil|glow)/);
  assert.match(app, /import\('\.\/styles\/site-atmosphere\.css'\)/);
  assert.match(app, /class:app-shell--site=\{[\s\S]*!profileSettingsModeVisible/);
  assert.doesNotMatch(siteStyles, /site-mode-header:not\(\.site-mode-header--home\):not\(\.site-mode-header--profile\)/);
  assert.match(siteHeader, /\.site-mode-header__brand-logo/);
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
  assert.match(siteHeader, /\{#if !isHomeMode\}<button[^>]*[\s\S]*?>Roll<\/button>\{\/if\}/);
  assert.doesNotMatch(siteHeader, /\{#if isHomeMode\}<button[\s\S]*?Sign up<\/button>\{\/if\}/);
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

test('leaderboard owns a focused flat ranked-column presentation contract', async () => {
  const siteStyles = await read('src/styles/site.css');
  const leaderboard = await read('src/lib/Leaderboard.svelte');
  const leaderboardEntry = await read('src/lib/LeaderboardEntry.svelte');
  const privacy = await read('src/lib/PrivacyPolicy.svelte');
  const terms = await read('src/lib/TermsOfService.svelte');

  assert.match(leaderboard, /<main class="roll-leaderboard"/);
  assert.match(leaderboard, /roll-leaderboard__tabs/);
  assert.match(leaderboard, /roll-leaderboard__results/);
  assert.match(leaderboard, /roll-leaderboard__list/);
  assert.match(leaderboard, /roll-leaderboard__column-headings/);
  assert.match(leaderboard, /roll-leaderboard__column-heading-metrics/);
  assert.match(leaderboardEntry, /leaderboard-row/);
  assert.match(leaderboard, /--leaderboard-accent:/);
  assert.match(leaderboard, /Manrope Variable/);
  assert.match(leaderboard, /--leaderboard-panel: var\(--surface/);
  assert.match(leaderboard, /--leaderboard-muted: var\(--text-muted/);
  assert.match(leaderboardEntry, /leaderboard-row__rank-mark/);
  assert.match(leaderboardEntry, /visiblePosition === 1/);
  assert.match(leaderboardEntry, /leaderboard-row::before/);
  assert.match(leaderboardEntry, /border-radius: 999px; background: linear-gradient/);
  assert.match(leaderboardEntry, /showUsername/);
  assert.match(leaderboardEntry, /leaderboard-row__roll-swatch/);
  assert.match(leaderboardEntry, /leaderboard-row__metrics/);
  assert.match(leaderboardEntry, /leaderboard-row__metric-label.*aria-hidden="true"/s);
  assert.match(leaderboardEntry, /border-radius: 16px/);
  assert.match(leaderboard, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(leaderboard, /column-heading-metrics span \{ text-align: center; \}/);
  assert.match(leaderboardEntry, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(leaderboardEntry, /justify-content: center; min-width: 0/);
  assert.match(leaderboardEntry, /rollHex/);
  assert.match(leaderboardEntry, /font: 850 1\.15rem\/1/);
  assert.doesNotMatch(leaderboard + leaderboardEntry, /featured-list|roll-leaderboard__lower|leaderboard-row--podium|variant="podium"/);
  assert.doesNotMatch(siteStyles, /discovery-(?:hub|card|grid|tabs|empty|your-rank)/);
  assert.match(privacy, /class="container site-document legal-page"/);
  assert.match(terms, /class="site-document terms"/);
  assert.match(siteStyles, /Privacy and Terms are the same kind of quiet product document/);
  assert.match(siteStyles, /\.app-main--site \.site-document :is\(\.legal-section, \.terms__section\)/);
  assert.doesNotMatch(siteStyles, /\.app-main--profile \{/);
});
