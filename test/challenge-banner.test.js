import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const [app, banner] = await Promise.all([
  readFile(new URL('../src/App.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/ChallengeBanner.svelte', import.meta.url), 'utf8')
]);

test('App retains the challenge visibility gate and existing URL cleanup handler', () => {
  assert.match(app, /import ChallengeBanner from '\.\/lib\/ChallengeBanner\.svelte'/);
  assert.match(app, /\{#if challengeData && view === 'game'\}[\s\S]*?<ChallengeBanner challengeData=\{challengeData\} on:dismiss=\{clearChallengeState\} \/>[\s\S]*?\{\/if\}/);
  assert.match(app, /function clearChallengeState\(\)[\s\S]*?invalidateChallengeLoad\(\)[\s\S]*?challengeData = null[\s\S]*?getChallengeClearPath/);
  assert.doesNotMatch(app, /class="challenge-banner"|\.challenge-banner\s*\{/);
});

test('the banner preserves loading, unavailable, and successful challenge copy', () => {
  assert.match(banner, /challengeData\.loading[\s\S]*?Opening challenge/);
  assert.match(banner, /challengeData\.error[\s\S]*?Challenge unavailable/);
  assert.match(banner, /Beat this roll/);
  assert.match(banner, /Checking the shared link\./);
  assert.match(banner, /This link may have expired or been removed\./);
  assert.match(banner, /Beat the target score with your next daily roll\./);
  assert.match(banner, /challengeData\.fromUsername && !challengeData\.loading/);
});

test('successful challenge targets keep their color, score, and accessible label', () => {
  assert.match(banner, /aria-label="Challenge prompt"/);
  assert.match(banner, /aria-label=\{`Target score \$\{challengeData\.score\.toLocaleString\(\)\} points`\}/);
  assert.match(banner, /style="background-color: \{challengeData\.hex\};"/);
  assert.match(banner, /\{challengeData\.score\.toLocaleString\(\)\} pts/);
});

test('dismissal dispatches to App and the close control remains accessible', () => {
  assert.match(banner, /createEventDispatcher/);
  assert.match(banner, /aria-label="Dismiss challenge"/);
  assert.match(banner, /on:click=\{\(\) => dispatch\('dismiss'\)\}/);
});

test('challenge styles retain their desktop and mobile rules in the component', () => {
  assert.match(banner, /\.challenge-banner\s*\{[\s\S]*?width: min\(1160px, calc\(100% - 48px\)\)/);
  assert.match(banner, /\.challenge-close:hover/);
  assert.match(banner, /@media \(max-width: 600px\)[\s\S]*?\.challenge-banner\s*\{[\s\S]*?flex-direction: column/);
  assert.match(banner, /\.challenge-stat-loading,[\s\S]*?\.challenge-stat-error/);
});
