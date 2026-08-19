import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [app, header, footer, homepage, siteStyles] = await Promise.all([
  read('src/App.svelte'),
  read('src/lib/SiteModeHeader.svelte'),
  read('src/lib/SiteFooter.svelte'),
  read('src/lib/HomePage.svelte'),
  read('src/styles/site.css')
]);
const atmosphereAsset = await stat(new URL('../public/site/chromadie-roll-horizon.webp', import.meta.url));

test('signed-out chrome hides inaccessible Customize actions', () => {
  assert.ok(header.includes('{#if isAuthenticated}'));
  assert.ok(header.includes('>Customize</button>{/if}'));
  assert.ok(header.includes('{#if !isAuthenticated}'));
  assert.ok(header.includes('class="site-mode-header__claim-link"'));
  assert.ok(header.includes('>Claim handle</a>'));
  assert.ok(footer.includes('{#if isAuthenticated}<a href="/profile/settings">Customize</a>{/if}'));
  assert.match(homepage, /<SiteFooter \{isAuthenticated\} \/>/);
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
  assert.match(siteStyles, /--site-atmosphere-image: url\('\/site\/chromadie-roll-horizon\.webp'\)/);
  assert.match(siteStyles, /\.app-shell--site/);
  assert.match(app, /class:app-shell--site=\{/);
  assert.ok(atmosphereAsset.size > 1000, 'roll horizon should be a real local image asset');
  assert.match(siteStyles, /background: var\(--white\)/);
  assert.match(header, /\.site-mode-header--home \.site-mode-header__nav button:not\(\.site-mode-header__claim-link\)/);
  assert.match(header, /\.site-mode-header--home \.site-mode-header__claim-link[\s\S]*color: var\(--bg, #0e0e10\) !important/);
  assert.match(siteStyles, /\.site-state-card/);
  assert.match(siteStyles, /prefers-reduced-motion/);
  assert.doesNotMatch(siteStyles, /--site-accent: #00ffb3/);
});
