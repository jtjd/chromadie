import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const home = await read('src/lib/HomePage.svelte');
const directory = await read('src/lib/HomepageProfileDirectory.svelte');
const ticker = await read('src/lib/HomepageLiveTicker.svelte');
const directoryData = await read('src/lib/homepageDirectory.js');
const hero = await read('src/lib/HomeHero.svelte');
const product = await read('src/lib/HomeProductView.svelte');
const dailyResult = await read('src/lib/HomeDailyResult.svelte');
const howItWorks = await read('src/lib/HomeHowItWorks.svelte');
const leaderboard = await read('src/lib/HomeLeaderboard.svelte');
const claim = await read('src/lib/HomeUsernameClaim.svelte');
const imageLightbox = await read('src/lib/HomeImageLightbox.svelte');
const referenceRollGlyph = await read('src/lib/HomeReferenceRollGlyph.svelte');
const compactRollPreview = await read('src/lib/CompactRollPreview.svelte');
const rollPreview = await read('src/lib/RollPreview.svelte');
const shopItemPreview = await read('src/lib/ShopItemPreview.svelte');
const discoveryPreviewMigration = await read('supabase/migrations/20260801090000_discovery_profile_preview.sql');
const discoveryStatsMigration = await read('supabase/migrations/20260801130000_discovery_roll_count.sql');
const audioControls = await read('src/lib/ProfileAudioControls.svelte');
const profileMusic = await read('src/lib/ProfileMusic.svelte');
const app = await read('src/App.svelte');
const routeLoaders = await read('src/lib/routeLoaders.js');
const main = await read('src/main.js');
const guestProfile = await read('src/lib/GuestProfileOnboarding.svelte');

test('the homepage explains the daily identity loop with a direct claim action', () => {
  assert.match(hero, /A public profile that <span>changes every day\.<\/span>/);
  assert.match(hero, /Customize your page with a background, avatar, music, links, and profile effects/);
  assert.match(hero, /Each daily color becomes part of your profile history, earns EP/);
  assert.match(hero, /HomeUsernameClaim/);
  assert.match(claim, /dispatch\('claim'/);
  assert.match(claim, /chm\.lol\//);
  assert.match(product, /The profile and the roll live together/);
  assert.match(product, /HomeImageLightbox/);
  assert.match(product, /home-product \.home-product__image-trigger/);
  assert.match(product, /height: 14\.7rem/);
  assert.match(product, /transform: scale\(2\.1\)/);
  assert.doesNotMatch(product, /home-reveal/);
  assert.match(howItWorks, /Roll\. Progress\. Move into view/);
  assert.match(howItWorks, /HomeImageLightbox/);
  assert.match(howItWorks, /\.home-how h2 \{ max-width: 49\.4rem/);
  assert.match(howItWorks, /home-how__visual-frame \.home-how__image/);
  assert.match(leaderboard, /Today.s colors lead to real profiles/);
  assert.match(leaderboard, /home-leaderboard h2/);
  assert.match(leaderboard, /#94959e/);
  assert.match(home, /Make the page yours/);
  assert.match(home, /HomeHowItWorks/);
  assert.match(home, /HomeLeaderboard/);
  assert.match(home, /HomepageProfileDirectory/);
  assert.match(home, /prefers-reduced-motion/);
  assert.match(main, /@fontsource-variable\/instrument-sans/);
  assert.match(main, /@fontsource-variable\/spline-sans/);
  assert.match(main, /@fontsource\/ibm-plex-mono/);
  assert.match(directory, /get_public_discovery/);
  assert.match(directory, /loadProfileContext/);
  assert.match(directory, /normalizeDiscoveryResponse/);
  assert.match(directory, /HomepageLiveTicker/);
  assert.doesNotMatch(directory, /HomepageScreenshotShowcase|HomepageProfilePreview|HomepageRollSummary/);
  assert.match(directory, /leaderboard/);
  assert.match(directory, /heroRoll/);
  assert.match(ticker, /Waiting for today’s public rolls/);
  assert.match(ticker, /prefers-reduced-motion/);
  assert.match(ticker, /focus-within/);
  assert.match(ticker, /ticker-distance/);
  assert.match(ticker, /firstGroup/);
  assert.match(ticker, /ResizeObserver/);
  assert.match(ticker, /document\.fonts/);
  assert.match(dailyResult, /CompactRollPreview/);
  assert.match(dailyResult, /referenceShape/);
  assert.match(dailyResult, /place-items: center/);
  assert.match(howItWorks, /role="tablist"/);
  assert.match(howItWorks, /aria-selected/);
  assert.match(howItWorks, /ArrowRight/);
  assert.match(leaderboard, /slice\(0, 3\)/);
  assert.match(leaderboard, /getProfileMediaUrl/);
  assert.match(leaderboard, /CompactRollPreview/);
  assert.match(leaderboard, /referenceShape/);
  assert.match(referenceRollGlyph, /linearGradient/);
  assert.match(referenceRollGlyph, /polygon points="60,10 103,91 60,109 17,91"/);
  assert.match(referenceRollGlyph, /home-reference-glyph-float/);
  assert.doesNotMatch(compactRollPreview, /referenceShape && !orbCls/);
  assert.match(rollPreview, /orb-shape-/);
  assert.match(rollPreview, /HomeReferenceRollGlyph/);
  assert.match(shopItemPreview, /HomeReferenceRollGlyph/);
  assert.match(imageLightbox, /aria-modal="true"/);
  assert.match(imageLightbox, /event\.key === 'Escape'/);
  assert.match(imageLightbox, /View larger image/);
  assert.match(dailyResult, /scrollIntoView/);
  assert.match(directoryData, /KNOWN_STAFF_SHOWCASE_USERNAMES/);
  assert.match(discoveryPreviewMigration, /get_public_discovery/);
  assert.match(discoveryStatsMigration, /todayRollCount/);
});

test('homepage uses optimized reference imagery without embedding mock data', async () => {
  const imagePaths = [
    '/homepage/admin-profile-desktop.png',
    '/homepage/admin-profile-mobile.webp',
    '/homepage/bfr-profile.webp',
    '/homepage/daily-roll-full.webp',
    '/homepage/daily-roll-result.webp',
    '/homepage/daily-roll-progress.webp'
  ];
  for (const imagePath of imagePaths) {
    const imageStats = await stat(new URL(`../public${imagePath}`, import.meta.url));
    assert.ok(imageStats.size > 1000, `${imagePath} should contain an optimized reference capture`);
  }
  assert.doesNotMatch(hero, /data:image/);
  assert.match(hero, /transform: scale\(1\.14\)/);
  assert.doesNotMatch(dailyResult, /<svg/);
});

test('the application mounts the homepage, signup flow, and global footer', () => {
  assert.match(app, /import HomePage from '.\/lib\/HomePage\.svelte'/);
  assert.match(app, /currentView === 'home'/);
  assert.match(app, /staticComponent: HomePage/);
  assert.match(app, /on:signup=\{\(\) => openAuthModal\('signup'\)\}/);
  assert.match(app, /<RouteOutlet/);
  assert.doesNotMatch(app, /<ProfileAtmosphere/);
  assert.match(app, /class:app-shell--home=\{homeModeVisible\}/);
  assert.match(app, /<footer class="site-footer">/);
  assert.match(app, /Privacy Policy/);
  assert.match(app, /How to Play/);
});

test('the signed-out profile route opens the guest onboarding roll', () => {
  assert.match(routeLoaders, /guestProfile: \(\) => import\('\.\/GuestProfileOnboarding\.svelte'\)/);
  assert.match(app, /loaderKey: 'guestProfile'/);
  assert.match(app, /componentProps: \{ guestActive \}/);
  assert.match(guestProfile, /This could be your profile/);
  assert.match(guestProfile, /See today’s roll/);
  assert.match(guestProfile, /guest-onboarding/);
  assert.match(guestProfile, /IdentityCard/);
  assert.match(guestProfile, /ProfileRoll/);
  assert.match(guestProfile, /Create your profile/);
});
