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
  assert.ok(header.includes('>Claim handle</button>{/if}'));
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
  assert.match(siteStyles, /--site-brand-accent: #D8A6FF/);
  assert.match(siteStyles, /--site-atmosphere-image: url\('\/site\/chromadie-roll-horizon\.webp'\)/);
  assert.match(siteStyles, /\.app-shell--site/);
  assert.match(app, /class:app-shell--site=\{/);
  assert.ok(atmosphereAsset.size > 1000, 'roll horizon should be a real local image asset');
  assert.match(siteStyles, /background: #f8f8f8/);
  assert.match(siteStyles, /\.site-state-card/);
  assert.match(siteStyles, /prefers-reduced-motion/);
  assert.doesNotMatch(siteStyles, /--site-accent: #00ffb3/);
});
