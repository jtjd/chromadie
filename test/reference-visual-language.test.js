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
  assert.match(fonts, /font-family: 'Inter'/);
  assert.match(fonts, /font-weight: 400/);
  assert.match(main, /@fontsource-variable\/inter\/wght\.css/);
  assert.doesNotMatch(index, /fonts\.googleapis|fonts\.gstatic/);
  assert.match(homepage, /font-family: 'Inter'/);
  assert.match(homepage, /font-family: 'Clash Display'/);
  assert.match(homepage, /\.app-main--site \.homepage-reference :is\(h1, h2, h3\)/);
  assert.match(homepage, /font-family: 'Clash Display', sans-serif !important/);
  assert.match(header, /'Clash Display'/);
  assert.match(claim, /'Inter'/);
});

test('the homepage shell preserves the frozen reference geometry and treatment', async () => {
  const [styles, hero, demo, showcase, loop] = await Promise.all([
    read('src/lib/homepage/homepage-reference.css'),
    read('src/lib/homepage/HomepageHero.svelte'),
    read('src/lib/homepage/HomepageProfileDemo.svelte'),
    read('src/lib/homepage/HomepageShowcase.svelte'),
    read('src/lib/homepage/HomepageLoop.svelte')
  ]);

  assert.match(styles, /--homepage-bg: #050506/);
  assert.match(styles, /--homepage-border: rgba\(255, 255, 255, 0\.11\)/);
  assert.match(styles, /--homepage-radius: 18px/);
  assert.match(styles, /position: fixed/);
  assert.match(styles, /--homepage-background-image/);
  assert.match(hero, /grid-template-columns: minmax\(0, 1fr\) 470px minmax\(0, 1fr\)/);
  assert.match(hero, /min-height: calc\(100svh - 88px\)/);
  assert.match(hero, /width: 440px/);
  assert.doesNotMatch(hero, /height: 470px|ProfileShell|HomepageProfileRenderer|layoutLabel/);
  assert.match(demo, /homepage-profile-demo__avatar-shell/);
  assert.match(demo, /homepage-profile-demo__links/);
  assert.match(demo, /repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(demo, /backdrop-filter: blur\(32px\)/);
  assert.doesNotMatch(`${demo}${showcase}`, /profile-shell|ProfileShell|ProfileLayoutFrame/);
  assert.match(showcase, /homepage-profile-demo/);
  assert.doesNotMatch(showcase, /layout|profile-shell/i);
  for (const step of ['Roll', 'Build', 'Be seen']) assert.match(loop, new RegExp(`<h3>${step}</h3>`));
  assert.match(styles, /prefers-reduced-motion/);
  assert.doesNotMatch(`${styles}${hero}${showcase}${loop}`, /blob|orb|dashboard statistic|illustration/i);
});
