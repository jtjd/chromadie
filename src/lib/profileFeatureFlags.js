/**
 * Build-time, audience-scoped rollout flags for additive profile-parity work.
 *
 * These flags only decide which client surfaces are presented. Entitlements,
 * RPC authorization, and all gameplay/commerce authority remain server-side.
 */

export const FEATURE_FLAG_KEYS = Object.freeze([
  'commerce',
  'richMedia',
  'profileConfigurationV2',
  'expandedAnalytics',
  'socialDepth'
]);

export const FEATURE_FLAG_ENV_KEYS = Object.freeze({
  commerce: 'VITE_CHROMADIE_FLAG_COMMERCE',
  richMedia: 'VITE_CHROMADIE_FLAG_RICH_MEDIA',
  profileConfigurationV2: 'VITE_CHROMADIE_FLAG_PROFILE_CONFIGURATION_V2',
  expandedAnalytics: 'VITE_CHROMADIE_FLAG_EXPANDED_ANALYTICS',
  socialDepth: 'VITE_CHROMADIE_FLAG_SOCIAL_DEPTH'
});

export const FEATURE_FLAG_DEFAULTS = Object.freeze({
  commerce: true,
  richMedia: true,
  profileConfigurationV2: true,
  expandedAnalytics: true,
  socialDepth: true
});

export const ROLLOUT_STAGES = Object.freeze(['off', 'staff', 'internal', 'cohort', 'all']);

const BUILD_ENV = typeof import.meta !== 'undefined'
  && import.meta.env
  && typeof import.meta.env === 'object'
  ? import.meta.env
  : {};

function parseBoolean(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export function parseFeatureFlag(value, fallback = false) {
  return parseBoolean(value, fallback);
}

export function normalizeRolloutStage(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return ROLLOUT_STAGES.includes(normalized) ? normalized : 'all';
}

function normalizeId(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function parseInternalIds(value) {
  if (Array.isArray(value)) return value.map(normalizeId).filter(Boolean);
  if (typeof value !== 'string') return [];
  return value.split(',').map(normalizeId).filter(Boolean);
}

/** Stable, non-cryptographic bucket used only for deterministic rollout. */
export function stableFeatureBucket(value) {
  const input = normalizeId(value);
  if (!input) return null;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}

function resolveAudience({ stage, userId, isStaff, internalIds, cohortPercent }) {
  const normalizedUserId = normalizeId(userId);
  const normalizedInternalIds = new Set(internalIds.map(normalizeId).filter(Boolean));
  const internal = Boolean(normalizedUserId && normalizedInternalIds.has(normalizedUserId));
  const percent = Math.max(0, Math.min(100, Number.isFinite(Number(cohortPercent)) ? Number(cohortPercent) : 0));
  const bucket = stableFeatureBucket(normalizedUserId);
  const cohort = Boolean(bucket !== null && bucket < percent);
  const eligible = stage === 'all'
    || (stage === 'staff' && isStaff)
    || (stage === 'internal' && (isStaff || internal))
    || (stage === 'cohort' && (isStaff || internal || cohort));
  return {
    stage,
    isStaff: Boolean(isStaff),
    internal,
    cohort,
    bucket,
    eligible: stage === 'off' ? false : Boolean(eligible),
    userId: normalizedUserId
  };
}

/**
 * Resolve all M13 surfaces for one profile or account.
 * @param {{env?: Record<string, unknown>, userId?: string, isStaff?: boolean, internalIds?: string[], cohortPercent?: number}} options
 */
export function resolveProfileFeatureFlags(options = {}) {
  const env = options.env && typeof options.env === 'object' ? options.env : BUILD_ENV;
  const stage = normalizeRolloutStage(env.VITE_CHROMADIE_ROLLOUT_STAGE);
  const internalIds = [
    ...parseInternalIds(env.VITE_CHROMADIE_INTERNAL_IDS),
    ...parseInternalIds(options.internalIds)
  ];
  const audience = resolveAudience({
    stage,
    userId: options.userId,
    isStaff: options.isStaff,
    internalIds,
    cohortPercent: options.cohortPercent ?? env.VITE_CHROMADIE_COHORT_PERCENT
  });
  const flags = {
    commerce: false,
    richMedia: false,
    profileConfigurationV2: false,
    expandedAnalytics: false,
    socialDepth: false
  };
  for (const key of FEATURE_FLAG_KEYS) {
    const envKey = FEATURE_FLAG_ENV_KEYS[key];
    const defaultValue = FEATURE_FLAG_DEFAULTS[key];
    const configured = parseFeatureFlag(env[envKey], defaultValue);
    flags[key] = Boolean(audience.eligible && configured);
  }
  return Object.freeze({ ...flags, rolloutStage: audience.stage, audience });
}

export function isProfileFeatureEnabled(name, options = {}) {
  if (!FEATURE_FLAG_KEYS.includes(name)) return false;
  return resolveProfileFeatureFlags(options)[name] === true;
}
