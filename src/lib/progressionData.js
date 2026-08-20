import {
  createEmptyProgression,
  normalizeProgressionData
} from './progressionState.js';
import { normalizeHexColor } from './utils.js';

export const PROGRESSION_RPC = 'get_my_progression';
export const DAILY_ROLL_RPC = 'get_my_daily_roll';

const UNAVAILABLE_MESSAGE = 'Progression data is unavailable.';

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeError(error) {
  return error instanceof Error
    ? error
    : new Error(UNAVAILABLE_MESSAGE);
}

function resolveArguments(clientOrOptions, userOrOptions, fallbackEp) {
  if (isRecord(clientOrOptions) && clientOrOptions.supabaseClient) {
    return {
      supabaseClient: clientOrOptions.supabaseClient,
      userId: clientOrOptions.userId || null,
      fallbackEp: clientOrOptions.fallbackEp ?? null
    };
  }

  if (isRecord(userOrOptions)) {
    return {
      supabaseClient: clientOrOptions,
      userId: userOrOptions.userId || null,
      fallbackEp: userOrOptions.fallbackEp ?? null
    };
  }

  return {
    supabaseClient: clientOrOptions,
    userId: userOrOptions || null,
    fallbackEp: fallbackEp ?? null
  };
}

/**
 * Read only the owner progression boundary. Eligibility and rewards remain
 * server-owned: the user id is a guard for the caller, never an RPC argument.
 * Keeping this request separate prevents the progression route from paying
 * for the public profile, social, configuration, and history fan-out.
 */
export async function loadProgressionData(clientOrOptions, userOrOptions = null, fallbackEp = null) {
  const {
    supabaseClient,
    userId,
    fallbackEp: safeFallbackEp
  } = resolveArguments(clientOrOptions, userOrOptions, fallbackEp);
  const empty = createEmptyProgression();

  if (!supabaseClient || !userId || typeof supabaseClient.rpc !== 'function') {
    return { data: empty, error: null, skipped: true };
  }

  try {
    const { data, error } = await supabaseClient.rpc(PROGRESSION_RPC);
    if (error) return { data: empty, error: normalizeError(error), skipped: false };
    if (data?.success === false) {
      return {
        data: empty,
        error: new Error(UNAVAILABLE_MESSAGE),
        skipped: false
      };
    }
    return {
      data: normalizeProgressionData(data, safeFallbackEp),
      error: null,
      skipped: false
    };
  } catch (error) {
    return {
      data: empty,
      error: normalizeError(error),
      skipped: false
    };
  }
}

/**
 * Read the server-owned roll for the current UTC day. The profile mood color
 * is an appearance preference, not proof of the color rolled today, so the
 * dedicated progression route uses this boundary for its live accent.
 */
export async function loadDailyRollColor(supabaseClient, userId) {
  if (!supabaseClient || !userId || typeof supabaseClient.rpc !== 'function') {
    return { color: '', data: null, error: null, skipped: true };
  }

  try {
    const { data, error } = await supabaseClient.rpc(DAILY_ROLL_RPC);
    if (error) return { color: '', data: null, error: normalizeError(error), skipped: false };
    return {
      color: normalizeHexColor(data?.hex_code || data?.hex, ''),
      data: data || null,
      error: null,
      skipped: false
    };
  } catch (error) {
    return { color: '', data: null, error: normalizeError(error), skipped: false };
  }
}

// Names used by adjacent route/data work remain intentionally small aliases.
export const loadProgression = loadProgressionData;
export const loadMyProgression = loadProgressionData;
