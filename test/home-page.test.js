import test from 'node:test';
import assert from 'node:assert/strict';
import { stat, readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const readWebpDimensions = async path => {
  const image = await readFile(new URL(`../${path}`, import.meta.url));
  assert.equal(image.toString('ascii', 0, 4), 'RIFF');
  assert.equal(image.toString('ascii', 8, 12), 'WEBP');

  const chunkType = image.toString('ascii', 12, 16);
  if (chunkType === 'VP8 ') {
    return {
      width: image.readUInt16LE(26) & 0x3fff,
      height: image.readUInt16LE(28) & 0x3fff
    };
  }

  if (chunkType === 'VP8X') {
    return {
      width: 1 + image[24] + (image[25] << 8) + (image[26] << 16),
      height: 1 + image[27] + (image[28] << 8) + (image[29] << 16)
    };
  }

  throw new Error(`Unsupported WebP chunk ${chunkType} in ${path}`);
};

const [home, hero, demo, fixtures, community, dailyLeaderboard, claim, header, sharedHeader, footer, app, routeLoaders, main, fonts, homepageStyles, guestProfile] = await Promise.all([
  read('src/lib/HomePage.svelte'),
  read('src/lib/homepage/HomepageHero.svelte'),
  read('src/lib/homepage/HomepageProfileDemo.svelte'),
  read('src/lib/homepage/homepageFixtures.js'),
  read('src/lib/homepage/HomepageCommunity.svelte'),
  read('src/lib/homepage/HomepageDailyLeaderboard.svelte'),
  read('src/lib/homepage/HomepageClaim.svelte'),
  read('src/lib/homepage/HomepageHeader.svelte'),
  read('src/lib/SiteModeHeader.svelte'),
  read('src/lib/SiteFooter.svelte'),
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
  assert.match(home, /currentLeaderboardUser={dailyLeaderboardCurrentUser}/);
  assert.doesNotMatch(home, /accentpreview|handleAccentPreview/);
  assert.match(home, /accountState/);
  assert.match(home, /logoutInProgress/);
  assert.doesNotMatch(home, /HomeHero|HomeLeaderboard|HomepageProfileDirectory|SiteModeHeader|activecolor/);
  assert.match(home, /on:claim={forwardAction}/);
  assert.match(home, /on:login={forwardAction}/);
  assert.match(home, /on:logout={forwardAction}/);
  assert.match(home, /<SiteFooter \{isAuthenticated\} \/>/);
});

test('homepage navigation exposes real product destinations without placeholder links', () => {
  assert.match(header, /SiteModeHeader/);
  assert.match(header, /claimHref="#claim"/);
  assert.match(sharedHeader, /src="\/brand\/am-mark-v1\.webp"/);
  for (const label of ['Roll', 'Leaderboard', 'Customize', 'Pricing', 'Claim handle']) {
    assert.match(sharedHeader, new RegExp(`>${label}<`));
  }

  for (const destination of ['/roll', '/leaderboard', '/profile/settings', '/pricing', '/how-to-play', '/privacy', '/terms']) {
    assert.match(footer, new RegExp(`href="${destination}"`));
  }
  assert.match(footer, /support@chromadie\.com/);
  assert.match(footer, /business@chromadie\.com/);
  assert.doesNotMatch(`${header}${sharedHeader}`, /How it works|Profiles|href="#how"|href="#showcase"/);
  assert.doesNotMatch(sharedHeader, /href="#"/);
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
  assert.match(hero, /<HomepageDailyLeaderboard/);
  assert.match(hero, /dailyLeaderboardRows/);
  assert.match(hero, /homepage-roll-compact/);
  assert.match(hero, /href="\/roll"/);
  assert.match(hero, />Roll today<\/a>/);
  assert.doesNotMatch(hero, /homepage-roll-compact__header|homepage-roll-compact__prompt|Once a day|→/);
  assert.match(hero, /currentLeaderboardUser/);
  assert.doesNotMatch(hero, /PREVIEW_ROLL|previewRoll|accentpreview|localLeaderboardEntry|isPreviewRolling|hasLeaderboardEntry|focusClaim|profileImpactActive|rollPhase|homepage-roll-particles/);
  assert.match(hero, /<ProfileMotionEffect/);
  assert.match(hero, /motionKey=\{fixture\.profileMotion \|\| ''\}/);
  assert.match(hero, /inputSurface="viewport"/);
  assert.doesNotMatch(hero, /handleViewportPointerMove|animateTilt|requestAnimationFrame/);
  assert.doesNotMatch(hero, /ProfileShell|HomepageProfileRenderer|layoutLabel|random|discovery|roll_die|supabase|\.rpc\(/);
  assert.doesNotMatch(demo, /ProfileShell|ProfileLayoutFrame|profile-shell|profileRenderModel/);
  assert.match(dailyLeaderboard, /Daily highest roll/);
  assert.match(dailyLeaderboard, /avatarReference/);
  assert.match(dailyLeaderboard, /getProfileMediaUrl/);
  assert.match(dailyLeaderboard, /export let currentUser = null/);
  assert.match(dailyLeaderboard, /mergeVisibleRows\(realRows, currentUser\)/);
  assert.match(dailyLeaderboard, /rows\.slice\(0, 2\)/);
  assert.match(dailyLeaderboard, /isLocalEntry: true/);
  assert.match(dailyLeaderboard, /homepage-daily-leaderboard__row--you/);
  assert.match(dailyLeaderboard, /View full leaderboard/);
  assert.match(dailyLeaderboard, /displayRank/);
  assert.doesNotMatch(dailyLeaderboard, /__homepage_you__|Your preview roll|href=\{getRowPath\(row\)\}[^\n]*#claim/);
});

test('the homepage specimen owns the approved profile anatomy', () => {
  for (const selector of [
    'homepage-profile-demo--hero',
    'ProfileFullBleedLayout',
    'ProfileReferenceCard',
    'presentation="homepage"'
  ]) assert.match(demo, new RegExp(selector));
  assert.doesNotMatch(demo, /ProfileShell|ProfileLayoutFrame|profile-shell/);
  assert.doesNotMatch(demo, /export let impactActive = false/);
  assert.doesNotMatch(demo, /Profile preview|homepage-profile-demo__head|@\{fixture\.username\}|Views|views|↗/);
});

test('homepage fixtures are local, deterministic, scored, and outside production data feeds', async () => {
  assert.match(fixtures, /HOMEPAGE_FIXTURES|condition_ids|timelineEvents/);
  assert.doesNotMatch(fixtures, /createDefaultProfileConfig|normalizeProfileConfig|profileConfig|layoutVariant|supabase|rpc\(|get_public_discovery|KNOWN_STAFF_SHOWCASE_USERNAMES/);

  const assetPaths = [
    'meilin/background-dusk-v2.webp', 'meilin/avatar.webp',
    'compact-background.png', 'compact-avatar.png',
    'sleek-background.png', 'sleek-avatar.png',
    'minimal-background.webp', 'minimal-avatar.webp',
    'portfolio-background.webp', 'portfolio-avatar.webp'
  ];
  for (const filename of assetPaths) {
    const image = await stat(new URL(`../public/homepage/fixtures/${filename}`, import.meta.url));
    assert.ok(image.size > 1000, `${filename} should be a real local fixture asset`);
  }

  for (const filename of [
    'meilin/avatar.webp',
    'p2/p2avatar.webp',
    'minimal-avatar.webp',
    'portfolio-avatar.webp'
  ]) {
    assert.deepEqual(
      await readWebpDimensions(`public/homepage/fixtures/${filename}`),
      { width: 512, height: 512 },
      `${filename} should be sized for its rendered homepage surface`
    );
  }
});

test('homepage community is the only live profile feed on the new homepage', () => {
  assert.match(community, /supabase\.rpc\('get_public_discovery'/);
  assert.match(community, /normalizeDiscoveryResponse/);
  assert.match(community, /getCanonicalProfilePath/);
  assert.match(community, /p_surface: 'today'/);
  assert.match(community, /slice\(0, COMMUNITY_LIMIT\)/);
  assert.match(community, /CURRENT_USER_LOOKUP_LIMIT/);
  assert.match(community, /p_query: lookupUsername/);
  assert.match(community, /candidate\.username\.toLowerCase\(\) === lookupKey/);
  assert.match(community, /dispatch\('leaderboard'/);
  assert.doesNotMatch(community, /HOMEPAGE_FIXTURES|getHomepageFixture|loadProfileContext/);
  assert.match(home, /<HomepageCommunity \{isAuthenticated\} \{username\} on:leaderboard=\{handleDailyLeaderboard\} \/>/);
});

test('claim behavior stays on the shared username and auth routes', () => {
  assert.match(claim, /isUsernameShapeValid/);
  assert.match(claim, /1–20 letters, numbers, or underscores/);
  assert.match(claim, /dispatch\('claim', \{ username: nextUsername \}\)/);
  assert.match(claim, /dispatch\('profile'\)/);
  assert.match(claim, /username_claim_started/);
  assert.match(claim, /username_claim_completed/);
  assert.doesNotMatch(claim, /↗|Free · One roll each day/);
  assert.match(header, /on:login=\{forward\}/);
  assert.match(header, /on:logout=\{forward\}/);
  assert.match(header, /on:retry=\{forward\}/);
});

test('the root route mounts the homepage without changing other route contracts', () => {
  assert.match(routeLoaders, /home:\s*\(\) => import\('\.\/HomePage\.svelte'\)/);
  assert.match(app, /loaderKey: 'home'/);
  assert.match(app, /accountState: currentAccountState/);
  assert.match(app, /username: currentUsername/);
  assert.match(app, /logoutInProgress: currentLogoutInProgress/);
  assert.doesNotMatch(app, /handleHomeActiveColor|on:activecolor/);
  assert.match(fonts, /font-family: 'Inter'/);
  assert.match(fonts, /inter-latin-wght-normal/);
  assert.match(main, /@fontsource-variable\/manrope/);
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
  assert.match(claim, /backdrop-filter: blur\(18px\) saturate\(118%\)/);
  assert.match(claim, /\.homepage-claim__field \{[\s\S]*min-width: 0;/);
  assert.match(guestProfile, /This could be your profile/);
});
