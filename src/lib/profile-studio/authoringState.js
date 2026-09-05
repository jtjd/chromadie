export const PROFILE_CONFIGURATION_UNAVAILABLE_MESSAGE = "Profile customization couldn't be loaded. Retry before making changes.";

export function isProfileConfigurationWritable(context) {
  return Boolean(context?.profileConfig && context.configurationUnavailable !== true);
}

/**
 * Keep a previously loaded configuration visible during a failed refresh, but
 * retain the unavailable flag so no editor can mistake that snapshot for a
 * freshly authoritative write base.
 */
export function mergeProfileStudioContext(currentContext, nextContext) {
  const current = currentContext && typeof currentContext === 'object' ? currentContext : {};
  const next = nextContext && typeof nextContext === 'object' ? nextContext : {};
  const sameProfile = Boolean(current.profileId && next.profileId && current.profileId === next.profileId);
  const profileConfig = next.configurationUnavailable === true
    ? (sameProfile ? current.profileConfig || null : null)
    : next.profileConfig || current.profileConfig || null;

  return {
    ...current,
    ...next,
    profileConfig,
    ...(next.configurationUnavailable === true ? { configurationUnavailable: true } : {})
  };
}
