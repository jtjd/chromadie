import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseRouteLocation, viewToCanonicalPath } from '../src/lib/routes.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [home, motion, rollPage, rollPageContext, game, preRoll, bestRoll, header, sharedHeader, footer, app, routeTarget, routeMetadata, rootFunction, index, resultActions, topRollDiscovery] = await Promise.all([
  read('src/lib/HomePage.svelte'),
  read('src/lib/homepage/homepage-motion.css'),
  read('src/lib/RollPage.svelte'),
  read('src/lib/rollPageContext.js'),
  read('src/lib/Game.svelte'),
  read('src/lib/RollPreRoll.svelte'),
  read('src/lib/homepage/HomepageBestRoll.svelte'),
  read('src/lib/homepage/HomepageHeader.svelte'),
  read('src/lib/SiteModeHeader.svelte'),
  read('src/lib/SiteFooter.svelte'),
  read('src/App.svelte'),
  read('src/lib/routeTarget.js'),
  read('src/lib/routeMetadata.js'),
  read('functions/index.js'),
  read('index.html'),
  read('src/lib/RollResultActions.svelte'),
  read('src/lib/homepage/topRollDiscovery.js')
]);

test('homepage motion is progressive, one-shot, and reduced-motion safe', () => {
  assert.match(home, /import '\.\/homepage\/homepage-motion\.css'/);
  assert.doesNotMatch(home, /data-homepage-reveal|IntersectionObserver|MutationObserver/);
  assert.match(home, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(home, /homepage-motion-ready/);
  assert.match(motion, /homepage-hero-camera 28s/);
  assert.doesNotMatch(motion, /homepage-lower-camera|homepage-swatch-bloom|homepage-atmosphere-light/);
  assert.doesNotMatch(motion, /data-homepage-reveal|homepage-footer-reveal/);
  assert.match(motion, /prefers-reduced-motion: reduce[\s\S]*animation: none !important/);
});

test('the homepage keeps the roll hero, top roller, shared header, and legal footer', () => {
  for (const component of ['HomepageHeader', 'RollPage', 'SiteFooter']) {
    assert.match(home, new RegExp(component));
  }
  assert.match(home, /surface="homepage"/);
  assert.match(home, /signupNext="\/"/);
  assert.match(home, /showAcquisitionActions=\{true\}/);
  assert.match(home, /homepage-reference--roll-first/);
  assert.match(home, /homepageDiscovery/);
  assert.match(home, /<SiteFooter \{isAuthenticated\} variant="home-compact" \/>/);
  assert.match(rollPage, /<HomepageBestRoll/);
  assert.doesNotMatch(home, /HomepageProfileExample|HomepageCollection|HomepageCommunity|HomepagePricingLoader|HomepageStart|HomepageQuestions/);
  assert.doesNotMatch(home, /HomepageHero|HomepageProfileDemo|HomepageShowcase|HomepageClaim|HOMEPAGE_FIXTURES|LazyAtmosphereLayer|homepage-background/);
});

test('the first viewport states the game plainly and has one authoritative roll action', () => {
  assert.match(rollPage, /A NEW COLOR, EVERY DAY/);
  assert.match(rollPage, /#\?\?\?\?\?\?/);
  assert.match(rollPage, /const unknownSlots = Array\.from\(\{ length: 6/);
  assert.match(rollPage, /roll-page__unknown-mark/);
  assert.match(rollPage, /animation: roll-page-unknown-mark 8\.4s ease-in-out infinite/);
  assert.match(rollPage, /prefers-reduced-motion: reduce[\s\S]*roll-page__unknown-mark \{ animation: none; \}/);
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
  assert.match(bestRoll, /No public roll today\./);
  assert.match(topRollDiscovery, /Public profiles could not be loaded right now/);
  assert.match(bestRoll, /on:click=\{\(\) => dispatch\('retry'\)\}/);
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
  assert.match(bestRoll, /homepage-best-roll__score/);
  assert.match(bestRoll, /<strong>\{score\.toLocaleString\(\)\}<\/strong>[\s\S]*<span>pts<\/span>/);
  assert.match(bestRoll, /showScore=\{false\}/);
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
  assert.match(rollPage, /homepage-preroll[\s\S]*roll-action__button\)[\s\S]*appearance: none;[\s\S]*background: #fff !important;/);
  assert.match(rollPage, /roll-action__button::after\)[\s\S]*display: none !important;/);
  assert.match(game, /<RollPreRoll/);
  assert.match(game, /on:roll=\{\(\) => initiateRoll\(false\)\}/);
  assert.match(game, /phase = 'rolling';[\s\S]{0,800}dispatchRollState\(\);/);
  assert.match(game, /requestRoll\(supabase, isReroll\)/);
  assert.doesNotMatch(rollPage, /roll-page__profile-link/);
  assert.doesNotMatch(home, /href="\/roll"/);
});

test('account actions are contextual before and after the guest roll', () => {
  assert.doesNotMatch(header, /showClaim/);
  assert.match(sharedHeader, /!isAuthenticated/);
  assert.match(sharedHeader, />Login</);
  assert.match(sharedHeader, />Create profile</);
  assert.match(preRoll, /Sign up/);
  assert.match(preRoll, /to start your profile history\./);
  assert.match(game, /on:signup=\{\(\) => beginGuestSignup\(signupNext\)\}/);
  assert.match(game, /beginGuestSignup\(signupNext\)/);
  assert.match(game, /Create an account/);
  assert.match(game, /Save future rolls and earn EP\./);
  assert.match(game, /<RollResultActions/);
  assert.match(resultActions, /View your profile/);
  assert.match(resultActions, /Share result/);
});

test('the top roller retains the spotlight feed, profile browse link, and retry path', () => {
  assert.match(home, /loadHomepageTopRolls/);
  assert.match(home, /on:resultready=\{refreshTopRoll\}/);
  assert.match(home, /on:discoveryretry=\{refreshTopRoll\}/);
  assert.match(topRollDiscovery, /get_public_discovery_spotlight/);
  assert.match(topRollDiscovery, /p_limit: DAILY_TOP_ROLL_LIMIT/);
  assert.match(topRollDiscovery, /getCanonicalProfilePath\(item\.username\)/);
  assert.match(bestRoll, /href=\{profileHref\}/);
  assert.match(bestRoll, /View \$\{displayName\}'s profile/);
  assert.match(bestRoll, /Today’s top roll/);
  assert.match(footer, /href="\/privacy"/);
  assert.match(footer, /site-footer--home-compact/);
  assert.doesNotMatch(footer, /href="#profiles|href="#how|href="#community"/);
  const compactFooterStart = footer.indexOf("{#if variant === 'home' || variant === 'home-compact'}");
  const compactFooter = footer.slice(compactFooterStart, footer.indexOf('{:else}', compactFooterStart));
  for (const route of ['/leaderboard', '/pricing', '/how-to-play', '/privacy', '/terms']) {
    assert.ok(compactFooter.includes(`href="${route}"`));
  }
});

test('the homepage removes the lower marketing stack without losing the top roller', () => {
  for (const removedSection of ['HomepageProfileExample', 'HomepageCollection', 'HomepageCommunity', 'HomepagePricingLoader', 'HomepageStart', 'HomepageQuestions']) {
    assert.doesNotMatch(home, new RegExp(removedSection));
  }
  assert.match(home, /<RollPage[\s\S]*bestRollRows=\{homepageDiscovery\.rows\}[\s\S]*bestRollLoading=\{homepageDiscovery\.loading\}/);
  assert.match(home, /<SiteFooter \{isAuthenticated\} variant="home-compact" \/>/);
});

test('the homepage hero has a restrained color atmosphere that fades into the page', async () => {
  const refinement = await read('src/lib/homepage/homepage-refinement.css');
  assert.match(refinement, /roll-page\.roll-page--homepage::after/);
  assert.match(refinement, /homepage-hero-atmosphere-anime-v1\.png/);
  assert.match(refinement, /homepage-hero-atmosphere-anime-mobile-v1\.png/);
  assert.match(refinement, /linear-gradient\(to bottom, transparent 0%/);
  assert.match(refinement, /prefers-reduced-motion: reduce[\s\S]*roll-page\.roll-page--homepage::after \{ animation: none; \}/);
});

test('root and compatibility metadata identify one canonical playable entry', () => {
  const title = 'ChromaDie — Daily Random Color Game';
  const description = 'Roll one of 16,777,216 colors once a day.';
  assert.match(routeMetadata, new RegExp(title.replace(/[—]/g, '—')));
  assert.match(routeMetadata, new RegExp(description.replace(/[,.]/g, value => `\\${value}`)));
  assert.match(rootFunction, /canonicalPath: '\/'/);
  assert.match(rootFunction, /Daily Random Color Game/);
  assert.equal(parseRouteLocation('/').view, 'home');
  assert.equal(parseRouteLocation('/roll').routeMode, 'not-found');
  assert.equal(parseRouteLocation('/', '?view=game').view, 'home');
  assert.equal(parseRouteLocation('/c/challenge-1').view, 'game');
  assert.equal(viewToCanonicalPath('game'), null);
  assert.match(index, /<title>ChromaDie — Daily Random Color Game<\/title>/);
  assert.match(index, /og:image:alt/);
  assert.match(index, /"@type": "VideoGame"/);
  assert.doesNotMatch(index, /aggregateRating|"review"/);
});

test('the homepage is the only unchallenged daily-roll route', () => {
  assert.match(app, /resolveRouteTarget/);
  assert.match(routeTarget, /loaderKey: 'home'/);
  assert.match(routeTarget, /loaderKey: 'game'/);
  assert.match(routeTarget, /if \(!challenge\)/);
  assert.match(routeTarget, /componentKey: `game:\$\{challenge\.id\}`/);
  assert.doesNotMatch(home, /href="\/roll"/);
  assert.match(routeMetadata, /view === 'game'[\s\S]*noindex,follow/);
});
