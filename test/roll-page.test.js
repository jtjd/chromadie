import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [page, game, reveal, app, routes, header, homepageHeader, footer] = await Promise.all([
  read('src/lib/RollPage.svelte'),
  read('src/lib/Game.svelte'),
  read('src/lib/rollReveal.js'),
  read('src/App.svelte'),
  read('src/lib/routes.js'),
  read('src/lib/SiteModeHeader.svelte'),
  read('src/lib/homepage/HomepageHeader.svelte'),
  read('src/lib/SiteFooter.svelte')
]);

test('the Roll experience has a canonical page and shared navigation entry', () => {
  assert.match(routes, /pathname === '\/roll'\) return 'game'/);
  assert.match(app, /nextView === 'game'[\s\S]*'\/roll'/);
  assert.match(app, /view === 'game' && !challengeData[\s\S]*'\/roll'/);
  assert.match(header, /activeView === 'game'/);
  assert.match(header, /navigate\('game'\)/);
  assert.doesNotMatch(header, />Discover</);
  assert.match(header, />Pricing</);
  assert.match(header, /Claim handle/);
  assert.match(header, />Sign in</);
  assert.match(homepageHeader, /SiteModeHeader/);
  assert.match(homepageHeader, /claimHref="#claim"/);
  assert.match(footer, /href="\/roll">Roll/);
});

test('the dedicated Roll page preserves the authoritative Game surface inside the new shell', () => {
  assert.match(page, /<Game/);
  assert.match(page, /dedicated=\{true\}/);
  assert.match(page, /Daily Roll/);
  assert.match(page, /title>Daily Roll/);
  assert.match(page, /on:navigate/);
  assert.match(page, /on:promptlogin/);
  assert.match(game, /export let dedicated = false/);
  assert.match(game, /game-container--dedicated/);
  assert.match(game, /roll-card-header/);
  assert.match(game, /RollTile/);
  assert.match(page + game, /roll-tile/);
  assert.match(page + game, /roll-display/);
  assert.match(page + game, /roll-breakdown/);
  assert.doesNotMatch(game, /roll-breakdown--preview|REFERENCE_PREVIEW_ROWS|15,013|28,798/);
  assert.match(game, /Ready to reveal/);
  assert.doesNotMatch(page + game, /roll-color-field|roll-chamber/);
  assert.match(game, /roll-stage--rolling/);
  assert.match(game, /roll-stage--results/);
  assert.match(game, /roll-detail-grid/);
  assert.match(game, /roll-breakdown--result/);
  assert.match(game, /roll-action__button--claimed/);
  assert.match(game, /function getReadableTextColor/);
  assert.match(game, /--roll-action-ink: \$\{rollActionInk\}/);
  assert.match(page, /--roll-card-glow/);
  assert.match(page, /--roll-card-glow-soft/);
  assert.match(page, /color-mix\(in srgb, var\(--roll-result-color, var\(--white\)\) 30%, transparent\)/);
  assert.match(page, /roll-result-glow/);
  assert.match(page, /color: var\(--roll-action-ink, #fff\)/);
  assert.match(game, /roll-result-meta/);
  assert.match(game, /roll-color-rarity__icon/);
  assert.match(game, /getRarityPresentation\(rarity \|\| 'Common'\)\.icon/);
  assert.match(game, /--roll-rarity: \$\{getRarityPresentation\(rarity \|\| 'Common'\)\.color\}/);
  assert.doesNotMatch(game, /New color every day|Score after reveal/);
  assert.match(game, /dedicated \? traits\.slice\(0, 2\) : traits/);
  assert.match(game, /Next roll · \{countdownString\}/);
  assert.match(game, /if !dedicated/);
  assert.doesNotMatch(game, /roll-color-rarity">\{rarity \|\| 'Common'\} Roll/);
  assert.match(page, /on:pointermove/);
  assert.match(page, /prefers-reduced-motion/);
  assert.match(page, /roll-page__context/);
  assert.match(page, /roll-page__description-rarity/);
  assert.match(page, /roll-page__description-score/);
  assert.match(page, /--roll-rarity: \$\{contextHasResult \? contextRarity\.color/);
  assert.match(page, /--roll-score-color/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /You rolled <span>\{rollContext\.identity\}\.<\/span>/);
  assert.match(page, /contextDay/);
  assert.match(page, /totalRolls/);
  assert.match(page, /currentStreak/);
  assert.match(page, /lifetimeEp/);
  assert.match(page, /roll-page__streak/);
  assert.match(page, /roll-page__progression/);
  assert.match(page, /View your roll history/);
  assert.match(page, /on:rollstate/);
  assert.match(game, /dispatch\('rollstate'/);
  assert.match(game, /roll-score-total/);
  assert.doesNotMatch(game, /ACCOUNT MODE|GUEST MODE/);
  assert.match(game, /Roll For Today/);
  assert.match(game, /result-action--primary/);
  assert.match(game, /role="listitem"/);
  assert.doesNotMatch(game, /class="card roll-stage roll-stage--results"[^>]*aria-live/);
  assert.match(game, /roll-rarity--' \+ rarity/);
  assert.match(game, /role="progressbar"/);
  assert.match(game, /ROLL_REVEAL_STEPS/);
  assert.match(game, /data-reveal-step={revealStep}/);
  assert.match(reveal, /Lock the channels/);
  assert.match(reveal, /Find the signals/);
  assert.match(reveal, /Count the score/);
  assert.match(reveal, /getRollRevealTimeline/);
  assert.match(game, /roll-reveal-discovery/);
  assert.match(game, /roll-score-reveal/);
  assert.match(game, /Skip reveal/);
  assert.match(game, /getRevealHex/);
  assert.doesNotMatch(game, /Math\.random\(\)/);
  assert.doesNotMatch(game, /scoreCountUpInterval/);
  assert.match(page, /getRarityPresentation/);
  assert.match(game, /requestRoll\(supabase, isReroll\)/);
  assert.doesNotMatch(page + game, /innerHTML|new Function|eval\s*\(/);
});
