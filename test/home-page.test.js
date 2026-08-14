import test from 'node:test';
import assert from 'node:assert/strict';
import { stat, readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [home, hero, demo, fixtures, community, claim, header, app, routeLoaders, main, fonts, homepageStyles, guestProfile] = await Promise.all([
  read('src/lib/HomePage.svelte'),
  read('src/lib/homepage/HomepageHero.svelte'),
  read('src/lib/homepage/HomepageProfileDemo.svelte'),
  read('src/lib/homepage/homepageFixtures.js'),
  read('src/lib/homepage/HomepageCommunity.svelte'),
  read('src/lib/homepage/HomepageClaim.svelte'),
  read('src/lib/homepage/HomepageHeader.svelte'),
  read('src/App.svelte'),
  read('src/lib/routeLoaders.js'),
  read('src/main.js'),
  read('src/styles/fonts.css'),
  read('src/lib/homepage/homepage-reference.css'),
  read('src/lib/GuestProfileOnboarding.svelte')
]);

test('the homepage is a single reference-first composition', () => {
  for (const component of ['HomepageHeader', 'HomepageHero', 'HomepageLoop', 'HomepageShowcase', 'HomepageCommunity']) {
    assert.match(home, new RegExp(component));
  }
  assert.match(home, /homepage-reference\.css/);
  assert.match(home, /homepage-background/);
  assert.match(home, /HOMEPAGE_FIXTURES/);
  assert.match(home, /on:fixturechange={handleFixtureChange}/);
  assert.match(home, /on:accentpreview={handleAccentPreview}/);
  assert.match(home, /accountState/);
  assert.match(home, /logoutInProgress/);
  assert.doesNotMatch(home, /HomeHero|HomeLeaderboard|HomepageProfileDirectory|SiteModeHeader|activecolor/);
  assert.match(home, /on:claim={forwardAction}/);
  assert.match(home, /on:login={forwardAction}/);
  assert.match(home, /on:logout={forwardAction}/);
  assert.match(home, /<footer class="homepage-footer">/);
});

test('the hero carousel uses deterministic homepage specimens without public-profile rendering', () => {
  assert.match(hero, /HOMEPAGE_FIXTURES/);
  assert.match(hero, /Previous profile example/);
  assert.match(hero, /Next profile example/);
  assert.match(hero, /<HomepageProfileDemo fixture={fixture}/);
  assert.match(hero, /type="button" aria-label="Previous profile example"/);
  assert.match(hero, /type="button" aria-label="Next profile example"/);
  assert.match(hero, /class="homepage-profile-stage"/);
  assert.match(hero, /anchorId="claim"/);
  assert.match(hero, /'Preview a roll'/);
  assert.match(hero, /Rolling…/);
  assert.match(hero, /Roll again/);
  assert.match(hero, /<ProfileMotionEffect/);
  assert.match(hero, /motionKey=\{fixture\.profileMotion \|\| ''\}/);
  assert.match(hero, /inputSurface="viewport"/);
  assert.doesNotMatch(hero, /handleViewportPointerMove|animateTilt|requestAnimationFrame/);
  assert.match(hero, /class:homepage-profile-pop--active=\{profileImpactActive\}/);
  assert.match(hero, /rollPhase = 'spin'/);
  assert.match(hero, /rollPhase = 'land'/);
  assert.match(hero, /rollPhase = 'impact'/);
  assert.match(hero, /homepage-roll-particles/);
  assert.match(hero, /dispatch\('accentpreview'/);
  assert.doesNotMatch(hero, /ProfileShell|HomepageProfileRenderer|layoutLabel|random|discovery|roll_die|supabase|\.rpc\(/);
  assert.doesNotMatch(demo, /ProfileShell|ProfileLayoutFrame|profile-shell|profileRenderModel/);
});

test('the homepage specimen owns the approved profile anatomy', () => {
  for (const selector of [
    'homepage-profile-demo--hero',
    'homepage-profile-demo__avatar-shell',
    'homepage-profile-demo__name',
    'homepage-profile-demo__bio',
    'homepage-profile-demo__links',
    'homepage-profile-demo__roll'
  ]) assert.match(demo, new RegExp(selector));
  assert.match(demo, /repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(demo, /border-radius: 22px/);
  assert.match(demo, /backdrop-filter: blur\(32px\)/);
  assert.doesNotMatch(demo, /export let impactActive = false/);
  assert.doesNotMatch(demo, /Profile preview|homepage-profile-demo__head|@\{fixture\.username\}|Views|views|↗/);
});

test('homepage fixtures are local, deterministic, scored, and outside production data feeds', async () => {
  assert.match(fixtures, /HOMEPAGE_FIXTURES|condition_ids|timelineEvents/);
  assert.doesNotMatch(fixtures, /createDefaultProfileConfig|normalizeProfileConfig|profileConfig|layoutVariant|supabase|rpc\(|get_public_discovery|KNOWN_STAFF_SHOWCASE_USERNAMES/);

  const assetPaths = [
    'meilin/background.webp', 'meilin/avatar.webp',
    'compact-background.png', 'compact-avatar.png',
    'sleek-background.png', 'sleek-avatar.png',
    'minimal-background.png', 'minimal-avatar.png',
    'portfolio-background.png', 'portfolio-avatar.png'
  ];
  for (const filename of assetPaths) {
    const image = await stat(new URL(`../public/homepage/fixtures/${filename}`, import.meta.url));
    assert.ok(image.size > 1000, `${filename} should be a real local fixture asset`);
  }
});

test('homepage community is the only live profile feed on the new homepage', () => {
  assert.match(community, /supabase\.rpc\('get_public_discovery'/);
  assert.match(community, /normalizeDiscoveryResponse/);
  assert.match(community, /getCanonicalProfilePath/);
  assert.match(community, /p_surface: 'today'/);
  assert.match(community, /slice\(0, COMMUNITY_LIMIT\)/);
  assert.doesNotMatch(community, /HOMEPAGE_FIXTURES|getHomepageFixture|loadProfileContext/);
  assert.match(home, /<HomepageCommunity \/>/);
});

test('claim behavior stays on the shared username and auth routes', () => {
  assert.match(claim, /isUsernameShapeValid/);
  assert.match(claim, /1–20 letters, numbers, or underscores/);
  assert.match(claim, /dispatch\('claim', \{ username: nextUsername \}\)/);
  assert.match(claim, /dispatch\('profile'\)/);
  assert.match(claim, /username_claim_started/);
  assert.match(claim, /username_claim_completed/);
  assert.doesNotMatch(claim, /↗|Free · One roll each day/);
  assert.match(header, /dispatch\('login'/);
  assert.match(header, /dispatch\('logout'/);
  assert.match(header, /dispatch\('retry'/);
});

test('the root route mounts the homepage without changing other route contracts', () => {
  assert.match(routeLoaders, /home:\s*\(\) => import\('\.\/HomePage\.svelte'\)/);
  assert.match(app, /loaderKey: 'home'/);
  assert.match(app, /accountState: currentAccountState/);
  assert.match(app, /username: currentUsername/);
  assert.match(app, /logoutInProgress: currentLogoutInProgress/);
  assert.doesNotMatch(app, /handleHomeActiveColor|on:activecolor/);
  assert.match(main, /@fontsource-variable\/inter/);
  assert.match(fonts, /Clash Display/);
  assert.match(homepageStyles, /--homepage-bg: #050506/);
  assert.match(homepageStyles, /--homepage-radius: 18px/);
  assert.doesNotMatch(homepageStyles, /radial-gradient\(circle at 62% 35%/);
  assert.match(homepageStyles, /rgba\(5, 5, 6, 0\.24\) 0%/);
  assert.match(hero, /grid-template-columns: minmax\(0, 1fr\) 470px minmax\(0, 1fr\)/);
  assert.match(hero, /\.homepage-hero__product \{[\s\S]*min-width: 0;/);
  assert.match(hero, /\.homepage-profile-stage \{[\s\S]*min-width: 0;/);
  assert.match(hero, /width: 440px/);
  assert.doesNotMatch(hero, /height: 470px/);
  assert.match(claim, /backdrop-filter: blur\(20px\)/);
  assert.match(claim, /\.homepage-claim__field \{[\s\S]*min-width: 0;/);
  assert.match(guestProfile, /This could be your profile/);
});
