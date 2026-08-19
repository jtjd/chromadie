/**
 * Build-time, audience-scoped rollout flags for additive profile-parity work.
 *
 * These flags only decide which client surfaces are presented. Entitlements,
 * RPC authorization, and all gameplay/commerce authority remain server-side.
 */

export const FEATURE_FLAG_KEYS = Object.freeze([
  'commerce',
  'richMedia',
  'profileMediaR2',
  'profileConfigurationV2',
  'expandedAnalytics',
  'socialDepth',
  'progressionJourney'
]);

const FEATURE_FLAG_ENV_SUFFIXES = ['COMMERCE', 'RICH_MEDIA', 'PROFILE_MEDIA_R2', 'PROFILE_CONFIGURATION_V2', 'EXPANDED_ANALYTICS', 'SOCIAL_DEPTH', 'PROGRESSION_JOURNEY'];
export const FEATURE_FLAG_ENV_KEYS = Object.freeze(Object.fromEntries(
  FEATURE_FLAG_KEYS.map((key, index) => [key, `VITE_CHROMADIE_FLAG_${FEATURE_FLAG_ENV_SUFFIXES[index]}`])
));

export const FEATURE_FLAG_DEFAULTS = Object.freeze({
  commerce: true,
  richMedia: true,
  // R2 stays disabled until its buckets, custom domain, and control-plane
  // secrets are configured in the deployment environment.
  profileMediaR2: false,
  profileConfigurationV2: true,
  expandedAnalytics: true,
  socialDepth: true,
  progressionJourney: true
});

export const ROLLOUT_STAGES = Object.freeze(['off', 'staff', 'internal', 'cohort', 'all']);

/* Read only the rollout variables. Keeping this allow-list explicit prevents
 * unrelated Vite environment values from entering every profile route chunk. */
const BUILD_ENV = {
  stage: import.meta.env?.VITE_CHROMADIE_ROLLOUT_STAGE,
  internalIds: import.meta.env?.VITE_CHROMADIE_INTERNAL_IDS,
  profileMediaR2CanaryIds: import.meta.env?.VITE_PROFILE_MEDIA_R2_CANARY_IDS,
  cohortPercent: import.meta.env?.VITE_CHROMADIE_COHORT_PERCENT,
  flags: [
    import.meta.env?.VITE_CHROMADIE_FLAG_COMMERCE,
    import.meta.env?.VITE_CHROMADIE_FLAG_RICH_MEDIA,
    import.meta.env?.VITE_CHROMADIE_FLAG_PROFILE_MEDIA_R2,
    import.meta.env?.VITE_CHROMADIE_FLAG_PROFILE_CONFIGURATION_V2,
    import.meta.env?.VITE_CHROMADIE_FLAG_EXPANDED_ANALYTICS,
    import.meta.env?.VITE_CHROMADIE_FLAG_SOCIAL_DEPTH,
    import.meta.env?.VITE_CHROMADIE_FLAG_PROGRESSION_JOURNEY
  ]
};

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
  const env = options.env && typeof options.env === 'object' ? options.env : null;
  const stage = normalizeRolloutStage(env?.VITE_CHROMADIE_ROLLOUT_STAGE ?? BUILD_ENV.stage);
  const internalIds = [
    ...parseInternalIds(env?.VITE_CHROMADIE_INTERNAL_IDS ?? BUILD_ENV.internalIds),
    ...parseInternalIds(options.internalIds)
  ];
  const profileMediaR2CanaryIds = parseInternalIds(
    env?.VITE_PROFILE_MEDIA_R2_CANARY_IDS ?? BUILD_ENV.profileMediaR2CanaryIds
  );
  const profileMediaR2CanarySet = new Set(profileMediaR2CanaryIds);
  const audience = resolveAudience({
    stage,
    userId: options.userId,
    isStaff: options.isStaff,
    internalIds,
    cohortPercent: options.cohortPercent ?? env?.VITE_CHROMADIE_COHORT_PERCENT ?? BUILD_ENV.cohortPercent
  });
  const flags = {
    commerce: false,
    richMedia: false,
    profileMediaR2: false,
    profileConfigurationV2: false,
    expandedAnalytics: false,
    socialDepth: false,
    progressionJourney: false
  };
  for (const [index, key] of FEATURE_FLAG_KEYS.entries()) {
    const defaultValue = FEATURE_FLAG_DEFAULTS[key];
    const configured = parseFeatureFlag(env ? env[FEATURE_FLAG_ENV_KEYS[key]] : BUILD_ENV.flags[index], defaultValue);
    const eligible = key === 'profileMediaR2' && profileMediaR2CanarySet.size > 0
      ? profileMediaR2CanarySet.has(audience.userId)
      : audience.eligible;
    flags[key] = Boolean(eligible && configured);
  }
  return Object.freeze({ ...flags, rolloutStage: audience.stage, audience });
}

export function isProfileFeatureEnabled(name, options = {}) {
  if (!FEATURE_FLAG_KEYS.includes(name)) return false;
  return resolveProfileFeatureFlags(options)[name] === true;
}
