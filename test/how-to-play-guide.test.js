import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { onRequestGet as renderHowToPlay } from '../functions/how-to-play.js';
import { resolveRouteMetadata } from '../src/lib/routeMetadata.js';
import {
  HOW_TO_PLAY_CANONICAL_PATH,
  HOW_TO_PLAY_EXAMPLE_ROLL,
  HOW_TO_PLAY_META_DESCRIPTION,
  HOW_TO_PLAY_NO_SCRIPT_SUMMARY
} from '../src/lib/howToPlayContent.js';
import { scoreCandidateColorV6 } from '../src/lib/scoringV6.js';

const guideSource = await readFile(new URL('../src/lib/FAQ.svelte', import.meta.url), 'utf8');

test('the example result matches the active scoring model', () => {
  const { channels, contributors, baseScore, ...example } = HOW_TO_PLAY_EXAMPLE_ROLL;
  const scored = scoreCandidateColorV6(channels.red, channels.green, channels.blue);

  assert.equal(scored.hex, example.displayColor);
  assert.equal(scored.identity, example.identity);
  assert.equal(scored.rarity, example.rarity);
  assert.equal(scored.score, example.totalScore);
  assert.deepEqual(scored.traits, example.traits);
  assert.deepEqual(
    scored.contributors.map(({ id, name, awardedPoints, conditionRarity }) => ({ id, name, awardedPoints, conditionRarity })),
    contributors
  );
  assert.equal(scored.score - contributors.reduce((total, contributor) => total + contributor.awardedPoints, 0), baseScore);
});

test('the guide matches the roll-first homepage and real profile discovery paths', () => {
  assert.match(guideSource, /href="\/"[^>]*>\s*Roll today[’']s color/i);
  assert.match(guideSource, /href="\/leaderboard"[^>]*>\s*Browse profiles/i);
  assert.match(guideSource, /When available, Today[’']s top roll/i);
  assert.match(guideSource, /No public roll today/i);
  assert.match(guideSource, /View full breakdown/i);
  assert.match(guideSource, /name or color/i);
  assert.match(guideSource, /midnight UTC/i);
  assert.match(guideSource, /discarded when signup begins/i);
  assert.match(guideSource, /do not earn account EP/i);
  assert.match(guideSource, /do not appear on the leaderboard/i);
  assert.match(guideSource, /replace today[’']s result/i);
  assert.doesNotMatch(guideSource, /53,296|@neonuser|Claim a username|strong rolls rise into view/i);
});

test('SPA metadata and the public no-JavaScript fallback share the guide copy', async () => {
  const metadata = resolveRouteMetadata({ routeMode: 'how-to-play' });
  assert.equal(metadata.canonicalPath, HOW_TO_PLAY_CANONICAL_PATH);
  assert.equal(metadata.description, HOW_TO_PLAY_META_DESCRIPTION);

  const shell = '<!doctype html><html><head><title>ChromaDie</title><meta name="description" content=""><meta name="robots" content="index,follow"><link rel="canonical" href="https://example.test/"><meta property="og:title" content=""><meta property="og:description" content=""><meta property="og:url" content=""><meta name="twitter:title" content=""><meta name="twitter:description" content=""><meta name="twitter:url" content=""></head><body></body></html>';
  const response = await renderHowToPlay({
    request: new Request('https://example.test/how-to-play'),
    env: { ASSETS: { fetch: async () => new Response(shell) } }
  });
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<title>How to Play \| ChromaDie<\/title>/);
  assert.match(html, new RegExp(`<meta name="description" content="${HOW_TO_PLAY_META_DESCRIPTION}"`));
  assert.ok(html.includes(`<link rel="canonical" href="https://example.test${HOW_TO_PLAY_CANONICAL_PATH}"`));
  assert.ok(html.includes(`<p>${HOW_TO_PLAY_NO_SCRIPT_SUMMARY}</p>`));
});
