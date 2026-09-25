import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [app, header, footer, homepage, siteStyles, atmosphereStyles, rollPage, progressionPage, leaderboardOverrides] = await Promise.all([
  read('src/App.svelte'),
  read('src/lib/SiteModeHeader.svelte'),
  read('src/lib/SiteFooter.svelte'),
  read('src/lib/HomePage.svelte'),
  read('src/styles/site.css'),
  read('src/styles/site-atmosphere.css'),
  read('src/lib/RollPage.svelte'),
  read('src/lib/ProgressionPage.svelte'),
  read('src/styles/leaderboard-game.css')
]);
const [heroAsset, heroMobileAsset, lowerAsset] = await Promise.all([
  stat(new URL('../public/homepage/homepage-hero-atmosphere-anime-v1.png', import.meta.url)),
  stat(new URL('../public/homepage/homepage-hero-atmosphere-anime-mobile-v1.png', import.meta.url)),
  stat(new URL('../public/homepage/homepage-lower-continuous-v4.webp', import.meta.url))
]);

test('signed-out chrome keeps the reference destinations and gates protected routes through login', () => {
  assert.match(header, /navigateProtected\('progression'\)/);
  assert.match(header, /navigateProtected\('profile-settings'\)/);
  assert.match(header, /dispatch\('login', \{ mode: 'login' \}\)/);
  assert.ok(header.includes('{#if !isAuthenticated}'));
  assert.ok(header.includes('class="site-mode-header__create-profile"'));
  assert.ok(header.includes('>Create profile</button>'));
  assert.ok(footer.includes('{#if isAuthenticated}<a href="/profile/settings">Customize</a>{/if}'));
  assert.match(homepage, /<SiteFooter \{isAuthenticated\} variant="home-compact" \/>/);
});

test('signed-out Profile Studio entry resolves through the current auth route', () => {
  assert.doesNotMatch(app, /GuestLock/);
  assert.match(app, /function redirectSignedOutProfileSettings\(\)/);
  assert.match(app, /authRouteNext = nextPath/);
  assert.ok(app.includes('`/login?next=${encodeURIComponent(nextPath)}`'));
  assert.match(app, /routeMode === 'app' && view === 'profile-settings' && \$accountState === ACCOUNT_STATES\.SIGNED_OUT/);
});

test('normal site surfaces inherit the homepage type, canvas, and button contract', () => {
  assert.match(siteStyles, /--site-font: 'Inter'/);
  assert.match(siteStyles, /--site-display: 'Manrope Variable'/);
  assert.match(siteStyles, /--site-brand-accent: var\(--white\)/);
  assert.match(siteStyles, /--bg: #0e0e10/);
  assert.match(siteStyles, /--surface: #161619/);
  assert.match(siteStyles, /--surface-2: #1e1e22/);
  assert.match(siteStyles, /--surface-3: #28282c/);
  assert.match(siteStyles, /--border: rgba\(255, 255, 255, 0\.09\)/);
  assert.match(siteStyles, /--border-soft: rgba\(255, 255, 255, 0\.05\)/);
  assert.match(siteStyles, /--text: #f5f5f6/);
  assert.match(siteStyles, /--text-muted: #8d8c92/);
  assert.match(siteStyles, /--text-faint: #59585e/);
  assert.match(siteStyles, /--white: #ffffff/);
  assert.match(atmosphereStyles, /--site-homepage-hero-image: url\('\/homepage\/homepage-hero-atmosphere-anime-v1\.png'\)/);
  assert.match(atmosphereStyles, /--site-homepage-hero-image-mobile: url\('\/homepage\/homepage-hero-atmosphere-anime-mobile-v1\.png'\)/);
  assert.match(atmosphereStyles, /--site-homepage-lower-image: url\('\/homepage\/homepage-lower-continuous-v4\.webp'\)/);
  assert.match(atmosphereStyles, /\.site-atmosphere-page::before,[\s\S]*\.app-shell--site::before[\s\S]*var\(--site-homepage-hero-image\)/);
  assert.match(atmosphereStyles, /\.site-atmosphere-page::after,[\s\S]*\.app-shell--site::after[\s\S]*var\(--site-homepage-lower-image\)/);
  assert.match(atmosphereStyles, /\.app-shell--site/);
  assert.match(app, /class:app-shell--site=\{/);
  assert.match(app, /!profileModeVisible && !homeModeVisible && !profileSettingsModeVisible/);
  assert.match(app, /\.app-shell--site,[\s\S]*font-family: 'Inter'/);
  assert.match(app, /\.app-shell--home \.skip-link/);
  assert.ok(heroAsset.size > 1000, 'desktop homepage atmosphere should be a real local image asset');
  assert.ok(heroMobileAsset.size > 1000, 'mobile homepage atmosphere should be a real local image asset');
  assert.ok(lowerAsset.size > 1000, 'lower homepage atmosphere should be a real local image asset');
  assert.match(siteStyles, /background: var\(--white\)/);
  assert.match(header, /\.site-mode-header:not\(\.site-mode-header--profile\) \.site-mode-header__nav button/);
  assert.match(header, /\.site-mode-header__create-profile \{[\s\S]*border-radius: 999px !important;[\s\S]*background: #f4f4f5 !important;/);
  assert.match(siteStyles, /\.site-state-card/);
  assert.match(siteStyles, /prefers-reduced-motion/);
  assert.doesNotMatch(siteStyles, /--site-accent: #00ffb3/);
  assert.doesNotMatch(rollPage, /\.roll-page::before/);
  assert.match(progressionPage, /\.progression-page \{[\s\S]*background: transparent;/);
  assert.doesNotMatch(leaderboardOverrides, /\.app-shell--leaderboard::before|\.app-shell--leaderboard::after/);
});
