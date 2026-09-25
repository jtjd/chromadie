import { requestRollPercentile } from './rollService.js';
import { clearGuestRoll, getSavedGuestRoll } from './rollStorage.js';
import { getTodayString, normalizeHexColor } from './utils.js';

const MAX_STORED_ROLL_SCORE = 100000000;
const STORED_ROLL_RARITIES = new Set([
  'Trash',
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Legendary',
  'Anomaly',
  'Mythic'
]);

async function readOptionalPercentile(requestPercentile, supabaseClient, score) {
  try {
    return await requestPercentile(supabaseClient, score);
  } catch {
    return null;
  }
}

/** Read the authenticated account's server-owned daily roll and optional rank. */
/**
 * @param {any} supabaseClient
 * @param {{isCurrent?: () => boolean, requestPercentile?: typeof requestRollPercentile}} [options]
 */
export async function loadAuthenticatedRollSnapshot(supabaseClient, {
  isCurrent = () => true,
  requestPercentile = requestRollPercentile
} = {}) {
  const { data: roll, error } = await supabaseClient.rpc('get_my_daily_roll');
  if (!isCurrent()) return { isCurrent: false };

  const percentileData = roll
    ? await readOptionalPercentile(requestPercentile, supabaseClient, roll.score)
    : null;
  if (!isCurrent()) return { isCurrent: false };

  return { isCurrent: true, roll, error, percentileData };
}

/** Restore only a bounded guest result saved for the current UTC day. */
/**
 * @param {{supabaseClient?: any, storage?: any, today?: string, isCurrent?: () => boolean, requestPercentile?: typeof requestRollPercentile}} [options]
 */
export async function loadGuestRollSnapshot({
  supabaseClient,
  storage,
  today = getTodayString(),
  isCurrent = () => true,
  requestPercentile = requestRollPercentile
} = {}) {
  const savedRoll = getSavedGuestRoll(storage);
  if (!isCurrent()) return { isCurrent: false };
  if (!savedRoll) return { isCurrent: true, roll: null, percentileData: null };

  let roll;
  try {
    roll = JSON.parse(savedRoll);
  } catch {
    clearGuestRoll(storage);
    return { isCurrent: true, roll: null, percentileData: null };
  }

  const validHex = normalizeHexColor(roll?.hex, '');
  const validScore = Number.isSafeInteger(roll?.score)
    && roll.score >= 0
    && roll.score <= MAX_STORED_ROLL_SCORE;
  const validRarity = STORED_ROLL_RARITIES.has(roll?.rarity);
  if (roll?.date !== today || !validHex || !validScore || !validRarity) {
    clearGuestRoll(storage);
    return { isCurrent: true, roll: null, percentileData: null };
  }

  const percentileData = await readOptionalPercentile(requestPercentile, supabaseClient, roll.score);
  if (!isCurrent()) return { isCurrent: false };

  return { isCurrent: true, roll, percentileData };
}
