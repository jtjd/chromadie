/** @param {any} node */
export function isIntentionalObjective(node) {
  if (!node) return false;
  return (node.presentationRole || node.presentation_role || '') === 'objective'
    || node.track !== 'discovery';
}

/** @param {any} node */
export function isUnlocked(node) {
  return node?.unlocked === true || Boolean(node?.unlockedAt || node?.unlocked_at);
}

export function formatProgressionNumber(value) {
  return Number(value || 0).toLocaleString();
}

export function getNodeTarget(node) {
  const target = Number(node?.progress?.target ?? node?.progressTarget ?? node?.threshold);
  return Number.isFinite(target) && target > 0 ? target : null;
}

export function getNodeCurrent(node, lifetimeEp = 0) {
  if (node?.progress?.current !== undefined) return Math.max(0, Number(node.progress.current) || 0);
  if (node?.track === 'rank') return lifetimeEp;
  return 0;
}

export function getNodePercent(node, lifetimeEp = 0) {
  if (isUnlocked(node)) return 100;
  const target = getNodeTarget(node);
  if (!target) return 0;
  return Math.min(100, Math.round((getNodeCurrent(node, lifetimeEp) / target) * 100));
}

export function getGoalPaceLabel(node) {
  const expectedRolls = Number(node?.expectedRolls ?? node?.expected_rolls);
  const role = node?.presentationRole || node?.presentation_role;
  if (node?.track === 'discovery' && Number.isFinite(expectedRolls) && expectedRolls > 0) {
    const odds = `About 1 in ${formatProgressionNumber(Math.round(expectedRolls))} rolls`;
    return role === 'lifetime_discovery' ? `Lifetime discovery · ${odds}` : odds;
  }
  if (Number.isFinite(expectedRolls) && expectedRolls > 0 && expectedRolls <= 90) {
    return `Often within ${formatProgressionNumber(expectedRolls)} rolls`;
  }
  const pace = String(node?.paceBand || node?.pace_band || '').toLowerCase();
  if (pace === 'days') return 'A few days of rolling';
  if (pace === 'weeks') return 'A few weeks of rolling';
  if (pace === 'months') return 'A longer-term goal';
  if (pace === 'years' || pace === 'lifetime') return 'A long-term milestone';
  return node?.metric === 'achievement' ? 'Find it whenever it appears' : 'Coming later';
}

export function getNodeProgressLabel(node, lifetimeEp = 0) {
  if (isUnlocked(node)) return 'Complete';
  const target = getNodeTarget(node);
  if (target && (node?.progress || node?.track === 'rank')) {
    const rawUnit = node?.progress?.unit || (node?.track === 'rank' ? 'points' : 'rolls');
    const unit = String(rawUnit).toLowerCase() === 'ep' ? 'points' : rawUnit;
    return `${formatProgressionNumber(getNodeCurrent(node, lifetimeEp))} / ${formatProgressionNumber(target)} ${unit}`.trim();
  }
  return getGoalPaceLabel(node);
}

/** @param {any} currentProgression */
export function resolveFocusGoal(currentProgression) {
  const candidates = [
    currentProgression?.nextJourney?.ritual,
    currentProgression?.nextJourney?.rank,
    currentProgression?.nextObjective
  ];
  return candidates.find(node => isIntentionalObjective(node) && !isUnlocked(node)) || null;
}
