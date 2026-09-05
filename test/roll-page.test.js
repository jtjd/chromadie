import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [page, pageContext, game, preRoll, reveal, app, routeMetadata, routes, header, homepageHeader, footer, breakdown] = await Promise.all([
  read('src/lib/RollPage.svelte'),
  read('src/lib/rollPageContext.js'),
  read('src/lib/Game.svelte'),
  read('src/lib/RollPreRoll.svelte'),
  read('src/lib/rollReveal.js'),
  read('src/App.svelte'),
  read('src/lib/routeMetadata.js'),
  read('src/lib/routes.js'),
  read('src/lib/SiteModeHeader.svelte'),
  read('src/lib/homepage/HomepageHeader.svelte'),
  read('src/lib/SiteFooter.svelte'),
  read('src/lib/RollResultBreakdown.svelte')
]);

test('the Roll experience has a canonical page and shared navigation entry', () => {
  assert.match(routes, /pathname === '\/roll'\) return 'game'/);
  assert.match(app, /viewToCanonicalPath\(nextView/);
  assert.match(routeMetadata, /view === 'game' && !challengeData[\s\S]*'\/'/);
  assert.match(header, /activeView === 'game'/);
  assert.match(header, /navigate\('game'\)/);
  assert.doesNotMatch(header, />Discover</);
  assert.match(header, />Pricing</);
  assert.match(header, /Claim handle/);
  assert.match(header, />Sign in</);
  assert.match(homepageHeader, /SiteModeHeader/);
  assert.match(homepageHeader, /showClaim=\{false\}/);
  assert.match(footer, /href="\/roll">Roll/);
});

test('the dedicated Roll page preserves the authoritative Game surface inside the new shell', () => {
  assert.match(page, /<Game/);
  assert.match(page, /dedicated=\{true\}/);
  assert.match(page, /A NEW COLOR, EVERY DAY/);
  assert.doesNotMatch(page, /<svelte:head>/);
  assert.match(page, /on:navigate/);
  assert.match(page, /on:promptlogin/);
  assert.match(page, /let gameRef = null/);
  assert.match(page, /bind:this=\{gameRef\}/);
  assert.match(page, /gameRef\?\.beginGuestSignupFromParent\(signupNext\)/);
  assert.match(page, /class="roll-page__guest-cta"/);
  assert.ok(page.indexOf('class="roll-page__guest-cta"') < page.indexOf('<Game'), 'guest CTA belongs to the left context before the game card');
  assert.match(game, /export let dedicated = false/);
  assert.match(game, /game-container--dedicated/);
  assert.match(game, /roll-card-header/);
  assert.match(game, /roll-card-header__copy/);
  assert.match(game, /<h2 class="roll-card-header__title">Daily Roll<\/h2>/);
  assert.match(game, /RollTile/);
  assert.match(game, /<RollPreRoll/);
  assert.match(preRoll, /roll-pre-roll__unknown/);
  assert.match(preRoll, /#\?\?\?\?\?\?/);
  assert.match(preRoll, /READY TO REVEAL/);
  assert.match(preRoll, /background: #242428/);
  assert.match(preRoll, /prefers-reduced-motion/);
  assert.match(preRoll, /\.roll-pre-roll \.guest-prompt__text-action \{[\s\S]*appearance: none;/);
  assert.doesNotMatch(preRoll, /roll-pre-roll__instrument-line/);
  assert.doesNotMatch(preRoll, /Math\.random\(\)|requestRoll|score|rarity/);
  assert.match(page + game, /roll-tile/);
  assert.match(page + game, /roll-display/);
  assert.match(game, /RollResultBreakdown/);
  assert.doesNotMatch(game, /roll-breakdown--preview|roll-breakdown--result|REFERENCE_PREVIEW_ROWS|15,013|28,798/);
  assert.match(preRoll, /No result yet/);
  assert.match(preRoll, /Roll to generate today’s color/);
  assert.doesNotMatch(game, /Ready to reveal|roll-color-rarity">DAILY ROLL/);
  assert.doesNotMatch(page + game, /roll-color-field|roll-chamber/);
  assert.match(game, /roll-stage--rolling/);
  assert.match(game, /roll-stage--results/);
  assert.match(game, /getRevealHexCharacters/);
  assert.match(game, /revealConditions = \[\.\.\.revealConditions, item\]/);
  assert.match(game, /revealListElement\?\.scrollTo/);
  assert.doesNotMatch(game, /roll-reveal-steps|roll-stage__eyebrow/);
  assert.doesNotMatch(game, /rarity \}\? rarity · counting confirmed score/);
  assert.doesNotMatch(game, /getRollRevealItems\(canonical, 8\)/);
  assert.match(page, /rollContext\.revealHex/);
  assert.match(game, /roll-detail-grid/);
  assert.match(breakdown, /roll-result-summary/);
  assert.match(breakdown, /Top conditions/);
  assert.match(breakdown, /View full breakdown/);
  assert.match(breakdown, /role="dialog"/);
  assert.match(breakdown, /trapFocus/);
  assert.match(breakdown, /max-height: min\(760px, calc\(100dvh - 32px\)\)/);
  assert.match(breakdown, /overflow-y: auto/);
  assert.match(game, /roll-action__button--claimed/);
  assert.match(game, /function getReadableTextColor/);
  assert.match(game, /--roll-action-ink: \$\{rollActionInk\}/);
  assert.match(page, /--roll-card-glow/);
  assert.match(page, /--roll-card-glow-soft/);
  assert.match(page, /color-mix\(in srgb, var\(--roll-result-color, var\(--white\)\) 30%, transparent\)/);
  assert.match(page, /roll-result-glow/);
  assert.match(page, /color: var\(--roll-action-ink, #fff\)/);
  assert.match(game, /roll-result-meta/);
  assert.doesNotMatch(game, /roll-color-rarity__icon/);
  assert.match(game, /export function beginGuestSignupFromParent/);
  assert.match(game, /if !\$isAuthenticated && !dedicated/);
  assert.match(game, /--roll-rarity: \$\{getRarityPresentation\(rarity \|\| 'Common'\)\.color\}/);
  assert.doesNotMatch(game, /New color every day|Score after reveal/);
  assert.match(game, /dedicated \? traits\.slice\(0, 2\) : traits/);
  assert.match(game, /Next roll · \{countdownString\}/);
  assert.match(game, /if !dedicated/);
  assert.doesNotMatch(game, /roll-color-rarity">\{rarity \|\| 'Common'\} Roll/);
  assert.doesNotMatch(page, /on:pointermove|perspective:|rotateX|rotateY|translate3d/);
  assert.doesNotMatch(page, /roll-liquid-blob-morph|60% 40% 30% 70% \/ 60% 30% 70% 40%/);
  assert.match(page, /prefers-reduced-motion/);
  assert.match(page, /roll-page__guest-cta button \{ transition: none; \}/);
  assert.match(page, /roll-page__context/);
  assert.match(page, /\.roll-page__game \{[\s\S]*align-items: start;/);
  assert.match(page, /class:roll-page--result=\{contextHasResult\}/);
  assert.match(page, /roll-page--result \.roll-page__game \{[\s\S]*grid-template-columns: minmax\(280px, 400px\) minmax\(360px, 420px\)/);
  assert.match(page, /roll-page--result \.roll-page__game \{[\s\S]*align-items: center;/);
  assert.match(page, /roll-page--result :global\(\.game-container--dedicated\) \{[\s\S]*max-width: 420px !important;/);
  assert.match(page, /roll-stage--results > \.roll-result-summary/);
  assert.match(page, /@media \(max-width: 1100px\)[\s\S]*roll-page--result \.roll-page__game[\s\S]*grid-template-columns: minmax\(0, 420px\)/);
  assert.match(page, /Roll today’s color\./);
  assert.match(page, /One of 16,777,216 colors/);
  assert.doesNotMatch(page, /Keep your color story|Roll before the timer resets/);
  assert.match(page, /roll-page__description-rarity/);
  assert.match(page, /roll-page__description-score/);
  assert.match(page, /roll-card-header__copy::before/);
  assert.match(page, /grid-template-columns: minmax\(0, 1fr\) auto minmax\(0, 1fr\)/);
  assert.match(page, /--roll-rarity: \$\{contextHasResult \? contextRarity\.color/);
  assert.match(page, /--roll-score-color: var\(--color-earned, #f5c26f\)/);
  assert.match(page, /description-score[\s\S]*text-shadow: 0 0 14px color-mix\(in srgb, var\(--roll-score-color\)/);
  assert.match(page, /roll-color-rarity[\s\S]*filter: saturate\(1\.2\)/);
  assert.match(breakdown, /--condition-rarity-color: #54f2a0/);
  assert.match(breakdown, /roll-result-summary__scoreline[\s\S]*justify-content: center/);
  assert.match(breakdown, /roll-result-summary__scoreline[\s\S]*justify-items: center/);
  assert.match(breakdown, /roll-result-summary__score strong[\s\S]*color: var\(--roll-score-color/);
  assert.match(breakdown, /roll-result-summary__condition-points[\s\S]*color: var\(--roll-score-color/);
  assert.match(breakdown, /roll-result-breakdown-dialog__points[\s\S]*color: var\(--roll-score-color/);
  assert.match(game, /roll-reveal-discovery__item strong[\s\S]*color: var\(--roll-score-color/);
  assert.match(game, /roll-score-reveal strong[\s\S]*color: var\(--roll-score-color/);
  assert.doesNotMatch(breakdown, /roll-result-summary__rarity|export let rarity|safeRarity/);
  assert.match(page, /roll-acquisition-actions \.result-action[\s\S]*justify-content: center/);
  assert.doesNotMatch(page, /Save future rolls and earn EP\./);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /You rolled <span>\{rollContext\.identity\}\.<\/span>/);
  assert.match(page, /contextDay/);
  assert.match(pageContext, /totalRolls/);
  assert.match(pageContext, /currentStreak/);
  assert.match(pageContext, /lifetimeEp/);
  assert.match(page, /roll-page__streak/);
  assert.match(page, /roll-page__progression/);
  assert.doesNotMatch(page, /Open progression/);
  assert.match(page, /on:rollstate/);
  assert.match(game, /dispatch\('rollstate'/);
  assert.match(breakdown, /Total earned/);
  assert.doesNotMatch(game, /roll-breakdown__row--base/);
  assert.doesNotMatch(game, /ACCOUNT MODE|GUEST MODE/);
  assert.match(preRoll, /Roll today’s color/);
  assert.match(game, /result-action--primary/);
  assert.match(breakdown, /role="listitem"/);
  assert.doesNotMatch(game, /class="card roll-stage roll-stage--results"[^>]*aria-live/);
  assert.match(game, /roll-rarity--' \+ rarity/);
  assert.match(game, /role="progressbar"/);
  assert.match(game, /ROLL_REVEAL_STEPS/);
  assert.match(game, /data-reveal-step={revealStep}/);
  assert.match(reveal, /id: 'color'/);
  assert.match(reveal, /label: 'Conditions'/);
  assert.match(reveal, /label: 'Score'/);
  assert.doesNotMatch(reveal, /label: 'Channels'/);
  assert.doesNotMatch(reveal, /label: 'Rarity'/);
  assert.doesNotMatch(reveal, /Read the spectrum|Lock the channels|Find the signals|Assess the rarity|Count the score|Result secured/);
  assert.doesNotMatch(game + reveal, /condition scan|Finding your color|This one is yours|Signals aligning|The spectrum is narrowing/);
  assert.match(reveal, /getRollRevealTimeline/);
  assert.match(page, /homepage-rolling \.roll-page__context \{[\s\S]*align-self: center;/);
  assert.match(game, /roll-reveal-discovery/);
  assert.match(game, /roll-score-reveal/);
  assert.match(game, /class:roll-reveal-discovery--pending=\{revealStep < 1\}/);
  assert.match(game, /class:roll-score-reveal--pending=\{revealStep < 2\}/);
  assert.match(game, /\.roll-reveal-discovery__list \{[\s\S]*height: 174px;[\s\S]*overflow-y: auto;/);
  assert.match(game, /\.roll-reveal-discovery__list \{[\s\S]*align-content: start;[\s\S]*grid-auto-rows: max-content;/);
  assert.match(game, /beginGuestSignup\(signupNext\)/);
  assert.match(preRoll, /Sign up/);
  assert.match(preRoll, /to start your profile history\./);
  assert.match(game, /Save future rolls and earn EP\./);
  assert.doesNotMatch(game, /guest-prompt__icon|>△</);
  assert.match(app, /requestedNext\.startsWith\('\/'\)/);
  assert.match(app, /params\.set\('next', next\)/);
  assert.match(game, /Skip reveal/);
  assert.match(game, /getRevealHex/);
  assert.doesNotMatch(game, /Math\.random\(\)/);
  assert.doesNotMatch(game, /scoreCountUpInterval/);
  assert.match(pageContext, /getRarityPresentation/);
  assert.match(game, /requestRoll\(supabase, isReroll\)/);
  assert.doesNotMatch(page + game, /innerHTML|new Function|eval\s*\(/);
});
