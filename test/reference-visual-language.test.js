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
  assert.match(main, /@fontsource-variable\/inter\/wght\.css/);
  assert.match(main, /@fontsource-variable\/manrope\/wght\.css/);
  assert.doesNotMatch(index, /fonts\.googleapis|fonts\.gstatic/);
  assert.match(homepage, /font-family: 'Inter'/);
  assert.match(homepage, /--homepage-display: 'Manrope Variable'/);
  assert.match(homepage, /--homepage-secondary: rgba\(248, 248, 248, 0\.88\)/);
  assert.match(homepage, /--homepage-secondary-shadow: none/);
  assert.match(homepage, /\.app-main--site \.homepage-reference :is\(\.homepage-hero__copy > h1, \.homepage-section-heading, \.homepage-final h2, \.homepage-step h3\)/);
  assert.match(homepage, /font-family: var\(--homepage-display\) !important/);
  assert.match(header, /SiteModeHeader/);
  assert.match(sharedHeader, /--site-header-display: 'Manrope Variable'/);
  assert.doesNotMatch(`${homepage}${header}${claim}`, /'Clash Display'/);
  assert.match(claim, /var\(--homepage-display\)/);
  assert.match(claim, /background: rgba\(16, 16, 20, 0\.48\)/);
  assert.match(claim, /box-shadow: 0 12px 28px rgba\(7, 4, 14, 0\.14\)/);
});

test('the homepage shell preserves the frozen reference geometry and treatment', async () => {
  const [styles, hero, demo, card, showcase, loop] = await Promise.all([
    read('src/lib/homepage/homepage-reference.css'),
    read('src/lib/homepage/HomepageHero.svelte'),
    read('src/lib/homepage/HomepageProfileDemo.svelte'),
    read('src/lib/ProfileReferenceCard.svelte'),
    read('src/lib/homepage/HomepageShowcase.svelte'),
    read('src/lib/homepage/HomepageLoop.svelte')
  ]);

  assert.match(styles, /--homepage-bg: #050506/);
  assert.match(styles, /--homepage-border: rgba\(255, 255, 255, 0\.11\)/);
  assert.match(styles, /--homepage-radius: 18px/);
  assert.match(styles, /position: fixed/);
  assert.match(styles, /--homepage-background-image/);
  assert.match(styles, /\.homepage-content \{/);
  assert.match(styles, /\.homepage-content::before \{/);
  assert.match(styles, /height: 280px/);
  assert.match(styles, /rgba\(5, 5, 6, \.36\) 0/);
  assert.match(hero, /grid-template-columns: minmax\(0, 1fr\) 470px minmax\(0, 1fr\)/);
  assert.match(hero, /min-height: calc\(100svh - 88px\)/);
  assert.match(hero, /width: 440px/);
  assert.match(hero, /\.homepage-hero h1 \{[\s\S]*?text-shadow: none;/);
  assert.match(hero, /\.homepage-theme-button \{[\s\S]*?background: rgba\(255, 255, 255, \.94\)/);
  assert.match(hero, /\.homepage-theme-button:hover,[\s\S]*?background: rgba\(10, 10, 13, \.72\)/);
  assert.match(await read('src/lib/homepage/HomepageDailyLeaderboard.svelte'), /\.homepage-daily-leaderboard__kicker[\s\S]*?font: 600 1\.14rem \/ 1\.1 var\(--homepage-display\)/);
  assert.match(await read('src/lib/homepage/HomepageDailyLeaderboard.svelte'), /border-radius: 18px; background: rgba\(10, 10, 14, \.68\)/);
  assert.doesNotMatch(hero, /height: 470px|ProfileShell|HomepageProfileRenderer|layoutLabel/);
  assert.match(demo, /ProfileReferenceCard/);
  assert.match(card, /profile-reference-card--homepage/);
  assert.match(card, /repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(card, /backdrop-filter: blur\(32px\)/);
  assert.doesNotMatch(`${demo}${showcase}`, /profile-shell|ProfileShell|ProfileLayoutFrame/);
  assert.match(showcase, /homepage-profile-demo/);
  assert.doesNotMatch(showcase, /layout|profile-shell/i);
  for (const step of ['Roll', 'Build', 'Be seen']) assert.match(loop, new RegExp(`<h3>${step}</h3>`));
  assert.match(styles, /prefers-reduced-motion/);
  assert.doesNotMatch(`${styles}${hero}${showcase}${loop}`, /blob|orb|dashboard statistic|illustration/i);
});
