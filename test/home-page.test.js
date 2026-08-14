import test from 'node:test';
import assert from 'node:assert/strict';
import { stat, readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [home, hero, renderer, fixtures, community, claim, header, app, routeLoaders, main, fonts, homepageStyles, guestProfile] = await Promise.all([
  read('src/lib/HomePage.svelte'),
  read('src/lib/homepage/HomepageHero.svelte'),
  read('src/lib/homepage/HomepageProfileRenderer.svelte'),
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
  assert.match(home, /accountState/);
  assert.match(home, /logoutInProgress/);
  assert.doesNotMatch(home, /HomeHero|HomeLeaderboard|HomepageProfileDirectory|SiteModeHeader|activecolor/);
  assert.match(home, /on:claim={forwardAction}/);
  assert.match(home, /on:login={forwardAction}/);
  assert.match(home, /on:logout={forwardAction}/);
  assert.match(home, /<footer class="homepage-footer">/);
});

test('the hero carousel renders deterministic fixture models through ProfileShell', () => {
  assert.match(hero, /HOMEPAGE_FIXTURES/);
  assert.match(hero, /Previous profile example/);
  assert.match(hero, /Next profile example/);
  assert.match(hero, /<HomepageProfileRenderer fixture={fixture}/);
  assert.match(hero, /class="homepage-profile-stage"/);
  assert.match(hero, /id="claim"/);
  assert.doesNotMatch(hero, /Preview a roll|Roll now|fake|random|discovery/);
  assert.match(renderer, /<ProfileShell/);
  assert.match(renderer, /previewMode={true}/);
  for (const prop of ['previewProfile', 'previewProfileConfig', 'previewScores', 'previewTimelineEvents', 'previewCollectionItems', 'previewAllAchievements', 'visualFixture', 'renderContext', 'previewDevice']) {
    assert.match(renderer, new RegExp(prop));
  }
  assert.doesNotMatch(renderer, /renderSnapshot/);
});

test('homepage fixtures are local, deterministic, and outside production data feeds', async () => {
  assert.match(fixtures, /createDefaultProfileConfig/);
  assert.match(fixtures, /normalizeProfileConfig/);
  assert.match(fixtures, /homepage-fixture-/);
  assert.doesNotMatch(fixtures, /supabase|rpc\(|get_public_discovery|KNOWN_STAFF_SHOWCASE_USERNAMES/);

  const assetPaths = [
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
  assert.match(claim, /accountUnavailable/);
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
  assert.match(hero, /grid-template-columns: minmax\(0, 1fr\) 470px minmax\(0, 1fr\)/);
  assert.match(hero, /width: 440px; height: 470px/);
  assert.match(claim, /backdrop-filter: blur\(20px\)/);
  assert.match(guestProfile, /This could be your profile/);
});
