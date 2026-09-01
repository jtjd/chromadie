import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [home, rollPage, rollPageContext, game, preRoll, bestRoll, loop, scoring, community, board, header, sharedHeader, footer, app, routeMetadata, rootFunction, rollFunction, index] = await Promise.all([
  read('src/lib/HomePage.svelte'),
  read('src/lib/RollPage.svelte'),
  read('src/lib/rollPageContext.js'),
  read('src/lib/Game.svelte'),
  read('src/lib/RollPreRoll.svelte'),
  read('src/lib/homepage/HomepageBestRoll.svelte'),
  read('src/lib/homepage/HomepageLoop.svelte'),
  read('src/lib/homepage/HomepageScoring.svelte'),
  read('src/lib/homepage/HomepageCommunity.svelte'),
  read('src/lib/homepage/HomepageDailyLeaderboard.svelte'),
  read('src/lib/homepage/HomepageHeader.svelte'),
  read('src/lib/SiteModeHeader.svelte'),
  read('src/lib/SiteFooter.svelte'),
  read('src/App.svelte'),
  read('src/lib/routeMetadata.js'),
  read('functions/index.js'),
  read('functions/roll.js'),
  read('index.html')
]);

test('the homepage is the real daily roll followed by explanation and one public board', () => {
  for (const component of ['HomepageHeader', 'RollPage', 'HomepageLoop', 'HomepageScoring', 'HomepageCommunity', 'SiteFooter']) {
    assert.match(home, new RegExp(component));
  }
  assert.match(home, /surface="homepage"/);
  assert.match(home, /signupNext="\/"/);
  assert.match(home, /showAcquisitionActions=\{true\}/);
  assert.match(home, /homepage-reference--roll-first/);
  assert.match(home, /homepageDiscovery/);
  assert.doesNotMatch(home, /HomepageHero|HomepageProfileDemo|HomepageShowcase|HomepageBestRoll|HomepageClaim|HOMEPAGE_FIXTURES|LazyAtmosphereLayer|homepage-background/);
  assert.equal((home.match(/<HomepageCommunity\b/g) || []).length, 1);
});

test('the first viewport states the game plainly and has one authoritative roll action', () => {
  assert.match(rollPage, /A NEW COLOR, EVERY DAY/);
  assert.match(rollPage, /#\?\?\?\?\?\?/);
  assert.doesNotMatch(rollPage, /One color per day\. One roll\. What will yours be\?/);
  assert.doesNotMatch(rollPage, /Open progression/);
  assert.match(rollPage, /HomepageBestRoll/);
  assert.match(rollPage, /bestRollRows/);
  assert.match(rollPage, /grid-template-columns: minmax\(280px, 360px\) minmax\(360px, 420px\)/);
  assert.match(rollPage, /homepage-preroll \.roll-page__context \{[\s\S]*grid-column: 1/);
  assert.match(rollPage, /homepage-preroll :global\(\.homepage-best-roll\) \{[\s\S]*grid-column: 2/);
  assert.match(rollPageContext, /homepageRolling: homepage && !hasResult && source\.phase !== 'preroll'/);
  assert.match(rollPage, /homepage-rolling :global\(\.game-container--dedicated\) \{[\s\S]*grid-column: 2/);
  assert.match(rollPage, /homepage-rolling \.roll-page__context \{[\s\S]*align-self: center;/);
  assert.match(rollPage, /homepagePreroll && !homepageRolling/);
  assert.match(rollPage, /grid-template-rows: auto auto auto/);
  assert.match(bestRoll, /getBestRoll/);
  assert.match(bestRoll, /Today’s top roll/);
  assert.match(bestRoll, /getProfileMediaUrl/);
  assert.match(bestRoll, /RollResultBreakdown/);
  assert.match(bestRoll, /homepage-best-roll__heading/);
  assert.match(bestRoll, /homepage-best-roll__title/);
  assert.match(bestRoll, /class:homepage-best-roll--active=\{Boolean\(bestRoll\)\}/);
  assert.match(bestRoll, /homepage-best-roll--active::before/);
  assert.match(bestRoll, /animation: homepage-best-roll-glow 4\.8s ease-in-out infinite/);
  assert.match(bestRoll, /@keyframes homepage-best-roll-glow/);
  assert.match(bestRoll, /prefers-reduced-motion: reduce[\s\S]*homepage-best-roll--active::before \{ animation: none;/);
  assert.match(bestRoll, /homepage-best-roll__identity-name/);
  assert.match(bestRoll, /homepage-best-roll__identity-label">Rolled by/);
  assert.match(bestRoll, /`#\$\{bestRoll\.rank\} TODAY` : 'TOP TODAY'/);
  assert.match(bestRoll, /homepage-best-roll__identity-name \{[\s\S]*overflow-wrap: anywhere;[\s\S]*white-space: normal;/);
  assert.match(bestRoll, /homepage-best-roll__color-meta/);
  assert.match(bestRoll, /homepage-best-roll__rarity/);
  assert.match(bestRoll, /homepage-best-roll__result-summary/);
  assert.match(bestRoll, /--roll-score-color: var\(--color-earned, #f5c26f\)/);
  assert.match(bestRoll, /resets in/);
  assert.match(bestRoll, /homepage-best-roll__footer[\s\S]*justify-content: center/);
  assert.match(bestRoll, /homepage-best-roll__footer[\s\S]*border-top: 1px solid/);
  assert.match(bestRoll, /style={`background: \$\{rollColor\};`}/);
  assert.doesNotMatch(bestRoll, /backdrop-filter|linear-gradient/);
  assert.doesNotMatch(bestRoll, /FROM THE COMMUNITY|#1 TODAY|One color\. Every day\.|Explore .*profile|<small>score<\/small>/);
  assert.match(rollPage, /One of 16,777,216 colors/);
  assert.match(rollPage, /<Game[\s\S]*dedicated=\{true\}/);
  assert.match(preRoll, /Roll today’s color/);
  assert.match(game, /<RollPreRoll/);
  assert.match(game, /on:roll=\{\(\) => initiateRoll\(false\)\}/);
  assert.match(game, /phase = 'rolling';[\s\S]{0,800}dispatchRollState\(\);/);
  assert.match(game, /requestRoll\(supabase, isReroll\)/);
  assert.doesNotMatch(home + rollPage, /[‹›↗→↓]/);
  assert.doesNotMatch(home, /href="\/roll"/);
});

test('account actions are contextual before and after the guest roll', () => {
  assert.match(header, /showClaim=\{false\}/);
  assert.match(sharedHeader, /export let showClaim = true/);
  assert.match(sharedHeader, /!isAuthenticated && showClaim/);
  assert.match(preRoll, /Sign up/);
  assert.match(preRoll, /to save your roll\./);
  assert.match(game, /on:signup=\{\(\) => beginGuestSignup\(signupNext\)\}/);
  assert.match(game, /beginGuestSignup\(signupNext\)/);
  assert.match(game, /Create an account/);
  assert.match(game, /Save future rolls and earn EP\./);
  assert.match(game, /View it on your profile/);
  assert.match(game, /Share result/);
});

test('the lower homepage explains play and scoring before authentic profile discovery', () => {
  for (const step of ['Roll', 'Decode', 'Compare']) assert.match(loop, new RegExp(`<h3>${step}</h3>`));
  assert.match(scoring, /Why some colors score/);
  assert.match(scoring, /Repeated digits/);
  assert.match(scoring, /Symmetry and sequences/);
  assert.match(scoring, /Recognizable values/);
  assert.match(scoring, /href="\/how-to-play"/);
  assert.match(community, /Today’s five strongest public results/);
  assert.match(community, /supabase\.rpc\('get_public_discovery',/);
  assert.match(community, /supabase\.rpc\('get_public_discovery_spotlight'/);
  assert.match(community, /const DAILY_LEADERBOARD_LIMIT = 5/);
  assert.match(board, /View full leaderboard/);
  assert.match(board, /LeaderboardEntry/);
  assert.match(footer, /href="\/privacy"/);
});

test('root and compatibility metadata identify one canonical playable entry', () => {
  const title = 'ChromaDie — Daily Random Color Game';
  const description = 'Roll one of 16,777,216 colors once a day.';
  assert.match(routeMetadata, new RegExp(title.replace(/[—]/g, '—')));
  assert.match(routeMetadata, new RegExp(description.replace(/[,.]/g, value => `\\${value}`)));
  assert.match(rootFunction, /canonicalPath: '\/'/);
  assert.match(rootFunction, /Daily Random Color Game/);
  assert.match(rollFunction, /canonicalPath: '\/'/);
  assert.match(rollFunction, /robots: 'noindex,follow'/);
  assert.match(index, /<title>ChromaDie — Daily Random Color Game<\/title>/);
  assert.match(index, /og:image:alt/);
  assert.match(index, /"@type": "VideoGame"/);
  assert.doesNotMatch(index, /aggregateRating|"review"/);
});

test('the root route remains stable while the compatibility Roll route stays available', () => {
  assert.match(app, /loaderKey: 'home'/);
  assert.match(routeMetadata, /routeMode === 'app' && view === 'game' && !challengeData[\s\S]*\? '\/'/);
  assert.match(routeMetadata, /view === 'game'[\s\S]*noindex,follow/);
});
