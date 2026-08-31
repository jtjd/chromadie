import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('compact profiles compose identity and a static daily-roll summary as one surface', async () => {
  const [shell, card, summary, dailyRoll, roll, todayColor] = await Promise.all([
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileReferenceCard.svelte'),
    read('src/lib/ProfileRollSummary.svelte'),
    read('src/lib/ProfileDailyRoll.svelte'),
    read('src/lib/ProfileRoll.svelte'),
    read('src/lib/TodayColor.svelte')
  ]);

  assert.match(shell, /profileCardKeepsRollInline = true/);
  assert.match(shell, /profileHasBelowFoldRoll = false/);
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
  assert.match(summary, /profile-roll-summary__swatch/);
  assert.match(summary, /profile-roll-summary__identity/);
  assert.match(summary, /getRarityPresentation/);
  assert.match(summary, /normalizeHexColor/);
  assert.doesNotMatch(summary, /<ProfileRoll|<TodayColor|rollstart|rollcomplete|RollResultBreakdown/);
  assert.match(dailyRoll, /<ProfileRoll[\s\S]*integrated=\{true\}/);
  assert.match(dailyRoll, /<TodayColor/);
  assert.match(roll, /profile-roll--presentation profile-roll--presentation-['"]? \+ presentation/);
  assert.match(roll, /profile-roll--presentation-compact/);
  assert.match(roll, /profile-roll__identity/);
  assert.match(roll, /<RollResultBreakdown/);
  assert.match(roll, /profile-roll__compact-next/);
  assert.match(roll, /profile-roll__result-actions--compact/);
  assert.match(roll, /compact=\{presentation === 'compact'\}/);
  assert.match(todayColor, /today-color__identity/);
  assert.match(todayColor, /<RollResultBreakdown/);
  assert.match(todayColor, /roll-result-summary/);
  assert.match(todayColor, /display: inline-flex;/);
  assert.match(shell, /profile-shell-page--compact:not\(\.profile-shell-page--preview\)/);
});
