import { getBadgeMeta } from './badgeData.js';

export const ROLL_REVEAL_STEPS = Object.freeze([
  Object.freeze({ id: 'color', label: 'Color', progress: 18 }),
  Object.freeze({ id: 'conditions', label: 'Conditions', progress: 72 }),
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

const REVEAL_SCORE_BONUS = Object.freeze({
  Trash: 0,
  Common: 0,
  Uncommon: 100,
  Rare: 180,
  Epic: 280,
  Legendary: 420,
  Anomaly: 650,
  Mythic: 650
});

const HEX_CHANNEL_PATTERN = /^#?([0-9a-f]{6})$/i;
const CONDITION_RARITY_ORDER = Object.freeze({
  Trash: 0,
  Common: 1,
  Uncommon: 2,
  Rare: 3,
  Epic: 4,
  Legendary: 5,
  Anomaly: 6,
  Mythic: 6
});

export function getRevealHex(value, lockedChannels = 0) {
  const match = String(value || '').trim().match(HEX_CHANNEL_PATTERN);
  if (!match) return '#------';

  const channels = match[1].match(/../g) || [];
  const safeLockedChannels = Math.max(0, Math.min(channels.length, Number(lockedChannels) || 0));
  return `#${channels.map((channel, index) => index < safeLockedChannels ? channel.toUpperCase() : '--').join('')}`;
}

export function getRevealHexCharacters(value, revealedCharacters = 0) {
  const match = String(value || '').trim().match(HEX_CHANNEL_PATTERN);
  if (!match) return '#??????';

  const safeRevealedCharacters = Math.max(0, Math.min(match[1].length, Number(revealedCharacters) || 0));
  return `#${[...match[1].toUpperCase()].map((character, index) => index < safeRevealedCharacters ? character : '?').join('')}`;
}

export function getRollRevealItems(canonical, maxItems = null) {
  const contributors = Array.isArray(canonical?.contributors)
    ? canonical.contributors
      .filter(contributor => contributor && typeof contributor.id === 'string')
      .map(contributor => ({
        id: `condition-${contributor.id}`,
        label: contributor.name || contributor.id,
        symbol: getBadgeMeta(contributor.id).symbol || '✦',
        points: Number(contributor.awardedPoints ?? contributor.points) || 0,
        category: contributor.category || 'condition',
        conditionRarity: contributor.conditionRarity || 'Common',
        kind: 'condition'
      }))
    : [];
  const hasLimit = Number.isFinite(Number(maxItems)) && Number(maxItems) > 0;
  const itemLimit = hasLimit
    ? Math.min(64, Math.max(0, Math.floor(Number(maxItems))))
    : Math.min(64, contributors.length);
  const revealOrder = (left, right) => {
    const rarityDifference = (CONDITION_RARITY_ORDER[left.conditionRarity] ?? 1)
      - (CONDITION_RARITY_ORDER[right.conditionRarity] ?? 1);
    return rarityDifference
      || left.points - right.points
      || left.label.localeCompare(right.label)
      || left.id.localeCompare(right.id);
  };

  // Only server-returned scored contributors earn a reveal beat. Reveal the
  // common floor first and climb toward the rarest condition so the strongest
  // discovery is the final beat, independent of the stored breakdown order.
  // If a safety limit applies, retain the strongest conditions before putting
  // that selected set into bottom-up reveal order.
  return contributors
    .sort((left, right) => -revealOrder(left, right))
    .slice(0, itemLimit)
    .sort(revealOrder);
}

export function getRollRevealTimeline({ rarity = 'Common', score = 0, conditionCount = 0, reducedMotion = false, skipped = false } = {}) {
  if (reducedMotion || skipped) {
    return Object.freeze({
      color: 0,
      channel: 0,
      conditionIntro: 0,
      conditionBeat: 0,
      conditionSettle: 0,
      score: 0,
      settle: 0,
      conditionRevealCount: 0,
      total: 0
    });
  }

  const safeRarity = Object.hasOwn(REVEAL_SCORE_BONUS, rarity) ? rarity : 'Common';
  const safeScore = Math.max(0, Number(score) || 0);
  const safeConditionCount = Math.max(0, Number(conditionCount) || 0);
  const conditionRevealCount = Math.min(64, safeConditionCount);
  // Keep the server result behind deliberate beats. The color signal and
  // individual HEX characters build anticipation, then every scored condition
  // gets enough time to be read before the confirmed score counts up.
  const color = 900;
  const channel = 340;
  const conditionIntro = 650;
  const conditionBeat = 520;
  const conditionSettle = 650;
  const scoreDuration = 1700 + REVEAL_SCORE_BONUS[safeRarity] + (safeScore >= 10000000 ? 250 : 0);
  const settle = 700;
  const total = color + (channel * 6) + conditionIntro + (conditionBeat * conditionRevealCount)
    + conditionSettle + scoreDuration + settle;

  return Object.freeze({
    color,
    channel,
    conditionIntro,
    conditionBeat,
    conditionSettle,
    score: scoreDuration,
    settle,
    conditionRevealCount,
    total
  });
}
