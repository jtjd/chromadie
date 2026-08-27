import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the approved homepage typography is bundled and authoritative', async () => {
  const [fonts, main, index, homepage, header, sharedHeader, claim] = await Promise.all([
    read('src/styles/fonts.css'),
    read('src/main.js'),
    read('index.html'),
    read('src/lib/homepage/homepage-reference.css'),
    read('src/lib/homepage/HomepageHeader.svelte'),
    read('src/lib/SiteModeHeader.svelte'),
    read('src/lib/homepage/HomepageClaim.svelte')
  ]);

  assert.match(fonts, /font-family: 'Clash Display'/);
  assert.match(fonts, /font-family: 'Inter'/);
  assert.match(fonts, /font-weight: 400/);
  assert.match(fonts, /inter-latin-wght-normal/);
  assert.match(main, /@fontsource-variable\/manrope\/wght\.css/);
  assert.doesNotMatch(index, /fonts\.googleapis|fonts\.gstatic/);
  assert.match(homepage, /font-family: 'Inter'/);
  assert.match(homepage, /--homepage-display: 'Manrope Variable'/);
  assert.match(homepage, /--homepage-secondary: rgba\(248, 248, 248, 0\.88\)/);
  assert.match(homepage, /--homepage-secondary-shadow: none/);
  assert.match(homepage, /\.app-main--site \.homepage-reference :is\(\.homepage-section-heading, \.homepage-step h3\)/);
  assert.match(homepage, /font-family: var\(--homepage-display\) !important/);
  assert.match(header, /SiteModeHeader/);
  assert.match(sharedHeader, /--site-header-display: 'Manrope Variable'/);
  assert.doesNotMatch(`${homepage}${header}${claim}`, /'Clash Display'/);
  assert.match(claim, /var\(--homepage-display\)/);
  assert.match(claim, /background: rgba\(16, 16, 20, 0\.48\)/);
  assert.match(claim, /box-shadow: 0 12px 28px rgba\(7, 4, 14, 0\.14\)/);
});

test('the homepage shell uses the Roll and Progression visual language without profile scenery', async () => {
  const [styles, home, rollPage, scoring, community, loop] = await Promise.all([
    read('src/lib/homepage/homepage-reference.css'),
    read('src/lib/HomePage.svelte'),
    read('src/lib/RollPage.svelte'),
    read('src/lib/homepage/HomepageScoring.svelte'),
    read('src/lib/homepage/HomepageCommunity.svelte'),
    read('src/lib/homepage/HomepageLoop.svelte')
  ]);

  assert.match(styles, /--homepage-bg: #0e0e10/);
  assert.match(styles, /--homepage-border: rgba\(255, 255, 255, 0\.11\)/);
  assert.match(styles, /--homepage-radius: 18px/);
  assert.match(styles, /\.homepage-content \{/);
  assert.doesNotMatch(styles, /--homepage-background-image|\.homepage-background|\.homepage-atmosphere/);
  assert.match(rollPage, /grid-template-columns: minmax\(280px, 400px\) minmax\(360px, 420px\)/);
  assert.match(rollPage, /min-height: calc\(100dvh - 88px\)/);
  assert.match(rollPage, /align-items: start/);
  assert.match(rollPage, /--roll-bg: var\(--bg, #0e0e10\)/);
  assert.match(rollPage, /--roll-panel-card: var\(--surface, #161619\)/);
  assert.doesNotMatch(home, /HomepageHero|HomepageProfileDemo|HomepageShowcase|HomepageBestRoll/);
  assert.match(await read('src/lib/homepage/HomepageDailyLeaderboard.svelte'), /\.homepage-daily-leaderboard__kicker[\s\S]*?font: 600 \.98rem \/ 1\.1 var\(--homepage-display\)/);
  const homepageDailyLeaderboard = await read('src/lib/homepage/HomepageDailyLeaderboard.svelte');
  assert.match(homepageDailyLeaderboard, /\.homepage-daily-leaderboard \{/);
  assert.match(homepageDailyLeaderboard, /background: var\(--leaderboard-panel\)/);
  assert.doesNotMatch(homepageDailyLeaderboard, /background: rgba\(20, 18, 30, \.55\)/);
  assert.doesNotMatch(homepageDailyLeaderboard, /backdrop-filter: blur\(20px\)/);
  assert.doesNotMatch(homepageDailyLeaderboard, /box-shadow: 0 8px 32px rgba\(0, 0, 0, \.25\)/);
  assert.doesNotMatch(homepageDailyLeaderboard, /transform: translateY\(clamp\(-3\.5rem, -6vh, -2rem\)\)/);
  assert.match(scoring, /Probability, not opinion/);
  assert.match(community, /Today’s board/);
  for (const step of ['Roll', 'Decode', 'Compare']) assert.match(loop, new RegExp(`<h3>${step}</h3>`));
  assert.match(styles, /prefers-reduced-motion/);
  assert.doesNotMatch(`${styles}${home}${scoring}${loop}`, /blob|orb|dashboard statistic|illustration/i);
});
