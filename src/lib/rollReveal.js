export const ROLL_REVEAL_STEPS = Object.freeze([
  Object.freeze({ id: 'signal', label: 'Color', progress: 8 }),
  Object.freeze({ id: 'channels', label: 'Channels', progress: 28 }),
  Object.freeze({ id: 'conditions', label: 'Conditions', progress: 54 }),
  Object.freeze({ id: 'rarity', label: 'Rarity', progress: 72 }),
  Object.freeze({ id: 'score', label: 'Score', progress: 94 }),
  Object.freeze({ id: 'complete', label: 'Complete', progress: 100 })
]);

// A fixed signal palette keeps the anticipation legible without inventing
// client-side near misses. The server result remains the only source of truth.
export const ROLL_REVEAL_SIGNAL_COLORS = Object.freeze([
  '#FF4D8D',
  '#FF8A4C',
  '#F7DA4B',
  '#63DE8B',
  '#43C8F5',
  '#756CFF',
  '#C65CFF',
  '#FF5DB1'
]);

const REVEAL_RARITY_BONUS = Object.freeze({
  Trash: 0,
  Common: 0,
  Uncommon: 400,
  Rare: 900,
  Epic: 1800,
  Anomaly: 3000,
  Mythic: 4200
});

const REVEAL_SCORE_BONUS = Object.freeze({
  Trash: 0,
  Common: 0,
  Uncommon: 200,
  Rare: 400,
  Epic: 600,
  Anomaly: 900,
  Mythic: 1200
});

const REVEAL_SCAN_LAYERS = Object.freeze([
  'Hue relationship',
  'Saturation profile',
  'Lightness range',
  'Channel harmony',
  'Hex signature',
  'Scoring conditions'
]);

const HEX_CHANNEL_PATTERN = /^#?([0-9a-f]{6})$/i;

export function getRevealHex(value, lockedChannels = 0) {
  const match = String(value || '').trim().match(HEX_CHANNEL_PATTERN);
  if (!match) return '#------';

  const channels = match[1].match(/../g) || [];
  const safeLockedChannels = Math.max(0, Math.min(channels.length, Number(lockedChannels) || 0));
  return `#${channels.map((channel, index) => index < safeLockedChannels ? channel.toUpperCase() : '--').join('')}`;
}

export function getRollRevealItems(canonical, maxItems = 8) {
  const contributors = Array.isArray(canonical?.contributors)
    ? canonical.contributors
      .filter(contributor => contributor && typeof contributor.id === 'string')
      .map(contributor => ({
        id: `condition-${contributor.id}`,
        label: contributor.name || contributor.id,
        points: Number(contributor.awardedPoints ?? contributor.points) || 0,
        kind: 'condition'
      }))
    : [];
  const traits = Array.isArray(canonical?.traits)
    ? canonical.traits
      .filter(trait => trait && typeof (trait.id || trait.label) === 'string')
      .map(trait => ({
        id: `trait-${trait.id || trait.label}`,
        label: trait.label || trait.name || trait.id,
        points: 0,
        kind: 'trait'
      }))
    : [];
  const items = [...contributors, ...traits].slice(0, Math.max(1, Number(maxItems) || 1));

  for (const label of REVEAL_SCAN_LAYERS) {
    if (items.length >= Math.max(6, Number(maxItems) || 1)) break;
    if (items.some(item => item.label === label)) continue;
    items.push({
      id: `scan-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`,
      label,
      points: 0,
      kind: 'scan'
    });
  }

  return items.slice(0, Math.max(1, Number(maxItems) || 1));
}

export function getRollRevealTimeline({ rarity = 'Common', score = 0, conditionCount = 0, reducedMotion = false, skipped = false } = {}) {
  if (reducedMotion || skipped) {
    return Object.freeze({
      signal: 0,
      channel: 0,
      conditionIntro: 0,
      conditionBeat: 0,
      conditionSettle: 0,
      rarity: 0,
      score: 0,
      settle: 0,
      conditionRevealCount: 0,
      total: 0
    });
  }

  const safeRarity = Object.hasOwn(REVEAL_RARITY_BONUS, rarity) ? rarity : 'Common';
  const safeScore = Math.max(0, Number(score) || 0);
  const safeConditionCount = Math.max(0, Number(conditionCount) || 0);
  const conditionRevealCount = Math.max(6, Math.min(8, Math.ceil(safeConditionCount / 2) || 6));
  const signal = 2400;
  const channel = 900;
  const conditionIntro = 600;
  const conditionBeat = 600;
  const conditionSettle = 600;
  const rarityDuration = 2000 + REVEAL_RARITY_BONUS[safeRarity];
  const scoreDuration = 3000 + REVEAL_SCORE_BONUS[safeRarity] + (safeScore >= 10000000 ? 800 : 0);
  const settle = 700;
  const total = signal + (channel * 3) + conditionIntro + (conditionBeat * conditionRevealCount)
    + conditionSettle + rarityDuration + scoreDuration + settle;

  return Object.freeze({
    signal,
    channel,
    conditionIntro,
    conditionBeat,
    conditionSettle,
    rarity: rarityDuration,
    score: scoreDuration,
    settle,
    conditionRevealCount,
    total
  });
}
