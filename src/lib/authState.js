export const ACCOUNT_STATES = Object.freeze({
  BOOTING: 'booting',
  SIGNED_OUT: 'signed_out',
  PROFILE_LOADING: 'profile_loading',
  PROFILE_ERROR: 'profile_error',
  AUTHENTICATED: 'authenticated'
});

/**
 * Auth events can replace the session object without changing the account.
 * Keep the already-hydrated account mounted across those same-user events so
 * token maintenance cannot make the current route fall back to a loader.
 */
export function isSameAuthenticatedAccount(currentSession, currentProfile) {
  const sessionUserId = currentSession?.user?.id;
  const profileUserId = currentProfile?.id;
  return Boolean(sessionUserId && profileUserId && sessionUserId === profileUserId);
}

export function resolveAccountState({ initialized, session, profile, profileReady, profileLoadFailed }) {
  if (!initialized) return ACCOUNT_STATES.BOOTING;
  if (!session) return ACCOUNT_STATES.SIGNED_OUT;
  if (profileLoadFailed) return ACCOUNT_STATES.PROFILE_ERROR;
  if (!profileReady) return ACCOUNT_STATES.PROFILE_LOADING;
  if (profile?.id === session.user?.id) return ACCOUNT_STATES.AUTHENTICATED;
  return ACCOUNT_STATES.PROFILE_ERROR;
}
