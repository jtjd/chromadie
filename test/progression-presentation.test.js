import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatProgressionNumber,
  getGoalPaceLabel,
  getNodeCurrent,
  getNodePercent,
  getNodeProgressLabel,
  getNodeTarget,
  isIntentionalObjective,
  isUnlocked,
  resolveFocusGoal
} from '../src/lib/progressionPresentation.js';

test('intentional objectives preserve role aliases and keep Discovery opt-in', () => {
  assert.equal(isIntentionalObjective({ track: 'ritual' }), true);
  assert.equal(isIntentionalObjective({ track: 'discovery' }), false);
  assert.equal(isIntentionalObjective({ track: 'discovery', presentationRole: 'objective' }), true);
  assert.equal(isIntentionalObjective({ track: 'discovery', presentation_role: 'objective' }), true);
  assert.equal(isIntentionalObjective(null), false);
});

test('unlocked state accepts the canonical flag and historical timestamp aliases', () => {
  assert.equal(isUnlocked({ unlocked: true }), true);
  assert.equal(isUnlocked({ unlocked: false, unlockedAt: '2026-09-01T00:00:00Z' }), true);
  assert.equal(isUnlocked({ unlocked_at: '2026-09-01T00:00:00Z' }), true);
  assert.equal(isUnlocked({ unlocked: false, unlockedAt: null, unlocked_at: null }), false);
});

test('focus selection keeps Ritual then Rank then intentional objective priority', () => {
  const ritual = { id: 'ritual', track: 'ritual' };
  const rank = { id: 'rank', track: 'rank' };
  const objective = { id: 'objective', track: 'ritual' };
  assert.equal(resolveFocusGoal({
    nextJourney: { ritual, rank },
    nextObjective: objective
  }), ritual);

  assert.equal(resolveFocusGoal({
    nextJourney: { ritual: { ...ritual, unlocked: true }, rank },
    nextObjective: objective
  }), rank);

  assert.equal(resolveFocusGoal({
    nextJourney: {
      ritual: { id: 'completed-ritual', track: 'ritual', unlockedAt: 'today' },
      rank: { id: 'completed-rank', track: 'rank', unlocked_at: 'today' }
    },
    nextObjective: objective
  }), objective);
});

test('focus selection excludes stochastic Discovery and completed objectives', () => {
  assert.equal(resolveFocusGoal({
    nextJourney: { ritual: { id: 'discovery', track: 'discovery' } },
    nextObjective: { id: 'completed', track: 'ritual', unlocked: true }
  }), null);

  const authoredDiscoveryObjective = { id: 'intentional-discovery', track: 'discovery', presentation_role: 'objective' };
  assert.equal(resolveFocusGoal({ nextObjective: authoredDiscoveryObjective }), authoredDiscoveryObjective);
});

test('shared progression node metrics normalize aliases, clamp progress, and honor lifetime EP', () => {
  assert.equal(getNodeTarget({ progress: { target: '80' } }), 80);
  assert.equal(getNodeTarget({ progressTarget: 120 }), 120);
  assert.equal(getNodeTarget({ threshold: 365 }), 365);
  assert.equal(getNodeTarget({ threshold: 0 }), null);

  assert.equal(getNodeCurrent({ progress: { current: -4 } }, 900), 0);
  assert.equal(getNodeCurrent({ track: 'rank' }, 900), 900);
  assert.equal(getNodeCurrent({ track: 'ritual' }, 900), 0);
  assert.equal(getNodePercent({ progress: { current: 4, target: 8 } }), 50);
  assert.equal(getNodePercent({ progress: { current: 12, target: 8 } }), 100);
  assert.equal(getNodePercent({ unlocked_at: '2026-09-01T00:00:00Z' }), 100);
  assert.equal(getNodePercent({ progress: { current: 1 } }), 0);
  assert.equal(formatProgressionNumber(12000), '12,000');
});

test('shared progression labels preserve points, expected-roll, discovery, and pace copy', () => {
  assert.equal(getNodeProgressLabel({
    progress: { current: 4200, target: 10000, unit: 'ep' }
  }), '4,200 / 10,000 points');
  assert.equal(getNodeProgressLabel({
    track: 'rank', progressTarget: 20000
  }, 12000), '12,000 / 20,000 points');
  assert.equal(getNodeProgressLabel({ unlocked: true }), 'Complete');
  assert.equal(getNodeProgressLabel({ track: 'discovery', expected_rolls: 2.7 }), 'About 1 in 3 rolls');
  assert.equal(getGoalPaceLabel({
    track: 'discovery', expectedRolls: 2.7, presentation_role: 'lifetime_discovery'
  }), 'Lifetime discovery · About 1 in 3 rolls');
  assert.equal(getGoalPaceLabel({ expected_rolls: 90 }), 'Often within 90 rolls');
  assert.equal(getGoalPaceLabel({ pace_band: 'weeks' }), 'A few weeks of rolling');
  assert.equal(getGoalPaceLabel({ paceBand: 'lifetime' }), 'A long-term milestone');
  assert.equal(getGoalPaceLabel({ metric: 'achievement' }), 'Find it whenever it appears');
});
