import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('compact profiles compose identity and a static daily-roll summary as one surface', async () => {
  const [shell, card, summary, rollPage] = await Promise.all([
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileReferenceCard.svelte'),
    read('src/lib/ProfileRollSummary.svelte'),
    read('src/lib/RollPage.svelte')
  ]);

  assert.match(shell, /profileCardKeepsRollInline = true/);
  assert.match(card, /import ProfileRollSummary from '\.\/ProfileRollSummary\.svelte'/);
  assert.match(card, /profile-reference-card__roll profile-reference-card__roll--summary/);
  assert.doesNotMatch(card, /ProfileDailyRoll|liveRoll|on:roll(?:start|cancel|complete)/);
  assert.match(card, /max-width: 40rem/);
  assert.match(card, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(card, /width: min\(100%, 26rem\)/);
  assert.match(card, /@container profile-reference-card \(max-width: 36rem\)/);
  assert.match(card, /on:click=\{\(\) => onEntryClick/);
  assert.match(summary, /data-profile-widget="roll"/);
  assert.match(summary, /data-profile-widget-mode="summary"/);
  assert.equal((summary.match(/data-profile-widget="roll"/g) || []).length, 1);
  assert.equal((card.match(/data-profile-widget="roll"/g) || []).length, 0);
  assert.match(summary, /profile-roll-summary__swatch/);
  assert.match(summary, /profile-roll-summary__identity/);
  assert.match(summary, /getRarityPresentation/);
  assert.match(summary, /normalizeHexColor/);
  assert.doesNotMatch(summary, /<ProfileRoll|<TodayColor|rollstart|rollcomplete|RollResultBreakdown/);
  assert.doesNotMatch(shell, /profileRollComponent|todayColorComponent|profileRollState/);
  assert.match(rollPage, /<Game/);
});
