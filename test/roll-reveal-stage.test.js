import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [stage, game] = await Promise.all([
  readFile(new URL('../src/lib/RollRevealStage.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/Game.svelte', import.meta.url), 'utf8')
]);

test('the reveal stage receives presentation state and returns its scroll target', () => {
  for (const prop of [
    'displayColor',
    'displayHex',
    'rarity',
    'revealStep',
    'revealDetail',
    'revealConditions',
    'revealItemTotal',
    'displayScore',
    'scanProgress',
    'revealListElement'
  ]) {
    assert.match(stage, new RegExp(`export let ${prop}\\b`));
  }
  assert.match(stage, /bind:this=\{revealListElement\}/);
  assert.match(game, /bind:revealListElement=\{revealListElement\}/);
  assert.match(game, /on:skip=\{skipReveal\}/);
  assert.match(stage, /dispatch\('skip'\)/);
  assert.match(game, /revealListElement\?\.scrollTo/);
});

test('the reveal stage keeps the existing accessible live and progress states', () => {
  assert.match(stage, /aria-live="polite"/);
  assert.match(stage, /role="status"/);
  assert.match(stage, /aria-label="Server-confirmed score conditions being revealed"/);
  assert.match(stage, /aria-hidden=\{revealStep < 1\}/);
  assert.match(stage, /class="roll-score-reveal"[\s\S]*aria-hidden=\{revealStep < 2\}[\s\S]*aria-live="polite"/);
  assert.match(stage, /role="progressbar"[\s\S]*aria-valuenow=\{Math\.round\(scanProgress\)\}/);
  assert.match(stage, /<button type="button" class="roll-reveal-skip"/);
});

test('reveal visuals retain their reduced-motion rules and contain no roll authority', () => {
  assert.match(stage, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(stage, /\.roll-rolling-display::before \{ animation: none; \}/);
  assert.match(stage, /\.roll-reveal-discovery__list \{ scroll-behavior: auto; \}/);
  assert.match(stage, /\.roll-reveal-discovery__item \{ animation: none; \}/);
  assert.doesNotMatch(stage, /requestRoll|calculate_roll|scoreCandidate|rerollShards/);
});
