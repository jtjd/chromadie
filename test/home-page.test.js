import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [home, motion, rollPage, rollPageContext, game, preRoll, bestRoll, loop, scoring, community, board, header, sharedHeader, footer, app, routeMetadata, rootFunction, rollFunction, index] = await Promise.all([
  read('src/lib/HomePage.svelte'),
  read('src/lib/homepage/homepage-motion.css'),
  read('src/lib/RollPage.svelte'),
  read('src/lib/rollPageContext.js'),
  read('src/lib/Game.svelte'),
  read('src/lib/RollPreRoll.svelte'),
  read('src/lib/homepage/HomepageBestRoll.svelte'),
  read('src/lib/homepage/HomepageCollection.svelte'),
  read('src/lib/homepage/HomepageQuestions.svelte'),
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

test('homepage motion is progressive, one-shot, and reduced-motion safe', () => {
  assert.match(home, /import '\.\/homepage\/homepage-motion\.css'/);
  assert.match(home, /querySelectorAll\('\[data-homepage-reveal\]'\)/);
  assert.match(home, /new IntersectionObserver/);
  assert.match(home, /observer\.unobserve\(entry\.target\)/);
  assert.match(home, /new MutationObserver/);
  assert.match(home, /if \(!canObserve\) return/);
  assert.match(home, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(home, /homepage-motion-ready/);
  assert.match(motion, /homepage-hero-camera 28s/);
  assert.match(motion, /homepage-lower-camera 36s/);
  assert.match(motion, /homepage-swatch-bloom 900ms/);
  assert.match(motion, /prefers-reduced-motion: reduce[\s\S]*animation: none !important/);
});

test('the homepage leads from the real roll to profiles, collection, discovery, and signup', () => {
  for (const component of ['HomepageHeader', 'RollPage', 'HomepageProfileExample', 'HomepageCollection', 'HomepagePricingLoader', 'HomepageCommunity', 'HomepageStart', 'HomepageQuestions', 'SiteFooter']) {
    assert.match(home, new RegExp(component));
  }
  assert.match(home, /surface="homepage"/);
  assert.match(home, /signupNext="\/"/);
  assert.match(home, /showAcquisitionActions=\{true\}/);
  assert.match(home, /homepage-reference--roll-first/);
  assert.match(home, /homepageDiscovery/);
  assert.match(home, /<SiteFooter \{isAuthenticated\} variant="home" \/>/);
  assert.doesNotMatch(home, /HomepageHero|HomepageProfileDemo|HomepageShowcase|HomepageBestRoll|HomepageClaim|HOMEPAGE_FIXTURES|LazyAtmosphereLayer|homepage-background/);
  assert.equal((home.match(/<HomepageCommunity\b/g) || []).length, 1);
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
  assert.match(game, /View your profile/);
  assert.match(game, /Share result/);
});

test('the lower homepage uses canonical examples and direct copy with authentic discovery', () => {
  assert.match(loop, /getBadgeMeta/);
  assert.match(loop, /aria-label="Example high-rarity conditions found in rolls"/);
  assert.match(loop, /aria-label="Example profile cosmetic"/);
  assert.match(scoring, /What makes a color score higher/);
  assert.match(scoring, /href="\/how-to-play"/);
  assert.match(community, /Players from today’s top rolls/);
  assert.match(community, /HomepagePlayerCard/);
  assert.doesNotMatch(home + loop + scoring + community, /your story|journey|daily ritual/i);
  assert.match(community, /supabase\.rpc\('get_public_discovery',/);
  assert.match(community, /supabase\.rpc\('get_public_discovery_spotlight'/);
  assert.match(community, /const DAILY_LEADERBOARD_LIMIT = 5/);
  assert.match(board, /View full leaderboard/);
  assert.match(board, /LeaderboardEntry/);
  assert.match(footer, /href="\/privacy"/);
  assert.match(footer, /site-footer--home/);
  assert.match(footer, /site-footer__home-grid/);
});

test('the profile preview features Tjz, with account actions kept in the closing section', async () => {
  const preview = await read('src/lib/homepage/HomepageProfileExample.svelte');
  const customPreview = await read('src/lib/homepage/HomepageCurrentTjzProfile.svelte');
  const start = await read('src/lib/homepage/HomepageStart.svelte');
  const player = await read('src/lib/homepage/HomepagePlayerCard.svelte');
  assert.doesNotMatch(player, />Open profile|homepage-player__open/);
  assert.match(player, /aria-label=\{`Open \$\{name\}’s profile`\}/);
  assert.match(preview, /<figure aria-label="Profile customization preview">/);
  assert.match(preview, /Examples of what<br \/>you can build\./);
  assert.match(preview, /Choose a layout\. Add your colors, links, fonts, effects, and background\./);
  assert.doesNotMatch(preview, /LIVE PROFILE PREVIEW|Your colors\.|Your own page\./);
  assert.match(preview, /let scenes = \[\];\s*\$:\s*scenes = \[/);
  assert.doesNotMatch(preview, /profile-example__browser-nav|profile-example__browser-lock|profile-example__browser-bar/);
  assert.doesNotMatch(preview, /profile-example__browser-status|● LIVE/);
  assert.match(preview, /import\('\.\/tjzCurrentProfileSnapshot\.json'\)/);
  assert.match(preview, /import\('\.\/tjzLiveProfileSnapshot\.json'\)/);
  assert.match(preview, /import\('\.\/HomepageCurrentTjzProfile\.svelte'\)/);
  assert.match(preview, /displayName: 'Mira'/);
  assert.match(preview, /bio: 'collecting soft colors and quiet moments\.'/);
  assert.match(preview, /label: 'Sleek'/);
  assert.match(customPreview, /displayName: 'Aster'/);
  assert.match(customPreview, /bio: 'making room for brighter days\.'/);
  assert.match(customPreview, /location: 'Lisbon, PT'/);
  assert.match(customPreview, /ProfileFullBleedLayout/);
  assert.match(customPreview, /layoutVariant: snapshot\.props\.layoutVariant/);
  assert.match(customPreview, /fontKey: 'name_font_marker_tag'/);
  assert.match(customPreview, /snapshot\.props\.profileMotionKey/);
  assert.match(customPreview, /ProfileEnvironmentLayer/);
  assert.match(customPreview, /surfaceStyle=\{snapshot\.styles\.surface\}/);
  assert.doesNotMatch(preview, /label: 'Snowy theme'|chm\.lol\/katt|Reykjavík, IS/);
  assert.match(preview, /\.\.\.snapshot\.props/);
  assert.match(preview, /layoutVariant: 'full-bleed'/);
  const tjz = JSON.parse(await read('src/lib/homepage/tjzProfileSnapshot.json'));
  assert.equal(tjz.props.displayName, 'Tjz');
  assert.equal(tjz.props.layoutVariant, 'framed');
  assert.equal(tjz.props.nameLoadout.motionKey, 'name_motion_haunt_fuzzy');
  assert.equal(tjz.environment.atmosphereKey, 'profile_atmosphere_snowfall');
  const currentTjz = JSON.parse(await read('src/lib/homepage/tjzCurrentProfileSnapshot.json'));
  assert.equal(currentTjz.props.avatarEffectKey, 'avatar_effect_cloud_bunny');
  assert.equal(currentTjz.props.nameLoadout.fontKey, 'name_font_baloo_2');
  assert.equal(currentTjz.props.profileMotionKey, 'profile_motion_perspective_tilt');
  assert.equal(currentTjz.environment.atmosphereKey, 'profile_atmosphere_rain_window');
  assert.equal(currentTjz.props.joinedLabel, 'Jul 2026');
  assert.equal(currentTjz.props.links.length, 4);
  const liveTjz = JSON.parse(await read('src/lib/homepage/tjzLiveProfileSnapshot.json'));
  assert.equal(liveTjz.props.avatarEffectKey, 'avatar_effect_crimson_ronin');
  assert.equal(liveTjz.props.profileBorderKey, 'border_crystal');
  assert.equal(liveTjz.props.layoutVariant, 'sleek');
  assert.equal(liveTjz.environment.atmosphereKey, 'profile_atmosphere_dust_light');
  assert.match(liveTjz.environment.backgroundImageUrl, /9f8f3ccb-abfa-43d0-9c63-593072faa9e9/);
  assert.match(liveTjz.props.avatarSrc, /e6644e45-b138-4d5a-a514-a151ebe8cd8d/);
  assert.equal(liveTjz.props.location, 'Ottawa');
  assert.equal(liveTjz.props.timezone, 'Canada');
  assert.equal(liveTjz.props.links.length, 4);
  assert.match(preview, /profile-example__controls/);
  assert.match(preview, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(preview, /<figcaption/);
  assert.doesNotMatch(preview, /profileHref|profile-example__link|Open Tjz|Explore Tjz/);
  const sections = ['<RollPage', '<HomepageProfileExample', '<HomepageCollection', '<HomepagePricingLoader', '<HomepageCommunity', '<HomepageStart', '<HomepageQuestions', '<SiteFooter'];
  const positions = sections.map(section => home.indexOf(section));
  assert.ok(positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1])));
  assert.match(start, /accountState === ACCOUNT_STATES\.SIGNED_OUT && !isAuthenticated/);
  assert.match(start, /ACCOUNT_STATES\.PROFILE_ERROR/);
  assert.match(start, /signupHref = `\/signup\?next=%2Fprofile%2Fsettings/);
  assert.match(start, /encodeURIComponent\(normalizedUsername\)/);
  assert.match(start, /pattern=\{'\[A-Za-z0-9_\]\{1,20\}'\}/);
  assert.match(start, /window.location.href = signupHref/);
  assert.match(home, /\{#if !isAuthenticated\}\s*<HomepageStart/);
  assert.doesNotMatch(start, /Make it yours|homepage-start__owned|Customize your profile/);
  assert.doesNotMatch(preview + start + loop + scoring + community, /your story|journey|daily ritual/i);
  assert.doesNotMatch(preview + start + loop + scoring + community + rollPage, /[↗→↓]/);
  assert.doesNotMatch(preview + start + loop + community, /homepage-section-kicker/);
});

test('the showcase has layout-led controls, bounded loading, and accessible playback', async () => {
  const preview = await read('src/lib/homepage/HomepageProfileExample.svelte');
  const reference = await read('src/lib/ProfileReferenceCard.svelte');
  const modern = await read('src/lib/homepage/HomepageTjzProfile.svelte');
  for (const label of ['Modern', 'Sleek', 'Simplistic']) assert.ok(preview.includes(`label: '${label}'`));
  assert.doesNotMatch(preview, /profile-example__swatches|profile-example__scene-copy|address:/);
  assert.match(preview, /transform: scale\(\.82\)/);
  assert.match(preview, /viewBox="0 0 16 16" aria-hidden="true"/);
  assert.match(preview, /\.profile-example__playback \{[\s\S]*?border: 1px solid/);
  const sleek = await read('src/lib/homepage/HomepageCurrentTjzProfile.svelte');
  for (const sample of [modern, sleek]) {
    assert.match(sample, /border-radius: 12px/);
    assert.doesNotMatch(sample, /border-radius: 0 0/);
  }
  assert.match(preview, /setInterval\(nextScene, 10000\)/);
  assert.match(preview, /paused \|\| hovered \|\| focused \|\| document\.hidden \|\| !renderers/);
  assert.match(preview, /if \(renderers \|\| loading\) return loading/);
  assert.match(preview, /motionPreference\.addEventListener\('change', handleMotion\)/);
  assert.match(preview, /threshold: \.25/);
  assert.match(preview, /Pause previews/);
  assert.match(preview, /role="status">\{announcement\}/);
  assert.doesNotMatch(preview, /aria-live="polite"/);
  assert.match(reference, /export let linksInteractive = true/);
  assert.match(reference, /href=\{linksInteractive \? link\.url : undefined\}/);
  assert.match(modern, /linksInteractive=\{false\}/);
  assert.match(modern, /cursorTrailKey: ''/);
  assert.match(modern, /cursorUrl: ''/);
  assert.match(modern, /stripCursorStyle/);
});

test('the homepage presents free and Plus pricing from the canonical feature matrix', async () => {
  const [home, loader, pricing, pricingData] = await Promise.all([
    read('src/lib/HomePage.svelte'),
    read('src/lib/homepage/HomepagePricingLoader.svelte'),
    read('src/lib/homepage/HomepagePricing.svelte'),
    read('src/lib/pricingData.js')
  ]);
  assert.match(home, /<HomepagePricingLoader \{isAuthenticated\} \/>/);
  assert.match(loader, /import\('\.\/HomepagePricing\.svelte'\)/);
  assert.match(loader, /id="pricing"/);
  assert.match(pricing, /Start free\.<br \/>\s*<span>Add Plus when you need it\.<\/span>/);
  assert.match(pricing, /aria-label="Free profile and Chromadie Plus plans"/);
  assert.match(pricing, /href="\/pricing"/);
  assert.match(pricing, /pricingComparisonRows/);
  assert.match(pricingData, /label: 'Background video hosting'/);
  assert.match(pricingData, /label: 'Up to 1 GB hosted media'/);
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
