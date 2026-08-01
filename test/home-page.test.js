import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const { HOMEPAGE_SHOWCASE_PROFILES } = await import('../src/lib/homepageShowcase.js');
const home = await read('src/lib/HomePage.svelte');
const directory = await read('src/lib/HomepageProfileDirectory.svelte');
const screenshotShowcase = await read('src/lib/HomepageScreenshotShowcase.svelte');
const screenshotConfig = await read('src/lib/homepageShowcase.js');
const ticker = await read('src/lib/HomepageLiveTicker.svelte');
const directoryData = await read('src/lib/homepageDirectory.js');
const discoveryPreviewMigration = await read('supabase/migrations/20260801090000_discovery_profile_preview.sql');
const discoveryStatsMigration = await read('supabase/migrations/20260801130000_discovery_roll_count.sql');
const audioControls = await read('src/lib/ProfileAudioControls.svelte');
const profileMusic = await read('src/lib/ProfileMusic.svelte');
const app = await read('src/App.svelte');
const routeLoaders = await read('src/lib/routeLoaders.js');
const main = await read('src/main.js');
const guestProfile = await read('src/lib/GuestProfileOnboarding.svelte');

test('the homepage explains the daily identity loop with a direct claim action', () => {
  assert.match(home, /Public profiles\.<br \/>One color roll a day/);
  assert.match(home, /Add your background, music, links, projects, or whatever else you want/);
  assert.match(home, /daily color changes where the profile appears/);
  assert.match(home, /Claim your username/);
  assert.match(home, /dispatch\('claim'/);
  assert.match(home, /chm\.lol\//);
  assert.match(home, /View your profile/);
  assert.match(home, /Claim your profile/);
  assert.match(home, /focusClaim/);
  assert.match(home, /Roll once a day\. <span>Your score changes your position/);
  assert.match(home, /server-authoritative/);
  assert.match(home, /width: min\(100%, 30rem\)/);
  assert.match(home, /\.home-page__claim-field input \{\s*flex: 1;/s);
  assert.match(home, /HomepageProfileDirectory/);
  assert.doesNotMatch(home, /HomeExampleProfiles|HomeRollShowcase|Mara|Mira|Nocturne|Solstice/);
  assert.match(home, /prefers-reduced-motion/);
  assert.match(main, /@fontsource-variable\/instrument-sans/);
  assert.match(main, /@fontsource-variable\/spline-sans/);
  assert.match(main, /@fontsource\/ibm-plex-mono/);
  assert.match(directory, /get_public_discovery/);
  assert.match(directory, /loadProfileContext/);
  assert.match(directory, /HomepageLiveTicker/);
  assert.match(directory, /HomepageScreenshotShowcase/);
  assert.doesNotMatch(directory, /HomepageProfilePreview|HomepageRollSummary|todayRollCount|formatHomepageResetCountdown/);
  assert.match(directory, /Explore all profiles/);
  assert.match(directory, /View today’s leaderboard/);
  assert.match(screenshotShowcase, /<img/);
  assert.match(screenshotShowcase, /fetchpriority/);
  assert.match(screenshotShowcase, /loading="lazy"/);
  assert.doesNotMatch(screenshotShowcase, /Capture placeholder|Approved public-profile capture pending/);
  assert.match(screenshotConfig, /username:/);
  assert.match(screenshotConfig, /screenshotPath:/);
  assert.match(screenshotConfig, /profileUrl:/);
  assert.match(screenshotConfig, /altText:/);
  assert.match(screenshotConfig, /collagePosition:/);
  assert.match(ticker, /Waiting for today’s public rolls/);
  assert.match(ticker, /prefers-reduced-motion/);
  assert.match(ticker, /focus-within/);
  assert.match(directoryData, /KNOWN_STAFF_SHOWCASE_USERNAMES/);
  assert.match(discoveryPreviewMigration, /get_public_discovery/);
  assert.match(discoveryStatsMigration, /todayRollCount/);
  assert.doesNotMatch(directory, /ProfileAtmosphere|ProfileMusic|IdentityCard|CompactRollPreview/);
});

test('homepage screenshot manifest contains four real linked captures', async () => {
  assert.equal(HOMEPAGE_SHOWCASE_PROFILES.length, 4);
  assert.deepEqual(
    HOMEPAGE_SHOWCASE_PROFILES.map(profile => profile.collagePosition),
    ['central', 'left', 'right', 'lower']
  );

  for (const profile of HOMEPAGE_SHOWCASE_PROFILES) {
    assert.match(profile.profileUrl, /^\/u\/[A-Za-z0-9_]+$/);
    assert.match(profile.screenshotPath, /^\/showcase-profiles\/.+\.webp$/);
    assert.ok(profile.altText.length > 30);
    const imagePath = new URL(`../public${profile.screenshotPath}`, import.meta.url);
    const imageStats = await stat(imagePath);
    assert.ok(imageStats.size > 1000, `${profile.screenshotPath} should contain a real capture`);
  }
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
