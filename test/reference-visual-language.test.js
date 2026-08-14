import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the approved homepage typography is bundled and authoritative', async () => {
  const [fonts, main, index, homepage, header, claim] = await Promise.all([
    read('src/styles/fonts.css'),
    read('src/main.js'),
    read('index.html'),
    read('src/lib/homepage/homepage-reference.css'),
    read('src/lib/homepage/HomepageHeader.svelte'),
    read('src/lib/homepage/HomepageClaim.svelte')
  ]);

  assert.match(fonts, /font-family: 'Clash Display'/);
  assert.match(fonts, /font-weight: 400/);
  assert.match(main, /@fontsource-variable\/inter\/wght\.css/);
  assert.doesNotMatch(index, /fonts\.googleapis|fonts\.gstatic/);
  assert.match(homepage, /font-family: 'Inter'/);
  assert.match(homepage, /font-family: 'Clash Display'/);
  assert.match(header, /'Clash Display'/);
  assert.match(claim, /'Inter'/);
});

test('the homepage shell preserves the frozen reference geometry and treatment', async () => {
  const [styles, hero, showcase, loop] = await Promise.all([
    read('src/lib/homepage/homepage-reference.css'),
    read('src/lib/homepage/HomepageHero.svelte'),
    read('src/lib/homepage/HomepageShowcase.svelte'),
    read('src/lib/homepage/HomepageLoop.svelte')
  ]);

  assert.match(styles, /--homepage-bg: #050506/);
  assert.match(styles, /--homepage-border: rgba\(255, 255, 255, 0\.11\)/);
  assert.match(styles, /--homepage-radius: 18px/);
  assert.match(hero, /grid-template-columns: minmax\(0, 1fr\) 470px minmax\(0, 1fr\)/);
  assert.match(hero, /min-height: calc\(100svh - 88px\)/);
  assert.match(hero, /width: 440px; height: 470px/);
  assert.match(hero, /background-image: var\(--homepage-hero-background\)/);
  assert.match(hero, /backdrop-filter: blur\(16px\)/);
  assert.match(showcase, /homepage-profile-renderer--showcase/);
  assert.match(showcase, /profile-shell-page/);
  for (const step of ['Roll', 'Build', 'Be seen']) assert.match(loop, new RegExp(`<h3>${step}</h3>`));
  assert.match(styles, /prefers-reduced-motion/);
  assert.doesNotMatch(`${styles}${hero}${showcase}${loop}`, /blob|orb|dashboard statistic|illustration/i);
});
